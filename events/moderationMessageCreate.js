const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');
const ModerationAppeal = require('../schemas/moderationAppealSchema');
const UserAppealCount = require('../schemas/userAppealCountSchema');

module.exports = {
    name: 'messageCreate',
    
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;
        
        const config = await ModerationSystem.findOne({ guildId: message.guild.id });
        if (!config || !config.enabled) return;
        
        const prefix = config.prefix;
        if (!message.content.startsWith(prefix)) return;
        
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        // Check if user has required permissions
        const hasPermission = message.member.permissions.has(PermissionFlagsBits.BanMembers) ||
                            message.member.permissions.has(PermissionFlagsBits.KickMembers) ||
                            message.member.permissions.has(PermissionFlagsBits.ModerateMembers);
        
        if (!hasPermission) {
            return message.reply('❌ You do not have permission to use moderation commands.');
        }
        
        // Add loading emoji reaction
        let loadingReaction = null;
        try {
            loadingReaction = await message.react('<a:Loading:1463867438209699883>').catch(() => null);
        } catch (err) {
            console.error('Failed to add loading reaction:', err);
        }
        
        try {
            switch (command) {
                case 'ban':
                    await handleBan(message, args, config, client);
                    break;
                case 'unban':
                    await handleUnban(message, args, config);
                    break;
                case 'kick':
                    await handleKick(message, args, config);
                    break;
                case 'timeout':
                    if (args[0] === 'remove') {
                        await handleTimeoutRemove(message, args.slice(1), config);
                    } else {
                        await handleTimeout(message, args, config, client);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error executing moderation command:', error);
            message.reply('❌ An error occurred while executing the command.');
        } finally {
            // Remove loading emoji reaction
            if (loadingReaction) {
                try {
                    await message.reactions.cache.get('1463867438209699883')?.users.remove(client.user.id).catch(() => {});
                } catch (err) {
                    console.error('Failed to remove loading reaction:', err);
                }
            }
        }
    }
};

async function handleBan(message, args, config, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply('❌ You do not have permission to ban members.');
    }
    
    const userMention = args[0];
    if (!userMention) {
        return message.reply(`Usage: \`${config.prefix}ban @user (duration) (reason)\``);
    }
    
    // Try to find user - instant response
    let userId = userMention.replace(/[<@!>]/g, '');
    let member = null;
    
    // Check if it's a valid ID (only numbers)
    if (/^\d+$/.test(userId)) {
        member = await message.guild.members.fetch(userId).catch(() => null);
    }
    
    // If not found by ID or not an ID, try fuzzy search by username
    if (!member) {
        const searchResult = await findUserByName(message.guild, userMention);
        
        if (!searchResult) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('<:Cross:1463874026924544116> Punishment not executed')
                .setDescription(`> User @${userMention} not found.`);
            return message.reply({ embeds: [embed] });
        }
        
        if (searchResult.exact) {
            member = searchResult.member;
        } else if (searchResult.multiple) {
            // Multiple users found - show select menu
            const { StringSelectMenuBuilder } = require('discord.js');
            
            let description = `No exact user could be found.\nChoose one or multiple of the **${searchResult.members.length} users** below to continue.\n\n`;
            
            searchResult.members.forEach((m, index) => {
                const displayName = m.displayName !== m.user.username ? `${m.displayName} | ` : '';
                const globalName = m.user.globalName ? `${m.user.globalName} | ` : '';
                description += `${index + 1}. ${displayName}${globalName}@${m.user.username} (<@${m.id}>)\n`;
            });
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(description);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`mod_select_ban_${message.author.id}`)
                .setPlaceholder('Select one or multiple users')
                .setMinValues(1)
                .setMaxValues(searchResult.members.length);
            
            searchResult.members.forEach((m, index) => {
                const displayName = m.displayName !== m.user.username ? `${m.displayName} | ` : '';
                const globalName = m.user.globalName ? `${m.user.globalName} | ` : '';
                selectMenu.addOptions({
                    label: `${displayName}${globalName}@${m.user.username}`,
                    description: m.id,
                    value: m.id
                });
            });
            
            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_select_all_ban_${message.author.id}`)
                        .setLabel('Select all')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('<:Okay:1463916646292000802>'),
                    new ButtonBuilder()
                        .setCustomId(`mod_cancel_${message.author.id}`)
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:Cross:1463874026924544116>')
                );
            
            // Store command data for later
            if (!client.moderationConfirms) client.moderationConfirms = new Map();
            client.moderationConfirms.set(`ban_${message.author.id}`, {
                type: 'ban',
                args: args.slice(1),
                config,
                messageId: message.id,
                allMembers: searchResult.members.map(m => m.id)
            });
            
            return message.reply({ embeds: [embed], components: [row1, row2], allowedMentions: { parse: [] } });
        } else {
            // Single fuzzy match - ask for confirmation
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(`No exact user could be found.\nDo you want to continue with **@${searchResult.member.user.username}** (<@${searchResult.member.id}>)?`);
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_confirm_ban_${searchResult.member.id}_${message.author.id}`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('<:Okay:1463916646292000802>'),
                    new ButtonBuilder()
                        .setCustomId(`mod_cancel_${message.author.id}`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:Cross:1463874026924544116>')
                );
            
            // Store command data for later
            if (!client.moderationConfirms) client.moderationConfirms = new Map();
            client.moderationConfirms.set(`${searchResult.member.id}_${message.author.id}`, {
                type: 'ban',
                args: args.slice(1),
                config,
                messageId: message.id
            });
            
            return message.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
        }
    }
    
    // Check if user is trying to ban themselves
    if (member.id === message.author.id) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:Cross:1463874026924544116> Punishment not executed')
            .setDescription('>>> You can\'t punish yourself.');
        return message.reply({ embeds: [embed] });
    }
    
    // Check if bot can ban this user (role hierarchy)
    if (!member.bannable) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:Cross:1463874026924544116> Punishment not executed')
            .setDescription(`>>> User is immune to bans: ${client.user.username} can't ban users with a higher role.`);
        return message.reply({ embeds: [embed] });
    }
    
    // Execute ban
    await executeBan(message, member, args.slice(1), config, client);
}

async function executeBan(message, member, args, config, client) {
    // Smart duration and reason parsing
    const parsed = parseDurationAndReason(args);
    const duration = parsed.duration;
    const durationString = parsed.durationString;
    const reason = parsed.reasonParts.join(' ') || 'No reason provided';
    
    // Check max ban limit (1 year)
    if (duration) {
        const maxBan = 365 * 24 * 60 * 60 * 1000; // 1 year
        if (duration > maxBan) {
            const errorMsg = `❌ Maximum ban duration is 1 year. You specified: ${durationString}`;
            if (message.channel && message.channel.send) {
                return message.channel.send(errorMsg);
            } else {
                return message.reply(errorMsg);
            }
        }
    }
    
    // Fetch user profile for statistics
    const profile = await client.functions.fetchProfile(client, member.id, message.guild.id);
    
    // Calculate rank
    const profiles = client.cache.profiles.filter(p => p.guildID === message.guild.id).map(p => Object.assign({}, p)).sort((a, b) => b.xp - a.xp);
    const rank = profiles.findIndex(p => p.userID === member.id) + 1;
    
    // Format voice time in hours
    const voiceHours = ((profile.voice || 0) / 3600).toFixed(2);
    
    // Send immediate confirmation with user avatar, stats, and copy ID button
    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle(`<:Okay:1463916646292000802> User Banned  <t:${Math.floor(Date.now() / 1000)}:f>`)
        .setDescription(
            `**User:** ${member.user.username}\n` +
            `**Banned by:** ${message.author.username}\n` +
            `**Reason:** ${reason}${durationString ? `\n**Duration:** ${durationString}` : ''}\n` +
            `###\n` +
            `<:Rank:1462593607897841755> Rank: #${rank || 0} ㅤ<:Level:1462593870620655626> Level: ${profile.level || 1}\n\n` +
            ` <:VC_Hours:1452116236820418731>‎ ‎ ${voiceHours} ‎ ‎ <:Messages:1452116146269454568>‎ ‎ ${profile.messages || 0} ‎ ‎ 🪙‎ ‎ ${profile.money || 0} ‎ ‎ <:Reputation:1452880716906893374>‎ ‎ ${profile.rep || 0} ‎ ‎ <:Heart:1452285267368087723>‎ ‎ ${profile.likes || 0} ‎ ‎ 🥇‎ ‎ ${profile.achievements?.length || 0} ‎ ‎ <:Trophies:1452117057331003483>‎ ‎ ${profile.trophies || 0}`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`copy_user_id_${member.id}`)
                .setLabel('Copy User ID')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋')
        );
    
    // Check if this is from a button interaction or direct command
    if (message.channel && message.channel.send) {
        await message.channel.send({ embeds: [embed], components: [row] });
    } else {
        await message.reply({ embeds: [embed], components: [row] });
    }
    
    // Send DM and ban asynchronously (don't await)
    sendBanDM(member.user, message.guild, message.author, reason, durationString, config, client).catch(() => {});
    member.ban({ reason: `${reason} | Banned by ${message.author.tag}` }).catch(err => {
        message.channel.send(`⚠️ Failed to ban ${member.user.tag}: ${err.message}`);
    });
}

