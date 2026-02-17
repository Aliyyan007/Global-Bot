const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-remove-log-manager-roles-select',
    
    run: async (client, interaction, args) => {
        try {
            const selectedRoles = interaction.values;
            
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                return await interaction.reply({
                    content: '❌ Moderation system not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Remove selected roles
            config.logManagerRoles = config.logManagerRoles.filter(roleId => !selectedRoles.includes(roleId));
            await config.save();
            
            const rolesMention = selectedRoles.map(r => `<@&${r}>`).join(', ');
            await interaction.update({
                content: `✅ Log manager roles removed: ${rolesMention}`,
                components: []
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error removing log manager roles:', error);
            await interaction.reply({
                content: '❌ An error occurred while removing roles.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};
