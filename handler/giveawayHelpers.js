/**
 * Giveaway Helper Functions
 * Reduces code duplication in giveaway reward distribution
 */
const { RewardType } = require('../enums')
const { handleError } = require('./errorHandler')

/**
 * Return giveaway rewards to creator
 * @param {Object} client - Discord client
 * @param {Object} giveaway - Giveaway object
 * @param {Object} guild - Discord guild
 * @returns {Promise<boolean>} True if rewards were returned successfully
 */
async function returnGiveawayRewards(client, giveaway, guild) {
    if (giveaway.type !== "user") return false
    
    try {
        const profile = await client.functions.fetchProfile(client, giveaway.creator, guild.id)
        
        for (const element of giveaway.rewards) {
            if (element.type === RewardType.Currency) {
                profile.currency = element.amount
            }
            else if (element.type === RewardType.Item) {
                const item = client.cache.items.find(i => i.itemID === element.id && !i.temp)
                if (item) await profile.addItem(element.id, element.amount)
            } 
            else if (element.type === RewardType.Role) {
                const role = guild.roles.cache.get(element.id)
                if (role) profile.addRole(element.id, element.amount, element.ms)
            }
        }
        
        await profile.save().catch(err => {
            handleError(err, {
                context: `Return Giveaway Rewards - ${giveaway.giveawayID}`,
                ownerId: client.config?.discord?.ownerId
            })
            return false
        })
        
        return true
    } catch (err) {
        handleError(err, {
            context: `Return Giveaway Rewards - ${giveaway.giveawayID}`,
            ownerId: client.config?.discord?.ownerId
        })
        return false
    }
}

module.exports = {
    returnGiveawayRewards
}
