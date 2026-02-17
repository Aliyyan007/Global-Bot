const client = require("../index")
const { setLanguage } = require(`../handler/language`)
const { Events, ShardClientUtil } = require("discord.js")
const { RewardType } = require("../enums")
const Permission = require("../classes/permission.js")
const Job = require("../classes/job.js")
const Giveaway = require("../classes/giveaway.js")
const Wormhole = require("../classes/wormhole.js")
const Profile = require("../classes/profile.js")
const Item = require("../classes/item.js")
const Achievement = require("../classes/achievement.js")
const IncomeRole = require("../classes/IncomeRole")
const ChannelMultipliers = require("../classes/channelMultipliers")
const Promocode = require("../classes/promocode")
const Autogenerator = require("../classes/promocodeAutogenerator")
const Lot = require("../classes/Lot")
const Settings = require("../classes/Settings")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildCreate, async (guild) => {
    try {
        if (client.blacklist(guild.id, "full_ban", "guilds")) return
    let settings = await client.functions.fetchSettings(client, guild.id)
    if (settings.deleteFromDB) {
        settings.deleteFromDB = undefined
        await settings.save()
        const profiles = await client.profileSchema.find({ guildID: guild.id }).lean()
        await Promise.all(profiles.map(async profile => {
            profile = new Profile(client, profile)
            client.cache.profiles.set(profile.guildID+profile.userID, profile)
        }))
        const items = await client.itemSchema.find({ guildID: guild.id }).lean()
        await Promise.all(items.map(item => {
            item = new Item(client, item)
            client.cache.items.set(item.itemID, item)
        }))
        const achievements = await client.achievementSchema.find({ guildID: guild.id }).lean()
        await Promise.all(achievements.map(achievement => {
            achievement = new Achievement(client, achievement)
            client.cache.achievements.set(achievement.id, achievement)
        }))
        const permissions = await client.permissionSchema.find({ guildID: guild.id }).lean()
        await Promise.all(permissions.map(permission => {
            permission = new Permission(client, permission)
            client.cache.permissions.set(permission.id, permission)
        }))
        const jobs = await client.jobSchema.find({ guildID: guild.id }).lean()
        await Promise.all(jobs.map(job => {
            job = new Job(client, job)
            client.cache.jobs.set(job.id, job)
        }))
        const wormholes = await client.wormholeSchema.find({ guildID: guild.id }).lean()
        await Promise.all(wormholes.map(wormhole => {
            wormhole = new Wormhole(client, wormhole)
            if (wormhole.isEnabled) wormhole.cronJobStart()
            client.cache.wormholes.set(wormhole.wormholeID, wormhole)
        }))
        const roles = await client.roleSchema.find({ guildID: guild.id }).lean()
        await Promise.all(roles.map(role => {
            role = new IncomeRole(client, role)
            client.cache.roles.set(role.id, role)
        }))
        const channels = await client.channelMultipliersSchema.find({ guildID: guild.id }).lean()
        await Promise.all(channels.map(channel => {
            channel = new ChannelMultipliers(client, channel)
            client.cache.channels.set(channel.id, channel)
        }))
        const promocodes = await client.promocodeSchema.find({ guildID: guild.id }).lean()
        await Promise.all(promocodes.map(promocode => {
            promocode = new Promocode(client, promocode)
            if (promocode.resetCronPattern) promocode.cronJobStart()
            if (promocode.deleteDate) promocode.setTimeoutDelete()
            client.cache.promocodes.set(`${promocode.code}_${promocode.guildID}`, promocode)
        }))
        const autogenerators = await client.promocodeAutogeneratorSchema.find({ guildID: guild.id }).lean()
        await Promise.all(autogenerators.map(autogenerator => {
            autogenerator = new Autogenerator(client, autogenerator)
            if (autogenerator.isEnabled) autogenerator.cronJobStart()
            client.cache.promocodeAutogenerators.set(autogenerator.id, autogenerator)
        }))
        const lots = await client.marketSchema.find({ guildID: guild.id }).lean()
        await Promise.all(lots.map(lot => {
            lot = new Lot(client, lot)
            if (lot.lifeTime) lot.setTimeoutDelete()
            client.cache.lots.set(lot.lotID, lot)
        }))
        const giveaways = await client.giveawaySchema.find({ guildID: guild.id }).lean()
        await Promise.all(giveaways.map(giveaway => {
            giveaway = new Giveaway(client, giveaway)
            if (giveaway.endsTime && giveaway.status === "started") giveaway.setTimeoutEnd()
            if (giveaway.deleteTemp && giveaway.status !== "started") giveaway.setTimeoutDelete()
            client.cache.giveaways.set(giveaway.giveawayID, giveaway)
        }))
    }
    setLanguage(guild, settings ? settings.language : 'en-US')
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildCreate Event' })
    }
})