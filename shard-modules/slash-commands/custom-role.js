const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, Collection, ModalBuilder, TextInputStyle, TextInputBuilder, GuildPremiumTier, StringSelectMenuBuilder, LabelBuilder } = require("discord.js")
const { RewardType } = require("../enums")
const uniqid = require('uniqid')
const CustomRole = require("../classes/CustomRole")
const idRegexp = /id{(.*?)}/
const randomColor = require('randomcolor')
const emojiUnicode = require('emoji-unicode')
module.exports = {
    name: 'custom-role',
    nameLocalizations: {
        'ru': `кастомная-роль`,
        'uk': `кастомна-роль`, 
        'es-ES': `rol-personalizado`
    },
    description: 'Create a custom role',
    descriptionLocalizations: {
        'ru': `Создать кастомную роль`,
        'uk': `Створити кастомну роль`,
        'es-ES': `Crear un rol personalizado`
    },
    dmPermission: false,
    group: `general-group`,
    cooldowns: new Collection(),
    premium: true,
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        const settings = client.cache.settings.get(interaction.guildId)
        if (!settings.roles.customRolePosition || !interaction.guild.roles.cache.get(settings.roles.customRolePosition)) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Custom role creation is not configured on this server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        if (settings.channels.customRoleModerationChannel) {
            const channel = interaction.guild.channels.cache.get(settings.channels.customRoleModerationChannel)
            if (!channel) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Custom role creation is not configured on this server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}> ${client.language({ textId: "I need the following permissions:\n1. Send Messages", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
        }
        if (settings.customRoleCreationLimit && client.cache.customRoles.filter(e => e.guildID === interaction.guildId && e.userID === interaction.user.id && (e.status === "created" || e.status === "moderation")).size >= settings.customRoleCreationLimit) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Custom role creation limit reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.customRoleCreationLimit}`, flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const permission = client.cache.permissions.get(settings.customRolePermission)
        if (permission) {
            const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
            if (isPassing.value === false) {
                return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
            }
        }
        let customRole = client.cache.customRoles.get(idRegexp.exec(interaction.customId)?.[1])
        if (!customRole) {
            customRole = new client.customRoleSchema({
                guildID: interaction.guildId,
                userID: interaction.user.id,
                id: uniqid.time(),
                deleteDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                status: "editing",
                minutes: settings.customRoleTemporaryEnabled ? undefined : Infinity
            })
            await customRole.save()
            customRole = new CustomRole(client, customRole)
            customRole.setTimeoutDelete()
            client.cache.customRoles.set(customRole.id, customRole) 
        }
        if (interaction.isButton()) {
            if (customRole.status !== "editing") {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Custom role is not in 'Editing' status", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (interaction.customId.includes("name")) {
                const modal = new ModalBuilder()
                    .setCustomId(`customRole_name_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Create custom role", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Role name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(true)
                                    .setMaxLength(100)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(customRole.name || " ")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `customRole_name_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    customRole.name = modalArgs.name
                    await customRole.save()
                } else return
            }
            if (interaction.customId.includes("color")) {
                const components = JSON.parse(JSON.stringify(interaction.message.components))
    			interaction.message.components.forEach(row => row.components.forEach(component => {
                    component.data.disabled = true
                }))
    			await interaction.update({ components: interaction.message.components })
                const colors = []
                const perChunk = 25
                const options = client.config.colors.map(color => {
                    return {
                        label: client.language({ textId: color.colorName, guildId: interaction.guildId, locale: interaction.locale }),
                        emoji: client.application.emojis.cache.find(e => e.name === color.emojiName)?.id,
                        value: color.hex,
                        description: color.hex
                    }
                })
                const result = options.reduce((resultArray, item, index) => {
                    const chunkIndex = Math.floor(index/perChunk)
                    if (!resultArray[chunkIndex]) {
                        resultArray[chunkIndex] = []
                    }
                    resultArray[chunkIndex].push(item)
                    return resultArray
                }, [])
                result.forEach((chunk, index) => {
                    colors.push(
                        new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`custom-role_color_select_${index}`)
                                    .setOptions(chunk)
                                    .setPlaceholder(`${client.language({ textId: "Colors", guildId: interaction.guildId, locale: interaction.locale })} (${chunk.length})`)
                            )
                    )
                })
                await interaction.followUp({ 
                    content: `${client.language({ textId: "Select role color", guildId: interaction.guildId, locale: interaction.locale })}`,
                    components: [
                        ...colors,
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId("custom-role_color_manually")
                                    .setLabel(client.language({ textId: "Enter manually", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Primary),
                                    new ButtonBuilder()
                                    .setCustomId("custom-role_color_randombtn")
                                    .setLabel(client.language({ textId: "Random color", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId("custom-role_color_cancel")
                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger),
                            ),
                    ],
                    flags: ["Ephemeral"],
                    withResponse: true
                })
                const filter = (i) => i.customId.includes(`custom-role_color`) && i.user.id === interaction.user.id
                let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 60000 * 5 }).catch(e => null)
                if (interaction2 && interaction2.customId.includes("custom-role_color")) {
                    if (interaction2.customId.includes("select")) {
                        customRole.color = interaction2.values[0]
                        await customRole.save()
                        await interaction2.update({ content: " ", components: [], embeds: [new EmbedBuilder().setColor(interaction2.values[0]).setDescription(`${client.config.emojis.YES} ${client.language({ textId: "Color selected", guildId: interaction.guildId, locale: interaction.locale })}: ${interaction2.values[0]}`)] })
                    }
                    if (interaction2.customId.includes("randombtn")) {
                        await interaction2.update({ 
                            content: `${client.language({ textId: "Select role color", guildId: interaction.guildId, locale: interaction.locale })}`,
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new StringSelectMenuBuilder()
                                            .setCustomId(`custom-role_color_random_select`)
                                            .setOptions([
                                                {
                                                    label: client.language({ textId: "Any shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `any`,
                                                },
                                                {
                                                    label: client.language({ textId: "Red shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `red`,
                                                },
                                                {
                                                    label: client.language({ textId: "Orange shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `orange`,
                                                },
                                                {
                                                    label: client.language({ textId: "Yellow shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `yellow`,
                                                },
                                                {
                                                    label: client.language({ textId: "Green shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `green`,
                                                },
                                                {
                                                    label: client.language({ textId: "Blue shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `blue`,
                                                },
                                                {
                                                    label: client.language({ textId: "Purple shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `purple`,
                                                },
                                                {
                                                    label: client.language({ textId: "Pink shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `pink`,
                                                },
                                                {
                                                    label: client.language({ textId: "Monochrome shade", guildId: interaction.guildId, locale: interaction.locale }),
                                                    value: `monochrome`,
                                                }
                                            ])
                                            .setPlaceholder(`${client.language({ textId: "Random colors", guildId: interaction.guildId, locale: interaction.locale })}`)
                                ),
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId("custom-role_color_random_cancel")
                                            .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                            .setStyle(ButtonStyle.Danger),
                                    ),
                            ]
                        })
                        const filter = (i) => i.customId.includes(`custom-role_color`) && i.user.id === interaction.user.id
                        interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 60000 * 5 }).catch(e => null)
                        if (interaction2 && interaction2.customId.includes("custom-role_color_random")) {
                            if (interaction2.customId.includes("select")) {
                                const random_color = randomColor({
                                    hue: interaction2.values[0] !== "any" ? interaction2.values[0] : undefined
                                })
                                customRole.color = random_color
                                await customRole.save()
                                await interaction2.update({ content: " ", components: [], embeds: [new EmbedBuilder().setColor(random_color).setDescription(`${client.config.emojis.YES} ${client.language({ textId: "Color selected", guildId: interaction.guildId, locale: interaction.locale })}: ${random_color}`)] })    
                            }
                            if (interaction2.customId.includes("cancel")) {
                                await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                        } else {
                            return interaction.editReply({ components: components })
                        }
                    }
                    if (interaction2.customId.includes("manually")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`customRole_color_${interaction2.id}`)
                            .setTitle(`${client.language({ textId: "Create custom role", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Color (HEX)", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("color")
                                            .setRequired(true)
                                            .setMaxLength(100)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${customRole.color || " "}`)
                                    ),
                            ])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `customRole_color_${interaction2.id}` && i.user.id === interaction.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                        if (interaction2 && interaction2.isModalSubmit()) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (modalArgs.color && /^#[0-9A-F]{6}$/i.test(modalArgs.color) === false) {
                                await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.color}** ${client.language({ textId: "is not a HEX color. Example HEX color", guildId: interaction.guildId, locale: interaction.locale })}: **#FF5733**. ${client.language({ textId: "Please select a HEX color from this site", guildId: interaction.guildId, locale: interaction.locale })}: https://htmlcolorcodes.com/color-picker/`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                            customRole.color = modalArgs.color
                            await customRole.save()
                            await interaction2.update({ content: " ", components: [], embeds: [new EmbedBuilder().setColor(modalArgs.color).setDescription(`${client.config.emojis.YES} ${client.language({ textId: "Color selected", guildId: interaction.guildId, locale: interaction.locale })}: ${modalArgs.color}`)] })
                        } else {
                            return interaction.editReply({ components: components })
                        }
                    }
                    if (interaction2.customId.includes("cancel")) {
                        await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                        return interaction.editReply({ components: components })
                    }
                } else {
                    return interaction.editReply({ components: components })
                }
            }
            if (interaction.customId.includes("minutes")) {
                const components = JSON.parse(JSON.stringify(interaction.message.components))
    			interaction.message.components.forEach(row => row.components.forEach(component => {
                    component.data.disabled = true
                }))
    			await interaction.update({ components: interaction.message.components })
                await interaction.followUp({ 
                    content: `${client.language({ textId: "Select time for role creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`custom-role_time_select`)
                                    .setOptions([
                                        {
                                            label: `${client.language({ textId: `1 hour`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${1 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `2 hours`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${2 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `3 hours`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${3 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `4 hours`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${4 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `5 hours`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${5 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `1 day`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${1 * 24 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `7 days`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${7 * 24 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `14 days`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${14 * 24 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `1 month`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${1 * 30 * 24 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `3 months`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${3 * 30 * 24 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `6 months`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${6 * 30 * 24 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `9 months`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${9 * 30 * 24 * 60}`
                                        },
                                        {
                                            label: `${client.language({ textId: `1 year`, guildId: interaction.guildId, locale: interaction.locale })}`,
                                            value: `${365 * 24 * 60}`
                                        },
                                    ])
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId("custom-role_time_infinity")
                                    .setLabel(client.language({ textId: "Forever", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId("custom-role_time_manually")
                                    .setLabel(client.language({ textId: "Enter manually", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId("custom-role_time_cancel")
                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger),
                            ),
                    ],
                    flags: ["Ephemeral"]
                })
                const filter = (i) => i.customId.includes(`custom-role_time`) && i.user.id === interaction.user.id
                let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
                if (interaction2 && interaction2.customId.includes("custom-role_time")) {
                    if (interaction2.customId.includes("infinity")) {
                        customRole.minutes = Infinity
                        await customRole.save()
                        await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Time selected: forever", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                    }
                    if (interaction2.customId.includes("select")) {
                        if (settings.customRoleMinimumMinutes && +interaction2.values[0] < settings.customRoleMinimumMinutes) {
                            await interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Minimum time for temporary role", guildId: interaction.guildId, locale: interaction.locale })}: ${client.functions.transformSecs(client, settings.customRoleMinimumMinutes * 60 * 1000, interaction.guildId, interaction.locale)}`, components: [] })
                            return interaction.editReply({ components: components })
                        }
                        customRole.minutes = +interaction2.values[0]
                        await customRole.save()
                        await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Time selected", guildId: interaction.guildId, locale: interaction.locale })}: ${client.functions.transformSecs(client, customRole.minutes * 60 * 1000, interaction.guildId, interaction.locale)}`, components: [] })
                    }
                    if (interaction2.customId.includes("manually")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`customRole_minutes_${interaction2.id}`)
                            .setTitle(`${client.language({ textId: "Create custom role", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "For how long? (minutes)", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("minutes")
                                            .setRequired(true)
                                            .setMaxLength(100)
                                            .setStyle(TextInputStyle.Short)
                                    ),
                            ])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `customRole_minutes_${interaction2.id}` && i.user.id === interaction.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                        if (interaction2 && interaction2.isModalSubmit()) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.minutes) || !Number.isInteger(+modalArgs.minutes)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.minutes}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                            modalArgs.minutes = +modalArgs.minutes
                            if (modalArgs.minutes <= 0) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${client.language({ textId: "Number cannot be", guildId: interaction.guildId, locale: interaction.locale })} <= 0**`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                            if (settings.customRoleMinimumMinutes && modalArgs.minutes < settings.customRoleMinimumMinutes) {
                                await interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Minimum time for temporary role", guildId: interaction.guildId, locale: interaction.locale })}: ${client.functions.transformSecs(client, settings.customRoleMinimumMinutes * 60 * 1000, interaction.guildId, interaction.locale)}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                            customRole.minutes = modalArgs.minutes
                            await customRole.save()
                            await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Time selected", guildId: interaction.guildId, locale: interaction.locale })}: ${client.functions.transformSecs(client, customRole.minutes * 60 * 1000, interaction.guildId, interaction.locale)}`, components: [] })
                        } else return
                    }
                    if (interaction2.customId.includes("cancel")) {
                        await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                        return interaction.editReply({ components: components })
                    }
                } else {
                    return interaction.editReply({ components: components })
                }
            }
            if (interaction.customId.includes("icon")) {
                if (customRole.icon) {
                    customRole.icon = undefined
                    customRole.displayIcon = undefined
                    customRole.iconURL = undefined
                    await customRole.save()
                } else {
                    const command = client.interactions.get("emoji-selector")
                    return command.run(client, interaction, args, "customRole", customRole.id)    
                }
            }
            if (interaction.customId.includes("finish")) {
                const position = interaction.guild.roles.cache.get(settings.roles.customRolePosition).position
                if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Cannot create role: I don't have 'Manage Roles' permission", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (position > interaction.guild.members.me.roles.highest.position) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Cannot create role: my highest role position is lower than", guildId: interaction.guildId, locale: interaction.locale })} ${interaction.guild.roles.cache.get(settings.roles.customRolePosition)}`, flags: ["Ephemeral"] })
                }
                if (customRole.minutes === Infinity && settings.customRolePrice.length) {
                    let canBuy = true
                    const notEnough = []
                    for (let item of settings.customRolePrice) {
                        if (item.type === RewardType.Item) {
                            const serverItem = client.cache.items.find(e => !e.temp && e.itemID === item.id && e.enabled)
                            if (!serverItem) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This item does not exist or is unknown", guildId: interaction.guildId, locale: interaction.locale })} (${item.id})**`, flags: ["Ephemeral"] })
                            }
                            const buyerUserItem = profile.inventory.find((e) => { return e.itemID === item.id })
                            if (!buyerUserItem || buyerUserItem.amount < item.amount) {
                                notEnough.push(`${!serverItem.found ? `||????????||` : `${serverItem.displayEmoji}${serverItem.name}`} (${(item.amount - (buyerUserItem?.amount || 0).toLocaleString())})`)
                                canBuy = false
                            }  
                        }
                        if (item.type === RewardType.Currency) {
                            if (profile.currency < item.amount) {
                                notEnough.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${(item.amount - profile.currency).toLocaleString()})`)
                                canBuy = false
                            }
                        }
                        if (item.type === RewardType.Role) {
                            const role = interaction.guild.roles.cache.get(item.id)
                            if (!role) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${item.id})**`, flags: ["Ephemeral"] })
                            }
                            const roleInventory = profile.inventoryRoles?.find(e => { return e.id === item.id && e.ms === undefined })
                            if (!roleInventory || (roleInventory.amount < item.amount)) {
                                notEnough.push(`<@&${item.id}> (${(item.amount - (roleInventory?.amount || 0)).toLocaleString()})`)
                                canBuy = false
                            }
                        }
                        if (item.type === RewardType.Reputation) {
                            if (profile.rp < item.amount) {
                                notEnough.push(`${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${(item.amount - profile.rp).toLocaleString()})`)
                                canBuy = false
                            }
                        }
                    }
                    if (!canBuy) {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "You don't have enough for purchase", guildId: interaction.guildId, locale: interaction.locale })}:\n${notEnough.join(", ")}`, flags: ["Ephemeral"] })
                    }
                }
                if (customRole.minutes && customRole.minutes !== Infinity && settings.customRolePriceMinute.length) {
                    let canBuy = true
                    const notEnough = []
                    for (let item of settings.customRolePriceMinute) {
                        if (item.type === RewardType.Item) {
                            const serverItem = client.cache.items.find(e => !e.temp && e.itemID === item.id && e.enabled)
                            if (!serverItem) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This item does not exist or is unknown", guildId: interaction.guildId, locale: interaction.locale })} (${item.id})**`, flags: ["Ephemeral"] })
                            }
                            const buyerUserItem = profile.inventory.find((e) => { return e.itemID === item.id })
                            if (!buyerUserItem || buyerUserItem.amount < item.amount * customRole.minutes) {
                                notEnough.push(`${!serverItem.found ? `||????????||` : `${serverItem.displayEmoji}${serverItem.name}`} (${(item.amount * customRole.minutes - (buyerUserItem?.amount || 0)).toLocaleString()})`)
                                canBuy = false
                            }  
                        }
                        if (item.type === RewardType.Currency) {
                            if (profile.currency < item.amount * customRole.minutes) {
                                notEnough.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${(item.amount * customRole.minutes - profile.currency).toLocaleString()})`)
                                canBuy = false
                            }
                        }
                        if (item.type === RewardType.Role) {
                            const role = interaction.guild.roles.cache.get(item.id)
                            if (!role) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${item.id})**`, flags: ["Ephemeral"] })
                            }
                            const roleInventory = profile.inventoryRoles?.find(e => { return e.id === item.id && e.ms === undefined })
                            if (!roleInventory || (roleInventory.amount < item.amount * customRole.minutes)) {
                                notEnough.push(`<@&${item.id}> (${(item.amount * customRole.minutes - (roleInventory?.amount || 0)).toLocaleString()})`)
                                canBuy = false
                            }
                        }
                        if (item.type === RewardType.Reputation) {
                            if (profile.rp < item.amount * customRole.minutes) {
                                notEnough.push(`${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${(item.amount * customRole.minutes - profile.rp).toLocaleString()})`)
                                canBuy = false
                            }
                        }
                    }
                    if (!canBuy) {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "You don't have enough for purchase", guildId: interaction.guildId, locale: interaction.locale })}:\n${notEnough.join(", ")}`, flags: ["Ephemeral"] })
                    }
                }
                if (settings.channels.customRoleModerationChannel) {
                    const channel = interaction.guild.channels.cache.get(settings.channels.customRoleModerationChannel)
                    if (!channel) {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Custom role creation is not configured on this server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}> ${client.language({ textId: "I need the following permissions:\n1. Send Messages", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    let message
                    try {
                        const color = client.config.colors.find(e => e.hex === customRole.color)
                        const price = []
                        if (customRole.minutes === Infinity) {
                            for (let item of settings.customRolePrice) {
                                if (item.type === RewardType.Item) {
                                    const _item = client.cache.items.get(item.id)
                                    if (!_item.enabled) price.push(`${_item.itemID} (${item.amount.toLocaleString()})`)
                                    else if (!_item.found) price.push(`||????????|| (${item.amount.toLocaleString()})`)
                                    else price.push(`${_item.displayEmoji}${_item.name} (${item.amount.toLocaleString()})`)
                                }
                                if (item.type === RewardType.Currency) {
                                    price.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${item.amount.toLocaleString()})`)
                                }
                                if (item.type === RewardType.Role) {
                                    price.push(`<@&${item.id}> (${item.amount.toLocaleString()})`)
                                }
                                if (item.type === RewardType.Reputation) {
                                    price.push(`${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${item.amount.toLocaleString()})`)
                                }
                            }
                        } else {
                            for (let item of settings.customRolePriceMinute) {
                                if (item.type === RewardType.Item) {
                                    const _item = client.cache.items.get(item.id)
                                    if (!_item.enabled) price.push(`${_item.id} (${(item.amount * customRole.minutes).toLocaleString()})`)
                                    else if (!_item.found) price.push(`||????????|| (${(item.amount * customRole.minutes).toLocaleString()})`)
                                    else price.push(`${_item.displayEmoji}${_item.name} (${(item.amount * customRole.minutes).toLocaleString()})`)
                                }
                                if (item.type === RewardType.Currency) {
                                    price.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${(item.amount * customRole.minutes).toLocaleString()})`)
                                }
                                if (item.type === RewardType.Role) {
                                    price.push(`<@&${item.id}> (${(item.amount * customRole.minutes).toLocaleString()})`)
                                }
                                if (item.type === RewardType.Reputation) {
                                    price.push(`${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${(item.amount * customRole.minutes).toLocaleString()})`)
                                }
                            }
                        }
                        const embed = new EmbedBuilder()
                            .setAuthor({ name: `${interaction.guild.members.cache.get(customRole.userID).displayName} ${client.language({ textId: "wants to create a custom role", guildId: interaction.guildId })}`, iconURL: interaction.guild.members.cache.get(customRole.userID).displayAvatarURL() })
                            .setFields([
                                {
                                    name: `${client.config.emojis.profile}${client.language({ textId: "Author", guildId: interaction.guildId })}`,
                                    value: `<@${customRole.userID}>`
                                },
                                {
                                    name: `${client.config.emojis.name}${client.language({ textId: "Role name", guildId: interaction.guildId })}`,
                                    value: `${customRole.name}`
                                },
                                {
                                    name: `${client.config.emojis.colorpalette}${client.language({ textId: "Role color", guildId: interaction.guildId })}`,
                                    value: `${color ? `${client.application.emojis.cache.find(e => e.name === color.emojiName)}${color.colorName} (${color.hex})` : customRole.color}`
                                },
                                {
                                    name: `${client.config.emojis.roles}${client.language({ textId: "Role icon", guildId: interaction.guildId })}`,
                                    value: `${customRole.displayIcon || `${client.language({ textId: "None", guildId: interaction.guildId })}`}`
                                },
                                {
                                    name: `${client.config.emojis.watch}${client.language({ textId: "Time", guildId: interaction.guildId })}`,
                                    value: `${customRole.minutes === Infinity ? `${client.language({ textId: "Forever", guildId: interaction.guildId })}` : client.functions.transformSecs(client, customRole.minutes * 60 * 1000, interaction.guildId, interaction.locale)}`
                                },
                                {
                                    name: `${client.config.emojis.coin}${client.language({ textId: "Price", guildId: interaction.guildId })}`,
                                    value: `${price.length ? price.join(", ") : `${client.language({ textId: "Free", guildId: interaction.guildId })}`}`
                                }
                            ])
                            .setFooter({ text: `ID: ${customRole.id}`})
                            .setColor(customRole.color || null)
                        if (customRole.displayIcon) embed.setThumbnail(customRole.iconURL || `https://api-ninjas-data.s3.us-west-2.amazonaws.com/emojis/U%2B${emojiUnicode(customRole.displayIcon).toUpperCase().split(" ").join("%20U%2B")}.png` || null)
                        message = await channel.send({
                            embeds: [embed],
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(`cmd{createCustomRole}id{${customRole.id}}accept`)
                                            .setStyle(ButtonStyle.Success)
                                            .setLabel(`${client.language({ textId: "ALLOW", guildId: interaction.guildId })}`),
                                        new ButtonBuilder()
                                            .setCustomId(`cmd{createCustomRole}id{${customRole.id}}decline`)
                                            .setStyle(ButtonStyle.Danger)
                                            .setLabel(`${client.language({ textId: "DECLINE", guildId: interaction.guildId })}`)
                                    )
                            ]
                        })
                    } catch (e) {
                        console.error(e)
                        return interaction.reply({ content: `${client.config.emojis.NO}**${e.message}**`, flags: ["Ephemeral"] })
                    }
                    customRole.status = "moderation"
                    customRole.channelId = channel.id
                    customRole.messageId = message.id
                    customRole.setTimeoutDelete()
                    await customRole.save()
                    if (customRole.minutes === Infinity && settings.customRolePrice.length) {
                        for (let item of settings.customRolePrice) {
                            if (item.type === RewardType.Item) {
                                await profile.subtractItem(item.id, item.amount)
                            }
                            if (item.type === RewardType.Currency) {
                                await profile.subtractCurrency(item.amount)
                            }
                            if (item.type === RewardType.Role) {
                                await profile.subtractRole(item.id, item.amount)
                            }
                            if (item.type === RewardType.Reputation) {
                                await profile.subtractRp(item.amount)
                            }
                        }
                        await profile.save()    
                    }
                    if (customRole.minutes !== Infinity && settings.customRolePriceMinute.length) {
                        for (let item of settings.customRolePriceMinute) {
                            if (item.type === RewardType.Item) {
                                await profile.subtractItem(item.id, item.amount * customRole.minutes)
                            }
                            if (item.type === RewardType.Currency) {
                                await profile.subtractCurrency(item.amount * customRole.minutes)
                            }
                            if (item.type === RewardType.Role) {
                                await profile.subtractRole(item.id, item.amount * customRole.minutes)
                            }
                            if (item.type === RewardType.Reputation) {
                                await profile.subtractRp(item.amount * customRole.minutes)
                            }
                        }
                        await profile.save()    
                    }
                    return interaction.update({ content: `${client.config.emojis.YES}${client.language({ textId: "Role sent for moderation, if by", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(customRole.deleteDate/1000)}:f> ${client.language({ textId: "no one approves it, it will be automatically declined", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], embeds: [] })
                }
                const role = await interaction.guild.roles.create({
                    name: customRole.name,
                    color: customRole.color || undefined,
                    reason: 'Custom role',
                    hoist: settings.customRoleHoist,
                    position: position,
                    icon: (interaction.guild.premiumTier === GuildPremiumTier.Tier2 || interaction.guild.premiumTier === GuildPremiumTier.Tier3) && customRole.icon !== customRole.displayIcon ? customRole.iconURL : undefined,
                    unicodeEmoji: (interaction.guild.premiumTier === GuildPremiumTier.Tier2 || interaction.guild.premiumTier === GuildPremiumTier.Tier3) && customRole.icon === customRole.displayIcon ? customRole.icon : undefined
                })
                if (customRole.minutes === Infinity && settings.customRolePrice.length) {
                    for (let item of settings.customRolePrice) {
                        if (item.type === RewardType.Item) {
                            await profile.subtractItem(item.id, item.amount)
                        }
                        if (item.type === RewardType.Currency) {
                            await profile.subtractCurrency(item.amount)
                        }
                        if (item.type === RewardType.Role) {
                            await profile.subtractRole(item.id, item.amount)
                        }
                        if (item.type === RewardType.Reputation) {
                            await profile.subtractRp(item.amount)
                        }
                    }
                    await profile.save()    
                }
                if (customRole.minutes !== Infinity && settings.customRolePriceMinute.length) {
                    for (let item of settings.customRolePriceMinute) {
                        if (item.type === RewardType.Item) {
                            await profile.subtractItem(item.id, item.amount * customRole.minutes)
                        }
                        if (item.type === RewardType.Currency) {
                            await profile.subtractCurrency(item.amount * customRole.minutes)
                        }
                        if (item.type === RewardType.Role) {
                            await profile.subtractRole(item.id, item.amount * customRole.minutes)
                        }
                        if (item.type === RewardType.Reputation) {
                            await profile.subtractRp(item.amount * customRole.minutes)
                        }
                    }
                    await profile.save()    
                }
                profile.addRole(role.id, 1, customRole.minutes && customRole.minutes !== Infinity ? customRole.minutes * 60 * 1000 : undefined)
                await profile.save()
                if (settings.customRoleProperties?.length) {
                    const properties = {}
                    settings.customRoleProperties.forEach(e => properties[e] = true )
                    await new client.rolePropertiesSchema({
                        guildID: interaction.guildId,
                        id: role.id,
                        ...properties
                    }).save()
                }
                customRole.roleId = role.id
                customRole.deleteDate = undefined
                customRole.status = "created"
                customRole.clearTimeoutDelete()
                await customRole.save()
                return interaction.update({ content: `${client.config.emojis.YES}${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${role.id}> ${client.language({ textId: "created and added to inventory", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
            }
        }
        const price = []
        if (customRole.minutes) {
            if (customRole.minutes === Infinity) {
                for (let item of settings.customRolePrice) {
                    if (item.type === RewardType.Item) {
                        const _item = client.cache.items.get(item.id)
                        if (!_item.enabled) price.push(`${_item.itemID} (${item.amount.toLocaleString()})`)
                        else if (!_item.found) price.push(`||????????|| (${item.amount.toLocaleString()})`)
                        else price.push(`${_item.displayEmoji}${_item.name} (${item.amount.toLocaleString()})`)
                    }
                    if (item.type === RewardType.Currency) {
                        price.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${item.amount.toLocaleString()})`)
                    }
                    if (item.type === RewardType.Role) {
                        price.push(`<@&${item.id}> (${item.amount.toLocaleString()})`)
                    }
                    if (item.type === RewardType.Reputation) {
                        price.push(`${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${item.amount.toLocaleString()})`)
                    }
                }
            } else {
                for (let item of settings.customRolePriceMinute) {
                    if (item.type === RewardType.Item) {
                        const _item = client.cache.items.get(item.id)
                        if (!_item.enabled) price.push(`${_item.id} (${(item.amount * customRole.minutes).toLocaleString()})`)
                        else if (!_item.found) price.push(`||????????|| (${(item.amount * customRole.minutes).toLocaleString()})`)
                        else price.push(`${_item.displayEmoji}${_item.name} (${(item.amount * customRole.minutes).toLocaleString()})`)
                    }
                    if (item.type === RewardType.Currency) {
                        price.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${(item.amount * customRole.minutes).toLocaleString()})`)
                    }
                    if (item.type === RewardType.Role) {
                        price.push(`<@&${item.id}> (${(item.amount * customRole.minutes).toLocaleString()})`)
                    }
                    if (item.type === RewardType.Reputation) {
                        price.push(`${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${(item.amount * customRole.minutes).toLocaleString()})`)
                    }
                }
            }
        }
        const color = client.config.colors.find(e => e.hex === customRole.color)
        const embed = new EmbedBuilder()
            .setTitle(`${client.language({ textId: "Create custom role", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setFields([
                {
                    name: `${client.config.emojis.name}${client.language({ textId: "Role name", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `${customRole.name || `\`${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}\``}`
                },
                {
                    name: `${client.config.emojis.colorpalette}${client.language({ textId: "Role color", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `${customRole.color ? color ? `${client.application.emojis.cache.find(e => e.name === color.emojiName)}${color.colorName} (${color.hex})` : customRole.color : `\`${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}\``}`
                },
                {
                    name: `${client.config.emojis.roles}${client.language({ textId: "Role icon", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `${customRole.displayIcon || `${client.language({ textId: "None", guildId: interaction.guildId, locale: interaction.locale })}`}`
                },
                {
                    name: `${client.config.emojis.watch}${client.language({ textId: "Time", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `${!customRole.minutes ? `\`${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}\`` : customRole.minutes === Infinity ? `${client.language({ textId: "Forever", guildId: interaction.guildId, locale: interaction.locale })}` : client.functions.transformSecs(client, customRole.minutes * 60 * 1000, interaction.guildId, interaction.locale)}`
                },
                {
                    name: `${client.config.emojis.coin}${client.language({ textId: "Price", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `${customRole.minutes ? price.length ? price.join(", ") : `${client.language({ textId: "Free", guildId: interaction.guildId, locale: interaction.locale })}` : `\`${client.language({ textId: "Time selection required", guildId: interaction.guildId, locale: interaction.locale })}\``}`
                }
            ])
            .setFooter({ text: `ID: ${customRole.id}`})
            .setColor(customRole.color || null)
        if (customRole.displayIcon) embed.setThumbnail(customRole.iconURL || `https://api-ninjas-data.s3.us-west-2.amazonaws.com/emojis/U%2B${emojiUnicode(customRole.displayIcon).toUpperCase().split(" ").join("%20U%2B")}.png` || null)
        const components = [
            new ActionRowBuilder()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId(`cmd{custom-role}id{${customRole.id}}name`)
                        .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setStyle(customRole.name ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji(client.config.emojis.name),
                    new ButtonBuilder()
                        .setCustomId(`cmd{custom-role}id{${customRole.id}}color`)
                        .setLabel(`${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setStyle(customRole.color ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji(client.config.emojis.colorpalette),
                    new ButtonBuilder()
                        .setCustomId(`cmd{custom-role}id{${customRole.id}}minutes`)
                        .setLabel(`${client.language({ textId: "Time", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setStyle(customRole.minutes ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setDisabled(!settings.customRoleTemporaryEnabled)
                        .setEmoji(client.config.emojis.watch),
                    new ButtonBuilder()
                        .setCustomId(`cmd{custom-role}id{${customRole.id}}icon`)
                        .setLabel(`${client.language({ textId: "Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setStyle(customRole.icon ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji(client.config.emojis.roles)
                        .setDisabled(interaction.guild.premiumTier === GuildPremiumTier.Tier1 || interaction.guild.premiumTier === GuildPremiumTier.None)
                ]),
            new ActionRowBuilder()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId(`cmd{custom-role}id{${customRole.id}}finish`)
                        .setLabel(settings.channels.customRoleModerationChannel ? `${client.language({ textId: "Send for moderation", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Create role", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(!customRole.name || !customRole.minutes || !customRole.color)
                        .setEmoji(settings.channels.customRoleModerationChannel ? client.config.emojis.send : client.config.emojis.activities),
                    new ButtonBuilder()
                        .setCustomId(`cmd{custom-role}id{${customRole.id}}`)
                        .setEmoji(client.config.emojis.refresh)
                        .setStyle(ButtonStyle.Secondary)
                ])
        ]
        if (interaction.isChatInputCommand() || (interaction.isButton() && !idRegexp.exec(interaction.customId))) return interaction.reply({ embeds: [embed], components, flags: ["Ephemeral"] })
        else {
            if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components })
            else return interaction.update({ embeds: [embed], components })
        }
    }
}