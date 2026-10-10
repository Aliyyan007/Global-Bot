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

    // Compute leaderboard rank (profiles are sorted by totalxp)
    let rank = 0;
    if (profile) {
        const profiles = client.cache.profiles.filter(e => e.guildID === member.guild.id).map(e => e).sort((a, b) => b.totalxp - a.totalxp);
        rank = profiles.findIndex(e => e.userID === member.user.id) + 1;
    }

    const memberData = {
        username: member.user.username,
        displayName: member.displayName,
        joinDate: member.joinedAt || new Date(),
        profilePictureUrl: member.user.displayAvatarURL({ dynamic: true }),
        statistics: {}, // Would be populated from profile system
        rank,
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
    try {
        // Fetch profile from cache
        const profile = client.cache.profiles.get(guildId + member.user.id);
        if (!profile) {
            console.error('[handleLevelUp] Profile not found for user:', member.user.id);
            return;
        }
        
        // Fetch settings from cache
        const settings = client.cache.settings.get(guildId);
        if (!settings) {
            console.error('[handleLevelUp] Settings not found for guild:', guildId);
            return;
        }
        
        // Calculate rank by sorting profiles by totalxp
        const profiles = client.cache.profiles.filter(e => e.guildID === guildId).map(e => e).sort((a, b) => b.totalxp - a.totalxp);
        const rank = profiles.findIndex(e => e.userID === member.user.id) + 1;
        
        // Send level-up notification with all required data
        await sendLevelUpNotification(guildId, member, level, client, profile, settings, rank);
    } catch (error) {
        console.error('[handleLevelUp] Error handling level-up:', error);
    }
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
