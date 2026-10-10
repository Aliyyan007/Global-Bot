const { ApplicationCommandOptionType, Collection, ShardClientUtil } = require("discord.js")
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
            const { loadEntitiesIntoCache, armEntityTimers } = require(`${process.cwd()}/handler/cacheLoader.js`)
            const query = {}
            if (args.guild_id) query.guildID = args.guild_id
            else {
                const guilds = c.guilds.cache.filter(e => e.available).map(e => e.id)
                query.guildID = { $in: guilds }
            }
            // args.cache maps to a cache collection name ("job" choice -> "jobs" collection)
            const cacheName = args.cache === 'job' ? 'jobs' : args.cache
            const only = new Set([cacheName])
            await loadEntitiesIntoCache(c, query, only)
            armEntityTimers(c, args.guild_id || null, only)
            // Refresh derived displayEmoji for entities that carry one
            const emojiCollections = { items: 'itemID', achievements: 'id' }
            const keyField = emojiCollections[args.cache]
            if (keyField) {
                for (const entity of c.cache[args.cache].values()) {
                    if (query.guildID && entity.guildID && entity.guildID !== query.guildID && !query.guildID.$in) continue
                    if (entity.emoji) entity.displayEmoji = await c.functions.getEmoji(c, entity.emoji)
                }
            }
        }, { shard: args.guild_id ? ShardClientUtil.shardIdForGuildId(args.guild_id, client.shard.count) : undefined, context: { args: args } })
        return interaction.editReply({ content: client.config.emojis.YES })
    }
}
