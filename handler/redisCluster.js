const Redis = require('ioredis')

/**
 * Redis Cluster Manager - Distributes load across 3 Redis instances
 * 
 * Distribution Strategy:
 * - Redis 1 (Primary): User data, profiles, cooldowns, sessions
 * - Redis 2 (Economy): Items, shops, transactions, inventory, auctions, lots
 * - Redis 3 (Guild): Settings, permissions, roles, channels, jobs, quests, achievements
 */
class RedisCluster {
    constructor() {
        this.redis1 = null // User-focused data
        this.redis2 = null // Economy-focused data
        this.redis3 = null // Guild-focused data
        this.isConnected = {
            redis1: false,
            redis2: false,
            redis3: false
        }
        this.defaultTTL = 300 // 5 minutes default
    }

    async connect() {
        // Check if any Redis URLs are configured
        if (!process.env.REDIS_URL_1 && !process.env.REDIS_URL_2 && !process.env.REDIS_URL_3 && !process.env.REDIS_URL) {
            console.log('[Redis Cluster] No Redis URLs configured - running without cache')
            return false
        }
        
        try {
            const redis1Url = process.env.REDIS_URL_1 || process.env.REDIS_URL
            const redis2Url = process.env.REDIS_URL_2 || process.env.REDIS_URL
            const redis3Url = process.env.REDIS_URL_3 || process.env.REDIS_URL
            
            // If no URLs configured, skip
            if (!redis1Url && !redis2Url && !redis3Url) {
                console.log('[Redis Cluster] No Redis URLs configured - skipping')
                return false
            }
            
            // Check if using Upstash (requires TLS)
            const isUpstash = redis1Url && redis1Url.includes('upstash.io')
            
            const redisConfig = {
                maxRetriesPerRequest: 3,
                retryDelayOnFailover: 100,
                enableReadyCheck: true,
                lazyConnect: true,
                enableOfflineQueue: false,
                connectTimeout: 10000,
                // Force IPv4 for Upstash (IPv6 doesn't work)
                family: 4,
                // Add TLS config for Upstash
                ...(isUpstash && {
                    tls: {
                        rejectUnauthorized: false
                    }
                })
            }

            // Initialize Redis 1 - User Data
            this.redis1 = new Redis(redis1Url, redisConfig)
            this.setupEventHandlers(this.redis1, 'Redis1 [User Data]', 'redis1')

            // Initialize Redis 2 - Economy Data
            this.redis2 = new Redis(redis2Url, redisConfig)
            this.setupEventHandlers(this.redis2, 'Redis2 [Economy]', 'redis2')

            // Initialize Redis 3 - Guild Data
            this.redis3 = new Redis(redis3Url, redisConfig)
            this.setupEventHandlers(this.redis3, 'Redis3 [Guild]', 'redis3')

            // Connect all instances
            await Promise.all([
                this.redis1.connect(),
                this.redis2.connect(),
                this.redis3.connect()
            ])

            console.log('[Redis Cluster] All instances connected successfully')
            return true
        } catch (error) {
            console.error('[Redis Cluster] Failed to connect:', error.message)
            return false
        }
    }

    setupEventHandlers(client, name, key) {
        let reconnectAttempts = 0
        const maxReconnectAttempts = 5
        
        client.on('connect', () => {
            if (reconnectAttempts === 0) {
                console.log(`[${name}] Connected successfully`)
            }
            this.isConnected[key] = true
            reconnectAttempts = 0
        })

        client.on('error', (err) => {
            // Only log first few errors to avoid spam
            if (reconnectAttempts < 3) {
                console.error(`[${name}] Connection error:`, err.message)
            }
            this.isConnected[key] = false
        })

        client.on('close', () => {
            reconnectAttempts++
            if (reconnectAttempts === 1) {
                console.log(`[${name}] Connection closed`)
            }
            if (reconnectAttempts >= maxReconnectAttempts) {
                console.error(`[${name}] Max reconnection attempts reached. Giving up.`)
            }
            this.isConnected[key] = false
        })
        
        client.on('reconnecting', () => {
            if (reconnectAttempts === 1) {
                console.log(`[${name}] Attempting to reconnect...`)
            }
        })
    }

