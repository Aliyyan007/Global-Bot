/**
 * Voice Request Manager Module
 * Handles voice channel join requests from restricted users
 * Requirements: 1.5, 2.3, 3.1, 3.2, 3.5, 4.1, 4.2, 4.3, 5.4
 */

const { PermissionFlagsBits } = require('discord.js');
const dataStore = require('./dataStore');

// In-memory storage for voice requests
// Map<requestId, RequestData>
const voiceRequests = new Map();

// Track pending limit increases for approved users when channel is full
// Map<`${channelId}_${userId}`, PendingLimitIncrease>
const pendingLimitIncreases = new Map();

// Track rejected users per channel (imported pattern from interactionCreate)
// Map<channelId, Set<userId>>
const rejectedUsers = new Map();

// Track appeal attempts per user per channel (max 3 attempts after denial)
// Map<`${channelId}_${userId}`, number>
const appealAttempts = new Map();

// Maximum number of appeal attempts allowed per user per channel
const MAX_APPEAL_ATTEMPTS = 3;

// Expiration time for pending limit increases (5 minutes)
const LIMIT_INCREASE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Generate a unique request ID
 * @returns {string}
 */
function generateRequestId() {
  return `vr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Track a user as rejected from a channel
 * @param {string} channelId
 * @param {string} userId
 */
function trackRejectedUser(channelId, userId) {
  if (!rejectedUsers.has(channelId)) {
    rejectedUsers.set(channelId, new Set());
  }
  rejectedUsers.get(channelId).add(String(userId));
}

/**
 * Check if a user is rejected from a channel
 * @param {string} channelId
 * @param {string} userId
 * @returns {boolean}
 */
function isUserRejected(channelId, userId) {
  return rejectedUsers.has(channelId) && rejectedUsers.get(channelId).has(String(userId));
}

/**
 * Remove a user from rejected tracking
 * @param {string} channelId
 * @param {string} userId
 */
function removeRejectedUser(channelId, userId) {
  if (rejectedUsers.has(channelId)) {
    rejectedUsers.get(channelId).delete(String(userId));
  }
}

/**
 * Clear all rejected users for a channel
 * @param {string} channelId
 */
function clearRejectedUsers(channelId) {
  rejectedUsers.delete(channelId);
}

/**
 * Get the number of appeal attempts for a user on a channel
 * @param {string} channelId
 * @param {string} userId
 * @returns {number}
 */
function getAppealAttempts(channelId, userId) {
  const key = `${channelId}_${userId}`;
  return appealAttempts.get(key) || 0;
}

/**
 * Check if user can still appeal (has attempts remaining)
 * @param {string} channelId
 * @param {string} userId
 * @returns {{ canAppeal: boolean, attemptsRemaining: number }}
 */
function canUserAppeal(channelId, userId) {
  const attempts = getAppealAttempts(channelId, userId);
  const attemptsRemaining = MAX_APPEAL_ATTEMPTS - attempts;
  return {
    canAppeal: attemptsRemaining > 0,
    attemptsRemaining: Math.max(0, attemptsRemaining)
  };
}

/**
 * Increment appeal attempts for a user (called when appeal is denied)
 * @param {string} channelId
 * @param {string} userId
 * @returns {number} New attempt count
 */
function incrementAppealAttempts(channelId, userId) {
  const key = `${channelId}_${userId}`;
  const currentAttempts = appealAttempts.get(key) || 0;
  const newAttempts = currentAttempts + 1;
  appealAttempts.set(key, newAttempts);
  return newAttempts;
}

/**
 * Reset appeal attempts for a user on a channel (called when approved or restriction removed)
 * @param {string} channelId
 * @param {string} userId
 */
function resetAppealAttempts(channelId, userId) {
  const key = `${channelId}_${userId}`;
  appealAttempts.delete(key);
}

/**
 * Clear all appeal attempts for a channel
 * @param {string} channelId
 */
function clearAppealAttempts(channelId) {
  const prefix = `${channelId}_`;
  for (const key of appealAttempts.keys()) {
    if (key.startsWith(prefix)) {
      appealAttempts.delete(key);
    }
  }
}

/**
 * Check if a user has any restriction on a voice channel
 * @param {Object} channel - Discord voice channel object
 * @param {string} userId - User ID to check
 * @param {Object} member - Optional Discord member object for role checking
 * @returns {{ restricted: boolean, type: 'banned' | 'rejected' | 'limit' | null }}
 */
function hasRestriction(channel, userId, member = null) {
  const userIdStr = String(userId);
  
  // Check if user is banned (Connect permission explicitly denied)
  const permOverwrite = channel.permissionOverwrites?.cache?.get(userIdStr);
  if (permOverwrite && permOverwrite.deny.has(PermissionFlagsBits.Connect)) {
    return { restricted: true, type: 'banned' };
  }
  
  // Check if any of the user's roles are rejected
  if (member) {
    for (const [roleId, role] of member.roles.cache) {
      const roleOverwrite = channel.permissionOverwrites?.cache?.get(roleId);
      if (roleOverwrite && roleOverwrite.deny.has(PermissionFlagsBits.Connect)) {
        return { restricted: true, type: 'rejected' };
      }
    }
  }
  
  // Check if user is rejected (tracked in memory)
  if (isUserRejected(channel.id, userIdStr)) {
    return { restricted: true, type: 'rejected' };
  }
  
  // Check if channel limit is reached
  if (channel.userLimit > 0 && channel.members.size >= channel.userLimit) {
    return { restricted: true, type: 'limit' };
  }
  
  return { restricted: false, type: null };
}

/**
 * Check if a user has any restriction (simplified version for filtering)
 * @param {Object} channel - Discord voice channel object
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
function isUserRestricted(channel, userId) {
  return hasRestriction(channel, userId).restricted;
}

/**
 * Get all temp voice channels where user has a restriction
 * @param {Object} guild - Discord guild object
 * @param {string} userId - User ID to check
 * @returns {Array<{ channel: Object, restrictionType: string }>}
 */
function getRestrictedChannels(guild, userId) {
  const settings = dataStore.getGuildSettings(guild.id);
  if (!settings) return [];
  
  const restrictedChannels = [];
  const tempCategoryId = settings.temp_voice_category_id;
  
  // Get the member object for role checking
  const member = guild.members.cache.get(userId);
  
  guild.channels.cache.forEach(channel => {
    // Only check voice channels in the temp category
    if (channel.type !== 2) return; // 2 = GuildVoice
    if (channel.parentId !== tempCategoryId) return;
    if (channel.id === settings.voice_channel_id) return; // Skip "Join to Create" channel
    
    const restriction = hasRestriction(channel, userId, member);
    if (restriction.restricted) {
      restrictedChannels.push({
        channel,
        restrictionType: restriction.type
      });
    }
  });
  
  return restrictedChannels;
}

/**
 * Create a new voice request
 * @param {string} guildId
 * @param {string} channelId
 * @param {string} requesterId
 * @param {string} restrictionType
 * @param {string|null} note
 * @returns {Object} RequestData
 */
function createRequest(guildId, channelId, requesterId, restrictionType, note = null) {
  const requestId = generateRequestId();
  const request = {
    id: requestId,
    guildId: String(guildId),
    channelId: String(channelId),
    requesterId: String(requesterId),
    restrictionType,
    note: note && note.length > 0 ? note.substring(0, 500) : null,
    status: 'pending',
    messageIds: {
      voiceChannel: null,
      textChannel: null
    },
    createdAt: new Date(),
    resolvedAt: null,
    resolvedBy: null
  };
  
  voiceRequests.set(requestId, request);
  return request;
}

/**
 * Get a request by ID
 * @param {string} requestId
 * @returns {Object|null}
 */
function getRequest(requestId) {
  return voiceRequests.get(requestId) || null;
}

/**
 * Update request message IDs
 * @param {string} requestId
 * @param {string} voiceMessageId
 * @param {string|null} textMessageId
 */
function updateRequestMessageIds(requestId, voiceMessageId, textMessageId = null) {
  const request = voiceRequests.get(requestId);
  if (request) {
    request.messageIds.voiceChannel = voiceMessageId;
    request.messageIds.textChannel = textMessageId;
  }
}

/**
 * Approve a voice request
 * @param {string} requestId
 * @param {string} approverId
 * @param {Object} channel - Discord channel to check limit
 * @returns {{ success: boolean, limitReached: boolean, request: Object|null, error?: string }}
 */
function approveRequest(requestId, approverId, channel) {
  const request = voiceRequests.get(requestId);
  
  if (!request) {
    return { success: false, limitReached: false, request: null, error: 'Request not found' };
  }
  
  if (request.status !== 'pending') {
    return { success: false, limitReached: false, request, error: 'Request already resolved' };
  }
  
  request.status = 'approved';
  request.resolvedAt = new Date();
  request.resolvedBy = String(approverId);
  
  // Check if channel limit is reached
  const limitReached = channel.userLimit > 0 && channel.members.size >= channel.userLimit;
  
  return { success: true, limitReached, request };
}

/**
 * Deny a voice request
 * @param {string} requestId
 * @param {string} denierId
 * @returns {{ success: boolean, request: Object|null, error?: string }}
 */
function denyRequest(requestId, denierId) {
  const request = voiceRequests.get(requestId);
  
  if (!request) {
    return { success: false, request: null, error: 'Request not found' };
  }
  
  if (request.status !== 'pending') {
    return { success: false, request, error: 'Request already resolved' };
  }
  
  request.status = 'denied';
  request.resolvedAt = new Date();
  request.resolvedBy = String(denierId);
  
  return { success: true, request };
}

/**
 * Remove restriction for a user on a channel
 * @param {Object} channel - Discord channel object
 * @param {string} userId
 * @param {string} restrictionType - 'banned' or 'rejected'
 * @returns {Promise<boolean>}
 */
async function removeRestriction(channel, userId, restrictionType) {
  const userIdStr = String(userId);
  
  try {
    if (restrictionType === 'banned') {
      // Remove the Connect: false permission override
      await channel.permissionOverwrites.edit(userIdStr, {
        Connect: null
      });
    }
    
    if (restrictionType === 'rejected') {
      // Remove from rejected tracking
      removeRejectedUser(channel.id, userIdStr);
    }
    
    return true;
  } catch (error) {
    console.error('[VoiceRequest] Error removing restriction:', error);
    return false;
  }
}

/**
 * Track a pending limit increase for a user
 * @param {string} channelId
 * @param {string} userId
 * @param {number} originalLimit
 */
function trackLimitIncrease(channelId, userId, originalLimit) {
  const key = `${channelId}_${userId}`;
  const pending = {
    channelId: String(channelId),
    userId: String(userId),
    originalLimit,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + LIMIT_INCREASE_EXPIRY_MS)
  };
  
  pendingLimitIncreases.set(key, pending);
  
  // Auto-cleanup after expiry
  setTimeout(() => {
    pendingLimitIncreases.delete(key);
  }, LIMIT_INCREASE_EXPIRY_MS);
  
  return pending;
}

/**
 * Get pending limit increase for a user
 * @param {string} channelId
 * @param {string} userId
 * @returns {Object|null}
 */
function getPendingLimitIncrease(channelId, userId) {
  const key = `${channelId}_${userId}`;
  const pending = pendingLimitIncreases.get(key);
  
  if (!pending) return null;
  
  // Check if expired
  if (new Date() > pending.expiresAt) {
    pendingLimitIncreases.delete(key);
    return null;
  }
  
  return pending;
}

/**
 * Process limit increase when user clicks Join Now
 * @param {Object} channel - Discord channel object
 * @param {string} userId
 * @returns {Promise<{ success: boolean, newLimit: number, error?: string }>}
 */
async function processLimitIncrease(channel, userId) {
  const pending = getPendingLimitIncrease(channel.id, userId);
  
  if (!pending) {
    return { success: false, newLimit: 0, error: 'No pending limit increase found or it has expired' };
  }
  
  try {
    const currentLimit = channel.userLimit;
    const newLimit = currentLimit + 1;
    
    await channel.setUserLimit(newLimit);
    
    // Remove from pending
    const key = `${channel.id}_${userId}`;
    pendingLimitIncreases.delete(key);
    
    return { success: true, newLimit };
  } catch (error) {
    console.error('[VoiceRequest] Error increasing limit:', error);
    return { success: false, newLimit: 0, error: 'Failed to increase channel limit' };
  }
}

/**
 * Validate note length
 * @param {string} note
 * @returns {{ valid: boolean, error?: string }}
 */
function validateNote(note) {
  if (!note) return { valid: true };
  if (typeof note !== 'string') return { valid: false, error: 'Note must be a string' };
  if (note.length > 500) return { valid: false, error: 'Note must be 500 characters or less' };
  return { valid: true };
}

/**
 * Check if user is the server owner
 * @param {Object} guild - Discord guild object
 * @param {string} userId
 * @returns {boolean}
 */
function isServerOwner(guild, userId) {
  return guild.ownerId === String(userId);
}

/**
 * Clean up requests for a deleted channel
 * @param {string} channelId
 */
function cleanupChannelRequests(channelId) {
  const channelIdStr = String(channelId);
  
  // Remove all requests for this channel
  for (const [requestId, request] of voiceRequests) {
    if (request.channelId === channelIdStr) {
      voiceRequests.delete(requestId);
    }
  }
  
  // Clear rejected users
  clearRejectedUsers(channelIdStr);
  
  // Clear appeal attempts
  clearAppealAttempts(channelIdStr);
  
  // Clear pending limit increases
  for (const [key] of pendingLimitIncreases) {
    if (key.startsWith(`${channelIdStr}_`)) {
      pendingLimitIncreases.delete(key);
    }
  }
}

module.exports = {
  // Request management
  createRequest,
  getRequest,
  updateRequestMessageIds,
  approveRequest,
  denyRequest,
  
  // Restriction checking
  hasRestriction,
  isUserRestricted,
  getRestrictedChannels,
  
  // Restriction removal
  removeRestriction,
  
  // Rejected user tracking
  trackRejectedUser,
  isUserRejected,
  removeRejectedUser,
  clearRejectedUsers,
  
  // Appeal attempts tracking
  getAppealAttempts,
  canUserAppeal,
  incrementAppealAttempts,
  resetAppealAttempts,
  clearAppealAttempts,
  MAX_APPEAL_ATTEMPTS,
  
  // Limit increase handling
  trackLimitIncrease,
  getPendingLimitIncrease,
  processLimitIncrease,
  
  // Validation
  validateNote,
  isServerOwner,
  
  // Cleanup
  cleanupChannelRequests,
  
  // For testing
  _voiceRequests: voiceRequests,
  _pendingLimitIncreases: pendingLimitIncreases,
  _rejectedUsers: rejectedUsers,
  _appealAttempts: appealAttempts
};
