/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers throughout the codebase
 */

module.exports = {
    // Reputation limits
    REPUTATION: {
        MAX_RP: 1000,
        MIN_RP: 0
    },

    // Pagination defaults
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 10,
        MAX_PAGE_SIZE: 25
    },

    // Cooldown defaults (in milliseconds)
    COOLDOWNS: {
        DEFAULT_COMMAND: 3000,
        LIKE: 86400000, // 24 hours
        DAILY: 86400000, // 24 hours
        WORK: 3600000 // 1 hour
    },

    // Percentage calculations
    PERCENTAGES: {
        MAX_CHANCE: 100,
        MIN_CHANCE: 0
    },

    // Discord limits
    DISCORD: {
        MAX_EMBED_DESCRIPTION: 4096,
        MAX_EMBED_TITLE: 256,
        MAX_EMBED_FIELDS: 25,
        MAX_EMBED_FIELD_NAME: 256,
        MAX_EMBED_FIELD_VALUE: 1024,
        MAX_EMBED_FOOTER: 2048,
        MAX_EMBED_AUTHOR: 256,
        MAX_TOTAL_EMBED_CHARS: 6000,
        MAX_MESSAGE_CONTENT: 2000,
        MAX_SELECT_OPTIONS: 25,
        MAX_BUTTONS_PER_ROW: 5,
        MAX_ACTION_ROWS: 5,
        MAX_CUSTOM_ID_LENGTH: 100
    },

    // Cache settings
    CACHE: {
        MESSAGE_LIFETIME: 86400, // 24 hours in seconds
        SWEEP_INTERVAL: 3600 // 1 hour in seconds
    },

    // Default emoji IDs for fallbacks
    EMOJIS: {
        DEFAULT_FALLBACK: '957227390759739453',
        UNKNOWN: '1005879832569204908'
    },

    // Database settings
    DATABASE: {
        MAX_RETRIES: 3,
        RETRY_DELAY: 5000 // 5 seconds
    },

    // Leaderboard settings
    LEADERBOARD: {
        TOP_POSITIONS: 10,
        MAX_DISPLAY: 100
    },

    // Voice settings
    VOICE: {
        MIN_BITRATE: 8000,
        MAX_BITRATE: 384000,
        DEFAULT_USER_LIMIT: 0
    },

    // Economy settings
    ECONOMY: {
        DEFAULT_STARTING_CURRENCY: 0,
        DEFAULT_STARTING_XP: 0,
        DEFAULT_LEVEL: 1
    }
}
