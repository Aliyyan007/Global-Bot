const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-remove-role-select',
    
    run: async (client, interaction, args) => {
        try {
            const selectedValues = interaction.values;
            
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                return await interaction.reply({
                    content: '❌ Configuration not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            selectedValues.forEach(value => {
                const [type, roleId] = value.split('_');
                
                if (type === 'ban') {
                    config.banAppealSystem.appealManagerRoles = config.banAppealSystem.appealManagerRoles.filter(r => r !== roleId);
                } else if (type === 'timeout') {
                    config.timeoutAppealSystem.appealManagerRoles = config.timeoutAppealSystem.appealManagerRoles.filter(r => r !== roleId);
                }
            });
            
            await config.save();
            
            await interaction.reply({
                content: `✅ Removed ${selectedValues.length} role(s) from appeal managers.`,
                flags: ["Ephemeral"]
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error removing roles:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
