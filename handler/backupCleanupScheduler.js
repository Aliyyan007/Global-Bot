const B2StorageHandler = require('./b2StorageHandler')
const backupDatabaseManager = require('./backupDatabaseManager')
const logger = require('./safeModerationLogger')

/**
 * Backup Cleanup Scheduler
 * Handles delayed cleanup of emoji/sticker backups when bot leaves a guild
 * Cleanup happens 10 minutes after bot removal with minimal system load
 */
class BackupCleanupScheduler {
    constructor(client) {
        this.client = client
        this.b2Storage = new B2StorageHandler()
        this.backupDb = backupDatabaseManager
        
        // Track pending cleanups: Map<guildId, timeoutId>
        this.pendingCleanups = new Map()
        
        // Cleanup delay: 10 minutes
        this.cleanupDelay = 10 * 60 * 1000
        
        logger.info('BACKUP_CLEANUP', '✅ Scheduler initialized (10 minute delay)')
    }

    /**
     * Schedule cleanup for a guild (called when bot is kicked/removed)
     */
    scheduleCleanup(guildId, guildName) {
        // Cancel any existing cleanup for this guild
        if (this.pendingCleanups.has(guildId)) {
            clearTimeout(this.pendingCleanups.get(guildId))
            logger.info('BACKUP_CLEANUP', `Cancelled previous cleanup for ${guildName}`)
        }

        logger.info('BACKUP_CLEANUP', 
            `⏰ Scheduled cleanup for ${guildName} (${guildId}) in 10 minutes`)

        // Schedule cleanup after 10 minutes
        const timeoutId = setTimeout(async () => {
            await this.executeCleanup(guildId, guildName)
            this.pendingCleanups.delete(guildId)
        }, this.cleanupDelay)

        this.pendingCleanups.set(guildId, timeoutId)
    }

    /**
     * Cancel cleanup if bot rejoins the guild
     */
    cancelCleanup(guildId, guildName) {
        if (this.pendingCleanups.has(guildId)) {
            clearTimeout(this.pendingCleanups.get(guildId))
            this.pendingCleanups.delete(guildId)
            logger.info('BACKUP_CLEANUP', 
                `✅ Cancelled cleanup for ${guildName} (bot rejoined)`)
            return true
        }
        return false
    }

    /**
     * Execute cleanup with minimal system load
     */
    async executeCleanup(guildId, guildName) {
        const startTime = Date.now()
        logger.info('BACKUP_CLEANUP', 
            `🧹 Starting cleanup for ${guildName} (${guildId})`)

        try {
            // Get all backups for this guild
            const backups = await this.backupDb.getGuildBackups(guildId)
            
            if (backups.length === 0) {
                logger.info('BACKUP_CLEANUP', `No backups found for ${guildName}`)
                return
            }

            logger.info('BACKUP_CLEANUP', 
                `Found ${backups.length} backups to delete`)

            // Delete with minimal load: process 1 at a time with delays
            let deleted = 0
            let failed = 0

            for (const backup of backups) {
                try {
                    // Delete from B2 storage (with retry logic)
                    await this.deleteFromB2WithRetry(backup)
                    
                    // Delete from MongoDB
                    await this.backupDb.deleteBackup(
                        guildId, 
                        backup.currentId, 
                        backup.resourceType
                    )
                    
                    deleted++
                    
                    // Minimal load: wait 100ms between deletions
                    await new Promise(resolve => setTimeout(resolve, 100))
                    
                } catch (error) {
                    failed++
                    logger.error('BACKUP_CLEANUP', 
                        `Failed to delete ${backup.resourceType} ${backup.name}`, error)
                }
            }

            const elapsed = Date.now() - startTime
            logger.info('BACKUP_CLEANUP', 
                `✅ Cleanup complete for ${guildName}: ${deleted} deleted, ${failed} failed in ${elapsed}ms`)

        } catch (error) {
            logger.error('BACKUP_CLEANUP', 
                `Failed to cleanup ${guildName}`, error)
        }
    }

    /**
     * Delete file from B2 with retry logic
     */
    async deleteFromB2WithRetry(backup) {
        let retryCount = 0
        const maxRetries = 3

        while (retryCount < maxRetries) {
            try {
                await this.b2Storage.deleteFile(backup.b2FileId, backup.b2FileName)
                return
            } catch (error) {
                retryCount++
                
                if (retryCount >= maxRetries) {
                    throw error
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
            }
        }
    }

    /**
     * Get pending cleanup info
     */
    getPendingCleanups() {
        return Array.from(this.pendingCleanups.keys())
    }

    /**
     * Cleanup on shutdown
     */
    destroy() {
        // Clear all pending timeouts
        for (const timeoutId of this.pendingCleanups.values()) {
            clearTimeout(timeoutId)
        }
        this.pendingCleanups.clear()
        logger.info('BACKUP_CLEANUP', 'Scheduler destroyed')
    }
}

module.exports = BackupCleanupScheduler
