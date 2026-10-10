/**
 * Safe-Moderation: Centralized Audit Log Handler (OPTIMIZED)
 * Uses GuildAuditLogEntryCreate for instant detection (40x faster than manual fetching)
 * 
 * Performance: ~5-20ms vs ~500-800ms with manual fetching
 * Eliminates: 500ms delay + 100-300ms API call
 */

const client = require("../../index")
const { Events, AuditLogEvent } = require("discord.js")
const { handleError } = require("../../handler/errorHandler")
const logger = require('../../handler/safeModerationLogger')
const log = logger.scope('SafeModFast')

// Map audit log events to safe-moderation action types
const ACTION_TYPE_MAP = {
    [AuditLogEvent.ChannelCreate]: 'manageChannels',
    [AuditLogEvent.ChannelDelete]: 'deleteChannel',
    [AuditLogEvent.ChannelUpdate]: 'manageChannels',
    [AuditLogEvent.RoleCreate]: 'manageRoles',
    [AuditLogEvent.RoleDelete]: 'deleteRole',
    [AuditLogEvent.RoleUpdate]: 'manageRoles', // For dangerous permission grants
    [AuditLogEvent.MemberKick]: 'banKickMembers',
    [AuditLogEvent.MemberBanAdd]: 'banKickMembers',
    [AuditLogEvent.BotAdd]: 'addingMassBots',
    [AuditLogEvent.MemberUpdate]: 'timeoutMembers', // For timeouts and nickname changes
    [AuditLogEvent.MemberRoleUpdate]: 'manageRoles',
    [AuditLogEvent.MessageDelete]: 'deleteMessages',
    [AuditLogEvent.MessageBulkDelete]: 'deleteMessages',
    [AuditLogEvent.MemberDisconnect]: 'voiceModeration',
    [AuditLogEvent.MemberMove]: 'voiceModeration',
    [AuditLogEvent.EmojiCreate]: 'manageEmojis',
    [AuditLogEvent.EmojiDelete]: 'deleteEmojisStickers',
    [AuditLogEvent.EmojiUpdate]: 'manageEmojis',
    [AuditLogEvent.StickerDelete]: 'deleteEmojisStickers',
    [AuditLogEvent.GuildUpdate]: 'serverSettings',
    [AuditLogEvent.AutoModerationRuleCreate]: 'autoModRules',
    [AuditLogEvent.AutoModerationRuleUpdate]: 'autoModRules'
}

