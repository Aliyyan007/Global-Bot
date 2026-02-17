const { TextInputStyle, ButtonBuilder, ButtonStyle, InteractionType, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, TextInputBuilder, ModalBuilder, UserSelectMenuBuilder, Collection, LabelBuilder } = require("discord.js")
const GiftRegexp = /gift{(.*?)}/
const UserRegexp = /usr{(.*?)}/
module.exports = {
    name: 'manager-gifts',
    nameLocalizations: {
        'ru': `управление-подарками`,
        'uk': `управління-подарунками`,
        'es-ES': `gestión-de-regalos`
    },
    description: 'Manage guild gifts',
    descriptionLocalizations: {
        'ru': `Управление подарками сервера`,
        'uk': `Управління подарунками сервера`,
        'es-ES': `Gestión de regalos del servidor`
    },
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
        const settings = client.cache.settings.get(interaction.guildId)
        if (!interaction.isChatInputCommand()) {
            if (UserRegexp.exec(interaction.customId)?.[1] !== interaction.user.id) return interaction.reply({ content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        let gifts = await client.giftSchema.find({ guildID: interaction.guildId })
        const embed = new EmbedBuilder()
        if (!interaction.isChatInputCommand()) {
            if (interaction.customId.includes("new")) {
                const modal = new ModalBuilder()
                    .setCustomId(`newGift_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "NEW GIFT: NAME", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setMinLength(2)
                                    .setMaxLength(30)
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder(`${client.language({ textId: "Enter name for your gift", guildId: interaction.guildId, locale: interaction.locale })}`)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `newGift_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (gifts.some(e => e.giftName.toLowerCase() === modalArgs.name.toLowerCase())) {
                        return interaction.reply({ content: `${client.language({ textId: "Gift with this name already exists", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        const uniqid = require(`uniqid`)
                        const gift = new client.giftSchema({
                            guildID: interaction.guildId,
                            giftID: uniqid.time(),
                            giftName: modalArgs.name,
                        })
                        await gift.save().catch(e => console.error(e))
                        gifts = await client.giftSchema.find({ guildID: interaction.guildId })
                    }
                } else return
            }
            if (interaction.customId.includes("edit")) {
                let gift
                if (interaction.customId.includes("find")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`editGift_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("name")
                                        .setMinLength(2)
                                        .setMaxLength(30)
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder(`${client.language({ textId: "Enter gift name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `editGift_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 30000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        gift = gifts.find(e => { return e.giftName.toLowerCase() === modalArgs.name.toLowerCase()})
                    } else return    
                } else {
                    gift = gifts.find(e => { return e.giftID === interaction.values?.[0]})
                    if (!gift) gift = gifts.find(e => { return e.giftID === GiftRegexp.exec(interaction.customId)?.[1] })
                }
                if (!gift) {
                    return interaction.reply({ content: `${client.language({ textId: "Such gift does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                embed.setColor(gift.color || 3093046)
                if (interaction.isStringSelectMenu()) {
                    if (interaction.values[0].includes("name")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`editName_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
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
                                            .setValue(`${gift.giftName}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editName_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (gifts.find(e => e.giftName.toLowerCase() === modalArgs.name.toLowerCase())) {
                                return interaction.reply({ content: `${client.config.emojis.NO} Подарок с таким названием уже существует`, flags: ["Ephemeral"] })
                            }
                            gift.giftName = modalArgs.name
                            await gift.save()
                        } else return
                    } else
                    if (interaction.values[0].includes("maxUniqueMembers")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`editmaxUniqueMembers_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Max. unique users", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("maxUniqueMembers")
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${gift.maxUniqueMembers || ""}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editmaxUniqueMembers_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (+modalArgs.maxUniqueMembers === 0) modalArgs.maxUniqueMembers = 0
                            else if (!+modalArgs.maxUniqueMembers || +modalArgs.maxUniqueMembers < 0) modalArgs.maxUniqueMembers = undefined
                            else if (modalArgs.maxUniqueMembers > 1000000) modalArgs.maxUniqueMembers = 1000000
                            else modalArgs.maxUniqueMembers = +modalArgs.maxUniqueMembers
                            gift.maxUniqueMembers = modalArgs.maxUniqueMembers
                            await gift.save()
                        } else return
                    } else
                    if (interaction.values[0].includes("maxCount")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`editmaxCount_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Number of gift claims", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("maxCount")
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${gift.maxCount || ""}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editmaxCount_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!+modalArgs.maxCount || +modalArgs.maxCount < 0) modalArgs.maxCount = 0
                            else if (modalArgs.maxCount > 1000000) modalArgs.maxCount = 1000000
                            else modalArgs.maxCount = +modalArgs.maxCount
                            gift.maxCount = modalArgs.maxCount
                            await gift.save()
                        } else return
                    } else
                    if (interaction.values[0].includes("cooldown")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`editcooldown_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Cooldown (in seconds)", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("cooldown")
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${Math.floor(gift.cooldown/1000) || ""}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editcooldown_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!+modalArgs.cooldown || +modalArgs.cooldown < 0) modalArgs.cooldown = undefined
                            else modalArgs.cooldown = +modalArgs.cooldown * 1000
                            gift.cooldown = modalArgs.cooldown
                            await gift.save()
                        } else return
                    } else
                    if (interaction.values[0].includes("date")) {
                        const { format } = require('date-format-parse')
                        const { parse } = require('date-format-parse')
                        let startDate = format(gift.startDate, 'DD-MM-YYYY HH:mm')
                        let endDate = format(gift.endDate, 'DD-MM-YYYY HH:mm')
                        if (startDate === "Invalid Date") startDate = ""
                        if (endDate === "Invalid Date") endDate = ""
                        const modal = new ModalBuilder()
                            .setCustomId(`editDate_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Start date", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("startDate")
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${startDate}`)
                                            .setPlaceholder("28-07-2022 16:57")
                                    ),
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "End date", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("endDate")
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${endDate}`)
                                            .setPlaceholder("28-07-2022 16:57")
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editDate_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.startDate) modalArgs.startDate = undefined
                            else {
                                const date = parse(modalArgs.startDate, 'DD-MM-YYYY HH:mm')
                                if (!isNaN(date.getTime())) modalArgs.startDate = date
                                else modalArgs.startDate = undefined
                            }
                            if (!modalArgs.endDate) modalArgs.endDate = undefined
                            else {
                                const date = parse(modalArgs.endDate, 'DD-MM-YYYY HH:mm')
                                if (!isNaN(date.getTime())) modalArgs.endDate = date
                                else modalArgs.endDate = undefined
                            }
                            if (modalArgs.startDate && modalArgs.endDate && modalArgs.startDate > modalArgs.endDate) {
                                return interaction.reply({ content: `${client.config.emojis.NO} Дата начала не должна быть больше даты окончания`, flags: ["Ephemeral"] })
                            }
                            gift.startDate = modalArgs.startDate
                            gift.endDate = modalArgs.endDate
                            await gift.save()
                        } else return
                    } else
                    if (interaction.values[0].includes("switch")) {
                        gift.enable = !gift.enable
                        await gift.save()
                    } else
                    if (interaction.values[0].includes("comment")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`editComment_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Comment", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("comment")
                                            .setRequired(false)
                                            .setMaxLength(500)
                                            .setStyle(TextInputStyle.Paragraph)
                                            .setValue(`${gift.comment || ""}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editComment_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.comment) {
                                gift.comment = undefined
                            } else gift.comment = modalArgs.comment
                            await gift.save()
                        } else return
                    } else
                    if (interaction.values[0].includes("thumbnail")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`editThumbnail_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("thumbnail")
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${gift.thumbnail || ""}`)
                                            .setPlaceholder(`${client.language({ textId: "Direct image link", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editThumbnail_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.thumbnail) {
                                gift.thumbnail = undefined
                            } else {
                                const isImageURL = require('image-url-validator').default
                                const thumbnail = await isImageURL(modalArgs.thumbnail)
                                if (!thumbnail) {
                                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.thumbnail}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                }
                                gift.thumbnail = modalArgs.thumbnail    
                            }
                            
                            await gift.save()
                        } else return
                    } else
                    if (interaction.values[0].includes("image")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`editImage_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("image")
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${gift.image || ""}`)
                                            .setPlaceholder(`${client.language({ textId: "Direct image link", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editImage_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.image) {
                                gift.image = undefined
                            } else {
                                const isImageURL = require('image-url-validator').default
                                const image = await isImageURL(modalArgs.image)
                                if (!image) {
                                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.image}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                }
                                gift.image = modalArgs.image    
                            }
                            
                            await gift.save()
                        } else return
                    } else
                    if (interaction.values[0].includes("color")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`editColor_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("color")
                                            .setRequired(false)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${gift.color || ""}`)
                                            .setPlaceholder(`${client.language({ textId: "HEX color code", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editColor_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.color) {
                                gift.color = undefined
                            } else {
                                if (/^#[0-9A-F]{6}$/i.test(modalArgs.color)) {
                                    gift.color = modalArgs.color
                                } else {
                                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.color}** ${client.language({ textId: "is not a HEX color code", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                }     
                            }
                            await gift.save()
                        } else return
                    }
                }
                if (interaction.customId.includes("edit_items")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`editItems_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "EDIT GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("item")
                                        .setRequired(true)
                                        .setMinLength(2)
                                        .setMaxLength(30)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "xp - experience", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "rp - reputation", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "currency - currency", guildId: interaction.guildId, locale: interaction.locale })}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(6)
                                        .setStyle(TextInputStyle.Short)
                                ),
                        ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editItems_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            modalArgs.amount = +modalArgs.amount
                            if (modalArgs.amount < 0 && modalArgs.item !== "rp") modalArgs.amount = 0
                            if (modalArgs.item === "xp" || modalArgs.item === "rp" || modalArgs.item === "currency" || modalArgs.item === settings.currencyName) {
                                if (modalArgs.item === "rp") {
                                    if (modalArgs.amount > 1000) modalArgs.amount = 1000
                                    if (modalArgs.amount < -1000) modalArgs.amount = -1000
                                }
                                if (modalArgs.item === settings.currencyName) modalArgs.item = "currency"
                            } else {
                                const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()))
                                const itemID = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase())?.itemID : filteredItems.first()?.itemID
                                if (!itemID) return interaction.reply({ content: `${client.language({ textId: "Item with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                modalArgs.item = itemID 
                            }
                            if (!modalArgs.amount) {
                                gift.items = gift.items.filter(e => e.itemID !== modalArgs.item)
                            } else {
                                const item = gift.items.find(e => { return e.itemID === modalArgs.item })
                                if (item) item.amount = modalArgs.amount
                                else {
                                    if (gift.items.length < 10) {
                                        gift.items.push({
                                            itemID: modalArgs.item,
                                            amount: modalArgs.amount
                                        })    
                                    } else {
                                        return interaction.reply({ content: `${client.language({ textId: "Maximum items in gift", guildId: interaction.guildId, locale: interaction.locale })} - 10`, flags: ["Ephemeral"] })
                                    }
                                }
                            }
                            await gift.save()
                        } else return
                }
                if (interaction.customId.includes("members")) {
                    embed.setAuthor({ name: gift.giftName })
                    embed.setTitle(`${client.language({ textId: "USERS", guildId: interaction.guildId, locale: interaction.locale })}`)
                    if (interaction.customId.includes("select")) {
                        const user = interaction.users.first()
                        const { format } = require('date-format-parse')
                        const { parse } = require('date-format-parse')
                        const member = gift.members.find(e => { return e.userID === user.id })
                        let lastDate = format(member?.lastDate, 'DD-MM-YYYY HH:mm')
                        if (lastDate === "Invalid Date") lastDate = ""
                        const modal = new ModalBuilder()
                            .setCustomId(`editMember_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "EDIT", guildId: interaction.guildId, locale: interaction.locale })} ${user.username}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Number of gift claims", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("count")
                                            .setMaxLength(9)
                                            .setStyle(TextInputStyle.Short)
                                            .setValue(`${gift.members.find(e => e.userID === user.id)?.count || ""}`)
                                    ),
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Last received", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("lastDate")
                                            .setStyle(TextInputStyle.Short)
                                            .setRequired(false)
                                            .setValue(`${lastDate}`)
                                            .setPlaceholder("28-07-2022 16:57")
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `editMember_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            modalArgs.count = +modalArgs.count
                            if (modalArgs.count < 0) modalArgs.count = 0
                            if (!modalArgs.count) {
                                gift.members = gift.members.filter(e => e.userID !== user.id)
                            } else {
                                if (!modalArgs.lastDate) modalArgs.lastDate = undefined
                                else {
                                    const date = parse(modalArgs.lastDate, 'DD-MM-YYYY HH:mm')
                                    if (!isNaN(date.getTime())) modalArgs.lastDate = date
                                    else modalArgs.lastDate = undefined
                                }
                                if (!member) {
                                    gift.members.push({
                                        userID: user.id,
                                        count: modalArgs.count,
                                        lastDate: modalArgs.lastDate
                                    })
                                } else {
                                    member.count = modalArgs.count
                                    member.lastDate = modalArgs.lastDate
                                }
                            }
                            await gift.save()
                        } else return
                    } else
                    if (interaction.customId.includes("deleteAll")) {
                        gift.members = []
                        await gift.save()
                    }
                    const LimitRegexp = /lim{(.*?)}/
                    const limit = +LimitRegexp.exec(interaction.customId)?.[1] || 15
                    const min = limit - 15
                    const members = gift.members.sort((a, b) => a.lastDate < b.lastDate).slice(min, limit)
                    embed.addFields(members.map(member => {
                        const user = client.users.cache.get(member.userID)
                        return { name: user?.tag || member.userID, value: `${client.language({ textId: "Took gift", guildId: interaction.guildId, locale: interaction.locale })}: ${member.count}\n${client.language({ textId: "Last time", guildId: interaction.guildId, locale: interaction.locale })}: ${!member.lastDate ? `${client.language({ textId: "Unknown", guildId: interaction.guildId, locale: interaction.locale })}` : `<t:${Math.floor(member.lastDate/1000)}:R>`}` }
                    }))
                    const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`gift{${gift.giftID}}usr{${interaction.user.id}}cmd{manager-gifts}lim{15}edit_members_1`).setDisabled((gift.members.length <= 15 && min == 0) || (gift.members.length > 15 && min < 15) ? true : false)
                    const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`gift{${gift.giftID}}usr{${interaction.user.id}}cmd{manager-gifts}lim{${limit-15}}edit_members_2`).setDisabled((gift.members.length <= 15 && min == 0) || (gift.members.length > 15 && min < 15) ? true : false)
                    const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`gift{${gift.giftID}}usr{${interaction.user.id}}cmd{manager-gifts}lim{${limit+15}}edit_members_3`).setDisabled((gift.members.length <= 15 && min == 0) || (gift.members.length > 15 && min >= gift.members.length - 15) ? true : false)
                    const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`gift{${gift.giftID}}usr{${interaction.user.id}}cmd{manager-gifts}lim{${gift.members.length + (gift.members.length % 15 == 0 ? 0 : 15 - (gift.members.length % 15))}}edit_members_4`).setDisabled((gift.members.length <= 15 && min == 0) || (gift.members.length > 15 && min >= gift.members.length - 15) ? true : false)
                    const deleteAllBTN = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel(`${client.language({ textId: "DELETE ALL", guildId: interaction.guildId, locale: interaction.locale })}`).setCustomId(`gift{${gift.giftID}}cmd{manager-gifts}usr{${interaction.user.id}}edit_members_deleteAll`)
                    const editUser = new UserSelectMenuBuilder().setCustomId(`gift{${gift.giftID}}cmd{manager-gifts}usr{${interaction.user.id}}edit_members_select`).setPlaceholder(`${client.language({ textId: "Add/change/delete user", guildId: interaction.guildId, locale: interaction.locale })}`)
                    const returnBTN = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel(`${client.language({ textId: "BACK", guildId: interaction.guildId, locale: interaction.locale })}`).setCustomId(`gift{${gift.giftID}}cmd{manager-gifts}usr{${interaction.user.id}}edit`)
                    const array_btn = [first_page_btn, previous_page_btn, next_page_btn, last_page_btn]
                    return interaction.update({ embeds: [embed], components: [
                        new ActionRowBuilder().addComponents(array_btn),
                        new ActionRowBuilder().addComponents(editUser),
                        new ActionRowBuilder().addComponents(deleteAllBTN),
                        new ActionRowBuilder().addComponents(returnBTN)
                    ] })
                }
                if (interaction.customId.includes("permission")) {
                    if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-gifts_permission_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("name")
                                        .setRequired(false)
                                        .setValue(`${client.cache.permissions.find(e => e.id === gift.permission)?.name || ""}`)
                                        .setStyle(TextInputStyle.Short)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-gifts_permission_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (!modalArgs.name) {
                            gift.permission = undefined
                            await gift.save()
                        } else {
                            const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
                            if (!permission) {
                                await interaction.deferUpdate()
                                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
                            } else {
                                gift.permission = permission.id
                                await gift.save()
                            }
                        }
                    } else return
                }
                const description = [
                    `${gift.enable ? `${client.config.emojis.on}${client.language({ textId: "ENABLED", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.config.emojis.off}${client.language({ textId: "DISABLED", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `${client.language({ textId: "Max. unique users", guildId: interaction.guildId, locale: interaction.locale })}: ${gift.maxUniqueMembers || `${client.language({ textId: "Unlimited", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `${client.language({ textId: "Max. gift claims", guildId: interaction.guildId, locale: interaction.locale })}: ${gift.maxCount || `${client.language({ textId: "Unlimited", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                ]
                if (gift.cooldown) description.push(`${client.language({ textId: "Gift claim cooldown", guildId: interaction.guildId, locale: interaction.locale })}: ${transformSecs(gift.cooldown, interaction.guildId, interaction.locale)}`)
                if (gift.startDate) description.push(`${client.language({ textId: "Gift start date", guildId: interaction.guildId, locale: interaction.locale })}: <t:${Math.floor(gift.startDate.getTime()/1000)}:R>`)
                if (gift.endDate) description.push(`${client.language({ textId: "Gift end date", guildId: interaction.guildId, locale: interaction.locale })}: <t:${Math.floor(gift.endDate.getTime()/1000)}:R>`)
                if (gift.comment) description.push(`${client.language({ textId: "Comment after receiving gift", guildId: interaction.guildId, locale: interaction.locale })}: ${gift.comment}`)
                if (gift.permission) description.push(`${client.language({ textId: "Permission for receiving", guildId: interaction.guildId, locale: interaction.locale })}: ${client.cache.permissions.find(e => e.id === gift.permission)?.name || gift.permission}`)
                embed.setDescription(description.join("\n"))
                embed.setTitle(gift.giftName)
                embed.setImage(gift.image || null)
                embed.setThumbnail(gift.thumbnail || null)
                const values = []
                if (!gift.items.length) values.push(`${client.language({ textId: "No items", guildId: interaction.guildId, locale: interaction.locale })}.`)
                else {
                    for (let item of gift.items) {
                        if (item.itemID === "xp") {
                            values.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${item.amount})`)
                        } else if (item.itemID === "currency") {
                            values.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${item.amount})`)
                        } else if (item.itemID === "rp") {
                            values.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${item.amount})`)
                        } else {
                            const serverItem = client.cache.items.find(e => e.itemID === item.itemID && !e.temp)
                            if (serverItem) {
                                values.push(`**${serverItem.displayEmoji}** (${item.amount})`)
                            }    
                        }
                    }
                }
                embed.addFields([
                    {
                        name: `${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}:`,
                        value: values.join("\n")
                    },
                    {
                        name: `${client.language({ textId: "Participants who received gift", guildId: interaction.guildId, locale: interaction.locale })}:`,
                        value: gift.members.length ? gift.members.sort((a, b) => a.lastDate < b.lastDate).slice(0, 9).map(member => {
                            return `<@${member.userID}> (${member.userID}) - ${member.count} ${client.language({ textId: "times", guildId: interaction.guildId, locale: interaction.locale })}${member.lastDate ? ` - <t:${Math.floor(member.lastDate.getTime()/1000)}:R>` : ``}`
                        }).join("\n") : `${client.language({ textId: "Empty", guildId: interaction.guildId, locale: interaction.locale })}`
                    }
                ])
                if (gift.items.length) {
                    embed.addFields([{
                        name: `${client.language({ textId: "Button ID", guildId: interaction.guildId, locale: interaction.locale })}:`,
                        value: `\`\`\`cmd{get-gift}gift{${gift.giftID}}\`\`\` [${client.language({ textId: "What to do with this ID?", guildId: interaction.guildId, locale: interaction.locale })}](https://avault.gitbook.io/wetbot/rukovodstvo/sozdanie-podarkov-manager-gifts#kak-sozdat-knopku-so-sgenerirovannym-id)`
                    }])
                }
                const row1 = new ActionRowBuilder().addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId(`gift{${gift.giftID}}cmd{manager-gifts}usr{${interaction.user.id}}edit`)
                        .setOptions([
                            { emoji: client.config.emojis.name, label: `${client.language({ textId: "Change name", guildId: interaction.guildId, locale: interaction.locale })}`, value: `name` },
                            { emoji: client.config.emojis.balloon, label: `${client.language({ textId: "Change comment after gift claim", guildId: interaction.guildId, locale: interaction.locale })}`, value: `comment` },
                            { emoji: client.config.emojis.picture, label: `${client.language({ textId: "Change thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, value: `thumbnail` },
                            { emoji: client.config.emojis.picture, label: `${client.language({ textId: "Change image", guildId: interaction.guildId, locale: interaction.locale })}`, value: `image` },
                            { emoji: client.config.emojis.colorpalette, label: `${client.language({ textId: "Change border color", guildId: interaction.guildId, locale: interaction.locale })}`, value: `color` },
                            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Change maximum unique users", guildId: interaction.guildId, locale: interaction.locale })}`, value: `maxUniqueMembers` },
                            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Change gift claim count", guildId: interaction.guildId, locale: interaction.locale })}`, value: `maxCount` },
                            { emoji: client.config.emojis.watch, label: `${client.language({ textId: "Change cooldown", guildId: interaction.guildId, locale: interaction.locale })}`, value: `cooldown` },
                            { emoji: client.config.emojis.watch, label: `${client.language({ textId: "Change start and end date", guildId: interaction.guildId, locale: interaction.locale })}`, value: `date` },
                            { emoji: gift.enable ? client.config.emojis.off : client.config.emojis.on, label: gift.enable ? `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`, value: `switch` },
                        ])
                        .setPlaceholder(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale })}...`)
                ])
                const row2 = new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId(`cmd{manager-gifts}gift{${gift.giftID}}usr{${interaction.user.id}}edit_items`)
                        .setLabel(client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale }))
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(client.config.emojis.box),
                    new ButtonBuilder()
                        .setCustomId(`cmd{manager-gifts}gift{${gift.giftID}}usr{${interaction.user.id}}lim{15}edit_members`)
                        .setLabel(client.language({ textId: "Users", guildId: interaction.guildId, locale: interaction.locale }))
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(client.config.emojis.profile2users),
                    new ButtonBuilder()
                        .setCustomId(`cmd{manager-gifts}gift{${gift.giftID}}usr{${interaction.user.id}}edit_permission`)
                        .setLabel(client.language({ textId: "Permission", guildId: interaction.guildId, locale: interaction.locale }))
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(client.config.emojis.crown)
                ])
                const row3 = new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId(`cmd{manager-gifts}usr{${interaction.user.id}}`)
                        .setLabel(client.language({ textId: "BACK", guildId: interaction.guildId, locale: interaction.locale }))
                        .setStyle(ButtonStyle.Danger),
                ])
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [row1, row2, row3] })
                else return interaction.update({ embeds: [embed], components: [row1, row2, row3] })
            }
            if (interaction.customId.includes("delete")) {
                const modal = new ModalBuilder()
                    .setCustomId(`deleteGift_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "DELETE GIFT", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setMinLength(2)
                                    .setMaxLength(30)
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder(`${client.language({ textId: "Enter gift name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `deleteGift_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 30000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    const gift = gifts.find(e => { return e.giftName.toLowerCase() === modalArgs.name.toLowerCase()})
                    if (!gift) return interaction.reply({ content: `${client.language({ textId: "Such gift does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    await client.giftSchema.deleteOne({ guildID: interaction.guildId, giftID: gift.giftID })
                    gifts = await client.giftSchema.find({ guildID: interaction.guildId })
                } else return 
            }
            if (interaction.customId.includes("enable-all")) {
                await client.giftSchema.updateMany({ guildID: interaction.guildId }, { $set: { enable: true } })
                gifts = await client.giftSchema.find({ guildID: interaction.guildId })
            }
            if (interaction.customId.includes("disable-all")) {
                await client.giftSchema.updateMany({ guildID: interaction.guildId }, { $set: { enable: false } })
                gifts = await client.giftSchema.find({ guildID: interaction.guildId })
            }
        }
        embed.setTitle(`${client.language({ textId: "GIFTS", guildId: interaction.guildId, locale: interaction.locale })}: ${gifts.length}`)
        if (!gifts.length) {
            embed.setDescription(`${client.language({ textId: "No gifts", guildId: interaction.guildId, locale: interaction.locale })}.`)
        } else {
            let index = 1
            const description = []
            for (const gift of gifts) {
                description.push(`${index}. ${gift.enable ? "🟢": "🔴"}${gift.giftName}`)
                index++
            }
            embed.setDescription(description.join("\n").slice(0, 4095))
        }
        const first_row = new ActionRowBuilder().addComponents([
            new ButtonBuilder().setCustomId(`cmd{manager-gifts} new usr{${interaction.user.id}}`).setStyle(ButtonStyle.Success).setLabel(`${client.language({ textId: "Create", guildId: interaction.guildId, locale: interaction.locale })}...`),
            new ButtonBuilder().setCustomId(`cmd{manager-gifts} edit find usr{${interaction.user.id}}`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale })}...`),
            new ButtonBuilder().setCustomId(`cmd{manager-gifts} delete usr{${interaction.user.id}}`).setStyle(ButtonStyle.Danger).setLabel(`${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })}...`)
        ])
        const second_row = new ActionRowBuilder().addComponents([
            new ButtonBuilder().setCustomId(`cmd{manager-gifts} enable-all usr{${interaction.user.id}}`).setStyle(ButtonStyle.Secondary).setLabel(`${client.language({ textId: "Enable all", guildId: interaction.guildId, locale: interaction.locale })}`),
            new ButtonBuilder().setCustomId(`cmd{manager-gifts} disable-all usr{${interaction.user.id}}`).setStyle(ButtonStyle.Secondary).setLabel(`${client.language({ textId: "Disable all", guildId: interaction.guildId, locale: interaction.locale })}`)
        ])
        if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: [first_row, second_row] })
        else return interaction.update({ embeds: [embed], components: [first_row, second_row] })

        function transformSecs(duration, guildId, locale) {
            let ms = parseInt((duration % 1000) / 100),
            secs = Math.floor((duration / 1000) % 60),
            mins = Math.floor((duration / (1000 * 60)) % 60),
            hrs = Math.floor((duration / (1000 * 60 * 60)) % 24)
            years = Math.floor(duration / (1000 * 60 * 60 * 24) / 365)
            months = Math.floor(duration / (1000 * 60 * 60 * 24 * 30) % 12)
            days = months ? Math.floor(duration / (1000 * 60 * 60 * 24) % 7) : Math.floor(duration / (1000 * 60 * 60 * 24) % 365)
            const array = []
            if (years) array.push(`${years} ${client.language({ textId: `${client.functions.plural(years)}`, guildId: guildId, locale: locale })}`)
            if (months) array.push(`${months} ${client.language({ textId: "mo", guildId: guildId, locale: locale })}.`)
            if (days) array.push(`${days} ${client.language({ textId: "days", guildId: guildId, locale: locale })}.`)
            if (hrs) array.push(`${hrs} ${client.language({ textId: "HOURS_SMALL", guildId: guildId, locale: locale })}.`)
            if (mins) array.push(`${mins} ${client.language({ textId: "minutes", guildId: guildId, locale: locale })}.`)
            if (secs) array.push(`${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`)
            return array.join(" ")
        }
    }
}