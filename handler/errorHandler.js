/**
 * Centralized Error Handler Module
 * Handles error filtering, logging, and webhook notifications
 */
const { EmbedBuilder } = require('discord.js')
const { sendWebhook } = require('./httpClient')

// Errors that should be silently ignored (common Discord API errors)
const IGNORED_ERROR_PATTERNS = [
    'Missing Permissions',
    'Missing Access',
    'Unknown interaction',
    'Regular expression is invalid',
    'Unknown Channel',
    'Unknown Message',
    'Target user is not connected to voice',
    'Unknown Member',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND'
]

/**
 * Check if an error should be ignored based on its stack trace
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error should be ignored
 */
function shouldIgnoreError(error) {
    if (!error?.stack) return false
    return IGNORED_ERROR_PATTERNS.some(pattern => error.stack.includes(pattern))
}

/**
 * Send error notification to Discord webhook
 * @param {Error} error - The error to report
 * @param {string} ownerId - The owner's Discord ID to ping
 * @param {string} [context] - Optional context about where the error occurred
 */
async function sendErrorToWebhook(error, ownerId, context = '') {
    if (!process.env.errorWebhook) return

    const embed = new EmbedBuilder()
        .setColor(3093046)
        .setAuthor({ name: `Error ${error.message?.slice(0, 245) || 'Unknown'}` })
        .setDescription(`\`\`\`ml\n${error.stack?.slice(0, 4000) || 'No stack trace'}\`\`\``)
        .setTimestamp()

    if (context) {
        embed.setFooter({ text: context })
    }

    await sendWebhook(process.env.errorWebhook, {
        content: ownerId ? `<@${ownerId}>` : '',
        embeds: [embed]
    })
}

/**
 * Handle an error - log it and optionally send to webhook
 * @param {Error} error - The error to handle
 * @param {Object} options - Handler options
 * @param {string} [options.ownerId] - Owner ID to ping in webhook
 * @param {string} [options.context] - Context about where error occurred
 * @param {boolean} [options.silent] - If true, don't log to console
 */
function handleError(error, options = {}) {
    const { ownerId, context, silent = false } = options

    // Always log to console unless silent
    if (!silent) {
        console.error(`Error ${new Date()}:`, error)
    }

    // Check if this error should be ignored
    if (shouldIgnoreError(error)) return

    // Send to webhook if configured
    sendErrorToWebhook(error, ownerId, context)
}

/**
 * Setup global error handlers for the process
 * @param {Object} options - Setup options
 * @param {string} options.ownerId - Owner ID to ping in webhook
 * @param {Object} [options.client] - Discord client for Events.Error handler
 */
function setupGlobalHandlers(options = {}) {
    const { ownerId, client } = options

    process.on('unhandledRejection', (error) => {
        handleError(error, { ownerId, context: 'Unhandled Promise Rejection' })
    })

    process.on('uncaughtException', (error) => {
        handleError(error, { ownerId, context: 'Uncaught Exception' })
    })

    if (client) {
        const { Events } = require('discord.js')
        client.on(Events.Error, (error) => {
            handleError(error, { ownerId, context: 'Discord.js Client Error' })
        })
    }
}

module.exports = {
    shouldIgnoreError,
    sendErrorToWebhook,
    handleError,
    setupGlobalHandlers,
    IGNORED_ERROR_PATTERNS
}
