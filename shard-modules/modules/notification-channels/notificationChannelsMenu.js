/**
 * Notification Channels Menu Component
 * 
 * Entry point for all notification channel configurations.
 * Displays the main menu with all notification options and routes button interactions.
 * 
 * @module notification-channels/notificationChannelsMenu
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { LANGUAGE_KEYS, getLocalizedString } = require('./languageKeys');

/**
 * Custom ID constants for buttons and interactions
 */
const CUSTOM_IDS = {
    // Main menu
    NOTIFICATION_MENU: 'notif_menu',
    
    // Notification type selection
    SETUP_LEVEL_UP: 'notif_setup_levelup',
    SETUP_BIRTHDAY: 'notif_setup_birthday',
    SETUP_WELCOME: 'notif_setup_welcome',
    SETUP_GOODBYE: 'notif_setup_goodbye',
    SETUP_DAILY_REWARD: 'notif_setup_daily',
};

/**
 * Display the main notification channels menu
 * 
 * @param {CommandInteraction|ButtonInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
async function displayMenu(interaction) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Create embed
    const embed = new EmbedBuilder()
        .setTitle(getLocalizedString(client, 'NOTIFICATION_CHANNELS_TITLE', { guildId, locale }))
        .setColor(0x5865F2)
        .setDescription('Configure automated notification channels for your server')
        .setTimestamp();
    
    // Create buttons for each notification type
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(CUSTOM_IDS.SETUP_LEVEL_UP)
                .setLabel(getLocalizedString(client, 'SETUP_LEVEL_UP', { guildId, locale }))
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📈'),
            new ButtonBuilder()
                .setCustomId(CUSTOM_IDS.SETUP_BIRTHDAY)
                .setLabel(getLocalizedString(client, 'SETUP_BIRTHDAY', { guildId, locale }))
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎂')
        );
    
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(CUSTOM_IDS.SETUP_WELCOME)
                .setLabel(getLocalizedString(client, 'SETUP_WELCOME', { guildId, locale }))
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👋'),
            new ButtonBuilder()
                .setCustomId(CUSTOM_IDS.SETUP_GOODBYE)
                .setLabel(getLocalizedString(client, 'SETUP_GOODBYE', { guildId, locale }))
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👋')
        );
    
    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(CUSTOM_IDS.SETUP_DAILY_REWARD)
                .setLabel(getLocalizedString(client, 'SETUP_DAILY_REWARD', { guildId, locale }))
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎁')
        );
    
    // Send or update the message
    const messageOptions = {
        embeds: [embed],
        components: [row1, row2, row3],
        ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(messageOptions);
    } else {
        await interaction.reply(messageOptions);
    }
}

/**
 * Handle button selection for notification type
 * Routes to appropriate configuration handler
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type (level_up, birthday, welcome, goodbye, daily_reward)
 * @returns {Promise<void>}
 */
async function handleSelection(interaction, type) {
    // Import handlers dynamically to avoid circular dependencies
    const channelConfigHandler = require('./channelConfigHandler');
    const messageTemplateHandler = require('./messageTemplateHandler');
    const dailyRewardManager = require('./dailyRewardManager');
    
    switch (type) {
        case 'level_up':
        case 'goodbye':
            // Simple channel configuration (enable/disable + channel selection)
            await channelConfigHandler.showEnableDisable(interaction, type);
            break;
            
        case 'birthday':
        case 'welcome':
            // Message template configuration (default/custom message)
            await messageTemplateHandler.showMessageOptions(interaction, type);
            break;
            
        case 'daily_reward':
            // Daily reward channel creation
            await dailyRewardManager.showCreateChannelOption(interaction);
            break;
            
        default:
            await interaction.reply({
                content: 'Invalid notification type',
                ephemeral: true
            });
    }
}

module.exports = {
    CUSTOM_IDS,
    displayMenu,
    handleSelection
};
