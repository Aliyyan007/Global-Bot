/**
 * Cooldown Parser Utility
 * Parses cooldown duration strings into milliseconds
 * 
 * Supported formats:
 * - {integer}min - Minutes (e.g., "30min" = 1,800,000ms)
 * - {integer}h - Hours (e.g., "2h" = 7,200,000ms)
 * - {integer}d - Days (e.g., "1d" = 86,400,000ms)
 */

/**
 * Parses a cooldown string into milliseconds
 * @param {string} input - Cooldown string (e.g., "30min", "2h", "1d")
 * @returns {number|null} - Milliseconds or null if invalid format
 */
function parseCooldown(input) {
    if (typeof input !== 'string' || !input.trim()) {
        return null
    }

    const trimmed = input.trim()
    const match = trimmed.match(/^(\d+)(min|h|d)$/i)
    
    if (!match) {
        return null
    }

    const value = parseInt(match[1], 10)
    const unit = match[2].toLowerCase()

    // Reject zero or negative values
    if (value <= 0) {
        return null
    }

    switch (unit) {
        case 'min':
            return value * 60 * 1000
        case 'h':
            return value * 60 * 60 * 1000
        case 'd':
            return value * 24 * 60 * 60 * 1000
        default:
            return null
    }
}

module.exports = { parseCooldown }
