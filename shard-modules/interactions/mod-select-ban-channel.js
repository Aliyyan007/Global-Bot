const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    name: 'mod-select-ban-channel',
    
    run: async (client, interaction, args) => {
        try {
            const selectedChannel = interaction.values[0];
            
            // Store channel
            client.tempData = client.tempData || {};
            client.tempData[`${interaction.user.id}_ban_channel`] = selectedChannel;
            
            // Step 3: Ask for mutual server link only
            const modal = new ModalBuilder()
                .setCustomId('cmd{mod-ban-mutual-link}')
                .setTitle('Mutual Server Link');
            
            const linkInput = new TextInputBuilder()
                .setCustomId('server_link')
                .setLabel('Mutual Server Invite Link')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://discord.gg/...')
                .setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(linkInput));
            
            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('Error selecting ban appeal channel:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
