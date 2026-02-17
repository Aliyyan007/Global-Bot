/**
 * Channel Styling Module for Auto Voice Channel System
 * Handles emoji keyword matching for channel names
 * Requirements: 4.1, 4.2, 4.3
 */

// Default emoji when no keyword matches
const DEFAULT_EMOJI = '💬';

// Emoji map for keyword matching (case-insensitive)
const EMOJI_MAP = {
  // Gaming
  'game': '🎮',
  'gaming': '🎮',
  'play': '🎮',
  'playing': '🎮',
  'valorant': '🎮',
  'minecraft': '⛏️',
  'fortnite': '🎮',
  'league': '🎮',
  'apex': '🎮',
  'cod': '🎮',
  'csgo': '🎮',
  'cs2': '🎮',
  'overwatch': '🎮',
  'gta': '🎮',
  'roblox': '🎮',
  
  // Music & Audio
  'music': '🎵',
  'song': '🎵',
  'singing': '🎤',
  'karaoke': '🎤',
  'listen': '🎧',
  'podcast': '🎙️',
  'radio': '📻',
  
  // Streaming & Content
  'stream': '📡',
  'streaming': '📡',
  'live': '🔴',
  'youtube': '📺',
  'twitch': '📡',
  'watch': '📺',
  'movie': '🎬',
  'film': '🎬',
  
  // Social & Chill
  'chill': '❄️',
  'chilling': '❄️',
  'vibe': '✨',
  'vibes': '✨',
  'hang': '🛋️',
  'hangout': '🛋️',
  'chat': '💬',
  'talk': '💬',
  'talking': '💬',
  
  // Work & Study
  'work': '💼',
  'working': '💼',
  'study': '📚',
  'studying': '📚',
  'homework': '📝',
  'coding': '💻',
  'code': '💻',
  'programming': '💻',
  
  // Activities
  'sleep': '😴',
  'sleeping': '😴',
  'afk': '💤',
  'eat': '🍽️',
  'eating': '🍽️',
  'food': '🍕',
  
  // Emotions & Moods
  'party': '🎉',
  'fun': '🎊',
  'sad': '😢',
  'happy': '😊',
  'angry': '😠',
  'love': '❤️',
  
  // Sports & Fitness
  'sport': '⚽',
  'sports': '⚽',
  'gym': '💪',
  'workout': '💪',
  'fitness': '💪',
  
  // Other
  'help': '🆘',
  'support': '🤝',
  'private': '🔒',
  'secret': '🤫',
  'quiet': '🤫',
  'loud': '📢',
  'nsfw': '🔞',
  'adult': '🔞'
};

/**
 * Gets the appropriate emoji for a given text based on keyword matching
 * @param {string} text - The text to search for keywords
 * @returns {string} The matching emoji or default emoji
 */
function getEmojiForText(text) {
  if (!text || typeof text !== 'string') {
    return DEFAULT_EMOJI;
  }
  
  const lowerText = text.toLowerCase();
  
  // Check each keyword in the map
  for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(lowerText)) {
      return emoji;
    }
  }
  
  return DEFAULT_EMOJI;
}

/**
 * Formats a channel name with an appropriate emoji prefix
 * @param {string} name - The channel name to format
 * @returns {string} The formatted name with emoji prefix
 */
function formatChannelName(name) {
  if (!name || typeof name !== 'string') {
    return `${DEFAULT_EMOJI} Voice Channel`;
  }
  
  // Remove any existing emoji at the start (common emoji ranges)
  const cleanName = name.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, '').trim();
  
  const emoji = getEmojiForText(cleanName);
  return `${emoji} ${cleanName}`;
}

/**
 * Checks if a keyword exists in the emoji map
 * @param {string} keyword - The keyword to check
 * @returns {boolean} True if keyword exists in map
 */
function hasKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return false;
  }
  return keyword.toLowerCase() in EMOJI_MAP;
}

module.exports = {
  EMOJI_MAP,
  DEFAULT_EMOJI,
  getEmojiForText,
  formatChannelName,
  hasKeyword
};
