/**
 * Emoji Parser Utility
 * Handles parsing and conversion of emoji shortcodes to Discord format
 */

/**
 * Parses emoji shortcodes in text and converts them to Discord emoji format
 * Converts :emoji_name: to <:emoji_name:emoji_id> for custom emojis
 * @param {string} text - The text containing emoji shortcodes
 * @param {Guild} guild - The guild to search for emojis
 * @returns {string} - Text with emojis converted to Discord format
 */
function parseEmojisInText(text, guild) {
  if (!text || !guild) return text;
  
  // Match :emoji_name: pattern
  const emojiPattern = /:([a-zA-Z0-9_]+):/g;
  
  return text.replace(emojiPattern, (match, emojiName) => {
    // Try to find the emoji in the guild
    const emoji = guild.emojis.cache.find(e => e.name === emojiName);
    
    if (emoji) {
      // Convert to Discord emoji format
      return emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
    }
    
    // If emoji not found, keep the original text
    return match;
  });
}

module.exports = {
  parseEmojisInText
};
