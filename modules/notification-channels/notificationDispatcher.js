/**
 * Notification Dispatcher
 * 
 * Sends notifications to configured channels when events occur
 * 
 * @module notification-channels/notificationDispatcher
 */

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getChannelConfig, isNotificationEnabled } = require('./settingsSchemaManager');
const { applyUserThumbnail } = require('./thumbnailProcessor');
const { getLocalizedString } = require('./languageKeys');
const { generateGoodbyeCard } = require('../../handler/generateGoodbyeCard');

/**
 * Send level-up notification
 * 
 * @param {string} guildId - Guild ID
 * @param {GuildMember} member - Guild member
 * @param {number} level - New level
 * @param {Client} client - Discord client
 * @returns {Promise<void>}
 */
async function sendLevelUpNotification(guildId, member, level, client) {
    try {
        // Check if enabled
        const enabled = await isNotificationEnabled(guildId, 'level_up');
        if (!enabled) return;
        
        // Get configuration
        const config = await getChannelConfig(guildId, 'level_up');
        if (!config || !config.channelId) return;
        
        // Get channel
        const channel = await member.guild.channels.fetch(config.channelId);
        if (!channel) return;
        
        // Create embed
        const embed = new EmbedBuilder()
            .setTitle('🎉 Level Up!')
            .setDescription(`${member} has reached level **${level}**!`)
            .setColor(0xFFD700)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending level-up notification:', error);
    }
}

/**
 * Send birthday notification
 * 
 * @param {string} guildId - Guild ID
 * @param {GuildMember} member - Guild member
 * @param {Client} client - Discord client
 * @returns {Promise<void>}
 */
