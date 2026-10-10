const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { removePermissionsFromBots } = require('../handler/permissionRemovalHelper');

const UserRegexp = /usr{(.*?)}/;
const BotRegexp = /bot{(.*?)}/;

module.exports = {
    name: 'mod-perm-ok',
    
    run: async (client, interaction, args) => {
        try {
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            const botIdMatch = BotRegexp.exec(interaction.customId);
            if (!botIdMatch) {
                return await interaction.reply({
                    content: '❌ Invalid bot ID.',
                    flags: ["Ephemeral"]
                });
            }
            
            const botId = botIdMatch[1];
            const { guild } = interaction;
            
            // Respond immediately to avoid timeout
            await interaction.deferUpdate();
            
            // Fetch the bot member
            const botMember = await guild.members.fetch(botId).catch(() => null);
            
            if (!botMember || !botMember.user.bot) {
                const embed = new EmbedBuilder()
                    .setColor(0x2F2F46)
                    .setDescription(`**Error**\n\nBot not found in server.`);
                
                return await interaction.editReply({
                    embeds: [embed],
                    components: []
                });
            }
            
            // Update message immediately to show processing
            const processingEmbed = new EmbedBuilder()
                .setColor(0x2F2F46)
                .setThumbnail(botMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`#\n${botMember.user.username}\n<@${botMember.id}>\n###\n**Processing...**`);
            
            await interaction.editReply({
                embeds: [processingEmbed],
                components: []
            });
            
            // Process removal in background
            removePermissionsFromBots([botMember], guild).then(() => {
                // Update to confirmed
                const confirmedEmbed = new EmbedBuilder()
                    .setColor(0x2F2F46)
                    .setThumbnail(botMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setDescription(`#\n${botMember.user.username}\n<@${botMember.id}>\n###\n**Confirmed**`);
                
                interaction.editReply({
                    embeds: [confirmedEmbed],
                    components: []
                }).catch(() => {});
            }).catch((error) => {
                console.error('Error removing permissions:', error);
                
                // Update to error
                const errorEmbed = new EmbedBuilder()
                    .setColor(0x2F2F46)
                    .setThumbnail(botMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setDescription(`#\n${botMember.user.username}\n<@${botMember.id}>\n###\n**Error processing removal**`);
                
                interaction.editReply({
                    embeds: [errorEmbed],
                    components: []
                }).catch(() => {});
            });
            
        } catch (error) {
            console.error('Error in mod-perm-ok:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};

// Function moved to handler/permissionRemovalHelper.js to avoid duplication
