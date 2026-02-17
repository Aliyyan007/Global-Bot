const { TextInputStyle, ButtonBuilder, ButtonStyle, InteractionType, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, TextInputBuilder, ModalBuilder, SlashCommandIntegerOption, Collection, LabelBuilder } = require("discord.js")
const { handleEmojiError, UNKNOWN_EMOJI_ID } = require("../handler/componentUtils")
const UserRegexp = /usr{(.*?)}/
const CatRegexp = /cat{(.*?)}/
module.exports = {
    name: 'manager-categories',
    nameLocalizations: {
        'ru': `управление-категориями`,
        'uk': `управління-категоріями`,
        'es-ES': `gestión-categorías`
    },
    description: 'Manage shop categories',
    descriptionLocalizations: {
        'ru': `Управление категориями магазина`,
        'uk': `Управління категоріями магазину`,
        'es-ES': `Gestión de categorías de la tienda`
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
        let categories = await client.shopCategorySchema.find({ guildID: interaction.guildId })
        const embed = new EmbedBuilder().setColor(3093046)
        if (!interaction.isChatInputCommand()) {
            if (interaction.customId.includes("new")) {
                if (categories.length >= settings.max_categories) return interaction.reply({ content: `${client.language({ textId: "Maximum categories reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_categories}`, flags: ["Ephemeral"] })
                const modal = new ModalBuilder()
                    .setCustomId(`newCategory usr{${interaction.user.id}}`)
                    .setTitle(`${client.language({ textId: "NEW CATEGORY", guildId: interaction.guildId, locale: interaction.locale })}`)
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
                                    .setPlaceholder(`${client.language({ textId: "Enter name for your category", guildId: interaction.guildId, locale: interaction.locale })}`)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("emoji")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder(`${client.language({ textId: "Insert emoji for your category or emoji ID", guildId: interaction.guildId, locale: interaction.locale })}`)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `newCategory usr{${interaction.user.id}}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (categories.find(e => e.name === modalArgs.name)) {
                        return interaction.reply({ content: `${client.language({ textId: "Category with this name already exists", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.emoji) {
                            const node_emoji = require(`node-emoji`)
                            const isDefaultEmoji = node_emoji.hasEmoji(modalArgs.emoji)
                            const emoji = !isDefaultEmoji ? await client.functions.getEmoji(client, modalArgs.emoji) : modalArgs.emoji
                            if (!isDefaultEmoji && emoji === "❓"){
                                await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.emoji}** ${client.language({ textId: "does not contain emoji or contains unsupported emoji", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                delete modalArgs.emoji
                            }    
                        }
                        const uniqid = require(`uniqid`)
                        const category = new client.shopCategorySchema({
                            guildID: interaction.guildId,
                            categoryID: uniqid.time(),
                            name: modalArgs.name,
                            roles: [],
                            filter: null,
                            default: false,
                            items: [],
                            emoji: modalArgs.emoji || undefined
                        })
                        await category.save().catch(e => console.error(e))
                        categories = await client.shopCategorySchema.find({ guildID: interaction.guildId })
                    }
                } else return   
            }
            if (interaction.customId.includes("edit")) {
                let category = categories.find(e => { return e.categoryID === interaction.values?.[0]})
                if (!category) category = categories.find(e => { return e.categoryID === CatRegexp.exec(interaction.customId)?.[1] })
                if (!category) {
                    await interaction.deferUpdate()
                    return interaction.followUp({ content: `${client.language({ textId: "Such category does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (interaction.isStringSelectMenu() && interaction.values[0] === "name") {
                    const modal = new ModalBuilder()
                        .setCustomId(`editCategoryName usr{${category.categoryID}}`)
                        .setTitle(`${client.language({ textId: "NAME", guildId: interaction.guildId, locale: interaction.locale })}`)
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
                                        .setPlaceholder(`${client.language({ textId: "Enter name for your category", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(category.name)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `editCategoryName usr{${category.categoryID}}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (categories.find(e => e.name === modalArgs.name)) {
                            await interaction.deferUpdate()
                            await interaction.followUp({ content: `${client.language({ textId: "Category with this name already exists", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        } else {
                            category.name = modalArgs.name
                            await category.save()
                        }
                    } else return
                } else if (interaction.isStringSelectMenu() && interaction.values[0] === "emoji") {
                    const modal = new ModalBuilder()
                        .setCustomId(`editCategoryEmoji usr{${category.categoryID}}`)
                        .setTitle(`${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("emoji")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder(`${client.language({ textId: "Insert emoji for your category or emoji ID", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(category.emoji || "")
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `editCategoryEmoji usr{${category.categoryID}}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (modalArgs.emoji) {
                            const node_emoji = require(`node-emoji`)
                            const isDefaultEmoji = node_emoji.hasEmoji(modalArgs.emoji)
                            const emoji = !isDefaultEmoji ? await client.functions.getEmoji(client, modalArgs.emoji) : modalArgs.emoji
                            if (!isDefaultEmoji && emoji === "❓"){
                                await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.emoji}** ${client.language({ textId: "does not contain emoji or contains unsupported emoji", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                delete modalArgs.emoji
                            }
                            if (modalArgs.emoji) {
                                category.emoji = modalArgs.emoji
                                await category.save()    
                            }
                        } else {
                            delete category.emoji
                            await category.save()
                        }
                    } else return
                } else if (interaction.isStringSelectMenu() && interaction.values[0] === "items") {
                    const modal = new ModalBuilder()
                        .setCustomId(`editCategoryItems usr{${category.categoryID}}`)
                        .setTitle(`${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("item")
                                        .setMinLength(2)
                                        .setMaxLength(30)
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder(`${client.language({ textId: "Item name || Item ID", guildId: interaction.guildId, locale: interaction.locale })}`)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `editCategoryItems usr{${category.categoryID}}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (modalArgs.item) {
                            const item = client.cache.items.find(e => e.guildID === interaction.guildId && (e.name === modalArgs.item || e.itemID === modalArgs.item))
                            if (item) {
                                if (category.items.includes(item.itemID)) category.items = category.items.filter(e => e !== item.itemID)
                                else category.items.push(item.itemID)
                                await category.save()
                            } else {
                                await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} Предмет с названием или ID **${modalArgs.item}** не найден`, flags: ["Ephemeral"] })
                            }
                        }
                    } else return
                } else if (interaction.isStringSelectMenu() && interaction.values[0] === "default") {
                    await client.shopCategorySchema.findOneAndUpdate({ guildID: interaction.guildId, default: true }, { $set: { default: false } })
                    category.default = !category.default
                    await category.save()
                }
                const emoji = await client.functions.getEmoji(client, category.emoji)
                embed.setTitle(`${category.emoji ? emoji : ""}${category.name}`)
                let array = []
                let count = 1
                let countTotal = 1
                const items = client.cache.items.filter(e => e.guildID === interaction.guildId && category.items.includes(e.itemID))
                items.forEach(item => {
                    array.push([`${item.category ? '🕐' : ``}${!item.enabled ? `🌫️` : ``}${!item.found ? "❓" : ``} ${countTotal}. ${item.displayEmoji}${item.name}`])
                    if (count === 20 || items.size === countTotal) {
                        embed.addFields([{ name: `\u200B`, value: array.join("\n").slice(0, 1023) }])
                        array = []
                        count = 0
                    }
                    count++
                    countTotal++
                })
                embed.setDescription(`🕐 - ${client.language({ textId: "uncreated (temporary) item", guildId: interaction.guildId, locale: interaction.locale })}\n🌫️ - ${client.language({ textId: "invisible item (disabled)", guildId: interaction.guildId, locale: interaction.locale })}\n❓ - ${client.language({ textId: "unknown (unlearned) item", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}:`)
                const row = new ActionRowBuilder().addComponents([
                    new StringSelectMenuBuilder().setCustomId(`cat{${category.categoryID}}cmd{manager-categories} edit usr{${interaction.user.id}}`).setOptions([
                        {
                            label: `${client.language({ textId: "Change name", guildId: interaction.guildId, locale: interaction.locale })}`,
                            description: category.name,
                            value: `name`
                        },
                        {
                            label: `${client.language({ textId: "Change emoji", guildId: interaction.guildId, locale: interaction.locale })}`,
                            value: `emoji`,
                            emoji: category.emoji ? emoji : undefined
                        },
                        {
                            label: `${client.language({ textId: "Add/remove items from category", guildId: interaction.guildId, locale: interaction.locale })}`,
                            description: `${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}: ${category.items.length}`,
                            value: `items`
                        },
                        {
                            label: `${client.language({ textId: "Standard category", guildId: interaction.guildId, locale: interaction.locale })}: ${category.default ? `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                            value: `default`
                        },
                    ])
                ])
                const row2 = new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId(`cmd{manager-categories} usr{${interaction.user.id}}`)
                        .setLabel(client.language({ textId: "BACK", guildId: interaction.guildId, locale: interaction.locale }))
                        .setStyle(ButtonStyle.Danger)
                ])
                const components = [row, row2]
                if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [embed], components: components }).catch(e => {
                    if (handleEmojiError(e, components, UNKNOWN_EMOJI_ID)) {
                        interaction.editReply({ embeds: [embed], components: components })
                    } else client.functions.sendError(e)
                })
                else {
                    return interaction.update({ embeds: [embed], components: components }).catch(async e => {
                        if (handleEmojiError(e, components, UNKNOWN_EMOJI_ID)) {
                            interaction.update({ embeds: [embed], components: components })
                        } else client.functions.sendError(e)
                    })
                }
            }
            if (interaction.customId.includes("delete")) {
                await client.shopCategorySchema.findOneAndDelete({ guildID: interaction.guildId, categoryID: interaction.values[0]})
                categories = await client.shopCategorySchema.find({ guildID: interaction.guildId })
            }
        }
        embed.setTitle(`${client.language({ textId: "CATEGORIES", guildId: interaction.guildId, locale: interaction.locale })} ${categories.length}/${settings.max_categories}`)
        let optionsEdit = [{ label: "0", value: "0" }]
        let optionsDelete = [{ label: "0", value: "0" }]
        if (!categories.length) {
            embed.setDescription(`${client.language({ textId: "No categories.", guildId: interaction.guildId, locale: interaction.locale })}`)
        } else {
            let index = 1
            const description = []
            optionsEdit = []
            optionsDelete = []
            for (const category of categories) {
                const emoji = await client.functions.getEmoji(client, category.emoji)
                description.push(`${index}. ${category.emoji ? emoji : ""}***${category.name}***`)
                optionsEdit.push({ label: category.name, value: category.categoryID, emoji: category.emoji ? emoji : undefined })
                optionsDelete.push({ label: category.name, value: category.categoryID, emoji: category.emoji ? emoji : undefined })
                index++
            }
            embed.setDescription(description.join("\n"))
        }
        const first_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-categories} edit usr{${interaction.user.id}}`).addOptions(optionsEdit).setPlaceholder(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale })}...`).setDisabled(categories.length ? false: true)])
        const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-categories} delete usr{${interaction.user.id}}`).addOptions(optionsDelete).setPlaceholder(`${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })}...`).setDisabled(categories.length ? false: true)])
        const third_row = new ActionRowBuilder().addComponents([new ButtonBuilder().setCustomId(`cmd{manager-categories} new usr{${interaction.user.id}}`).setStyle(ButtonStyle.Success).setLabel(`${client.language({ textId: "CREATE", guildId: interaction.guildId, locale: interaction.locale })}`).setEmoji(client.config.emojis.plus)])
        const components = [first_row, second_row, third_row]
        if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: components }).catch(e => {
            if (handleEmojiError(e, components, UNKNOWN_EMOJI_ID)) {
                interaction.reply({ embeds: [embed], components: components })
            } else client.functions.sendError(e)
        })
        else {
            if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: components }).catch(e => {
                if (handleEmojiError(e, components, UNKNOWN_EMOJI_ID)) {
                    interaction.editReply({ embeds: [embed], components: components })
                } else client.functions.sendError(e)
            })
            else {
                return interaction.update({ embeds: [embed], components: components }).catch(e => {
                    if (handleEmojiError(e, components, UNKNOWN_EMOJI_ID)) {
                        interaction.update({ embeds: [embed], components: components })
                    } else client.functions.sendError(e)
                })
            }
        }
    }
}