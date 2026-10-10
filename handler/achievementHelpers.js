/**
 * Achievement Helper Functions
 * Reduces code duplication in achievement checking and awarding
 */
const { handleError } = require('./errorHandler')

/**
 * Check and award achievements to a user
 * @param {Object} client - Discord client
 * @param {Object} profile - User profile
 * @param {Array} achievements - Achievements to check
 * @param {number} metricValue - Current value of the metric
 * @param {string} context - Context for error logging
 * @returns {Promise<Array>} Array of awarded achievements
 */
async function checkAndAwardAchievements(client, profile, achievements, metricValue, context = '') {
    const awarded = []

    await Promise.all(achievements.map(async achievement => {
        try {
            // Check if user already has achievement
            if (profile.achievements?.some(ach => ach.achievmentID === achievement.id)) {
                return
            }

            // Check if achievement is in temp cache (being processed)
            if (client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                return
            }

            // Check if user meets the requirement
            if (metricValue >= achievement.amount) {
                // Add to temp cache to prevent duplicate awards
                if (!client.tempAchievements[profile.userID]) {
                    client.tempAchievements[profile.userID] = []
                }
                client.tempAchievements[profile.userID].push(achievement.id)

                // Award the achievement
                await profile.addAchievement(achievement)
                awarded.push(achievement)
            }
        } catch (err) {
            handleError(err, {
                ownerId: client.config?.discord?.ownerId,
                context: `Achievement Award ${context} - ${achievement.id}`,
                silent: false
            })
        }
    }))

    return awarded
}

/**
 * Get achievements by type for a guild
 * @param {Object} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} achievementType - Achievement type from AchievementType enum
 * @param {boolean} enabledOnly - Only return enabled achievements
 * @returns {Array} Filtered achievements
 */
function getAchievementsByType(client, guildId, achievementType, enabledOnly = true) {
    return client.cache.achievements.filter(achievement => {
        if (achievement.guildID !== guildId) return false
        if (achievement.type !== achievementType) return false
        if (enabledOnly && !achievement.enabled) return false
        return true
    })
}

/**
 * Clean up temp achievement cache for a user
 * @param {Object} client - Discord client
 * @param {string} userId - User ID
 * @param {string} achievementId - Achievement ID to remove (optional, removes all if not provided)
 */
function cleanupTempAchievements(client, userId, achievementId = null) {
    if (!client.tempAchievements[userId]) return

    if (achievementId) {
        const index = client.tempAchievements[userId].indexOf(achievementId)
        if (index > -1) {
            client.tempAchievements[userId].splice(index, 1)
        }
        // Clean up empty arrays
        if (client.tempAchievements[userId].length === 0) {
            delete client.tempAchievements[userId]
        }
    } else {
        delete client.tempAchievements[userId]
    }
}

/**
 * Batch check multiple achievement types for a user
 * @param {Object} client - Discord client
 * @param {Object} profile - User profile
 * @param {Object} metrics - Object with achievement types as keys and values as metric values
 * @param {string} context - Context for error logging
 * @returns {Promise<Object>} Object with achievement types as keys and awarded achievements as values
 */
async function batchCheckAchievements(client, profile, metrics, context = '') {
    const results = {}

    for (const [achievementType, metricValue] of Object.entries(metrics)) {
        const achievements = getAchievementsByType(client, profile.guildID, achievementType, true)
        if (achievements.length > 0) {
            results[achievementType] = await checkAndAwardAchievements(
                client,
                profile,
                achievements,
                metricValue,
                `${context} - ${achievementType}`
            )
        }
    }

    return results
}

module.exports = {
    checkAndAwardAchievements,
    getAchievementsByType,
    cleanupTempAchievements,
    batchCheckAchievements
}
