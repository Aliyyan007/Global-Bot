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
    
    // Store message data temporarily with timestamp for cleanup
    interaction.client.tempMessageData = interaction.client.tempMessageData || {};
    const sessionId = `${interaction.user.id}_${Date.now()}`;
    interaction.client.tempMessageData[sessionId] = {
        type,
        messageData,
        userId: interaction.user.id,
        timestamp: Date.now()
    };
    
    // Clean up old sessions (older than 15 minutes)
    const fifteenMinutes = 15 * 60 * 1000;
    Object.keys(interaction.client.tempMessageData).forEach(key => {
        const session = interaction.client.tempMessageData[key];
        if (session.timestamp && Date.now() - session.timestamp > fifteenMinutes) {
            delete interaction.client.tempMessageData[key];
        }
    });
    
    // Create buttons for thumbnail options with session ID embedded
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`notif_thumb_static_${type}_${sessionId}`)
                .setLabel(getLocalizedString(client, 'STATIC_THUMBNAIL', { guildId, locale }))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`notif_thumb_user_${type}_${sessionId}`)
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
 * @param {string} sessionId - Session identifier from button customId
 * @returns {Promise<void>}
 */
async function processThumbnailChoice(interaction, type, choice, sessionId) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // CRITICAL: Acknowledge the interaction immediately (within 3 seconds)
    await interaction.deferUpdate();
    
    // Get stored message data using session ID
    const tempData = sessionId ? 
        interaction.client.tempMessageData?.[sessionId] : 
        interaction.client.tempMessageData?.[interaction.user.id]; // Fallback for old format
    
    if (!tempData || tempData.type !== type) {
        await interaction.editReply({
            content: '❌ Session expired. Please start over by clicking the notification type again.',
            components: [],
            ephemeral: true
        });
        return;
    }
    
    // Verify user owns this session
    if (tempData.userId && tempData.userId !== interaction.user.id) {
        await interaction.editReply({
            content: '❌ This session belongs to another user. Please start your own configuration.',
            components: [],
            ephemeral: true
        });
        return;
    }
    
    const messageData = tempData.messageData;
    
    // Store thumbnail choice in the session
    if (sessionId) {
        interaction.client.tempMessageData[sessionId].thumbnailType = choice;
    } else {
        interaction.client.tempMessageData[interaction.user.id].thumbnailType = choice;
    }
    
    // Show channel selection with session ID embedded
    const channelCustomId = sessionId ? 
        `notif_channel_custom_${type}_${sessionId}` : 
        `notif_channel_custom_${type}`;
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(channelCustomId)
                .setPlaceholder(getLocalizedString(client, 'SELECT_CHANNEL_PROMPT', { guildId, locale }))
                .setChannelTypes(ChannelType.GuildText)
        );
    
    await interaction.editReply({
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
 * @param {string} sessionId - Session identifier from select menu customId
 * @returns {Promise<void>}
 */
async function processCustomChannelSelection(interaction, type, channelId, sessionId) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    try {
        // Get stored message data using session ID
        const tempData = sessionId ? 
            interaction.client.tempMessageData?.[sessionId] : 
            interaction.client.tempMessageData?.[interaction.user.id]; // Fallback for old format
        
        if (!tempData || tempData.type !== type) {
            await interaction.update({
                content: '❌ Session expired. Please start over by clicking the notification type again.',
                components: [],
                ephemeral: true
            });
            return;
        }
        
        // Verify user owns this session
        if (tempData.userId && tempData.userId !== interaction.user.id) {
            await interaction.update({
                content: '❌ This session belongs to another user. Please start your own configuration.',
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
        if (!permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
            await interaction.update({
                content: getLocalizedString(client, 'INVALID_CHANNEL', { guildId, locale }),
                components: [],
                ephemeral: true
            });
            return;
        }
        
        // Save configuration with custom message — merge over the existing
        // config so other options (mentions, member count) survive
        const { getChannelConfig } = require('./settingsSchemaManager');
        const existing = await getChannelConfig(guildId, type).catch(() => null);
        const config = {
            ...(existing?.toObject ? existing.toObject() : existing || {}),
            enabled: true,
            channelId: channelId,
            messageType: 'custom',
            customMessage: messageData,
            thumbnailType: thumbnailType
        };

        await saveChannelConfig(guildId, type, config);
        
        // Clean up temp data
        if (sessionId) {
            delete interaction.client.tempMessageData[sessionId];
        } else {
            delete interaction.client.tempMessageData[interaction.user.id];
        }
        
        // Show success message
        await interaction.update({
            content: `✅ ${getLocalizedString(client, 'CHANNEL_CONFIGURED', { guildId, locale })} <#${channelId}>`,
            components: [],
            ephemeral: true
        });
        
        // Note: User can return to manager-settings menu manually
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
