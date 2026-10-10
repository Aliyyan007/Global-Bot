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

/**
 * Declarative entity loaders — each entry loads one collection into the cache.
 * schema: mongoose model (or client schema getter)
 * wrap:   wraps the raw document into its cache class
 * key:    cache key extractor
 * after:  optional per-entity post-processing (timeouts, cron jobs)
 */
const ENTITY_LOADERS = [
    {
        label: 'settings', collection: 'settings',
        schema: c => c.settingsSchema, wrap: (c, d) => new Settings(c, d),
        key: e => e.guildID
    },
    {
        label: 'permissions', collection: 'permissions',
        schema: c => c.permissionSchema, wrap: (c, d) => new Permission(c, d),
        key: e => e.id
    },
    {
        label: 'jobs', collection: 'jobs',
        schema: c => c.jobSchema, wrap: (c, d) => new Job(c, d),
        key: e => e.id
    },
    {
        label: 'giveaways', collection: 'giveaways',
        schema: c => c.giveawaySchema, wrap: (c, d) => new Giveaway(c, d),
        key: e => e.giveawayID
    },
    {
        label: 'wormholes', collection: 'wormholes',
        schema: c => c.wormholeSchema, wrap: (c, d) => new Wormhole(c, d),
        key: e => e.wormholeID
    },
    {
        label: 'income roles', collection: 'roles',
        schema: c => c.roleSchema, wrap: (c, d) => new IncomeRole(c, d),
        key: e => e.id
    },
    {
        label: 'profiles', collection: 'profiles',
        schema: c => c.profileSchema, wrap: (c, d) => new Profile(c, d),
        key: e => e.guildID + e.userID
    },
    {
        label: 'items', collection: 'items',
        schema: c => c.itemSchema, wrap: (c, d) => new Item(c, d),
        key: e => e.itemID
    },
    {
        label: 'achievements', collection: 'achievements',
        schema: c => c.achievementSchema, wrap: (c, d) => new Achievement(c, d),
        key: e => e.id
    },
    {
        label: 'channels', collection: 'channels',
        schema: c => c.channelMultipliersSchema, wrap: (c, d) => new ChannelMultipliers(c, d),
        key: e => e.id
    },
    {
        label: 'promocodes', collection: 'promocodes',
        schema: c => c.promocodeSchema, wrap: (c, d) => new Promocode(c, d),
        key: e => `${e.code}_${e.guildID}`
    },
    {
        label: 'autogenerators', collection: 'promocodeAutogenerators',
        schema: c => c.promocodeAutogeneratorSchema, wrap: (c, d) => new Autogenerator(c, d),
        key: e => e.id
    },
    {
        label: 'lots', collection: 'lots',
        schema: c => c.marketSchema, wrap: (c, d) => new Lot(c, d),
        key: e => e.lotID,
        after: e => { if (e.lifeTime) e.setTimeoutDelete() }
    },
    {
        label: 'quests', collection: 'quests',
        schema: c => c.questSchema, wrap: (c, d) => new Quest(c, d),
        key: e => e.questID
    },
    {
        label: 'emoji selectors', collection: 'emojiSelectors',
        schema: () => emojiSelectorSchema, wrap: (c, d) => new EmojiSelector(c, d),
        key: e => e.id,
        after: e => { if (e.deleteDate) e.setTimeoutDelete() }
    },
    {
        label: 'auctions', collection: 'auctions',
        schema: () => auctionSchema, wrap: (c, d) => new Auction(c, d),
        key: e => e.id,
        after: e => {
            if (e.status === "started" && e.endDate) e.setTimeoutEnd()
            if (e.status === "finished" && e.deleteDate) e.setTimeoutDelete()
        }
    },
    {
        label: 'custom roles', collection: 'customRoles',
        schema: () => customRoleSchema, wrap: (c, d) => new CustomRole(c, d),
        key: e => e.id,
        after: e => {
            if ((e.status === "moderation" || e.status === "editing") && e.deleteDate) e.setTimeoutDelete()
        }
    },
    {
        label: 'sticky commands', collection: 'stickyCommands',
        schema: c => c.stickyCommandSchema, wrap: (c, d) => d,
        key: e => `${e.guildID}_${e.channelID}_${e.commandName}`,
        transform: e => ({
            ...e,
            embedMessage: e.embedMessage || { content: null, embed: null },
            cooldown: e.cooldown || null,
            requirements: e.requirements || []
        })
    },
]

/**
 * Load entities matching a Mongo query into client.cache.
 * @param {Object} query - Mongo filter (e.g. { guildID: { $in: ids } } or { guildID: id })
 * @param {Set<string>} [only] - optional collection names to restrict loading
 */
const loadEntitiesIntoCache = async (client, query, only = null, log = false) => {
    for (const loader of ENTITY_LOADERS) {
        if (only && !only.has(loader.collection)) continue
        if (log) console.time(`Successfully cached ${loader.label}`)
        const docs = await loader.schema(client).find(query).lean()
        await Promise.all(docs.map(doc => {
            const entity = loader.wrap(client, doc)
            const data = loader.transform ? loader.transform(entity) : entity
            cache[loader.collection].set(loader.key(data), data)
            loader.after?.(data)
        }))
        if (log) console.timeEnd(`Successfully cached ${loader.label}`)
    }
}

/**
 * Re-arm timers/cron jobs for entities whose timers live in memory
 * (giveaway ends, wormhole/promocode/autogenerator cron jobs, promocode deletes).
 * Timeout-based entities (lots, auctions, selectors, custom roles) are armed
 * by the ENTITY_LOADERS `after` hooks instead.
 */
const armEntityTimers = (client, guildId = null, only = null) => {
    const belongs = e => !guildId || e.guildID === guildId
    const wants = col => !only || only.has(col)
    if (wants('giveaways')) {
        client.cache.giveaways.filter(e => belongs(e) && e.endsTime && e.status === "started").forEach(giveaway => giveaway.setTimeoutEnd())
        client.cache.giveaways.filter(e => belongs(e) && e.deleteTemp && e.status !== "started").forEach(giveaway => giveaway.setTimeoutDelete())
    }
    if (wants('wormholes')) client.cache.wormholes.filter(e => belongs(e) && e.isEnabled).forEach(wormhole => wormhole.cronJobStart())
    if (wants('promocodeAutogenerators')) client.cache.promocodeAutogenerators.filter(e => belongs(e) && e.isEnabled).forEach(autogenerator => autogenerator.cronJobStart())
    if (wants('promocodes')) {
        client.cache.promocodes.filter(e => belongs(e) && e.resetCronPattern).forEach(promocode => promocode.cronJobStart())
        client.cache.promocodes.filter(e => belongs(e) && e.deleteDate).forEach(promocode => promocode.setTimeoutDelete())
    }
}

const loadCache = async (client) => {
    const guilds = client.guilds.cache.filter(e => e.available).map(e => e.id)
    await loadEntitiesIntoCache(client, { guildID: { $in: guilds } }, null, true)
    await client.application.emojis.fetch()
    cache.ready = true
}
module.exports = { cache }
module.exports.loadCache = loadCache
module.exports.loadEntitiesIntoCache = loadEntitiesIntoCache
module.exports.armEntityTimers = armEntityTimers
