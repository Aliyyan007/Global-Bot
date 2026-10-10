const B2StorageHandler = require('./b2StorageHandler')
const backupDatabaseManager = require('./backupDatabaseManager')
const logger = require('./safeModerationLogger')

/**
 * Emoji/Sticker Cache Handler
 * Handles proactive caching and updates of emoji/sticker data
 */
class EmojiStickerCacheHandler {
    constructor(client) {
        this.client = client
        this.b2Storage = new B2StorageHandler()
        this.backupDb = backupDatabaseManager
        
        // Track initialization status
        this.initialized = false
        
        logger.info('EMOJI_STICKER_CACHE', '✅ Handler initialized')
    }

    /**
     * Initialize cache for all guilds on bot start
     */
    async initializeCache() {
        if (!this.b2Storage.isConfigured || !this.backupDb.isConfigured) {
            logger.info('EMOJI_STICKER_CACHE', '⚠️ Backup system not configured - skipping initialization')
            return false
        }

        const startTime = Date.now()
        logger.info('EMOJI_STICKER_CACHE', '🚀 Starting cache initialization...')
        
        try {
            // Connect to backup database
            const dbConnected = await this.backupDb.connect()
            if (!dbConnected) {
                logger.error('EMOJI_STICKER_CACHE', 'Failed to connect to backup database')
                return false
            }

            // Get all guilds with Safe Moderation enabled
            const safeModerationSchema = require('../schemas/safeModerationSchema')
            const configs = await safeModerationSchema.find({ enabled: true })
            
            let totalEmojis = 0
            let totalStickers = 0
            let processedGuilds = 0
            
            for (const config of configs) {
                const guild = this.client.guilds.cache.get(config.guildID)
                if (!guild) continue
                
                try {
                    logger.info('EMOJI_STICKER_CACHE', `Processing guild: ${guild.name}`)
                    
                    // Cache emojis
                    const emojis = await guild.emojis.fetch()
                    const emojiCount = await this.batchCacheEmojis(emojis, guild.id)
                    totalEmojis += emojiCount
                    
                    // Cache stickers
                    const stickers = await guild.stickers.fetch()
                    const stickerCount = await this.batchCacheStickers(stickers, guild.id)
                    totalStickers += stickerCount
                    
                    processedGuilds++
                    
                    logger.info('EMOJI_STICKER_CACHE', 
                        `✅ ${guild.name}: ${emojiCount} emojis, ${stickerCount} stickers`)
                    
                } catch (error) {
                    logger.error('EMOJI_STICKER_CACHE', 
                        `Failed to cache for guild ${guild.id}`, error)
                }
            }
            
            const elapsed = Date.now() - startTime
            this.initialized = true
            
            logger.info('EMOJI_STICKER_CACHE', 
                `✅ Initialization complete: ${totalEmojis} emojis, ${totalStickers} stickers from ${processedGuilds} guilds in ${elapsed}ms`)
            
            return true
            
        } catch (error) {
            logger.error('EMOJI_STICKER_CACHE', 'Initialization failed', error)
            return false
        }
    }

