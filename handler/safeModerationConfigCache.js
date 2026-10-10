/**
 * Safe Moderation Config Cache
 * Caches guild configurations to eliminate repeated database queries.
 * Critical for sub-second response times.
 */

const logger = require('./safeModerationLogger')
const log = logger.scope('ConfigCache')

const DEFAULT_TTL = 60_000       // 60 s
const CLEANUP_INTERVAL = 120_000 // 2 min

class SafeModerationConfigCache {
    constructor(client) {
        this.client = client
        this.schema = require('../schemas/safeModerationSchema')

        /** @type {Map<string, {config: Object, ts: number}>} */
        this.cache = new Map()
        this.ttl = DEFAULT_TTL

        this._cleanupTimer = setInterval(() => this._cleanup(), CLEANUP_INTERVAL)
        log.info(`Initialized (TTL ${this.ttl / 1000}s)`)
    }

    // ── reads ───────────────────────────────────────────────────────

    /** Fetch config from cache (or DB on miss). */
    async getConfig(guildId, forceRefresh = false) {
        const now = Date.now()

        if (!forceRefresh) {
            const hit = this.cache.get(guildId)
            if (hit && now - hit.ts < this.ttl) {
                log.debug(`HIT ${guildId} (${now - hit.ts}ms old)`)
                return hit.config
            }
        }

        try {
            const config = await this.schema.findOne({ guildID: guildId })
            this.cache.set(guildId, { config, ts: now })
            return config
        } catch (err) {
            log.error(`DB fetch failed for ${guildId}`, err)
            return null
        }
    }

    /** Quick boolean: is safe-moderation enabled for this guild? */
    async isEnabled(guildId) {
        return (await this.getConfig(guildId))?.enabled === true
    }

    /** Is a specific permission key enabled? */
    async isPermissionEnabled(guildId, permissionKey) {
        const cfg = await this.getConfig(guildId)
        return cfg?.enabled === true && cfg?.permissions?.[permissionKey]?.enabled === true
    }

    /** Return the sub-config for a permission key, or null. */
    async getPermissionConfig(guildId, permissionKey) {
        const cfg = await this.getConfig(guildId)
        if (!cfg?.enabled || !cfg?.permissions?.[permissionKey]?.enabled) return null
        return cfg.permissions[permissionKey]
    }

    // ── writes ──────────────────────────────────────────────────────

    /** Evict a single guild from cache. */
    invalidate(guildId) {
        if (this.cache.delete(guildId)) log.debug(`Invalidated ${guildId}`)
    }

    /** Push an updated config object into cache. */
    updateCache(guildId, config) {
        this.cache.set(guildId, { config, ts: Date.now() })
    }

    // ── bulk ────────────────────────────────────────────────────────

    /** Warm the cache for all enabled guilds. */
    async preload(guilds) {
        log.info(`Preloading for ${guilds.size} guilds…`)
        const ids = guilds.map(g => g.id)
        const configs = await this.schema.find({ guildID: { $in: ids }, enabled: true })

        const now = Date.now()
        for (const cfg of configs) this.cache.set(cfg.guildID, { config: cfg, ts: now })
        log.info(`Preloaded ${configs.length} enabled configs`)
    }

    // ── stats / lifecycle ───────────────────────────────────────────

    getStats() {
        return {
            size: this.cache.size,
            ttl: this.ttl / 1000,
            enabled: [...this.cache.values()].filter(c => c.config?.enabled).length
        }
    }

    destroy() {
        clearInterval(this._cleanupTimer)
        this.cache.clear()
        log.info('Destroyed')
    }

    // ── internal ────────────────────────────────────────────────────

    /** Remove entries older than 2× TTL. */
    _cleanup() {
        const cutoff = Date.now() - this.ttl * 2
        let n = 0
        for (const [id, entry] of this.cache) {
            if (entry.ts < cutoff) { this.cache.delete(id); n++ }
        }
        if (n) log.debug(`Cleaned ${n} stale entries`)
    }
}

module.exports = SafeModerationConfigCache
