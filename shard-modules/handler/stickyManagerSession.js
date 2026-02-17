/**
 * Sticky Manager Session State Manager
 * Manages temporary configuration state during the add/remove flow for sticky commands
 * 
 * Sessions auto-expire after 15 minutes to prevent memory leaks
 * 
 * Session state structure:
 * {
 *   guildId: String,
 *   userId: String,
 *   selectedCommands: String[],      // ['profile', 'rank', 'daily']
 *   selectedChannels: String[],      // Channel IDs
 *   messageContent: String | null,   // Text content for embed message
 *   messageEmbed: Object | null,     // Parsed embed from message link
 *   cooldowns: Map<String, Number>,  // commandName -> milliseconds
 *   requirements: Map<String, String[]>, // commandName -> array of requirement IDs
 *   selectedForRemoval: String[],    // Keys of sticky commands selected for removal
 *   publicMessageId: String | null,  // ID of the public panel message
 *   channelId: String | null,        // Channel ID where the panel was sent
 *   createdAt: Date,
 *   expiresAt: Date                  // Auto-cleanup after 15 minutes
 * }
 */

const { Collection } = require("discord.js")

// Session storage - keyed by `${guildId}_${userId}`
const sessions = new Collection()

// Session expiration time in milliseconds (15 minutes)
const SESSION_EXPIRATION_MS = 15 * 60 * 1000

// Cleanup interval (run every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

/**
 * Creates a new session for a user in a guild
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @returns {Object} - The created session object
 */
function createSession(guildId, userId) {
    const sessionKey = `${guildId}_${userId}`
    const now = new Date()
    
    const session = {
        guildId,
        userId,
        selectedCommands: [],
        selectedChannels: [],
        messageContent: null,
        messageEmbed: null,
        cooldowns: new Map(),
        requirements: new Map(), // commandName -> array of requirement IDs
        selectedForRemoval: [],
        publicMessageId: null,
        channelId: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + SESSION_EXPIRATION_MS)
    }
    
    sessions.set(sessionKey, session)
    return session
}

/**
 * Retrieves an existing session for a user in a guild
 * Returns null if session doesn't exist or has expired
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @returns {Object|null} - The session object or null
 */
function getSession(guildId, userId) {
    const sessionKey = `${guildId}_${userId}`
    const session = sessions.get(sessionKey)
    
    if (!session) {
        return null
    }
    
    // Check if session has expired
    if (new Date() > session.expiresAt) {
        sessions.delete(sessionKey)
        return null
    }
    
    return session
}

/**
 * Gets an existing session or creates a new one if it doesn't exist
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @returns {Object} - The session object
 */
function getOrCreateSession(guildId, userId) {
    const existing = getSession(guildId, userId)
    if (existing) {
        return existing
    }
    return createSession(guildId, userId)
}

/**
 * Updates a session with new data
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {Object} updates - Object containing fields to update
 * @returns {Object|null} - The updated session or null if session doesn't exist
 */
function updateSession(guildId, userId, updates) {
    const session = getSession(guildId, userId)
    
    if (!session) {
        return null
    }
    
    // Update allowed fields
    if (updates.selectedCommands !== undefined) {
        session.selectedCommands = updates.selectedCommands
    }
    if (updates.selectedChannels !== undefined) {
        session.selectedChannels = updates.selectedChannels
    }
    if (updates.messageContent !== undefined) {
        session.messageContent = updates.messageContent
    }
    if (updates.messageEmbed !== undefined) {
        session.messageEmbed = updates.messageEmbed
    }
    if (updates.cooldowns !== undefined) {
        session.cooldowns = updates.cooldowns
    }
    if (updates.requirements !== undefined) {
        session.requirements = updates.requirements
    }
    if (updates.selectedForRemoval !== undefined) {
        session.selectedForRemoval = updates.selectedForRemoval
    }
    if (updates.publicMessageId !== undefined) {
        session.publicMessageId = updates.publicMessageId
    }
    if (updates.channelId !== undefined) {
        session.channelId = updates.channelId
    }
    
    // Refresh expiration time on update
    session.expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS)
    
    return session
}