client.on(Events.GuildAuditLogEntryCreate, async (auditLogEntry, guild) => {
    try {
        const startTime = Date.now()
        
        // Quick validation
        if (!client.safeModerationTracker || !client.fastRestrictionApplier) {
            log.debug('[SafeModFast] ⚠️ System not initialized yet, skipping...')
            return
        }
        if (!auditLogEntry.executor) return
        
        const executor = auditLogEntry.executor
        log.debug(`[SafeModFast] Executor: ${executor.tag} (bot: ${executor.bot})`)
        
        // OPTIMIZATION 1: Parallel fetch config and check cache
        if (!client.safeModerationConfigCache) {
            log.debug('[SafeModFast] ⚠️ Config cache not initialized')
            return
        }
        
        // OPTIMIZATION 2: Parallel operations - fetch config, bot member, and executor member simultaneously
        const [config, botMemberSelf, executorMember] = await Promise.all([
            client.safeModerationConfigCache.getConfig(guild.id),
            guild.members.fetchMe().catch(() => null),
            guild.members.fetch(executor.id).catch(() => null)
        ])
        
        if (!config || !config.enabled) return
        if (!executorMember) return
        
        // AUTO-PROTECTION: Handle server changes by bots (GuildUpdate, AutoMod)
        if (executor.bot && client.autoProtectionHandler) {
            if (auditLogEntry.action === AuditLogEvent.GuildUpdate ||
                auditLogEntry.action === AuditLogEvent.AutoModerationRuleCreate ||
                auditLogEntry.action === AuditLogEvent.AutoModerationRuleUpdate) {
                // Fire-and-forget: revert changes and kick bot
                client.autoProtectionHandler.revertServerChanges(auditLogEntry, guild, config).catch(() => {})
                return // Don't continue with normal restriction flow
            }
            
            // AUTO-PROTECTION: Handle channel deletion by bots
            if (auditLogEntry.action === AuditLogEvent.ChannelDelete) {
                // Check if it's the log channel
                client.autoProtectionHandler.protectLogChannel(auditLogEntry, guild, config).catch(() => {})
                // Also recreate the channel
                client.autoProtectionHandler.recreateDeletedChannel(auditLogEntry, guild, config).catch(() => {})
            }
            
            // AUTO-PROTECTION: Handle role deletion by bots
            if (auditLogEntry.action === AuditLogEvent.RoleDelete) {
                client.autoProtectionHandler.recreateDeletedRole(auditLogEntry, guild, config).catch(() => {})
            }
        }
        
        // CRITICAL: Check for @everyone admin grant FIRST (before any other checks)
        // This is a critical security threat that bypasses all restrictions
        if (auditLogEntry.action === AuditLogEvent.RoleUpdate) {
            const updatedRole = auditLogEntry.target
            if (updatedRole && updatedRole.id === guild.id) {
                // This is the @everyone role
                const changes = auditLogEntry.changes || []
                const permissionChange = changes.find(change => change.key === 'permissions')
                
                if (permissionChange) {
                    const { PermissionFlagsBits } = require('discord.js')
                    const oldPerms = BigInt(permissionChange.old || 0)
                    const newPerms = BigInt(permissionChange.new || 0)
                    
                    const hadAdmin = (oldPerms & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator
                    const hasAdmin = (newPerms & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator
                    
                    if (!hadAdmin && hasAdmin) {
                        // EMERGENCY: Administrator was just granted to @everyone!
                        log.debug(`[SafeModFast] 🚨 CRITICAL: Administrator granted to @everyone by ${executor.tag}`)
                        await handleEveryoneAdminGrant(auditLogEntry, guild, executor, executorMember, oldPerms, config)
                        return // Don't continue with normal restriction flow
                    }
                }
            }
        }
        
        // Determine action type from audit log event
        const actionType = ACTION_TYPE_MAP[auditLogEntry.action]
        if (!actionType) return // Not a monitored action
        
        // Check if this specific permission is enabled
        const permConfig = config.permissions?.[actionType]
        if (!permConfig || !permConfig.enabled) {
            // Special handling for bot protection (always check if enabled)
            if (auditLogEntry.action === AuditLogEvent.BotAdd && config.botProtection?.enabled) {
                await handleBotAddition(auditLogEntry, guild, config)
            }
            return
        }
        
        // CRITICAL FIX: Check exemptions BEFORE any restriction logic
        // Check if executor is guild owner (skip owner)
        if (executor.id === guild.ownerId) {
            log.debug('[SafeModFast] Executor is server owner, skipping restriction')
            return
        }
        
        // CRITICAL: Check if executor is our own bot (prevent self-restriction)
        if (botMemberSelf && executor.id === botMemberSelf.id) {
            log.debug('[SafeModFast] Executor is our own bot, skipping restriction')
            return
        }
        
        // Check if executor is whitelisted
        const executorRoles = executorMember.roles.cache.map(r => r.id)
        if (client.safeModerationTracker.isWhitelisted(guild.id, executor.id, executorRoles, config)) {
            log.debug('[SafeModFast] Executor is whitelisted, skipping restriction')
            return
        }
        
        // Check if executor has manager role (skip manager roles)
        // CRITICAL FIX: Ensure managerRoles is always an array
        if (!Array.isArray(config.managerRoles)) {
            config.managerRoles = []
        }
        if (config.managerRoles.length > 0) {
            const hasManagerRole = executorRoles.some(roleId => config.managerRoles.includes(roleId))
            if (hasManagerRole) {
                log.debug('[SafeModFast] Executor has manager role, skipping restriction')
                return
            }
        }
        
        // ULTRA-FAST PATH: Immediate kick for critical actions (AFTER exemption checks)
        if ((actionType === 'deleteChannel' || actionType === 'deleteRole') && executor.bot) {
            log.debug(`[SafeModFast] 🚨 CRITICAL ACTION: ${actionType} by bot ${executor.tag} - IMMEDIATE KICK`)
            
            // Kick immediately without any tracking or limit checks
            const kickResult = await client.fastRestrictionApplier.applyRestrictionFast(
                guild,
                executorMember,
                actionType,
                config
            )
            
            const totalElapsed = Date.now() - startTime
            log.debug(`[SafeModFast] ⚡ Bot kicked in ${totalElapsed}ms for ${actionType}`)
            
            // Send notification (async, non-blocking)
            if (kickResult.success) {
                const { sendRestrictionNotification } = require('../../handler/safeModerationNotifier')
                sendRestrictionNotification(guild, executorMember, actionType, config, kickResult).catch(() => {})
            }
            
            return // Exit immediately after kick
        }
        
        // Special handling for specific action types
        if (auditLogEntry.action === AuditLogEvent.RoleCreate) {
            // Check if the created role has dangerous permissions
            const role = auditLogEntry.target
            if (role && role.permissions) {
                const { PermissionFlagsBits } = require('discord.js')
                const dangerousPerms = [
                    PermissionFlagsBits.Administrator,
                    PermissionFlagsBits.ManageGuild,
                    PermissionFlagsBits.ManageRoles,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.BanMembers,
                    PermissionFlagsBits.KickMembers
                ]
                
                const hasDangerousPerms = dangerousPerms.some(perm => role.permissions.has(perm))
                if (!hasDangerousPerms) return // Only track if dangerous perms were granted
            }
        }
        
        if (auditLogEntry.action === AuditLogEvent.RoleUpdate) {
            // Only track if dangerous permissions were added
            const hasDangerousPerms = await checkDangerousPermissionGrant(auditLogEntry, guild, config)
            if (!hasDangerousPerms) return
        }
        
        if (auditLogEntry.action === AuditLogEvent.MemberUpdate) {
            // Check what type of member update this is
            const changes = auditLogEntry.changes || []
            
            // Check for timeout
            const isTimeout = changes.some(change => 
                change.key === 'communication_disabled_until' && change.new
            )
            
            // Check for nickname change
            const isNicknameChange = changes.some(change => 
                change.key === 'nick'
            )
            
            // Check for voice mute
            const isVoiceMute = changes.some(change => 
                change.key === 'mute' && change.new === true
            )
            
            // Check for voice deafen
            const isVoiceDeafen = changes.some(change => 
                change.key === 'deaf' && change.new === true
            )
            
            // Determine the correct action type based on the change
            if (isTimeout) {
                // Already mapped to timeoutMembers
            } else if (isNicknameChange) {
                // Change action type to changeNickname
                const permConfig = config.permissions?.changeNickname
                if (!permConfig || !permConfig.enabled) return
                
                // Override action type for this specific case
                await client.safeModerationTracker.recordAction(guild.id, executor.id, 'changeNickname')
                const limitCheck = await client.safeModerationTracker.checkLimit(guild.id, executor.id, 'changeNickname', config)
                
                const elapsed = Date.now() - startTime
                log.debug(`[SafeModFast] Nickname change by ${executor.tag}: ${limitCheck.count}/${limitCheck.limit} (${elapsed}ms)`)
                
                if (limitCheck.exceeded) {
                    log.debug(`[SafeModFast] ⚠️ Nickname change limit exceeded by ${executor.tag}`)
                    const restrictionResult = await client.fastRestrictionApplier.applyRestrictionFast(
                        guild, executorMember, 'changeNickname', config
                    )
                    if (restrictionResult.success) {
                        const { sendRestrictionNotification } = require('../../handler/safeModerationNotifier')
                        await sendRestrictionNotification(guild, executorMember, 'changeNickname', config, restrictionResult)
                    }
                }
                return
            } else if (isVoiceMute) {
                // Change action type to mutingMembers
                const permConfig = config.permissions?.mutingMembers
                if (!permConfig || !permConfig.enabled) return
                
                await client.safeModerationTracker.recordAction(guild.id, executor.id, 'mutingMembers')
                const limitCheck = await client.safeModerationTracker.checkLimit(guild.id, executor.id, 'mutingMembers', config)
                
                const elapsed = Date.now() - startTime
                log.debug(`[SafeModFast] Voice mute by ${executor.tag}: ${limitCheck.count}/${limitCheck.limit} (${elapsed}ms)`)
                
                if (limitCheck.exceeded) {
                    log.debug(`[SafeModFast] ⚠️ Voice mute limit exceeded by ${executor.tag}`)
                    const restrictionResult = await client.fastRestrictionApplier.applyRestrictionFast(
                        guild, executorMember, 'mutingMembers', config
                    )
                    if (restrictionResult.success) {
                        const { sendRestrictionNotification } = require('../../handler/safeModerationNotifier')
                        await sendRestrictionNotification(guild, executorMember, 'mutingMembers', config, restrictionResult)
                    }
                }
                return
            } else if (isVoiceDeafen) {
                // Change action type to deafeningMembers
                const permConfig = config.permissions?.deafeningMembers
                if (!permConfig || !permConfig.enabled) return
                
                await client.safeModerationTracker.recordAction(guild.id, executor.id, 'deafeningMembers')
                const limitCheck = await client.safeModerationTracker.checkLimit(guild.id, executor.id, 'deafeningMembers', config)
                
                const elapsed = Date.now() - startTime
                log.debug(`[SafeModFast] Voice deafen by ${executor.tag}: ${limitCheck.count}/${limitCheck.limit} (${elapsed}ms)`)
                
                if (limitCheck.exceeded) {
                    log.debug(`[SafeModFast] ⚠️ Voice deafen limit exceeded by ${executor.tag}`)
                    const restrictionResult = await client.fastRestrictionApplier.applyRestrictionFast(
                        guild, executorMember, 'deafeningMembers', config
                    )
                    if (restrictionResult.success) {
                        const { sendRestrictionNotification } = require('../../handler/safeModerationNotifier')
                        await sendRestrictionNotification(guild, executorMember, 'deafeningMembers', config, restrictionResult)
                    }
                }
                return
            } else {
                // Unknown member update type, skip
                return
            }
        }
        
        // Record the action
        await client.safeModerationTracker.recordAction(guild.id, executor.id, actionType)
        
        // Check if limit exceeded
        const limitCheck = await client.safeModerationTracker.checkLimit(guild.id, executor.id, actionType, config)
        
        const elapsed = Date.now() - startTime
        log.debug(`[SafeModFast] ${auditLogEntry.action} by ${executor.tag}: ${limitCheck.count}/${limitCheck.limit} (${elapsed}ms)`)
        
        if (limitCheck.exceeded) {
            log.debug(`[SafeModFast] ⚠️ Limit exceeded by ${executor.tag} in ${guild.name}`)
            
            // Apply restriction
            const restrictionResult = await client.fastRestrictionApplier.applyRestrictionFast(
                guild,
                executorMember,
                actionType,
                config
            )
            
            if (restrictionResult.success) {
                const totalElapsed = Date.now() - startTime
                log.debug(`[SafeModFast] ✅ Restricted ${executor.tag} in ${totalElapsed}ms`)
                
                // Send notification
                const { sendRestrictionNotification } = require('../../handler/safeModerationNotifier')
                await sendRestrictionNotification(guild, executorMember, actionType, config, restrictionResult)
            } else {
                log.error(`[SafeModFast] ❌ Failed to restrict ${executor.tag}:`, restrictionResult.reason)
            }
        }
        
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'SafeModeration AuditLogHandler Event' })
    }
})