    // Get appropriate Redis instance based on data type
    getClient(type) {
        const userDataTypes = ['profile', 'cooldown', 'blackjack', 'session', 'globalProfile', 'userAppeal']
        const economyDataTypes = ['items', 'shop', 'market', 'lot', 'auction', 'inventory', 'promocode', 'autogenerator', 'gift', 'customRole']
        const guildDataTypes = ['settings', 'permissions', 'roles', 'channels', 'jobs', 'quests', 'achievements', 'giveaway', 'wormhole', 'emojiSelector', 'stickyCommand', 'safeModeration', 'dropdownRole', 'timedRole', 'roleProperties']

        if (userDataTypes.includes(type)) return this.redis1
        if (economyDataTypes.includes(type)) return this.redis2
        if (guildDataTypes.includes(type)) return this.redis3
        
        // Default to redis1 for unknown types
        return this.redis1
    }

    // Generate cache keys with proper prefixes
    keys = {
        // Redis 1 - User Data
        profile: (guildId, userId) => ({ client: this.redis1, key: `profile:${guildId}:${userId}` }),
        globalProfile: (userId) => ({ client: this.redis1, key: `globalProfile:${userId}` }),
        cooldown: (guildId, userId, type) => ({ client: this.redis1, key: `cooldown:${guildId}:${userId}:${type}` }),
        blackjack: (gameId) => ({ client: this.redis1, key: `blackjack:${gameId}` }),
        session: (sessionId) => ({ client: this.redis1, key: `session:${sessionId}` }),
        userAppeal: (guildId, userId) => ({ client: this.redis1, key: `userAppeal:${guildId}:${userId}` }),
        
        // Redis 2 - Economy Data
        items: (guildId) => ({ client: this.redis2, key: `items:${guildId}` }),
        item: (itemId) => ({ client: this.redis2, key: `item:${itemId}` }),
        shop: (guildId) => ({ client: this.redis2, key: `shop:${guildId}` }),
        shopCategory: (categoryId) => ({ client: this.redis2, key: `shopCategory:${categoryId}` }),
        market: (guildId) => ({ client: this.redis2, key: `market:${guildId}` }),
        lot: (lotId) => ({ client: this.redis2, key: `lot:${lotId}` }),
        auction: (auctionId) => ({ client: this.redis2, key: `auction:${auctionId}` }),
        auctions: (guildId) => ({ client: this.redis2, key: `auctions:${guildId}` }),
        promocode: (guildId, code) => ({ client: this.redis2, key: `promocode:${guildId}:${code}` }),
        promocodes: (guildId) => ({ client: this.redis2, key: `promocodes:${guildId}` }),
        autogenerator: (generatorId) => ({ client: this.redis2, key: `autogenerator:${generatorId}` }),
        autogenerators: (guildId) => ({ client: this.redis2, key: `autogenerators:${guildId}` }),
        gift: (guildId, giftId) => ({ client: this.redis2, key: `gift:${guildId}:${giftId}` }),
        gifts: (guildId) => ({ client: this.redis2, key: `gifts:${guildId}` }),
        customRole: (roleId) => ({ client: this.redis2, key: `customRole:${roleId}` }),
        customRoles: (guildId) => ({ client: this.redis2, key: `customRoles:${guildId}` }),
        
        // Redis 3 - Guild Data
        settings: (guildId) => ({ client: this.redis3, key: `settings:${guildId}` }),
        permissions: (guildId) => ({ client: this.redis3, key: `permissions:${guildId}` }),
        permission: (permissionId) => ({ client: this.redis3, key: `permission:${permissionId}` }),
        roles: (guildId) => ({ client: this.redis3, key: `roles:${guildId}` }),
        role: (roleId) => ({ client: this.redis3, key: `role:${roleId}` }),
        roleProperties: (guildId) => ({ client: this.redis3, key: `roleProperties:${guildId}` }),
        channels: (guildId) => ({ client: this.redis3, key: `channels:${guildId}` }),
        channel: (channelId) => ({ client: this.redis3, key: `channel:${channelId}` }),
        jobs: (guildId) => ({ client: this.redis3, key: `jobs:${guildId}` }),
        job: (jobId) => ({ client: this.redis3, key: `job:${jobId}` }),
        quests: (guildId) => ({ client: this.redis3, key: `quests:${guildId}` }),
        quest: (questId) => ({ client: this.redis3, key: `quest:${questId}` }),
        achievements: (guildId) => ({ client: this.redis3, key: `achievements:${guildId}` }),
        achievement: (achievementId) => ({ client: this.redis3, key: `achievement:${achievementId}` }),
        giveaway: (giveawayId) => ({ client: this.redis3, key: `giveaway:${giveawayId}` }),
        giveaways: (guildId) => ({ client: this.redis3, key: `giveaways:${guildId}` }),
        wormhole: (wormholeId) => ({ client: this.redis3, key: `wormhole:${wormholeId}` }),
        wormholes: (guildId) => ({ client: this.redis3, key: `wormholes:${guildId}` }),
        emojiSelector: (selectorId) => ({ client: this.redis3, key: `emojiSelector:${selectorId}` }),
        emojiSelectors: (guildId) => ({ client: this.redis3, key: `emojiSelectors:${guildId}` }),
        stickyCommand: (guildId, channelId, commandName) => ({ client: this.redis3, key: `stickyCommand:${guildId}:${channelId}:${commandName}` }),
        stickyCommands: (guildId) => ({ client: this.redis3, key: `stickyCommands:${guildId}` }),
        safeModeration: (guildId) => ({ client: this.redis3, key: `safeModeration:${guildId}` }),
        dropdownRole: (guildId) => ({ client: this.redis3, key: `dropdownRole:${guildId}` }),
        timedRole: (guildId, userId, roleId) => ({ client: this.redis3, key: `timedRole:${guildId}:${userId}:${roleId}` }),
        timedRoles: (guildId) => ({ client: this.redis3, key: `timedRoles:${guildId}` })
    }

