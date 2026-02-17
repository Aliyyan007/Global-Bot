/**
 * Text Channel Restrictions Module for Auto Voice Channel System
 * Handles view-only and ban tracking for linked text channels
 * Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

// In-memory tracking for text channel restrictions
// Map<textChannelId, { viewOnly: Set<userId>, banned: Set<userId> }>
const restrictions = new Map();

/**
 * Gets or creates the restriction entry for a text channel
 * @param {string} textChannelId - The text channel ID
 * @returns {Object} The restriction object with viewOnly and banned sets
 */
function getOrCreateRestriction(textChannelId) {
  if (!restrictions.has(textChannelId)) {
    restrictions.set(textChannelId, {
      viewOnly: new Set(),
      banned: new Set()
    });
  }
  return restrictions.get(textChannelId);
}

/**
 * Adds a user to view-only mode for a text channel
 * @param {string} textChannelId - The text channel ID
 * @param {string} userId - The user ID to restrict
 */
function addViewOnlyUser(textChannelId, userId) {
  const restriction = getOrCreateRestriction(textChannelId);
  restriction.viewOnly.add(userId);
}

/**
 * Removes a user from view-only mode for a text channel
 * @param {string} textChannelId - The text channel ID
 * @param {string} userId - The user ID to unrestrict
 * @returns {boolean} True if user was removed, false if not found
 */
function removeViewOnlyUser(textChannelId, userId) {
  const restriction = restrictions.get(textChannelId);
  if (!restriction) {
    return false;
  }
  return restriction.viewOnly.delete(userId);
}

/**
 * Adds a user to the banned list for a text channel
 * @param {string} textChannelId - The text channel ID
 * @param {string} userId - The user ID to ban
 */
function addBannedUser(textChannelId, userId) {
  const restriction = getOrCreateRestriction(textChannelId);
  restriction.banned.add(userId);
  // Also remove from view-only if they were there
  restriction.viewOnly.delete(userId);
}

/**
 * Removes a user from the banned list for a text channel
 * @param {string} textChannelId - The text channel ID
 * @param {string} userId - The user ID to unban
 * @returns {boolean} True if user was removed, false if not found
 */
function removeBannedUser(textChannelId, userId) {
  const restriction = restrictions.get(textChannelId);
  if (!restriction) {
    return false;
  }
  return restriction.banned.delete(userId);
}

/**
 * Gets all view-only users for a text channel
 * @param {string} textChannelId - The text channel ID
 * @returns {string[]} Array of user IDs in view-only mode
 */
function getViewOnlyUsers(textChannelId) {
  const restriction = restrictions.get(textChannelId);
  if (!restriction) {
    return [];
  }
  return Array.from(restriction.viewOnly);
}

/**
 * Gets all banned users for a text channel
 * @param {string} textChannelId - The text channel ID
 * @returns {string[]} Array of banned user IDs
 */
function getBannedUsers(textChannelId) {
  const restriction = restrictions.get(textChannelId);
  if (!restriction) {
    return [];
  }
  return Array.from(restriction.banned);
}

/**
 * Checks if a user is in view-only mode for a text channel
 * @param {string} textChannelId - The text channel ID
 * @param {string} userId - The user ID to check
 * @returns {boolean} True if user is in view-only mode
 */
function isViewOnly(textChannelId, userId) {
  const restriction = restrictions.get(textChannelId);
  if (!restriction) {
    return false;
  }
  return restriction.viewOnly.has(userId);
}

/**
 * Checks if a user is banned from a text channel
 * @param {string} textChannelId - The text channel ID
 * @param {string} userId - The user ID to check
 * @returns {boolean} True if user is banned
 */
function isBanned(textChannelId, userId) {
  const restriction = restrictions.get(textChannelId);
  if (!restriction) {
    return false;
  }
  return restriction.banned.has(userId);
}

/**
 * Clears all restrictions for a text channel (cleanup on channel delete)
 * @param {string} textChannelId - The text channel ID
 */
function clearRestrictions(textChannelId) {
  restrictions.delete(textChannelId);
}

/**
 * Gets the count of restricted users for a text channel
 * @param {string} textChannelId - The text channel ID
 * @returns {Object} Object with viewOnlyCount and bannedCount
 */
function getRestrictionCounts(textChannelId) {
  const restriction = restrictions.get(textChannelId);
  if (!restriction) {
    return { viewOnlyCount: 0, bannedCount: 0 };
  }
  return {
    viewOnlyCount: restriction.viewOnly.size,
    bannedCount: restriction.banned.size
  };
}

/**
 * Checks if a text channel has any restrictions
 * @param {string} textChannelId - The text channel ID
 * @returns {boolean} True if channel has any restrictions
 */
function hasRestrictions(textChannelId) {
  const restriction = restrictions.get(textChannelId);
  if (!restriction) {
    return false;
  }
  return restriction.viewOnly.size > 0 || restriction.banned.size > 0;
}

module.exports = {
  restrictions,
  addViewOnlyUser,
  removeViewOnlyUser,
  addBannedUser,
  removeBannedUser,
  getViewOnlyUsers,
  getBannedUsers,
  isViewOnly,
  isBanned,
  clearRestrictions,
  getRestrictionCounts,
  hasRestrictions
};
