/**
 * Auto-Protection Handler
 * Implements advanced protection features:
 * 1. Auto-delete unused restriction roles
 * 2. Auto-revert server changes (name, description, icon, AutoMod)
 * 3. Auto-recreate deleted channels/roles
 * 4. Log channel protection
 * 
 * Performance: All operations <100ms with fire-and-forget for non-critical tasks
 */

const { PermissionFlagsBits, ChannelType, AuditLogEvent } = require('discord.js')
const logger = require('./safeModerationLogger')
const log = logger.scope('AutoProtection')

// Import auto-voice dataStore for temp channel exemption
let dataStore = null
try {
    dataStore = require('../modules/auto-voice/voice/dataStore')
    log.debug('Auto-voice dataStore loaded successfully')
} catch (error) {
    log.debug('Auto-voice dataStore not available (module may not be configured)')
}

class AutoProtectionHandler {
    constructor(client) {
        this.client = client
        this.safeModerationSchema = require('../schemas/safeModerationSchema')
        
        // Track pending recreations to avoid duplicates
        this.pendingRecreations = new Set()
        
        // Cleanup interval (every 5 minutes)
        this.cleanupInterval = setInterval(() => this.cleanupUnusedRestrictionRoles(), 5 * 60 * 1000)
        
        log.info('Initialized with 5-minute cleanup interval')
    }

    /**
     * FEATURE 1: Auto-delete unused restriction roles
     * Runs every 5 minutes to clean up roles with no members
     */
    async cleanupUnusedRestrictionRoles() {
        const startTime = Date.now()
        log.debug('Starting cleanup of unused restriction roles')
        
        try {
            // Get all guilds with Safe Moderation enabled
            const configs = await this.safeModerationSchema.find({ enabled: true })
            
            let totalCleaned = 0
            
            for (const config of configs) {
                const guild = this.client.guilds.cache.get(config.guildID)
                if (!guild) continue
                
                const cleaned = await this.cleanupGuildRestrictionRoles(guild, config)
                totalCleaned += cleaned
            }
            
            const elapsed = Date.now() - startTime
            log.info(`Cleanup complete: ${totalCleaned} roles deleted in ${elapsed}ms`)
            
        } catch (error) {
            log.error('Cleanup failed', error)
        }
    }

    /**
     * Clean up unused restriction roles for a specific guild
     */
    async cleanupGuildRestrictionRoles(guild, config) {
        let cleaned = 0
        
        if (!config.dynamicRestrictionRoles || config.dynamicRestrictionRoles.length === 0) {
            return cleaned
        }
        
        const rolesToDelete = []
        
        for (const entry of config.dynamicRestrictionRoles) {
            const role = guild.roles.cache.get(entry.roleId)
            
            // Delete if role doesn't exist or has no members
            if (!role) {
                // Role already deleted, just clean up database
                rolesToDelete.push(entry.roleId)
                log.debug(`Role ${entry.roleId} already deleted, cleaning DB`)
                continue
            }
            
            // Check if role has any members
            const members = guild.members.cache.filter(m => m.roles.cache.has(role.id))
            
            if (members.size === 0) {
                // No members, delete the role
                try {
                    await role.delete('Safe-Moderation: Unused restriction role cleanup')
                    rolesToDelete.push(entry.roleId)
                    cleaned++
                    log.info(`Deleted unused role: ${role.name} (${role.id})`)
                } catch (error) {
                    log.error(`Failed to delete role ${role.name}`, error)
                }
            }
        }
        
        // Clean up database entries
        if (rolesToDelete.length > 0) {
            config.dynamicRestrictionRoles = config.dynamicRestrictionRoles.filter(
                entry => !rolesToDelete.includes(entry.roleId)
            )
            
            // Async save (fire-and-forget)
            config.save().catch(err => 
                log.error('Failed to save config after cleanup', err)
            )
        }
        
        return cleaned
    }

