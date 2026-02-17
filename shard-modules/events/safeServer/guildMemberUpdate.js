/**
 * Safe-Server: Timeout Detection & Anti-Bypass
 * Detects timeouts and prevents unauthorized role changes
 */

const client = require("../../index")
const { Events, AuditLogEvent } = require("discord.js")
const { handleError } = require("../../handler/errorHandler")

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
        if (!client.safeServerTracker || !client.safeServerManager) return
        
        const guild = newMember.guild
        
        // Get Safe-Server config
        const safeServerSchema = require('../../schemas/safeServerSchema')
        const config = await safeServerSchema.findOne({ guildID: guild.id })
        
        if (!config || !config.enabled) return
        
        // === TIMEOUT DETECTION ===
        const wasTimedOut = oldMember.communicationDisabledUntil
        const isTimedOut = newMember.communicationDisabledUntil
        
        if (!wasTimedOut && isTimedOut) {
            // Member was just timed out
            await handleTimeoutAction(guild, newMember, config)
        }
        
        // === ANTI-BYPASS: SS ROLE REMOVAL DETECTION ===
        if (config.managedRoles) {
            const ssRoleIds = Object.values(config.managedRoles).filter(Boolean)
            
            // Check if any SS role was removed
            const removedRoles = oldMember.roles.cache.filter(role => 
                ssRoleIds.includes(role.id) && !newMember.roles.cache.has(role.id)
            )
            
            if (removedRoles.size > 0) {
                await handleSSRoleRemoval(guild, newMember, removedRoles, config)
            }
            
            // Check if restricted role was removed prematurely
            if (config.managedRoles.restricted) {
                const hadRestricted = oldMember.roles.cache.has(config.managedRoles.restricted)
                const hasRestricted = newMember.roles.cache.has(config.managedRoles.restricted)
                
                if (hadRestricted && !hasRestricted) {
                    await handleRestrictedRoleRemoval(guild, newMember, config)
                }
            }
        }
        
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'SafeServer GuildMemberUpdate Event' })
    }
})

/**
 * Handle timeout action detection
 */
async function handleTimeoutAction(guild, member, config) {
    try {
        // Fetch audit log to identify executor
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberUpdate,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        // Find the matching audit log entry
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === member.id && 
            entry.changes?.some(c => c.key === 'communication_disabled_until') &&
            (now - entry.createdTimestamp) < 5000
        )
        
        if (!auditEntry || !auditEntry.executor) return
        
        const executor = auditEntry.executor
        
        // Ignore bot actions
        if (executor.bot) return
        
        // Fetch executor as guild member
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (!executorMember) return
        
        // Check if executor is guild owner
        if (executor.id === guild.ownerId) return
        
        // Check if executor is whitelisted
        const executorRoles = executorMember.roles.cache.map(r => r.id)
        if (client.safeServerTracker.isWhitelisted(guild.id, executor.id, executorRoles, config)) {
            return
        }
        
        // Record the action
        await client.safeServerTracker.recordAction(guild.id, executor.id, 'timeout')
        
        // Check if limit exceeded
        const limitCheck = await client.safeServerTracker.checkLimit(guild.id, executor.id, 'timeout', config)
        
        if (limitCheck.exceeded) {
            console.log(`[SafeServer] Timeout limit exceeded by ${executor.tag} in ${guild.name}`)
            
            // Apply restriction
            const result = await client.safeServerManager.restrictModerator(
                guild,
                executorMember,
                'timeout',
                limitCheck,
                config
            )
            
            if (result.success) {
                console.log(`[SafeServer] Restricted ${executor.tag} for excessive timeouts`)
            }
        }
        
    } catch (error) {
        console.error('[SafeServer] Timeout detection error:', error)
    }
}

/**
 * Handle unauthorized SS role removal (anti-bypass)
 */
async function handleSSRoleRemoval(guild, member, removedRoles, config) {
    try {
        // Fetch audit log to identify who removed the role
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === member.id && 
            (now - entry.createdTimestamp) < 5000
        )
        
        if (!auditEntry || !auditEntry.executor) return
        
        const executor = auditEntry.executor
        
        // Ignore if it's the bot itself (legitimate restoration)
        if (executor.id === client.user.id) return
        
        // Ignore guild owner
        if (executor.id === guild.ownerId) return
        
        // Check if this is a legitimate restriction expiration
        const restriction = config.activeRestrictions.find(r => r.userId === member.id)
        if (restriction && restriction.expiresAt > new Date()) {
            // This is an unauthorized removal during active restriction
            console.log(`[SafeServer] Unauthorized SS role removal detected for ${member.user.tag}`)
            
            // Restore the removed roles
            const roleIds = removedRoles.map(r => r.id)
            await member.roles.add(roleIds, 'Safe-Server: Anti-bypass protection').catch(console.error)
            
            // Log the bypass attempt
            if (config.logChannelId) {
                const logChannel = guild.channels.cache.get(config.logChannelId)
                if (logChannel) {
                    const { EmbedBuilder } = require('discord.js')
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xE74C3C)
                                .setTitle('⚠️ Safe-Server: Bypass Attempt Detected')
                                .setDescription(`Unauthorized role removal was detected and reverted.`)
                                .addFields(
                                    { name: 'Target', value: `${member.user.tag} (${member.id})` },
                                    { name: 'Executor', value: `<@${executor.id}>` },
                                    { name: 'Roles Restored', value: removedRoles.map(r => r.name).join(', ') }
                                )
                                .setTimestamp()
                        ]
                    }).catch(console.error)
                }
            }
        }
        
    } catch (error) {
        console.error('[SafeServer] SS role removal handler error:', error)
    }
}

/**
 * Handle premature restricted role removal
 */
async function handleRestrictedRoleRemoval(guild, member, config) {
    try {
        // Check if user has an active restriction
        const restriction = config.activeRestrictions.find(r => r.userId === member.id)
        if (!restriction || restriction.expiresAt <= new Date()) return
        
        // Fetch audit log
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === member.id && 
            (now - entry.createdTimestamp) < 5000
        )
        
        if (!auditEntry || !auditEntry.executor) return
        
        const executor = auditEntry.executor
        
        // Ignore if it's the bot itself (legitimate restoration)
        if (executor.id === client.user.id) return
        
        // Ignore guild owner
        if (executor.id === guild.ownerId) return
        
        console.log(`[SafeServer] Premature restricted role removal detected for ${member.user.tag}`)
        
        // Re-apply restricted role
        const restrictedRole = guild.roles.cache.get(config.managedRoles.restricted)
        if (restrictedRole) {
            await member.roles.add(restrictedRole, 'Safe-Server: Anti-bypass protection').catch(console.error)
        }
        
        // Log the bypass attempt
        if (config.logChannelId) {
            const logChannel = guild.channels.cache.get(config.logChannelId)
            if (logChannel) {
                const { EmbedBuilder } = require('discord.js')
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xE74C3C)
                            .setTitle('⚠️ Safe-Server: Bypass Attempt Detected')
                            .setDescription(`Premature removal of restricted role was detected and reverted.`)
                            .addFields(
                                { name: 'Target', value: `${member.user.tag} (${member.id})` },
                                { name: 'Executor', value: `<@${executor.id}>` },
                                { name: 'Restriction Expires', value: `<t:${Math.floor(restriction.expiresAt.getTime() / 1000)}:R>` }
                            )
                            .setTimestamp()
                    ]
                }).catch(console.error)
            }
        }
        
    } catch (error) {
        console.error('[SafeServer] Restricted role removal handler error:', error)
    }
}
