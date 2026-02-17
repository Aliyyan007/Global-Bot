/**
 * Component Utilities Module
 * Safe utilities for handling Discord component operations
 * Replaces dangerous eval() usage for emoji fixing
 */

// Default fallback emoji ID for invalid emojis
const DEFAULT_EMOJI_ID = '957227390759739453'
const UNKNOWN_EMOJI_ID = '1005879832569204908'

/**
 * Safely fix invalid emoji IDs in Discord components
 * This replaces the dangerous eval() pattern used throughout the codebase
 * 
 * @param {Array} components - Array of ActionRow components
 * @param {string} [fallbackEmojiId] - Fallback emoji ID to use (defaults to DEFAULT_EMOJI_ID)
 * @returns {Array} - The modified components array
 */
function fixInvalidEmojis(components, fallbackEmojiId = DEFAULT_EMOJI_ID) {
    if (!Array.isArray(components)) return components

    for (const row of components) {
        if (!row?.components) continue
        
        for (const component of row.components) {
            if (!component?.data) continue
            
            // Fix emoji on the component itself
            if (component.data.emoji?.id) {
                // Validate emoji ID is a valid snowflake
                if (!isValidSnowflake(component.data.emoji.id)) {
                    component.data.emoji.id = fallbackEmojiId
                }
            }

            // Handle select menu options
            if (component.data.options && Array.isArray(component.data.options)) {
                for (const option of component.data.options) {
                    if (option.emoji?.id && !isValidSnowflake(option.emoji.id)) {
                        option.emoji.id = fallbackEmojiId
                    }
                }
            }
        }
    }

    return components
}

/**
 * Handle Discord "Invalid emoji" errors by fixing component emojis
 * 
 * @param {Error} error - The error object
 * @param {Array} components - Array of ActionRow components
 * @param {string} [fallbackEmojiId] - Fallback emoji ID to use
 * @returns {boolean} - True if the error was an emoji error and was handled
 */
function handleEmojiError(error, components, fallbackEmojiId = DEFAULT_EMOJI_ID) {
    if (!error?.message?.includes('Invalid emoji')) return false

    // Parse the error message to find which components have invalid emojis
    const lines = error.message.split('\n')
    
    for (const line of lines.slice(1)) {
        // Error format: "data.components[0].components[0].emoji"
        const match = line.match(/components\[(\d+)\]\.components\[(\d+)\]/)
        if (match) {
            const rowIndex = parseInt(match[1], 10)
            const componentIndex = parseInt(match[2], 10)
            
            if (components[rowIndex]?.components?.[componentIndex]?.data?.emoji) {
                components[rowIndex].components[componentIndex].data.emoji.id = fallbackEmojiId
            }
        }

        // Handle select menu options: "data.components[0].components[0].options[0].emoji"
        const optionMatch = line.match(/components\[(\d+)\]\.components\[(\d+)\]\.options\[(\d+)\]/)
        if (optionMatch) {
            const rowIndex = parseInt(optionMatch[1], 10)
            const componentIndex = parseInt(optionMatch[2], 10)
            const optionIndex = parseInt(optionMatch[3], 10)
            
            const options = components[rowIndex]?.components?.[componentIndex]?.data?.options
            if (options?.[optionIndex]?.emoji) {
                options[optionIndex].emoji.id = fallbackEmojiId
            }
        }
    }

    return true
}

/**
 * Validate if a string is a valid Discord snowflake ID
 * 
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid snowflake
 */
function isValidSnowflake(id) {
    if (!id || typeof id !== 'string') return false
    // Discord snowflakes are 17-19 digit numbers
    return /^\d{17,19}$/.test(id)
}

/**
 * Safely send/update an interaction with emoji error handling
 * 
 * @param {Object} interaction - Discord interaction
 * @param {Object} payload - Message payload (embeds, components, content, etc.)
 * @param {string} method - Method to use ('reply', 'editReply', 'update', 'followUp')
 * @param {Function} errorHandler - Optional error handler for non-emoji errors
 * @returns {Promise} - The interaction response
 */
async function safeInteractionResponse(interaction, payload, method = 'reply', errorHandler = null) {
    try {
        return await interaction[method](payload)
    } catch (error) {
        if (handleEmojiError(error, payload.components)) {
            // Retry with fixed emojis
            try {
                return await interaction[method](payload)
            } catch (retryError) {
                if (errorHandler) errorHandler(retryError)
                throw retryError
            }
        }
        if (errorHandler) errorHandler(error)
        throw error
    }
}

/**
 * Create a safe reply wrapper for interactions
 * 
 * @param {Object} interaction - Discord interaction
 * @param {Function} sendError - Error handler function
 * @returns {Object} - Object with safe reply methods
 */
function createSafeResponder(interaction, sendError) {
    return {
        async reply(payload) {
            return safeInteractionResponse(interaction, payload, 'reply', sendError)
        },
        async editReply(payload) {
            return safeInteractionResponse(interaction, payload, 'editReply', sendError)
        },
        async update(payload) {
            return safeInteractionResponse(interaction, payload, 'update', sendError)
        },
        async followUp(payload) {
            return safeInteractionResponse(interaction, payload, 'followUp', sendError)
        }
    }
}

module.exports = {
    DEFAULT_EMOJI_ID,
    UNKNOWN_EMOJI_ID,
    fixInvalidEmojis,
    handleEmojiError,
    isValidSnowflake,
    safeInteractionResponse,
    createSafeResponder
}
