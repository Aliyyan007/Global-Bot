/**
 * Safe Moderation Action Tracker
 * In-memory sliding-window rate limiter with optional Redis persistence.
 * Structure: Map<guildId, Map<userId, Map<actionType, timestamp[]>>>
 */

const logger = require('./safeModerationLogger')
const log = logger.scope('Tracker')

const MAX_AGE = 2 * 60 * 60 * 1000  // 2 h
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 min
const REDIS_TTL = 7200               // 2 h (seconds)

class SafeModerationTracker {
    constructor(client) {
        this.client = client
        this.actionLog = new Map()
        this._cleanupTimer = setInterval(() => this._cleanup(), CLEANUP_INTERVAL)
    }

    // ── record / query ──────────────────────────────────────────────

    /** Append a timestamp for the given action. */
    async recordAction(guildId, userId, actionType) {
        const ts = Date.now()
        const arr = this._ensure(guildId, userId, actionType)
        arr.push(ts)
        log.debug(`Recorded ${actionType} for ${userId} (count: ${arr.length})`)

        await this._redisPush(guildId, userId, actionType, ts)
    }

    /** Count actions within a sliding window (seconds). Prunes old entries. */
    async getActionCount(guildId, userId, actionType, durationSeconds) {
        const cutoff = Date.now() - durationSeconds * 1000
        const all = this._getTimestamps(guildId, userId, actionType)
        const recent = all.filter(t => t > cutoff)

        // Prune in-place
        const userLog = this.actionLog.get(guildId)?.get(userId)
        if (userLog?.has(actionType)) userLog.set(actionType, recent)

        return recent.length
    }

    // ── whitelist ───────────────────────────────────────────────────

    /** Check whether any of the user's roles appear in the whitelist. */
    isWhitelisted(guildId, userId, userRoles, config) {
        if (!Array.isArray(config?.whitelistRoles) || !Array.isArray(userRoles)) return false

        const wl = config.whitelistRoles
        for (const roleId of userRoles) {
            if (wl.includes(roleId)) {
                log.debug(`User ${userId} whitelisted via role ${roleId}`)
                return true
            }
        }
        return false
    }

    // ── limit check ─────────────────────────────────────────────────

    /**
     * Returns { exceeded, count, limit, duration, enabled, error? }.
     * Validates config before querying.
     */
    async checkLimit(guildId, userId, actionType, config) {
        const fail = (error) => ({ exceeded: false, count: 0, limit: 0, enabled: false, error })

        if (!config?.permissions?.[actionType]) return fail('no_action_config')

        const pc = config.permissions[actionType]
        if (typeof pc.enabled !== 'boolean')                              return fail('invalid_enabled')
        if (typeof pc.actionCount !== 'number' || pc.actionCount < 1)     return fail('invalid_action_count')
        if (typeof pc.timeBetweenActions !== 'number' || pc.timeBetweenActions < 0)
            return fail('invalid_time_between_actions')

        if (!pc.enabled) return { exceeded: false, count: 0, limit: pc.actionCount, enabled: false }

        const count = await this.getActionCount(guildId, userId, actionType, pc.timeBetweenActions)
        const exceeded = count >= pc.actionCount

        log.debug(`Limit ${actionType}: ${count}/${pc.actionCount} in ${pc.timeBetweenActions}s → ${exceeded ? 'EXCEEDED' : 'ok'}`)

        return { exceeded, count, limit: pc.actionCount, duration: pc.timeBetweenActions, enabled: true }
    }

    // ── clear ───────────────────────────────────────────────────────

    /** Clear in-memory (and Redis) entries for a user, optionally scoped to one action. */
    async clearActions(guildId, userId, actionType = null) {
        const guildLog = this.actionLog.get(guildId)
        if (guildLog) {
            if (actionType) {
                guildLog.get(userId)?.delete(actionType)
            } else {
                guildLog.delete(userId)
            }
        }

        await this._redisClear(guildId, userId, actionType)
    }

    // ── lifecycle ───────────────────────────────────────────────────

    shutdown() {
        clearInterval(this._cleanupTimer)
    }

    // ── internal helpers ────────────────────────────────────────────

    /** Ensure the nested Map path exists and return the timestamp array. */
    _ensure(guildId, userId, actionType) {
        if (!this.actionLog.has(guildId)) this.actionLog.set(guildId, new Map())
        const guildLog = this.actionLog.get(guildId)
        if (!guildLog.has(userId)) guildLog.set(userId, new Map())
        const userLog = guildLog.get(userId)
        if (!userLog.has(actionType)) userLog.set(actionType, [])
        return userLog.get(actionType)
    }

    _getTimestamps(guildId, userId, actionType) {
        return this.actionLog.get(guildId)?.get(userId)?.get(actionType) ?? []
    }

    /** Resolve the active Redis client (cluster or standalone). */
    _redis() {
        const rc = this.client.redisCache
        return rc?.redis3 ?? rc?.client ?? null
    }

    async _redisPush(guildId, userId, actionType, ts) {
        const r = this._redis()
        if (!r) return
        const key = `safeModeration:${guildId}:${userId}:${actionType}`
        try {
            await r.lpush(key, ts)
            await r.expire(key, REDIS_TTL)
        } catch (err) {
            log.error('Redis push failed', err)
        }
    }

    async _redisClear(guildId, userId, actionType) {
        const r = this._redis()
        if (!r) return
        try {
            if (actionType) {
                await r.del(`safeModeration:${guildId}:${userId}:${actionType}`)
            } else {
                const keys = await r.keys(`safeModeration:${guildId}:${userId}:*`)
                if (keys.length) await r.del(...keys)
            }
        } catch (err) {
            log.error('Redis clear failed', err)
        }
    }

    /** Prune timestamps older than MAX_AGE; delete empty branches. */
    _cleanup() {
        const cutoff = Date.now() - MAX_AGE
        for (const [gid, guildLog] of this.actionLog) {
            for (const [uid, userLog] of guildLog) {
                for (const [act, stamps] of userLog) {
                    const kept = stamps.filter(t => t > cutoff)
                    kept.length ? userLog.set(act, kept) : userLog.delete(act)
                }
                if (!userLog.size) guildLog.delete(uid)
            }
            if (!guildLog.size) this.actionLog.delete(gid)
        }
    }
}

module.exports = SafeModerationTracker
