const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');

module.exports = {
    name: 'mod-remove-manager-roles',
    
    run: async (client, interaction, args) => {
        try {
            const config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            
            const options = [];
            
            config.banAppealSystem.appealManagerRoles.forEach(roleId => {
                options.push({
                    label: `Ban: ${interaction.guild.roles.cache.get(roleId)?.name || 'Unknown Role'}`,
                    value: `ban_${roleId}`,
                    emoji: '⛔'
                });
            });
            
            config.timeoutAppealSystem.appealManagerRoles.forEach(roleId => {
                options.push({
                    label: `Timeout: ${interaction.guild.roles.cache.get(roleId)?.name || 'Unknown Role'}`,
                    value: `timeout_${roleId}`,
                    emoji: '🔒'
                });
            });
            
            if (options.length === 0) {
                return await interaction.reply({
                    content: '❌ No manager roles to remove.',
                    flags: ["Ephemeral"]
                });
            }
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('cmd{mod-remove-role-select}')
                        .setPlaceholder('Select roles to remove')
                        .setMinValues(1)
                        .setMaxValues(options.length)
                        .addOptions(options)
                );
            
            await interaction.reply({
                content: '### Remove Appeal Manager Roles\nSelect the roles you want to remove:',
                components: [row],
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error showing remove roles menu:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
