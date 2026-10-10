/**
 * Rate Limit Tracker
 * Tracks channel rename operations to prevent hitting Discord's rate limits
 * Discord limits: 2 channel renames per 10 minutes
 */

// Store rename history: channelId -> [timestamp1, timestamp2]
const channelRenameHistory = new Map();

const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_RENAMES = 2; // Discord allows 2 renames per 10 minutes

/**
 * Checks if a channel can be renamed without hitting rate limits
 * @param {string} channelId - The channel ID to check
 * @returns {Object} - { canRename: boolean, minutesRemaining: number }
 */
function canRenameChannel(channelId) {
  const now = Date.now();
  const history = channelRenameHistory.get(channelId) || [];
  
  // Remove timestamps older than 10 minutes
  const recentRenames = history.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRenames.length >= MAX_RENAMES) {
    // Calculate when the oldest rename will expire
    const oldestRename = Math.min(...recentRenames);
    const timeUntilExpiry = RATE_LIMIT_WINDOW - (now - oldestRename);
    const minutesRemaining = Math.ceil(timeUntilExpiry / 60000);
    
    return {
      canRename: false,
      minutesRemaining,
      expiryTimestamp: Math.floor((oldestRename + RATE_LIMIT_WINDOW) / 1000) // Unix timestamp in seconds
    };
  }
  
  return {
    canRename: true,
    minutesRemaining: 0,
    expiryTimestamp: null
  };
}

/**
 * Tracks a channel rename operation
 * @param {string} channelId - The channel ID that was renamed
 */
function trackChannelRename(channelId) {
  const now = Date.now();
  const history = channelRenameHistory.get(channelId) || [];
  
  // Remove timestamps older than 10 minutes
  const recentRenames = history.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  // Add current rename
  recentRenames.push(now);
  
  // Update history
  channelRenameHistory.set(channelId, recentRenames);
}

/**
 * Clears rate limit history for a channel (useful for testing or cleanup)
 * @param {string} channelId - The channel ID to clear
 */
function clearChannelHistory(channelId) {
  channelRenameHistory.delete(channelId);
}

/**
 * Clears all rate limit history (useful for cleanup)
 */
function clearAllHistory() {
  channelRenameHistory.clear();
}

module.exports = {
  canRenameChannel,
  trackChannelRename,
  clearChannelHistory,
  clearAllHistory
};
