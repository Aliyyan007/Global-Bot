const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
const path = require('path')

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

/**
 * Generate a rank card buffer for a member
 * @param {Object} options
 * @param {GuildMember} options.member - The guild member
 * @param {Object} options.profile - The user's profile
 * @param {Object} options.settings - The guild settings
 * @param {number} options.rank - The user's rank position
 * @returns {Promise<Buffer>} - PNG buffer of the rank card
 */
async function generateRankCard({ member, profile, settings, rank }) {
    // XP values
    const xp = Math.floor(profile.xp)
    const finalXp = profile.level * settings.levelfactor + 100
    const level = profile.level

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
    
    // Username (larger, Canva Sans style - using Arial as fallback)
    const displayName = member.displayName.length > 16 ? member.displayName.substring(0, 16) + '...' : member.displayName
    ctx.font = `bold 38px Arial, sans-serif`
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(displayName, contentX, 68)
    
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
    
    return canvas.toBuffer('image/png')
}

// Export as a module initializer function (required by handler/index.js)
// Also attach the generateRankCard function for use by other modules
module.exports = function(client) {
    // No initialization needed - this is a utility module
}
module.exports.generateRankCard = generateRankCard
