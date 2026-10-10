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
const { removeChannelConfig, saveChannelConfig, getChannelConfig } = require('../modules/notification-channels/settingsSchemaManager');
const { refreshNotificationPanel } = require('../modules/notification-channels/panelRefresher');

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
        
        // Ephemeral Enable/Disable buttons (with panel refresh)
        if (customId.startsWith('notif_enable_eph_')) {
            const remaining = customId.replace('notif_enable_eph_', '');
            const lastUnderscoreIndex = remaining.lastIndexOf('_');
            const type = remaining.substring(0, lastUnderscoreIndex);
            const originalMessageId = remaining.substring(lastUnderscoreIndex + 1);
            
            // Get the original message with better error handling
            let originalMessage = null;
            try {
                // Try to fetch from cache first
                originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                
                // If not in cache, try to fetch from API
                if (!originalMessage) {
                    originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                }
            } catch (error) {
                console.error('[Notification Channels] Failed to fetch original message:', error);
            }
            
            if (!originalMessage) {
                return interaction.update({
                    content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                    components: [],
                    embeds: []
                });
            }
            
            // Show channel selection with professional formatting
            const { ChannelSelectMenuBuilder, ChannelType, ActionRowBuilder, EmbedBuilder } = require('discord.js');
            const { getLocalizedString } = require('../modules/notification-channels/languageKeys');
            
            const typeLabel = type === 'level_up' ? '📈 **Level Up**' : '👋 **Goodbye**';
            const embed = new EmbedBuilder()
                .setTitle('🔔 Enable Notification Channel')
                .setDescription(`You're enabling ${typeLabel} notifications.\n\n**Next step:** Select the channel where notifications should be sent.`)
                .setColor(0x57F287)
                .setFooter({ text: 'The main panel will auto-refresh after configuration' })
                .setTimestamp();
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`notif_channel_eph_${type}_${originalMessageId}`)
                        .setPlaceholder('🔍 Select a text channel...')
                        .setChannelTypes(ChannelType.GuildText)
                );
            
            await interaction.update({
                content: '',
                embeds: [embed],
                components: [row]
            });
            return true;
        }
        
        if (customId.startsWith('notif_disable_eph_')) {
            const remaining = customId.replace('notif_disable_eph_', '');
            const lastUnderscoreIndex = remaining.lastIndexOf('_');
            const type = remaining.substring(0, lastUnderscoreIndex);
            const originalMessageId = remaining.substring(lastUnderscoreIndex + 1);
            
            // Get the original message with better error handling
            let originalMessage = null;
            try {
                originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                if (!originalMessage) {
                    originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                }
            } catch (error) {
                console.error('[Notification Channels] Failed to fetch original message:', error);
            }
            
            if (!originalMessage) {
                return interaction.update({
                    content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                    components: [],
                    embeds: []
                });
            }
            
            // Remove configuration
            await removeChannelConfig(interaction.guildId, type);
            
            // Refresh the original panel
            await refreshNotificationPanel(originalMessage, interaction.client, interaction.user.id);
            
            const typeLabel = type === 'level_up' ? '📈 **Level Up**' : '👋 **Goodbye**';
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('✅ Notification Channel Disabled')
                .setDescription(`${typeLabel} notifications have been **disabled**.\n\n**Status:** The main settings panel has been updated automatically.`)
                .setColor(0xED4245)
                .setFooter({ text: 'You can re-enable this anytime from the settings panel' })
                .setTimestamp();
            
            // Show success message with professional formatting
            await interaction.update({
                content: '',
                embeds: [embed],
                components: []
            });
            return true;
        }
        
        if (customId.startsWith('notif_disable_')) {
            const type = customId.replace('notif_disable_', '');
            
            // Check if this is an ephemeral disable for birthday/welcome
            if (type.startsWith('eph_birthday_') || type.startsWith('eph_welcome_')) {
                const parts = type.replace('eph_', '').split('_');
                const notifType = parts[0];
                const originalMessageId = parts[1];
                
                // Get the original message with better error handling
                let originalMessage = null;
                try {
                    originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                    if (!originalMessage) {
                        originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                    }
                } catch (error) {
                    console.error('[Notification Channels] Failed to fetch original message:', error);
                }
                
                if (!originalMessage) {
                    return interaction.update({
                        content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                        components: [],
                        embeds: []
                    });
                }
                
                // Remove configuration
                await removeChannelConfig(interaction.guildId, notifType);
                
                // Refresh the original panel
                await refreshNotificationPanel(originalMessage, interaction.client, interaction.user.id);
                
                const typeLabel = notifType === 'birthday' ? '🎂 **Birthday**' : '👋 **Welcome**';
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('✅ Notification Channel Disabled')
                    .setDescription(`${typeLabel} notifications have been **disabled**.\n\n**Status:** The main settings panel has been updated automatically.`)
                    .setColor(0xED4245)
                    .setFooter({ text: 'You can re-enable this anytime from the settings panel' })
                    .setTimestamp();
                
                // Show success message with professional formatting
                await interaction.update({
                    content: '',
                    embeds: [embed],
                    components: []
                });
                return true;
            }
            
            // Handle non-ephemeral disable
            if (type === 'daily_reward') {
                await removeChannelConfig(interaction.guildId, 'daily_reward');
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('✅ Daily Reward Channel Disabled')
                    .setDescription('The daily reward system has been **disabled**.\n\n**Note:** The channel and thread still exist but the configuration has been removed.')
                    .setColor(0xED4245)
                    .setTimestamp();
                
                await interaction.update({
                    content: '',
                    embeds: [embed],
                    components: []
                });
                // Note: User can return to manager-settings menu manually
            } else {
                await channelConfigHandler.handleDisable(interaction, type);
            }
            return true;
        }
        
        // Ephemeral channel selection (with panel refresh)
        if (customId.startsWith('notif_channel_eph_')) {
            if (interaction.isChannelSelectMenu && interaction.values && interaction.values.length > 0) {
                const remaining = customId.replace('notif_channel_eph_', '');
                const lastUnderscoreIndex = remaining.lastIndexOf('_');
                const type = remaining.substring(0, lastUnderscoreIndex);
                const originalMessageId = remaining.substring(lastUnderscoreIndex + 1);
                const channelId = interaction.values[0];
                
                // Get the original message with better error handling
                let originalMessage = null;
                try {
                    originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                    if (!originalMessage) {
                        originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                    }
                } catch (error) {
                    console.error('[Notification Channels] Failed to fetch original message:', error);
                }
                
                if (!originalMessage) {
                    return interaction.update({
                        content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                        components: [],
                        embeds: []
                    });
                }
                
                // Validate channel
                const channel = await interaction.guild.channels.fetch(channelId);
                if (!channel) {
                    const { EmbedBuilder } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Invalid Channel')
                        .setDescription('The selected channel could not be found.\n\n**Please try again** and select a valid text channel.')
                        .setColor(0xED4245)
                        .setTimestamp();
                    
                    return interaction.update({ 
                        content: '',
                        embeds: [embed],
                        components: [] 
                    });
                }
                
                // Check bot permissions with detailed feedback
                const permissions = channel.permissionsFor(interaction.guild.members.me);
                if (!permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                    const { EmbedBuilder } = require('discord.js');
                    const missingPerms = [];
                    if (!permissions.has('ViewChannel')) missingPerms.push('• **View Channel**');
                    if (!permissions.has('SendMessages')) missingPerms.push('• **Send Messages**');
                    if (!permissions.has('EmbedLinks')) missingPerms.push('• **Embed Links**');
                    
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Missing Permissions')
                        .setDescription(`I don't have the required permissions in <#${channelId}>.\n\n**Missing permissions:**\n${missingPerms.join('\n')}\n\n**Solution:** Grant me these permissions in that channel and try again.`)
                        .setColor(0xED4245)
                        .setTimestamp();
                    
                    return interaction.update({ 
                        content: '',
                        embeds: [embed],
                        components: [] 
                    });
                }
                
                // Save configuration — merge over the existing config so other
                // options (mentions, member count, custom message) survive
                const existing = await getChannelConfig(interaction.guildId, type).catch(() => null);
                const config = {
                    ...(existing?.toObject ? existing.toObject() : existing || {}),
                    enabled: true,
                    channelId: channelId,
                    messageType: 'default'
                };

                await saveChannelConfig(interaction.guildId, type, config);
                
                // Refresh the original panel
                await refreshNotificationPanel(originalMessage, interaction.client, interaction.user.id);
                
                const typeLabel = type === 'level_up' ? '📈 **Level Up**' : '👋 **Goodbye**';
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('✅ Notification Channel Configured')
                    .setDescription(`${typeLabel} notifications are now **enabled**!\n\n**Channel:** <#${channelId}>\n**Status:** The main settings panel has been updated automatically.`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'Notifications will be sent to this channel' })
                    .setTimestamp();
                
                // Show success message with professional formatting
                await interaction.update({
                    content: '',
                    embeds: [embed],
                    components: []
                });
                return true;
            }
            return true;
        }
        
        // Edit Mention Settings button
        if (customId.startsWith('notif_edit_mentions_')) {
            let type = customId.replace('notif_edit_mentions_', '');
            
            // Check if this is an ephemeral version (has message ID at the end)
            if (type.startsWith('eph_')) {
                // Format: notif_edit_mentions_eph_goodbye_123456789
                const remaining = type.replace('eph_', '');
                const lastUnderscoreIndex = remaining.lastIndexOf('_');
                type = remaining.substring(0, lastUnderscoreIndex);
            }
            
            await channelConfigHandler.showMentionSettings(interaction, type, false);
            return true;
        }
        
        // Mentionable selection (users and roles combined)
        if (customId.startsWith('notif_mention_select_')) {
            const type = customId.replace('notif_mention_select_', '');
            await channelConfigHandler.processMentionSelect(interaction, type);
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
        
        // Toggle member count button
        if (customId.startsWith('notif_toggle_member_count_eph_')) {
            const remaining = customId.replace('notif_toggle_member_count_eph_', '');
            const lastUnderscoreIndex = remaining.lastIndexOf('_');
            const type = remaining.substring(0, lastUnderscoreIndex);
            const originalMessageId = remaining.substring(lastUnderscoreIndex + 1);
            
            // Get the original message with better error handling
            let originalMessage = null;
            try {
                originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                if (!originalMessage) {
                    originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                }
            } catch (error) {
                console.error('[Notification Channels] Failed to fetch original message:', error);
            }
            
            if (!originalMessage) {
                return interaction.update({
                    content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                    components: [],
                    embeds: []
                });
            }
            
            // Get current configuration
            const config = await getChannelConfig(interaction.guildId, type);
            
            if (!config) {
                return interaction.update({
                    content: '❌ Configuration not found. Please set up the notification channel first.',
                    components: [],
                    embeds: []
                });
            }
            
            // Toggle showMemberCount (default is true, so if undefined treat as true)
            const currentValue = config.showMemberCount !== false;
            config.showMemberCount = !currentValue;
            
            // Save configuration
            await saveChannelConfig(interaction.guildId, type, config);
            
            // Refresh the original panel
            await refreshNotificationPanel(originalMessage, interaction.client, interaction.user.id);
            
            const typeLabel = type === 'welcome' ? '👋 **Welcome**' : '👋 **Goodbye**';
            const statusText = config.showMemberCount ? '**shown**' : '**hidden**';
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('✅ Member Count Setting Updated')
                .setDescription(`${typeLabel} notifications member count is now ${statusText}.\n\n**Status:** The main settings panel has been updated automatically.`)
                .setColor(0x57F287)
                .setFooter({ text: 'You can toggle this anytime from the settings panel' })
                .setTimestamp();
            
            // Show success message with professional formatting
            await interaction.update({
                content: '',
                embeds: [embed],
                components: []
            });
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
        
        // Ephemeral Default/Custom message buttons (with panel refresh)
        if (customId.startsWith('notif_default_eph_')) {
            const remaining = customId.replace('notif_default_eph_', '');
            const lastUnderscoreIndex = remaining.lastIndexOf('_');
            const type = remaining.substring(0, lastUnderscoreIndex);
            const originalMessageId = remaining.substring(lastUnderscoreIndex + 1);
            
            // Get the original message with better error handling
            let originalMessage = null;
            try {
                originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                if (!originalMessage) {
                    originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                }
            } catch (error) {
                console.error('[Notification Channels] Failed to fetch original message:', error);
            }
            
            if (!originalMessage) {
                return interaction.update({
                    content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                    components: [],
                    embeds: []
                });
            }
            
            // Show channel selection with professional formatting
            const { ChannelSelectMenuBuilder, ChannelType, ActionRowBuilder, EmbedBuilder } = require('discord.js');
            const { getLocalizedString } = require('../modules/notification-channels/languageKeys');
            
            const typeLabel = type === 'birthday' ? '🎂 **Birthday**' : '👋 **Welcome**';
            const embed = new EmbedBuilder()
                .setTitle('📝 Default Message Selected')
                .setDescription(`You've chosen to use the **default message** for ${typeLabel} notifications.\n\n**Next step:** Select the channel where notifications should be sent.\n\n**Note:** The bot will use its built-in message template.`)
                .setColor(0x5865F2)
                .setFooter({ text: 'The main panel will auto-refresh after configuration' })
                .setTimestamp();
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`notif_channel_default_eph_${type}_${originalMessageId}`)
                        .setPlaceholder('🔍 Select a text channel...')
                        .setChannelTypes(ChannelType.GuildText)
                );
            
            await interaction.update({
                content: '',
                embeds: [embed],
                components: [row]
            });
            return true;
        }
        
        if (customId.startsWith('notif_custom_eph_')) {
            const remaining = customId.replace('notif_custom_eph_', '');
            const lastUnderscoreIndex = remaining.lastIndexOf('_');
            const type = remaining.substring(0, lastUnderscoreIndex);
            const originalMessageId = remaining.substring(lastUnderscoreIndex + 1);
            
            // Get the original message with better error handling
            let originalMessage = null;
            try {
                originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                if (!originalMessage) {
                    originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                }
            } catch (error) {
                console.error('[Notification Channels] Failed to fetch original message:', error);
            }
            
            if (!originalMessage) {
                return interaction.reply({
                    content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                    flags: ["Ephemeral"]
                });
            }
            
            // Store original message ID for later use
            interaction.client.ephemeralOriginalMessages = interaction.client.ephemeralOriginalMessages || {};
            interaction.client.ephemeralOriginalMessages[interaction.user.id] = originalMessageId;
            
            // Show modal for custom message
            await messageTemplateHandler.handleCustomMessage(interaction, type);
            return true;
        }
        
        // Ephemeral channel selection for default message (with panel refresh)
        if (customId.startsWith('notif_channel_default_eph_')) {
            if (interaction.isChannelSelectMenu && interaction.values && interaction.values.length > 0) {
                const remaining = customId.replace('notif_channel_default_eph_', '');
                const lastUnderscoreIndex = remaining.lastIndexOf('_');
                const type = remaining.substring(0, lastUnderscoreIndex);
                const originalMessageId = remaining.substring(lastUnderscoreIndex + 1);
                const channelId = interaction.values[0];
                
                // Get the original message with better error handling
                let originalMessage = null;
                try {
                    originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                    if (!originalMessage) {
                        originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                    }
                } catch (error) {
                    console.error('[Notification Channels] Failed to fetch original message:', error);
                }
                
                if (!originalMessage) {
                    return interaction.update({
                        content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                        components: [],
                        embeds: []
                    });
                }
                
                // Validate channel
                const channel = await interaction.guild.channels.fetch(channelId);
                if (!channel) {
                    const { EmbedBuilder } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Invalid Channel')
                        .setDescription('The selected channel could not be found.\n\n**Please try again** and select a valid text channel.')
                        .setColor(0xED4245)
                        .setTimestamp();
                    
                    return interaction.update({ 
                        content: '',
                        embeds: [embed],
                        components: [] 
                    });
                }
                
                // Check bot permissions with detailed feedback
                const permissions = channel.permissionsFor(interaction.guild.members.me);
                if (!permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                    const { EmbedBuilder } = require('discord.js');
                    const missingPerms = [];
                    if (!permissions.has('ViewChannel')) missingPerms.push('• **View Channel**');
                    if (!permissions.has('SendMessages')) missingPerms.push('• **Send Messages**');
                    if (!permissions.has('EmbedLinks')) missingPerms.push('• **Embed Links**');
                    
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Missing Permissions')
                        .setDescription(`I don't have the required permissions in <#${channelId}>.\n\n**Missing permissions:**\n${missingPerms.join('\n')}\n\n**Solution:** Grant me these permissions in that channel and try again.`)
                        .setColor(0xED4245)
                        .setTimestamp();
                    
                    return interaction.update({ 
                        content: '',
                        embeds: [embed],
                        components: [] 
                    });
                }
                
                // Save configuration — merge over the existing config so other
                // options (mentions, member count, custom message) survive
                const existing = await getChannelConfig(interaction.guildId, type).catch(() => null);
                const config = {
                    ...(existing?.toObject ? existing.toObject() : existing || {}),
                    enabled: true,
                    channelId: channelId,
                    messageType: 'default'
                };

                await saveChannelConfig(interaction.guildId, type, config);
                
                // Refresh the original panel
                await refreshNotificationPanel(originalMessage, interaction.client, interaction.user.id);
                
                const typeLabel = type === 'birthday' ? '🎂 **Birthday**' : '👋 **Welcome**';
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('✅ Notification Channel Configured')
                    .setDescription(`${typeLabel} notifications are now **enabled** with the default message!\n\n**Channel:** <#${channelId}>\n**Message Type:** Default Template\n**Status:** The main settings panel has been updated automatically.`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'Notifications will be sent to this channel' })
                    .setTimestamp();
                
                // Show success message with professional formatting
                await interaction.update({
                    content: '',
                    embeds: [embed],
                    components: []
                });
                return true;
            }
            return true;
        }
        
        // Thumbnail buttons
        if (customId.startsWith('notif_thumb_static_')) {
            let remaining = customId.replace('notif_thumb_static_', '');
            let type = remaining;
            let sessionId = null;
            
            // Handle ephemeral format: eph_welcome_1502958621615587348 -> welcome
            if (remaining.startsWith('eph_')) {
                remaining = remaining.replace('eph_', '');
                const lastUnderscoreIndex = remaining.lastIndexOf('_');
                type = remaining.substring(0, lastUnderscoreIndex);
            }
            // Handle session ID format: welcome_userId_timestamp -> welcome
            else if (remaining.includes('_')) {
                const parts = remaining.split('_');
                if (parts.length >= 3) {
                    type = parts[0];
                    sessionId = parts.slice(1).join('_'); // userId_timestamp
                }
            }
            
            await thumbnailProcessor.processThumbnailChoice(interaction, type, 'static', sessionId);
            return true;
        }
        if (customId.startsWith('notif_thumb_user_')) {
            let remaining = customId.replace('notif_thumb_user_', '');
            let type = remaining;
            let sessionId = null;
            
            // Handle ephemeral format: eph_welcome_1502958621615587348 -> welcome
            if (remaining.startsWith('eph_')) {
                remaining = remaining.replace('eph_', '');
                const lastUnderscoreIndex = remaining.lastIndexOf('_');
                type = remaining.substring(0, lastUnderscoreIndex);
            }
            // Handle session ID format: welcome_userId_timestamp -> welcome
            else if (remaining.includes('_')) {
                const parts = remaining.split('_');
                if (parts.length >= 3) {
                    type = parts[0];
                    sessionId = parts.slice(1).join('_'); // userId_timestamp
                }
            }
            
            await thumbnailProcessor.processThumbnailChoice(interaction, type, 'user_specific', sessionId);
            return true;
        }
        
        // Channel selection
        if (customId.startsWith('notif_channel_')) {
            if (interaction.isChannelSelectMenu && interaction.values && interaction.values.length > 0) {
                const channelId = interaction.values[0];
                
                if (customId.startsWith('notif_channel_default_')) {
                    let type = customId.replace('notif_channel_default_', '');
                    // Handle ephemeral format: eph_welcome_1502958621615587348 -> welcome
                    if (type.startsWith('eph_')) {
                        const remaining = type.replace('eph_', '');
                        const lastUnderscoreIndex = remaining.lastIndexOf('_');
                        type = remaining.substring(0, lastUnderscoreIndex);
                    }
                    await messageTemplateHandler.processDefaultChannelSelection(interaction, type, channelId);
                } else if (customId.startsWith('notif_channel_custom_')) {
                    let remaining = customId.replace('notif_channel_custom_', '');
                    let type = remaining;
                    let sessionId = null;
                    
                    // Handle ephemeral format: eph_welcome_1502958621615587348 -> welcome
                    if (remaining.startsWith('eph_')) {
                        remaining = remaining.replace('eph_', '');
                        const lastUnderscoreIndex = remaining.lastIndexOf('_');
                        type = remaining.substring(0, lastUnderscoreIndex);
                    }
                    // Handle session ID format: welcome_userId_timestamp -> welcome
                    else if (remaining.includes('_')) {
                        const parts = remaining.split('_');
                        if (parts.length >= 3) {
                            type = parts[0];
                            sessionId = parts.slice(1).join('_'); // userId_timestamp
                        }
                    }
                    
                    await thumbnailProcessor.processCustomChannelSelection(interaction, type, channelId, sessionId);
                } else {
                    let type = customId.replace('notif_channel_', '');
                    // Handle ephemeral format: eph_welcome_1502958621615587348 -> welcome
                    if (type.startsWith('eph_')) {
                        const remaining = type.replace('eph_', '');
                        const lastUnderscoreIndex = remaining.lastIndexOf('_');
                        type = remaining.substring(0, lastUnderscoreIndex);
                    }
                    await channelConfigHandler.processChannelSelection(interaction, type, channelId);
                }
            }
            return true;
        }
        
        // Modal submission
        if (customId.startsWith('notif_modal_')) {
            if (interaction.isModalSubmit()) {
                let type = customId.replace('notif_modal_', '');
                
                // Handle ephemeral format: eph_welcome_1502958621615587348 -> welcome
                if (type.startsWith('eph_')) {
                    const remaining = type.replace('eph_', '');
                    const lastUnderscoreIndex = remaining.lastIndexOf('_');
                    type = remaining.substring(0, lastUnderscoreIndex);
                }
                
                const messageLink = interaction.fields.getTextInputValue('message_link');
                await messageTemplateHandler.processMessageLink(interaction, type, messageLink);
            }
            return true;
        }
        
        // Daily reward buttons
        if (customId === 'notif_create_daily') {
            const channel = await dailyRewardManager.createChannel(interaction, interaction.guildId);
            const { message, thread } = await dailyRewardManager.sendDailyRewardMessage(channel, client, interaction.guildId);
            
            // Save configuration with complete thread information
            const { saveChannelConfig } = require('../modules/notification-channels/settingsSchemaManager');
            await saveChannelConfig(interaction.guildId, 'daily_reward', {
                enabled: true,
                channelId: channel.id,
                messageId: message.id,
                threadId: thread.id,
                threadUrl: thread.url,
                threadName: thread.name,
                createdAt: new Date()
            });
            
            await interaction.update({
                content: `✅ Daily reward channel created: <#${channel.id}>\n🧵 Thread: <#${thread.id}>\n🔗 URL: ${thread.url}`,
                components: [],
                embeds: []
            });
            
            // Note: User can return to manager-settings menu manually
            return true;
        }
        
        // Ephemeral daily reward create button (with panel refresh)
        if (customId.startsWith('notif_create_daily_eph_')) {
            const originalMessageId = customId.replace('notif_create_daily_eph_', '');
            
            // Get the original message with better error handling
            let originalMessage = null;
            try {
                originalMessage = interaction.channel.messages.cache.get(originalMessageId);
                if (!originalMessage) {
                    originalMessage = await interaction.channel.messages.fetch(originalMessageId);
                }
            } catch (error) {
                console.error('[Notification Channels] Failed to fetch original message:', error);
            }
            
            if (!originalMessage) {
                return interaction.reply({
                    content: `❌ **Could not find the original settings panel.**\n\n**Possible reasons:**\n• The settings panel message was deleted\n• The bot doesn't have permission to read message history\n• The message is too old\n\n**Solution:** Please run \`/manager-settings\` again to open a fresh panel.`,
                    flags: ["Ephemeral"]
                });
            }
            
            await interaction.deferUpdate();
            
            try {
                const { EmbedBuilder } = require('discord.js');
                
                // Show progress message
                const progressEmbed = new EmbedBuilder()
                    .setTitle('⏳ Creating Daily Reward Channel...')
                    .setDescription('Please wait while I set up the daily reward system.\n\n**Steps:**\n• Creating dedicated channel\n• Setting up permissions\n• Creating reward message\n• Creating hidden thread')
                    .setColor(0xFEE75C)
                    .setTimestamp();
                
                await interaction.editReply({
                    content: '',
                    embeds: [progressEmbed],
                    components: []
                });
                
                const channel = await dailyRewardManager.createChannel(interaction, interaction.guildId);
                const { message, thread } = await dailyRewardManager.sendDailyRewardMessage(channel, client, interaction.guildId);
                
                // Save configuration with complete thread information
                await saveChannelConfig(interaction.guildId, 'daily_reward', {
                    enabled: true,
                    channelId: channel.id,
                    messageId: message.id,
                    threadId: thread.id,
                    threadUrl: thread.url,
                    threadName: thread.name,
                    createdAt: new Date()
                });
                
                // Refresh the original panel
                await refreshNotificationPanel(originalMessage, client, interaction.user.id);
                
                // Update with success message
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Daily Reward Channel Created')
                    .setDescription(`The daily reward system has been **successfully configured**!\n\n**Channel:** <#${channel.id}>\n**Thread:** <#${thread.id}>\n**Status:** The main settings panel has been updated automatically.\n\n**How it works:**\n• Users can click the button in <#${channel.id}> to claim rewards\n• Claims are processed in the hidden thread\n• Users are mentioned in the thread when they claim`)
                    .setColor(0x57F287)
                    .setFooter({ text: 'Users can now claim their daily rewards!' })
                    .setTimestamp();
                
                await interaction.editReply({
                    content: '',
                    embeds: [successEmbed],
                    components: []
                });
            } catch (error) {
                console.error('[Daily Reward] Error creating channel:', error);
                
                const { EmbedBuilder } = require('discord.js');
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Failed to Create Daily Reward Channel')
                    .setDescription(`An error occurred while setting up the daily reward system.\n\n**Error:** \`${error.message}\`\n\n**Possible reasons:**\n• Missing **Manage Channels** permission\n• Missing **Manage Threads** permission\n• Server limit reached\n\n**Solution:** Check bot permissions and try again.`)
                    .setColor(0xED4245)
                    .setTimestamp();
                
                await interaction.editReply({
                    content: '',
                    embeds: [errorEmbed],
                    components: []
                });
            }
            
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
