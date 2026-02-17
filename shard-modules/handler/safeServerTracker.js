/**
 * Safe-Server Action Tracker
 * Tracks moderator actions in-memory with Redis persistence fallback
 * Implements sliding window rate limiting
 */

class SafeServerTracker {
    constructor(client) {
        this.client = client
        // In-memory storage: Map<guildId, Map<userId, Map<actionType, timestamp[]>>>
        this.actionLog = new Map()
        
        // Cleanup interval - remove expired timestamps every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }

    /**
     * Record an action performed by a moderator
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} actionType 
     * @returns {Promise<void>}
     */
    async recordAction(guildId, userId, actionType) {
        const timestamp = Date.now()
        console.log(`[SafeServerTracker] 📝 Recording action: guild=${guildId}, user=${userId}, type=${actionType}, timestamp=${timestamp}`)
        
        if (!this.actionLog.has(guildId)) {
            this.actionLog.set(guildId, new Map())
            console.log(`[SafeServerTracker] Created new guild log for ${guildId}`)
        }
        
        const guildLog = this.actionLog.get(guildId)
        if (!guildLog.has(userId)) {
            guildLog.set(userId, new Map())
            console.log(`[SafeServerTracker] Created new user log for ${userId}`)
        }
        
        const userLog = guildLog.get(userId)
        if (!userLog.has(actionType)) {
            userLog.set(actionType, [])
            console.log(`[SafeServerTracker] Created new action type log for ${actionType}`)
        }
        
        userLog.get(actionType).push(timestamp)
        const currentCount = userLog.get(actionType).length
        console.log(`[SafeServerTracker] ✅ Action recorded. Current count for ${actionType}: ${currentCount}`)
        console.log(`[SafeServerTracker] All timestamps for this action:`, userLog.get(actionType))
        
        // Persist to Redis if available
        if (this.client.redisCache) {
            const key = `safeserver:${guildId}:${userId}:${actionType}`
            try {
                await this.client.redisCache.client.lpush(key, timestamp)
                await this.client.redisCache.client.expire(key, 7200) // 2 hours TTL
                console.log(`[SafeServerTracker] ✅ Persisted to Redis: ${key}`)
            } catch (error) {
                console.error('[SafeServerTracker] ❌ Redis persistence error:', error.message)
            }
        }
    }

    /**
     * Get action count within the specified duration
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} actionType 
     * @param {number} durationSeconds 
     * @returns {Promise<number>}
     */
    async getActionCount(guildId, userId, actionType, durationSeconds) {
        const now = Date.now()
        const cutoff = now - (durationSeconds * 1000)
        console.log(`[SafeServerTracker] 🔍 Getting action count: guild=${guildId}, user=${userId}, type=${actionType}, duration=${durationSeconds}s`)
        console.log(`[SafeServerTracker] Now: ${now}, Cutoff: ${cutoff}`)
        
        // Try in-memory first
        const timestamps = this._getTimestamps(guildId, userId, actionType)
        console.log(`[SafeServerTracker] Found ${timestamps.length} total timestamps:`, timestamps)
        
        // Filter to only recent actions
        const recentTimestamps = timestamps.filter(ts => ts > cutoff)
        console.log(`[SafeServerTracker] Found ${recentTimestamps.length} recent timestamps (within ${durationSeconds}s):`, recentTimestamps)
        
        // Update in-memory to remove old timestamps
        if (this.actionLog.has(guildId)) {
            const guildLog = this.actionLog.get(guildId)
            if (guildLog.has(userId)) {
                const userLog = guildLog.get(userId)
                if (userLog.has(actionType)) {
                    userLog.set(actionType, recentTimestamps)
                    console.log(`[SafeServerTracker] ✅ Updated in-memory log with recent timestamps only`)
                }
            }
        }
        
        return recentTimestamps.length
    }

    /**
     * Get timestamps for a specific action
     * @private
     */
    _getTimestamps(guildId, userId, actionType) {
        if (!this.actionLog.has(guildId)) return []
        const guildLog = this.actionLog.get(guildId)
        if (!guildLog.has(userId)) return []
        const userLog = guildLog.get(userId)
        if (!userLog.has(actionType)) return []
        return userLog.get(actionType)
    }

    /**
     * Check if user is whitelisted
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string[]} userRoles 
     * @param {Object} config 
     * @returns {boolean}
     */
    isWhitelisted(guildId, userId, userRoles, config) {
        if (!config || !config.whitelist) return false
        
        // Check user whitelist
        if (config.whitelist.users && config.whitelist.users.includes(userId)) {
            return true
        }
        
        // Check role whitelist
        if (config.whitelist.roles && userRoles) {
            for (const roleId of userRoles) {
                if (config.whitelist.roles.includes(roleId)) {
                    return true
                }
            }
        }
        
        return false
    }

    /**
     * Check if action limit is exceeded
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} actionType 
     * @param {Object} config 
     * @returns {Promise<{exceeded: boolean, count: number, limit: number}>}
     */
    async checkLimit(guildId, userId, actionType, config) {
        console.log(`[SafeServerTracker] 🔍 Checking limit: guild=${guildId}, user=${userId}, type=${actionType}`)
        
        if (!config || !config.limits || !config.limits[actionType]) {
            console.log(`[SafeServerTracker] ⚠️ No limit configured for ${actionType}`)
            return { exceeded: false, count: 0, limit: 0, enabled: false }
        }
        
        const limit = config.limits[actionType]
        console.log(`[SafeServerTracker] Limit config:`, limit)
        
        // Check if this limit is enabled
        if (limit.enabled === false) {
            console.log(`[SafeServerTracker] ⚠️ Limit disabled for ${actionType}`)
            return { exceeded: false, count: 0, limit: limit.count, enabled: false }
        }
        
        const count = await this.getActionCount(guildId, userId, actionType, limit.duration)
        
        const result = {
            exceeded: count >= limit.count,
            count: count,
            limit: limit.count,
            duration: limit.duration,
            enabled: true
        }
        
        console.log(`[SafeServerTracker] 📊 Limit check result: ${count}/${limit.count} in ${limit.duration}s - Exceeded: ${result.exceeded}`)
        
        return result
    }

    /**
     * Clear actions for a user (used when restriction expires)
     * @param {string} guildId 
     * @param {string} userId 
     */
    async clearActions(guildId, userId) {
        if (this.actionLog.has(guildId)) {
            const guildLog = this.actionLog.get(guildId)
            guildLog.delete(userId)
        }
        
        // Clear from Redis if available
        if (this.client.redisCache) {
            try {
                const pattern = `safeserver:${guildId}:${userId}:*`
                const keys = await this.client.redisCache.client.keys(pattern)
                if (keys.length > 0) {
                    await this.client.redisCache.client.del(...keys)
                }
            } catch (error) {
                console.error('[SafeServer] Redis clear error:', error.message)
            }
        }
    }

    /**
     * Cleanup expired timestamps
     * @private
     */
    cleanup() {
        const now = Date.now()
        const maxAge = 2 * 60 * 60 * 1000 // 2 hours
        
        for (const [guildId, guildLog] of this.actionLog.entries()) {
            for (const [userId, userLog] of guildLog.entries()) {
                for (const [actionType, timestamps] of userLog.entries()) {
                    const filtered = timestamps.filter(ts => now - ts < maxAge)
                    if (filtered.length === 0) {
                        userLog.delete(actionType)
                    } else {
                        userLog.set(actionType, filtered)
                    }
                }
                if (userLog.size === 0) {
                    guildLog.delete(userId)
                }
            }
            if (guildLog.size === 0) {
                this.actionLog.delete(guildId)
            }
        }
    }

    /**
     * Shutdown cleanup
     */
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
        }
    }
}

module.exports = SafeServerTracker