async function sendBirthdayNotification(guildId, member, client) {
    try {
        // Check if enabled
        const enabled = await isNotificationEnabled(guildId, 'birthday');
        if (!enabled) return;
        
        // Get configuration
        const config = await getChannelConfig(guildId, 'birthday');
        if (!config || !config.channelId) return;
        
        // Get channel
        const channel = await member.guild.channels.fetch(config.channelId);
        if (!channel) return;
        
        // Use custom or default message
        if (config.messageType === 'custom' && config.customMessage) {
            let messageData = config.customMessage;
            
            // Apply user thumbnail if configured
            if (config.thumbnailType === 'user_specific') {
                messageData = applyUserThumbnail(messageData, member.user);
            }
            
            await channel.send(messageData);
        } else {
            // Default birthday message
            const embed = new EmbedBuilder()
                .setTitle('🎂 Happy Birthday!')
                .setDescription(`Happy birthday ${member}! 🎉`)
                .setColor(0xFF69B4)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
            
            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error sending birthday notification:', error);
    }
}

/**
 * Send welcome notification
 * 
 * @param {string} guildId - Guild ID
 * @param {GuildMember} member - Guild member
 * @param {Client} client - Discord client
 * @returns {Promise<void>}
 */
async function sendWelcomeNotification(guildId, member, client) {
    try {
        console.log('[Welcome Notification] Checking if enabled for guild:', guildId);
        
        // Check if enabled
        const enabled = await isNotificationEnabled(guildId, 'welcome');
        console.log('[Welcome Notification] Enabled:', enabled);
        if (!enabled) return;
        
        // Get configuration
        const config = await getChannelConfig(guildId, 'welcome');
        console.log('[Welcome Notification] Config:', config);
        if (!config || !config.channelId) return;
        
        // Get channel
        const channel = await member.guild.channels.fetch(config.channelId);
        if (!channel) {
            console.log('[Welcome Notification] Channel not found:', config.channelId);
            return;
        }
        
        console.log('[Welcome Notification] Sending to channel:', channel.name);
        
        // Get member count
        const memberCount = member.guild.memberCount;
        
        // Build welcome message content
        const welcomeContent = `Welcome ${member} **${member.guild.name}!** you're the ${memberCount} member.`;
        
        // Build footer text
        const footerText = `Stay Connected! 😀 • Joined: ${new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`;
        
        // Use custom or default message
        if (config.messageType === 'custom' && config.customMessage) {
            let messageData = { ...config.customMessage };
            
            // Apply user thumbnail if configured
            if (config.thumbnailType === 'user_specific') {
                messageData = applyUserThumbnail(messageData, member.user);
            }
            
            // Add footer to all embeds in custom message
            if (messageData.embeds && messageData.embeds.length > 0) {
                messageData.embeds = messageData.embeds.map(embed => ({
                    ...embed,
                    footer: { text: footerText }
                }));
            }
            
            // Set content with welcome message
            messageData.content = welcomeContent;
            
            await channel.send(messageData);
            console.log('[Welcome Notification] Custom message sent successfully');
        } else {
            // Default welcome message
            const embed = new EmbedBuilder()
                .setDescription(`# ♥ 【Welcome To ${member.guild.name}】 ♥\n###\n\`\`\`💙 A welcoming place where every voice matters and connections grow naturally.\`\`\``)
                .setColor(0x2F3136)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setImage('https://cdn.discordapp.com/attachments/1462115089330213139/1462616499087736973/Blue_and_Black_Futuristic_Welcome_Video.gif')
                .setFooter({ text: footerText });
            
            await channel.send({ content: welcomeContent, embeds: [embed] });
            console.log('[Welcome Notification] Default message sent successfully');
        }
    } catch (error) {
        console.error('Error sending welcome notification:', error);
    }
}

/**
 * Send goodbye notification
 * 
 * @param {string} guildId - Guild ID
 * @param {GuildMember} member - Guild member
 * @param {Object} memberData - Member data (username, displayName, joinDate, etc.)
 * @param {Client} client - Discord client
 * @returns {Promise<void>}
 */
async function sendGoodbyeNotification(guildId, member, memberData, client) {
    try {
        console.log('[Goodbye Notification] Checking if enabled for guild:', guildId);
        
        // Check if enabled
        const enabled = await isNotificationEnabled(guildId, 'goodbye');
        console.log('[Goodbye Notification] Enabled:', enabled);
        if (!enabled) return;
        
        // Get configuration
        const config = await getChannelConfig(guildId, 'goodbye');
        console.log('[Goodbye Notification] Config:', config);
        if (!config || !config.channelId) return;
        
        // Get channel
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.log('[Goodbye Notification] Guild not found');
            return;
        }
        
        const channel = await guild.channels.fetch(config.channelId);
        if (!channel) {
            console.log('[Goodbye Notification] Channel not found:', config.channelId);
            return;
        }
        
        console.log('[Goodbye Notification] Sending to channel:', channel.name);
        
        // Use custom or default message
        if (config.messageType === 'custom' && config.customMessage) {
            let messageData = config.customMessage;
            
            // Apply user thumbnail if configured
            if (config.thumbnailType === 'user_specific') {
                messageData = applyUserThumbnail(messageData, member.user);
            }
            
            await channel.send(messageData);
            console.log('[Goodbye Notification] Custom message sent successfully');
        } else {
            // Get settings for currency emoji
            const settings = client.cache.settings.get(guildId);
            
            // Get profile for statistics
            const profile = client.cache.profiles.get(guildId + member.user.id);
            console.log('[Goodbye Notification] Profile found:', !!profile);
            
            // Calculate voice hours including current session if active
            let displayHours = profile?.hours || 0;
            if (profile?.startTime) {
                const currentSessionHours = (Date.now() - profile.startTime) / 1000 / 60 / 60;
                if (currentSessionHours <= 100) {
                    displayHours += currentSessionHours;
                }
            }
            
            // Calculate top position (rank)
            const topPosition = profile?.rank || 0;
            
            // Build statistics line matching profile command format
            const statsLine = `${client.config.emojis.mic}‎ ‎ ${displayHours.toFixed(2)} ‎ ‎ ${client.config.emojis.message}‎ ‎ ${(profile?.messages || 0).toLocaleString()} ‎ ‎ ${settings?.displayCurrencyEmoji || '💎'}‎ ‎ ${Math.floor(profile?.currency || 0).toLocaleString()} ‎ ‎ ${client.config.emojis.RP}‎ ‎ ${(profile?.rp || 0).toLocaleString()} ‎ ‎ ${client.config.emojis.heart}‎ ‎ ${(profile?.likes || 0).toLocaleString()} ‎ ‎ ${client.config.emojis.top}‎ ‎ ${topPosition || 0} ‎ ‎ ${client.config.emojis.trophies}‎ ‎ ${(profile?.trophies?.length || 0).toLocaleString()}`;
            
            // Get current timestamp in seconds for Discord timestamp format
            const currentTimestamp = Math.floor(Date.now() / 1000);
            
            // Generate goodbye card with user's profile picture overlaid on animated background
            let goodbyeImageBuffer;
            try {
                goodbyeImageBuffer = await generateGoodbyeCard(member.user, member.user.username);
                console.log('[Goodbye Notification] Goodbye card generated successfully');
            } catch (error) {
                console.error('[Goodbye Notification] Error generating goodbye card:', error);
                goodbyeImageBuffer = null;
            }
            
            // Default goodbye message with custom embed format
            const embed = new EmbedBuilder()
                .setDescription(`# 🌸 【Community Update】\nㅤ\n**Left:** <t:${currentTimestamp}:f>\n### <:Rank:1462593607897841755> **Rank:** #${topPosition || 0} ㅤ<:Level:1462593870620655626> **Level:** ${profile?.level || 1}\n\n\`\`\`A member recently left the server. Every presence here matters, and we appreciate everyone who helps make this community what it is.\n\nLet's keep building a positive and welcoming space together. 💙\`\`\`\n\n### ${statsLine}`)
                .setColor(0x2F3136);
            
            // Build goodbye message content
            const memberCount = guild.memberCount;
            const leftCount = memberCount; // Approximate count of members who left
            
            // Build mentions string
            let mentions = '';
            if (config.mentionEveryone) {
                mentions = '@everyone ';
            }
            if (config.mentions?.length) {
                mentions += config.mentions.map(id => {
                    // Try both role and user mention formats
                    // Discord will only render the valid one
                    return `<@&${id}> <@${id}>`;
                }).join(' ');
            }
            
            // Create stylish goodbye message text with mentionable user
            const goodbyeText = `Good Bye! <@${member.user.id}> from **${guild.name}**! User Id Number ${member.user.id} You are the ${leftCount} lefty. 😔`;
            
            // Combine mentions with goodbye text
            const fullContent = mentions.trim() ? `${mentions.trim()}\n${goodbyeText}` : goodbyeText;
            
            // Send message with generated goodbye card
            if (goodbyeImageBuffer) {
                const attachment = new AttachmentBuilder(goodbyeImageBuffer, { name: 'goodbye.png' });
                embed.setImage('attachment://goodbye.png');
                await channel.send({ content: fullContent, embeds: [embed], files: [attachment] });
            } else {
                // Fallback without image
                embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
                await channel.send({ content: fullContent, embeds: [embed] });
            }
            
            console.log('[Goodbye Notification] Default message sent successfully');
        }
    } catch (error) {
        console.error('Error sending goodbye notification:', error);
    }
}

module.exports = {
    sendLevelUpNotification,
    sendBirthdayNotification,
    sendWelcomeNotification,
    sendGoodbyeNotification
};
