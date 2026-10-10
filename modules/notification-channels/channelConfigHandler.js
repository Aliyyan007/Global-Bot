/**
 * Channel Configuration Handler
 * 
 * Manages enable/disable state and channel selection for simple notification types
 * (Level Up, Goodbye)
 * 
 * @module notification-channels/channelConfigHandler
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, MentionableSelectMenuBuilder } = require('discord.js');
const { LANGUAGE_KEYS, getLocalizedString } = require('./languageKeys');
const { saveChannelConfig, removeChannelConfig, getChannelConfig } = require('./settingsSchemaManager');
const { refreshNotificationPanel } = require('./panelRefresher');

/**
 * Display enable/disable buttons for a notification type (EPHEMERAL VERSION)
 * Sends as ephemeral message and refreshes the original panel after configuration
 * 
 * @param {Interaction} interaction - Discord interaction (already deferred)
 * @param {string} type - Notification type (level_up, goodbye)
 * @param {Message} originalMessage - The original manager-settings message to refresh
 * @returns {Promise<void>}
 */
async function showEnableDisableEphemeral(interaction, type, originalMessage) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Get current configuration
    const config = await getChannelConfig(guildId, type);
    const isEnabled = config && config.enabled;
    
    // Create embed with professional formatting
    const typeLabel = type === 'level_up' ? '📈 Level Up' : '👋 Goodbye';
    const typeEmoji = type === 'level_up' ? '📈' : '👋';
    
    const embed = new EmbedBuilder()
        .setTitle(`${typeEmoji} ${typeLabel} Notifications`)
        .setColor(isEnabled ? 0x57F287 : 0x5865F2)
        .setTimestamp();
    
    if (isEnabled) {
        const memberCountStatus = config.showMemberCount !== false ? '✅ Shown' : '❌ Hidden';
        embed.setDescription([
            `**Status:** ✅ Enabled`,
            `**Channel:** <#${config.channelId}>`,
            `**Member Count:** ${memberCountStatus}`,
            ``,
            `**Options:**`,
            `• Click **Disable** to turn off notifications`,
            type === 'goodbye' ? `• Click **Manage Mention Settings** to configure who gets mentioned` : '',
            type === 'goodbye' ? `• Click **Toggle Member Count** to show/hide member count` : ''
        ].filter(Boolean).join('\n'));
    } else {
        embed.setDescription([
            `**Status:** ❌ Disabled`,
            ``,
            `**To enable:**`,
            `• Click **Enable** below`,
            `• Select a channel for notifications`,
            `• The main panel will auto-refresh`
        ].join('\n'));
    }
    
    embed.setFooter({ text: 'Changes will be reflected in the main settings panel' });
    
    // Create enable/disable buttons with original message reference
    const buttons = [
        new ButtonBuilder()
            .setCustomId(`notif_enable_eph_${type}_${originalMessage.id}`)
            .setLabel('Enable')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(isEnabled),
        new ButtonBuilder()
            .setCustomId(`notif_disable_eph_${type}_${originalMessage.id}`)
            .setLabel('Disable')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
            .setDisabled(!isEnabled)
    ];
    
    // Add "Manage Mention Settings" button for goodbye if enabled
    if (type === 'goodbye' && isEnabled) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`notif_edit_mentions_eph_${type}_${originalMessage.id}`)
                .setLabel('Manage Mention Settings')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📢')
        );
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`notif_toggle_member_count_eph_${type}_${originalMessage.id}`)
                .setLabel(config.showMemberCount !== false ? 'Hide Member Count' : 'Show Member Count')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔢')
        );
    }
    
    const row = new ActionRowBuilder().addComponents(buttons);
    
    await interaction.followUp({
        embeds: [embed],
        components: [row],
        flags: ["Ephemeral"]
    });
}

/**
 * Display enable/disable buttons for a notification type
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type (level_up, goodbye)
 * @returns {Promise<void>}
 */
