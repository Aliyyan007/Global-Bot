const redisCluster = require('./redisCluster')

/**
 * Cached database wrapper with Redis Cluster support
 * Distributes cache across 3 Redis instances for optimal performance
 */
class CachedDBCluster {
    constructor(client) {
        this.client = client
    }

    // ==================== REDIS 1: USER DATA ====================

    // Profile operations with caching
    async getProfile(guildId, userId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getProfile(guildId, userId)
            if (cached) return cached
        }

        const profile = await this.client.profileSchema.findOne({ guildID: guildId, userID: userId }).lean()
        if (profile) {
            await redisCluster.setProfile(guildId, userId, profile)
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
            await redisCluster.setProfile(guildId, userId, result)
        }
        return result
    }

    async createProfile(profileData) {
        const profile = await this.client.profileSchema.create(profileData)
        const plainProfile = profile.toObject()
        await redisCluster.setProfile(plainProfile.guildID, plainProfile.userID, plainProfile)
        return profile
    }

    async deleteProfile(guildId, userId) {
        await redisCluster.invalidateProfile(guildId, userId)
        return this.client.profileSchema.deleteOne({ guildID: guildId, userID: userId })
    }

    // Global Profile operations
    async getGlobalProfile(userId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getGlobalProfile(userId)
            if (cached) return cached
        }

        const profile = await this.client.globalProfileSchema.findOne({ userID: userId }).lean()
        if (profile) {
            await redisCluster.setGlobalProfile(userId, profile)
        }
        return profile
    }

    async updateGlobalProfile(userId, update, options = {}) {
        const result = await this.client.globalProfileSchema.findOneAndUpdate(
            { userID: userId },
            update,
            { new: true, upsert: true, ...options }
        ).lean()
        
        if (result) {
            await redisCluster.setGlobalProfile(userId, result)
        }
        return result
    }

    // Cooldown helpers (stored only in Redis for speed)
    async getCooldown(guildId, userId, type) {
        return redisCluster.getCooldown(guildId, userId, type)
    }

    async setCooldown(guildId, userId, type, data, ttlSeconds) {
        return redisCluster.setCooldown(guildId, userId, type, data, ttlSeconds)
    }

    // Blackjack game state
    async getBlackjackGame(gameId) {
        return redisCluster.getBlackjackGame(gameId)
    }

    async setBlackjackGame(gameId, gameData, ttl = 1800) {
        return redisCluster.setBlackjackGame(gameId, gameData, ttl)
    }

    async invalidateBlackjackGame(gameId) {
        return redisCluster.invalidateBlackjackGame(gameId)
    }

    // ==================== REDIS 2: ECONOMY DATA ====================

    // Items operations with caching
    async getItems(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getItems(guildId)
            if (cached) return cached
        }

        const items = await this.client.itemSchema.find({ guildID: guildId }).lean()
        if (items) {
            await redisCluster.setItems(guildId, items)
        }
        return items
    }

    async invalidateItems(guildId) {
        return redisCluster.invalidateItems(guildId)
    }

    // Promocodes operations
    async getPromocodes(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getPromocodes(guildId)
            if (cached) return cached
        }

        const promocodes = await this.client.promocodeSchema.find({ guildID: guildId }).lean()
        if (promocodes) {
            await redisCluster.setPromocodes(guildId, promocodes)
        }
        return promocodes
    }

    async invalidatePromocodes(guildId) {
        return redisCluster.invalidatePromocodes(guildId)
    }

    // Auctions operations
    async getAuctions(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getAuctions(guildId)
            if (cached) return cached
        }

        const auctions = await this.client.auctionSchema.find({ guildID: guildId }).lean()
        if (auctions) {
            await redisCluster.setAuctions(guildId, auctions)
        }
        return auctions
    }

    async invalidateAuctions(guildId) {
        return redisCluster.invalidateAuctions(guildId)
    }

    // Custom Roles operations
    async getCustomRoles(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getCustomRoles(guildId)
            if (cached) return cached
        }

        const customRoles = await this.client.customRoleSchema.find({ guildID: guildId }).lean()
        if (customRoles) {
            await redisCluster.setCustomRoles(guildId, customRoles)
        }
        return customRoles
    }

    async invalidateCustomRoles(guildId) {
        return redisCluster.invalidateCustomRoles(guildId)
    }

    // ==================== REDIS 3: GUILD DATA ====================

    // Settings operations with caching
    async getSettings(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getSettings(guildId)
            if (cached) return cached
        }

        const settings = await this.client.settingsSchema.findOne({ guildID: guildId }).lean()
        if (settings) {
            await redisCluster.setSettings(guildId, settings)
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
            await redisCluster.setSettings(guildId, result)
        }
        return result
    }

    // Jobs operations
    async getJobs(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getJobs(guildId)
            if (cached) return cached
        }

        const jobs = await this.client.jobSchema.find({ guildID: guildId }).lean()
        if (jobs) {
            await redisCluster.setJobs(guildId, jobs)
        }
        return jobs
    }

    async invalidateJobs(guildId) {
        return redisCluster.invalidateJobs(guildId)
    }

    // Quests operations
    async getQuests(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getQuests(guildId)
            if (cached) return cached
        }

        const quests = await this.client.questSchema.find({ guildID: guildId }).lean()
        if (quests) {
            await redisCluster.setQuests(guildId, quests)
        }
        return quests
    }

    async invalidateQuests(guildId) {
        return redisCluster.invalidateQuests(guildId)
    }

    // Achievements operations
    async getAchievements(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getAchievements(guildId)
            if (cached) return cached
        }

        const achievements = await this.client.achievementSchema.find({ guildID: guildId }).lean()
        if (achievements) {
            await redisCluster.setAchievements(guildId, achievements)
        }
        return achievements
    }

    async invalidateAchievements(guildId) {
        return redisCluster.invalidateAchievements(guildId)
    }

    // Permissions operations
    async getPermissions(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getPermissions(guildId)
            if (cached) return cached
        }

        const permissions = await this.client.permissionSchema.find({ guildID: guildId }).lean()
        if (permissions) {
            await redisCluster.setPermissions(guildId, permissions)
        }
        return permissions
    }

    async invalidatePermissions(guildId) {
        return redisCluster.invalidatePermissions(guildId)
    }

    // Roles operations
    async getRoles(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getRoles(guildId)
            if (cached) return cached
        }

        const roles = await this.client.roleSchema.find({ guildID: guildId }).lean()
        if (roles) {
            await redisCluster.setRoles(guildId, roles)
        }
        return roles
    }

    async invalidateRoles(guildId) {
        return redisCluster.invalidateRoles(guildId)
    }

    // Channels operations
    async getChannels(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getChannels(guildId)
            if (cached) return cached
        }

        const channels = await this.client.channelMultipliersSchema.find({ guildID: guildId }).lean()
        if (channels) {
            await redisCluster.setChannels(guildId, channels)
        }
        return channels
    }

    async invalidateChannels(guildId) {
        return redisCluster.invalidateChannels(guildId)
    }

    // Giveaways operations
    async getGiveaways(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getGiveaways(guildId)
            if (cached) return cached
        }

        const giveaways = await this.client.giveawaySchema.find({ guildID: guildId }).lean()
        if (giveaways) {
            await redisCluster.setGiveaways(guildId, giveaways)
        }
        return giveaways
    }

    async invalidateGiveaways(guildId) {
        return redisCluster.invalidateGiveaways(guildId)
    }

    // Wormholes operations
    async getWormholes(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getWormholes(guildId)
            if (cached) return cached
        }

        const wormholes = await this.client.wormholeSchema.find({ guildID: guildId }).lean()
        if (wormholes) {
            await redisCluster.setWormholes(guildId, wormholes)
        }
        return wormholes
    }

    async invalidateWormholes(guildId) {
        return redisCluster.invalidateWormholes(guildId)
    }

    // Sticky Commands operations
    async getStickyCommands(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getStickyCommands(guildId)
            if (cached) return cached
        }

        const stickyCommands = await this.client.stickyCommandSchema.find({ guildID: guildId }).lean()
        if (stickyCommands) {
            await redisCluster.setStickyCommands(guildId, stickyCommands)
        }
        return stickyCommands
    }

    async invalidateStickyCommands(guildId) {
        return redisCluster.invalidateStickyCommands(guildId)
    }

    // Emoji Selectors operations
    async getEmojiSelectors(guildId, forceDB = false) {
        if (!forceDB) {
            const cached = await redisCluster.getEmojiSelectors(guildId)
            if (cached) return cached
        }

        const emojiSelectors = await this.client.emojiSelectorSchema.find({ guildID: guildId }).lean()
        if (emojiSelectors) {
            await redisCluster.setEmojiSelectors(guildId, emojiSelectors)
        }
        return emojiSelectors
    }

    async invalidateEmojiSelectors(guildId) {
        return redisCluster.invalidateEmojiSelectors(guildId)
    }

    // ==================== BULK OPERATIONS ====================

    // Bulk cache invalidation across all Redis instances
    async invalidateGuildCache(guildId) {
        return redisCluster.invalidateGuild(guildId)
    }
}

module.exports = CachedDBCluster
