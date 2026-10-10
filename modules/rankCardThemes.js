/**
 * Rank Card Themes
 * 5 premium progress bar styles (each with a mascot face + themed decorations)
 * 5 neon font color presets.
 *
 * Mascot images live in the local `images/` folder so rendering never has to
 * hit the network for a mascot. They are loaded lazily and cached for the
 * life of the process by `modules/generateRankCard.js`.
 *
 * Used by:
 *   - modules/generateRankCard.js
 *   - slash-commands/rank.js
 *   - slash-commands/rank-set.js
 */

const path = require('path')

const IMAGES_DIR = path.join(process.cwd(), 'images')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hexToRgba(hex, alpha = 1) {
    const h = hex.replace('#', '')
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ---------------------------------------------------------------------------
// Progress Bar Styles
// ---------------------------------------------------------------------------
// Each theme has:
//   - id, label, description, emoji (used in the select menu)
//   - mascotFile: the filename inside /images used at the progress bar tip
//   - colors: primary / secondary / tertiary gradient stops + accent glow
//   - borderColor: thin ring around the bar
//   - trackColor / trackEdge: empty track fill + inner shadow color
//   - decoration: { type, color, density }
//       type    -> 'paw' | 'flame' | 'bamboo' | 'heart' | 'star'
//       color   -> rgba string, stroke+fill color for the primitive
//       density -> approximate spacing in pixels between decorations
const PROGRESS_BAR_STYLES = {
    bad_boy: {
        id: 'bad_boy',
        label: 'Bad Boy',
        description: 'Fiery red + orange flames. Bold & aggressive.',
        emoji: '👹',
        mascotFile: 'Bad Boy.png',
        colors: {
            primary:   '#FF3D3D',
            secondary: '#FF7A1F',
            tertiary:  '#FFD24C',
            accent:    '#FF3D3D'
        },
        borderColor: 'rgba(255, 93, 52, 0.85)',
        trackColor:  'rgba(60, 10, 10, 0.55)',
        trackEdge:   'rgba(255, 90, 50, 0.25)',
        decoration: { type: 'flame', color: 'rgba(255, 230, 120, 0.95)', density: 55 }
    },

    cat_face: {
        id: 'cat_face',
        label: 'Cat Face',
        description: 'Cream peach with fluttering hearts. Cute & warm.',
        emoji: '🐱',
        mascotFile: 'Cat Face.png',
        colors: {
            primary:   '#FFA266',
            secondary: '#FFC48A',
            tertiary:  '#FFE1B8',
            accent:    '#FF9452'
        },
        borderColor: 'rgba(255, 160, 110, 0.85)',
        trackColor:  'rgba(70, 40, 20, 0.5)',
        trackEdge:   'rgba(255, 180, 140, 0.25)',
        decoration: { type: 'heart', color: 'rgba(255, 120, 150, 0.95)', density: 58 }
    },

    panda_face: {
        id: 'panda_face',
        label: 'Panda Face',
        description: 'Sage green + charcoal with bamboo leaves. Calm & zen.',
        emoji: '🐼',
        mascotFile: 'Panda Face.png',
        colors: {
            primary:   '#4C6B52',
            secondary: '#8BA77A',
            tertiary:  '#C8D3A3',
            accent:    '#6FA36F'
        },
        borderColor: 'rgba(180, 200, 150, 0.85)',
        trackColor:  'rgba(20, 28, 22, 0.6)',
        trackEdge:   'rgba(180, 200, 150, 0.25)',
        decoration: { type: 'bamboo', color: 'rgba(220, 235, 200, 0.95)', density: 62 }
    },

    puppy_face: {
        id: 'puppy_face',
        label: 'Puppy Face',
        description: 'Warm browns & cream with paw prints. Friendly & playful.',
        emoji: '🐶',
        mascotFile: 'Pupy Face.png',
        colors: {
            primary:   '#A8692F',
            secondary: '#D1984C',
            tertiary:  '#F5D9A8',
            accent:    '#B8773A'
        },
        borderColor: 'rgba(210, 160, 100, 0.9)',
        trackColor:  'rgba(40, 22, 10, 0.55)',
        trackEdge:   'rgba(220, 175, 120, 0.25)',
        decoration: { type: 'paw', color: 'rgba(255, 235, 200, 0.95)', density: 56 }
    },

    sigma_face: {
        id: 'sigma_face',
        label: 'Sigma Face',
        description: 'Steel blue + silver with stars. Stoic & classy.',
        emoji: '🗿',
        mascotFile: 'Sigma Face.png',
        colors: {
            primary:   '#3E5566',
            secondary: '#6C8699',
            tertiary:  '#B8C7D2',
            accent:    '#7A94A6'
        },
        borderColor: 'rgba(170, 190, 210, 0.85)',
        trackColor:  'rgba(18, 24, 30, 0.6)',
        trackEdge:   'rgba(150, 175, 195, 0.25)',
        decoration: { type: 'star', color: 'rgba(230, 240, 255, 0.95)', density: 58 }
    }
}

// ---------------------------------------------------------------------------
// Font Color Presets (neon, high-contrast, attractive)
// ---------------------------------------------------------------------------
// primary   -> username + big numbers
// secondary -> rank line, stats labels
// muted     -> XP numbers, footer
// glow      -> subtle text-shadow color used for the username
const FONT_COLOR_PRESETS = {
    neon_cyan: {
        id: 'neon_cyan',
        label: 'Neon Cyan',
        description: 'Electric aqua that pops on any dark background.',
        emoji: '💠',
        primary:   '#00F0FF',
        secondary: '#7CF2FF',
        muted:     'rgba(200, 245, 255, 0.75)',
        glow:      'rgba(0, 240, 255, 0.85)'
    },
    hot_magenta: {
        id: 'hot_magenta',
        label: 'Hot Magenta',
        description: 'Bold pink with soft rose accents. Retro synthwave.',
        emoji: '💖',
        primary:   '#FF2E88',
        secondary: '#FF82BF',
        muted:     'rgba(255, 200, 220, 0.75)',
        glow:      'rgba(255, 46, 136, 0.85)'
    },
    electric_lime: {
        id: 'electric_lime',
        label: 'Electric Lime',
        description: 'Radioactive green. Fresh, energetic, gamer-grade.',
        emoji: '🟢',
        primary:   '#D1FF3D',
        secondary: '#E8FF89',
        muted:     'rgba(230, 250, 200, 0.75)',
        glow:      'rgba(209, 255, 61, 0.85)'
    },
    solar_gold: {
        id: 'solar_gold',
        label: 'Solar Gold',
        description: 'Warm glowing gold. Luxury and prestige.',
        emoji: '👑',
        primary:   '#FFD23F',
        secondary: '#FFE68A',
        muted:     'rgba(255, 235, 180, 0.75)',
        glow:      'rgba(255, 210, 63, 0.85)'
    },
    neon_violet: {
        id: 'neon_violet',
        label: 'Neon Violet',
        description: 'Mystic purple with lavender highlights. Cosmic & premium.',
        emoji: '🔮',
        primary:   '#C77DFF',
        secondary: '#E2B7FF',
        muted:     'rgba(230, 205, 255, 0.75)',
        glow:      'rgba(199, 125, 255, 0.85)'
    }
}

// ---------------------------------------------------------------------------
// Defaults + lookup helpers
// ---------------------------------------------------------------------------
const DEFAULT_PROGRESS_BAR_STYLE = 'puppy_face'
const DEFAULT_FONT_COLOR_PRESET  = 'neon_cyan'

// Map old ids from the previous theme set -> new ids, so existing documents
// don't silently collapse to the default.
const LEGACY_STYLE_ALIASES = {
    neon_pulse: 'bad_boy',
    aurora:     'sigma_face',
    sci_fi:     'sigma_face',
    emoji_pop:  'cat_face',
    puppy_paws: 'puppy_face'
}
const LEGACY_FONT_ALIASES = {
    pure_white:    'neon_cyan',
    imperial_gold: 'solar_gold',
    arctic_ice:    'neon_cyan',
    rose_quartz:   'hot_magenta',
    mint_fresh:    'electric_lime'
}

function getProgressBarStyle(id) {
    if (!id) return PROGRESS_BAR_STYLES[DEFAULT_PROGRESS_BAR_STYLE]
    if (PROGRESS_BAR_STYLES[id]) return PROGRESS_BAR_STYLES[id]
    const aliased = LEGACY_STYLE_ALIASES[id]
    if (aliased && PROGRESS_BAR_STYLES[aliased]) return PROGRESS_BAR_STYLES[aliased]
    return PROGRESS_BAR_STYLES[DEFAULT_PROGRESS_BAR_STYLE]
}

function getFontColorPreset(id) {
    if (!id) return FONT_COLOR_PRESETS[DEFAULT_FONT_COLOR_PRESET]
    if (FONT_COLOR_PRESETS[id]) return FONT_COLOR_PRESETS[id]
    const aliased = LEGACY_FONT_ALIASES[id]
    if (aliased && FONT_COLOR_PRESETS[aliased]) return FONT_COLOR_PRESETS[aliased]
    return FONT_COLOR_PRESETS[DEFAULT_FONT_COLOR_PRESET]
}

function getMascotPath(styleIdOrObject) {
    const style = typeof styleIdOrObject === 'string'
        ? getProgressBarStyle(styleIdOrObject)
        : styleIdOrObject
    if (!style?.mascotFile) return null
    return path.join(IMAGES_DIR, style.mascotFile)
}

// The project's module loader (`handler/index.js`) does `require(path)(client)`
// on every top-level file inside `modules/`, so this file MUST export a
// function. We export a no-op init function with all theme exports attached
// as properties, so both patterns work:
//
//   require('.../rankCardThemes')(client)          // no-op init
//   require('.../rankCardThemes').PROGRESS_BAR_STYLES
//   const { getProgressBarStyle } = require('.../rankCardThemes')
const moduleInit = function (_client) { /* no-op: pure data module */ }

moduleInit.PROGRESS_BAR_STYLES        = PROGRESS_BAR_STYLES
moduleInit.FONT_COLOR_PRESETS         = FONT_COLOR_PRESETS
moduleInit.DEFAULT_PROGRESS_BAR_STYLE = DEFAULT_PROGRESS_BAR_STYLE
moduleInit.DEFAULT_FONT_COLOR_PRESET  = DEFAULT_FONT_COLOR_PRESET
moduleInit.LEGACY_STYLE_ALIASES       = LEGACY_STYLE_ALIASES
moduleInit.LEGACY_FONT_ALIASES        = LEGACY_FONT_ALIASES
moduleInit.getProgressBarStyle        = getProgressBarStyle
moduleInit.getFontColorPreset         = getFontColorPreset
moduleInit.getMascotPath              = getMascotPath
moduleInit.hexToRgba                  = hexToRgba
moduleInit.IMAGES_DIR                 = IMAGES_DIR

module.exports = moduleInit