    /**
     * FEATURE 2: Cache server state for revert operations
     * Not implemented - would require additional caching system
     */
    async cacheServerState(guild) {
        // Not implemented - optional feature
        return null
    }

    /**
     * FEATURE 2: Auto-revert server changes made by bots
     * Handles: GuildUpdate, AutoModRuleCreate, AutoModRuleUpdate, AutoModRuleDelete
     * Only reverts if changed by a BOT (nuke protection)
     */
    async revertServerChanges(auditLogEntry, guild, config) {
        const startTime = Date.now()
        const executor = auditLogEntry.executor
        
        // Only revert if executor is a bot
        if (!executor || !executor.bot) {
            log.debug(`Server changes by user ${executor?.tag} - not reverting`)
            return
        }
        
        log.info(`Bot ${executor.tag} modified server settings - reverting`)
        
        try {
            const action = auditLogEntry.action
            
            if (action === AuditLogEvent.GuildUpdate) {
                await this.revertGuildUpdate(auditLogEntry, guild, executor)
            } else if (action === AuditLogEvent.AutoModerationRuleCreate || 
                       action === AuditLogEvent.AutoModerationRuleUpdate ||
                       action === AuditLogEvent.AutoModerationRuleDelete) {
                await this.revertAutoModChange(auditLogEntry, guild, executor)
            }
            
            // Kick the bot
            const botMember = await guild.members.fetch(executor.id).catch(() => null)
            if (botMember) {
                await botMember.kick('Safe-Moderation: Unauthorized server modification')
                log.info(`Kicked bot ${executor.tag}`)
            }
            
            // Log the action
            await this.logProtectionAction(guild, config, {
                type: 'server_revert',
                executor: executor.tag,
                executorId: executor.id,
                action: auditLogEntry.action,
                elapsed: Date.now() - startTime
            })
            
        } catch (error) {
            log.error('Failed to revert server changes', error)
        }
    }

    /**
     * Revert guild update (name, description, icon, banner, splash)
     */
    async revertGuildUpdate(auditLogEntry, guild, executor) {
        // Not implemented - would require server state caching
        log.info('Guild update revert not implemented (requires state caching)')
    }

    /**
     * Revert AutoMod rule changes
     */
    async revertAutoModChange(auditLogEntry, guild, executor) {
        // Not implemented - would require AutoMod state caching
        log.info('AutoMod revert not implemented (requires state caching)')
    }

