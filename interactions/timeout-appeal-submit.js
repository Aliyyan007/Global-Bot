const ModerationSystem = require('../schemas/moderationSystemSchema');
const ModerationAppeal = require('../schemas/moderationAppealSchema');
const UserAppealCount = require('../schemas/userAppealCountSchema');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'timeout_appeal_submit',
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
            if (!config || !config.timeoutAppealSystem.enabled) {
                return interaction.reply({
                    content: '❌ The timeout appeal system is not enabled.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Get member to check timeout info
            const member = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!member || !member.communicationDisabledUntil) {
                return interaction.reply({
                    content: '❌ Unable to retrieve timeout information.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Get audit log to find who timed out the user
            let moderatorId = 'Unknown';
            let moderatorUsername = 'Unknown';
            let reason = 'No reason provided';
            
            try {
                const auditLogs = await guild.fetchAuditLogs({
                    type: 24, // MEMBER_UPDATE
                    limit: 10
                });
                
                const timeoutLog = auditLogs.entries.find(entry => 
                    entry.target.id === interaction.user.id && 
                    entry.changes.some(change => change.key === 'communication_disabled_until')
                );
                
                if (timeoutLog) {
                    moderatorId = timeoutLog.executor.id;
                    moderatorUsername = timeoutLog.executor.tag;
                    reason = timeoutLog.reason || 'No reason provided';
                }
            } catch (error) {
                console.error('Error fetching audit logs:', error);
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
            
            // Calculate duration
            const duration = member.communicationDisabledUntil 
                ? Math.ceil((member.communicationDisabledUntil - Date.now()) / 1000) + 's'
                : null;
            
            // Create appeal
            const appeal = await ModerationAppeal.create({
                userId: interaction.user.id,
                username: interaction.user.tag,
                guildId: guildId,
                appealType: 'timeout',
                moderatorId: moderatorId,
                moderatorUsername: moderatorUsername,
                reason: reason,
                duration: duration,
                answers: answers,
                status: 'pending',
                timestamp: new Date()
            });
            
            // Increment appeal count
            await UserAppealCount.findOneAndUpdate(
                { userId: interaction.user.id, guildId: guildId },
                { $inc: { timeoutAppeals: 1 } },
                { upsert: true }
            );
            
            // Send to appeal channel
            const appealChannel = guild.channels.cache.get(config.timeoutAppealSystem.appealChannel);
            if (appealChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('⏱️ New Timeout Appeal')
                    .setDescription(
                        `**User:** ${interaction.user.tag} (<@${interaction.user.id}>)\n` +
                        `**User ID:** \`${interaction.user.id}\`\n` +
                        `**Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                        `**Timed Out By:** ${moderatorUsername}\n` +
                        `**Timeout Reason:** ${reason}\n` +
                        `**Timeout Expires:** <t:${Math.floor(member.communicationDisabledUntil / 1000)}:R>\n\n` +
                        `**Appeal Answers:**`
                    )
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setTimestamp();
                
                // Add questions and answers
                config.timeoutAppealSystem.questions.forEach((question, index) => {
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
                content: '✅ **Appeal Submitted Successfully!**\n\nYour timeout appeal has been submitted to the server moderators. You will be notified of their decision.',
                flags: ["Ephemeral"]
            });
            
        } catch (error) {
            console.error('Error submitting timeout appeal:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while submitting your appeal.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
