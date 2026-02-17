const ModerationSystem = require('../schemas/moderationSystemSchema');
const { updateMainPanel } = require('../handler/moderationHelpers');

module.exports = {
    name: 'mod-ban-mutual-link',
    isModal: true,
    
    run: async (client, interaction, args) => {
        try {
            const serverLink = interaction.fields.getTextInputValue('server_link');
            
            // Validate the link format
            if (!serverLink.includes('discord.gg/') && !serverLink.includes('discord.com/invite/')) {
                return await interaction.reply({
                    content: '❌ Please provide a valid Discord invite link.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Extract invite code from the link
            let inviteCode = serverLink;
            if (serverLink.includes('discord.gg/')) {
                inviteCode = serverLink.split('discord.gg/')[1].split(/[?&\s]/)[0];
            } else if (serverLink.includes('discord.com/invite/')) {
                inviteCode = serverLink.split('discord.com/invite/')[1].split(/[?&\s]/)[0];
            }
            
            // Fetch invite information to get the guild ID
            let inviteGuildId = null;
            try {
                const invite = await client.fetchInvite(inviteCode);
                inviteGuildId = invite.guild.id;
            } catch (error) {
                console.error('Error fetching invite:', error);
                return await interaction.reply({
                    content: '❌ Unable to fetch invite information. Please make sure the invite link is valid and not expired.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Check if bot is in the mutual server
            const mutualGuild = client.guilds.cache.get(inviteGuildId);
            if (!mutualGuild) {
                return await interaction.reply({
                    content: `❌ The bot is not in the mutual server. Please invite the bot to the server first, then try again.\n\n**Server ID:** \`${inviteGuildId}\`\n**Invite Link:** ${serverLink}`,
                    flags: ["Ephemeral"]
                });
            }
            
            // Get stored data
            const tempData = client.tempData || {};
            const roles = tempData[`${interaction.user.id}_ban_roles`] || [];
            const channel = tempData[`${interaction.user.id}_ban_channel`];
            
            // Default questions
            const defaultQuestions = [
                'Why do you think you were banned from the server?',
                'Do you accept that you broke a server rule? (Yes / No — explain)',
                'Why should the staff give you another chance?',
                'What changes will you make if you are unbanned?',
                'Is there any extra information or proof you want to share?'
            ];
            
            // Update database
            let config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = await ModerationSystem.create({ guildId: interaction.guild.id });
            }
            
            config.banAppealSystem.enabled = true;
            config.banAppealSystem.appealManagerRoles = roles;
            config.banAppealSystem.appealChannel = channel;
            config.banAppealSystem.mutualServerLink = serverLink;
            config.banAppealSystem.mutualServerGuildId = inviteGuildId; // Store the guild ID for future reference
            config.banAppealSystem.questions = defaultQuestions;
            
            await config.save();
            
            // Clean up temp data
            delete tempData[`${interaction.user.id}_ban_roles`];
            delete tempData[`${interaction.user.id}_ban_channel`];
            
            await interaction.reply({
                content: `✅ Ban appeal system has been enabled successfully!\n\n**Mutual Server:** ${mutualGuild.name}\n**Server ID:** \`${inviteGuildId}\``,
                flags: ["Ephemeral"]
            });
            
            // Update main panel
            await updateMainPanel(client, interaction, config, interaction.user.id);
            
        } catch (error) {
            console.error('Error setting up ban appeal system:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while setting up the appeal system.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
