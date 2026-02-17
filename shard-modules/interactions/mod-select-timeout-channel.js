const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-select-timeout-channel',
    
    run: async (client, interaction, args) => {
        try {
            const selectedChannel = interaction.values[0];
            
            // Get stored data
            const tempData = client.tempData || {};
            const roles = tempData[`${interaction.user.id}_timeout_roles`] || [];
            
            // Default questions
            const defaultQuestions = [
                'Why do you think you were timed out?',
                'Do you believe the timeout was fair? Why or why not?',
                'Do you understand the rule you broke? (Yes / No — explain if yes)',
                'What will you do to avoid getting timed out again?',
                'Is there anything else you want the moderators to know?'
            ];
            
            // Update database directly - no modal needed
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: interaction.guild.id });
            }
            
            config.timeoutAppealSystem.enabled = true;
            config.timeoutAppealSystem.appealManagerRoles = roles;
            config.timeoutAppealSystem.appealChannel = selectedChannel;
            config.timeoutAppealSystem.questions = defaultQuestions;
            
            await config.save();
            
            // Clean up temp data
            delete tempData[`${interaction.user.id}_timeout_roles`];
            
            await interaction.reply({
                content: '✅ Timeout appeal system has been enabled successfully!',
                flags: ["Ephemeral"]
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error setting up timeout appeal system:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
