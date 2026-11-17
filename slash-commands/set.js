const { ApplicationCommandOptionType, Collection } = require("discord.js")
const { AchievementType } = require("../enums")
const USER_OPTION = {
    name: 'user',
    nameLocalizations: {
        'ru': `user`,
        'uk': `user`,
        'es-ES': `usuario`
    },
    description: 'Target user (pick "All Users" to apply to everyone)',
    descriptionLocalizations: {
        'ru': `Целевой пользователь (выберите "All Users" для всех)`,
        'uk': `Цільовий користувач (виберіть "All Users" для всіх)`,
        'es-ES': `Usuario objetivo (elige "All Users" para todos)`
    },
    type: ApplicationCommandOptionType.String,
    required: false,
    autocomplete: true
}
module.exports = {
    name: 'set',
    nameLocalizations: {
        'ru': `set`,
        'uk': `set`,
        'es-ES': `establecer`
    },
    description: 'Set level, XP, currency or RP to the user',
    descriptionLocalizations: {
        'ru': `Установить уровень, опыт, валюту, лайки или репутацию пользователю`,
        'uk': `Встановити рівень, досвід, валюту, лайки або репутацію користувачу`,
        'es-ES': `Establecer nivel, XP, moneda o RP al usuario`
    },
    options: [
        {
            name: 'level',
            nameLocalizations: {
                'ru': `level`,
                'uk': `level`,
                'es-ES': `nivel`
            },
            description: 'Set level',
            descriptionLocalizations: {
                'ru': `Установить уровень`,
                'uk': `Встановити рівень`,
                'es-ES': `Establecer nivel`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `amount`,
                        'uk': `amount`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of levels',
                    descriptionLocalizations: {
                        'ru': `Количество уровней`,
                        'uk': `Кількість рівнів`,
                        'es-ES': `Cantidad de niveles`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 1,
                    max_value: 1000
                },
                USER_OPTION
            ]
        },
        {
            name: 'season_level',
            nameLocalizations: {
                'ru': `season_level`,
                'uk': `season_level`,
                'es-ES': `nivel_temporada`
            },
            description: 'Set season level',
            descriptionLocalizations: {
                'ru': `Установить сезонный уровень`,
                'uk': `Встановити сезонний рівень`,
                'es-ES': `Establecer nivel de temporada`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `amount`,
                        'uk': `amount`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of season levels',
                    descriptionLocalizations: {
                        'ru': `Количество сезонных уровней`,
                        'uk': `Кількість сезонних рівнів`,
                        'es-ES': `Cantidad de niveles de temporada`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 1,
                    max_value: 1000
                },
                USER_OPTION
            ]
        },
        {
            name: 'experience',
            nameLocalizations: {
                'ru': `experience`,
                'uk': `experience`,
                'es-ES': `experiencia`
            },
            description: 'Set experience',
            descriptionLocalizations: {
                'ru': `Установить опыт`,
                'uk': `Встановити досвід`,
                'es-ES': `Establecer experiencia`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `amount`,
                        'uk': `amount`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of experience',
                    descriptionLocalizations: {
                        'ru': `Количество опыта`,
                        'uk': `Кількість досвіду`,
                        'es-ES': `Cantidad de experiencia`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: 1000000
                },
                USER_OPTION
            ]
        },
        {
            name: 'currency',
            nameLocalizations: {
                'ru': `currency`,
                'uk': `currency`,
                'es-ES': `moneda`
            },
            description: 'Set currency',
            descriptionLocalizations: {
                'ru': `Установить валюту`,
                'uk': `Встановити валюту`,
                'es-ES': `Establecer moneda`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `amount`,
                        'uk': `amount`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of currency',
                    descriptionLocalizations: {
                        'ru': `Количество валюты`,
                        'uk': `Кількість валюти`,
                        'es-ES': `Cantidad de moneda`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: 1000000000
                },
                USER_OPTION
            ]
        },
        {
            name: 'reputation',
            nameLocalizations: {
                'ru': `reputation`,
                'uk': `reputation`,
                'es-ES': `reputación`
            },
            description: 'Set reputation',
            descriptionLocalizations: {
                'ru': `Установить репутацию`,
                'uk': `Встановити репутацію`,
                'es-ES': `Establecer reputación`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `amount`,
                        'uk': `amount`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of reputation',
                    descriptionLocalizations: {
                        'ru': `Количество репутации`,
                        'uk': `Кількість репутації`,
                        'es-ES': `Cantidad de reputación`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: -1000,
                    max_value: 1000
                },
                USER_OPTION
            ]
        },
        {
            name: 'likes',
            nameLocalizations: {
                'ru': `likes`,
                'uk': `likes`,
                'es-ES': `me-gusta`
            },
            description: 'Set likes',
            descriptionLocalizations: {
                'ru': `Установить лайки`,
                'uk': `Встановити лайки`,
                'es-ES': `Establecer me gusta`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `amount`,
                        'uk': `amount`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of likes',
                    descriptionLocalizations: {
                        'ru': `Количество лайков`,
                        'uk': `Кількість лайків`,
                        'es-ES': `Cantidad de me gusta`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: 10000
                },
                USER_OPTION
            ]
        },
        {
            name: 'luck_boost',
            nameLocalizations: {
                'ru': `luck_boost`,
                'uk': `luck_boost`,
                'es-ES': `impulso_suerte`
            },
            description: 'Set luck boost',
            descriptionLocalizations: {
                'ru': `Установить буст к удаче`,
                'uk': `Встановити буст до удачі`,
                'es-ES': `Establecer impulso de suerte`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `user`,
                        'uk': `user`,
                        'es-ES': `usuario`
                    },
                    description: 'Target user',
                    descriptionLocalizations: {
                        'ru': `Целевой пользователь`,
                        'uk': `Цільовий користувач`,
                        'es-ES': `Usuario objetivo`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'percent',
                    nameLocalizations: {
                        'ru': `percent`,
                        'uk': `percent`,
                        'es-ES': `porcentaje`
                    },
                    description: 'Multiplier as a percentage',
                    descriptionLocalizations: {
                        'ru': `Множитель в процентах`,
                        'uk': `Множник у відсотках`,
                        'es-ES': `Multiplicador como porcentaje`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: 10000
                },
                {
                    name: 'time',
                    nameLocalizations: {
                        'ru': `time`,
                        'uk': `time`,
                        'es-ES': `tiempo`
                    },
                    description: 'Time in minutes',
                    descriptionLocalizations: {
                        'ru': `Время в минутах`,
                        'uk': `Час у хвилинах`,
                        'es-ES': `Tiempo en minutos`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 1,
                    max_value: 10000000
                }
            ]
        },
        {
            name: 'xp_boost',
            nameLocalizations: {
                'ru': `xp_boost`,
                'uk': `xp_boost`,
                'es-ES': `impulso_experiencia`
            },
            description: 'Set experience boost',
            descriptionLocalizations: {
                'ru': `Установить буст к опыту`,
                'uk': `Встановити буст до досвіду`,
                'es-ES': `Establecer impulso de experiencia`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `user`,
                        'uk': `user`,
                        'es-ES': `usuario`
                    },
                    description: 'Target user',
                    descriptionLocalizations: {
                        'ru': `Целевой пользователь`,
                        'uk': `Цільовий користувач`,
                        'es-ES': `Usuario objetivo`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'percent',
                    nameLocalizations: {
                        'ru': `percent`,
                        'uk': `percent`,
                        'es-ES': `porcentaje`
                    },
                    description: 'Multiplier as a percentage',
                    descriptionLocalizations: {
                        'ru': `Множитель в процентах`,
                        'uk': `Множник у відсотках`,
                        'es-ES': `Multiplicador como porcentaje`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: 10000
                },
                {
                    name: 'time',
                    nameLocalizations: {
                        'ru': `time`,
                        'uk': `time`,
                        'es-ES': `tiempo`
                    },
                    description: 'Time in minutes',
                    descriptionLocalizations: {
                        'ru': `Время в минутах`,
                        'uk': `Час у хвилинах`,
                        'es-ES': `Tiempo en minutos`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 1,
                    max_value: 10000000
                }
            ]
        },
        {
            name: 'currency_boost',
            nameLocalizations: {
                'ru': `currency_boost`,
                'uk': `currency_boost`,
                'es-ES': `impulso_moneda`
            },
            description: 'Set currency boost',
            descriptionLocalizations: {
                'ru': `Установить буст к валюте`,
                'uk': `Встановити буст до валюти`,
                'es-ES': `Establecer impulso de moneda`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `user`,
                        'uk': `user`,
                        'es-ES': `usuario`
                    },
                    description: 'Target user',
                    descriptionLocalizations: {
                        'ru': `Целевой пользователь`,
                        'uk': `Цільовий користувач`,
                        'es-ES': `Usuario objetivo`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'percent',
                    nameLocalizations: {
                        'ru': `percent`,
                        'uk': `percent`,
                        'es-ES': `porcentaje`
                    },
                    description: 'Multiplier as a percentage',
                    descriptionLocalizations: {
                        'ru': `Множитель в процентах`,
                        'uk': `Множник у відсотках`,
                        'es-ES': `Multiplicador como porcentaje`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: 10000
                },
                {
                    name: 'time',
                    nameLocalizations: {
                        'ru': `time`,
                        'uk': `time`,
                        'es-ES': `tiempo`
                    },
                    description: 'Time in minutes',
                    descriptionLocalizations: {
                        'ru': `Время в минутах`,
                        'uk': `Час у хвилинах`,
                        'es-ES': `Tiempo en minutos`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 1,
                    max_value: 10000000
                }
            ]
        },
        {
            name: 'rp_boost',
            nameLocalizations: {
                'ru': `rp_boost`,
                'uk': `rp_boost`,
                'es-ES': `impulso_reputación`
            },
            description: 'Set reputation boost',
            descriptionLocalizations: {
                'ru': `Установить буст к репутации`,
                'uk': `Встановити буст до репутації`,
                'es-ES': `Establecer impulso de reputación`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `user`,
                        'uk': `user`,
                        'es-ES': `usuario`
                    },
                    description: 'Target user',
                    descriptionLocalizations: {
                        'ru': `Целевой пользователь`,
                        'uk': `Цільовий користувач`,
                        'es-ES': `Usuario objetivo`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'percent',
                    nameLocalizations: {
                        'ru': `percent`,
                        'uk': `percent`,
                        'es-ES': `porcentaje`
                    },
                    description: 'Multiplier as a percentage',
                    descriptionLocalizations: {
                        'ru': `Множитель в процентах`,
                        'uk': `Множник у відсотках`,
                        'es-ES': `Multiplicador como porcentaje`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 0,
                    max_value: 10000
                },
                {
                    name: 'time',
                    nameLocalizations: {
                        'ru': `time`,
                        'uk': `time`,
                        'es-ES': `tiempo`
                    },
                    description: 'Time in minutes',
                    descriptionLocalizations: {
                        'ru': `Время в минутах`,
                        'uk': `Час у хвилинах`,
                        'es-ES': `Tiempo en minutos`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 1,
                    max_value: 10000000
                }
            ]
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
        const L = (textId) => client.language({ textId, guildId: interaction.guildId, locale: interaction.locale })
        const userArg = String(args.user ?? "").trim()
        const allUsers = /^all$/i.test(userArg)
        let member = null
        let userId = null
        if (!allUsers) {
            if (!args.user) return interaction.editReply({ content: `${client.config.emojis.NO} ${L("Select a user or pick All Users")}` })
            userId = userArg.replace(/[<@!>]/g, "")
            if (/^\d{5,}$/.test(userId)) member = await interaction.guild.members.fetch(userId).catch(() => null)
            if (!member) {
                // Autocomplete returns IDs, but a typed name should still resolve
                const q = userArg.toLowerCase()
                member = interaction.guild.members.cache.find(m => !m.user.bot && (m.user.username.toLowerCase() === q || (m.displayName || "").toLowerCase() === q))
                    || (await interaction.guild.members.fetch({ query: userArg, limit: 5 }).catch(() => null))?.find(m => !m.user.bot) || null
            }
            if (!member) return interaction.editReply({ content: `${client.config.emojis.NO} ${L("User with ID")} **${args.user}** ${L("not found on server")}.`})
            if (member.user.bot) return interaction.editReply({ content: `${client.config.emojis.NO} ${L("You cannot use this command for a bot")}.`, flags: ["Ephemeral"] })
            userId = member.id
        }
        // Guild-wide application: walks every non-bot member, applies `fn`
        // to their profile, reports progress, returns the affected count.
        async function applyToAllUsers(label, fn) {
            if (!client.fetchedMembers.has(interaction.guildId)) {
                await interaction.guild.members.fetch().catch(() => null)
                client.fetchedMembers.add(interaction.guildId)
            }
            const members = interaction.guild.members.cache.filter(m => !m.user.bot)
            let done = 0
            for (const m of members.values()) {
                try {
                    const p = await client.functions.fetchProfile(client, m.id, interaction.guildId)
                    await fn(p)
                    done++
                } catch (e) {
                    console.error(`[set all_users] Failed for ${m.id}:`, e)
                }
                if (done > 0 && done % 50 === 0) {
                    await interaction.editReply({ content: `⏳ ${label} — ${done}/${members.size}` }).catch(() => null)
                }
            }
            return done
        }
        const profile = member ? await client.functions.fetchProfile(client, userId, interaction.guildId) : null
        if (allUsers) {
            const settingsAll = args.Subcommand === "currency" ? (client.cache.settings.get(interaction.guildId) || await client.functions.fetchSettings(client, interaction.guildId)) : null
            const labels = {
                level: `🎖${L("Level")}`,
                season_level: `${client.config.emojis.seasonLevel}${L("Season level")}`,
                experience: `${client.config.emojis.XP}${L("XP")}`,
                reputation: `${client.config.emojis.RP}${L("Reputation")}`,
                currency: settingsAll ? `${settingsAll.displayCurrencyEmoji}${settingsAll.currencyName}` : `currency`,
                likes: `${client.config.emojis.heart}`
            }
            // rp/currency/likes use delta-accumulating setters — passing
            // (target - current) sets the absolute value
            const fns = {
                level: (p) => p.setLevel(args.amount, true),
                season_level: (p) => p.setSeasonLevel(args.amount, true),
                experience: (p) => p.setXp(args.amount, true),
                reputation: (p) => { p.rp = args.amount - p.rp; return p.save() },
                currency: (p) => { p.currency = args.amount - p.currency; return p.save() },
                likes: (p) => { p.likes = args.amount - p.likes; return p.save() }
            }
            const fn = fns[args.Subcommand]
            if (!fn) return interaction.editReply({ content: `${client.config.emojis.NO} ${L("All Users is not supported for this subcommand")}` })
            const count = await applyToAllUsers(`${labels[args.Subcommand]} (${args.amount.toLocaleString()})`, fn)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${labels[args.Subcommand]} (${args.amount.toLocaleString()}) ${L("was set for")} — ${L("users")}: ${count.toLocaleString()}` })
        }
        if (args.Subcommand === "level") {
            await profile.setLevel(args.amount, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} 🎖**${L("Level")}** (${args.amount.toLocaleString()}) ${L("was set for")} <@${userId}>`, flags: ["Ephemeral"] })
        }
        if (args.Subcommand === "season_level") {
            await profile.setSeasonLevel(args.amount, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.seasonLevel}**${L("Season level")}** (${args.amount.toLocaleString()}) ${L("was set for")} <@${userId}>`, flags: ["Ephemeral"] })
        }
        if (args.Subcommand === "experience") {
            await profile.setXp(args.amount, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.XP}**${L("XP")}** (${args.amount.toLocaleString()}) ${L("was set for")} <@${userId}>`, flags: ["Ephemeral"] })
        }
        if (args.Subcommand === "reputation") {
            profile.rp = args.amount - profile.rp
            profile.save()
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.RP}**${L("Reputation")}** (${args.amount.toLocaleString()}) ${L("was set for")} <@${userId}>` })
        }
        if (args.Subcommand === "currency") {
            const settings = client.cache.settings.get(interaction.guildId) || await client.functions.fetchSettings(client, interaction.guildId)
            profile.currency = args.amount - profile.currency
            await profile.save()
            return interaction.editReply({ content: `${client.config.emojis.YES} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${args.amount.toLocaleString()}) ${L("was set for")} <@${userId}>` })
        }
        if (args.Subcommand === "likes") {
            const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Like)
            profile.likes = args.amount - profile.likes
            await Promise.all(achievements.map(async achievement => {
                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.likes >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                    if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                    client.tempAchievements[profile.userID].push(achievement.id)
                    await profile.addAchievement(achievement)
                }    
            }))
            await profile.save()
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.heart}️${args.amount.toLocaleString()} ${client.language({ textId: "was set for", guildId: interaction.guildId, locale: interaction.locale })} <@${userId}>` })
        }
        if (args.Subcommand === "luck_boost") {
            if (args.percent === 0) {
                profile.multiplyLuck = undefined
                profile.multiplyLuckTime = undefined
                await profile.save()
                return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Luck boost removed", guildId: interaction.guildId, locale: interaction.locale })}` })
            } else {
                profile.multiplyLuck = args.percent / 100
                profile.multiplyLuckTime = new Date(Date.now() + args.time * 60 * 1000)
                await profile.save()
                return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Set", guildId: interaction.guildId, locale: interaction.locale })} +${args.percent}% ${client.language({ textId: "to luck until", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor((Date.now() + args.time * 60 * 1000) / 1000)}:f>` })
            }
        }
        if (args.Subcommand === "xp_boost") {
            if (args.percent === 0) {
                profile.multiplyXP = undefined
                profile.multiplyXPTime = undefined
                await profile.save()
                return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "XP boost removed", guildId: interaction.guildId, locale: interaction.locale })}` })
            } else {
                profile.multiplyXP = args.percent / 100
                profile.multiplyXPTime = new Date(Date.now() + args.time * 60 * 1000)
                await profile.save()
                return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Set", guildId: interaction.guildId, locale: interaction.locale })} +${args.percent}% ${client.language({ textId: "to XP until", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor((Date.now() + args.time * 60 * 1000) / 1000)}:f>` })
            }
        }
        if (args.Subcommand === "currency_boost") {
            if (args.percent === 0) {
                profile.multiplyCUR = undefined
                profile.multiplyCURTime = undefined
                await profile.save()
                return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Currency boost removed", guildId: interaction.guildId, locale: interaction.locale })}` })
            } else {
                profile.multiplyCUR = args.percent / 100
                profile.multiplyCURTime = new Date(Date.now() + args.time * 60 * 1000)
                await profile.save()
                return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Set", guildId: interaction.guildId, locale: interaction.locale })} +${args.percent}% ${client.language({ textId: "to currency until", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor((Date.now() + args.time * 60 * 1000) / 1000)}:f>` })
            }
        }
        if (args.Subcommand === "rp_boost") {
            if (args.percent === 0) {
                profile.multiplyRP = undefined
                profile.multiplyRPTime = undefined
                await profile.save()
                return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Reputation boost removed", guildId: interaction.guildId, locale: interaction.locale })}` })
            } else {
                profile.multiplyRP = args.percent / 100
                profile.multiplyRPTime = new Date(Date.now() + args.time * 60 * 1000)
                await profile.save()
                return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Set", guildId: interaction.guildId, locale: interaction.locale })} +${args.percent}% ${client.language({ textId: "to reputation until", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor((Date.now() + args.time * 60 * 1000) / 1000)}:f>` })
            }
        }
    }
}