    /**
     * FEATURE 3: Auto-recreate deleted channels
     * Only recreates if deleted by a BOT (nuke protection)
     * Exception: Log channel is ALWAYS recreated (handled separately)
     * 
     * @param {Channel} deletedChannel - Full channel object with all properties
     * @param {User} executor - User who deleted the channel
     * @param {Guild} guild - Guild object
     * @param {Object} config - Safe moderation config
     */
    async recreateDeletedChannel(deletedChannel, executor, guild, config) {
        log.debug(`recreateDeletedChannel: ${deletedChannel.name} (${deletedChannel.id}) by ${executor?.tag}, perms=${deletedChannel.permissionOverwrites?.cache?.size || 0}`)
        
        log.debug(`Channel data: type=${deletedChannel.type} parent=${deletedChannel.parentId} pos=${deletedChannel.position}`)
        
        if (deletedChannel.permissionOverwrites?.cache) {
            log.debug(`Permission overwrites: ${deletedChannel.permissionOverwrites.cache.size} entries`)
        }
        
        // Check if this is the log channel - use logChannelId from config
        const isLogChannel = config.logChannelId && deletedChannel.id === config.logChannelId
        
        log.debug(`Log channel check: config=${config.logChannelId} deleted=${deletedChannel.id} isLog=${isLogChannel}`)
        
        if (isLogChannel) {
            // Log channel - ALWAYS recreate (even if deleted by user)
            log.debug('This is the log channel - calling protectLogChannel')
            return await this.protectLogChannel(deletedChannel, guild, config, executor)
        }
        
        // Check if this is a temporary auto-voice channel - NEVER recreate
        if (dataStore) {
            try {
                const tempData = dataStore.getTempChannel(deletedChannel.id)
                if (tempData !== null && tempData !== undefined) {
                    log.debug(`Channel ${deletedChannel.name} (${deletedChannel.id}) is a temporary voice channel - not recreating`)
                    return
                }
            } catch (error) {
                log.debug('Error checking temp channel status:', error.message)
            }
        }
        
        // Check if THIS bot deleted the channel - NEVER recreate our own deletions
        if (executor && executor.id === this.client.user.id) {
            log.debug(`Channel ${deletedChannel.name} deleted by THIS bot - not recreating`)
            return
        }
        
        // For other channels - only recreate if deleted by a bot
        if (!executor || !executor.bot) {
            log.debug(`Channel ${deletedChannel.name} deleted by user - not recreating`)
            return
        }
        
        log.info(`Channel ${deletedChannel.name} deleted by bot ${executor.tag} - recreating`)
        
        const isCategory = deletedChannel.type === 4 // ChannelType.GuildCategory
        log.debug(`Channel type: ${deletedChannel.type} (isCategory: ${isCategory})`)
        
        // If it's a category, we need to track its child channels
        let childChannels = []
        if (isCategory) {
            // Get all channels that were in this category
            childChannels = guild.channels.cache.filter(ch => ch.parentId === deletedChannel.id)
            log.debug(`Category had ${childChannels.size} child channels`)
        }
        
        // Recreate the channel directly
        const startTime = Date.now()
        try {
            // Prepare permission overwrites for channel creation
            const permissionOverwrites = []
            if (deletedChannel.permissionOverwrites && deletedChannel.permissionOverwrites.cache) {
                log.debug(`Preparing ${deletedChannel.permissionOverwrites.cache.size} permission overwrites`)
                
                for (const [id, overwrite] of deletedChannel.permissionOverwrites.cache) {
                    permissionOverwrites.push({
                        id: id,
                        allow: overwrite.allow.bitfield,
                        deny: overwrite.deny.bitfield,
                        type: overwrite.type
                    })
                }
            }
            
            // Recreate channel with basic properties AND permissions from the full channel object
            const channelOptions = {
                name: deletedChannel.name,
                type: deletedChannel.type,
                topic: deletedChannel.topic,
                nsfw: deletedChannel.nsfw,
                bitrate: deletedChannel.bitrate,
                userLimit: deletedChannel.userLimit,
                rateLimitPerUser: deletedChannel.rateLimitPerUser,
                parent: deletedChannel.parentId,
                position: deletedChannel.position || 0,
                permissionOverwrites: permissionOverwrites,
                reason: `Safe-Moderation: Channel deleted by bot ${executor.tag}`
            }
            
            log.debug(`Creating channel with ${permissionOverwrites.length} permission overwrites`)
            
            const newChannel = await guild.channels.create(channelOptions)
            
            log.info(`Recreated channel: ${newChannel.name}`)
            log.debug(`Channel created: ${newChannel.name} (${newChannel.id}) with ${newChannel.permissionOverwrites.cache.size} permission overwrites`)
            
            if (newChannel.permissionOverwrites.cache.size === 0) {
                log.warn('New channel has no permission overwrites')
            }
            
            // If this was a category, move child channels back and restore their positions
            if (isCategory && childChannels.size > 0) {
                log.debug(`Restoring ${childChannels.size} child channels to category`)
                
                // Sort channels by their original position
                const sortedChildren = Array.from(childChannels.values()).sort((a, b) => a.position - b.position)
                
                let movedCount = 0
                for (const childChannel of sortedChildren) {
                    try {
                        await childChannel.setParent(newChannel.id, {
                            lockPermissions: false,
                            reason: `Safe-Moderation: Restore to recreated category`
                        })
                        
                        movedCount++
                        
                        // Small delay to avoid rate limits
                        if (movedCount % 3 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 300))
                        }
                    } catch (error) {
                        log.error(`Failed to move channel ${childChannel.name}`, error)
                    }
                }
                
                log.info(`Restored ${movedCount}/${childChannels.size} child channels to category`)
            }
            
