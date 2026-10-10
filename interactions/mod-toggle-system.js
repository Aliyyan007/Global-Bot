const ModerationSystem = require('../schemas/moderationSystemSchema');
const { createMainPanelEmbed, createMainPanelComponents } = require('../handler/moderationHelpers');
const { removePermissionsFromBots } = require('../handler/permissionRemovalHelper');
const { PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType } = require('discord.js');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-toggle-system',
    
    run: async (client, interaction, args) => {
        try {
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            const { guild } = interaction;
            let config = await ModerationSystem.findOne({ guildId: guild.id });
            if (!config) {
                config = new ModerationSystem({ guildId: guild.id });
            }
            
            if (config.enabled) {
                config.enabled = false;
                await config.save();
                
                const container = createMainPanelEmbed(config, guild, interaction.user.id);
                const components = await createMainPanelComponents(config, interaction.user.id, guild);
                
                await interaction.update({
                    components: [container, ...components]
                });
                
                return;
            }
            
            const botMember = await guild.members.fetch(client.user.id);
            const botRole = botMember.roles.highest;
            const sortedRoles = guild.roles.cache.sort((a, b) => b.position - a.position);
            
            const adminRoles = sortedRoles.filter(role => 
                role.permissions.has(PermissionFlagsBits.Administrator) && 
                role.id !== guild.id && 
                role.id !== botRole.id
            );
            
            if (adminRoles.size > 0) {
                // Get the HIGHEST admin role (first in sorted list = highest position number)
                const highestAdminRole = adminRoles.first();
                
                // Bot role must be at same level or just below (position >= highestAdminRole.position - 1)
                // "Just below" means one position number less (appears right below in Discord UI)
                if (botRole.position < (highestAdminRole.position - 1)) {
                    // Calculate visual positions (1 = top, higher numbers = lower in list)
                    const totalRoles = guild.roles.cache.size;
                    const botVisualPos = totalRoles - botRole.position;
                    const adminVisualPos = totalRoles - highestAdminRole.position;
                    
                    return await interaction.reply({
                        content: `## ❌ Role Position Check Failed\n\n**Current Positions:**\n• ${highestAdminRole} is at position **#${adminVisualPos}**\n• ${botRole} is at position **#${botVisualPos}**\n\n**Required Action:**\nMove ${botRole} to position **#${adminVisualPos}** or **#${adminVisualPos + 1}** (at same level or just below ${highestAdminRole})`,
                        flags: ["Ephemeral"]
                    });
                }
            } else {
                const highestRole = sortedRoles.filter(r => r.id !== guild.id).first();
                
                // Bot role must be at the top (highest position number)
                if (highestRole && botRole.position < highestRole.position) {
                    // Calculate visual positions
                    const totalRoles = guild.roles.cache.size;
                    const botVisualPos = totalRoles - botRole.position;
                    const highestVisualPos = totalRoles - highestRole.position;
                    
                    return await interaction.reply({
                        content: `## ❌ Role Position Check Failed\n\n**Current Positions:**\n• ${highestRole} is at position **#${highestVisualPos}**\n• ${botRole} is at position **#${botVisualPos}**\n\n**Required Action:**\nMove ${botRole} to position **#1** (top of the role hierarchy)`,
                        flags: ["Ephemeral"]
                    });
                }
            }
            
            // Check if bot has required permissions
            const requiredPerms = [
                { flag: PermissionFlagsBits.BanMembers, name: 'Ban Members' },
                { flag: PermissionFlagsBits.KickMembers, name: 'Kick Members' },
                { flag: PermissionFlagsBits.ModerateMembers, name: 'Timeout Members' },
                { flag: PermissionFlagsBits.ViewAuditLog, name: 'View Audit Log' },
                { flag: PermissionFlagsBits.ManageRoles, name: 'Manage Roles' },
                { flag: PermissionFlagsBits.ManageChannels, name: 'Manage Channels' },
                { flag: PermissionFlagsBits.SendMessages, name: 'Send Messages' },
                { flag: PermissionFlagsBits.ManageMessages, name: 'Manage Messages' },
                { flag: PermissionFlagsBits.EmbedLinks, name: 'Embed Links' },
                { flag: PermissionFlagsBits.ManageThreads, name: 'Manage Threads' },
                { flag: PermissionFlagsBits.CreatePrivateThreads, name: 'Create Private Threads' }
            ];
            
            const missingPerms = requiredPerms.filter(perm => !botMember.permissions.has(perm.flag));
            const hasAdministrator = botMember.permissions.has(PermissionFlagsBits.Administrator);
            
            if (missingPerms.length > 0) {
                const missingList = missingPerms.map(p => `• ${p.name}`).join('\n');
                
                let message = `## ❌ Missing Required Permissions\n\n**The bot is missing the following permissions:**\n${missingList}\n\n`;
                
                if (hasAdministrator) {
                    message += `✅ **Administrator permission detected** - This grants all permissions automatically.\n\n`;
                } else {
                    message += `**Recommended Solution:**\nGrant ${botRole} the **Administrator** permission for full functionality.\n\n`;
                }
                
                message += `**Alternative:**\nManually grant each missing permission to ${botRole} in Server Settings → Roles.`;
                
                return await interaction.reply({
                    content: message,
                    flags: ["Ephemeral"]
                });
            }
            
            config.enabled = true;
            await config.save();
            
            const container = createMainPanelEmbed(config, guild, interaction.user.id);
            const components = await createMainPanelComponents(config, interaction.user.id, guild);
            
            await interaction.update({
                components: [container, ...components]
            });
            
            const members = await guild.members.fetch();
            const botsWithPerms = members.filter(member => 
                member.user.bot && 
                member.user.id !== client.user.id &&
                (member.permissions.has(PermissionFlagsBits.BanMembers) ||
                 member.permissions.has(PermissionFlagsBits.KickMembers) ||
                 member.permissions.has(PermissionFlagsBits.ModerateMembers))
            );
            
            if (botsWithPerms.size > 0) {
                await createPermissionConfirmationThread(interaction.channel, Array.from(botsWithPerms.values()), interaction.user, client);
            }
            
        } catch (error) {
            console.error('Error toggling moderation system:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while toggling the system.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            } else {
                await interaction.followUp({
                    content: '❌ An error occurred while toggling the system.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};

async function createPermissionConfirmationThread(channel, botMembers, executor, client) {
    try {
        const thread = await channel.threads.create({
            name: `Permission Removal - All Bots`,
            autoArchiveDuration: 60,
            type: ChannelType.PrivateThread,
            reason: 'Moderation system permission confirmation'
        });
        
        const ghostPing = await thread.send(`<@${executor.id}>`);
        await ghostPing.delete().catch(() => {});
        
        // Send header message
        const headerText = '# Removed Perms from Bots (Recommended)\n## ✦ Ban\n## ✦ Kick\n## ✦ Timeout\n## \n> **Note:** ```For security reasons, all moderation permissions are handled exclusively by this bot to prevent misuse through unsafe or legacy command systems.```';
        await thread.send(headerText);
        
        // Store message IDs for each bot to track their confirmation status
        const botMessageMap = new Map(); // botId -> messageId
        
        // Send individual message for each bot
        for (const botMember of botMembers) {
            const embed = new EmbedBuilder()
                .setColor(0x2F2F46)
                .setThumbnail(botMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`#\n${botMember.user.username}\n<@${botMember.id}>\n###\n**Do you agree with the removal?**`);
            
            const confirmButton = new ButtonBuilder()
                .setCustomId(`cmd{mod-perm-ok}usr{${executor.id}}bot{${botMember.id}}`)
                .setEmoji('<:Okay:1463916646292000802>')
                .setStyle(ButtonStyle.Success);
            
            const cancelButton = new ButtonBuilder()
                .setCustomId(`cmd{mod-perm-x}usr{${executor.id}}bot{${botMember.id}}`)
                .setEmoji('<:Cross:1463874026924544116>')
                .setStyle(ButtonStyle.Danger);
            
            const row = new ActionRowBuilder().addComponents(cancelButton, confirmButton);
            
            const message = await thread.send({
                embeds: [embed],
                components: [row]
            });
            
            botMessageMap.set(botMember.id, message.id);
        }
        
        // Send footer message
        const footerText = '### \n> Note ```This thread will be deleted automatically after one hour.```';
        await thread.send(footerText);
        
        // CRITICAL FIX: Save thread deletion info to database
        const ModerationSystem = require('../schemas/moderationSystemSchema');
        const config = await ModerationSystem.findOne({ guildId: channel.guild.id });
        
        // Auto-removal after 1 hour
        setTimeout(async () => {
            try {
                const messages = await thread.messages.fetch({ limit: 100 });
                
                // Process bots that still have active buttons
                const botsToProcess = [];
                for (const [botId, messageId] of botMessageMap) {
                    const message = messages.get(messageId);
                    if (message && message.components.length > 0) {
                        // Button still active, process this bot
                        const botMember = await channel.guild.members.fetch(botId).catch(() => null);
                        if (botMember && botMember.user.bot) {
                            botsToProcess.push(botMember);
                            
                            // Update message to show auto-confirmed
                            const embed = new EmbedBuilder()
                                .setColor(0x2F2F46)
                                .setThumbnail(botMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                                .setDescription(`#\n${botMember.user.username}\n<@${botMember.id}>\n###\n**Auto-confirmed (No response)**`);
                            
                            await message.edit({
                                embeds: [embed],
                                components: []
                            }).catch(() => {});
                        }
                    }
                }
                
                if (botsToProcess.length > 0) {
                    await removePermissionsFromBots(botsToProcess, channel.guild);
                }
                
                // CRITICAL FIX: Save thread deletion to database before deleting
                if (config) {
                    if (!config.deletedThreads) config.deletedThreads = [];
                    config.deletedThreads.push({
                        threadId: thread.id,
                        channelId: channel.id,
                        deletedAt: new Date(),
                        reason: 'Auto-removal after 1 hour timeout',
                        deletedBy: client.user.id
                    });
                    await config.save();
                    console.log(`[Moderation System] Saved thread deletion info to database: ${thread.id}`);
                }
                
                await thread.delete();
            } catch (error) {
                console.error('Error in auto-removal timeout:', error);
            }
        }, 60 * 60 * 1000);
        
    } catch (error) {
        console.error('Error creating permission confirmation thread:', error);
    }
}

// Function moved to handler/permissionRemovalHelper.js to avoid duplication
