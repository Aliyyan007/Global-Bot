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
function sanitizeEmbed(embed) {
    if (!embed || typeof embed !== 'object') return embed
    if (typeof embed.title === 'string' && embed.title.length > 256) embed.title = embed.title.slice(0, 256)
    if (typeof embed.description === 'string' && embed.description.length > 4096) embed.description = embed.description.slice(0, 4096)
    if (typeof embed.author?.name === 'string' && embed.author.name.length > 256) embed.author.name = embed.author.name.slice(0, 256)
    if (typeof embed.footer?.text === 'string' && embed.footer.text.length > 2048) embed.footer.text = embed.footer.text.slice(0, 2048)
    if (Array.isArray(embed.fields)) {
        if (embed.fields.length > 25) embed.fields = embed.fields.slice(0, 25)
        for (const field of embed.fields) {
            if (!field || typeof field !== 'object') continue
            if (typeof field.name === 'string' && field.name.length > 256) field.name = field.name.slice(0, 256)
            if (typeof field.value === 'string' && field.value.length > 1024) field.value = field.value.slice(0, 1024)
            if (!field.value) field.value = '​'
        }
    }
    return embed
}

function sanitizeWebhookPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload
    const out = { ...payload }
    if (typeof out.content === 'string' && out.content.length > 2000) out.content = out.content.slice(0, 2000)
    if (Array.isArray(out.embeds)) {
        out.embeds = out.embeds.slice(0, 10).map(e => sanitizeEmbed(e && typeof e.toJSON === 'function' ? e.toJSON() : e))
    }
    return out
}

async function sendWebhook(webhookUrl, payload) {
    if (!webhookUrl) return false
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(sanitizeWebhookPayload(payload)),
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
