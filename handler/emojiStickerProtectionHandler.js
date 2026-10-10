const { PermissionFlagsBits } = require('discord.js')
const B2StorageHandler = require('./b2StorageHandler')
const backupDatabaseManager = require('./backupDatabaseManager')
const logger = require('./safeModerationLogger')

/**
 * Emoji/Sticker Protection Handler
 * Detects deletions and recreates emojis/stickers from cached data
 */
class EmojiStickerProtectionHandler {
    constructor(client, autoProtectionHandler) {
        this.client = client
        this.autoProtectionHandler = autoProtectionHandler
        this.b2Storage = new B2StorageHandler()
        this.backupDb = backupDatabaseManager
        
        logger.info('EMOJI_STICKER_PROTECTION', '✅ Handler initialized')
    }

    /**
     * Recreate deleted emoji from backup with improved error handling
     */
    async recreateDeletedEmoji(deletedEmoji, executor, guild, config) {
        // Check if THIS bot deleted the emoji - NEVER recreate our own deletions
        if (executor && executor.id === this.client.user.id) {
            logger.debug('EMOJI_STICKER_PROTECTION', `Emoji ${deletedEmoji.name} deleted by THIS bot - not recreating`)
            return { success: false, reason: 'deleted_by_this_bot' }
        }
        
        // Only recreate if deleted by a bot
        if (!executor || !executor.bot) {
            logger.debug('EMOJI_STICKER_PROTECTION', 
                `Emoji ${deletedEmoji.name} deleted by user - not recreating`)
            return { success: false, reason: 'deleted_by_user' }
        }
        
        // Check bot permissions first
        if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            logger.error('EMOJI_STICKER_PROTECTION', 'Missing MANAGE_GUILD_EXPRESSIONS permission')
            return { success: false, error: 'Missing permissions' }
        }
        
        logger.info('EMOJI_STICKER_PROTECTION', 
            `🚨 Emoji ${deletedEmoji.name} deleted by bot ${executor.tag} - recreating`)
        
        const startTime = Date.now()
        let retryCount = 0
        const maxRetries = 3
        
        while (retryCount < maxRetries) {
            try {
                // Fetch cached data
                const cached = await this.backupDb.findByCurrentId(guild.id, deletedEmoji.id, 'emoji')
                
                if (!cached) {
                    logger.error('EMOJI_STICKER_PROTECTION', 
                        `No cached data found for emoji ${deletedEmoji.id}`)
                    return { success: false, error: 'No cached data' }
                }
                
                // Download image from B2 with timeout
                const imageBuffer = await Promise.race([
                    this.b2Storage.downloadImage(cached.b2DownloadUrl),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Download timeout')), 30000)
                    )
                ])
                
                // Check if emoji limit reached
                const currentEmojis = await guild.emojis.fetch()
                if (currentEmojis.size >= 50) { // Discord limit
                    logger.error('EMOJI_STICKER_PROTECTION', 'Guild emoji limit reached')
                    return { success: false, error: 'Emoji limit reached' }
                }
                
                // Recreate emoji from buffer
                const newEmoji = await guild.emojis.create({
                    attachment: imageBuffer,
                    name: cached.name,
                    roles: cached.roles,
                    reason: `Safe-Moderation: Emoji deleted by bot ${executor.tag}`
                })
                
                logger.info('EMOJI_STICKER_PROTECTION', 
                    `✅ Recreated emoji: ${newEmoji.name} (new ID: ${newEmoji.id})`)
                
                // Update cache with new ID
                await this.backupDb.updateBackup(guild.id, deletedEmoji.id, 'emoji', {
                    currentId: newEmoji.id,
                    recreationCount: cached.recreationCount + 1,
                    lastRecreatedAt: new Date()
                })
                
                // Kick the bot (with error handling)
                try {
                    const botMember = await guild.members.fetch(executor.id).catch(() => null)
                    if (botMember && guild.members.me?.permissions.has('KickMembers')) {
                        await botMember.kick('Safe-Moderation: Unauthorized emoji deletion')
                        logger.info('EMOJI_STICKER_PROTECTION', `✅ Kicked bot ${executor.tag}`)
                    }
                } catch (kickError) {
                    logger.error('EMOJI_STICKER_PROTECTION', 'Failed to kick bot', kickError)
                    // Don't fail the entire operation if kick fails
                }
                
                const elapsed = Date.now() - startTime
                
                // Log the action
                await this.logProtectionAction(guild, config, {
                    type: 'emoji_recreate',
                    emojiName: newEmoji.name,
                    executor: executor.tag,
                    executorId: executor.id,
                    elapsed
                })
                
                return { success: true, emoji: newEmoji, elapsed }
                
            } catch (error) {
                retryCount++
                logger.error('EMOJI_STICKER_PROTECTION', `Recreation attempt ${retryCount} failed`, error)
                
                if (retryCount >= maxRetries) {
                    return { success: false, error: error.message }
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
            }
        }
        