async function sendBanDM(user, guild, moderator, reason, duration, config, client) {
    try {
        const durationText = duration ? `For ${duration}` : 'Permanent';
        
        // Build the mutual server link button if available
        let mutualServerButton = '';
        if (config.banAppealSystem.mutualServerLink) {
            mutualServerButton = `\n[**Join Mutual Server**](${config.banAppealSystem.mutualServerLink})\n`;
        }
        
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`Banned from ${guild.name}`)
            .setDescription(
                `## Duration\n` +
                `${durationText}\n\n` +
                `## Reason\n` +
                `\`\`\`${reason}\`\`\`\n\n` +
                `## Banned By\n` +
                `**Username:** ${moderator.username}\n` +
                `<t:${Math.floor(Date.now() / 1000)}:F>` +
                mutualServerButton +
                `\n> Note: If you are not able to make appeals then join the mutual server and try again.`
            )
            .setThumbnail(guild.iconURL() || null)
            .setTimestamp();
        
        const components = [];
        
        // Add appeal button if ban appeal system is enabled
        if (config.banAppealSystem.enabled) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_appeal_ban_${guild.id}`)
                        .setLabel('Appeal To Join')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📝')
                );
            components.push(row);
        }
        
        const dmMessage = await user.send({ embeds: [embed], components });
        
        // If temporary ban, schedule message edit and new DM when it expires
        if (duration) {
            const durationMs = parseDuration(duration);
            setTimeout(async () => {
                try {
                    // Edit the original message to show expired
                    const expiredEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle(`Banned from ${guild.name}`)
                        .setDescription(
                            `## Duration\n` +
                            `~~For ${duration}~~ **Expired**\n\n` +
                            `## Reason\n` +
                            `\`\`\`${reason}\`\`\`\n\n` +
                            `## Banned By\n` +
                            `**Username:** ${moderator.username}\n` +
                            `<t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                            `> Note: The ban has expired. You may rejoin the server.`
                        )
                        .setThumbnail(guild.iconURL() || null)
                        .setTimestamp();
                    
                    await dmMessage.edit({ embeds: [expiredEmbed], components: [] });
                    
                    // Send a new DM notification about expiry
                    const expiryNotificationEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle(`Ban Expired in ${guild.name}`)
                        .setDescription(
                            `Your ban has expired. You can now rejoin **${guild.name}**.\n\n` +
                            `## Original Ban Details\n` +
                            `**Duration:** ${duration}\n` +
                            `**Reason:**\n` +
                            `\`\`\`${reason}\`\`\`\n\n` +
                            `**Banned By:** ${moderator.username}`
                        )
                        .setThumbnail(guild.iconURL() || null)
                        .setTimestamp();
                    
                    await user.send({ embeds: [expiryNotificationEmbed] });
                } catch (error) {
                    console.error('Error editing/sending ban expiry DM:', error);
                }
            }, durationMs);
        }
    } catch (error) {
        console.error('Error sending ban DM:', error);
    }
}

async function handleUnban(message, args, config) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply('❌ You do not have permission to unban members.');
    }
    
    const userMention = args[0];
    if (!userMention) {
        return message.reply(`Usage: \`${config.prefix}unban @user\``);
    }
    
    const userId = userMention.replace(/[<@!>]/g, '');
    
    // Send immediate confirmation
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ User Unbanned')
        .setDescription(`**User ID:** ${userId}\n**Unbanned by:** ${message.author.tag}`)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
    // Unban and send DM
    message.guild.members.unban(userId, `Unbanned by ${message.author.tag}`).then(async (user) => {
        // Send DM to unbanned user
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Unbanned from ${message.guild.name}`)
                .setDescription(
                    `You have been unbanned from **${message.guild.name}**.\n\n` +
                    `**Unbanned by:** ${message.author.tag}\n` +
                    `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                )
                .setThumbnail(message.guild.iconURL() || null)
                .setTimestamp();
            
            // Try to create an invite link
            const inviteChannel = message.guild.channels.cache.find(ch => 
                ch.isTextBased() && 
                ch.permissionsFor(message.guild.members.me).has(['CreateInstantInvite', 'ViewChannel'])
            );
            
            const components = [];
            if (inviteChannel) {
                const invite = await inviteChannel.createInvite({
                    maxAge: 86400, // 24 hours
                    maxUses: 1,
                    unique: true,
                    reason: `Unbanned by ${message.author.tag}`
                }).catch(() => null);
                
                if (invite) {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel(`Join ${message.guild.name}`)
                                .setStyle(ButtonStyle.Link)
                                .setURL(invite.url)
                                .setEmoji('🔗')
                        );
                    components.push(row);
                }
            }
            
            await user.send({ embeds: [dmEmbed], components }).catch(() => {
                console.log(`Could not send unban DM to user ${userId}`);
            });
        } catch (error) {
            console.error('Error sending unban DM:', error);
        }
    }).catch(err => {
        message.channel.send(`⚠️ Failed to unban user: ${err.message}`);
    });
}

async function handleKick(message, args, config, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return message.reply('❌ You do not have permission to kick members.');
    }
    
    const userMention = args[0];
    if (!userMention) {
        return message.reply(`Usage: \`${config.prefix}kick @user (reason)\``);
    }
    
    // Try to find user - instant response
    let userId = userMention.replace(/[<@!>]/g, '');
    let member = null;
    
    // Check if it's a valid ID (only numbers)
    if (/^\d+$/.test(userId)) {
        member = await message.guild.members.fetch(userId).catch(() => null);
    }
    
    // If not found by ID or not an ID, try fuzzy search by username
    if (!member) {
        const searchResult = await findUserByName(message.guild, userMention);
        
        if (!searchResult) {
            return message.reply('❌ User not found.');
        }
        
        if (searchResult.exact) {
            member = searchResult.member;
        } else if (searchResult.multiple) {
            // Multiple users found - show select menu
            const { StringSelectMenuBuilder } = require('discord.js');
            
            let description = `No exact user could be found.\nChoose one or multiple of the **${searchResult.members.length} users** below to continue.\n\n`;
            
            searchResult.members.forEach((m, index) => {
                const displayName = m.displayName !== m.user.username ? `${m.displayName} | ` : '';
                const globalName = m.user.globalName ? `${m.user.globalName} | ` : '';
                description += `${index + 1}. ${displayName}${globalName}@${m.user.username} (<@${m.id}>)\n`;
            });
            
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(description);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`mod_select_kick_${message.author.id}`)
                .setPlaceholder('Select one or multiple users')
                .setMinValues(1)
                .setMaxValues(searchResult.members.length);
            
            searchResult.members.forEach((m, index) => {
                const displayName = m.displayName !== m.user.username ? `${m.displayName} | ` : '';
                const globalName = m.user.globalName ? `${m.user.globalName} | ` : '';
                selectMenu.addOptions({
                    label: `${displayName}${globalName}@${m.user.username}`,
                    description: m.id,
                    value: m.id
                });
            });
            
            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_select_all_kick_${message.author.id}`)
                        .setLabel('Select all')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('<:Okay:1463916646292000802>'),
                    new ButtonBuilder()
                        .setCustomId(`mod_cancel_${message.author.id}`)
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:Cross:1463874026924544116>')
                );
            
            // Store command data for later
            if (!client.moderationConfirms) client.moderationConfirms = new Map();
            client.moderationConfirms.set(`kick_${message.author.id}`, {
                type: 'kick',
                args: args.slice(1),
                config,
                messageId: message.id,
                allMembers: searchResult.members.map(m => m.id)
            });
            
            return message.reply({ embeds: [embed], components: [row1, row2], allowedMentions: { parse: [] } });
        } else {
            // Single fuzzy match - ask for confirmation
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(`No exact user could be found.\nDo you want to continue with **@${searchResult.member.user.username}** (<@${searchResult.member.id}>)?`);
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_confirm_kick_${searchResult.member.id}_${message.author.id}`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('<:Okay:1463916646292000802>'),
                    new ButtonBuilder()
                        .setCustomId(`mod_cancel_${message.author.id}`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:Cross:1463874026924544116>')
                );
            
            // Store command data for later
            if (!client.moderationConfirms) client.moderationConfirms = new Map();
            client.moderationConfirms.set(`${searchResult.member.id}_${message.author.id}`, {
                type: 'kick',
                args: args.slice(1),
                config,
                messageId: message.id
            });
            
            return message.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
        }
    }
    
    // Check if user is trying to kick themselves
    if (member.id === message.author.id) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:Cross:1463874026924544116> Punishment not executed')
            .setDescription('>>> You can\'t punish yourself.');
        return message.reply({ embeds: [embed] });
    }
    
    // Check if bot can kick this user (role hierarchy)
    if (!member.kickable) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:Cross:1463874026924544116> Punishment not executed')
            .setDescription(`>>> User is immune to kicks: ${client.user.username} can't kick users with a higher role.`);
        return message.reply({ embeds: [embed] });
    }
    
    // Execute kick
    await executeKick(message, member, args.slice(1), config, client);
}

