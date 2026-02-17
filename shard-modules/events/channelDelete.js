const client = require("../index")
const { Events } = require("discord.js")
const stickyCommandSchema = require("../schemas/stickyCommandSchema")
const { handleError } = require("../handler/errorHandler")

client.on(Events.ChannelDelete, async (channel) => {
    try {
        await Promise.all(client.cache.settings.filter(settings => settings.channels.mutedChannels.includes(channel.id) || settings.channels.botChannelId === channel.id || settings.channels.generalChannelId === channel.id || settings.channels.bumpNotification === channel.id || settings.channels.giveawaysChannelId === channel.id || settings.channels.levelNotificationChannelId === channel.id || settings.channels.itemsNotificationChannelId === channel.id || settings.channels.achievmentsNotificationChannelId === channel.id || settings.channels.giveawaysMeetingRoom === channel.id || settings.channels.customRoleModerationChannel === channel.id ||  settings.top_report.channelId === channel.id || settings.channels.marketChannel === channel.id || settings.channels.auctionsChannelId === channel.id || settings.channels.usedSeasonCardsChannelId === channel.id || settings.channels.usedAllTimeCardsChannelId === channel.id || settings.channels.usedTeamCardsChannelId === channel.id).map(async settings => {
        if (settings.channels.mutedChannels.includes(channel.id)) {
            settings.channels.mutedChannels = settings.channels.mutedChannels.filter(e => e !== channel.id)
        }
        if (settings.channels.botChannelId === channel.id) {
            settings.channels.botChannelId = undefined
        }
        if (settings.channels.generalChannelId === channel.id) {
            settings.channels.generalChannelId = undefined
        }
        if (settings.channels.bumpNotification === channel.id) {
            settings.channels.bumpNotification = undefined
        }
        if (settings.channels.giveawaysChannelId === channel.id) {
            settings.channels.giveawaysChannelId = undefined
        }
        if (settings.channels.levelNotificationChannelId === channel.id) {
            settings.channels.levelNotificationChannelId = undefined
        }
        if (settings.channels.itemsNotificationChannelId === channel.id) {
            settings.channels.itemsNotificationChannelId = undefined
        }
        if (settings.channels.achievmentsNotificationChannelId === channel.id) {
            settings.channels.achievmentsNotificationChannelId = undefined
        }
        if (settings.channels.giveawaysMeetingRoom === channel.id) {
            settings.channels.giveawaysMeetingRoom = undefined
        }
        if (settings.channels.customRoleModerationChannel === channel.id) {
            settings.channels.customRoleModerationChannel = undefined
        }
        if (settings.top_report.channelId === channel.id) {
            settings.top_report.channelId = undefined
        }
        if (settings.channels.marketChannel === channel.id) {
            settings.channels.marketChannel = undefined
        }
        if (settings.channels.auctionsChannelId === channel.id) {
            settings.channels.auctionsChannelId = undefined
        }
        if (settings.usedSeasonCardsChannelId === channel.id) {
            settings.channels.usedSeasonCardsChannelId = undefined
        }
        if (settings.usedAllTimeCardsChannelId === channel.id) {
            settings.channels.usedAllTimeCardsChannelId = undefined
        }
        if (settings.usedTeamCardsChannelId === channel.id) {
            settings.channels.usedTeamCardsChannelId = undefined
        }
        await settings.save()
    }))
    await Promise.all(client.cache.promocodeAutogenerators.filter(autogenerator => autogenerator.channelId === channel.id).map(async autogenerator => {
        autogenerator.channelId = undefined
        if (autogenerator.enabled) {
            autogenerator.disable()
        }
        await autogenerator.save()
    }))
    await Promise.all(client.cache.auctions.filter(auction => auction.channelId === channel.id).map(async auction => {
        if (auction.status === "started") {
            await auction.delete(true, true)
        } else await auction.delete()
    }))
    await Promise.all(client.cache.giveaways.filter(giveaway => giveaway.channelId === channel.id).map(async giveaway => {
        await giveaway.delete()
    }))
    await Promise.all(client.cache.lots.filter(lot => lot.channelId === channel.id).map(async lot => {
        await lot.return()
    }))
    await Promise.all(client.cache.promocodes.filter(promocode => promocode.channelId === channel.id).map(async promocode => {
        await promocode.delete()
    }))
    await Promise.all(client.cache.wormholes.filter(wormhole => wormhole.channelId === channel.id && wormhole.isEnabled).map(async wormhole => {
        await wormhole.disable()
    }))
    const multipliersChannel = client.cache.channels.get(channel.id)
    if (multipliersChannel) multipliersChannel.delete()
    
    // Clean up sticky commands for the deleted channel
    const stickyCommandsToDelete = client.cache.stickyCommands.filter(
        stickyCommand => stickyCommand.channelID === channel.id
    )
    if (stickyCommandsToDelete.size > 0) {
        // Remove from cache
        for (const [key, stickyCommand] of stickyCommandsToDelete) {
            client.cache.stickyCommands.delete(key)
        }
        // Remove from database
        await stickyCommandSchema.deleteMany({ channelID: channel.id })
    }
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'ChannelDelete Event' })
    }
})