async function showEnableDisable(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Get current configuration
    const config = await getChannelConfig(guildId, type);
    const isEnabled = config && config.enabled;
    
    // Create embed
    const typeLabel = type === 'level_up' ? 'SETUP_LEVEL_UP' : 'SETUP_GOODBYE';
    const embed = new EmbedBuilder()
        .setTitle(getLocalizedString(client, typeLabel, { guildId, locale }))
        .setColor(isEnabled ? 0x57F287 : 0x5865F2)
        .setDescription(isEnabled ? 
            `✅ Currently enabled in <#${config.channelId}>` : 
            '❌ Currently disabled')
        .setTimestamp();
    
    // Create enable/disable buttons
    const buttons = [
        new ButtonBuilder()
            .setCustomId(`notif_enable_${type}`)
            .setLabel(getLocalizedString(client, 'ENABLE', { guildId, locale }))
            .setStyle(ButtonStyle.Success)
            .setDisabled(isEnabled),
        new ButtonBuilder()
            .setCustomId(`notif_disable_${type}`)
            .setLabel(getLocalizedString(client, 'DISABLE', { guildId, locale }))
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!isEnabled)
    ];
    
    // Add "Manage Mention Settings" button for goodbye if enabled
    if (type === 'goodbye' && isEnabled) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`notif_edit_mentions_${type}`)
                .setLabel('Manage Mention Settings')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📢')
        );
    }
    
    const row = new ActionRowBuilder().addComponents(buttons);
    
    await interaction.update({
        embeds: [embed],
        components: [row],
        flags: ["Ephemeral"]
    });
}

/**
 * Handle enable action - prompt for channel selection
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function handleEnable(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Create channel select menu
    const row = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`notif_channel_${type}`)
                .setPlaceholder(getLocalizedString(client, 'SELECT_CHANNEL_PROMPT', { guildId, locale }))
                .setChannelTypes(ChannelType.GuildText)
        );
    
    await interaction.update({
        content: getLocalizedString(client, 'SELECT_CHANNEL_PROMPT', { guildId, locale }),
        components: [row],
        embeds: [],
        flags: ["Ephemeral"]
    });
}

/**
 * Handle disable action - remove configuration
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function handleDisable(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    try {
        // Remove configuration from database
        await removeChannelConfig(guildId, type);
        
        // Show success message
        await interaction.update({
            content: `✅ ${getLocalizedString(client, 'CHANNEL_DISABLED', { guildId, locale })}`,
            components: [],
            embeds: [],
            flags: ["Ephemeral"]
        });
        
        // Note: User can return to manager-settings menu manually
    } catch (error) {
        console.error('Error disabling channel:', error);
        await interaction.update({
            content: '❌ An error occurred while disabling the channel.',
            components: [],
            embeds: [],
            flags: ["Ephemeral"]
        });
    }
}

/**
 * Process channel selection and save configuration
 * 
 * @param {SelectMenuInteraction} interaction - Discord select menu interaction
 * @param {string} type - Notification type
 * @param {string} channelId - Selected channel ID
 * @returns {Promise<void>}
 */
async function processChannelSelection(interaction, type, channelId) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    try {
        // Validate channel exists and bot has permissions
        const channel = await interaction.guild.channels.fetch(channelId);
        
        if (!channel) {
            await interaction.update({
                content: getLocalizedString(client, 'INVALID_CHANNEL', { guildId, locale }),
                components: [],
                flags: ["Ephemeral"]
            });
            return;
        }
        
        // Check bot permissions
        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
            await interaction.update({
                content: `❌ I don't have the required permissions in <#${channelId}>.\n\n**Required permissions:**\n• View Channel\n• Send Messages\n• Embed Links\n\nPlease grant me these permissions and try again.`,
                components: [],
                flags: ["Ephemeral"]
            });
            return;
        }
        
        // Save configuration — merge over the existing config so other
        // options (mentions, member count, custom message) survive
        const existing = await getChannelConfig(guildId, type).catch(() => null);
        const config = {
            ...(existing?.toObject ? existing.toObject() : existing || {}),
            enabled: true,
            channelId: channelId,
            messageType: 'default'
        };

        await saveChannelConfig(guildId, type, config);
        
        // For goodbye, show mention settings after channel selection
        if (type === 'goodbye') {
            await showMentionSettings(interaction, type, true); // true = initial setup
            return;
        }
        
        // Show success message for other types
        await interaction.update({
            content: `✅ ${getLocalizedString(client, 'CHANNEL_CONFIGURED', { guildId, locale })} <#${channelId}>`,
            components: [],
            flags: ["Ephemeral"]
        });
        
        // Note: User can return to manager-settings menu manually
    } catch (error) {
        console.error('Error processing channel selection:', error);
        await interaction.update({
            content: getLocalizedString(client, 'INVALID_CHANNEL', { guildId, locale }),
            components: [],
            flags: ["Ephemeral"]
        });
    }
}