    // Core cache operations
    async get(keyObj) {
        if (!keyObj || !keyObj.client || !keyObj.key) return null
        const { client, key } = keyObj
        
        try {
            const data = await client.get(key)
            return data ? JSON.parse(data) : null
        } catch (error) {
            console.error(`[Redis Cluster] Get error for ${key}:`, error.message)
            return null
        }
    }

    async set(keyObj, value, ttl = this.defaultTTL) {
        if (!keyObj || !keyObj.client || !keyObj.key) return false
        const { client, key } = keyObj
        
        try {
            await client.setex(key, ttl, JSON.stringify(value))
            return true
        } catch (error) {
            console.error(`[Redis Cluster] Set error for ${key}:`, error.message)
            return false
        }
    }

    async del(keyObj) {
        if (!keyObj || !keyObj.client || !keyObj.key) return false
        const { client, key } = keyObj
        
        try {
            await client.del(key)
            return true
        } catch (error) {
            console.error(`[Redis Cluster] Delete error for ${key}:`, error.message)
            return false
        }
    }

    async delPattern(redisClient, pattern) {
        if (!redisClient) return false
        try {
            const keys = await redisClient.keys(pattern)
            if (keys.length > 0) {
                await redisClient.del(...keys)
            }
            return true
        } catch (error) {
            console.error(`[Redis Cluster] Delete pattern error for ${pattern}:`, error.message)
            return false
        }
    }

    // Profile caching (Redis 1)
    async getProfile(guildId, userId) {
        return this.get(this.keys.profile(guildId, userId))
    }

    async setProfile(guildId, userId, profile, ttl = 600) {
        return this.set(this.keys.profile(guildId, userId), profile, ttl)
    }

    async invalidateProfile(guildId, userId) {
        return this.del(this.keys.profile(guildId, userId))
    }

    // Global Profile caching (Redis 1)
    async getGlobalProfile(userId) {
        return this.get(this.keys.globalProfile(userId))
    }

    async setGlobalProfile(userId, profile, ttl = 900) {
        return this.set(this.keys.globalProfile(userId), profile, ttl)
    }

    async invalidateGlobalProfile(userId) {
        return this.del(this.keys.globalProfile(userId))
    }

    // Settings caching (Redis 3)
    async getSettings(guildId) {
        return this.get(this.keys.settings(guildId))
    }

    async setSettings(guildId, settings, ttl = 1800) {
        return this.set(this.keys.settings(guildId), settings, ttl)
    }

