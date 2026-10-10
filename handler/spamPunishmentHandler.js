/**
 * Spam Punishment Handler
 * Applies punishments for spam violations
 * 
 * Punishment Types:
 * - WARN: Delete message and send warning
 * - BAN: Permanently ban user
 * - KICK: Remove user from server
 * - TIMEOUT: Temporarily restrict user
 * 
 * Duration Formats (Max: 28 days):
 * - 6h, 12h, 1day, 7day, 28day
 * - 0 = permanent (28 days max on Discord)
 */

const { EmbedBuilder } = require('discord.js')
const logger = require('./safeModerationLogger')
const log = logger.scope('SpamPunishment')

class SpamPunishmentHandler {
    constructor() {
        log.info('[SpamPunishment] ✅ Initialized')
    }
    
    /**
     * Apply punishment to a member
     * @param {Guild} guild - Discord guild
     * @param {GuildMember} member - Target member
     * @param {Object} config - Spam prevention config
     * @param {Object} violation - Violation details { type, reason }
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async applyPunishment(guild, member, config, violation) {
        try {
            const punishmentType = config.punishmentType
            
            log.info(`[SpamPunishment] Applying ${punishmentType} to ${member.user.tag}`)
            
            let result = { success: false }
            
            switch (punishmentType) {
                case 'WARN':
                    result = await this.applyWarn(guild, member, violation)
                    break
                    
                case 'BAN':
                    result = await this.applyBan(guild, member, violation)
                    break
                    
                case 'KICK':
                    result = await this.applyKick(guild, member, violation)
                    break
                    
                case 'TIMEOUT':
                    result = await this.applyTimeout(guild, member, config, violation)
                    break
                    
                default:
                    result = { success: false, error: 'Invalid punishment type' }
            }
            
            // Send webhook notification if successful
            if (result.success && config.logWebhook) {
                await this.sendWebhookNotification(
                    config.logWebhook,
                    member,
                    punishmentType,
                    violation,
                    config.punishmentDuration
                )
            }
            
            return result
            
        } catch (error) {
            log.error('[SpamPunishment] Error applying punishment:', error)
            return { success: false, error: error.message }
        }
    }
    
    /**
     * Apply warn punishment
     * Sends a warning message to the user (DM or channel)
     */
    async applyWarn(guild, member, violation) {
        try {
            const { EmbedBuilder } = require('discord.js')
            
            const warnEmbed = new EmbedBuilder()
                .setColor(0xFFA500) // Orange
                .setTitle('⚠️ Spam Warning')
                .setDescription(`You have been warned for spam in **${guild.name}**`)
                .addFields(
                    { name: 'Violation Type', value: violation.type, inline: true },
                    { name: 'Reason', value: violation.reason, inline: false }
                )
                .setFooter({ text: 'Please stop spamming or you may be punished.' })
                .setTimestamp()
            
            // Try to send DM first
            try {
                await member.send({ embeds: [warnEmbed] })
                log.debug(`[SpamPunishment] ✅ Warned ${member.user.tag} via DM`)
            } catch (dmError) {
                // If DM fails, log it (message already deleted by spam monitor)
                log.debug(`[SpamPunishment] ⚠️ Could not DM ${member.user.tag}, message deleted`)
            }
            
            return { success: true }
            
        } catch (error) {
            log.error('[SpamPunishment] Failed to warn:', error)
            return { success: false, error: error.message }
        }
    }
    
    /**
     * Apply ban punishment
     */
    async applyBan(guild, member, violation) {
        try {
            await member.ban({
                reason: `Spam Prevention: ${violation.type} - ${violation.reason}`
            })
            
            log.info(`[SpamPunishment] ✅ Banned ${member.user.tag}`)
            return { success: true }
            
        } catch (error) {
            log.error('[SpamPunishment] Failed to ban:', error)
            return { success: false, error: error.message }
        }
    }
    
    /**
     * Apply kick punishment
     */
    async applyKick(guild, member, violation) {
        try {
            await member.kick(
                `Spam Prevention: ${violation.type} - ${violation.reason}`
            )
            
            log.info(`[SpamPunishment] ✅ Kicked ${member.user.tag}`)
            return { success: true }
            
        } catch (error) {
            log.error('[SpamPunishment] Failed to kick:', error)
            return { success: false, error: error.message }
        }
    }
    