/**
 * Show mention settings for goodbye notifications
 * 
 * @param {Interaction} interaction - Discord interaction
 * @param {string} type - Notification type
 * @param {boolean} isInitialSetup - Whether this is initial setup (true) or editing (false)
 * @returns {Promise<void>}
 */
async function showMentionSettings(interaction, type, isInitialSetup = false) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    try {
        console.log('[showMentionSettings] Starting...', 'isInitialSetup:', isInitialSetup);
        
        // Get current configuration
        const config = await getChannelConfig(guildId, type);
        
        console.log('[showMentionSettings] Config:', JSON.stringify(config));
        
        // Create embed
        const embed = new EmbedBuilder()
            .setTitle('📢 Mention Settings')
            .setDescription('Select which users and roles should be mentioned when someone leaves the server.\n\n**Tip:** You can select both users and roles in the same menu!')
            .setColor(0x5865F2)
            .setTimestamp();
        
        // Show current mentions if any
        if (config?.mentions?.length) {
            let mentionsText = config.mentions.map(id => {
                // Check if it's a role or user by trying to fetch
                return `<@&${id}> or <@${id}>`;
            }).join(', ');
            embed.addFields({ name: 'Current Mentions', value: mentionsText || 'None' });
        }
        
        // Create mentionable select menu (users + roles)
        const mentionableSelect = new MentionableSelectMenuBuilder()
            .setCustomId(`notif_mention_select_${type}`)
            .setPlaceholder('Select users and/or roles to mention (optional)')
            .setMinValues(0)
            .setMaxValues(10);
        
        const resetButton = new ButtonBuilder()
            .setCustomId(`notif_mention_reset_${type}`)
            .setLabel('Reset Mentions')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔄');
        
        const row1 = new ActionRowBuilder().addComponents(mentionableSelect);
        
        // Different buttons for initial setup vs editing
        if (isInitialSetup) {
            // Initial setup: Show Skip button
            const skipButton = new ButtonBuilder()
                .setCustomId(`notif_mention_skip_${type}`)
                .setLabel('Skip / No Mentions')
                .setStyle(ButtonStyle.Secondary);
            
            const row2 = new ActionRowBuilder().addComponents(skipButton, resetButton);
            
            console.log('[showMentionSettings] Updating interaction (initial setup)...');
            
            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });
        } else {
            // Editing: Show Done button
            const doneButton = new ButtonBuilder()
                .setCustomId(`notif_mention_done_${type}`)
                .setLabel('Done')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅');
            
            const row2 = new ActionRowBuilder().addComponents(resetButton, doneButton);
            
            console.log('[showMentionSettings] Updating interaction (editing)...');
            
            await interaction.update({
                embeds: [embed],
                components: [row1, row2]
            });
        }
        
        console.log('[showMentionSettings] Interaction updated successfully');
    } catch (error) {
        console.error('[showMentionSettings] Error:', error);
        console.error('[showMentionSettings] Stack:', error.stack);
        throw error;
    }
}

