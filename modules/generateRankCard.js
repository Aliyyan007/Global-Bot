/**
 * generateRankCard.js — v3 (reference layout + full features)
 *
 * Canvas 930x300 premium rank card. Visual language follows the reference
 * composition (avatar left with status dot, hero RANK + LEVEL numbers
 * top-right, username + XP mid-line, full-width progress bar at the bottom)
 * while keeping every feature of the previous version:
 *
 *   - 4 stats (coin / heart / envelope / mic) rendered as canvas primitives
 *   - In-bar themed decorations (paws / flames / bamboo / hearts / stars)
 *   - Themed mascot circle at the progress bar tip
 *   - Multilingual text (Arabic, Urdu, Hindi, CJK, etc.) via Noto fallbacks
 *   - Cached mascots, emojis, and backgrounds — zero repeat I/O after warmup
 *
 * Handler contract: exported as a function that the module loader can call
 * via `require(file)(client)`. Render helpers are attached as properties.
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
const path = require('path')
const fs   = require('fs')
const {
    getProgressBarStyle,
    getFontColorPreset,
    getMascotPath,
    hexToRgba
} = require('./rankCardThemes')

// ---------------------------------------------------------------------------
// Canvas + layout constants — matches reference 3.1:1 aspect ratio
// ---------------------------------------------------------------------------
const WIDTH   = 930
const HEIGHT  = 300
const RADIUS  = 22
const PADDING = 30

// Avatar (left side, vertically centered-ish high)
const AVATAR_SIZE = 160
const AVATAR_X    = 32
const AVATAR_Y    = 58
const AVATAR_CX   = AVATAR_X + AVATAR_SIZE / 2      // 112
const AVATAR_CY   = AVATAR_Y + AVATAR_SIZE / 2      // 138
const AVATAR_RING = 5

// Status dot (bottom-right of avatar, at 45°)
const STATUS_DOT_R    = 13
const STATUS_DOT_HALO = 6
const STATUS_DOT_CX   = AVATAR_CX + (AVATAR_SIZE / 2) * Math.cos(Math.PI / 4)
const STATUS_DOT_CY   = AVATAR_CY + (AVATAR_SIZE / 2) * Math.sin(Math.PI / 4)

// Content area (right of avatar)
const CONTENT_X = AVATAR_X + AVATAR_SIZE + 28       // 220
const CONTENT_R = WIDTH - PADDING                   // 900
const CONTENT_W = CONTENT_R - CONTENT_X             // 680

// Hero stats row (RANK + LEVEL) — right-aligned at top
const HERO_Y          = 58          // middle baseline
const HERO_NUM_SIZE   = 58
const HERO_LABEL_SIZE = 22
const HERO_GAP_LBL    = 14          // gap between label and its number
const HERO_GAP_STAT   = 40          // gap between RANK-group and LEVEL-group

// Username + XP line
const USERNAME_Y    = 130           // baseline
const USERNAME_SIZE = 33            // reduced from 38 to 33 (38 - 5)
const XP_Y          = 282           // moved up by 3 (285 - 3)
const XP_SIZE       = 20

// Stats row
const STATS_Y    = 175              // center y, moved up by 5 more (180 - 5)
const STATS_SIZE = 22

// Progress bar
const BAR_X = CONTENT_X
const BAR_Y = 208
const BAR_W = CONTENT_W - 3         // reduced width by 3
const BAR_H = 39                    // reduced height from 42 to 39 (42 - 3)

// ---------------------------------------------------------------------------
// Module-level caches (persist across renders, zero I/O after warmup)
// ---------------------------------------------------------------------------
const FONTS_REGISTERED = { done: false, families: [] }
const MASCOT_CACHE     = new Map() // filePath -> Image
const EMOJI_CACHE      = new Map() // url      -> Image | null
const BACKDROP_CACHE   = new Map() // url      -> Image

// ---------------------------------------------------------------------------
// Font registration — multilingual, runs once per process
// ---------------------------------------------------------------------------
function _safeRegister(filePath, familyName) {
    try {
        if (!fs.existsSync(filePath)) return false
        GlobalFonts.registerFromPath(filePath, familyName)
        FONTS_REGISTERED.families.push(familyName)
        return true
    } catch (_) { return false }
}

function registerFonts() {
    if (FONTS_REGISTERED.done) return

    // 1. Bundled display font (kept as low-priority fallback)
    _safeRegister(path.join(process.cwd(), 'GamestationCondensed.otf'), 'Gamestation')

    // 2. User-dropped fonts in ./fonts/ — Noto Sans family lives here after
    //    running `node scripts/downloadFonts.js`.
    try {
        const fontsDir = path.join(process.cwd(), 'fonts')
        if (fs.existsSync(fontsDir) && fs.statSync(fontsDir).isDirectory()) {
            for (const file of fs.readdirSync(fontsDir)) {
                if (!/\.(ttf|otf)$/i.test(file)) continue
                const full   = path.join(fontsDir, file)
                const family = file.replace(/\.(ttf|otf)$/i, '')
                _safeRegister(full, family)
                const alias = family.replace(/-(Regular|Bold|Medium|Light|Thin|Black|SemiBold)$/i, '')
                if (alias !== family) _safeRegister(full, alias)
            }
        }
    } catch (_) { /* ignore */ }

    // 3. Windows system fonts
    const winRoot = process.env.WINDIR ? path.join(process.env.WINDIR, 'Fonts') : 'C:\\Windows\\Fonts'
    const winFonts = [
        ['segoeui.ttf',   'Segoe UI'],
        ['segoeuib.ttf',  'Segoe UI Bold'],
        ['seguiemj.ttf',  'Segoe UI Emoji'],
        ['seguisym.ttf',  'Segoe UI Symbol'],
        ['tahoma.ttf',    'Tahoma'],
        ['arialuni.ttf',  'Arial Unicode'],
        ['mangal.ttf',    'Mangal'],
        ['nirmala.ttf',   'Nirmala UI'],
        ['simsun.ttc',    'SimSun']
    ]
    for (const [f, name] of winFonts) _safeRegister(path.join(winRoot, f), name)

    // 4. Linux system fonts (Noto / DejaVu on most distros)
    const linuxFonts = [
        ['/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',            'Noto Sans'],
        ['/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',               'Noto Sans Bold'],
        ['/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',      'Noto Sans Arabic'],
        ['/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf',  'Noto Sans Devanagari'],
        ['/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',         'Noto Sans CJK'],
        ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',         'Noto Sans CJK'],
        ['/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf',      'Noto Sans Hebrew'],
        ['/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf',        'Noto Sans Thai'],
        ['/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf',     'Noto Sans Bengali'],
        ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',                'DejaVu Sans'],
        ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',           'DejaVu Sans Bold'],
        ['/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf','Liberation Sans']
    ]
    for (const [f, name] of linuxFonts) _safeRegister(f, name)

    FONTS_REGISTERED.done = true
    if (process.env.DEBUG_RANK_CARD) {
        console.log('[RankCard] Registered fonts:', FONTS_REGISTERED.families.join(', ') || '(none)')
    }
}

