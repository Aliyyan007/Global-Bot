/**
 * Safe-Server Message Monitor
 * Monitors @everyone and @here mentions
 */

const safeServerSchema = require('../schemas/safeServerSchema')

class MessageMonitor {
    constructor(client) {
        this.client = client
    }

    /**
     * Handle message creation
     * @param {Message} message 
     */
    async handleMessage(message) {
        if (!message.guild) return
        if (message.author.bot) return

        const config = await safeServerSchema.findOne({ guildID: message.guild.id })

        if (!config || !config.enabled) return
        if (!config.permissions.everyoneHereSpam.enabled) return

        // Check if message mentions @everyone or @here
        if (!message.mentions.everyone) return

        // Check if user has permission to mention everyone
        if (!message.member.permissions.has('MentionEveryone')) return

        // Check if whitelisted
        if (await this.isWhitelisted(message.guild, message.author.id, config)) return

        // Track action
        const exceeded = await this.client.safeServerTracker.trackAction(
            message.guild.id,
            message.author.id,
            'everyoneHereSpam',
            message.id
        )

        if (exceeded) {
            await this.client.safeServerRestrictionManager.applyRestriction(
                message.guild,
                message.member,
                'everyoneHereSpam'
            )

            // Optionally delete the spam message
            try {
                await message.delete()
            } catch (error) {
                console.error('[MessageMonitor] Failed to delete spam message:', error)
            }
        }
    }

    async isWhitelisted(guild, userId, config) {
        if (config.managerRoles && config.managerRoles.length > 0) {
            const member = await guild.members.fetch(userId).catch(() => null)
            if (member) {
                const hasManagerRole = member.roles.cache.some(role => 
                    config.managerRoles.includes(role.id)
                )
                if (hasManagerRole) return true
            }
        }
        return false
    }
}

module.exports = MessageMonitor