        return { success: false, error: 'Max retries exceeded' }
    }
    /**
     * Recreate deleted sticker from backup with improved error handling and retry logic
     */
    async recreateDeletedSticker(deletedSticker, executor, guild, config) {
        // Check if THIS bot deleted the sticker - NEVER recreate our own deletions
        if (executor && executor.id === this.client.user.id) {
            logger.debug('EMOJI_STICKER_PROTECTION', `Sticker ${deletedSticker.name} deleted by THIS bot - not recreating`)
            return { success: false, reason: 'deleted_by_this_bot' }
        }
        
        // Only recreate if deleted by a bot
        if (!executor || !executor.bot) {
            logger.debug('EMOJI_STICKER_PROTECTION', 
                `Sticker ${deletedSticker.name} deleted by user - not recreating`)
            return { success: false, reason: 'deleted_by_user' }
        }
        
        // Check bot permissions first
        if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            logger.error('EMOJI_STICKER_PROTECTION', 'Missing MANAGE_GUILD_EXPRESSIONS permission')
            return { success: false, error: 'Missing permissions' }
        }
        
        logger.info('EMOJI_STICKER_PROTECTION', 
            `🚨 Sticker ${deletedSticker.name} deleted by bot ${executor.tag} - recreating`)
        
        const startTime = Date.now()
        let retryCount = 0
        const maxRetries = 3
        
        while (retryCount < maxRetries) {
            try {
                // Fetch cached data
                const cached = await this.backupDb.findByCurrentId(guild.id, deletedSticker.id, 'sticker')
                
                if (!cached) {
                    logger.error('EMOJI_STICKER_PROTECTION', 
                        `No cached data found for sticker ${deletedSticker.id}`)
                    return { success: false, error: 'No cached data' }
                }
                
                // Download image from B2 with timeout
                const imageBuffer = await Promise.race([
                    this.b2Storage.downloadImage(cached.b2DownloadUrl),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Download timeout')), 30000)
                    )
                ])
                
                // Check if sticker limit reached
                const currentStickers = await guild.stickers.fetch()
                if (currentStickers.size >= 50) { // Discord limit
                    logger.error('EMOJI_STICKER_PROTECTION', 'Guild sticker limit reached')
                    return { success: false, error: 'Sticker limit reached' }
                }
                
                // Recreate sticker from buffer
                const newSticker = await guild.stickers.create({
                    file: imageBuffer,
                    name: cached.name,
                    description: cached.description || '',
                    tags: cached.tags || cached.name,
                    reason: `Safe-Moderation: Sticker deleted by bot ${executor.tag}`
                })
                
                logger.info('EMOJI_STICKER_PROTECTION', 
                    `✅ Recreated sticker: ${newSticker.name} (new ID: ${newSticker.id})`)
                
                // Update cache with new ID
                await this.backupDb.updateBackup(guild.id, deletedSticker.id, 'sticker', {
                    currentId: newSticker.id,
                    recreationCount: (cached.recreationCount || 0) + 1,
                    lastRecreatedAt: new Date()
                })
                
                // Kick the bot (with error handling)
                try {
                    const botMember = await guild.members.fetch(executor.id).catch(() => null)
                    if (botMember && guild.members.me?.permissions.has('KickMembers')) {
                        await botMember.kick('Safe-Moderation: Unauthorized sticker deletion')
                        logger.info('EMOJI_STICKER_PROTECTION', `✅ Kicked bot ${executor.tag}`)
                    }
                } catch (kickError) {
                    logger.error('EMOJI_STICKER_PROTECTION', 'Failed to kick bot', kickError)
                    // Don't fail the entire operation if kick fails
                }
                
                const elapsed = Date.now() - startTime
                
                // Log the action
                await this.logProtectionAction(guild, config, {
                    type: 'sticker_recreate',
                    stickerName: newSticker.name,
                    executor: executor.tag,
                    executorId: executor.id,
                    elapsed
                })
                
                return { success: true, sticker: newSticker, elapsed }
                
            } catch (error) {
                retryCount++
                logger.error('EMOJI_STICKER_PROTECTION', `Sticker recreation attempt ${retryCount} failed`, error)
                
                if (retryCount >= maxRetries) {
                    return { success: false, error: error.message }
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
            }
        }
        
        return { success: false, error: 'Max retries exceeded' }
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
                .setTitle('🛡️ Emoji/Sticker Protection')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Type', value: details.type, inline: true },
                    { name: 'Executor', value: `${details.executor}\n\`${details.executorId}\``, inline: true },
                    { name: 'Time', value: `${details.elapsed}ms`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Guild: ${guild.name}` })
            
            // Add type-specific fields
            if (details.emojiName) {
                embed.addFields({ name: 'Emoji', value: details.emojiName, inline: true })
            }
            if (details.stickerName) {
                embed.addFields({ name: 'Sticker', value: details.stickerName, inline: true })
            }
            
            await webhook.send({ embeds: [embed] })
        } catch (error) {
            logger.error('EMOJI_STICKER_PROTECTION', 'Failed to log protection action', error)
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        const b2Health = await this.b2Storage.healthCheck()
        const dbHealth = await this.backupDb.healthCheck()
        
        return {
            b2Storage: b2Health,
            database: dbHealth
        }
    }
}

module.exports = EmojiStickerProtectionHandler