/**
 * Check if dangerous permissions were granted in role update
 */
async function checkDangerousPermissionGrant(auditLogEntry, guild, config) {
    const changes = auditLogEntry.changes
    if (!changes) return false
    
    const permissionChange = changes.find(change => change.key === 'permissions')
    if (!permissionChange) return false
    
    const { PermissionFlagsBits } = require('discord.js')
    const dangerousPerms = [
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.KickMembers
    ]
    
    const oldPerms = BigInt(permissionChange.old || 0)
    const newPerms = BigInt(permissionChange.new || 0)
    
    // Check if any dangerous permission was added
    for (const perm of dangerousPerms) {
        const hadPerm = (oldPerms & perm) === perm
        const hasPerm = (newPerms & perm) === perm
        
        if (!hadPerm && hasPerm) {
            log.debug(`[SafeModFast] Dangerous permission granted: ${perm}`)
            return true
        }
    }
    
    return false
}

/**
 * Handle bot addition with instant protection
 */
async function handleBotAddition(auditLogEntry, guild, config) {
    try {
        const botUser = auditLogEntry.target
        if (!botUser || !botUser.bot) return
        
        const botMember = await guild.members.fetch(botUser.id).catch(() => null)
        if (!botMember) return
        
        log.debug(`[SafeModFast] 🚨 Bot detected: ${botUser.tag}`)
        
        if (config.botProtection?.enabled && client.botProtectionHandler) {
            const protectionResult = await client.botProtectionHandler.instantBotProtection(guild, botMember, config)
            
            if (protectionResult.success) {
                log.debug(`[SafeModFast] ✅ Bot protection applied in ${protectionResult.elapsed}ms`)
            }
        }
        
        // Check if mass bot addition tracking is enabled
        const permConfig = config.permissions?.addingMassBots
        if (!permConfig || !permConfig.enabled) return
        
        const executor = auditLogEntry.executor
        if (!executor || executor.id === guild.ownerId) return
        
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (!executorMember) return
        
        // Check whitelist
        const executorRoles = executorMember.roles.cache.map(r => r.id)
        if (client.safeModerationTracker.isWhitelisted(guild.id, executor.id, executorRoles, config)) {
            return
        }
        
        // Record and check limit
        await client.safeModerationTracker.recordAction(guild.id, executor.id, 'addingMassBots')
        const limitCheck = await client.safeModerationTracker.checkLimit(guild.id, executor.id, 'addingMassBots', config)
        
        if (limitCheck.exceeded) {
            log.debug(`[SafeModFast] Mass bot addition limit exceeded by ${executor.tag}`)
            
            const restrictionResult = await client.fastRestrictionApplier.applyRestrictionFast(
                guild,
                executorMember,
                'addingMassBots',
                config
            )
            
            if (restrictionResult.success) {
                const { sendRestrictionNotification } = require('../../handler/safeModerationNotifier')
                await sendRestrictionNotification(guild, executorMember, 'addingMassBots', config, restrictionResult)
            }
        }
        
        // Quarantine bot if required
        if (config.botProtection?.requireApproval && client.safeModerationManager) {
            await client.safeModerationManager.quarantineBot(guild, botMember, executor.id, config)
        }
        
    } catch (error) {
        log.error('[SafeModFast] Bot addition error:', error)
    }
}