async function executeKick(message, member, args, config, client) {
    const reason = args.join(' ') || 'No reason provided';
    
    // Fetch user profile for statistics
    const profile = await client.functions.fetchProfile(client, member.id, message.guild.id);
    
    // Calculate rank
    const profiles = client.cache.profiles.filter(p => p.guildID === message.guild.id).map(p => Object.assign({}, p)).sort((a, b) => b.xp - a.xp);
    const rank = profiles.findIndex(p => p.userID === member.id) + 1;
    
    // Format voice time in hours
    const voiceHours = ((profile.voice || 0) / 3600).toFixed(2);
    
    // Send immediate confirmation with user avatar, stats, and copy ID button
    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle(`<:Okay:1463916646292000802> User Kicked  <t:${Math.floor(Date.now() / 1000)}:f>`)
        .setDescription(
            `**User:** ${member.user.username}\n` +
            `**Kicked by:** ${message.author.username}\n` +
            `**Reason:** ${reason}\n` +
            `###\n` +
            `<:Rank:1462593607897841755> Rank: #${rank || 0} ㅤ<:Level:1462593870620655626> Level: ${profile.level || 1}\n\n` +
            ` <:VC_Hours:1452116236820418731>‎ ‎ ${voiceHours} ‎ ‎ <:Messages:1452116146269454568>‎ ‎ ${profile.messages || 0} ‎ ‎ 🪙‎ ‎ ${profile.money || 0} ‎ ‎ <:Reputation:1452880716906893374>‎ ‎ ${profile.rep || 0} ‎ ‎ <:Heart:1452285267368087723>‎ ‎ ${profile.likes || 0} ‎ ‎ 🥇‎ ‎ ${profile.achievements?.length || 0} ‎ ‎ <:Trophies:1452117057331003483>‎ ‎ ${profile.trophies || 0}`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`copy_user_id_${member.id}`)
                .setLabel('Copy User ID')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋')
        );
    
    // Check if this is from a button interaction or direct command
    if (message.channel && message.channel.send) {
        await message.channel.send({ embeds: [embed], components: [row] });
    } else {
        await message.reply({ embeds: [embed], components: [row] });
    }
    
    // Send DM and kick asynchronously (don't await)
    sendKickDM(member.user, message.guild, message.author, reason).catch(() => {});
    member.kick(`${reason} | Kicked by ${message.author.tag}`).catch(err => {
        message.channel.send(`⚠️ Failed to kick ${member.user.tag}: ${err.message}`);
    });
}

async function sendKickDM(user, guild, moderator, reason) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle(`Kicked from ${guild.name}`)
            .setDescription(
                `## Reason\n` +
                `\`\`\`${reason}\`\`\`\n\n` +
                `## Kicked By\n` +
                `**Username:** ${moderator.username}\n` +
                `<t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setThumbnail(guild.iconURL() || null)
            .setTimestamp();
        
        await user.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending kick DM:', error);
    }
}

async function handleTimeout(message, args, config, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply('❌ You do not have permission to timeout members.');
    }
    
    const userMention = args[0];
    if (!userMention) {
        return message.reply(`Usage: \`${config.prefix}timeout @user (duration) (reason)\``);
    }
    
    // Try to find user - instant response
    let userId = userMention.replace(/[<@!>]/g, '');
    let member = null;
    
    // Check if it's a valid ID (only numbers)
    if (/^\d+$/.test(userId)) {
        member = await message.guild.members.fetch(userId).catch(() => null);
    }
    
    // If not found by ID or not an ID, try fuzzy search by username
    if (!member) {
        const searchResult = await findUserByName(message.guild, userMention);
        
        if (!searchResult) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('<:Cross:1463874026924544116> Punishment not executed')
                .setDescription(`> User @${userMention} not found.`);
            return message.reply({ embeds: [embed] });
        }
        
        if (searchResult.exact) {
            member = searchResult.member;
        } else if (searchResult.multiple) {
            // Multiple users found - show select menu
            const { StringSelectMenuBuilder } = require('discord.js');
            
            let description = `No exact user could be found.\nChoose one or multiple of the **${searchResult.members.length} users** below to continue.\n\n`;
            
            searchResult.members.forEach((m, index) => {
                const displayName = m.displayName !== m.user.username ? `${m.displayName} | ` : '';
                const globalName = m.user.globalName ? `${m.user.globalName} | ` : '';
                description += `${index + 1}. ${displayName}${globalName}@${m.user.username} (<@${m.id}>)\n`;
            });
            
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(description);
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`mod_select_timeout_${message.author.id}`)
                .setPlaceholder('Select one or multiple users')
                .setMinValues(1)
                .setMaxValues(searchResult.members.length);
            
            searchResult.members.forEach((m, index) => {
                const displayName = m.displayName !== m.user.username ? `${m.displayName} | ` : '';
                const globalName = m.user.globalName ? `${m.user.globalName} | ` : '';
                selectMenu.addOptions({
                    label: `${displayName}${globalName}@${m.user.username}`,
                    description: m.id,
                    value: m.id
                });
            });
            
            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_select_all_timeout_${message.author.id}`)
                        .setLabel('Select all')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('<:Okay:1463916646292000802>'),
                    new ButtonBuilder()
                        .setCustomId(`mod_cancel_${message.author.id}`)
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:Cross:1463874026924544116>')
                );
            
            // Store command data for later
            if (!client.moderationConfirms) client.moderationConfirms = new Map();
            client.moderationConfirms.set(`timeout_${message.author.id}`, {
                type: 'timeout',
                args: args.slice(1),
                config,
                messageId: message.id,
                allMembers: searchResult.members.map(m => m.id)
            });
            
            return message.reply({ embeds: [embed], components: [row1, row2], allowedMentions: { parse: [] } });
        } else {
            // Single fuzzy match - ask for confirmation
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(`No exact user could be found.\nDo you want to continue with **@${searchResult.member.user.username}** (<@${searchResult.member.id}>)?`);
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_confirm_timeout_${searchResult.member.id}_${message.author.id}`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('<:Okay:1463916646292000802>'),
                    new ButtonBuilder()
                        .setCustomId(`mod_cancel_${message.author.id}`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:Cross:1463874026924544116>')
                );
            
            // Store command data for later
            if (!client.moderationConfirms) client.moderationConfirms = new Map();
            client.moderationConfirms.set(`${searchResult.member.id}_${message.author.id}`, {
                type: 'timeout',
                args: args.slice(1),
                config,
                messageId: message.id
            });
            
            return message.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
        }
    }
    
    // Check if user is trying to timeout themselves
    if (member.id === message.author.id) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:Cross:1463874026924544116> Punishment not executed')
            .setDescription('>>> You can\'t punish yourself.');
        return message.reply({ embeds: [embed] });
    }
    
    // Check if bot can timeout this user (role hierarchy)
    if (!member.moderatable) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:Cross:1463874026924544116> Punishment not executed')
            .setDescription(`>>> User is immune to timeouts: ${client.user.username} can't timeout users with a higher role.`);
        return message.reply({ embeds: [embed] });
    }
    
    // Check for recent timeout
    const recentTimeout = await checkRecentTimeout(member, message.guild);
    if (recentTimeout) {
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setDescription(
                `**A MUTE for this user was created just <t:${recentTimeout.createdAt}:R>:**\n` +
                `• **Reason:** ${recentTimeout.reason}\n` +
                `• **Duration:** ${recentTimeout.duration}\n` +
                `• **Author:** ${recentTimeout.author}\n\n` +
                `**Are you sure you want to continue?**`
            );
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`mod_confirm_timeout_override_${member.id}_${message.author.id}`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('<:Okay:1463916646292000802>'),
                new ButtonBuilder()
                    .setCustomId(`mod_cancel_${message.author.id}`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('<:Cross:1463874026924544116>')
            );
        
        // Store command data
        if (!client.moderationConfirms) client.moderationConfirms = new Map();
        client.moderationConfirms.set(`${member.id}_${message.author.id}`, {
            type: 'timeout',
            args: args.slice(1),
            config,
            messageId: message.id
        });
        
        return message.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
    }
    
    // Execute timeout
    await executeTimeout(message, member, args.slice(1), config, client);
}

