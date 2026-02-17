const { ApplicationCommandOptionType, Collection } = require("discord.js")
module.exports = {
    name: 'reset-limits',
    nameLocalizations: {
        'ru': `сброс-лимитов`,
        'uk': `скинути-ліміти`,
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
                'ru': `дневные`,
                'uk': `щоденні`,
                'es-ES': `diarios`
            },
            description: 'Reset daily limits',
            descriptionLocalizations: {
                'ru': `Сбросить дневные лимиты`,
                'uk': `Скинути щоденні ліміти`,
                'es-ES': `Reiniciar límites diarios`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `пользователь`,
                        'uk': `користувач`,
                        'es-ES': `usuario`
                    },
                    description: 'The user to reset limits',
                    descriptionLocalizations: {
                        'ru': `Пользователь для сброса лимитов`,
                        'uk': `Користувач для скидання лімітів`,
                        'es-ES': `Usuario para reiniciar límites`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'item',
                    nameLocalizations: {
                        'ru': `предмет`,
                        'uk': `предмет`,
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
            ]
        },
        {
            name: 'weekly',
            nameLocalizations: {
                'ru': `еженедельные`,
                'uk': `щотижневі`,
                'es-ES': `semanales`
            },
            description: 'Reset weekly limits',
            descriptionLocalizations: {
                'ru': `Сбросить еженедельные лимиты`,
                'uk': `Скинути щотижневі ліміти`,
                'es-ES': `Reiniciar límites semanales`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `пользователь`,
                        'uk': `користувач`,
                        'es-ES': `usuario`
                    },
                    description: 'The user to reset limits',
                    descriptionLocalizations: {
                        'ru': `Пользователь для сброса лимитов`,
                        'uk': `Користувач для скидання лімітів`,
                        'es-ES': `Usuario para reiniciar límites`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'item',
                    nameLocalizations: {
                        'ru': `предмет`,
                        'uk': `предмет`,
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
            ]
        },
        {
            name: 'monthly',
            nameLocalizations: {
                'ru': `месячные`,
                'uk': `щомісячні`,
                'es-ES': `mensuales`
            },
            description: 'Reset monthly limits',
            descriptionLocalizations: {
                'ru': `Сбросить месячные лимиты`,
                'uk': `Скинути щомісячні ліміти`,
                'es-ES': `Reiniciar límites mensuales`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `пользователь`,
                        'uk': `користувач`,
                        'es-ES': `usuario`
                    },
                    description: 'The user to reset limits',
                    descriptionLocalizations: {
                        'ru': `Пользователь для сброса лимитов`,
                        'uk': `Користувач для скидання лімітів`,
                        'es-ES': `Usuario para reiniciar límites`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'item',
                    nameLocalizations: {
                        'ru': `предмет`,
                        'uk': `предмет`,
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
            ]
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
        const profile = await client.functions.fetchProfile(client, args.user, interaction.guildId)
        const item = client.cache.items.find(e => e.guildID === interaction.guildId && !e.temp && e.enabled && (e.itemID === args.item || e.name.toLowerCase().includes(args.item.toLowerCase())))
        if (!item) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This item does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
        if (!profile[time] || !profile[time][item.itemID]) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User has no limits for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}**. ${client.language({ textId: "Reset not required", guildId: interaction.guildId, locale: interaction.locale })}.` })
        profile[time][item.itemID] = undefined
        if (!Object.values(profile[time]).filter(e => e !== undefined).length) profile[time] = undefined
        await profile.save()
        return interaction.reply({ content: `${client.config.emojis.YES}${client.language({ textId: "Purchase limit for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "was reset for", guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>.` })
    }
}