const { ApplicationCommandOptionType, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, RoleSelectMenuBuilder, LabelBuilder } = require("discord.js")
const Achievement = require("../classes/achievement.js")
const { RewardType, AchievementType } = require('../enums/index')
const achievementRegexp = /achievementId{(.*?)}/
const limRegexp = /lim{(.*?)}/
const uniqid = require('uniqid')
const MAX_REWARDS = 5
module.exports = {
    name: 'manager-achievements',
    nameLocalizations: {
        'ru': `управление-достижениями`,
        'uk': `управління-досягненнями`,
        'es-ES': `gestión-logros`,
    },
    description: 'Manage achievements',
    descriptionLocalizations: {
        'ru': `Управление достижениями`,
        'uk': `Управління досягненнями`,
        'es-ES': `Gestión de logros`
    },
    options: [
        {
			name: 'view',
            nameLocalizations: {
                'ru': `просмотр`,
                'uk': `перегляд`,
                'es-ES': `ver`
            },
            description: 'View all achievements',
            descriptionLocalizations: {
                'ru': `Просмотр всех достижений`,
                'uk': `Перегляд всіх досягнень`,
                'es-ES': `Ver todos los logros`
            },
            type: ApplicationCommandOptionType.Subcommand,
		},
        {
            name: 'create',
            nameLocalizations: {
                'ru': `создать`,
                'uk': `створити`,
                'es-ES': `crear`
            },
            description: 'Create an achievement',
            descriptionLocalizations: {
                'ru': `Создать достижение`,
                'uk': `Створити досягнення`,
                'es-ES': `Crear un logro`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Achievement name',
                    descriptionLocalizations: {
                        'ru': `Название достижения`,
                        'uk': `Назва досягнення`,
                        'es-ES': `Nombre del logro`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    required: true
                }
            ]
        },
        {
            name: 'edit',
            nameLocalizations: {
                'ru': `изменить`,
                'uk': `змінити`,
                'es-ES': `editar`
            },
            description: 'Edit an achievement',
            descriptionLocalizations: {
                'ru': `Изменить достижение`,
                'uk': `Змінити досягнення`,
                'es-ES': `Editar un logro`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Achievement name',
                    descriptionLocalizations: {
                        'ru': `Название достижения`,
                        'uk': `Назва досягнення`,
                        'es-ES': `Nombre del logro`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    autocomplete: true,
                    required: true
                }
            ]
        },
        {
            name: 'copy',
            nameLocalizations: {
                'ru': `копировать`,
                'uk': `копіювати`,
                'es-ES': `copiar`
            },
            description: 'Copy an achievement',
            descriptionLocalizations: {
                'ru': `Копировать достижение`,
                'uk': `Копіювати досягнення`,
                'es-ES': `Copiar un logro`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'achievement',
                    nameLocalizations: {
                        'ru': `достижение`,
                        'uk': `досягнення`,
                        'es-ES': `logro`
                    },
                    description: 'Achievement name',
                    descriptionLocalizations: {
                        'ru': `Название достижения`,
                        'uk': `Назва досягнення`,
                        'es-ES': `Nombre del logro`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    autocomplete: true,
                    required: true
                },
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Name for new achievement',
                    descriptionLocalizations: {
                        'ru': `Название для нового достижения`,
                        'uk': `Назва для нового досягнення`,
                        'es-ES': `Nombre para el nuevo logro`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    required: true
                }
            ]
        },
        {
            name: 'delete',
            nameLocalizations: {
                'ru': `удалить`,
                'uk': `видалити`,
                'es-ES': `eliminar`
            },
            description: 'Delete an achievement',
            descriptionLocalizations: {
                'ru': `Удалить достижение`,
                'uk': `Видалити досягнення`,
                'es-ES': `Eliminar un logro`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Achievement name',
                    descriptionLocalizations: {
                        'ru': `Название достижения`,
                        'uk': `Назва досягнення`,
                        'es-ES': `Nombre del logro`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    autocomplete: true,
                    required: true
                }
            ]
        },
        {
            name: 'enable-all',
            nameLocalizations: {
                'ru': `включить-все`,
                'uk': `увімкнути-всі`,
                'es-ES': `activar-todos`
            },
            description: 'Enable all achievements',
            descriptionLocalizations: {
                'ru': `Включить все достижения`,
                'uk': `Увімкнути всі досягнення`,
                'es-ES': `Activar todos los logros`
            },
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'disable-all',
            nameLocalizations: {
                'ru': `выключить-все`,
                'uk': `вимкнути-всі`,
                'es-ES': `desactivar-todos`
            },
            description: 'Disable all achievements',
            descriptionLocalizations: {
                'ru': `Выключить все достижения`,
                'uk': `Вимкнути всі досягнення`,
                'es-ES': `Desactivar todos los logros`
            },
            type: ApplicationCommandOptionType.Subcommand,
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `managers`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        let achievement
        const settings = client.cache.settings.get(interaction.guildId)
        if (interaction.isChatInputCommand() || interaction.customId?.includes("view")) {
            if (interaction.isChatInputCommand()) await interaction.deferReply({ flags: ["Ephemeral"] })
            if (args?.Subcommand === "create") {
                const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId)
                if (achievements.size >= settings.max_achievements) return interaction.editReply({ content: `${client.language({ textId: "Maximum achievements reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_achievements}`, flags: ["Ephemeral"] })
                if (achievements.some(e => e.name.toLowerCase() === args.name.toLowerCase())) {
                    return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with name", guildId: interaction.guildId, locale: interaction.locale })} <${args.name}> ${client.language({ textId: "already exists, choose a different name", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                achievement = new client.achievementSchema({
                    id: uniqid.time(),
                    name: args.name,
                    guildID: interaction.guildId,
                    enable: false
                })
                await achievement.save()
                achievement = new Achievement(client, achievement)
                client.cache.achievements.set(achievement.id, achievement)
            } else
            if (args?.Subcommand === "edit") {
                achievement = client.cache.achievements.find(e => e.name.toLowerCase() === args.name.toLowerCase() && e.guildID === interaction.guildId)
                if (!achievement) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with name", guildId: interaction.guildId, locale: interaction.locale })} <${args.name}> ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "copy") {
                const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId)
                if (achievements.size >= settings.max_achievements) return interaction.reply({ content: `${client.language({ textId: "Maximum achievements reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_achievements}`, flags: ["Ephemeral"] })
                let originalAchievement = client.cache.achievements.find(e => e.name.toLowerCase() === args.achievement.toLowerCase() && e.guildID === interaction.guildId)
                if (!originalAchievement) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with name", guildId: interaction.guildId, locale: interaction.locale })}: <${args.name}> ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                if (originalAchievement.type === AchievementType.Items || originalAchievement.type === AchievementType.GetAllAchievements) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with this task cannot be copied", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                if (client.cache.achievements.some(e => e.name.toLowerCase() === args.name.toLowerCase() && e.guildID === interaction.guildId)) {
                    return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with name", guildId: interaction.guildId, locale: interaction.locale })}: <${args.name}>> ${client.language({ textId: "already exists, choose a different name", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                let copyAchievement = structuredClone(Object.assign({}, { ...originalAchievement, client: undefined, items: [], roles: [], rewards: [] }))
                if (originalAchievement.items.length) copyAchievement.items = JSON.parse(JSON.stringify(originalAchievement.items))
                if (originalAchievement.roles.length) copyAchievement.roles = JSON.parse(JSON.stringify(originalAchievement.roles))
                if (originalAchievement.rewards.length) copyAchievement.rewards = JSON.parse(JSON.stringify(originalAchievement.rewards))
                delete copyAchievement._id
                copyAchievement.name = args.name
                copyAchievement.id = uniqid.time()
                copyAchievement.enable = false
                copyAchievement = new client.achievementSchema(copyAchievement)
                await copyAchievement.save()
                achievement = new Achievement(client, copyAchievement)
                achievement.displayEmoji = originalAchievement.displayEmoji
                client.cache.achievements.set(achievement.id, achievement)
            } else
            if (args?.Subcommand === "delete") {
                achievement = client.cache.achievements.find(e => e.name.toLowerCase() === args.name.toLowerCase() && e.guildID === interaction.guildId)
                if (!achievement) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with name", guildId: interaction.guildId, locale: interaction.locale })} <${args.name}> ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}**` })
                await achievement.delete()
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Achievement", guildId: interaction.guildId, locale: interaction.locale })} <${achievement.name}> ${client.language({ textId: "was deleted", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "view" || interaction.customId?.includes("view")) {
                const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId)
                let min = 0
                let max = 25
                if (interaction.customId?.includes("lim")) {
                    max = +limRegexp.exec(interaction.customId)[1]
                    min = max - 25
                }
                let index = 0
                const embed = new EmbedBuilder()
                    .setTitle(`${client.language({ textId: "Achievement Manager", guildId: interaction.guildId, locale: interaction.locale })} (${achievements.size}/${settings.max_achievements})`)
                    .setColor(3093046)
                    .setDescription(achievements.size ? achievements.map((achievement) => { 
                        return `${index++}. ${achievement.enable ? "🟢": "🔴"}${achievement.displayEmoji}${achievement.name}`
                    }).slice(min, max).join("\n") : `${client.language({ textId: "No achievements", guildId: interaction.guildId, locale: interaction.locale })}`)
                const embeds = [
                    embed,
                    new EmbedBuilder()
                        .setColor(3093046)
                        .setDescription(`${client.config.emojis.plus}${client.language({ textId: "Create achievement", guildId: interaction.guildId, locale: interaction.locale })}: </manager-achievements create:1150455842076905508>\n${client.config.emojis.edit}${client.language({ textId: "Edit achievement", guildId: interaction.guildId, locale: interaction.locale })}: </manager-achievements edit:1150455842076905508>\n${client.config.emojis.copy}${client.language({ textId: "Copy achievement", guildId: interaction.guildId, locale: interaction.locale })}: </manager-achievements copy:1150455842076905508>\n${client.config.emojis.trash}${client.language({ textId: "Delete achievement", guildId: interaction.guildId, locale: interaction.locale })}: </manager-achievements delete:1150455842076905508>`)
                ]
                const components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowLeft2}`)
                                .setCustomId(`cmd{manager-achievements}lim{25}view1`)
                                .setDisabled((achievements.size <= 25 && min === 0) || (achievements.size > 25 && min < 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowLeft}`)
                                .setCustomId(`cmd{manager-achievements}lim{${max - 25}}view2`)
                                .setDisabled((achievements.size <= 25 && min === 0) || (achievements.size > 25 && min < 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowRight}`)
                                .setCustomId(`cmd{manager-achievements}lim{${max + 25}}view3`)
                                .setDisabled((achievements.size <= 25 && min === 0) || (achievements.size > 25 && min >= achievements.size - 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowRight2}`)
                                .setCustomId(`cmd{manager-achievements}lim{${achievements.size + (achievements.size % 25 === 0 ? 0 : 25 - (achievements.size % 25))}}view4`)
                                .setDisabled((achievements.size <= 25 && min === 0) || (achievements.size > 25 && min >= achievements.size - 25) ? true : false)
                        )
                ]
                if (interaction.isChatInputCommand()) return interaction.editReply({ embeds: embeds, components: components })
                else return interaction.update({ embeds: embeds, components: components })
            } else
            if (args?.Subcommand === "enable-all") {
                if (!client.cache.achievements.some(e => e.guildID === interaction.guildId)) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No achievements on the server", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                let count = 0
                await Promise.all(client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.name && e.emoji && e.type && e.amount && (e.type === "role" ? e.roles.length : true && e.type === "item" ? e.items.length : true)).map(async achievement => {
                    achievement.enable = true
                    await achievement.save()
                    count++
                }))
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Achievements have been enabled", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "disable-all") {
                if (!client.cache.achievements.some(e => e.guildID === interaction.guildId)) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No achievements on the server", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                let count = 0
                await Promise.all(client.cache.achievements.filter(e => e.guildID === interaction.guildId).map(async achievement => {
                    achievement.enable = false
                    await achievement.save()
                    count++
                }))
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Achievements have been disabled", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            }
        }
        if (!interaction.isChatInputCommand()) {
            achievement = client.cache.achievements.get(achievementRegexp.exec(interaction.customId)[1])
            if (!achievement) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Such achievement does not exist", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            if (interaction.values[0] === "name") {
                const modal = new ModalBuilder()
                    .setCustomId(`manager-achievements_name_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Achievement name", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(true)
                                    .setMinLength(2)
                                    .setMaxLength(30)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(achievement.name)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `manager-achievements_name_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (client.cache.achievements.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with name", guildId: interaction.guildId, locale: interaction.locale })} ${modalArgs.name} ${client.language({ textId: "already exists, choose a different name", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                    }
                    achievement.name = modalArgs.name
                    await achievement.save()
                } else return
            } else
            if (interaction.values[0] === "emoji") {
                const command = client.interactions.get("emoji-selector")
                return command.run(client, interaction, args, "achievement", achievement.id)
            } else
            if (interaction.values[0] === "type") {
                const options = Object.values(AchievementType).map(key => {
                    return {
                        label: client.functions.getAchievementDescription({ type: key, client: client }, undefined, settings, interaction, interaction.member),
                        value: String(key)
                    }
                })
                options.unshift({
                    label: `${client.language({ textId: "Custom task", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: "0"
                })
                const components = []
                const perChunk = 25
                const result = options.reduce((resultArray, item, index) => {
                    const chunkIndex = Math.floor(index/perChunk)
                    if (!resultArray[chunkIndex]) {
                        resultArray[chunkIndex] = []
                    }
                    resultArray[chunkIndex].push(item)
                    return resultArray
                }, [])
                result.forEach((chunk, index) => {
                    components.push(
                        new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`manager-achievements_selectType_${index}`)
                                    .setOptions(chunk)
                                    .setPlaceholder(`${client.language({ textId: "Tasks", guildId: interaction.guildId, locale: interaction.locale })} (${chunk.length})`)
                            )
                    )
                })
                await interaction.update({ embeds: [], components: components })
                const filter = (i) => i.customId.includes(`manager-achievements_selectType`) && i.user.id === interaction.user.id
                let selectInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 120000 }).catch(e => null)
                if (selectInteraction) {
                    const type = Number(selectInteraction.values[0])
                    if (type === AchievementType.Craft || type === AchievementType.Item || type === AchievementType.MiningItem || type === AchievementType.FishingItem) {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-achievements_items_${selectInteraction.id}`)
                            .setTitle(`${client.language({ textId: "Items (OR)", guildId: selectInteraction.guildId, locale: selectInteraction.locale })}`)
                            .setLabelComponents([1, 2, 3, 4, 5].map(num => {
                                return new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Item", guildId: selectInteraction.guildId, locale: selectInteraction.locale })} ${num}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId(`item${num}`)
                                            .setRequired(num === 1 ? true : false)
                                            .setStyle(TextInputStyle.Short)
                                            .setPlaceholder(`${client.language({ textId: "Item name", guildId: selectInteraction.guildId, locale: selectInteraction.locale })}`)
                                    )
                            }))
                        await selectInteraction.showModal(modal);delete client.globalCooldown[`${selectInteraction.guildId}_${selectInteraction.user.id}`]
                        const filter = (i) => i.customId === `manager-achievements_items_${selectInteraction.id}` && i.user.id === selectInteraction.user.id
                        selectInteraction = await selectInteraction.awaitModalSubmit({ filter, time: 60000 }).catch(e => selectInteraction)
                        if (selectInteraction && selectInteraction.isModalSubmit()) {
                            const modalArgs = {}
                            selectInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            const values = Object.values(modalArgs).filter(e => e)
                            const items = []
                            for (const itemName of values) {
                                const item = client.cache.items.find(e => !e.temp && e.enabled && e.guildID === selectInteraction.guildId && e.name.toLowerCase() === itemName.toLowerCase())
                                if (!item) {
                                    if (!selectInteraction.deferred && !selectInteraction.replied) await selectInteraction.deferUpdate()
                                    await selectInteraction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Item with name", guildId: selectInteraction.guildId, locale: selectInteraction.locale })} <${itemName}> ${client.language({ textId: "not created or is invisible", guildId: selectInteraction.guildId, locale: selectInteraction.locale })}**`, flags: ["Ephemeral"] })
                                } else {
                                    items.push(item.itemID)
                                }
                            }
                            if (items.length) {
                                if (achievement.roles.length) achievement.roles = []
                                achievement.amount = undefined
                                achievement.type = type
                                achievement.items = items
                                await achievement.save()
                            }
                        }
                    } else if (type === AchievementType.Items || type === AchievementType.GetAllAchievements) {
                        if ((type === AchievementType.Items && client.cache.achievements.some(e => e.type === AchievementType.Items && e.guildID === selectInteraction.guildId)) || (type === AchievementType.GetAllAchievements && client.cache.achievements.some(e => e.type === AchievementType.GetAllAchievements && e.guildID === selectInteraction.guildId))) {
                            await selectInteraction.deferUpdate()
                            await selectInteraction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with this task already exists", guildId: selectInteraction.guildId, locale: selectInteraction.locale })}**`, flags: ["Ephemeral"] })
                        } else {
                            if (achievement.items.length) achievement.items = []
                            if (achievement.roles.length) achievement.roles = []
                            achievement.amount = undefined
                            achievement.type = type
                            await achievement.save()
                        }
                    } else if (type === 0) {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-achievements_custom_${selectInteraction.id}`)
                            .setTitle(`${client.language({ textId: "Custom task", guildId: selectInteraction.guildId, locale: selectInteraction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Task", guildId: selectInteraction.guildId, locale: selectInteraction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId(`task`)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                            .setMaxLength(50)
                                    ),
                            ])
                        await selectInteraction.showModal(modal);delete client.globalCooldown[`${selectInteraction.guildId}_${selectInteraction.user.id}`]
                        const filter = (i) => i.customId === `manager-achievements_custom_${selectInteraction.id}` && i.user.id === selectInteraction.user.id
                        selectInteraction = await selectInteraction.awaitModalSubmit({ filter, time: 60000 }).catch(e => selectInteraction)
                        if (selectInteraction && selectInteraction.isModalSubmit()) {
                            const modalArgs = {}
                            selectInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            achievement.type = modalArgs.task
                            achievement.amount = undefined
                            achievement.items = []
                            achievement.roles = []
                            await achievement.save()
                        }
                    } else if (type === AchievementType.Role) {
                        await selectInteraction.update({ embeds: [], components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`manager-achivements_roles`)
                                        .setMaxValues(10)
                                )
                        ] })
                        const filter = (i) => i.customId.includes(`manager-achivements_roles`) && i.user.id === interaction.user.id
                        selectInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 120000 }).catch(e => null)
                        if (selectInteraction) {
                            achievement.type = type
                            if (achievement.items.length) achievement.items = []
                            achievement.amount = undefined
                            achievement.roles = selectInteraction.roles.map(e => e.id)
                            await achievement.save()
                        }
                    } else {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-achievements_amount_${selectInteraction.id}`)
                            .setTitle(`${client.language({ textId: "Quantity", guildId: selectInteraction.guildId, locale: selectInteraction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Quantity", guildId: selectInteraction.guildId, locale: selectInteraction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId(`amount`)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                    ),
                            ])
                        await selectInteraction.showModal(modal);delete client.globalCooldown[`${selectInteraction.guildId}_${selectInteraction.user.id}`]
                        const filter = (i) => i.customId === `manager-achievements_amount_${selectInteraction.id}` && i.user.id === selectInteraction.user.id
                        selectInteraction = await selectInteraction.awaitModalSubmit({ filter, time: 60000 }).catch(e => selectInteraction)
                        if (selectInteraction && selectInteraction.isModalSubmit()) {
                            const modalArgs = {}
                            selectInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.amount)) {
                                await selectInteraction.deferUpdate()
                                await selectInteraction.followUp({ content: `${client.config.emojis.NO}**${modalArgs.amount}${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                            } else {
                                if (achievement.items.length) achievement.items = []
                                if (achievement.roles.length) achievement.roles = []
                                achievement.type = type
                                achievement.amount = +modalArgs.amount
                                await achievement.save()
                            }
                            
                        }
                    }
                    if (!selectInteraction.deferred && !selectInteraction.replied) await selectInteraction.deferUpdate()
                }
            } else
            if (interaction.values[0] === "addReward") {
                if (achievement.rewards.length >= MAX_REWARDS) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Maximum number of rewards reached", guildId: interaction.guildId, locale: interaction.locale })}: ${MAX_REWARDS}**`, flags: ["Ephemeral"] })
                await interaction.update({
                    embeds: [],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`manager-achievements_addreward_xp`)
                                    .setLabel(client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setEmoji(client.config.emojis.XP)
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`manager-achievements_addreward_currency`)
                                    .setLabel(settings.currencyName)
                                    .setEmoji(settings.displayCurrencyEmoji)
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`manager-achievements_addreward_reputation`)
                                    .setLabel(client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setEmoji(client.config.emojis.RP)
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`manager-achievements_addreward_item`)
                                    .setLabel(client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setEmoji(client.config.emojis.box)
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`manager-achievements_addreward_role`)
                                    .setLabel(client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setEmoji(client.config.emojis.roles)
                                    .setStyle(ButtonStyle.Secondary),
                            )
                    ] 
                })
                const filter = (i) => i.customId.includes(`manager-achievements_addreward`) && i.user.id === interaction.user.id
                let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 120000 }).catch(e => null)
                if (interaction2) {
                    const rewardType = interaction2.customId.includes("item") ? RewardType.Item : interaction2.customId.includes("xp") ? RewardType.Experience : interaction2.customId.includes("currency") ? RewardType.Currency : interaction2.customId.includes("reputation") ? RewardType.Reputation : RewardType.Role
                    if (interaction2.customId.includes("item")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-achievements_addRewardItem_${interaction2.id}`)
                            .setTitle(`${client.language({ textId: "Item", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Item", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId(`itemName`)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                            .setPlaceholder(`${client.language({ textId: "Item name", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                    ),
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Quantity", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId(`amount`)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                    ),
                            ])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `manager-achievements_addRewardItem_${interaction2.id}` && i.user.id === interaction2.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                        if (interaction2 && interaction2.isModalSubmit()) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            const item = client.cache.items.find(e => e.guildID === interaction2.guildId && e.name.toLowerCase() === modalArgs.itemName.toLowerCase())
                            if (!item) {
                                await interaction2.deferUpdate()
                                await interaction2.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Item with name", guildId: interaction2.guildId, locale: interaction2.locale })} ${modalArgs.itemName} ${client.language({ textId: "not created or is invisible", guildId: interaction2.guildId, locale: interaction2.locale })}**`, flags: ["Ephemeral"] })
                            } else {
                                if (isNaN(+modalArgs.amount)) {
                                    await interaction2.deferUpdate()
                                    await interaction2.followUp({ content: `${client.config.emojis.NO}**${modalArgs.amount}${client.language({ textId: "is not a number", guildId: interaction2.guildId, locale: interaction2.locale })}**`, flags: ["Ephemeral"] })
                                } else {
                                    modalArgs.amount = +modalArgs.amount
                                    const max = 1000000000
                                    const min = 0.01
                                    if (modalArgs.amount > max || modalArgs.amount < min) {
                                        await interaction2.deferUpdate()
                                        await interaction2.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction2.locale })} > ${max} ${client.language({ textId: "or", guildId: interaction2.guildId, locale: interaction2.locale })} < ${min}**`, flags: ["Ephemeral"] })
                                    } else {
                                        const reward = achievement.rewards.find(e => { return e.id === item.itemID })
                                        if (reward) reward.amount = modalArgs.amount
                                        else {
                                            achievement.rewards.push({
                                                type: rewardType,
                                                id: item.itemID,
                                                amount: modalArgs.amount
                                            })
                                        }
                                        await achievement.save()     
                                    }
                                }
                            }
                        }
                    } else if (interaction2.customId.includes("role")) {
                        await interaction2.update({ embeds: [], components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`manager-achievements_addRewardRole`)
                                )
                        ] })
                        const filter = (i) => i.customId.includes(`manager-achievements_addRewardRole`) && i.user.id === interaction2.user.id
                        interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 120000 }).catch(e => null)
                        if (interaction2) {
                            const reward = achievement.rewards.find(e => { return e.type === RewardType.Role && e.id === interaction2.roles.first().id })
                            if (reward) {
                                await interaction2.deferUpdate()
                                await interaction2.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Such role already exists in rewards", guildId: interaction2.guildId, locale: interaction2.locale })}**`, flags: ["Ephemeral"] })
                            } else {
                                achievement.rewards.push({
                                    type: RewardType.Role,
                                    id: interaction2.roles.first().id
                                })
                                await achievement.save()
                            }
                        }
                    } else {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-achievements_addReward_${interaction2.id}`)
                            .setTitle(`${client.language({ textId: "Quantity", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Quantity", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId(`amount`)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                    ),
                            ])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `manager-achievements_addReward_${interaction2.id}` && i.user.id === interaction2.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                        if (interaction2 && interaction2.isModalSubmit()) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.deferUpdate()
                                await interaction2.followUp({ content: `${client.config.emojis.NO}**${modalArgs.amount}${client.language({ textId: "is not a number", guildId: interaction2.guildId, locale: interaction2.locale })}**`, flags: ["Ephemeral"] })
                            } else {
                                modalArgs.amount = +modalArgs.amount
                                const max = rewardType === RewardType.Reputation ? 1000 : 1000000000
                                const min = rewardType === RewardType.Reputation ? -1000 : 0.01
                                if (modalArgs.amount > max || modalArgs.amount < min) {
                                    await interaction2.deferUpdate()
                                    await interaction2.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Quantity must not be", guildId: interaction2.guildId, locale: interaction2.locale })} > ${max} ${client.language({ textId: "or", guildId: interaction2.guildId, locale: interaction2.locale })} < ${min}**`, flags: ["Ephemeral"] })
                                } else {
                                    const reward = achievement.rewards.find(e => { return e.type === rewardType })
                                    if (reward) reward.amount = modalArgs.amount
                                    else {
                                        achievement.rewards.push({
                                            type: rewardType,
                                            amount: modalArgs.amount
                                        })
                                    }
                                    await achievement.save()    
                                } 
                            }
                        }
                    }
                    if (interaction2 !== null && !interaction2.deferred && !interaction2.replied) await interaction2.deferUpdate()
                }
            } else
            if (interaction.values[0] === "delReward") {
                if (!achievement.rewards.length) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement has no rewards", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                interaction.update({ embeds: [], components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setOptions(achievement.rewards.map((e, i) => {
                                    return {
                                        emoji: e.type === RewardType.Currency ? settings.displayCurrencyEmoji : e.type === RewardType.Experience ? client.config.emojis.XP : e.type === RewardType.Item ? client.cache.items.get(e.id).emoji : e.type === RewardType.Reputation ? client.config.emojis.RP : client.config.emojis.roles,
                                        label: e.type === RewardType.Currency ? settings.currencyName : e.type === RewardType.Experience ? client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale }) : e.type === RewardType.Item ? client.cache.items.get(e.id).name : e.type === RewardType.Reputation ? client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale }) : interaction.guild.roles.cache.get(e.id)?.name || `${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ${e.id}`,
                                        value: String(i)
                                    }
                                }))
                                .setCustomId(`manager-achievements_delReward`)
                        )
                ] })
                const filter = (i) => i.customId.includes(`manager-achievements_delReward`) && i.user.id === interaction.user.id
                const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 120000 }).catch(e => null)
                if (interaction2) {
                    achievement.rewards.splice(Number(interaction2.values[0]), 1)
                    await achievement.save()
                    await interaction2.deferUpdate()
                }
            } else
            if (interaction.values[0] === "switch") {
                const errors = []
                if (!achievement.emoji) errors.push(`${client.language({ textId: "Missing emoji", guildId: interaction.guildId, locale: interaction.locale })}`)
                if (!achievement.type) errors.push(`${client.language({ textId: "Missing task", guildId: interaction.guildId, locale: interaction.locale })}`)
                if (errors.length) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Cannot enable achievement", guildId: interaction.guildId, locale: interaction.locale })}:**\n* ${errors.join("\n* ")}`, flags: ["Ephemeral"] })
                achievement.enable = !achievement.enable
                await achievement.save()
            } else
            if (interaction.values[0] === "addAllUsers") {
                if (!achievement.enabled) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement disabled", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                if (achievement.rewards.some(e => e.type === RewardType.Role)) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Achievement with role reward cannot be given to all users", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                await interaction.update({ content: `⏳ ${client.language({ textId: "Granting achievements", guildId: interaction.guildId, locale: interaction.locale })}...`, components: [], embeds: [] })
                let count = 0
                await interaction.guild.members.fetch()
                await Promise.all(client.cache.profiles.filter(profile => profile.guildID === interaction.guildId && !profile.achievements?.some(e => e.achievmentID === achievement.id)).map(async profile => {
                    await profile.addAchievement(achievement, false, true, true)
                    await profile.save()
                    count++
                }))
                await interaction.followUp({ content: `${client.config.emojis.YES}**${client.language({ textId: "Achievement was given to users", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            } else
            if (interaction.values[0] === "removeAllUsers") {
                let count = 0
                await Promise.all(client.cache.profiles.filter(profile => profile.guildID === interaction.guildId && profile.achievements && profile.achievements.some(e => e.achievmentID === achievement.id)).map(async profile => {
                    await profile.delAchievement(achievement)
                    await profile.save()
                    count++
                }))
                await interaction.deferUpdate()
                await interaction.followUp({ content: `${client.config.emojis.YES}**${client.language({ textId: "Achievement was removed from users", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            }
        }
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${client.language({ textId: "Achievement Manager", guildId: interaction.guildId, locale: interaction.locale })}` })
            .setTitle(achievement.displayEmoji+achievement.name)
            .setDescription([
                `${achievement.enabled ? `🟢${client.language({ textId: "Achievement enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `🔴${client.language({ textId: "Achievement disabled", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                `👤${client.language({ textId: "Participants with this achievement", guildId: interaction.guildId, locale: interaction.locale })}: ${client.cache.profiles.filter(e => e.guildID === interaction.guildId && e.achievements && e.achievements.some(ach => ach.achievmentID === achievement.id)).size}`,
                client.functions.getAchievementDescription(achievement, undefined, settings, interaction, interaction.member)
            ].join("\n"))
            .setFields([
                {
                    name: client.language({ textId: "Rewards", guildId: interaction.guildId, locale: interaction.locale }),
                    value: achievement.rewards.length ? await Promise.all(achievement.rewards.map(async reward => {
                        const emoji = 
                            reward.type === RewardType.Currency ? settings.displayCurrencyEmoji : 
                            reward.type === RewardType.Experience ? client.config.emojis.XP : 
                            reward.type === RewardType.Reputation ? client.config.emojis.RP : 
                            reward.type === RewardType.Item ? client.cache.items.get(reward.id)?.displayEmoji || "❓" : reward.type === RewardType.Role ? "" : 
                            ""
                        const name = 
                            reward.type === RewardType.Currency ? settings.currencyName : 
                            reward.type === RewardType.Experience ? client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale }) : 
                            reward.type === RewardType.Reputation ? client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale }) : 
                            reward.type === RewardType.Item ? client.cache.items.get(reward.id)?.name || reward.id : 
                            reward.type === RewardType.Role ? `<@&${reward.id}>` : 
                            ""
                        return `${emoji}${name}${reward.amount ? ` (${reward.amount})`: ""}`
                    })).then(array => array.join(", ")) : client.language({ textId: "No rewards", guildId: interaction.guildId, locale: interaction.locale })
                }
            ])
            .setColor(3093046)
            .setFooter({ text: `ID: ${achievement.id}` })
        const row1 = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setOptions([
                        {
                            label: client.language({ textId: "Change name", guildId: interaction.guildId, locale: interaction.locale }),
                            value: `name`,
                            emoji: "🔠"
                        },
                        {
                            label: client.language({ textId: "Change emoji", guildId: interaction.guildId, locale: interaction.locale }),
                            value: `emoji`,
                            emoji: "👻"
                        },
                        {
                            label: client.language({ textId: "Change task", guildId: interaction.guildId, locale: interaction.locale }),
                            value: `type`,
                            emoji: "📋"
                        },
                        {
                            label: client.language({ textId: "Add reward", guildId: interaction.guildId, locale: interaction.locale }),
                            value: `addReward`,
                            emoji: "🎁"
                        },
                        {
                            label: client.language({ textId: "Delete reward", guildId: interaction.guildId, locale: interaction.locale }),
                            value: `delReward`,
                            emoji: "❌"
                        },
                    ])
                    .setPlaceholder(`✏️${client.language({ textId: "Edit achievement", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setCustomId(`cmd{manager-achievements}achievementId{${achievement.id}}edit`)
            )
        const row2 = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setOptions([
                        {
                            label: achievement.enabled ? client.language({ textId: "Disable achievement", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "Enable achievement", guildId: interaction.guildId, locale: interaction.locale }),
                            value: `switch`,
                            emoji: achievement.enabled ? client.config.emojis.off : client.config.emojis.on
                        },
                        {
                            label: client.language({ textId: "Give achievement to all users", guildId: interaction.guildId, locale: interaction.locale }),
                            value: `addAllUsers`,
                            emoji: client.config.emojis.plus
                        },
                        {
                            label: client.language({ textId: "Remove achievement from all users", guildId: interaction.guildId, locale: interaction.locale }),
                            value: `removeAllUsers`,
                            emoji: client.config.emojis.minus
                        }
                    ])
                    .setPlaceholder(`🪄${client.language({ textId: "Actions", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setCustomId(`cmd{manager-achievements}achievementId{${achievement.id}}actions`)
            )
        if (interaction.replied || interaction.deferred) return interaction.editReply({ content: ` `, embeds: [embed], components: [row1, row2] })
        else return interaction.update({ content: ` `, embeds: [embed], components: [row1, row2] })
    }
}