            // CRITICAL: Wait for Discord to finish internal ordering after channel moves
            log.debug('Waiting 500ms for Discord to process channel moves')
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Position restoration for categories and channels
            if (deletedChannel.position !== undefined && deletedChannel.position !== null) {
                log.debug(`Position restoration: ${newChannel.name} target=${deletedChannel.position} current=${newChannel.position}`)
                
                try {
                    // Strategy 1: Direct setPosition (most reliable for categories)
                    await newChannel.setPosition(deletedChannel.position, {
                        relative: false,
                        reason: `Safe-Moderation: Restore original position`
                    })
                    
                    log.info(`Restored ${isCategory ? 'category' : 'channel'} position to ${deletedChannel.position}`)
                    
                    // Wait for position update to propagate
                    await new Promise(resolve => setTimeout(resolve, 300))
                    
                    // Verify position was applied
                    await newChannel.fetch() // Refresh channel data
                    log.debug(`Position verification: ${newChannel.position} (target: ${deletedChannel.position})`)
                    
                    // If position still incorrect, try bulk reorder
                    if (Math.abs(newChannel.position - deletedChannel.position) > 1) {
                        log.debug('Position mismatch detected, attempting bulk reorder')
                        await this.bulkReorderChannels(guild, newChannel, deletedChannel.position, isCategory)
                    }
                    
                } catch (error) {
                    log.error('Failed to set position', error)
                    
                    // Fallback: Try bulk reorder
                    try {
                        log.debug('Attempting fallback bulk reorder')
                        await this.bulkReorderChannels(guild, newChannel, deletedChannel.position, isCategory)
                    } catch (bulkError) {
                        log.error('Bulk reorder also failed', bulkError)
                    }
                }
            }
            
            // Kick the bot
            const botMember = await guild.members.fetch(executor.id).catch(() => null)
            if (botMember) {
                await botMember.kick('Safe-Moderation: Unauthorized channel deletion')
                log.info(`Kicked bot ${executor.tag}`)
            }
            
            const elapsed = Date.now() - startTime
            
            // Log the action
            await this.logProtectionAction(guild, config, {
                type: 'channel_recreate',
                channelName: newChannel.name,
                channelType: newChannel.type,
                executor: executor.tag,
                executorId: executor.id,
                elapsed
            })
            