    /**
     * Cache single emoji with existence check
     */
    async cacheEmoji(emoji, guildId) {
        try {
            // Lightweight existence check first
            const exists = await this.backupDb.backupExists(guildId, emoji.id, 'emoji')
            let existing = null
            
            if (exists) {
                // Get metadata only for change detection
                const metadata = await this.backupDb.getBackupMetadata(guildId, emoji.id, 'emoji')
                
                if (metadata) {
                    // Check if emoji data has changed (name, roles, animated status)
                    const hasChanged = metadata.name !== emoji.name ||
                                     metadata.animated !== emoji.animated ||
                                     JSON.stringify(metadata.roles?.sort() || []) !== JSON.stringify(emoji.roles.cache.map(r => r.id).sort())
                    
                    if (!hasChanged) {
                        logger.debug('EMOJI_STICKER_CACHE', `Emoji ${emoji.name} already cached and unchanged - skipping`)
                        return 'skipped' // Already cached and no changes
                    }
                    
                    logger.debug('EMOJI_STICKER_CACHE', `Emoji ${emoji.name} changed - updating cache`)
                    // Get full existing data for update
                    existing = await this.backupDb.findByCurrentId(guildId, emoji.id, 'emoji')
                }
            } else {
                logger.debug('EMOJI_STICKER_CACHE', `Caching new emoji: ${emoji.name}`)
            }
            
            // Download image from Discord (only if new or changed)
            const { buffer, contentType, format } = await this.b2Storage.downloadFromDiscord(emoji.imageURL())
            
            // Generate unique filename
            const fileName = `emoji_${guildId}_${emoji.id}_${Date.now()}.${format.toLowerCase()}`
            
            if (existing) {
                // Update existing cache
                logger.debug('EMOJI_STICKER_CACHE', `Updating cached emoji: ${emoji.name}`)
                
                // Delete old file from B2
                try {
                    await this.b2Storage.deleteFile(existing.b2FileId, existing.b2FileName)
                } catch (deleteError) {
                    logger.error('EMOJI_STICKER_CACHE', 'Failed to delete old B2 file', deleteError)
                }
                
                // Upload new file
                const { fileId, fileName: uploadedFileName, downloadUrl } = 
                    await this.b2Storage.uploadImage(buffer, fileName, contentType)
                
                // Update database
                await this.backupDb.updateBackup(guildId, emoji.id, 'emoji', {
                    name: emoji.name,
                    b2FileId: fileId,
                    b2FileName: uploadedFileName,
                    b2DownloadUrl: downloadUrl,
                    imageFormat: format,
                    imageSize: buffer.length,
                    animated: emoji.animated,
                    roles: emoji.roles.cache.map(r => r.id),
                    lastUpdated: new Date()
                })
                
            } else {
                // Create new cache entry
                logger.debug('EMOJI_STICKER_CACHE', `Caching new emoji: ${emoji.name}`)
                
                // Upload to B2
                const { fileId, fileName: uploadedFileName, downloadUrl } = 
                    await this.b2Storage.uploadImage(buffer, fileName, contentType)
                
                // Save to database
                await this.backupDb.saveBackup({
                    guildID: guildId,
                    resourceType: 'emoji',
                    originalId: emoji.id,
                    currentId: emoji.id,
                    name: emoji.name,
                    b2FileId: fileId,
                    b2FileName: uploadedFileName,
                    b2DownloadUrl: downloadUrl,
                    imageFormat: format,
                    imageSize: buffer.length,
                    animated: emoji.animated,
                    roles: emoji.roles.cache.map(r => r.id)
                })
            }
            
            return true
        } catch (error) {
            logger.error('EMOJI_STICKER_CACHE', `Failed to cache emoji ${emoji.name}`, error)
            return false
        }
    }

