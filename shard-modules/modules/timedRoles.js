const lt = require('long-timeout')

// Store active timeouts in memory
const timedRoleTimeouts = new Map()

/**
 * Initialize timed roles on bot startup
 * @param {Client} client 
 */
async function initTimedRoles(client) {
    console.time('Successfully loaded timed roles')
    const guilds = client.guilds.cache.filter(e => e.available).map(e => e.id)
    const timedRoles = await client.timedRoleSchema.find({ 
        guildID: { $in: guilds },
        expiresAt: { $gt: new Date() }
    }).lean()
    
    for (const timedRole of timedRoles) {
        scheduleRoleRemoval(client, timedRole)
    }
    
    // Clean up expired roles that weren't processed
    await cleanupExpiredRoles(client, guilds)
    console.timeEnd('Successfully loaded timed roles')
}

/**
 * Schedule a role removal
 * @param {Client} client 
 * @param {Object} timedRole 
 */
function scheduleRoleRemoval(client, timedRole) {
    const key = `${timedRole.guildID}_${timedRole.userID}_${timedRole.roleID}`
    const timeUntilExpiry = new Date(timedRole.expiresAt).getTime() - Date.now()
    
    // Clear existing timeout if any
    if (timedRoleTimeouts.has(key)) {
        lt.clearTimeout(timedRoleTimeouts.get(key))
    }
    
    if (timeUntilExpiry <= 0) {
        // Role already expired, remove immediately
        removeTimedRole(client, timedRole)
        return
    }
    
    const timeoutId = lt.setTimeout(async () => {
        await removeTimedRole(client, timedRole)
    }, timeUntilExpiry)
    
    timedRoleTimeouts.set(key, timeoutId)
}

/**
 * Remove a timed role from a user
 * @param {Client} client 
 * @param {Object} timedRole 
 */
async function removeTimedRole(client, timedRole) {
    const key = `${timedRole.guildID}_${timedRole.userID}_${timedRole.roleID}`
    
    try {
        const guild = client.guilds.cache.get(timedRole.guildID)
        if (guild) {
            const member = await guild.members.fetch(timedRole.userID).catch(() => null)
            if (member && member.roles.cache.has(timedRole.roleID)) {
                await member.roles.remove(timedRole.roleID).catch(e => {
                    console.error(`Failed to remove timed role ${timedRole.roleID} from user ${timedRole.userID}:`, e.message)
                })
            }
        }
    } catch (error) {
        console.error(`Error removing timed role:`, error)
    }
    
    // Remove from database
    await client.timedRoleSchema.deleteOne({
        guildID: timedRole.guildID,
        userID: timedRole.userID,
        roleID: timedRole.roleID
    }).catch(() => null)
    
    // Clear timeout reference
    timedRoleTimeouts.delete(key)
}

/**
 * Add a timed role to a user
 * @param {Client} client 
 * @param {string} guildID 
 * @param {string} userID 
 * @param {string} roleID 
 * @param {number} durationMs - Duration in milliseconds
 * @param {string} messageID - Optional reference to dropdown message
 */
async function addTimedRole(client, guildID, userID, roleID, durationMs, messageID = null) {
    const expiresAt = new Date(Date.now() + durationMs)
    
    // Update or create the timed role entry
    await client.timedRoleSchema.findOneAndUpdate(
        { guildID, userID, roleID },
        { guildID, userID, roleID, expiresAt, messageID, createdAt: new Date() },
        { upsert: true, new: true }
    )
    
    // Schedule the removal
    scheduleRoleRemoval(client, { guildID, userID, roleID, expiresAt })
}

/**
 * Cancel a timed role removal
 * @param {Client} client 
 * @param {string} guildID 
 * @param {string} userID 
 * @param {string} roleID 
 */
async function cancelTimedRole(client, guildID, userID, roleID) {
    const key = `${guildID}_${userID}_${roleID}`
    
    // Clear timeout
    if (timedRoleTimeouts.has(key)) {
        lt.clearTimeout(timedRoleTimeouts.get(key))
        timedRoleTimeouts.delete(key)
    }
    
    // Remove from database
    await client.timedRoleSchema.deleteOne({ guildID, userID, roleID }).catch(() => null)
}

