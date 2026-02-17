const Redis = require('ioredis')

class RedisCache {
    constructor() {
        this.client = null
        this.isConnected = false
        this.defaultTTL = 300 // 5 minutes default
    }

    async connect() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
            
            this.client = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryDelayOnFailover: 100,
                enableReadyCheck: true,
                lazyConnect: true
            })

            this.client.on('connect', () => {
                console.log('[Redis] Connected successfully')
                this.isConnected = true
            })

            this.client.on('error', (err) => {
                console.error('[Redis] Connection error:', err.message)
                this.isConnected = false
            })

            this.client.on('close', () => {
                console.log('[Redis] Connection closed')
                this.isConnected = false
            })

            await this.client.connect()
            return true
        } catch (error) {
            console.error('[Redis] Failed to connect:', error.message)
            this.isConnected = false
            return false
        }
    }

    // Generate cache keys
    keys = {
        profile: (guildId, userId) => `profile:${guildId}:${userId}`,
        settings: (guildId) => `settings:${guildId}`,
        items: (guildId) => `items:${guildId}`,
        roles: (guildId) => `roles:${guildId}`,
        permissions: (guildId) => `permissions:${guildId}`,
        jobs: (guildId) => `jobs:${guildId}`,
        quests: (guildId) => `quests:${guildId}`,
        achievements: (guildId) => `achievements:${guildId}`,
        giveaway: (guildId, giveawayId) => `giveaway:${guildId}:${giveawayId}`,
        cooldown: (guildId, userId, type) => `cooldown:${guildId}:${userId}:${type}`
    }

    // Core cache operations
    async get(key) {
        if (!this.isConnected) return null
        try {
            const data = await this.client.get(key)
            return data ? JSON.parse(data) : null
        } catch (error) {
            console.error(`[Redis] Get error for ${key}:`, error.message)
            return null
        }
    }

    async set(key, value, ttl = this.defaultTTL) {
        if (!this.isConnected) return false
        try {
            await this.client.setex(key, ttl, JSON.stringify(value))
            return true
        } catch (error) {
            console.error(`[Redis] Set error for ${key}:`, error.message)
            return false
        }
    }

    async del(key) {
        if (!this.isConnected) return false
        try {
            await this.client.del(key)
            return true
        } catch (error) {
            console.error(`[Redis] Delete error for ${key}:`, error.message)
            return false
        }
    }

    async delPattern(pattern) {
        if (!this.isConnected) return false
        try {
            const keys = await this.client.keys(pattern)
            if (keys.length > 0) {
                await this.client.del(...keys)
            }
            return true
        } catch (error) {
            console.error(`[Redis] Delete pattern error for ${pattern}:`, error.message)
            return false
        }
    }

    // Profile caching
    async getProfile(guildId, userId) {
        return this.get(this.keys.profile(guildId, userId))
    }

    async setProfile(guildId, userId, profile, ttl = 600) {
        return this.set(this.keys.profile(guildId, userId), profile, ttl)
    }

    async invalidateProfile(guildId, userId) {
        return this.del(this.keys.profile(guildId, userId))
    }

    // Settings caching
    async getSettings(guildId) {
        return this.get(this.keys.settings(guildId))
    }

    async setSettings(guildId, settings, ttl = 1800) {
        return this.set(this.keys.settings(guildId), settings, ttl)
    }

    async invalidateSettings(guildId) {
        return this.del(this.keys.settings(guildId))
    }

    // Items caching
    async getItems(guildId) {
        return this.get(this.keys.items(guildId))
    }

    async setItems(guildId, items, ttl = 900) {
        return this.set(this.keys.items(guildId), items, ttl)
    }

    async invalidateItems(guildId) {
        return this.del(this.keys.items(guildId))
    }

    // Bulk invalidation for a guild
    async invalidateGuild(guildId) {
        return this.delPattern(`*:${guildId}:*`)
    }

    // Cooldown management (short TTL)
    async getCooldown(guildId, userId, type) {
        return this.get(this.keys.cooldown(guildId, userId, type))
    }

    async setCooldown(guildId, userId, type, data, ttlSeconds) {
        return this.set(this.keys.cooldown(guildId, userId, type), data, ttlSeconds)
    }

    // Health check
    async ping() {
        if (!this.isConnected) return false
        try {
            const result = await this.client.ping()
            return result === 'PONG'
        } catch {
            return false
        }
    }

    // Graceful shutdown
    async disconnect() {
        if (this.client) {
            await this.client.quit()
            this.isConnected = false
            console.log('[Redis] Disconnected')
        }
    }
}

module.exports = new RedisCache()
