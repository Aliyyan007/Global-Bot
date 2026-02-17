const { EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');
const { createMainPanelEmbed, createMainPanelComponents } = require('../handler/moderationHelpers');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-setup-skip-manager-roles',
    
    run: async (client, interaction, args) => {
        try {
            // Check if user is authorized
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            const { guild } = interaction;
            
            let config = await ModerationSystem.findOne({ guildId: guild.id });
            if (!config) {
                return await interaction.reply({
                    content: '❌ Configuration not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Skip manager roles (empty array)
            config.logManagerRoles = [];
            config.enabled = true;
            await config.save();
            
            // Update the original panel
            const container = createMainPanelEmbed(config, guild, interaction.user.id);
            const components = createMainPanelComponents(config, interaction.user.id);
            
            try {
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const panelMessage = messages.find(msg => 
                    msg.author.id === client.user.id && 
                    msg.components.length > 0 &&
                    msg.components.some(row => row.components.some(c => c.customId?.includes('mod-toggle-system')))
                );
                
                if (panelMessage) {
                    await panelMessage.edit({ components: [container, ...components] });
                }
            } catch (error) {
                console.error('Error updating panel:', error);
            }
            
            // Show completion message
            await interaction.update({
                content: `### ✅ Setup Complete!\n\n` +
                         `**Log Channel:** <#${config.logChannel}>\n` +
                         `**Manager Roles:** None (no pings)\n\n` +
                         `The moderation system is now enabled. Removing permissions from other bots...`,
                components: []
            });
            
            // Send initial message to log channel
            await sendLogChannelSetupMessage(client, guild, config);
            
            // Start permission removal process
            await removeBotsPermissions(client, guild, config, interaction);
            
        } catch (error) {
            console.error('Error in mod-setup-skip-manager-roles:', error);
            await interaction.reply({
                content: '❌ An error occurred during setup.',
                flags: ["Ephemeral"]
            }).catch(() => {});
        }
    }
};

async function sendLogChannelSetupMessage(client, guild, config) {
    try {
        const logChannel = await guild.channels.fetch(config.logChannel);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🛡️ Moderation System Enabled')
            .setDescription(
                '**The moderation system has been successfully enabled!**\n\n' +
                '**What happens now:**\n' +
                '• All moderation actions will be logged here\n' +
                '• Other bots\' moderation permissions are being removed\n' +
                '• You\'ll receive notifications about permission changes\n\n' +
                `**Available Commands:**\n` +
                `\`${config.prefix}ban @user (duration) (reason)\`\n` +
                `\`${config.prefix}unban @user\`\n` +
                `\`${config.prefix}kick @user (reason)\`\n` +
                `\`${config.prefix}timeout @user (duration) (reason)\`\n` +
                `\`${config.prefix}timeout remove @user\``
            )
            .setTimestamp();
        
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending log channel setup message:', error);
    }
}

async function removeBotsPermissions(client, guild, config, interaction) {
    try {
        const logChannel = await guild.channels.fetch(config.logChannel);
        if (!logChannel) return;
        
        const members = await guild.members.fetch();
        const bots = members.filter(member => 
            member.user.bot && member.user.id !== client.user.id
        );
        
        const botsToProcess = [];
        
        for (const [memberId, botMember] of bots) {
            const hasBan = botMember.permissions.has(PermissionFlagsBits.BanMembers);
            const hasKick = botMember.permissions.has(PermissionFlagsBits.KickMembers);
            const hasTimeout = botMember.permissions.has(PermissionFlagsBits.ModerateMembers);
            const hasAdmin = botMember.permissions.has(PermissionFlagsBits.Administrator);
            
            if (hasBan || hasKick || hasTimeout || hasAdmin) {
                botsToProcess.push({
                    member: botMember,
                    permissions: {
                        ban: hasBan,
                        kick: hasKick,
                        timeout: hasTimeout,
                        admin: hasAdmin
                    }
                });
            }
        }
        
        if (botsToProcess.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ No Bots to Process')
                .setDescription('No other bots with moderation permissions were found.')
                .setTimestamp();
            
            await logChannel.send({ embeds: [embed] });
            return;
        }
        
        // Send messages for each bot with revert button
        for (const botData of botsToProcess) {
            await sendBotPermissionMessage(logChannel, botData, config, guild);
        }
        
    } catch (error) {
        console.error('Error removing bots permissions:', error);
    }
}

async function sendBotPermissionMessage(logChannel, botData, config, guild) {
    try {
        const { member, permissions } = botData;
        
        const removedPerms = [];
        if (permissions.admin) removedPerms.push('Administrator');
        if (permissions.ban) removedPerms.push('Ban Members');
        if (permissions.kick) removedPerms.push('Kick Members');
        if (permissions.timeout) removedPerms.push('Timeout Members');
        
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('⚠️ Bot Permissions Removed')
            .setDescription(
                `**Bot:** ${member.user.tag} (${member.user.id})\n` +
                `**Mention:** <@${member.user.id}>\n\n` +
                `**Removed Permissions:**\n${removedPerms.map(p => `• ${p}`).join('\n')}\n\n` +
                `**Reason:** Moderation system enabled - only this bot should have moderation permissions.\n\n` +
                `⚠️ **It is recommended to keep these permissions removed.**\n` +
                `You can revert these changes using the button below, but it may cause conflicts.\n\n` +
                `⏱️ **This button will expire in 2 minutes.**`
            )
            .setTimestamp();
        
        const revertButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`cmd{mod-revert-bot-perms}bot{${member.user.id}}`)
                    .setLabel('Revert Changes')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄')
            );
        
        const message = await logChannel.send({ 
            embeds: [embed],
            components: [revertButton]
        });
        
        // Disable button after 2 minutes
        setTimeout(async () => {
            try {
                const disabledButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`mod-revert-bot-perms-expired`)
                            .setLabel('Revert Changes (Expired)')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔄')
                            .setDisabled(true)
                    );
                
                await message.edit({ components: [disabledButton] });
            } catch (error) {
                console.error('Error disabling revert button:', error);
            }
        }, 120000); // 2 minutes
        
        // Actually remove the permissions
        await removePermissionsFromBot(member, guild);
        
    } catch (error) {
        console.error('Error sending bot permission message:', error);
    }
}

