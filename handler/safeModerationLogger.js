/**
 * Safe-Moderation Centralized Logger
  * Provides structured, level-gated logging with timing utilities.
 * Singleton — all modules share one instance.
 *
 * Log levels (set via SM_LOG_LEVEL env var):
 *   DEBUG < INFO < WARN < ERROR < NONE
 */

const LOG_LEVELS = Object.freeze({
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
})

class SafeModerationLogger {
    constructor() {
        this.currentLevel = LOG_LEVELS[process.env.SM_LOG_LEVEL] ?? LOG_LEVELS.INFO
    }

    /** @param {string} level - DEBUG | INFO | WARN | ERROR | NONE */
    setLogLevel(level) {
        const resolved = LOG_LEVELS[level]
        if (resolved !== undefined) this.currentLevel = resolved
    }

    // ── core log methods ────────────────────────────────────────────

    debug(component, message, data = null) {
        if (this.currentLevel > LOG_LEVELS.DEBUG) return
        console.log(this._fmt(component, 'DEBUG', message, data))
    }

    info(component, message, data = null) {
        if (this.currentLevel > LOG_LEVELS.INFO) return
        console.log(this._fmt(component, 'INFO', message, data))
    }

    success(component, message, data = null) {
        if (this.currentLevel > LOG_LEVELS.INFO) return
        console.log(this._fmt(component, 'OK', message, data))
    }

    warn(component, message, data = null) {
        if (this.currentLevel > LOG_LEVELS.WARN) return
        console.warn(this._fmt(component, 'WARN', message, data))
    }

    error(component, message, error = null) {
        if (this.currentLevel > LOG_LEVELS.ERROR) return
        console.error(this._fmt(component, 'ERR', message))
        if (error) {
            console.error(`[${component}] Detail: ${error.message ?? error}`)
            if (error.stack && this.currentLevel <= LOG_LEVELS.DEBUG) {
                console.error(`[${component}] Stack: ${error.stack}`)
            }
        }
    }

    // ── timing helpers ──────────────────────────────────────────────

    /** Returns a start timestamp; logs at DEBUG level. */
    startOperation(component, operation, data = null) {
        this.debug(component, `Starting: ${operation}`, data)
        return Date.now()
    }

    /** Logs elapsed ms at INFO level. */
    endOperation(component, operation, startTime, success = true) {
        const ms = Date.now() - startTime
        const tag = success ? 'OK' : 'FAIL'
        this.info(component, `${operation} ${tag} in ${ms}ms`)
    }

    /**
     * Run an async function and log its duration.
     * @returns {Promise<*>} The return value of `fn`.
     */
    async timed(component, label, fn) {
        const t = Date.now()
        try {
            const result = await fn()
            this.info(component, `${label} OK in ${Date.now() - t}ms`)
            return result
        } catch (err) {
            this.error(component, `${label} FAIL in ${Date.now() - t}ms`, err)
            throw err
        }
    }

    // ── domain-specific helpers ─────────────────────────────────────

    roleOperation(component, action, roleName, roleId, target = null) {
        const suffix = target ? ` for ${target}` : ''
        this.debug(component, `Role ${action}: ${roleName} (${roleId})${suffix}`)
    }

    permissionCheck(component, permission, has, context = null) {
        const suffix = context ? ` — ${context}` : ''
        this.debug(component, `Perm ${permission}: ${has ? 'YES' : 'NO'}${suffix}`)
    }

    dbOperation(component, operation, collection = null) {
        const suffix = collection ? ` on ${collection}` : ''
        this.debug(component, `DB ${operation}${suffix}`)
    }

    /**
     * Create a child logger bound to a fixed component name.
     * Every method call on the child automatically uses that component.
     */
    scope(component) {
        const parent = this
        return {
            debug:   (msg, data) => parent.debug(component, msg, data),
            info:    (msg, data) => parent.info(component, msg, data),
            success: (msg, data) => parent.success(component, msg, data),
            warn:    (msg, data) => parent.warn(component, msg, data),
            error:   (msg, err)  => parent.error(component, msg, err),
            startOperation: (op, data) => parent.startOperation(component, op, data),
            endOperation:   (op, t, ok) => parent.endOperation(component, op, t, ok),
            timed:   (label, fn) => parent.timed(component, label, fn)
        }
    }

    // ── internal ────────────────────────────────────────────────────

    /** @private */
    _fmt(component, level, message, data = null) {
        const ts = new Date().toISOString().slice(11, 23) // HH:mm:ss.SSS
        const base = `${ts} [${component}] ${level}: ${message}`
        return data != null ? `${base} ${JSON.stringify(data)}` : base
    }
}

// Export singleton instance
module.exports = new SafeModerationLogger()
