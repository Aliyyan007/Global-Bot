const ModerationSystem = require('../schemas/moderationSystemSchema');
const { createMainPanelEmbed, createMainPanelComponents, updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-edit-log-channel',
    
    run: async (client, interaction, args) => {
        try {
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
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error editing log channel:', error);
            await interaction.reply({
                content: '❌ An error occurred while updating the log channel.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};
