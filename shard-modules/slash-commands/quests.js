const { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ApplicationCommandOptionType, Collection, GuildMember, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ThumbnailBuilder } = require("discord.js");
const { AchievementType, RewardType } = require("../enums");
const MemberRegexp = /mbr{(.*?)}/
const UserRegexp = /usr{(.*?)}/
const limitRegexp = /lim{(.*?)}/
const IdRegexp = /id{(.*?)}/
const targetIDRegexp = /targetID{(.*?)}/
module.exports = {
    name: 'quests',
    nameLocalizations: {
        'ru': `квесты`,
        'uk': `квести`,
        'es-ES': `misiones`
    },
    description: 'View quests',
    descriptionLocalizations: {
        'ru': `Просмотр квестов`,
        'uk': `Перегляд квестів`,
        'es-ES': `Ver misiones`
    },
    options: [
        {
            name: 'overview',
            nameLocalizations: {
                'ru': `обзор`,
                'uk': `огляд`,
                'es-ES': `resumen`
            },
            description: 'Show quests in the table',
            descriptionLocalizations: {
                'ru': `Показать квесты в таблице`,
                'uk': `Показати квести в таблиці`,
                'es-ES': `Mostrar misiones en la tabla`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `юзер`,
                        'uk': `користувач`,
                        'es-ES': `usuario`
                    },
                    description: 'User to view quests',
                    descriptionLocalizations: {
                        'ru': `Просмотр квестов пользователя`,
                        'uk': `Перегляд квестів користувача`,
                        'es-ES': `Ver misiones del usuario`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'ephemeral',
                    nameLocalizations: {
                        'ru': `эфемерный`,
                        'uk': `тимчасовий`,
                        'es-ES': `efímero`
                    },
                    description: 'Message visible only for you',
                    descriptionLocalizations: {
                        'ru': `Сообщение видно только тебе`,
                        'uk': `Повідомлення видно тільки вам`,
                        'es-ES': `Mensaje visible solo para ti`
                    },
                    type: ApplicationCommandOptionType.Boolean
                }
            ]
        },
        {
            name: 'info',
            nameLocalizations: {
                'ru': `инфо`,
                'uk': `інфо`,
                'es-ES': `info`
            },
            description: 'Show information about the quest',
            descriptionLocalizations: {
                'ru': `Показать информацию о квеста`,
                'uk': `Показати інформацію про квест`,
                'es-ES': `Mostrar información sobre la misión`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'quest',
                    nameLocalizations: {
                        'ru': `квест`,
                        'uk': `квест`,
                        'es-ES': `misión`
                    },
                    description: 'The quest to display information',
                    descriptionLocalizations: {
                        'ru': `Квест, о котором вывести информацию`,
                        'uk': `Квест, про який вивести інформацію`,
                        'es-ES': `Misión sobre la que mostrar información`
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true,
                    required: true
                }
            ]
        }
    ],
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        if (args?.Subcommand === "info" || interaction.customId?.includes("questExplorer")) {
            const member = interaction.member
            const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
            const settings = client.cache.settings.get(interaction.guildId)
            let quest = interaction.isChatInputCommand() ? client.cache.quests.find(e => e.questID === args.quest && e.isEnabled && e.guildID === interaction.guildId && (e.active || profile.quests?.some(e1 => e1.questID === e.questID))) : client.cache.quests.find(e => e.questID === IdRegexp.exec(interaction.customId)[1] && e.isEnabled && e.guildID === interaction.guildId && (e.active || profile.quests?.some(e1 => e1.questID === e.questID)))
            if (!quest) {
                return interaction.reply({ content: `${client.config.emojis.NO} **${client.language({ textId: "This quest does not exist", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            }
            
            if (interaction.customId?.includes("take")) {
                if (profile.quests?.some(e => e.questID === quest.questID && !e.finished)) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "already in progress", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (profile.quests?.length >= settings.max_quests) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Max quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.max_quests}.`, flags: ["Ephemeral"]})
                }
                if (quest.takePermission) {
                    const permission = client.cache.permissions.get(quest.takePermission)
                    const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                    if (isPassing.value === false) {
                        return interaction.reply({ 
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(3093046)
                                    .setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setDescription(isPassing.reasons.join("\n"))
                            ], 
                            flags: ["Ephemeral"] 
                        })
                    }
                }
                profile.addQuest(quest, true)
            }
            let userQuest = profile.quests?.find(e => e.questID === quest.questID )
            if (interaction.customId?.includes("rew")) {
                if (!userQuest) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (userQuest.finished) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "already completed", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (!quest.canBeFinished(userQuest)) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Tasks not completed", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (quest.donePermission && client.cache.permissions.some(e => e.id === quest.donePermission)) {
                    const permission = client.cache.permissions.get(quest.donePermission)
                    const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                    if (isPassing.value === false) {
                        return interaction.reply({ 
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(3093046)
                                    .setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setDescription(isPassing.reasons.join("\n"))
                            ], 
                            flags: ["Ephemeral"] 
                        })
                    }
                }
                const rewards = await quest.addReward(profile, interaction)
                userQuest = profile.quests?.find(e => { return e.questID === quest.questID })
                userQuest.finished = true
                userQuest.finishedDate = new Date()
                profile.doneQuests = 1
                await profile.addQuestProgression("quests", 1, quest.questID)
                const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Quests)
                await Promise.all(achievements.map(async achievement => {
                    if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.doneQuests >= achievement.amount) {
                        await profile.addAchievement(achievement)
                    }    
                }))
                await profile.save()
                const rewardEmbed = new EmbedBuilder()
                    .setTitle(`${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}${quest.name} ${client.language({ textId: "completed", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setThumbnail(quest.image || null)
                    .setColor(quest.hex || null)
                    .setDescription(`${quest.description}${rewards.length ? `\n${client.language({ textId: "Reward", guildId: interaction.guildId, locale: interaction.locale })}:\n${rewards.join("\n")}` : ``}`)
                await interaction.deferUpdate()
                interaction.followUp({ embeds: [rewardEmbed], flags: ["Ephemeral"] })
            }
            if (interaction.customId?.includes("del")) {
                if (!userQuest) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (userQuest.finished && !quest.repeated) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "already completed", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                profile.delQuest(quest)
                userQuest = undefined
                await profile.save()    
            }
            if (interaction.customId?.includes("giveToNPC")) {
                if (!userQuest) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (userQuest.finished && !quest.repeated) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "already completed", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const questTarget = quest.targets.find(e => { return e.targetID === targetIDRegexp.exec(interaction.customId)[1] })
                const item = client.cache.items.get(questTarget.object)
                if (!item) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: [MessageFlags.Ephemeral] })  
                }
                const inventoryItem = profile.inventory.find(e => { return e.itemID === item.itemID })
                if (!inventoryItem || inventoryItem.amount < 1) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}${item.name} (${inventoryItem?.amount || 0})`, flags: [MessageFlags.Ephemeral] })  
                }
                const userTarget = userQuest.targets?.find(e => { return e.targetID === questTarget.targetID })
                let needed
                if (quest.community) {
                    if (questTarget.finished) {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This task is already completed", guildId: interaction.guildId, locale: interaction.locale })}`, flags: [MessageFlags.Ephemeral] })  
                    }
                    needed = questTarget.amount - questTarget.reached
                } else {
                    if (userTarget.finished) {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This task is already completed", guildId: interaction.guildId, locale: interaction.locale })}`, flags: [MessageFlags.Ephemeral] })  
                    }
                    needed = questTarget.amount - userTarget.reached
                }
                const ableToGive = inventoryItem.amount >= needed ? needed : Math.floor(inventoryItem.amount)
                await profile.subtractItem(item.itemID, ableToGive)
                if (quest.community) {
                    questTarget.reached += ableToGive
                    if (questTarget.reached >= questTarget.amount) {
                        questTarget.reached = questTarget.amount
                        questTarget.finished = true
                    }
                    await quest.save()
                } else {
                    userTarget.reached += ableToGive
                    if (userTarget.reached >= questTarget.amount) {
                        userTarget.reached = questTarget.amount
                        userTarget.finished = true
                    }
                }
                await profile.save()
            }
            const questThumbnail = quest.image?.length ? quest.image : null
            let finished = ``
            if (userQuest && userQuest.finished) finished = client.config.emojis.DONE
            const container = new ContainerBuilder()
                .setAccentColor(hex2rgb(quest.hex))
            container.addTextDisplayComponents([
                new TextDisplayBuilder()
                    .setContent(`# ${finished}${quest.displayEmoji + quest.name}`)
            ])
            let untilTime = ``
            if (quest.daily) {
                const date = new Date()
                date.setDate(date.getDate()+1)
                const end_date = date.setHours(5,0,0,0)
                untilTime += `\n${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(end_date.valueOf()/1000)}>`
            } else if (quest.weekly) {
                let endOfWeek = require(`date-fns/endOfWeek`)
                const end_date = endOfWeek(new Date(), { weekStartsOn: 1 })
                end_date.setDate(end_date.getDate() + 1)
                end_date.setHours(5,0,0,0)
                untilTime += `\n${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(end_date.valueOf()/1000)}>`
            }
            if (questThumbnail) {
                container.addSectionComponents([
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(questThumbnail))
                        .addTextDisplayComponents([
                            new TextDisplayBuilder()
                                .setContent(`${quest.repeated ? `\`${client.language({ textId: "REPEATABLE", guildId: interaction.guildId, locale: interaction.locale })}\`` : ``} ${quest.community ? `\`${client.language({ textId: "COMMUNITY", guildId: interaction.guildId, locale: interaction.locale })}\`` : ``} ${quest.daily ? `\`${client.language({ textId: "DAILY", guildId: interaction.guildId, locale: interaction.locale })}\`` : ``} ${quest.weekly ? `\`${client.language({ textId: "WEEKLY", guildId: interaction.guildId, locale: interaction.locale })}\`` : ``}${untilTime}${quest.description ? `\n### ${quest.description}` : ""}`)
                        ])
                ])
            } else container.addTextDisplayComponents([
                new TextDisplayBuilder()
                    .setContent(`${quest.repeated ? `\`${client.language({ textId: "REPEATABLE", guildId: interaction.guildId, locale: interaction.locale })}\`` : ``} ${quest.community ? `\`${client.language({ textId: "COMMUNITY", guildId: interaction.guildId, locale: interaction.locale })}\`` : ``} ${quest.daily ? `\`${client.language({ textId: "DAILY", guildId: interaction.guildId, locale: interaction.locale })}\`` : ``} ${quest.weekly ? `\`${client.language({ textId: "WEEKLY", guildId: interaction.guildId, locale: interaction.locale })}\`` : ``}${untilTime}${quest.description ? `\n### ${quest.description}` : ""}`)
            ])
            const rewardArray = []
            let targetIndex = 0
            for (const element of quest.targets.sort((a, b) => {
                if ((a.isOptional && b.isOptional) || (!a.isOptional && !b.isOptional)) return 0
                else if (a.isOptional && !b.isOptional) return 1
                else if (!a.isOptional && b.isOptional) return -1
            })) {
                let emoji = ``
                if (quest.community) {
                    if (element.finished) emoji = client.config.emojis.YES
                    else emoji = client.config.emojis.NO
                } else {
                    if (userQuest) {
                        if (userQuest.targets && userQuest.targets[targetIndex].finished) emoji = client.config.emojis.YES
                        else emoji = client.config.emojis.NO      
                    }
                }
                let amount = ``
                let progressBar = ``
                if (userQuest && element.amount) {
                    amount = quest.community ? `(**${element.reached.toFixed()}**/**${element.amount}** **${Math.floor(element.reached/element.amount*100)}%**)` : `(**${userQuest.targets[targetIndex].reached.toFixed()}**/**${element.amount}** **${Math.floor(userQuest.targets[targetIndex].reached/element.amount*100)}%**)`
                    if (element.showProgressBar) progressBar = quest.community ? `\n${createEmojiProgressBar(Math.floor(element.reached/element.amount*100), client.config.emojis)}` : `\n${createEmojiProgressBar(Math.floor(userQuest.targets[targetIndex].reached/element.amount*100), client.config.emojis)}`
                }
                const description = quest.getDescription(element, interaction.locale)
                container.addSeparatorComponents([
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Small)
                ])
                if (element.type === "giveToNPC" && member.user.id === interaction.user.id && ((quest.community && !element.finished) || (!quest.community && userQuest && !userQuest.targets[targetIndex].finished))) {
                    container.addSectionComponents([
                        new SectionBuilder()
                            .addTextDisplayComponents([
                                new TextDisplayBuilder()
                                    .setContent([
                                        targetIndex === 0 ? `# ${client.language({ textId: "Tasks", guildId: interaction.guildId, locale: interaction.locale })}:\n-# ${quest.requiresAllTasks ? `${client.language({ textId: "To complete the quest, complete all tasks", guildId: interaction.guildId, locale: interaction.locale })}\n` : `${client.language({ textId: "To complete the quest, complete any task", guildId: interaction.guildId, locale: interaction.locale })}\n`}` : undefined,
                                        `${emoji}${element.isOptional ? `${client.language({ textId: "(OPT.)", guildId: interaction.guildId, locale: interaction.locale })} ` : ""}${description} ${amount}${progressBar}${element.isOptional ? `\n${client.language({ textId: "Reward", guildId: interaction.guildId, locale: interaction.locale })}: ${element.optionalRewards.map(reward => {
                                            let name = ``
                                            if (reward.type === RewardType.Currency) name = `${settings.displayCurrencyEmoji}**${settings.currencyName}**`
                                            else if (reward.type === RewardType.Experience) name = `${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}**`
                                            else if (reward.type === RewardType.Reputation) name = `${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}**`
                                            else if (reward.type === RewardType.Item) {
                                                const item = client.cache.items.find(e => e.itemID === reward.id && e.enabled && !e.temp)
                                                if (item) {
                                                    name = item.found ? `${item.displayEmoji}**${item.name}**` : `||???????????||`
                                                }
                                                else name = `**${reward.id}**`
                                            } else if (reward.type === RewardType.Role) name = `<@&${reward.id}>${reward.ms ? ` [${client.functions.transformSecs(client, reward.ms, interaction.guildId, interaction.locale)}]` : ``}`
                                            else if (reward.type ===  RewardType.Achievement) {
                                                const achievement = client.cache.achievements.get(reward.id)
                                                if (achievement) {
                                                    name = `${achievement.displayEmoji}**${achievement.name}**`
                                                } else name = `**${reward.id}**`
                                            }
                                            return `${name} ${reward.amount ? `(${reward.amount.toLocaleString()})` : ""}`
                                        }).join(", ")}` : ""}`
                                    ].filter(e => e).join("\n"))
                            ])
                            .setButtonAccessory(
                                new ButtonBuilder()
                                    .setCustomId(`usr{${interaction.user.id}}cmd{quests}giveToNPC_id{${quest.questID}}targetID{${element.targetID}}questExplorer`)
                                    .setEmoji(client.cache.items.get(element.object)?.displayEmoji || client.config.emojis.unknown)
                                    .setLabel(`${client.language({ textId: "Transfer", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setStyle(ButtonStyle.Success)
                            )
                    ])
                } else {
                    container.addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent([
                                targetIndex === 0 ? `# ${client.language({ textId: "Tasks", guildId: interaction.guildId, locale: interaction.locale })}:\n-# ${quest.requiresAllTasks ? `${client.language({ textId: "To complete the quest, complete all tasks", guildId: interaction.guildId, locale: interaction.locale })}\n` : `${client.language({ textId: "To complete the quest, complete any task", guildId: interaction.guildId, locale: interaction.locale })}\n`}` : undefined,
                                `${emoji}${element.isOptional ? `${client.language({ textId: "(OPT.)", guildId: interaction.guildId, locale: interaction.locale })} ` : ""}${description} ${amount}${progressBar}${element.isOptional && element.optionalRewards ? `\n${client.language({ textId: "Reward", guildId: interaction.guildId, locale: interaction.locale })}: ${element.optionalRewards.map(reward => {
                                    let name = ``
                                    if (reward.type === RewardType.Currency) name = `${settings.displayCurrencyEmoji}**${settings.currencyName}**`
                                    else if (reward.type === RewardType.Experience) name = `${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}**`
                                    else if (reward.type === RewardType.Reputation) name = `${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}**`
                                    else if (reward.type === RewardType.Item) {
                                        const item = client.cache.items.find(e => e.itemID === reward.id && e.enabled && !e.temp)
                                        if (item) {
                                            name = item.found ? `${item.displayEmoji}**${item.name}**` : `||???????????||`
                                        }
                                        else name = `**${reward.id}**`
                                    } else if (reward.type === RewardType.Role) name = `<@&${reward.id}>`
                                    else if (reward.type ===  RewardType.Achievement) {
                                        const achievement = client.cache.achievements.get(reward.id)
                                        if (achievement) {
                                            name = `${achievement.displayEmoji}**${achievement.name}**`
                                        } else name = `**${reward.id}**`
                                    }
                                    return `${name} ${reward.amount ? `(${reward.amount.toLocaleString()})` : ""}`
                                }).join(", ")}` : ""}`    
                            ].filter(e => e).join("\n"))
                    ])
                }
                targetIndex++
            }
            for (const element of quest.rewards) {
                let name = ``
                if (element.type === RewardType.Currency) name = `${settings.displayCurrencyEmoji}**${settings.currencyName}**`
                else if (element.type === RewardType.Experience) name = `${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}**`
                else if (element.type === RewardType.Reputation) name = `${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}**`
                else if (element.type === RewardType.Item) {
                    const item = client.cache.items.find(e => e.itemID === element.id && e.enabled && !e.temp)
                    if (item) {
                        name = item.found ? `${item.displayEmoji}**${item.name}**` : `||???????????||`
                    }
                    else name = `**${element.id}**`
                } else if (element.type === RewardType.Role) name = `<@&${element.id}>${element.ms ? ` [${client.functions.transformSecs(client, element.ms, interaction.guildId, interaction.locale)}]` : ``} (${element.amount.toLocaleString()})`
                if (element.type === RewardType.Reputation && profile.rp < 1000) {
                    rewardArray.push(`${name} (${element.amount.toLocaleString()})`)
                } else if (element.type !== RewardType.Reputation) {
                    rewardArray.push(`${name} (${element.amount.toLocaleString()})`)
                } else if (element.type ===  RewardType.Achievement) {
                    const achievement = client.cache.achievements.get(element.id)
                    if (achievement) {
                        rewardArray.push(`${achievement.displayEmoji}**${achievement.name}**`)
                    }
                }
            }
            if (rewardArray.length) {
                container.addSeparatorComponents([
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Small)
                ])
                container.addTextDisplayComponents([
                    new TextDisplayBuilder()
                        .setContent([
                            `# ${client.language({ textId: "Reward", guildId: interaction.guildId, locale: interaction.locale })}:`,
                            ...rewardArray
                        ].join("\n"))
                ])    
            }
            container.addSeparatorComponents([
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            ])
            if (userQuest && userQuest.finished && userQuest.finishedDate) {
                container.addTextDisplayComponents([
                    new TextDisplayBuilder()
                        .setContent([
                            `ID: ${quest.questID}\n${client.language({ textId: "Completed", guildId: interaction.guildId, locale: interaction.locale })}: <t:${Math.round(userQuest.finishedDate / 1000)}:f>`,
                        ].join("\n"))
                ])
            } else container.addTextDisplayComponents([
                new TextDisplayBuilder()
                    .setContent([
                        `ID: ${quest.questID}`,
                    ].join("\n"))
            ])
            const questDel_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setEmoji(client.config.emojis.NO)
                .setLabel(`${client.language({ textId: "Cancel quest", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setCustomId(`usr{${interaction.user.id}}cmd{quests}del_id{${quest.questID}}questExplorer`)
            const rewardClaim_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setEmoji(client.config.emojis.giveaway)
                .setLabel(`${client.language({ textId: "Claim reward", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setCustomId(`usr{${interaction.user.id}}cmd{quests}rew_id{${quest.questID}}questExplorer`)
            const takeQuest_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setLabel(`${client.language({ textId: "Accept quest", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setCustomId(`usr{${interaction.user.id}}cmd{quests}take_id{${quest.questID}}questExplorer`)
                .setDisabled(!quest.active)
            if (interaction.user.id === member.user.id) {
                const row = new ActionRowBuilder()
                if ((!profile.quests?.some(e => e.questID === quest.questID) && !quest.daily && !quest.weekly) || (profile.quests?.some(e => e.questID === quest.questID && e.finished && quest.repeated))) row.addComponents(takeQuest_btn)
                if (quest.canBeFinished(userQuest)) row.addComponents(rewardClaim_btn)
                if (userQuest && !userQuest.finished && !quest.daily && !quest.weekly) row.addComponents(questDel_btn)   
                if (row.components.length) container.addActionRowComponents(row)
            }
            if (interaction.customId?.includes("del") || interaction.customId?.includes("rew") || interaction.customId?.includes("take") || interaction.customId?.includes("giveToNPC")) {
                if (interaction.replied || interaction.deferred) return interaction.editReply({ components: [container] })
                else return interaction.update({ components: [container] })
            }
            else {
                return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] })    
            }
        }
        const flags = []
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || args?.ephemeral) flags.push("Ephemeral")
        const itemsPerPage = 25
        let min = 0
        let max = itemsPerPage
        if (!interaction.isChatInputCommand()) {
            // Allow anyone to use quests from profile-menu or UCP buttons
            const isFromProfileMenu = interaction.isStringSelectMenu() && interaction.customId.includes("profile-menu")
            const isFromUCP = args?.fromUCP
            if (!isFromProfileMenu && !isFromUCP && interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
            max = +limitRegexp.exec(interaction.customId)?.[1]
            if (!max) max = itemsPerPage
            min = max - itemsPerPage
        }
        let member
        if (args?.user) member = await interaction.guild.members.fetch(args.user).catch(e => null)
        else if (interaction.isButton() && MemberRegexp.exec(interaction.customId)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(e => null)
        else if (interaction.isStringSelectMenu() && (MemberRegexp.exec(interaction.customId) || MemberRegexp.exec(interaction.values[0]))) {
            member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.values[0])?.[1]).catch(e => null)
            if (!(member instanceof GuildMember)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(e => null)
        }
        else member = interaction.member
        if (!member) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        const settings = client.cache.settings.get(interaction.guildId)
        let quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled)
        const embed = new EmbedBuilder()
            .setColor(member.displayHexColor)
            .setTitle(`${client.language({ textId: "QUESTS", guildId: interaction.guildId, locale: interaction.locale })}`)
        let unfinishedQuests = profile.quests?.filter(userQuest => {
            const guildQuest = quests.find(quest => quest.questID === userQuest.questID)
            if (!guildQuest) return false
            return !userQuest.finished
        }) || []
        let finishedQuests = profile.quests?.filter(userQuest => {
            const guildQuest = quests.find(quest => quest.questID === userQuest.questID)
            if (!guildQuest) return false
            return userQuest.finished
        }) || []
        let unacceptedQuests = quests.filter(quest => !quest.daily && !quest.weekly && (!profile.quests?.some(userQuest => userQuest.questID === quest.questID) && quest.active) || (quest.active && quest.repeated && profile.quests?.some(userQuest => userQuest.questID === quest.questID && userQuest.finished)))
        const asyncFilter = async (arr, predicate) => {
            const results = await Promise.all(arr.map(predicate))
            return results.filter((_v, index) => results[index])
        }
        unacceptedQuests = await asyncFilter(unacceptedQuests, async (quest) => {
            if (quest.takePermission) {
                const permission = client.cache.permissions.find(i => i.id === quest.takePermission)
                if (permission) {
                    const isPassing = permission.for(profile, interaction.member, interaction.channel)
                    if (isPassing.value === true) return quest    
                } else return quest
            } else return quest
        })
        if (profile.quests?.length >= settings.max_quests) {
            unacceptedQuests = []
        }
        let dailyQuests = quests.filter(quest => quest.daily && !profile.quests?.some(userQuest => userQuest.questID === quest.questID) && quest.active)
        dailyQuests = await asyncFilter(dailyQuests, async (quest) => {
            if (quest.takePermission) {
                const permission = client.cache.permissions.find(i => i.id === quest.takePermission)
                if (permission) {
                    const isPassing = permission.for(profile, interaction.member, interaction.channel)
                    if (isPassing.value === true) return quest    
                } else return quest
            } else return quest
        })
        let weeklyQuests = quests.filter(quest => quest.weekly && !profile.quests?.some(userQuest => userQuest.questID === quest.questID) && quest.active)
        weeklyQuests = await asyncFilter(weeklyQuests, async (quest) => {
            if (quest.takePermission) {
                const permission = client.cache.permissions.find(i => i.id === quest.takePermission)
                if (permission) {
                    const isPassing = permission.for(profile, interaction.member, interaction.channel)
                    if (isPassing.value === true) return quest
                } else return quest
            } else return quest
        })
        let unfinishedQuestsLength = unfinishedQuests.length
        let finishedQuestsLength = finishedQuests.length
        let unacceptedQuestsLength = unacceptedQuests.length
        let dailyQuestsLength = dailyQuests.length
        let weeklyQuestsLength = weeklyQuests.length
        let maxLength = Math.max.apply(null, [unfinishedQuestsLength, finishedQuestsLength, unacceptedQuestsLength, dailyQuestsLength, weeklyQuestsLength])
        let unfinishedQuestsSliced
        let finishedQuestsSliced
        let unacceptedQuestsSliced
        let dailyQuestsSliced
        let weeklyQuestsSliced
        if (unfinishedQuestsLength > itemsPerPage) unfinishedQuestsSliced = unfinishedQuests.slice(min, max)
        if (finishedQuestsLength > itemsPerPage) finishedQuestsSliced = finishedQuests.slice(min, max)
        if (unacceptedQuestsLength > itemsPerPage) unacceptedQuestsSliced = unacceptedQuests.slice(min, max)
        if (dailyQuestsLength > itemsPerPage) dailyQuestsSliced = dailyQuests.slice(min, max)
        if (weeklyQuestsLength > itemsPerPage) weeklyQuestsSliced = weeklyQuests.slice(min, max)
        if (interaction.isButton()) {
            if (interaction.customId.includes("acceptAll")) {
                min = 0
                max = itemsPerPage
                const asyncFilter = async (arr, predicate) => {
                    const results = await Promise.all(arr.map(predicate))
                    return results.filter((_v, index) => results[index])
                }
                unacceptedQuests = await asyncFilter(unacceptedQuests, async (quest) => {
                    if (quest.takePermission) {
                        const permission = client.cache.permissions.get(quest.takePermission)
                        if (permission) {
                            const isPassing = permission.for(profile, interaction.member, interaction.channel)
                            if (isPassing.value === true) return quest
                        }
                    } else return quest
                })
                unacceptedQuestsLength = unacceptedQuests.length
                if (unacceptedQuestsLength && (!profile.quests || profile.quests.length < settings.max_quests)) {
                    await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
                    const accepted = []
                    unacceptedQuests.slice(0, settings.max_quests - (profile.quests?.length || 0)).forEach(quest => {
                       profile.addQuest(quest) 
                       accepted.push(quest.questID)
                    })
                    await profile.save()
                    unacceptedQuests = unacceptedQuests.filter(e => !accepted.includes(e.questID))
                    unacceptedQuestsLength = unacceptedQuests.length
                    unfinishedQuests = profile.quests?.filter(quest => !quest.finished) || []
                    unfinishedQuestsLength = unfinishedQuests.length
                    finishedQuests = profile.quests?.filter(quest => quest.finished) || []
                    finishedQuestsLength = finishedQuests.length
                    if (unfinishedQuestsLength > itemsPerPage) unfinishedQuestsSliced = unfinishedQuests.slice(min, max)
                    if (finishedQuestsLength > itemsPerPage) finishedQuestsSliced = finishedQuests.slice(min, max)
                    if (unacceptedQuestsLength > itemsPerPage) unacceptedQuestsSliced = unacceptedQuests.slice(min, max)
                    maxLength = Math.max.apply(null, [unfinishedQuestsLength, finishedQuestsLength, unacceptedQuestsLength, dailyQuestsLength, weeklyQuestsLength])
                }
            }
            if (interaction.customId.includes("rewardAll")) {
                if (unfinishedQuestsLength) {
                    min = 0
                    max = itemsPerPage
                    await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
                    let unfinished = profile.quests?.filter(userQuest => {
                        const quest = quests.find(e => e.questID === userQuest.questID)
                        if (!quest) return false
                        return quest.canBeFinished(userQuest)
                    }) || []
                    const asyncFilter = async (arr, predicate) => {
                        const results = await Promise.all(arr.map(predicate))
                        return results.filter((_v, index) => results[index])
                    }
                    unfinished = await asyncFilter(unfinished, async (quest) => {
                        if (quest.donePermission) {
                            const permission = client.cache.permissions.get(quest.donePermission)
                            if (permission) {
                                const isPassing = permission.for(profile, interaction.member, interaction.channel)
                                if (isPassing.value === true) return quest
                            }
                        } else return quest
                    })
                    for (let userQuest of unfinished) {
                        const quest = quests.find(quest => quest.questID === userQuest.questID)
                        const rewards = await quest.addReward(profile, interaction)
                        userQuest = profile.quests?.find(e => { return e.questID === quest.questID })
                        userQuest.finished = true
                        userQuest.finishedDate = new Date()
                        profile.doneQuests = 1
                        await profile.addQuestProgression("quests", 1, quest.questID)
                        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Quests)
                        await Promise.all(achievements.map(async achievement => {
                            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.doneQuests >= achievement.amount) {
                                await profile.addAchievement(achievement)
                            }    
                        }))
                        await profile.save()
                        const rewardEmbed = new EmbedBuilder()
                            .setTitle(`${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}${quest.name} ${client.language({ textId: "completed", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setThumbnail(quest.image || null)
                            .setColor(quest.hex || null)
                            .setDescription(`${quest.description}${rewards.length ? `\n${client.language({ textId: "Reward", guildId: interaction.guildId, locale: interaction.locale })}:\n${rewards.join("\n")}` : ``}`)
                        interaction.followUp({ embeds: [rewardEmbed], flags: ["Ephemeral"] })
                    }
                    unfinishedQuests = profile.quests?.filter(quest => !quest.finished) || []
                    finishedQuests = profile.quests?.filter(quest => quest.finished) || []
                    unacceptedQuests = quests.filter(quest => !quest.daily && !quest.weekly && (!profile.quests?.some(userQuest => userQuest.questID === quest.questID) && quest.active) || (quest.active && quest.repeated && profile.quests?.some(userQuest => userQuest.questID === quest.questID && userQuest.finished)))
                    unacceptedQuests = await asyncFilter(unacceptedQuests, async (quest) => {
                        if (quest.takePermission) {
                            const permission = client.cache.permissions.get(quest.takePermission)
                            if (permission) {
                                const isPassing = permission.for(profile, interaction.member, interaction.channel)
                                if (isPassing.value === true) return quest
                            }
                        } else return quest
                    })
                    unfinishedQuestsLength = unfinishedQuests.length
                    finishedQuestsLength = finishedQuests.length
                    unacceptedQuestsLength = unacceptedQuests.length
                    if (unfinishedQuestsLength > itemsPerPage) unfinishedQuestsSliced = unfinishedQuests.slice(min, max)
                    if (finishedQuestsLength > itemsPerPage) finishedQuestsSliced = finishedQuests.slice(min, max)
                    if (unacceptedQuestsLength > itemsPerPage) unacceptedQuestsSliced = unacceptedQuests.slice(min, max)
                    maxLength = Math.max.apply(null, [unfinishedQuestsLength, finishedQuestsLength, unacceptedQuestsLength, dailyQuestsLength, weeklyQuestsLength])
                }
            }
            if (interaction.customId.includes("cancelAll")) {
                min = 0
                max = itemsPerPage
                if (unfinishedQuests.filter(userQuest => {
                    const quest = quests.find(quest => quest.questID === userQuest.questID)
                    if (!quest) return false
                    if (!quest.daily && !quest.weekly) return userQuest
                }).map(e => e).length) {
                    profile.quests = profile.quests?.filter(userQuest => {
                        const quest = quests.find(quest => quest.questID === userQuest.questID)
                        if (!quest) return false
                        if ((quest.daily || quest.weekly) || userQuest.finished) return userQuest
                    }).map(e => e)
                    if (profile.quests?.length === 0) profile.quests = undefined
                    await profile.save()
                    unfinishedQuests = profile.quests?.filter(quest => !quest.finished) || []
                    unfinishedQuestsLength = unfinishedQuests.length
                    unacceptedQuests = quests.filter(quest => !quest.daily && !quest.weekly && (!profile.quests?.some(userQuest => userQuest.questID === quest.questID) && quest.active) || (quest.active && quest.repeated && profile.quests?.some(userQuest => userQuest.questID === quest.questID && userQuest.finished)))
                    const asyncFilter = async (arr, predicate) => {
                        const results = await Promise.all(arr.map(predicate))
                        return results.filter((_v, index) => results[index])
                    }
                    unacceptedQuests = await asyncFilter(unacceptedQuests, async (quest) => {
                        if (quest.takePermission) {
                            const permission = client.cache.permissions.get(quest.takePermission)
                            if (permission) {
                                const isPassing = permission.for(profile, interaction.member, interaction.channel)
                                if (isPassing.value === true) return quest
                            }
                        } else return quest
                    })
                    unacceptedQuestsLength = unacceptedQuests.length
                    if (unfinishedQuestsLength > itemsPerPage) unfinishedQuestsSliced = unfinishedQuests.slice(min, max)
                    if (unacceptedQuestsLength > itemsPerPage) unacceptedQuestsSliced = unacceptedQuests.slice(min, max)
                    maxLength = Math.max.apply(null, [unfinishedQuestsLength, finishedQuestsLength, unacceptedQuestsLength, dailyQuestsLength, weeklyQuestsLength])
                }
            }
            if (interaction.customId.includes("acceptDaily")) {
                if (profile.quests?.length >= settings.max_quests) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Max quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.max_quests}.`, flags: ["Ephemeral"]})
                }
                min = 0
                max = itemsPerPage
                await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
                const quest = dailyQuests[Math.floor(Math.random() * dailyQuests.length)]
                if (!quest) {
                    interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "No available daily quests to take", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                } else {
                    const userDailyQuests = profile.quests?.filter(userQuest => {
                        const quest = quests.find(quest => quest.questID === userQuest.questID)
                        if (!quest) return false
                        if (quest.daily) return userQuest
                    }).filter(e => e) || []
                    if (userDailyQuests.length >= settings.maxDailyQuests) {
                        interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Maximum daily quests taken reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.maxDailyQuests}**`, flags: ["Ephemeral"] })
                    } else {
                        profile.addQuest(quest, true)
                        unfinishedQuests = profile.quests?.filter(quest => !quest.finished) || []
                        finishedQuests = profile.quests?.filter(quest => quest.finished) || []
                        dailyQuests = quests.filter(quest => quest.daily && !profile.quests?.some(userQuest => userQuest.questID === quest.questID) && quest.active).map(e => e)
                        unfinishedQuestsLength = unfinishedQuests.length
                        finishedQuestsLength = finishedQuests.length
                        dailyQuestsLength = dailyQuests.length
                        if (unfinishedQuestsLength > itemsPerPage) unfinishedQuestsSliced = unfinishedQuests.slice(min, max)
                        if (finishedQuestsLength > itemsPerPage) finishedQuestsSliced = finishedQuests.slice(min, max)
                        if (dailyQuestsLength > itemsPerPage) dailyQuestsSliced = dailyQuests.slice(min, max)
                        maxLength = Math.max.apply(null, [unfinishedQuestsLength, finishedQuestsLength, unacceptedQuestsLength, dailyQuestsLength, weeklyQuestsLength])
                        interaction.followUp({ content: `${client.config.emojis.YES} ${client.language({ textId: "Daily quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "taken", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })     
                    }
                }
            }
            if (interaction.customId.includes("acceptWeekly")) {
                if (profile.quests?.length >= settings.max_quests) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Max quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.max_quests}.`})
                }
                min = 0
                max = itemsPerPage
                await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
                const quest = weeklyQuests[Math.floor(Math.random() * weeklyQuests.length)]
                if (!quest) {
                    interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "No available weekly quests to take", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                } else {
                    const userWeeklyQuests = profile.quests?.filter(userQuest => {
                        const quest = quests.find(quest => quest.questID === userQuest.questID)
                        if (!quest) return false
                        if (quest.weekly) return userQuest
                    }).filter(e => e) || []
                    if (userWeeklyQuests.length >= settings.maxWeeklyQuests) {
                        interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Maximum weekly quests taken reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.maxWeeklyQuests}**`, flags: ["Ephemeral"] })
                    } else {
                        profile.addQuest(quest, true)
                        unfinishedQuests = profile.quests?.filter(quest => !quest.finished) || []
                        finishedQuests = profile.quests?.filter(quest => quest.finished) || []
                        weeklyQuests = quests.filter(quest => quest.weekly && !profile.quests?.some(userQuest => userQuest.questID === quest.questID) && quest.active).map(e => e)
                        unfinishedQuestsLength = unfinishedQuests.length
                        finishedQuestsLength = finishedQuests.length
                        weeklyQuestsLength = weeklyQuests.length
                        if (unfinishedQuestsLength > itemsPerPage) unfinishedQuestsSliced = unfinishedQuests.slice(min, max)
                        if (finishedQuestsLength > itemsPerPage) finishedQuestsSliced = finishedQuests.slice(min, max)
                        if (weeklyQuestsLength > itemsPerPage) weeklyQuestsSliced = weeklyQuests.slice(min, max)
                        maxLength = Math.max.apply(null, [unfinishedQuestsLength, finishedQuestsLength, unacceptedQuestsLength, dailyQuestsLength, weeklyQuestsLength])
                        interaction.followUp({ content: `${client.config.emojis.YES} ${client.language({ textId: "Weekly quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "taken", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })     
                    }
                }
            }
        }
        embed.setDescription(`${client.language({ textId: "Quest info", guildId: interaction.guildId, locale: interaction.locale })}: </quests info:1150455842680885351>`)
        embed.setFields([
            {
                name: `${client.language({ textId: "My active quests", guildId: interaction.guildId, locale: interaction.locale })} (${unfinishedQuestsLength})`,
                value: !unfinishedQuestsLength ? `${client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale })}` : (unfinishedQuestsSliced || unfinishedQuests).map((userQuest) => {
                    const guildQuest = quests.find(quest => quest.questID === userQuest.questID)
                    if (!guildQuest) return false
                    const index = unfinishedQuests.findIndex(e => e.questID === userQuest.questID) + 1
                    if (guildQuest.community) {
                        return `${index}. ${guildQuest.displayEmoji}**${guildQuest.name}** (${guildQuest.targets.map(target => {
                            return target.reached / target.amount
                        }).reduce((pValue, cValue, cIndex, array) => {
                            pValue += cValue
                            if (cIndex+1 === array.length) {
                                pValue = pValue * 100 / array.length
                                return `\`${Math.floor(pValue)}%\``
                            } else return pValue
                        }, 0)})`
                    } else {
                        return `${index}. ${guildQuest.displayEmoji}**${guildQuest.name}** (${userQuest.targets?.map(target => {
                            const questTarget = guildQuest.targets.find(t => t.targetID === target.targetID)
                            return target.reached / questTarget.amount
                        })?.reduce((pValue, cValue, cIndex, array) => {
                            pValue += cValue
                            if (cIndex+1 === array.length) {
                                pValue = pValue * 100 / array.length
                                return `\`${Math.floor(pValue)}%\``
                            } else return pValue
                        }, 0) || ""})`
                    }
                }).filter(e => e).join("\n") || client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale }),
                inline: true
            }, 
            {
                name: `${client.language({ textId: "My completed quests", guildId: interaction.guildId, locale: interaction.locale })} (${finishedQuestsLength})`,
                value: !finishedQuestsLength ? `${client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale })}` : (finishedQuestsSliced || finishedQuests).map((userQuest) => {
                    const guildQuest = quests.find(quest => quest.questID === userQuest.questID)
                    if (!guildQuest) return false
                    const index = finishedQuests.findIndex(e => e.questID === userQuest.questID) + 1
                    return `${index}. ${guildQuest.displayEmoji}**${guildQuest.name}**`
                }).filter(e => e).join("\n") || client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale }),
                inline: true
            },
            {
                name: `${client.language({ textId: "Unaccepted quests", guildId: interaction.guildId, locale: interaction.locale })} (${unacceptedQuestsLength})`,
                value: !unacceptedQuestsLength ? `${client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale })}` : (unacceptedQuestsSliced || unacceptedQuests).map((quest) => {
                    const index = unacceptedQuests.findIndex(e => e.questID === quest.questID) + 1
                    return `${index}. ${quest.displayEmoji}**${quest.name}**`
                }).join("\n") || client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale }),
                inline: true
            },
            {
                name: `${client.language({ textId: "Daily quests", guildId: interaction.guildId, locale: interaction.locale })} (${dailyQuestsLength})`,
                value: !dailyQuestsLength ? `${client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale })}` : (dailyQuestsSliced || dailyQuests).map((quest) => {
                    const index = dailyQuests.findIndex(e => e.questID === quest.questID) + 1
                    return `${index}. ${quest.displayEmoji}**${quest.name}**`
                }).join("\n") || client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale }),
                inline: true
            },
            {
                name: `${client.language({ textId: "Weekly quests", guildId: interaction.guildId, locale: interaction.locale })} (${weeklyQuestsLength})`,
                value: !weeklyQuestsLength ? `${client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale })}` : (weeklyQuestsSliced || weeklyQuests).map((quest) => {
                    const index = weeklyQuests.findIndex(e => e.questID === quest.questID) + 1
                    return `${index}. ${quest.displayEmoji}**${quest.name}**`
                }).join("\n") || client.language({ textId: "No quests", guildId: interaction.guildId, locale: interaction.locale }),
                inline: true
            }
        ])
        let menu_options = [
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your personal profile", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your statistics", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.inventory}`, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your inventory with items", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.roles}`, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your inventory with roles", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your invites", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.shop, label: `${settings.shopName ? settings.shopName.slice(0, 100) : client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale }) }`, value: `usr{${interaction.user.id}}cmd{shop}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Server shop", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your achievements", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })}`, default: true },
        ]
        if (member.user.id !== interaction.user.id) {
            menu_options = [
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`},
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}` },
                { emoji: `${client.config.emojis.inventory}`, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply` },
                { emoji: client.config.emojis.roles, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}` },
                { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`},
                { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}` },
                { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, default: true },
            ]
        }
        const nav_row = new ActionRowBuilder()
            .addComponents([
                new StringSelectMenuBuilder()
                    .setCustomId(`usr{${interaction.user.id}}menu`)
                    .addOptions(menu_options)
            ])
        const acceptAllQuestBtn = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel(`${client.language({ textId: "Accept all", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setEmoji(client.config.emojis.YES)
            .setCustomId(`usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}lim{${max}}}acceptAll`)
            .setDisabled(true)
        const rewardAllQuestBtn = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel(`${client.language({ textId: "Complete all", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setEmoji("<:reward:1234590601236844684>")
            .setCustomId(`usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}lim{${max}}rewardAll`)
            .setDisabled(true)
        const cancelAllQuestBtn = new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setLabel(`${client.language({ textId: "Cancel all", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setEmoji(client.config.emojis.NO)
            .setCustomId(`usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}lim{${max}}cancelAll`)
            .setDisabled(true)
        const refreshBtn = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(client.config.emojis.refresh)
            .setCustomId(`usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}lim{${max}}`)
        const userDailyQuests = profile.quests?.filter(userQuest => {
            const quest = quests.find(quest => quest.questID === userQuest.questID)
            if (!quest) return false
            if (quest.daily) return userQuest
        }).filter(e => e) || []
        const userWeeklyQuests = profile.quests?.filter(userQuest => {
            const quest = quests.find(quest => quest.questID === userQuest.questID)
            if (!quest) return false
            if (quest.weekly) return userQuest
        }).filter(e => e) || []
        const acceptDailyQuestBtn = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel(`${client.language({ textId: "Take daily quest", guildId: interaction.guildId, locale: interaction.locale })} (${settings.maxDailyQuests - userDailyQuests.length <= 0 ? 0 : settings.maxDailyQuests - userDailyQuests.length})`)
            .setCustomId(`usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}lim{${max}}acceptDaily`)
            .setDisabled(true)
        const acceptWeeklyQuestBtn = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel(`${client.language({ textId: "Take weekly quest", guildId: interaction.guildId, locale: interaction.locale })} (${settings.maxWeeklyQuests - userWeeklyQuests.length <= 0 ? 0 : settings.maxWeeklyQuests - userWeeklyQuests.length})`)
            .setCustomId(`usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}lim{${max}}acceptWeekly`)
            .setDisabled(true)
        if (interaction.user.id === member.user.id) {
            if (unacceptedQuestsLength) acceptAllQuestBtn.setDisabled(false)
            let unfinished = profile.quests?.filter(userQuest => {
                const quest = quests.find(quest => quest.questID === userQuest.questID)
                if (!quest) return false
                return userQuest && userQuest.targets && userQuest.targets.every(element => element.finished === true) && !userQuest.finished && !quest.community || (userQuest && quest.community && !userQuest.finished && quest.targets.every(element => element.finished === true))
            }) || []
            unfinished = await asyncFilter(unfinished, async (quest) => {
                if (quest.donePermission) {
                    const permission = client.cache.permissions.get(quest.donePermission)
                    if (permission) {
                        const isPassing = permission.for(profile, interaction.member, interaction.channel)
                        if (isPassing.value === true) return quest    
                    } else return quest
                } else return quest
            })
            if (unfinished.length) rewardAllQuestBtn.setDisabled(false)
            if (unfinishedQuestsLength && unfinishedQuests.filter(userQuest => {
                const quest = quests.find(quest => quest.questID === userQuest.questID)
                if (!quest) return false
                if (!quest.weekly && !quest.daily) return userQuest
            }).map(e => e).length) cancelAllQuestBtn.setDisabled(false)
            if (dailyQuestsLength && settings.maxDailyQuests - userDailyQuests.length > 0) acceptDailyQuestBtn.setDisabled(false)
            if (weeklyQuestsLength && settings.maxWeeklyQuests - userWeeklyQuests.length > 0) acceptWeeklyQuestBtn.setDisabled(false)
        }
        const actionsRow = new ActionRowBuilder()
            .addComponents(acceptAllQuestBtn, rewardAllQuestBtn, cancelAllQuestBtn, refreshBtn)
        const first_page_btn = new ButtonBuilder()
            .setEmoji(`${client.config.emojis.arrowLeft2}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`cmd{quests}usr{${interaction.user.id}}mbr{${member.user.id}}lim{itemsPerPage}1`)
            .setDisabled((maxLength <= itemsPerPage && min == 0) || (maxLength > itemsPerPage && min < itemsPerPage))
        const previous_page_btn = new ButtonBuilder()
            .setEmoji(`${client.config.emojis.arrowLeft}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`cmd{quests}usr{${interaction.user.id}}mbr{${member.user.id}}lim{${max - itemsPerPage}}2`)
            .setDisabled((maxLength <= itemsPerPage && min == 0) || (maxLength > itemsPerPage && min < itemsPerPage))
        const next_page_btn = new ButtonBuilder()
            .setEmoji(`${client.config.emojis.arrowRight}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`cmd{quests}usr{${interaction.user.id}}mbr{${member.user.id}}lim{${max + itemsPerPage}}3`)
            .setDisabled((maxLength <= itemsPerPage && min == 0) || (maxLength > itemsPerPage && min >= maxLength - itemsPerPage))
        const last_page_btn = new ButtonBuilder()
            .setEmoji(`${client.config.emojis.arrowRight2}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`cmd{quests}usr{${interaction.user.id}}mbr{${member.user.id}}lim{${maxLength + (maxLength % itemsPerPage == 0 ? 0 : itemsPerPage - (maxLength % itemsPerPage))}}4`)
            .setDisabled((maxLength <= itemsPerPage && min == 0) || (maxLength > itemsPerPage && min >= maxLength - itemsPerPage))
        const components = [
            nav_row, 
            new ActionRowBuilder().addComponents(first_page_btn, previous_page_btn, next_page_btn, last_page_btn), 
            actionsRow, 
            new ActionRowBuilder().addComponents(acceptDailyQuestBtn, acceptWeeklyQuestBtn)
        ]
        if ((interaction.customId?.includes("reply") || interaction.values?.[0].includes("reply")) || interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            return interaction.reply({ embeds: [embed], components, flags })
        }
        if (!interaction.replied && !interaction.deferred) return interaction.update({ embeds: [embed], components: components })
        else return interaction.editReply({ embeds: [embed], components: components, flags })
    }
}
function hex2rgb(color) {
    if (!color) return undefined
    const r = color.match(/^#(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}))$/i);
    if (!r) return [0, 0, 0];
    return [parseInt(r[2], 16), 
            parseInt(r[3], 16), 
            parseInt(r[4], 16)];
}
function createEmojiProgressBar(percentage, emojis, options = {}) {
    const {
        totalBlocks = 14,
        startEmojiFilled = emojis.progress_left_fill,
        startEmojiEmpty = emojis.progress_left_empty,
        middleEmojiFilled = emojis.progress_middle_fill,
        middleEmojiEmpty = emojis.progress_middle_empty,
        endEmojiFilled = emojis.progress_right_fill,
        endEmojiEmpty = emojis.progress_right_empty,
        showPercentage = false
    } = options;
    
    // Проверяем валидность входных данных
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Вычисляем количество заполненных блоков
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    let progressBar = '';
    
    // Обрабатываем специальные случаи
    if (filledBlocks === 0) {
        // Все блоки пустые
        progressBar = startEmojiEmpty + 
                     middleEmojiEmpty.repeat(totalBlocks - 2) + 
                     endEmojiEmpty;
    } else if (filledBlocks === 1) {
        // Только стартовый блок заполнен
        progressBar = startEmojiFilled + 
                     middleEmojiEmpty.repeat(totalBlocks - 2) + 
                     endEmojiEmpty;
    } else if (filledBlocks === totalBlocks) {
        // Все блоки заполнены
        progressBar = startEmojiFilled + 
                     middleEmojiFilled.repeat(totalBlocks - 2) + 
                     endEmojiFilled;
    } else {
        // Смешанный случай: часть заполнена, часть пустая
        const filledMiddleBlocks = filledBlocks - 1; // -1 потому что start уже занят
        const emptyMiddleBlocks = emptyBlocks - 1;   // -1 потому что end уже занят
        
        progressBar = startEmojiFilled + 
                     middleEmojiFilled.repeat(filledMiddleBlocks) +
                     middleEmojiEmpty.repeat(emptyMiddleBlocks) +
                     endEmojiEmpty;
    }
    
    // Добавляем процент, если нужно
    if (showPercentage) {
        progressBar += ` ${percentage}%`;
    }
    
    return progressBar;
}