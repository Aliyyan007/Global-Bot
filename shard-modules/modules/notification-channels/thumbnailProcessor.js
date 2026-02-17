/**
 * Thumbnail Processor
 * 
 * Handles thumbnail customization for custom messages
 * 
 * @module notification-channels/thumbnailProcessor
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { LANGUAGE_KEYS, getLocalizedString } = require('./languageKeys');
const { saveChannelConfig } = require('./settingsSchemaManager');

/**
 * Display static vs user-specific thumbnail options
 * 
 * @param {ModalSubmitInteraction} interaction - Discord modal submit interaction
 * @param {string} type - Notification type
 * @param {Object} messageData - Message data from custom message
 * @returns {Promise<void>}
 */
async function showThumbnailOptions(interaction, type, messageData) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Create buttons for thumbnail options
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`notif_thumb_static_${type}`)
                .setLabel(getLocalizedString(client, 'STATIC_THUMBNAIL', { guildId, locale }))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`notif_thumb_user_${type}`)
                .setLabel(getLocalizedString(client, 'USER_SPECIFIC_THUMBNAIL', { guildId, locale }))
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.editReply({
        content: getLocalizedString(client, 'SELECT_THUMBNAIL_TYPE_PROMPT', { guildId, locale }),
        components: [row],
        ephemeral: true
    });
}

/**
 * Process thumbnail choice and proceed to channel selection
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @param {string} choice - Thumbnail choice ('static' or 'user_specific')
 * @returns {Promise<void>}
 */
async function processThumbnailChoice(interaction, type, choice) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Get stored message data
    const tempData = interaction.client.tempMessageData?.[interaction.user.id];
    if (!tempData || tempData.type !== type) {
        await interaction.update({
            content: '❌ Session expired. Please try again.',
            components: [],
            ephemeral: true
        });
        return;
    }
    
    const messageData = tempData.messageData;
    
    // Store thumbnail choice
    interaction.client.tempMessageData[interaction.user.id].thumbnailType = choice;
    
    // Show channel selection
    const row = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`notif_channel_custom_${type}`)
                .setPlaceholder(getLocalizedString(client, 'SELECT_CHANNEL_PROMPT', { guildId, locale }))
                .setChannelTypes(ChannelType.GuildText)
        );
    
    await interaction.update({
        content: getLocalizedString(client, 'SELECT_CHANNEL_PROMPT', { guildId, locale }),
        components: [row],
        ephemeral: true
    });
}

/**
 * Apply user-specific thumbnail to message template
 * 
 * @param {Object} messageData - Message data template
 * @param {User} user - Discord user
 * @returns {Object} Modified message data with user thumbnail
 */
function applyUserThumbnail(messageData, user) {
    const modifiedData = JSON.parse(JSON.stringify(messageData)); // Deep clone
    
    // Apply user's avatar to first embed thumbnail
    if (modifiedData.embeds && modifiedData.embeds.length > 0) {
        if (!modifiedData.embeds[0].thumbnail) {
            modifiedData.embeds[0].thumbnail = {};
        }
        modifiedData.embeds[0].thumbnail.url = user.displayAvatarURL({ dynamic: true, size: 256 });
    }
    
    return modifiedData;
}

/**
 * Process channel selection for custom message
 * 
 * @param {SelectMenuInteraction} interaction - Discord select menu interaction
 * @param {string} type - Notification type
 * @param {string} channelId - Selected channel ID
 * @returns {Promise<void>}
 */
async function processCustomChannelSelection(interaction, type, channelId) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    try {
        // Get stored message data
        const tempData = interaction.client.tempMessageData?.[interaction.user.id];
        if (!tempData || tempData.type !== type) {
            await interaction.update({
                content: '❌ Session expired. Please try again.',
                components: [],
                ephemeral: true
            });
            return;
        }
        
        const { messageData, thumbnailType } = tempData;
        
        // Validate channel
        const channel = await interaction.guild.channels.fetch(channelId);
        
        if (!channel) {
            await interaction.update({
                content: getLocalizedString(client, 'INVALID_CHANNEL', { guildId, locale }),
                components: [],
                ephemeral: true
            });
            return;
        }
        
        // Check bot permissions
        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
            await interaction.update({
                content: getLocalizedString(client, 'INVALID_CHANNEL', { guildId, locale }),
                components: [],
                ephemeral: true
            });
            return;
        }
        
        // Save configuration with custom message
        const config = {
            enabled: true,
            channelId: channelId,
            messageType: 'custom',
            customMessage: messageData,
            thumbnailType: thumbnailType
        };
        
        await saveChannelConfig(guildId, type, config);
        
        // Clean up temp data
        delete interaction.client.tempMessageData[interaction.user.id];
        
        // Show success message
        await interaction.update({
            content: `✅ ${getLocalizedString(client, 'CHANNEL_CONFIGURED', { guildId, locale })} <#${channelId}>`,
            components: [],
            ephemeral: true
        });
        
        // Return to menu after a delay
        setTimeout(async () => {
            const menu = require('./notificationChannelsMenu');
            await menu.displayMenu(interaction);
        }, 2000);
    } catch (error) {
        console.error('Error processing custom channel selection:', error);
        await interaction.update({
            content: getLocalizedString(client, 'INVALID_CHANNEL', { guildId, locale }),
            components: [],
            ephemeral: true
        });
    }
}

module.exports = {
    showThumbnailOptions,
    processThumbnailChoice,
    applyUserThumbnail,
    processCustomChannelSelection
};
