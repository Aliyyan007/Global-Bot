/**
 * Audit Log Cache Manager
 * Caches audit log entries to prevent redundant API calls
 * Critical for fast response times against nuke bots
 */

class AuditLogCache {
    constructor(client) {
        this.client = client
        // Cache structure: Map<guildId, Map<eventType, {entries: [], timestamp: number}>>
        this.cache = new Map()
        
        // Cache TTL in milliseconds (2 seconds - short enough to stay fresh)
        this.cacheTTL = 2000
        
        // Cleanup interval - remove stale entries every 10 seconds
        this.cleanupInterval = setInterval(() => this.cleanup(), 10000)
        
        console.log('[AuditLogCache] Initialized with', this.cacheTTL, 'ms TTL')
    }

    /**
     * Get cached audit logs or fetch fresh ones
     * @param {Guild} guild 
     * @param {AuditLogEvent} eventType 
     * @param {number} limit 
     * @returns {Promise<Collection>}
     */
    async getAuditLogs(guild, eventType, limit = 5) {
        const now = Date.now()
        const cacheKey = `${guild.id}-${eventType}`
        
        // Check if we have valid cached data
        if (this.cache.has(guild.id)) {
            const guildCache = this.cache.get(guild.id)
            if (guildCache.has(eventType)) {
                const cached = guildCache.get(eventType)
                const age = now - cached.timestamp
                
                if (age < this.cacheTTL) {
                    console.log(`[AuditLogCache] ⚡ Cache HIT for ${cacheKey} (age: ${age}ms)`)
                    return cached.entries
                }
            }
        }
        
        // Cache miss - fetch fresh data
        console.log(`[AuditLogCache] 🔄 Cache MISS for ${cacheKey}, fetching...`)
        
        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: eventType,
                limit: limit
            })
            
            // Store in cache
            if (!this.cache.has(guild.id)) {
                this.cache.set(guild.id, new Map())
            }
            
            this.cache.get(guild.id).set(eventType, {
                entries: auditLogs.entries,
                timestamp: now
            })
            
            console.log(`[AuditLogCache] ✅ Cached ${auditLogs.entries.size} entries for ${cacheKey}`)
            return auditLogs.entries
            
        } catch (error) {
            console.error(`[AuditLogCache] ❌ Failed to fetch audit logs:`, error.message)
            return null
        }
    }

    /**
     * Find matching audit entry with optimized search
     * @param {Collection} entries 
     * @param {Object} criteria 
     * @returns {AuditLogEntry|null}
     */
    findEntry(entries, criteria = {}) {
        const { targetId, maxAge = 5000, executorId } = criteria
        const now = Date.now()
        
        return entries.find(entry => {
            // Check age first (fastest check)
            if ((now - entry.createdTimestamp) > maxAge) return false
            
            // Check target if specified - FIXED: Use targetId
            const entryTargetId = entry.targetId
            if (targetId && entryTargetId !== targetId) return false
            
            // Check executor if specified
            if (executorId && entry.executor?.id !== executorId) return false
            
            return true
        })
    }

    /**
     * Invalidate cache for a specific guild/event
     * @param {string} guildId 
     * @param {AuditLogEvent} eventType 
     */
    invalidate(guildId, eventType = null) {
        if (!this.cache.has(guildId)) return
        
        if (eventType) {
            this.cache.get(guildId).delete(eventType)
            console.log(`[AuditLogCache] 🗑️ Invalidated cache for ${guildId}-${eventType}`)
        } else {
            this.cache.delete(guildId)
            console.log(`[AuditLogCache] 🗑️ Invalidated all cache for ${guildId}`)
        }
    }

    /**
     * Cleanup stale cache entries
     */
    cleanup() {
        const now = Date.now()
        let cleaned = 0
        
        for (const [guildId, guildCache] of this.cache.entries()) {
            for (const [eventType, cached] of guildCache.entries()) {
                const age = now - cached.timestamp
                if (age > this.cacheTTL * 2) { // Remove entries older than 2x TTL
                    guildCache.delete(eventType)
                    cleaned++
                }
            }
            
            // Remove empty guild caches
            if (guildCache.size === 0) {
                this.cache.delete(guildId)
            }
        }
        
        if (cleaned > 0) {
            console.log(`[AuditLogCache] 🧹 Cleaned ${cleaned} stale entries`)
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        let totalEntries = 0
        for (const guildCache of this.cache.values()) {
            totalEntries += guildCache.size
        }
        
        return {
            guilds: this.cache.size,
            entries: totalEntries,
            ttl: this.cacheTTL
        }
    }

    /**
     * Destroy cache and cleanup
     */
    destroy() {
        clearInterval(this.cleanupInterval)
        this.cache.clear()
        console.log('[AuditLogCache] Destroyed')
    }
}

module.exports = AuditLogCache
