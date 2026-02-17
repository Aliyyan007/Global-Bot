/**
 * Event Integration for Notification Channels
 * 
 * Integrates notification dispatchers with Discord events
 */

const { sendLevelUpNotification, sendBirthdayNotification, sendWelcomeNotification, sendGoodbyeNotification } = require('./notificationDispatcher');

/**
 * Initialize event listeners for notification channels
 * 
 * @param {Client} client - Discord client
 */
function initializeEventListeners(client) {
    // Note: These are placeholder integrations
    // Actual integration depends on existing event system
    
    // Level-up events should be triggered from existing leveling system
    // Birthday events should be triggered from existing birthday scheduler
    // Welcome/goodbye events are already handled in guildMemberAdd/Remove events
}

/**
 * Handle member join event
 * Call this from events/guildMemberAdd.js
 * 
 * @param {GuildMember} member - Guild member
 * @param {Client} client - Discord client
 */
async function handleMemberJoin(member, client) {
    await sendWelcomeNotification(member.guild.id, member, client);
}

/**
 * Handle member leave event
 * Call this from events/guildMemberRemove.js
 * 
 * @param {GuildMember} member - Guild member
 * @param {Client} client - Discord client
 */
async function handleMemberLeave(member, client) {
    // Gather member data before they leave
    const profile = client.cache.profiles.get(member.guild.id + member.user.id);
    
    const memberData = {
        username: member.user.username,
        displayName: member.displayName,
        joinDate: member.joinedAt || new Date(),
        profilePictureUrl: member.user.displayAvatarURL({ dynamic: true }),
        statistics: {}, // Would be populated from profile system
        rank: profile?.rank || 0,
        level: profile?.level || 0
    };
    
    await sendGoodbyeNotification(member.guild.id, member, memberData, client);
}

/**
 * Handle level-up event
 * Call this from existing leveling system
 * 
 * @param {string} guildId - Guild ID
 * @param {GuildMember} member - Guild member
 * @param {number} level - New level
 * @param {Client} client - Discord client
 */
async function handleLevelUp(guildId, member, level, client) {
    await sendLevelUpNotification(guildId, member, level, client);
}

/**
 * Handle birthday event
 * Call this from existing birthday scheduler
 * 
 * @param {string} guildId - Guild ID
 * @param {GuildMember} member - Guild member
 * @param {Client} client - Discord client
 */
async function handleBirthday(guildId, member, client) {
    await sendBirthdayNotification(guildId, member, client);
}

module.exports = {
    initializeEventListeners,
    handleMemberJoin,
    handleMemberLeave,
    handleLevelUp,
    handleBirthday
};
