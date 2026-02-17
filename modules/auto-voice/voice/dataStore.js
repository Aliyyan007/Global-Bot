/**
 * Data Store Module for Auto Voice Channel System
 * Handles JSON persistence for voice settings, channel owners, and feature configurations
 * Requirements: 14.1, 14.2, 14.3
 * 
 * OPTIMIZED: Uses in-memory cache with debounced async writes
 */

const fs = require('fs');
const path = require('path');

// Path to the JSON data file
const DATA_FILE_PATH = path.join(__dirname, '../../voice_data.json');

// Default empty data structure
const DEFAULT_DATA = {
  voice_settings: {},
  channel_owners: {},
  temp_channels: {},
  feature_toggles: {},
  feature_permissions: {},
  lfm_channels: {},
  text_channel_category: {},
  user_cooldowns: {}
};

// ============================================
// In-Memory Cache & Debounced Save
// ============================================

let dataCache = null;
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 1000; // Save at most once per second

/**
 * Recursively converts all numeric IDs to strings in an object
 */
function convertIdsToStrings(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'number') {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertIdsToStrings(item));
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertIdsToStrings(value);
    }
    return converted;
  }
  
  return obj;
}

/**
 * Loads voice data from cache or file (only reads file once on startup)
 */
function loadVoiceData() {
  if (dataCache !== null) {
    return dataCache;
  }
  
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      dataCache = { ...DEFAULT_DATA };
      return dataCache;
    }
    
    const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    const parsedData = JSON.parse(rawData);
    const convertedData = convertIdsToStrings(parsedData);
    
    dataCache = {
      ...DEFAULT_DATA,
      ...convertedData
    };
    return dataCache;
  } catch (error) {
    console.error('Error loading voice data:', error.message);
    dataCache = { ...DEFAULT_DATA };
    return dataCache;
  }
}

/**
 * Schedules a debounced async save to disk
 * Multiple rapid changes will be batched into a single write
 */
function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    if (dataCache) {
      const dataToSave = convertIdsToStrings(dataCache);
      fs.writeFile(DATA_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf8', (err) => {
        if (err) {
          console.error('Error saving voice data:', err.message);
        }
      });
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Saves voice data - updates cache immediately, writes to disk async
 */
function saveVoiceData(data) {
  dataCache = convertIdsToStrings(data);
  scheduleSave();
}

/**
 * Force immediate save (use sparingly, e.g., on shutdown)
 */
function forceSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  
  if (dataCache) {
    try {
      const dataToSave = convertIdsToStrings(dataCache);
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (error) {
      console.error('Error force saving voice data:', error.message);
    }
  }
}

/**
 * Invalidate cache (useful for testing or manual file edits)
 */
function invalidateCache() {
  dataCache = null;
}

// ============================================
// Voice Settings Getters/Setters
// ============================================

function getGuildSettings(guildId) {
  const data = loadVoiceData();
  return data.voice_settings[String(guildId)] || null;
}

function setGuildSettings(guildId, settings) {
  const data = loadVoiceData();
  data.voice_settings[String(guildId)] = convertIdsToStrings(settings);
  scheduleSave();
}

function deleteGuildSettings(guildId) {
  const data = loadVoiceData();
  delete data.voice_settings[String(guildId)];
  scheduleSave();
}

// ============================================
// Channel Owners Getters/Setters
// ============================================

function getChannelOwner(channelId) {
  const data = loadVoiceData();
  const ownerData = data.channel_owners[String(channelId)];
  return ownerData ? String(ownerData.owner_id) : null;
}

function setChannelOwner(channelId, ownerId) {
  const data = loadVoiceData();
  data.channel_owners[String(channelId)] = {
    owner_id: String(ownerId)
  };
  scheduleSave();
}

function deleteChannelOwner(channelId) {
  const data = loadVoiceData();
  delete data.channel_owners[String(channelId)];
  scheduleSave();
}

function getAllChannelOwners() {
  const data = loadVoiceData();
  return data.channel_owners;
}

