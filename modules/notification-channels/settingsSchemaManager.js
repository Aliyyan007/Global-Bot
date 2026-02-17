/**
 * Settings Schema Manager for Notification Channels
 * 
 * This module provides methods to persist and retrieve notification channel
 * configurations from the MongoDB settings schema.
 * 
 * @module notification-channels/settingsSchemaManager
 */

const Settings = require('../../schemas/settingsSchema');

/**
 * @typedef {import('../../schemas/notificationChannelTypes').NotificationType} NotificationType
 * @typedef {import('../../schemas/notificationChannelTypes').NotificationChannelConfig} NotificationChannelConfig
 * @typedef {import('../../schemas/notificationChannelTypes').DailyRewardChannelConfig} DailyRewardChannelConfig
 */

/**
 * Save notification channel configuration to the database
 * 
 * @param {string} guildId - Discord guild ID
 * @param {NotificationType} type - Type of notification channel
 * @param {NotificationChannelConfig|DailyRewardChannelConfig} config - Configuration to save
 * @returns {Promise<void>}
 * @throws {Error} If database operation fails
 */
async function saveChannelConfig(guildId, type, config) {
    if (!guildId) {
        throw new Error('Guild ID is required');
    }
    
    if (!type) {
        throw new Error('Notification type is required');
    }
    
    if (!config) {
        throw new Error('Configuration is required');
    }
    
    // Map notification type to schema field name
    const fieldMap = {
        'level_up': 'levelUp',
        'birthday': 'birthday',
        'welcome': 'welcome',
        'goodbye': 'goodbye',
        'daily_reward': 'dailyReward'
    };
    
    const fieldName = fieldMap[type];
    if (!fieldName) {
        throw new Error(`Invalid notification type: ${type}`);
    }
    
    try {
        // Use atomic operation to update the specific notification channel config
        const updateField = `notificationChannels.${fieldName}`;
        await Settings.findOneAndUpdate(
            { guildID: guildId },
            { $set: { [updateField]: config } },
            { upsert: true, new: true }
        );
    } catch (error) {
        throw new Error(`Failed to save channel config: ${error.message}`);
    }
}

/**
 * Retrieve notification channel configuration from the database
 * 
 * @param {string} guildId - Discord guild ID
 * @param {NotificationType} type - Type of notification channel
 * @returns {Promise<NotificationChannelConfig|DailyRewardChannelConfig|null>}
 * @throws {Error} If database operation fails
 */
async function getChannelConfig(guildId, type) {
    if (!guildId) {
        throw new Error('Guild ID is required');
    }
    
    if (!type) {
        throw new Error('Notification type is required');
    }
    
    // Map notification type to schema field name
    const fieldMap = {
        'level_up': 'levelUp',
        'birthday': 'birthday',
        'welcome': 'welcome',
        'goodbye': 'goodbye',
        'daily_reward': 'dailyReward'
    };
    
    const fieldName = fieldMap[type];
    if (!fieldName) {
        throw new Error(`Invalid notification type: ${type}`);
    }
    
    try {
        const settings = await Settings.findOne({ guildID: guildId });
        
        if (!settings || !settings.notificationChannels) {
            return null;
        }
        
        return settings.notificationChannels[fieldName] || null;
    } catch (error) {
        throw new Error(`Failed to retrieve channel config: ${error.message}`);
    }
}

/**
 * Remove notification channel configuration from the database
 * 
 * @param {string} guildId - Discord guild ID
 * @param {NotificationType} type - Type of notification channel
 * @returns {Promise<void>}
 * @throws {Error} If database operation fails
 */
async function removeChannelConfig(guildId, type) {
    if (!guildId) {
        throw new Error('Guild ID is required');
    }
    
    if (!type) {
        throw new Error('Notification type is required');
    }
    
    // Map notification type to schema field name
    const fieldMap = {
        'level_up': 'levelUp',
        'birthday': 'birthday',
        'welcome': 'welcome',
        'goodbye': 'goodbye',
        'daily_reward': 'dailyReward'
    };
    
    const fieldName = fieldMap[type];
    if (!fieldName) {
        throw new Error(`Invalid notification type: ${type}`);
    }
    
    try {
        // Use atomic operation to unset the specific notification channel config
        const updateField = `notificationChannels.${fieldName}`;
        await Settings.findOneAndUpdate(
            { guildID: guildId },
            { $unset: { [updateField]: "" } },
            { new: true }
        );
    } catch (error) {
        throw new Error(`Failed to remove channel config: ${error.message}`);
    }
}

/**
 * Check if a notification type is enabled for a guild
 * 
 * @param {string} guildId - Discord guild ID
 * @param {NotificationType} type - Type of notification channel
 * @returns {Promise<boolean>}
 * @throws {Error} If database operation fails
 */
async function isNotificationEnabled(guildId, type) {
    if (!guildId) {
        throw new Error('Guild ID is required');
    }
    
    if (!type) {
        throw new Error('Notification type is required');
    }
    
    try {
        const config = await getChannelConfig(guildId, type);
        return config ? config.enabled === true : false;
    } catch (error) {
        throw new Error(`Failed to check notification status: ${error.message}`);
    }
}

module.exports = {
    saveChannelConfig,
    getChannelConfig,
    removeChannelConfig,
    isNotificationEnabled
};
