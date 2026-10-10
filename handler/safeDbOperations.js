/**
 * Safe Database Operations Helper
 * Wrappers for Mongoose operations with error handling and retry logic.
 */

const { handleError } = require('./errorHandler')
const logger = require('./safeModerationLogger')
const log = logger.scope('DbOps')

/** @private Report an error through the shared handler. */
function _report(err, context, ownerId) {
    handleError(err, { ownerId, context, silent: false })
}

/** @private Resolve model name from a Mongoose document. */
function _model(doc) {
    return doc?.constructor?.modelName ?? 'Unknown'
}

// ── core operations ─────────────────────────────────────────────────

/** Save a single document. Returns `true` on success. */
async function safeSave(document, options = {}) {
    const { context = 'Database Save', ownerId, throwOnError = false } = options
    try {
        await document.save()
        return true
    } catch (err) {
        _report(err, `${context} - ${_model(document)}`, ownerId)
        if (throwOnError) throw err
        return false
    }
}

/** Delete a single document (supports deleteOne/delete/remove). */
async function safeDelete(document, options = {}) {
    const { context = 'Database Delete', ownerId } = options
    try {
        const fn = document.deleteOne ?? document.delete ?? document.remove
        if (!fn) throw new Error('Document does not have a delete method')
        await fn.call(document)
        return true
    } catch (err) {
        _report(err, `${context} - ${_model(document)}`, ownerId)
        return false
    }
}

/** Run an arbitrary async query; returns `defaultValue` on error. */
async function safeQuery(queryFn, options = {}) {
    const { context = 'Database Query', ownerId, defaultValue = null } = options
    try {
        return await queryFn()
    } catch (err) {
        _report(err, context, ownerId)
        return defaultValue
    }
}

// ── batch operations ────────────────────────────────────────────────

/**
 * Run promises in parallel. When `stopOnError` is false each rejection
 * is logged individually and its slot returns `null`.
 */
async function safePromiseAll(promises, options = {}) {
    const { context = 'Batch Operation', ownerId, stopOnError = false } = options

    if (stopOnError) {
        try { return await Promise.all(promises) }
        catch (err) { _report(err, context, ownerId); throw err }
    }

    return Promise.all(
        promises.map(p => p.catch(err => { _report(err, context, ownerId); return null }))
    )
}

/** Save many documents; returns `{ succeeded, failed, results }`. */
async function batchSave(documents, options = {}) {
    const { context = 'Batch Save', ownerId } = options
    let succeeded = 0, failed = 0

    const results = await Promise.all(
        documents.map(async (doc, i) => {
            try {
                await doc.save()
                succeeded++
                return { success: true, index: i, document: doc }
            } catch (err) {
                failed++
                _report(err, `${context} - Document ${i}`, ownerId)
                return { success: false, index: i, document: doc, error: err }
            }
        })
    )

    return { succeeded, failed, results }
}

// ── retry ───────────────────────────────────────────────────────────

/** Retry an async `operation` with exponential back-off. */
async function retryOperation(operation, options = {}) {
    const {
        maxRetries = 3, initialDelay = 100, maxDelay = 5000,
        context = 'Retry Operation', ownerId
    } = options

    let delay = initialDelay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (err) {
            if (attempt === maxRetries) {
                _report(err, `${context} - Failed after ${maxRetries + 1} attempts`, ownerId)
                throw err
            }
            log.debug(`Retry ${attempt + 1}/${maxRetries} for ${context} in ${delay}ms`)
            await new Promise(r => setTimeout(r, delay))
            delay = Math.min(delay * 2, maxDelay)
        }
    }
}

// ── exports ─────────────────────────────────────────────────────────

module.exports = {
    safeSave,
    safePromiseAll,
    safeQuery,
    safeDelete,
    batchSave,
    retryOperation
}