    /**
     * Apply timeout punishment
     */
    async applyTimeout(guild, member, config, violation) {
        try {
            const duration = this.parseDuration(config.punishmentDuration)
            
            if (!duration) {
                return { success: false, error: 'Invalid duration format' }
            }
            
            // Discord max timeout: 28 days (2419200000 ms)
            const maxTimeout = 28 * 24 * 60 * 60 * 1000
            const timeoutDuration = Math.min(duration, maxTimeout)
            
            await member.timeout(
                timeoutDuration,
                `Spam Prevention: ${violation.type} - ${violation.reason}`
            )
            
            log.info(`[SpamPunishment] ✅ Timed out ${member.user.tag} for ${this.formatDuration(timeoutDuration / 1000)}`)
            return { success: true }
            
        } catch (error) {
            log.error('[SpamPunishment] Failed to timeout:', error)
            return { success: false, error: error.message }
        }
    }
    
    /**
     * Check if user should be punished based on violation count
     * @param {string} guildId 
     * @param {string} userId 
     * @param {Object} config - Spam prevention config
     * @param {SpamDetectionEngine} detectionEngine 
     * @returns {boolean}
     */
    shouldPunish(guildId, userId, config, detectionEngine) {
        const violationCount = detectionEngine.getViolationCount(
            guildId,
            userId,
            config.timeBetweenActions
        )
        
        // Punish if violations exceed limit
        return violationCount > config.actionsLimit
    }
    
    /**
     * Parse duration string to milliseconds
     * Formats: 6h, 12h, 1day, 7day, 28day (max), 0 (permanent = 28 days)
     * @param {string} durationString 
     * @returns {number|null} Duration in milliseconds
     */
    parseDuration(durationString) {
        if (!durationString) return null
        
        const str = durationString.toLowerCase().trim()
        
        // Permanent timeout (28 days max on Discord)
        if (str === '0') {
            return 28 * 24 * 60 * 60 * 1000
        }
        
        // Match pattern: <number><unit>
        const match = str.match(/^(\d+)(h|hour|hours|d|day|days)$/)
        
        if (!match) return null
        
        const value = parseInt(match[1])
        const unit = match[2]
        
        let duration = 0
        
        switch (unit) {
            case 'h':
            case 'hour':
            case 'hours':
                duration = value * 60 * 60 * 1000
                break
                
            case 'd':
            case 'day':
            case 'days':
                duration = value * 24 * 60 * 60 * 1000
                break
                
            default:
                return null
        }
        
        // Discord max timeout: 28 days (2419200000 ms)
        const maxTimeout = 28 * 24 * 60 * 60 * 1000
        return Math.min(duration, maxTimeout)
    }
    
    /**
     * Send webhook notification
     */
    async sendWebhookNotification(webhookUrl, member, punishmentType, violation, duration) {
        try {
            const { WebhookClient } = require('discord.js')
            
            // Extract webhook ID and token from URL
            const urlParts = webhookUrl.split('/')
            const webhookId = urlParts[urlParts.length - 2]
            const webhookToken = urlParts[urlParts.length - 1]
            
            if (!webhookId || !webhookToken) {
                log.error('[SpamPunishment] Invalid webhook URL')
                return
            }
            
            const webhook = new WebhookClient({ id: webhookId, token: webhookToken })
            
            // Format duration for display
            let durationText = ''
            if (punishmentType === 'TIMEOUT') {
                durationText = duration === '0' ? 'Permanent (28 days)' : duration
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🚨 Spam Prevention - Punishment Applied')
                .addFields(
                    { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: false },
                    { name: 'Punishment', value: punishmentType, inline: true },
                    { name: 'Spam Type', value: violation.type, inline: true }
                )
            
            if (durationText) {
                embed.addFields({ name: 'Duration', value: durationText, inline: true })
            }
            
            embed.addFields({ name: 'Reason', value: violation.reason, inline: false })
            embed.setTimestamp()
            
            await webhook.send({ embeds: [embed] })
            
            log.debug('[SpamPunishment] ✅ Webhook notification sent')
            
        } catch (error) {
            log.error('[SpamPunishment] Failed to send webhook:', error)
        }
    }
    
    /**
     * Format duration in seconds to human-readable string
     */
    formatDuration(seconds) {
        if (seconds < 60) return `${seconds}s`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
        if (seconds < 2592000) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''}`
        if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} month${Math.floor(seconds / 2592000) > 1 ? 's' : ''}`
        return `${Math.floor(seconds / 31536000)} year${Math.floor(seconds / 31536000) > 1 ? 's' : ''}`
    }
}

module.exports = SpamPunishmentHandler
