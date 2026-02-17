const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');

module.exports = {
    name: 'mod-select-ban-roles',
    
    run: async (client, interaction, args) => {
        try {
            const selectedRoles = interaction.values;
            
            // Store in temp data
            client.tempData = client.tempData || {};
            client.tempData[`${interaction.user.id}_ban_roles`] = selectedRoles;
            
            // Step 2: Select Appeal Channel
            const channelSelectMenu = new ActionRowBuilder()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('cmd{mod-select-ban-channel}')
                        .setPlaceholder('Select Appeal Channel')
                        .addChannelTypes(ChannelType.GuildText)
                );
            
            await interaction.update({
                content: '### Step 2: Select Appeal Channel\nPlease select the channel where ban appeals will be posted.',
                components: [channelSelectMenu]
            });
            
        } catch (error) {
            console.error('Error selecting ban manager roles:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
