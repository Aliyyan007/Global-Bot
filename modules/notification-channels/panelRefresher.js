/**
 * Panel Refresher for Notification Channels
 * 
 * Handles automatic refresh of the manager-settings notification channels panel
 * after configuration changes are made via ephemeral messages
 * 
 * @module notification-channels/panelRefresher
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getChannelConfig } = require('./settingsSchemaManager');

/**
 * Refresh the notification channels panel in the original message
 * 
 * @param {Message} originalMessage - The original manager-settings message to update
 * @param {Client} client - Discord client
 * @param {string} userId - User ID for the select menu customId
 * @returns {Promise<void>}
 */
async function refreshNotificationPanel(originalMessage, client, userId) {
    try {
        const guildId = originalMessage.guildId;
        const locale = originalMessage.interaction?.locale || 'en-US';
        
        // Get current configuration status for each notification type
        const levelUpConfig = await getChannelConfig(guildId, 'level_up');
        const birthdayConfig = await getChannelConfig(guildId, 'birthday');
        const welcomeConfig = await getChannelConfig(guildId, 'welcome');
        const goodbyeConfig = await getChannelConfig(guildId, 'goodbye');
        const dailyRewardConfig = await getChannelConfig(guildId, 'daily_reward');
        
        // Build description with current status
        const statusLines = [
            `${client.language({ textId: "Configure automated notification channels for your server", guildId, locale })}`,
            ``,
            `📈 **${client.language({ textId: "Level Up", guildId, locale })}**: ${levelUpConfig?.enabled ? `✅ <#${levelUpConfig.channelId}>` : `❌ ${client.language({ textId: "Not set", guildId, locale })}`}`,
            `🎂 **${client.language({ textId: "Birthday", guildId, locale })}**: ${birthdayConfig?.enabled ? `✅ <#${birthdayConfig.channelId}>` : `❌ ${client.language({ textId: "Not set", guildId, locale })}`}`,
            `👋 **${client.language({ textId: "Welcome", guildId, locale })}**: ${welcomeConfig?.enabled ? `✅ <#${welcomeConfig.channelId}>` : `❌ ${client.language({ textId: "Not set", guildId, locale })}`}`,
            `👋 **${client.language({ textId: "Goodbye", guildId, locale })}**: ${goodbyeConfig?.enabled ? `✅ <#${goodbyeConfig.channelId}>` : `❌ ${client.language({ textId: "Not set", guildId, locale })}`}`,
            `🎁 **${client.language({ textId: "Daily Reward", guildId, locale })}**: ${dailyRewardConfig?.enabled ? `✅ <#${dailyRewardConfig.channelId}>` : `❌ ${client.language({ textId: "Not set", guildId, locale })}`}`
        ];
        
        // Get the existing embed and update its description
        const existingEmbed = originalMessage.embeds[0];
        const updatedEmbed = EmbedBuilder.from(existingEmbed)
            .setDescription(statusLines.join('\n'))
            .setColor(0x5865F2);
        
        // Recreate the select menu with updated descriptions
        const notificationMenu = new StringSelectMenuBuilder()
            .setCustomId(`cmd{manager-settings}title{notificationChannels}usr{${userId}}`)
            .setPlaceholder(`${client.language({ textId: "Select notification type to configure", guildId, locale })}`)
            .setOptions([
                {
                    label: `${client.language({ textId: "Level Up", guildId, locale })}`,
                    value: 'level_up',
                    emoji: '📈',
                    description: levelUpConfig?.enabled ? `${client.language({ textId: "Enabled", guildId, locale })}` : `${client.language({ textId: "Disabled", guildId, locale })}`
                },
                {
                    label: `${client.language({ textId: "Birthday", guildId, locale })}`,
                    value: 'birthday',
                    emoji: '🎂',
                    description: birthdayConfig?.enabled ? `${client.language({ textId: "Enabled", guildId, locale })}` : `${client.language({ textId: "Disabled", guildId, locale })}`
                },
                {
                    label: `${client.language({ textId: "Welcome", guildId, locale })}`,
                    value: 'welcome',
                    emoji: '👋',
                    description: welcomeConfig?.enabled ? `${client.language({ textId: "Enabled", guildId, locale })}` : `${client.language({ textId: "Disabled", guildId, locale })}`
                },
                {
                    label: `${client.language({ textId: "Goodbye", guildId, locale })}`,
                    value: 'goodbye',
                    emoji: '👋',
                    description: goodbyeConfig?.enabled ? `${client.language({ textId: "Enabled", guildId, locale })}` : `${client.language({ textId: "Disabled", guildId, locale })}`
                },
                {
                    label: `${client.language({ textId: "Daily Reward", guildId, locale })}`,
                    value: 'daily_reward',
                    emoji: '🎁',
                    description: dailyRewardConfig?.enabled ? `${client.language({ textId: "Enabled", guildId, locale })}` : `${client.language({ textId: "Disabled", guildId, locale })}`
                }
            ]);
        
        // Get existing components and update the notification row
        const components = originalMessage.components.map((row, index) => {
            if (index === 1) {
                // This is the notification channels select menu row
                return new ActionRowBuilder().addComponents(notificationMenu);
            }
            return ActionRowBuilder.from(row);
        });
        
        // Update the original message
        await originalMessage.edit({
            embeds: [updatedEmbed],
            components: components
        });
        
    } catch (error) {
        console.error('[Panel Refresher] Error refreshing notification panel:', error);
        // Don't throw - we don't want to break the flow if refresh fails
    }
}

module.exports = {
    refreshNotificationPanel
};
