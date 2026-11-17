const { ApplicationCommandOptionType, Collection } = require("discord.js")
const USER_OPTION = {
    name: 'user',
    nameLocalizations: {
        'ru': `user`,
        'uk': `user`,
        'es-ES': `usuario`
    },
    description: 'The user to reset limits (pick "All Users" for everyone)',
    descriptionLocalizations: {
        'ru': `Пользователь для сброса лимитов (выберите "All Users" для всех)`,
        'uk': `Користувач для скидання лімітів (виберіть "All Users" для всіх)`,
        'es-ES': `Usuario para reiniciar límites (elige "All Users" para todos)`
    },
    type: ApplicationCommandOptionType.String,
    required: false,
    autocomplete: true
}
const ITEM_OPTION = {
    name: 'item',
    nameLocalizations: {
        'ru': `item`,
        'uk': `item`,
        'es-ES': `objeto`
    },
    description: 'The item for which to reset limits',
    descriptionLocalizations: {
        'ru': `Предмет для которого сбросить лимиты`,
        'uk': `Предмет для якого скинути ліміти`,
        'es-ES': `Objeto para el que reiniciar límites`
    },
    type: ApplicationCommandOptionType.String,
    required: true,
    autocomplete: true
}
module.exports = {
    name: 'reset-limits',
    nameLocalizations: {
        'ru': `reset-limits`,
        'uk': `reset-limits`,
        'es-ES': `reiniciar-límites`
    },
    description: 'Reset user limits on purchases',
    descriptionLocalizations: {
        'ru': `Сбросить лимиты пользователя на покупки`,
        'uk': `Скинути ліміти користувача на покупки`,
        'es-ES': `Reiniciar los límites de compra del usuario`
    },
    options: [
        {
            name: 'daily',
            nameLocalizations: {
                'ru': `daily`,
                'uk': `daily`,
                'es-ES': `diarios`
            },
            description: 'Reset daily limits',
            descriptionLocalizations: {
                'ru': `Сбросить дневные лимиты`,
                'uk': `Скинути щоденні ліміти`,
                'es-ES': `Reiniciar límites diarios`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [ITEM_OPTION, USER_OPTION]
        },
        {
            name: 'weekly',
            nameLocalizations: {
                'ru': `weekly`,
                'uk': `weekly`,
                'es-ES': `semanales`
            },
            description: 'Reset weekly limits',
            descriptionLocalizations: {
                'ru': `Сбросить еженедельные лимиты`,
                'uk': `Скинути щотижневі ліміти`,
                'es-ES': `Reiniciar límites semanales`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [ITEM_OPTION, USER_OPTION]
        },
        {
            name: 'monthly',
            nameLocalizations: {
                'ru': `monthly`,
                'uk': `monthly`,
                'es-ES': `mensuales`
            },
            description: 'Reset monthly limits',
            descriptionLocalizations: {
                'ru': `Сбросить месячные лимиты`,
                'uk': `Скинути щомісячні ліміти`,
                'es-ES': `Reiniciar límites mensuales`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [ITEM_OPTION, USER_OPTION]
        },
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        const time = args.Subcommand === "daily" ? "dailyLimits" : args.Subcommand === "weekly" ? "weeklyLimits" : "monthlyLimits"
        const item = client.cache.items.find(e => e.guildID === interaction.guildId && !e.temp && e.enabled && (e.itemID === args.item || e.name.toLowerCase().includes(args.item.toLowerCase())))
        if (!item) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This item does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
        const allUsers = /^all$/i.test(String(args.user ?? "").trim())
        if (allUsers) {
            await interaction.deferReply({ flags: ["Ephemeral"] })
            if (!client.fetchedMembers.has(interaction.guildId)) {
                await interaction.guild.members.fetch().catch(() => null)
                client.fetchedMembers.add(interaction.guildId)
            }
            const members = interaction.guild.members.cache.filter(m => !m.user.bot)
            let done = 0
            for (const m of members.values()) {
                try {
                    const p = await client.functions.fetchProfile(client, m.id, interaction.guildId)
                    if (!p[time]?.[item.itemID]) continue
                    p[time][item.itemID] = undefined
                    if (!Object.values(p[time]).filter(e => e !== undefined).length) p[time] = undefined
                    await p.save()
                    done++
                    if (done % 50 === 0) {
                        await interaction.editReply({ content: `⏳ ${item.displayEmoji}**${item.name}** — ${done}/${members.size}` }).catch(() => null)
                    }
                } catch (e) {
                    console.error(`[reset-limits all_users] Failed for ${m.id}:`, e)
                }
            }
            if (!done) return interaction.editReply({ content: `${client.config.emojis.NO}${client.language({ textId: "No users have limits for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}**. ${client.language({ textId: "Reset not required", guildId: interaction.guildId, locale: interaction.locale })}.` })
            return interaction.editReply({ content: `${client.config.emojis.YES}${client.language({ textId: "Purchase limit for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "was reset for", guildId: interaction.guildId, locale: interaction.locale })} ${client.language({ textId: "users", guildId: interaction.guildId, locale: interaction.locale })}: ${done.toLocaleString()}.` })
        }
        if (!args.user) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Select a user or pick All Users", guildId: interaction.guildId, locale: interaction.locale })}` })
        const userId = String(args.user).replace(/[<@!>]/g, "").trim()
        const profile = await client.functions.fetchProfile(client, userId, interaction.guildId)
        if (!profile[time] || !profile[time][item.itemID]) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User has no limits for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}**. ${client.language({ textId: "Reset not required", guildId: interaction.guildId, locale: interaction.locale })}.` })
        profile[time][item.itemID] = undefined
        if (!Object.values(profile[time]).filter(e => e !== undefined).length) profile[time] = undefined
        await profile.save()
        return interaction.reply({ content: `${client.config.emojis.YES}${client.language({ textId: "Purchase limit for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "was reset for", guildId: interaction.guildId, locale: interaction.locale })} <@${userId}>.` })
    }
}
