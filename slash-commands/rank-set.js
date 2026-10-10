const {
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    TextInputStyle,
    TextInputBuilder,
    ModalBuilder,
    InteractionType,
    Collection,
    LabelBuilder
} = require("discord.js")
const path = require('path')
const { generateRankCard } = require('../modules/generateRankCard')
const {
    PROGRESS_BAR_STYLES,
    FONT_COLOR_PRESETS,
    DEFAULT_PROGRESS_BAR_STYLE,
    DEFAULT_FONT_COLOR_PRESET,
    getProgressBarStyle,
    getFontColorPreset
} = require('../modules/rankCardThemes')

const UserRegexp = /usr{(.*?)}/
const TypeRegexp = /type{(.*?)}/
const ActionRegexp = /act{(.*?)}/

// Fetch image as buffer (used to validate the background link)
async function fetchImageBuffer(url) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function getActiveStyleId({ serverCard, settings, profile }) {
    if (serverCard) return settings.rank_card?.progress_bar_style || DEFAULT_PROGRESS_BAR_STYLE
    return profile.rank_card?.progress_bar_style
        || settings.rank_card?.progress_bar_style
        || DEFAULT_PROGRESS_BAR_STYLE
}

function getActiveFontId({ serverCard, settings, profile }) {
    if (serverCard) return settings.rank_card?.font_color_preset || DEFAULT_FONT_COLOR_PRESET
    return profile.rank_card?.font_color_preset
        || settings.rank_card?.font_color_preset
        || DEFAULT_FONT_COLOR_PRESET
}

function isUserUsingServerStyle(profile) {
    return !profile.rank_card?.progress_bar_style
}
function isUserUsingServerFont(profile) {
    return !profile.rank_card?.font_color_preset
}

// ---------------------------------------------------------------------------
// Component builders
// ---------------------------------------------------------------------------
function buildCardTypeSelect({ client, interaction, member, serverCard, isAdmin }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`usr{${interaction.user.id}}cmd{rank-set}`)
        .setOptions([
            {
                label: `${client.language({ textId: "Card", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}`.slice(0, 100),
                emoji: `👤`,
                value: `userCard`,
                default: !serverCard
            }
        ])
    if (isAdmin) {
        select.addOptions([
            {
                label: `${client.language({ textId: "Card", guildId: interaction.guildId, locale: interaction.locale })} ${interaction.guild.name}`.slice(0, 100),
                emoji: `🖥️`,
                value: `serverCard`,
                default: serverCard
            }
        ])
    }
    return new ActionRowBuilder().addComponents(select)
}

function buildActionButtons({ client, interaction, serverCard, profile, settings }) {
    const type = serverCard ? 'serverCard' : 'userCard'
    const base = `usr{${interaction.user.id}}cmd{rank-set}type{${type}}`

    const btnBg = new ButtonBuilder()
        .setCustomId(`${base}act{bg}`)
        .setStyle(ButtonStyle.Primary)
        .setLabel(`${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}`)
        .setEmoji('🖼️')

    const btnPbar = new ButtonBuilder()
        .setCustomId(`${base}act{pbar}`)
        .setStyle(ButtonStyle.Primary)
        .setLabel(`${client.language({ textId: "Progress bar", guildId: interaction.guildId, locale: interaction.locale })}`)
        .setEmoji('⚡')

    const btnFont = new ButtonBuilder()
        .setCustomId(`${base}act{fcolor}`)
        .setStyle(ButtonStyle.Primary)
        .setLabel(`${client.language({ textId: "Font color", guildId: interaction.guildId, locale: interaction.locale })}`)
        .setEmoji('🎨')

    // Reset button - disabled only if there's nothing to reset
    const hasCustomization = serverCard
        ? (settings.rank_card?.background
            || (settings.rank_card?.progress_bar_style && settings.rank_card.progress_bar_style !== DEFAULT_PROGRESS_BAR_STYLE)
            || (settings.rank_card?.font_color_preset && settings.rank_card.font_color_preset !== DEFAULT_FONT_COLOR_PRESET)
            || (settings.rank_card?.background_brightness !== undefined && settings.rank_card.background_brightness !== 100)
            || (settings.rank_card?.background_blur !== undefined && settings.rank_card.background_blur !== 0))
        : !!(profile.rank_card && Object.keys(profile.rank_card).some(k => profile.rank_card[k] !== undefined))

    const btnReset = new ButtonBuilder()
        .setCustomId(`${base}act{reset}`)
        .setStyle(ButtonStyle.Danger)
        .setLabel(`${client.language({ textId: "Default", guildId: interaction.guildId, locale: interaction.locale })}`)
        .setEmoji('♻️')
        .setDisabled(!hasCustomization)

    return new ActionRowBuilder().addComponents(btnBg, btnPbar, btnFont, btnReset)
}

