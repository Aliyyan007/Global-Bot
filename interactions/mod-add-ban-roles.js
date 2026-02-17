const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-add-ban-roles',
    
    run: async (client, interaction, args) => {
        try {
            const selectedRoles = interaction.values;
            
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: interaction.guild.id });
            }
            
            // Add roles without duplicates
            const existingRoles = new Set(config.banAppealSystem.appealManagerRoles);
            selectedRoles.forEach(role => existingRoles.add(role));
            config.banAppealSystem.appealManagerRoles = Array.from(existingRoles);
            
            await config.save();
            
            await interaction.reply({
                content: `✅ Added ${selectedRoles.length} role(s) to ban appeal managers.`,
                flags: ["Ephemeral"]
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error adding ban manager roles:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
