/**
 * HTTP Client Module
 * Modern replacement for the deprecated 'request' package
 * Uses node-fetch for HTTP requests
 */
const fetch = require('node-fetch')

/**
 * Send a POST request with JSON body
 * @param {string} url - The URL to send the request to
 * @param {Object} body - The JSON body to send
 * @param {Object} [headers] - Additional headers
 * @returns {Promise<Object>} - The response
 */
async function postJSON(url, body, headers = {}) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        })
        return {
            ok: response.ok,
            status: response.status,
            data: response.ok ? await response.json().catch(() => null) : null
        }
    } catch (error) {
        console.error('[HTTP] POST request failed:', error.message)
        return { ok: false, error: error.message }
    }
}

/**
 * Send a GET request
 * @param {string} url - The URL to send the request to
 * @param {Object} [headers] - Additional headers
 * @returns {Promise<Object>} - The response
 */
async function get(url, headers = {}) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers
        })
        return {
            ok: response.ok,
            status: response.status,
            data: response.ok ? await response.json().catch(() => null) : null
        }
    } catch (error) {
        console.error('[HTTP] GET request failed:', error.message)
        return { ok: false, error: error.message }
    }
}

/**
 * Send a webhook message (Discord webhook compatible)
 * @param {string} webhookUrl - The webhook URL
 * @param {Object} payload - The webhook payload (content, embeds, etc.)
 * @returns {Promise<boolean>} - True if successful
 */
async function sendWebhook(webhookUrl, payload) {
    if (!webhookUrl) return false
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        return response.ok
    } catch (error) {
        console.error('[HTTP] Webhook request failed:', error.message)
        return false
    }
}

/**
 * Legacy compatibility wrapper for the deprecated 'request' package
 * This allows gradual migration from the old API
 * @param {Object} options - Request options (uri, body, method, headers)
 * @param {Function} [callback] - Optional callback (error, response, body)
 * @returns {Promise<void>}
 */
async function legacyRequest(options, callback) {
    try {
        const response = await fetch(options.uri || options.url, {
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers || {}
        })
        
        const body = await response.text().catch(() => '')
        
        if (callback) {
            callback(null, { statusCode: response.status }, body)
        }
    } catch (error) {
        if (callback) {
            callback(error, null, null)
        }
    }
}

module.exports = {
    postJSON,
    get,
    sendWebhook,
    legacyRequest,
    // Alias for backward compatibility
    request: legacyRequest
}