function buildProgressBarSelect({ interaction, serverCard, profile, settings }) {
    const type = serverCard ? 'serverCard' : 'userCard'
    const activeId = serverCard
        ? (settings.rank_card?.progress_bar_style || DEFAULT_PROGRESS_BAR_STYLE)
        : profile.rank_card?.progress_bar_style // may be undefined -> server default selected

    const options = []

    if (!serverCard) {
        options.push({
            label: 'Use server default',
            description: 'Follow the server\'s default progress bar style.',
            emoji: '🖥️',
            value: '__default__',
            default: !activeId
        })
    }

    for (const style of Object.values(PROGRESS_BAR_STYLES)) {
        options.push({
            label: style.label,
            description: style.description.slice(0, 100),
            emoji: style.emoji,
            value: style.id,
            default: activeId === style.id
        })
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{${type}}act{pbarsel}`)
        .setPlaceholder('Choose a progress bar style…')
        .setOptions(options)

    return new ActionRowBuilder().addComponents(select)
}

function buildFontColorSelect({ interaction, serverCard, profile, settings }) {
    const type = serverCard ? 'serverCard' : 'userCard'
    const activeId = serverCard
        ? (settings.rank_card?.font_color_preset || DEFAULT_FONT_COLOR_PRESET)
        : profile.rank_card?.font_color_preset

    const options = []

    if (!serverCard) {
        options.push({
            label: 'Use server default',
            description: 'Follow the server\'s default text color.',
            emoji: '🖥️',
            value: '__default__',
            default: !activeId
        })
    }

    for (const preset of Object.values(FONT_COLOR_PRESETS)) {
        options.push({
            label: preset.label,
            description: preset.description.slice(0, 100),
            emoji: preset.emoji,
            value: preset.id,
            default: activeId === preset.id
        })
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{${type}}act{fcolorsel}`)
        .setPlaceholder('Choose a text color preset…')
        .setOptions(options)

    return new ActionRowBuilder().addComponents(select)
}

function buildBackButton({ client, interaction, serverCard }) {
    const type = serverCard ? 'serverCard' : 'userCard'
    const btn = new ButtonBuilder()
        .setCustomId(`usr{${interaction.user.id}}cmd{rank-set}type{${type}}act{back}`)
        .setStyle(ButtonStyle.Secondary)
        .setLabel(`${client.language({ textId: "Back", guildId: interaction.guildId, locale: interaction.locale }) || "Back"}`)
        .setEmoji('◀️')
    return new ActionRowBuilder().addComponents(btn)
}

