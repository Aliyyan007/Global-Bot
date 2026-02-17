const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-select-log-manager-roles',
    
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
            
            // Add roles without duplicates
            for (const roleId of selectedRoles) {
                if (!config.logManagerRoles.includes(roleId)) {
                    config.logManagerRoles.push(roleId);
                }
            }
            
            await config.save();
            
            const rolesMention = selectedRoles.map(r => `<@&${r}>`).join(', ');
            await interaction.update({
                content: `✅ Log manager roles added: ${rolesMention}`,
                components: []
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error selecting log manager roles:', error);
            await interaction.reply({
                content: '❌ An error occurred while adding roles.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};
