/**
 * Safe-Server Bot Protection Handler
 * Monitors and quarantines bots with dangerous permissions
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js')
const safeServerSchema = require('../schemas/safeServerSchema')

class BotProtectionHandler {
    constructor(client) {
        this.client = client
    }

    /**
     * Check a bot when it's added to the server
     * @param {Guild} guild 
     * @param {string} botId 
     * @param {string} addedBy 
     */
    async checkBot(guild, botId, addedBy) {
        const config = await safeServerSchema.findOne({ guildID: guild.id })

        if (!config || !config.enabled || !config.botProtection.enabled) return

        const bot = await guild.members.fetch(botId).catch(() => null)
        if (!bot || !bot.user.bot) return

        // Check if bot has dangerous permissions
        const dangerousPerms = this.getDangerousPermissions(bot)

        if (dangerousPerms.length > 0) {
            await this.quarantineBot(guild, bot, addedBy, dangerousPerms, config)
        }
    }

    /**
     * Check when a role is updated (permissions added)
     * @param {Role} oldRole 
     * @param {Role} newRole 
     */
    async checkRoleUpdate(oldRole, newRole) {
        const guild = newRole.guild
        const config = await safeServerSchema.findOne({ guildID: guild.id })

        if (!config || !config.enabled || !config.botProtection.enabled) return

        // Check if dangerous permissions were added
        const addedPerms = this.getAddedPermissions(oldRole, newRole)
        const dangerousAdded = addedPerms.filter(p => this.isDangerousPermission(p))

        if (dangerousAdded.length === 0) return

        // Check if any bots have this role
        const botsWithRole = newRole.members.filter(m => m.user.bot)

        if (botsWithRole.size === 0) return

        // Find who updated the role
        try {
            const logs = await guild.fetchAuditLogs({
                type: 31, // ROLE_UPDATE
                limit: 1
            })

            const entry = logs.entries.first()
            if (!entry || Date.now() - entry.createdTimestamp > 5000) return

            const executor = entry.executor

            // Remove dangerous permissions from the role
            let newPermissions = newRole.permissions.bitfield
            for (const perm of dangerousAdded) {
                newPermissions = newPermissions & ~perm
            }

            await newRole.setPermissions(newPermissions, 'Safe Server: Bot Protection')

            // Send approval request
            await this.sendPermissionApprovalRequest(
                guild,
                botsWithRole.first(),
                dangerousAdded,
                executor.id,
                config,
                'role_update'
            )
        } catch (error) {
            console.error('[BotProtection] Error checking role update:', error)
        }
    }

    /**
     * Check when a bot is given a role
     * @param {GuildMember} oldMember 
     * @param {GuildMember} newMember 
     */
    async checkMemberUpdate(oldMember, newMember) {
        if (!newMember.user.bot) return

        const guild = newMember.guild
        const config = await safeServerSchema.findOne({ guildID: guild.id })

        if (!config || !config.enabled || !config.botProtection.enabled) return

        // Check if new roles were added
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id))

        if (addedRoles.size === 0) return

        // Check if any added role has dangerous permissions
        const dangerousPerms = []
        for (const role of addedRoles.values()) {
            const perms = this.getDangerousPermissionsFromRole(role)
            dangerousPerms.push(...perms)
        }

        if (dangerousPerms.length === 0) return

        // Find who added the role
        try {
            const logs = await guild.fetchAuditLogs({
                type: 25, // MEMBER_ROLE_UPDATE
                limit: 1
            })

            const entry = logs.entries.first()
            if (!entry || Date.now() - entry.createdTimestamp > 5000) return

            const executor = entry.executor

            // Remove the dangerous roles
            await newMember.roles.remove(addedRoles, 'Safe Server: Bot Protection')

            // Send approval request
            await this.sendPermissionApprovalRequest(
                guild,
                newMember,
                dangerousPerms,
                executor.id,
                config,
                'role_assignment'
            )
        } catch (error) {
            console.error('[BotProtection] Error checking member update:', error)
        }
    }

    /**
     * Quarantine a bot
     * @private
     */
    async quarantineBot(guild, bot, addedBy, dangerousPerms, config) {
        console.log(`[BotProtection] Quarantining bot ${bot.user.tag}`)

        // Remove all dangerous permissions by removing roles
        const rolesToRemove = bot.roles.cache.filter(r => 
            r.id !== guild.id && // Not @everyone
            dangerousPerms.some(p => r.permissions.has(p))
        )

        const removedRoleIds = rolesToRemove.map(r => r.id)

        try {
            await bot.roles.remove(rolesToRemove, 'Safe Server: Bot quarantine')

            // Add to quarantined bots
            config.quarantinedBots.push({
                botId: bot.id,
                addedBy: addedBy,
                addedAt: new Date(),
                removedPermissions: dangerousPerms.map(p => p.toString())
            })

            await config.save()

            // Send notification
            await this.sendQuarantineNotification(guild, bot, addedBy, dangerousPerms, config)
        } catch (error) {
            console.error('[BotProtection] Error quarantining bot:', error)
        }
    }

    /**
     * Send quarantine notification
     * @private
     */
    async sendQuarantineNotification(guild, bot, addedBy, dangerousPerms, config) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const permNames = dangerousPerms.map(p => this.getPermissionName(p)).join(', ')

        const embed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🤖 Safe Server: Bot Quarantined')
            .setDescription(`A bot with dangerous permissions was added and has been quarantined.`)
            .addFields(
                { name: 'Bot', value: `${bot.user.tag} (${bot.id})`, inline: true },
                { name: 'Added By', value: `<@${addedBy}>`, inline: true },
                { name: 'Dangerous Permissions', value: permNames, inline: false }
            )
            .setTimestamp()

        const approveButton = new ButtonBuilder()
            .setCustomId(`ss_approve_bot_${bot.id}`)
            .setLabel('Approve Bot')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)

        const rejectButton = new ButtonBuilder()
            .setCustomId(`ss_reject_bot_${bot.id}`)
            .setLabel('Kick Bot')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger)

        const row = new ActionRowBuilder().addComponents(approveButton, rejectButton)

        await logChannel.send({
            content: config.managerRoles.map(id => `<@&${id}>`).join(' '),
            embeds: [embed],
            components: [row]
        })
    }

    /**
     * Send permission approval request
     * @private
     */
    async sendPermissionApprovalRequest(guild, bot, permissions, requestedBy, config, type) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const permNames = permissions.map(p => this.getPermissionName(p)).join(', ')

        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('⚠️ Safe Server: Permission Approval Required')
            .setDescription(`A moderator attempted to grant dangerous permissions to a bot.`)
            .addFields(
                { name: 'Bot', value: `${bot.user.tag} (${bot.id})`, inline: true },
                { name: 'Requested By', value: `<@${requestedBy}>`, inline: true },
                { name: 'Permissions', value: permNames, inline: false },
                { name: 'Action', value: type === 'role_update' ? 'Role Permission Update' : 'Role Assignment', inline: true }
            )
            .setTimestamp()

        const approveButton = new ButtonBuilder()
            .setCustomId(`ss_approve_bot_perm_${bot.id}_${Date.now()}`)
            .setLabel('Approve')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)

        const rejectButton = new ButtonBuilder()
            .setCustomId(`ss_reject_bot_perm_${bot.id}_${Date.now()}`)
            .setLabel('Reject')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger)

        const row = new ActionRowBuilder().addComponents(approveButton, rejectButton)

        await logChannel.send({
            content: config.managerRoles.map(id => `<@&${id}>`).join(' '),
            embeds: [embed],
            components: [row]
        })
    }

    /**
     * Get dangerous permissions from a member
     * @private
     */
    getDangerousPermissions(member) {
        const dangerous = [
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.ManageGuild,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageWebhooks,
            PermissionFlagsBits.ModerateMembers
        ]

        return dangerous.filter(perm => member.permissions.has(perm))
    }

    /**
     * Get dangerous permissions from a role
     * @private
     */
    getDangerousPermissionsFromRole(role) {
        const dangerous = [
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.ManageGuild,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageWebhooks,
            PermissionFlagsBits.ModerateMembers
        ]

        return dangerous.filter(perm => role.permissions.has(perm))
    }

    /**
     * Get permissions that were added to a role
     * @private
     */
    getAddedPermissions(oldRole, newRole) {
        const oldPerms = oldRole.permissions.bitfield
        const newPerms = newRole.permissions.bitfield

        const added = []
        const allPerms = Object.values(PermissionFlagsBits)

        for (const perm of allPerms) {
            if (typeof perm !== 'bigint') continue
            
            const hadBefore = (oldPerms & perm) === perm
            const hasNow = (newPerms & perm) === perm

            if (!hadBefore && hasNow) {
                added.push(perm)
            }
        }

        return added
    }

    /**
     * Check if a permission is dangerous
     * @private
     */
    isDangerousPermission(perm) {
        const dangerous = [
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.ManageGuild,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageWebhooks,
            PermissionFlagsBits.ModerateMembers
        ]

        return dangerous.includes(perm)
    }

    /**
     * Get human-readable permission name
     * @private
     */
    getPermissionName(perm) {
        const names = {
            [PermissionFlagsBits.Administrator]: 'Administrator',
            [PermissionFlagsBits.BanMembers]: 'Ban Members',
            [PermissionFlagsBits.KickMembers]: 'Kick Members',
            [PermissionFlagsBits.ManageGuild]: 'Manage Server',
            [PermissionFlagsBits.ManageRoles]: 'Manage Roles',
            [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
            [PermissionFlagsBits.ManageWebhooks]: 'Manage Webhooks',
            [PermissionFlagsBits.ModerateMembers]: 'Timeout Members'
        }

        return names[perm] || 'Unknown Permission'
    }
}

module.exports = BotProtectionHandler