// ---------------------------------------------------------------------------
// Preview renderer
// ---------------------------------------------------------------------------
async function renderPreview(client, interaction, ctx) {
    const { serverCard, profile, settings, member, view } = ctx
    const isAdmin = interaction.member.permissions.has("Administrator")

    // Ranking position
    const profiles = client.cache.profiles
        .filter(e => e.guildID === interaction.guildId)
        .map(e => e)
        .sort((a, b) => b.totalxp - a.totalxp)
    const rank = profiles.findIndex(e => e.userID === profile.userID) + 1

    // For the server card preview, swap profile overrides off so the preview
    // reflects the *server* state (not the admin's personal overrides).
    const previewProfile = serverCard
        ? Object.assign({}, profile, { rank_card: undefined })
        : profile

    const buffer = await generateRankCard({
        member,
        profile: previewProfile,
        settings,
        rank
    })
    const attachment = new AttachmentBuilder()
        .setFile(buffer)
        .setName(`rank_preview_${member.user.id}.png`)

    // Theme info for the embed
    const styleId = getActiveStyleId({ serverCard, settings, profile })
    const fontId = getActiveFontId({ serverCard, settings, profile })
    const style = getProgressBarStyle(styleId)
    const font = getFontColorPreset(fontId)

    const serverTag = `[${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })}]`

    const bgSource = serverCard
        ? settings.rank_card?.background
        : (profile.rank_card?.background || settings.rank_card?.background)
    const bgBrightness = serverCard
        ? settings.rank_card?.background_brightness
        : (profile.rank_card?.background_brightness !== undefined
            ? profile.rank_card.background_brightness
            : settings.rank_card?.background_brightness)
    const bgBlur = serverCard
        ? settings.rank_card?.background_blur
        : (profile.rank_card?.background_blur !== undefined
            ? profile.rank_card.background_blur
            : settings.rank_card?.background_blur)

    const bgLabel = `${client.language({ textId: "Background", guildId: interaction.guildId, locale: interaction.locale })}`
    const briLabel = `${client.language({ textId: "Brightness", guildId: interaction.guildId, locale: interaction.locale })}`
    const blurLabel = `${client.language({ textId: "Blur", guildId: interaction.guildId, locale: interaction.locale })}`
    const defaultTag = `[${client.language({ textId: "default", guildId: interaction.guildId, locale: interaction.locale })}]`

    const bgValue = serverCard
        ? `${bgLabel}: ${bgSource || defaultTag}\n${briLabel}: ${bgBrightness}\n${blurLabel}: ${bgBlur}`
        : `${bgLabel}: ${profile.rank_card?.background || serverTag}\n${briLabel}: ${profile.rank_card?.background_brightness !== undefined ? profile.rank_card.background_brightness : serverTag}\n${blurLabel}: ${profile.rank_card?.background_blur !== undefined ? profile.rank_card.background_blur : serverTag}`

    const pbarField = serverCard
        ? `${style.emoji} **${style.label}**\n${style.description}`
        : (isUserUsingServerStyle(profile)
            ? `${serverTag}\n${style.emoji} ${style.label} (${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })})`
            : `${style.emoji} **${style.label}**\n${style.description}`)

    const fontField = serverCard
        ? `${font.emoji} **${font.label}**\n${font.description}`
        : (isUserUsingServerFont(profile)
            ? `${serverTag}\n${font.emoji} ${font.label} (${client.language({ textId: "server", guildId: interaction.guildId, locale: interaction.locale })})`
            : `${font.emoji} **${font.label}**\n${font.description}`)

    const embed = new EmbedBuilder()
        .setColor(3093046)
        .setTitle(`${client.language({ textId: "Rank card", guildId: interaction.guildId, locale: interaction.locale })}`)
        .setImage(`attachment://${attachment.name}`)
        .setAuthor(
            serverCard
                ? { name: interaction.guild.name, iconURL: interaction.guild.iconURL() || undefined }
                : { name: member.displayName, iconURL: member.displayAvatarURL() }
        )
        .setFooter({
            text: serverCard
                ? `${client.language({ textId: "This is how the server rank card looks", guildId: interaction.guildId, locale: interaction.locale })}`
                : `${client.language({ textId: "This is how your rank card looks", guildId: interaction.guildId, locale: interaction.locale })}`
        })
        .addFields(
            { name: bgLabel, value: bgValue.slice(0, 1024), inline: false },
            { name: `⚡ ${client.language({ textId: "Progress bar", guildId: interaction.guildId, locale: interaction.locale })}`, value: pbarField.slice(0, 1024), inline: true },
            { name: `🎨 ${client.language({ textId: "Font color", guildId: interaction.guildId, locale: interaction.locale })}`, value: fontField.slice(0, 1024), inline: true }
        )

    // Build components based on view
    const typeRow = buildCardTypeSelect({ client, interaction, member, serverCard, isAdmin })
    let components
    if (view === 'progressBar') {
        components = [
            typeRow,
            buildProgressBarSelect({ interaction, serverCard, profile, settings }),
            buildBackButton({ client, interaction, serverCard })
        ]
    } else if (view === 'fontColor') {
        components = [
            typeRow,
            buildFontColorSelect({ interaction, serverCard, profile, settings }),
            buildBackButton({ client, interaction, serverCard })
        ]
    } else {
        components = [
            typeRow,
            buildActionButtons({ client, interaction, serverCard, profile, settings })
        ]
    }

    return {
        payload: {
            content: ' ',
            embeds: [embed],
            components,
            files: [attachment],
            attachments: []
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
module.exports = {
    name: "rank-set",
    nameLocalizations: {
        'ru': `rank-set`,
        'uk': `rank-set`,
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
        // Ownership check (unless invoked from the UCP button)
        const isFromUCP = args?.fromUCP
        if (!isFromUCP && UserRegexp.exec(interaction.customId) && interaction.user.id !== UserRegexp.exec(interaction.customId)[1]) {
            return interaction.deferUpdate().catch(() => null)
        }

        const flags = []
        if (
            interaction.isChatInputCommand()
            || interaction.customId?.includes("eph")
            || interaction.values?.[0]?.includes("eph")
            || args?.ephemeral
        ) {
            flags.push("Ephemeral")
        }
        if (!interaction.deferred && (interaction.isChatInputCommand() || interaction.customId?.includes("reply"))) {
            await interaction.deferReply({ flags })
        }

        // Load state
        const cachedSettings = client.cache.settings.get(interaction.guildId)
        let settings = cachedSettings
        const { member } = interaction
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        const isAdmin = member.permissions.has("Administrator")

        // Determine mode (server vs user card)
        let serverCard = false
        if (interaction.isStringSelectMenu()) {
            // Either coming from the card-type select, or a sub-select (pbar/fcolor)
            const fromType = TypeRegexp.exec(interaction.customId)?.[1]
            if (fromType) serverCard = fromType === "serverCard"
            else serverCard = interaction.values[0] === "serverCard"
        } else if (!interaction.isChatInputCommand()) {
            serverCard = TypeRegexp.exec(interaction.customId)?.[1] === "serverCard"
        }
        if (serverCard && !isAdmin) serverCard = false // guard

        // Parse the action if any
        const action = !interaction.isChatInputCommand()
            ? (ActionRegexp.exec(interaction.customId)?.[1] || null)
            : null

        // For server card modifications, load the live DB document.
        if (serverCard && (action === 'bg' || action === 'pbarsel' || action === 'fcolorsel' || action === 'reset')) {
            settings = await client.settingsSchema.findOne({ guildID: interaction.guildId })
        }

        // --------------------------------------------------------------- BG
        // Background modal (same flow for server card & user card, shared)
        if (action === 'bg') {
            const target = serverCard ? settings : profile
            const currentBg = serverCard ? settings.rank_card?.background : profile.rank_card?.background
            const currentBri = serverCard
                ? (settings.rank_card?.background_brightness ?? 100)
                : (profile.rank_card?.background_brightness)
            const currentBlur = serverCard
                ? (settings.rank_card?.background_blur ?? 0)
                : (profile.rank_card?.background_blur)

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
                                .setValue(`${currentBg || ""}`)
                        ),
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Brightness", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("brightness")
                                .setRequired(serverCard)
                                .setStyle(TextInputStyle.Short)
                                .setValue(`${currentBri !== undefined ? currentBri : ""}`)
                                .setPlaceholder(`0-200`)
                        ),
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Blur", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("blur")
                                .setRequired(serverCard)
                                .setStyle(TextInputStyle.Short)
                                .setValue(`${currentBlur !== undefined ? currentBlur : ""}`)
                                .setPlaceholder(`0-100`)
                        )
                ])
            await interaction.showModal(modal)
            delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]

            const filter = (i) => i.customId === `rankImage_${interaction.id}` && i.user.id === interaction.user.id
            const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(() => null)
            if (!modalInteraction || modalInteraction.type !== InteractionType.ModalSubmit) return

            // Reassign so downstream code uses the modal submit context
            interaction = modalInteraction

            let valid = true
            let link = interaction.fields.getTextInputValue("link")
            const brightnessValue = interaction.fields.getTextInputValue("brightness")
            const blurValue = interaction.fields.getTextInputValue("blur")
            link = link ? link.trim() : null

            let brightness
            if (brightnessValue && brightnessValue.trim()) {
                if (isNaN(+brightnessValue) || !Number.isInteger(+brightnessValue)) {
                    valid = false
                    if (!interaction.deferred) await interaction.deferUpdate().catch(() => null)
                    interaction.followUp({ content: `**${brightnessValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                } else {
                    brightness = Math.max(0, Math.min(200, +brightnessValue))
                }
            }

            let blur
            if (blurValue && blurValue.trim()) {
                if (isNaN(+blurValue) || !Number.isInteger(+blurValue)) {
                    valid = false
                    if (!interaction.deferred) await interaction.deferUpdate().catch(() => null)
                    interaction.followUp({ content: `**${blurValue}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                } else {
                    blur = Math.max(0, Math.min(100, +blurValue))
                }
            }

            if (link) {
                const { loadImage } = require('@napi-rs/canvas')
                try {
                    const imageBuffer = await fetchImageBuffer(link)
                    await loadImage(imageBuffer)
                } catch (e) {
                    console.error(`[rank-set] Failed to load background image: ${e.message}`)
                    if (!interaction.deferred) await interaction.deferUpdate().catch(() => null)
                    return interaction.followUp({
                        content: `${client.language({ textId: "Error: link is not a direct link to background", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Example link", guildId: interaction.guildId, locale: interaction.locale })}: **https://cdn.discordapp.com/attachments/964635142889021500/978733897204531260/IMG_0608.jpg**`,
                        flags: ["Ephemeral"]
                    })
                }
            }

            if (!valid) return

            if (serverCard) {
                if (!settings.rank_card) settings.rank_card = {}
                settings.rank_card.background = link || null
                if (brightness !== undefined) settings.rank_card.background_brightness = brightness
                if (blur !== undefined) settings.rank_card.background_blur = blur
                settings.markModified('rank_card')
                await settings.save().catch(() => null)
                client.cache.settings.set(interaction.guildId, settings)
            } else {
                if (!profile.rank_card) profile.rank_card = {}
                if (!link) profile.rank_card.background = undefined
                else profile.rank_card.background = link
                profile.rank_card.background_brightness = brightness
                profile.rank_card.background_blur = blur
                if (profile.markModified) profile.markModified('rank_card')
                if (profile.rank_card && !Object.values(profile.rank_card).filter(v => v !== undefined).length) {
                    profile.rank_card = undefined
                }
                await profile.save()
            }

            if (!interaction.deferred) await interaction.deferUpdate().catch(() => null)
        }

        // ----------------------------------------------------- PROGRESS BAR SELECT
        if (action === 'pbarsel' && interaction.isStringSelectMenu()) {
            const chosen = interaction.values[0]
            if (serverCard) {
                if (!settings.rank_card) settings.rank_card = {}
                settings.rank_card.progress_bar_style = (chosen === '__default__')
                    ? DEFAULT_PROGRESS_BAR_STYLE
                    : chosen
                settings.markModified('rank_card')
                await settings.save().catch(() => null)
                client.cache.settings.set(interaction.guildId, settings)
            } else {
                if (!profile.rank_card) profile.rank_card = {}
                profile.rank_card.progress_bar_style = (chosen === '__default__') ? undefined : chosen
                if (profile.markModified) profile.markModified('rank_card')
                if (profile.rank_card && !Object.values(profile.rank_card).filter(v => v !== undefined).length) {
                    profile.rank_card = undefined
                }
                await profile.save()
            }
        }

        // ----------------------------------------------------- FONT COLOR SELECT
        if (action === 'fcolorsel' && interaction.isStringSelectMenu()) {
            const chosen = interaction.values[0]
            if (serverCard) {
                if (!settings.rank_card) settings.rank_card = {}
                settings.rank_card.font_color_preset = (chosen === '__default__')
                    ? DEFAULT_FONT_COLOR_PRESET
                    : chosen
                settings.markModified('rank_card')
                await settings.save().catch(() => null)
                client.cache.settings.set(interaction.guildId, settings)
            } else {
                if (!profile.rank_card) profile.rank_card = {}
                profile.rank_card.font_color_preset = (chosen === '__default__') ? undefined : chosen
                if (profile.markModified) profile.markModified('rank_card')
                if (profile.rank_card && !Object.values(profile.rank_card).filter(v => v !== undefined).length) {
                    profile.rank_card = undefined
                }
                await profile.save()
            }
        }

        // ----------------------------------------------------- RESET
        if (action === 'reset') {
            // Show loading state while we save
            const loadingRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true)
            )
            const loadingPayload = {
                content: interaction.message?.content || " ",
                embeds: interaction.message?.embeds || [],
                components: [loadingRow]
            }
            if (!interaction.deferred && !interaction.replied) {
                await interaction.update(loadingPayload).catch(() => null)
            } else {
                await interaction.editReply(loadingPayload).catch(() => null)
            }

            if (serverCard) {
                if (!settings.rank_card) settings.rank_card = {}
                settings.rank_card.background = null
                settings.rank_card.background_brightness = 100
                settings.rank_card.background_blur = 0
                settings.rank_card.progress_bar_style = DEFAULT_PROGRESS_BAR_STYLE
                settings.rank_card.font_color_preset = DEFAULT_FONT_COLOR_PRESET
                // Reset legacy colors too so old documents become consistent
                settings.rank_card.font_color = { r: 255, g: 255, b: 255, a: 1 }
                settings.rank_card.xp_color = { r: 85, g: 118, b: 255, a: 0.8 }
                settings.rank_card.xp_background_color = { r: 85, g: 118, b: 255, a: 0.3 }
                settings.markModified('rank_card')
                await settings.save().catch(() => null)
                client.cache.settings.set(interaction.guildId, settings)
            } else {
                profile.rank_card = undefined
                if (profile.markModified) profile.markModified('rank_card')
                await profile.save()
            }
        }

        // -------------------------------------------------------- VIEW ROUTING
        // Stay in the same sub-view after a selection so the user can keep
        // trying other options with a live preview.
        let view = 'default'
        if (action === 'pbar' || action === 'pbarsel') view = 'progressBar'
        else if (action === 'fcolor' || action === 'fcolorsel') view = 'fontColor'
        else view = 'default'

        // Acknowledge select menu interactions that didn't pop a modal.
        // (bg already deferred, pbar/fcolor/back need interaction.update, select changes need update too)
        const needsUpdate = !interaction.deferred && !interaction.replied && !interaction.isChatInputCommand()

        const { payload } = await renderPreview(client, interaction, {
            serverCard,
            profile,
            settings,
            member,
            view
        })

        if (needsUpdate && (interaction.isButton() || interaction.isStringSelectMenu())) {
            return interaction.update(payload)
        }
        return interaction.editReply(payload)
    }
}
