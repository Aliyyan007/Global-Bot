const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-setup-log-manager-roles',
    
    run: async (client, interaction, args) => {
        try {
            // Check if user is authorized
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            const config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            
            if (!config) {
                return await interaction.reply({
                    content: '❌ Moderation system not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            let description = '### Current Log Manager Roles\n\n';
            
            if (config.logManagerRoles && config.logManagerRoles.length > 0) {
                config.logManagerRoles.forEach(roleId => {
                    description += `<@&${roleId}>\n`;
                });
            } else {
                description += 'No roles set (no pings in logs)\n';
            }
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('cmd{mod-add-log-manager-roles}')
                        .setLabel('Add Roles')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('➕'),
                    new ButtonBuilder()
                        .setCustomId('cmd{mod-remove-log-manager-roles}')
                        .setLabel('Remove Roles')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('➖'),
                    new ButtonBuilder()
                        .setCustomId('cmd{mod-skip-log-manager-roles}')
                        .setLabel('Skip (No Pings)')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⏭️')
                );
            
            await interaction.reply({
                content: description,
                components: [row],
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error in mod-setup-log-manager-roles:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
