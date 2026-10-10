/**
 * Approval Channel Manager
 * Manages the dedicated channel used for Safe-Moderation approval requests
 * (cooldown === -1 = "Owner/Admin Approval" mode).
 *
 * Resolution order used by the approval pipeline:
 *   1. Server Panel channel (if Server Panel is enabled)
 *   2. Dedicated approval channel (config.approvalChannelId)
 *   3. Log channel (last-resort fallback)
 */
const { ChannelType, PermissionFlagsBits } = require('discord.js')
const logger = require('./safeModerationLogger')
const log = logger.scope('ApprovalChannelMgr')

const APPROVAL_CHANNEL_NAME = 'sm-approvals'

class ApprovalChannelManager {
    constructor(client) {
        this.client = client
    }

    /**
     * Find or create the channel where approval requests are sent.
     * @param {Guild} guild
     * @param {Document} config - SafeModeration config document
     * @returns {Promise<TextChannel|null>}
     */
    async createOrGetApprovalChannel(guild, config) {
        // 1. Reuse the Server Panel channel when it is enabled
        if (config.serverPanel?.enabled && config.serverPanel?.channelId) {
            const panelChannel = await guild.channels.fetch(config.serverPanel.channelId).catch(() => null)
            if (panelChannel) return panelChannel
        }

        // 2. Reuse an existing dedicated approval channel
        if (config.approvalChannelId) {
            const existing = await guild.channels.fetch(config.approvalChannelId).catch(() => null)
            if (existing) return existing
            config.approvalChannelId = undefined
        }

        // 3. Create a new private channel visible to the bot and manager roles
        try {
            const overwrites = [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: this.client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ManageMessages
                    ]
                }
            ]
            for (const roleId of config.managerRoles || []) {
                overwrites.push({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel]
                })
            }

            const channel = await guild.channels.create({
                name: APPROVAL_CHANNEL_NAME,
                type: ChannelType.GuildText,
                topic: 'Safe-Moderation approval requests - managers approve or deny restriction restores here.',
                permissionOverwrites: overwrites,
                reason: 'Safe-Moderation: approval-mode cooldown enabled'
            })

            config.approvalChannelId = channel.id
            config.approvalChannelCreatedAt = new Date()
            config.markModified('approvalChannelId')
            await config.save()
            log.info(`Created approval channel ${channel.name} (${channel.id}) in ${guild.name}`)
            return channel
        } catch (err) {
            log.error(`Failed to create approval channel in ${guild.name}`, err)
            return null
        }
    }

    /**
     * Delete the dedicated approval channel when no permission still uses
     * approval mode (cooldown === -1). Server Panel and log channels are
     * never touched.
     * @param {Guild} guild
     * @param {Document} config
     * @returns {Promise<boolean>} true when a channel was deleted
     */
    async cleanupApprovalChannelIfUnused(guild, config) {
        const stillUsed = Object.values(config.permissions || {})
            .some(p => p && p.cooldown === -1)
        if (stillUsed) return false
        if (!config.approvalChannelId) return false

        try {
            const channel = await guild.channels.fetch(config.approvalChannelId).catch(() => null)
            if (channel) {
                await channel.delete('Safe-Moderation: approval mode no longer in use')
            }
            config.approvalChannelId = undefined
            config.approvalChannelCreatedAt = undefined
            await config.save()
            log.info(`Cleaned up approval channel in ${guild.name}`)
            return true
        } catch (err) {
            log.error(`Failed to clean up approval channel in ${guild.name}`, err)
            return false
        }
    }
}

module.exports = ApprovalChannelManager
