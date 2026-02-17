/**
 * Configuration constants for rank card rendering
 * Lofi Girl aesthetic design - matching the reference image
 */
const CARD_CONFIG = {
    // Canvas dimensions (wider format like the reference)
    width: 934,
    height: 282,

    // Semi-transparent overlay settings (dark rectangle inside background)
    overlay: {
        x: 200,
        y: 35,
        rightPadding: 30,
        bottomPadding: 35,
        borderRadius: 20,
        color: 'rgba(0, 0, 0, 0.6)'
    },

    // Avatar settings (circular, left side)
    avatar: {
        size: 180,
        x: 45,
        borderWidth: 5,
        borderColor: '#000000'
    },

    // Status indicator (bottom-right of avatar)
    status: {
        size: 35,
        borderWidth: 4,
        colors: {
            online: '#3BA55D',
            idle: '#FAA81A',
            dnd: '#ED4245',
            offline: '#747F8D'
        }
    },

    // Progress bar settings
    progressBar: {
        height: 28,
        marginTop: 95,
        marginRight: 60,
        backgroundColor: '#484B4E',
        fillColor: '#00D4FF'
    },

    // Color palette
    colors: {
        accent: '#00D4FF',      // Cyan for level number and progress bar
        white: '#FFFFFF',       // Username and rank number
        gray: '#99AAB5',        // XP text
        labelGray: '#72767D'    // RANK and LEVEL labels
    },

    // Font settings
    fonts: {
        primary: 'Gamestation',
        fallback: 'Arial, sans-serif',
        sizes: {
            rankNumber: 55,
            levelNumber: 55,
            rankLabel: 22,
            levelLabel: 22,
            username: 32,
            xpText: 22
        }
    },

    // Text positions (relative to overlay)
    text: {
        topRowY: 85,
        usernameOffsetY: 70,
        xpTextOffsetY: -10
    },

    // Default background - Lofi Girl style
    // Place your lofi_background.png in the project root for best results
    defaultBackground: './cover_card.png',
    fallbackBackground: './cover_card.png'
}

module.exports = { CARD_CONFIG }
