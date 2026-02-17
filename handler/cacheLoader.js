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
const { Collection } = require("discord.js")
const Quest = require("../classes/Quest.js")
const emojiSelectorSchema = require("../schemas/emojiSelectorSchema.js")
const EmojiSelector = require("../classes/EmojiSelector.js")
const auctionSchema = require("../schemas/auctionSchema.js")
const Auction = require("../classes/Auction.js")
const CustomRole = require("../classes/CustomRole.js")
const customRoleSchema = require("../schemas/customRoleSchema.js")
const cache = {
    settings: new Collection(),
    permissions: new Collection(),
    jobs: new Collection(),
    giveaways: new Collection(),
    wormholes: new Collection(),
    profiles: new Collection(),
    webhooks: new Collection(),
    items: new Collection(),
    invites: new Collection(),
    achievements: new Collection(),
    roles: new Collection(),
    channels: new Collection(),
    promocodes: new Collection(),
    promocodeAutogenerators: new Collection(),
    lots: new Collection(),
    quests: new Collection(),
    emojiSelectors: new Collection(),
    auctions: new Collection(),
    customRoles: new Collection(),
    blackjack: new Collection(),
    stickyCommands: new Collection(),
    ready: false
}
const loadCache = async (client) => {
    const guilds = client.guilds.cache.filter(e => e.available).map(e => e.id)
    //SETTINGS
    console.time(`Successfully cached settings`)
    const settings = await client.settingsSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(settings.map(settings => {
      settings = new Settings(client, settings)
      cache.settings.set(settings.guildID, settings)
    }))
    console.timeEnd(`Successfully cached settings`)
    //PERMISSIONS
    console.time(`Successfully cached permissions`)
    const permissions = await client.permissionSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(permissions.map(permission => {
      permission = new Permission(client, permission)
      cache.permissions.set(permission.id, permission)
    }))
    console.timeEnd(`Successfully cached permissions`)
    //JOBS
    console.time(`Successfully cached jobs`)
    const jobs = await client.jobSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(jobs.map(job => {
      job = new Job(client, job)
      cache.jobs.set(job.id, job)
    }))
    console.timeEnd(`Successfully cached jobs`)
    //GIVEAWAYS
    console.time(`Successfully cached giveaways`)
    const giveaways = await client.giveawaySchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(giveaways.map(giveaway => {
      giveaway = new Giveaway(client, giveaway)
      cache.giveaways.set(giveaway.giveawayID, giveaway)
    }))
    console.timeEnd(`Successfully cached giveaways`)
    //WORMHOLES
    console.time(`Successfully cached wormholes`)
    const wormholes = await client.wormholeSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(wormholes.map(wormhole => {
      wormhole = new Wormhole(client, wormhole)
      cache.wormholes.set(wormhole.wormholeID, wormhole)
    }))
    console.timeEnd(`Successfully cached wormholes`)
    //INCOME ROLES
    console.time(`Successfully cached income roles`)
    const roles = await client.roleSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(roles.map(role => {
      role = new IncomeRole(client, role)
      cache.roles.set(role.id, role)
    }))
    console.timeEnd(`Successfully cached income roles`)
    //PROFILES
    console.time(`Successfully cached profiles`)
    const profiles = await client.profileSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(profiles.map(async profile => {
      profile = new Profile(client, profile)
      cache.profiles.set(profile.guildID+profile.userID, profile)
    }))
    console.timeEnd(`Successfully cached profiles`)
    //ITEMS
    console.time(`Successfully cached items`)
    const items = await client.itemSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(items.map(item => {
      item = new Item(client, item)
      cache.items.set(item.itemID, item)
    }))
    console.timeEnd(`Successfully cached items`)
    //ACHIEVEMENTS
    console.time(`Successfully cached achievements`)
    const achievements = await client.achievementSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(achievements.map(achievement => {
      achievement = new Achievement(client, achievement)
      cache.achievements.set(achievement.id, achievement)
    }))
    console.timeEnd(`Successfully cached achievements`)
    //CHANNELS
    console.time(`Successfully cached channels`)
    const channels = await client.channelMultipliersSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(channels.map(channel => {
      channel = new ChannelMultipliers(client, channel)
      cache.channels.set(channel.id, channel)
    }))
    console.timeEnd(`Successfully cached channels`)
    //PROMOCODES
    console.time(`Successfully cached promocodes`)
    const promocodes = await client.promocodeSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(promocodes.map(promocode => {
      promocode = new Promocode(client, promocode)
      cache.promocodes.set(`${promocode.code}_${promocode.guildID}`, promocode)
    }))
    console.timeEnd(`Successfully cached promocodes`)
    //AUTOGENERATORS
    console.time(`Successfully cached autogenerators`)
    const autogenerators = await client.promocodeAutogeneratorSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(autogenerators.map(autogenerator => {
      autogenerator = new Autogenerator(client, autogenerator)
      cache.promocodeAutogenerators.set(autogenerator.id, autogenerator)
    }))
    console.timeEnd(`Successfully cached autogenerators`)
    //LOTS
    console.time(`Successfully cached lots`)
    const lots = await client.marketSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(lots.map(lot => {
      lot = new Lot(client, lot)
      if (lot.lifeTime) lot.setTimeoutDelete()
      cache.lots.set(lot.lotID, lot)
    }))
    console.timeEnd(`Successfully cached lots`)
    //QUESTS
    console.time(`Successfully cached quests`)
    const quests = await client.questSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(quests.map(quest => {
      quest = new Quest(client, quest)
      cache.quests.set(quest.questID, quest)
    }))
    console.timeEnd(`Successfully cached quests`)
    //EMOJIS SELECTORS
    console.time(`Successfully cached emoji selectors`)
    const emojiSelectors = await emojiSelectorSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(emojiSelectors.map(emojiSelector => {
      emojiSelector = new EmojiSelector(client, emojiSelector)
      cache.emojiSelectors.set(emojiSelector.id, emojiSelector)
      if (emojiSelector.deleteDate) emojiSelector.setTimeoutDelete()
    }))
    console.timeEnd(`Successfully cached emoji selectors`)
    //AUCTIONS
    console.time(`Successfully cached emoji auctions`)
    const auctions = await auctionSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(auctions.map(auction => {
      auction = new Auction(client, auction)
      cache.auctions.set(auction.id, auction)
      if (auction.status === "started" && auction.endDate) auction.setTimeoutEnd()
      if (auction.status === "finished" && auction.deleteDate) auction.setTimeoutDelete()
    }))
    console.timeEnd(`Successfully cached emoji auctions`)
    console.time(`Successfully cached custom roles`)
    const customRoles = await customRoleSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(customRoles.map(customRole => {
      customRole = new CustomRole(client, customRole)
      if ((customRole.status === "moderation" || customRole.status === "editing") && customRole.deleteDate) customRole.setTimeoutDelete()
      cache.customRoles.set(customRole.id, customRole)
    }))
    console.timeEnd(`Successfully cached custom roles`)
    //STICKY COMMANDS
    console.time(`Successfully cached sticky commands`)
    const stickyCommands = await client.stickyCommandSchema.find({ guildID: { $in: guilds } }).lean()
    await Promise.all(stickyCommands.map(stickyCommand => {
      const key = `${stickyCommand.guildID}_${stickyCommand.channelID}_${stickyCommand.commandName}`
      // Ensure new fields have default values for backward compatibility
      cache.stickyCommands.set(key, {
        ...stickyCommand,
        embedMessage: stickyCommand.embedMessage || { content: null, embed: null },
        cooldown: stickyCommand.cooldown || null,
        requirements: stickyCommand.requirements || []
      })
    }))
    console.timeEnd(`Successfully cached sticky commands`)
    await client.application.emojis.fetch()
    cache.ready = true
}
module.exports = { cache }
module.exports.loadCache = loadCache