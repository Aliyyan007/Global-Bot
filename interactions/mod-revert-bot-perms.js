const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const RoleRegexp = /role{(.*?)}restricted{(.*?)}/;

module.exports = {
    name: 'mod-revert-bot-perms',
    
    run: async (client, interaction, args) => {
        try {
            const roleMatch = RoleRegexp.exec(interaction.customId);
            if (!roleMatch) {
                return await interaction.reply({
                    content: '❌ Invalid button data.',
                    flags: ["Ephemeral"]
                });
            }
            
            const originalRoleId = roleMatch[1];
            const restrictedRoleId = roleMatch[2];
            const { guild } = interaction;
            
            // Fetch the roles
            const originalRole = guild.roles.cache.get(originalRoleId);
            const restrictedRole = guild.roles.cache.get(restrictedRoleId);
            
            if (!originalRole) {
                return await interaction.reply({
                    content: '❌ Original role not found. Cannot revert changes.',
                    flags: ["Ephemeral"]
                });
            }
            
            if (!restrictedRole) {
                return await interaction.reply({
                    content: '❌ Restricted role not found. Permissions may have already been reverted.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Get all members with the restricted role
            const membersWithRestrictedRole = restrictedRole.members;
            
            if (membersWithRestrictedRole.size === 0) {
                return await interaction.reply({
                    content: '❌ No bots found with the restricted role.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Revert: Remove restricted role and add back original role for all affected bots
            const revertedBots = [];
            for (const [, member] of membersWithRestrictedRole) {
                await member.roles.remove(restrictedRole, 'Moderation System: Reverting permission changes');
                await member.roles.add(originalRole, 'Moderation System: Reverting permission changes');
                revertedBots.push(member.user.tag);
            }
            
            // Delete the restricted role
            await restrictedRole.delete('Moderation System: Cleaning up restricted role');
            
            // Update the message
            const botsList = revertedBots.map(tag => `• ${tag}`).join('\n');
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Permissions Reverted')
                .setDescription(
                    `**Original Role:** <@&${originalRole.id}>\n` +
                    `**Affected Bots:** ${revertedBots.length}\n\n` +
                    `${botsList}\n\n` +
                    `**Action:** Permissions have been restored to the original role.\n\n` +
                    `⚠️ **Warning:** These bots now have moderation permissions again, which may conflict with the moderation system.`
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
