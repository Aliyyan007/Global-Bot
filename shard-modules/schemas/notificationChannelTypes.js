/**
 * @file JSDoc type definitions for notification channel configurations
 * @description This file contains type definitions for the unified notification channels feature.
 * These types correspond to the MongoDB schema extensions in settingsSchema.js
 */

/**
 * @typedef {Object} EmbedThumbnail
 * @property {string} url - URL of the thumbnail image
 */

/**
 * @typedef {Object} EmbedImage
 * @property {string} url - URL of the embed image
 */

/**
 * @typedef {Object} EmbedField
 * @property {string} name - Name of the field
 * @property {string} value - Value of the field
 * @property {boolean} [inline] - Whether the field should be displayed inline
 */

/**
 * @typedef {Object} EmbedFooter
 * @property {string} text - Footer text
 * @property {string} [iconURL] - URL of the footer icon
 */

/**
 * @typedef {Object} EmbedData
 * @property {string} [title] - Title of the embed
 * @property {string} [description] - Description of the embed
 * @property {number} [color] - Color of the embed (decimal color code)
 * @property {EmbedThumbnail} [thumbnail] - Thumbnail configuration
 * @property {EmbedImage} [image] - Image configuration
 * @property {EmbedField[]} [fields] - Array of embed fields
 * @property {EmbedFooter} [footer] - Footer configuration
 * @property {string} [timestamp] - ISO timestamp string
 */

/**
 * @typedef {Object} CustomMessageData
 * @property {string} [content] - Text content of the message
 * @property {EmbedData[]} [embeds] - Array of embed objects
 */

/**
 * @typedef {'default'|'custom'} MessageType
 * Type of message template to use
 */

/**
 * @typedef {'static'|'user_specific'} ThumbnailType
 * Type of thumbnail to use in custom messages
 */

/**
 * @typedef {Object} NotificationChannelConfig
 * @property {boolean} enabled - Whether the notification channel is enabled
 * @property {string} [channelId] - Discord channel ID where notifications will be sent
 * @property {MessageType} messageType - Type of message template ('default' or 'custom')
 * @property {CustomMessageData} [customMessage] - Custom message template data
 * @property {ThumbnailType} [thumbnailType] - Type of thumbnail ('static' or 'user_specific')
 */

/**
 * @typedef {Object} DailyRewardChannelConfig
 * @property {boolean} enabled - Whether the daily reward channel is enabled
 * @property {string} [channelId] - Discord channel ID for daily rewards
 * @property {string} [messageId] - Discord message ID of the daily reward message with claim button
 */

/**
 * @typedef {Object} NotificationChannels
 * @property {NotificationChannelConfig} [levelUp] - Level-up notification configuration
 * @property {NotificationChannelConfig} [birthday] - Birthday notification configuration
 * @property {NotificationChannelConfig} [welcome] - Welcome notification configuration
 * @property {NotificationChannelConfig} [goodbye] - Goodbye notification configuration
 * @property {DailyRewardChannelConfig} [dailyReward] - Daily reward channel configuration
 */

/**
 * @typedef {'level_up'|'birthday'|'welcome'|'goodbye'|'daily_reward'} NotificationType
 * Type of notification channel
 */

/**
 * @typedef {Object} MemberData
 * @property {string} username - Discord username
 * @property {string} displayName - Server display name
 * @property {Date} joinDate - Date when member joined the server
 * @property {string} profilePictureUrl - URL of member's profile picture
 * @property {Object} statistics - Profile statistics from /profile command
 * @property {number} rank - Member's rank from /rank command
 * @property {number} level - Member's level from leveling system
 */

module.exports = {};
