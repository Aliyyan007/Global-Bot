/**
 * Feature Categories for Voice Feature Manager
 * Groups voice features into logical categories for the management UI
 * Requirements: 2.3
 */

const { ALL_FEATURES } = require('./constants');

/**
 * Feature categories with metadata for UI display
 */
const FEATURE_CATEGORIES = {
  channel_settings: {
    name: 'Channel Settings',
    nameKey: 'Channel Settings',
    emoji: '⚙️',
    description: 'Basic channel configuration options',
    descriptionKey: 'Basic channel configuration options',
    features: ['name', 'limit', 'status', 'bitrate', 'nsfw', 'region']
  },
  permissions: {
    name: 'Permissions',
    nameKey: 'Permissions',
    emoji: '🔒',
    description: 'Access control and ownership features',
    descriptionKey: 'Access control and ownership features',
    features: ['lock', 'permit', 'reject', 'ghost', 'claim', 'transfer']
  },
  communication: {
    name: 'Communication',
    nameKey: 'Communication',
    emoji: '💬',
    description: 'Messaging and invitation features',
    descriptionKey: 'Messaging and invitation features',
    features: ['lfm', 'text', 'invite', 'request', 'interfaceping']
  },
  advanced: {
    name: 'Advanced',
    nameKey: 'Advanced',
    emoji: '🔧',
    description: 'Advanced management and automation',
    descriptionKey: 'Advanced management and automation',
    features: ['interface', 'autotext', 'logging']
  }
};

/**
 * Feature display names and descriptions for UI
 */
const FEATURE_INFO = {
  name: { name: 'Name', emoji: '✏️', description: 'Change channel name' },
  limit: { name: 'Limit', emoji: '👥', description: 'Set user limit' },
  status: { name: 'Status', emoji: '📝', description: 'Set channel status' },
  bitrate: { name: 'Bitrate', emoji: '🔊', description: 'Change audio bitrate' },
  nsfw: { name: 'NSFW', emoji: '⚠️', description: 'Toggle NSFW mode' },
  region: { name: 'Region', emoji: '🌍', description: 'Voice region selection' },
  lock: { name: 'Lock', emoji: '🔒', description: 'Lock/unlock channel' },
  permit: { name: 'Permit', emoji: '✅', description: 'Permit specific users' },
  reject: { name: 'Reject', emoji: '❌', description: 'Reject users from channel' },
  ghost: { name: 'Ghost', emoji: '👻', description: 'Hide channel from non-members' },
  claim: { name: 'Claim', emoji: '👑', description: 'Claim abandoned channel' },
  transfer: { name: 'Transfer', emoji: '🔄', description: 'Transfer ownership' },
  lfm: { name: 'LFM', emoji: '📢', description: 'Looking for Members announcements' },
  text: { name: 'Text', emoji: '💬', description: 'Create linked text channel' },
  invite: { name: 'Invite', emoji: '📨', description: 'Send DM invitations' },
  request: { name: 'Request', emoji: '🙋', description: 'Request to join' },
  interfaceping: { name: 'Interface Ping', emoji: '🔔', description: 'Ping in interface' },
  interface: { name: 'Interface', emoji: '🎛️', description: 'Control panel interface' },
  autotext: { name: 'Auto Text', emoji: '📄', description: 'Auto-create text channel' },
  logging: { name: 'Logging', emoji: '📋', description: 'Activity logging' }
};

/**
 * Get the category key for a given feature
 * @param {string} feature - The feature name
 * @returns {string|null} The category key or null if not found
 */
function getCategoryForFeature(feature) {
  for (const [categoryKey, category] of Object.entries(FEATURE_CATEGORIES)) {
    if (category.features.includes(feature)) {
      return categoryKey;
    }
  }
  return null;
}

/**
 * Get all features in a category
 * @param {string} categoryKey - The category key
 * @returns {string[]} Array of feature names
 */
function getFeaturesInCategory(categoryKey) {
  const category = FEATURE_CATEGORIES[categoryKey];
  return category ? category.features : [];
}

/**
 * Get feature info for display
 * @param {string} feature - The feature name
 * @returns {Object|null} Feature info object or null if not found
 */
function getFeatureInfo(feature) {
  return FEATURE_INFO[feature] || null;
}

/**
 * Check if all features from ALL_FEATURES are categorized
 * @returns {boolean} True if all features are categorized
 */
function validateCategorization() {
  const categorizedFeatures = new Set();
  for (const category of Object.values(FEATURE_CATEGORIES)) {
    for (const feature of category.features) {
      categorizedFeatures.add(feature);
    }
  }
  
  for (const feature of ALL_FEATURES) {
    if (!categorizedFeatures.has(feature)) {
      return false;
    }
  }
  return true;
}

/**
 * Get all category keys
 * @returns {string[]} Array of category keys
 */
function getCategoryKeys() {
  return Object.keys(FEATURE_CATEGORIES);
}

module.exports = {
  FEATURE_CATEGORIES,
  FEATURE_INFO,
  getCategoryForFeature,
  getFeaturesInCategory,
  getFeatureInfo,
  validateCategorization,
  getCategoryKeys
};
