const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-skip-log-manager-roles',
    
    run: async (client, interaction, args) => {
        try {
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                return await interaction.reply({
                    content: '❌ Moderation system not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Clear all log manager roles
            config.logManagerRoles = [];
            await config.save();
            
            await interaction.reply({
                content: '✅ Log manager roles cleared. No roles will be pinged in logs.',
                flags: ["Ephemeral"]
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error skipping log manager roles:', error);
            await interaction.reply({
                content: '❌ An error occurred.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};