    /**
     * Cache single sticker with existence check
     */
    async cacheSticker(sticker, guildId) {
        try {
            // Lightweight existence check first
            const exists = await this.backupDb.backupExists(guildId, sticker.id, 'sticker')
            let existing = null
            
            if (exists) {
                // Get metadata only for change detection
                const metadata = await this.backupDb.getBackupMetadata(guildId, sticker.id, 'sticker')
                
                if (metadata) {
                    // Check if sticker data has changed (name, description, tags)
                    const hasChanged = metadata.name !== sticker.name ||
                                     metadata.description !== sticker.description ||
                                     metadata.tags !== sticker.tags
                    
                    if (!hasChanged) {
                        logger.debug('EMOJI_STICKER_CACHE', `Sticker ${sticker.name} already cached and unchanged - skipping`)
                        return 'skipped' // Already cached and no changes
                    }
                    
                    logger.debug('EMOJI_STICKER_CACHE', `Sticker ${sticker.name} changed - updating cache`)
                    // Get full existing data for update
                    existing = await this.backupDb.findByCurrentId(guildId, sticker.id, 'sticker')
                }
            } else {
                logger.debug('EMOJI_STICKER_CACHE', `Caching new sticker: ${sticker.name}`)
            }
            
            // Download image from Discord (only if new or changed)
            const { buffer, contentType, format } = await this.b2Storage.downloadFromDiscord(sticker.url)
            
            // Generate unique filename
            const fileName = `sticker_${guildId}_${sticker.id}_${Date.now()}.${format.toLowerCase()}`
            
            if (existing) {
                // Update existing cache
                logger.debug('EMOJI_STICKER_CACHE', `Updating cached sticker: ${sticker.name}`)
                
                // Delete old file from B2
                try {
                    await this.b2Storage.deleteFile(existing.b2FileId, existing.b2FileName)
                } catch (deleteError) {
                    logger.error('EMOJI_STICKER_CACHE', 'Failed to delete old B2 file', deleteError)
                }
                
                // Upload new file
                const { fileId, fileName: uploadedFileName, downloadUrl } = 
                    await this.b2Storage.uploadImage(buffer, fileName, contentType)
                
                // Update database
                await this.backupDb.updateBackup(guildId, sticker.id, 'sticker', {
                    name: sticker.name,
                    b2FileId: fileId,
                    b2FileName: uploadedFileName,
                    b2DownloadUrl: downloadUrl,
                    imageFormat: format,
                    imageSize: buffer.length,
                    description: sticker.description,
                    tags: sticker.tags,
                    lastUpdated: new Date()
                })
                
            } else {
                // Create new cache entry
                logger.debug('EMOJI_STICKER_CACHE', `Caching new sticker: ${sticker.name}`)
                
                // Upload to B2
                const { fileId, fileName: uploadedFileName, downloadUrl } = 
                    await this.b2Storage.uploadImage(buffer, fileName, contentType)
                
                // Save to database
                await this.backupDb.saveBackup({
                    guildID: guildId,
                    resourceType: 'sticker',
                    originalId: sticker.id,
                    currentId: sticker.id,
                    name: sticker.name,
                    b2FileId: fileId,
                    b2FileName: uploadedFileName,
                    b2DownloadUrl: downloadUrl,
                    imageFormat: format,
                    imageSize: buffer.length,
                    description: sticker.description,
                    tags: sticker.tags
                })
            }
            
            return true
        } catch (error) {
            logger.error('EMOJI_STICKER_CACHE', `Failed to cache sticker ${sticker.name}`, error)
            return false
        }
    }

    /**
     * Batch cache emojis with improved rate limiting and existence checking
     */
    async batchCacheEmojis(emojis, guildId) {
        const BATCH_SIZE = 2 // Reduced batch size for better stability
        const emojiArray = Array.from(emojis.values())
        let cached = 0
        let skipped = 0
        let failed = 0
        
        console.log(`[EMOJI_STICKER_CACHE] Starting batch cache of ${emojiArray.length} emojis`)
        
        for (let i = 0; i < emojiArray.length; i += BATCH_SIZE) {
            const batch = emojiArray.slice(i, i + BATCH_SIZE)
            
            const results = await Promise.allSettled(batch.map(emoji => this.cacheEmoji(emoji, guildId)))
            
            // Count results
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value === true) {
                    cached++
                } else if (result.status === 'fulfilled' && result.value === 'skipped') {
                    skipped++
                } else {
                    failed++
                    if (result.status === 'rejected') {
                        logger.error('EMOJI_STICKER_CACHE', 'Batch cache error', result.reason)
                    }
                }
            }
            
            // Dynamic rate limiting based on success rate
            const successRate = cached / (cached + failed)
            let delay = 1500 // Base delay
            
            if (successRate < 0.8) {
                delay = 3000 // Slower if many failures
            } else if (successRate > 0.95) {
                delay = 1000 // Faster if very successful
            }
            
