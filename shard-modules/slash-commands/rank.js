const { ApplicationCommandOptionType, Collection, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
const path = require('path')
const MemberRegexp = /mbr{(.*?)}/

// Register custom font
try {
    GlobalFonts.registerFromPath(path.join(process.cwd(), 'GamestationCondensed.otf'), 'Gamestation')
} catch (e) {
    // Custom font not loaded, using fallback
}

// Convert large numbers to K format
function convertInt(integer) {
    if (integer >= 1000000) return `${(integer / 1000000).toFixed(1)}M`
    if (integer >= 1000) return `${(integer / 1000).toFixed(1)}K`
    return integer.toString()
}

// Draw rounded rectangle
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
}

// Comprehensive emoji regex pattern - matches:
// - Basic emojis with presentation selector
// - Emoji sequences (skin tones, ZWJ sequences like family emojis)
// - Flag emojis (regional indicators)
// - Keycap emojis
const emojiRegex = /(?:\p{RI}\p{RI}|\p{Emoji}(?:\p{EMod}|\uFE0F\u20E3?|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u200D(?:\p{RI}\p{RI}|\p{Emoji}(?:\p{EMod}|\uFE0F\u20E3?|[\u{E0020}-\u{E007E}]+\u{E007F})?))*)/gu

// Characters that should be skipped entirely (not renderable by fonts or Twemoji)
const unsupportedChars = new Set([
    '・', '･', '〃', '々', '〆', '〇', '〈', '〉', '《', '》', '「', '」', '『', '』', '【', '】',
    '〒', '〓', '〔', '〕', '〖', '〗', '〘', '〙', '〚', '〛', '〜', '〝', '〞', '〟',
    '゛', '゜', 'ゝ', 'ゞ', 'ヽ', 'ヾ', 'ー',
    '、', '。', // Japanese punctuation
])

// Check if a character can be rendered (either by font or as Twemoji)
function isRenderableChar(char) {
    // Skip known unsupported characters
    if (unsupportedChars.has(char)) {
        return false
    }
    
    const codePoint = char.codePointAt(0)
    
    // Basic Latin, Latin-1 Supplement, Latin Extended - always renderable
    if (codePoint <= 0x024F) return true
    
    // Common punctuation and symbols
    if (codePoint >= 0x2000 && codePoint <= 0x206F) return true // General Punctuation
    
    // Currency symbols
    if (codePoint >= 0x20A0 && codePoint <= 0x20CF) return true
    
    // Cyrillic
    if (codePoint >= 0x0400 && codePoint <= 0x04FF) return true
    
    // Greek
    if (codePoint >= 0x0370 && codePoint <= 0x03FF) return true
    
    // Arabic
    if (codePoint >= 0x0600 && codePoint <= 0x06FF) return true
    
    // CJK characters (Chinese, Japanese Kanji, Korean Hanja) - may not render but won't show squares
    if (codePoint >= 0x4E00 && codePoint <= 0x9FFF) return true
    
    // Hiragana
    if (codePoint >= 0x3040 && codePoint <= 0x309F) return true
    
    // Katakana (except special marks)
    if (codePoint >= 0x30A0 && codePoint <= 0x30FF) {
        // Skip katakana middle dot and other problematic chars
        if (char === '・' || char === 'ー') return false
        return true
    }
    
    // Numbers and basic math
    if (codePoint >= 0x0030 && codePoint <= 0x0039) return true
    
    // Skip most other Unicode ranges that cause squares
    if (codePoint >= 0x2500 && codePoint <= 0x257F) return false // Box Drawing
    if (codePoint >= 0x2580 && codePoint <= 0x259F) return false // Block Elements
    if (codePoint >= 0x25A0 && codePoint <= 0x25FF) return false // Geometric Shapes
    
    return true
}