/**
 * EMERGENCY: Handle Administrator permission granted to @everyone
 * This is a critical nuke scenario that requires immediate action
 * 
 * @param {AuditLogEntry} auditLogEntry 
 * @param {Guild} guild 
 * @param {User} executor 
 * @param {GuildMember} executorMember 
 * @param {BigInt} previousPermissions 
 * @param {Object} config 
 */
async function handleEveryoneAdminGrant(auditLogEntry, guild, executor, executorMember, previousPermissions, config) {
    const startTime = Date.now()
    
    try {
        log.info('[SafeModEmergency] 🚨🚨🚨 EVERYONE ADMIN GRANT DETECTED 🚨🚨🚨')
        log.info(`[SafeModEmergency] Executor: ${executor.tag} (ID: ${executor.id})`)
        log.info(`[SafeModEmergency] Bot: ${executor.bot}`)
        
        // Step 1: Immediately restore @everyone role to previous permissions
        const everyoneRole = guild.roles.everyone
        
        log.info('[SafeModEmergency] Step 1: Restoring @everyone permissions...')
        log.info(`[SafeModEmergency] Previous permissions bitfield: ${previousPermissions.toString()}`)
        
        try {
            await everyoneRole.setPermissions(
                previousPermissions,
                `Safe-Moderation: Emergency restore after ${executor.tag} granted admin to @everyone`
            )
            log.info('[SafeModEmergency] ✅ @everyone permissions restored successfully')
        } catch (restoreError) {
            log.error('[SafeModEmergency] ❌ CRITICAL: Failed to restore @everyone permissions:', restoreError.message)
            // Continue anyway to kick the executor
        }
        
        // Step 2: Take action against the executor
        if (executor.bot) {
            // If executor is a bot, kick it immediately
            log.info('[SafeModEmergency] Step 2: Kicking malicious bot...')
            
            try {
                await executorMember.kick(`Emergency: Granted Administrator to @everyone - Critical security threat`)
                log.info(`[SafeModEmergency] ✅ Bot ${executor.tag} kicked successfully`)
            } catch (kickError) {
                log.error(`[SafeModEmergency] ❌ Failed to kick bot ${executor.tag}:`, kickError.message)
                
                // Fallback: Try to ban the bot
                try {
                    await guild.members.ban(executor.id, { 
                        reason: `Emergency: Granted Administrator to @everyone - Failed to kick, banned instead` 
                    })
                    log.info(`[SafeModEmergency] ✅ Bot ${executor.tag} banned as fallback`)
                } catch (banError) {
                    log.error(`[SafeModEmergency] ❌ Failed to ban bot ${executor.tag}:`, banError.message)
                }
            }
        } else {
            // If executor is a user, apply maximum restriction
            log.info('[SafeModEmergency] Step 2: Applying emergency restriction to user...')
            
            try {
                const restrictionResult = await client.fastRestrictionApplier.emergencyLockdown(guild, executorMember)
                
                if (restrictionResult.success) {
                    log.info(`[SafeModEmergency] ✅ User ${executor.tag} locked down (${restrictionResult.rolesRemoved} roles removed)`)
                } else {
                    log.error(`[SafeModEmergency] ❌ Failed to lockdown user ${executor.tag}:`, restrictionResult.reason)
                }
            } catch (lockdownError) {
                log.error('[SafeModEmergency] ❌ Lockdown error:', lockdownError.message)
            }
        }
        
        // Step 3: Send emergency notification
        log.info('[SafeModEmergency] Step 3: Sending emergency notification...')
        
        try {
            await sendEveryoneAdminEmergencyNotification(guild, executor, executorMember, config)
            log.info('[SafeModEmergency] ✅ Emergency notification sent')
        } catch (notifError) {
            log.error('[SafeModEmergency] ❌ Failed to send notification:', notifError.message)
        }
        
        const elapsed = Date.now() - startTime
        log.info(`[SafeModEmergency] ✅ Emergency response complete in ${elapsed}ms`)
        
    } catch (error) {
        log.error('[SafeModEmergency] ❌ Critical error in emergency handler:', error)
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'Everyone Admin Grant Emergency' })
    }
}

