const { ActionRowBuilder, RoleSelectMenuBuilder } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');
const { createMainPanelEmbed, createMainPanelComponents } = require('../handler/moderationHelpers');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-enable-ban-appeal',
    
    run: async (client, interaction, args) => {
        try {
            // Check if user is authorized
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: interaction.guild.id });
            }
            
            // If already enabled, disable it and clear data
            if (config.banAppealSystem.enabled) {
                config.banAppealSystem.enabled = false;
                config.banAppealSystem.appealManagerRoles = [];
                config.banAppealSystem.appealChannel = null;
                config.banAppealSystem.mutualServerLink = null;
                await config.save();
                
                const container = createMainPanelEmbed(config, interaction.guild, interaction.user.id);
                const components = createMainPanelComponents(config, interaction.user.id);
                
                await interaction.update({
                    components: [container, ...components]
                });
                
                return;
            }
            
            // Step 1: Select Appeal Manager Roles
            const roleSelectMenu = new ActionRowBuilder()
                .addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('cmd{mod-select-ban-roles}')
                        .setPlaceholder('Select Appeal Manager Roles')
                        .setMinValues(1)
                        .setMaxValues(10)
                );
            
            await interaction.reply({
                content: '### Step 1: Select Appeal Manager Roles\nPlease select the roles that will be able to manage ban appeals.',
                components: [roleSelectMenu],
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error enabling ban appeal system:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while enabling the appeal system.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
