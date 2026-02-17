const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-edit-prefix',
    isModal: true,
    
    run: async (client, interaction, args) => {
        try {
            const newPrefix = interaction.fields.getTextInputValue('prefix');
            
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: interaction.guild.id });
            }
            
            config.prefix = newPrefix;
            await config.save();
            
            await interaction.reply({
                content: `✅ Prefix has been updated to: \`${newPrefix}\``,
                flags: ["Ephemeral"]
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error editing prefix:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