async function executeTimeout(message, member, args, config, client) {
    // Smart duration and reason parsing
    const parsed = parseDurationAndReason(args);
    let duration = parsed.duration;
    let durationString = parsed.durationString || '10m';
    
    // If no duration found, use default
    if (!duration) {
        duration = 600000; // 10 minutes
        durationString = '10m';
    }
    
    // Check max timeout limit (28 days - Discord's limit)
    const maxTimeout = 28 * 24 * 60 * 60 * 1000;
    if (duration > maxTimeout) {
        return message.channel.send(`❌ Maximum timeout duration is 28 days. You specified: ${durationString}`);
    }
    
    const reason = parsed.reasonParts.join(' ') || 'No reason provided';
    
    // Send immediate confirmation with user avatar (NO copy ID button for timeouts)
    const embed = new EmbedBuilder()
        .setColor('#ffff00')
        .setTitle('<:Okay:1463916646292000802> User Timed Out')
        .setDescription(
            `**User:** ${member.user.tag}\n` +
            `**Timed out by:** ${message.author.tag}\n` +
            `**Duration:** ${durationString}\n` +
            `**Reason:** ${reason}`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
    
    // Check if this is from a button interaction or direct command
    if (message.channel && message.channel.send) {
        await message.channel.send({ embeds: [embed] });
    } else {
        await message.reply({ embeds: [embed] });
    }
    
    // Send DM and timeout asynchronously
    sendTimeoutDM(member.user, message.guild, message.author, reason, durationString, config, client).catch(() => {});
    member.timeout(duration, `${reason} | Timed out by ${message.author.tag}`).catch(err => {
        message.channel.send(`⚠️ Failed to timeout ${member.user.tag}: ${err.message}`);
    });
}

async function sendTimeoutDM(user, guild, moderator, reason, duration, config, client) {
    try {
        const timeoutEndTimestamp = Math.floor(Date.now() / 1000) + Math.floor(parseDuration(duration) / 1000);
        
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle(`Timed Out in ${guild.name}`)
            .setDescription(
                `## Duration\n` +
                `For ${duration}\n\n` +
                `## Reason\n` +
                `\`\`\`${reason}\`\`\`\n\n` +
                `## Timed Out By\n` +
                `**Username:** ${moderator.username}\n` +
                `<t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setThumbnail(guild.iconURL() || null)
            .setTimestamp();
        
        const components = [];
        
        // Add appeal button if timeout appeal system is enabled
        if (config.timeoutAppealSystem.enabled) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_appeal_timeout_${guild.id}`)
                        .setLabel('Appeal To Remove Restriction')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📝')
                );
            components.push(row);
        }
        
        const dmMessage = await user.send({ embeds: [embed], components });
        
        // Schedule message edit AND new DM when timeout expires
        const durationMs = parseDuration(duration);
        setTimeout(async () => {
            try {
                // Edit the original message to show expired
                const expiredEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`Timed Out in ${guild.name}`)
                    .setDescription(
                        `## Duration\n` +
                        `~~For ${duration}~~ **Expired**\n\n` +
                        `## Reason\n` +
                        `\`\`\`${reason}\`\`\`\n\n` +
                        `## Timed Out By\n` +
                        `**Username:** ${moderator.username}\n` +
                        `<t:${Math.floor(Date.now() / 1000)}:F>`
                    )
                    .setThumbnail(guild.iconURL() || null)
                    .setTimestamp();
                
                await dmMessage.edit({ embeds: [expiredEmbed], components: [] });
                
                // Send a new DM notification about expiry
                const expiryNotificationEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`Timeout Expired in ${guild.name}`)
                    .setDescription(
                        `Your timeout has expired. You can now chat in **${guild.name}** again.\n\n` +
                        `## Original Timeout Details\n` +
                        `**Duration:** ${duration}\n` +
                        `**Reason:**\n` +
                        `\`\`\`${reason}\`\`\`\n\n` +
                        `**Timed Out By:** ${moderator.username}`
                    )
                    .setThumbnail(guild.iconURL() || null)
                    .setTimestamp();
                
                await user.send({ embeds: [expiryNotificationEmbed] });
            } catch (error) {
                console.error('Error editing/sending timeout expiry DM:', error);
            }
        }, durationMs);
        
    } catch (error) {
        console.error('Error sending timeout DM:', error);
    }
}

async function handleTimeoutRemove(message, args, config) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply('❌ You do not have permission to remove timeouts.');
    }
    
    const userMention = args[0];
    if (!userMention) {
        return message.reply(`Usage: \`${config.prefix}timeout remove @user\``);
    }
    
    const userId = userMention.replace(/[<@!>]/g, '');
    const member = await message.guild.members.fetch(userId).catch(() => null);
    
    if (!member) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('<:Cross:1463874026924544116> Punishment not executed')
            .setDescription(`> User @${userMention} not found.`);
        return message.reply({ embeds: [embed] });
    }
    
    // Check if user actually has a timeout
    if (!member.communicationDisabledUntilTimestamp || member.communicationDisabledUntilTimestamp < Date.now()) {
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('⚠️ No Active Timeout')
            .setDescription(`**User:** ${member.user.tag}\n\nThis user does not have an active timeout.`)
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    // Send immediate confirmation
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Timeout Removed')
        .setDescription(`**User:** ${member.user.tag}\n**Removed by:** ${message.author.tag}`)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
    // Send DM to user about timeout removal
    sendTimeoutRemovedDM(member.user, message.guild, message.author).catch(() => {});
    
    // Remove timeout asynchronously (don't await)
    member.timeout(null).catch(err => {
        message.channel.send(`⚠️ Failed to remove timeout from ${member.user.tag}: ${err.message}`);
    });
}

