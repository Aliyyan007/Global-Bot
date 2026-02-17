const lang = require('../config/lang.json')

// Supported locales
const SUPPORTED_LOCALES = ['en-US', 'ru', 'uk', 'es-ES']
const DEFAULT_LOCALE = 'en-US'

// Cache for guild language preferences
const guildLanguages = {}

/**
 * Load language preferences for all guilds from cache
 * @param {Client} client - Discord client instance
 */
const loadLanguages = async (client) => {
  for (const guild of client.guilds.cache) {
    const guildId = guild[0]
    const settings = client.cache.settings.get(guildId)
    guildLanguages[guildId] = settings?.language || DEFAULT_LOCALE
  }
  console.log(`Successfully loaded languages.`)
}

/**
 * Set language preference for a guild
 * @param {string} guildId - Guild ID
 * @param {string} language - Language code (e.g., 'en-US', 'ru')
 */
const setLanguage = (guildId, language) => {
  guildLanguages[guildId] = language
}

/**
 * Get language preference for a guild
 * @param {string} guildId - Guild ID
 * @returns {string} Language code
 */
const getGuildLanguage = (guildId) => {
  return guildLanguages[guildId] || DEFAULT_LOCALE
}

/**
 * Normalize locale to supported format
 * @param {string} locale - Input locale
 * @returns {string} Normalized locale
 */
const normalizeLocale = (locale) => {
  if (!locale) return DEFAULT_LOCALE
  
  // Map en-GB to en-US
  if (locale === 'en-GB') return 'en-US'
  
  // Return locale if supported, otherwise default to English
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
}

/**
 * Get translated text based on locale priority
 * Priority: User Locale > Guild Language > English Default
 * 
 * @param {Object} data - Translation options
 * @param {string} data.textId - The translation key (English text)
 * @param {string} [data.guildId] - Guild ID for server-level language
 * @param {string} [data.locale] - User's Discord locale
 * @returns {string} Translated text
 */
module.exports = (data) => {
  const { guildId, textId, locale } = data
  
  // If translation key doesn't exist, return the key itself (assumed to be English)
  if (!lang.translations[textId]) {
    return textId
  }
  
  // Priority 1: User's Discord locale
  if (locale) {
    const normalizedLocale = normalizeLocale(locale)
    const translation = lang.translations[textId][normalizedLocale]
    
    // Return translation if found, otherwise fall back to English, then key
    return translation || lang.translations[textId][DEFAULT_LOCALE] || textId
  }
  
  // Priority 2: Guild's configured language
  if (guildId && guildLanguages[guildId]) {
    const guildLocale = guildLanguages[guildId]
    const translation = lang.translations[textId][guildLocale]
    
    // Return translation if found, otherwise fall back to English, then key
    return translation || lang.translations[textId][DEFAULT_LOCALE] || textId
  }
  
  // Priority 3: Default to English
  return lang.translations[textId][DEFAULT_LOCALE] || textId
}

module.exports.loadLanguages = loadLanguages
module.exports.setLanguage = setLanguage
module.exports.getGuildLanguage = getGuildLanguage
module.exports.normalizeLocale = normalizeLocale
module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES
module.exports.DEFAULT_LOCALE = DEFAULT_LOCALE