            // Rate limit protection - wait between batches
            if (i + BATCH_SIZE < emojiArray.length) {
                await new Promise(resolve => setTimeout(resolve, delay))
            }
            
            // Progress logging
            if ((i + BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= emojiArray.length) {
                console.log(`[EMOJI_STICKER_CACHE] Progress: ${Math.min(i + BATCH_SIZE, emojiArray.length)}/${emojiArray.length} emojis processed`)
            }
        }
        
        console.log(`[EMOJI_STICKER_CACHE] Batch complete: ${cached} cached, ${skipped} skipped (unchanged), ${failed} failed`)
        return cached
    }

    /**
     * Batch cache stickers with improved rate limiting and existence checking
     */
    async batchCacheStickers(stickers, guildId) {
        const BATCH_SIZE = 2 // Reduced batch size for better stability
        const stickerArray = Array.from(stickers.values())
        let cached = 0
        let skipped = 0
        let failed = 0
        
        console.log(`[EMOJI_STICKER_CACHE] Starting batch cache of ${stickerArray.length} stickers`)
        
        for (let i = 0; i < stickerArray.length; i += BATCH_SIZE) {
            const batch = stickerArray.slice(i, i + BATCH_SIZE)
            
            const results = await Promise.allSettled(batch.map(sticker => this.cacheSticker(sticker, guildId)))
            
            // Count results
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value === true) {
                    cached++
                } else if (result.status === 'fulfilled' && result.value === 'skipped') {
                    skipped++
                } else {
                    failed++
                    if (result.status === 'rejected') {
                        logger.error('EMOJI_STICKER_CACHE', 'Batch cache error', result.reason)
                    }
                }
            }
            
            // Dynamic rate limiting based on success rate
            const successRate = cached / (cached + failed)
            let delay = 1500 // Base delay
            
            if (successRate < 0.8) {
                delay = 3000 // Slower if many failures
            } else if (successRate > 0.95) {
                delay = 1000 // Faster if very successful
            }
            
            // Rate limit protection - wait between batches
            if (i + BATCH_SIZE < stickerArray.length) {
                await new Promise(resolve => setTimeout(resolve, delay))
            }
            
            // Progress logging
            if ((i + BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= stickerArray.length) {
                console.log(`[EMOJI_STICKER_CACHE] Progress: ${Math.min(i + BATCH_SIZE, stickerArray.length)}/${stickerArray.length} stickers processed`)
            }
        }
        
        console.log(`[EMOJI_STICKER_CACHE] Batch complete: ${cached} cached, ${skipped} skipped (unchanged), ${failed} failed`)
        return cached
    }

    /**
     * Health check
     */
    async healthCheck() {
        const b2Health = await this.b2Storage.healthCheck()
        const dbHealth = await this.backupDb.healthCheck()
        
        return {
            initialized: this.initialized,
            b2Storage: b2Health,
            database: dbHealth
        }
    }

    /**
     * Get cache statistics for a guild
     */
    async getCacheStats(guildId) {
        try {
            // Single optimized query using aggregation
            const stats = await this.backupDb.EmojiStickerBackup.aggregate([
                { $match: { guildID: guildId } },
                { 
                    $group: { 
                        _id: '$resourceType',
                        count: { $sum: 1 },
                        totalSize: { $sum: '$imageSize' }
                    }
                }
            ])
            
            // Process results
            let emojis = 0, stickers = 0, totalSize = 0
            
            for (const stat of stats) {
                if (stat._id === 'emoji') {
                    emojis = stat.count
                    totalSize += stat.totalSize
                } else if (stat._id === 'sticker') {
                    stickers = stat.count
                    totalSize += stat.totalSize
                }
            }
            
            return {
                emojis,
                stickers,
                totalSize,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
            }
        } catch (error) {
            logger.error('EMOJI_STICKER_CACHE', 'Failed to get cache stats', error)
            return { emojis: 0, stickers: 0, totalSize: 0, totalSizeMB: '0.00' }
        }
    }
}

module.exports = EmojiStickerCacheHandler