    async invalidateSettings(guildId) {
        return this.del(this.keys.settings(guildId))
    }

    // Items caching (Redis 2)
    async getItems(guildId) {
        return this.get(this.keys.items(guildId))
    }

    async setItems(guildId, items, ttl = 900) {
        return this.set(this.keys.items(guildId), items, ttl)
    }

    async invalidateItems(guildId) {
        return this.del(this.keys.items(guildId))
    }

    // Jobs caching (Redis 3)
    async getJobs(guildId) {
        return this.get(this.keys.jobs(guildId))
    }

    async setJobs(guildId, jobs, ttl = 900) {
        return this.set(this.keys.jobs(guildId), jobs, ttl)
    }

    async invalidateJobs(guildId) {
        return this.del(this.keys.jobs(guildId))
    }

    // Quests caching (Redis 3)
    async getQuests(guildId) {
        return this.get(this.keys.quests(guildId))
    }

    async setQuests(guildId, quests, ttl = 900) {
        return this.set(this.keys.quests(guildId), quests, ttl)
    }

    async invalidateQuests(guildId) {
        return this.del(this.keys.quests(guildId))
    }

    // Achievements caching (Redis 3)
    async getAchievements(guildId) {
        return this.get(this.keys.achievements(guildId))
    }

    async setAchievements(guildId, achievements, ttl = 900) {
        return this.set(this.keys.achievements(guildId), achievements, ttl)
    }

    async invalidateAchievements(guildId) {
        return this.del(this.keys.achievements(guildId))
    }

    // Permissions caching (Redis 3)
    async getPermissions(guildId) {
        return this.get(this.keys.permissions(guildId))
    }

    async setPermissions(guildId, permissions, ttl = 1200) {
        return this.set(this.keys.permissions(guildId), permissions, ttl)
    }

    async invalidatePermissions(guildId) {
        return this.del(this.keys.permissions(guildId))
    }

    // Roles caching (Redis 3)
    async getRoles(guildId) {
        return this.get(this.keys.roles(guildId))
    }

    async setRoles(guildId, roles, ttl = 1200) {
        return this.set(this.keys.roles(guildId), roles, ttl)
    }

    async invalidateRoles(guildId) {
        return this.del(this.keys.roles(guildId))
    }

    // Channels caching (Redis 3)
    async getChannels(guildId) {
        return this.get(this.keys.channels(guildId))
    }

    async setChannels(guildId, channels, ttl = 1200) {
        return this.set(this.keys.channels(guildId), channels, ttl)
    }

    async invalidateChannels(guildId) {
        return this.del(this.keys.channels(guildId))
    }

    // Giveaways caching (Redis 3)
    async getGiveaways(guildId) {
        return this.get(this.keys.giveaways(guildId))
    }

    async setGiveaways(guildId, giveaways, ttl = 600) {
        return this.set(this.keys.giveaways(guildId), giveaways, ttl)
    }

    async invalidateGiveaways(guildId) {
        return this.del(this.keys.giveaways(guildId))
    }

    // Wormholes caching (Redis 3)
    async getWormholes(guildId) {
        return this.get(this.keys.wormholes(guildId))
    }

    async setWormholes(guildId, wormholes, ttl = 900) {
        return this.set(this.keys.wormholes(guildId), wormholes, ttl)
    }

    async invalidateWormholes(guildId) {
        return this.del(this.keys.wormholes(guildId))
    }

    // Promocodes caching (Redis 2)
    async getPromocodes(guildId) {
        return this.get(this.keys.promocodes(guildId))
    }

    async setPromocodes(guildId, promocodes, ttl = 600) {
        return this.set(this.keys.promocodes(guildId), promocodes, ttl)
    }

    async invalidatePromocodes(guildId) {
        return this.del(this.keys.promocodes(guildId))
    }

    // Auctions caching (Redis 2)
    async getAuctions(guildId) {
        return this.get(this.keys.auctions(guildId))
    }

    async setAuctions(guildId, auctions, ttl = 600) {
        return this.set(this.keys.auctions(guildId), auctions, ttl)
    }

    async invalidateAuctions(guildId) {
        return this.del(this.keys.auctions(guildId))
    }