// Clean modern sans-serif first (Noto/Segoe/DejaVu), Gamestation near the
// end so it isn't the primary face — matches the reference's clean feel.
const FONT_STACK_BOLD =
    '"Noto Sans Bold", "Noto Sans", "Noto Sans Arabic", "Noto Sans Devanagari", "Noto Sans CJK", "Noto Sans Hebrew", "Noto Sans Thai", "Noto Sans Bengali", "Segoe UI Bold", "Segoe UI", "Nirmala UI", "Arial Unicode", "DejaVu Sans Bold", "DejaVu Sans", "Liberation Sans", Tahoma, Gamestation, "Segoe UI Emoji", "Segoe UI Symbol", sans-serif'

const FONT_STACK_REG =
    '"Noto Sans", "Noto Sans Arabic", "Noto Sans Devanagari", "Noto Sans CJK", "Noto Sans Hebrew", "Noto Sans Thai", "Noto Sans Bengali", "Segoe UI", "Nirmala UI", "Arial Unicode", "DejaVu Sans", "Liberation Sans", Tahoma, Gamestation, "Segoe UI Emoji", "Segoe UI Symbol", sans-serif'

// ---------------------------------------------------------------------------
// Cached image loaders
// ---------------------------------------------------------------------------
async function loadMascotCached(style) {
    const p = getMascotPath(style)
    if (!p) return null
    if (MASCOT_CACHE.has(p)) return MASCOT_CACHE.get(p)
    try {
        if (!fs.existsSync(p)) { MASCOT_CACHE.set(p, null); return null }
        const img = await loadImage(p)
        MASCOT_CACHE.set(p, img)
        return img
    } catch (_) { MASCOT_CACHE.set(p, null); return null }
}