// Check if a character/emoji is supported by Twemoji
function isTwemojiSupported(char) {
    const codePoint = char.codePointAt(0)
    
    // Multi-character sequences (ZWJ, skin tones) are usually supported
    if (char.length > 1) return true
    
    // Emoji ranges that Twemoji supports
    const emojiRanges = [
        [0x1F300, 0x1F9FF], // Misc Symbols and Pictographs, Emoticons, etc.
        [0x2600, 0x26FF],   // Misc symbols (weather, chess, etc.)
        [0x2700, 0x27BF],   // Dingbats
        [0x2300, 0x23FF],   // Misc Technical
        [0x2B50, 0x2B55],   // Stars
        [0x231A, 0x231B],   // Watch, Hourglass
        [0x23E9, 0x23F3],   // Media controls
        [0x23F8, 0x23FA],   // More media controls
        [0x25AA, 0x25AB],   // Small squares
        [0x25B6, 0x25B6],   // Play button
        [0x25C0, 0x25C0],   // Reverse button
        [0x25FB, 0x25FE],   // Medium squares
        [0x2614, 0x2615],   // Umbrella, hot beverage
        [0x2648, 0x2653],   // Zodiac
        [0x267F, 0x267F],   // Wheelchair
        [0x2693, 0x2693],   // Anchor
        [0x26A1, 0x26A1],   // High voltage (lightning)
        [0x26AA, 0x26AB],   // Circles
        [0x26BD, 0x26BE],   // Soccer, baseball
        [0x26C4, 0x26C5],   // Snowman, sun behind cloud
        [0x26CE, 0x26CE],   // Ophiuchus
        [0x26D4, 0x26D4],   // No entry
        [0x26EA, 0x26EA],   // Church
        [0x26F2, 0x26F3],   // Fountain, golf
        [0x26F5, 0x26F5],   // Sailboat
        [0x26FA, 0x26FA],   // Tent
        [0x26FD, 0x26FD],   // Fuel pump
        [0x2702, 0x2702],   // Scissors
        [0x2705, 0x2705],   // Check mark
        [0x2708, 0x270D],   // Airplane to writing hand
        [0x270F, 0x270F],   // Pencil
        [0x2712, 0x2712],   // Black nib
        [0x2714, 0x2714],   // Check mark
        [0x2716, 0x2716],   // X mark
        [0x271D, 0x271D],   // Latin cross
        [0x2721, 0x2721],   // Star of David
        [0x2728, 0x2728],   // Sparkles
        [0x2733, 0x2734],   // Eight spoked asterisk
        [0x2744, 0x2744],   // Snowflake
        [0x2747, 0x2747],   // Sparkle
        [0x274C, 0x274C],   // Cross mark
        [0x274E, 0x274E],   // Cross mark
        [0x2753, 0x2755],   // Question marks
        [0x2757, 0x2757],   // Exclamation mark
        [0x2763, 0x2764],   // Heart exclamation, red heart
        [0x2795, 0x2797],   // Plus, minus, divide
        [0x27A1, 0x27A1],   // Right arrow
        [0x27B0, 0x27B0],   // Curly loop
        [0x27BF, 0x27BF],   // Double curly loop
        [0x2934, 0x2935],   // Arrows
        [0x2B05, 0x2B07],   // Arrows
        [0x2B1B, 0x2B1C],   // Squares
        [0x3030, 0x3030],   // Wavy dash
        [0x303D, 0x303D],   // Part alternation mark
        [0x3297, 0x3297],   // Circled Ideograph Congratulation
        [0x3299, 0x3299],   // Circled Ideograph Secret
    ]
    
    return emojiRanges.some(([start, end]) => codePoint >= start && codePoint <= end)
}

