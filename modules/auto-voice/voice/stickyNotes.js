/**
 * Sticky Notes Module for Auto Voice Channel System
 * Handles sticky note tracking and posting logic for control panels
 * Requirements: 1.1, 1.2, 3.1, 3.2, 3.3
 */

// In-memory tracking for sticky note state per channel
const stickyNoteTasks = new Map();

// Message counters per channel
const messageCounters = new Map();

// Default threshold for posting sticky note link
const DEFAULT_STICKY_THRESHOLD = 8;

/**
 * Enables sticky note tracking for a channel
 * @param {string} channelId - The channel ID to enable sticky notes for
 * @param {string} controlPanelUrl - The URL to the control panel message
 * @param {number} threshold - Number of messages before posting sticky (default 12)
 */
function enableStickyNote(channelId, controlPanelUrl, threshold = DEFAULT_STICKY_THRESHOLD) {
  stickyNoteTasks.set(channelId, {
    enabled: true,
    controlPanelUrl,
    threshold,
    lastStickyMessageId: null // Track the last sticky message for deletion
  });
  messageCounters.set(channelId, 0);
}

/**
 * Sets the last sticky message ID for a channel
 * @param {string} channelId - The channel ID
 * @param {string} messageId - The message ID of the sticky note
 */
function setLastStickyMessageId(channelId, messageId) {
  const state = stickyNoteTasks.get(channelId);
  if (state) {
    state.lastStickyMessageId = messageId;
  }
}

/**
 * Gets the last sticky message ID for a channel
 * @param {string} channelId - The channel ID
 * @returns {string|null} The message ID or null
 */
function getLastStickyMessageId(channelId) {
  const state = stickyNoteTasks.get(channelId);
  return state?.lastStickyMessageId || null;
}

/**
 * Disables sticky note tracking for a channel
 * @param {string} channelId - The channel ID to disable sticky notes for
 */
function disableStickyNote(channelId) {
  const state = stickyNoteTasks.get(channelId);
  if (state) {
    stickyNoteTasks.set(channelId, {
      ...state,
      enabled: false
    });
  }
  messageCounters.set(channelId, 0);
}

/**
 * Increments the message counter for a channel
 * @param {string} channelId - The channel ID
 * @returns {number} The new message count
 */
function incrementMessageCount(channelId) {
  const currentCount = messageCounters.get(channelId) || 0;
  const newCount = currentCount + 1;
  messageCounters.set(channelId, newCount);
  return newCount;
}

/**
 * Checks if a sticky note should be posted (when count >= threshold)
 * @param {string} channelId - The channel ID
 * @returns {boolean} True if sticky should be posted
 */
function shouldPostSticky(channelId) {
  const state = stickyNoteTasks.get(channelId);
  if (!state || !state.enabled) {
    return false;
  }
  const count = messageCounters.get(channelId) || 0;
  const threshold = state.threshold || DEFAULT_STICKY_THRESHOLD;
  return count >= threshold;
}

/**
 * Resets the message counter for a channel
 * @param {string} channelId - The channel ID
 */
function resetCounter(channelId) {
  messageCounters.set(channelId, 0);
}

/**
 * Gets the sticky note state for a channel
 * @param {string} channelId - The channel ID
 * @returns {Object|null} The sticky state or null if not found
 */
function getStickyState(channelId) {
  return stickyNoteTasks.get(channelId) || null;
}

/**
 * Gets the current message count for a channel
 * @param {string} channelId - The channel ID
 * @returns {number} The current message count
 */
function getMessageCount(channelId) {
  return messageCounters.get(channelId) || 0;
}

/**
 * Checks if sticky notes are enabled for a channel
 * @param {string} channelId - The channel ID
 * @returns {boolean} True if enabled
 */
function isEnabled(channelId) {
  const state = stickyNoteTasks.get(channelId);
  return state ? state.enabled : false;
}

/**
 * Clears all sticky note data for a channel (cleanup on channel delete)
 * @param {string} channelId - The channel ID
 */
function clearChannel(channelId) {
  stickyNoteTasks.delete(channelId);
  messageCounters.delete(channelId);
}

module.exports = {
  stickyNoteTasks,
  messageCounters,
  DEFAULT_STICKY_THRESHOLD,
  enableStickyNote,
  disableStickyNote,
  incrementMessageCount,
  shouldPostSticky,
  resetCounter,
  getStickyState,
  getMessageCount,
  isEnabled,
  clearChannel,
  setLastStickyMessageId,
  getLastStickyMessageId
};