function twemojiUrlForCodepoints(cps) {
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cps.map(c => c.toString(16)).join('-')}.png`
}
async function loadTwemojiCached(cps) {
    const url = twemojiUrlForCodepoints(cps)
    if (EMOJI_CACHE.has(url)) return EMOJI_CACHE.get(url)
    try {
        const img = await loadImage(url)
        EMOJI_CACHE.set(url, img)
        return img
    } catch (_) { EMOJI_CACHE.set(url, null); return null }
}

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.lineTo(x + w - rr, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
    ctx.lineTo(x + w, y + h - rr)
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
    ctx.lineTo(x + rr, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
    ctx.lineTo(x, y + rr)
    ctx.quadraticCurveTo(x, y, x + rr, y)
    ctx.closePath()
}

function drawImageCover(ctx, img, x, y, w, h) {
    const iw = img.width, ih = img.height
    const scale = Math.max(w / iw, h / ih)
    const dw = iw * scale
    const dh = ih * scale
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

// ---------------------------------------------------------------------------
// Stats icons (canvas primitives — no network, no disk)
// ---------------------------------------------------------------------------
function drawCoinIcon(ctx, cx, cy, size) {
    const r = size / 2
    ctx.save()
    const g = ctx.createRadialGradient(cx - r / 3, cy - r / 3, r / 6, cx, cy, r)
    g.addColorStop(0, '#FFE68A'); g.addColorStop(0.6, '#F5C12E'); g.addColorStop(1, '#B58316')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(80, 50, 0, 0.55)'
    ctx.lineWidth = Math.max(1.2, size * 0.06)
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = 'rgba(70, 45, 0, 0.95)'
    ctx.font = `bold ${Math.round(size * 0.72)}px ${FONT_STACK_BOLD}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('$', cx, cy + size * 0.02)
    ctx.restore()
}

function drawHeartIcon(ctx, cx, cy, size, color) {
    ctx.save()
    ctx.fillStyle = color
    const s = size
    ctx.beginPath()
    ctx.moveTo(cx, cy + s * 0.36)
    ctx.bezierCurveTo(cx - s * 0.58, cy,            cx - s * 0.58, cy - s * 0.46, cx, cy - s * 0.14)
    ctx.bezierCurveTo(cx + s * 0.58, cy - s * 0.46, cx + s * 0.58, cy,            cx, cy + s * 0.36)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.32)'
    ctx.beginPath()
    ctx.ellipse(cx - s * 0.18, cy - s * 0.16, s * 0.12, s * 0.07, -Math.PI / 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

function drawEnvelopeIcon(ctx, cx, cy, size, color) {
    ctx.save()
    const w = size * 1.15, h = size * 0.80
    const x = cx - w / 2, y = cy - h / 2
    ctx.strokeStyle = color
    ctx.fillStyle   = 'rgba(255,255,255,0.04)'
    ctx.lineWidth   = Math.max(1.6, size * 0.09)
    ctx.lineJoin    = 'round'
    roundRect(ctx, x, y, w, h, size * 0.12); ctx.fill(); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + size * 0.06, y + size * 0.10)
    ctx.lineTo(cx,              cy + size * 0.06)
    ctx.lineTo(x + w - size * 0.06, y + size * 0.10)
    ctx.stroke()
    ctx.restore()
}

function drawMicIcon(ctx, cx, cy, size, color) {
    ctx.save()
    ctx.fillStyle = color; ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1.6, size * 0.11)
    const w = size * 0.50, h = size * 0.78
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h * 0.72, w / 2); ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy - size * 0.02, size * 0.40, Math.PI * 0.15, Math.PI - Math.PI * 0.15)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx, cy + size * 0.30); ctx.lineTo(cx, cy + size * 0.48); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - size * 0.24, cy + size * 0.48); ctx.lineTo(cx + size * 0.24, cy + size * 0.48); ctx.stroke()
    ctx.restore()
}

// ---------------------------------------------------------------------------
// In-bar decorations — white fill + dark outline + drop shadow so they stay
// visible on every theme's fill color (solves the "invisible stars on light
// bar" problem from the previous iteration).
// ---------------------------------------------------------------------------
function _withDecorStyle(ctx, fn) {
    ctx.save()
    ctx.fillStyle     = 'rgba(255, 255, 255, 0.95)'
    ctx.strokeStyle   = 'rgba(18, 22, 36, 0.75)'
    ctx.lineWidth     = 1.8
    ctx.lineJoin      = 'round'
    ctx.lineCap       = 'round'
    ctx.shadowColor   = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur    = 3
    ctx.shadowOffsetY = 1
    fn(ctx)
    ctx.restore()
}

function drawPaw(ctx, x, y, size) {
    _withDecorStyle(ctx, (c) => {
        c.beginPath()
        c.ellipse(x, y + size * 0.22, size * 0.44, size * 0.32, 0, 0, Math.PI * 2)
        c.fill(); c.stroke()
        const toeR = size * 0.15
        const toes = [[-0.34, -0.20], [-0.12, -0.40], [0.12, -0.40], [0.34, -0.20]]
        for (const [dx, dy] of toes) {
            c.beginPath()
            c.arc(x + size * dx, y + size * dy, toeR, 0, Math.PI * 2)
            c.fill(); c.stroke()
        }
    })
}

function drawFlame(ctx, x, y, size) {
    _withDecorStyle(ctx, (c) => {
        c.beginPath()
        c.moveTo(x, y - size * 0.52)
        c.bezierCurveTo(x + size * 0.48, y - size * 0.12, x + size * 0.36, y + size * 0.38, x, y + size * 0.44)
        c.bezierCurveTo(x - size * 0.36, y + size * 0.38, x - size * 0.48, y - size * 0.12, x, y - size * 0.52)
        c.closePath(); c.fill(); c.stroke()
    })
}