// Convert emoji to Twemoji CDN URL
function emojiToTwemojiUrl(emoji) {
    // Remove variation selectors for URL generation
    const cleaned = emoji.replace(/\uFE0F/g, '')
    const codePoints = [...cleaned]
        .map(char => char.codePointAt(0).toString(16))
        .join('-')
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoints}.png`
}

// Sanitize text by removing characters that can't be rendered
function sanitizeDisplayName(text) {
    const chars = [...text]
    const result = []
    
    for (const char of chars) {
        // Check if it's an emoji that Twemoji can render
        emojiRegex.lastIndex = 0
        if (emojiRegex.test(char) && isTwemojiSupported(char)) {
            result.push(char)
        }
        // Check if it's a regular character the font can render
        else if (isRenderableChar(char)) {
            result.push(char)
        }
        // Skip unsupported characters (they would show as squares)
    }
    
    return result.join('')
}

// Parse text into segments of text and emojis
function parseTextWithEmojis(text) {
    const segments = []
    let lastIndex = 0
    let match

    // Reset regex
    emojiRegex.lastIndex = 0

    while ((match = emojiRegex.exec(text)) !== null) {
        const emoji = match[0]
        
        // Check if this is actually a Twemoji-supported emoji
        if (!isTwemojiSupported(emoji)) {
            // Skip this match, continue searching
            continue
        }
        
        // Add text before emoji
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
        }
        // Add emoji
        segments.push({ type: 'emoji', content: emoji })
        lastIndex = match.index + emoji.length
    }

    // Add remaining text
    if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.slice(lastIndex) })
    }

    return segments
}

// Draw text with emoji support - renders emojis as Twemoji images
async function drawTextWithEmojis(ctx, text, x, y, fontSize, maxWidth = null) {
    // First sanitize the text to remove unrenderable characters
    const sanitizedText = sanitizeDisplayName(text)
    const segments = parseTextWithEmojis(sanitizedText)
    let currentX = x
    const emojiSize = fontSize * 0.9 // Emoji size relative to font
    const emojiCache = new Map()
    let lastSegmentType = null // Track previous segment type for spacing

    for (const segment of segments) {
        if (segment.type === 'text') {
            // Add space before text if previous segment was emoji
            if (lastSegmentType === 'emoji') {
                currentX += 8 // Space after emoji before text
            }
            // Check if we need to truncate
            if (maxWidth && currentX + ctx.measureText(segment.content).width > x + maxWidth) {
                const availableWidth = x + maxWidth - currentX - ctx.measureText('...').width
                let truncatedText = ''
                for (const char of segment.content) {
                    if (ctx.measureText(truncatedText + char).width > availableWidth) break
                    truncatedText += char
                }
                ctx.fillText(truncatedText + '...', currentX, y)
                return currentX + ctx.measureText(truncatedText + '...').width
            }
            ctx.fillText(segment.content, currentX, y)
            currentX += ctx.measureText(segment.content).width
            lastSegmentType = 'text'
        } else if (segment.type === 'emoji') {
            // Add space before emoji if previous segment was text
            if (lastSegmentType === 'text') {
                currentX += 10 // Space between text and emoji
            }
            // Check width limit
            if (maxWidth && currentX + emojiSize > x + maxWidth) {
                ctx.fillText('...', currentX, y)
                return currentX + ctx.measureText('...').width
            }

            // Load and draw emoji as image
            try {
                const url = emojiToTwemojiUrl(segment.content)
                let emojiImg = emojiCache.get(url)
                if (!emojiImg) {
                    emojiImg = await loadImage(url).catch(() => null)
                    emojiCache.set(url, emojiImg)
                }
                if (emojiImg) {
                    // Position emoji to align with text baseline
                    const emojiY = y - emojiSize + (fontSize * 0.15)
                    ctx.drawImage(emojiImg, currentX, emojiY, emojiSize, emojiSize)
                    currentX += emojiSize
                    lastSegmentType = 'emoji'
                }
                // If emoji image not found, skip it (don't render as text - it would show square)
            } catch (e) {
                // Skip emoji on error
            }
        }
    }

    return currentX
}

module.exports = {
    name: "rank",
    nameLocalizations: {
        "ru": `ранг`,
        "uk": `ранг`,
        "es-ES": `rango`
    },
    description: `View profile card`,
    descriptionLocalizations: {
       "ru": `Посмотреть карточку профиля`,
       "uk": `Переглянути картку профілю`,
       "es-ES": `Ver la tarjeta de perfil`
    },
    options: [
        {
            name: "user",
            nameLocalizations: {
                "ru": `юзер`,
                "uk": `користувач`,
                "es-ES": `usuario`
            },
            description: `View user's card profile`,
            descriptionLocalizations: {
                "ru": `Посмотреть карточку профиля пользователя`,
                "uk": `Переглянути картку профілю користувача`,
                "es-ES": `Ver la tarjeta de perfil del usuario`
            },
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        const flags = []
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || args?.ephemeral) flags.push("Ephemeral")
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) {
            if (!interaction.deferred && !interaction.customId.includes("reply")) await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
            else if (!interaction.deferred) await interaction.deferReply({ flags })
        } else await interaction.deferReply({ flags })
        
        let member
        if (args?.user) member = await interaction.guild.members.fetch(args.user).catch(() => null)
        else if (interaction.isButton() && MemberRegexp.exec(interaction.customId)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(() => null)
        else if (interaction.isStringSelectMenu() && (MemberRegexp.exec(interaction.customId) || MemberRegexp.exec(interaction.values[0]))) {
            member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.values[0])?.[1]).catch(() => null)
            if (!(member instanceof GuildMember)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(() => null)
        }
        else member = interaction.member
        
        if (!member) {
            return interaction.editReply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        const settings = client.cache.settings.get(interaction.guildId)
        
        // Calculate rank
        const profiles = client.cache.profiles.filter(e => e.guildID === interaction.guildId).map(e => e).sort((a, b) => b.totalxp - a.totalxp)
        const rank = profiles.findIndex(e => e.userID === profile.userID) + 1
        
        // XP values
        const xp = Math.floor(profile.xp)
        const finalXp = profile.level * settings.levelfactor + 100
        const level = profile.level
        const status = member.presence?.status || 'offline'

        // Premium card dimensions
        const width = 934
        const height = 320
        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d')
        
        // Load background
        const bgPath = profile.rank_card?.background || settings.rank_card?.background || './cover_card.png'
        const bg = await loadImage(bgPath).catch(async () => await loadImage('./cover_card.png'))
        
        // Draw background with cover fit
        const bgRatio = bg.width / bg.height
        const canvasRatio = width / height
        let srcX = 0, srcY = 0, srcW = bg.width, srcH = bg.height
        if (canvasRatio > bgRatio) {
            srcH = bg.width / canvasRatio
            srcY = (bg.height - srcH) / 2
        } else {
            srcW = bg.height * canvasRatio
            srcX = (bg.width - srcW) / 2
        }
        
        // Clip to rounded rectangle for entire card
        roundRect(ctx, 0, 0, width, height, 24)
        ctx.clip()
        ctx.drawImage(bg, Math.max(0, srcX), Math.max(0, srcY), srcW, srcH, 0, 0, width, height)
        
        // Dark gradient overlay from left
        const gradient = ctx.createLinearGradient(0, 0, width, 0)
        gradient.addColorStop(0, 'rgba(15, 15, 20, 0.95)')
        gradient.addColorStop(0.5, 'rgba(15, 15, 20, 0.85)')
        gradient.addColorStop(1, 'rgba(15, 15, 20, 0.6)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
        
        // Accent line on left edge
        const accentGradient = ctx.createLinearGradient(0, 0, 0, height)
        accentGradient.addColorStop(0, '#00D4FF')
        accentGradient.addColorStop(0.5, '#00FF88')
        accentGradient.addColorStop(1, '#00D4FF')
        ctx.fillStyle = accentGradient
        ctx.fillRect(0, 0, 5, height)
        
        // Load avatar
        const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 512 })
        const avatar = await loadImage(avatarUrl)
        
        // Avatar settings
        const avatarSize = 150
        const avatarX = 45
        const avatarY = (height - avatarSize) / 2
        
        // Avatar glow effect
        ctx.shadowColor = '#00D4FF'
        ctx.shadowBlur = 20
        ctx.beginPath()
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2)
        ctx.fillStyle = '#00D4FF'
        ctx.fill()
        ctx.shadowBlur = 0
        
        // Avatar border ring
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2)
        ctx.stroke()
        
        // Draw circular avatar
        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
        ctx.restore()
        
        // Status indicator with random color per user
        const statusX = avatarX + avatarSize - 20
        const statusY = avatarY + avatarSize - 20
        
        // Generate random color based on user ID (consistent for same user)
        const userIdHash = member.user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const randomColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8B500', '#FF69B4', '#00CED1', '#FF7F50', '#9370DB',
            '#20B2AA', '#FF6347', '#7B68EE', '#3CB371', '#FFD700'
        ]
        const randomColor = randomColors[userIdHash % randomColors.length]
        
        // Status border
        ctx.fillStyle = '#0f0f14'
        ctx.beginPath()
        ctx.arc(statusX, statusY, 18, 0, Math.PI * 2)
        ctx.fill()
        
        // Random color dot
        ctx.fillStyle = randomColor
        ctx.beginPath()
        ctx.arc(statusX, statusY, 14, 0, Math.PI * 2)
        ctx.fill()
        
        // Font setup
        const fontFamily = 'Gamestation, Arial, sans-serif'
        const contentX = avatarX + avatarSize + 40
        
        // Username with emoji support
        // Truncate to 16 visible characters (counting emojis as 1 char each)
        const nameChars = [...member.displayName]
        const truncatedName = nameChars.length > 16 ? nameChars.slice(0, 16).join('') + '...' : member.displayName
        ctx.font = `bold 38px Arial, sans-serif`
        ctx.fillStyle = '#FFFFFF'
        // Use drawTextWithEmojis to properly render emojis as Twemoji images
        await drawTextWithEmojis(ctx, truncatedName, contentX, 68, 38)
        
        // Discriminator / Tag (more visible)
        ctx.font = `22px Arial, sans-serif`
        ctx.fillStyle = '#B0B0B0'
        ctx.fillText(`@${member.user.username}`, contentX, 98)
        
        // LEVEL box - Top Right Corner (larger, more prominent)
        const levelBoxWidth = 140
        const levelBoxHeight = 70
        const levelBoxX = width - levelBoxWidth - 35
        const levelBoxY = 30
        
        // Level box background - darker, more visible
        roundRect(ctx, levelBoxX, levelBoxY, levelBoxWidth, levelBoxHeight, 12)
        ctx.fillStyle = 'rgba(0, 30, 50, 0.85)'
        ctx.fill()
        
        // Level box border (cyan)
        ctx.strokeStyle = '#00D4FF'
        ctx.lineWidth = 2
        roundRect(ctx, levelBoxX, levelBoxY, levelBoxWidth, levelBoxHeight, 12)
        ctx.stroke()
        
        // LEVEL label - centered (16 + 8 = 24px)
        ctx.font = `bold 24px ${fontFamily}`
        ctx.fillStyle = '#00D4FF'
        let levelLabelWidth = ctx.measureText('LEVEL').width
        ctx.fillText('LEVEL', levelBoxX + (levelBoxWidth - levelLabelWidth) / 2, levelBoxY + 25)
        
        // Level number - centered (more space below label)
        ctx.font = `bold 36px ${fontFamily}`
        ctx.fillStyle = '#FFFFFF'
        let levelNumWidth = ctx.measureText(`${level}`).width
        ctx.fillText(`${level}`, levelBoxX + (levelBoxWidth - levelNumWidth) / 2, levelBoxY + 58)
        
        // Stats boxes - RANK and EXPERIENCE
        const boxY = 125
        const boxHeight = 75
        const boxWidth = 150
        const boxSpacing = 25
        
        // Rank box (highlighted)
        roundRect(ctx, contentX, boxY, boxWidth, boxHeight, 10)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.lineWidth = 1
        roundRect(ctx, contentX, boxY, boxWidth, boxHeight, 10)
        ctx.stroke()
        
        // RANK label - centered (more space)
        ctx.font = `bold 24px ${fontFamily}`
        ctx.fillStyle = '#CCCCCC'
        let rankLabelWidth = ctx.measureText('RANK').width
        ctx.fillText('RANK', contentX + (boxWidth - rankLabelWidth) / 2, boxY + 28)
        
        // Rank number - centered (more space below label)
        ctx.font = `bold 35px ${fontFamily}`
        ctx.fillStyle = '#FFFFFF'
        let rankNumWidth = ctx.measureText(`#${rank}`).width
        ctx.fillText(`#${rank}`, contentX + (boxWidth - rankNumWidth) / 2, boxY + 60)
        
        // XP box (highlighted)
        const xpBoxX = contentX + boxWidth + boxSpacing
        const xpBoxWidth = boxWidth + 60
        roundRect(ctx, xpBoxX, boxY, xpBoxWidth, boxHeight, 10)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.lineWidth = 1
        roundRect(ctx, xpBoxX, boxY, xpBoxWidth, boxHeight, 10)
        ctx.stroke()
        
        // EXPERIENCE label - centered (more space)
        ctx.font = `bold 24px ${fontFamily}`
        ctx.fillStyle = '#CCCCCC'
        let xpLabelWidth = ctx.measureText('EXPERIENCE').width
        ctx.fillText('EXPERIENCE', xpBoxX + (xpBoxWidth - xpLabelWidth) / 2, boxY + 28)
        
        // XP number - centered (more space below label)
        ctx.font = `bold 31px ${fontFamily}`
        ctx.fillStyle = '#FFFFFF'
        let xpNumText = `${convertInt(xp)} / ${convertInt(finalXp)}`
        let xpNumWidth = ctx.measureText(xpNumText).width
        ctx.fillText(xpNumText, xpBoxX + (xpBoxWidth - xpNumWidth) / 2, boxY + 60)
        
        // Progress bar section - wider bar (define first to position emojis relative to it)
        const barWidth = 612
        const barX = contentX
        const barHeight = 39
        const progress = Math.min(xp / finalXp, 1)
        
        // User stats row (VC hours, messages, likes, currency) - just above progress bar
        const statsFont = `bold 24px ${fontFamily}`
        ctx.font = statsFont
        
        // Get user stats - hours can be decimal, show with 1 decimal place if < 10
        const rawHours = profile.hours || 0
        const vcHours = rawHours < 10 ? parseFloat(rawHours.toFixed(1)) : Math.floor(rawHours)
        const messageCount = profile.messages || 0
        const userLikes = profile.likes || 0
        const userCurrency = Math.floor(profile.currency || 0)
        
        // Load emoji images from Twemoji CDN
        const emojiSize = 31 // Increased by 5
        const emojiUrls = {
            microphone: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f399.png',
            envelope: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2709.png',
            heart: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png',
            coin: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1fa99.png'
        }
        
        // Load all emoji images
        const [micEmoji, envEmoji, heartEmoji, coinEmoji] = await Promise.all([
            loadImage(emojiUrls.microphone).catch(() => null),
            loadImage(emojiUrls.envelope).catch(() => null),
            loadImage(emojiUrls.heart).catch(() => null),
            loadImage(emojiUrls.coin).catch(() => null)
        ])
        
        // Position stats row just above progress bar with small gap
        const barY = boxY + boxHeight + 58 // Moved up by 3 more
        const statsRowY = barY - 13 // Gap between emojis and experience line
        const statsEndX = contentX + barWidth
        const itemSpacing = 20 // Equal spacing between each stat item
        const emojiTextGap = 5 // Gap between emoji and its number
        
        // Prepare stat items with their widths
        const statItems = [
            { emoji: micEmoji, text: `${convertInt(vcHours)}` },
            { emoji: envEmoji, text: `${convertInt(messageCount)}` },
            { emoji: heartEmoji, text: `${convertInt(userLikes)}` },
            { emoji: coinEmoji, text: `${convertInt(userCurrency)}` }
        ]
        
        // Calculate total width
        let totalWidth = 0
        statItems.forEach((item, i) => {
            totalWidth += emojiSize + emojiTextGap + ctx.measureText(item.text).width
            if (i < statItems.length - 1) totalWidth += itemSpacing
        })
        
        // Start position (right-aligned to progress bar end)
        let currentX = statsEndX - totalWidth
        
        // Fixed Y position for all emojis (vertically centered with text)
        const textHeight = 24 // Approximate text height
        const emojiY = statsRowY - textHeight + (textHeight - emojiSize) / 2 + 4
        
        // Draw each stat item with equal spacing - all on same horizontal line
        statItems.forEach((item, i) => {
            // Draw emoji at fixed Y position
            if (item.emoji) ctx.drawImage(item.emoji, currentX, emojiY, emojiSize, emojiSize)
            currentX += emojiSize + emojiTextGap
            
            // Draw text at fixed Y position
            ctx.fillStyle = '#FFFFFF'
            ctx.fillText(item.text, currentX, statsRowY)
            currentX += ctx.measureText(item.text).width
            
            // Add spacing (except after last item)
            if (i < statItems.length - 1) currentX += itemSpacing
        })
        
        // Progress bar background
        roundRect(ctx, barX, barY, barWidth, barHeight, 19)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.fill()
        
        // Progress bar fill with gradient
        if (progress > 0) {
            const progressWidth = Math.max(barHeight, barWidth * progress)
            const progressGradient = ctx.createLinearGradient(barX, 0, barX + progressWidth, 0)
            progressGradient.addColorStop(0, '#00D4FF')
            progressGradient.addColorStop(1, '#00FF88')
            
            roundRect(ctx, barX, barY, progressWidth, barHeight, 19)
            ctx.fillStyle = progressGradient
            ctx.fill()
        }
        
        // Progress percentage (larger text - increased by 12)
        ctx.font = `bold 30px ${fontFamily}`
        ctx.fillStyle = '#FFFFFF'
        const percentText = `${Math.round(progress * 100)}%`
        ctx.fillText(percentText, barX + barWidth + 20, barY + 30)
        
        // Decorative elements - subtle grid pattern on right
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
        ctx.lineWidth = 1
        for (let i = 0; i < 8; i++) {
            ctx.beginPath()
            ctx.moveTo(width - 150 + i * 20, 0)
            ctx.lineTo(width - 150 + i * 20, height)
            ctx.stroke()
        }
        
        const buffer = canvas.toBuffer('image/png')
        
        // Display @user mention without notification (silent mention)
        const mentionContent = `<@${member.user.id}>`
        
        if (interaction.replied || interaction.deferred) {
            return interaction.editReply({ 
                content: mentionContent,
                files: [{ attachment: buffer, name: `rank_${member.user.id}.png` }],
                allowedMentions: { users: [] } // Silent mention - no notification
            })
        } else {
            return interaction.update({ 
                content: mentionContent,
                files: [{ attachment: buffer, name: `rank_${member.user.id}.png` }],
                allowedMentions: { users: [] } // Silent mention - no notification
            })
        }
    }
}