    // Custom Roles caching (Redis 2)
    async getCustomRoles(guildId) {
        return this.get(this.keys.customRoles(guildId))
    }

    async setCustomRoles(guildId, customRoles, ttl = 600) {
        return this.set(this.keys.customRoles(guildId), customRoles, ttl)
    }

    async invalidateCustomRoles(guildId) {
        return this.del(this.keys.customRoles(guildId))
    }

    // Sticky Commands caching (Redis 3)
    async getStickyCommands(guildId) {
        return this.get(this.keys.stickyCommands(guildId))
    }

    async setStickyCommands(guildId, stickyCommands, ttl = 900) {
        return this.set(this.keys.stickyCommands(guildId), stickyCommands, ttl)
    }

    async invalidateStickyCommands(guildId) {
        return this.del(this.keys.stickyCommands(guildId))
    }

    // Emoji Selectors caching (Redis 3)
    async getEmojiSelectors(guildId) {
        return this.get(this.keys.emojiSelectors(guildId))
    }

    async setEmojiSelectors(guildId, emojiSelectors, ttl = 600) {
        return this.set(this.keys.emojiSelectors(guildId), emojiSelectors, ttl)
    }

    async invalidateEmojiSelectors(guildId) {
        return this.del(this.keys.emojiSelectors(guildId))
    }

    // Bulk invalidation for a guild across all Redis instances
    async invalidateGuild(guildId) {
        await Promise.all([
            this.delPattern(this.redis1, `*:${guildId}:*`),
            this.delPattern(this.redis1, `*:${guildId}`),
            this.delPattern(this.redis2, `*:${guildId}:*`),
            this.delPattern(this.redis2, `*:${guildId}`),
            this.delPattern(this.redis3, `*:${guildId}:*`),
            this.delPattern(this.redis3, `*:${guildId}`)
        ])
        return true
    }

    // Cooldown management (Redis 1 - short TTL)
    async getCooldown(guildId, userId, type) {
        return this.get(this.keys.cooldown(guildId, userId, type))
    }

    async setCooldown(guildId, userId, type, data, ttlSeconds) {
        return this.set(this.keys.cooldown(guildId, userId, type), data, ttlSeconds)
    }

    // Blackjack game state (Redis 1 - short TTL)
    async getBlackjackGame(gameId) {
        return this.get(this.keys.blackjack(gameId))
    }

    async setBlackjackGame(gameId, gameData, ttl = 1800) {
        return this.set(this.keys.blackjack(gameId), gameData, ttl)
    }

    async invalidateBlackjackGame(gameId) {
        return this.del(this.keys.blackjack(gameId))
    }

    // Health check for all instances
    async ping() {
        try {
            const results = await Promise.all([
                this.redis1.ping(),
                this.redis2.ping(),
                this.redis3.ping()
            ])
            return {
                redis1: results[0] === 'PONG',
                redis2: results[1] === 'PONG',
                redis3: results[2] === 'PONG',
                allHealthy: results.every(r => r === 'PONG')
            }
        } catch (error) {
            return {
                redis1: false,
                redis2: false,
                redis3: false,
                allHealthy: false
            }
        }
    }

    // Get connection status
    getStatus() {
        return {
            redis1: {
                connected: this.isConnected.redis1,
                type: 'User Data (Profiles, Cooldowns, Sessions)'
            },
            redis2: {
                connected: this.isConnected.redis2,
                type: 'Economy (Items, Shop, Auctions, Promocodes)'
            },
            redis3: {
                connected: this.isConnected.redis3,
                type: 'Guild (Settings, Permissions, Roles, Jobs, Quests)'
            }
        }
    }

    // Graceful shutdown
    async disconnect() {
        const promises = []
        
        if (this.redis1) {
            promises.push(this.redis1.quit())
            this.isConnected.redis1 = false
        }
        if (this.redis2) {
            promises.push(this.redis2.quit())
            this.isConnected.redis2 = false
        }
        if (this.redis3) {
            promises.push(this.redis3.quit())
            this.isConnected.redis3 = false
        }
        
        await Promise.all(promises)
        console.log('[Redis Cluster] All instances disconnected')
    }
}

module.exports = new RedisCluster()