/**
 * Sets a cooldown for a specific command in the session
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {string} commandName - Command name
 * @param {number} cooldownMs - Cooldown in milliseconds
 * @returns {Object|null} - The updated session or null if session doesn't exist
 */
function setCommandCooldown(guildId, userId, commandName, cooldownMs) {
    const session = getSession(guildId, userId)
    
    if (!session) {
        return null
    }
    
    session.cooldowns.set(commandName, cooldownMs)
    session.expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS)
    
    return session
}

/**
 * Removes a cooldown for a specific command in the session
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {string} commandName - Command name
 * @returns {Object|null} - The updated session or null if session doesn't exist
 */
function removeCommandCooldown(guildId, userId, commandName) {
    const session = getSession(guildId, userId)
    
    if (!session) {
        return null
    }
    
    session.cooldowns.delete(commandName)
    session.expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS)
    
    return session
}

/**
 * Sets requirements for a specific command in the session
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {string} commandName - Command name
 * @param {string[]} requirementIds - Array of requirement IDs
 * @returns {Object|null} - The updated session or null if session doesn't exist
 */
function setCommandRequirements(guildId, userId, commandName, requirementIds) {
    const session = getSession(guildId, userId)
    
    if (!session) {
        return null
    }
    
    if (requirementIds && requirementIds.length > 0) {
        session.requirements.set(commandName, requirementIds)
    } else {
        session.requirements.delete(commandName)
    }
    session.expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS)
    
    return session
}

/**
 * Gets requirements for a specific command in the session
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {string} commandName - Command name
 * @returns {string[]} - Array of requirement IDs or empty array
 */
function getCommandRequirements(guildId, userId, commandName) {
    const session = getSession(guildId, userId)
    
    if (!session) {
        return []
    }
    
    return session.requirements.get(commandName) || []
}

/**
 * Removes requirements for a specific command in the session
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {string} commandName - Command name
 * @returns {Object|null} - The updated session or null if session doesn't exist
 */
function removeCommandRequirements(guildId, userId, commandName) {
    const session = getSession(guildId, userId)
    
    if (!session) {
        return null
    }
    
    session.requirements.delete(commandName)
    session.expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS)
    
    return session
}

/**
 * Deletes a session
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @returns {boolean} - True if session was deleted, false if it didn't exist
 */
function deleteSession(guildId, userId) {
    const sessionKey = `${guildId}_${userId}`
    return sessions.delete(sessionKey)
}

/**
 * Checks if a session exists and is not expired
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @returns {boolean} - True if session exists and is valid
 */
function hasSession(guildId, userId) {
    return getSession(guildId, userId) !== null
}

/**
 * Cleans up all expired sessions
 * @returns {number} - Number of sessions cleaned up
 */
function cleanupExpiredSessions() {
    const now = new Date()
    let cleanedCount = 0
    
    sessions.forEach((session, key) => {
        if (now > session.expiresAt) {
            sessions.delete(key)
            cleanedCount++
        }
    })
    
    return cleanedCount
}

/**
 * Gets all active sessions (for debugging/monitoring)
 * @returns {number} - Number of active sessions
 */
function getActiveSessionCount() {
    // Clean up expired sessions first
    cleanupExpiredSessions()
    return sessions.size
}

/**
 * Clears all sessions (useful for testing or shutdown)
 */
function clearAllSessions() {
    sessions.clear()
}

// Start periodic cleanup of expired sessions
let cleanupInterval = null

function startCleanupInterval() {
    if (cleanupInterval) {
        return // Already running
    }
    cleanupInterval = setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS)
}

function stopCleanupInterval() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval)
        cleanupInterval = null
    }
}

// Auto-start cleanup interval
startCleanupInterval()

module.exports = {
    createSession,
    getSession,
    getOrCreateSession,
    updateSession,
    setCommandCooldown,
    removeCommandCooldown,
    setCommandRequirements,
    getCommandRequirements,
    removeCommandRequirements,
    deleteSession,
    hasSession,
    cleanupExpiredSessions,
    getActiveSessionCount,
    clearAllSessions,
    startCleanupInterval,
    stopCleanupInterval,
    SESSION_EXPIRATION_MS
}
