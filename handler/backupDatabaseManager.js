const mongoose = require('mongoose')
const emojiStickerBackupSchema = require('../schemas/emojiStickerBackupSchema')

/**
 * Backup Database Manager
 * Manages separate MongoDB connection for emoji/sticker backups
 */
class BackupDatabaseManager {
    constructor() {
        this.connection = null
        this.EmojiStickerBackup = null
        this.isConfigured = !!process.env.mongoDB_SRV_BACKUP
        
        if (!this.isConfigured) {
            console.log('[BACKUP_DB] ⚠️ Backup database not configured')
            console.log('[BACKUP_DB] Set mongoDB_SRV_BACKUP in .env to enable')
        }
    }

    /**
     * Connect to backup database with retry logic
     */
    async connect() {
        if (!this.isConfigured) {
            console.log('[BACKUP_DB] Skipping - not configured')
            return false
        }

        let retryCount = 0
        const maxRetries = 3

        while (retryCount < maxRetries) {
            try {
                this.connection = await mongoose.createConnection(process.env.mongoDB_SRV_BACKUP, {
                    serverSelectionTimeoutMS: 10000, // Increased timeout
                    socketTimeoutMS: 45000,
                    maxPoolSize: 10, // Connection pooling
                    minPoolSize: 2,
                    maxIdleTimeMS: 30000,
                    bufferCommands: false
                })

                // Wait for connection
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout'))
                    }, 15000)

                    if (this.connection.readyState === 1) {
                        clearTimeout(timeout)
                        resolve()
                    } else {
                        this.connection.once('open', () => {
                            clearTimeout(timeout)
                            resolve()
                        })
                        this.connection.once('error', (err) => {
                            clearTimeout(timeout)
                            reject(err)
                        })
                    }
                })

                // Initialize model
                this.EmojiStickerBackup = this.connection.model('emojiStickerBackups', emojiStickerBackupSchema)

                const dbName = this.connection.db?.databaseName || 'backup'
                console.log(`[BACKUP_DB] ✅ Connected to ${dbName}`)

                this.connection.on('error', (err) => {
                    console.error('[BACKUP_DB] Connection error:', err.message)
                })

                this.connection.on('disconnected', () => {
                    console.log('[BACKUP_DB] ⚠️ Disconnected - attempting reconnection...')
                })

                return true
            } catch (error) {
                retryCount++
                console.error(`[BACKUP_DB] ❌ Connection attempt ${retryCount} failed:`, error.message)
                
                if (retryCount >= maxRetries) {
                    console.error('[BACKUP_DB] ❌ Max retries reached, giving up')
                    return false
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
            }
        }

        return false
    }

    /**
     * Save backup entry
     */
    async saveBackup(data) {
        if (!this.connection) return null
        try {
            return await this.EmojiStickerBackup.create(data)
        } catch (error) {
            console.error('[BACKUP_DB] Save failed:', error.message)
            return null
        }
    }

    /**
     * Find backup by current ID
     */
    async findByCurrentId(guildID, currentId, resourceType) {
        if (!this.connection) return null
        try {
            return await this.EmojiStickerBackup.findOne({ guildID, currentId, resourceType })
        } catch (error) {
            console.error('[BACKUP_DB] Find failed:', error.message)
            return null
        }
    }

    /**
     * Update backup entry
     */
    async updateBackup(guildID, currentId, resourceType, updates) {
        if (!this.connection) return null
        try {
            return await this.EmojiStickerBackup.findOneAndUpdate(
                { guildID, currentId, resourceType },
                { $set: updates },
                { new: true }
            )
        } catch (error) {
            console.error('[BACKUP_DB] Update failed:', error.message)
            return null
        }
    }

    /**
     * Get all backups for a guild
     */
    async getGuildBackups(guildID, resourceType = null) {
        if (!this.connection) return []
        try {
            const query = { guildID }
            if (resourceType) query.resourceType = resourceType
            return await this.EmojiStickerBackup.find(query).lean()
        } catch (error) {
            console.error('[BACKUP_DB] Query failed:', error.message)
            return []
        }
    }

    /**
     * Delete backup entry
     */
    async deleteBackup(guildID, currentId, resourceType) {
        if (!this.connection) return false
        try {
            await this.EmojiStickerBackup.deleteOne({ guildID, currentId, resourceType })
            return true
        } catch (error) {
            console.error('[BACKUP_DB] Delete failed:', error.message)
            return false
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        return {
            connected: this.connection?.readyState === 1,
            configured: this.isConfigured
        }
    }

    /**
     * Disconnect
     */
    async disconnect() {
        if (this.connection) {
            await this.connection.close()
            console.log('[BACKUP_DB] Disconnected')
        }
    }

    /**
     * Check if backup exists (lightweight query)
     */
    async backupExists(guildID, currentId, resourceType) {
        if (!this.connection) return false
        try {
            const exists = await this.EmojiStickerBackup.exists({ guildID, currentId, resourceType })
            return !!exists
        } catch (error) {
            console.error('[BACKUP_DB] Exists check failed:', error.message)
            return false
        }
    }

    /**
     * Get backup metadata only (without full document)
     */
    async getBackupMetadata(guildID, currentId, resourceType) {
        if (!this.connection) return null
        try {
            return await this.EmojiStickerBackup.findOne(
                { guildID, currentId, resourceType },
                { name: 1, animated: 1, roles: 1, description: 1, tags: 1, lastUpdated: 1 }
            ).lean()
        } catch (error) {
            console.error('[BACKUP_DB] Metadata query failed:', error.message)
            return null
        }
    }
}

module.exports = new BackupDatabaseManager()