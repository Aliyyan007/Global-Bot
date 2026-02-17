/**
 * Language Keys for Unified Notification Channels
 * 
 * This module defines all language key constants used in the notification channels feature.
 * These keys are used with client.language() to retrieve localized strings.
 * 
 * @module notification-channels/languageKeys
 */

/**
 * Language keys for notification channel UI text
 * @constant {Object}
 */
const LANGUAGE_KEYS = {
  // Main menu
  NOTIFICATION_CHANNELS_TITLE: 'Level Up, Greet, Birthday, Daily Reward… Channel',
  
  // Setup actions
  SETUP_LEVEL_UP: 'Setup Level Up Channel',
  SETUP_BIRTHDAY: 'Setup Birthday Channel',
  SETUP_WELCOME: 'Setup Welcome Channel',
  SETUP_GOODBYE: 'Setup Goodbye Channel',
  SETUP_DAILY_REWARD: 'Setup Daily Reward Channel',
  
  // Common buttons
  ENABLE: 'Enable',
  DISABLE: 'Disable',
  
  // Message template options
  DEFAULT_MESSAGE: 'Default Message',
  CUSTOM_MESSAGE: 'Custom Message',
  
  // Thumbnail options
  STATIC_THUMBNAIL: 'Static Thumbnail',
  USER_SPECIFIC_THUMBNAIL: 'User-Specific Thumbnail',
  
  // Daily reward specific
  CREATE_DAILY_CHANNEL: 'Create Daily Reward Channel',
  CLAIM_REWARD: 'Claim Reward',
  CLAIMED_ON: 'Claimed on',
  
  // Prompts
  SELECT_CHANNEL_PROMPT: 'Please select a channel for notifications',
  PROVIDE_MESSAGE_LINK_PROMPT: 'Please provide a Discord message link',
  SELECT_THUMBNAIL_TYPE_PROMPT: 'Choose thumbnail type for custom message',
  
  // Confirmation messages
  CHANNEL_CONFIGURED: 'Channel configured successfully',
  CHANNEL_DISABLED: 'Channel disabled successfully',
  DAILY_CHANNEL_CREATED: 'Daily reward channel created successfully',
  
  // Error messages
  INVALID_CHANNEL: 'Cannot access this channel. Please ensure the bot has permission to send messages.',
  INVALID_MESSAGE_LINK: 'Invalid message link format. Please provide a valid Discord message URL.',
  MESSAGE_NOT_ACCESSIBLE: 'Cannot access this message. Please ensure the message exists and the bot has permission to view it.',
  
  // Modal titles and labels
  CUSTOM_MESSAGE_MODAL_TITLE: 'Custom Message Configuration',
  MESSAGE_LINK_LABEL: 'Discord Message Link',
};

/**
 * Helper function to get localized string using client.language
 * 
 * @param {Object} client - Discord client instance
 * @param {string} key - Language key from LANGUAGE_KEYS
 * @param {Object} options - Options for localization
 * @param {string} [options.guildId] - Guild ID for server-level language
 * @param {string} [options.locale] - User's Discord locale
 * @returns {string} Localized string
 */
function getLocalizedString(client, key, options = {}) {
  const { guildId, locale } = options;
  
  // Get the English text for the key (used as textId)
  const textId = LANGUAGE_KEYS[key];
  
  if (!textId) {
    console.warn(`Language key not found: ${key}`);
    return key;
  }
  
  // Use client.language to get the localized string
  return client.language({
    textId,
    guildId,
    locale
  });
}

module.exports = {
  LANGUAGE_KEYS,
  getLocalizedString
};
