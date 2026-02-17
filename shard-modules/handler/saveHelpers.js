/**
 * Safe Save Helpers
 * Provides utility functions for safely saving database documents with error handling
 */

const { handleError } = require('./errorHandler')

/**
 * Safely save a single document with error handling
 * @param {Object} document - Mongoose document to save
 * @param {string} context - Context description for logging
 * @param {string} ownerId - Owner ID for error notifications
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
async function safeSave(document, context = '', ownerId = null) {
    try {
        await document.save()
        return { success: true }
    } catch (err) {
        console.error(`Failed to save ${context}:`, err)
        if (ownerId) {
            handleError(err, { ownerId, context: `Database Save: ${context}` })
        }
        return { success: false, error: err }
    }
}

/**
 * Safely save multiple documents with individual error handling
 * @param {Array} documents - Array of {document, context} objects
 * @param {string} ownerId - Owner ID for error notifications
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function safeSaveMultiple(documents, ownerId = null) {
    const errors = []
    let successCount = 0
    
    await Promise.all(documents.map(async ({ document, context }, index) => {
        try {
            await document.save()
            successCount++
        } catch (err) {
            console.error(`Failed to save ${context || `document ${index}`}:`, err)
            errors.push({ index, context, error: err })
            if (ownerId) {
                handleError(err, { ownerId, context: `Batch Save: ${context}` })
            }
        }
    }))
    
    return {
        success: successCount,
        failed: errors.length,
        errors
    }
}

/**
 * Add .catch() handler to a save promise
 * @param {Promise} savePromise - The save() promise
 * @param {string} context - Context for error logging
 * @returns {Promise}
 */
function withErrorHandler(savePromise, context = '') {
    return savePromise.catch(err => {
        console.error(`Failed to save ${context}:`, err)
    })
}

module.exports = {
    safeSave,
    safeSaveMultiple,
    withErrorHandler
}