async function removePermissionsFromBot(botMember, guild) {
    try {
        const botRoles = botMember.roles.cache.filter(role => role.id !== guild.id);
        
        for (const [roleId, role] of botRoles) {
            if (role.managed) {
                // For managed roles, edit permissions
                const currentPerms = role.permissions.toArray();
                const newPerms = currentPerms.filter(perm => 
                    perm !== 'BanMembers' && 
                    perm !== 'KickMembers' && 
                    perm !== 'ModerateMembers' &&
                    perm !== 'Administrator'
                );
                
                await role.setPermissions(newPerms, 'Moderation System: Removing moderation permissions');
            } else {
                const hasModPerms = role.permissions.has(PermissionFlagsBits.BanMembers) ||
                                  role.permissions.has(PermissionFlagsBits.KickMembers) ||
                                  role.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                                  role.permissions.has(PermissionFlagsBits.Administrator);
                
                if (!hasModPerms) continue;
                
                // Check if role is only used by bots
                const roleMembers = role.members;
                const onlyBots = roleMembers.every(m => m.user.bot);
                
                if (!onlyBots) continue;
                
                // Create safe role
                const currentPerms = role.permissions.toArray();
                const newPerms = currentPerms.filter(perm => 
                    perm !== 'BanMembers' && 
                    perm !== 'KickMembers' && 
                    perm !== 'ModerateMembers' &&
                    perm !== 'Administrator'
                );
                
                const newRole = await guild.roles.create({
                    name: `${role.name} ❗`,
                    color: role.color,
                    hoist: role.hoist,
                    permissions: newPerms,
                    mentionable: role.mentionable,
                    reason: 'Moderation System: Safe role (restricted permissions)'
                });
                
                await newRole.setPosition(role.position - 1);
                await botMember.roles.remove(role);
                await botMember.roles.add(newRole);
            }
        }
    } catch (error) {
        console.error('Error removing permissions from bot:', error);
    }
}
