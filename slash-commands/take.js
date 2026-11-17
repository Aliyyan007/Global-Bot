const { ApplicationCommandOptionType, Collection } = require("discord.js")
const USER_OPTION = {
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
module.exports = {
    name: 'take',
    nameLocalizations: {
        'ru': `take`,
        'uk': `take`,
        'es-ES': `quitar`
    },
    description: 'Take level, XP, currency or RP from the user',
    descriptionLocalizations: {
        'ru': `Забрать уровень, опыт, валюту или репутацию у пользователя`,
        'uk': `Забрати рівень, досвід, валюту або репутацію у користувача`,
        'es-ES': `Quitar nivel, XP, moneda o reputación del usuario`
    },
    options: [
        {
            name: 'level',
            nameLocalizations: {
                'ru': `level`,
                'uk': `level`,
                'es-ES': `nivel`
            },
            description: 'Take level',
            descriptionLocalizations: {
                'ru': `Забрать уровень`,
                'uk': `Забрати рівень`,
                'es-ES': `Quitar nivel`
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
                    max_value: 100
                },
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
                    required: false
                },
                ALL_USERS_OPTION
            ]
        },
        {
            name: 'season_level',
            nameLocalizations: {
                'ru': `season_level`,
                'uk': `season_level`,
                'es-ES': `nivel_temporada`
            },
            description: 'Take season level',
            descriptionLocalizations: {
                'ru': `Забрать сезонный уровень`,
                'uk': `Забрати сезонний рівень`,
                'es-ES': `Quitar nivel de temporada`
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
                    max_value: 100
                },
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
                    required: false
                },
                ALL_USERS_OPTION
            ]
        },
        {
            name: 'experience',
            nameLocalizations: {
                'ru': `experience`,
                'uk': `experience`,
                'es-ES': `experiencia`
            },
            description: 'Take experience',
            descriptionLocalizations: {
                'ru': `Забрать опыт`,
                'uk': `Забрати досвід`,
                'es-ES': `Quitar experiencia`
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
                    min_value: 1,
                    max_value: 100000
                },
                USER_OPTION,
                ALL_USERS_OPTION
            ]
        },
        {
            name: 'currency',
            nameLocalizations: {
                'ru': `currency`,
                'uk': `currency`,
                'es-ES': `moneda`
            },
            description: 'Take currency',
            descriptionLocalizations: {
                'ru': `Забрать валюту`,
                'uk': `Забрати валюту`,
                'es-ES': `Quitar moneda`
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
                    min_value: 1,
                    max_value: 1000000000
                },
                USER_OPTION,
                ALL_USERS_OPTION
            ]
        },
        {
            name: 'reputation',
            nameLocalizations: {
                'ru': `reputation`,
                'uk': `reputation`,
                'es-ES': `reputación`
            },
            description: 'Take reputation',
            descriptionLocalizations: {
                'ru': `Забрать репутацию`,
                'uk': `Забрати репутацію`,
                'es-ES': `Quitar reputación`
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
                    min_value: 1,
                    max_value: 1000
                },
                USER_OPTION,
                ALL_USERS_OPTION
            ]
        },
        {
            name: 'likes',
            nameLocalizations: {
                'ru': `likes`,
                'uk': `likes`,
                'es-ES': `me-gusta`
            },
            description: 'Take likes',
            descriptionLocalizations: {
                'ru': `Забрать лайки`,
                'uk': `Забрати лайки`,
                'es-ES': `Quitar me gusta`
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
                    min_value: 1,
                    max_value: 1000
                },
                USER_OPTION,
                ALL_USERS_OPTION
            ]
        },
        {
            name: 'role',
            nameLocalizations: {
                'ru': `role`,
                'uk': `role`,
                'es-ES': `rol`
            },
            description: 'Take role from /inventory-roles',
            descriptionLocalizations: {
                'ru': `Убрать роль из /инвентарь-ролей`,
                'uk': `Забрати роль з /інвентар-ролей`,
                'es-ES': `Quitar rol de /inventario-roles`
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
                    name: 'role',
                    nameLocalizations: {
                        'ru': `role`,
                        'uk': `role`,
                        'es-ES': `rol`
                    },
                    description: 'Role to take',
                    descriptionLocalizations: {
                        'ru': `Роль для уменьшения`,
                        'uk': `Роль для зменшення`,
                        'es-ES': `Rol para quitar`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                },
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `amount`,
                        'uk': `amount`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of role',
                    descriptionLocalizations: {
                        'ru': `Количество роли`,
                        'uk': `Кількість ролі`,
                        'es-ES': `Cantidad de rol`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    min_value: 1,
                    max_value: 1000000
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
        const allUsers = args.all_users === true
        let member = null
        if (!allUsers) {
            if (!args.user) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Select a user or enable the All Users option", guildId: interaction.guildId, locale: interaction.locale })}` })
            member = await interaction.guild.members.fetch(args.user).catch(e => null)
            if (!member) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: `User with ID`, guildId: interaction.guildId, locale: interaction.locale })} **${args.user}** ${client.language({ textId: `not found on server`, guildId: interaction.guildId, locale: interaction.locale })}.`})
            if (member.user.bot)  return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: `You cannot use this command for a bot`, guildId: interaction.guildId, locale: interaction.locale })}.` })
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
                    console.error(`[take all_users] Failed for ${m.id}:`, e)
                }
                if (done > 0 && done % 50 === 0) {
                    await interaction.editReply({ content: `⏳ ${label} — ${done}/${members.size}` }).catch(() => null)
                }
            }
            return done
        }
        const profile = member ? await client.functions.fetchProfile(client, args.user, interaction.guildId) : null
        if (allUsers) {
            const settingsAll = args.Subcommand === "currency" ? (client.cache.settings.get(interaction.guildId) || await client.functions.fetchSettings(client, interaction.guildId)) : null
            const labels = {
                level: `🎖${client.language({ textId: "Level", guildId: interaction.guildId, locale: interaction.locale })}`,
                season_level: `${client.config.emojis.seasonLevel}${client.language({ textId: "Season level", guildId: interaction.guildId, locale: interaction.locale })}`,
                experience: `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}`,
                reputation: `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`,
                currency: settingsAll ? `${settingsAll.displayCurrencyEmoji}${settingsAll.currencyName}` : `currency`,
                likes: `${client.config.emojis.heart}`
            }
            const fns = {
                level: (p) => p.subtractLevel(args.amount, true),
                season_level: (p) => p.subtractSeasonLevel(args.amount, true),
                experience: (p) => p.subtractXp(args.amount, true),
                reputation: (p) => { if (p.rp - args.amount < -1000) throw new Error("rp floor"); return p.subtractRp(args.amount, true) },
                currency: (p) => p.subtractCurrency(args.amount, true, true),
                likes: (p) => { p.likes = -args.amount; return p.save() }
            }
            const fn = fns[args.Subcommand]
            if (!fn) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "All Users is not supported for this subcommand", guildId: interaction.guildId, locale: interaction.locale })}` })
            const count = await applyToAllUsers(`${labels[args.Subcommand]} (${args.amount.toLocaleString()})`, fn)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${labels[args.Subcommand]} (${args.amount.toLocaleString()}) ${client.language({ textId: `was reduced`, guildId: interaction.guildId, locale: interaction.locale })} — ${client.language({ textId: "users", guildId: interaction.guildId, locale: interaction.locale })}: ${count.toLocaleString()}` })
        }
        if (args.Subcommand === "level") {
            await profile.subtractLevel(args.amount, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} 🎖${client.language({ textId: "Level", guildId: interaction.guildId, locale: interaction.locale })} (${args.amount.toLocaleString()}) ${client.language({ textId: `was reduced`, guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>` })  
        }
        if (args.Subcommand === "season_level") {
            await profile.subtractSeasonLevel(args.amount, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.seasonLevel}${client.language({ textId: "Season level", guildId: interaction.guildId, locale: interaction.locale })} (${args.amount.toLocaleString()}) ${client.language({ textId: `was reduced`, guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>` })  
        }
        if (args.Subcommand === "experience") {
            await profile.subtractXp(args.amount, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${args.amount.toLocaleString()}) ${client.language({ textId: `was reduced`, guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>` })
        }
        if (args.Subcommand === "reputation") {
            if (profile.rp - args.amount < -1000) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: `User reputation should not be less than -1000`, guildId: interaction.guildId, locale: interaction.locale })}` })
            await profile.subtractRp(args.amount, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${args.amount.toLocaleString()}) ${client.language({ textId: `was reduced`, guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>` })
        }
        if (args.Subcommand === "currency") {
            const settings = client.cache.settings.get(interaction.guildId) || await client.functions.fetchSettings(client, interaction.guildId)
            await profile.subtractCurrency(args.amount, true, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${args.amount.toLocaleString()}) ${client.language({ textId: `was reduced`, guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>` })
        }
        if (args.Subcommand === "likes") {
            profile.likes -= args.amount
            await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.heart}️${args.amount.toLocaleString()} ${client.language({ textId: `was reduced`, guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>` })
        }
        if (args.Subcommand === "role") {
            const inventoryRole = profile.inventoryRoles?.find(e => e.uniqId === args.role)
            if (!inventoryRole) return interaction.editReply({ content: `${client.config.emojis.NO}${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })}` })
            const role = interaction.guild.roles.cache.get(inventoryRole.id)
            profile.subtractRole(inventoryRole.id, args.amount, inventoryRole.ms)
            await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
            return interaction.editReply({ content: `${client.config.emojis.YES}${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ${role ? `<@&${role.id}>` : `${inventoryRole.id}`}${inventoryRole.ms ? ` [${client.functions.transformSecs(client, inventoryRole.ms, interaction.guildId, interaction.locale)}]` : ``} (${args.amount}) ${client.language({ textId: "was taken from user inventory-roles", guildId: interaction.guildId, locale: interaction.locale })} <@${args.user}>` })
        }
    }
}
