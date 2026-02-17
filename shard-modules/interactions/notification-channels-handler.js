/**
 * Notification Channels Interaction Handler
 * 
 * Handles all button and select menu interactions for notification channels
 * Integrates with /manager-settings command
 */

const notificationChannelsMenu = require('../modules/notification-channels/notificationChannelsMenu');
const channelConfigHandler = require('../modules/notification-channels/channelConfigHandler');
const messageTemplateHandler = require('../modules/notification-channels/messageTemplateHandler');
const thumbnailProcessor = require('../modules/notification-channels/thumbnailProcessor');
const dailyRewardManager = require('../modules/notification-channels/dailyRewardManager');
const { removeChannelConfig } = require('../modules/notification-channels/settingsSchemaManager');

/**
 * Handle notification channel interactions
 * 
 * @param {Client} client - Discord client
 * @param {Interaction} interaction - Discord interaction
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
async function handleNotificationChannelInteraction(client, interaction) {
    const customId = interaction.customId;
    
    // Check if this is a notification channel interaction
    if (!customId || !customId.startsWith('notif_')) {
        return false;
    }
    
    try {
        // Main menu
        if (customId === notificationChannelsMenu.CUSTOM_IDS.NOTIFICATION_MENU) {
            await notificationChannelsMenu.displayMenu(interaction);
            return true;
        }
        
        // Setup buttons
        if (customId === notificationChannelsMenu.CUSTOM_IDS.SETUP_LEVEL_UP) {
            await notificationChannelsMenu.handleSelection(interaction, 'level_up');
            return true;
        }
        if (customId === notificationChannelsMenu.CUSTOM_IDS.SETUP_BIRTHDAY) {
            await notificationChannelsMenu.handleSelection(interaction, 'birthday');
            return true;
        }
        if (customId === notificationChannelsMenu.CUSTOM_IDS.SETUP_WELCOME) {
            await notificationChannelsMenu.handleSelection(interaction, 'welcome');
            return true;
        }
        if (customId === notificationChannelsMenu.CUSTOM_IDS.SETUP_GOODBYE) {
            await notificationChannelsMenu.handleSelection(interaction, 'goodbye');
            return true;
        }
        if (customId === notificationChannelsMenu.CUSTOM_IDS.SETUP_DAILY_REWARD) {
            await notificationChannelsMenu.handleSelection(interaction, 'daily_reward');
            return true;
        }
        
        // Enable/Disable buttons
        if (customId.startsWith('notif_enable_')) {
            const type = customId.replace('notif_enable_', '');
            await channelConfigHandler.handleEnable(interaction, type);
            return true;
        }
        if (customId.startsWith('notif_disable_')) {
            const type = customId.replace('notif_disable_', '');
            if (type === 'daily_reward') {
                await removeChannelConfig(interaction.guildId, 'daily_reward');
                await interaction.update({
                    content: '✅ Daily reward channel disabled',
                    components: [],
                    embeds: []
                });
                setTimeout(async () => {
                    await notificationChannelsMenu.displayMenu(interaction);
                }, 2000);
            } else {
                await channelConfigHandler.handleDisable(interaction, type);
            }
            return true;
        }
        
        // Edit Mention Settings button
        if (customId.startsWith('notif_edit_mentions_')) {
            const type = customId.replace('notif_edit_mentions_', '');
            await channelConfigHandler.showMentionSettings(interaction, type);
            return true;
        }
        
        // Mentionable selection (users and roles combined)
        if (customId.startsWith('notif_mention_select_')) {
            const type = customId.replace('notif_mention_select_', '');
            await channelConfigHandler.processMentionSelect(interaction, type);
            return true;
        }
        
        // Toggle @everyone mention
        if (customId.startsWith('notif_mention_everyone_')) {
            const type = customId.replace('notif_mention_everyone_', '');
            await channelConfigHandler.toggleMentionEveryone(interaction, type);
            return true;
        }
        
        // Skip mention configuration
        if (customId.startsWith('notif_mention_skip_')) {
            const type = customId.replace('notif_mention_skip_', '');
            await channelConfigHandler.skipMentionConfig(interaction, type);
            return true;
        }
        
        // Done with mention configuration
        if (customId.startsWith('notif_mention_done_')) {
            const type = customId.replace('notif_mention_done_', '');
            await channelConfigHandler.doneMentionConfig(interaction, type);
            return true;
        }
        
        // Reset mention configuration
        if (customId.startsWith('notif_mention_reset_')) {
            const type = customId.replace('notif_mention_reset_', '');
            await channelConfigHandler.resetMentionConfig(interaction, type);
            return true;
        }
        
        // Default/Custom message buttons
        if (customId.startsWith('notif_default_')) {
            const type = customId.replace('notif_default_', '');
            await messageTemplateHandler.handleDefaultMessage(interaction, type);
            return true;
        }
        if (customId.startsWith('notif_custom_')) {
            const type = customId.replace('notif_custom_', '');
            await messageTemplateHandler.handleCustomMessage(interaction, type);
            return true;
        }
        
        // Thumbnail buttons
        if (customId.startsWith('notif_thumb_static_')) {
            const type = customId.replace('notif_thumb_static_', '');
            await thumbnailProcessor.processThumbnailChoice(interaction, type, 'static');
            return true;
        }
        if (customId.startsWith('notif_thumb_user_')) {
            const type = customId.replace('notif_thumb_user_', '');
            await thumbnailProcessor.processThumbnailChoice(interaction, type, 'user_specific');
            return true;
        }
        
        // Channel selection
        if (customId.startsWith('notif_channel_')) {
            if (interaction.isChannelSelectMenu && interaction.values && interaction.values.length > 0) {
                const channelId = interaction.values[0];
                
                if (customId.startsWith('notif_channel_default_')) {
                    const type = customId.replace('notif_channel_default_', '');
                    await messageTemplateHandler.processDefaultChannelSelection(interaction, type, channelId);
                } else if (customId.startsWith('notif_channel_custom_')) {
                    const type = customId.replace('notif_channel_custom_', '');
                    await thumbnailProcessor.processCustomChannelSelection(interaction, type, channelId);
                } else {
                    const type = customId.replace('notif_channel_', '');
                    await channelConfigHandler.processChannelSelection(interaction, type, channelId);
                }
            }
            return true;
        }
        
        // Modal submission
        if (customId.startsWith('notif_modal_')) {
            if (interaction.isModalSubmit()) {
                const type = customId.replace('notif_modal_', '');
                const messageLink = interaction.fields.getTextInputValue('message_link');
                await messageTemplateHandler.processMessageLink(interaction, type, messageLink);
            }
            return true;
        }
        
        // Daily reward buttons
        if (customId === 'notif_create_daily') {
            const channel = await dailyRewardManager.createChannel(interaction, interaction.guildId);
            const { message, thread } = await dailyRewardManager.sendDailyRewardMessage(channel, client, interaction.guildId);
            
            // Save configuration with thread ID
            const { saveChannelConfig } = require('../modules/notification-channels/settingsSchemaManager');
            await saveChannelConfig(interaction.guildId, 'daily_reward', {
                enabled: true,
                channelId: channel.id,
                messageId: message.id,
                threadId: thread.id
            });
            
            await interaction.update({
                content: `✅ Daily reward channel created: <#${channel.id}>\n🧵 Thread: <#${thread.id}>`,
                components: [],
                embeds: []
            });
            
            setTimeout(async () => {
                await notificationChannelsMenu.displayMenu(interaction);
            }, 2000);
            return true;
        }
        
        if (customId === 'notif_claim_daily') {
            await dailyRewardManager.handleClaimButton(interaction);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error handling notification channel interaction:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            }).catch(() => {});
        }
        
        return true;
    }
}

module.exports = {
    handleNotificationChannelInteraction
};
