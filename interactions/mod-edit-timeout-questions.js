const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');

module.exports = {
    name: 'mod-edit-timeout-questions',
    
    run: async (client, interaction, args) => {
        try {
            const config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            const questions = config.timeoutAppealSystem.questions;
            
            const modal = new ModalBuilder()
                .setCustomId('cmd{mod-update-timeout-questions}')
                .setTitle('Edit Timeout Appeal Questions');
            
            // First 3 questions are required, last 2 are optional
            for (let i = 0; i < 5; i++) {
                const isRequired = i < 3;
                const input = new TextInputBuilder()
                    .setCustomId(`question_${i + 1}`)
                    .setLabel(`Question ${i + 1}${isRequired ? ' (Required)' : ' (Optional)'}`)
                    .setStyle(TextInputStyle.Short)
                    .setValue(questions[i] || '')
                    .setRequired(false) // Allow empty for optional questions
                    .setMaxLength(45); // 45 character limit
                
                modal.addComponents(new ActionRowBuilder().addComponents(input));
            }
            
            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('Error showing timeout questions modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
