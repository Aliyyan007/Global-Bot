/**
 * Auto Voice Channel System - Main Entry Point
 * Exposes public API for integration with the main bot
 * This is the exact same system as the standalone Auto Voice Node bot
 */

const dataStore = require('./voice/dataStore');
const voiceManager = require('./voice/voiceManager');
const voicePreferences = require('./voice/voicePreferences');
const voiceStateUpdate = require('./handlers/voiceStateUpdate');
const interactionCreate = require('./handlers/interactionCreate');
const messageCreate = require('./handlers/messageCreate');

let client = null;

/**
 * Initialize the Auto Voice system
 * @param {Client} discordClient - The Discord.js client instance
 */
async function initialize(discordClient) {
  client = discordClient;
  
  // Initialize voice preferences database
  await voicePreferences.initialize();
  
  console.log('[Auto Voice] System initialized');
}

/**
 * Shutdown the Auto Voice system gracefully
 * Forces save of all pending data
 */
async function shutdown() {
  console.log('[Auto Voice] Shutting down, saving data...');
  dataStore.forceSave();
  await voicePreferences.shutdown();
}

/**
 * Check if Auto Voice is configured for a guild
 * @param {string} guildId - The guild ID
 * @returns {boolean}
 */
function isConfigured(guildId) {
  return dataStore.getGuildSettings(guildId) !== null;
}

/**
 * Handle voice state update events
 * @param {VoiceState} oldState
 * @param {VoiceState} newState
 * @returns {Promise<boolean>} - True if handled
 */
async function handleVoiceStateUpdate(oldState, newState) {
  try {
    await voiceStateUpdate.execute(oldState, newState);
    return true;
  } catch (error) {
    console.error('[Auto Voice] Error in voiceStateUpdate:', error);
    return false;
  }
}

/**
 * Check if an interaction is Auto Voice related
 * @param {Interaction} interaction
 * @returns {boolean}
 */
function isVoiceInteraction(interaction) {
  if (!interaction.customId) return false;
  
  const voicePrefixes = [
    'voice_settings:', 'voice_permissions:', 'voice_region:',
    'text_settings:', 'text_take_actions:', 'text_remove_actions:',
    'text_edit_name:', 'text_delete:', 'text_sticky:',
    'text_confirm_delete:', 'text_cancel_delete:',
    'text_user_select:', 'text_mentionable_select:', 'text_string_select:',
    'user_select:', 'mentionable_select:',
    'claim_ownership:', 'lfm_join:',
    'setup_default', 'setup_custom',
    'sticky_note:', 'sticky_note_manager:', 'sticky_enable:', 'sticky_disable:',
    'permit_rejected:',
    'load_settings:', 'view_current_settings:',
    'waitingroom_accept:', 'waitingroom_reject:',
    'waiting_room_enable:', 'waiting_room_disable:',
    'modal_name:', 'modal_limit:', 'modal_status:',
    'modal_bitrate:', 'modal_lfm:', 'modal_text_name:', 'modal_text:',
    'modal_invite:', 'modal_invite_note:', 'modal_custom_setup',
    'modal_reject:', 'm_ban:', 'modal_voice_appeal:',
    'reject_type:', 'reject_current:', 'reject_upcoming:',
    'reject_with_reason:', 'reject_without_reason:',
    'invite_with_note:', 'invite_without_note:',
    'ban_with_reason:', 'ban_without_reason:',
    'ban_r:', 'ban_n:', 'txt_cancel:', 'text_cancel_action:',
    'cancel_action:',
    'voice_request_approve:', 'voice_request_deny:', 'voice_request_join:',
    'voice_appeal_start:', 'voice_appeal_add_note:', 'voice_appeal_without_note:',
    'voice_appeal_cancel', 'voice_appeal_channel_select',
    'voice_prefs_edit:', 'voice_prefs_permit:',
    'voice_prefs_clear_all:', 'voice_prefs_refresh:'
  ];
  
  return voicePrefixes.some(prefix => interaction.customId.startsWith(prefix));
}

/**
 * Handle Auto Voice interactions
 * @param {Interaction} interaction
 * @returns {Promise<boolean>} - True if handled
 */
async function handleInteraction(interaction) {
  try {
    await interactionCreate.execute(interaction);
    return true;
  } catch (error) {
    console.error('[Auto Voice] Error in interaction handler:', error);
    return false;
  }
}

/**
 * Handle message create events (for sticky notes)
 * @param {Message} message
 * @returns {Promise<boolean>}
 */
async function handleMessageCreate(message) {
  try {
    await messageCreate.execute(message);
    return true;
  } catch (error) {
    console.error('[Auto Voice] Error in messageCreate:', error);
    return false;
  }
}

/**
 * Get the Discord client
 * @returns {Client}
 */
function getClient() {
  return client;
}

module.exports = {
  initialize,
  shutdown,
  isConfigured,
  handleVoiceStateUpdate,
  isVoiceInteraction,
  handleInteraction,
  handleMessageCreate,
  getClient,
  // Re-export commonly used modules
  dataStore,
  voiceManager
};
