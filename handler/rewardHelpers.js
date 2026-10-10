/**
 * Reward Distribution Helper Functions
 * Reduces code duplication in reward distribution logic
 */
const { handleError } = require('./errorHandler')

/**
 * Calculate reward with boost multiplier
 * @param {number} baseAmount - Base reward amount
 * @param {number} boostMultiplier - Boost multiplier (0-1 range, e.g., 0.5 for 50% boost)
 * @returns {number} Final reward amount
 */
function calculateRewardWithBoost(baseAmount, boostMultiplier) {
    return baseAmount + (baseAmount * boostMultiplier)
}

/**
 * Distribute activity rewards (XP, Currency, RP) to a profile
 * @param {Object} profile - User profile
 * @param {Object} settings - Guild settings
 * @param {string} activity - Activity name (e.g., 'Message', 'Like', 'Voice')
 * @param {number} amount - Base amount multiplier (usually 1)
 * @param {Object} multipliers - Channel multipliers { xp, cur, rp }
 * @returns {Promise<Object>} Object with awarded amounts { xp, currency, rp }
 */
async function distributeActivityRewards(profile, settings, activity, amount = 1, multipliers = {}) {
    const rewards = { xp: 0, currency: 0, rp: 0 }
    const activityLower = activity.toLowerCase()

    try {
        // XP Reward
        const xpSetting = settings[`xpFor${activity}`]
        if (xpSetting && !profile.blockActivities?.[activityLower]?.XP) {
            const baseXp = amount * xpSetting
            const xp = calculateRewardWithBoost(baseXp, profile.getXpBoost(multipliers.xp || 0))
            if (xp > 0) {
                await profile.addXp(xp)
                rewards.xp = xp
            }
        }

        // Currency Reward
        const curSetting = settings[`curFor${activity}`]
        if (curSetting && !profile.blockActivities?.[activityLower]?.CUR) {
            const baseCur = amount * curSetting
            const cur = calculateRewardWithBoost(baseCur, profile.getCurBoost(multipliers.cur || 0))
            if (cur > 0) {
                await profile.addCurrency(cur)
                rewards.currency = cur
            }
        }

        // RP Reward
        const rpSetting = settings[`rpFor${activity}`]
        if (rpSetting && !profile.blockActivities?.[activityLower]?.RP) {
            const baseRp = amount * rpSetting
            const rp = calculateRewardWithBoost(baseRp, profile.getRpBoost(multipliers.rp || 0))
            if (rp > 0) {
                await profile.addRp(rp)
                rewards.rp = rp
            }
        }
    } catch (err) {
        handleError(err, {
            context: `Distribute Activity Rewards - ${activity}`,
            silent: false
        })
    }

    return rewards
}

/**
 * Distribute item rewards based on activity
 * @param {Object} client - Discord client
 * @param {Object} profile - User profile
 * @param {Object} member - Guild member
 * @param {Object} channel - Channel object
 * @param {string} activity - Activity name (lowercase, e.g., 'message', 'like')
 * @param {string} guildId - Guild ID
 * @returns {Promise<Array>} Array of awarded items { itemID, name, emoji, amount }
 */
async function distributeItemRewards(client, profile, member, channel, activity, guildId) {
    const rewards = []

    if (profile.blockActivities?.[activity]?.items) {
        return rewards
    }

    const itemsForActivity = client.cache.items.filter(item => {
        if (item.guildID !== guildId) return false
        if (!item.enabled || item.temp) return false
        if (!item.activities?.[activity]?.amountFrom || !item.activities?.[activity]?.amountTo) return false
        return true
    })

    await Promise.all(itemsForActivity.map(async item => {
        try {
            // Check permission if required
            const permissionId = item[`activities_${activity}_permission`]
            if (permissionId && client.cache.permissions.some(e => e.id === permissionId)) {
                const permission = client.cache.permissions.find(e => e.id === permissionId)
                const isPassing = permission.for(profile, member, channel)
                if (isPassing.value !== true) {
                    return
                }
            }

            // Award item
            const amount = client.functions.getRandomNumber(
                item.activities[activity].amountFrom,
                item.activities[activity].amountTo
            )

            if (member && amount > 0) {
                await profile.addItem(item.itemID, amount)
                rewards.push({
                    itemID: item.itemID,
                    name: item.name,
                    emoji: item.displayEmoji,
                    amount
                })
            }
        } catch (err) {
            handleError(err, {
                context: `Distribute Item Rewards - ${activity} - ${item.itemID}`,
                silent: false
            })
        }
    }))

    return rewards
}

/**
 * Get channel multipliers for a channel
 * @param {Object} client - Discord client
 * @param {Object} channel - Channel object
 * @returns {Object} Multipliers { xp, cur, rp, luck }
 */
function getChannelMultipliers(client, channel) {
    const multipliers = { xp: 0, cur: 0, rp: 0, luck: 0 }

    if (!channel) return multipliers

    // Check direct channel
    let channelConfig = client.cache.channels.find(c => c.id === channel.id && c.isEnabled)
    
    // Check parent category if not found
    if (!channelConfig && channel.parentId) {
        channelConfig = client.cache.channels.find(c => c.id === channel.parentId && c.isEnabled)
    }

    if (channelConfig) {
        multipliers.xp = channelConfig.xp_multiplier || 0
        multipliers.cur = channelConfig.cur_multiplier || 0
        multipliers.rp = channelConfig.rp_multiplier || 0
        multipliers.luck = channelConfig.luck_multiplier || 0
    }

    return multipliers
}

/**
 * Format rewards for display
 * @param {Object} rewards - Rewards object { xp, currency, rp, items }
 * @param {Object} client - Discord client
 * @param {Object} settings - Guild settings
 * @param {string} guildId - Guild ID
 * @param {string} locale - User locale
 * @returns {Array<string>} Array of formatted reward strings
 */
function formatRewardsDisplay(rewards, client, settings, guildId, locale) {
    const display = []

    if (rewards.xp > 0) {
        display.push(`${client.config.emojis.XP}${client.language({ textId: "XP", guildId, locale })} (${rewards.xp.toLocaleString()})`)
    }

    if (rewards.currency > 0) {
        display.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${rewards.currency.toLocaleString()})`)
    }

    if (rewards.rp > 0) {
        display.push(`${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId, locale })} (${rewards.rp.toLocaleString()})`)
    }

    if (rewards.items && rewards.items.length > 0) {
        rewards.items.forEach(item => {
            display.push(`${item.emoji}${item.name} (${item.amount.toLocaleString()})`)
        })
    }

    return display
}

module.exports = {
    calculateRewardWithBoost,
    distributeActivityRewards,
    distributeItemRewards,
    getChannelMultipliers,
    formatRewardsDisplay
}
