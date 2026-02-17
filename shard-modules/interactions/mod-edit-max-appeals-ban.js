const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-edit-max-appeals-ban',
    isModal: true,
    
    run: async (client, interaction, args) => {
        try {
            const maxAppeals = parseInt(interaction.fields.getTextInputValue('max_appeals'));
            
            if (isNaN(maxAppeals) || maxAppeals < 1 || maxAppeals > 10) {
                return await interaction.reply({
                    content: '❌ Please enter a valid number between 1 and 10.',
                    flags: ["Ephemeral"]
                });
            }
            
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: interaction.guild.id });
            }
            
            config.banAppealSystem.maxAppealsPerUser = maxAppeals;
            await config.save();
            
            await interaction.reply({
                content: `✅ Maximum ban appeals per user has been set to: ${maxAppeals}`,
                flags: ["Ephemeral"]
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error editing max ban appeals:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
