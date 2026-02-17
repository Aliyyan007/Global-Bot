/**
 * Voice Preferences Module
 * Handles saving and loading user voice channel preferences from a separate MongoDB database
 */

const mongoose = require('mongoose');

// Separate connection for auto voice database
let autoVoiceConnection = null;
let VoicePreferencesModel = null;

// Schema definition
const voicePreferencesSchema = new mongoose.Schema({
  userID: { type: String, required: true },
  guildID: { type: String, required: true },
  
  // Auto-applied on channel creation
  channelName: { type: String },
  userLimit: { type: Number, default: 0 },
  
  // Applied when "Load Settings" is clicked
  bitrate: { type: Number },
  locked: { type: Boolean, default: false },
  ghosted: { type: Boolean, default: false },
  region: { type: String },
  channelStatus: { type: String },
  
  // Rejected/banned users list
  rejectedUsers: [{ type: String }],
  rejectedRoles: [{ type: String }],
  
  // Text channel preferences
  textChannelName: { type: String },
  
  // Banned users for text channel
  textBannedUsers: [{ type: String }],
  textBannedRoles: [{ type: String }],
  textViewOnlyUsers: [{ type: String }],
  textViewOnlyRoles: [{ type: String }],
  
  // Timestamps
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { minimize: false });

voicePreferencesSchema.index({ userID: 1, guildID: 1 }, { unique: true });

/**
 * Initialize the auto voice database connection
 * Call this during bot startup
 */
async function initialize() {
  const mongoUri = process.env.mongoDB_SRV_AUTOVOICE;
  
  if (!mongoUri) {
    console.warn('[VoicePreferences] mongoDB_SRV_AUTOVOICE not set in .env - voice preferences will not be saved');
    return false;
  }
  
  try {
    autoVoiceConnection = await mongoose.createConnection(mongoUri, {
      dbName: 'autovoice'
    }).asPromise();
    
    VoicePreferencesModel = autoVoiceConnection.model('voicepreferences', voicePreferencesSchema);
    
    console.log('[VoicePreferences] Connected to auto voice database');
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Failed to connect to auto voice database:', error.message);
    return false;
  }
}

/**
 * Check if the database is connected
 */
function isConnected() {
  return autoVoiceConnection !== null && VoicePreferencesModel !== null;
}

/**
 * Get user preferences for a guild
 */
async function getPreferences(userId, guildId) {
  if (!isConnected()) return null;
  
  try {
    const prefs = await VoicePreferencesModel.findOne({ userID: userId, guildID: guildId });
    return prefs;
  } catch (error) {
    console.error('[VoicePreferences] Error getting preferences:', error);
    return null;
  }
}

/**
 * Save or update user preferences
 */
async function savePreferences(userId, guildId, data) {
  if (!isConnected()) return null;
  
  try {
    const prefs = await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        ...data, 
        userID: userId, 
        guildID: guildId,
        lastUpdated: new Date() 
      },
      { upsert: true, new: true }
    );
    return prefs;
  } catch (error) {
    console.error('[VoicePreferences] Error saving preferences:', error);
    return null;
  }
}

/**
 * Update a specific preference field
 */
async function updatePreference(userId, guildId, field, value) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        [field]: value,
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error updating preference:', error);
    return false;
  }
}

/**
 * Save channel name preference (auto-applied)
 */
async function saveChannelName(userId, guildId, channelName) {
  return updatePreference(userId, guildId, 'channelName', channelName);
}

/**
 * Save user limit preference (auto-applied)
 */
async function saveUserLimit(userId, guildId, userLimit) {
  return updatePreference(userId, guildId, 'userLimit', userLimit);
}

/**
 * Save bitrate preference
 */
async function saveBitrate(userId, guildId, bitrate) {
  return updatePreference(userId, guildId, 'bitrate', bitrate);
}

/**
 * Save lock state preference
 */
async function saveLockState(userId, guildId, locked) {
  return updatePreference(userId, guildId, 'locked', locked);
}

/**
 * Save ghost state preference
 */
async function saveGhostState(userId, guildId, ghosted) {
  return updatePreference(userId, guildId, 'ghosted', ghosted);
}

