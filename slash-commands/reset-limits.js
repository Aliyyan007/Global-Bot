const { ApplicationCommandOptionType, Collection } = require("discord.js")
const USER_OPTION = {
    name: 'user',
    nameLocalizations: {
        'ru': `user`,
        'uk': `user`,
        'es-ES': `usuario`
    },
    description: 'The user to reset limits',
    descriptionLocalizations: {
        'ru': `Пользователь для сброса лимитов`,
        'uk': `Користувач для скидання лімітів`,
        'es-ES': `Usuario para reiniciar límites`
    },
    type: ApplicationCommandOptionType.User,
    required: false
}
const ALL_USERS_OPTION = {
    name: 'all_users',
    nameLocalizations: {
        'ru': `all_users`,
        'uk': `all_users`,
        'es-ES': `todos`
    },
    description: 'Apply to all users in the server',
    descriptionLocalizations: {
        'ru': `Применить ко всем пользователям сервера`,
        'uk': `Застосувати до всіх користувачів сервера`,
        'es-ES': `Aplicar a todos los usuarios del servidor`
    },
    type: ApplicationCommandOptionType.Boolean,
    required: false
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
            options: [ITEM_OPTION, USER_OPTION, ALL_USERS_OPTION]
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
            options: [ITEM_OPTION, USER_OPTION, ALL_USERS_OPTION]
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
            options: [ITEM_OPTION, USER_OPTION, ALL_USERS_OPTION]
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
        if (args.all_users === true) {
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
        if (!args.user) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Select a user or enable the All Users option", guildId: interaction.guildId, locale: interaction.locale })}` })
        const profile = await client.functions.fetchProfile(client, args.user, interaction.guildId)
        if (!profile[time] || !profile[time][item.itemID]) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User has no limits for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}**. ${client.language({ textId: "Reset not required", guildId: interaction.guildId, locale: interaction.locale })}.` })
        profile[time][item.itemID] = undefined
        if (!Object.values(profile[time]).filter(e => e !== undefined).length) profile[time] = undefined
        await profile.save()
        return interaction.reply({ content: `${client.config.emojis.YES}${client.language({ textId: "Purchase limit for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "was reset for", guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>.` })
    }
}
