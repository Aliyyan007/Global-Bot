const { ApplicationCommandOptionType, Collection, ShardClientUtil } = require("discord.js")
const Lot = require("../classes/Lot")
module.exports = {
    name: 'reload-cache',
    description: 'Reload cache',
    descriptionLocalizations: {
        'ru': `Перезагрузить кэш`
    },
    options: [
        {
            name: 'cache',
            description: 'Cache',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: `Права`,
                    value: `permissions`
                },
                {
                    name: `Работа`,
                    value: `job`
                },
                {
                    name: `Раздачи`,
                    value: `giveaways`
                },
                {
                    name: `Червоточины`,
                    value: `wormholes`
                },
                {
                    name: `Профили`,
                    value: `profiles`
                },
                {
                    name: `Предметы`,
                    value: `items`
                },
                {
                    name: `Достижения`,
                    value: `achievements`
                },
                {
                    name: `Роли`,
                    value: `roles`
                },
                {
                    name: `Каналы`,
                    value: `channels`
                },
                {
                    name: `Промокоды`,
                    value: `promocodes`
                },
                {
                    name: `Автогенераторы промокодов`,
                    value: `promocodeAutogenerators`
                },
                {
                    name: `Лоты`,
                    value: `lots`
                }
            ]
        },
        {
            name: 'guild_id',
            description: 'guild',
            type: ApplicationCommandOptionType.String
        }
    ],
    dmPermission: true,
    defaultMemberPermissions: "Administrator",
    owner: true,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.user.id !== client.config.discord.ownerId) return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        await interaction.deferReply({ flags: ["Ephemeral"] })
        await client.shard.broadcastEval(async (c, { args }) => {
            const Permission = require(`${process.cwd()}/classes/permission.js`)
            const Job = require(`${process.cwd()}/classes/job.js`)
            const Giveaway = require(`${process.cwd()}/classes/giveaway.js`)
            const Wormhole = require(`${process.cwd()}/classes/wormhole.js`)
            const Profile = require(`${process.cwd()}/classes/profile.js`)
            const Item = require(`${process.cwd()}/classes/item.js`)
            const Achievement = require(`${process.cwd()}/classes/achievement.js`)
            const IncomeRole = require(`${process.cwd()}/classes/IncomeRole`)
            const ChannelMultipliers = require(`${process.cwd()}/classes/channelMultipliers`)
            const Promocode = require(`${process.cwd()}/classes/promocode`)
            const Autogenerator = require(`${process.cwd()}/classes/promocodeAutogenerator`)
            const query = {}
            if (args.guild_id) query.guildID = args.guild_id
            else {
                const guilds = c.guilds.cache.filter(e => e.available).map(e => e.id)
                query.guildID = { $in: guilds }
            }
            if (args.cache === "permissions") {
                const permissions = await c.permissionSchema.find(query).lean()
                await Promise.all(permissions.map(permission => {
                    permission = new Permission(c, permission)
                    c.cache.permissions.set(permission.id, permission)
                })) 
            }
            if (args.cache === "jobs") {
                const jobs = await c.jobSchema.find(query).lean()
                await Promise.all(jobs.map(job => {
                    job = new Job(c, job)
                    c.cache.jobs.set(job.id, job)
                }))
            }
            if (args.cache === "giveaways") {
                const giveaways = await c.giveawaySchema.find(query).lean()
                await Promise.all(giveaways.map(giveaway => {
                    giveaway = new Giveaway(c, giveaway)
                    if (giveaway.endsTime && giveaway.status === "started") giveaway.setTimeoutEnd(c)
                    if (giveaway.deleteTemp && giveaway.status !== "started") giveaway.setTimeoutDelete(c)
                    c.cache.giveaways.set(giveaway.giveawayID, giveaway)
                }))
            }
            if (args.cache === "wormholes") {
                const wormholes = await c.wormholeSchema.find(query).lean()
                await Promise.all(wormholes.map(wormhole => {
                    wormhole = new Wormhole(c, wormhole)
                    if (wormhole.isEnabled) wormhole.cronJobStart()
                    c.cache.wormholes.set(wormhole.wormholeID, wormhole)
                }))
            }
            if (args.cache === "profiles") {
                const profiles = await c.profileSchema.find(query).lean()
                await Promise.all(profiles.map(profile => {
                    profile = new Profile(c, profile)
                    c.cache.profiles.set(profile.guildID+profile.userID, profile)
                })) 
            }
            if (args.cache === "items") {
                const items = await c.itemSchema.find(query).lean()
                await Promise.all(items.map(async item => {
                    item = new Item(c, item)
                    item.displayEmoji = await c.functions.getEmoji(c, item.emoji) 
                    c.cache.items.set(item.itemID, item)
                }))
            }
            if (args.cache === "achievements") {
                const achievements = await c.achievementSchema.find(query).lean()
                await Promise.all(achievements.map(async achievement => {
                    achievement = new Achievement(c, achievement)
                    achievement.displayEmoji = await c.functions.getEmoji(c, achievement.emoji)
                    c.cache.achievements.set(achievement.id, achievement)
                }))
            }
            if (args.cache === "roles") {
                const roles = await c.roleSchema.find(query).lean()
                await Promise.all(roles.map(role => {
                    role = new IncomeRole(c, role)
                    c.cache.roles.set(role.id, role)
                }))
            }
            if (args.cache === "channels") {
                const channels = await c.channelMultipliersSchema.find(query).lean()
                await Promise.all(channels.map(channel => {
                    channel = new ChannelMultipliers(c, channel)
                    c.cache.channels.set(channel.id, channel)
                }))
            }
            if (args.cache === "promocodes") {
                const promocodes = await c.promocodeSchema.find(query).lean()
                await Promise.all(promocodes.map(promocode => {
                    promocode = new Promocode(c, promocode)
                    if (promocode.resetCronPattern) promocode.cronJobStart()
                    if (promocode.deleteDate) promocode.setTimeoutDelete()
                    c.cache.promocodes.set(`${promocode.code}_${promocode.guildID}`, promocode)
                }))
            }
            if (args.cache === "promocodeAutogenerators") {
                const autogenerators = await c.promocodeAutogeneratorSchema.find(query).lean()
                await Promise.all(autogenerators.map(autogenerator => {
                    autogenerator = new Autogenerator(c, autogenerator)
                    if (autogenerator.isEnabled) autogenerator.cronJobStart()
                    c.cache.promocodeAutogenerators.set(autogenerator.id, autogenerator)
                }))
            }
            if (args.cache === "lots") {
                const lots = await c.marketSchema.find(query).lean()
                await Promise.all(lots.map(lot => {
                    lot = new Lot(c, lot)
                    if (lot.lifeTime) lot.setTimeoutDelete()
                    c.cache.lots.set(lot.lotID, lot)
                }))
            }
        }, { shard: args.guild_id ? ShardClientUtil.shardIdForGuildId(args.guild_id, client.shard.count) : undefined, context: { args: args } })
        return interaction.editReply({ content: client.config.emojis.YES })
    }
}