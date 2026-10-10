const { EmbedBuilder } = require('discord.js');

const UserRegexp = /usr{(.*?)}/;
const BotRegexp = /bot{(.*?)}/;

module.exports = {
    name: 'mod-perm-x',
    
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
            
            // Fetch the bot member
            const botMember = await guild.members.fetch(botId).catch(() => null);
            
            if (!botMember || !botMember.user.bot) {
                const embed = new EmbedBuilder()
                    .setColor(0x2F2F46)
                    .setDescription(`**Error**\n\nBot not found in server.`);
                
                return await interaction.update({
                    embeds: [embed],
                    components: []
                });
            }
            
            // Update message immediately to show canceled
            const canceledEmbed = new EmbedBuilder()
                .setColor(0x2F2F46)
                .setThumbnail(botMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`#\n${botMember.user.username}\n<@${botMember.id}>\n###\n**Canceled**`);
            
            await interaction.update({
                embeds: [canceledEmbed],
                components: []
            });
            
        } catch (error) {
            console.error('Error in mod-perm-x:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
