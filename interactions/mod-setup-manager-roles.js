const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');
const { createMainPanelEmbed, createMainPanelComponents } = require('../handler/moderationHelpers');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-setup-manager-roles',
    
    run: async (client, interaction, args) => {
        try {
            // Check if user is authorized
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            const selectedRoles = interaction.values;
            const { guild } = interaction;
            
            let config = await ModerationSystem.findOne({ guildId: guild.id });
            if (!config) {
                return await interaction.reply({
                    content: '❌ Configuration not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Save manager roles
            config.logManagerRoles = selectedRoles;
            config.enabled = true;
            await config.save();
            
            // Update the original panel
            const container = createMainPanelEmbed(config, guild, interaction.user.id);
            const components = await createMainPanelComponents(config, interaction.user.id, guild);
            
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
            const rolesMention = selectedRoles.map(r => `<@&${r}>`).join(', ');
            await interaction.update({
                content: `### ✅ Setup Complete!\n\n` +
                         `**Log Channel:** <#${config.logChannel}>\n` +
                         `**Manager Roles:** ${rolesMention}\n\n` +
                         `The moderation system is now enabled. Removing permissions from other bots...`,
                components: []
            });
            
            // Send initial message to log channel
            await sendLogChannelSetupMessage(client, guild, config);
            
            // Start permission removal process
            await removeBotsPermissions(client, guild, config, interaction);
            
        } catch (error) {
            console.error('Error in mod-setup-manager-roles:', error);
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
        
        const rolesMention = config.logManagerRoles.length > 0 
            ? config.logManagerRoles.map(r => `<@&${r}>`).join(' ')
            : '';
        
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
        
        await logChannel.send({ 
            content: rolesMention || undefined,
            embeds: [embed] 
        });
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
        
        // Group bots by their roles to create one restricted role per original role
        await processBotsPermissions(logChannel, botsToProcess, config, guild);
        
    } catch (error) {
        console.error('Error removing bots permissions:', error);
    }
}

async function processBotsPermissions(logChannel, botsToProcess, config, guild) {
    try {
        // Group bots by their roles with moderation permissions
        const roleToBotsMap = new Map();
        
        for (const botData of botsToProcess) {
            const { member } = botData;
            const botRoles = member.roles.cache.filter(role => role.id !== guild.id);
            
            for (const [roleId, role] of botRoles) {
                const hasModPerms = role.permissions.has(PermissionFlagsBits.BanMembers) ||
                                  role.permissions.has(PermissionFlagsBits.KickMembers) ||
                                  role.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                                  role.permissions.has(PermissionFlagsBits.Administrator);
                
                if (hasModPerms) {
                    if (!roleToBotsMap.has(roleId)) {
                        roleToBotsMap.set(roleId, []);
                    }
                    roleToBotsMap.get(roleId).push(member);
                }
            }
        }
        
        // Process each role and create ONE restricted role per original role
        for (const [roleId, botsWithRole] of roleToBotsMap) {
            const role = guild.roles.cache.get(roleId);
            if (!role) continue;
            
            let restrictedRole;
            
            if (role.managed) {
                // For managed roles, just edit permissions
                const currentPerms = role.permissions.toArray();
                const newPerms = currentPerms.filter(perm => 
                    perm !== 'BanMembers' && 
                    perm !== 'KickMembers' && 
                    perm !== 'ModerateMembers' &&
                    perm !== 'Administrator'
                );
                await role.setPermissions(newPerms, 'Moderation System: Removing moderation permissions');
                restrictedRole = role;
            } else {
                // Create ONE restricted role for this original role
                const currentPerms = role.permissions.toArray();
                const newPerms = currentPerms.filter(perm => 
                    perm !== 'BanMembers' && 
                    perm !== 'KickMembers' && 
                    perm !== 'ModerateMembers' &&
                    perm !== 'Administrator'
                );
                
                const roleOptions = {
                    name: `${role.name} ❗`,
                    color: role.color,
                    hoist: role.hoist,
                    permissions: newPerms,
                    mentionable: role.mentionable,
                    reason: 'Moderation System: Safe role (restricted permissions)'
                };
                
                if (role.icon) {
                    roleOptions.icon = role.icon;
                } else if (role.unicodeEmoji) {
                    roleOptions.unicodeEmoji = role.unicodeEmoji;
                }
                
                restrictedRole = await guild.roles.create(roleOptions);
                await restrictedRole.setPosition(role.position - 1).catch(err => {
                    console.error('Error positioning new role:', err);
                });
            }
            
            // Add restricted role to all bots and remove the original role
            for (const botMember of botsWithRole) {
                await botMember.roles.add(restrictedRole, 'Moderation System: Adding restricted role');
                await botMember.roles.remove(role, 'Moderation System: Removing original role');
            }
            
            // Send ONE message per role with all affected bots
            await sendRolePermissionMessage(logChannel, role, restrictedRole, botsWithRole, config);
        }
        
    } catch (error) {
        console.error('Error processing bots permissions:', error);
    }
}

async function sendRolePermissionMessage(logChannel, originalRole, restrictedRole, affectedBots, config) {
    try {
        const rolesMention = config.logManagerRoles.length > 0 
            ? config.logManagerRoles.map(r => `<@&${r}>`).join(' ')
            : '';
        
        const botsList = affectedBots.map(bot => `• ${bot.user.tag}`).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('⚠️ Bot Permissions Removed')
            .setDescription(
                `**Original Role:** <@&${originalRole.id}>\n` +
                `**Members:** ${affectedBots.length} bot(s)\n\n` +
                `${botsList}\n\n` +
                `**Restricted Role:** <@&${restrictedRole.id}>\n\n` +
                `**Reason:** Moderation system enabled - only this bot should have moderation permissions.\n\n` +
                `⚠️ **It is recommended to keep these permissions removed.**\n` +
                `You can revert these changes using the button below, but it may cause conflicts.\n\n` +
                `⏱️ **This button will expire in 1 hour.**`
            )
            .setTimestamp();
        
        const revertButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`cmd{mod-revert-bot-perms}role{${originalRole.id}}restricted{${restrictedRole.id}}`)
                    .setLabel('Revert Changes')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄')
            );
        
        const message = await logChannel.send({ 
            content: rolesMention || undefined,
            embeds: [embed],
            components: [revertButton]
        });
        
        // Disable button after 1 hour
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
        }, 3600000); // 1 hour
        
    } catch (error) {
        console.error('Error sending role permission message:', error);
    }
}