function drawBamboo(ctx, x, y, size) {
    _withDecorStyle(ctx, (c) => {
        c.translate(x, y)
        c.rotate(-Math.PI / 7)
        c.beginPath()
        c.ellipse(0, 0, size * 0.52, size * 0.20, 0, 0, Math.PI * 2)
        c.fill(); c.stroke()
    })
}

function drawHeartShape(ctx, x, y, size) {
    _withDecorStyle(ctx, (c) => {
        const s = size
        c.beginPath()
        c.moveTo(x, y + s * 0.36)
        c.bezierCurveTo(x - s * 0.58, y,            x - s * 0.58, y - s * 0.46, x, y - s * 0.14)
        c.bezierCurveTo(x + s * 0.58, y - s * 0.46, x + s * 0.58, y,            x, y + s * 0.36)
        c.closePath(); c.fill(); c.stroke()
    })
}

function drawStarShape(ctx, x, y, size) {
    _withDecorStyle(ctx, (c) => {
        const spikes = 5
        const outerR = size * 0.52
        const innerR = size * 0.22
        let rot = -Math.PI / 2
        c.beginPath()
        c.moveTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR)
        for (let i = 0; i < spikes; i++) {
            rot += Math.PI / spikes
            c.lineTo(x + Math.cos(rot) * innerR, y + Math.sin(rot) * innerR)
            rot += Math.PI / spikes
            c.lineTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR)
        }
        c.closePath(); c.fill(); c.stroke()
    })
}

const DECOR_DRAWERS = {
    paw: drawPaw, flame: drawFlame, bamboo: drawBamboo,
    heart: drawHeartShape, star: drawStarShape
}

// ---------------------------------------------------------------------------
// Text + emoji rendering (multilingual-safe via HarfBuzz shaping)
// ---------------------------------------------------------------------------
function _isEmojiRangeCodepoint(cp) {
    if (cp >= 0x1F000 && cp <= 0x1FFFF) return true
    if (cp >= 0x2600  && cp <= 0x27BF)  return true
    if (cp >= 0x2B00  && cp <= 0x2BFF)  return true
    if (cp >= 0x1F1E6 && cp <= 0x1F1FF) return true
    return false
}

function tokenizeWithEmojis(text) {
    const tokens = []
    let buf = ''
    const flush = () => { if (buf) { tokens.push({ type: 'text', value: buf }); buf = '' } }
    const chars = Array.from(text)
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i]
        const cp = ch.codePointAt(0)
        if (_isEmojiRangeCodepoint(cp)) {
            flush()
            const cps = [cp]
            let j = i + 1
            while (j < chars.length) {
                const ncp = chars[j].codePointAt(0)
                if (ncp === 0x200D) {
                    cps.push(ncp); j++
                    if (j < chars.length) { cps.push(chars[j].codePointAt(0)); j++ }
                } else if (ncp >= 0x1F3FB && ncp <= 0x1F3FF) {
                    cps.push(ncp); j++
                } else if (ncp === 0xFE0F || ncp === 0xFE0E) {
                    j++
                } else {
                    break
                }
            }
            tokens.push({ type: 'emoji', codepoints: cps })
            i = j - 1
        } else {
            buf += ch
        }
    }
    flush()
    return tokens
}

function _setFont(ctx, px, bold = true) {
    ctx.font = `${bold ? 'bold ' : ''}${Math.round(px)}px ${bold ? FONT_STACK_BOLD : FONT_STACK_REG}`
}

function _measureMixed(ctx, tokens, fontSize, bold) {
    _setFont(ctx, fontSize, bold)
    let w = 0
    for (const t of tokens) {
        if (t.type === 'text') w += ctx.measureText(t.value).width
        else                   w += fontSize * 1.08
    }
    return w
}

async function _drawMixed(ctx, tokens, x, y, fontSize, color, opts = {}) {
    const { bold = true, align = 'left', glow = null, maxWidth = Infinity } = opts
    let size = fontSize
    if (maxWidth !== Infinity) {
        while (size > 10 && _measureMixed(ctx, tokens, size, bold) > maxWidth) size -= 1
    }
    const totalW = _measureMixed(ctx, tokens, size, bold)
    let startX = x
    if (align === 'center') startX = x - totalW / 2
    else if (align === 'right') startX = x - totalW

    _setFont(ctx, size, bold)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign    = 'left'

    let cursor = startX
    for (const t of tokens) {
        if (t.type === 'text') {
            if (glow) {
                ctx.save()
                ctx.shadowColor = glow
                ctx.shadowBlur  = 12
                ctx.fillStyle   = color
                ctx.fillText(t.value, cursor, y)
                ctx.restore()
            } else {
                ctx.fillStyle = color
                ctx.fillText(t.value, cursor, y)
            }
            cursor += ctx.measureText(t.value).width
        } else {
            const img = await loadTwemojiCached(t.codepoints)
            const eSize = size * 1.08
            if (img) ctx.drawImage(img, cursor, y - eSize * 0.85, eSize, eSize)
            cursor += eSize
        }
    }
    return { width: totalW, fontSize: size }
}

