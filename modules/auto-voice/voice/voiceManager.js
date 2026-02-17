/**
 * Voice Manager Module for Auto Voice Channel System
 * Core business logic for voice channel operations
 * Requirements: 2.2, 9.2, 10.2, 10.3
 */

const dataStore = require('./dataStore');
const { COOLDOWN_HOURS } = require('./constants');

/**
 * Applies the channel name template by substituting {username} with the display name
 */
function applyChannelNameTemplate(template, displayName) {
  if (!template || typeof template !== 'string') {
    return displayName || 'Voice Channel';
  }
  
  if (!displayName || typeof displayName !== 'string') {
    return template.replace(/{username}/gi, 'User');
  }
  
  return template.replace(/{username}/gi, displayName);
}

/**
 * Checks if a feature is enabled for a guild
 */
function isFeatureEnabled(guildId, feature) {
  return dataStore.getFeatureToggle(guildId, feature);
}

/**
 * Checks if a member can use a specific feature based on permissions
 */
function canUseFeature(guildId, member, feature) {
  const isEnabled = isFeatureEnabled(guildId, feature);
  
  if (!isEnabled) {
    console.log(`[Feature Check] Feature ${feature} is disabled for guild ${guildId}`);
    return {
      allowed: false,
      message: `The ${feature} feature is currently disabled on this server.`
    };
  }
  
  const permission = dataStore.getFeaturePermission(guildId, feature);
  
  if (!permission) {
    return { allowed: true, message: '' };
  }
  
  const { roles = [], members = [], deny_message = '' } = permission;
  
  if (roles.length === 0 && members.length === 0) {
    return { allowed: true, message: '' };
  }
  
  const memberId = String(member.id);
  
  if (members.includes(memberId)) {
    return { allowed: true, message: '' };
  }
  
  const memberRoles = member.roles?.cache 
    ? Array.from(member.roles.cache.keys()).map(String)
    : (Array.isArray(member.roles) ? member.roles.map(String) : []);
  
  const hasAllowedRole = roles.some(roleId => memberRoles.includes(String(roleId)));
  
  if (hasAllowedRole) {
    return { allowed: true, message: '' };
  }
  
  console.log(`[Feature Check] User ${memberId} denied access to ${feature} - no required roles`);
  const defaultDenyMessage = `You don't have permission to use the ${feature} feature.`;
  return {
    allowed: false,
    message: deny_message || defaultDenyMessage
  };
}

/**
 * Checks if a user is on cooldown for a specific feature
 */
function checkCooldown(guildId, userId, feature) {
  const cooldownTimestamp = dataStore.getUserCooldown(guildId, userId, feature);
  
  if (!cooldownTimestamp) {
    return { allowed: true, message: '', remainingMs: 0 };
  }
  
  const cooldownTime = new Date(cooldownTimestamp).getTime();
  const cooldownDurationMs = COOLDOWN_HOURS * 60 * 60 * 1000;
  const expiresAt = cooldownTime + cooldownDurationMs;
  const now = Date.now();
  
  if (now >= expiresAt) {
    dataStore.deleteUserCooldown(guildId, userId, feature);
    return { allowed: true, message: '', remainingMs: 0 };
  }
  
  const remainingMs = expiresAt - now;
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
  
  let timeString;
  if (remainingHours > 1) {
    timeString = `${remainingHours} hours`;
  } else if (remainingMinutes > 1) {
    timeString = `${remainingMinutes} minutes`;
  } else {
    timeString = 'less than a minute';
  }
  
  return {
    allowed: false,
    message: `You're on cooldown for the ${feature} feature. Please wait ${timeString}.`,
    remainingMs
  };
}

/**
 * Sets a cooldown for a user on a specific feature
 */
function setCooldown(guildId, userId, feature) {
  const timestamp = new Date().toISOString();
  dataStore.setUserCooldown(guildId, userId, feature, timestamp);
}

module.exports = {
  applyChannelNameTemplate,
  isFeatureEnabled,
  canUseFeature,
  checkCooldown,
  setCooldown
};
