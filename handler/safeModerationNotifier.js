/**
 * Safe-Moderation Notification Helper
 * Sends restriction notifications to log channels and webhooks.
 */

const { EmbedBuilder } = require('discord.js')
const logger = require('./safeModerationLogger')
const { getActionName, buildManagerMentions, sendNotification } = require('./safeModerationHelpers')

const log = logger.scope('Notifier')

/**
 * Send restriction notification for a triggered action.
 * Handles normal restrictions, emergency kicks, and bot-own-role edits.
 */
async function sendRestrictionNotification(guild, member, actionType, config, result) {
    try {
        const actionName = getActionName(actionType)
        const isEmergencyKick = result.emergencyAction === 'kicked' || result.reason === 'emergency_kick_hierarchy'
        const isBotOwnRoleEdit = result.reason === 'bot_own_role_edited_only'
        const isBot = result.isBot || member.user.bot
        const label = isBot ? 'Bot' : 'User'

        // Colour & title
        const color = isEmergencyKick ? 0xFF0000 : isBotOwnRoleEdit ? 0xFFA500 : 0xE74C3C
        const title = isEmergencyKick
            ? '🚨 Safe-Moderation: Emergency Bot Kick'
            : isBotOwnRoleEdit
                ? '🛡️ Safe-Moderation: Bot Permissions Restricted'
                : '🚨 Safe-Moderation: Restriction Applied'

        // Description
        const desc = isEmergencyKick
            ? `**${member.user.tag}** (Bot) exceeded the limit for **${actionName}** and was kicked from the server`
            : isBotOwnRoleEdit
                ? `**${member.user.tag}** (Bot) exceeded the limit for **${actionName}**. Bot's own role permissions have been restricted.`
                : `**${member.user.tag}** exceeded the limit for **${actionName}**`

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(desc)
            .addFields(
                { name: label, value: `<@${member.id}>`, inline: true },
                { name: 'Action Type', value: actionName, inline: true },
                { name: 'Response Time', value: `${result.elapsed || 'N/A'}ms`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${label} ID: ${member.id}` })

        // Context-specific fields
        if (isEmergencyKick) {
            embed.addFields({
                name: '⚠️ Emergency Action',
                value: result.hierarchyIssue
                    ? '```Bot role was higher than our bot\'s role\nRole removal failed - Bot kicked instead```'
                    : '```No dangerous role found on bot\nBot kicked as emergency fallback```',
                inline: false
            })
        } else if (isBotOwnRoleEdit) {
            embed.addFields({
                name: '🛡️ Restriction Details',
                value: `\`\`\`Bot's own role permissions edited\nDangerous permissions removed\nBot can no longer perform ${actionName}\`\`\``,
                inline: false
            })
        }

        // Manager mentions
        const prefix = isEmergencyKick ? 'Emergency action taken!' : 'Action required!'
        const content = buildManagerMentions(config, prefix)

        await sendNotification(guild, config, embed, content)
    } catch (err) {
        log.error('Notification failed', err)
    }
}

module.exports = { sendRestrictionNotification }