/**
 * Process mentionable selection (users and roles combined)
 * 
 * @param {SelectMenuInteraction} interaction - Discord select menu interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function processMentionSelect(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    const selectedMentions = interaction.values;
    
    try {
        console.log('[processMentionSelect] Selected mentions:', selectedMentions);
        
        // Get current configuration
        const config = await getChannelConfig(guildId, type);
        if (!config) {
            await interaction.update({
                content: '❌ Configuration not found. Please set up the channel first.',
                components: [],
                embeds: [],
                flags: ["Ephemeral"]
            }).catch(() => {});
            return;
        }

        // Update configuration with selected mentions
        config.mentions = selectedMentions;
        await saveChannelConfig(guildId, type, config);
        
        console.log('[processMentionSelect] Mentions saved, refreshing view...');
        
        // Determine if this is initial setup or editing based on whether we came from channel selection
        // If the message has no embeds, it's likely initial setup; otherwise it's editing
        const isInitialSetup = !interaction.message.embeds || interaction.message.embeds.length === 0;
        
        // Refresh the mention settings view to show updated selections
        await showMentionSettings(interaction, type, isInitialSetup);
        
        console.log('[processMentionSelect] View refreshed');
    } catch (error) {
        console.error('[processMentionSelect] Error:', error);
        await interaction.update({
            content: '❌ An error occurred while saving mentions.',
            components: [],
            embeds: [],
            flags: ["Ephemeral"]
        }).catch(() => {});
    }
}

/**
 * Toggle @everyone mention
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function toggleMentionEveryone(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    
    try {
        console.log('[toggleMentionEveryone] Starting...');
        
        // Get current configuration
        const config = await getChannelConfig(guildId, type);
        
        if (!config) {
            console.error('[toggleMentionEveryone] Config not found');
            await interaction.update({
                content: '❌ Configuration not found. Please set up the goodbye channel first.',
                components: [],
                embeds: [],
                flags: ["Ephemeral"]
            });
            return;
        }
        
        console.log('[toggleMentionEveryone] Current mentionEveryone:', config.mentionEveryone);
        
        // Toggle @everyone (handle undefined as false)
        config.mentionEveryone = !(config.mentionEveryone || false);
        
        console.log('[toggleMentionEveryone] Toggled to:', config.mentionEveryone);
        
        await saveChannelConfig(guildId, type, config);
        
        console.log('[toggleMentionEveryone] Config saved, refreshing view...');
        
        // Refresh the mention settings view (editing mode)
        await showMentionSettings(interaction, type, false);
        
        console.log('[toggleMentionEveryone] View refreshed successfully');
    } catch (error) {
        console.error('[toggleMentionEveryone] Error:', error);
        console.error('[toggleMentionEveryone] Stack:', error.stack);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.update({
                content: '❌ An error occurred while toggling @everyone mention.',
                components: [],
                embeds: [],
                flags: ["Ephemeral"]
            }).catch((err) => {
                console.error('[toggleMentionEveryone] Failed to send error message:', err);
            });
        }
    }
}

/**
 * Skip mention configuration
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function skipMentionConfig(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Get current configuration
    const config = await getChannelConfig(guildId, type);

    await interaction.update({
        content: `✅ Goodbye channel configured successfully in <#${config?.channelId || 'the selected channel'}>\n\n**Mentions:** None`,
        components: [],
        embeds: [],
        flags: ["Ephemeral"]
    });
    
    // Note: User can return to manager-settings menu manually
}

/**
 * Complete mention configuration (Done button)
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function doneMentionConfig(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Get current configuration
    const config = await getChannelConfig(guildId, type);
    
    // Build mentions text for display
    let mentionsText = 'None';
    if (config?.mentions?.length) {
        mentionsText = config.mentions.map(id => `<@&${id}> <@${id}>`).join(', ');
    }
    
    await interaction.update({
        content: `✅ Mention settings updated successfully!\n\n**Channel:** <#${config?.channelId || 'the selected channel'}>\n**Mentions:** ${mentionsText}`,
        components: [],
        embeds: [],
        flags: ["Ephemeral"]
    });
    
    // Note: User can return to manager-settings menu manually
}

/**
 * Reset all mention settings
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} type - Notification type
 * @returns {Promise<void>}
 */
async function resetMentionConfig(interaction, type) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    
    try {
        // Get current configuration
        const config = await getChannelConfig(guildId, type);
        
        if (!config) {
            console.error('[resetMentionConfig] Config not found');
            await interaction.update({
                content: '❌ Configuration not found. Please set up the goodbye channel first.',
                components: [],
                embeds: [],
                flags: ["Ephemeral"]
            });
            return;
        }
        
        // Clear all mentions
        config.mentions = [];
        
        console.log('[resetMentionConfig] Reset mentions');
        
        await saveChannelConfig(guildId, type, config);
        
        // Refresh the mention settings view (editing mode)
        await showMentionSettings(interaction, type, false);
    } catch (error) {
        console.error('[resetMentionConfig] Error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.update({
                content: '❌ An error occurred while resetting mentions.',
                components: [],
                embeds: [],
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
}

module.exports = {
    showEnableDisable,
    showEnableDisableEphemeral,
    handleEnable,
    handleDisable,
    processChannelSelection,
    showMentionSettings,
    processMentionSelect,
    skipMentionConfig,
    doneMentionConfig,
    resetMentionConfig
};