// ---------------------------------------------------------------------------
// Section drawers
// ---------------------------------------------------------------------------
async function drawBackground(ctx, profile, settings, style) {
    // Profile-level background takes priority over server-level
    const customUrl = profile?.rank_card?.background || settings?.rank_card?.background
    if (customUrl) {
        try {
            let img = BACKDROP_CACHE.get(customUrl)
            if (!img) { img = await loadImage(customUrl); BACKDROP_CACHE.set(customUrl, img) }
            const brightness = (profile?.rank_card?.background_brightness
                ?? settings?.rank_card?.background_brightness ?? 100) / 100
            const blur       = (profile?.rank_card?.background_blur
                ?? settings?.rank_card?.background_blur ?? 0) / 10
            ctx.save()
            ctx.filter = `brightness(${brightness}) blur(${blur}px)`
            drawImageCover(ctx, img, 0, 0, WIDTH, HEIGHT)
            ctx.restore()
            // Dark overlay for legibility — 78% so text stays readable
            // even on very bright / colourful background images
            ctx.fillStyle = 'rgba(8, 10, 18, 0.78)'
            ctx.fillRect(0, 0, WIDTH, HEIGHT)
            return
        } catch (_) { /* fall through */ }
    }

    // Default: deep navy with subtle theme glow behind the avatar
    const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
    g.addColorStop(0,   '#0E1420')
    g.addColorStop(0.5, '#151D2E')
    g.addColorStop(1,   '#0A101B')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Radial theme glow behind avatar
    const rg = ctx.createRadialGradient(AVATAR_CX, AVATAR_CY, 20, AVATAR_CX, AVATAR_CY, AVATAR_SIZE * 1.4)
    rg.addColorStop(0, hexToRgba(style.colors.primary, 0.28))
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Right-side accent corner
    const cg = ctx.createLinearGradient(WIDTH * 0.55, 0, WIDTH, HEIGHT * 0.45)
    cg.addColorStop(0, 'rgba(0,0,0,0)')
    cg.addColorStop(1, hexToRgba(style.colors.accent, 0.22))
    ctx.fillStyle = cg
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Top sheen
    const s = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.4)
    s.addColorStop(0, 'rgba(255,255,255,0.04)')
    s.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = s
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
}

function drawCardFrame(ctx, style) {
    ctx.save()
    roundRect(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, RADIUS)
    ctx.strokeStyle = hexToRgba(style.colors.accent, 0.5)
    ctx.lineWidth   = 2
    ctx.stroke()
    ctx.restore()
}

async function drawAvatar(ctx, member, style) {
    // Outer soft glow (themed, subtle)
    ctx.save()
    ctx.shadowColor = style.colors.accent
    ctx.shadowBlur  = 32
    ctx.fillStyle   = hexToRgba(style.colors.accent, 0.6)
    ctx.beginPath()
    ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_SIZE / 2 + AVATAR_RING + 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // White primary ring (matches reference)
    ctx.save()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth   = AVATAR_RING
    ctx.beginPath()
    ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_SIZE / 2 + AVATAR_RING / 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Inner hairline highlight
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Clipped avatar
    let avatar = null
    try {
        avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
    } catch (_) { avatar = null }
    ctx.save()
    ctx.beginPath()
    ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    if (avatar) {
        drawImageCover(ctx, avatar, AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE)
    } else {
        ctx.fillStyle = '#1E2636'
        ctx.fillRect(AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE)
    }
    ctx.restore()
}

