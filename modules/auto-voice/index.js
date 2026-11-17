/**
 * Auto Voice Channel System - Main Entry Point
 * Exposes public API for integration with the main bot
 * This is the exact same system as the standalone Auto Voice Node bot
 */

const { Events } = require('discord.js');
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

  // Initialize voice preferences database (no Discord access needed)
  await voicePreferences.initialize();

  // Hydrate the voice data store from MongoDB/file before anything can
  // query it — on hosts with ephemeral filesystems (Render) the JSON file
  // is wiped each restart, so the configured "Join to Create" channel only
  // survives via the Mongo mirror.
  await dataStore.whenReady().catch(e => console.error('[Auto Voice] Data store init error:', e.message));

  // Discord-touching reconciliation must wait until the client is
  // authenticated — initialize() runs before client.login(), so fetching
  // here would fail and wipe every persisted temp-channel record.
  if (client.isReady()) {
    await reconcile(client);
  } else {
    // discord.js v14 emits 'clientReady' (the old 'ready' alias was removed)
    client.once(Events.ClientReady, () => reconcile(client).catch(e => console.error('[Auto Voice] Reconciliation failed:', e)));
  }

  console.log('[Auto Voice] System initialized');
}

/**
 * Reconcile persisted temp-channel state with Discord after login.
 * - Never touches the configured "Join to Create" generator channel or categories.
 * - Drops records whose voice channel is gone; also removes its linked
 *   text/waiting-room channels if they still exist.
 * - Deletes temp voice channels left empty while the bot was offline.
 * - Re-adopts live, unmanaged channels inside the temp category so the
 *   normal empty-channel cleanup keeps working for them.
 */
async function reconcile(discordClient) {
  try {
    // Wait for Mongo/file hydration so voice_settings are actually known
    await dataStore.whenReady().catch(() => null);
    const data = dataStore.loadVoiceData();
    const voiceSettings = data.voice_settings || {};
    let pruned = 0;
    let deleted = 0;
    let adopted = 0;

    // Generator/category existence warnings — read-only, never modifies them
    for (const [guildId, settings] of Object.entries(voiceSettings)) {
      const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) continue;
      if (settings.voice_channel_id) {
        const joinChannel = await guild.channels.fetch(settings.voice_channel_id).catch(() => null);
        if (!joinChannel) {
          console.warn(`[Auto Voice] Guild ${guildId}: configured "Join to Create" channel ${settings.voice_channel_id} no longer exists — system inactive until reconfigured (/auto-voice-manager)`);
        }
      }
      if (settings.temp_voice_category_id) {
        const cat = await guild.channels.fetch(settings.temp_voice_category_id).catch(() => null);
        if (!cat) {
          console.warn(`[Auto Voice] Guild ${guildId}: temp voice category ${settings.temp_voice_category_id} no longer exists — temp channels will be created without a category`);
        }
      }
    }

    // Reconcile persisted temp-channel records
    for (const [channelId, tempData] of Object.entries(data.temp_channels || {})) {
      const channel = await discordClient.channels.fetch(channelId).catch(() => null);
      const guild = channel?.guild
        || (tempData?.guild_id ? (discordClient.guilds.cache.get(tempData.guild_id) || await discordClient.guilds.fetch(tempData.guild_id).catch(() => null)) : null)
        || await resolveGuildForChannel(
          discordClient,
          [channelId, tempData?.text_channel_id, tempData?.waiting_room_channel_id].filter(Boolean),
          voiceSettings
        );
      if (!channel) {
        // Voice channel gone — clean up lingering linked channels and the record
        await deleteLinkedChannels(guild, tempData);
        dataStore.deleteTempChannel(channelId);
        dataStore.deleteChannelOwner(channelId);
        pruned++;
        continue;
      }
      if (!guild) continue;
      // Never treat a configured generator channel as a temp channel
      const settings = voiceSettings[guild.id];
      if (settings?.voice_channel_id && String(settings.voice_channel_id) === String(channelId)) {
        dataStore.deleteTempChannel(channelId);
        dataStore.deleteChannelOwner(channelId);
        pruned++;
        continue;
      }
      if (channel.members.size === 0) {
        // Emptied while offline — delete as the normal flow would
        await deleteLinkedChannels(guild, tempData);
        await channel.delete('Temp channel empty on restart').catch(() => null);
        dataStore.deleteTempChannel(channelId);
        dataStore.deleteChannelOwner(channelId);
        deleted++;
      } else {
        // Still occupied — keep management alive; restore owner record if lost
        if (!dataStore.getChannelOwner(channelId) && tempData.owner_id) {
          dataStore.setChannelOwner(channelId, tempData.owner_id);
        }
        adopted++;
      }
    }

    // Orphan sweep: unmanaged channels left inside the temp category
    for (const [guildId, settings] of Object.entries(voiceSettings)) {
      if (!settings.temp_voice_category_id) continue;
      const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) continue;
      const tempRecords = data.temp_channels || {};
      for (const [, ch] of guild.channels.cache) {
        if (ch.parentId !== settings.temp_voice_category_id) continue;
        if (ch.id === settings.voice_channel_id) continue;
        if (tempRecords[ch.id]) continue;
        if (ch.type !== 2) continue; // GuildVoice only
        if (ch.members.size === 0) {
          await ch.delete('Orphaned temp channel on restart').catch(() => null);
          deleted++;
        } else {
          // Occupied channel with no record — adopt it so normal cleanup applies
          const ownerId = ch.members.first()?.id;
          if (ownerId) {
            dataStore.setTempChannel(ch.id, { owner_id: ownerId, guild_id: guild.id, created_at: new Date(ch.createdTimestamp).toISOString(), text_channel_id: null });
            dataStore.setChannelOwner(ch.id, ownerId);
            adopted++;
          }
        }
      }
    }

    if (pruned || deleted || adopted) {
      dataStore.forceSave();
      console.log(`[Auto Voice] Reconciled: ${pruned} stale record(s) pruned, ${deleted} empty channel(s) deleted, ${adopted} live channel(s) adopted`);
    }
  } catch (e) {
    console.error('[Auto Voice] Reconciliation failed:', e.message);
  }
}

async function resolveGuildForChannel(discordClient, channelIds, voiceSettings) {
  const ids = Array.isArray(channelIds) ? channelIds : [channelIds];
  for (const [guildId] of Object.entries(voiceSettings)) {
    const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => null);
    if (guild && ids.some(id => guild.channels.cache.has(id))) return guild;
  }
  return null;
}

async function deleteLinkedChannels(guild, tempData) {
  if (!guild || !tempData) return;
  for (const linkedId of [tempData.text_channel_id, tempData.waiting_room_channel_id]) {
    if (!linkedId) continue;
    const linked = await guild.channels.fetch(linkedId).catch(() => null);
    if (linked) await linked.delete('Linked voice channel deleted').catch(() => null);
  }
}

/**
 * Shutdown the Auto Voice system gracefully
 * Forces save of all pending data
 */
async function shutdown() {
  console.log('[Auto Voice] Shutting down, saving data...');
  await dataStore.forceSave().catch(() => null);
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
    await dataStore.whenReady().catch(() => null);
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
  reconcile,
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
