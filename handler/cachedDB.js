const redisCache = require('./redisCache')

/**
 * Cached database wrapper - checks Redis first, falls back to MongoDB
 * Automatically updates cache on writes
 */
class CachedDB {
    constructor(client) {
        this.client = client
    }

    // Profile operations with caching
    async getProfile(guildId, userId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCache.getProfile(guildId, userId)
            if (cached) return cached
        }

        const profile = await this.client.profileSchema.findOne({ guildID: guildId, userID: userId }).lean()
        if (profile) {
            await redisCache.setProfile(guildId, userId, profile)
        }
        return profile
    }

    async updateProfile(guildId, userId, update, options = {}) {
        const result = await this.client.profileSchema.findOneAndUpdate(
            { guildID: guildId, userID: userId },
            update,
            { new: true, ...options }
        ).lean()
        
        if (result) {
            await redisCache.setProfile(guildId, userId, result)
        }
        return result
    }

    async createProfile(profileData) {
        const profile = await this.client.profileSchema.create(profileData)
        const plainProfile = profile.toObject()
        await redisCache.setProfile(plainProfile.guildID, plainProfile.userID, plainProfile)
        return profile
    }

    async deleteProfile(guildId, userId) {
        await redisCache.invalidateProfile(guildId, userId)
        return this.client.profileSchema.deleteOne({ guildID: guildId, userID: userId })
    }

    // Settings operations with caching
    async getSettings(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCache.getSettings(guildId)
            if (cached) return cached
        }

        const settings = await this.client.settingsSchema.findOne({ guildID: guildId }).lean()
        if (settings) {
            await redisCache.setSettings(guildId, settings)
        }
        return settings
    }

    async updateSettings(guildId, update, options = {}) {
        const result = await this.client.settingsSchema.findOneAndUpdate(
            { guildID: guildId },
            update,
            { new: true, upsert: true, ...options }
        ).lean()
        
        if (result) {
            await redisCache.setSettings(guildId, result)
        }
        return result
    }

    // Items operations with caching
    async getItems(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCache.getItems(guildId)
            if (cached) return cached
        }

        const items = await this.client.itemSchema.find({ guildID: guildId }).lean()
        if (items) {
            await redisCache.setItems(guildId, items)
        }
        return items
    }

    async invalidateItems(guildId) {
        return redisCache.invalidateItems(guildId)
    }

    // Bulk cache invalidation
    async invalidateGuildCache(guildId) {
        return redisCache.invalidateGuild(guildId)
    }

    // Cooldown helpers (stored only in Redis for speed)
    async getCooldown(guildId, userId, type) {
        return redisCache.getCooldown(guildId, userId, type)
    }

    async setCooldown(guildId, userId, type, data, ttlSeconds) {
        return redisCache.setCooldown(guildId, userId, type, data, ttlSeconds)
    }
}

module.exports = CachedDB