/**
 * Save region preference
 */
async function saveRegion(userId, guildId, region) {
  return updatePreference(userId, guildId, 'region', region);
}

/**
 * Save channel status preference
 */
async function saveChannelStatus(userId, guildId, channelStatus) {
  return updatePreference(userId, guildId, 'channelStatus', channelStatus);
}

/**
 * Add a rejected user to preferences
 */
async function addRejectedUser(userId, guildId, rejectedUserId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        $addToSet: { rejectedUsers: rejectedUserId },
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error adding rejected user:', error);
    return false;
  }
}

/**
 * Remove a rejected user from preferences
 */
async function removeRejectedUser(userId, guildId, rejectedUserId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        $pull: { rejectedUsers: rejectedUserId },
        lastUpdated: new Date()
      }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error removing rejected user:', error);
    return false;
  }
}

/**
 * Add a rejected role to preferences
 */
async function addRejectedRole(userId, guildId, roleId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        $addToSet: { rejectedRoles: roleId },
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error adding rejected role:', error);
    return false;
  }
}

/**
 * Remove a rejected role from preferences
 */
async function removeRejectedRole(userId, guildId, roleId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        $pull: { rejectedRoles: roleId },
        lastUpdated: new Date()
      }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error removing rejected role:', error);
    return false;
  }
}

/**
 * Save text channel name preference
 */
async function saveTextChannelName(userId, guildId, textChannelName) {
  return updatePreference(userId, guildId, 'textChannelName', textChannelName);
}

/**
 * Add a banned user for text channel
 */
async function addTextBannedUser(userId, guildId, bannedUserId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        $addToSet: { textBannedUsers: bannedUserId },
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error adding text banned user:', error);
    return false;
  }
}

/**
 * Remove a banned user from text channel preferences
 */
async function removeTextBannedUser(userId, guildId, bannedUserId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        $pull: { textBannedUsers: bannedUserId },
        lastUpdated: new Date()
      }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error removing text banned user:', error);
    return false;
  }
}

/**
 * Add a view-only user for text channel
 */
async function addTextViewOnlyUser(userId, guildId, viewOnlyUserId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        $addToSet: { textViewOnlyUsers: viewOnlyUserId },
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error adding text view-only user:', error);
    return false;
  }
}

/**
 * Remove a view-only user from text channel preferences
 */
async function removeTextViewOnlyUser(userId, guildId, viewOnlyUserId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { 
        $pull: { textViewOnlyUsers: viewOnlyUserId },
        lastUpdated: new Date()
      }
    );
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error removing text view-only user:', error);
    return false;
  }
}

/**
 * Clear all preferences for a user in a guild
 */
async function clearPreferences(userId, guildId) {
  if (!isConnected()) return false;
  
  try {
    await VoicePreferencesModel.deleteOne({ userID: userId, guildID: guildId });
    return true;
  } catch (error) {
    console.error('[VoicePreferences] Error clearing preferences:', error);
    return false;
  }
}

/**
 * Check if user has any saved preferences
 */
async function hasPreferences(userId, guildId) {
  if (!isConnected()) return false;
  
  try {
    const count = await VoicePreferencesModel.countDocuments({ userID: userId, guildID: guildId });
    return count > 0;
  } catch (error) {
    console.error('[VoicePreferences] Error checking preferences:', error);
    return false;
  }
}

/**
 * Close the database connection (call on shutdown)
 */
async function shutdown() {
  if (autoVoiceConnection) {
    await autoVoiceConnection.close();
    console.log('[VoicePreferences] Database connection closed');
  }
}

module.exports = {
  initialize,
  isConnected,
  shutdown,
  getPreferences,
  savePreferences,
  updatePreference,
  saveChannelName,
  saveUserLimit,
  saveBitrate,
  saveLockState,
  saveGhostState,
  saveRegion,
  saveChannelStatus,
  addRejectedUser,
  removeRejectedUser,
  addRejectedRole,
  removeRejectedRole,
  saveTextChannelName,
  addTextBannedUser,
  removeTextBannedUser,
  addTextViewOnlyUser,
  removeTextViewOnlyUser,
  clearPreferences,
  hasPreferences
};
