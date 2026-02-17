const ModerationSystem = require('../schemas/moderationSystemSchema');
const { createMainPanelEmbed, createMainPanelComponents } = require('../handler/moderationHelpers');
const { PermissionFlagsBits } = require('discord.js');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-toggle-system',
    
    run: async (client, interaction, args) => {
        try {
            // Check if user is authorized
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            const { guild } = interaction;
            
            // Get config
            let config = await ModerationSystem.findOne({ guildId: guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: guild.id });
            }
            
            // If disabling, just toggle off
            if (config.enabled) {
                config.enabled = false;
                await config.save();
                
                const container = createMainPanelEmbed(config, guild, interaction.user.id);
                const components = createMainPanelComponents(config, interaction.user.id);
                
                await interaction.update({
                    components: [container, ...components]
                });
                
                return;
            }
            
            // ENABLING SYSTEM - Security checks
            
            // Check if bot role is high enough in hierarchy
            const botMember = await guild.members.fetch(client.user.id);
            const botRole = botMember.roles.highest;
            
            // Get all roles sorted by position
            const sortedRoles = guild.roles.cache.sort((a, b) => b.position - a.position);
            
            // Check for administrator roles
            const adminRoles = sortedRoles.filter(role => 
                role.permissions.has(PermissionFlagsBits.Administrator) && 
                role.id !== guild.id // Exclude @everyone
            );
            
            if (adminRoles.size > 0) {
                // There are admin roles - bot should be just below the highest admin role
                const highestAdminRole = adminRoles.first();
                
                if (botRole.position <= highestAdminRole.position) {
                    return await interaction.reply({
                        content: '❌ **Bot Role Position Check Failed**\n\n' +
                                 'Administrator roles detected in this server.\n\n' +
                                 `**Highest Admin Role:** ${highestAdminRole.name} (Position: ${highestAdminRole.position})\n` +
                                 `**Bot Role:** ${botRole.name} (Position: ${botRole.position})\n\n` +
                                 '**Required Action:**\n' +
                                 '1. Go to Server Settings → Roles\n' +
                                 `2. Move the **${botRole.name}** role just below **${highestAdminRole.name}**\n` +
                                 '3. Try enabling the system again',
                        flags: ["Ephemeral"]
                    });
                }
            } else {
                // No admin roles - bot should be at the top
                const highestRole = sortedRoles.filter(r => r.id !== guild.id).first();
                
                if (highestRole && botRole.position < highestRole.position) {
                    return await interaction.reply({
                        content: '❌ **Bot Role Position Check Failed**\n\n' +
                                 'No administrator roles detected. The bot role must be at the top.\n\n' +
                                 `**Highest Role:** ${highestRole.name} (Position: ${highestRole.position})\n` +
                                 `**Bot Role:** ${botRole.name} (Position: ${botRole.position})\n\n` +
                                 '**Required Action:**\n' +
                                 '1. Go to Server Settings → Roles\n' +
                                 `2. Move the **${botRole.name}** role to the top of all roles\n` +
                                 '3. Try enabling the system again',
                        flags: ["Ephemeral"]
                    });
                }
            }
            
            // Role position check passed - now ask for log channel
            const { ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
            const channelSelectMenu = new ActionRowBuilder()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`cmd{mod-setup-log-channel}usr{${interaction.user.id}}`)
                        .setPlaceholder('Select Log Channel')
                        .addChannelTypes(ChannelType.GuildText)
                );
            
            await interaction.reply({
                content: '### ✅ Bot Role Position Check Passed!\n\n' +
                         '**Step 1: Select Log Channel**\n' +
                         'Choose a channel where all moderation actions (ban/unban/kick/timeout/timeout remove) will be logged.\n\n' +
                         'The log will include:\n' +
                         '• Who was banned/unbanned/kicked/timed out\n' +
                         '• Which moderator performed the action\n' +
                         '• When the action occurred\n' +
                         '• Reason for the action\n' +
                         '• Other relevant information',
                components: [channelSelectMenu],
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error toggling moderation system:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while toggling the system.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            } else {
                await interaction.followUp({
                    content: '❌ An error occurred while toggling the system.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
