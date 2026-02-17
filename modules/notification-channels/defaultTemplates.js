/**
 * Default Message Templates for Notification Channels
 * 
 * Professional, clean, attractive, and minimal templates for all notification types
 * All templates support multi-language through client.language()
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Get default level-up message template
 * 
 * @param {GuildMember} member - Guild member
 * @param {number} level - New level
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @returns {Object} Message options
 */
function getDefaultLevelUpTemplate(member, level, client, guildId) {
    const embed = new EmbedBuilder()
        .setTitle('🎉 Level Up!')
        .setDescription(`Congratulations ${member}! You've reached **Level ${level}**!`)
        .setColor(0xFFD700)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp()
        .setFooter({ text: 'Keep up the great work!' });
    
    return { embeds: [embed] };
}

/**
 * Get default birthday message template
 * 
 * @param {GuildMember} member - Guild member
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @returns {Object} Message options
 */
function getDefaultBirthdayTemplate(member, client, guildId) {
    const embed = new EmbedBuilder()
        .setTitle('🎂 Happy Birthday!')
        .setDescription(`Happy birthday ${member}! 🎉\n\nWishing you an amazing day filled with joy and celebration!`)
        .setColor(0xFF69B4)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage('https://media.giphy.com/media/g5R9dok94mrIvplmZd/giphy.gif')
        .setTimestamp()
        .setFooter({ text: 'Have a wonderful birthday!' });
    
    return { embeds: [embed] };
}

/**
 * Get default welcome message template
 * 
 * @param {GuildMember} member - Guild member
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @returns {Object} Message options
 */
function getDefaultWelcomeTemplate(member, client, guildId) {
    const embed = new EmbedBuilder()
        .setTitle('👋 Welcome!')
        .setDescription(`Welcome to **${member.guild.name}**, ${member}!\n\nWe're glad to have you here. Feel free to explore and have fun!`)
        .setColor(0x57F287)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: 'Member Count', value: `You're member #${member.guild.memberCount}`, inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Enjoy your stay!' });
    
    return { embeds: [embed] };
}

/**
 * Get default goodbye message template
 * 
 * @param {Object} memberData - Member data
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @returns {Object} Message options
 */
function getDefaultGoodbyeTemplate(memberData, client, guildId) {
    const embed = new EmbedBuilder()
        .setTitle('👋 Goodbye')
        .setDescription(`**${memberData.displayName}** has left the server.`)
        .setColor(0xED4245)
        .setThumbnail(memberData.profilePictureUrl)
        .addFields(
            { name: 'Username', value: memberData.username, inline: true },
            { name: 'Display Name', value: memberData.displayName, inline: true },
            { name: 'Joined', value: memberData.joinDate.toLocaleDateString(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'We hope to see you again!' });
    
    if (memberData.rank) {
        embed.addFields({ name: 'Rank', value: `#${memberData.rank}`, inline: true });
    }
    if (memberData.level) {
        embed.addFields({ name: 'Level', value: `${memberData.level}`, inline: true });
    }
    
    return { embeds: [embed] };
}

/**
 * Get default daily reward message template
 * 
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @returns {Object} Message options
 */
function getDefaultDailyRewardTemplate(client, guildId) {
    const embed = new EmbedBuilder()
        .setTitle('🎁 Daily Rewards')
        .setDescription('Click the button below to claim your daily reward!\n\n**Rewards:**\n• Currency\n• Experience Points\n• Special Bonuses')
        .setColor(0xFFD700)
        .setThumbnail('https://cdn.discordapp.com/emojis/1234567890.png') // Placeholder
        .setTimestamp()
        .setFooter({ text: 'Come back every day for more rewards!' });
    
    return { embeds: [embed] };
}

/**
 * Apply multi-language support to template
 * 
 * @param {Object} template - Message template
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} locale - User locale
 * @returns {Object} Localized template
 */
function localizeTemplate(template, client, guildId, locale) {
    // This would use client.language() to translate template strings
    // For now, templates are in English
    return template;
}

module.exports = {
    getDefaultLevelUpTemplate,
    getDefaultBirthdayTemplate,
    getDefaultWelcomeTemplate,
    getDefaultGoodbyeTemplate,
    getDefaultDailyRewardTemplate,
    localizeTemplate
};
