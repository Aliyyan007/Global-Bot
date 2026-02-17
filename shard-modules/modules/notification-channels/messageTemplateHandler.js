/**
 * Message Template Handler
 * 
 * Manages custom message configuration with default/custom options
 * (Birthday, Welcome)
 * 
 * @module notification-channels/messageTemplateHandler
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { LANGUAGE_KEYS, getLocalizedString } = require('./languageKeys');
const { saveChannelConfig, getChannelConfig } = require('./settingsSchemaManager');

/**
 * Display default vs custom message options
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type (birthday, welcome)
 * @returns {Promise<void>}
 */
async function showMessageOptions(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Get current configuration
    const config = await getChannelConfig(guildId, type);
    const isEnabled = config && config.enabled;
    
    // Create embed
    const typeLabel = type === 'birthday' ? 'SETUP_BIRTHDAY' : 'SETUP_WELCOME';
    const embed = new EmbedBuilder()
        .setTitle(getLocalizedString(client, typeLabel, { guildId, locale }))
        .setColor(isEnabled ? 0x57F287 : 0x5865F2)
        .setDescription(isEnabled ? 
            `✅ Currently enabled in <#${config.channelId}>` : 
            'Choose message type')
        .setTimestamp();
    
    // Create buttons for default/custom message
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`notif_default_${type}`)
                .setLabel(getLocalizedString(client, 'DEFAULT_MESSAGE', { guildId, locale }))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`notif_custom_${type}`)
                .setLabel(getLocalizedString(client, 'CUSTOM_MESSAGE', { guildId, locale }))
                .setStyle(ButtonStyle.Secondary)
        );
    
    // Add disable button if enabled
    if (isEnabled) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`notif_disable_${type}`)
                .setLabel(getLocalizedString(client, 'DISABLE', { guildId, locale }))
                .setStyle(ButtonStyle.Danger)
        );
    }
    
    await interaction.update({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

/**
 * Handle default message selection - proceed to channel selection
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function handleDefaultMessage(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Create channel select menu
    const row = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`notif_channel_default_${type}`)
                .setPlaceholder(getLocalizedString(client, 'SELECT_CHANNEL_PROMPT', { guildId, locale }))
                .setChannelTypes(ChannelType.GuildText)
        );
    
    await interaction.update({
        content: getLocalizedString(client, 'SELECT_CHANNEL_PROMPT', { guildId, locale }),
        components: [row],
        embeds: [],
        ephemeral: true
    });
}

/**
 * Handle custom message selection - show modal for message link
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function handleCustomMessage(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Create modal for message link input
    const modal = new ModalBuilder()
        .setCustomId(`notif_modal_${type}`)
        .setTitle(getLocalizedString(client, 'CUSTOM_MESSAGE_MODAL_TITLE', { guildId, locale }));
    
    const messageLinkInput = new TextInputBuilder()
        .setCustomId('message_link')
        .setLabel(getLocalizedString(client, 'MESSAGE_LINK_LABEL', { guildId, locale }))
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://discord.com/channels/...')
        .setRequired(true);
    
    const row = new ActionRowBuilder().addComponents(messageLinkInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
}

/**
 * Process modal submission with message link
 * 
 * @param {ModalSubmitInteraction} interaction - Discord modal submit interaction
 * @param {string} type - Notification type
 * @param {string} messageLink - Discord message link
 * @returns {Promise<void>}
 */
async function processMessageLink(interaction, type, messageLink) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Validate and fetch message
        const message = await validateMessageLink(messageLink, interaction.guild);
        
        if (!message) {
            await interaction.editReply({
                content: getLocalizedString(client, 'INVALID_MESSAGE_LINK', { guildId, locale }),
                ephemeral: true
            });
            return;
        }
        
        // Extract message data
        const messageData = {
            content: message.content || undefined,
            embeds: message.embeds.map(embed => embed.toJSON()),
        };
        
        // Store message data temporarily and show thumbnail options
        interaction.client.tempMessageData = interaction.client.tempMessageData || {};
        interaction.client.tempMessageData[interaction.user.id] = {
            type,
            messageData
        };
        
        // Show thumbnail options
        const thumbnailProcessor = require('./thumbnailProcessor');
        await thumbnailProcessor.showThumbnailOptions(interaction, type, messageData);
    } catch (error) {
        console.error('Error processing message link:', error);
        await interaction.editReply({
            content: getLocalizedString(client, 'MESSAGE_NOT_ACCESSIBLE', { guildId, locale }),
            ephemeral: true
        });
    }
}

/**
 * Validate and fetch message from link
 * 
 * @param {string} messageLink - Discord message URL
 * @param {Guild} guild - Discord guild
 * @returns {Promise<Message|null>}
 */
async function validateMessageLink(messageLink, guild) {
    // Validate URL format
    const urlPattern = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
    const match = messageLink.match(urlPattern);
    
    if (!match) {
        return null;
    }
    
    const [, guildId, channelId, messageId] = match;
    
    // Verify guild ID matches
    if (guildId !== guild.id) {
        return null;
    }
    
    try {
        // Fetch channel
        const channel = await guild.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            return null;
        }
        
        // Fetch message
        const message = await channel.messages.fetch(messageId);
        return message;
    } catch (error) {
        console.error('Error fetching message:', error);
        return null;
    }
}

/**
 * Process channel selection for default message
 * 
 * @param {SelectMenuInteraction} interaction - Discord select menu interaction
 * @param {string} type - Notification type
 * @param {string} channelId - Selected channel ID
 * @returns {Promise<void>}
 */
async function processDefaultChannelSelection(interaction, type, channelId) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    try {
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
        
        // Save configuration with default message
        const config = {
            enabled: true,
            channelId: channelId,
            messageType: 'default'
        };
        
        await saveChannelConfig(guildId, type, config);
        
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
        console.error('Error processing channel selection:', error);
        await interaction.update({
            content: getLocalizedString(client, 'INVALID_CHANNEL', { guildId, locale }),
            components: [],
            ephemeral: true
        });
    }
}

module.exports = {
    showMessageOptions,
    handleDefaultMessage,
    handleCustomMessage,
    processMessageLink,
    validateMessageLink,
    processDefaultChannelSelection
};
