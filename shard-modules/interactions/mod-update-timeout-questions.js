const ModerationSystem = require('../schemas/moderationSystemSchema');

module.exports = {
    name: 'mod-update-timeout-questions',
    isModal: true,
    
    run: async (client, interaction, args) => {
        try {
            const questions = [];
            for (let i = 1; i <= 5; i++) {
                const value = interaction.fields.getTextInputValue(`question_${i}`).trim();
                // Only add non-empty questions
                if (value) {
                    questions.push(value);
                }
            }
            
            // Ensure at least 3 questions (required)
            if (questions.length < 3) {
                return interaction.reply({
                    content: '❌ You must provide at least 3 questions (the first 3 are required).',
                    flags: ["Ephemeral"]
                });
            }
            
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: interaction.guild.id });
            }
            
            config.timeoutAppealSystem.questions = questions;
            await config.save();
            
            await interaction.reply({
                content: `✅ Timeout appeal questions have been updated successfully! (${questions.length} questions saved)`,
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error updating timeout questions:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