// ============================================
// Temp Channels Getters/Setters
// ============================================

function getTempChannel(channelId) {
  const data = loadVoiceData();
  return data.temp_channels[String(channelId)] || null;
}

function setTempChannel(channelId, tempData) {
  const data = loadVoiceData();
  data.temp_channels[String(channelId)] = convertIdsToStrings(tempData);
  scheduleSave();
}

function deleteTempChannel(channelId) {
  const data = loadVoiceData();
  delete data.temp_channels[String(channelId)];
  scheduleSave();
}

// ============================================
// Feature Toggles Getters/Setters
// ============================================

function getFeatureToggles(guildId) {
  const data = loadVoiceData();
  return data.feature_toggles[String(guildId)] || {};
}

function getFeatureToggle(guildId, feature) {
  const toggles = getFeatureToggles(guildId);
  
  // Features that are disabled by default
  const disabledByDefault = ['autotext'];
  
  if (disabledByDefault.includes(feature)) {
    // For disabled-by-default features, return false unless explicitly set to true
    return toggles[feature] === true;
  }
  
  // For other features, return true unless explicitly set to false
  return toggles[feature] !== false;
}

function setFeatureToggle(guildId, feature, enabled) {
  const data = loadVoiceData();
  if (!data.feature_toggles[String(guildId)]) {
    data.feature_toggles[String(guildId)] = {};
  }
  data.feature_toggles[String(guildId)][feature] = enabled;
  scheduleSave();
}

function setFeatureToggles(guildId, toggles) {
  const data = loadVoiceData();
  data.feature_toggles[String(guildId)] = toggles;
  scheduleSave();
}

// ============================================
// Feature Permissions Getters/Setters
// ============================================

function getFeaturePermissions(guildId) {
  const data = loadVoiceData();
  return data.feature_permissions[String(guildId)] || {};
}

function getFeaturePermission(guildId, feature) {
  const permissions = getFeaturePermissions(guildId);
  return permissions[feature] || null;
}

function setFeaturePermission(guildId, feature, permission) {
  const data = loadVoiceData();
  if (!data.feature_permissions[String(guildId)]) {
    data.feature_permissions[String(guildId)] = {};
  }
  data.feature_permissions[String(guildId)][feature] = convertIdsToStrings(permission);
  scheduleSave();
}

function deleteFeaturePermission(guildId, feature) {
  const data = loadVoiceData();
  if (data.feature_permissions[String(guildId)]) {
    delete data.feature_permissions[String(guildId)][feature];
    scheduleSave();
  }
}

// ============================================
// Voice Feature Configuration Getters/Setters
// (For voice-feature-manager: allowed/restricted users/roles, cooldowns, permission requirements)
// ============================================

function getVoiceFeatureConfig(guildId, feature) {
  const data = loadVoiceData();
  if (!data.voice_feature_configs) {
    data.voice_feature_configs = {};
  }
  if (!data.voice_feature_configs[String(guildId)]) {
    return null;
  }
  return data.voice_feature_configs[String(guildId)][feature] || null;
}

function setVoiceFeatureConfig(guildId, feature, config) {
  const data = loadVoiceData();
  if (!data.voice_feature_configs) {
    data.voice_feature_configs = {};
  }
  if (!data.voice_feature_configs[String(guildId)]) {
    data.voice_feature_configs[String(guildId)] = {};
  }
  data.voice_feature_configs[String(guildId)][feature] = convertIdsToStrings(config);
  scheduleSave();
}

function deleteVoiceFeatureConfig(guildId, feature) {
  const data = loadVoiceData();
  if (data.voice_feature_configs && data.voice_feature_configs[String(guildId)]) {
    delete data.voice_feature_configs[String(guildId)][feature];
    scheduleSave();
  }
}

function getAllVoiceFeatureConfigs(guildId) {
  const data = loadVoiceData();
  if (!data.voice_feature_configs) {
    return {};
  }
  return data.voice_feature_configs[String(guildId)] || {};
}


// ============================================
// LFM Channels Getters/Setters
// ============================================