async function sendTimeoutRemovedDM(user, guild, moderator) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`Timeout Removed in ${guild.name}`)
            .setDescription(
                `Your timeout has been removed by a moderator. You can now chat in **${guild.name}** again.\n\n` +
                `## Removed By\n` +
                `**Username:** ${moderator.username}\n` +
                `<t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setThumbnail(guild.iconURL() || null)
            .setTimestamp();
        
        await user.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending timeout removed DM:', error);
    }
}

function parseSmartDuration(input) {
    if (!input) return null;
    
    // Convert to lowercase for matching
    const str = input.toLowerCase();
    
    // Patterns to match various duration formats with optional spaces
    // Matches: 2min, 2mins, 2minute, 2minutes, 2 min, 2 mins, 2 minute, 2 minutes, etc.
    const patterns = [
        // Seconds
        { regex: /^(\d+)\s*(s|sec|secs|second|seconds)$/i, multiplier: 1000, unit: 's' },
        // Minutes
        { regex: /^(\d+)\s*(m|min|mins|minute|minutes)$/i, multiplier: 60 * 1000, unit: 'm' },
        // Hours
        { regex: /^(\d+)\s*(h|hr|hrs|hour|hours)$/i, multiplier: 60 * 60 * 1000, unit: 'h' },
        // Days
        { regex: /^(\d+)\s*(d|day|days)$/i, multiplier: 24 * 60 * 60 * 1000, unit: 'd' },
        // Months (approximate - 30 days)
        { regex: /^(\d+)\s*(mo|mon|month|months)$/i, multiplier: 30 * 24 * 60 * 60 * 1000, unit: 'mo' },
        // Years
        { regex: /^(\d+)\s*(y|yr|yrs|year|years)$/i, multiplier: 365 * 24 * 60 * 60 * 1000, unit: 'y' }
    ];
    
    for (const pattern of patterns) {
        const match = str.match(pattern.regex);
        if (match) {
            const value = parseInt(match[1]);
            const ms = value * pattern.multiplier;
            
            // Create display string
            let display;
            switch (pattern.unit) {
                case 's': display = `${value}s`; break;
                case 'm': display = `${value}m`; break;
                case 'h': display = `${value}h`; break;
                case 'd': display = `${value}d`; break;
                case 'mo': display = `${value}mo`; break;
                case 'y': display = `${value}y`; break;
                default: display = input;
            }
            
            return { ms, display };
        }
    }
    
    return null;
}

// Helper function to parse duration and reason from args array
// Handles both single-word durations (3m) and multi-word durations (3 minutes)
function parseDurationAndReason(args) {
    let duration = null;
    let durationString = null;
    let reasonParts = [];
    let skipNext = false;
    
    for (let i = 0; i < args.length; i++) {
        if (skipNext) {
            skipNext = false;
            continue;
        }
        
        const arg = args[i];
        
        // Try single argument first
        let parsedDuration = parseSmartDuration(arg);
        
        // If not found and there's a next argument, try combining them (e.g., "3" + "minutes")
        if (!parsedDuration && i < args.length - 1) {
            const combined = arg + args[i + 1];
            parsedDuration = parseSmartDuration(combined);
            if (parsedDuration) {
                skipNext = true; // Skip the next argument since we used it
            }
        }
        
        if (parsedDuration) {
            duration = parsedDuration.ms;
            durationString = parsedDuration.display;
        } else {
            reasonParts.push(arg);
        }
    }
    
    return { duration, durationString, reasonParts };
}

function parseDuration(duration) {
    if (!duration) return 600000; // Default 10 minutes
    
    // Handle formats like "2m", "10min", "1h", etc.
    const match = duration.match(/^(\d+)(s|m|h|d|mo|y)$/i);
    if (!match) return 600000;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'mo': return value * 30 * 24 * 60 * 60 * 1000;
        case 'y': return value * 365 * 24 * 60 * 60 * 1000;
        default: return 600000;
    }
}


async function findUserByName(guild, searchTerm) {
    // Remove @ if present
    const cleanTerm = searchTerm.replace('@', '').toLowerCase();
    
    // Use cached members (much faster)
    const members = guild.members.cache;
    
    // Try exact match first
    let exactMatch = members.find(m => 
        m.user.username.toLowerCase() === cleanTerm ||
        m.user.tag.toLowerCase() === cleanTerm ||
        m.displayName.toLowerCase() === cleanTerm
    );
    
    if (exactMatch) {
        return { member: exactMatch, exact: true, multiple: false };
    }
    
    // Try fuzzy match (partial match) - collect ALL matches
    let fuzzyMatches = members.filter(m =>
        m.user.username.toLowerCase().includes(cleanTerm) ||
        m.displayName.toLowerCase().includes(cleanTerm)
    );
    
    // If still not found, try fetching from API (slower but more complete)
    if (fuzzyMatches.size === 0) {
        try {
            await guild.members.fetch({ query: cleanTerm, limit: 25 });
            const fetchedMembers = guild.members.cache;
            
            fuzzyMatches = fetchedMembers.filter(m =>
                m.user.username.toLowerCase().includes(cleanTerm) ||
                m.displayName.toLowerCase().includes(cleanTerm)
            );
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    }
    
    if (fuzzyMatches.size === 0) {
        return null;
    }
    
    // Convert to array and limit to 25 (Discord's select menu limit)
    const matchArray = Array.from(fuzzyMatches.values()).slice(0, 25);
    
    if (matchArray.length === 1) {
        return { member: matchArray[0], exact: false, multiple: false };
    }
    
    // Multiple matches found
    return { members: matchArray, exact: false, multiple: true };
}

async function checkRecentTimeout(member, guild) {
    // Check if user has an active timeout
    if (member.communicationDisabledUntilTimestamp) {
        const now = Date.now();
        const timeoutEnd = member.communicationDisabledUntilTimestamp;
        
        if (timeoutEnd > now) {
            const durationMs = timeoutEnd - now;
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            
            // Calculate when the timeout was created (approximately)
            // We'll use "just now" since we don't have exact creation time
            const createdTimestamp = Math.floor(now / 1000);
            
            // Try to get the audit log to find who created the timeout and when
            let authorName = 'Unknown';
            let actualCreatedTimestamp = createdTimestamp;
            
            try {
                const auditLogs = await guild.fetchAuditLogs({
                    type: 24, // MEMBER_UPDATE
                    limit: 10
                });
                
                const timeoutLog = auditLogs.entries.find(entry => 
                    entry.target.id === member.id && 
                    entry.changes?.some(change => change.key === 'communication_disabled_until')
                );
                
                if (timeoutLog) {
                    authorName = timeoutLog.executor.tag;
                    actualCreatedTimestamp = Math.floor(timeoutLog.createdTimestamp / 1000);
                }
            } catch (error) {
                console.error('Error fetching audit logs:', error);
            }
            
            return {
                createdAt: actualCreatedTimestamp,
                reason: 'Active timeout',
                duration: `${minutes} minutes and ${seconds} seconds`,
                author: authorName
            };
        }
    }
    
    return null;
}

// Handle moderation confirmation buttons
module.exports.handleModerationButton = async (client, interaction) => {
    const customId = interaction.customId;
    
    // Copy User ID button
    if (customId.startsWith('copy_user_id_')) {
        const userId = customId.split('_')[3];
        
        // Send ephemeral message with the user ID
        return interaction.reply({
            content: `User ID: \`${userId}\`\n\nYou can use this ID to unban the user with:\n\`-unban ${userId}\``,
            flags: ["Ephemeral"]
        });
    }
    
    // Cancel button
    if (customId.startsWith('mod_cancel_')) {
        const userId = customId.split('_')[2];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This button is not for you.', flags: ["Ephemeral"] });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription('<:Cross:1463874026924544116> **Action cancelled.**');
        
        await interaction.update({ embeds: [embed], components: [] });
        return;
    }
    
    // Select all button for timeout
    if (customId.startsWith('mod_select_all_timeout_')) {
        const userId = customId.split('_')[4];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This button is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`timeout_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        await interaction.deferUpdate();
        
        const results = [];
        
        // Process all members
        for (const memberId of confirmData.allMembers) {
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);
            if (!member) {
                results.push(`❌ <@${memberId}> - User not found`);
                continue;
            }
            
            // Skip if user is trying to timeout themselves
            if (member.id === interaction.user.id) {
                results.push(`❌ ${member.user.tag} - Cannot timeout yourself`);
                continue;
            }
            
            // Skip if bot can't timeout this user
            if (!member.moderatable) {
                results.push(`❌ ${member.user.tag} - User is immune to timeouts`);
                continue;
            }
            
            // Parse duration and reason
            const parsed = parseDurationAndReason(confirmData.args);
            const duration = parsed.duration || 600000;
            const durationString = parsed.durationString || '10m';
            const reason = parsed.reasonParts.join(' ') || 'No reason provided';
            
            // Execute timeout
            try {
                await member.timeout(duration, `${reason} | Timed out by ${interaction.user.tag}`);
                results.push(`<:Okay:1463916646292000802> ${member.user.tag} - Timed out for ${durationString}`);
                
                // Send DM asynchronously
                sendTimeoutDM(member.user, interaction.guild, interaction.user, reason, durationString, confirmData.config, client).catch(() => {});
            } catch (err) {
                results.push(`❌ ${member.user.tag} - ${err.message}`);
            }
        }
        
        // Show summary by EDITING the message
        const summaryEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('Timeout Results')
            .setDescription(results.join('\n'))
            .setTimestamp();
        
        await interaction.editReply({ embeds: [summaryEmbed], components: [] });
        
        // Clean up
        client.moderationConfirms.delete(`timeout_${userId}`);
        return;
    }
    
    // Select all button for ban
    if (customId.startsWith('mod_select_all_ban_')) {
        const userId = customId.split('_')[4];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This button is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`ban_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        await interaction.deferUpdate();
        
        // Process all members
        for (const memberId of confirmData.allMembers) {
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);
            if (!member) continue;
            
            // Skip if user is trying to ban themselves
            if (member.id === interaction.user.id) continue;
            
            // Skip if bot can't ban this user
            if (!member.bannable) continue;
            
            const message = {
                guild: interaction.guild,
                author: interaction.user,
                member: interaction.member,
                channel: interaction.channel,
                reply: async (data) => {
                    return interaction.channel.send(data);
                }
            };
            
            await executeBan(message, member, confirmData.args, confirmData.config, client);
        }
        
        // Clean up
        await interaction.editReply({ embeds: [], components: [] });
        client.moderationConfirms.delete(`ban_${userId}`);
        return;
    }
    
    // Select all button for kick
    if (customId.startsWith('mod_select_all_kick_')) {
        const userId = customId.split('_')[4];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This button is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`kick_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        await interaction.deferUpdate();
        
        // Process all members
        for (const memberId of confirmData.allMembers) {
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);
            if (!member) continue;
            
            // Skip if user is trying to kick themselves
            if (member.id === interaction.user.id) continue;
            
            // Skip if bot can't kick this user
            if (!member.kickable) continue;
            
            const message = {
                guild: interaction.guild,
                author: interaction.user,
                member: interaction.member,
                channel: interaction.channel,
                reply: async (data) => {
                    return interaction.channel.send(data);
                }
            };
            
            await executeKick(message, member, confirmData.args, confirmData.config, client);
        }
        
        // Clean up
        await interaction.editReply({ embeds: [], components: [] });
        client.moderationConfirms.delete(`kick_${userId}`);
        return;
    }
    
    // Handle select menu for timeout
    if (customId.startsWith('mod_select_timeout_')) {
        const userId = customId.split('_')[3];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This select menu is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`timeout_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        const selectedIds = interaction.values;
        
        // If only one user selected, check for recent timeout
        if (selectedIds.length === 1) {
            const memberId = selectedIds[0];
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);
            
            if (!member) {
                return interaction.update({ content: '❌ User not found.', embeds: [], components: [] });
            }
            
            // Check for recent timeout
            const recentTimeout = await checkRecentTimeout(member, interaction.guild);
            if (recentTimeout) {
                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setDescription(
                        `**A MUTE for this user was created just <t:${recentTimeout.createdAt}:R>:**\n` +
                        `• **Reason:** ${recentTimeout.reason}\n` +
                        `• **Duration:** ${recentTimeout.duration}\n` +
                        `• **Author:** ${recentTimeout.author}\n\n` +
                        `**Are you sure you want to continue?**`
                    );
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`mod_confirm_timeout_override_${member.id}_${userId}`)
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('<:Okay:1463916646292000802>'),
                        new ButtonBuilder()
                            .setCustomId(`mod_cancel_${userId}`)
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('<:Cross:1463874026924544116>')
                    );
                
                // Update stored data with single member
                client.moderationConfirms.set(`${memberId}_${userId}`, {
                    type: 'timeout',
                    args: confirmData.args,
                    config: confirmData.config,
                    messageId: confirmData.messageId
                });
                
                // EDIT the message to show recent timeout confirmation
                return interaction.update({ embeds: [embed], components: [row] });
            }
            
            // No recent timeout - execute directly
            await interaction.deferUpdate();
            
            // Parse duration and reason
            const parsed = parseDurationAndReason(confirmData.args);
            const duration = parsed.duration || 600000;
            const durationString = parsed.durationString || '10m';
            const reason = parsed.reasonParts.join(' ') || 'No reason provided';
            
            // Show success message by EDITING
            const successEmbed = new EmbedBuilder()
                .setColor('#ffff00')
                .setDescription(`<:Okay:1463916646292000802> **User Timed Out**\n\n**User:** ${member.user.tag}\n**Timed out by:** ${interaction.user.tag}\n**Duration:** ${durationString}\n**Reason:** ${reason}`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [successEmbed], components: [] });
            
            // Execute timeout asynchronously
            member.timeout(duration, `${reason} | Timed out by ${interaction.user.tag}`).catch(err => {
                interaction.channel.send(`⚠️ Failed to timeout ${member.user.tag}: ${err.message}`);
            });
            
            // Send DM asynchronously
            sendTimeoutDM(member.user, interaction.guild, interaction.user, reason, durationString, confirmData.config, client).catch(() => {});
            
            // Clean up
            client.moderationConfirms.delete(`timeout_${userId}`);
            return;
        }
        
        // Multiple users selected - process all
        await interaction.deferUpdate();
        
        const results = [];
        
        // Process selected members
        for (const memberId of selectedIds) {
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);
            if (!member) {
                results.push(`❌ <@${memberId}> - User not found`);
                continue;
            }
            
            // Skip if user is trying to timeout themselves
            if (member.id === interaction.user.id) {
                results.push(`❌ ${member.user.tag} - Cannot timeout yourself`);
                continue;
            }
            
            // Skip if bot can't timeout this user
            if (!member.moderatable) {
                results.push(`❌ ${member.user.tag} - User is immune to timeouts`);
                continue;
            }
            
            // Parse duration and reason
            const parsed = parseDurationAndReason(confirmData.args);
            const duration = parsed.duration || 600000;
            const durationString = parsed.durationString || '10m';
            const reason = parsed.reasonParts.join(' ') || 'No reason provided';
            
            // Execute timeout
            try {
                await member.timeout(duration, `${reason} | Timed out by ${interaction.user.tag}`);
                results.push(`<:Okay:1463916646292000802> ${member.user.tag} - Timed out for ${durationString}`);
                
                // Send DM asynchronously
                sendTimeoutDM(member.user, interaction.guild, interaction.user, reason, durationString, confirmData.config, client).catch(() => {});
            } catch (err) {
                results.push(`❌ ${member.user.tag} - ${err.message}`);
            }
        }
        
        // Show summary by EDITING the message
        const summaryEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('Timeout Results')
            .setDescription(results.join('\n'))
            .setTimestamp();
        
        await interaction.editReply({ embeds: [summaryEmbed], components: [] });
        
        // Clean up
        client.moderationConfirms.delete(`timeout_${userId}`);
        return;
    }
    
    // Handle select menu for ban
    if (customId.startsWith('mod_select_ban_')) {
        const userId = customId.split('_')[3];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This select menu is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`ban_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        const selectedIds = interaction.values;
        
        await interaction.deferUpdate();
        
        // Process selected members
        for (const memberId of selectedIds) {
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);
            if (!member) continue;
            
            // Skip if user is trying to ban themselves
            if (member.id === interaction.user.id) continue;
            
            // Skip if bot can't ban this user
            if (!member.bannable) continue;
            
            const message = {
                guild: interaction.guild,
                author: interaction.user,
                member: interaction.member,
                channel: interaction.channel,
                reply: async (data) => {
                    return interaction.channel.send(data);
                }
            };
            
            await executeBan(message, member, confirmData.args, confirmData.config, client);
        }
        
        // Clean up
        await interaction.editReply({ embeds: [], components: [] });
        client.moderationConfirms.delete(`ban_${userId}`);
        return;
    }
    
    // Handle select menu for kick
    if (customId.startsWith('mod_select_kick_')) {
        const userId = customId.split('_')[3];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This select menu is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`kick_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        const selectedIds = interaction.values;
        
        await interaction.deferUpdate();
        
        // Process selected members
        for (const memberId of selectedIds) {
            const member = await interaction.guild.members.fetch(memberId).catch(() => null);
            if (!member) continue;
            
            // Skip if user is trying to kick themselves
            if (member.id === interaction.user.id) continue;
            
            // Skip if bot can't kick this user
            if (!member.kickable) continue;
            
            const message = {
                guild: interaction.guild,
                author: interaction.user,
                member: interaction.member,
                channel: interaction.channel,
                reply: async (data) => {
                    return interaction.channel.send(data);
                }
            };
            
            await executeKick(message, member, confirmData.args, confirmData.config, client);
        }
        
        // Clean up
        await interaction.editReply({ embeds: [], components: [] });
        client.moderationConfirms.delete(`kick_${userId}`);
        return;
    }
    
    // Confirm ban (from fuzzy match)
    if (customId.startsWith('mod_confirm_ban_')) {
        const parts = customId.split('_');
        const memberId = parts[3];
        const userId = parts[4];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This button is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`${memberId}_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        const member = await interaction.guild.members.fetch(memberId).catch(() => null);
        if (!member) {
            return interaction.update({ content: '❌ User not found.', embeds: [], components: [] });
        }
        
        // Parse duration and reason
        const parsed = parseDurationAndReason(confirmData.args);
        const duration = parsed.duration;
        const durationString = parsed.durationString;
        const reason = parsed.reasonParts.join(' ') || 'No reason provided';
        
        // Get user profile for statistics
        const profile = client.cache.profiles.find(p => p.userID === member.id && p.guildID === interaction.guild.id) || {};
        const profiles = client.cache.profiles.filter(p => p.guildID === interaction.guild.id).map(p => Object.assign({}, p)).sort((a, b) => b.xp - a.xp);
        const rank = profiles.findIndex(p => p.userID === member.id) + 1;
        const voiceHours = ((profile.voice || 0) / 3600).toFixed(2);
        
        // Show success message by EDITING the current message
        const successEmbed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle(`<:Okay:1463916646292000802> User Banned  <t:${Math.floor(Date.now() / 1000)}:f>`)
            .setDescription(
                `**User:** ${member.user.username}\n` +
                `**Banned by:** ${interaction.user.username}\n` +
                `**Reason:** ${reason}${durationString ? `\n**Duration:** ${durationString}` : ''}\n` +
                `###\n` +
                `<:Rank:1462593607897841755> Rank: #${rank || 0} ㅤ<:Level:1462593870620655626> Level: ${profile.level || 1}\n\n` +
                ` <:VC_Hours:1452116236820418731>‎ ‎ ${voiceHours} ‎ ‎ <:Messages:1452116146269454568>‎ ‎ ${profile.messages || 0} ‎ ‎ 🪙‎ ‎ ${profile.money || 0} ‎ ‎ <:Reputation:1452880716906893374>‎ ‎ ${profile.rep || 0} ‎ ‎ <:Heart:1452285267368087723>‎ ‎ ${profile.likes || 0} ‎ ‎ 🥇‎ ‎ ${profile.achievements?.length || 0} ‎ ‎ <:Trophies:1452117057331003483>‎ ‎ ${profile.trophies || 0}`
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        
        await interaction.update({ embeds: [successEmbed], components: [] });
        
        // Execute ban asynchronously
        member.ban({ reason: `${reason} | Banned by ${interaction.user.tag}` }).catch(err => {
            interaction.channel.send(`⚠️ Failed to ban ${member.user.tag}: ${err.message}`);
        });
        
        // Send DM asynchronously
        sendBanDM(member.user, interaction.guild, interaction.user, reason, durationString, confirmData.config, client).catch(() => {});
        
        // Clean up
        client.moderationConfirms.delete(`${memberId}_${userId}`);
    }
    
    // Confirm kick (from fuzzy match)
    if (customId.startsWith('mod_confirm_kick_')) {
        const parts = customId.split('_');
        const memberId = parts[3];
        const userId = parts[4];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This button is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`${memberId}_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        const member = await interaction.guild.members.fetch(memberId).catch(() => null);
        if (!member) {
            return interaction.update({ content: '❌ User not found.', embeds: [], components: [] });
        }
        
        const reason = confirmData.args.join(' ') || 'No reason provided';
        
        // Get user profile for statistics
        const profile = client.cache.profiles.find(p => p.userID === member.id && p.guildID === interaction.guild.id) || {};
        const profiles = client.cache.profiles.filter(p => p.guildID === interaction.guild.id).map(p => Object.assign({}, p)).sort((a, b) => b.xp - a.xp);
        const rank = profiles.findIndex(p => p.userID === member.id) + 1;
        const voiceHours = ((profile.voice || 0) / 3600).toFixed(2);
        
        // Show success message by EDITING the current message
        const successEmbed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle(`<:Okay:1463916646292000802> User Kicked  <t:${Math.floor(Date.now() / 1000)}:f>`)
            .setDescription(
                `**User:** ${member.user.username}\n` +
                `**Kicked by:** ${interaction.user.username}\n` +
                `**Reason:** ${reason}\n` +
                `###\n` +
                `<:Rank:1462593607897841755> Rank: #${rank || 0} ㅤ<:Level:1462593870620655626> Level: ${profile.level || 1}\n\n` +
                ` <:VC_Hours:1452116236820418731>‎ ‎ ${voiceHours} ‎ ‎ <:Messages:1452116146269454568>‎ ‎ ${profile.messages || 0} ‎ ‎ 🪙‎ ‎ ${profile.money || 0} ‎ ‎ <:Reputation:1452880716906893374>‎ ‎ ${profile.rep || 0} ‎ ‎ <:Heart:1452285267368087723>‎ ‎ ${profile.likes || 0} ‎ ‎ 🥇‎ ‎ ${profile.achievements?.length || 0} ‎ ‎ <:Trophies:1452117057331003483>‎ ‎ ${profile.trophies || 0}`
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        
        await interaction.update({ embeds: [successEmbed], components: [] });
        
        // Execute kick asynchronously
        member.kick(`${reason} | Kicked by ${interaction.user.tag}`).catch(err => {
            interaction.channel.send(`⚠️ Failed to kick ${member.user.tag}: ${err.message}`);
        });
        
        // Send DM asynchronously
        sendKickDM(member.user, interaction.guild, interaction.user, reason).catch(() => {});
        
        // Clean up
        client.moderationConfirms.delete(`${memberId}_${userId}`);
    }
    
    // Confirm timeout (from fuzzy match)
    if (customId.startsWith('mod_confirm_timeout_') && !customId.includes('_override_')) {
        const parts = customId.split('_');
        const memberId = parts[3];
        const userId = parts[4];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This button is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`${memberId}_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        const member = await interaction.guild.members.fetch(memberId).catch(() => null);
        if (!member) {
            return interaction.update({ content: '❌ User not found.', embeds: [], components: [] });
        }
        
        // Check for recent timeout AFTER fuzzy match confirmation
        const recentTimeout = await checkRecentTimeout(member, interaction.guild);
        if (recentTimeout) {
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(
                    `**A MUTE for this user was created just <t:${recentTimeout.createdAt}:R>:**\n` +
                    `• **Reason:** ${recentTimeout.reason}\n` +
                    `• **Duration:** ${recentTimeout.duration}\n` +
                    `• **Author:** ${recentTimeout.author}\n\n` +
                    `**Are you sure you want to continue?**`
                );
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_confirm_timeout_override_${member.id}_${userId}`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('<:Okay:1463916646292000802>'),
                    new ButtonBuilder()
                        .setCustomId(`mod_cancel_${userId}`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:Cross:1463874026924544116>')
                );
            
            // EDIT the message instead of creating new one
            return interaction.update({ embeds: [embed], components: [row] });
        }
        
        // No recent timeout - parse duration and reason, then show success
        const parsed = parseDurationAndReason(confirmData.args);
        const duration = parsed.duration || 600000;
        const durationString = parsed.durationString || '10m';
        const reason = parsed.reasonParts.join(' ') || 'No reason provided';
        
        // Show success message by EDITING the current message
        const successEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setDescription(`<:Okay:1463916646292000802> **User Timed Out**\n\n**User:** ${member.user.tag}\n**Timed out by:** ${interaction.user.tag}\n**Duration:** ${durationString}\n**Reason:** ${reason}`)
            .setTimestamp();
        
        await interaction.update({ embeds: [successEmbed], components: [] });
        
        // Execute timeout asynchronously
        member.timeout(duration, `${reason} | Timed out by ${interaction.user.tag}`).catch(err => {
            interaction.channel.send(`⚠️ Failed to timeout ${member.user.tag}: ${err.message}`);
        });
        
        // Send DM asynchronously
        sendTimeoutDM(member.user, interaction.guild, interaction.user, reason, durationString, confirmData.config, client).catch(() => {});
        
        // Clean up
        client.moderationConfirms.delete(`${memberId}_${userId}`);
    }
    
    // Confirm timeout override (from recent timeout warning)
    if (customId.startsWith('mod_confirm_timeout_override_')) {
        const parts = customId.split('_');
        const memberId = parts[4];
        const userId = parts[5];
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This button is not for you.', flags: ["Ephemeral"] });
        }
        
        const confirmData = client.moderationConfirms?.get(`${memberId}_${userId}`);
        if (!confirmData) {
            return interaction.reply({ content: '❌ Confirmation expired.', flags: ["Ephemeral"] });
        }
        
        const member = await interaction.guild.members.fetch(memberId).catch(() => null);
        if (!member) {
            return interaction.update({ content: '❌ User not found.', embeds: [], components: [] });
        }
        
        // Parse duration and reason
        const parsed = parseDurationAndReason(confirmData.args);
        const duration = parsed.duration || 600000;
        const durationString = parsed.durationString || '10m';
        const reason = parsed.reasonParts.join(' ') || 'No reason provided';
        
        // Show success message by EDITING the current message
        const successEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setDescription(`<:Okay:1463916646292000802> **User Timed Out**\n\n**User:** ${member.user.tag}\n**Timed out by:** ${interaction.user.tag}\n**Duration:** ${durationString}\n**Reason:** ${reason}`)
            .setTimestamp();
        
        await interaction.update({ embeds: [successEmbed], components: [] });
        
        // Execute timeout asynchronously
        member.timeout(duration, `${reason} | Timed out by ${interaction.user.tag}`).catch(err => {
            interaction.channel.send(`⚠️ Failed to timeout ${member.user.tag}: ${err.message}`);
        });
        
        // Send DM asynchronously
        sendTimeoutDM(member.user, interaction.guild, interaction.user, reason, durationString, confirmData.config, client).catch(() => {});
        
        // Clean up
        client.moderationConfirms.delete(`${memberId}_${userId}`);
    }
    
    // Handle Ban Appeal Button
    if (customId.startsWith('mod_appeal_ban_')) {
        const guildId = customId.split('_')[3];
        
        try {
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) {
                return interaction.reply({
                    content: '❌ Unable to find the server.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Check if user is actually banned
            const isBanned = await guild.bans.fetch(interaction.user.id).catch(() => null);
            if (!isBanned) {
                return interaction.reply({
                    content: '❌ You are not banned from this server.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Get the moderation config for the guild
            const ModerationSystem = require('../schemas/moderationSystemSchema');
            const config = await ModerationSystem.findOne({ guildId: guildId });
            
            if (!config || !config.banAppealSystem.enabled) {
                return interaction.reply({
                    content: '❌ The ban appeal system is not enabled in this server.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Check if user is in ANY mutual server with the bot
            const mutualGuilds = client.guilds.cache.filter(g => {
                return g.members.cache.has(interaction.user.id);
            });
            
            if (mutualGuilds.size === 0) {
                return interaction.reply({
                    content: `❌ You must be in at least one mutual server with the bot to appeal.\n\n${config.banAppealSystem.mutualServerLink ? `**Join the mutual server:** ${config.banAppealSystem.mutualServerLink}` : 'Please contact the server administrators.'}`,
                    flags: ["Ephemeral"]
                });
            }
            
            // Check appeal count
            const UserAppealCount = require('../schemas/userAppealCountSchema');
            let appealCount = await UserAppealCount.findOne({ 
                userId: interaction.user.id, 
                guildId: guildId
            });
            
            if (!appealCount) {
                appealCount = await UserAppealCount.create({
                    userId: interaction.user.id,
                    guildId: guildId,
                    banAppeals: 0,
                    timeoutAppeals: 0
                });
            }
            
            // Check if user has a pending appeal
            const ModerationAppeal = require('../schemas/moderationAppealSchema');
            const pendingAppeal = await ModerationAppeal.findOne({
                userId: interaction.user.id,
                guildId: guildId,
                appealType: 'ban',
                status: 'pending'
            });
            
            if (pendingAppeal) {
                return interaction.reply({
                    content: '❌ You already have a pending ban appeal. Please wait for it to be reviewed before submitting another one.',
                    flags: ["Ephemeral"]
                });
            }
            
            if (appealCount.banAppeals >= config.banAppealSystem.maxAppealsPerUser) {
                return interaction.reply({
                    content: `❌ You have reached the maximum number of ban appeals (${config.banAppealSystem.maxAppealsPerUser}).\n\nYou cannot submit any more appeals.`,
                    flags: ["Ephemeral"]
                });
            }
            
            // Create modal with questions
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            const modal = new ModalBuilder()
                .setCustomId(`ban_appeal_submit_${guildId}`)
                .setTitle('Ban Appeal');
            
            // Filter out empty questions and add to modal
            const questions = config.banAppealSystem.questions.filter(q => q && q.trim());
            questions.forEach((question, index) => {
                const isRequired = index < 3; // First 3 are required
                const input = new TextInputBuilder()
                    .setCustomId(`question_${index}`)
                    .setLabel(question.substring(0, 45)) // Discord label limit (45 chars)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(isRequired)
                    .setMaxLength(1000);
                
                const row = new ActionRowBuilder().addComponents(input);
                modal.addComponents(row);
            });
            
            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('Error handling ban appeal:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your appeal.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
    
    // Handle Timeout Appeal Button
    if (customId.startsWith('mod_appeal_timeout_')) {
        const guildId = customId.split('_')[3];
        
        try {
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) {
                return interaction.reply({
                    content: '❌ Unable to find the server.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Check if user is actually timed out
            const member = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!member) {
                return interaction.reply({
                    content: '❌ You are not a member of this server.',
                    flags: ["Ephemeral"]
                });
            }
            
            if (!member.communicationDisabledUntil || member.communicationDisabledUntil < Date.now()) {
                return interaction.reply({
                    content: '❌ You do not have an active timeout in this server.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Get the moderation config for the guild
            const ModerationSystem = require('../schemas/moderationSystemSchema');
            const config = await ModerationSystem.findOne({ guildId: guildId });
            
            if (!config || !config.timeoutAppealSystem.enabled) {
                return interaction.reply({
                    content: '❌ The timeout appeal system is not enabled in this server.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Check if user is in ANY mutual server with the bot
            const mutualGuilds = client.guilds.cache.filter(g => {
                return g.members.cache.has(interaction.user.id);
            });
            
            if (mutualGuilds.size === 0) {
                return interaction.reply({
                    content: '❌ You must be in at least one mutual server with the bot to appeal.\n\nPlease contact the server administrators.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Check appeal count
            const UserAppealCount = require('../schemas/userAppealCountSchema');
            let appealCount = await UserAppealCount.findOne({ 
                userId: interaction.user.id, 
                guildId: guildId
            });
            
            if (!appealCount) {
                appealCount = await UserAppealCount.create({
                    userId: interaction.user.id,
                    guildId: guildId,
                    banAppeals: 0,
                    timeoutAppeals: 0
                });
            }
            
            // Check if user has a pending appeal
            const ModerationAppeal = require('../schemas/moderationAppealSchema');
            const pendingAppeal = await ModerationAppeal.findOne({
                userId: interaction.user.id,
                guildId: guildId,
                appealType: 'timeout',
                status: 'pending'
            });
            
            if (pendingAppeal) {
                return interaction.reply({
                    content: '❌ You already have a pending timeout appeal. Please wait for it to be reviewed before submitting another one.',
                    flags: ["Ephemeral"]
                });
            }
            
            if (appealCount.timeoutAppeals >= config.timeoutAppealSystem.maxAppealsPerUser) {
                return interaction.reply({
                    content: `❌ You have reached the maximum number of timeout appeals (${config.timeoutAppealSystem.maxAppealsPerUser}).\n\nYou cannot submit any more appeals.`,
                    flags: ["Ephemeral"]
                });
            }
            
            // Create modal with questions
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            const modal = new ModalBuilder()
                .setCustomId(`timeout_appeal_submit_${guildId}`)
                .setTitle('Timeout Appeal');
            
            // Filter out empty questions and add to modal
            const questions = config.timeoutAppealSystem.questions.filter(q => q && q.trim());
            questions.forEach((question, index) => {
                const isRequired = index < 3; // First 3 are required
                const input = new TextInputBuilder()
                    .setCustomId(`question_${index}`)
                    .setLabel(question.substring(0, 45)) // Discord label limit (45 chars)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(isRequired)
                    .setMaxLength(1000);
                
                const row = new ActionRowBuilder().addComponents(input);
                modal.addComponents(row);
            });
            
            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('Error handling timeout appeal:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your appeal.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
    
    // Handle Appeal Approve Button
    if (customId.startsWith('appeal_approve_')) {
        const appealId = customId.split('_')[2];
        
        try {
            const ModerationAppeal = require('../schemas/moderationAppealSchema');
            const appeal = await ModerationAppeal.findById(appealId);
            
            if (!appeal) {
                return interaction.reply({
                    content: '❌ Appeal not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            if (appeal.status !== 'pending') {
                return interaction.reply({
                    content: `❌ This appeal has already been ${appeal.status}.`,
                    flags: ["Ephemeral"]
                });
            }
            
            // Update appeal status
            await ModerationAppeal.findByIdAndUpdate(appealId, {
                status: 'accepted',
                resolvedBy: interaction.user.id,
                resolvedByUsername: interaction.user.tag,
                resolvedAt: new Date()
            });
            
            const guild = client.guilds.cache.get(appeal.guildId);
            if (!guild) {
                return interaction.reply({
                    content: '❌ Guild not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Update the appeal message
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#00ff00')
                .setTitle(interaction.message.embeds[0].title + ' - ✅ APPROVED')
                .addFields({
                    name: '📋 Resolution',
                    value: `**Approved by:** ${interaction.user.tag}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                });
            
            await interaction.update({ embeds: [updatedEmbed], components: [] });
            
            // Notify the user
            const user = await client.users.fetch(appeal.userId).catch(() => null);
            if (user) {
                const notificationEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Appeal Approved')
                    .setDescription(
                        `Your ${appeal.appealType} appeal for **${guild.name}** has been approved!\n\n` +
                        `**Approved by:** ${interaction.user.tag}\n` +
                        `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    )
                    .setThumbnail(guild.iconURL() || null)
                    .setTimestamp();
                
                // Create invite link for the server
                const components = [];
                try {
                    // Try to find a suitable channel to create invite
                    const inviteChannel = guild.channels.cache.find(ch => 
                        ch.isTextBased() && 
                        ch.permissionsFor(guild.members.me).has(['CreateInstantInvite', 'ViewChannel'])
                    );
                    
                    if (inviteChannel) {
                        const invite = await inviteChannel.createInvite({
                            maxAge: 86400, // 24 hours
                            maxUses: 1,
                            unique: true,
                            reason: `Appeal approved for ${user.tag}`
                        }).catch(() => null);
                        
                        if (invite) {
                            const row = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel(`Join ${guild.name}`)
                                        .setStyle(ButtonStyle.Link)
                                        .setURL(invite.url)
                                        .setEmoji('🔗')
                                );
                            components.push(row);
                        }
                    }
                } catch (error) {
                    console.error('Error creating invite:', error);
                }
                
                await user.send({ embeds: [notificationEmbed], components }).catch(() => {});
            }
            
            // If it's a ban appeal, unban the user
            if (appeal.appealType === 'ban') {
                await guild.members.unban(appeal.userId, `Appeal approved by ${interaction.user.tag}`).catch(err => {
                    interaction.followUp({
                        content: `⚠️ Failed to unban user: ${err.message}`,
                        flags: ["Ephemeral"]
                    });
                });
                
                // Reset ban appeal count on approval
                const UserAppealCount = require('../schemas/userAppealCountSchema');
                await UserAppealCount.findOneAndUpdate(
                    { userId: appeal.userId, guildId: appeal.guildId },
                    { $set: { banAppeals: 0 } },
                    { upsert: true }
                );
            }
            
            // If it's a timeout appeal, remove the timeout
            if (appeal.appealType === 'timeout') {
                const member = await guild.members.fetch(appeal.userId).catch(() => null);
                if (member && member.communicationDisabledUntil) {
                    await member.timeout(null, `Appeal approved by ${interaction.user.tag}`).catch(err => {
                        interaction.followUp({
                            content: `⚠️ Failed to remove timeout: ${err.message}`,
                            flags: ["Ephemeral"]
                        });
                    });
                }
                
                // Reset timeout appeal count on approval
                const UserAppealCount = require('../schemas/userAppealCountSchema');
                await UserAppealCount.findOneAndUpdate(
                    { userId: appeal.userId, guildId: appeal.guildId },
                    { $set: { timeoutAppeals: 0 } },
                    { upsert: true }
                );
            }
            
        } catch (error) {
            console.error('Error approving appeal:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while approving the appeal.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
    
    // Handle Appeal Deny Button
    if (customId.startsWith('appeal_deny_')) {
        const appealId = customId.split('_')[2];
        
        try {
            const ModerationAppeal = require('../schemas/moderationAppealSchema');
            const appeal = await ModerationAppeal.findById(appealId);
            
            if (!appeal) {
                return interaction.reply({
                    content: '❌ Appeal not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            if (appeal.status !== 'pending') {
                return interaction.reply({
                    content: `❌ This appeal has already been ${appeal.status}.`,
                    flags: ["Ephemeral"]
                });
            }
            
            // Update appeal status
            await ModerationAppeal.findByIdAndUpdate(appealId, {
                status: 'rejected',
                resolvedBy: interaction.user.id,
                resolvedByUsername: interaction.user.tag,
                resolvedAt: new Date()
            });
            
            const guild = client.guilds.cache.get(appeal.guildId);
            if (!guild) {
                return interaction.reply({
                    content: '❌ Guild not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            // Update the appeal message
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#ff0000')
                .setTitle(interaction.message.embeds[0].title + ' - ❌ DENIED')
                .addFields({
                    name: '📋 Resolution',
                    value: `**Denied by:** ${interaction.user.tag}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                });
            
            await interaction.update({ embeds: [updatedEmbed], components: [] });
            
            // Notify the user
            const user = await client.users.fetch(appeal.userId).catch(() => null);
            if (user) {
                const notificationEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Appeal Denied')
                    .setDescription(
                        `Your ${appeal.appealType} appeal for **${guild.name}** has been denied.\n\n` +
                        `**Denied by:** ${interaction.user.tag}\n` +
                        `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    )
                    .setThumbnail(guild.iconURL() || null)
                    .setTimestamp();
                
                await user.send({ embeds: [notificationEmbed] }).catch(() => {});
            }
            
        } catch (error) {
            console.error('Error denying appeal:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while denying the appeal.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};
