const { ActionRowBuilder, RoleSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'mod-add-log-manager-roles',
    
    run: async (client, interaction, args) => {
        try {
            const roleSelectMenu = new ActionRowBuilder()
                .addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('cmd{mod-select-log-manager-roles}')
                        .setPlaceholder('Select Log Manager Roles')
                        .setMinValues(1)
                        .setMaxValues(10)
                );
            
            await interaction.reply({
                content: '### Add Log Manager Roles\nSelect the roles that will be pinged in moderation logs:',
                components: [roleSelectMenu],
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error in mod-add-log-manager-roles:', error);
            await interaction.reply({
                content: '❌ An error occurred.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};