            return { success: true, channel: newChannel, elapsed }
            
        } catch (error) {
            log.error('Failed to recreate channel', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * FEATURE 3: Auto-recreate deleted roles
     * Only recreates if deleted by a BOT (nuke protection)
     * 
     * @param {Role} deletedRole - Full role object with all properties
     * @param {User} executor - User who deleted the role
     * @param {Guild} guild - Guild object
     * @param {Object} config - Safe moderation config
     */
    async recreateDeletedRole(deletedRole, executor, guild, config) {
        // Check if THIS bot deleted the role - NEVER recreate our own deletions
        if (executor && executor.id === this.client.user.id) {
            log.debug(`Role ${deletedRole.name} deleted by THIS bot - not recreating`)
            return
        }
        
        // Only recreate if deleted by a bot
        if (!executor || !executor.bot) {
            log.debug(`Role ${deletedRole.name} deleted by user - not recreating`)
            return
        }
        
        log.info(`Role ${deletedRole.name} deleted by bot ${executor.tag} - recreating`)
        
        // CRITICAL: Track which members had this role BEFORE deletion
        const membersWithRole = guild.members.cache.filter(member => 
            member.roles.cache.has(deletedRole.id)
        )
        
        log.debug(`Found ${membersWithRole.size} members with role ${deletedRole.name}`)
        
        const startTime = Date.now()
        try {
            // Recreate role with properties from the full role object
            const newRole = await guild.roles.create({
                name: deletedRole.name,
                color: deletedRole.color,
                hoist: deletedRole.hoist,
                permissions: deletedRole.permissions,
                mentionable: deletedRole.mentionable,
                position: deletedRole.position,
                reason: `Safe-Moderation: Role deleted by bot ${executor.tag}`
            })
            
            log.info(`Recreated role: ${newRole.name} (${newRole.id})`)
            
            // Smart reassignment based on member count
            const SMALL_ROLE_LIMIT = 50
            const MEDIUM_ROLE_LIMIT = 200
            
            if (membersWithRole.size === 0) {
                log.debug('No members had this role')
            } else if (membersWithRole.size <= SMALL_ROLE_LIMIT) {
                // Small role - reassign immediately (blocks until complete)
                log.debug(`Role has ${membersWithRole.size} members - reassigning immediately`)
                await this.reassignRoleMembers(newRole, membersWithRole, guild)
            } else if (membersWithRole.size <= MEDIUM_ROLE_LIMIT) {
                // Medium role - reassign in background (non-blocking)
                log.debug(`Role has ${membersWithRole.size} members - reassigning in background`)
                this.reassignRoleMembers(newRole, membersWithRole, guild).catch(err => {
                    log.error('Background reassignment failed', err)
                })
            } else {
                // Large role - skip reassignment and notify admins
                log.warn(`Role has ${membersWithRole.size} members - too large for auto-reassignment`)
                await this.notifyLargeRoleSkipped(guild, config, newRole, membersWithRole)
            }
            
            // Kick the bot
            const botMember = await guild.members.fetch(executor.id).catch(() => null)
            if (botMember) {
                await botMember.kick('Safe-Moderation: Unauthorized role deletion')
                log.info(`Kicked bot ${executor.tag}`)
            }
            
            const elapsed = Date.now() - startTime
            
            // Log the action
            await this.logProtectionAction(guild, config, {
                type: 'role_recreate',
                roleName: newRole.name,
                roleColor: newRole.color,
                executor: executor.tag,
                executorId: executor.id,
                membersReassigned: membersWithRole.size,
                elapsed
            })
            
            return { success: true, role: newRole, membersReassigned: membersWithRole.size, elapsed }
            
        } catch (error) {
            log.error('Failed to recreate role', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * FEATURE 4: Protect log channel from deletion
     * ALWAYS recreate if deleted (by user OR bot) - required for /safe-moderation command
     */
    async protectLogChannel(deletedChannel, guild, config, executor) {
        const startTime = Date.now()
        
        log.debug(`protectLogChannel: ${deletedChannel?.name} (${deletedChannel?.id}) by ${executor?.tag}`)
        
        if (!config.logWebhook && !config.logChannelId) {
            log.debug('No logWebhook or logChannelId in config - aborting')
            return
        }
        
        // Verify this is the log channel
        if (deletedChannel && config.logChannelId && deletedChannel.id !== config.logChannelId) {
            log.debug('Not the log channel - aborting')
            return
        }
        
        const deletedBy = executor ? (executor.bot ? `bot ${executor.tag}` : `user ${executor.tag}`) : 'unknown'
        log.info(`Log channel deleted by ${deletedBy}! Recreating...`)
        
        try {
            // Get cached channel data for complete restoration
            let channelData = null
            
            if (!channelData) {
                // Fallback to basic data
                log.debug('Using fallback channel data')
                channelData = {
                    name: deletedChannel?.name || 'safe-moderation-logs',
                    topic: deletedChannel?.topic || 'Safe Moderation Logs - Required for /safe-moderation command',
                    nsfw: deletedChannel?.nsfw || false,
                    rateLimitPerUser: deletedChannel?.rateLimitPerUser || 0,
                    parentId: deletedChannel?.parentId,
                    position: deletedChannel?.position || 0,
                    permissionOverwrites: deletedChannel?.permissionOverwrites ? 
                        Array.from(deletedChannel.permissionOverwrites.cache.values()).map(ow => ({
                            id: ow.id,
                            type: ow.type,
                            allow: ow.allow.bitfield.toString(),
                            deny: ow.deny.bitfield.toString()
                        })) : [],
                    webhooks: []
                }
            }
            
            log.debug(`Creating channel: ${channelData.name} perms=${channelData.permissionOverwrites?.length || 0}`)
            
            // Prepare permission overwrites for channel creation
            const permissionOverwrites = []
            if (channelData.permissionOverwrites && channelData.permissionOverwrites.length > 0) {
                for (const overwrite of channelData.permissionOverwrites) {
                    permissionOverwrites.push({
                        id: overwrite.id,
                        allow: BigInt(overwrite.allow),
                        deny: BigInt(overwrite.deny),
                        type: overwrite.type
                    })
                }
                log.debug(`Prepared ${permissionOverwrites.length} permission overwrites`)
            }
            
            // Recreate the channel with all properties INCLUDING permissions
            const newChannel = await guild.channels.create({
                name: channelData.name,
                type: ChannelType.GuildText,
                topic: channelData.topic,
                nsfw: channelData.nsfw,
                rateLimitPerUser: channelData.rateLimitPerUser,
                parent: channelData.parentId,
                position: channelData.position || 0,
                permissionOverwrites: permissionOverwrites,
                reason: `Safe-Moderation: Log channel protection (deleted by ${deletedBy})`
            })
            
            log.info(`Created new log channel: ${newChannel.name} (${newChannel.id})`)
            
            // Restore old webhooks if any (except the Safe Moderation webhook)
            if (channelData.webhooks && channelData.webhooks.length > 0) {
                log.debug(`Restoring ${channelData.webhooks.length} webhooks`)
                for (const webhookData of channelData.webhooks) {
                    try {
                        if (webhookData.name !== 'Safe Moderation') {
                            await newChannel.createWebhook({
                                name: webhookData.name,
                                avatar: webhookData.avatar,
                                reason: 'Safe-Moderation: Restore webhook'
                            })
                            log.debug(`Restored webhook: ${webhookData.name}`)
                        }
                    } catch (error) {
                        log.error(`Failed to restore webhook`, error)
                    }
                }
            }
            
            // Create new Safe Moderation webhook
            log.debug('Creating Safe Moderation webhook')
            const webhook = await newChannel.createWebhook({
                name: 'Safe Moderation',
                avatar: guild.iconURL({ size: 256 }),
                reason: 'Safe-Moderation: Log channel protection'
            })
            
            log.info('Created new webhook')
            
            // Update config with new webhook URL and channel ID
            config.logWebhook = webhook.url
            config.logChannelId = newChannel.id
            await config.save()
            
            log.info('Updated config with new webhook')
            
            // Invalidate cache
            if (this.client.safeModerationConfigCache) {
                this.client.safeModerationConfigCache.invalidate(guild.id)
                log.debug('Invalidated config cache')
            }
            
            // Send protection message
            const { EmbedBuilder } = require('discord.js')
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ Log Channel Protection')
                .setDescription('This channel was deleted and has been automatically recreated.')
                .addFields(
                    { name: 'Deleted By', value: deletedBy, inline: true },
                    { name: 'Reason', value: 'Required for /safe-moderation command', inline: true },
                    { name: '⚠️ Important', value: 'You must **disable Safe Moderation** using `/safe-moderation disable` before deleting this channel.', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Safe Moderation System', iconURL: guild.iconURL() })
            
            await newChannel.send({ embeds: [embed] })
            
            const elapsed = Date.now() - startTime
            log.info(`Log channel fully restored in ${elapsed}ms`)
            
            // Log the action
            await this.logProtectionAction(guild, config, {
                type: 'log_channel_restore',
                channelName: newChannel.name,
                deletedBy: deletedBy,
                executor: executor?.tag || 'Unknown',
                executorId: executor?.id || 'Unknown',
                elapsed
            })
            
            return { success: true, channel: newChannel }
            
        } catch (error) {
            log.error('Failed to protect log channel', error)
            
            // Try to notify via any remaining channels
            try {
                const owner = await guild.fetchOwner()
                await owner.send({
                    content: `⚠️ **Critical Error in ${guild.name}**\n\nFailed to recreate Safe Moderation log channel after deletion.\n\nError: ${error.message}\n\nPlease manually run \`/safe-moderation setup\` to restore the system.`
                }).catch(() => {})
            } catch {}
            
            return { success: false, error: error.message }
        }
    }

    /**
     * Extract channel ID from webhook URL
     */
    extractChannelIdFromWebhook(webhookUrl) {
        try {
            if (!webhookUrl) {
                log.debug('extractChannelIdFromWebhook: webhookUrl is null/undefined')
                return null
            }
            
            log.debug(`extractChannelIdFromWebhook: parsing ${webhookUrl.substring(0, 50)}...`)
            const match = webhookUrl.match(/\/channels\/(\d+)\//)
            const channelId = match ? match[1] : null
            log.debug(`extractChannelIdFromWebhook: result=${channelId}`)
            return channelId
        } catch (error) {
            log.error('extractChannelIdFromWebhook error', error)
            return null
        }
    }

    /**
     * Log protection action to webhook
     */
    async logProtectionAction(guild, config, details) {
        if (!config.logWebhook) return
        
        try {
            const { WebhookClient, EmbedBuilder } = require('discord.js')
            const webhook = new WebhookClient({ url: config.logWebhook })
            
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Auto-Protection Action')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Type', value: details.type, inline: true },
                    { name: 'Executor', value: `${details.executor}\n\`${details.executorId}\``, inline: true },
                    { name: 'Time', value: `${details.elapsed}ms`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Guild: ${guild.name}` })
            
            // Add type-specific fields
            if (details.channelName) {
                embed.addFields({ name: 'Channel', value: details.channelName, inline: true })
            }
            if (details.roleName) {
                embed.addFields({ name: 'Role', value: details.roleName, inline: true })
            }
            
            await webhook.send({ embeds: [embed] })
        } catch (error) {
            log.error('Failed to log protection action', error)
        }
    }

    /**
     * Batch recreate multiple channels/roles
     */
    async batchRecreate(guild, config, deletions) {
        const results = await Promise.allSettled(
            deletions.map(({ type, channel, role, executor }) => {
                if (type === 'channel') {
                    return this.recreateDeletedChannel(channel, executor, guild, config)
                } else if (type === 'role') {
                    return this.recreateDeletedRole(role, executor, guild, config)
                }
            })
        )
        
        const successful = results.filter(r => r.status === 'fulfilled').length
        log.info(`Batch recreate: ${successful}/${deletions.length} successful`)
        
        return { successful, total: deletions.length }
    }

    /**
     * Reassign role to members (extracted for reusability)
     */
    async reassignRoleMembers(role, membersWithRole, guild) {
        let reassigned = 0
        let failed = 0
        
        for (const [memberId, member] of membersWithRole) {
            try {
                // Check if member still exists and bot can manage them
                if (member.roles.highest.position < guild.members.me?.roles.highest.position) {
                    await member.roles.add(role, `Safe-Moderation: Restore role after bot deletion`)
                    reassigned++
                    
                    // Rate limit protection - delay every 5 members
                    if (reassigned % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 500))
                    }
                } else {
                    log.debug(`Cannot reassign to ${member.user.tag} (higher role hierarchy)`)
                    failed++
                }
            } catch (error) {
                failed++
                log.error(`Failed to reassign role to ${member.user.tag}`, error)
            }
        }
        
        log.info(`Reassigned role to ${reassigned}/${membersWithRole.size} members (${failed} failed)`)
        
        return { reassigned, failed }
    }

    /**
     * Notify admins when role is too large for auto-reassignment
     */
    async notifyLargeRoleSkipped(guild, config, role, membersWithRole) {
        try {
            const { EmbedBuilder, WebhookClient } = require('discord.js')
            
            // Build member list (max 20 members shown)
            const memberList = Array.from(membersWithRole.values())
                .slice(0, 20)
                .map(m => `• ${m.user.tag} (${m.id})`)
                .join('\n')
            
            const remaining = membersWithRole.size - 20
            const memberListText = memberList + (remaining > 0 ? `\n... and ${remaining} more` : '')
            
            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // Orange
                .setTitle('⚠️ Large Role Restoration')
                .setDescription(`Role **${role.name}** was recreated but has too many members (${membersWithRole.size}) for automatic reassignment.`)
                .addFields(
                    { 
                        name: '📋 Members Who Had This Role', 
                        value: memberListText.length > 1024 ? `${membersWithRole.size} members (too many to list)` : memberListText,
                        inline: false 
                    },
                    { 
                        name: '🔧 How to Reassign', 
                        value: `Use the command: \`/massrole add role:${role.name}\`\n\nThis will add the role back to all members who should have it.`,
                        inline: false 
                    },
                    {
                        name: 'ℹ️ Why This Happened',
                        value: `A bot deleted this role. The role was recreated with all properties, but automatic reassignment was skipped to prevent bot slowdown.`,
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: `Role ID: ${role.id}`, iconURL: guild.iconURL() })
            
            // Send to log channel if webhook exists
            if (config.logWebhook) {
                const webhook = new WebhookClient({ url: config.logWebhook })
                await webhook.send({ embeds: [embed] })
                log.debug('Sent large role notification to log channel')
            }
            
            // Also try to DM server owner
            try {
                const owner = await guild.fetchOwner()
                await owner.send({ embeds: [embed] })
                log.debug('Sent large role notification to server owner')
            } catch (dmError) {
                log.debug(`Could not DM server owner: ${dmError.message}`)
            }
            
            log.info(`Notified admins about large role: ${role.name} (${membersWithRole.size} members)`)
            
        } catch (error) {
            log.error('Failed to send large role notification', error)
        }
    }

    /**
     * Bulk reorder channels to ensure correct positioning
     * This is the most reliable method for category positioning
     */
    async bulkReorderChannels(guild, targetChannel, targetPosition, isCategory) {
        log.debug(`Starting bulk reorder for ${targetChannel.name}`)
        
        try {
            // Get all channels of the same type (categories or regular channels)
            const channelType = targetChannel.type
            const allChannels = Array.from(guild.channels.cache.values())
                .filter(ch => ch.type === channelType)
                .sort((a, b) => a.position - b.position)
            
            log.debug(`Found ${allChannels.length} channels of type ${channelType}`)
            
            // Build position array for bulk update
            const positionUpdates = []
            
            // Remove target channel from current position
            const otherChannels = allChannels.filter(ch => ch.id !== targetChannel.id)
            
            // Insert target channel at desired position
            const finalOrder = [
                ...otherChannels.slice(0, targetPosition),
                targetChannel,
                ...otherChannels.slice(targetPosition)
            ]
            
            // Create position update array
            finalOrder.forEach((channel, index) => {
                positionUpdates.push({
                    channel: channel.id,
                    position: index
                })
            })
            
            log.debug(`Bulk reorder: ${targetChannel.name} to pos ${targetPosition}, ${positionUpdates.length} channels`)
            
            // Execute bulk reorder
            await guild.channels.setPositions(positionUpdates)
            
            log.info(`Bulk reorder: ${targetChannel.name} moved to position ${targetPosition}`)
            
            // Wait for Discord to process
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Verify final position
            await targetChannel.fetch()
            log.debug(`Final position verification: ${targetChannel.position} (target: ${targetPosition})`)
            
            return true
            
        } catch (error) {
            log.error('Bulk reorder failed', error)
            return false
        }
    }

    /**
     * Destroy handler and cleanup
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = null
        }
        this.pendingRecreations.clear()
        
        log.info('Destroyed')
    }
}

module.exports = AutoProtectionHandler
