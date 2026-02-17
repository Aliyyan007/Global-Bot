const { ChannelType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection, ChannelSelectMenuBuilder, Webhook, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, ApplicationCommandOptionType, RoleSelectMenuBuilder, LabelBuilder } = require("discord.js")
const AutogeneratorRegexp = /id{(.*?)}/
const uniqid = require('uniqid')
const Cron = require("croner")
const Autogenerator = require("../classes/promocodeAutogenerator.js")
const { RewardType } = require("../enums/RewardType.js")
module.exports = {
    name: 'promocode-autogenerators',
    nameLocalizations: {
        'ru': 'автогенератор-промокодов',
        'uk': 'автогенератор-промокодів',
        'es-ES': 'generador-automatico-codigos'
    },
    description: 'Manage autogenerators of promocodes',
    descriptionLocalizations: {
        'ru': 'Управление автогенераторами промокодов',
        'uk': 'Управління автогенераторами промокодів',
        'es-ES': 'Gestionar generadores automáticos de códigos promocionales'
    },
    options: [
        {
            name: 'view',
            nameLocalizations: {
                'ru': 'просмотр',
                'uk': 'перегляд',
                'es-ES': 'ver'
            },
            description: 'View all autogenerators',
            descriptionLocalizations: {
                'ru': 'Просмотр всех автогенераторов',
                'uk': 'Перегляд усіх автогенераторів',
                'es-ES': 'Ver todos los generadores automáticos'
            },
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'create',
            nameLocalizations: {
                'ru': 'создать',
                'uk': 'створити',
                'es-ES': 'crear'
            },
            description: 'Create an autogenerator',
            descriptionLocalizations: {
                'ru': 'Создать автогенератор',
                'uk': 'Створити автогенератор',
                'es-ES': 'Crear un generador automático'
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': 'название',
                        'uk': 'назва',
                        'es-ES': 'nombre'
                    },
                    description: 'Autogenerator name',
                    descriptionLocalizations: {
                        'ru': 'Название автогенератора',
                        'uk': 'Назва автогенератора',
                        'es-ES': 'Nombre del generador automático'
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
                'ru': 'изменить',
                'uk': 'змінити',
                'es-ES': 'editar'
            },
            description: 'Edit an autogenerator',
            descriptionLocalizations: {
                'ru': 'Изменить автогенератор',
                'uk': 'Змінити автогенератор',
                'es-ES': 'Editar generador automático'
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': 'название',
                        'uk': 'назва',
                        'es-ES': 'nombre'
                    },
                    description: 'Autogenerator name',
                    descriptionLocalizations: {
                        'ru': 'Название автогенератора',
                        'uk': 'Назва автогенератора',
                        'es-ES': 'Nombre del generador automático'
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
                'ru': 'копировать',
                'uk': 'копіювати',
                'es-ES': 'copiar'
            },
            description: 'Copy an autogenerator',
            descriptionLocalizations: {
                'ru': 'Копировать автогенератор',
                'uk': 'Копіювати автогенератор',
                'es-ES': 'Copiar generador automático'
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'autogenerator',
                    nameLocalizations: {
                        'ru': 'автогенератор',
                        'uk': 'автогенератор',
                        'es-ES': 'generador'
                    },
                    description: 'Autogenerator name',
                    descriptionLocalizations: {
                        'ru': 'Название автогенератора',
                        'uk': 'Назва автогенератора',
                        'es-ES': 'Nombre del generador automático'
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
                        'ru': 'название',
                        'uk': 'назва',
                        'es-ES': 'nombre'
                    },
                    description: 'Name for new autogenerator',
                    descriptionLocalizations: {
                        'ru': 'Название для нового автогенератора',
                        'uk': 'Назва для нового автогенератора',
                        'es-ES': 'Nombre para nuevo generador automático'
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
                'ru': 'удалить',
                'uk': 'видалити',
                'es-ES': 'eliminar'
            },
            description: 'Delete an autogenerator',
            descriptionLocalizations: {
                'ru': 'Удалить автогенератор',
                'uk': 'Видалити автогенератор',
                'es-ES': 'Eliminar generador automático'
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': 'название',
                        'uk': 'назва',
                        'es-ES': 'nombre'
                    },
                    description: 'Autogenerator name',
                    descriptionLocalizations: {
                        'ru': 'Название автогенератора',
                        'uk': 'Назва автогенератора',
                        'es-ES': 'Nombre del generador automático'
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
                'ru': 'включить-все',
                'uk': 'увімкнути-всі',
                'es-ES': 'activar-todos'
            },
            description: 'Enable all autogenerators',
            descriptionLocalizations: {
                'ru': 'Включить все автогенераторы',
                'uk': 'Увімкнути всі автогенератори',
                'es-ES': 'Activar todos los generadores automáticos'
            },
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'disable-all',
            nameLocalizations: {
                'ru': 'выключить-все',
                'uk': 'вимкнути-всі',
                'es-ES': 'desactivar-todos'
            },
            description: 'Disable all autogenerators',
            descriptionLocalizations: {
                'ru': 'Выключить все автогенераторы',
                'uk': 'Вимкнути всі автогенератори',
                'es-ES': 'Desactivar todos los generadores automáticos'
            },
            type: ApplicationCommandOptionType.Subcommand,
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `managers`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        const settings = client.cache.settings.get(interaction.guildId)
        let autogenerator
        if (interaction.isChatInputCommand()) {
            await interaction.deferReply({ flags: ["Ephemeral"] })
            if (args.Subcommand === "create") {
                const autogenerators = client.cache.promocodeAutogenerators.filter(e => e.guildID === interaction.guildId)
                if (autogenerators.size >= 25) return interaction.editReply({ content: `${client.language({ textId: "Maximum autogenerators reached: 25", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (autogenerators.some(e => e.name.toLowerCase() === args.name.toLowerCase() && e.guildID === interaction.guildId)) {
                    return interaction.editReply({ content: `${client.language({ textId: "Autogenerator with name", guildId: interaction.guildId, locale: interaction.locale })} **${args.name}** ${client.language({ textId: "already exists, choose another name", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                autogenerator = new client.promocodeAutogeneratorSchema({
                    id: uniqid.time(),
                    name: args.name,
                    guildID: interaction.guildId
                })
                await autogenerator.save()
                autogenerator = new Autogenerator(client, autogenerator)
                client.cache.promocodeAutogenerators.set(autogenerator.id, autogenerator)
            } else
            if (args.Subcommand === "copy") {
                const autogenerators = client.cache.promocodeAutogenerators.filter(e => e.guildID === interaction.guildId)
                if (autogenerators.size >= 25) return interaction.editReply({ content: `${client.language({ textId: "Maximum autogenerators reached: 25", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                const originalAutogenerator = autogenerators.find(e => e.name.toLowerCase() === args.autogenerator.toLowerCase() && e.guildID === interaction.guildId)
                if (!originalAutogenerator) return interaction.editReply({ content: `${client.language({ textId: "Autogenerator with name", guildId: interaction.guildId, locale: interaction.locale })}: **${args.name}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (autogenerators.some(e => e.name.toLowerCase() === args.name.toLowerCase() && e.guildID === interaction.guildId)) {
                    return interaction.editReply({ content: `${client.language({ textId: "Autogenerator with name", guildId: interaction.guildId, locale: interaction.locale })}: **${args.name}** ${client.language({ textId: "already exists, choose another name", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const copyAutogenerator = structuredClone(Object.assign({}, { 
                    ...originalAutogenerator, 
                    client: undefined, 
                    items: []
                }))
                if (originalAutogenerator.items.length) copyAutogenerator.items = JSON.parse(JSON.stringify(originalAutogenerator.items))
                delete copyAutogenerator._id
                copyAutogenerator.name = args.name
                copyAutogenerator.id = uniqid.time()
                copyAutogenerator.enabled = false
                autogenerator = new client.promocodeAutogeneratorSchema(copyAutogenerator)
                await autogenerator.save()
                autogenerator = new Autogenerator(client, autogenerator)
                client.cache.promocodeAutogenerators.set(autogenerator.id, autogenerator)
            } else
            if (args.Subcommand === "edit") {
                autogenerator = client.cache.promocodeAutogenerators.find(e => e.name.toLowerCase() === args.name.toLowerCase() && e.guildID === interaction.guildId)
                if (!autogenerator) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Autogenerator with name", guildId: interaction.guildId, locale: interaction.locale })} **${args.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            } else
            if (args.Subcommand === "delete") {
                autogenerator = client.cache.promocodeAutogenerators.find(e => e.name.toLowerCase() === args.name.toLowerCase() && e.guildID === interaction.guildId)
                if (!autogenerator) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Autogenerator with name", guildId: interaction.guildId, locale: interaction.locale })} **${args.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
                await autogenerator.delete()
                return interaction.editReply({ content: `${client.language({ textId: "Autogenerator", guildId: interaction.guildId, locale: interaction.locale })} **${autogenerator.name}** ${client.language({ textId: "was deleted", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
            } else
            if (args.Subcommand === "view") {
                let index = 0
                const embed = new EmbedBuilder()
                    .setTitle(`${client.language({ textId: "Promocode autogenerators manager", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setColor(3093046)
                    .setDescription(client.cache.promocodeAutogenerators.filter(e => e.guildID === interaction.guildId).size ? client.cache.promocodeAutogenerators.filter(e => e.guildID === interaction.guildId).map((autogenerator) => { 
                        return `${index++}. ${autogenerator.name}`
                    }).join("\n") : `${client.language({ textId: "No autogenerators", guildId: interaction.guildId, locale: interaction.locale })}`)
                return interaction.editReply({ 
                    embeds: [
                        embed, 
                        new EmbedBuilder().setColor(3093046).setDescription(`${client.config.emojis.plus}${client.language({ textId: "Create autogenerator", guildId: interaction.guildId, locale: interaction.locale })}: </promocode-autogenerators create:1242440292339290195>\n${client.config.emojis.edit}${client.language({ textId: "Edit autogenerator", guildId: interaction.guildId, locale: interaction.locale })}: </promocode-autogenerators edit:1242440292339290195>\n${client.config.emojis.copy}${client.language({ textId: "Copy autogenerator", guildId: interaction.guildId, locale: interaction.locale })}: </promocode-autogenerators copy:1242440292339290195>\n${client.config.emojis.trash}${client.language({ textId: "Delete autogenerator", guildId: interaction.guildId, locale: interaction.locale })}: </promocode-autogenerators delete:1242440292339290195>`)
                    ] 
                })
            } else
            if (args?.Subcommand === "enable-all") {
                if (!client.cache.promocodeAutogenerators.some(e => e.guildID === interaction.guildId)) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No autogenerators on server", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                let count = 0
                await Promise.all(client.cache.promocodeAutogenerators.filter(e => e.guildID === interaction.guildId && e.items.length && e.channelId && e.cronPattern && e.runsLeft && !e.isEnabled).map(async autogenerator => {
                    autogenerator.enable()
                    await autogenerator.save()
                    count++
                }))
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Autogenerators have been enabled", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "disable-all") {
                if (!client.cache.promocodeAutogenerators.some(e => e.guildID === interaction.guildId)) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No autogenerators on server", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                let count = 0
                await Promise.all(client.cache.promocodeAutogenerators.filter(e => e.guildID === interaction.guildId && e.isEnabled).map(async autogenerator => {
                    autogenerator.disable()
                    await autogenerator.save()
                    count++
                }))
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Autogenerators have been disabled", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            }
        } else {
            autogenerator = client.cache.promocodeAutogenerators.get(AutogeneratorRegexp.exec(interaction.customId)[1])
            if (!autogenerator) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This autogenerator does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        if (interaction.isStringSelectMenu()) {
            if (interaction.values[0] === "on/off") {
                if (!autogenerator.enabled) {
                    const errors = []
                    if (!autogenerator.cronPattern) errors.push(`${client.config.emojis.NO} ${client.language({ textId: "Missing cron pattern", guildId: interaction.guildId, locale: interaction.locale })}`)
                    if (!autogenerator.channelId) errors.push(`${client.config.emojis.NO} ${client.language({ textId: "Missing channel where promocode appears", guildId: interaction.guildId, locale: interaction.locale })}`)
                    if (!autogenerator.runsLeft) errors.push(`${client.config.emojis.NO} ${client.language({ textId: "No generations left", guildId: interaction.guildId, locale: interaction.locale })}`)
                    if (!autogenerator.items.length) errors.push(`${client.config.emojis.NO} ${client.language({ textId: "Missing items for promocode generation", guildId: interaction.guildId, locale: interaction.locale })}`)
                    if (!client.cache.promocodes.filter(e => e.guildID === interaction.guildId).size >= 1000) errors.push(`${client.config.emojis.NO} ${client.language({ textId: "Maximum number of promocodes reached", guildId: interaction.guildId, locale: interaction.locale })}: 1000`)
                    if (errors.length) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Cannot enable autogenerator", guildId: interaction.guildId, locale: interaction.locale })}:\n${errors.join("\n")}`, flags: ["Ephemeral"] })
                    }
                    autogenerator.enable()
                } else {
                    autogenerator.disable()
                }
                await autogenerator.save()
            } else
            if (interaction.values[0] === "channelId") {
                const components = JSON.parse(JSON.stringify(interaction.message.components))
    			interaction.message.components.forEach(row => row.components.forEach(component => {
                    component.data.disabled = true
                }))
    			await interaction.update({ components: interaction.message.components })
                await interaction.followUp({ 
                    content: `${client.language({ textId: "Select channel where promocode will appear", guildId: interaction.guildId, locale: interaction.locale })}`,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ChannelSelectMenuBuilder()
                                    .setCustomId(`promocode-autogenerators_channels_select`)
									.setChannelTypes(ChannelType.AnnouncementThread, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PrivateThread, ChannelType.PublicThread)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`promocode-autogenerators_channels_cancel`)
                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger)
                            )
                    ],
                    flags: ["Ephemeral"]
                })    
                const filter = (i) => i.customId.includes(`promocode-autogenerators_channels`) && i.user.id === interaction.user.id
                const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
                if (interaction2) {
                    if (interaction2.customId === "promocode-autogenerators_channels_select") {
                        const channel = interaction2.channels.first()
                        if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages") || !channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory")) {
                            interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "For this channel I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n${client.language({ textId: "Send messages", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                            return interaction.editReply({ components: components })
                        }
                        autogenerator.channelId = channel.id
                        await autogenerator.save()
                        interaction2.update({ content: `${client.config.emojis.YES}`, components: [], flags: ["Ephemeral"] })
                    }
                    if (interaction2.customId === "promocode-autogenerators_channels_cancel") {
                        interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                        return interaction.editReply({ components: components })
                    }
                }
            } else
            if (interaction.values[0] === "cronPattern") {
                const modal = new ModalBuilder()
                    .setCustomId(`promocode-autogenerators_pattern_${interaction.id}`)
                    .setTitle(`${client.language({ textId: `Cron pattern`, guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Pattern", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("pattern")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(autogenerator.cronPattern || "")
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `promocode-autogenerators_pattern_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    try {
                        const job = Cron(modalArgs.pattern, { timezone: "Atlantic/Azores", interval: 60, paused: true }, () => {} )
                        job.stop()
                    } catch (err) {
                        await interaction.deferUpdate()
                        return interaction.followUp({ content: `${client.config.emojis.NO}${err.message}`, flags: ["Ephemeral"] })
                    }
                    autogenerator.cronPattern = modalArgs.pattern
                    if (autogenerator.isEnabled) {
                        if (autogenerator.cronJob) autogenerator.cronJob.stop()
                        autogenerator.cronJobStart()
                    }
                    await autogenerator.save()    
                }
            } else
            if (interaction.values[0] === "runsLeft") {
                const modal = new ModalBuilder()
                    .setCustomId(`promocode-autogenerators_runsLeft_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Number of generations", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Number of generations", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("runsLeft")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${autogenerator.runsLeft}` || "0")
                                    .setPlaceholder(`${client.language({ textId: "Infinite: Infinity", guildId: interaction.guildId, locale: interaction.locale })}`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `promocode-autogenerators_runsLeft_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (isNaN(+modalArgs.runsLeft)) {
                        await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.config.emojis.NO}**${modalArgs.runsLeft}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                    } else {
                        modalArgs.runsLeft = +modalArgs.runsLeft
                        if (modalArgs.runsLeft <= 0) {
                            await interaction.deferUpdate()
                            await interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0`, components: [], flags: ["Ephemeral"] })
                        } else {
                            autogenerator.runsLeft = modalArgs.runsLeft
                            await autogenerator.save()
                        }
                    }  
                }
            } else
            if (interaction.values[0] === "cycles") {
                const modal = new ModalBuilder()
                    .setCustomId(`promocode-autogenerators_cycles_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Item generation cycles", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Number of cycles", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("cycles")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${autogenerator.cycles}`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `promocode-autogenerators_cycles_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (isNaN(+modalArgs.cycles)) {
                        await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.config.emojis.NO}**${modalArgs.cycles}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                    } else {
                        modalArgs.cycles = +modalArgs.cycles
                        if (modalArgs.cycles <= 0 || modalArgs.cycles > 100) {
                            await interaction.deferUpdate()
                            await interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, components: [], flags: ["Ephemeral"] })
                        } else {
                            autogenerator.cycles = modalArgs.cycles
                            await autogenerator.save()
                        }
                    }  
                }
            } else
            if (interaction.values[0] === "lifeTime") {
                const modal = new ModalBuilder()
                    .setCustomId(`promocode-autogenerators_lifeTime_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Promocode lifetime", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Minutes", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("lifeTime")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${autogenerator.lifeTime}`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `promocode-autogenerators_lifeTime_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (isNaN(+modalArgs.lifeTime)) {
                        await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.config.emojis.NO}**${modalArgs.lifeTime}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                    } else {
                        modalArgs.lifeTime = +modalArgs.lifeTime
                        if (modalArgs.lifeTime < 1 || modalArgs.lifeTime > 1 * 60 * 24) {
                            await interaction.deferUpdate()
                            await interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 1 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > ${1 * 60 * 24}`, components: [], flags: ["Ephemeral"] })
                        } else {
                            autogenerator.lifeTime = modalArgs.lifeTime
                            await autogenerator.save()
                        }
                    }  
                }
            } else
            if (interaction.values[0] === "permission") {
                if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on server. Use </manager-permissions create:1150455842294988943> to create a preset.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const modal = new ModalBuilder()
                    .setCustomId(`promocode-autogenerators_permissions_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(false)
                                    .setValue(`${client.cache.permissions.find(e => e.id === autogenerator.permission)?.name || ""}`)
                                    .setStyle(TextInputStyle.Short)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `promocode-autogenerators_permissions_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!modalArgs.name) {
                        autogenerator.permission = undefined
                    } else {
                        const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
                        if (!permission) {
                            await interaction.deferUpdate()
                            await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
                        } else {
                            autogenerator.permission = permission.id
                            await autogenerator.save()
                        }
                    }
                }
            } else
            if (interaction.values[0] === "addItem") {
                if (autogenerator.items.length >= 20) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Maximum number of items in pool reached", guildId: interaction.guildId, locale: interaction.locale })}: 20**`, flags: ["Ephemeral"] })
                const components = JSON.parse(JSON.stringify(interaction.message.components))
                interaction.message.components.forEach(row => row.components.forEach(component => {
                    component.data.disabled = true
                }))
                await interaction.update({ components: interaction.message.components })
                await interaction.followUp({
                    embeds: [],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`promocode-autogenerators_add_xp`)
                                    .setLabel(client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setEmoji(client.config.emojis.XP)
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`promocode-autogenerators_add_currency`)
                                    .setLabel(settings.currencyName)
                                    .setEmoji(settings.displayCurrencyEmoji)
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`promocode-autogenerators_add_reputation`)
                                    .setLabel(client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setEmoji(client.config.emojis.RP)
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`promocode-autogenerators_add_item`)
                                    .setLabel(client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setEmoji(client.config.emojis.box)
                                    .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                    .setCustomId(`promocode-autogenerators_add_role`)
                                    .setLabel(client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setEmoji(client.config.emojis.roles)
                                    .setStyle(ButtonStyle.Secondary),
                            )
                    ],
                    flags: ["Ephemeral"]
                })
                const filter = (i) => i.customId.includes(`promocode-autogenerators_add`) && i.user.id === interaction.user.id
                let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 120000 }).catch(e => null)
                if (interaction2) {
                    const rewardType = interaction2.customId.includes("item") ? RewardType.Item : interaction2.customId.includes("xp") ? RewardType.Experience : interaction2.customId.includes("currency") ? RewardType.Currency : interaction2.customId.includes("reputation") ? RewardType.Reputation : RewardType.Role
                    if (interaction2.customId.includes("item")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`promocode-autogenerators_addItem_${interaction2.id}`)
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
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Chance", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId(`chance`)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            ])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `promocode-autogenerators_addItem_${interaction2.id}` && i.user.id === interaction2.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                        if (interaction2 && interaction2.isModalSubmit()) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            const item = client.cache.items.find(e => e.guildID === interaction2.guildId && e.name.toLowerCase() === modalArgs.itemName.toLowerCase())
                            if (!item) {
                                await interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "Item with name", guildId: interaction2.guildId, locale: interaction2.locale })} ${modalArgs.itemName} ${client.language({ textId: "not created or is invisible", guildId: interaction2.guildId, locale: interaction2.locale })}**`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO}**${modalArgs.amount}${client.language({ textId: "is not a number", guildId: interaction2.guildId, locale: interaction2.locale })}**`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            modalArgs.amount = +modalArgs.amount
                            const max = 1000000000
                            const min = 0.01
                            if (modalArgs.amount > max || modalArgs.amount < min) {
                                await interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "Amount should not be", guildId: interaction.guildId, locale: interaction2.locale })} > ${max} ${client.language({ textId: "or", guildId: interaction2.guildId, locale: interaction2.locale })} < ${min}**`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            if (isNaN(+modalArgs.chance)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            modalArgs.chance = +modalArgs.chance
                            if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
                                await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            if (autogenerator.items.reduce((previousValue, element) => previousValue += element.chance, 0) + modalArgs.chance > 100) {
                                await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Sum of all item chances in pool should not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            const reward = autogenerator.items.find(e => { return e.id === item.itemID })
                            if (reward) {
                                reward.amount = modalArgs.amount
                                reward.chance = modalArgs.chance
                            } else {
                                autogenerator.items.push({
                                    type: rewardType,
                                    id: item.itemID,
                                    amount: modalArgs.amount,
                                    chance: modalArgs.chance
                                })
                            }
                            await autogenerator.save()
                            await interaction2.update({ content: `${client.config.emojis.YES}${client.language({ textId: "Item", guildId: interaction2.guildId, locale: interaction2.locale })} ${item.displayEmoji}${item.name} (${modalArgs.amount}) ${client.language({ textId: "added to promocode autogenerator", guildId: interaction2.guildId, locale: interaction2.locale })}`, components: [], flags: ["Ephemeral"] })
                        }
                    } else if (interaction2.customId.includes("role")) {
                        await interaction2.update({ embeds: [], components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new RoleSelectMenuBuilder()
                                        .setCustomId(`promocode-autogenerators_addRole`)
                                )
                        ] })
                        const filter = (i) => i.customId.includes(`promocode-autogenerators_addRole`) && i.user.id === interaction2.user.id
                        interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 120000 }).catch(e => null)
                        if (interaction2) {
                            const role = interaction2.roles.first()
                            if (!interaction.guild.members.me.permissions.has("ManageRoles") || role.position > interaction.guild.members.me.roles.highest.position) {
                                await interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "I don't have permissions to add role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${role.id}>`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            const modal = new ModalBuilder()
                                .setCustomId(`promocode-autogenerators_addRole_${interaction2.id}`)
                                .setTitle(`${client.language({ textId: "Role", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                .setLabelComponents([
                                    new LabelBuilder()
                                        .setLabel(`${client.language({ textId: "Quantity", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                        .setTextInputComponent(
                                            new TextInputBuilder()
                                                .setCustomId(`amount`)
                                                .setRequired(true)
                                                .setStyle(TextInputStyle.Short)
                                        ),
                                    new LabelBuilder()
                                        .setLabel(`${client.language({ textId: "Chance", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                        .setTextInputComponent(
                                            new TextInputBuilder()
                                                .setCustomId(`chance`)
                                                .setRequired(true)
                                                .setStyle(TextInputStyle.Short)
                                        ),
                                    new LabelBuilder()
                                        .setLabel(`${client.language({ textId: "Temporary (minutes)", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setTextInputComponent(
                                            new TextInputBuilder()
                                                .setCustomId("minutes")
                                                .setRequired(false)
                                                .setStyle(TextInputStyle.Short)
                                        )
                                ])
                            await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                            const filter = (i) => i.customId === `promocode-autogenerators_addRole_${interaction2.id}` && i.user.id === interaction2.user.id
                            interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                            if (interaction2 && interaction2.isModalSubmit()) {
                                const modalArgs = {}
                                interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                                if (isNaN(+modalArgs.amount)) {
                                    await interaction2.update({ content: `${client.config.emojis.NO}**${modalArgs.amount}${client.language({ textId: "is not a number", guildId: interaction2.guildId, locale: interaction2.locale })}**`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                modalArgs.amount = +modalArgs.amount
                                const max = 1000000000
                                const min = 1
                                if (modalArgs.amount > max || modalArgs.amount < min) {
                                    await interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "Amount should not be", guildId: interaction.guildId, locale: interaction2.locale })} > ${max} ${client.language({ textId: "or", guildId: interaction2.guildId, locale: interaction2.locale })} < ${min}**`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                if (isNaN(+modalArgs.chance)) {
                                    await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                modalArgs.chance = +modalArgs.chance
                                if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
                                    await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                if (autogenerator.items.reduce((previousValue, element) => previousValue += element.chance, 0) + modalArgs.chance > 100) {
                                    await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Sum of all item chances in pool should not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                let ms
                                if (modalArgs.minutes) {
                                    if (isNaN(+modalArgs.minutes) || !Number.isInteger(+modalArgs.minutes)) {
                                        await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.minutes}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                        return interaction.editReply({ components: components })
                                    }
                                    modalArgs.minutes = +modalArgs.minutes
                                    if (modalArgs.minutes <= 0) {
                                        await interaction2.update({ content: `${client.config.emojis.NO} **${client.language({ textId: "Number cannot be", guildId: interaction.guildId, locale: interaction.locale })} <= 0**`, components: [], flags: ["Ephemeral"] })
                                        return interaction.editReply({ components: components })
                                    }
                                    ms = modalArgs.minutes * 60 * 1000    
                                }
                                const reward = autogenerator.items.find(e => { return e.id === role.id })
                                if (reward) {
                                    reward.amount = modalArgs.amount
                                    reward.chance = modalArgs.chance
                                }
                                else {
                                    autogenerator.items.push({
                                        type: RewardType.Role,
                                        id: role.id,
                                        amount: modalArgs.amount,
                                        chance: modalArgs.chance,
                                        ms: ms
                                    })
                                }
                                await autogenerator.save()
                                await interaction2.update({ content: `${client.config.emojis.YES}${client.language({ textId: "Role", guildId: interaction2.guildId, locale: interaction2.locale })} <@&${role.id}> (${modalArgs.amount}) ${client.language({ textId: "added to promocode autogenerator", guildId: interaction2.guildId, locale: interaction2.locale })}`, components: [], flags: ["Ephemeral"] })
                            }
                        }
                    } else {
                        const modal = new ModalBuilder()
                            .setCustomId(`promocode-autogenerators_add_${interaction2.id}`)
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
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Chance", guildId: interaction2.guildId, locale: interaction2.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                                .setCustomId(`chance`)
                                                .setRequired(true)
                                                .setStyle(TextInputStyle.Short)
                                    )
                            ])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `promocode-autogenerators_add_${interaction2.id}` && i.user.id === interaction2.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                        if (interaction2 && interaction2.isModalSubmit()) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO}**${modalArgs.amount}${client.language({ textId: "is not a number", guildId: interaction2.guildId, locale: interaction2.locale })}**`, flags: ["Ephemeral"], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            modalArgs.amount = +modalArgs.amount
                            const max = rewardType === RewardType.Reputation ? 1000 : 1000000000
                            const min = 0.01
                            if (modalArgs.amount > max || modalArgs.amount < min) {
                                await interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "Amount should not be", guildId: interaction2.guildId, locale: interaction2.locale })} > ${max} ${client.language({ textId: "or", guildId: interaction2.guildId, locale: interaction2.locale })} < ${min}**`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            if (isNaN(+modalArgs.chance)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            modalArgs.chance = +modalArgs.chance
                            if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
                                await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            if (autogenerator.items.reduce((previousValue, element) => previousValue += element.chance, 0) + modalArgs.chance > 100) {
                                await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Sum of all item chances in pool should not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            const reward = autogenerator.items.find(e => { return e.type === rewardType })
                            if (reward) {
                                reward.amount = modalArgs.amount
                                reward.chance = modalArgs.chance
                            } else {
                                autogenerator.items.push({
                                    type: rewardType,
                                    amount: modalArgs.amount,
                                    chance: modalArgs.chance
                                })
                            }
                            await autogenerator.save()
                            if (rewardType === RewardType.Experience) {
                                await interaction2.update({ content: `${client.config.emojis.YES}${client.language({ textId: "XP", guildId: interaction2.guildId, locale: interaction2.locale })} (${modalArgs.amount}) ${client.language({ textId: "added to promocode autogenerator", guildId: interaction2.guildId, locale: interaction2.locale })}`, components: [], flags: ["Ephemeral"] })    
                            }
                            if (rewardType === RewardType.Reputation) {
                                await interaction2.update({ content: `${client.config.emojis.YES}${client.language({ textId: "Reputation", guildId: interaction2.guildId, locale: interaction2.locale })} (${modalArgs.amount}) ${client.language({ textId: "added to promocode autogenerator", guildId: interaction2.guildId, locale: interaction2.locale })}`, components: [], flags: ["Ephemeral"] }) 
                            }
                            if (rewardType === RewardType.Currency) {
                                await interaction2.update({ content: `${client.config.emojis.YES}${settings.displayCurrencyEmoji}${settings.currencyName} (${modalArgs.amount}) ${client.language({ textId: "added to promocode autogenerator", guildId: interaction2.guildId, locale: interaction2.locale })}`, components: [], flags: ["Ephemeral"] }) 
                            }
                        }
                    }
                    if (interaction2 !== null && !interaction2.deferred && !interaction2.replied) await interaction2.deferUpdate()
                }
            } else
            if (interaction.values[0] === "delItem") {
                if (!autogenerator.items.length) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No items in pool", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                interaction.update({ embeds: [], components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setOptions(autogenerator.items.map((e, i) => {
                                    return {
                                        emoji: e.type === RewardType.Currency ? settings.displayCurrencyEmoji : e.type === RewardType.Experience ? client.config.emojis.XP : e.type === RewardType.Item ? client.cache.items.get(e.id).emoji : e.type === RewardType.Reputation ? client.config.emojis.RP : client.config.emojis.roles,
                                        label: e.type === RewardType.Currency ? settings.currencyName : e.type === RewardType.Experience ? client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale }) : e.type === RewardType.Item ? client.cache.items.get(e.id).name : e.type === RewardType.Reputation ? client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale }) : interaction.guild.roles.cache.get(e.id)?.name || `${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ${e.id}`,
                                        value: String(i)
                                    }
                                }))
                                .setCustomId(`promocode-autogenerators_delItem`)
                        )
                ] })
                const filter = (i) => i.customId.includes(`promocode-autogenerators_delItem`) && i.user.id === interaction.user.id
                const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 120000 }).catch(e => null)
                if (interaction2) {
                    autogenerator.items.splice(Number(interaction2.values[0]), 1)
                    await autogenerator.save()
                    await interaction2.update({ content: client.config.emojis.YES, components: [], flags: ["Ephemeral"] }) 
                }
            } else
            if (interaction.values[0] === "amountUses") {
                const modal = new ModalBuilder()
                    .setCustomId(`promocode-autogenerators_amountUses_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Number of uses", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("amountUses")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${autogenerator.amountUses}`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `promocode-autogenerators_amountUses_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (isNaN(+modalArgs.amountUses)) {
                        await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.config.emojis.NO}**${modalArgs.amountUses}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                    } else {
                        modalArgs.amountUses = +modalArgs.amountUses
                        if (modalArgs.amountUses <= 0) {
                            await interaction.deferUpdate()
                            await interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0`, components: [], flags: ["Ephemeral"] })
                        } else {
                            autogenerator.amountUses = modalArgs.amountUses
                            await autogenerator.save()
                        }
                    }  
                }
            }
        }
        if (interaction.isButton()) {
            if (interaction.customId.includes("generate")) {
                if (!autogenerator.items.length) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Autogenerator item pool not configured. Click 'Add item' from menu.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                let promocode
                let i = 0
                while (!promocode) {
                    promocode = await autogenerator.generate()
                    if (i++ > 1000) throw new Error(`Бесконечный цикл promocode-autogenerators.js:886 (${autogenerator.id})`)
                }
                await promocode.send()
            }
        }
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${client.language({ textId: "Promocode autogenerators manager", guildId: interaction.guildId, locale: interaction.locale })}` })
            .setTitle(autogenerator.name)
            .setDescription([
                `${autogenerator.isEnabled ? `🟢${client.language({ textId: "Autogenerator enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `🔴${client.language({ textId: "Autogenerator disabled", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                `${client.config.emojis.numbersign}${client.language({ textId: "Channel where promocode appears", guildId: interaction.guildId, locale: interaction.locale })}: ${autogenerator.channelId ? `<#${autogenerator.channelId}>` : `\`<${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}>\``}`,
                `${client.config.emojis.use}${client.language({ textId: `Cron pattern (time) for promocode generation`, guildId: interaction.guildId, locale: interaction.locale })} ([${client.language({ textId: "What is this?", guildId: interaction.guildId, locale: interaction.locale })}](https://docs.wetbot.space/guide/cron-patterns)): \`${autogenerator.cronPattern || `<${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}>`}\``,
                `${client.config.emojis.generate}${client.language({ textId: "Generations left", guildId: interaction.guildId, locale: interaction.locale })}: ${autogenerator.runsLeft}`,
                `${client.config.emojis.refresh}${client.language({ textId: "Item generation cycles per promocode", guildId: interaction.guildId, locale: interaction.locale })}: ${autogenerator.cycles}`,
                `${client.config.emojis.doublecheck}${client.language({ textId: "Promocode uses count", guildId: interaction.guildId, locale: interaction.locale })}: ${autogenerator.amountUses}`,
                `${client.config.emojis.watch}${client.language({ textId: "After creation promocode exists for", guildId: interaction.guildId, locale: interaction.locale })} ${autogenerator.lifeTime} ${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}`,
                `${client.config.emojis.crown}${client.language({ textId: "Permission for promocode", guildId: interaction.guildId, locale: interaction.locale })}: ${autogenerator.permission ? client.cache.permissions.get(autogenerator.permission)?.name || `${client.language({ textId: "Missing", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Missing", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                `${client.config.emojis.generate}${client.language({ textId: "Next generations", guildId: interaction.guildId, locale: interaction.locale })}${autogenerator.runsLeft > 10 ? ` (${10})` : autogenerator.runsLeft <= 0 ? "" : ` (${autogenerator.runsLeft})`}: ${!autogenerator.enabled ? `${client.language({ textId: "Start generator to display", guildId: interaction.guildId, locale: interaction.locale })}` : `${autogenerator.cronJob.nextRuns(autogenerator.runsLeft > 10 ? 10 : autogenerator.runsLeft).map(date => `<t:${Math.floor(date.getTime()/1000)}:R>`).join(", ")}` }`
            ].join("\n"))
            .setFields([{
                name: `${client.language({ textId: "Item pool for generation", guildId: interaction.guildId, locale: interaction.locale })}`,
                value: autogenerator.items.length ? await Promise.all(autogenerator.items.map(async e => {
                    if (e.type === RewardType.Currency) {
                        return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.amount}) (${client.config.emojis.random}${e.chance}%)`
                    } else if (e.type === RewardType.Experience) {
                        return `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId })} (${e.amount}) (${client.config.emojis.random}${e.chance}%)`
                    } else if (e.type === RewardType.Reputation) {
                        return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId })} (${e.amount}) (${client.config.emojis.random}${e.chance}%)`
                    } else if (e.type === RewardType.Item) {
                        const item = client.cache.items.find(i => i.itemID === e.id && !i.temp && i.enabled)
                        if (item) return `${item.displayEmoji}${item.name} (${e.amount}) (${client.config.emojis.random}${e.chance}%)`
                        else return `${e.id} (${e.amount}) (${client.config.emojis.random}${e.chance}%)`
                    } else if (e.type === RewardType.Role) {
                        return `<@&${e.id}>${e.ms ? ` [${client.functions.transformSecs(client, e.ms, interaction.guildId, interaction.locale)}]` : ``} (${e.amount}) (${client.config.emojis.random}${e.chance}%)`
                    }
                })).then(array => array.join("\n") + `\n${client.language({ textId: "Chance that promocode won't generate", guildId: interaction.guildId, locale: interaction.locale })}: ${100 - autogenerator.items.reduce((previousValue, element) => previousValue += element.chance, 0)}%`) : `<${client.language({ textId: "Add items", guildId: interaction.guildId, locale: interaction.locale })}>`
            }])
            .setFooter({ text: `ID: ${autogenerator.id}` })
            .setColor(3093046)
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`cmd{promocode-autogenerators}id{${autogenerator.id}}`)
            .setPlaceholder(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setOptions([
                {
                    emoji: client.config.emojis.turn,
                    label: `${autogenerator.enabled ? client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `on/off`
                },
                {
                    emoji: client.config.emojis.numbersign,
                    label: `${client.language({ textId: "Channel where promocode appears", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `channelId`,
                    description: `${autogenerator.channelId ? interaction.guild.channels.cache.get(autogenerator.channelId)?.name : `<${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}>`}`
                },
                {
                    emoji: client.config.emojis.use,
                    label: `${client.language({ textId: `Cron pattern`, guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `cronPattern`,
                    description: `${autogenerator.cronPattern || `<${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}>`}`
                },
                {
                    emoji: client.config.emojis.generate,
                    label: `${client.language({ textId: "Generations left", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `runsLeft`,
                    description: `${autogenerator.runsLeft}`
                },
                {
                    emoji: client.config.emojis.refresh,
                    label: `${client.language({ textId: "Item generation cycles per promocode", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `cycles`,
                    description: `${autogenerator.cycles}`
                },
                {
                    emoji: client.config.emojis.doublecheck,
                    label: `${client.language({ textId: "Promocode uses count", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `amountUses`,
                    description: `${autogenerator.amountUses}`
                },
                {
                    emoji: client.config.emojis.watch,
                    label: `${client.language({ textId: "After creation promocode exists for", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `lifeTime`,
                    description: `${autogenerator.lifeTime} ${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}`
                },
                {
                    emoji: client.config.emojis.crown,
                    label: `${client.language({ textId: "Permission for promocode", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `permission`,
                    description: `${autogenerator.permission ? client.cache.permissions.get(autogenerator.permission)?.name || `Missing` : `Missing`}`
                },
                {
                    emoji: client.config.emojis.plus,
                    label: `${client.language({ textId: "Add item", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `addItem`
                },
                {
                    emoji:  client.config.emojis.minus,
                    label: `${client.language({ textId: "Delete item", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `delItem`
                }
            ])
        const row = new ActionRowBuilder().setComponents([menu])
        const generate = new ButtonBuilder()
            .setCustomId(`cmd{promocode-autogenerators}id{${autogenerator.id}}generate`)
            .setLabel(`${client.language({ textId: "Generate", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(client.config.emojis.generate)
        const row2 = new ActionRowBuilder().setComponents([generate])
        if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [row, row2] })
        else return interaction.update({ embeds: [embed], components: [row, row2] })
    }
}