/**
 * Safe Moderation Manager
 * Handles role management, restrictions, and bot quarantine.
 */

const { PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js')
const logger = require('./safeModerationLogger')
const { getActionName } = require('./safeModerationHelpers')

const log = logger.scope('Manager')

// ── shared maps ─────────────────────────────────────────────────────
const ACTION_ROLE_MAP = Object.freeze({
    ban: 'restrictedBan', kick: 'restrictedKick', timeout: 'restrictedTimeout',
    channelDelete: 'restrictedChannelDelete', channelCreate: 'restrictedChannelCreate',
    roleDelete: 'restrictedRoleDelete', roleUpdate: 'restrictedRoleUpdate',
    everyoneMention: 'restrictedEveryoneMention', emojiDelete: 'restrictedEmojiDelete'
})

const PERM_FOR_ACTION = Object.freeze({
    ban: 'BanMembers', kick: 'KickMembers', timeout: 'ModerateMembers',
    channelDelete: 'ManageChannels', channelCreate: 'ManageChannels',
    roleDelete: 'ManageRoles', roleUpdate: 'ManageRoles',
    everyoneMention: 'MentionEveryone', emojiDelete: 'ManageEmojisAndStickers'
})

const DANGEROUS_PERMS = [
    PermissionFlagsBits.Administrator, PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers, PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.MentionEveryone, PermissionFlagsBits.ManageEmojisAndStickers,
    PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageGuildExpressions
]

class SafeModerationManager {
    constructor(client) {
        this.client = client
        this.schema = require('../schemas/safeModerationSchema')
    }

    /**
     * Initialize Safe Moderation for a guild (create managed roles)
     * @param {Guild} guild 
     * @returns {Promise<Object>}
     */
    async initialize(guild) {
        let config = await this.schema.findOne({ guildID: guild.id })
        
        if (!config) {
            config = new this.schema({ guildID: guild.id })
        }

        if (config.rolesCreated) {
            return { success: true, message: 'Roles already created', config }
        }

        try {
            // Create SS-Admin role (full permissions)
            const adminRole = await guild.roles.create({
                name: 'SS-Admin',
                color: 0xE74C3C,
                permissions: [
                    PermissionFlagsBits.ManageGuild,
                    PermissionFlagsBits.ManageRoles,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.KickMembers,
                    PermissionFlagsBits.BanMembers,
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.MentionEveryone,
                    PermissionFlagsBits.ManageEmojisAndStickers,
                    PermissionFlagsBits.ViewAuditLog
                ],
                reason: 'Safe-Moderation: Admin role'
            })

            // Create SS-Moderator role (moderate permissions)
            const modRole = await guild.roles.create({
                name: 'SS-Moderator',
                color: 0x3498DB,
                permissions: [
                    PermissionFlagsBits.KickMembers,
                    PermissionFlagsBits.BanMembers,
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.MentionEveryone,
                    PermissionFlagsBits.ViewAuditLog
                ],
                reason: 'Safe-Moderation: Moderator role'
            })

            // Create SS-Bot-Quarantine role (no permissions)
            const botQuarantineRole = await guild.roles.create({
                name: 'SS-Bot-Quarantine',
                color: 0xE67E22,
                permissions: [],
                reason: 'Safe-Moderation: Bot quarantine role'
            })

            // Save base role IDs to config
            config.managedRoles = {
                admin: adminRole.id,
                moderator: modRole.id,
                botQuarantine: botQuarantineRole.id
            }
            
            // Create granular restriction roles
            await this.createGranularRoles(guild, config, adminRole, modRole)
            
            config.rolesCreated = true
            config.initialized = true
            await config.save()

            return {
                success: true,
                message: 'Safe-Moderation roles created successfully',
                config
            }
        } catch (error) {
            log.error('Role creation error', error)
            return {
                success: false,
                message: `Failed to create roles: ${error.message}`,
                config
            }
        }
    }

    /**
     * Create granular restriction roles
     * @private
     */
    async createGranularRoles(guild, config, adminRole, modRole) {
        const restrictionRoles = [
            {
                key: 'restrictedBan',
                name: 'SS-No-Ban',
                removePerms: [PermissionFlagsBits.BanMembers],
                color: 0x95A5A6
            },
            {
                key: 'restrictedKick',
                name: 'SS-No-Kick',
                removePerms: [PermissionFlagsBits.KickMembers],
                color: 0x95A5A6
            },
            {
                key: 'restrictedTimeout',
                name: 'SS-No-Timeout',
                removePerms: [PermissionFlagsBits.ModerateMembers],
                color: 0x95A5A6
            },
            {
                key: 'restrictedChannelDelete',
                name: 'SS-No-Channel-Delete',
                removePerms: [PermissionFlagsBits.ManageChannels],
                color: 0x95A5A6
            },
            {
                key: 'restrictedChannelCreate',
                name: 'SS-No-Channel-Create',
                removePerms: [PermissionFlagsBits.ManageChannels],
                color: 0x95A5A6
            },
            {
                key: 'restrictedRoleDelete',
                name: 'SS-No-Role-Delete',
                removePerms: [PermissionFlagsBits.ManageRoles],
                color: 0x95A5A6
            },
            {
                key: 'restrictedRoleUpdate',
                name: 'SS-No-Role-Update',
                removePerms: [PermissionFlagsBits.ManageRoles],
                color: 0x95A5A6
            },
            {
                key: 'restrictedEveryoneMention',
                name: 'SS-No-Everyone-Mention',
                removePerms: [PermissionFlagsBits.MentionEveryone],
                color: 0x95A5A6
            },
            {
                key: 'restrictedEmojiDelete',
                name: 'SS-No-Emoji-Delete',
                removePerms: [PermissionFlagsBits.ManageEmojisAndStickers],
                color: 0x95A5A6
            }
        ]

        for (const roleConfig of restrictionRoles) {
            // Get base permissions from admin role
            const basePermissions = adminRole.permissions.toArray()
            
            // Remove the restricted permission(s)
            const allowedPermissions = basePermissions.filter(perm => 
                !roleConfig.removePerms.includes(perm)
            )

            const role = await guild.roles.create({
                name: roleConfig.name,
                color: roleConfig.color,
                permissions: allowedPermissions,
                reason: `Safe-Moderation: Granular restriction role`
            })

            config.managedRoles[roleConfig.key] = role.id
        }
    }

    /**
     * Apply granular restriction to a moderator
     * @param {Guild} guild 
     * @param {GuildMember} moderator 
     * @param {string} actionType 
     * @param {Object} limitInfo 
     * @param {Object} config 
     * @returns {Promise<Object>}
     */
    async restrictModerator(guild, moderator, actionType, limitInfo, config) {
        log.info(`restrictModerator: ${moderator.user.tag} → ${actionType} in ${guild.name}`)
        
        if (!config?.enabled) {
            return { success: false, message: 'Safe-Moderation not enabled' }
        }

        try {
            const restrictionRoleKey = ACTION_ROLE_MAP[actionType]
            if (!restrictionRoleKey) {
                return { success: false, message: 'Unknown action type' }
            }
            
            // Check if granular roles exist, if not create them
            if (!config.managedRoles[restrictionRoleKey]) {
                log.warn('Granular roles missing, creating…')
                const adminRoles = guild.roles.cache.filter(r => 
                    r.id !== guild.id && 
                    (r.permissions.has(PermissionFlagsBits.Administrator) || 
                     r.permissions.has(PermissionFlagsBits.BanMembers))
                ).sort((a, b) => b.position - a.position)
                const templateRole = adminRoles.first() || guild.roles.cache.get(config.managedRoles.admin)
                if (templateRole) {
                    await this.createGranularRoles(guild, config, templateRole, templateRole)
                    await config.save()
                } else {
                    return { success: false, message: 'No template role found for creating restriction roles' }
                }
            }
            
            const restrictionRoleId = config.managedRoles[restrictionRoleKey]
            if (!restrictionRoleId) {
                return { success: false, message: `Restriction role not found: ${restrictionRoleKey}` }
            }

            let restrictionRole = guild.roles.cache.get(restrictionRoleId)
            if (!restrictionRole) {
                return { success: false, message: 'Restriction role not found in guild' }
            }

            // Find which role(s) grant the dangerous permission
            const requiredPerm = PermissionFlagsBits[PERM_FOR_ACTION[actionType]]
            const rolesWithPermission = moderator.roles.cache.filter(r => 
                r.id !== guild.id && r.permissions.has(requiredPerm)
            )
            if (rolesWithPermission.size === 0) {
                return { success: false, message: 'Moderator has no roles with this permission' }
            }
            const highestRoleWithPerm = rolesWithPermission.sort((a, b) => b.position - a.position).first()
            log.debug(`Target role: ${highestRoleWithPerm.name}`)

            // Update restriction role: clone perms minus the restricted one + Administrator
            let newPermsBitfield = highestRoleWithPerm.permissions.bitfield
            newPermsBitfield = newPermsBitfield & ~requiredPerm & ~PermissionFlagsBits.Administrator
            
            try {
                await restrictionRole.setPermissions(newPermsBitfield, 'Safe-Moderation: Match removed role permissions')
                const updatedRole = await guild.roles.fetch(restrictionRole.id, { force: true })
                if (updatedRole.permissions.has(requiredPerm) || updatedRole.permissions.has(PermissionFlagsBits.Administrator)) {
                    log.error('Restriction role still has dangerous permissions after update')
                }
                restrictionRole = updatedRole
            } catch (error) {
                log.error('Failed to update restriction role permissions', error)
            }

            // Find or create active restriction entry
            let restriction = config.activeRestrictions.find(r => r.userId === moderator.id)
            
            if (!restriction) {
                // First restriction — validate hierarchy then swap roles
                const botMember = await guild.members.fetchMe()
                if (highestRoleWithPerm.position >= botMember.roles.highest.position) {
                    return { success: false, message: `Cannot remove ${highestRoleWithPerm.name} — bot’s role must be higher.` }
                }
                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return { success: false, message: 'Bot lacks Manage Roles permission' }
                }
                
                // Remove dangerous role
                try {
                    await moderator.roles.remove(highestRoleWithPerm, `Safe-Moderation: ${actionType} limit exceeded`)
                } catch (error) {
                    log.error('Failed to remove role', error)
                    return { success: false, message: `Failed to remove role: ${error.message}` }
                }
                
                // Add restriction role
                try {
                    await moderator.roles.add(restrictionRole, `Safe-Moderation: ${actionType} limit exceeded`)
                    
                    // Verify restriction took effect
                    await moderator.fetch(true)
                    if (moderator.permissions.has(requiredPerm)) {
                        const leaking = moderator.roles.cache.filter(r => r.permissions.has(requiredPerm))
                        log.error(`User still has ${PERM_FOR_ACTION[actionType]} via: ${leaking.map(r => r.name).join(', ')}`)
                    }
                } catch (error) {
                    log.error('Failed to add restriction role', error)
                    await moderator.roles.add(highestRoleWithPerm, 'Safe-Moderation: Rollback').catch(() => {})
                    return { success: false, message: `Failed to add restriction role: ${error.message}` }
                }
                
                const expiresAt = new Date(Date.now() + (config.restriction.cooldownDuration * 1000))
                restriction = {
                    userId: moderator.id,
                    originalRole: highestRoleWithPerm.id,
                    restrictedActions: [actionType],
                    restrictedAt: new Date(),
                    expiresAt,
                    actionTimers: [{ actionType, expiresAt }]
                }
                config.activeRestrictions.push(restriction)
                
            } else {
                // User already has restrictions, add another one
                log.debug(`Adding ${actionType} to existing restriction for ${moderator.user.tag}`)
                
                if (!restriction.restrictedActions.includes(actionType)) {
                    // Remove additional role if it's different from original
                    const newRolesWithPerm = moderator.roles.cache.filter(r => 
                        r.id !== guild.id && r.permissions.has(requiredPerm)
                    )
                    if (newRolesWithPerm.size > 0) {
                        const newHighest = newRolesWithPerm.sort((a, b) => b.position - a.position).first()
                        if (newHighest.id !== restriction.originalRole) {
                            await moderator.roles.remove(newHighest, `Safe-Moderation: ${actionType} limit exceeded`)
                            if (!restriction.additionalRemovedRoles) restriction.additionalRemovedRoles = []
                            restriction.additionalRemovedRoles.push(newHighest.id)
                        }
                    }
                    
                    // Swap restriction roles: remove current, add updated set
                    const oldRoles = restriction.restrictedActions
                        .map(a => config.managedRoles[ACTION_ROLE_MAP[a]]).filter(Boolean)
                    if (oldRoles.length) await moderator.roles.remove(oldRoles, 'Safe-Moderation: Updating restrictions')
                    
                    restriction.restrictedActions.push(actionType)
                    const newRoles = restriction.restrictedActions
                        .map(a => config.managedRoles[ACTION_ROLE_MAP[a]]).filter(Boolean)
                    await moderator.roles.add(newRoles, `Safe-Moderation: ${actionType} limit exceeded`)
                    
                    const expiresAt = new Date(Date.now() + (config.restriction.cooldownDuration * 1000))
                    restriction.actionTimers.push({ actionType, expiresAt })
                    if (expiresAt > restriction.expiresAt) restriction.expiresAt = expiresAt
                } else {
                    log.debug('Action already restricted, skipping')
                }
            }
            
            await config.save()

            // Schedule automatic restoration
            setTimeout(() => {
                this.restoreModeratorAction(guild.id, moderator.id, actionType).catch(e => log.error('Restoration failed', e))
            }, config.restriction.cooldownDuration * 1000)

            await this.sendRestrictionNotification(guild, moderator, actionType, limitInfo, config, restriction.expiresAt)
            log.info(`Restriction applied, expires ${restriction.expiresAt.toISOString()}`)

            return {
                success: true,
                message: 'Moderator restricted successfully',
                restrictedActions: restriction.restrictedActions,
                expiresAt: restriction.expiresAt
            }
        } catch (error) {
            log.error('Restriction error', error)
            return { success: false, message: `Failed to restrict: ${error.message}` }
        }
    }

    /**
     * Restore a specific action for a moderator after cooldown expires
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} actionType 
     * @returns {Promise<void>}
     */
    async restoreModeratorAction(guildId, userId, actionType) {
        try {
            log.info(`Restoring ${actionType} for user ${userId}`)
            
            const config = await this.schema.findOne({ guildID: guildId })
            if (!config) return

            const restriction = config.activeRestrictions.find(r => r.userId === userId)
            if (!restriction) return

            const guild = this.client.guilds.cache.get(guildId)
            if (!guild) return

            const member = await guild.members.fetch(userId).catch(() => null)
            if (!member) {
                config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
                await config.save()
                return
            }

            restriction.restrictedActions = restriction.restrictedActions.filter(a => a !== actionType)
            restriction.actionTimers = restriction.actionTimers.filter(t => t.actionType !== actionType)

            const _roleIds = action => config.managedRoles[ACTION_ROLE_MAP[action]]

            if (restriction.restrictedActions.length === 0) {
                // Fully restore
                const allRoles = Object.keys(ACTION_ROLE_MAP).map(_roleIds)
                    .filter(id => id && member.roles.cache.has(id))
                if (allRoles.length) await member.roles.remove(allRoles, 'Safe-Moderation: All cooldowns expired')
                
                if (restriction.originalRole && guild.roles.cache.has(restriction.originalRole)) {
                    await member.roles.add(restriction.originalRole, 'Safe-Moderation: All cooldowns expired')
                }
                const extras = (restriction.additionalRemovedRoles || []).filter(id => guild.roles.cache.has(id))
                if (extras.length) await member.roles.add(extras, 'Safe-Moderation: All cooldowns expired')
                
                config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
                if (this.client.safeModerationTracker) {
                    await this.client.safeModerationTracker.clearActions(guildId, userId)
                }
                await this.sendRestorationNotification(guild, member, config, actionType)
            } else {
                // Partial restore — swap restriction roles
                const current = Object.keys(ACTION_ROLE_MAP).map(_roleIds)
                    .filter(id => id && member.roles.cache.has(id))
                if (current.length) await member.roles.remove(current, 'Safe-Moderation: Updating restrictions')
                
                const remaining = restriction.restrictedActions.map(_roleIds).filter(Boolean)
                if (remaining.length) await member.roles.add(remaining, 'Safe-Moderation: Partial restoration')
                
                await this.sendPartialRestorationNotification(guild, member, config, actionType, restriction.restrictedActions)
            }
            
            await config.save()
            log.info(`Restoration complete for ${userId} (${actionType})`)

        } catch (error) {
            log.error('Restoration error', error)
        }
    }

    /**
     * Restore moderator after cooldown expires (legacy support)
     * @param {string} guildId 
     * @param {string} userId 
     * @returns {Promise<void>}
     */
    async restoreModerator(guildId, userId) {
        try {
            const config = await this.schema.findOne({ guildID: guildId })
            if (!config) return
            const restriction = config.activeRestrictions.find(r => r.userId === userId)
            if (!restriction) return
            const guild = this.client.guilds.cache.get(guildId)
            if (!guild) return

            const member = await guild.members.fetch(userId).catch(() => null)
            if (!member) {
                config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
                await config.save()
                return
            }

            const restrictedRole = guild.roles.cache.get(config.managedRoles?.restricted)
            if (restrictedRole && member.roles.cache.has(restrictedRole.id)) {
                await member.roles.remove(restrictedRole, 'Safe-Moderation: Cooldown expired')
            }

            const rolesToRestore = (restriction.originalRoles || []).filter(id => guild.roles.cache.has(id))
            if (rolesToRestore.length) await member.roles.add(rolesToRestore, 'Safe-Moderation: Cooldown expired')

            config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
            await config.save()
            if (this.client.safeModerationTracker) await this.client.safeModerationTracker.clearActions(guildId, userId)
            await this.sendRestorationNotification(guild, member, config)
        } catch (error) {
            log.error('Legacy restoration error', error)
        }
    }

    /**
     * Quarantine a bot
     * @param {Guild} guild 
     * @param {GuildMember} bot 
     * @param {string} addedBy 
     * @param {Object} config 
     * @returns {Promise<Object>}
     */
    async quarantineBot(guild, bot, addedBy, config) {
        if (!config || !config.enabled || !config.botProtection.enabled) {
            return { success: false, message: 'Bot protection not enabled' }
        }

        log.info(`Quarantine: ${bot.user.tag} (added by ${addedBy})`)

        try {
            const executorMember = await guild.members.fetch(addedBy).catch(() => null)
            if (!executorMember) return { success: false, message: 'Could not fetch executor member' }

            const clientMember = await guild.members.fetchMe()
            const clientHighestRole = clientMember.roles.highest
            
            // Find or create quarantine role
            let quarantineRole = null
            
            if (config.managedRoles?.botQuarantine) {
                quarantineRole = guild.roles.cache.get(config.managedRoles.botQuarantine)
                if (!quarantineRole) config.managedRoles.botQuarantine = null
            }
            if (!quarantineRole) {
                quarantineRole = guild.roles.cache.find(r => r.name === 'SS-Bot-Quarantine')
                if (quarantineRole) {
                    if (!config.managedRoles) config.managedRoles = {}
                    config.managedRoles.botQuarantine = quarantineRole.id
                    await config.save()
                }
            }
            
            if (!quarantineRole) {
                const targetPos = Math.max(1, clientHighestRole.position - 1)
                try {
                    quarantineRole = await guild.roles.create({
                        name: 'SS-Bot-Quarantine', color: 0xE67E22,
                        permissions: [], position: targetPos,
                        reason: 'Safe-Moderation: Bot quarantine role'
                    })
                    if (!config.managedRoles) config.managedRoles = {}
                    config.managedRoles.botQuarantine = quarantineRole.id
                    await config.save()
                } catch (createError) {
                    quarantineRole = guild.roles.cache.find(r => r.name === 'SS-Bot-Quarantine')
                    if (quarantineRole) {
                        if (!config.managedRoles) config.managedRoles = {}
                        config.managedRoles.botQuarantine = quarantineRole.id
                        await config.save()
                    } else {
                        throw createError
                    }
                }
            } else if (quarantineRole.position >= clientHighestRole.position) {
                try {
                    await quarantineRole.setPosition(Math.max(1, clientHighestRole.position - 1), 'Safe-Moderation: Positioning below bot')
                    quarantineRole = guild.roles.cache.get(quarantineRole.id)
                } catch (posError) {
                    log.warn('Failed to reposition quarantine role', posError)
                }
            }
            
            if (!quarantineRole) {
                return { success: false, message: 'Failed to create or find quarantine role' }
            }

            // Store original roles & permissions
            const originalRoles = bot.roles.cache.filter(r => r.id !== guild.id).map(r => r.id)
            const originalRolePermissions = {}
            for (const role of bot.roles.cache.values()) {
                if (role.id !== guild.id) originalRolePermissions[role.id] = role.permissions.bitfield.toString()
            }

            // Hierarchy check
            const targetBotHighestRole = bot.roles.highest
            if (clientHighestRole.position <= targetBotHighestRole.position) {
                log.warn(`Cannot quarantine ${bot.user.tag}: hierarchy too high`)
                await this.sendBotQuarantineNotification(guild, bot, addedBy, executorMember, config, true)
                return { success: false, message: 'Cannot quarantine bot: role hierarchy too high.' }
            }
            if (bot.permissions.has(PermissionFlagsBits.Administrator)) {
                log.warn('Target bot has Administrator, will strip via role removal')
            }

            // Identify and remove roles with dangerous permissions
            const rolesToRemoveFromBot = []
            for (const role of bot.roles.cache.values()) {
                if (role.id === guild.id || role.position >= clientHighestRole.position) continue
                if (DANGEROUS_PERMS.some(p => role.permissions.has(p))) rolesToRemoveFromBot.push(role.id)
            }

            if (rolesToRemoveFromBot.length > 0) {
                log.info(`Removing ${rolesToRemoveFromBot.length} dangerous roles from bot`)
                let removedCount = 0
                const failedRoles = []
                for (const roleId of rolesToRemoveFromBot) {
                    try {
                        await bot.roles.remove(roleId, 'Safe-Moderation: Removing dangerous role before quarantine')
                        removedCount++
                    } catch (e) {
                        log.error(`Failed to remove role ${guild.roles.cache.get(roleId)?.name || roleId}`, e)
                        failedRoles.push(roleId)
                    }
                }
                if (failedRoles.length) log.warn(`${failedRoles.length} role removals failed`)
                await config.save()
                
                // Verify with backoff
                for (let i = 1; i <= 3; i++) {
                    await new Promise(r => setTimeout(r, 1000 * i))
                    await bot.fetch(true)
                    if (rolesToRemoveFromBot.every(id => !bot.roles.cache.has(id))) break
                    if (i === 3) log.error('Some dangerous roles still present after 3 verification attempts')
                }
            }

            // Re-verify quarantine role
            quarantineRole = guild.roles.cache.get(quarantineRole.id)
            if (!quarantineRole) return { success: false, message: 'Quarantine role was deleted' }
            
            const currentBotHighest = (await guild.members.fetchMe()).roles.highest
            if (quarantineRole.position >= currentBotHighest.position) {
                try {
                    await quarantineRole.setPosition(Math.max(1, currentBotHighest.position - 1), 'Safe-Moderation: Fix position')
                    quarantineRole = guild.roles.cache.get(quarantineRole.id)
                } catch (posError) {
                    return { success: false, message: 'Cannot position quarantine role correctly.' }
                }
            }

            const botMember = await guild.members.fetchMe()
            if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles) && !botMember.permissions.has(PermissionFlagsBits.Administrator)) {
                await this.sendBotQuarantineNotification(guild, bot, addedBy, executorMember, config, true)
                return { success: false, message: 'Bot lacks ManageRoles permission' }
            }

            // Classify remaining roles as manageable / unmanageable
            const rolesToRemove = []
            const unmanageableRoles = []
            for (const [roleId, role] of bot.roles.cache.filter(r => r.id !== guild.id)) {
                if (role.position < clientHighestRole.position) rolesToRemove.push(roleId)
                else unmanageableRoles.push(role.name)
            }
            if (unmanageableRoles.length) log.warn(`Unmanageable roles will remain: ${unmanageableRoles.join(', ')}`)
            
            let allRolesRemoved = false
            let quarantineRoleApplied = false
            
            try {
                // Remove manageable roles one by one
                if (rolesToRemove.length > 0) {
                    let removed = 0
                    for (const roleId of rolesToRemove) {
                        try {
                            await bot.roles.remove(roleId, 'Safe-Moderation: Quarantine')
                            removed++
                        } catch (e) {
                            log.error(`Failed to remove role ${guild.roles.cache.get(roleId)?.name || roleId}`, e)
                        }
                    }
                    allRolesRemoved = removed > 0
                    await new Promise(r => setTimeout(r, 500))
                } else {
                    allRolesRemoved = true
                }
                
                // Add quarantine role with verification
                await bot.roles.add(quarantineRole.id, 'Safe-Moderation: Adding quarantine role')
                for (let i = 1; i <= 3; i++) {
                    await new Promise(r => setTimeout(r, 500 * i))
                    await bot.fetch(true)
                    if (bot.roles.cache.has(quarantineRole.id)) { quarantineRoleApplied = true; break }
                }
                if (!quarantineRoleApplied) throw new Error('Quarantine role was not applied after verification')
                
            } catch (error) {
                log.error('Failed to apply quarantine', error)
                await this.sendBotQuarantineNotification(guild, bot, addedBy, executorMember, config, true)
                return {
                    success: false,
                    message: `Failed to quarantine bot: ${error.message}`,
                    details: { allRolesRemoved, quarantineRoleApplied }
                }
            }
            
            log.info(`Quarantine applied: roles=${allRolesRemoved}, qRole=${quarantineRoleApplied}`)

            config.quarantinedBots.push({
                botId: bot.id, addedBy, addedAt: new Date(),
                approved: false, originalRoles, originalRolePermissions
            })
            await config.save()
            await this.sendBotQuarantineNotification(guild, bot, addedBy, executorMember, config)

            return { success: true, message: 'Bot quarantined successfully' }
        } catch (error) {
            log.error('Bot quarantine error', error)
            return { success: false, message: `Failed to quarantine bot: ${error.message}` }
        }
    }

    /**
     * Approve a quarantined bot
     * @param {Guild} guild 
     * @param {string} botId 
     * @param {Object} config 
     * @returns {Promise<Object>}
     */
    async approveBot(guild, botId, config) {
        log.info(`Approving bot ${botId}`)
        
        try {
            const quarantineEntry = config.quarantinedBots.find(b => b.botId === botId)
            if (!quarantineEntry) return { success: false, message: 'Bot not found in quarantine' }

            const bot = await guild.members.fetch(botId).catch(() => null)
            if (!bot) {
                config.quarantinedBots = config.quarantinedBots.filter(b => b.botId !== botId)
                await config.save()
                return { success: false, message: 'Bot has left the server' }
            }
            if (bot.id === quarantineEntry.addedBy) {
                return { success: false, message: 'Internal error: Bot ID matches executor ID' }
            }

            const quarantineRole = guild.roles.cache.get(config.managedRoles?.botQuarantine)
            let quarantineRoleRemoved = false
            
            // Step 1: Remove quarantine role
            if (quarantineRole && bot.roles.cache.has(quarantineRole.id)) {
                try {
                    await bot.roles.remove(quarantineRole, 'Safe-Moderation: Bot approved')
                    for (let i = 1; i <= 3; i++) {
                        await new Promise(r => setTimeout(r, 500 * i))
                        await bot.fetch(true)
                        if (!bot.roles.cache.has(quarantineRole.id)) { quarantineRoleRemoved = true; break }
                        if (i < 3) await bot.roles.remove(quarantineRole, `Safe-Moderation: Bot approved (retry ${i})`).catch(() => {})
                    }
                    if (!quarantineRoleRemoved) log.error('Quarantine role still present after 3 attempts')
                } catch (removeError) {
                    log.error('Failed to remove quarantine role', removeError)
                }
            } else {
                quarantineRoleRemoved = true
            }

            // Step 2: Restore original roles
            let rolesRestored = false
            let restoredCount = 0
            let failedCount = 0
            
            const rolesToRestore = (quarantineEntry.originalRoles || []).filter(id => guild.roles.cache.has(id))
            if (rolesToRestore.length > 0) {
                try {
                    await bot.roles.add(rolesToRestore, 'Safe-Moderation: Bot approved - restoring roles')
                    await bot.fetch(true)
                    restoredCount = rolesToRestore.filter(id => bot.roles.cache.has(id)).length
                    failedCount = rolesToRestore.length - restoredCount
                    rolesRestored = failedCount === 0
                } catch (restoreError) {
                    log.error('Bulk role restore failed, trying individually', restoreError)
                    for (const roleId of rolesToRestore) {
                        try {
                            await bot.roles.add(roleId, 'Safe-Moderation: Restoring role individually')
                            restoredCount++
                        } catch (e) {
                            failedCount++
                        }
                    }
                    rolesRestored = restoredCount === rolesToRestore.length
                }
            } else {
                rolesRestored = true
            }

            // Step 3: Restore original role permissions
            let permissionsRestored = false
            const storedPerms = quarantineEntry.originalRolePermissions || {}
            if (Object.keys(storedPerms).length > 0 && this.client.botProtectionHandler) {
                const result = await this.client.botProtectionHandler.restoreBotPermissions(guild, bot, storedPerms)
                permissionsRestored = result.success
                if (!result.success) log.error(`Permission restore failed: ${result.reason}`)
            } else {
                permissionsRestored = true
            }

            // Final verification
            await bot.fetch(true)
            if (quarantineRole && bot.roles.cache.has(quarantineRole.id) && quarantineRoleRemoved) {
                log.error('Inconsistency: quarantineRoleRemoved=true but role still present')
                quarantineRoleRemoved = false
            }

            const approvalSuccessful = quarantineRoleRemoved && (rolesRestored || restoredCount > 0) && permissionsRestored
            if (!approvalSuccessful) log.error('Approval completed with errors')

            // Clean up thread
            if (quarantineEntry.approvalThreadId) {
                const thread = await guild.channels.fetch(quarantineEntry.approvalThreadId).catch(() => null)
                if (thread) await thread.delete('Safe-Moderation: Bot approved').catch(e => log.error('Thread delete failed', e))
            }

            quarantineEntry.approved = true
            quarantineEntry.approvedAt = new Date()
            await config.save()
            log.info(`Bot approval complete: qRole=${quarantineRoleRemoved} roles=${restoredCount} perms=${permissionsRestored}`)

            return {
                success: approvalSuccessful,
                message: approvalSuccessful
                    ? (rolesRestored ? 'Bot approved successfully' : `Bot approved with warnings: ${failedCount} roles could not be restored`)
                    : 'Bot approval failed - check logs for details',
                details: { quarantineRoleRemoved, rolesRestored, restoredCount, failedCount }
            }
        } catch (error) {
            log.error('Bot approval error', error)
            return { success: false, message: `Failed to approve bot: ${error.message}` }
        }
    }

    /**
     * Reject a quarantined bot (kick it)
     * @param {Guild} guild 
     * @param {string} botId 
     * @param {Object} config 
     * @returns {Promise<Object>}
     */
    async rejectBot(guild, botId, config) {
        try {
            const quarantineEntry = config.quarantinedBots.find(b => b.botId === botId)
            if (!quarantineEntry) {
                return { success: false, message: 'Bot not found in quarantine' }
            }

            const bot = await guild.members.fetch(botId).catch(() => null)
            
            // Delete thread if exists
            if (quarantineEntry.approvalThreadId) {
                try {
                    const thread = await guild.channels.fetch(quarantineEntry.approvalThreadId).catch(() => null)
                    if (thread) {
                        await thread.delete('Safe-Moderation: Bot rejected')
                    }
                } catch (error) {
                    log.error('Failed to delete thread', error)
                }
            }
            
            // NOTE: Quarantine role is intentionally NOT deleted from server - it will be reused for future bot quarantines
            
            if (!bot) {
                // Remove from quarantine list if bot already left
                config.quarantinedBots = config.quarantinedBots.filter(b => b.botId !== botId)
                await config.save()
                return { success: true, message: 'Bot has already left the server' }
            }

            // Kick the bot (this removes all roles including quarantine role)
            await bot.kick('Safe-Moderation: Bot rejected by moderators')

            // Remove from quarantine list
            config.quarantinedBots = config.quarantinedBots.filter(b => b.botId !== botId)
            await config.save()

            return {
                success: true,
                message: 'Bot rejected and kicked successfully'
            }
        } catch (error) {
            log.error('Bot rejection error', error)
            return {
                success: false,
                message: `Failed to reject bot: ${error.message}`
            }
        }
    }

    /**
     * Auto-cleanup bot quarantine after 3 days of no interaction
     * @param {string} guildId 
     * @param {string} botId 
     * @returns {Promise<void>}
     */
    async autoCleanupBotQuarantine(guildId, botId) {
        try {
            log.info(`Auto-cleanup check for bot ${botId}`)
            
            const config = await this.schema.findOne({ guildID: guildId })
            if (!config) return

            const quarantineEntry = config.quarantinedBots.find(b => b.botId === botId)
            if (!quarantineEntry || quarantineEntry.approved) return

            const threeDaysAgo = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000))
            if (quarantineEntry.addedAt > threeDaysAgo) return

            const guild = this.client.guilds.cache.get(guildId)
            if (!guild) return

            const bot = await guild.members.fetch(botId).catch(() => null)
            
            if (bot) {
                // Remove quarantine role and restore to normal (no dangerous permissions)
                const quarantineRole = guild.roles.cache.get(config.managedRoles?.botQuarantine)
                
                if (quarantineRole && bot.roles.cache.has(quarantineRole.id)) {
                    await bot.roles.remove(quarantineRole, 'Safe-Moderation: Auto-cleanup after 3 days')
                }

                // Restore safe roles only (no dangerous permissions)
                if (quarantineEntry.originalRoles?.length > 0) {
                    const safeRoles = quarantineEntry.originalRoles.filter(id => {
                        const role = guild.roles.cache.get(id)
                        return role && !DANGEROUS_PERMS.some(p => role.permissions.has(p))
                    })
                    if (safeRoles.length) await bot.roles.add(safeRoles, 'Safe-Moderation: Auto-cleanup (safe roles only)')
                }
            }

            // Delete thread if exists
            if (quarantineEntry.approvalThreadId) {
                try {
                    const thread = await guild.channels.fetch(quarantineEntry.approvalThreadId).catch(() => null)
                    if (thread) {
                        await thread.delete('Safe-Moderation: Auto-cleanup after 3 days')
                    }
                } catch (error) {
                    log.error('Failed to delete thread', error)
                }
            }

            // Mark as approved (auto-approved due to timeout)
            quarantineEntry.approved = true
            quarantineEntry.approvedAt = new Date()
            await config.save()

            // Send notification about auto-cleanup
            if (config.logChannelId) {
                const logChannel = guild.channels.cache.get(config.logChannelId)
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0x95A5A6)
                        .setTitle('🕐 Safe-Moderation: Bot Auto-Approved')
                        .setDescription(`Bot <@${botId}> has been automatically approved after 3 days with no manager interaction.`)
                        .addFields(
                            { name: 'Bot ID', value: botId, inline: true },
                            { name: 'Added By', value: `<@${quarantineEntry.addedBy}>`, inline: true },
                            { name: 'Status', value: 'Released from quarantine (safe roles only)', inline: false }
                        )
                        .setFooter({ text: 'Dangerous permissions were not restored' })
                        .setTimestamp()

                    await logChannel.send({ embeds: [embed] }).catch(e => log.error('Notification send failed', e))
                }
            }

            log.info(`Auto-cleanup completed for bot ${botId}`)

        } catch (error) {
            log.error('Auto-cleanup error', error)
        }
    }

    /**
     * Validate and sync restriction roles with Discord
     * Checks database entries against actual Discord roles and user memberships
     * Cleans up stale entries and orphaned roles
     * @param {string} guildId 
     * @returns {Promise<Object>} Validation results
     */
    async validateRestrictionRoles(guildId) {
        try {
            log.info(`Starting restriction role validation for guild ${guildId}`)
            
            const config = await this.schema.findOne({ guildID: guildId })
            if (!config) return { success: false, message: 'Guild not configured' }
            
            const guild = this.client.guilds.cache.get(guildId)
            if (!guild) return { success: false, message: 'Guild not found' }
            
            const results = { checked: 0, fixed: 0, removed: 0, errors: [], details: [] }
            
            if (!config.dynamicRestrictionRoles || config.dynamicRestrictionRoles.length === 0) {
                return { success: true, message: 'No restriction roles found', ...results }
            }
            
            const rolesToRemove = []
            
            for (const roleEntry of config.dynamicRestrictionRoles) {
                results.checked++
                
                try {
                    // Check 1: Does the role exist in Discord?
                    const restrictionRole = guild.roles.cache.get(roleEntry.roleId)
                    if (!restrictionRole) {
                        results.details.push(`Role ${roleEntry.roleId} not found in Discord - removing from database`)
                        rolesToRemove.push(roleEntry.roleId)
                        results.removed++
                        continue
                    }
                    
                    // Check 2: Does the user exist?
                    const member = await guild.members.fetch(roleEntry.userId).catch(() => null)
                    if (!member) {
                        results.details.push(`User ${roleEntry.userId} left server - cleaning up role ${restrictionRole.name}`)
                        await restrictionRole.delete('Safe-Moderation: User left server').catch(err => {
                            log.error(`Failed to delete role ${restrictionRole.name}`, err)
                            results.errors.push(`Failed to delete role ${restrictionRole.name}: ${err.message}`)
                        })
                        rolesToRemove.push(roleEntry.roleId)
                        results.removed++
                        continue
                    }
                    
                    // Check 3: Does the user actually have this role?
                    if (!member.roles.cache.has(roleEntry.roleId)) {
                        results.details.push(`User ${member.user.tag} missing role ${restrictionRole.name} - cleaning up`)
                        const roleMembers = guild.members.cache.filter(m => m.roles.cache.has(roleEntry.roleId))
                        if (roleMembers.size === 0) {
                            await restrictionRole.delete('Safe-Moderation: No members have this role').catch(err => {
                                log.error(`Failed to delete role ${restrictionRole.name}`, err)
                                results.errors.push(`Failed to delete role ${restrictionRole.name}: ${err.message}`)
                            })
                        }
                        const { cancelRestrictionRestoration } = require('./safeModerationInitializer')
                        if (roleEntry.restrictedPermissions) {
                            for (const actionType of roleEntry.restrictedPermissions) {
                                cancelRestrictionRestoration(guild.id, member.id, roleEntry.roleId, actionType)
                            }
                        }
                        rolesToRemove.push(roleEntry.roleId)
                        results.removed++
                        continue
                    }
                    
                    // Check 4: Does the original role still exist?
                    const originalRole = guild.roles.cache.get(roleEntry.originalRoleId)
                    if (!originalRole) {
                        results.details.push(`Original role ${roleEntry.originalRoleId} deleted - cannot restore user ${member.user.tag}`)
                        results.errors.push(`Original role missing for ${member.user.tag} - manual intervention may be needed`)
                    }
                    
                    // Check 5: Verify role permissions are correct
                    if (originalRole && roleEntry.restrictedPermissions?.length > 0) {
                        const fastRestrictor = this.client.fastRestrictionApplier
                        if (fastRestrictor) {
                            const allPermsToRemove = []
                            for (const actionType of roleEntry.restrictedPermissions) {
                                allPermsToRemove.push(...fastRestrictor.getPermissionsToRemove(actionType))
                            }
                            const uniquePermsToRemove = [...new Set(allPermsToRemove)]
                            let hasRestrictedPerm = uniquePermsToRemove.some(p => {
                                const v = PermissionFlagsBits[p]
                                return v && restrictionRole.permissions.has(v)
                            })
                            if (restrictionRole.permissions.has(PermissionFlagsBits.Administrator)) hasRestrictedPerm = true
                            
                            if (hasRestrictedPerm) {
                                log.info(`Fixing permissions for ${restrictionRole.name}`)
                                const hasAdmin = originalRole.permissions.has(PermissionFlagsBits.Administrator)
                                let newPerms
                                if (hasAdmin) {
                                    const removeValues = uniquePermsToRemove.map(n => PermissionFlagsBits[n]).filter(Boolean)
                                    const allBigints = Object.values(PermissionFlagsBits).filter(v => typeof v === 'bigint')
                                    newPerms = allBigints.filter(v => v !== PermissionFlagsBits.Administrator && !removeValues.includes(v))
                                } else {
                                    newPerms = originalRole.permissions.toArray().filter(p => !uniquePermsToRemove.includes(p) && p !== 'Administrator')
                                }
                                await restrictionRole.setPermissions(newPerms, 'Safe-Moderation: Validation fix').catch(err => {
                                    log.error(`Failed to fix permissions for ${restrictionRole.name}`, err)
                                    results.errors.push(`Failed to fix permissions for ${restrictionRole.name}: ${err.message}`)
                                })
                                results.fixed++
                                results.details.push(`Fixed permissions for ${restrictionRole.name}`)
                            }
                        }
                    }
                } catch (error) {
                    log.error(`Error validating role ${roleEntry.roleId}`, error)
                    results.errors.push(`Error validating role ${roleEntry.roleId}: ${error.message}`)
                }
            }
            
            // Remove invalid entries from database
            if (rolesToRemove.length > 0) {
                config.dynamicRestrictionRoles = config.dynamicRestrictionRoles.filter(
                    entry => !rolesToRemove.includes(entry.roleId)
                )
                await config.save()
                log.info(`Removed ${rolesToRemove.length} invalid entries from database`)
            }
            
            log.info(`Validation complete: ${results.checked} checked, ${results.fixed} fixed, ${results.removed} removed, ${results.errors.length} errors`)
            
            return {
                success: true,
                message: `Validation complete: ${results.checked} checked, ${results.fixed} fixed, ${results.removed} removed`,
                ...results
            }
            
        } catch (error) {
            log.error('Validation error', error)
            return {
                success: false,
                message: `Validation failed: ${error.message}`,
                checked: 0, fixed: 0, removed: 0, errors: [error.message]
            }
        }
    }

    /**
     * Trigger cleanup of empty restriction roles for a specific guild
     * @param {string} guildId 
     * @returns {Promise<Object>} Cleanup statistics
     */
    async triggerRestrictionRoleCleanup(guildId) {
        try {
            log.info(`Triggering restriction role cleanup for guild ${guildId}`)
            const { cleanupEmptyRestrictionRoles } = require('./safeModerationInitializer')
            return await cleanupEmptyRestrictionRoles(this.client, guildId)
        } catch (error) {
            log.error('Cleanup trigger error', error)
            return { checked: 0, cleaned: 0, errors: 1 }
        }
    }

    /**
     * Send timeout notification
     * @private
     */
    async sendTimeoutNotification(guild, moderator, actionType, limitInfo, config) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const actionLabel = getActionName(actionType)

        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('⏱️ Safe-Moderation: Moderator Timed Out')
            .setDescription(`<@${moderator.id}> has been timed out for exceeding action limits.\n\n**Note:** User doesn't have SS role, so timeout was used instead of granular restriction.`)
            .addFields(
                { name: 'Moderator', value: `${moderator.user.tag} (${moderator.id})`, inline: true },
                { name: 'Action Type', value: actionLabel, inline: true },
                { name: 'Limit', value: `${limitInfo.count}/${limitInfo.limit} in ${limitInfo.duration}s`, inline: true },
                { name: 'Duration', value: `${config.restriction.cooldownDuration} seconds`, inline: true },
                { name: 'Recommendation', value: 'Assign SS-Admin or SS-Moderator role for granular restrictions' }
            )
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(e => log.error('Timeout notification failed', e))
    }

    /**
     * Send restriction notification
     * @private
     */
    async sendRestrictionNotification(guild, moderator, actionType, limitInfo, config, expiresAt) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const actionLabel = getActionName(actionType)

        const restriction = config.activeRestrictions.find(r => r.userId === moderator.id)
        let removedRoleName = 'Unknown'
        if (restriction?.originalRole) {
            const removedRole = guild.roles.cache.get(restriction.originalRole)
            if (removedRole) removedRoleName = removedRole.name
        }

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🚨 Safe-Moderation: Action Restricted')
            .setDescription(`<@${moderator.id}> has been restricted from using **${actionLabel}**.`)
            .addFields(
                { name: 'Moderator', value: `${moderator.user.tag} (${moderator.id})`, inline: true },
                { name: 'Action Type', value: actionLabel, inline: true },
                { name: 'Limit', value: `${limitInfo.count}/${limitInfo.limit} in ${limitInfo.duration}s`, inline: true },
                { name: 'Role Removed', value: removedRoleName, inline: true },
                { name: 'Restriction Role Added', value: `SS-No-${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`, inline: true },
                { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Original role will be restored after cooldown' })
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(e => log.error('Restriction notification failed', e))

        // Try to DM the moderator
        try {
            await moderator.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setTitle('⚠️ Safe-Moderation Restriction')
                        .setDescription(`You have been temporarily restricted from using **${actionLabel}** in **${guild.name}**.`)
                        .addFields(
                            { name: 'Reason', value: `${limitInfo.count}/${limitInfo.limit} actions in ${limitInfo.duration} seconds` },
                            { name: 'Your Role', value: `${removedRoleName} was temporarily removed` },
                            { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` },
                            { name: 'Note', value: 'You can still use other moderation actions. Your role will be restored automatically.' }
                        )
                ]
            })
        } catch (error) {
            // User has DMs disabled
        }
    }

    /**
     * Send restoration notification
     * @private
     */
    async sendRestorationNotification(guild, member, config, actionType) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('✅ Safe-Moderation: Fully Restored')
            .setDescription(`<@${member.id}> has been fully restored after all cooldowns expired.`)
            .addFields(
                { name: 'Moderator', value: `${member.user.tag} (${member.id})` },
                { name: 'Last Restriction', value: getActionName(actionType) }
            )
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(e => log.error('Restoration notification failed', e))
    }

    /**
     * Send partial restoration notification
     * @private
     */
    async sendPartialRestorationNotification(guild, member, config, restoredAction, remainingActions) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const remainingList = remainingActions.map(a => getActionName(a)).join(', ')

        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('🔓 Safe-Moderation: Partial Restoration')
            .setDescription(`<@${member.id}> can now use **${getActionName(restoredAction)}** again.`)
            .addFields(
                { name: 'Moderator', value: `${member.user.tag} (${member.id})` },
                { name: 'Restored Action', value: getActionName(restoredAction) },
                { name: 'Still Restricted', value: remainingList || 'None' }
            )
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(e => log.error('Partial restoration notification failed', e))
    }

    /**
     * Send bot quarantine notification with thread
     * @private
     */
    async sendBotQuarantineNotification(guild, bot, addedBy, executorMember, config, quarantineFailed = false) {
        // Try to get channel from webhook first, fallback to logChannelId
        let logChannel = null
        
        if (config.logWebhook) {
            try {
                // Extract webhook ID from URL
                const webhookUrlParts = config.logWebhook.split('/')
                const webhookId = webhookUrlParts[webhookUrlParts.length - 2]
                
                if (webhookId && webhookId.length >= 17) {
                    const webhook = await guild.client.fetchWebhook(webhookId).catch(() => null)
                    
                    if (webhook && webhook.channelId) {
                        logChannel = guild.channels.cache.get(webhook.channelId)
                    }
                }
            } catch (error) {
                log.error('Failed to extract channel from webhook', error)
            }
        }
        
        // Fallback to logChannelId if webhook channel not found
        if (!logChannel && config.logChannelId) {
            logChannel = guild.channels.cache.get(config.logChannelId)
        }
        
        if (!logChannel) {
            log.warn('No log channel configured for bot quarantine notifications')
            return
        }

        try {
            // Get manager roles for ping
            const managerRolesPing = config.managerRoles && config.managerRoles.length > 0
                ? config.managerRoles.map(id => `<@&${id}>`).join(' ')
                : '@here'

            // Create professional embed with clickable links
            const botProfileLink = `https://discord.com/users/${bot.id}`
            const executorProfileLink = `https://discord.com/users/${addedBy}`
            const addedAtTimestamp = Math.floor(Date.now() / 1000)

            const statusText = quarantineFailed 
                ? '**Current:** ⚠️ Quarantine Failed\n**Added:** <t:' + addedAtTimestamp + ':R>\n**Issue:** Cannot manage bot roles'
                : '**Current:** 🔒 Quarantined\n**Added:** <t:' + addedAtTimestamp + ':R>\n**Awaiting:** Manager Approval'

            const securityText = quarantineFailed
                ? '⚠️ **CRITICAL:** Bot role hierarchy too high\n⚠️ Cannot remove permissions automatically\n⚠️ Manual intervention required\n❌ Quarantine failed - review immediately'
                : '✅ All permissions removed\n✅ Quarantine role applied\n✅ Role positioned above moderator\n✅ Awaiting manual review'

            const embed = new EmbedBuilder()
                .setColor(quarantineFailed ? 0xFF0000 : 0xE67E22)
                .setAuthor({ 
                    name: '🛡️ Safe-Moderation: Bot Protection System',
                    iconURL: guild.iconURL() || undefined
                })
                .setTitle(quarantineFailed ? '🚨 CRITICAL: Bot Quarantine Failed' : '⚠️ Bot Quarantine Alert')
                .setDescription(
                    quarantineFailed
                        ? `A moderator has attempted to add a bot to the server. **QUARANTINE FAILED** - the bot's role hierarchy is too high for automatic quarantine.\n\n` +
                          `**URGENT ACTION REQUIRED:** Manually review this bot immediately and remove dangerous permissions.`
                        : `A moderator has attempted to add a bot to the server. The bot has been **automatically quarantined** for security review.\n\n` +
                          `**Action Required:** Please review the bot and approve or reject it below.`
                )
                .addFields(
                    { 
                        name: '🤖 Bot Information', 
                        value: `**Name:** ${bot.user.tag}\n**ID:** \`${bot.id}\`\n**Profile:** [View Bot Profile](${botProfileLink})`,
                        inline: true 
                    },
                    { 
                        name: '👤 Added By', 
                        value: `**User:** <@${addedBy}>\n**Tag:** ${executorMember.user.tag}\n**Profile:** [View Profile](${executorProfileLink})`,
                        inline: true 
                    },
                    { 
                        name: '📊 Status', 
                        value: statusText,
                        inline: false 
                    },
                    {
                        name: quarantineFailed ? '⚠️ Security Alert' : '🔐 Security Measures',
                        value: securityText,
                        inline: false
                    }
                )
                .setThumbnail(bot.user.displayAvatarURL({ size: 256 }))
                .setFooter({ text: `Bot ID: ${bot.id} • Moderator ID: ${addedBy}` })
                .setTimestamp()

            const approveButton = new ButtonBuilder()
                .setCustomId(`ss_approve_bot_${bot.id}`)
                .setLabel('Approve Bot')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setDisabled(quarantineFailed) // Disable if quarantine failed

            const rejectButton = new ButtonBuilder()
                .setCustomId(`ss_reject_bot_${bot.id}`)
                .setLabel('Reject & Kick')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)

            const row = new ActionRowBuilder().addComponents(approveButton, rejectButton)

            // Send the notification message
            const message = await logChannel.send({
                content: quarantineFailed 
                    ? `${managerRolesPing}\n\n**🚨 CRITICAL ALERT: Bot Quarantine Failed - Manual Review Required**`
                    : `${managerRolesPing}\n\n**🚨 URGENT: Bot Quarantine Alert**`,
                embeds: [embed],
                components: [row]
            }).catch(e => log.error('Failed to send quarantine notification', e))

            if (!message) return

            // Create a thread for discussion
            let threadId = null
            try {
                const canCreateThreads = logChannel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.CreatePublicThreads)
                
                if (canCreateThreads) {
                    const thread = await message.startThread({
                        name: `🤖 Bot Review: ${bot.user.username}`,
                        autoArchiveDuration: 10080, // 7 days
                        reason: 'Safe-Moderation: Bot quarantine discussion'
                    })

                    threadId = thread.id

                    // Send initial message in thread
                    const threadContent = quarantineFailed
                        ? `${managerRolesPing}\n\n` +
                          `**🚨 CRITICAL: Bot Quarantine Failed**\n\n` +
                          `**Bot:** [${bot.user.tag}](${botProfileLink}) (\`${bot.id}\`)\n` +
                          `**Added By:** <@${addedBy}> ([View Profile](${executorProfileLink}))\n` +
                          `**Time:** <t:${addedAtTimestamp}:F>\n\n` +
                          `**What happened?**\n` +
                          `The moderator **${executorMember.user.tag}** attempted to add the bot **${bot.user.tag}** to the server. ` +
                          `However, the bot's role hierarchy is too high for our bot to manage automatically.\n\n` +
                          `**⚠️ CRITICAL ISSUE:**\n` +
                          `• The bot's highest role is at or above our bot's highest role\n` +
                          `• Cannot automatically remove dangerous permissions\n` +
                          `• Cannot apply quarantine role\n\n` +
                          `**Required Actions:**\n` +
                          `1. Manually review the bot's permissions immediately\n` +
                          `2. Remove any dangerous permissions (Administrator, Ban, Kick, Manage Roles, etc.)\n` +
                          `3. Consider adjusting role hierarchy\n` +
                          `4. Approve or reject the bot using the buttons above\n\n` +
                          `**Discussion:**\nUse this thread to discuss whether this bot should be approved or rejected.`
                        : `${managerRolesPing}\n\n` +
                          `**Bot Quarantine Details**\n\n` +
                          `**Bot:** [${bot.user.tag}](${botProfileLink}) (\`${bot.id}\`)\n` +
                          `**Added By:** <@${addedBy}> ([View Profile](${executorProfileLink}))\n` +
                          `**Time:** <t:${addedAtTimestamp}:F>\n\n` +
                          `**What happened?**\n` +
                          `The moderator **${executorMember.user.tag}** attempted to add the bot **${bot.user.tag}** to the server. ` +
                          `The bot has been automatically quarantined with all permissions removed for security.\n\n`

                    await thread.send({
                        content: threadContent +
                            `**Next Steps:**\n` +
                            `• Review the bot's purpose and permissions\n` +
                            `• Verify with the moderator why this bot was added\n` +
                            `• Click **Approve** to allow the bot (safe roles only)\n` +
                            `• Click **Reject & Kick** to remove the bot from the server\n\n` +
                            `Use this thread to discuss the bot before making a decision.`
                    })

                } else {
                    log.warn(`Cannot create threads in ${logChannel.name} - missing permissions`)
                }
            } catch (threadError) {
                log.error('Failed to create thread', threadError)
            }

            // Store message ID and thread ID in database
            const quarantineEntry = config.quarantinedBots.find(b => b.botId === bot.id)
            if (quarantineEntry) {
                quarantineEntry.approvalMessageId = message.id
                if (threadId) {
                    quarantineEntry.approvalThreadId = threadId
                }
                await config.save()
            }

            // Schedule auto-cleanup after 3 days
            setTimeout(() => this.autoCleanupBotQuarantine(guild.id, bot.id), 3 * 24 * 60 * 60 * 1000)

        } catch (error) {
            log.error('Bot quarantine notification error', error)
        }
    }
}

module.exports = SafeModerationManager
