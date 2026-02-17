/**
 * Handler for sticky command manager - Add Message flow
 * Handles message link input and validation
 * **Validates: Requirements 3.2, 3.3, 3.4**
 */

const { getSession, updateSession } = require("../handler/stickyManagerSession.js")
const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")

// Discord message link regex pattern
// Format: https://discord.com/channels/{guildId}/{channelId}/{messageId}
// Also supports: https://discordapp.com/channels/{guildId}/{channelId}/{messageId}
// Also supports: https://canary.discord.com/channels/{guildId}/{channelId}/{messageId}
// Also supports: https://ptb.discord.com/channels/{guildId}/{channelId}/{messageId}
const MESSAGE_LINK_REGEX = /https?:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/i

/**
 * Parses a Discord message link and extracts guild, channel, and message IDs
 * @param {string} link - The message link to parse
 * @returns {Object|null} - { guildId, channelId, messageId } or null if invalid
 */
function parseMessageLink(link) {
    if (!link || typeof link !== 'string') {
        return null
    }
    
    const match = link.trim().match(MESSAGE_LINK_REGEX)
    if (!match) {
        return null
    }
    
    return {
        guildId: match[1],
        channelId: match[2],
        messageId: match[3]
    }
}

/**
 * Validates and fetches a message from a link
 * @param {Object} client - Discord client
 * @param {Object} interaction - Discord interaction
 * @param {string} messageLink - The message link to validate
 * @returns {Object} - { success: boolean, message?: Message, error?: string }
 */
async function validateAndFetchMessage(client, interaction, messageLink) {
    // Parse the message link
    const parsed = parseMessageLink(messageLink)
    
    if (!parsed) {
        return {
            success: false,
            error: 'invalid_link'
        }
    }
    
    // Verify the guild ID matches the current guild
    if (parsed.guildId !== interaction.guildId) {
        return {
            success: false,
            error: 'wrong_guild'
        }
    }
    
    // Try to fetch the channel
    let channel
    try {
        channel = await interaction.guild.channels.fetch(parsed.channelId)
    } catch (error) {
        return {
            success: false,
            error: 'channel_not_found'
        }
    }
    
    if (!channel) {
        return {
            success: false,
            error: 'channel_not_found'
        }
    }
    
    // Try to fetch the message
    let message
    try {
        message = await channel.messages.fetch(parsed.messageId)
    } catch (error) {
        return {
            success: false,
            error: 'message_not_found'
        }
    }
    
    if (!message) {
        return {
            success: false,
            error: 'message_not_found'
        }
    }
    
    // Verify the message is from the bot
    if (message.author.id !== client.user.id) {
        return {
            success: false,
            error: 'not_bot_message'
        }
    }
    
    return {
        success: true,
        message: message
    }
}

/**
 * Extracts content and embed from a message
 * @param {Message} message - Discord message
 * @returns {Object} - { content: string|null, embed: Object|null }
 */
function extractMessageData(message) {
    const content = message.content || null
    
    // Get the first embed if present
    let embed = null
    if (message.embeds && message.embeds.length > 0) {
        // Convert embed to plain object for storage
        embed = message.embeds[0].toJSON()
    }
    
    return {
        content,
        embed
    }
}

/**
 * Handles the message link input from the user
 * Called when user sends a message after selecting "Add Message" option
 * @param {Object} client - Discord client
 * @param {Object} message - Discord message from user
 * @param {Object} session - Session state
 * @returns {Object} - { success: boolean, error?: string }
 */
async function handleMessageLinkInput(client, message, session) {
    const messageLink = message.content.trim()
    
    // Create a mock interaction object for validation
    const mockInteraction = {
        guildId: session.guildId,
        guild: message.guild
    }
    
    // Validate and fetch the message
    const result = await validateAndFetchMessage(client, mockInteraction, messageLink)
    
    if (!result.success) {
        return result
    }
    
    // Extract content and embed
    const messageData = extractMessageData(result.message)
    
    // Update session with message data
    updateSession(session.guildId, session.userId, {
        messageContent: messageData.content,
        messageEmbed: messageData.embed
    })
    
    return {
        success: true,
        messageData
    }
}

/**
 * Gets error message for a given error code
 * @param {Object} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} locale - Locale
 * @param {string} errorCode - Error code
 * @returns {string} - Localized error message
 */
function getErrorMessage(client, guildId, locale, errorCode) {
    const errorMessages = {
        'invalid_link': 'Invalid message link. Use format: https://discord.com/channels/guild/channel/message',
        'wrong_guild': 'Message must be from this server.',
        'channel_not_found': 'Channel not found or bot does not have access to it.',
        'message_not_found': 'Message not found.',
        'not_bot_message': 'Message must be from this bot.'
    }
    
    return errorMessages[errorCode] || 'An error occurred while processing the link.'
}

module.exports = {
    name: 'scm-add-message',
    // Export functions for testing and use in other modules
    parseMessageLink,
    validateAndFetchMessage,
    extractMessageData,
    handleMessageLinkInput,
    getErrorMessage,
    MESSAGE_LINK_REGEX
}
