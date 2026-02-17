const { ApplicationCommandOptionType, Collection, EmbedBuilder } = require("discord.js")
const questRegexp = /quest{(.*?)}/
module.exports = {
    name: 'quest-give-to-user',
    nameLocalizations: {
        'ru': `выдать-квест`,
        'uk': `видати-квест`,
        'es-ES': `asignar-misión`
    },
    description: 'Add a quest to the user',
    descriptionLocalizations: {
        'ru': `Выдать квест пользователю`,
        'uk': `Видати квест користувачу`,
        'es-ES': `Asignar una misión al usuario`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': 'юзер',
                'uk': 'користувач',
                'es-ES': 'usuario'
            },
            description: 'User to give a quest',
            descriptionLocalizations: {
                'ru': 'Пользователь, которому выдать квест',
                'uk': 'Користувач, якому видати квест',
                'es-ES': 'Usuario al que asignar la misión'
            },
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'quest',
            nameLocalizations: {
                'ru': 'квест',
                'uk': 'квест',
                'es-ES': 'misión'
            },
            description: 'Quest name or ID',
            descriptionLocalizations: {
                'ru': 'Название квеста или его ID',
                'uk': 'Назва квесту або його ID',
                'es-ES': 'Nombre de la misión o su ID'
            },
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
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
        if (interaction.isButton()) {
            args = {}
            args.user = interaction.user.id
            if (!questRegexp.exec(interaction.customId)) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Missing argument", guildId: interaction.guildId, locale: interaction.locale })}: quest{questId}**`, flags: ["Ephemeral"] })
            args.quest = questRegexp.exec(interaction.customId)[1]
            await interaction.deferReply({ flags: ["Ephemeral"] })
        } else await interaction.deferReply()
        const member = interaction.isButton() ? interaction.member : await interaction.guild.members.fetch(args.user).catch(e => null)
        if (!member) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "User with ID", guildId: interaction.guildId, locale: interaction.locale })} **${args.user}** ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}.` })
        }
        if (member.user.bot) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language(interaction.guild, "You cannot use this command for a bot")}.` })
        }
        const settings = client.cache.settings.get(interaction.guildId)
        const profile = await client.functions.fetchProfile(client, args.user, interaction.guildId)
        if (args.quest.toLowerCase() === "active") {
            let quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.active && quest.isEnabled && !quest.weekly && !quest.daily)
            const asyncFilter = async (arr, predicate) => {
                const results = await Promise.all(arr.map(predicate))
                return results.filter((_v, index) => results[index])
            }
            quests = await asyncFilter(quests, async (quest) => {
                if (quest.takePermission) {
                    const permission = client.cache.permissions.get(quest.takePermission)
                    if (permission) {
                        const isPassing = permission.for(profile, member, interaction.channel)
                        if (isPassing.value === true) return quest    
                    } else return quest
                } else return quest
            })
            const response = []
            if (!quests.length) response.push(`${client.config.emojis.NO} ${client.language({ textId: "No active quests on server", guildId: interaction.guildId, locale: interaction.locale })}`)
            quests.forEach(quest => {
                if (profile.quests?.length >= settings.max_quests) response.push(`${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "not added", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "max quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })} (${settings.max_quests}).`)
                else if (profile.quests?.some(e => e.questID === quest.questID && !e.finished)) {
                     response.push(`${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "not added", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "already in progress", guildId: interaction.guildId, locale: interaction.locale })}`)
                } else if (profile.quests?.some(e => e.questID === quest.questID && e.finished && !quest.repeated)) {
                    response.push(`${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "not added", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "already completed", guildId: interaction.guildId, locale: interaction.locale })}`)
                } else {
                    profile.addQuest(quest, true)
                    response.push(`${client.config.emojis.YES} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "was added", guildId: interaction.guildId, locale: interaction.locale })}`)
                }
            })
            delete client.globalCooldown[`${interaction.guildId}_${args.user}`]
            return interaction.editReply({ content: response.join("\n") })
        }
        if (args.quest.toLowerCase() === "daily") {
            if (profile.quests?.length >= settings.max_quests) {
                return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Max quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.max_quests}.`})
            }
            const quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled && quest.active && quest.daily)
            let dailyQuests = quests.filter(quest => !profile.quests?.some(userQuest => userQuest.questID === quest.questID))
            const asyncFilter = async (arr, predicate) => {
                const results = await Promise.all(arr.map(predicate))
                return results.filter((_v, index) => results[index])
            }
            dailyQuests = await asyncFilter(dailyQuests, async (quest) => {
                if (quest.takePermission) {
                    const permission = client.cache.permissions.find(i => i.id === quest.takePermission)
                    if (permission) {
                        const isPassing = permission.for(profile, member, interaction.channel)
                        if (isPassing.value === true) return quest    
                    } else return quest
                } else return quest
            })
            if (!dailyQuests.length) {
                return interaction.editReply({ content: `${client.config.emojis.NO} **${client.language({ textId: "No available daily quests to take", guildId: interaction.guildId, locale: interaction.locale })}**` })
            }
            const userDailyQuests = profile.quests?.filter(userQuest => {
                const quest = quests.find(e => e.questID === userQuest.questID)
                if (quest?.daily) return userQuest
            }).filter(e => e) || []
            if (userDailyQuests.length >= settings.maxDailyQuests) {
                return interaction.editReply({ content: `${client.config.emojis.NO} **${client.language({ textId: "Maximum daily quests taken reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.maxDailyQuests}**` })
            }
            const quest = dailyQuests[Math.floor(Math.random() * dailyQuests.length)]
            profile.addQuest(quest, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Daily quest", guildId: interaction.guildId, locale: interaction.locale })} ${await client.functions.getEmoji(client, quest.emoji)}**${quest.name}** ${client.language({ textId: "taken", guildId: interaction.guildId, locale: interaction.locale })}` })
        }
        if (args.quest.toLowerCase() === "weekly") {
            if (profile.quests?.length >= settings.max_quests) {
                return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Max quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.max_quests}.`})
            }
            const quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled && quest.active && quest.weekly)
            let weeklyQuests = quests.filter(quest => !profile.quests?.some(userQuest => userQuest.questID === quest.questID))
            const asyncFilter = async (arr, predicate) => {
                const results = await Promise.all(arr.map(predicate))
                return results.filter((_v, index) => results[index])
            }
            weeklyQuests = await asyncFilter(weeklyQuests, async (quest) => {
                if (quest.takePermission) {
                    const permission = client.cache.permissions.find(i => i.id === quest.takePermission)
                    if (permission) {
                        const isPassing = permission.for(profile, member, interaction.channel)
                        if (isPassing.value === true) return quest    
                    } else return quest
                } else return quest
            })
            if (!weeklyQuests.length) {
                return interaction.editReply({ content: `${client.config.emojis.NO} **${client.language({ textId: "No available weekly quests to take", guildId: interaction.guildId, locale: interaction.locale })}**` })
            }
            const userWeeklyQuests = profile.quests?.filter(userQuest => {
                const quest = quests.find(e => e.questID === userQuest.questID)
                if (quest?.weekly) return userQuest
            }).filter(e => e) || []
            if (userWeeklyQuests.length >= settings.maxWeeklyQuests) {
                return interaction.editReply({ content: `${client.config.emojis.NO} **${client.language({ textId: "Maximum weekly quests taken reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.maxWeeklyQuests}**` })
            }
            const quest = weeklyQuests[Math.floor(Math.random() * weeklyQuests.length)]
            profile.addQuest(quest, true)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Weekly quest", guildId: interaction.guildId, locale: interaction.locale })} ${await client.functions.getEmoji(client, quest.emoji)}**${quest.name}** ${client.language({ textId: "taken", guildId: interaction.guildId, locale: interaction.locale })}` })
        }
        const quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled)
        let quest = quests.find(e => e.name.toLowerCase() === args.quest.toLowerCase())
        if (!quest) quest = quests.find(e => e.questID.toLowerCase() === args.quest.toLowerCase())
        if (!quest) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest with name or ID", guildId: interaction.guildId, locale: interaction.locale })} **${args.quest}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`})
        }
        if (profile.quests?.some(e => e.questID === quest.questID && !e.finished)) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "already in progress", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        } else if (profile.quests?.some(e => e.questID === quest.questID && e.finished && !quest.repeated)) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "already completed", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        if (profile.quests?.length >= settings.max_quests) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Max quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.max_quests}.`})
        if (quest.takePermission && !interaction.isChatInputCommand() && client.cache.permissions.some(e => e.id === quest.takePermission)) {
            const permission = client.cache.permissions.get(quest.takePermission)
            const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
            if (isPassing.value === false) {
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
            }
        }
        profile.addQuest(quest, true)
        delete client.globalCooldown[`${interaction.guildId}_${args.user}`]
        if (interaction.isButton()) {
            return interaction.editReply({ content: `${client.config.emojis.DONE} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "was taken, view all quests", guildId: interaction.guildId, locale: interaction.locale })}: </quests:1150455842680885351>` })  
        } else {
            return interaction.editReply({ content: `${client.config.emojis.DONE} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "was added to user", guildId: interaction.guildId, locale: interaction.locale })}.` })    
        }
    }
}