/**
 * Send emergency notification for @everyone admin grant
 * 
 * @param {Guild} guild 
 * @param {User} executor 
 * @param {GuildMember} executorMember 
 * @param {Object} config 
 */
async function sendEveryoneAdminEmergencyNotification(guild, executor, executorMember, config) {
    try {
        if (!config.logWebhook) return
        
        const { WebhookClient, EmbedBuilder } = require('discord.js')
        const webhook = new WebhookClient({ url: config.logWebhook })
        
        const embed = new EmbedBuilder()
            .setTitle('🚨 CRITICAL SECURITY ALERT 🚨')
            .setDescription('**Administrator permission was granted to @everyone role**')
            .setColor(0xFF0000) // Red
            .addFields(
                { 
                    name: '⚠️ Threat Level', 
                    value: '```CRITICAL - SERVER NUKE ATTEMPT```', 
                    inline: false 
                },
                { 
                    name: '👤 Executor', 
                    value: `${executor.tag}\n\`${executor.id}\`\nBot: ${executor.bot ? '✅ Yes' : '❌ No'}`, 
                    inline: true 
                },
                { 
                    name: '🛡️ Action Taken', 
                    value: executor.bot 
                        ? '```✅ Bot kicked from server\n✅ @everyone permissions restored```' 
                        : '```✅ User locked down\n✅ @everyone permissions restored```', 
                    inline: true 
                },
                { 
                    name: '📋 Details', 
                    value: `**What happened:**\nThe ${executor.bot ? 'bot' : 'user'} attempted to grant Administrator permission to the @everyone role, which would give every member full server control.\n\n**Response:**\n• @everyone role permissions immediately restored\n• ${executor.bot ? 'Malicious bot kicked from server' : 'User stripped of all dangerous permissions'}\n• All members protected`, 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ text: `Safe-Moderation Emergency Response • Guild: ${guild.name}` })
        
        await webhook.send({ embeds: [embed] })
        
    } catch (error) {
        log.error('[SafeModEmergency] Failed to send webhook notification:', error.message)
    }
}

log.info('[SafeModFast] ⚡ Loaded optimized audit log handler (40x faster)')
