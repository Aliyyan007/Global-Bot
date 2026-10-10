/**
 * Autocomplete Helper Functions
 * Reduces code duplication in autocomplete handlers
 */
const node_emoji = require("node-emoji")

/**
 * Filter items by name for autocomplete
 * @param {Object} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} focus - Search term
 * @param {Object} options - Filter options
 * @returns {Array} Filtered items
 */
function filterItemsByName(client, guildId, focus, options = {}) {
    const defaults = {
        enabled: true,
        temp: false,
        found: true,
        inShop: null,
        hasAmount: null,
        hasCrafts: null,
        ...options
    }

    return client.cache.items.filter(item => {
        if (item.guildID !== guildId) return false
        if (defaults.enabled !== null && item.enabled !== defaults.enabled) return false
        if (defaults.temp !== null && item.temp !== defaults.temp) return false
        if (defaults.found !== null && item.found !== defaults.found) return false
        if (defaults.inShop !== null && item.shop?.inShop !== defaults.inShop) return false
        if (defaults.hasAmount !== null && (item.shop?.amount || 0) <= 0) return false
        if (defaults.hasCrafts !== null && !item.crafts?.some(c => c.isFound)) return false
        if (!item.name.toLowerCase().includes(focus.toLowerCase())) return false
        return true
    }).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 25)
}

/**
 * Filter items from user inventory for autocomplete
 * @param {Object} client - Discord client
 * @param {Object} profile - User profile
 * @param {string} guildId - Guild ID
 * @param {string} focus - Search term
 * @param {Object} options - Filter options
 * @returns {Array} Filtered items
 */
function filterInventoryItems(client, profile, guildId, focus, options = {}) {
    const defaults = {
        notDropable: false,
        notTransable: false,
        isAdmin: false,
        ...options
    }

    return client.cache.items.filter(item => {
        if (item.guildID !== guildId) return false
        if (!item.enabled || item.temp) return false
        if (!item.found) return false
        if (!item.name.toLowerCase().includes(focus.toLowerCase())) return false
        if (!defaults.isAdmin && defaults.notDropable && item.notDropable) return false
        if (!defaults.isAdmin && defaults.notTransable && item.notTransable) return false
        if (!profile.inventory.some(x => x.itemID === item.itemID && x.amount > 0)) return false
        return true
    }).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 24)
}

/**
 * Format item options for autocomplete response
 * @param {Array} items - Array of items
 * @param {Object} options - Format options
 * @returns {Array} Formatted options
 */
function formatItemOptions(items, options = {}) {
    const { includePrice = false, includeAmount = false } = options

    return items.map(item => {
        const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
        let name = isDefaultEmoji ? item.displayEmoji + item.name : item.name

        if (includePrice && item.shop?.price) {
            name += ` (p: ${item.shop.price})`
        }
        if (includeAmount) {
            const amount = item.shop?.amount || 0
            name += ` (${amount})`
        }

        return {
            name: name.slice(0, 100), // Discord limit
            value: item.name.slice(0, 100)
        }
    })
}

/**
 * Filter achievements for autocomplete
 * @param {Object} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} focus - Search term
 * @param {Object} options - Filter options
 * @returns {Array} Filtered achievements
 */
function filterAchievements(client, guildId, focus, options = {}) {
    const defaults = {
        enabled: true,
        ...options
    }

    return client.cache.achievements.filter(achievement => {
        if (achievement.guildID !== guildId) return false
        if (defaults.enabled !== null && achievement.enabled !== defaults.enabled) return false
        if (focus && !achievement.name.toLowerCase().includes(focus.toLowerCase()) && 
            !achievement.id.toLowerCase().includes(focus.toLowerCase())) return false
        return true
    }).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 25)
}

/**
 * Format achievement options for autocomplete response
 * @param {Array} achievements - Array of achievements
 * @param {Object} profile - User profile (optional, for filtering)
 * @param {boolean} hasAchievement - Filter by whether user has achievement
 * @returns {Array} Formatted options
 */
function formatAchievementOptions(achievements, profile = null, hasAchievement = null) {
    return achievements
        .filter(achievement => {
            if (profile && hasAchievement !== null) {
                const userHas = profile.achievements?.some(e => e.achievmentID === achievement.id)
                return hasAchievement ? userHas : !userHas
            }
            return true
        })
        .map(achievement => {
            const isDefaultEmoji = node_emoji.hasEmoji(achievement.emoji || "")
            return {
                name: (isDefaultEmoji ? achievement.displayEmoji : "") + achievement.name,
                value: achievement.id
            }
        })
}

/**
 * Filter quests for autocomplete
 * @param {Object} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} focus - Search term
 * @param {Object} options - Filter options
 * @returns {Array} Filtered quests
 */
function filterQuests(client, guildId, focus, options = {}) {
    const defaults = {
        enabled: true,
        ...options
    }

    return client.cache.quests.filter(quest => {
        if (quest.guildID !== guildId) return false
        if (defaults.enabled !== null && quest.enabled !== defaults.enabled) return false
        if (focus && !quest.name.toLowerCase().includes(focus.toLowerCase()) && 
            !quest.id.toLowerCase().includes(focus.toLowerCase())) return false
        return true
    }).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 25)
}

/**
 * Format quest options for autocomplete response
 * @param {Array} quests - Array of quests
 * @param {Object} profile - User profile (optional, for filtering)
 * @param {boolean} hasQuest - Filter by whether user has quest
 * @returns {Array} Formatted options
 */
function formatQuestOptions(quests, profile = null, hasQuest = null) {
    return quests
        .filter(quest => {
            if (profile && hasQuest !== null) {
                const userHas = profile.quests?.some(e => e.questID === quest.id)
                return hasQuest ? userHas : !userHas
            }
            return true
        })
        .map(quest => {
            const isDefaultEmoji = node_emoji.hasEmoji(quest.emoji || "")
            return {
                name: (isDefaultEmoji ? quest.displayEmoji : "") + quest.name,
                value: quest.id
            }
        })
}

module.exports = {
    filterItemsByName,
    filterInventoryItems,
    formatItemOptions,
    filterAchievements,
    formatAchievementOptions,
    filterQuests,
    formatQuestOptions
}
