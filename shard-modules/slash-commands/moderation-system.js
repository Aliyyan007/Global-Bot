const { Collection, MessageFlags } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');
const { createMainPanelEmbed, createMainPanelComponents } = require('../handler/moderationHelpers');

module.exports = {
    name: 'moderation-system',
    description: 'Configure the server moderation and appeal system',
    options: [],
    permissions: ['Administrator'],
    group: 'moderation-group',
    cooldowns: new Collection(),
    
    run: async (client, interaction, args) => {
        try {
            const { guild } = interaction;
            
            // Fetch or create moderation system config
            let config = await ModerationSystem.findOne({ guildId: guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: guild.id });
            }
            
            // Create the main panel container (Compact V2 style)
            const container = createMainPanelEmbed(config, guild, interaction.user.id);
            
            // Create buttons and select menu
            const components = createMainPanelComponents(config, interaction.user.id);
            
            await interaction.reply({
                components: [container, ...components],
                flags: [MessageFlags.IsComponentsV2]
            });
            
        } catch (error) {
            console.error('Error in moderation-system command:', error);
            await interaction.reply({
                content: '❌ An error occurred while loading the moderation system.',
                flags: ["Ephemeral"]
            });
        }
    }
};
