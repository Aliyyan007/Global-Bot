const { ActionRowBuilder, RoleSelectMenuBuilder } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');

module.exports = {
    name: 'mod-remove-log-manager-roles',
    
    run: async (client, interaction, args) => {
        try {
            const config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            
            if (!config || !config.logManagerRoles || config.logManagerRoles.length === 0) {
                return await interaction.reply({
                    content: '❌ No log manager roles to remove.',
                    flags: ["Ephemeral"]
                });
            }
            
            const roleSelectMenu = new ActionRowBuilder()
                .addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('cmd{mod-remove-log-manager-roles-select}')
                        .setPlaceholder('Select roles to remove')
                        .setMinValues(1)
                        .setMaxValues(Math.min(config.logManagerRoles.length, 25))
                );
            
            await interaction.reply({
                content: '### Remove Log Manager Roles\nSelect the roles you want to remove:',
                components: [roleSelectMenu],
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error in mod-remove-log-manager-roles:', error);
            await interaction.reply({
                content: '❌ An error occurred.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};