function drawStatusDot(ctx, member) {
    // Discord presence mapping — falls back to green when presence data
    // isn't available (GuildPresences intent disabled, user offline, etc.)
    const status = member?.presence?.status || 'online'
    const colorMap = {
        online:  '#23A55A',
        idle:    '#F0B232',
        dnd:     '#F23F43',
        offline: '#80848E'
    }
    const color = colorMap[status] || colorMap.online

    // Dark halo ring to separate dot from avatar contents
    ctx.save()
    ctx.fillStyle = '#0E1420'
    ctx.beginPath()
    ctx.arc(STATUS_DOT_CX, STATUS_DOT_CY, STATUS_DOT_R + STATUS_DOT_HALO / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Coloured dot
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur  = 8
    ctx.fillStyle   = color
    ctx.beginPath()
    ctx.arc(STATUS_DOT_CX, STATUS_DOT_CY, STATUS_DOT_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

// Hero stats row: right-aligned group of `RANK #1234   LEVEL 44`
function drawHeroStats(ctx, rank, level, font, style) {
    ctx.textBaseline = 'middle'

    const rankStr  = `#${rank > 0 ? rank : '—'}`
    const levelStr = String(level ?? 1)

    // --- Measure right-to-left ---------------------------------------------
    ctx.font = `bold ${HERO_NUM_SIZE}px ${FONT_STACK_BOLD}`
    const wLevelNum = ctx.measureText(levelStr).width

    ctx.font = `700 ${HERO_LABEL_SIZE}px ${FONT_STACK_BOLD}`
    const wLevelLbl = ctx.measureText('LEVEL').width

    ctx.font = `bold ${HERO_NUM_SIZE}px ${FONT_STACK_BOLD}`
    const wRankNum = ctx.measureText(rankStr).width

    ctx.font = `700 ${HERO_LABEL_SIZE}px ${FONT_STACK_BOLD}`
    const wRankLbl = ctx.measureText('RANK').width

    // Positions (x coordinates, right-aligned)
    const xLevelNumR = CONTENT_R
    const xLevelLblR = xLevelNumR - wLevelNum - HERO_GAP_LBL
    const xRankNumR  = xLevelLblR - wLevelLbl - HERO_GAP_STAT
    const xRankLblR  = xRankNumR  - wRankNum  - HERO_GAP_LBL

    // If the composed row would overflow the content area, shrink the numbers.
    const totalW = wLevelNum + HERO_GAP_LBL + wLevelLbl + HERO_GAP_STAT + wRankNum + HERO_GAP_LBL + wRankLbl
    let numSize = HERO_NUM_SIZE
    if (totalW > CONTENT_W) {
        const scale = CONTENT_W / totalW
        numSize = Math.max(38, Math.floor(HERO_NUM_SIZE * scale))
    }

    // --- Draw LEVEL number (accent color) ----------------------------------
    ctx.save()
    ctx.font      = `bold ${numSize}px ${FONT_STACK_BOLD}`
    ctx.textAlign = 'right'
    ctx.fillStyle = font.primary
    ctx.shadowColor = font.glow
    ctx.shadowBlur  = 14
    ctx.fillText(levelStr, xLevelNumR, HERO_Y)
    ctx.restore()

    const wLevelNum2 = (() => {
        ctx.font = `bold ${numSize}px ${FONT_STACK_BOLD}`
        return ctx.measureText(levelStr).width
    })()

    // --- Draw LEVEL label --------------------------------------------------
    const xLevelLblR2 = xLevelNumR - wLevelNum2 - HERO_GAP_LBL
    ctx.save()
    ctx.font      = `700 ${HERO_LABEL_SIZE}px ${FONT_STACK_BOLD}`
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.fillText('LEVEL', xLevelLblR2, HERO_Y + 2)
    ctx.restore()

    // --- Draw RANK number (white) ------------------------------------------
    const xRankNumR2 = xLevelLblR2 - wLevelLbl - HERO_GAP_STAT
    ctx.save()
    ctx.font      = `bold ${numSize}px ${FONT_STACK_BOLD}`
    ctx.textAlign = 'right'
    ctx.fillStyle = '#FFFFFF'
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur  = 6
    ctx.fillText(rankStr, xRankNumR2, HERO_Y)
    ctx.restore()

    const wRankNum2 = (() => {
        ctx.font = `bold ${numSize}px ${FONT_STACK_BOLD}`
        return ctx.measureText(rankStr).width
    })()

    // --- Draw RANK label ---------------------------------------------------
    const xRankLblR2 = xRankNumR2 - wRankNum2 - HERO_GAP_LBL
    ctx.save()
    ctx.font      = `700 ${HERO_LABEL_SIZE}px ${FONT_STACK_BOLD}`
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.fillText('RANK', xRankLblR2, HERO_Y + 2)
    ctx.restore()
}

async function drawUsernameLine(ctx, member, font) {
    const name = member.user.username || member.displayName || 'User'
    const tokens = tokenizeWithEmojis(name)

    // Reserve space on the right for XP numbers so they never overlap.
    // Max width ≈ half the content area.
    const maxW = Math.floor(CONTENT_W * 0.60)

    await _drawMixed(ctx, tokens, CONTENT_X, USERNAME_Y, USERNAME_SIZE, '#FFFFFF', {
        bold: true,
        glow: font.glow,
        maxWidth: maxW
    })
}

function formatStat(n) {
    if (n == null || isNaN(n)) return '0'
    const v = Math.floor(+n)
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (v >= 10_000)    return Math.floor(v / 1000) + 'K'
    if (v >= 1_000)     return (v / 1000).toFixed(2).replace(/\.?0+$/, '') + 'K'
    return String(v)
}

function drawXpLine(ctx, xp, xpNeeded) {
    ctx.save()
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign    = 'right'
    ctx.font         = `700 ${XP_SIZE}px ${FONT_STACK_BOLD}`
    // Right half (needed XP + label) in soft white
    const needed = `${formatStat(xpNeeded)} XP`
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    // Move to the left by 45px total (30 + 15)
    ctx.fillText(needed, CONTENT_R - 45, XP_Y)
    const wNeeded = ctx.measureText(needed).width

    // Slash separator
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText(' / ', CONTENT_R - 45 - wNeeded, XP_Y)
    const wSlash = ctx.measureText(' / ').width

    // Current XP bright white
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(formatStat(xp), CONTENT_R - 45 - wNeeded - wSlash, XP_Y)
    ctx.restore()
}

function drawStatsRow(ctx, profile, font) {
    const entries = [
        { icon: 'coin',     val: formatStat(profile?.currency),                       color: font.primary   },
        { icon: 'heart',    val: formatStat(profile?.likes),                          color: '#FF6B8A'      },
        { icon: 'envelope', val: formatStat(profile?.messages),                       color: font.secondary },
        { icon: 'mic',      val: formatStat(Math.ceil(profile?.hours || 0)) + 'h',    color: font.secondary }
    ]

    ctx.save()
    ctx.font         = `700 ${STATS_SIZE}px ${FONT_STACK_BOLD}`
    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'right'

    const ICON  = 24
    const GAP_I = 10
    const GAP_E = 24
    const SEP_W = 2

    // Calculate total width first to position from right
    let totalWidth = 0
    entries.forEach((e, idx) => {
        totalWidth += ICON + GAP_I
        ctx.textAlign = 'left'
        totalWidth += ctx.measureText(e.val).width
        if (idx < entries.length - 1) {
            totalWidth += GAP_E
        }
    })

    // Start from right side, shifted left by 20 (5 + 15)
    let cursor = CONTENT_R - totalWidth - 20
    ctx.textAlign = 'left'
    
    entries.forEach((e, idx) => {
        const iconCX = cursor + ICON / 2
        switch (e.icon) {
            case 'coin':     drawCoinIcon(ctx, iconCX, STATS_Y, ICON); break
            case 'heart':    drawHeartIcon(ctx, iconCX, STATS_Y, ICON, e.color); break
            case 'envelope': drawEnvelopeIcon(ctx, iconCX, STATS_Y, ICON, e.color); break
            case 'mic':      drawMicIcon(ctx, iconCX, STATS_Y, ICON, e.color); break
        }
        cursor += ICON + GAP_I

        // Value label
        ctx.fillStyle   = '#FFFFFF'
        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur  = 2
        ctx.fillText(e.val, cursor, STATS_Y + 1)
        ctx.shadowBlur  = 0
        cursor += ctx.measureText(e.val).width + GAP_E

        if (idx < entries.length - 1 && cursor < CONTENT_R - 20) {
            ctx.fillStyle = 'rgba(255,255,255,0.12)'
            ctx.fillRect(cursor - GAP_E / 2 - SEP_W / 2, STATS_Y - ICON * 0.42, SEP_W, ICON * 0.85)
        }
    })
    ctx.restore()
}

async function drawProgressBar(ctx, progress, style) {
    const r = BAR_H / 2

    // Track with inset shadow
    ctx.save()
    ctx.shadowColor   = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur    = 8
    ctx.shadowOffsetY = 2
    roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, r)
    ctx.fillStyle = style.trackColor
    ctx.fill()
    ctx.restore()

    // Inner track edge
    ctx.save()
    roundRect(ctx, BAR_X + 1, BAR_Y + 1, BAR_W - 2, BAR_H - 2, r - 1)
    ctx.strokeStyle = style.trackEdge
    ctx.lineWidth   = 1.2
    ctx.stroke()
    ctx.restore()

    // Even at 0 XP we still want the mascot to appear at the bar's left edge,
    // so we never return early — we just skip the gradient fill + decorations.
    const fillW = progress > 0
        ? Math.max(BAR_H, Math.min(BAR_W, progress * BAR_W))
        : 0

    // Fill + decorations — only when there's actual progress to show
    if (fillW > 0) {
        ctx.save()
        roundRect(ctx, BAR_X, BAR_Y, fillW, BAR_H, r)
        ctx.clip()

        const grad = ctx.createLinearGradient(BAR_X, BAR_Y, BAR_X + fillW, BAR_Y + BAR_H)
        grad.addColorStop(0,   style.colors.primary)
        grad.addColorStop(0.5, style.colors.secondary)
        grad.addColorStop(1,   style.colors.tertiary)
        ctx.fillStyle = grad
        ctx.fillRect(BAR_X, BAR_Y, fillW, BAR_H)

        // Top gloss band
        const gloss = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H)
        gloss.addColorStop(0,   'rgba(255,255,255,0.30)')
        gloss.addColorStop(0.5, 'rgba(255,255,255,0.08)')
        gloss.addColorStop(1,   'rgba(0,0,0,0.22)')
        ctx.fillStyle = gloss
        ctx.fillRect(BAR_X, BAR_Y, fillW, BAR_H)

        // High-contrast decorations
        const decor = style.decoration
        if (decor && DECOR_DRAWERS[decor.type]) {
            const drawer  = DECOR_DRAWERS[decor.type]
            const size    = Math.round(BAR_H * 0.58)
            const spacing = decor.density || 60
            const start   = BAR_X + spacing * 0.75
            const cy      = BAR_Y + BAR_H / 2
            for (let x = start; x < BAR_X + fillW - size * 0.4; x += spacing) {
                const jitter = ((Math.floor((x - BAR_X) / spacing)) % 2 === 0) ? -3 : 3
                drawer(ctx, x, cy + jitter, size)
            }
        }
        ctx.restore()
    }

    // Outer border (always visible)
    ctx.save()
    roundRect(ctx, BAR_X + 0.5, BAR_Y + 0.5, BAR_W - 1, BAR_H - 1, r)
    ctx.strokeStyle = style.borderColor
    ctx.lineWidth   = 1.4
    ctx.stroke()
    ctx.restore()

    // Themed mascot — ALWAYS drawn, even at 0 XP.
    // At zero progress it sits at the bar's left edge; otherwise at the fill tip.
    const mascot = await loadMascotCached(style)
    if (mascot) {
        const mSize = Math.round(BAR_H * 1.65)
        const mascotX = fillW > 0 ? BAR_X + fillW : BAR_X + mSize / 2 + 2
        const cx = mascotX
        const cy = BAR_Y + BAR_H / 2
        const mr = mSize / 2

        ctx.save()
        ctx.shadowColor = style.colors.accent
        ctx.shadowBlur  = 22
        ctx.fillStyle   = '#0B111C'
        ctx.beginPath()
        ctx.arc(cx, cy, mr, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        ctx.save()
        const ring = ctx.createLinearGradient(cx - mr, cy - mr, cx + mr, cy + mr)
        ring.addColorStop(0, style.colors.primary)
        ring.addColorStop(1, style.colors.tertiary)
        ctx.strokeStyle = ring
        ctx.lineWidth   = 3
        ctx.beginPath()
        ctx.arc(cx, cy, mr - 1.5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, mr - 3, 0, Math.PI * 2)
        ctx.clip()
        const imgSize = mSize - 7
        ctx.drawImage(mascot, cx - imgSize / 2, cy - imgSize / 2, imgSize, imgSize)
        ctx.restore()
    }
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
async function generateRankCard({ member, profile, settings, rank }) {
    registerFonts()

    const styleId = profile?.rank_card?.progress_bar_style
        || settings?.rank_card?.progress_bar_style
    const fontId  = profile?.rank_card?.font_color_preset
        || settings?.rank_card?.font_color_preset
    const style = getProgressBarStyle(styleId)
    const font  = getFontColorPreset(fontId)

    const canvas = createCanvas(WIDTH, HEIGHT)
    const ctx    = canvas.getContext('2d')

    // Clip everything to rounded card shape
    ctx.save()
    roundRect(ctx, 0, 0, WIDTH, HEIGHT, RADIUS)
    ctx.clip()

    // 1. Background (custom image or themed gradient)
    await drawBackground(ctx, profile, settings, style)

    // 2. Thin outer frame
    drawCardFrame(ctx, style)

    // 3. Avatar + status dot
    await drawAvatar(ctx, member, style)
    drawStatusDot(ctx, member)

    // 4. Hero stats (RANK + LEVEL at top)
    drawHeroStats(ctx, rank, profile?.level ?? 1, font, style)

    // 5. Username + XP numbers on the same baseline
    await drawUsernameLine(ctx, member, font)
    const xp       = Math.floor(profile?.xp || 0)
    const levelFac = settings?.levelfactor ?? 100
    const xpNeeded = ((profile?.level ?? 1) * levelFac) + 100
    drawXpLine(ctx, xp, xpNeeded)

    // 6. Stats row
    drawStatsRow(ctx, profile, font)

    // 7. Progress bar + decorations + mascot
    const progress = xpNeeded > 0 ? Math.min(1, xp / xpNeeded) : 0
    await drawProgressBar(ctx, progress, style)

    ctx.restore()
    return canvas.toBuffer('image/png')
}

// ---------------------------------------------------------------------------
// Handler export (module loader expects a callable function)
// ---------------------------------------------------------------------------
const moduleInit = function (_client) {
    // Warm up fonts at bot boot so the first /rank doesn't pay that cost.
    try { registerFonts() } catch (_) { /* ignore */ }
}
moduleInit.generateRankCard = generateRankCard
moduleInit.registerFonts    = registerFonts

module.exports = moduleInit
module.exports.generateRankCard = generateRankCard
module.exports.registerFonts    = registerFonts
