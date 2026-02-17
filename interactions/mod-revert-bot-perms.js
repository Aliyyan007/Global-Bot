const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const BotRegexp = /bot{(.*?)}/;

module.exports = {
    name: 'mod-revert-bot-perms',
    
    run: async (client, interaction, args) => {
        try {
            const botIdMatch = BotRegexp.exec(interaction.customId);
            if (!botIdMatch) {
                return await interaction.reply({
                    content: '❌ Invalid button data.',
                    flags: ["Ephemeral"]
                });
            }
            
            const botId = botIdMatch[1];
            const { guild } = interaction;
            
            // Fetch the bot member
            const botMember = await guild.members.fetch(botId).catch(() => null);
            if (!botMember) {
                return await interaction.reply({
                    content: '❌ Bot not found in this server.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Find the safe role (with ❗)
            const botRoles = botMember.roles.cache;
            const safeRole = botRoles.find(role => role.name.endsWith(' ❗'));
            
            if (!safeRole) {
                return await interaction.reply({
                    content: '❌ No safe role found for this bot. Permissions may have already been reverted.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Find the original role (without ❗)
            const originalRoleName = safeRole.name.replace(' ❗', '');
            const originalRole = guild.roles.cache.find(r => r.name === originalRoleName);
            
            if (!originalRole) {
                return await interaction.reply({
                    content: '❌ Original role not found. Cannot revert changes.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Revert: Remove safe role and add back original role
            await botMember.roles.remove(safeRole, 'Moderation System: Reverting permission changes');
            await botMember.roles.add(originalRole, 'Moderation System: Reverting permission changes');
            
            // Delete the safe role if no one else is using it
            if (safeRole.members.size === 0) {
                await safeRole.delete('Moderation System: Cleaning up unused safe role');
            }
            
            // Update the message
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Permissions Reverted')
                .setDescription(
                    `**Bot:** ${botMember.user.tag}\n` +
                    `**Action:** Permissions have been restored to the original role.\n\n` +
                    `⚠️ **Warning:** This bot now has moderation permissions again, which may conflict with the moderation system.`
                )
                .setTimestamp();
            
            await interaction.update({
                embeds: [embed],
                components: []
            });
            
        } catch (error) {
            console.error('Error reverting bot permissions:', error);
            await interaction.reply({
                content: '❌ An error occurred while reverting permissions.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};
