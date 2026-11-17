const { ApplicationCommandOptionType, Collection } = require("discord.js")
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
                    description: 'Amount of levels (or "full")',
                    descriptionLocalizations: {
                        'ru': `Количество уровней (или "full")`,
                        'uk': `Кількість рівнів (або "full")`,
                        'es-ES': `Cantidad de niveles (o "full")`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
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
                    description: 'Amount of season levels (or "full")',
                    descriptionLocalizations: {
                        'ru': `Количество сезонных уровней (или "full")`,
                        'uk': `Кількість сезонних рівнів (або "full")`,
                        'es-ES': `Cantidad de niveles de temporada (o "full")`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
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
                    description: 'Amount of experience (or "full")',
                    descriptionLocalizations: {
                        'ru': `Количество опыта (или "full")`,
                        'uk': `Кількість досвіду (або "full")`,
                        'es-ES': `Cantidad de experiencia (o "full")`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
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
                    description: 'Amount of currency (or "full")',
                    descriptionLocalizations: {
                        'ru': `Количество валюты (или "full")`,
                        'uk': `Кількість валюти (або "full")`,
                        'es-ES': `Cantidad de moneda (o "full")`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
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
                    description: 'Amount of reputation (or "full")',
                    descriptionLocalizations: {
                        'ru': `Количество репутации (или "full")`,
                        'uk': `Кількість репутації (або "full")`,
                        'es-ES': `Cantidad de reputación (o "full")`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
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
                    description: 'Amount of likes (or "full")',
                    descriptionLocalizations: {
                        'ru': `Количество лайков (или "full")`,
                        'uk': `Кількість лайків (або "full")`,
                        'es-ES': `Cantidad de me gusta (o "full")`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                },
                USER_OPTION
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
            if (!member) return interaction.editReply({ content: `${client.config.emojis.NO} ${L(`User with ID`)} **${args.user}** ${L(`not found on server`)}.`})
            if (member.user.bot)  return interaction.editReply({ content: `${client.config.emojis.NO} ${L(`You cannot use this command for a bot`)}.` })
            userId = member.id
        }
        // Amount: accepts a positive integer or "full" (entire current balance)
        const rawAmount = String(args.amount ?? "").trim().toLowerCase()
        const isFull = rawAmount === "full"
        const amount = isFull ? null : Number(rawAmount)
        const AMOUNT_LIMITS = { level: 100, season_level: 100, experience: 100000, reputation: 1000, currency: 1000000000, likes: 1000 }
        if (args.Subcommand !== "role") {
            const limit = AMOUNT_LIMITS[args.Subcommand]
            if (!isFull && (!Number.isInteger(amount) || amount < 1 || amount > limit)) {
                return interaction.editReply({ content: `${client.config.emojis.NO} ${L("Amount must be an integer from 1 to")} **${(limit || 0).toLocaleString()}** ${L("or")} \`full\`` })
            }
        }
        // "full" resolves per-profile to whatever the user currently has
        const fullAmount = (p) => {
            switch (args.Subcommand) {
                case "level": return Math.max(p.level || 0, 0)
                case "season_level": return Math.max(p.seasonLevel || 0, 0)
                case "experience": return Math.max(p.xp || 0, 0)
                case "reputation": return Math.max(p.rp || 0, 0)
                case "currency": return Math.max(p.currency || 0, 0)
                case "likes": return Math.max(p.likes || 0, 0)
            }
            return 0
        }
        const amountOf = (p) => isFull ? fullAmount(p) : amount
        const amountLabel = (p) => isFull ? `\`full\` (${(p ? fullAmount(p) : 0).toLocaleString()})` : `(${amount.toLocaleString()})`
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
            const fns = {
                level: (p) => p.subtractLevel(amountOf(p), true),
                season_level: (p) => p.subtractSeasonLevel(amountOf(p), true),
                experience: (p) => p.subtractXp(amountOf(p), true),
                reputation: (p) => { if (p.rp - amountOf(p) < -1000) throw new Error("rp floor"); return p.subtractRp(amountOf(p), true) },
                currency: (p) => p.subtractCurrency(amountOf(p), true, true),
                likes: (p) => { p.likes -= amountOf(p); return p.save() }
            }
            const fn = fns[args.Subcommand]
            if (!fn) return interaction.editReply({ content: `${client.config.emojis.NO} ${L("All Users is not supported for this subcommand")}` })
            const label = `${labels[args.Subcommand]} ${isFull ? `(\`full\`)` : `(${amount.toLocaleString()})`}`
            const count = await applyToAllUsers(label, fn)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${label} ${L(`was reduced`)} — ${L("users")}: ${count.toLocaleString()}` })
        }
        const amt = amountOf(profile)
        const display = amountLabel(profile)
        if (args.Subcommand === "level") {
            await profile.subtractLevel(amt, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} 🎖${L("Level")} ${display} ${L(`was reduced`)} <@${userId}>` })
        }
        if (args.Subcommand === "season_level") {
            await profile.subtractSeasonLevel(amt, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.seasonLevel}${L("Season level")} ${display} ${L(`was reduced`)} <@${userId}>` })
        }
        if (args.Subcommand === "experience") {
            await profile.subtractXp(amt, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.XP}**${L("XP")}** ${display} ${L(`was reduced`)} <@${userId}>` })
        }
        if (args.Subcommand === "reputation") {
            if (profile.rp - amt < -1000) return interaction.editReply({ content: `${client.config.emojis.NO} ${L(`User reputation should not be less than -1000`)}` })
            await profile.subtractRp(amt, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.RP}**${L("Reputation")}** ${display} ${L(`was reduced`)} <@${userId}>` })
        }
        if (args.Subcommand === "currency") {
            const settings = client.cache.settings.get(interaction.guildId) || await client.functions.fetchSettings(client, interaction.guildId)
            await profile.subtractCurrency(amt, true, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${settings.displayCurrencyEmoji}**${settings.currencyName}** ${display} ${L(`was reduced`)} <@${userId}>` })
        }
        if (args.Subcommand === "likes") {
            profile.likes -= amt
            await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.config.emojis.heart}️${display} ${L(`was reduced`)} <@${userId}>` })
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
