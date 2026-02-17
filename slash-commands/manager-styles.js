const { TextInputStyle, ButtonBuilder, ButtonStyle, InteractionType, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, TextInputBuilder, ModalBuilder, Collection, LabelBuilder } = require("discord.js")
const { handleEmojiError } = require("../handler/componentUtils")
const StyleRegexp = /style{(.*?)}/
const UserRegexp = /usr{(.*?)}/
module.exports = {
    name: 'manager-styles',
    nameLocalizations: {
        'ru': `управление-стилями`,
        'uk': `управління-стилями`,
        'es-ES': `gestor-estilos`
    },
    description: 'Manage guild wormholes styles',
    descriptionLocalizations: {
        'ru': `Управление стилями червоточин сервера`,
        'uk': `Управління стилями червоточин сервера`,
        'es-ES': `Gestión de estilos de agujeros de gusano del servidor`
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
        let styles = await client.styleSchema.find({ guildID: interaction.guildId })
        const embed = new EmbedBuilder().setColor(3093046)
        if (!interaction.isChatInputCommand()) {
            if (interaction.customId.includes("new")) {
                if (styles.length >= settings.max_styles) return interaction.reply({ content: `${client.language({ textId: "Maximum styles reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_styles}`, flags: ["Ephemeral"] })
                const modal = new ModalBuilder()
                    .setCustomId(`newStyle_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "NEW STYLE: NAME", guildId: interaction.guildId, locale: interaction.locale })}`)
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
                                    .setPlaceholder(`${client.language({ textId: "Enter name for your style", guildId: interaction.guildId, locale: interaction.locale })}`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `newStyle_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 300000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (styles.find(e => e.styleName === modalArgs.name)) {
                        return interaction.reply({ content: `${client.language({ textId: "Style with this name already exists", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        const uniqid = require(`uniqid`)
                        const style = new client.styleSchema({
                            guildID: interaction.guildId,
                            styleID: uniqid.time(),
                            styleName: modalArgs.name,
                            appearance: {
                                author: {
                                    name: client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale }),
                                    iconURL: `https://i.imgur.com/gi8qKFX.gif`
                                },
                                description: `${client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale })} {item_emoji}{item_name} ${client.language({ textId: "appeared", guildId: interaction.guildId, locale: interaction.locale })}!`,
                                footer: {
                                    text: null,
                                    iconURL: null
                                },
                                thumbnailURL: null,
                                imageURL: null,
                                color: "#f59c02",
                                title: null,
                                button: {
                                    label: client.language({ textId: "Touch", guildId: interaction.guildId, locale: interaction.locale }),
                                    style: `PRIMARY`,
                                    emoji: `🤏`
                                }
                            },
                            collect: {
                                author: {
                                    name: client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale }),
                                    iconURL: `https://i.imgur.com/gi8qKFX.gif`
                                },
                                description: `{member_name} ${client.language({ textId: "claimed", guildId: interaction.guildId, locale: interaction.locale })} {item_emoji}{item_name} x{amount} ${client.language({ textId: "from wormhole", guildId: interaction.guildId, locale: interaction.locale })}`,
                                footer: {
                                    text: null,
                                    iconURL: null
                                },
                                thumbnailURL: null,
                                imageURL: null,
                                color: "#f59c02",
                                title: null,
                            }
                        })
                        await style.save()
                        styles = await client.styleSchema.find({ guildID: interaction.guildId })
                    }
                } else return
            }
            if (interaction.customId.includes("edit")) {
                let style = styles.find(e => { return e.styleID === interaction.values[0]})
                if (!style) style = styles.find(e => { return e.styleID === StyleRegexp.exec(interaction.customId)?.[1] })
                if (interaction.customId.includes("buttonStyle")) {
                    style.appearance.button.style = interaction.values[0]
                    await style.save()
                }
                if (interaction.values[0] === "появление - description, thumbnail, image, color, title") {
                    const modal = new ModalBuilder()
                        .setCustomId(`появление - description, thumbnail, image, color, title style{${style.styleID}}`)
                        .setTitle(`${client.language({ textId: "Appearance", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("description")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{item_emoji} - ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}\n{item_name} - ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.description ? style.appearance.description : "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("thumbnail")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Paste DIRECT link to image", guildId: interaction.guildId, locale: interaction.locale })}\n{item_image} - ${client.language({ textId: "item image", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.thumbnailURL ? style.appearance.thumbnailURL : "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("image")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Paste DIRECT link to image", guildId: interaction.guildId, locale: interaction.locale })}\n{item_image} - ${client.language({ textId: "item image", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.imageURL ? style.appearance.imageURL : "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Border color", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("color")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Write color in HEX format. Example: #FFFFFF", guildId: interaction.guildId, locale: interaction.locale })}\n{item_color} - ${client.language({ textId: "item color", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.color ? style.appearance.color : "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Title", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("title")
                                        .setMinLength(0)
                                        .setMaxLength(256)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{item_emoji} - ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}\n{item_name} - ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.title ? style.appearance.title : "")
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `появление - description, thumbnail, image, color, title style{${style.styleID}}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 300000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (!modalArgs.description.length && !modalArgs.title.length && !style.appearance.author.name && !style.appearance.footer.text) {
                            return interaction.reply({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        else {
                            if (modalArgs.description.length) style.appearance.description = modalArgs.description
                            else style.appearance.description = null
                            if (modalArgs.title.length) style.appearance.title = modalArgs.title
                            else style.appearance.title = null
                            await interaction.deferUpdate().catch(e => null)
                            if (modalArgs.thumbnail.length) {
                                if (modalArgs.thumbnail === "{item_image}") style.appearance.thumbnailURL = modalArgs.thumbnail
                                else {
                                    const isImageURL = require('image-url-validator').default
                                    const image = await isImageURL(modalArgs.thumbnail)
                                    if (image) style.appearance.thumbnailURL = modalArgs.thumbnail
                                    else {
                                        await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.thumbnail}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                    }    
                                }
                                
                            } else style.appearance.thumbnailURL = null
                            if (modalArgs.image.length) {
                                if (modalArgs.image === "{item_image}") style.appearance.imageURL = modalArgs.image
                                else {
                                    const isImageURL = require('image-url-validator').default
                                    const image = await isImageURL(modalArgs.image)
                                    if (image) style.appearance.imageURL = modalArgs.image
                                    else {
                                        await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.image}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })  
                                    }    
                                }
                                
                            } else style.appearance.imageURL = null
                            if (modalArgs.color.length && /^#?[\da-f]{6}$/i.test(modalArgs.color)) style.appearance.color = modalArgs.color
                            else {
                                if (modalArgs.color === "{item_color}" || modalArgs.color === "{member_color}") style.appearance.color = modalArgs.color
                                else style.appearance.color = "#2F3236"
                            }
                            await style.save()
                        }
                    } else return
                } else if (interaction.values[0] === "появление - header, footer") {
                    const modal = new ModalBuilder()
                        .setCustomId(`появление - header, footer style{${style.styleID}}`)
                        .setTitle(`${client.language({ textId: "Header, footer", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Header - Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("author_name")
                                        .setMinLength(0)
                                        .setMaxLength(256)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{item_emoji} - ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}\n{item_name} - ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.author.name || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Header - Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("author_icon")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Paste DIRECT link to image", guildId: interaction.guildId, locale: interaction.locale })}\n{item_image} - ${client.language({ textId: "item image", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.author.iconURL || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Footer - Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("footer_name")
                                        .setMinLength(0)
                                        .setMaxLength(256)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{item_emoji} - ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}\n{item_name} - ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.footer.text || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Footer - Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("footer_icon")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Paste DIRECT link to image", guildId: interaction.guildId, locale: interaction.locale })}\n{item_image} - ${client.language({ textId: "item image", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.footer.iconURL || "")
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `появление - header, footer style{${style.styleID}}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 300000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (!style.appearance.description && !style.appearance.title && !modalArgs.author_name && !modalArgs.footer_text) {
                            return interaction.reply({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        else {
                            await interaction.deferUpdate().catch(e => null)
                            if (modalArgs.author_name.length) {
                                style.appearance.author.name = modalArgs.author_name
                                if (modalArgs.author_icon.length) {
                                    if (modalArgs.author_icon === "{item_image}") style.appearance.author.iconURL = modalArgs.author_icon
                                    else {
                                        const isImageURL = require('image-url-validator').default
                                        const image = await isImageURL(modalArgs.author_icon)
                                        if (image) style.appearance.author.iconURL = modalArgs.author_icon
                                        else {
                                            await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.author_icon}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                        }    
                                    }
                                } else style.appearance.author.iconURL = null
                            }
                            else {
                                style.appearance.author.name = null
                                style.appearance.author.iconURL = null
                            }
                            if (modalArgs.footer_name.length) {
                                style.appearance.footer.text = modalArgs.footer_name
                                if (modalArgs.footer_icon.length) {
                                    if (modalArgs.footer_icon === "{item_image}") style.appearance.footer.iconURL = modalArgs.footer_icon
                                    else {
                                        const isImageURL = require('image-url-validator').default
                                        const image = await isImageURL(modalArgs.footer_icon)
                                        if (image) style.appearance.footer.iconURL = modalArgs.footer_icon
                                        else {
                                            await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.footer_icon}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                        }    
                                    }
                                } else style.appearance.footer.iconURL = null
                            }
                            else {
                                style.appearance.footer.text = null
                                style.appearance.footer.iconURL = null
                            }
                            await style.save()
                        }
                    } else return
                } else if (interaction.values[0] === "button emoji, button text") {
                    const modal = new ModalBuilder()
                        .setCustomId(`button emoji, button text style{${style.styleID}}`)
                        .setTitle(`${client.language({ textId: "Button emoji, button text", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("emoji")
                                        .setMinLength(0)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "For server emoji insert emoji ID (/emojis)", guildId: interaction.guildId, locale: interaction.locale })}\n{item_emoji} - ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.button.emoji || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Text", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("label")
                                        .setMinLength(1)
                                        .setMaxLength(80)
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{item_name} - ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.appearance.button.label || "")
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `button emoji, button text style{${style.styleID}}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 300000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        style.appearance.button.label = modalArgs.label
                        await interaction.deferUpdate().catch(e => null)
                        if (modalArgs.emoji.length) {
                            if (modalArgs.emoji === `{item_emoji}`) {
                                style.appearance.button.emoji = `{item_emoji}`
                            } else {
                                const node_emoji = require(`node-emoji`)
                                const isDefaultEmoji = node_emoji.hasEmoji(modalArgs.emoji)
                                const emoji = !isDefaultEmoji ? await client.functions.getEmoji(client, modalArgs.emoji) : modalArgs.emoji
                                if (!isDefaultEmoji && emoji === "❓") {
                                    await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.emoji}** ${client.language({ textId: "does not contain emoji or contains unsupported emoji", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                } else {
                                    style.appearance.button.emoji = modalArgs.emoji
                                }
                            }
                        }
                        await style.save()
                    } else return
                } else if (interaction.values[0] === "сбор - description, thumbnail, image, color, title") {
                    const modal = new ModalBuilder()
                        .setCustomId(`сбор - description, thumbnail, image, color, title style{${style.styleID}}`)
                        .setTitle(`${client.language({ textId: "Collection", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("description")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{member_name} ${client.language({ textId: "member name", guildId: interaction.guildId, locale: interaction.locale })}\n{item_emoji} ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}\n{item_name} ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}\n{amount} ${client.language({ textId: "qty", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.description || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("thumbnail")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Paste DIRECT link to image", guildId: interaction.guildId, locale: interaction.locale })}\n{item_image} ${client.language({ textId: "item image", guildId: interaction.guildId, locale: interaction.locale })}\n{member_avatar} ${client.language({ textId: "member avatar", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.thumbnailURL || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("image")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Paste DIRECT link to image", guildId: interaction.guildId, locale: interaction.locale })}\n{item_image} ${client.language({ textId: "item image", guildId: interaction.guildId, locale: interaction.locale })}\n{member_avatar} ${client.language({ textId: "member avatar", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.imageURL || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Border color", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("color")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Write color in HEX format", guildId: interaction.guildId, locale: interaction.locale })}\n{item_color} ${client.language({ textId: "item color", guildId: interaction.guildId, locale: interaction.locale })}\n{member_color} ${client.language({ textId: "member color", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.color || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Title", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("title")
                                        .setMinLength(0)
                                        .setMaxLength(256)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{member_name} ${client.language({ textId: "member name", guildId: interaction.guildId, locale: interaction.locale })}\n{item_emoji} ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}\n{item_name} ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}\n{amount} ${client.language({ textId: "qty", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.title || "")
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `сбор - description, thumbnail, image, color, title style{${style.styleID}}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 300000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (!modalArgs.description.length && !modalArgs.title.length && !style.collect.author.name && !style.collect.footer.text) {
                            return interaction.reply({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        else {
                            await interaction.deferUpdate()
                            if (modalArgs.description.length) style.collect.description = modalArgs.description
                            else style.collect.description = null
                            if (modalArgs.title.length) style.collect.title = modalArgs.title
                            else style.collect.title = null
                            if (modalArgs.thumbnail.length) {
                                if (modalArgs.thumbnail === "{item_image}" || modalArgs.thumbnail === "{member_avatar}") style.collect.thumbnailURL = modalArgs.thumbnail
                                else {
                                    const isImageURL = require('image-url-validator').default
                                    const image = await isImageURL(modalArgs.thumbnail)
                                    if (image) style.collect.thumbnailURL = modalArgs.thumbnail
                                    else {
                                        await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.thumbnail}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                    }    
                                }
                                
                            } else style.collect.thumbnailURL = null
                            if (modalArgs.image.length) {
                                if (modalArgs.image === "{item_image}" || modalArgs.image === "{member_avatar}") style.collect.imageURL = modalArgs.image
                                else {
                                    const isImageURL = require('image-url-validator').default
                                    const image = await isImageURL(modalArgs.image)
                                    if (image) style.collect.imageURL = modalArgs.image
                                    else {
                                        await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.image}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })  
                                    }    
                                }
                                
                            } else style.collect.imageURL = null
                            if (modalArgs.color.length && /^#?[\da-f]{6}$/i.test(modalArgs.color)) style.collect.color = modalArgs.color
                            else {
                                if (modalArgs.color === "{item_color}" || modalArgs.color === "{member_color}") style.collect.color = modalArgs.color
                                else style.collect.color = "#2F3236"
                            }
                            await style.save()
                        }
                    } else return
                } else if (interaction.values[0] === "сбор - header, footer") {
                    const modal = new ModalBuilder()
                        .setCustomId(`сбор - header, footer style{${style.styleID}}`)
                        .setTitle(`${client.language({ textId: "Header, footer", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Header - Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("author_name")
                                        .setMinLength(0)
                                        .setMaxLength(256)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{member_name} ${client.language({ textId: "member name", guildId: interaction.guildId, locale: interaction.locale })}\n{item_emoji} ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}\n{item_name} ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}\n{amount} ${client.language({ textId: "qty", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.author.name || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Header - Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("author_icon")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Paste DIRECT link to image", guildId: interaction.guildId, locale: interaction.locale })}\n{item_image} ${client.language({ textId: "item image", guildId: interaction.guildId, locale: interaction.locale })}\n{member_avatar} ${client.language({ textId: "member avatar", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.author.iconURL || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Footer - Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("footer_name")
                                        .setMinLength(0)
                                        .setMaxLength(256)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`{member_name} ${client.language({ textId: "member name", guildId: interaction.guildId, locale: interaction.locale })}\n{item_emoji} ${client.language({ textId: "item emoji", guildId: interaction.guildId, locale: interaction.locale })}\n{item_name} ${client.language({ textId: "item name", guildId: interaction.guildId, locale: interaction.locale })}\n{amount} ${client.language({ textId: "qty", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.footer.text || "")
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Footer - Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("footer_icon")
                                        .setMinLength(0)
                                        .setMaxLength(4000)
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Paragraph)
                                        .setPlaceholder(`${client.language({ textId: "Paste DIRECT link to image", guildId: interaction.guildId, locale: interaction.locale })}\n{item_image} ${client.language({ textId: "item image", guildId: interaction.guildId, locale: interaction.locale })}\n{member_avatar} ${client.language({ textId: "member avatar", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setValue(style.collect.footer.iconURL || "")
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `сбор - header, footer style{${style.styleID}}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 300000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (!style.collect.description && !style.collect.title && !modalArgs.author_name && !modalArgs.footer_text) {
                            await interaction.reply({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        else {
                            await interaction.deferUpdate().catch(e => null)
                            if (modalArgs.author_name.length) {
                                style.collect.author.name = modalArgs.author_name
                                if (modalArgs.author_icon.length) {
                                    if (modalArgs.author_icon === "{item_image}" || modalArgs.author_icon === "{member_avatar}") style.collect.author.iconURL = modalArgs.author_icon
                                    else {
                                        const isImageURL = require('image-url-validator').default
                                        const image = await isImageURL(modalArgs.author_icon)
                                        if (image) style.collect.author.iconURL = modalArgs.author_icon
                                        else {
                                            await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.author_icon}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                        }    
                                    }
                                } else style.collect.author.iconURL = null
                            }
                            else {
                                style.collect.author.name = null
                                style.collect.author.iconURL = null
                            }
                            if (modalArgs.footer_name.length) {
                                style.collect.footer.text = modalArgs.footer_name
                                if (modalArgs.footer_icon.length) {
                                    if (modalArgs.footer_icon === "{item_image}" || modalArgs.footer_icon === "{member_avatar}") style.collect.footer.iconURL = modalArgs.footer_icon
                                    else {
                                        const isImageURL = require('image-url-validator').default
                                        const image = await isImageURL(modalArgs.footer_icon)
                                        if (image) style.collect.footer.iconURL = modalArgs.footer_icon
                                        else {
                                            await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.footer_icon}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                        }    
                                    }
                                } else style.collect.footer.iconURL = null
                            }
                            else {
                                style.collect.footer.text = null
                                style.collect.footer.iconURL = null
                            }
                            await style.save()
                        }
                    } else return
                }
                const appearanceEmbed = new EmbedBuilder()
                if (style.appearance.author.name) appearanceEmbed.setAuthor({ name: style.appearance.author.name.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, `${client.config.emojis.box}`).replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).slice(0, 2048), iconURL: style.appearance.author.iconURL?.replace(/{item_image}/i, `https://cdn-0.emojis.wiki/emoji-pics/facebook/package-facebook.png`).replace(/{member_avatar}/i, interaction.member.displayAvatarURL()) })
                if (style.appearance.description) appearanceEmbed.setDescription(style.appearance.description.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, `${client.config.emojis.box}`).replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).slice(0, 4096))
                if (style.appearance.footer.text) appearanceEmbed.setFooter({ text: style.appearance.footer.text.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, `${client.config.emojis.box}`).replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).slice(0, 2048), iconURL: style.appearance.footer.iconURL?.replace(/{item_image}/i, `https://cdn-0.emojis.wiki/emoji-pics/facebook/package-facebook.png`).replace(/{member_avatar}/i, interaction.member.displayAvatarURL()) })
                appearanceEmbed.setThumbnail(style.appearance.thumbnailURL?.replace(/{item_image}/i, `https://cdn-0.emojis.wiki/emoji-pics/facebook/package-facebook.png`))
                appearanceEmbed.setImage(style.appearance.imageURL?.replace(/{item_image}/i, `https://cdn-0.emojis.wiki/emoji-pics/facebook/package-facebook.png`))
                appearanceEmbed.setColor(style.appearance.color.replace(/{item_color}/i, `#FFFFFF`))
                if (style.appearance.title) appearanceEmbed.setTitle(style.appearance.title.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, `${client.config.emojis.box}`).replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).slice(0, 256))
                const collectEmbed = new EmbedBuilder()
                if (style.collect.author.name) collectEmbed.setAuthor({ name: style.collect.author.name.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, `📦`).replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).replace(/{amount}/gi, `42`).slice(0, 2048), iconURL: style.collect.author.iconURL?.replace(/{item_image}/i, `https://cdn-0.emojis.wiki/emoji-pics/facebook/package-facebook.png`).replace(/{member_avatar}/i, interaction.member.displayAvatarURL()) })
                if (style.collect.description) collectEmbed.setDescription(style.collect.description.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, `${client.config.emojis.box}`).replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).replace(/{amount}/gi, `42`).slice(0, 4096))
                if (style.collect.footer.text) collectEmbed.setFooter({ text: style.collect.footer.text.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, `📦`).replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).replace(/{amount}/gi, `42`).slice(0, 2048), iconURL: style.collect.footer.iconURL?.replace(/{item_image}/i, `https://cdn-0.emojis.wiki/emoji-pics/facebook/package-facebook.png`).replace(/{member_avatar}/i, interaction.member.displayAvatarURL()) })
                collectEmbed.setThumbnail(style.collect.thumbnailURL?.replace(/{item_image}/i, `https://cdn-0.emojis.wiki/emoji-pics/facebook/package-facebook.png`).replace(/{member_avatar}/i, interaction.member.displayAvatarURL()))
                collectEmbed.setImage(style.collect.imageURL?.replace(/{item_image}/i, `https://cdn-0.emojis.wiki/emoji-pics/facebook/package-facebook.png`).replace(/{member_avatar}/i, interaction.member.displayAvatarURL()))
                collectEmbed.setColor(style.collect.color.replace(/{member_color}/i, interaction.member.displayHexColor).replace(/{item_color}/i, `#FFFFFF`))
                if (style.collect.title) collectEmbed.setTitle(style.collect.title.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, `📦`).replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).replace(/{amount}/gi, `42`).slice(0, 256))
                const row = new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId(`0`)
                        .setStyle(style.appearance.button.style === "SUCCESS" ? ButtonStyle.Success : style.appearance.button.style === "DANGER" ? ButtonStyle.Danger : style.appearance.button.style === "SECONDARY" ? ButtonStyle.Secondary : style.appearance.button.style === "PRIMARY" ? ButtonStyle.Primary : ButtonStyle.Link)
                        .setLabel(style.appearance.button.label.replace(/{item_name}/gi, `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`).slice(0, 80))
                        .setEmoji(style.appearance.button.emoji === "{item_emoji}" ? client.config.emojis.box : await client.functions.getEmoji(client, style.appearance.button.emoji))
                ])
                const row2 = new ActionRowBuilder().addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId(`style{${style.styleID}}cmd{manager-styles} edit1 usr{${interaction.user.id}}`)
                        .addOptions([
                            {
                                label: `${client.language({ textId: "Change description, thumbnail, image, color, title", guildId: interaction.guildId, locale: interaction.locale })}`,
                                value: `появление - description, thumbnail, image, color, title`
                            },
                            {
                                label: `${client.language({ textId: "Change header, footer", guildId: interaction.guildId, locale: interaction.locale })}`,
                                value: `появление - header, footer`
                            },
                            {
                                label: `${client.language({ textId: "Change button emoji, button text", guildId: interaction.guildId, locale: interaction.locale })}`,
                                value: `button emoji, button text`
                            }
                        ])
                        .setPlaceholder(`${client.language({ textId: "Change appearance style", guildId: interaction.guildId, locale: interaction.locale })}...`)
                ])
                const row3 = new ActionRowBuilder().addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId(`style{${style.styleID}}cmd{manager-styles} edit2 usr{${interaction.user.id}}`)
                        .addOptions([
                            {
                                label: `${client.language({ textId: "Change description, thumbnail, image, color, title", guildId: interaction.guildId, locale: interaction.locale })}`,
                                value: `сбор - description, thumbnail, image, color, title`
                            },
                            {
                                label: `${client.language({ textId: "Change header, footer", guildId: interaction.guildId, locale: interaction.locale })}`,
                                value: `сбор - header, footer`
                            }
                        ])
                        .setPlaceholder(`${client.language({ textId: "Change collection style", guildId: interaction.guildId, locale: interaction.locale })}...`)
                ])
                const row4 = new ActionRowBuilder().addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId(`style{${style.styleID}}cmd{manager-styles} edit_buttonStyle usr{${interaction.user.id}}`)
                        .addOptions([
                            {
                                label: `${client.language({ textId: "Green button", guildId: interaction.guildId, locale: interaction.locale })}`,
                                emoji: `🟢`,
                                value: `SUCCESS`,
                                default: style.appearance.button.style === "SUCCESS" ? true : false
                            },
                            {
                                label: `${client.language({ textId: "Blue button", guildId: interaction.guildId, locale: interaction.locale })}`,
                                emoji: `🔵`,
                                value: `PRIMARY`,
                                default: style.appearance.button.style === "PRIMARY" ? true : false
                            },
                            {
                                label: `${client.language({ textId: "Gray button", guildId: interaction.guildId, locale: interaction.locale })}`,
                                emoji: `⚪`,
                                value: `SECONDARY`,
                                default: style.appearance.button.style === "SECONDARY" ? true : false
                            },
                            {
                                label: `${client.language({ textId: "Red button", guildId: interaction.guildId, locale: interaction.locale })}`,
                                emoji: `🔴`,
                                value: `DANGER`,
                                default: style.appearance.button.style === "DANGER" ? true : false
                            }
                        ])
                        .setPlaceholder(`${client.language({ textId: "Change button style", guildId: interaction.guildId, locale: interaction.locale })}`)
                ])
                const row5 = new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setCustomId(`cmd{manager-styles}usr{${interaction.user.id}}`)
                        .setLabel(`${client.language({ textId: "BACK", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setStyle(ButtonStyle.Danger)
                ])
                const components = [row, row2, row3, row4, row5]
                const length = [appearanceEmbed, collectEmbed].reduce((acc, embed) => {
                    embed.data.description ? acc += embed.data.description.length : acc += 0
                    embed.data.title ? acc += embed.data.title.length : acc += 0
                    embed.data.author ? acc += embed.data.author.name?.length : acc += 0
                    embed.data.footer ? acc += embed.data.footer.text?.length : acc += 0
                    return embed.data.fields ? acc += embed.data.fields.reduce((acc2, field) => {
                    return acc2 += field.name?.length + field.value?.length
                    }, 0) : acc += 0
                }, 0)
                if (length > 6000) {
                    if (interaction.deferred || interaction.replied) return interaction.editReply({ content: `${client.language({ textId: "Total characters in all Title, Description, Field-name, Field-value, Footer and Header fields in all embeds attached to message must not exceed 6000 characters.", guildId: interaction.guildId, locale: interaction.locale })}`, components: components, embeds: [] })
                    else return interaction.update({ content: `${client.language({ textId: "Total characters in all Title, Description, Field-name, Field-value, Footer and Header fields in all embeds attached to message must not exceed 6000 characters.", guildId: interaction.guildId, locale: interaction.locale })}`, components: components, embeds: [] })
                }
                if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [collectEmbed, appearanceEmbed], components: components }).catch(e => {
                    if (handleEmojiError(e, components)) {
                        interaction.editReply({ embeds: [collectEmbed, appearanceEmbed], components: components })
                    } else client.functions.sendError(e)
                })
                else return interaction.update({ embeds: [collectEmbed, appearanceEmbed], components: components }).catch(e => {
                    if (handleEmojiError(e, components)) {
                        interaction.update({ embeds: [collectEmbed, appearanceEmbed], components: components })
                    } else client.functions.sendError(e)
                })
            }
            if (interaction.customId.includes("delete")) {
                await client.styleSchema.deleteOne({ guildID: interaction.guildId, styleID: interaction.values[0]})
                client.cache.wormholes.filter(e => e.guildID === interaction.guildId && e.styleID === interaction.values[0]).forEach(wormhole => {
                    wormhole.styleID = null
                    wormhole.save()
                })
                styles = await client.styleSchema.find({ guildID: interaction.guildId })
            }
        }
        embed.setTitle(`${client.language({ textId: "STYLES", guildId: interaction.guildId, locale: interaction.locale })} ${styles.length}/${settings.max_styles}`)
        let optionsEdit = [{ label: "0", value: "0" }]
        let optionsDelete = [{ label: "0", value: "0" }]
        if (!styles.length) {
            embed.setDescription(`${client.language({ textId: "No styles.", guildId: interaction.guildId, locale: interaction.locale })}`)
        } else {
            let index = 1
            const description = []
            optionsEdit = []
            optionsDelete = []
            for (const style of styles) {
                description.push(`${index}. ***${style.styleName}***`)
                optionsEdit.push({ label: style.styleName, value: style.styleID })
                optionsDelete.push({ label: style.styleName, value: style.styleID })
                index++
            }
            embed.setDescription(description.join("\n"))
        }
        const first_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-styles} edit usr{${interaction.user.id}}`).addOptions(optionsEdit).setPlaceholder(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale })}...`).setDisabled(styles.length ? false: true)])
        const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-styles} delete usr{${interaction.user.id}}`).addOptions(optionsDelete).setPlaceholder(`${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })}...`).setDisabled(styles.length ? false: true)])
        const third_row = new ActionRowBuilder().addComponents([new ButtonBuilder().setCustomId(`cmd{manager-styles} new usr{${interaction.user.id}}`).setStyle(ButtonStyle.Success).setLabel(`${client.language({ textId: "CREATE", guildId: interaction.guildId, locale: interaction.locale })}`).setEmoji(client.config.emojis.plus)])
        if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: [first_row, second_row, third_row] })
        else return interaction.update({ embeds: [embed], components: [first_row, second_row, third_row] })
    }
}