function getLfmChannels(guildId) {
  const data = loadVoiceData();
  const channels = data.lfm_channels[String(guildId)] || [];
  return channels.map(id => String(id));
}

function setLfmChannels(guildId, channelIds) {
  const data = loadVoiceData();
  data.lfm_channels[String(guildId)] = channelIds.map(id => String(id));
  scheduleSave();
}

function addLfmChannel(guildId, channelId) {
  const data = loadVoiceData();
  if (!data.lfm_channels[String(guildId)]) {
    data.lfm_channels[String(guildId)] = [];
  }
  const channelIdStr = String(channelId);
  if (!data.lfm_channels[String(guildId)].includes(channelIdStr)) {
    data.lfm_channels[String(guildId)].push(channelIdStr);
    scheduleSave();
  }
}

function removeLfmChannel(guildId, channelId) {
  const data = loadVoiceData();
  if (data.lfm_channels[String(guildId)]) {
    const channelIdStr = String(channelId);
    data.lfm_channels[String(guildId)] = data.lfm_channels[String(guildId)]
      .filter(id => String(id) !== channelIdStr);
    scheduleSave();
  }
}

// ============================================
// Text Channel Category Getters/Setters
// ============================================

function getTextChannelCategory(guildId) {
  const data = loadVoiceData();
  const categoryId = data.text_channel_category[String(guildId)];
  return categoryId ? String(categoryId) : null;
}

function setTextChannelCategory(guildId, categoryId) {
  const data = loadVoiceData();
  data.text_channel_category[String(guildId)] = String(categoryId);
  scheduleSave();
}

// ============================================
// User Cooldowns Getters/Setters
// ============================================

function getCooldownKey(guildId, userId, feature) {
  return `${String(guildId)}_${String(userId)}_${feature}`;
}

function getUserCooldown(guildId, userId, feature) {
  const data = loadVoiceData();
  const key = getCooldownKey(guildId, userId, feature);
  return data.user_cooldowns[key] || null;
}

function setUserCooldown(guildId, userId, feature, timestamp) {
  const data = loadVoiceData();
  const key = getCooldownKey(guildId, userId, feature);
  data.user_cooldowns[key] = timestamp;
  scheduleSave();
}

function deleteUserCooldown(guildId, userId, feature) {
  const data = loadVoiceData();
  const key = getCooldownKey(guildId, userId, feature);
  delete data.user_cooldowns[key];
  scheduleSave();
}

function getGuildCooldowns(guildId) {
  const data = loadVoiceData();
  const guildPrefix = `${String(guildId)}_`;
  const cooldowns = {};
  
  for (const [key, value] of Object.entries(data.user_cooldowns)) {
    if (key.startsWith(guildPrefix)) {
      cooldowns[key] = value;
    }
  }
  
  return cooldowns;
}

// ============================================
// Module Exports
// ============================================

module.exports = {
  loadVoiceData,
  saveVoiceData,
  forceSave,
  invalidateCache,
  convertIdsToStrings,
  getGuildSettings,
  setGuildSettings,
  deleteGuildSettings,
  getChannelOwner,
  setChannelOwner,
  deleteChannelOwner,
  getAllChannelOwners,
  getTempChannel,
  setTempChannel,
  deleteTempChannel,
  getFeatureToggles,
  getFeatureToggle,
  setFeatureToggle,
  setFeatureToggles,
  getFeaturePermissions,
  getFeaturePermission,
  setFeaturePermission,
  deleteFeaturePermission,
  getVoiceFeatureConfig,
  setVoiceFeatureConfig,
  deleteVoiceFeatureConfig,
  getAllVoiceFeatureConfigs,
  getLfmChannels,
  setLfmChannels,
  addLfmChannel,
  removeLfmChannel,
  getTextChannelCategory,
  setTextChannelCategory,
  getCooldownKey,
  getUserCooldown,
  setUserCooldown,
  deleteUserCooldown,
  getGuildCooldowns,
  DATA_FILE_PATH,
  DEFAULT_DATA
};
