/**
 * Ephemeral Message Manager
 * Manages ephemeral messages to ensure one message per user
 * Edits existing messages instead of sending new ones
 */

// Store user ephemeral messages: userId -> { message, channelId }
const userEphemeralMessages = new Map();

/**
 * Sends or edits an ephemeral message for a user
 * Ensures only one ephemeral message exists per user
 * @param {Interaction} interaction - The interaction object
 * @param {string|Object} content - Message content (string or embed object)
 * @param {Object} options - Additional options (components, embeds, etc.)
 * @returns {Promise<Message>} - The sent or edited message
 */
async function sendEphemeralMessage(interaction, content, options = {}) {
  const userId = interaction.user.id;
  const stored = userEphemeralMessages.get(userId);
  
  // Prepare message payload
  const payload = typeof content === 'string' 
    ? { content, ...options }
    : { embeds: [content], ...options };
  
  payload.ephemeral = true;
  
  try {
    // Priority 1: Edit existing stored message
    if (stored && stored.message) {
      try {
        await stored.message.edit(payload);
        return stored.message;
      } catch (error) {
        // Message might be deleted, continue to create new one
        console.log('[Ephemeral] Stored message no longer valid, creating new one');
      }
    }
    
    // Priority 2: Edit deferred reply
    if (interaction.deferred) {
      const message = await interaction.editReply(payload);
      userEphemeralMessages.set(userId, { message, channelId: interaction.channelId });
      return message;
    }
    
    // Priority 3: Edit existing reply
    if (interaction.replied) {
      const message = await interaction.editReply(payload);
      userEphemeralMessages.set(userId, { message, channelId: interaction.channelId });
      return message;
    }
    
    // Priority 4: Send new reply
    const message = await interaction.reply({ ...payload, fetchReply: true });
    userEphemeralMessages.set(userId, { message, channelId: interaction.channelId });
    return message;
  } catch (error) {
    console.error('[Ephemeral] Error sending/editing message:', error);
    throw error;
  }
}

/**
 * Clears stored ephemeral message for a user
 * @param {string} userId - The user ID to clear
 */
function clearUserMessage(userId) {
  userEphemeralMessages.delete(userId);
}

/**
 * Clears all stored ephemeral messages
 */
function clearAllMessages() {
  userEphemeralMessages.clear();
}

/**
 * Gets stored ephemeral message for a user
 * @param {string} userId - The user ID
 * @returns {Object|null} - Stored message data or null
 */
function getUserMessage(userId) {
  return userEphemeralMessages.get(userId) || null;
}

module.exports = {
  sendEphemeralMessage,
  clearUserMessage,
  clearAllMessages,
  getUserMessage
};
