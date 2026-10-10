/**
 * Safe-Moderation: Message Create Detection
 * Detects: @everyone / @here spam
 * 
 * IMPORTANT: Uses manual text detection instead of message.mentions.everyone
 * because Discord's mentions.everyone only returns true when the user has
 * the MentionEveryone permission. Users WITHOUT that permission can still
 * TYPE @everyone/@here, and we need to detect that as spam too.
 */

const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('EveryoneSpam')

// Regex patterns for @everyone / @here detection (matches both actual pings and typed text)
const EVERYONE_HERE_PATTERN = /@(everyone|here)/gi

client.on(Events.MessageCreate, async (message) => {
    try {
        if (!client.safeModerationTracker || !client.fastRestrictionApplier) return
        if (!message.guild) return
        if (message.author.bot) return
        
        // CRITICAL: Never monitor our own bot's messages
        if (message.author.id === client.user.id) return
        
        // Check if message contains @everyone or @here via text content detection
        // This works regardless of whether the user has MentionEveryone permission
        const hasEveryoneHere = message.mentions.everyone || EVERYONE_HERE_PATTERN.test(message.content)
        if (!hasEveryoneHere) return
        
        log.debug(`📢 @everyone/@here detected from ${message.author.tag}`)
        
        const guild = message.guild
        
        // Get Safe-Moderation config
        const safeModerationSchema = require('../schemas/safeModerationSchema')
        const config = await safeModerationSchema.findOne({ guildID: guild.id })
        
        if (!config || !config.enabled) return
        
        // Check if permission is enabled
        const permConfig = config.permissions?.everyoneHereSpam
        if (!permConfig || !permConfig.enabled) return
        
        // Fetch message author as guild member
        const member = await guild.members.fetch(message.author.id).catch(() => null)
        if (!member) return
        
        // Check if author is guild owner
        if (message.author.id === guild.ownerId) return
        
        // Check if author is whitelisted
        const memberRoles = member.roles.cache.map(r => r.id)
        if (client.safeModerationTracker.isWhitelisted(guild.id, message.author.id, memberRoles, config)) return
        
        // Check if author has manager role
        if (Array.isArray(config.managerRoles) && config.managerRoles.length > 0) {
            const hasManagerRole = memberRoles.some(roleId => config.managerRoles.includes(roleId))
            if (hasManagerRole) return
        }
        
        // Record the action
        await client.safeModerationTracker.recordAction(guild.id, message.author.id, 'everyoneHereSpam')
        
        // Check if limit exceeded
        const limitCheck = await client.safeModerationTracker.checkLimit(guild.id, message.author.id, 'everyoneHereSpam', config)
        
        log.debug(`${message.author.tag}: ${limitCheck.count}/${limitCheck.limit} in ${limitCheck.duration}s`)
        
        if (limitCheck.exceeded) {
            log.warn(`🚨 @everyone/@here spam limit exceeded by ${message.author.tag} in ${guild.name}`)
            
            // Apply restriction
            const restrictionResult = await client.fastRestrictionApplier.applyRestrictionFast(
                guild,
                member,
                'everyoneHereSpam',
                config
            )
            
            log.debug('Restriction result:', {
                success: restrictionResult.success,
                reason: restrictionResult.reason
            })
            
            if (restrictionResult.success) {
                log.info(`✅ Restricted ${message.author.tag} for @everyone/@here spam`)
                
                // Send notification
                const { sendRestrictionNotification } = require('../handler/safeModerationNotifier')
                await sendRestrictionNotification(guild, member, 'everyoneHereSpam', config, restrictionResult)
                
                // Delete the spam message
                await message.delete().catch(err => {
                    log.error('Failed to delete spam message:', err.message)
                })
            } else {
                log.error(`❌ Failed to restrict ${message.author.tag}: ${restrictionResult.reason}`)
            }
        }
        
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'SafeModeration MessageCreate Event' })
        log.error('@everyone/@here detection error:', error)
    }
})
