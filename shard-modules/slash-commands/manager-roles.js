const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, TextInputStyle, TextInputBuilder, ModalBuilder, InteractionType, StringSelectMenuBuilder, MessageFlags, Collection, ApplicationCommandOptionType, LabelBuilder } = require("discord.js")
const roleRegexp = /role{(.*?)}/
const limRegexp = /lim{(.*?)}/
const IncomeRole = require("../classes/IncomeRole")
module.exports = {
    name: 'manager-roles',
    nameLocalizations: {
        'ru': `управление-ролями`,
        'uk': `управління-ролями`,
        'es-ES': `gestor-de-roles`
    },
    description: 'Manage income roles',
    descriptionLocalizations: {
        'ru': `Управление доходными ролям`,
        'uk': `Управління дохідними ролями`,
        'es-ES': `Gestión de roles con ingresos`
    },
    options: [
        {
			name: 'view',
            nameLocalizations: {
                'ru': `просмотр`,
                'uk': `перегляд`,
                'es-ES': `ver`
            },
            description: 'View all income roles',
            descriptionLocalizations: {
                'ru': `Просмотр всех доходных ролей`,
                'uk': `Перегляд усіх дохідних ролей`,
                'es-ES': `Ver todos los roles con ingresos`
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
            description: 'Create an income role',
            descriptionLocalizations: {
                'ru': `Создать доходную роль`,
                'uk': `Створити дохідну роль`,
                'es-ES': `Crear rol con ingresos`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'role',
                    nameLocalizations: {
                        'ru': `роль`,
                        'uk': `роль`,
                        'es-ES': `rol`
                    },
                    description: 'Role',
                    descriptionLocalizations: {
                        'ru': `Роль`,
                        'uk': `Роль`,
                        'es-ES': `Rol`
                    },
                    type: ApplicationCommandOptionType.Role,
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
            description: 'Edit an income role',
            descriptionLocalizations: {
                'ru': `Изменить доходную роль`,
                'uk': `Змінити дохідну роль`,
                'es-ES': `Editar rol con ingresos`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'role',
                    nameLocalizations: {
                        'ru': `роль`,
                        'uk': `роль`,
                        'es-ES': `rol`
                    },
                    description: 'Role',
                    descriptionLocalizations: {
                        'ru': `Роль`,
                        'uk': `Роль`,
                        'es-ES': `Rol`
                    },
                    type: ApplicationCommandOptionType.Role,
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
            description: 'Delete an income role',
            descriptionLocalizations: {
                'ru': `Удалить доходную роль`,
                'uk': `Видалити дохідну роль`,
                'es-ES': `Eliminar rol con ingresos`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'role',
                    nameLocalizations: {
                        'ru': `роль `,
                        'uk': `роль`,
                        'es-ES': `rol`
                    },
                    description: 'Role',
                    descriptionLocalizations: {
                        'ru': `Роль`,
                        'uk': `Роль`,
                        'es-ES': `Rol`
                    },
                    type: ApplicationCommandOptionType.Role,
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
            description: 'Enable all income roles',
            descriptionLocalizations: {
                'ru': `Включить все доходные роли`,
                'uk': `Увімкнути всі дохідні ролі`,
                'es-ES': `Activar todos los roles con ingresos`
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
            description: 'Disable all income roles',
            descriptionLocalizations: {
                'ru': `Выключить все доходные роли`,
                'uk': `Вимкнути всі дохідні ролі`,
                'es-ES': `Desactivar todos los roles con ingresos`
            },
            type: ApplicationCommandOptionType.Subcommand,
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `managers`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        let incomeRole
        if (interaction.isChatInputCommand() || interaction.customId?.includes("view")) {
            if (interaction.isChatInputCommand()) await interaction.deferReply({ flags: ["Ephemeral"] })
            if (args?.Subcommand === "create") {
                const settings = client.cache.settings.get(interaction.guildId)
                const roles = client.cache.roles.filter(e => e.guildID === interaction.guildId)
                if (roles.size >= settings.max_roles) return interaction.editReply({ content: `${client.language({ textId: "Maximum income roles reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_roles}`, flags: ["Ephemeral"] })
                if (client.cache.roles.get(args.role)) {
                    return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Income role", guildId: interaction.guildId, locale: interaction.locale })} <@&${args.role}> ${client.language({ textId: "already exists", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                incomeRole = new client.roleSchema({
                    id: args.role,
                    guildID: interaction.guildId,
                    enabled: false,
                    xp: 0,
                    cur: 0,
                    rp: 0,
                    items: [],
                    type: "static",
                    notification: true
                })
                await incomeRole.save()
                incomeRole = new IncomeRole(client, incomeRole)
                client.cache.roles.set(incomeRole.id, incomeRole)
            } else
            if (args?.Subcommand === "edit") {
                incomeRole = client.cache.roles.get(args.role)
                if (!incomeRole) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Income role", guildId: interaction.guildId, locale: interaction.locale })} <@&${args.role}> ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "delete") {
                incomeRole = client.cache.roles.get(args.role)
                if (!incomeRole) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Income role", guildId: interaction.guildId, locale: interaction.locale })} <@&${args.role}> ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}**` })
                await incomeRole.delete()
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Income role", guildId: interaction.guildId, locale: interaction.locale })} <@&${args.role}> ${client.language({ textId: "was removed", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "view" || interaction.customId?.includes("view")) {
                const settings = client.cache.settings.get(interaction.guildId)
                const roles = client.cache.roles.filter(e => e.guildID === interaction.guildId)
                let min = 0
                let max = 25
                if (interaction.customId?.includes("lim")) {
                    max = +limRegexp.exec(interaction.customId)[1]
                    min = max - 25
                }
                let index = 0
                const embed = new EmbedBuilder()
                    .setTitle(`${client.language({ textId: "Income roles manager", guildId: interaction.guildId, locale: interaction.locale })} (${roles.size}/${settings.max_roles})`)
                    .setColor(3093046)
                    .setDescription(roles.size ? roles.map((incomeRole) => { 
                        return `${index++}. ${incomeRole.isEnabled ? "🟢": "🔴"}<@&${incomeRole.id}>`
                    }).slice(min, max).join("\n") : `${client.language({ textId: "No income roles", guildId: interaction.guildId, locale: interaction.locale })}`)
                const embeds = [
                    embed,
                    new EmbedBuilder()
                        .setColor(3093046)
                        .setDescription(`${client.config.emojis.plus}${client.language({ textId: "Create income role", guildId: interaction.guildId, locale: interaction.locale })}: </manager-roles create:1150455842294988945>\n${client.config.emojis.edit}${client.language({ textId: "Change income role", guildId: interaction.guildId, locale: interaction.locale })}: </manager-roles edit:1150455842294988945>\n${client.config.emojis.trash}${client.language({ textId: "Delete income role", guildId: interaction.guildId, locale: interaction.locale })}: </manager-roles delete:1150455842294988945>`)
                ]
                const components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowLeft2}`)
                                .setCustomId(`cmd{manager-roles}lim{25}view1`)
                                .setDisabled((roles.size <= 25 && min === 0) || (roles.size > 25 && min < 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowLeft}`)
                                .setCustomId(`cmd{manager-roles}lim{${max - 25}}view2`)
                                .setDisabled((roles.size <= 25 && min === 0) || (roles.size > 25 && min < 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowRight}`)
                                .setCustomId(`cmd{manager-roles}lim{${max + 25}}view3`)
                                .setDisabled((roles.size <= 25 && min === 0) || (roles.size > 25 && min >= roles.size - 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowRight2}`)
                                .setCustomId(`cmd{manager-roles}lim{${roles.size + (roles.size % 25 === 0 ? 0 : 25 - (roles.size % 25))}}view4`)
                                .setDisabled((roles.size <= 25 && min === 0) || (roles.size > 25 && min >= roles.size - 25) ? true : false)
                        )
                ]
                if (interaction.isChatInputCommand()) return interaction.editReply({ embeds: embeds, components: components })
                else return interaction.update({ embeds: embeds, components: components })
            } else
            if (args?.Subcommand === "enable-all") {
                if (!client.cache.roles.some(e => e.guildID === interaction.guildId)) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No income roles on server", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                let count = 0
                await Promise.all(client.cache.roles.filter(e => e.guildID === interaction.guildId && !e.enabled && (e.xp || e.cur || e.rp || e.items.length)).map(async incomeRole => {
                    incomeRole.enable()
                    await incomeRole.save()
                    count++
                }))
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Income roles have been enabled", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "disable-all") {
                if (!client.cache.roles.some(e => e.guildID === interaction.guildId)) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No income roles on server", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                let count = 0
                await Promise.all(client.cache.roles.filter(e => e.guildID === interaction.guildId && e.enabled).map(async incomeRole => {
                    incomeRole.disable()
                    await incomeRole.save()
                    count++
                }))
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Income roles have been disabled", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            }
        }
        const settings = client.cache.settings.get(interaction.guildId)
        const embed = new EmbedBuilder()
            .setColor(3093046)
        if (!interaction.isChatInputCommand()) {
            incomeRole = client.cache.roles.get(roleRegexp.exec(interaction.customId)?.[1])
            if (!incomeRole) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Such income role does not exist", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            const guildRole = await interaction.guild.roles.fetch(incomeRole.id).catch(e => null)
            if (!guildRole) {
                await incomeRole.delete()
                return interaction.update({ content: `${client.language({ textId: "Such role does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.includes("type")) {
                    incomeRole.type = interaction.values[0]
                    incomeRole.xp = 1
                    incomeRole.cur = 1
                    incomeRole.rp = 1
                    incomeRole.items = []
                    if (incomeRole.type === "dynamic") {
                        incomeRole.cooldown = undefined
                        incomeRole.notification = undefined
                    }
                    else {
                        incomeRole.cooldown = 1
                        incomeRole.notification = true
                    }
                    await incomeRole.save()
                } else
                if (interaction.values[0] === "edit values") {
                    const modal = new ModalBuilder()
                        .setCustomId(`editRole_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "EDIT ROLE", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${incomeRole.type === "static" ? `${client.language({ textId: "Qty", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Percent", guildId: interaction.guildId, locale: interaction.locale })}`} ${client.language({ textId: "experience received per hour", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("xp")
                                        .setRequired(true)
                                        .setMaxLength(9)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${incomeRole.xp}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${incomeRole.type === "static" ? `${client.language({ textId: "Qty", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Percent", guildId: interaction.guildId, locale: interaction.locale })}`} ${client.language({ textId: "currency received per hour", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("cur")
                                        .setMaxLength(12)
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${incomeRole.cur}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${incomeRole.type === "static" ? `${client.language({ textId: "Qty", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Percent", guildId: interaction.guildId, locale: interaction.locale })}`} ${client.language({ textId: "reputation per hour", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("rp")
                                        .setMaxLength(9)
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${incomeRole.rp}`)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `editRole_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        incomeRole.xp = !isNaN(+modalArgs.xp) ? +modalArgs.xp : incomeRole.xp
                        incomeRole.cur = !isNaN(+modalArgs.cur) ? +modalArgs.cur : incomeRole.cur
                        incomeRole.rp = !isNaN(+modalArgs.rp) ? +modalArgs.rp : incomeRole.rp
                        await incomeRole.save()
                    } else return
                } else
                if (interaction.values[0] === "items") {
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-roles_addItem_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Add item", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("item")
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: `${incomeRole.type === "static" ? `${client.language({ textId: "Qty", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Percent", guildId: interaction.guildId, locale: interaction.locale })}`}`, guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setMaxLength(12)
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-roles_addItem_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        await interaction.deferUpdate()
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()))
                        if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
                            let result = ""
                            filteredItems.forEach(item => {
                                result += `> ${item.displayEmoji}**${item.name}**\n`	
                            })
                            await interaction.followUp({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), flags: ["Ephemeral"] })  
                        } else {
                            const searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
                            if (!searchedItem) await interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            else {
                                if (isNaN(+modalArgs.amount)) await interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                else {
                                    if (+modalArgs.amount === 0) {
                                        incomeRole.items = incomeRole.items.filter(e => e.itemID !== searchedItem.itemID)
                                        await interaction.followUp({ content: `${client.config.emojis.YES} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${searchedItem.displayEmoji}${searchedItem.name} ${client.language({ textId: "removed from income role", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                    } else {
                                        const element = incomeRole.items.find(e => { return e.itemID === searchedItem.itemID })
                                        if (element) {
                                            element.amount = +modalArgs.amount
                                        }
                                        else if (incomeRole.items.length < 10) {
                                            incomeRole.items.push({
                                                itemID: searchedItem.itemID,
                                                amount: +modalArgs.amount
                                            })    
                                        }
                                        await interaction.followUp({ content: `${client.config.emojis.YES} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${searchedItem.displayEmoji}${searchedItem.name} (${modalArgs.amount}) ${client.language({ textId: "added to income role", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })   
                                    }
                                    await incomeRole.save()
                                }
                            }  
                        }
                    }
                } else
                if (interaction.values[0] === "enable") {
                    if (!incomeRole.enabled && !incomeRole.xp && !incomeRole.cur && !incomeRole.rp && !incomeRole.items.length) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Income amount not configured", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    if (incomeRole.enabled) incomeRole.disable()
                    else incomeRole.enable()
                    await incomeRole.save()
                } else
                if (interaction.values[0] === "notification") {
                    if (incomeRole.type === "static") {
                        incomeRole.notification = !incomeRole.notification
                        await incomeRole.save()    
                    }
                } else
                if (interaction.values[0] === "cooldown") {
                    if (incomeRole.type === "static") {
                        const modal = new ModalBuilder()
                            .setCustomId(`editCooldown_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT ROLE", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Cooldown (hours)", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("cooldown")
                                            .setRequired(true)
                                            .setMaxLength(3)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${incomeRole.cooldown || 1}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editCooldown_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            modalArgs.cooldown = +modalArgs.cooldown
                            if (modalArgs.cooldown < 0.16) {
                                await interaction.deferUpdate()
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0.16`, flags: ["Ephemeral"] })
							}
                            if (isNaN(modalArgs.cooldown)) modalArgs.cooldown = 1
                            incomeRole.cooldown = +modalArgs.cooldown
                            await incomeRole.save()
                        } else return    
                    }
                } else
                if (interaction.values[0] === "permission") {
                    if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-roles_permissions_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("name")
                                        .setRequired(false)
                                        .setValue(`${client.cache.permissions.find(e => e.id === incomeRole.permission)?.name || ""}`)
                                        .setStyle(TextInputStyle.Short)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-roles_permissions_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (!modalArgs.name) {
                            incomeRole.permission = undefined
                            await incomeRole.save()
                        } else {
                            const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
                            if (!permission) {
                                await interaction.deferUpdate()
                                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
                            } else {
                                incomeRole.permission = permission.id
                                await incomeRole.save()
                            }
                        }
                    } else return
                }
            }
        }
        const guildRole = await interaction.guild.roles.fetch(incomeRole.id).catch(e => null)
        if (!guildRole) {
            await incomeRole.delete()
            if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `${client.language({ textId: "Such role does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
            else return interaction.update({ content: `${client.language({ textId: "Such role does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
        }
        embed.setAuthor({ name: `${client.language({ textId: "Income roles manager", guildId: interaction.guildId, locale: interaction.locale })}` })
        embed.setTitle((incomeRole.enabled ? client.config.emojis.on : client.config.emojis.off) + guildRole.name)
        embed.setColor(guildRole.color)
        const description = [
            `${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })}: <@&${guildRole.id}>`,
            incomeRole.type === "static" ? `${client.language({ textId: "Cooldown (hours)", guildId: interaction.guildId, locale: interaction.locale })}: ${incomeRole.cooldown}` : undefined,
            `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}: ${incomeRole.xp}${incomeRole.type === "static" ? `` : `%`}`,
            `${settings.displayCurrencyEmoji}${settings.currencyName}: ${incomeRole.cur}${incomeRole.type === "static" ? `` : `%`}`,
            `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}: ${incomeRole.rp}${incomeRole.type === "static" ? `` : `%`}`,
        ].filter(e => e)
        if (incomeRole.items.length) {
            description.push(`${client.config.emojis.box}${client.language({ textId: "**Items**", guildId: interaction.guildId, locale: interaction.locale })}:\n\`•\`${incomeRole.items.map(a => {
                const item = client.cache.items.find(e => e.itemID === a.itemID && !e.temp)
                if (item) {
                    return `${item.displayEmoji}**${item.name}** ${a.amount}${incomeRole.type === "static" ? `` : `%`}`
                }
                else return `**${a.itemID}** ${a.amount}${incomeRole.type === "static" ? `` : `%`}`
            }).join("\n\`•\`")}`)
        }
        embed.setDescription(description.join("\n"))
        const row1 = new ActionRowBuilder().addComponents([
            new StringSelectMenuBuilder()
                .setCustomId(`role{${incomeRole.id}}cmd{manager-roles}usr{${interaction.user.id}}actions`)
                .setOptions([
                    { label: `${client.language({ textId: "Change values", guildId: interaction.guildId, locale: interaction.locale })}`, value: `edit values`, emoji: client.config.emojis.edit },
                    { label: `${client.language({ textId: "Add/remove/change item", guildId: interaction.guildId, locale: interaction.locale })}`, value: `items`, emoji: client.config.emojis.box },
                    incomeRole.type === "static" ? { label: `${client.language({ textId: "Change cooldown", guildId: interaction.guildId, locale: interaction.locale })}`, value: `cooldown`, emoji: client.config.emojis.watch } : undefined,
                    { label: `${client.language({ textId: "Permission", guildId: interaction.guildId, locale: interaction.locale })}`, value: `permission`, description: client.cache.permissions.find(e => e.id === incomeRole.permission)?.name || undefined, emoji: client.config.emojis.crown },
                    incomeRole.type === "static" ? { label: `${client.language({ textId: "Notification", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: `${incomeRole.notification ? `Enabled` : `Disabled`}`, guildId: interaction.guildId, locale: interaction.locale })}`, value: `notification`, emoji: client.config.emojis.ring } : undefined,
                    { label: incomeRole.enabled ? `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`, value: `enable`, emoji: incomeRole.enabled ? client.config.emojis.off : client.config.emojis.on },
                ].filter(e => e))
                .setPlaceholder(`${client.language({ textId: "Actions", guildId: interaction.guildId, locale: interaction.locale })}...`)
        ])
        const row2 = new ActionRowBuilder().addComponents([
            new StringSelectMenuBuilder()
                .setCustomId(`role{${incomeRole.id}}cmd{manager-roles}usr{${interaction.user.id}}type`)
                .setOptions([
                    { emoji: `🟢`, label: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`, value: `static`, default: incomeRole.type === "static" },
                    { emoji: `🔵`, label: `${client.language({ textId: "Percent", guildId: interaction.guildId, locale: interaction.locale })}`, value: `dynamic`, default: incomeRole.type === "dynamic" },
                ])
                .setPlaceholder(`${client.language({ textId: "Role type", guildId: interaction.guildId, locale: interaction.locale })}`)
        ])
        if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [row1, row2] })
        else return interaction.update({ embeds: [embed], components: [row1, row2] })
    }
}