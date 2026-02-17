const ModerationSystem = require('../schemas/moderationSystemSchema');
const ModerationAppeal = require('../schemas/moderationAppealSchema');
const UserAppealCount = require('../schemas/userAppealCountSchema');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'ban_appeal_submit',
    isModal: true,
    
    run: async (client, interaction, args) => {
        try {
            const guildId = interaction.customId.split('_')[3];
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) {
                return interaction.reply({
                    content: '❌ Unable to find the server.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Get config
            const config = await ModerationSystem.findOne({ guildId: guildId });
            if (!config || !config.banAppealSystem.enabled) {
                return interaction.reply({
                    content: '❌ The ban appeal system is not enabled.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Get ban information to find moderator
            const banInfo = await guild.bans.fetch(interaction.user.id).catch(() => null);
            if (!banInfo) {
                return interaction.reply({
                    content: '❌ Unable to retrieve ban information.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Extract moderator info from ban reason if available
            let moderatorId = 'Unknown';
            let moderatorUsername = 'Unknown';
            const reason = banInfo.reason || 'No reason provided';
            
            // Try to extract moderator from reason format: "reason | Banned by username"
            const moderatorMatch = reason.match(/\| Banned by (.+)$/);
            if (moderatorMatch) {
                moderatorUsername = moderatorMatch[1];
            }
            
            // Get answers - fix the method call
            const answers = [];
            for (let i = 0; i < 5; i++) {
                try {
                    const answer = interaction.fields.getTextInputValue(`question_${i}`);
                    if (answer) answers.push(answer);
                } catch (error) {
                    // Question doesn't exist, skip it
                    break;
                }
            }
            
            // Create appeal
            const appeal = await ModerationAppeal.create({
                userId: interaction.user.id,
                username: interaction.user.tag,
                guildId: guildId,
                appealType: 'ban',
                moderatorId: moderatorId,
                moderatorUsername: moderatorUsername,
                reason: reason,
                answers: answers,
                status: 'pending',
                timestamp: new Date()
            });
            
            // Increment appeal count
            await UserAppealCount.findOneAndUpdate(
                { userId: interaction.user.id, guildId: guildId },
                { $inc: { banAppeals: 1 } },
                { upsert: true }
            );
            
            // Send to appeal channel
            const appealChannel = guild.channels.cache.get(config.banAppealSystem.appealChannel);
            if (appealChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('🔨 New Ban Appeal')
                    .setDescription(
                        `**User:** ${interaction.user.tag} (<@${interaction.user.id}>)\n` +
                        `**User ID:** \`${interaction.user.id}\`\n` +
                        `**Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                        `**Banned By:** ${moderatorUsername}\n` +
                        `**Ban Reason:** ${reason}\n\n` +
                        `**Appeal Answers:**`
                    )
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setTimestamp();
                
                // Add questions and answers
                config.banAppealSystem.questions.forEach((question, index) => {
                    if (answers[index]) {
                        embed.addFields({
                            name: question,
                            value: answers[index].substring(0, 1024)
                        });
                    }
                });
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`appeal_approve_${appeal._id}`)
                            .setLabel('Approve')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅'),
                        new ButtonBuilder()
                            .setCustomId(`appeal_deny_${appeal._id}`)
                            .setLabel('Deny')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                    );
                
                const appealMessage = await appealChannel.send({ embeds: [embed], components: [row] });
                
                // Update appeal with message ID
                await ModerationAppeal.findByIdAndUpdate(appeal._id, { appealMessageId: appealMessage.id });
            }
            
            await interaction.reply({
                content: '✅ **Appeal Submitted Successfully!**\n\nYour ban appeal has been submitted to the server moderators. You will be notified of their decision.',
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error submitting ban appeal:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while submitting your appeal.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
