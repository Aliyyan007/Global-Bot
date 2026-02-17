const { ActionRowBuilder, RoleSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-setup-log-channel',
    
    run: async (client, interaction, args) => {
        try {
            // Check if user is authorized
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            const selectedChannel = interaction.values[0];
            
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: interaction.guild.id });
            }
            
            // Save log channel
            config.logChannel = selectedChannel;
            await config.save();
            
            // Step 2: Ask for manager roles
            const roleSelectMenu = new ActionRowBuilder()
                .addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId(`cmd{mod-setup-manager-roles}usr{${interaction.user.id}}`)
                        .setPlaceholder('Select Manager Roles')
                        .setMinValues(1)
                        .setMaxValues(10)
                );
            
            const skipButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`cmd{mod-setup-skip-manager-roles}usr{${interaction.user.id}}`)
                        .setLabel('Skip (No Pings)')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⏭️')
                );
            
            await interaction.update({
                content: `### ✅ Log Channel Set: <#${selectedChannel}>\n\n` +
                         '**Step 2: Select Manager Roles**\n' +
                         'Select the roles that will be pinged/highlighted in the log channel when moderation actions occur.\n\n' +
                         'You can also skip this step if you don\'t want any role pings.',
                components: [roleSelectMenu, skipButton]
            });
            
        } catch (error) {
            console.error('Error in mod-setup-log-channel:', error);
            await interaction.reply({
                content: '❌ An error occurred while setting up the log channel.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};