/**
 * Get timed role info for a user
 * @param {Client} client 
 * @param {string} guildID 
 * @param {string} userID 
 * @param {string} roleID 
 */
async function getTimedRole(client, guildID, userID, roleID) {
    return await client.timedRoleSchema.findOne({ guildID, userID, roleID }).lean()
}

/**
 * Clean up expired roles that weren't processed (e.g., bot was offline)
 * @param {Client} client 
 * @param {string[]} guilds 
 */
async function cleanupExpiredRoles(client, guilds) {
    const expiredRoles = await client.timedRoleSchema.find({
        guildID: { $in: guilds },
        expiresAt: { $lte: new Date() }
    }).lean()
    
    for (const timedRole of expiredRoles) {
        await removeTimedRole(client, timedRole)
    }
}

/**
 * Parse duration string to milliseconds
 * Supports: min, h, days, year
 * @param {string} input 
 * @returns {number|null} Duration in milliseconds or null if invalid
 */
function parseDuration(input) {
    const trimmed = input.trim().toLowerCase()
    
    // Match patterns like "1h", "30min", "7days", "1year"
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(min|h|days|year)s?$/)
    if (!match) return null
    
    const value = parseFloat(match[1])
    const unit = match[2]
    
    if (value <= 0 || isNaN(value)) return null
    
    const MS_PER_MINUTE = 60 * 1000
    const MS_PER_HOUR = 60 * MS_PER_MINUTE
    const MS_PER_DAY = 24 * MS_PER_HOUR
    const MS_PER_YEAR = 365 * MS_PER_DAY
    
    let durationMs
    switch (unit) {
        case 'min':
            durationMs = value * MS_PER_MINUTE
            break
        case 'h':
            durationMs = value * MS_PER_HOUR
            break
        case 'days':
            durationMs = value * MS_PER_DAY
            break
        case 'year':
            durationMs = value * MS_PER_YEAR
            break
        default:
            return null
    }
    
    // Validate range: 1 minute to 1 year
    const MIN_DURATION = MS_PER_MINUTE
    const MAX_DURATION = MS_PER_YEAR
    
    if (durationMs < MIN_DURATION || durationMs > MAX_DURATION) {
        return null
    }
    
    return Math.floor(durationMs)
}

/**
 * Format duration in milliseconds to human readable string
 * @param {Client} client 
 * @param {number} ms 
 * @param {string} guildId 
 * @param {string} locale 
 */
function formatDuration(client, ms, guildId, locale) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const years = Math.floor(days / 365)
    
    if (years > 0) {
        return `${years} ${client.language({ textId: "year", guildId, locale })}`
    }
    if (days > 0) {
        const remainingHours = hours % 24
        if (remainingHours > 0) {
            return `${days} ${client.language({ textId: "days", guildId, locale })} ${remainingHours} ${client.language({ textId: "HOURS_SMALL", guildId, locale })}`
        }
        return `${days} ${client.language({ textId: "days", guildId, locale })}`
    }
    if (hours > 0) {
        const remainingMinutes = minutes % 60
        if (remainingMinutes > 0) {
            return `${hours} ${client.language({ textId: "HOURS_SMALL", guildId, locale })} ${remainingMinutes} ${client.language({ textId: "minutes", guildId, locale })}`
        }
        return `${hours} ${client.language({ textId: "HOURS_SMALL", guildId, locale })}`
    }
    return `${minutes} ${client.language({ textId: "minutes", guildId, locale })}`
}

// Export as a module function for compatibility with the module loader
// This function does nothing when called by the glob loader
module.exports = function(client) {
    // Module initialization is handled separately via initTimedRoles
}

// Export individual functions for use by other modules
module.exports.initTimedRoles = initTimedRoles
module.exports.scheduleRoleRemoval = scheduleRoleRemoval
module.exports.removeTimedRole = removeTimedRole
module.exports.addTimedRole = addTimedRole
module.exports.cancelTimedRole = cancelTimedRole
module.exports.getTimedRole = getTimedRole
module.exports.parseDuration = parseDuration
module.exports.formatDuration = formatDuration
