const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    name: 'mod-max-appeals-timeout',
    
    run: async (client, interaction, args) => {
        try {
            const modal = new ModalBuilder()
                .setCustomId('cmd{mod-edit-max-appeals-timeout}')
                .setTitle('Max Timeout Appeals Per User');
            
            const input = new TextInputBuilder()
                .setCustomId('max_appeals')
                .setLabel('Maximum Appeals Per User (1-10)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter a number between 1 and 10')
                .setRequired(true)
                .setMaxLength(2);
            
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            
            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('Error showing max appeals modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
