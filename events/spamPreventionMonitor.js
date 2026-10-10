/**
 * Spam Prevention Monitor
 * Listens to messageCreate events and applies spam detection
 * 
 * Monitors:
 * - Users (always, unless exempted)
 * - Bots (only if Bot Shield is enabled)
 * 
 * Flow:
 * 1. Check if Bot Shield is enabled (for bots)
 * 2. Check exemptions (owner, whitelist, manager) - users only
 * 3. Check restriction type (global, role-based, channel-based)
 * 4. Run spam detection
 * 5. Register violation if spam detected
 * 6. Check if should punish
 * 7. Apply punishment and delete message
 */

const client = require('../index')
const { Events } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('SpamMonitor')

client.on(Events.MessageCreate, async (message) => {
    // Ignore DMs
    if (!message.guild) return
    
    // Ignore system messages
    if (message.system) return
    
    // CRITICAL: Never monitor our own bot's messages
    if (message.author.id === client.user.id) return
    
    try {
        // Get spam prevention config
        const config = await safeModerationSchema.findOne({ guildID: message.guild.id })
        
        // Check if spam prevention is enabled
        if (!config || !config.enabled || !config.spamPrevention?.enabled) {
            return
        }
        
        // Check if message is from a bot
        const isBot = message.author.bot
        
        // If it's a bot, only monitor if Bot Shield is enabled
        if (isBot && (!config.sentinelHub || !config.sentinelHub.enabled)) {
            return
        }
        
        // Check exemptions (skip for bots - they should be monitored if Bot Shield is on)
        if (!isBot && await isExempt(message, config)) {
            return
        }
        
        // Check restriction type
        if (!shouldMonitor(message, config.spamPrevention)) {
            return
        }
        
        // Run spam detection
        const detection = await client.spamDetectionEngine.detectSpam(message)
        
        if (!detection.detected) {
            return
        }
        
        // Spam detected - register violation
        const violationCount = client.spamDetectionEngine.registerSpamViolation(
            message.guild.id,
            message.author.id,
            detection.type,
            detection.reason
        )
        
        const userType = isBot ? 'BOT' : 'USER'
        log.debug(`[SpamMonitor] ${userType} ${message.author.tag} - ${detection.type} (Violation #${violationCount})`)
        
        // Check if should punish
        const shouldPunish = client.spamPunishmentHandler.shouldPunish(
            message.guild.id,
            message.author.id,
            config.spamPrevention,
            client.spamDetectionEngine
        )
        
        if (shouldPunish) {
            // Apply punishment
            const member = await message.guild.members.fetch(message.author.id).catch(() => null)
            
            if (member) {
                // Pass both spamPrevention config and parent config for webhook
                const result = await client.spamPunishmentHandler.applyPunishment(
                    message.guild,
                    member,
                    {
                        ...config.spamPrevention,
                        logWebhook: config.logWebhook // Add webhook from parent config
                    },
                    detection
                )
                
                if (result.success) {
                    log.info(`[SpamMonitor] ✅ Punishment applied to ${userType} ${message.author.tag}`)
                } else {
                    log.error(`[SpamMonitor] ❌ Failed to punish ${userType} ${message.author.tag}:`, result.error)
                }
            }
        }
        
        // Delete spam message (may already be deleted by the punishment handler or another monitor)
        await message.delete().catch(error => {
            if (error.code !== 10008 && !String(error.message || '').includes('Unknown Message')) {
                log.error('[SpamMonitor] Failed to delete message:', error)
            }
        })
        
    } catch (error) {
        log.error('[SpamMonitor] Error:', error)
    }
})

/**
 * Check if user is exempt from spam detection
 * Note: This is only called for users, not bots
 * Bots are monitored if Bot Shield is enabled
 * 
 * Exemptions (in order):
 * 1. Guild owner
 * 2. Whitelist roles
 * 3. Manager roles
 */
async function isExempt(message, config) {
    // Guild owner
    if (message.author.id === message.guild.ownerId) {
        return true
    }
    
    // Get member
    const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null)
    
    if (!member) {
        return false
    }
    
    // Whitelist roles
    if (config.whitelistRoles && config.whitelistRoles.length > 0) {
        const hasWhitelistRole = member.roles.cache.some(role => 
            config.whitelistRoles.includes(role.id)
        )
        
        if (hasWhitelistRole) {
            return true
        }
    }
    
    // Manager roles
    if (config.managerRoles && config.managerRoles.length > 0) {
        const hasManagerRole = member.roles.cache.some(role => 
            config.managerRoles.includes(role.id)
        )
        
        if (hasManagerRole) {
            return true
        }
    }
    
    return false
}

/**
 * Check if message should be monitored based on restriction type
 * @param {Message} message 
 * @param {Object} spamConfig - Spam prevention config
 * @returns {boolean}
 */
function shouldMonitor(message, spamConfig) {
    const restrictionType = spamConfig.restrictionType
    
    switch (restrictionType) {
        case 'global':
            // Monitor all users and channels
            return true
            
        case 'role-based':
            // Only monitor users with specific roles
            if (!spamConfig.specificRoles || spamConfig.specificRoles.length === 0) {
                return false
            }
            
            const member = message.member
            if (!member) return false
            
            return member.roles.cache.some(role => 
                spamConfig.specificRoles.includes(role.id)
            )
            
        case 'channel-based':
            // Only monitor specific channels
            if (!spamConfig.specificChannels || spamConfig.specificChannels.length === 0) {
                return false
            }
            
            return spamConfig.specificChannels.includes(message.channel.id)
            
        default:
            return false
    }
}
