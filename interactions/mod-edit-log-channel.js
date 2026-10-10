const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-edit-log-channel',
    
    run: async (client, interaction, args) => {
        try {
            // Check if user is authorized
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            // If this is a channel select menu response
            if (interaction.isChannelSelectMenu()) {
                const selectedChannel = interaction.values[0];
                
                let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
                if (!config) {
                    return await interaction.reply({
                        content: '❌ Moderation system not found.',
                        flags: ["Ephemeral"]
                    });
                }
                
                config.logChannel = selectedChannel;
                await config.save();
                
                await interaction.reply({
                    content: `✅ Log channel updated to <#${selectedChannel}>`,
                    flags: ["Ephemeral"]
                });
                
                // Update main panel
                const { updateMainPanel } = require('../handler/moderationHelpers');
                await updateMainPanel(client, interaction, config, interaction.user.id);
            } else {
                // Show channel select menu
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('cmd{mod-edit-log-channel}')
                            .setPlaceholder('Select Log Channel')
                            .addChannelTypes(ChannelType.GuildText)
                    );
                
                await interaction.reply({
                    content: '### Edit Log Channel\nSelect the channel where moderation logs will be sent:',
                    components: [row],
                    flags: ["Ephemeral"]
                });
            }
            
        } catch (error) {
            console.error('Error editing log channel:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while updating the log channel.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
