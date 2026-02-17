const { ActionRowBuilder, RoleSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'mod-add-manager-roles',
    
    run: async (client, interaction, args) => {
        try {
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('cmd{mod-add-ban-roles}')
                        .setPlaceholder('Add Ban Appeal Manager Roles')
                        .setMinValues(1)
                        .setMaxValues(10)
                );
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('cmd{mod-add-timeout-roles}')
                        .setPlaceholder('Add Timeout Appeal Manager Roles')
                        .setMinValues(1)
                        .setMaxValues(10)
                );
            
            await interaction.reply({
                content: '### Add Appeal Manager Roles\nSelect roles for each appeal type:',
                components: [row1, row2],
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error showing add roles menu:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
