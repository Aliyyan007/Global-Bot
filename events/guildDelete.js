const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildDelete, async (guild) => {
    try {
        console.log(`[GuildDelete] Bot removed from: ${guild.name} (${guild.id})`)
        
        // ============================================================
        // BACKUP CLEANUP SYSTEM
        // Schedule deletion of emoji/sticker backups after 10 minutes
        // ============================================================
        if (client.backupCleanupScheduler) {
            client.backupCleanupScheduler.scheduleCleanup(guild.id, guild.name)
        }
        
        // ============================================================
        // MARK DATA FOR 7-DAY PURGE + EVICT FROM SHARD CACHE
        // The daily cron deletes settings/docs whose deleteFromDB has passed;
        // if the bot rejoins within the window, the flag is cleared instead.
        // ============================================================
        const settings = client.cache.settings.get(guild.id)
        if (settings) {
            settings.deleteFromDB = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            await settings.save().catch(err => console.error('[GuildDelete] Failed to mark settings for deletion:', err))
        }
        // Evict this guild's entities from cache so nothing keeps writing
        // stale data and memory stays bounded.
        const cacheKeys = ['profiles', 'items', 'achievements', 'quests', 'roles', 'channels',
            'wormholes', 'promocodes', 'promocodeAutogenerators', 'lots', 'giveaways', 'permissions', 'jobs']
        for (const key of cacheKeys) {
            const collection = client.cache[key]
            if (!collection) continue
            collection.forEach((v, k) => { if (v.guildID === guild.id) collection.delete(k) })
        }
        
    } catch (error) {
        handleError(error, { 
            ownerId: client.config.discord.ownerId, 
            context: 'GuildDelete Event' 
        })
    }
})
