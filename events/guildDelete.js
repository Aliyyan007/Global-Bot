const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildDelete, async (guild) => {
    try {
        const settings = client.cache.settings.get(guild.id)
    if (settings) {
        settings.deleteFromDB = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        await settings.save()    
    }
    await Promise.all(client.cache.promocodeAutogenerators.filter(generator => generator.guildID === guild.id).map(async generator => {
        if (generator.isEnabled) await generator.disable()
        client.cache.promocodeAutogenerators.delete(generator.id)
    }))
    await Promise.all(client.cache.wormholes.filter(wormhole => wormhole.guildID === guild.id).map(async wormhole => {
        if (wormhole.enabled) await wormhole.disable()
        client.cache.wormholes.delete(wormhole.wormholeID)
    }))
    await Promise.all(client.cache.profiles.filter(profile => profile.guildID === guild.id).map(async profile => {
        if (profile.autoIncomeTimeoutId) profile.clearAutoIncomeTimeout()
        client.cache.profiles.delete(profile.guildID+profile.userID)
    }))
    await Promise.all(client.cache.permissions.filter(permission => permission.guildID === guild.id).map(async permission => {
        client.cache.permissions.delete(permission.id)
    }))
    await Promise.all(client.cache.jobs.filter(job => job.guildID === guild.id).map(async job => {
        client.cache.jobs.delete(job.id)
    }))
    await Promise.all(client.cache.giveaways.filter(giveaway => giveaway.guildID === guild.id).map(async giveaway => {
        client.cache.giveaways.delete(giveaway.giveawayID)
    }))
    await Promise.all(client.cache.roles.filter(role => role.guildID === guild.id).map(async role => {
        client.cache.roles.delete(role.id)
    }))
    await Promise.all(client.cache.items.filter(item => item.guildID === guild.id).map(async item => {
        client.cache.items.delete(item.itemID)
    }))
    await Promise.all(client.cache.achievements.filter(achievement => achievement.guildID === guild.id).map(async achievement => {
        client.cache.achievements.delete(achievement.id)
    }))
    await Promise.all(client.cache.channels.filter(channel => channel.guildID === guild.id).map(async channel => {
        client.cache.channels.delete(channel.id)
    }))
    await Promise.all(client.cache.promocodes.filter(promocode => promocode.guildID === guild.id).map(async promocode => {
        client.cache.promocodes.delete(`${promocode.code}_${promocode.guildID}`)
    }))
    await Promise.all(client.cache.lots.filter(lot => lot.guildID === guild.id).map(async lot => {
        client.cache.lots.delete(lot.id)
    }))
    await Promise.all(client.cache.auctions.filter(auction => auction.guildID === guild.id).map(async auction => {
        client.cache.auctions.delete(auction.id)
    }))
    await Promise.all(client.cache.emojiSelectors.filter(emojiSelector => emojiSelector.guildID === guild.id).map(async emojiSelector => {
        client.cache.emojiSelectors.delete(emojiSelector.id)
    }))
    if (settings) {
        if (settings.resetSeasonTimeoutId) settings.clearResetSeasonTimeout()
        client.cache.settings.delete(guild.id)    
    }
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildDelete Event' })
    }
})