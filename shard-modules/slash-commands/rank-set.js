const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, TextInputStyle, TextInputBuilder, ModalBuilder, InteractionType, Collection, LabelBuilder } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const TypeRegexp = /type{(.*?)}/

// Helper function to convert HEX to RGB
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '')
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('')
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

// Helper function to convert RGB to HEX
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }).join('')
}

// Helper function to validate HEX color
function isValidHex(hex) {
    return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

// Helper function to fetch image as buffer (handles Discord CDN URLs)
async function fetchImageBuffer(url) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
}
module.exports = {
    name: "rank-set",
    nameLocalizations: {
        "ru": `ранг-установить`,
        "uk": `ранг-встановити`,
        "es-ES": `establecer-rango`
    },
    description: `Set custom settings for rank card`,
    descriptionLocalizations: {
       "ru": `Установить свои свойства для карточки ранга`,
       "uk": `Встановити свої властивості для картки рангу`,
       "es-ES": `Establecer configuraciones personalizadas para la tarjeta de rango`
    },
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        // Allow UCP buttons to bypass user check
        const isFromUCP = args?.fromUCP
        if (!isFromUCP && UserRegexp.exec(interaction.customId) && interaction.user.id !== UserRegexp.exec(interaction.customId)[1]) return interaction.deferUpdate().catch(e => null)
        const flags = []
        if (interaction.isChatInputCommand() || interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || args?.ephemeral) flags.push("Ephemeral")
        // Skip deferReply if already deferred (from UCP buttons)
        if (!interaction.deferred && (interaction.isChatInputCommand() || interaction.customId?.includes("reply"))) await interaction.deferReply({ flags })
        const cachedSettings = client.cache.settings.get(interaction.guildId)
        let settings = cachedSettings
        const { member } = interaction
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        let globalUser = await client.globalProfileSchema.findOne({ userID: member.user.id }).lean()
        let serverCard = false
        if (interaction.isStringSelectMenu()) {
            serverCard = interaction.values[0] === "serverCard"
        }
        else if (!interaction.isChatInputCommand()) {
            serverCard = TypeRegexp.exec(interaction.customId)?.[1] == "serverCard" ? true : false
        }
        const embed = new EmbedBuilder().setColor(3093046).setDescription(`${client.language({ textId: `HEX color can be selected on this site`, guildId: interaction.guildId, locale: interaction.locale })}: https://rgbacolorpicker.com/hex-color-picker`)
        if (serverCard) {
            // Fetch actual settings document for modifications
            settings = await client.settingsSchema.findOne({ guildID: interaction.guildId })
            if (interaction.customId.includes("image")) {
                const modal = new ModalBuilder()
                    .setCustomId(`rankImage_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Direct link to background", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("link")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setPlaceholder(`${client.language({ textId: "Recommended image 900x300", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setValue(`${settings.rank_card.background || " "}`)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Brightness", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("brightness")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${settings.rank_card.background_brightness}`)
                                    .setPlaceholder(`0-200`)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Blur", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("blur")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${settings.rank_card.background_blur}`)
                                    .setPlaceholder(`0-100`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `rankImage_${interaction.id}` && i.user.id === interaction.user.id
                const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => null)
                if (modalInteraction && modalInteraction.type === InteractionType.ModalSubmit) {
                    interaction = modalInteraction
                    let boolean = true
                    const modalArgs = {}
                    const linkValue = interaction.fields.getTextInputValue("link")
                    const brightnessValue = interaction.fields.getTextInputValue("brightness")
                    const blurValue = interaction.fields.getTextInputValue("blur")
                    
                    modalArgs.link = linkValue ? linkValue.trim() : null
                    
                    // Validate brightness
                    if (brightnessValue && (isNaN(+brightnessValue) || !Number.isInteger(+brightnessValue))) {
                        boolean = false
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                        interaction.followUp({ content: `**${brightnessValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        let brightness = +brightnessValue
                        if (brightness < 0) brightness = 0
                        else if (brightness > 200) brightness = 200
                        modalArgs.brightness = brightness
                    }
                    
                    // Validate blur
                    if (blurValue && (isNaN(+blurValue) || !Number.isInteger(+blurValue))) {
                        boolean = false
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                        interaction.followUp({ content: `**${blurValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        let blur = +blurValue
                        if (blur < 0) blur = 0
                        else if (blur > 100) blur = 100
                        modalArgs.blur = blur
                    }
                    
                    if (modalArgs.link) {
                        // Validate image URL by attempting to load it
                        const { loadImage } = require('@napi-rs/canvas')
                        try {
                            const imageBuffer = await fetchImageBuffer(modalArgs.link)
                            await loadImage(imageBuffer)
                            settings.rank_card.background = modalArgs.link
                        } catch (e) {
                            if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                            return interaction.followUp({ content: `${client.language({ textId: "Error: link is not a direct link to background", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Example link", guildId: interaction.guildId, locale: interaction.locale })}: **https://cdn.discordapp.com/attachments/964635142889021500/978733897204531260/IMG_0608.jpg**`, flags: ["Ephemeral"] })
                        }
                    } else settings.rank_card.background = null
                    if (!boolean) return
                    settings.rank_card.background_brightness = modalArgs.brightness
                    settings.rank_card.background_blur = modalArgs.blur
                    settings.markModified('rank_card')
                    await settings.save().catch(e => null)
                    client.cache.settings.set(interaction.guildId, settings)
                    if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                } else return 
            }
            if (interaction.customId.includes("font")) {
                const currentHex = rgbToHex(settings.rank_card.font_color.r, settings.rank_card.font_color.g, settings.rank_card.font_color.b)
                const modal = new ModalBuilder()
                    .setCustomId(`rankFont_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Font color", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: `HEX color`, guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("hex")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(currentHex)
                                    .setPlaceholder(`#FFFFFF`)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Opacity", guildId: interaction.guildId, locale: interaction.locale })} (0-100)`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("opacity")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${Math.round(settings.rank_card.font_color.a * 100)}`)
                                    .setPlaceholder(`0-100`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `rankFont_${interaction.id}` && i.user.id === interaction.user.id
                const fontModalInteraction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => null)
                if (fontModalInteraction && fontModalInteraction.type === InteractionType.ModalSubmit) {
                    interaction = fontModalInteraction
                    const hexValue = interaction.fields.getTextInputValue("hex")
                    const opacityValue = interaction.fields.getTextInputValue("opacity")
                    
                    // Validate HEX
                    if (!isValidHex(hexValue)) {
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                        return interaction.followUp({ content: `**${hexValue}** ${client.language({ textId: "is not a valid HEX color", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Example", guildId: interaction.guildId, locale: interaction.locale })}: #FF5733`, flags: ["Ephemeral"] })
                    }
                    
                    const rgb = hexToRgb(hexValue)
                    
                    // Validate opacity
                    if (isNaN(+opacityValue) || !Number.isInteger(+opacityValue)) {
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                        return interaction.followUp({ content: `**${opacityValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    
                    let opacity = +opacityValue
                    if (opacity < 0) opacity = 0
                    else if (opacity > 100) opacity = 100
                    
                    settings.rank_card.font_color.r = rgb.r
                    settings.rank_card.font_color.g = rgb.g
                    settings.rank_card.font_color.b = rgb.b
                    settings.rank_card.font_color.a = opacity / 100
                    settings.markModified('rank_card')
                    await settings.save().catch(e => null)
                    client.cache.settings.set(interaction.guildId, settings)
                    if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                } else return  
            }
            if (interaction.customId.includes("xpforeground")) {
                const currentHex = rgbToHex(settings.rank_card.xp_color.r, settings.rank_card.xp_color.g, settings.rank_card.xp_color.b)
                const modal = new ModalBuilder()
                    .setCustomId(`rankxpforeground_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "XP line color", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: `HEX color`, guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("hex")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(currentHex)
                                    .setPlaceholder(`#5576FF`)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Opacity", guildId: interaction.guildId, locale: interaction.locale })} (0-100)`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("opacity")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${Math.round(settings.rank_card.xp_color.a * 100)}`)
                                    .setPlaceholder(`0-100`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const xpFgFilter = (i) => i.customId === `rankxpforeground_${interaction.id}` && i.user.id === interaction.user.id
                const xpFgModalInteraction = await interaction.awaitModalSubmit({ filter: xpFgFilter, time: 180000 }).catch(e => null)
                if (xpFgModalInteraction && xpFgModalInteraction.type === InteractionType.ModalSubmit) {
                    interaction = xpFgModalInteraction
                    const hexValue = interaction.fields.getTextInputValue("hex")
                    const opacityValue = interaction.fields.getTextInputValue("opacity")
                    
                    // Validate HEX
                    if (!isValidHex(hexValue)) {
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                        return interaction.followUp({ content: `**${hexValue}** ${client.language({ textId: "is not a valid HEX color", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Example", guildId: interaction.guildId, locale: interaction.locale })}: #5576FF`, flags: ["Ephemeral"] })
                    }
                    
                    const rgb = hexToRgb(hexValue)
                    
                    // Validate opacity
                    if (isNaN(+opacityValue) || !Number.isInteger(+opacityValue)) {
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                        return interaction.followUp({ content: `**${opacityValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    
                    let opacity = +opacityValue
                    if (opacity < 0) opacity = 0
                    else if (opacity > 100) opacity = 100
                    
                    settings.rank_card.xp_color.r = rgb.r
                    settings.rank_card.xp_color.g = rgb.g
                    settings.rank_card.xp_color.b = rgb.b
                    settings.rank_card.xp_color.a = opacity / 100
                    settings.markModified('rank_card')
                    await settings.save().catch(e => null)
                    client.cache.settings.set(interaction.guildId, settings)
                    if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                } else return 
            }
            if (interaction.customId.includes("xpbackground")) {
                const currentHex = rgbToHex(settings.rank_card.xp_background_color.r, settings.rank_card.xp_background_color.g, settings.rank_card.xp_background_color.b)
                const modal = new ModalBuilder()
                    .setCustomId(`rankxpbackground_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "XP line background color", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: `HEX color`, guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("hex")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(currentHex)
                                    .setPlaceholder(`#5576FF`)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Opacity", guildId: interaction.guildId, locale: interaction.locale })} (0-100)`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("opacity")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${Math.round(settings.rank_card.xp_background_color.a * 100)}`)
                                    .setPlaceholder(`0-100`)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const xpBgFilter = (i) => i.customId === `rankxpbackground_${interaction.id}` && i.user.id === interaction.user.id
                const xpBgModalInteraction = await interaction.awaitModalSubmit({ filter: xpBgFilter, time: 180000 }).catch(e => null)
                if (xpBgModalInteraction && xpBgModalInteraction.type === InteractionType.ModalSubmit) {
                    interaction = xpBgModalInteraction
                    const hexValue = interaction.fields.getTextInputValue("hex")
                    const opacityValue = interaction.fields.getTextInputValue("opacity")
                    
                    // Validate HEX
                    if (!isValidHex(hexValue)) {
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                        return interaction.followUp({ content: `**${hexValue}** ${client.language({ textId: "is not a valid HEX color", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Example", guildId: interaction.guildId, locale: interaction.locale })}: #5576FF`, flags: ["Ephemeral"] })
                    }
                    
                    const rgb = hexToRgb(hexValue)
                    
                    // Validate opacity
                    if (isNaN(+opacityValue) || !Number.isInteger(+opacityValue)) {
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                        return interaction.followUp({ content: `**${opacityValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    
                    let opacity = +opacityValue
                    if (opacity < 0) opacity = 0
                    else if (opacity > 100) opacity = 100
                    
                    settings.rank_card.xp_background_color.r = rgb.r
                    settings.rank_card.xp_background_color.g = rgb.g
                    settings.rank_card.xp_background_color.b = rgb.b
                    settings.rank_card.xp_background_color.a = opacity / 100
                    settings.markModified('rank_card')
                    await settings.save().catch(e => null)
                    client.cache.settings.set(interaction.guildId, settings)
                    if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                } else return 
            }
            if (interaction.customId.includes("default")) {
                if (!interaction.deferred && !interaction.replied) await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]}).catch(e => null)
                else await interaction.editReply({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]}).catch(e => null)
                settings.rank_card.xp_background_color.r = 85
                settings.rank_card.xp_background_color.g = 118
                settings.rank_card.xp_background_color.b = 255
                settings.rank_card.xp_background_color.a = 0.3

                settings.rank_card.xp_color.r = 85
                settings.rank_card.xp_color.g = 118
                settings.rank_card.xp_color.b = 255
                settings.rank_card.xp_color.a = 0.8


                settings.rank_card.font_color.r = 255
                settings.rank_card.font_color.g = 255
                settings.rank_card.font_color.b = 255
                settings.rank_card.font_color.a = 1

                settings.rank_card.background = null
                settings.rank_card.background_brightness = 100
                settings.rank_card.background_blur = 0

                settings.markModified('rank_card')
                await settings.save().catch(e => null)
                client.cache.settings.set(interaction.guildId, settings)
            }
            const 
            fontColor = `rgba(${settings.rank_card.font_color.r}, ${settings.rank_card.font_color.g}, ${settings.rank_card.font_color.b}, ${settings.rank_card.font_color.a})`,
            backgroundColor = `rgba(${settings.rank_card.xp_background_color.r}, ${settings.rank_card.xp_background_color.g}, ${settings.rank_card.xp_background_color.b}, ${settings.rank_card.xp_background_color.a})`,
            xpColor = `rgba(${settings.rank_card.xp_color.r}, ${settings.rank_card.xp_color.g}, ${settings.rank_card.xp_color.b}, ${settings.rank_card.xp_color.a})`
            const default_fontColor = "rgba(255, 255, 255, 1)"
            const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
            GlobalFonts.registerFromPath("./GamestationCondensed.otf", "All fonts")
            const fillMixedText = (ctx, args, x, y, maxWidth) => {
                ctx.save()
                args.forEach(({ text, fillStyle, font, fontSize, align }) => {
                    let i = 0
                    do {
                        fontSize--
                        ctx.font = `${fontSize}px ${font}`
                        i++
                        if (i > 100000) throw new Error(`Бесконечный цикл: rank-set:346, maxWidth: ${maxWidth}, args.map(e => e.text).join(""): ${args.map(e => e.text).join("")}`)
                    } while (context.measureText(args.map(e => e.text).join("")).width > maxWidth)
                    ctx.textAlign = align
                    ctx.fillStyle = fillStyle
                    ctx.fillText(text, x, y)
                    if (align === "right") x -= ctx.measureText(text).width
                    else x += ctx.measureText(text).width
                })
                ctx.restore()
            }
            function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {

                if (arguments.length === 2) {
                    x = y = 0
                    w = ctx.canvas.width
                    h = ctx.canvas.height
                }
            
                // default offset is center
                offsetX = typeof offsetX === "number" ? offsetX : 0.5
                offsetY = typeof offsetY === "number" ? offsetY : 0.5
            
                // keep bounds [0.0, 1.0]
                if (offsetX < 0) offsetX = 0
                if (offsetY < 0) offsetY = 0
                if (offsetX > 1) offsetX = 1
                if (offsetY > 1) offsetY = 1
            
                let iw = img.width,
                    ih = img.height,
                    r = Math.min(w / iw, h / ih),
                    nw = iw * r,   // new prop. width
                    nh = ih * r,   // new prop. height
                    cx, cy, cw, ch, ar = 1
            
                // decide which gap to fill    
                if (nw < w) ar = w / nw                             
                if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh  // updated
                nw *= ar
                nh *= ar
            
                // calc source rectangle
                cw = iw / (nw / w)
                ch = ih / (nh / h)
            
                cx = (iw - cw) * offsetX
                cy = (ih - ch) * offsetY
            
                // make sure source rectangle is valid
                if (cx < 0) cx = 0
                if (cy < 0) cy = 0
                if (cw > iw) cw = iw
                if (ch > ih) ch = ih
            
                // fill image in dest. rectangle
                ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h)
            }
            const canvas = createCanvas(900, 300)
            const context = canvas.getContext("2d")
            //Background
            const imgBackGround = await loadImage(settings.rank_card.background || './cover_card.png').catch(async e => await loadImage('./cover_card.png'))
            const canvasBackground = createCanvas(900, 300)
            const contextBackground = canvasBackground.getContext("2d")
            contextBackground.fillStyle = "#000"
            contextBackground.fillRect(0, 0, 900, 300)
            contextBackground.filter = `brightness(${settings.rank_card.background_brightness}%) blur(${settings.rank_card.background_blur/10}px)`
            drawImageProp(contextBackground, imgBackGround, 0, 0, 900, 300)
            context.drawImage(canvasBackground, 0, 0, 900, 300)
            //Avatar
            const imgAvatar = await loadImage(member.user.displayAvatarURL({ extension: "png" }))
            const canvasAvatar = createCanvas(175, 175)
            const contextAvatar = canvasAvatar.getContext('2d')
            contextAvatar.beginPath()
            contextAvatar.arc(175/2, 175/2, 175/2, 0, Math.PI * 2, true)
            contextAvatar.closePath()
            contextAvatar.clip()
            contextAvatar.drawImage(imgAvatar, 0, 0, 175, 175)
            context.drawImage(canvasAvatar, 28, 63, 175, 175)
            //EXP LINE
                //BACKGROUND
            context.beginPath()
            context.strokeStyle = backgroundColor
            context.moveTo(246.84, 224)
            context.lineTo(834.75, 224)
            context.lineWidth = 41
            context.lineCap = "round"
            context.stroke()
                //FRONTGROUND
            context.beginPath()
            context.strokeStyle = xpColor
            context.moveTo(246.84, 224)
            const length = 834.75 - 246.84
            const ratio = profile.xp / (profile.level * settings.levelfactor + 100)
            context.lineTo(ratio > 1 ? length * 1 : length * ratio + 246.84, 224)
            context.lineWidth = 41
            context.lineCap = "round"
            context.stroke()
            //EXP
            context.font = `30px All fonts`
            context.textAlign = "right"
            const title = `${Math.floor(profile.xp)}/${profile.level * settings.levelfactor + 100} XP (${Math.floor(Math.floor(profile.xp) / (profile.level * settings.levelfactor + 100) * 100)}%)`
            context.fillStyle = fontColor
            context.fillText(title, 840, 283)
            //RANK LEVEL
            const profiles = client.cache.profiles.filter(e => e.guildID === interaction.guildId).map(e => e).sort((a, b) => b.totalxp - a.totalxp)
            let arguments = [
                { text: `${client.language({ textId: "rank", guildId: interaction.guildId, locale: interaction.locale })} `, fillStyle: fontColor, font: "All fonts", fontSize: 20, align: "left" },
                { text: `#${profiles.findIndex(e => e.userID === profile.userID)+1}`, fillStyle: fontColor, font: "All fonts", fontSize: 80, align: "left" },
                { text: ` ${client.language({ textId: "LVL", guildId: interaction.guildId, locale: interaction.locale })}. `, fillStyle: fontColor, font: "All fonts", fontSize: 20, align: "left" },
                { text: profile.level, fillStyle: fontColor, font: "All fonts", fontSize: 80, align: "left" },
            ]
            fillMixedText(context, arguments, 246.84, 190, 300)
            //USERNAME
            arguments = [
                { text: member.displayName, fillStyle: fontColor, font: "All fonts", fontSize: 50, align: "left" },
            ]
            fillMixedText(context, arguments, 246.84, 80, 516)
            //STATS
            arguments = [
                { text: Math.floor(profile.currency), fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: `🪙`, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: profile.likes, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: `❤️`, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: profile.messages, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: `✉️`, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: Math.ceil(profile.hours), fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: `🎙️`, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
            ]
            fillMixedText(context, arguments, 834.75, 190, 350)
            const buffer = canvas.toBuffer('image/png')
            const attachment = new AttachmentBuilder().setFile(buffer).setName(`${member.user.id}.png`)
            embed.setImage(`attachment://${attachment.name}`)
            embed.setFooter({ text: `${client.language({ textId: "This is how the server rank card looks", guildId: interaction.guildId, locale: interaction.locale })}` })
            embed.setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            embed.setTitle(`${client.language({ textId: "Rank card", guildId: interaction.guildId, locale: interaction.locale })}`)
            embed.setFields([
                {
                    name: `${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: settings.rank_card.background ? `${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rank_card.background}\n${client.language({ textId: "Brightness", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rank_card.background_brightness}\n${client.language({ textId: "Blur", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rank_card.background_blur}` : `${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}: [${client.language({ textId: "default", guildId: interaction.guildId, locale: interaction.locale })}]\n${client.language({ textId: "Brightness", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rank_card.background_brightness}\n${client.language({ textId: "Blur", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rank_card.background_blur}`,
                    inline: true
                },
                {
                    name: `${client.language({ textId: "Font color", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `${rgbToHex(settings.rank_card.font_color.r, settings.rank_card.font_color.g, settings.rank_card.font_color.b)} (${Math.round(settings.rank_card.font_color.a * 100)}%)`,
                    inline: true
                },
                {
                    name: `${client.language({ textId: "XP line color", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `${rgbToHex(settings.rank_card.xp_color.r, settings.rank_card.xp_color.g, settings.rank_card.xp_color.b)} (${Math.round(settings.rank_card.xp_color.a * 100)}%)`,
                    inline: true
                },
                {
                    name: `${client.language({ textId: "XP line background color", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `${rgbToHex(settings.rank_card.xp_background_color.r, settings.rank_card.xp_background_color.g, settings.rank_card.xp_background_color.b)} (${Math.round(settings.rank_card.xp_background_color.a * 100)}%)`,
                    inline: true
                },
            ])
            const selectMenu = new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}`).setOptions([
                {
                    label: `${client.language({ textId: "Card", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}`.slice(0, 100),
                    emoji: `👤`,
                    value: `userCard`,
                    default: !serverCard
                }
            ])
            if (member.permissions.has("Administrator")) {
                selectMenu.addOptions([
                    {
                        label: `${client.language({ textId: "Card", guildId: interaction.guildId, locale: interaction.locale })} ${interaction.guild.name}`.slice(0, 100),
                        emoji: `🖥️`,
                        value: `serverCard`,
                        default: serverCard
                    },
                ])
            }
            const buttonFont = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{serverCard}font`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "Font color", guildId: interaction.guildId, locale: interaction.locale })}`)
            const buttonXp = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{serverCard}xpforeground`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "XP line color", guildId: interaction.guildId, locale: interaction.locale })}`)
            const buttonXpBackground = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{serverCard}xpbackground`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "XP line background color", guildId: interaction.guildId, locale: interaction.locale })}`)
            const buttonImage = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{serverCard}image`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}`)
            const buttonDefault = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{serverCard}default`).setStyle(ButtonStyle.Danger).setLabel(`${client.language({ textId: "Default", guildId: interaction.guildId, locale: interaction.locale })}`).setDisabled(
                settings.rank_card.xp_background_color.r === 85
                && settings.rank_card.xp_background_color.g === 118
                && settings.rank_card.xp_background_color.b === 255
                && settings.rank_card.xp_background_color.a === 0.3

                && settings.rank_card.xp_color.r === 85
                && settings.rank_card.xp_color.g === 118
                && settings.rank_card.xp_color.b === 255
                && settings.rank_card.xp_color.a === 0.8

                && settings.rank_card.font_color.r === 255
                && settings.rank_card.font_color.g === 255
                && settings.rank_card.font_color.b === 255
                && settings.rank_card.font_color.a === 1

                && settings.rank_card.background === null
                && settings.rank_card.background_brightness === 100
                && settings.rank_card.background_brightness === 0)
            const firstRow = new ActionRowBuilder().addComponents(selectMenu)
            const secondRow = new ActionRowBuilder().addComponents(buttonFont, buttonXp, buttonXpBackground, buttonImage, buttonDefault)
            if (interaction.replied || interaction.deferred) return interaction.editReply({ 
                embeds: [embed],
                components: [firstRow, secondRow],
                files: [attachment]
            })
            else return interaction.update({ 
                embeds: [embed],
                components: [firstRow, secondRow],
                files: [attachment]
            })
        }
        if (!serverCard) {
            if (!interaction.isChatInputCommand()) {
                if (interaction.customId.includes("image")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`rankImage_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Direct link to background", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("link")
                                        .setRequired(false)
                                        .setValue(`${profile.rank_card?.background || ""}`)
                                        .setPlaceholder(`${client.language({ textId: "Recommended image 900x300", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setStyle(TextInputStyle.Paragraph)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Brightness", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("brightness")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${profile.rank_card?.background_brightness !== undefined ? profile.rank_card.background_brightness : ""}`)
                                        .setPlaceholder(`0-200`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Blur", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("blur")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${profile.rank_card?.background_blur !== undefined ? profile.rank_card.background_blur : ""}`)
                                        .setPlaceholder(`0-100`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `rankImage_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => null)
                    if (interaction) {
                        let boolean = true
                        const modalArgs = {}
                        const linkValue = interaction.fields.getTextInputValue("link")
                        const brightnessValue = interaction.fields.getTextInputValue("brightness")
                        const blurValue = interaction.fields.getTextInputValue("blur")
                        
                        modalArgs.link = linkValue ? linkValue.trim() : null
                        
                        // Validate brightness (optional for user card)
                        if (brightnessValue && brightnessValue.trim()) {
                            if (isNaN(+brightnessValue) || !Number.isInteger(+brightnessValue)) {
                                boolean = false
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                interaction.followUp({ content: `**${brightnessValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            } else {
                                let brightness = +brightnessValue
                                if (brightness < 0) brightness = 0
                                else if (brightness > 200) brightness = 200
                                modalArgs.brightness = brightness
                            }
                        } else {
                            modalArgs.brightness = undefined
                        }
                        
                        // Validate blur (optional for user card)
                        if (blurValue && blurValue.trim()) {
                            if (isNaN(+blurValue) || !Number.isInteger(+blurValue)) {
                                boolean = false
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                interaction.followUp({ content: `**${blurValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            } else {
                                let blur = +blurValue
                                if (blur < 0) blur = 0
                                else if (blur > 100) blur = 100
                                modalArgs.blur = blur
                            }
                        } else {
                            modalArgs.blur = undefined
                        }
                        
                        if (!modalArgs.link && profile.rank_card) {
                            profile.rank_card.background = undefined
                        } else if (modalArgs.link) {
                            // Validate image URL by attempting to load it
                            const { loadImage } = require('@napi-rs/canvas')
                            try {
                                const imageBuffer = await fetchImageBuffer(modalArgs.link)
                                await loadImage(imageBuffer)
                                if (!profile.rank_card) profile.rank_card = {}
                                profile.rank_card.background = modalArgs.link
                            } catch (e) {
                                console.error(`Failed to load background image: ${e.message}`)
                                boolean = false
                                if (!interaction.deferred) await interaction.deferUpdate()
                                return interaction.followUp({ content: `${client.language({ textId: "Error: link is not a direct link to background", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Example link", guildId: interaction.guildId, locale: interaction.locale })}: **https://cdn.discordapp.com/attachments/964635142889021500/978733897204531260/IMG_0608.jpg**`, flags: ["Ephemeral"] })
                            }
                        }
                        if (!boolean) return
                        if (!profile.rank_card) profile.rank_card = {}
                        profile.rank_card.background_brightness = modalArgs.brightness
                        profile.rank_card.background_blur = modalArgs.blur
                        // Mark the nested object as modified to ensure MongoDB saves it
                        if (profile.markModified) profile.markModified('rank_card')
                        await interaction.deferUpdate().catch(e => null)
                    } else return 
                }
                if (interaction.customId.includes("font")) {
                    const currentHex = profile.rank_card?.font_color?.r !== undefined ? rgbToHex(profile.rank_card.font_color.r, profile.rank_card.font_color.g, profile.rank_card.font_color.b) : ""
                    const modal = new ModalBuilder()
                        .setCustomId(`rankFont_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Font color", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: `HEX color`, guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("hex")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(currentHex)
                                        .setPlaceholder(`#FFFFFF`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Opacity", guildId: interaction.guildId, locale: interaction.locale })} (0-100)`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("opacity")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${profile.rank_card?.font_color?.a !== undefined ? Math.round(profile.rank_card.font_color.a * 100) : ""}`)
                                        .setPlaceholder(`0-100`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const userFontFilter = (i) => i.customId === `rankFont_${interaction.id}` && i.user.id === interaction.user.id
                    const userFontModalInteraction = await interaction.awaitModalSubmit({ filter: userFontFilter, time: 180000 }).catch(e => null)
                    if (userFontModalInteraction && userFontModalInteraction.type === InteractionType.ModalSubmit) {
                        interaction = userFontModalInteraction
                        const hexValue = interaction.fields.getTextInputValue("hex")
                        const opacityValue = interaction.fields.getTextInputValue("opacity")
                        
                        let rgb = null
                        let opacity = undefined
                        
                        // Validate HEX (optional for user card)
                        if (hexValue && hexValue.trim()) {
                            if (!isValidHex(hexValue)) {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                return interaction.followUp({ content: `**${hexValue}** ${client.language({ textId: "is not a valid HEX color", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Example", guildId: interaction.guildId, locale: interaction.locale })}: #FF5733`, flags: ["Ephemeral"] })
                            }
                            rgb = hexToRgb(hexValue)
                        }
                        
                        // Validate opacity
                        if (opacityValue && opacityValue.trim()) {
                            if (isNaN(+opacityValue) || !Number.isInteger(+opacityValue)) {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                return interaction.followUp({ content: `**${opacityValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                            opacity = +opacityValue
                            if (opacity < 0) opacity = 0
                            else if (opacity > 100) opacity = 100
                        }
                        
                        if (!profile.rank_card) profile.rank_card = { font_color: {} }
                        else if (!profile.rank_card.font_color) profile.rank_card.font_color = {}
                        profile.rank_card.font_color.r = rgb ? rgb.r : undefined
                        profile.rank_card.font_color.g = rgb ? rgb.g : undefined
                        profile.rank_card.font_color.b = rgb ? rgb.b : undefined
                        profile.rank_card.font_color.a = opacity !== undefined ? opacity / 100 : undefined
                        if (profile.rank_card.font_color.r === undefined && profile.rank_card.font_color.g === undefined && profile.rank_card.font_color.b === undefined && profile.rank_card.font_color.a === undefined) profile.rank_card.font_color = undefined
                        await interaction.deferUpdate().catch(e => null)
                    } else return  
                }
                if (interaction.customId.includes("xpforeground")) {
                    const currentHex = profile.rank_card?.xp_color?.r !== undefined ? rgbToHex(profile.rank_card.xp_color.r, profile.rank_card.xp_color.g, profile.rank_card.xp_color.b) : ""
                    const modal = new ModalBuilder()
                        .setCustomId(`rankxpforeground_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "XP line color", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: `HEX color`, guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("hex")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(currentHex)
                                        .setPlaceholder(`#5576FF`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Opacity", guildId: interaction.guildId, locale: interaction.locale })} (0-100)`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("opacity")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${profile.rank_card?.xp_color?.a !== undefined ? Math.round(profile.rank_card.xp_color.a * 100) : ""}`)
                                        .setPlaceholder(`0-100`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const userXpFgFilter = (i) => i.customId === `rankxpforeground_${interaction.id}` && i.user.id === interaction.user.id
                    const userXpFgModalInteraction = await interaction.awaitModalSubmit({ filter: userXpFgFilter, time: 180000 }).catch(e => null)
                    if (userXpFgModalInteraction && userXpFgModalInteraction.type === InteractionType.ModalSubmit) {
                        interaction = userXpFgModalInteraction
                        const hexValue = interaction.fields.getTextInputValue("hex")
                        const opacityValue = interaction.fields.getTextInputValue("opacity")
                        
                        let rgb = null
                        let opacity = undefined
                        
                        // Validate HEX (optional for user card)
                        if (hexValue && hexValue.trim()) {
                            if (!isValidHex(hexValue)) {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                return interaction.followUp({ content: `**${hexValue}** ${client.language({ textId: "is not a valid HEX color", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Example", guildId: interaction.guildId, locale: interaction.locale })}: #5576FF`, flags: ["Ephemeral"] })
                            }
                            rgb = hexToRgb(hexValue)
                        }
                        
                        // Validate opacity
                        if (opacityValue && opacityValue.trim()) {
                            if (isNaN(+opacityValue) || !Number.isInteger(+opacityValue)) {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                return interaction.followUp({ content: `**${opacityValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                            opacity = +opacityValue
                            if (opacity < 0) opacity = 0
                            else if (opacity > 100) opacity = 100
                        }
                        
                        if (!profile.rank_card) profile.rank_card = { xp_color: {} }
                        else if (!profile.rank_card.xp_color) profile.rank_card.xp_color = {}
                        profile.rank_card.xp_color.r = rgb ? rgb.r : undefined
                        profile.rank_card.xp_color.g = rgb ? rgb.g : undefined
                        profile.rank_card.xp_color.b = rgb ? rgb.b : undefined
                        profile.rank_card.xp_color.a = opacity !== undefined ? opacity / 100 : undefined
                        if (profile.rank_card.xp_color.r === undefined && profile.rank_card.xp_color.g === undefined && profile.rank_card.xp_color.b === undefined && profile.rank_card.xp_color.a === undefined) profile.rank_card.xp_color = undefined
                        await interaction.deferUpdate().catch(e => null)
                    } else return 
                }
                if (interaction.customId.includes("xpbackground")) {
                    const currentHex = profile.rank_card?.xp_background_color?.r !== undefined ? rgbToHex(profile.rank_card.xp_background_color.r, profile.rank_card.xp_background_color.g, profile.rank_card.xp_background_color.b) : ""
                    const modal = new ModalBuilder()
                        .setCustomId(`rankxpbackground_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "XP line background color", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: `HEX color`, guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("hex")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(currentHex)
                                        .setPlaceholder(`#5576FF`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Opacity", guildId: interaction.guildId, locale: interaction.locale })} (0-100)`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("opacity")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${profile.rank_card?.xp_background_color?.a !== undefined ? Math.round(profile.rank_card.xp_background_color.a * 100) : ""}`)
                                        .setPlaceholder(`0-100`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const userXpBgFilter = (i) => i.customId === `rankxpbackground_${interaction.id}` && i.user.id === interaction.user.id
                    const userXpBgModalInteraction = await interaction.awaitModalSubmit({ filter: userXpBgFilter, time: 180000 }).catch(e => null)
                    if (userXpBgModalInteraction && userXpBgModalInteraction.type === InteractionType.ModalSubmit) {
                        interaction = userXpBgModalInteraction
                        const hexValue = interaction.fields.getTextInputValue("hex")
                        const opacityValue = interaction.fields.getTextInputValue("opacity")
                        
                        let rgb = null
                        let opacity = undefined
                        
                        // Validate HEX (optional for user card)
                        if (hexValue && hexValue.trim()) {
                            if (!isValidHex(hexValue)) {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                return interaction.followUp({ content: `**${hexValue}** ${client.language({ textId: "is not a valid HEX color", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Example", guildId: interaction.guildId, locale: interaction.locale })}: #5576FF`, flags: ["Ephemeral"] })
                            }
                            rgb = hexToRgb(hexValue)
                        }
                        
                        // Validate opacity
                        if (opacityValue && opacityValue.trim()) {
                            if (isNaN(+opacityValue) || !Number.isInteger(+opacityValue)) {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                return interaction.followUp({ content: `**${opacityValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                            opacity = +opacityValue
                            if (opacity < 0) opacity = 0
                            else if (opacity > 100) opacity = 100
                        }
                        
                        if (!profile.rank_card) profile.rank_card = { xp_background_color: {} }
                        else if (!profile.rank_card.xp_background_color) profile.rank_card.xp_background_color = {}
                        profile.rank_card.xp_background_color.r = rgb ? rgb.r : undefined
                        profile.rank_card.xp_background_color.g = rgb ? rgb.g : undefined
                        profile.rank_card.xp_background_color.b = rgb ? rgb.b : undefined
                        profile.rank_card.xp_background_color.a = opacity !== undefined ? opacity / 100 : undefined
                        if (profile.rank_card.xp_background_color.r === undefined && profile.rank_card.xp_background_color.g === undefined && profile.rank_card.xp_background_color.b === undefined && profile.rank_card.xp_background_color.a === undefined) profile.rank_card.xp_background_color = undefined
                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                    } else return 
                }
                if (interaction.customId.includes("default")) {
                    if (!interaction.deferred && !interaction.replied) await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]}).catch(e => null)
                    else await interaction.editReply({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]}).catch(e => null)
                    profile.rank_card = undefined
                }
                if (profile.rank_card && !Object.values(profile.rank_card).filter(e => e !== undefined).length) profile.rank_card = undefined
                await profile.save()
            }
            const 
            fontColor = `rgba(${profile.rank_card?.font_color?.r !== undefined ? profile.rank_card.font_color.r : settings.rank_card.font_color.r}, ${profile.rank_card?.font_color?.g !== undefined ? profile.rank_card.font_color.g : settings.rank_card.font_color.g}, ${profile.rank_card?.font_color?.b !== undefined ? profile.rank_card.font_color.b : settings.rank_card.font_color.b}, ${profile.rank_card?.font_color?.a !== undefined ? profile.rank_card.font_color.a : settings.rank_card.font_color.a})`,
            backgroundColor = `rgba(${profile.rank_card?.xp_background_color?.r !== undefined ? profile.rank_card.xp_background_color.r : settings.rank_card.xp_background_color.r}, ${profile.rank_card?.xp_background_color?.g !== undefined ? profile.rank_card.xp_background_color.g : settings.rank_card.xp_background_color.g}, ${profile.rank_card?.xp_background_color?.b !== undefined ? profile.rank_card.xp_background_color.b : settings.rank_card.xp_background_color.b}, ${profile.rank_card?.xp_background_color?.a !== undefined ? profile.rank_card.xp_background_color.a : settings.rank_card.xp_background_color.a})`,
            xpColor = `rgba(${profile.rank_card?.xp_color?.r !== undefined ? profile.rank_card.xp_color.r : settings.rank_card.xp_color.r}, ${profile.rank_card?.xp_color?.g !== undefined ? profile.rank_card.xp_color.g : settings.rank_card.xp_color.g}, ${profile.rank_card?.xp_color?.b !== undefined ? profile.rank_card.xp_color.b : settings.rank_card.xp_color.b}, ${profile.rank_card?.xp_color?.a !== undefined ? profile.rank_card.xp_color.a : settings.rank_card.xp_color.a})`
            const default_fontColor = "rgba(255, 255, 255, 1)"
            const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
            GlobalFonts.registerFromPath("./GamestationCondensed.otf", "All fonts")
            const fillMixedText = (ctx, args, x, y, maxWidth) => {
                ctx.save()
                args.forEach(({ text, fillStyle, font, fontSize, align }) => {
                    let i = 0
                    do {
                        fontSize--
                        ctx.font = `${fontSize}px ${font}`
                        i++
                        if (i > 100000) throw new Error(`Бесконечный цикл: rank-set:867, maxWidth: ${maxWidth}, args.map(e => e.text).join(""): ${args.map(e => e.text).join("")}`)
                    } while (context.measureText(args.map(e => e.text).join("")).width > maxWidth)
                    ctx.textAlign = align
                    ctx.fillStyle = fillStyle
                    ctx.fillText(text, x, y)
                    if (align === "right") x -= ctx.measureText(text).width
                    else x += ctx.measureText(text).width
                })
                ctx.restore()
            }
            function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {

                if (arguments.length === 2) {
                    x = y = 0
                    w = ctx.canvas.width
                    h = ctx.canvas.height
                }
            
                // default offset is center
                offsetX = typeof offsetX === "number" ? offsetX : 0.5
                offsetY = typeof offsetY === "number" ? offsetY : 0.5
            
                // keep bounds [0.0, 1.0]
                if (offsetX < 0) offsetX = 0
                if (offsetY < 0) offsetY = 0
                if (offsetX > 1) offsetX = 1
                if (offsetY > 1) offsetY = 1
            
                let iw = img.width,
                    ih = img.height,
                    r = Math.min(w / iw, h / ih),
                    nw = iw * r,   // new prop. width
                    nh = ih * r,   // new prop. height
                    cx, cy, cw, ch, ar = 1
            
                // decide which gap to fill    
                if (nw < w) ar = w / nw                             
                if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh  // updated
                nw *= ar
                nh *= ar
            
                // calc source rectangle
                cw = iw / (nw / w)
                ch = ih / (nh / h)
            
                cx = (iw - cw) * offsetX
                cy = (ih - ch) * offsetY
            
                // make sure source rectangle is valid
                if (cx < 0) cx = 0
                if (cy < 0) cy = 0
                if (cw > iw) cw = iw
                if (ch > ih) ch = ih
            
                // fill image in dest. rectangle
                ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h)
            }
            const canvas = createCanvas(900, 300)
            const context = canvas.getContext("2d")
            //Background
            const backgroundUrl = profile.rank_card?.background || settings.rank_card.background || './cover_card.png'
            const imgBackGround = await loadImage(backgroundUrl).catch(async e => {
                console.error(`Failed to load background image, using default: ${e.message}`)
                return await loadImage('./cover_card.png')
            })
            const canvasBackground = createCanvas(900, 300)
            const contextBackground = canvasBackground.getContext("2d")
            contextBackground.fillStyle = "#000"
            contextBackground.fillRect(0, 0, 900, 300)
            contextBackground.filter = `brightness(${profile.rank_card?.background_brightness !== undefined ? profile.rank_card.background_brightness : settings.rank_card.background_brightness}%) blur(${profile.rank_card?.background_blur !== undefined ? profile.rank_card.background_blur/10 : settings.rank_card.background_blur/10}px)`
            drawImageProp(contextBackground, imgBackGround, 0, 0, 900, 300)
            context.drawImage(canvasBackground, 0, 0, 900, 300)
            //Avatar
            const imgAvatar = await loadImage(member.user.displayAvatarURL({ extension: "png" }))
            const canvasAvatar = createCanvas(175, 175)
            const contextAvatar = canvasAvatar.getContext('2d')
            contextAvatar.beginPath()
            contextAvatar.arc(175/2, 175/2, 175/2, 0, Math.PI * 2, true)
            contextAvatar.closePath()
            contextAvatar.clip()
            contextAvatar.drawImage(imgAvatar, 0, 0, 175, 175)
            context.drawImage(canvasAvatar, 28, 63, 175, 175)
            //EXP LINE
                //BACKGROUND
            context.beginPath()
            context.strokeStyle = backgroundColor
            context.moveTo(246.84, 224)
            context.lineTo(834.75, 224)
            context.lineWidth = 41
            context.lineCap = "round"
            context.stroke()
                //FRONTGROUND
            context.beginPath()
            context.strokeStyle = xpColor
            context.moveTo(246.84, 224)
            const length = 834.75 - 246.84
            const ratio = profile.xp / (profile.level * settings.levelfactor + 100)
            context.lineTo(ratio > 1 ? length * 1 : length * ratio + 246.84, 224)
            context.lineWidth = 41
            context.lineCap = "round"
            context.stroke()
            //EXP
            context.font = `30px All fonts`
            context.textAlign = "right"
            const title = `${Math.floor(profile.xp)}/${profile.level * settings.levelfactor + 100} XP (${Math.floor(Math.floor(profile.xp) / (profile.level * settings.levelfactor + 100) * 100)}%)`
            context.fillStyle = fontColor
            context.fillText(title, 840, 283)
            //RANK LEVEL
            const profiles = client.cache.profiles.filter(e => e.guildID === interaction.guildId).map(e => e).sort((a, b) => b.totalxp - a.totalxp)
            let arguments = [
                { text: `${client.language({ textId: "rank", guildId: interaction.guildId, locale: interaction.locale })} `, fillStyle: fontColor, font: "All fonts", fontSize: 20, align: "left" },
                { text: `#${profiles.findIndex(e => e.userID === profile.userID)+1}`, fillStyle: fontColor, font: "All fonts", fontSize: 80, align: "left" },
                { text: ` ${client.language({ textId: "LVL", guildId: interaction.guildId, locale: interaction.locale })}. `, fillStyle: fontColor, font: "All fonts", fontSize: 20, align: "left" },
                { text: profile.level, fillStyle: fontColor, font: "All fonts", fontSize: 80, align: "left" },
            ]
            fillMixedText(context, arguments, 246.84, 190, 300)
            //USERNAME
            arguments = [
                { text: member.displayName, fillStyle: fontColor, font: "All fonts", fontSize: 50, align: "left" },
            ]
            fillMixedText(context, arguments, 246.84, 80, 516)
            //STATS
            arguments = [
                { text: Math.floor(profile.currency), fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: `🪙`, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: profile.likes, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: `❤️`, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: profile.messages, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: `✉️`, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: Math.ceil(profile.hours), fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
                { text: `🎙️`, fillStyle: fontColor, font: "All fonts", fontSize: 30, align: "right" },
            ]
            fillMixedText(context, arguments, 834.75, 190, 350)
            const buffer = canvas.toBuffer('image/png')
            const attachment = new AttachmentBuilder().setFile(buffer).setName(`${member.user.id}.png`)
            embed.setImage(`attachment://${attachment.name}`)
            embed.setFooter({ text: `${client.language({ textId: "This is how your rank card looks", guildId: interaction.guildId, locale: interaction.locale })}` })
            embed.setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
            embed.setTitle(`${client.language({ textId: "Rank card", guildId: interaction.guildId, locale: interaction.locale })}`)
            embed.setFields([
                {
                    name: `${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: profile.rank_card?.background ? `${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.rank_card.background}\n${client.language({ textId: "Brightness", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.rank_card?.background_brightness !== undefined ? profile.rank_card.background_brightness : `[${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]`}\n${client.language({ textId: "Blur", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.rank_card?.background_blur !== undefined ? profile.rank_card.background_blur : `[${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]`}` : `${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}: [${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]\n${client.language({ textId: "Brightness", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.rank_card?.background_brightness !== undefined ? profile.rank_card.background_brightness : `[${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]`}\n${client.language({ textId: "Blur", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.rank_card?.background_blur !== undefined ? profile.rank_card.background_blur : `[${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]`}`,
                    inline: true
                },
                {
                    name: `${client.language({ textId: "Font color", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: profile.rank_card?.font_color?.r !== undefined ? `${rgbToHex(profile.rank_card.font_color.r, profile.rank_card.font_color.g, profile.rank_card.font_color.b)} (${Math.round((profile.rank_card.font_color.a !== undefined ? profile.rank_card.font_color.a : settings.rank_card.font_color.a) * 100)}%)` : `[${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]`,
                    inline: true
                },
                {
                    name: `${client.language({ textId: "XP line color", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: profile.rank_card?.xp_color?.r !== undefined ? `${rgbToHex(profile.rank_card.xp_color.r, profile.rank_card.xp_color.g, profile.rank_card.xp_color.b)} (${Math.round((profile.rank_card.xp_color.a !== undefined ? profile.rank_card.xp_color.a : settings.rank_card.xp_color.a) * 100)}%)` : `[${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]`,
                    inline: true
                },
                {
                    name: `${client.language({ textId: "XP line background color", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: profile.rank_card?.xp_background_color?.r !== undefined ? `${rgbToHex(profile.rank_card.xp_background_color.r, profile.rank_card.xp_background_color.g, profile.rank_card.xp_background_color.b)} (${Math.round((profile.rank_card.xp_background_color.a !== undefined ? profile.rank_card.xp_background_color.a : settings.rank_card.xp_background_color.a) * 100)}%)` : `[${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]`,
                    inline: true
                },
            ])
            const selectMenu = new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}`).setOptions([
                {
                    label: `${client.language({ textId: "Card", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}`.slice(0, 100),
                    emoji: `👤`,
                    value: `userCard`,
                    default: !serverCard
                }
            ])
            if (member.permissions.has("Administrator")) {
                selectMenu.addOptions([
                    {
                        label: `${client.language({ textId: "Card", guildId: interaction.guildId, locale: interaction.locale })} ${interaction.guild.name}`.slice(0, 100),
                        emoji: `🖥️`,
                        value: `serverCard`,
                        default: serverCard
                    },
                ])
            }
            const buttonFont = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{userCard}font`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "Font color", guildId: interaction.guildId, locale: interaction.locale })}`)
            const buttonXp = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{userCard}xpforeground`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "XP line color", guildId: interaction.guildId, locale: interaction.locale })}`)
            const buttonXpBackground = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{userCard}xpbackground`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "XP line background color", guildId: interaction.guildId, locale: interaction.locale })}`)
            const buttonImage = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{userCard}image`).setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}`)
            const buttonDefault = new ButtonBuilder().setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{userCard}default`).setStyle(ButtonStyle.Danger).setLabel(`${client.language({ textId: "Default", guildId: interaction.guildId, locale: interaction.locale })}`).setDisabled(
                profile.rank_card?.xp_background_color?.r === undefined
                && profile.rank_card?.xp_background_color?.g === undefined
                && profile.rank_card?.xp_background_color?.b === undefined
                && profile.rank_card?.xp_background_color?.a === undefined

                && profile.rank_card?.xp_color?.r === undefined
                && profile.rank_card?.xp_color?.g === undefined
                && profile.rank_card?.xp_color?.b === undefined
                && profile.rank_card?.xp_color?.a === undefined

                && profile.rank_card?.font_color?.r === undefined
                && profile.rank_card?.font_color?.g === undefined
                && profile.rank_card?.font_color?.b === undefined
                && profile.rank_card?.font_color?.a === undefined

                && profile.rank_card?.background === undefined
                && profile.rank_card?.background_brightness === undefined
                && profile.rank_card?.background_blur === undefined)
            const firstRow = new ActionRowBuilder().addComponents(selectMenu)
            const secondRow = new ActionRowBuilder().addComponents(buttonFont, buttonXp, buttonXpBackground, buttonImage, buttonDefault)
            if (interaction.replied || interaction.deferred) return interaction.editReply({
                embeds: [embed],
                components: [firstRow, secondRow],
                files: [attachment]
            }) 
            else return interaction.update({
                embeds: [embed],
                components: [firstRow, secondRow],
                files: [attachment]
            }) 
        }
    }
}