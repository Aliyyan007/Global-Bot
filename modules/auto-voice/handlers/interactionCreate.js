/**
 * Interaction Create Event Handler
 * Handles slash commands, select menus, modals, and buttons
 * Requirements: 2.5, 3.1-3.6, 4.1-4.9, 5.2-5.3
 */

const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, MentionableSelectMenuBuilder } = require('discord.js');
const dataStore = require('../voice/dataStore');
const voiceManager = require('../voice/voiceManager');
const controlPanel = require('../voice/controlPanel');
const modals = require('../voice/modals');
const stickyNotes = require('../voice/stickyNotes');
const textChannelRestrictions = require('../voice/textChannelRestrictions');
const voiceRequestManager = require('../voice/voiceRequestManager');
const voicePreferences = require('../voice/voicePreferences');
const { clearGoToLatestTracking, getLatestMessageUrl } = require('./messageCreate');
const { getMaxBitrateForTier } = require('../voice/constants');

// Track users who were rejected as "current" (were in channel and disconnected)
// Map<channelId, Set<userId>>
const currentRejections = new Map();

// Track channel rename rate limits
// Map<channelId, { renameCount: number, firstRenameTime: number, rateLimitUntil: number, countdownInterval: NodeJS.Timeout }>
const channelRenameTracking = new Map();

// Discord allows 2 renames per 10 minutes
const RENAME_LIMIT = 2;
const RENAME_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Track a channel rename and check if rate limited
 * @returns {{ allowed: boolean, remainingTime: number }} - Whether rename is allowed and remaining cooldown time in ms
 */
function trackChannelRename(channelId) {
  const now = Date.now();
  let tracking = channelRenameTracking.get(channelId);
  
  if (!tracking) {
    // First rename for this channel
    channelRenameTracking.set(channelId, {
      renameCount: 1,
      firstRenameTime: now,
      rateLimitUntil: 0,
      countdownInterval: null
    });
    return { allowed: true, remainingTime: 0 };
  }
  
  // Check if we're currently rate limited
  if (tracking.rateLimitUntil > now) {
    return { allowed: false, remainingTime: tracking.rateLimitUntil - now };
  }
  
  // Check if the window has expired
  if (now - tracking.firstRenameTime >= RENAME_WINDOW_MS) {
    // Reset the tracking
    tracking.renameCount = 1;
    tracking.firstRenameTime = now;
    tracking.rateLimitUntil = 0;
    return { allowed: true, remainingTime: 0 };
  }
  
  // Within the window, check count
  if (tracking.renameCount >= RENAME_LIMIT) {
    // Rate limited - calculate when it expires
    const rateLimitUntil = tracking.firstRenameTime + RENAME_WINDOW_MS;
    tracking.rateLimitUntil = rateLimitUntil;
    return { allowed: false, remainingTime: rateLimitUntil - now };
  }
  
  // Allowed, increment count
  tracking.renameCount++;
  return { allowed: true, remainingTime: 0 };
}

/**
 * Check if a channel rename is allowed WITHOUT consuming a rename slot
 * Use this to check before showing the modal
 * @returns {{ allowed: boolean, remainingTime: number }}
 */
function checkChannelRenameAllowed(channelId) {
  const now = Date.now();
  const tracking = channelRenameTracking.get(channelId);
  
  if (!tracking) {
    // No tracking yet, first rename is always allowed
    return { allowed: true, remainingTime: 0 };
  }
  
  // Check if we're currently rate limited
  if (tracking.rateLimitUntil > now) {
    return { allowed: false, remainingTime: tracking.rateLimitUntil - now };
  }
  
  // Check if the window has expired
  if (now - tracking.firstRenameTime >= RENAME_WINDOW_MS) {
    return { allowed: true, remainingTime: 0 };
  }
  
  // Within the window, check count
  if (tracking.renameCount >= RENAME_LIMIT) {
    // Rate limited - calculate when it expires
    const rateLimitUntil = tracking.firstRenameTime + RENAME_WINDOW_MS;
    return { allowed: false, remainingTime: rateLimitUntil - now };
  }
  
  return { allowed: true, remainingTime: 0 };
}

/**
 * Set rate limit for a channel (called when Discord returns rate limit error)
 */
function setChannelRateLimit(channelId, durationMs = RENAME_WINDOW_MS) {
  const now = Date.now();
  let tracking = channelRenameTracking.get(channelId);
  
  if (!tracking) {
    tracking = {
      renameCount: RENAME_LIMIT,
      firstRenameTime: now - RENAME_WINDOW_MS + durationMs,
      rateLimitUntil: now + durationMs,
      countdownInterval: null
    };
    channelRenameTracking.set(channelId, tracking);
  } else {
    tracking.rateLimitUntil = now + durationMs;
    tracking.renameCount = RENAME_LIMIT;
  }
  
  return tracking.rateLimitUntil;
}

/**
 * Clear rate limit tracking for a channel (cleanup on channel delete)
 */
function clearChannelRenameTracking(channelId) {
  const tracking = channelRenameTracking.get(channelId);
  if (tracking?.countdownInterval) {
    clearInterval(tracking.countdownInterval);
  }
  channelRenameTracking.delete(channelId);
}

/**
 * Start a rate limit countdown on the control panel
 * Uses Discord's live timestamp format for automatic countdown display
 * Shows the full control panel with a rate limit warning at the top
 * @param {Object} interaction - The interaction object
 * @param {string} channelId - The channel ID (voice or text)
 * @param {string} ownerId - The channel owner ID
 * @param {boolean} isTextChannel - Whether this is a text channel
 * @param {string} voiceChannelId - The voice channel ID (only for text channels)
 */
async function startRateLimitCountdown(interaction, channelId, ownerId, isTextChannel = false, voiceChannelId = null) {
  // Get or create tracking - don't reset if already rate limited
  let tracking = channelRenameTracking.get(channelId);
  
  if (!tracking) {
    // Set a new rate limit if no tracking exists
    setChannelRateLimit(channelId);
    tracking = channelRenameTracking.get(channelId);
  } else if (tracking.rateLimitUntil <= Date.now()) {
    // If not currently rate limited, set a new rate limit
    setChannelRateLimit(channelId);
    tracking = channelRenameTracking.get(channelId);
  }
  
  // Clear any existing countdown interval (we don't need intervals anymore with Discord timestamps)
  if (tracking.countdownInterval) {
    clearInterval(tracking.countdownInterval);
    tracking.countdownInterval = null;
  }
  
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestUrl = getLatestMessageUrl(channelId);
  
  // Convert rateLimitUntil from milliseconds to Unix timestamp (seconds)
  const rateLimitUntilSeconds = Math.floor(tracking.rateLimitUntil / 1000);
  
  // Build the control panel with rate limit warning using Discord's live timestamp
  let components, flags;
  
  if (isTextChannel) {
    const result = controlPanel.buildTextControlPanelWithRateLimit(
      interaction.guildId,
      channelId,
      voiceChannelId,
      ownerId,
      rateLimitUntilSeconds,
      { stickyEnabled, latestMessageUrl: latestUrl }
    );
    components = result.components;
    flags = result.flags;
  } else {
    // Get waiting room status from temp data
    const tempData = dataStore.getTempChannel(channelId);
    const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
    
    const result = controlPanel.buildVoiceControlPanelWithRateLimit(
      interaction.guildId,
      channelId,
      ownerId,
      rateLimitUntilSeconds,
      { 
        thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
        stickyEnabled,
        latestMessageUrl: latestUrl,
        waitingRoomEnabled
      }
    );
    components = result.components;
    flags = result.flags;
  }
  
  try {
    // Use interaction.update() for select menu interactions
    await interaction.update({ components, flags });
  } catch (e) {
    // Fallback to finding and editing the message directly
    try {
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (channel) {
        const messages = await channel.messages.fetch({ limit: 50 });
        const controlPanelMsg = messages.find(msg => {
          if (msg.author.id !== interaction.client.user.id) return false;
          if (msg.components?.length > 0) {
            const firstComponent = msg.components[0];
            if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
          }
          return false;
        });
        if (controlPanelMsg) {
          await controlPanelMsg.edit({ components, flags });
        }
      }
    } catch (e2) {
      // Ignore
    }
  }
  
  // Revert to normal control panel after 3 seconds (just show the notification briefly)
  setTimeout(async () => {
    try {
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) return;
      
      const messages = await channel.messages.fetch({ limit: 50 });
      const controlPanelMsg = messages.find(msg => {
        if (msg.author.id !== interaction.client.user.id) return false;
        if (msg.components?.length > 0) {
          const firstComponent = msg.components[0];
          if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
        }
        return false;
      });
      
      if (!controlPanelMsg) return;
      
      const latestUrl = getLatestMessageUrl(channelId);
      const stickyEnabled = stickyNotes.isEnabled(channelId);
      
      if (isTextChannel) {
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
          interaction.guildId,
          channelId,
          voiceChannelId,
          ownerId,
          { stickyEnabled, latestMessageUrl: latestUrl }
        );
        await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
      } else {
        // Get waiting room status from temp data
        const tempData = dataStore.getTempChannel(channelId);
        const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
        
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
          interaction.guildId,
          channelId,
          ownerId,
          { 
            thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            stickyEnabled,
            latestMessageUrl: latestUrl,
            waitingRoomEnabled
          }
        );
        await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
      }
    } catch (e) {
      // Ignore errors when reverting
    }
  }, 3000); // 3 seconds
}

/**
 * Track a user as a "current" rejection (was in channel and disconnected)
 */
function trackCurrentRejection(channelId, userId) {
  if (!currentRejections.has(channelId)) {
    currentRejections.set(channelId, new Set());
  }
  currentRejections.get(channelId).add(userId);
}

/**
 * Check if a user was rejected as "current" (was in channel and disconnected)
 */
function wasCurrentRejection(channelId, userId) {
  return currentRejections.has(channelId) && currentRejections.get(channelId).has(userId);
}

/**
 * Remove a user from current rejections tracking (when permitted)
 */
function removeCurrentRejection(channelId, userId) {
  if (currentRejections.has(channelId)) {
    currentRejections.get(channelId).delete(userId);
  }
}

/**
 * Clear all current rejections for a channel (when channel is deleted)
 */
function clearCurrentRejections(channelId) {
  currentRejections.delete(channelId);
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  hasElevatedPermissions, // Export for use by other modules
  clearCurrentRejections, // Export for cleanup
  convertToUnicodeBold, // Export for use by other modules
  async execute(interaction) {
    try {
      // Debug: Log ALL interactions
      console.log('[InteractionCreate] Received interaction:', {
        type: interaction.type,
        isButton: interaction.isButton?.() || false,
        isStringSelect: interaction.isStringSelectMenu?.() || false,
        customId: interaction.customId || 'N/A',
        componentType: interaction.componentType || 'N/A'
      });
      
      // Debug: Log all select menu interactions
      if (interaction.isAnySelectMenu()) {
        console.log('Select Menu Interaction:', {
          customId: interaction.customId,
          componentType: interaction.componentType,
          isUserSelect: interaction.isUserSelectMenu(),
          isMentionableSelect: interaction.isMentionableSelectMenu(),
          isStringSelect: interaction.isStringSelectMenu(),
          isRoleSelect: interaction.isRoleSelectMenu?.() || false,
          isChannelSelect: interaction.isChannelSelectMenu?.() || false
        });
      }
      
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
        return;
      }
      
      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
        return;
      }
      
      if (interaction.isUserSelectMenu()) {
        await handleUserSelect(interaction);
        return;
      }
      
      if (interaction.isMentionableSelectMenu()) {
        console.log('>>> Routing to handleMentionableSelect');
        await handleMentionableSelect(interaction);
        return;
      }
      
      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }
      
      if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
        return;
      }
    } catch (error) {
      console.error('Error in interactionCreate:', error);
      
      const errorMessage = 'An error occurred while processing your request.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
      }
    }
  }
};

async function handleSlashCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  
  if (!command) {
    await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    return;
  }
  
  await command.execute(interaction);
}

/**
 * Resolves universal channel/owner IDs to actual IDs
 * When a universal control panel is used, this finds the user's temp VC
 * @param {string} channelId - The channel ID (may be "UNIVERSAL")
 * @param {string} ownerId - The owner ID (may be "UNIVERSAL")
 * @param {string} userId - The user ID who triggered the interaction
 * @param {string} guildId - The guild ID
 * @param {Interaction} interaction - The interaction object (to fetch channels)
 * @returns {Promise<{ channelId: string, ownerId: string } | null>}
 */
async function resolveUniversalIds(channelId, ownerId, userId, guildId, interaction) {
  // If not universal, return as-is
  if (channelId !== 'UNIVERSAL' && ownerId !== 'UNIVERSAL') {
    return { channelId, ownerId };
  }
  
  // Find the user's temp VC
  const allTempChannels = dataStore.loadVoiceData().temp_channels || {};
  
  // Find all temp VCs owned by this user in this guild
  const userTempChannels = [];
  for (const [tempChannelId, tempData] of Object.entries(allTempChannels)) {
    if (tempData.owner_id === userId) {
      userTempChannels.push(tempChannelId);
    }
  }
  
  // Verify each channel actually exists in Discord
  for (const tempChannelId of userTempChannels) {
    try {
      const channel = await interaction.guild.channels.fetch(tempChannelId).catch(() => null);
      if (channel) {
        // Found a valid temp VC!
        return {
          channelId: tempChannelId,
          ownerId: userId
        };
      } else {
        // Channel doesn't exist anymore, clean it up
        console.log(`[Auto Voice] Cleaning up stale temp channel: ${tempChannelId}`);
        dataStore.deleteTempChannel(tempChannelId);
        dataStore.deleteChannelOwner(tempChannelId);
      }
    } catch (error) {
      // Channel doesn't exist, clean it up
      console.log(`[Auto Voice] Cleaning up stale temp channel: ${tempChannelId}`);
      dataStore.deleteTempChannel(tempChannelId);
      dataStore.deleteChannelOwner(tempChannelId);
    }
  }
  
  // No valid temp VC found
  return null;
}

/**
 * Checks if the interaction is from a universal interface
 * @param {Interaction} interaction - The interaction object
 * @returns {boolean} - True if from universal interface
 */
function isUniversalInterface(interaction) {
  if (!interaction.customId) return false;
  return interaction.customId.includes('UNIVERSAL');
}

async function handleSelectMenu(interaction) {
  const [type, ...params] = interaction.customId.split(':');
  
  // Check if this is a universal interface
  const isUniversal = isUniversalInterface(interaction);
  
  // Resolve universal IDs if present
  let resolvedParams = params;
  if (params.length >= 2 && (params[0] === 'UNIVERSAL' || params[1] === 'UNIVERSAL')) {
    const resolved = await resolveUniversalIds(params[0], params[1], interaction.user.id, interaction.guildId, interaction);
    if (!resolved) {
      await interaction.reply({
        content: '❌ You don\'t have an active temporary voice channel. Create one by joining the "Join to Create" channel first.',
        ephemeral: true
      });
      return;
    }
    resolvedParams = [resolved.channelId, resolved.ownerId, ...params.slice(2)];
  }
  
  // Pass isUniversal flag to handlers
  switch (type) {
    case 'voice_settings':
      await handleVoiceSettings(interaction, resolvedParams, isUniversal);
      break;
    case 'voice_permissions':
      await handleVoicePermissions(interaction, resolvedParams, isUniversal);
      break;
    case 'voice_region':
      await handleVoiceRegion(interaction, params);
      break;
    case 'text_settings':
      await handleTextSettings(interaction, params);
      break;
    case 'text_take_actions':
      await handleTextTakeActions(interaction, params);
      break;
    case 'text_remove_actions':
      await handleTextRemoveActions(interaction, params);
      break;
    case 'text_string_select':
      await handleTextStringSelect(interaction, params);
      break;
    case 'permit_rejected':
      await handlePermitRejectedSelect(interaction, params);
      break;
    case 'voice_appeal_channel_select':
      await handleVoiceAppealChannelSelect(interaction);
      break;
    case 'voice_prefs_edit':
      await handleVoicePrefsEdit(interaction, params);
      break;
    case 'voice_prefs_permit':
      await handleVoicePrefsPermit(interaction, params);
      break;
    default:
      await interaction.reply({ content: 'Unknown select menu.', ephemeral: true });
  }
}


async function handleVoiceSettings(interaction, params, isUniversal = false) {
  const [channelId, ownerId] = params;
  const selectedValue = interaction.values[0];
  
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  // Admins bypass feature permission checks but still need to check if feature is enabled
  if (!hasElevatedPermissions(interaction.member)) {
    const featureCheck = voiceManager.canUseFeature(interaction.guildId, interaction.member, selectedValue);
    if (!featureCheck.allowed) {
      console.log(`Feature check failed for ${selectedValue}:`, featureCheck.message);
      if (isUniversal) {
        await interaction.reply({ content: `❌ **Feature Disabled**\n${featureCheck.message}`, ephemeral: true });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Feature Disabled', featureCheck.message);
      }
      return;
    }
  } else {
    // Even admins need the feature to be enabled at the server level
    const isEnabled = voiceManager.isFeatureEnabled(interaction.guildId, selectedValue);
    if (!isEnabled) {
      console.log(`Feature ${selectedValue} is disabled at server level for guild ${interaction.guildId}`);
      if (isUniversal) {
        await interaction.reply({ content: `❌ **Feature Disabled**\nThe ${selectedValue} feature is currently disabled on this server.`, ephemeral: true });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Feature Disabled', `The ${selectedValue} feature is currently disabled on this server.`);
      }
      return;
    }
  }
  
  // For modal actions, show the modal first then refresh the control panel (only for non-universal)
  // For universal interfaces, just show the modal without refreshing
  switch (selectedValue) {
    case 'name':
      // Check if rate limited before showing modal
      const nameRateCheck = checkChannelRenameAllowed(channelId);
      if (!nameRateCheck.allowed) {
        if (isUniversal) {
          const remainingSeconds = Math.ceil(nameRateCheck.remainingTime / 1000);
          const remainingMinutes = Math.ceil(remainingSeconds / 60);
          await interaction.reply({ 
            content: `⏳ **Rename Cooldown Active**\nYou can rename again in ${remainingMinutes} minute(s). Discord limits channel renames to 2 per 10 minutes.`, 
            ephemeral: true 
          });
        } else {
          await startRateLimitCountdown(interaction, channelId, ownerId, false);
        }
        return;
      }
      await interaction.showModal(modals.buildNameModal(channelId));
      if (!isUniversal) {
        await refreshControlPanelAfterModal(interaction, channelId, ownerId);
      } else {
        // For universal interface, refresh after showing modal
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.refreshUniversalInterface(interaction, channelId, ownerId);
      }
      break;
    case 'limit':
      await interaction.showModal(modals.buildLimitModal(channelId));
      if (!isUniversal) {
        await refreshControlPanelAfterModal(interaction, channelId, ownerId);
      } else {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.refreshUniversalInterface(interaction, channelId, ownerId);
      }
      break;
    case 'status':
      await interaction.showModal(modals.buildStatusModal(channelId));
      if (!isUniversal) {
        await refreshControlPanelAfterModal(interaction, channelId, ownerId);
      } else {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.refreshUniversalInterface(interaction, channelId, ownerId);
      }
      break;
    case 'bitrate':
      await interaction.showModal(modals.buildBitrateModal(channelId, interaction.guild));
      if (!isUniversal) {
        await refreshControlPanelAfterModal(interaction, channelId, ownerId);
      } else {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.refreshUniversalInterface(interaction, channelId, ownerId);
      }
      break;
    case 'lfm':
      await interaction.showModal(modals.buildLfmModal(channelId));
      if (!isUniversal) {
        await refreshControlPanelAfterModal(interaction, channelId, ownerId);
      } else {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.refreshUniversalInterface(interaction, channelId, ownerId);
      }
      break;
    case 'text':
      await handleCreateTextChannel(interaction, channelId, isUniversal);
      break;
    case 'game':
      // Check if rate limited before attempting game rename
      const gameRateCheck = checkChannelRenameAllowed(channelId);
      if (!gameRateCheck.allowed) {
        if (isUniversal) {
          const remainingSeconds = Math.ceil(gameRateCheck.remainingTime / 1000);
          const remainingMinutes = Math.ceil(remainingSeconds / 60);
          await interaction.reply({ 
            content: `⏳ **Rename Cooldown Active**\nYou can rename again in ${remainingMinutes} minute(s). Discord limits channel renames to 2 per 10 minutes.`, 
            ephemeral: true 
          });
        } else {
          await startRateLimitCountdown(interaction, channelId, ownerId, false);
        }
        return;
      }
      await handleGameMode(interaction, channelId, isUniversal);
      break;
    case 'nsfw':
      await handleNsfwToggle(interaction, channelId, isUniversal);
      break;
    case 'claim':
      await handleClaimChannel(interaction, channelId, isUniversal);
      break;
    case 'waitingroom':
      // Use separate handler for universal interface
      if (isUniversal) {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.handleWaitingRoomManagerUniversal(interaction, channelId, ownerId);
      } else {
        await handleWaitingRoomToggle(interaction, channelId, isUniversal);
      }
      break;
    default:
      await interaction.reply({ content: 'Unknown setting.', ephemeral: true });
  }
}

/**
 * Refreshes the control panel after showing a modal
 * This resets the select menu so the user can select the same option again
 */
async function refreshControlPanelAfterModal(interaction, channelId, ownerId) {
  try {
    const stickyEnabled = stickyNotes.isEnabled(channelId);
    const latestMessageUrl = getLatestMessageUrl(channelId);
    const tempData = dataStore.getTempChannel(channelId);
    const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
    
    const { components, flags } = controlPanel.buildCompactVoiceControlPanel(
      interaction.guildId,
      channelId,
      ownerId,
      { 
        thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
        stickyEnabled,
        latestMessageUrl,
        waitingRoomEnabled
      }
    );
    // Edit the message directly (not through the interaction since we used showModal)
    await interaction.message.edit({ components, flags });
  } catch (error) {
    // Ignore errors - the modal is already shown
    console.log('Could not refresh control panel after modal:', error.message);
  }
}

/**
 * Refreshes the text control panel after showing a modal
 * This resets the select menu so the user can select the same option again
 */
async function refreshTextControlPanelAfterModal(interaction, textChannelId, voiceChannelId, ownerId) {
  try {
    const stickyEnabled = stickyNotes.isEnabled(textChannelId);
    const latestMessageUrl = getLatestMessageUrl(textChannelId);
    const { components, flags } = controlPanel.buildCompactTextControlPanel(
      interaction.guildId,
      textChannelId,
      voiceChannelId,
      ownerId,
      { stickyEnabled, latestMessageUrl }
    );
    // Edit the message directly (not through the interaction since we used showModal)
    await interaction.message.edit({ components, flags });
  } catch (error) {
    // Ignore errors - the modal is already shown
    console.log('Could not refresh text control panel after modal:', error.message);
  }
}

async function handleVoicePermissions(interaction, params, isUniversal = false) {
  const [channelId, ownerId] = params;
  const selectedValue = interaction.values[0];
  
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  // Admins bypass feature permission checks but still need to check if feature is enabled
  if (!hasElevatedPermissions(interaction.member)) {
    const featureCheck = voiceManager.canUseFeature(interaction.guildId, interaction.member, selectedValue);
    if (!featureCheck.allowed) {
      console.log(`Feature check failed for ${selectedValue}:`, featureCheck.message);
      if (isUniversal) {
        await interaction.reply({ content: `❌ **Feature Disabled**\n${featureCheck.message}`, ephemeral: true });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Feature Disabled', featureCheck.message);
      }
      return;
    }
  } else {
    // Even admins need the feature to be enabled at the server level
    const isEnabled = voiceManager.isFeatureEnabled(interaction.guildId, selectedValue);
    if (!isEnabled) {
      console.log(`Feature ${selectedValue} is disabled at server level for guild ${interaction.guildId}`);
      if (isUniversal) {
        await interaction.reply({ content: `❌ **Feature Disabled**\nThe ${selectedValue} feature is currently disabled on this server.`, ephemeral: true });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Feature Disabled', `The ${selectedValue} feature is currently disabled on this server.`);
      }
      return;
    }
  }
  
  switch (selectedValue) {
    case 'lock':
      await handleLockChannel(interaction, channelId, true, isUniversal);
      break;
    case 'unlock':
      await handleLockChannel(interaction, channelId, false, isUniversal);
      break;
    case 'permit':
      await showPermitRejectedSelect(interaction, channelId, isUniversal);
      break;
    case 'reject':
      await showRejectTypePanel(interaction, channelId, isUniversal);
      break;
    case 'invite':
      await showUserSelect(interaction, 'invite', channelId, isUniversal);
      break;
    case 'ghost':
      await handleGhostChannel(interaction, channelId, true, isUniversal);
      break;
    case 'unghost':
      await handleGhostChannel(interaction, channelId, false, isUniversal);
      break;
    case 'transfer':
      await showUserSelect(interaction, 'transfer', channelId, isUniversal);
      break;
    case 'region':
      await showRegionSelect(interaction, channelId, ownerId, isUniversal);
      break;
    default:
      await interaction.reply({ content: 'Unknown permission action.', ephemeral: true });
  }
}

async function handleVoiceRegion(interaction, params) {
  const [channelId, ownerId] = params;
  const selectedRegion = interaction.values[0];
  
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Channel not found.');
      return;
    }
    
    const rtcRegion = selectedRegion === 'automatic' ? null : selectedRegion;
    await channel.setRTCRegion(rtcRegion);
    
    // Save region preference
    await voicePreferences.saveRegion(interaction.user.id, interaction.guildId, rtcRegion);
    
    await showSuccessAndRevert(
      interaction,
      channelId,
      ownerId,
      'Region Updated',
      `Voice region set to **${selectedRegion === 'automatic' ? 'Automatic' : selectedRegion}**`
    );
  } catch (error) {
    console.error('Error setting region:', error);
    await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Failed to update region.');
  }
}

async function handleTextSettings(interaction, params) {
  const [textChannelId, voiceChannelId, ownerId] = params;
  const selectedValue = interaction.values[0];
  
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  switch (selectedValue) {
    case 'edit_name':
      // Check if rate limited before showing modal
      const textRateCheck = checkChannelRenameAllowed(textChannelId);
      if (!textRateCheck.allowed) {
        // Don't show modal, show countdown instead
        await startRateLimitCountdown(interaction, textChannelId, ownerId, true, voiceChannelId);
        return;
      }
      await interaction.showModal(modals.buildTextEditNameModal(textChannelId, voiceChannelId));
      await refreshTextControlPanelAfterModal(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    case 'delete':
      await handleDeleteTextChannel(interaction, textChannelId, voiceChannelId);
      break;
    case 'sticky':
      await handleToggleStickyNote(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    case 'viewonly':
      await showViewOnlyUserSelect(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    case 'ban':
      await showBanUserSelect(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    case 'giveaccess':
      await showGiveAccessUserSelect(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    case 'unban':
      await showUnbanUserSelect(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    default:
      await interaction.reply({ content: 'This feature is not yet implemented.', ephemeral: true });
  }
}

/**
 * Handles string select menus for text channel features (give access, unban)
 */
async function handleTextStringSelect(interaction, params) {
  const [action, textChannelId, voiceChannelId] = params;
  const selectedUserIds = interaction.values;
  
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  switch (action) {
    case 'giveaccess':
      await handleGiveAccessUsers(interaction, textChannelId, selectedUserIds);
      break;
    case 'unban':
      await handleUnbanUsers(interaction, textChannelId, selectedUserIds);
      break;
    default:
      await interaction.reply({ content: 'Unknown action.', ephemeral: true });
  }
}

/**
 * Handles the "Take Actions" dropdown from compact text control panel
 * Actions: View-Only, Ban
 */
async function handleTextTakeActions(interaction, params) {
  const [textChannelId, voiceChannelId, ownerId] = params;
  const selectedValue = interaction.values[0];
  
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  switch (selectedValue) {
    case 'viewonly':
      await showViewOnlyUserSelect(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    case 'ban':
      await showBanUserSelect(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    default:
      await interaction.reply({ content: 'Unknown action.', ephemeral: true });
  }
}

/**
 * Handles the "Remove Actions" dropdown from compact text control panel
 * Actions: Give Access, Unban
 */
async function handleTextRemoveActions(interaction, params) {
  const [textChannelId, voiceChannelId, ownerId] = params;
  const selectedValue = interaction.values[0];
  
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  switch (selectedValue) {
    case 'giveaccess':
      await showGiveAccessUserSelect(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    case 'unban':
      await showUnbanUserSelect(interaction, textChannelId, voiceChannelId, ownerId);
      break;
    default:
      await interaction.reply({ content: 'Unknown action.', ephemeral: true });
  }
}

/**
 * Handles the Edit Channel Name button from compact text control panel
 */
async function handleTextEditNameButton(interaction, textChannelId, voiceChannelId, ownerId) {
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  // Check if rate limited before showing modal
  const textRateCheck = checkChannelRenameAllowed(textChannelId);
  if (!textRateCheck.allowed) {
    // Don't show modal, show countdown instead
    await startRateLimitCountdown(interaction, textChannelId, ownerId, true, voiceChannelId);
    return;
  }
  
  // Show modal first, then refresh the control panel to reset buttons
  await interaction.showModal(modals.buildTextEditNameModal(textChannelId, voiceChannelId));
  await refreshTextControlPanelAfterModal(interaction, textChannelId, voiceChannelId, ownerId);
}

/**
 * Handles the Delete Channel button from compact text control panel
 * Shows confirm delete panel instead of deleting immediately
 */
async function handleTextDeleteButton(interaction, textChannelId, voiceChannelId, ownerId) {
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  try {
    const stickyEnabled = stickyNotes.isEnabled(textChannelId);
    
    // Show confirm delete panel
    const { components, flags } = controlPanel.buildConfirmDeletePanel(
      interaction.guildId,
      textChannelId,
      voiceChannelId,
      ownerId,
      { stickyEnabled }
    );
    
    await interaction.update({ components, flags });
    
    // Set timeout to revert to normal panel after 5 minutes if no action taken
    setTimeout(async () => {
      try {
        // Check if the message still exists and hasn't been changed
        const message = await interaction.message.fetch().catch(() => null);
        if (!message) return;
        
        // Check if it's still showing the confirm delete panel by looking for the confirm button
        const hasConfirmButton = message.components.some(row => 
          row.components?.some(comp => comp.customId?.startsWith('text_confirm_delete:'))
        );
        
        if (hasConfirmButton) {
          // Revert to normal control panel
          const latestMessageUrl = getLatestMessageUrl(textChannelId);
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
            interaction.guildId,
            textChannelId,
            voiceChannelId,
            ownerId,
            { stickyEnabled, latestMessageUrl }
          );
          await message.edit({ components: normalComponents, flags: normalFlags });
        }
      } catch (error) {
        // Message may have been deleted, ignore
      }
    }, 2 * 60 * 1000); // 2 minutes
    
  } catch (error) {
    console.error('Error showing confirm delete panel:', error);
    await interaction.reply({ content: 'Failed to show delete confirmation.', ephemeral: true });
  }
}

/**
 * Handles the Sticky Note button from compact text control panel
 */
async function handleTextStickyButton(interaction, textChannelId, voiceChannelId, ownerId) {
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (!textChannel) {
      await interaction.reply({ content: 'Text channel not found.', ephemeral: true });
      return;
    }
    
    // Get the control panel message URL
    const controlPanelMessage = interaction.message;
    const controlPanelUrl = `https://discord.com/channels/${interaction.guildId}/${textChannelId}/${controlPanelMessage.id}`;
    
    const isCurrentlyEnabled = stickyNotes.isEnabled(textChannelId);
    
    if (isCurrentlyEnabled) {
      stickyNotes.disableStickyNote(textChannelId);
    } else {
      stickyNotes.enableStickyNote(textChannelId, controlPanelUrl, 12);
    }
    
    // Update the control panel with new button state
    const latestMessageUrl = getLatestMessageUrl(textChannelId);
    const { components, flags } = controlPanel.buildCompactTextControlPanel(
      interaction.guildId,
      textChannelId,
      voiceChannelId,
      ownerId,
      { stickyEnabled: !isCurrentlyEnabled, latestMessageUrl }
    );
    
    await interaction.update({ components, flags });
  } catch (error) {
    console.error('Error toggling text sticky note:', error);
    await interaction.reply({ content: 'Failed to toggle sticky note.', ephemeral: true });
  }
}

/**
 * Handles the Yes, Delete button from confirm delete panel
 */
async function handleConfirmDeleteButton(interaction, textChannelId, voiceChannelId, ownerId) {
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (textChannel) {
      await textChannel.delete('Owner deleted text channel');
    }
    
    const tempData = dataStore.getTempChannel(voiceChannelId);
    if (tempData) {
      tempData.text_channel_id = null;
      dataStore.setTempChannel(voiceChannelId, tempData);
    }
    
    // Clean up sticky notes, restrictions, and go-to-latest tracking
    stickyNotes.clearChannel(textChannelId);
    textChannelRestrictions.clearRestrictions(textChannelId);
    clearGoToLatestTracking(textChannelId);
    
    // No need to update the message since the channel is deleted
  } catch (error) {
    console.error('Error deleting text channel:', error);
    // Try to revert to normal panel if deletion failed
    try {
      const stickyEnabled = stickyNotes.isEnabled(textChannelId);
      const latestMessageUrl = getLatestMessageUrl(textChannelId);
      const { components, flags } = controlPanel.buildCompactTextControlPanel(
        interaction.guildId,
        textChannelId,
        voiceChannelId,
        ownerId,
        { stickyEnabled, latestMessageUrl }
      );
      await interaction.update({ components, flags });
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Handles the Cancel button from confirm delete panel
 */
async function handleCancelDeleteButton(interaction, textChannelId, voiceChannelId, ownerId) {
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  try {
    const stickyEnabled = stickyNotes.isEnabled(textChannelId);
    const latestMessageUrl = getLatestMessageUrl(textChannelId);
    
    // Revert to normal control panel
    const { components, flags } = controlPanel.buildCompactTextControlPanel(
      interaction.guildId,
      textChannelId,
      voiceChannelId,
      ownerId,
      { stickyEnabled, latestMessageUrl }
    );
    
    await interaction.update({ components, flags });
  } catch (error) {
    console.error('Error canceling delete:', error);
    await interaction.reply({ content: 'Failed to cancel.', ephemeral: true });
  }
}

/**
 * Handles the Cancel button from user select or region select panels
 * Reverts to normal voice control panel
 */
async function handleCancelAction(interaction, channelId, ownerId) {
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  
  // Revert to normal voice control panel
  const tempData = dataStore.getTempChannel(channelId);
  const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
  const { components, flags } = controlPanel.buildCompactVoiceControlPanel(
    interaction.guildId,
    channelId,
    ownerId,
    { 
      thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
      stickyEnabled,
      latestMessageUrl,
      waitingRoomEnabled
    }
  );
  
  try {
    await interaction.update({ components, flags });
  } catch (error) {
    // If interaction expired, try to edit the message directly
    if (error.code === 10062) {
      try {
        await interaction.message.edit({ components, flags });
      } catch (editError) {
        console.error('Error editing message after cancel:', editError.message);
      }
    } else {
      console.error('Error canceling action:', error);
    }
  }
}

/**
 * Handles the Cancel button from text channel user select panels
 * Reverts to normal text control panel
 */
async function handleTextCancelAction(interaction, textChannelId, voiceChannelId, ownerId) {
  if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
  
  const stickyEnabled = stickyNotes.isEnabled(textChannelId);
  const latestMessageUrl = getLatestMessageUrl(textChannelId);
  
  // Revert to normal text control panel
  const { components, flags } = controlPanel.buildCompactTextControlPanel(
    interaction.guildId,
    textChannelId,
    voiceChannelId,
    ownerId,
    { stickyEnabled, latestMessageUrl }
  );
  
  try {
    await interaction.update({ components, flags });
  } catch (error) {
    // If interaction expired, try to edit the message directly
    if (error.code === 10062) {
      try {
        await interaction.message.edit({ components, flags });
      } catch (editError) {
        console.error('Error editing message after text cancel:', editError.message);
      }
    } else {
      console.error('Error canceling text action:', error);
    }
  }
}


async function handleUserSelect(interaction) {
  const [type, action, channelId, ...extraParams] = interaction.customId.split(':');
  const selectedUsers = interaction.values;
  
  // Handle text channel user selections
  if (type === 'text_user_select') {
    const voiceChannelId = extraParams[0];
    const ownerId = dataStore.getChannelOwner(voiceChannelId);
    if (!await verifyOwnership(interaction, voiceChannelId, ownerId)) return;
    
    switch (action) {
      case 'viewonly':
        await handleViewOnlyUsers(interaction, channelId, voiceChannelId, selectedUsers);
        break;
      case 'ban':
        // Show ban options panel (Add Reason / Without Reason / Cancel)
        await showBanOptionsPanel(interaction, channelId, voiceChannelId, ownerId, selectedUsers);
        break;
      case 'giveaccess':
        await handleGiveAccessUsers(interaction, channelId, selectedUsers);
        break;
      case 'unban':
        await handleUnbanUsers(interaction, channelId, selectedUsers);
        break;
      default:
        await interaction.reply({ content: 'Unknown action.', ephemeral: true });
    }
    return;
  }
  
  const ownerId = dataStore.getChannelOwner(channelId);
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  switch (action) {
    case 'permit':
      await handlePermitUsers(interaction, channelId, selectedUsers);
      break;
    case 'reject':
      // Show reject options panel (Add Reason / Without Reason / Cancel)
      await showRejectOptionsPanel(interaction, channelId, ownerId, selectedUsers);
      break;
    case 'reject_current':
      // Handle reject current user (users only, no roles)
      await handleRejectCurrentUser(interaction, channelId, ownerId, selectedUsers[0]);
      break;
    case 'invite':
      await showInviteOptionsPanel(interaction, channelId, ownerId, selectedUsers);
      break;
    case 'transfer':
      await handleTransferOwnership(interaction, channelId, selectedUsers[0]);
      break;
    default:
      await interaction.reply({ content: 'Unknown action.', ephemeral: true });
  }
}

/**
 * Handles mentionable select menu interactions (users + roles)
 */
async function handleMentionableSelect(interaction) {
  try {
    console.log('=== handleMentionableSelect START ===');
    console.log('customId:', interaction.customId);
    
    const [type, action, channelId, ...extraParams] = interaction.customId.split(':');
    
    console.log('Parsed:', { type, action, channelId, extraParams });
    
    // Get selected users and roles
    const selectedUsers = interaction.users ? Array.from(interaction.users.keys()) : [];
    const selectedRoles = interaction.roles ? Array.from(interaction.roles.keys()) : [];
    
    console.log('Selected:', { selectedUsers, selectedRoles });
    
    // Handle text channel mentionable selections (ban, viewonly)
    if (type === 'text_mentionable_select') {
      const textChannelId = channelId;
      const voiceChannelId = extraParams[0];
      
      console.log('Channels:', { textChannelId, voiceChannelId });
      
      // Get owner from voice channel data
      const ownerId = dataStore.getChannelOwner(voiceChannelId);
      const tempData = dataStore.getTempChannel(voiceChannelId);
      
      console.log('Owner data:', {
        userId: interaction.user.id,
        ownerId,
        tempDataOwnerId: tempData?.owner_id
      });
      
      // Combine users and roles, track which are roles
      const allIds = [...selectedUsers, ...selectedRoles];
      const isRoleArray = [...selectedUsers.map(() => false), ...selectedRoles.map(() => true)];
      
      // Use the actual owner ID or fallback to the current user
      const effectiveOwnerId = ownerId || tempData?.owner_id || interaction.user.id;
      
      console.log('Proceeding with action:', action, 'effectiveOwnerId:', effectiveOwnerId);
      
      switch (action) {
        case 'ban':
          await showBanOptionsPanel(interaction, textChannelId, voiceChannelId, effectiveOwnerId, allIds, isRoleArray);
          break;
        case 'viewonly':
          await handleViewOnlyUsers(interaction, textChannelId, voiceChannelId, allIds, isRoleArray);
          break;
        default:
          await interaction.reply({ content: 'Unknown action.', ephemeral: true });
      }
      return;
    }
    
    // Handle voice channel mentionable selections (reject_current, reject_upcoming, permit)
    if (type === 'mentionable_select') {
      if (selectedUsers.length === 0 && selectedRoles.length === 0) {
        await interaction.reply({ content: 'Please select a user or role.', ephemeral: true });
        return;
      }
      
      const ownerId = dataStore.getChannelOwner(channelId);
      if (!await verifyOwnership(interaction, channelId, ownerId)) return;
      
      const isRole = selectedRoles.length > 0;
      const selectedId = isRole ? selectedRoles[0] : selectedUsers[0];
      
      // Check if target user has elevated permissions (Admin, Ban Members, Kick Members)
      // Moderators/Admins cannot be rejected
      if (!isRole && (action === 'reject_current' || action === 'reject_upcoming')) {
        try {
          const targetMember = await interaction.guild.members.fetch(selectedId).catch(() => null);
          if (targetMember && hasElevatedPermissions(targetMember)) {
            await showErrorAndRevert(
              interaction,
              channelId,
              ownerId,
              'Cannot Reject User',
              'This user has elevated permissions (Administrator, Ban Members, or Kick Members).'
            );
            return;
          }
        } catch (e) {
          console.log('Could not check target member permissions:', e.message);
        }
      }
      
      switch (action) {
        case 'reject_current':
          if (isRole) {
            await handleRejectCurrentRole(interaction, channelId, ownerId, selectedId);
          } else {
            await showRejectOptionsPanel(interaction, channelId, ownerId, [selectedId], true);
          }
          break;
        case 'reject_upcoming':
          await handleRejectUpcoming(interaction, channelId, ownerId, [selectedId], isRole);
          break;
        case 'permit':
          await handlePermitUsers(interaction, channelId, [selectedId]);
          break;
        default:
          await interaction.reply({ content: 'Unknown action.', ephemeral: true });
      }
      return;
    }
    
    await interaction.reply({ content: 'Unknown mentionable select.', ephemeral: true });
  } catch (error) {
    console.error('Error in handleMentionableSelect:', error);
    await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
  }
}

async function handleButton(interaction) {
  const [type, ...params] = interaction.customId.split(':');
  
  console.log('[Button Handler] Button clicked:', {
    type,
    params,
    customId: interaction.customId,
    userId: interaction.user.id
  });
  
  // Check if this is a universal interface
  const isUniversal = params.length >= 2 && (params[0] === 'UNIVERSAL' || params[1] === 'UNIVERSAL');
  
  console.log('[Button Handler] isUniversal:', isUniversal);
  
  // Resolve universal IDs for buttons that use channelId and ownerId
  let resolvedParams = params;
  const buttonsWithUniversalSupport = ['sticky_note', 'sticky_note_manager', 'sticky_enable', 'sticky_disable', 'load_settings', 'view_current_settings', 'waiting_room_enable', 'waiting_room_disable', 'cancel_action'];
  
  if (buttonsWithUniversalSupport.includes(type) && params.length >= 2) {
    if (params[0] === 'UNIVERSAL' || params[1] === 'UNIVERSAL') {
      console.log('[Button Handler] Resolving universal IDs for user:', interaction.user.id);
      const resolved = await resolveUniversalIds(params[0], params[1], interaction.user.id, interaction.guildId, interaction);
      if (!resolved) {
        console.log('[Button Handler] No temp VC found for user');
        await interaction.reply({
          content: '❌ You don\'t have an active temporary voice channel. Create one by joining the "Join to Create" channel first.',
          ephemeral: true
        });
        return;
      }
      console.log('[Button Handler] Resolved to:', resolved);
      resolvedParams = [resolved.channelId, resolved.ownerId, ...params.slice(2)];
    }
  }
  
  switch (type) {
    case 'claim_ownership':
      await handleClaimOwnership(interaction, resolvedParams[0]);
      break;
    case 'lfm_join':
      await handleLfmJoin(interaction, resolvedParams[0]);
      break;
    case 'setup_default':
      await handleDefaultSetup(interaction);
      break;
    case 'setup_custom':
      await interaction.showModal(modals.buildCustomSetupModal());
      break;
    case 'sticky_note':
      await handleStickyNoteToggle(interaction, resolvedParams[0], resolvedParams[1]);
      break;
    case 'sticky_note_manager':
      console.log('[Button Handler] sticky_note_manager clicked, isUniversal:', isUniversal, 'resolvedParams:', resolvedParams);
      try {
        if (isUniversal) {
          const universalHandlers = require('./universalInterfaceHandlers');
          await universalHandlers.handleStickyNoteManagerUniversal(interaction, resolvedParams[0], resolvedParams[1]);
        } else {
          await handleStickyNoteManager(interaction, resolvedParams[0], resolvedParams[1]);
        }
      } catch (error) {
        console.error('[Button Handler] Error in sticky_note_manager:', error);
        await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
      }
      break;
    case 'sticky_enable':
      try {
        if (isUniversal) {
          const universalHandlers = require('./universalInterfaceHandlers');
          await universalHandlers.handleStickyEnableUniversal(interaction, resolvedParams[0], resolvedParams[1]);
        } else {
          await handleStickyEnable(interaction, resolvedParams[0], resolvedParams[1]);
        }
      } catch (error) {
        console.error('[Button Handler] Error in sticky_enable:', error);
        await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
      }
      break;
    case 'sticky_disable':
      try {
        if (isUniversal) {
          const universalHandlers = require('./universalInterfaceHandlers');
          await universalHandlers.handleStickyDisableUniversal(interaction, resolvedParams[0], resolvedParams[1]);
        } else {
          await handleStickyDisable(interaction, resolvedParams[0], resolvedParams[1]);
        }
      } catch (error) {
        console.error('[Button Handler] Error in sticky_disable:', error);
        await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
      }
      break;
    case 'load_settings':
      try {
        if (isUniversal) {
          const universalHandlers = require('./universalInterfaceHandlers');
          await universalHandlers.handleLoadSettingsUniversal(interaction, resolvedParams[0], resolvedParams[1]);
        } else {
          await handleLoadSettings(interaction, resolvedParams[0], resolvedParams[1]);
        }
      } catch (error) {
        console.error('[Button Handler] Error in load_settings:', error);
        await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
      }
      break;
    case 'view_current_settings':
      console.log('[Button Handler] view_current_settings clicked, isUniversal:', isUniversal, 'resolvedParams:', resolvedParams);
      try {
        if (isUniversal) {
          const universalHandlers = require('./universalInterfaceHandlers');
          await universalHandlers.handleViewCurrentSettingsUniversal(interaction, resolvedParams[0], resolvedParams[1]);
        } else {
          await handleViewCurrentSettings(interaction, resolvedParams[0], resolvedParams[1]);
        }
      } catch (error) {
        console.error('[Button Handler] Error in view_current_settings:', error);
        await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
      }
      break;
    case 'text_edit_name':
      await handleTextEditNameButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'text_delete':
      await handleTextDeleteButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'text_sticky':
      await handleTextStickyButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'text_confirm_delete':
      await handleConfirmDeleteButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'text_cancel_delete':
      await handleCancelDeleteButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'cancel_action':
      await handleCancelAction(interaction, resolvedParams[0], resolvedParams[1]);
      break;
    case 'text_cancel_action':
      await handleTextCancelAction(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'invite_with_note':
      await handleInviteWithNoteButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'invite_without_note':
      await handleInviteWithoutNoteButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'ban_with_reason':
      await handleBanWithReasonButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2], resolvedParams[3], resolvedParams[4]);
      break;
    case 'ban_without_reason':
      await handleBanWithoutReasonButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2], resolvedParams[3], resolvedParams[4]);
      break;
    case 'ban_r': // Shortened: ban with reason
      await handleBanWithReasonButton(interaction, resolvedParams[0], resolvedParams[1], null, resolvedParams[2], resolvedParams[3]);
      break;
    case 'ban_n': // Shortened: ban without reason
      await handleBanWithoutReasonButton(interaction, resolvedParams[0], resolvedParams[1], null, resolvedParams[2], resolvedParams[3]);
      break;
    case 'txt_cancel': // Shortened: text cancel action
      await handleTextCancelAction(interaction, resolvedParams[0], resolvedParams[1], dataStore.getChannelOwner(resolvedParams[1]));
      break;
    case 'reject_with_reason':
      await handleRejectWithReasonButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2], resolvedParams[3]);
      break;
    case 'reject_without_reason':
      await handleRejectWithoutReasonButton(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2], resolvedParams[3]);
      break;
    case 'reject_current':
      await handleRejectCurrentButton(interaction, resolvedParams[0], resolvedParams[1]);
      break;
    case 'reject_upcoming':
      await handleRejectUpcomingButton(interaction, resolvedParams[0], resolvedParams[1]);
      break;
    case 'voice_request_approve':
      await handleVoiceRequestApprove(interaction, resolvedParams[0]);
      break;
    case 'voice_request_deny':
      await handleVoiceRequestDeny(interaction, resolvedParams[0]);
      break;
    case 'voice_request_join':
      await handleVoiceRequestJoin(interaction, resolvedParams[0], resolvedParams[1], resolvedParams[2]);
      break;
    case 'voice_appeal_start':
      await handleVoiceAppealStart(interaction, resolvedParams[0], resolvedParams[1]);
      break;
    case 'voice_appeal_add_note':
      await handleVoiceAppealAddNote(interaction, resolvedParams[0]);
      break;
    case 'voice_appeal_without_note':
      await handleVoiceAppealWithoutNote(interaction, resolvedParams[0]);
      break;
    case 'voice_appeal_cancel':
      await handleVoiceAppealCancel(interaction);
      break;
    case 'voice_prefs_clear_all':
      await handleVoicePrefsClearAll(interaction, resolvedParams[0]);
      break;
    case 'voice_prefs_refresh':
      await handleVoicePrefsRefresh(interaction, resolvedParams[0]);
      break;
    case 'waitingroom_accept':
      await handleWaitingRoomAccept(interaction, params[0], params[1], params[2]);
      break;
    case 'waitingroom_reject':
      await handleWaitingRoomReject(interaction, params[0], params[1], params[2]);
      break;
    case 'waiting_room_enable':
      try {
        // Always use universal handlers for these buttons (they come from the manager interface)
        const resolved = await resolveUniversalIds(params[0], params[1], interaction.user.id, interaction.guildId, interaction);
        if (!resolved) {
          await interaction.reply({
            content: '❌ You don\'t have an active temporary voice channel. Create one by joining the "Join to Create" channel first.',
            ephemeral: true
          });
          return;
        }
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.handleWaitingRoomEnableUniversal(interaction, resolved.channelId, resolved.ownerId);
      } catch (error) {
        console.error('[Button Handler] Error in waiting_room_enable:', error);
        await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
      }
      break;
    case 'waiting_room_disable':
      try {
        // Always use universal handlers for these buttons (they come from the manager interface)
        const resolved = await resolveUniversalIds(params[0], params[1], interaction.user.id, interaction.guildId, interaction);
        if (!resolved) {
          await interaction.reply({
            content: '❌ You don\'t have an active temporary voice channel. Create one by joining the "Join to Create" channel first.',
            ephemeral: true
          });
          return;
        }
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.handleWaitingRoomDisableUniversal(interaction, resolved.channelId, resolved.ownerId);
      } catch (error) {
        console.error('[Button Handler] Error in waiting_room_disable:', error);
        await interaction.reply({ content: '❌ An error occurred while processing your request.', ephemeral: true }).catch(() => {});
      }
      break;
    default:
      await interaction.reply({ content: 'Unknown button.', ephemeral: true });
  }
}

async function handleModalSubmit(interaction) {
  const { type, params } = modals.parseModalCustomId(interaction.customId);
  
  // Check if user is in the voice channel to determine if it's universal interface
  const channelId = params[0];
  let isUniversal = false;
  
  if (channelId) {
    try {
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (channel) {
        isUniversal = !channel.members.has(interaction.user.id);
      }
    } catch (e) {
      // Ignore
    }
  }
  
  switch (type) {
    case 'modal_name':
      if (isUniversal) {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.handleNameModalSubmitUniversal(interaction, params[0]);
      } else {
        await handleNameModalSubmit(interaction, params[0]);
      }
      break;
    case 'modal_limit':
      if (isUniversal) {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.handleLimitModalSubmitUniversal(interaction, params[0]);
      } else {
        await handleLimitModalSubmit(interaction, params[0]);
      }
      break;
    case 'modal_status':
      if (isUniversal) {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.handleStatusModalSubmitUniversal(interaction, params[0]);
      } else {
        await handleStatusModalSubmit(interaction, params[0]);
      }
      break;
    case 'modal_bitrate':
      if (isUniversal) {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.handleBitrateModalSubmitUniversal(interaction, params[0]);
      } else {
        await handleBitrateModalSubmit(interaction, params[0]);
      }
      break;
    case 'modal_lfm':
      if (isUniversal) {
        const universalHandlers = require('./universalInterfaceHandlers');
        await universalHandlers.handleLfmModalSubmitUniversal(interaction, params[0]);
      } else {
        await handleLfmModalSubmit(interaction, params[0]);
      }
      break;
    case 'modal_text':
      await handleTextModalSubmit(interaction, params[0]);
      break;
    case 'modal_invite':
      await handleInviteModalSubmit(interaction, params[0], params[1]);
      break;
    case 'modal_reject':
      await handleRejectModalSubmit(interaction, params[0], params[1], params[2]);
      break;
    case 'modal_custom_setup':
      await handleCustomSetupModalSubmit(interaction);
      break;
    case 'modal_text_name':
      await handleTextNameModalSubmit(interaction, params[0], params[1]);
      break;
    case 'modal_ban_reason':
      await handleBanReasonModalSubmit(interaction, params[0], params[1], params[2], params[3]);
      break;
    case 'm_ban': // Shortened modal for ban reason
      await handleBanReasonModalSubmit(interaction, params[0], params[1], params[2], params[3]);
      break;
    case 'modal_voice_appeal':
      await handleVoiceAppealNoteModalSubmit(interaction, params[0]);
      break;
    default:
      await interaction.reply({ content: 'Unknown modal.', ephemeral: true });
  }
}

// ============================================
// Unicode Text Converter
// ============================================

/**
 * Converts regular text to Unicode bold characters for attractive text channel names
 * @param {string} text - The input text to convert
 * @returns {string} - The converted Unicode bold text
 */
function convertToUnicodeBold(text) {
  if (!text) return text;
  
  // Unicode bold character mappings
  const boldMap = {
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
    'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
    'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
    'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
    'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
  };
  
  return text.split('').map(char => boldMap[char] || char).join('');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Checks if a member has elevated permissions (Administrator, Ban Members, or Kick Members)
 * These users should have unrestricted access to control panels
 * @param {GuildMember} member - The guild member to check
 * @returns {boolean} True if the member has elevated permissions
 */
function hasElevatedPermissions(member) {
  if (!member || !member.permissions) return false;
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.BanMembers) ||
         member.permissions.has(PermissionFlagsBits.KickMembers);
}

async function verifyOwnership(interaction, channelId, expectedOwnerId) {
  const actualOwnerId = dataStore.getChannelOwner(channelId);
  
  // Allow users with elevated permissions (Admin, Ban Members, Kick Members) to bypass ownership check
  if (hasElevatedPermissions(interaction.member)) {
    return true;
  }
  
  if (interaction.user.id !== actualOwnerId && interaction.user.id !== expectedOwnerId) {
    // Check if user is in the voice channel
    try {
      const channel = await interaction.guild.channels.fetch(channelId);
      if (channel && channel.isVoiceBased()) {
        const isInChannel = channel.members.has(interaction.user.id);
        if (!isInChannel) {
          await interaction.reply({ 
            content: '❌ You are not in the temporary voice channel. Join the channel to use these controls.', 
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: '❌ Only the channel owner can use these controls.', 
            ephemeral: true 
          });
        }
      } else {
        await interaction.reply({ 
          content: '❌ Only the channel owner can use these controls.', 
          ephemeral: true 
        });
      }
    } catch (error) {
      await interaction.reply({ 
        content: '❌ Only the channel owner can use these controls.', 
        ephemeral: true 
      });
    }
    return false;
  }
  return true;
}

async function showUserSelect(interaction, action, channelId, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(channelId);
  const maxValues = action === 'transfer' ? 1 : 10;
  const userSelect = controlPanel.buildUserSelect(action, channelId, maxValues);
  const actionRow = new ActionRowBuilder().addComponents(userSelect);
  
  // Build a panel with user select menu
  const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
  
  const container = new ContainerBuilder()
    .setAccentColor([88, 101, 242]); // Discord blurple
  
  const actionLabels = {
    permit: 'Permit Users',
    reject: 'Reject Users', 
    invite: 'Invite Users',
    transfer: 'Transfer Ownership'
  };
  
  const headerText = new TextDisplayBuilder().setContent([
    `## 👤 ${actionLabels[action] || 'Select Users'}`,
    ``,
    `Select user(s) to ${action}:`
  ].join('\n'));
  
  container.addTextDisplayComponents(headerText);
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents(actionRow);
  
  // Only add cancel button for regular interface (not universal)
  if (!isUniversal) {
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_action:${channelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
    container.addActionRowComponents(cancelRow);
  }
  
  // For universal interface, send ephemeral message; for regular interface, update the panel
  if (isUniversal) {
    await interaction.reply({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
      ephemeral: true
    });
    return; // Don't set up auto-revert for ephemeral messages
  }
  
  await interaction.update({ 
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  });
  
  // Auto-revert after 5 minutes if no action taken
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      // Check if it's still showing the user select by looking for the select menu
      const hasUserSelect = message.components.some(row => 
        row.components?.some(comp => comp.customId?.startsWith('user_select:'))
      );
      
      if (hasUserSelect) {
        const stickyEnabled = stickyNotes.isEnabled(channelId);
        const latestMessageUrl = getLatestMessageUrl(channelId);
        const tempData = dataStore.getTempChannel(channelId);
        const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
          interaction.guildId,
          channelId,
          ownerId,
          { 
            thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            stickyEnabled,
            latestMessageUrl,
            waitingRoomEnabled
          }
        );
        await message.edit({ components: normalComponents, flags: normalFlags });
      }
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, 5 * 60 * 1000); // 5 minutes
}

async function showRegionSelect(interaction, channelId, ownerId, isUniversal = false) {
  const regionSelect = controlPanel.buildRegionSelect(channelId, ownerId);
  const actionRow = new ActionRowBuilder().addComponents(regionSelect);
  
  // Build a panel with region select menu
  const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
  
  const container = new ContainerBuilder()
    .setAccentColor([88, 101, 242]); // Discord blurple
  
  const headerText = new TextDisplayBuilder().setContent([
    `## 🌍 Select Voice Region`,
    ``,
    `Choose a voice region for your channel:`
  ].join('\n'));
  
  container.addTextDisplayComponents(headerText);
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents(actionRow);
  
  // Only add cancel button for regular interface (not universal)
  if (!isUniversal) {
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_action:${channelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
    container.addActionRowComponents(cancelRow);
  }
  
  // For universal interface, send ephemeral message; for regular interface, update the panel
  if (isUniversal) {
    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
      ephemeral: true
    });
    return; // Don't set up auto-revert for ephemeral messages
  }
  
  await interaction.update({
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  });
  
  // Auto-revert after 5 minutes if no action taken
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      // Check if it's still showing the region select
      const hasRegionSelect = message.components.some(row => 
        row.components?.some(comp => comp.customId?.startsWith('voice_region:'))
      );
      
      if (hasRegionSelect) {
        const stickyEnabled = stickyNotes.isEnabled(channelId);
        const latestMessageUrl = getLatestMessageUrl(channelId);
        const tempData = dataStore.getTempChannel(channelId);
        const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
          interaction.guildId,
          channelId,
          ownerId,
          { 
            thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            stickyEnabled,
            latestMessageUrl,
            waitingRoomEnabled
          }
        );
        await message.edit({ components: normalComponents, flags: normalFlags });
      }
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, 5 * 60 * 1000); // 5 minutes
}


// ============================================
// Voice Settings Handlers (Game, NSFW, Claim)
// ============================================

/**
 * Handles the Game mode setting - renames channel to user's current game activity
 * Requirements: 2.1, 2.2
 */
async function handleGameMode(interaction, channelId, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(channelId);
  
  // For universal interface, defer with ephemeral
  if (isUniversal) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      if (isUniversal) {
        await interaction.editReply({ 
          content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
        });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Channel not found.');
      }
      return;
    }
    
    // Get the member to check their game activity
    const member = await interaction.guild.members.fetch(interaction.user.id);
    
    // Find game activity (type 0 = Playing)
    const gameActivity = member.presence?.activities?.find(
      activity => activity.type === 0 // ActivityType.Playing
    );
    
    if (!gameActivity) {
      if (isUniversal) {
        await interaction.editReply({
          content: '❌ **No Game Detected**\nYou are not currently playing any game.'
        });
      } else {
        await showErrorAndRevert(
          interaction,
          channelId,
          ownerId,
          'No Game Detected',
          'You are not currently playing any game.'
        );
      }
      return;
    }
    
    // Import channelStyling for emoji formatting
    const channelStyling = require('../voice/channelStyling');
    const formattedName = channelStyling.formatChannelName(gameActivity.name);
    
    try {
      await channel.setName(formattedName);
      
      // Track successful rename
      trackChannelRename(channelId);
      
      if (isUniversal) {
        await interaction.editReply({
          content: `✅ **Channel Renamed**\nChannel name set to **${formattedName}**`
        });
      } else {
        await showSuccessAndRevert(
          interaction,
          channelId,
          ownerId,
          'Channel Renamed',
          `Channel name set to **${formattedName}**`
        );
      }
    } catch (renameError) {
      console.error('Error renaming channel (game mode):', renameError);
      
      // Check if it's a rate limit error
      const isRateLimit = renameError.code === 50013 || 
                          renameError.message?.includes('rate limit') ||
                          renameError.message?.includes('You are changing your name too fast') ||
                          renameError.code === 20028;
      
      if (isRateLimit) {
        if (isUniversal) {
          const remainingSeconds = Math.ceil(600); // 10 minutes default
          const remainingMinutes = Math.ceil(remainingSeconds / 60);
          await interaction.editReply({
            content: `⏳ **Rename Cooldown Active**\nYou can rename again in ${remainingMinutes} minute(s). Discord limits channel renames to 2 per 10 minutes.`
          });
        } else {
          await startRateLimitCountdown(interaction, channelId, ownerId, false);
        }
      } else {
        if (isUniversal) {
          await interaction.editReply({
            content: '❌ **Error**\nFailed to set channel name.'
          });
        } else {
          await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Failed to set channel name.');
        }
      }
    }
  } catch (error) {
    console.error('Error setting game mode:', error);
    if (isUniversal) {
      await interaction.editReply({
        content: '❌ **Error**\nFailed to set channel name.'
      }).catch(() => {});
    } else {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Failed to set channel name.');
    }
  }
}

/**
 * Handles the NSFW toggle setting
 * Requirements: 2.3
 */
async function handleNsfwToggle(interaction, channelId, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(channelId);
  
  // For universal interface, defer with ephemeral
  if (isUniversal) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      if (isUniversal) {
        await interaction.editReply({ 
          content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
        });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Channel not found.');
      }
      return;
    }
    
    // Toggle the NSFW flag
    const newNsfwState = !channel.nsfw;
    await channel.setNSFW(newNsfwState);
    
    if (isUniversal) {
      await interaction.editReply({
        content: newNsfwState 
          ? '✅ **NSFW Enabled**\nChannel is now NSFW.' 
          : '✅ **NSFW Disabled**\nChannel is no longer NSFW.'
      });
    } else {
      await showSuccessAndRevert(
        interaction,
        channelId,
        ownerId,
        newNsfwState ? 'NSFW Enabled' : 'NSFW Disabled',
        newNsfwState ? 'Channel is now NSFW.' : 'Channel is no longer NSFW.'
      );
    }
  } catch (error) {
    console.error('Error toggling NSFW:', error);
    if (isUniversal) {
      await interaction.editReply({
        content: '❌ **Error**\nFailed to toggle NSFW.'
      }).catch(() => {});
    } else {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Failed to toggle NSFW.');
    }
  }
}

/**
 * Handles the Claim channel ownership setting
 * Requirements: 2.4, 2.5
 */
async function handleClaimChannel(interaction, channelId, isUniversal = false) {
  const currentOwnerId = dataStore.getChannelOwner(channelId);
  const isElevated = hasElevatedPermissions(interaction.member);
  
  // For universal interface, defer with ephemeral
  if (isUniversal) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      if (isUniversal) {
        await interaction.editReply({ 
          content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
        });
      } else {
        await showErrorAndRevert(interaction, channelId, currentOwnerId, 'Error', 'Channel not found.');
      }
      return;
    }
    
    // Check if the user is already the owner
    if (currentOwnerId === interaction.user.id) {
      if (isUniversal) {
        await interaction.editReply({
          content: '❌ **Already Owner**\nYou are already the owner of this channel.'
        });
      } else {
        await showErrorAndRevert(
          interaction,
          channelId,
          currentOwnerId,
          'Already Owner',
          'You are already the owner of this channel.'
        );
      }
      return;
    }
    
    // ALL users (including admins/mods) must be in the voice channel to claim ownership
    if (!channel.members.has(interaction.user.id)) {
      if (isUniversal) {
        await interaction.editReply({
          content: '❌ **Cannot Claim**\nYou must be in the voice channel to claim ownership.'
        });
      } else {
        await showErrorAndRevert(
          interaction,
          channelId,
          currentOwnerId,
          'Cannot Claim',
          'You must be in the voice channel to claim ownership.'
        );
      }
      return;
    }
    
    // Check if the current owner is still in the channel (admins can bypass this)
    // This determines if it's a "forced" claim (owner still present) or normal claim (owner left)
    const isForcedClaim = isElevated && currentOwnerId && channel.members.has(currentOwnerId);
    
    if (!isElevated && currentOwnerId && channel.members.has(currentOwnerId)) {
      if (isUniversal) {
        await interaction.editReply({
          content: '❌ **Cannot Claim**\nThe current owner is still in the channel.'
        });
      } else {
        await showErrorAndRevert(
          interaction,
          channelId,
          currentOwnerId,
          'Cannot Claim',
          'The current owner is still in the channel.'
        );
      }
      return;
    }
    
    // Transfer ownership to the requesting user
    const newOwnerId = interaction.user.id;
    
    // Remove old owner permissions if they exist
    if (currentOwnerId) {
      await channel.permissionOverwrites.edit(currentOwnerId, {
        ManageChannels: null,
        MoveMembers: null,
        MuteMembers: null,
        DeafenMembers: null
      }).catch(() => {});
    }
    
    // Grant new owner permissions
    await channel.permissionOverwrites.edit(newOwnerId, {
      ManageChannels: true,
      MoveMembers: true,
      MuteMembers: true,
      DeafenMembers: true,
      ViewChannel: true,
      Connect: true,
      SendMessages: true
    });
    
    // Update data store
    dataStore.setChannelOwner(channelId, newOwnerId);
    
    const tempData = dataStore.getTempChannel(channelId);
    if (tempData) {
      tempData.owner_id = newOwnerId;
      dataStore.setTempChannel(channelId, tempData);
    }
    
    // Show success immediately
    if (isUniversal) {
      await interaction.editReply({
        content: isForcedClaim
          ? '✅ **Ownership Claimed**\nYou have taken ownership of this channel using moderator privileges.'
          : '✅ **Ownership Claimed**\nYou are now the owner of this channel.'
      });
    } else {
      await showSuccessAndRevert(
        interaction,
        channelId,
        newOwnerId,
        'Ownership Claimed',
        isForcedClaim
          ? 'You have taken ownership of this channel using moderator privileges.'
          : 'You are now the owner of this channel.'
      );
    }
    
    // Run auto-loading and text channel update in background
    setImmediate(async () => {
      try {
        // First update text channel name (this should happen regardless of preferences)
        console.log(`[Claim] Updating text channel name for new owner ${newOwnerId}`);
        await updateTextChannelName(interaction, channelId, newOwnerId);
        
        // Then auto-load basic settings for the new owner
        console.log(`[Claim] Auto-loading settings for new owner ${newOwnerId}`);
        await autoLoadBasicSettings(interaction, channelId, newOwnerId);
        
        // Send DM notification to previous owner if this was a forced claim
        if (isForcedClaim && currentOwnerId) {
          try {
            const previousOwner = await interaction.guild.members.fetch(currentOwnerId).catch(() => null);
            if (previousOwner) {
              // Get claimer's permissions
              const claimerPermissions = {
                administrator: interaction.member.permissions.has(PermissionFlagsBits.Administrator),
                banMembers: interaction.member.permissions.has(PermissionFlagsBits.BanMembers),
                kickMembers: interaction.member.permissions.has(PermissionFlagsBits.KickMembers),
                moderateMembers: interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
              };
              
              const { embed } = controlPanel.buildForcedClaimNotificationEmbed({
                channelName: channel.name,
                channelId: channelId,
                guildId: interaction.guildId,
                serverName: interaction.guild.name,
                claimedById: interaction.user.id,
                claimerPermissions,
                serverIconUrl: interaction.guild.iconURL({ dynamic: true })
              });
              
              await previousOwner.send({ embeds: [embed] });
            }
          } catch (dmError) {
            console.log(`Could not send forced claim DM to ${currentOwnerId}:`, dmError.message);
          }
        }
      } catch (error) {
        console.error('Error in background claim operations:', error);
      }
    });
  } catch (error) {
    console.error('Error claiming channel:', error);
    await showErrorAndRevert(interaction, channelId, currentOwnerId, 'Error', 'Failed to claim ownership.');
  }
}


// ============================================
// Channel Action Handlers
// ============================================

/**
 * Shows success message - either as ephemeral reply (universal) or by updating the panel (regular)
 */
async function showSuccess(interaction, channelId, ownerId, title, description, isUniversal = false) {
  if (isUniversal) {
    // For universal interface, check if already deferred
    if (interaction.deferred) {
      await interaction.editReply({ content: `✅ **${title}**\n${description}` });
    } else {
      await interaction.reply({ content: `✅ **${title}**\n${description}`, ephemeral: true });
    }
  } else {
    await showSuccessAndRevert(interaction, channelId, ownerId, title, description);
  }
}

/**
 * Shows error message - either as ephemeral reply (universal) or by updating the panel (regular)
 */
async function showError(interaction, channelId, ownerId, title, description, isUniversal = false) {
  if (isUniversal) {
    // For universal interface, check if already deferred
    if (interaction.deferred) {
      await interaction.editReply({ content: `❌ **${title}**\n${description}` });
    } else {
      await interaction.reply({ content: `❌ **${title}**\n${description}`, ephemeral: true });
    }
  } else {
    await showErrorAndRevert(interaction, channelId, ownerId, title, description);
  }
}

/**
 * Helper function to show success state in control panel and revert after delay
 * @param {Object} interaction - The interaction object
 * @param {string} channelId - The voice channel ID
 * @param {string} ownerId - The channel owner ID
 * @param {string} title - Success title
 * @param {string} description - Success description
 * @param {number} revertDelay - Delay in ms before reverting (default 1500)
 */
async function showSuccessAndRevert(interaction, channelId, ownerId, title, description, revertDelay = 1500) {
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  
  // Show success state
  const { components: successComponents, flags } = controlPanel.buildSuccessStatePanel(
    interaction.guildId,
    channelId,
    ownerId,
    title,
    description,
    { stickyEnabled, latestMessageUrl }
  );
  
  await interaction.update({ components: successComponents, flags });
  
  // Revert to normal control panel after delay
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      const latestUrl = getLatestMessageUrl(channelId);
      const tempData = dataStore.getTempChannel(channelId);
      const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
      
      const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
        interaction.guildId,
        channelId,
        ownerId,
        { 
          thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
          stickyEnabled,
          latestMessageUrl: latestUrl,
          waitingRoomEnabled
        }
      );
      await message.edit({ components: normalComponents, flags: normalFlags });
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, revertDelay);
}

/**
 * Helper function to show error state in control panel and revert after delay
 */
async function showErrorAndRevert(interaction, channelId, ownerId, title, description, revertDelay = 1500) {
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  
  console.log(`showErrorAndRevert called: ${title} - ${description}`);
  
  // Show error state
  const { components: errorComponents, flags } = controlPanel.buildErrorStatePanel(
    interaction.guildId,
    channelId,
    ownerId,
    title,
    description,
    { stickyEnabled, latestMessageUrl }
  );
  
  try {
    await interaction.update({ components: errorComponents, flags });
    console.log('showErrorAndRevert: interaction.update succeeded');
  } catch (updateError) {
    console.error('showErrorAndRevert: interaction.update failed:', updateError.message);
    throw updateError;
  }
  
  // Revert to normal control panel after delay
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      const latestUrl = getLatestMessageUrl(channelId);
      const tempData = dataStore.getTempChannel(channelId);
      const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
      const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
        interaction.guildId,
        channelId,
        ownerId,
        { 
          thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
          stickyEnabled,
          latestMessageUrl: latestUrl,
          waitingRoomEnabled
        }
      );
      await message.edit({ components: normalComponents, flags: normalFlags });
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, revertDelay);
}

/**
 * Helper function to show success state in TEXT control panel and revert after delay
 */
async function showTextSuccessAndRevert(interaction, textChannelId, voiceChannelId, ownerId, title, description, revertDelay = 1500) {
  const stickyEnabled = stickyNotes.isEnabled(textChannelId);
  const latestMessageUrl = getLatestMessageUrl(textChannelId);
  
  // Show success state
  const { components: successComponents, flags } = controlPanel.buildSuccessStatePanel(
    interaction.guildId,
    textChannelId,
    ownerId,
    title,
    description,
    { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
  );
  
  await interaction.update({ components: successComponents, flags });
  
  // Revert to normal text control panel after delay
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      const latestUrl = getLatestMessageUrl(textChannelId);
      const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
        interaction.guildId,
        textChannelId,
        voiceChannelId,
        ownerId,
        { stickyEnabled, latestMessageUrl: latestUrl }
      );
      await message.edit({ components: normalComponents, flags: normalFlags });
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, revertDelay);
}

/**
 * Helper function to show error state in TEXT control panel and revert after delay
 */
async function showTextErrorAndRevert(interaction, textChannelId, voiceChannelId, ownerId, title, description, revertDelay = 1500) {
  const stickyEnabled = stickyNotes.isEnabled(textChannelId);
  const latestMessageUrl = getLatestMessageUrl(textChannelId);
  
  // Show error state
  const { components: errorComponents, flags } = controlPanel.buildErrorStatePanel(
    interaction.guildId,
    textChannelId,
    ownerId,
    title,
    description,
    { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
  );
  
  await interaction.update({ components: errorComponents, flags });
  
  // Revert to normal text control panel after delay
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      const latestUrl = getLatestMessageUrl(textChannelId);
      const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
        interaction.guildId,
        textChannelId,
        voiceChannelId,
        ownerId,
        { stickyEnabled, latestMessageUrl: latestUrl }
      );
      await message.edit({ components: normalComponents, flags: normalFlags });
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, revertDelay);
}

/**
 * Helper function to show success state in TEXT control panel and revert after delay (for deferred interactions)
 */
async function showTextSuccessAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, title, description, stickyEnabled, latestMessageUrl, revertDelay = 1500) {
  // Show success state
  const { components: successComponents, flags } = controlPanel.buildSuccessStatePanel(
    interaction.guildId,
    textChannelId,
    ownerId,
    title,
    description,
    { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
  );
  
  try {
    await interaction.editReply({ components: successComponents, flags });
  } catch (error) {
    // Try to edit message directly if editReply fails
    try {
      await interaction.message.edit({ components: successComponents, flags });
    } catch (e) {
      console.error('Could not show success state:', e.message);
    }
  }
  
  // Revert to normal text control panel after delay
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      // Get fresh sticky state and latest URL
      const currentStickyEnabled = stickyNotes.isEnabled(textChannelId);
      const latestUrl = getLatestMessageUrl(textChannelId);
      const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
        interaction.guildId,
        textChannelId,
        voiceChannelId,
        ownerId,
        { stickyEnabled: currentStickyEnabled, latestMessageUrl: latestUrl }
      );
      await message.edit({ components: normalComponents, flags: normalFlags });
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, revertDelay);
}

/**
 * Helper function to show error state in TEXT control panel and revert after delay (for deferred interactions)
 */
async function showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, title, description, stickyEnabled, latestMessageUrl, revertDelay = 1500) {
  // Show error state
  const { components: errorComponents, flags } = controlPanel.buildErrorStatePanel(
    interaction.guildId,
    textChannelId,
    ownerId,
    title,
    description,
    { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
  );
  
  try {
    await interaction.editReply({ components: errorComponents, flags });
  } catch (error) {
    // Try to edit message directly if editReply fails
    try {
      await interaction.message.edit({ components: errorComponents, flags });
    } catch (e) {
      console.error('Could not show error state:', e.message);
    }
  }
  
  // Revert to normal text control panel after delay
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      // Get fresh sticky state and latest URL
      const currentStickyEnabled = stickyNotes.isEnabled(textChannelId);
      const latestUrl = getLatestMessageUrl(textChannelId);
      const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
        interaction.guildId,
        textChannelId,
        voiceChannelId,
        ownerId,
        { stickyEnabled: currentStickyEnabled, latestMessageUrl: latestUrl }
      );
      await message.edit({ components: normalComponents, flags: normalFlags });
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, revertDelay);
}

/**
 * Helper function to show error state in VOICE control panel and revert after delay (for deferred interactions)
 */
async function showErrorAndRevertDeferred(interaction, channelId, ownerId, title, description, stickyEnabled, latestMessageUrl, thumbnailUrl, revertDelay = 1500) {
  // Show error state
  const { components: errorComponents, flags } = controlPanel.buildErrorStatePanel(
    interaction.guildId,
    channelId,
    ownerId,
    title,
    description,
    { stickyEnabled, thumbnailUrl, latestMessageUrl }
  );
  
  try {
    await interaction.editReply({ components: errorComponents, flags });
  } catch (error) {
    // Try to edit message directly if editReply fails
    try {
      await interaction.message.edit({ components: errorComponents, flags });
    } catch (e) {
      console.error('Could not show error state:', e.message);
    }
  }
  
  // Revert to normal voice control panel after delay
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      const latestUrl = getLatestMessageUrl(channelId);
      const tempData = dataStore.getTempChannel(channelId);
      const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
      const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
        interaction.guildId,
        channelId,
        ownerId,
        { thumbnailUrl, stickyEnabled, latestMessageUrl: latestUrl, waitingRoomEnabled }
      );
      await message.edit({ components: normalComponents, flags: normalFlags });
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, revertDelay);
}

/**
 * Helper function to show success state in VOICE control panel and revert after delay (for deferred interactions)
 */
async function showSuccessAndRevertDeferred(interaction, channelId, ownerId, title, description, revertDelay = 1500) {
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
  
  // Show success state
  const { components: successComponents, flags } = controlPanel.buildSuccessStatePanel(
    interaction.guildId,
    channelId,
    ownerId,
    title,
    description,
    { stickyEnabled, thumbnailUrl, latestMessageUrl }
  );
  
  try {
    await interaction.editReply({ components: successComponents, flags });
  } catch (error) {
    // Try to edit message directly if editReply fails
    try {
      await interaction.message.edit({ components: successComponents, flags });
    } catch (e) {
      console.error('Could not show success state:', e.message);
    }
  }
  
  // Revert to normal voice control panel after delay
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      const latestUrl = getLatestMessageUrl(channelId);
      const tempData = dataStore.getTempChannel(channelId);
      const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
      
      const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
        interaction.guildId,
        channelId,
        ownerId,
        { 
          thumbnailUrl, 
          stickyEnabled, 
          latestMessageUrl: latestUrl,
          waitingRoomEnabled
        }
      );
      await message.edit({ components: normalComponents, flags: normalFlags });
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, revertDelay);
}

async function handleLockChannel(interaction, channelId, lock, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(channelId);
  
  // For universal interface, defer with ephemeral
  if (isUniversal) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  }
  
  try {
    // Check if channel still exists
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      if (isUniversal) {
        await interaction.editReply({ 
          content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists. It may have been deleted.'
        });
      } else {
        await showError(interaction, channelId, ownerId, 'Error', 'Channel not found.', isUniversal);
      }
      return;
    }
    
    // Verify the channel is still a temp VC
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      if (isUniversal) {
        await interaction.editReply({ 
          content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.'
        });
      } else {
        await showError(interaction, channelId, ownerId, 'Error', 'Not a temporary channel.', isUniversal);
      }
      return;
    }
    
    // Check current lock state from @everyone permission overwrites
    const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
    const isCurrentlyLocked = everyoneOverwrite?.deny?.has('Connect') || false;
    
    // If trying to lock but already locked, or unlock but not locked
    if (lock && isCurrentlyLocked) {
      await showError(interaction, channelId, ownerId, 'Already Locked', 'This channel is already locked.', isUniversal);
      return;
    }
    if (!lock && !isCurrentlyLocked) {
      await showError(interaction, channelId, ownerId, 'Not Locked', 'This channel is not locked.', isUniversal);
      return;
    }
    
    // Lock/unlock for @everyone
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: lock ? false : null
    });
    
    // Save lock state preference
    await voicePreferences.saveLockState(interaction.user.id, interaction.guildId, lock);
    
    if (lock) {
      // When locking: Clear all user Connect overrides first, then grant to current members only
      // This ensures users who previously had access but left cannot rejoin
      const currentMemberIds = new Set(channel.members.map(m => m.id));
      currentMemberIds.add(ownerId); // Always include owner
      
      // Remove Connect permission from users who are not currently in the channel
      for (const [targetId, overwrite] of channel.permissionOverwrites.cache) {
        // Skip @everyone role and other roles
        if (overwrite.type !== 1) continue; // type 1 = member, type 0 = role
        
        // Skip the owner and current members
        if (currentMemberIds.has(targetId)) continue;
        
        // Skip bots
        const member = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (member?.user?.bot) continue;
        
        // Remove Connect permission override for users not in the channel
        await channel.permissionOverwrites.edit(targetId, {
          Connect: null
        }).catch(() => {});
      }
      
      // Ensure owner retains full access
      await channel.permissionOverwrites.edit(ownerId, {
        Connect: true,
        ViewChannel: true,
        SendMessages: true
      });
      
      // Ensure all current VC members retain access (so they can still use control panel)
      for (const [memberId, member] of channel.members) {
        if (memberId !== ownerId && !member.user.bot) {
          await channel.permissionOverwrites.edit(memberId, {
            Connect: true,
            ViewChannel: true,
            SendMessages: true
          });
        }
      }
    }
    
    await showSuccess(
      interaction,
      channelId,
      ownerId,
      lock ? 'Channel Locked' : 'Channel Unlocked',
      lock ? 'New users cannot join this channel.' : 'Users can now join this channel.',
      isUniversal
    );
  } catch (error) {
    console.error('Error locking channel:', error);
    await showError(interaction, channelId, ownerId, 'Error', 'Failed to update channel.', isUniversal);
  }
}

async function handleGhostChannel(interaction, channelId, ghost, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(channelId);
  
  // For universal interface, defer with ephemeral
  if (isUniversal) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      if (isUniversal) {
        await interaction.editReply({ 
          content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
        });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Channel not found.');
      }
      return;
    }
    
    // Check current ghost state from @everyone permission overwrites
    const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
    const isCurrentlyGhosted = everyoneOverwrite?.deny?.has('ViewChannel') || false;
    
    // If trying to ghost but already ghosted, or unghost but not ghosted
    if (ghost && isCurrentlyGhosted) {
      if (isUniversal) {
        await interaction.editReply({
          content: '❌ **Already Hidden**\nThis channel is already hidden.'
        });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Already Hidden', 'This channel is already hidden.');
      }
      return;
    }
    if (!ghost && !isCurrentlyGhosted) {
      if (isUniversal) {
        await interaction.editReply({
          content: '❌ **Not Hidden**\nThis channel is not hidden.'
        });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Not Hidden', 'This channel is not hidden.');
      }
      return;
    }
    
    // Ghost/unghost for @everyone
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      ViewChannel: ghost ? false : null
    });
    
    // Save ghost state preference
    await voicePreferences.saveGhostState(interaction.user.id, interaction.guildId, ghost);
    
    // If ghosting, ensure owner and current VC members retain visibility and access
    if (ghost) {
      // Ensure owner retains full access
      await channel.permissionOverwrites.edit(ownerId, {
        ViewChannel: true,
        Connect: true,
        SendMessages: true
      });
      
      // Ensure all current VC members retain visibility and access (so they can still use control panel)
      for (const [memberId, member] of channel.members) {
        if (memberId !== ownerId && !member.user.bot) {
          await channel.permissionOverwrites.edit(memberId, {
            ViewChannel: true,
            Connect: true,
            SendMessages: true
          });
        }
      }
    }
    
    if (isUniversal) {
      await interaction.editReply({
        content: ghost 
          ? '✅ **Channel Hidden**\nThis channel is now hidden from non-members.' 
          : '✅ **Channel Visible**\nThis channel is now visible to everyone.'
      });
    } else {
      await showSuccessAndRevert(
        interaction,
        channelId,
        ownerId,
        ghost ? 'Channel Hidden' : 'Channel Visible',
        ghost ? 'This channel is now hidden from non-members.' : 'This channel is now visible to everyone.'
      );
    }
  } catch (error) {
    console.error('Error ghosting channel:', error);
    if (isUniversal) {
      await interaction.followUp({
        content: '❌ **Error**\nFailed to update channel.',
        ephemeral: true
      }).catch(() => {});
    } else {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Failed to update channel.');
    }
  }
}

async function handlePermitUsers(interaction, channelId, userIds) {
  const ownerId = dataStore.getChannelOwner(channelId);
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
  
  // Defer the interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer permit interaction:', deferError.message);
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Channel not found.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }
    
    let permittedUsers = 0;
    let permittedRoles = 0;
    let dmsSent = 0;
    
    for (const id of userIds) {
      await channel.permissionOverwrites.edit(id, {
        Connect: true,
        ViewChannel: true
      });
      
      // Check if it's a user or role
      const member = await interaction.guild.members.fetch(id).catch(() => null);
      if (member) {
        permittedUsers++;
        
        // Send DM only if this was a "current" rejection (user was in channel and disconnected)
        if (wasCurrentRejection(channelId, id)) {
          try {
            const { embed, components } = controlPanel.buildPermitNotificationEmbed({
              channelName: channel.name,
              channelId: channelId,
              guildId: interaction.guildId,
              serverName: interaction.guild.name,
              permittedById: interaction.user.id,
              serverIconUrl: interaction.guild.iconURL({ dynamic: true })
            });
            await member.send({ embeds: [embed], components });
            dmsSent++;
          } catch (dmError) {
            console.log(`Could not send permit DM to ${id}:`, dmError.message);
          }
          // Remove from tracking after permitting
          removeCurrentRejection(channelId, id);
        }
      } else {
        // It's a role - send DMs to all role members who were rejected
        const role = interaction.guild.roles.cache.get(id);
        if (role) {
          permittedRoles++;
          
          // Send DMs to role members who were "current" rejections
          for (const [memberId, roleMember] of role.members) {
            if (wasCurrentRejection(channelId, memberId)) {
              try {
                const { embed, components } = controlPanel.buildPermitNotificationEmbed({
                  channelName: channel.name,
                  channelId: channelId,
                  guildId: interaction.guildId,
                  serverName: interaction.guild.name,
                  permittedById: interaction.user.id,
                  serverIconUrl: interaction.guild.iconURL({ dynamic: true })
                });
                await roleMember.send({ embeds: [embed], components });
                dmsSent++;
              } catch (dmError) {
                console.log(`Could not send permit DM to role member ${memberId}:`, dmError.message);
              }
              // Remove from tracking after permitting
              removeCurrentRejection(channelId, memberId);
            }
          }
        }
      }
    }
    
    let message = '';
    if (permittedUsers > 0 && permittedRoles > 0) {
      message = `${permittedUsers} user(s) and ${permittedRoles} role(s) can now connect to this channel.`;
    } else if (permittedUsers > 0) {
      message = `${permittedUsers} user(s) can now connect to this channel.`;
    } else {
      message = `${permittedRoles} role(s) can now connect to this channel.`;
    }
    if (dmsSent > 0) {
      message += ` ${dmsSent} DM(s) sent.`;
    }
    
    // Show success using deferred method
    const { components, flags } = controlPanel.buildSuccessStatePanel(
      interaction.guildId,
      channelId,
      ownerId,
      'Permitted',
      message,
      { stickyEnabled, thumbnailUrl, latestMessageUrl }
    );
    
    try {
      await interaction.editReply({ components, flags });
    } catch (e) {
      await interaction.message.edit({ components, flags }).catch(() => {});
    }
    
    // Revert to normal control panel after delay
    setTimeout(async () => {
      try {
        const msg = await interaction.message.fetch().catch(() => null);
        if (!msg) return;
        const latestUrl = getLatestMessageUrl(channelId);
        const tempData = dataStore.getTempChannel(channelId);
        const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
          interaction.guildId,
          channelId,
          ownerId,
          { thumbnailUrl, stickyEnabled, latestMessageUrl: latestUrl, waitingRoomEnabled }
        );
        await msg.edit({ components: normalComponents, flags: normalFlags });
      } catch (e) {}
    }, 1500);
  } catch (error) {
    console.error('Error permitting users:', error);
    await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Failed to permit.', stickyEnabled, latestMessageUrl, thumbnailUrl);
  }
}

/**
 * Handles the permit_rejected string select menu
 */
async function handlePermitRejectedSelect(interaction, params) {
  const [channelId, ownerId] = params;
  const selectedIds = interaction.values;
  
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  await handlePermitUsers(interaction, channelId, selectedIds);
}

async function handleTransferOwnership(interaction, channelId, newOwnerId) {
  const oldOwnerId = dataStore.getChannelOwner(channelId);
  
  try {
    // Respond immediately FIRST to prevent interaction timeout
    await showSuccessAndRevert(
      interaction,
      channelId,
      newOwnerId, // Use new owner ID for the reverted panel
      'Ownership Transferred',
      `Channel ownership has been transferred to <@${newOwnerId}>.`
    );
    
    // Run all operations in background after responding
    setImmediate(async () => {
      try {
        const channel = await interaction.guild.channels.fetch(channelId);
        if (!channel) {
          console.log('[Transfer] Channel not found');
          return;
        }
        
        // Get new owner's display name
        const newOwner = await interaction.guild.members.fetch(newOwnerId).catch(() => null);
        
        // Update permissions
        if (oldOwnerId) {
          await channel.permissionOverwrites.edit(oldOwnerId, {
            ManageChannels: null,
            MoveMembers: null,
            MuteMembers: null,
            DeafenMembers: null
          }).catch(() => {});
        }
        
        await channel.permissionOverwrites.edit(newOwnerId, {
          ManageChannels: true,
          MoveMembers: true,
          MuteMembers: true,
          DeafenMembers: true,
          ViewChannel: true,
          Connect: true,
          SendMessages: true
        }).catch(() => {});
        
        // Update data store
        dataStore.setChannelOwner(channelId, newOwnerId);
        
        const tempData = dataStore.getTempChannel(channelId);
        if (tempData) {
          tempData.owner_id = newOwnerId;
          dataStore.setTempChannel(channelId, tempData);
        }
        
        // Update text channel name first
        console.log(`[Transfer] Updating text channel name for new owner ${newOwnerId}`);
        await updateTextChannelName(interaction, channelId, newOwnerId);
        
        // Auto-load basic settings for the new owner
        console.log(`[Transfer] Auto-loading settings for new owner ${newOwnerId}`);
        await autoLoadBasicSettings(interaction, channelId, newOwnerId);
        
        // If new owner has no saved name preference, update channel name to their display name
        const prefs = await voicePreferences.getPreferences(newOwnerId, interaction.guildId);
        if (!prefs?.channelName && newOwner) {
          try {
            const guildSettings = dataStore.getGuildSettings(interaction.guildId);
            const channelNameTemplate = guildSettings?.channel_name_template || "🗣️ {username}'s Voice";
            const newChannelName = voiceManager.applyChannelNameTemplate(channelNameTemplate, newOwner.displayName);
            await channel.setName(newChannelName);
            console.log(`[Transfer] Set channel name to new owner's name: ${newChannelName}`);
          } catch (e) {
            console.log('[Transfer] Could not set channel name to new owner name:', e.message);
          }
        }
        
        // Send DM notification to the new owner
        try {
          if (newOwner) {
            const { embed, components } = controlPanel.buildOwnershipTransferNotificationEmbed({
              channelName: channel.name,
              channelId: channelId,
              guildId: interaction.guildId,
              serverName: interaction.guild.name,
              previousOwnerId: oldOwnerId || interaction.user.id,
              serverIconUrl: interaction.guild.iconURL({ dynamic: true })
            });
            
            await newOwner.send({ embeds: [embed], components });
          }
        } catch (dmError) {
          console.log(`Could not send ownership transfer DM to ${newOwnerId}:`, dmError.message);
        }
        
      } catch (error) {
        console.error('Error in background transfer operations:', error);
      }
    });
    
  } catch (error) {
    console.error('Error transferring ownership:', error);
    await showErrorAndRevert(interaction, channelId, oldOwnerId, 'Error', 'Failed to transfer ownership.').catch(() => {});
  }
}


async function handleClaimOwnership(interaction, channelId) {
  const isElevated = hasElevatedPermissions(interaction.member);
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await interaction.reply({ content: 'Channel not found.', ephemeral: true });
      return;
    }

    // ALL users (including admins/mods) must be in the voice channel to claim ownership
    if (!channel.members.has(interaction.user.id)) {
      await interaction.reply({
        content: 'You must be in the voice channel to claim ownership.',
        ephemeral: true
      });
      return;
    }

    // Admins bypass feature permission checks
    if (!isElevated) {
      const featureCheck = voiceManager.canUseFeature(interaction.guildId, interaction.member, 'claim');
      if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.message, ephemeral: true });
        return;
      }
    }

    const newOwnerId = interaction.user.id;
    const oldOwnerId = dataStore.getChannelOwner(channelId);

    if (oldOwnerId && oldOwnerId !== newOwnerId) {
      await channel.permissionOverwrites.edit(oldOwnerId, {
        ManageChannels: null,
        MoveMembers: null,
        MuteMembers: null,
        DeafenMembers: null
      }).catch(() => {});
    }

    await channel.permissionOverwrites.edit(newOwnerId, {
      ManageChannels: true,
      MoveMembers: true,
      MuteMembers: true,
      DeafenMembers: true,
      ViewChannel: true,
      Connect: true,
      SendMessages: true
    });

    dataStore.setChannelOwner(channelId, newOwnerId);

    const tempData = dataStore.getTempChannel(channelId);
    
    // Determine if the claim was made from VC or text channel
    const claimedFromTextChannel = interaction.channelId === tempData?.text_channel_id;
    
    // Edit the clicked message to show who claimed ownership
    const claimMessage = isElevated && oldOwnerId && channel.members.has(oldOwnerId)
      ? `<@${newOwnerId}> has taken ownership using moderator privileges`
      : `<@${newOwnerId}> has claimed the ownership`;
    
    // Respond immediately
    await interaction.update({
      content: claimMessage,
      embeds: [],
      components: []
    });
    
    // Store the message reference for deletion
    const claimedMessageChannel = interaction.channel;
    const claimedMessageId = interaction.message.id;
    
    // Delete the OTHER channel's claim message immediately
    if (tempData?.claim_message_ids) {
      if (claimedFromTextChannel) {
        // Claimed from text channel, delete VC message
        if (tempData.claim_message_ids.voiceChannelMessageId) {
          try {
            const vcMessage = await channel.messages.fetch(tempData.claim_message_ids.voiceChannelMessageId).catch(() => null);
            if (vcMessage) await vcMessage.delete().catch(() => {});
          } catch (e) {}
        }
      } else {
        // Claimed from VC, delete text channel message
        if (tempData.claim_message_ids.textChannelMessageId && tempData.text_channel_id) {
          try {
            const textChannel = await interaction.guild.channels.fetch(tempData.text_channel_id).catch(() => null);
            if (textChannel) {
              const textMessage = await textChannel.messages.fetch(tempData.claim_message_ids.textChannelMessageId).catch(() => null);
              if (textMessage) await textMessage.delete().catch(() => {});
            }
          } catch (e) {}
        }
      }
    }
    
    if (tempData) {
      tempData.owner_id = newOwnerId;
      // Clear the claim message IDs
      delete tempData.claim_message_ids;
      dataStore.setTempChannel(channelId, tempData);
    }
    
    // Run auto-loading and text channel update in background
    setImmediate(async () => {
      try {
        // First update text channel name (this should happen regardless of preferences)
        console.log(`[Claim] Updating text channel name for new owner ${newOwnerId}`);
        await updateTextChannelName(interaction, channelId, newOwnerId);
        
        // Then auto-load basic settings for the new owner (this also updates text channel name but will skip if already done)
        console.log(`[Claim] Auto-loading settings for new owner ${newOwnerId}`);
        await autoLoadBasicSettings(interaction, channelId, newOwnerId);
      } catch (error) {
        console.error('Error in background claim operations:', error);
      }
    });

    // Delete the claimed message after 10 seconds
    setTimeout(async () => {
      try {
        const messageToDelete = await claimedMessageChannel.messages.fetch(claimedMessageId).catch(() => null);
        if (messageToDelete) {
          await messageToDelete.delete().catch(() => {});
        }
      } catch (e) {
        console.log('Could not delete claim message:', e.message);
      }
    }, 10000);

  } catch (error) {
    console.error('Error claiming ownership:', error);
    await interaction.reply({ content: 'Failed to claim ownership.', ephemeral: true });
  }
}

async function handleLfmJoin(interaction, channelId) {
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await interaction.reply({ content: 'Channel no longer exists.', ephemeral: true });
      return;
    }
    
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.voice.channel) {
      await interaction.reply({ 
        content: `Join a voice channel first, then click the button to move to <#${channelId}>.`,
        ephemeral: true 
      });
      return;
    }
    
    await member.voice.setChannel(channel);
    
    await interaction.reply({ 
      content: `You've been moved to **${channel.name}**!`,
      ephemeral: true 
    });
  } catch (error) {
    console.error('Error joining LFM channel:', error);
    await interaction.reply({ content: 'Failed to join channel.', ephemeral: true });
  }
}

async function handleCreateTextChannel(interaction, voiceChannelId, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  
  try {
    const voiceChannel = await interaction.guild.channels.fetch(voiceChannelId).catch(() => null);
    if (!voiceChannel) {
      if (isUniversal) {
        await interaction.reply({ 
          content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.', 
          ephemeral: true 
        });
      } else {
        await showErrorAndRevert(interaction, voiceChannelId, ownerId, 'Error', 'Voice channel not found.');
      }
      return;
    }
    
    const tempData = dataStore.getTempChannel(voiceChannelId);
    if (tempData?.text_channel_id) {
      if (isUniversal) {
        await interaction.reply({
          content: `❌ **Text Channel Exists**\nA text channel already exists: <#${tempData.text_channel_id}>`,
          ephemeral: true
        });
      } else {
        await showErrorAndRevert(
          interaction, 
          voiceChannelId, 
          ownerId, 
          'Text Channel Exists', 
          `A text channel already exists: <#${tempData.text_channel_id}>`
        );
      }
      return;
    }
    
    await interaction.showModal(modals.buildTextChannelNameModal(voiceChannelId));
    
    // For regular interface, refresh control panel after modal
    if (!isUniversal) {
      await refreshControlPanelAfterModal(interaction, voiceChannelId, ownerId);
    }
  } catch (error) {
    console.error('Error creating text channel:', error);
    if (isUniversal) {
      await interaction.reply({
        content: '❌ **Error**\nFailed to create text channel.',
        ephemeral: true
      }).catch(() => {});
    } else {
      await showErrorAndRevert(interaction, voiceChannelId, ownerId, 'Error', 'Failed to create text channel.');
    }
  }
}

async function handleDeleteTextChannel(interaction, textChannelId, voiceChannelId) {
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (textChannel) {
      await textChannel.delete('Owner deleted text channel');
    }
    
    const tempData = dataStore.getTempChannel(voiceChannelId);
    if (tempData) {
      tempData.text_channel_id = null;
      dataStore.setTempChannel(voiceChannelId, tempData);
    }
    
    // Clean up sticky notes, restrictions, and go-to-latest tracking for this channel
    stickyNotes.clearChannel(textChannelId);
    textChannelRestrictions.clearRestrictions(textChannelId);
    clearGoToLatestTracking(textChannelId);
    
    const embed = controlPanel.buildSuccessEmbed(
      'Text Channel Deleted',
      'The linked text channel has been deleted.'
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error deleting text channel:', error);
    await interaction.reply({ content: 'Failed to delete text channel.', ephemeral: true });
  }
}


// ============================================
// Text Channel Feature Handlers
// ============================================

/**
 * Handles toggling sticky notes for a text channel
 * Requirements: 1.1, 3.1
 */
async function handleToggleStickyNote(interaction, textChannelId, voiceChannelId, ownerId) {
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (!textChannel) {
      await interaction.reply({ content: 'Text channel not found.', ephemeral: true });
      return;
    }
    
    const isCurrentlyEnabled = stickyNotes.isEnabled(textChannelId);
    
    if (isCurrentlyEnabled) {
      // Disable sticky notes
      stickyNotes.disableStickyNote(textChannelId);
      
      const embed = controlPanel.buildSuccessEmbed(
        'Sticky Notes Disabled',
        'Sticky notes have been disabled for this channel. The control panel link will no longer be reposted automatically.'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      // Enable sticky notes - need to find the control panel message
      const messages = await textChannel.messages.fetch({ limit: 50 });
      const controlMessage = messages.find(msg => 
        msg.author.id === interaction.client.user.id && 
        msg.embeds.length > 0 && 
        msg.embeds[0].title?.includes('Control Panel')
      );
      
      if (!controlMessage) {
        await interaction.reply({ 
          content: 'Could not find the control panel message. Please ensure the control panel exists in this channel.',
          ephemeral: true 
        });
        return;
      }
      
      stickyNotes.enableStickyNote(textChannelId, controlMessage.id, interaction.guildId);
      
      const embed = controlPanel.buildSuccessEmbed(
        'Sticky Notes Enabled',
        'Sticky notes have been enabled! After 8 messages, a link to the control panel will be posted automatically.'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error toggling sticky note:', error);
    await interaction.reply({ content: 'Failed to toggle sticky notes.', ephemeral: true });
  }
}

/**
 * Shows user selection menu for view-only mode (users only, no roles)
 * Requirements: 1.3
 */
async function showViewOnlyUserSelect(interaction, textChannelId, voiceChannelId, ownerId) {
  try {
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(`text_user_select:viewonly:${textChannelId}:${voiceChannelId}`)
      .setPlaceholder('👀 Select a user to set as view-only')
      .setMinValues(1)
      .setMaxValues(1);
    
    const actionRow = new ActionRowBuilder().addComponents(userSelect);
    
    // Build a panel with user select menu
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent for text channel
    
    const headerText = new TextDisplayBuilder().setContent([
      `## 👀 View-Only Users`,
      ``,
      `Select a user to restrict to view-only mode:`,
      `• User will be able to see messages but not send`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(actionRow);
    
    // Add cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`text_cancel_action:${textChannelId}:${voiceChannelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
    container.addActionRowComponents(cancelRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 2 minutes if no action taken
    setTimeout(async () => {
      try {
        const message = await interaction.message.fetch().catch(() => null);
        if (!message) return;
        
        const hasUserSelect = message.components.some(row => 
          row.components?.some(comp => comp.customId?.startsWith('text_user_select:viewonly:'))
        );
        
        if (hasUserSelect) {
          const stickyEnabled = stickyNotes.isEnabled(textChannelId);
          const latestMessageUrl = getLatestMessageUrl(textChannelId);
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
            interaction.guildId,
            textChannelId,
            voiceChannelId,
            ownerId,
            { stickyEnabled, latestMessageUrl }
          );
          await message.edit({ components: normalComponents, flags: normalFlags });
        }
      } catch (error) {
        // Message may have been deleted, ignore
      }
    }, 2 * 60 * 1000); // 2 minutes
  } catch (error) {
    console.error('Error showing view-only user select:', error);
    await interaction.reply({ content: 'Failed to show user selection.', ephemeral: true });
  }
}

/**
 * Handles setting users/roles to view-only mode
 * Requirements: 1.4
 * @param {Array} isRoleArray - Array of booleans indicating if each ID is a role
 */
async function handleViewOnlyUsers(interaction, textChannelId, voiceChannelId, ids, isRoleArray = []) {
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  const stickyEnabled = stickyNotes.isEnabled(textChannelId);
  const latestMessageUrl = getLatestMessageUrl(textChannelId);
  
  // Get voice channel to check membership
  const voiceChannel = await interaction.guild.channels.fetch(voiceChannelId).catch(() => null);
  
  // Check if any target user has elevated permissions or is not in voice channel
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const isRole = isRoleArray[i] || false;
    
    if (!isRole) {
      try {
        const targetMember = await interaction.guild.members.fetch(id).catch(() => null);
        if (targetMember && hasElevatedPermissions(targetMember)) {
          await showTextErrorAndRevert(
            interaction,
            textChannelId,
            voiceChannelId,
            ownerId,
            'Cannot Restrict User',
            'This user has elevated permissions (Administrator, Ban Members, or Kick Members).'
          );
          return;
        }
        
        // Check if user is in the voice channel
        if (voiceChannel) {
          const isInVoiceChannel = voiceChannel.members.has(id);
          if (!isInVoiceChannel) {
            await showTextErrorAndRevert(
              interaction,
              textChannelId,
              voiceChannelId,
              ownerId,
              'User Not in Channel',
              'You can only set view-only for users who are currently in your voice channel.'
            );
            return;
          }
        }
      } catch (e) {
        console.log('Could not check target member permissions:', e.message);
      }
    }
  }
  
  // Defer the interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer view-only interaction:', deferError.message);
  }
  
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (!textChannel) {
      await showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Text channel not found.', stickyEnabled, latestMessageUrl);
      return;
    }
    
    let dmSentCount = 0;
    let userCount = 0;
    let roleCount = 0;
    
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const isRole = isRoleArray[i] || false;
      
      // Set permissions: can view but cannot send messages
      await textChannel.permissionOverwrites.edit(id, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true
      });
      
      // Track in restrictions module
      textChannelRestrictions.addViewOnlyUser(textChannelId, id);
      
      // Note: Text channel restrictions are NOT saved to preferences (temporary only)
      
      if (isRole) {
        roleCount++;
        // No DM for roles
      } else {
        userCount++;
        // Send DM notification (only for users)
        try {
          const user = await interaction.client.users.fetch(id);
          const serverIconUrl = interaction.guild.iconURL({ dynamic: true, size: 128 });
          
          const dmEmbed = controlPanel.buildViewOnlyNotificationEmbed({
            channelId: textChannelId,
            serverName: interaction.guild.name,
            restrictedById: interaction.user.id,
            serverIconUrl
          });
          
          await user.send({ embeds: [dmEmbed] });
          dmSentCount++;
        } catch (dmError) {
          // User may have DMs disabled, continue silently
          console.log(`Could not send DM to user ${id}:`, dmError.message);
        }
      }
    }
    
    let message = '';
    if (userCount > 0 && roleCount > 0) {
      message = `${userCount} user(s) and ${roleCount} role(s) set to view-only.`;
    } else if (userCount > 0) {
      message = `${userCount} user(s) set to view-only.`;
    } else {
      message = `${roleCount} role(s) set to view-only.`;
    }
    if (dmSentCount > 0) {
      message += ` ${dmSentCount} DM(s) sent.`;
    }
    
    await showTextSuccessAndRevertDeferred(
      interaction,
      textChannelId,
      voiceChannelId,
      ownerId,
      'View-Only Mode Applied',
      message,
      stickyEnabled,
      latestMessageUrl
    );
  } catch (error) {
    console.error('Error setting view-only users:', error);
    await showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Failed to set view-only mode.', stickyEnabled, latestMessageUrl);
  }
}

/**
 * Shows mentionable selection menu for banning users/roles
 * Requirements: 1.5
 */
async function showBanUserSelect(interaction, textChannelId, voiceChannelId, ownerId) {
  try {
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(`text_user_select:ban:${textChannelId}:${voiceChannelId}`)
      .setPlaceholder('🚫 Select a user to ban from this channel')
      .setMinValues(1)
      .setMaxValues(1);
    
    const actionRow = new ActionRowBuilder().addComponents(userSelect);
    
    // Build a panel with user select menu
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent for text channel
    
    const headerText = new TextDisplayBuilder().setContent([
      `## 🚫 Ban Users`,
      ``,
      `Select a user to ban from this text channel:`,
      `• User will be hidden from the channel`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(actionRow);
    
    // Add cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`text_cancel_action:${textChannelId}:${voiceChannelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
    container.addActionRowComponents(cancelRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 2 minutes if no action taken
    setTimeout(async () => {
      try {
        const message = await interaction.message.fetch().catch(() => null);
        if (!message) return;
        
        const hasUserSelect = message.components.some(row => 
          row.components?.some(comp => comp.customId?.startsWith('text_user_select:ban:'))
        );
        
        if (hasUserSelect) {
          const stickyEnabled = stickyNotes.isEnabled(textChannelId);
          const latestMessageUrl = getLatestMessageUrl(textChannelId);
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
            interaction.guildId,
            textChannelId,
            voiceChannelId,
            ownerId,
            { stickyEnabled, latestMessageUrl }
          );
          await message.edit({ components: normalComponents, flags: normalFlags });
        }
      } catch (error) {
        // Message may have been deleted, ignore
      }
    }, 2 * 60 * 1000); // 2 minutes
  } catch (error) {
    console.error('Error showing ban user select:', error);
    await interaction.reply({ content: 'Failed to show user selection.', ephemeral: true });
  }
}

/**
 * Handles banning users/roles from a text channel
 * Requirements: 1.6
 * @param {string} reason - Optional ban reason
 * @param {boolean} isRole - Whether the IDs are role IDs (no DM for roles)
 */
async function handleBanUsers(interaction, textChannelId, voiceChannelId, ids, reason = 'Banned by channel owner', isRoleArray = []) {
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  const stickyEnabled = stickyNotes.isEnabled(textChannelId);
  const latestMessageUrl = getLatestMessageUrl(textChannelId);
  
  // Defer the interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer ban interaction:', deferError.message);
  }
  
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (!textChannel) {
      await showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Text channel not found.', stickyEnabled, latestMessageUrl);
      return;
    }
    
    let dmSentCount = 0;
    let userCount = 0;
    let roleCount = 0;
    
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const isRole = isRoleArray[i] || false;
      
      // Set permissions: hide channel from user/role
      await textChannel.permissionOverwrites.edit(id, {
        ViewChannel: false
      });
      
      // Track in restrictions module
      textChannelRestrictions.addBannedUser(textChannelId, id);
      
      // Note: Text channel restrictions are NOT saved to preferences (temporary only)
      
      if (isRole) {
        roleCount++;
        // No DM for roles
      } else {
        userCount++;
        // Send DM notification with new format (only for users)
        try {
          const user = await interaction.client.users.fetch(id);
          const serverIconUrl = interaction.guild.iconURL({ dynamic: true, size: 128 });
          
          const { embed: dmEmbed } = controlPanel.buildTextBanNotificationEmbed({
            channelName: textChannel.name,
            channelId: textChannelId,
            guildId: interaction.guildId,
            serverName: interaction.guild.name,
            bannedById: interaction.user.id,
            reason: reason || 'No reason provided',
            serverIconUrl
          });
          
          await user.send({ embeds: [dmEmbed] });
          dmSentCount++;
        } catch (dmError) {
          // User may have DMs disabled, continue silently
          console.log(`Could not send DM to user ${id}:`, dmError.message);
        }
      }
    }
    
    let message = '';
    if (userCount > 0 && roleCount > 0) {
      message = `${userCount} user(s) and ${roleCount} role(s) have been banned.`;
    } else if (userCount > 0) {
      message = `${userCount} user(s) have been banned.`;
    } else {
      message = `${roleCount} role(s) have been banned.`;
    }
    if (dmSentCount > 0) {
      message += ` ${dmSentCount} DM(s) sent.`;
    }
    
    await showTextSuccessAndRevertDeferred(
      interaction,
      textChannelId,
      voiceChannelId,
      ownerId,
      'Banned',
      message,
      stickyEnabled,
      latestMessageUrl
    );
  } catch (error) {
    console.error('Error banning users:', error);
    await showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Failed to ban users.', stickyEnabled, latestMessageUrl);
  }
}

/**
 * Shows the ban options panel with Add Reason, Without Reason, and Cancel buttons
 * @param {Array} isRoleArray - Array of booleans indicating if each ID is a role
 */
async function showBanOptionsPanel(interaction, textChannelId, voiceChannelId, ownerId, selectedIds, isRoleArray = []) {
  try {
    // Since we only allow 1 selection, just use the first ID
    const targetId = selectedIds[0];
    const isRole = isRoleArray[0];
    const stickyEnabled = stickyNotes.isEnabled(textChannelId);
    
    // Check if target user has elevated permissions (Admin, Ban Members, Kick Members)
    // Moderators/Admins cannot be banned from text channels
    if (!isRole) {
      try {
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (targetMember && hasElevatedPermissions(targetMember)) {
          await showTextErrorAndRevert(
            interaction,
            textChannelId,
            voiceChannelId,
            ownerId,
            'Cannot Ban User',
            'This user has elevated permissions (Administrator, Ban Members, or Kick Members).'
          );
          return;
        }
        
        // Check if user is in the voice channel
        const voiceChannel = await interaction.guild.channels.fetch(voiceChannelId).catch(() => null);
        if (voiceChannel) {
          const isInVoiceChannel = voiceChannel.members.has(targetId);
          if (!isInVoiceChannel) {
            await showTextErrorAndRevert(
              interaction,
              textChannelId,
              voiceChannelId,
              ownerId,
              'User Not in Channel',
              'You can only ban users who are currently in your voice channel.'
            );
            return;
          }
        }
      } catch (e) {
        console.log('Could not check target member permissions:', e.message);
      }
    }
    
    // If it's a role, skip the reason panel and ban directly (no DM for roles)
    if (isRole) {
      await handleBanUsers(interaction, textChannelId, voiceChannelId, [targetId], 'Banned by channel owner', [true]);
      return;
    }
    
    // Build a panel with ban options for users
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent for text channel
    
    // Get mention for display
    const mention = `<@${targetId}>`;
    
    const headerText = new TextDisplayBuilder().setContent([
      `## 🚫 Ban User`,
      ``,
      `Selected: ${mention}`,
      ``,
      `Would you like to add a reason for the ban?`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    
    // Shortened custom IDs: ban_r (with reason), ban_n (no reason)
    // Format: ban_r:textId:voiceId:targetId:isRole
    const addReasonButton = new ButtonBuilder()
      .setCustomId(`ban_r:${textChannelId}:${voiceChannelId}:${targetId}:0`)
      .setLabel('Add Reason')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝');
    
    const withoutReasonButton = new ButtonBuilder()
      .setCustomId(`ban_n:${textChannelId}:${voiceChannelId}:${targetId}:0`)
      .setLabel('Without Reason')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🚫');
    
    // Cancel button - also shortened
    const cancelButton = new ButtonBuilder()
      .setCustomId(`txt_cancel:${textChannelId}:${voiceChannelId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');
    
    const buttonsRow = new ActionRowBuilder().addComponents(addReasonButton, withoutReasonButton, cancelButton);
    container.addActionRowComponents(buttonsRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 5 minutes if no action taken
    setTimeout(async () => {
      try {
        const message = await interaction.message.fetch().catch(() => null);
        if (!message) return;
        
        // Check if it's still showing the ban options panel
        const hasBanButton = message.components.some(row => 
          row.components?.some(comp => comp.customId?.startsWith('ban_r:') || comp.customId?.startsWith('ban_n:'))
        );
        
        if (hasBanButton) {
          const ownerId = dataStore.getChannelOwner(voiceChannelId);
          const latestMessageUrl = getLatestMessageUrl(textChannelId);
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
            interaction.guildId,
            textChannelId,
            voiceChannelId,
            ownerId,
            { stickyEnabled, latestMessageUrl }
          );
          await message.edit({ components: normalComponents, flags: normalFlags });
        }
      } catch (error) {
        // Message may have been deleted, ignore
      }
    }, 2 * 60 * 1000); // 2 minutes
  } catch (error) {
    console.error('Error showing ban options panel:', error);
    await interaction.reply({ content: 'Failed to show ban options.', ephemeral: true });
  }
}

/**
 * Handles the "Add Reason" button - shows the ban reason modal
 */
async function handleBanWithReasonButton(interaction, textChannelId, voiceChannelId, ownerId, idsStr, isRoleStr = '') {
  // Get owner if not provided (for shortened custom IDs)
  const effectiveOwnerId = ownerId || dataStore.getChannelOwner(voiceChannelId);
  
  // For shortened format, isRoleStr is '0' or '1', convert to 'false' or 'true'
  const normalizedIsRoleStr = isRoleStr === '1' ? 'true' : (isRoleStr === '0' ? 'false' : isRoleStr);
  
  await interaction.showModal(modals.buildBanReasonModal(textChannelId, voiceChannelId, idsStr, normalizedIsRoleStr));
  await refreshTextControlPanelAfterModal(interaction, textChannelId, voiceChannelId, effectiveOwnerId);
}

/**
 * Handles the "Without Reason" button - bans users/roles without a reason
 */
async function handleBanWithoutReasonButton(interaction, textChannelId, voiceChannelId, ownerId, idsStr, isRoleStr = '') {
  // For shortened format, isRoleStr is '0' or '1'
  const ids = idsStr.split(',');
  const isRoleArray = isRoleStr === '1' ? [true] : 
                      isRoleStr === '0' ? [false] : 
                      (isRoleStr ? isRoleStr.split(',').map(v => v === 'true') : ids.map(() => false));
  await handleBanUsers(interaction, textChannelId, voiceChannelId, ids, 'No reason provided', isRoleArray);
}

/**
 * Handles the ban reason modal submission
 */
async function handleBanReasonModalSubmit(interaction, textChannelId, voiceChannelId, idsStr, isRoleStr = '') {
  const reason = interaction.fields.getTextInputValue('ban_reason') || 'No reason provided';
  const ids = idsStr.split(',');
  // Handle both '1'/'0' and 'true'/'false' formats
  const isRoleArray = isRoleStr === '1' ? [true] : 
                      isRoleStr === '0' ? [false] : 
                      (isRoleStr ? isRoleStr.split(',').map(v => v === 'true' || v === '1') : ids.map(() => false));
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  const stickyEnabled = stickyNotes.isEnabled(textChannelId);
  const latestMessageUrl = getLatestMessageUrl(textChannelId);
  
  // Defer the modal immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer ban modal:', deferError.message);
  }
  
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (!textChannel) {
      return; // Can't reply after deferUpdate
    }
    
    let dmSentCount = 0;
    let userCount = 0;
    let roleCount = 0;
    
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const isRole = isRoleArray[i] || false;
      
      // Set permissions: hide channel from user/role
      await textChannel.permissionOverwrites.edit(id, {
        ViewChannel: false
      });
      
      // Track in restrictions module
      textChannelRestrictions.addBannedUser(textChannelId, id);
      
      if (isRole) {
        roleCount++;
        // No DM for roles
      } else {
        userCount++;
        // Send DM notification with reason (only for users)
        try {
          const user = await interaction.client.users.fetch(id);
          const serverIconUrl = interaction.guild.iconURL({ dynamic: true, size: 128 });
          
          const { embed: dmEmbed } = controlPanel.buildTextBanNotificationEmbed({
            channelName: textChannel.name,
            channelId: textChannelId,
            guildId: interaction.guildId,
            serverName: interaction.guild.name,
            bannedById: interaction.user.id,
            reason: reason,
            serverIconUrl
          });
          
          await user.send({ embeds: [dmEmbed] });
          dmSentCount++;
        } catch (dmError) {
          console.log(`Could not send DM to user ${id}:`, dmError.message);
        }
      }
    }
    
    // Find and update control panel
    const messages = await textChannel.messages.fetch({ limit: 50 });
    const controlPanelMsg = messages.find(msg => {
      if (msg.author.id !== interaction.client.user.id) return false;
      if (msg.components?.length > 0) return true;
      if (msg.flags?.has('IsComponentsV2')) return true;
      return false;
    });
    
    let message = '';
    if (userCount > 0 && roleCount > 0) {
      message = `${userCount} user(s) and ${roleCount} role(s) have been banned.`;
    } else if (userCount > 0) {
      message = `${userCount} user(s) have been banned.`;
    } else {
      message = `${roleCount} role(s) have been banned.`;
    }
    if (dmSentCount > 0) {
      message += ` ${dmSentCount} DM(s) sent.`;
    }
    
    if (controlPanelMsg) {
      // Show success state
      const latestUrl = getLatestMessageUrl(textChannelId);
      const { components: successComponents, flags } = controlPanel.buildSuccessStatePanel(
        interaction.guildId,
        textChannelId,
        ownerId,
        'Banned',
        message,
        { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl: latestUrl }
      );
      
      await controlPanelMsg.edit({ components: successComponents, flags });
      
      // Revert after 1.5 seconds
      setTimeout(async () => {
        try {
          const latestUrl2 = getLatestMessageUrl(textChannelId);
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
            interaction.guildId,
            textChannelId,
            voiceChannelId,
            ownerId,
            { stickyEnabled, latestMessageUrl: latestUrl2 }
          );
          await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
        } catch (e) {
          // Ignore
        }
      }, 1500);
    }
  } catch (error) {
    console.error('Error banning users with reason:', error);
  }
}

/**
 * Shows selection menu for giving access back to view-only users/roles
 * Requirements: 1.7
 */
async function showGiveAccessUserSelect(interaction, textChannelId, voiceChannelId, ownerId) {
  try {
    const viewOnlyIds = textChannelRestrictions.getViewOnlyUsers(textChannelId);
    
    if (viewOnlyIds.length === 0) {
      // Show info in control panel instead of ephemeral
      await showTextErrorAndRevert(
        interaction,
        textChannelId,
        voiceChannelId,
        ownerId,
        'No Restricted Users/Roles',
        'There are no users or roles currently in view-only mode.'
      );
      return;
    }
    
    // Build a string select menu with the restricted users/roles
    // Format: @displayName as label, @username as description
    const options = [];
    for (const id of viewOnlyIds.slice(0, 25)) { // Max 25 options
      // Try to fetch as user first
      try {
        const member = await interaction.guild.members.fetch(id).catch(() => null);
        const user = member?.user || await interaction.client.users.fetch(id);
        const displayName = member?.displayName || user.displayName || user.username;
        options.push({
          label: `@${displayName}`,
          description: `@${user.username}`,
          value: id,
          emoji: '👤'
        });
      } catch {
        // Try to fetch as role
        try {
          const role = await interaction.guild.roles.fetch(id);
          if (role) {
            options.push({
              label: `@${role.name}`,
              description: `Role: ${role.name}`,
              value: id,
              emoji: '👥'
            });
          } else {
            options.push({
              label: `@Unknown (${id})`,
              description: 'Restore access for this user/role',
              value: id
            });
          }
        } catch {
          options.push({
            label: `@Unknown (${id})`,
            description: 'Restore access for this user/role',
            value: id
          });
        }
      }
    }
    
    const { StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`text_string_select:giveaccess:${textChannelId}:${voiceChannelId}`)
      .setPlaceholder('✅ Select users/roles to restore access')
      .setMinValues(1)
      .setMaxValues(Math.min(options.length, 25))
      .addOptions(options);
    
    const actionRow = new ActionRowBuilder().addComponents(selectMenu);
    
    // Build a panel with select menu
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent for text channel
    
    const headerText = new TextDisplayBuilder().setContent([
      `## ✅ Give Access Users/Roles`,
      ``,
      `Select users or roles to restore full access (remove view-only restriction):`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(actionRow);
    
    // Add cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`text_cancel_action:${textChannelId}:${voiceChannelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
    container.addActionRowComponents(cancelRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 5 minutes if no action taken
    setTimeout(async () => {
      try {
        const message = await interaction.message.fetch().catch(() => null);
        if (!message) return;
        
        const hasStringSelect = message.components.some(row => 
          row.components?.some(comp => comp.customId?.startsWith('text_string_select:giveaccess:'))
        );
        
        if (hasStringSelect) {
          const stickyEnabled = stickyNotes.isEnabled(textChannelId);
          const latestMessageUrl = getLatestMessageUrl(textChannelId);
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
            interaction.guildId,
            textChannelId,
            voiceChannelId,
            ownerId,
            { stickyEnabled, latestMessageUrl }
          );
          await message.edit({ components: normalComponents, flags: normalFlags });
        }
      } catch (error) {
        // Message may have been deleted, ignore
      }
    }, 2 * 60 * 1000); // 2 minutes
  } catch (error) {
    console.error('Error showing give access user select:', error);
    await showTextErrorAndRevert(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Failed to show user selection.');
  }
}

/**
 * Handles giving access back to view-only users/roles
 * Requirements: 1.7
 */
async function handleGiveAccessUsers(interaction, textChannelId, ids) {
  // Get voiceChannelId from the customId
  const customIdParts = interaction.customId.split(':');
  const voiceChannelId = customIdParts[3]; // text_string_select:giveaccess:textChannelId:voiceChannelId
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  const stickyEnabled = stickyNotes.isEnabled(textChannelId);
  const latestMessageUrl = getLatestMessageUrl(textChannelId);
  
  // Defer the interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer give access interaction:', deferError.message);
  }
  
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (!textChannel) {
      await showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Text channel not found.', stickyEnabled, latestMessageUrl);
      return;
    }
    
    let dmSentCount = 0;
    let userCount = 0;
    let roleCount = 0;
    
    for (const id of ids) {
      // Restore full permissions
      await textChannel.permissionOverwrites.edit(id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
      
      // Remove from restrictions tracking
      textChannelRestrictions.removeViewOnlyUser(textChannelId, id);
      
      // Try to send DM notification (only works for users, not roles)
      try {
        const user = await interaction.client.users.fetch(id);
        userCount++;
        
        // Send DM notification
        try {
          const { embed, components } = controlPanel.buildAccessRestoredNotificationEmbed({
            channelId: textChannelId,
            guildId: interaction.guildId,
            serverName: interaction.guild.name,
            restoredById: interaction.user.id,
            serverIconUrl: interaction.guild.iconURL({ dynamic: true })
          });
          await user.send({ embeds: [embed], components });
          dmSentCount++;
        } catch (dmError) {
          // User may have DMs disabled, continue silently
          console.log(`Could not send DM to user ${id}:`, dmError.message);
        }
      } catch {
        // It's a role, no DM needed
        roleCount++;
      }
    }
    
    let message = '';
    if (userCount > 0 && roleCount > 0) {
      message = `${userCount} user(s) and ${roleCount} role(s) have had their access restored.`;
    } else if (userCount > 0) {
      message = `${userCount} user(s) have had their access restored.`;
    } else {
      message = `${roleCount} role(s) have had their access restored.`;
    }
    if (dmSentCount > 0) {
      message += ` ${dmSentCount} notification(s) sent.`;
    }
    
    await showTextSuccessAndRevertDeferred(
      interaction,
      textChannelId,
      voiceChannelId,
      ownerId,
      'Access Restored',
      message,
      stickyEnabled,
      latestMessageUrl
    );
  } catch (error) {
    console.error('Error giving access to users:', error);
    await showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Failed to restore access.', stickyEnabled, latestMessageUrl);
  }
}

/**
 * Shows selection menu for unbanning users/roles
 * Requirements: 1.8
 */
async function showUnbanUserSelect(interaction, textChannelId, voiceChannelId, ownerId) {
  try {
    const bannedIds = textChannelRestrictions.getBannedUsers(textChannelId);
    
    if (bannedIds.length === 0) {
      // Show info in control panel instead of ephemeral
      await showTextErrorAndRevert(
        interaction,
        textChannelId,
        voiceChannelId,
        ownerId,
        'No Banned Users/Roles',
        'There are no users or roles currently banned from this channel.'
      );
      return;
    }
    
    // Build a string select menu with the banned users/roles
    // Format: @displayName as label, @username as description
    const options = [];
    for (const id of bannedIds.slice(0, 25)) { // Max 25 options
      // Try to fetch as user first
      try {
        const member = await interaction.guild.members.fetch(id).catch(() => null);
        const user = member?.user || await interaction.client.users.fetch(id);
        const displayName = member?.displayName || user.displayName || user.username;
        options.push({
          label: `@${displayName}`,
          description: `@${user.username}`,
          value: id,
          emoji: '👤'
        });
      } catch {
        // Try to fetch as role
        try {
          const role = await interaction.guild.roles.fetch(id);
          if (role) {
            options.push({
              label: `@${role.name}`,
              description: `Role: ${role.name}`,
              value: id,
              emoji: '👥'
            });
          } else {
            options.push({
              label: `@Unknown (${id})`,
              description: 'Unban this user/role',
              value: id
            });
          }
        } catch {
          options.push({
            label: `@Unknown (${id})`,
            description: 'Unban this user/role',
            value: id
          });
        }
      }
    }
    
    const { StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`text_string_select:unban:${textChannelId}:${voiceChannelId}`)
      .setPlaceholder('🔓 Select users/roles to unban')
      .setMinValues(1)
      .setMaxValues(Math.min(options.length, 25))
      .addOptions(options);
    
    const actionRow = new ActionRowBuilder().addComponents(selectMenu);
    
    // Build a panel with select menu
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent for text channel
    
    const headerText = new TextDisplayBuilder().setContent([
      `## 🔓 Unban Users/Roles`,
      ``,
      `Select users or roles to unban from this text channel:`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(actionRow);
    
    // Add cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`text_cancel_action:${textChannelId}:${voiceChannelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
    container.addActionRowComponents(cancelRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 5 minutes if no action taken
    setTimeout(async () => {
      try {
        const message = await interaction.message.fetch().catch(() => null);
        if (!message) return;
        
        const hasStringSelect = message.components.some(row => 
          row.components?.some(comp => comp.customId?.startsWith('text_string_select:unban:'))
        );
        
        if (hasStringSelect) {
          const stickyEnabled = stickyNotes.isEnabled(textChannelId);
          const latestMessageUrl = getLatestMessageUrl(textChannelId);
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
            interaction.guildId,
            textChannelId,
            voiceChannelId,
            ownerId,
            { stickyEnabled, latestMessageUrl }
          );
          await message.edit({ components: normalComponents, flags: normalFlags });
        }
      } catch (error) {
        // Message may have been deleted, ignore
      }
    }, 2 * 60 * 1000); // 2 minutes
  } catch (error) {
    console.error('Error showing unban user select:', error);
    await showTextErrorAndRevert(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Failed to show user selection.');
  }
}

/**
 * Handles unbanning users/roles from a text channel
 * Requirements: 1.8
 */
async function handleUnbanUsers(interaction, textChannelId, ids) {
  // Get voiceChannelId from the customId
  const customIdParts = interaction.customId.split(':');
  const voiceChannelId = customIdParts[3]; // text_string_select:unban:textChannelId:voiceChannelId
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  const stickyEnabled = stickyNotes.isEnabled(textChannelId);
  const latestMessageUrl = getLatestMessageUrl(textChannelId);
  
  // Defer the interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer unban interaction:', deferError.message);
  }
  
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    if (!textChannel) {
      await showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Text channel not found.', stickyEnabled, latestMessageUrl);
      return;
    }
    
    let dmSentCount = 0;
    let userCount = 0;
    let roleCount = 0;
    
    for (const id of ids) {
      // Restore permissions
      await textChannel.permissionOverwrites.edit(id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
      
      // Remove from restrictions tracking
      textChannelRestrictions.removeBannedUser(textChannelId, id);
      
      // Try to send DM notification (only works for users, not roles)
      try {
        const user = await interaction.client.users.fetch(id);
        userCount++;
        
        // Send DM notification with channel link
        try {
          const { embed, components } = controlPanel.buildUnbanNotificationEmbed({
            channelName: textChannel.name,
            channelId: textChannelId,
            guildId: interaction.guildId,
            serverName: interaction.guild.name,
            unbannedById: interaction.user.id,
            serverIconUrl: interaction.guild.iconURL({ dynamic: true })
          });
          await user.send({ embeds: [embed], components });
          dmSentCount++;
        } catch (dmError) {
          // User may have DMs disabled, continue silently
          console.log(`Could not send DM to user ${id}:`, dmError.message);
        }
      } catch {
        // It's a role, no DM needed
        roleCount++;
      }
    }
    
    let message = '';
    if (userCount > 0 && roleCount > 0) {
      message = `${userCount} user(s) and ${roleCount} role(s) have been unbanned.`;
    } else if (userCount > 0) {
      message = `${userCount} user(s) have been unbanned.`;
    } else {
      message = `${roleCount} role(s) have been unbanned.`;
    }
    if (dmSentCount > 0) {
      message += ` ${dmSentCount} notification(s) sent.`;
    }
    
    await showTextSuccessAndRevertDeferred(
      interaction,
      textChannelId,
      voiceChannelId,
      ownerId,
      'Unbanned',
      message,
      stickyEnabled,
      latestMessageUrl
    );
  } catch (error) {
    console.error('Error unbanning users:', error);
    await showTextErrorAndRevertDeferred(interaction, textChannelId, voiceChannelId, ownerId, 'Error', 'Failed to unban users.', stickyEnabled, latestMessageUrl);
  }
}


// ============================================
// Modal Submit Handlers
// ============================================

/**
 * Helper to find and update the control panel message after modal submit
 */
async function findAndUpdateControlPanel(interaction, channelId, title, description, isSuccess = true) {
  const ownerId = dataStore.getChannelOwner(channelId);
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  
  try {
    // Find the control panel message in the channel
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      console.log('findAndUpdateControlPanel: Channel not found:', channelId);
      return false;
    }
    
    // Check if channel supports messages
    if (!channel.messages) {
      console.log('findAndUpdateControlPanel: Channel does not support messages:', channelId);
      return false;
    }
    
    const messages = await channel.messages.fetch({ limit: 50 }); // Increased limit
    // Look for bot messages with components (Components V2 or traditional)
    const controlPanelMsg = messages.find(msg => {
      if (msg.author.id !== interaction.client.user.id) return false;
      // Check for traditional components
      if (msg.components?.length > 0) return true;
      // Check for Components V2 flag
      if (msg.flags?.has('IsComponentsV2')) return true;
      // Check for Components V2 by looking at the raw flags bitfield
      if (msg.flags?.bitfield && (msg.flags.bitfield & (1 << 15))) return true;
      return false;
    });
    
    if (!controlPanelMsg) {
      console.log('findAndUpdateControlPanel: Control panel message not found in channel:', channelId);
      console.log('findAndUpdateControlPanel: Found', messages.size, 'messages, bot messages:', messages.filter(m => m.author.id === interaction.client.user.id).size);
      return false;
    }
    
    if (controlPanelMsg) {
      // Show success/error state
      const latestMessageUrl = getLatestMessageUrl(channelId);
      const buildPanel = isSuccess ? controlPanel.buildSuccessStatePanel : controlPanel.buildErrorStatePanel;
      const { components: stateComponents, flags } = buildPanel(
        interaction.guildId,
        channelId,
        ownerId,
        title,
        description,
        { stickyEnabled, latestMessageUrl }
      );
      
      await controlPanelMsg.edit({ components: stateComponents, flags });
      
      // Revert after 1.5 seconds
      setTimeout(async () => {
        try {
          const latestUrl = getLatestMessageUrl(channelId);
          const tempData = dataStore.getTempChannel(channelId);
          const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
            interaction.guildId,
            channelId,
            ownerId,
            { 
              thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
              stickyEnabled,
              latestMessageUrl: latestUrl,
              waitingRoomEnabled
            }
          );
          await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
        } catch (e) {
          // Ignore
        }
      }, 1500);
      
      // Acknowledge the modal with a minimal response
      await interaction.deferUpdate().catch(() => {});
      return true;
    }
  } catch (error) {
    console.error('Error finding control panel:', error);
  }
  
  return false;
}

async function handleNameModalSubmit(interaction, channelId) {
  const nameInput = interaction.fields.getTextInputValue('channel_name');
  const validation = modals.validateChannelName(nameInput);
  const ownerId = dataStore.getChannelOwner(channelId);
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  
  // Check if channel exists first to determine interface type
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    await interaction.reply({ 
      content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists. It may have been deleted.', 
      ephemeral: true 
    }).catch(() => {});
    return;
  }
  
  // Check if user is in the voice channel (if not, they're using universal interface)
  const isUniversal = !channel.members.has(interaction.user.id);
  
  // Acknowledge the modal appropriately based on interface type
  if (isUniversal) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  } else {
    await interaction.deferUpdate().catch(() => {});
  }
  
  if (!validation.valid) {
    if (isUniversal) {
      await interaction.editReply({ 
        content: `❌ **Invalid Name**\n${validation.error}`
      }).catch(() => {});
    } else {
      await interaction.followUp({ 
        content: `❌ **Invalid Name**\n${validation.error}`, 
        ephemeral: true 
      }).catch(() => {});
    }
    return;
  }
  
  try {
    // Verify the channel is still a temp VC owned by this user
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      if (isUniversal) {
        await interaction.editReply({ 
          content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.'
        }).catch(() => {});
      } else {
        await interaction.followUp({ 
          content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.', 
          ephemeral: true 
        }).catch(() => {});
      }
      return;
    }
    
    // Find the control panel message first
    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const controlPanelMsg = messages?.find(msg => {
      if (msg.author.id !== interaction.client.user.id) return false;
      if (msg.components?.length > 0) {
        const firstComponent = msg.components[0];
        if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
        const hasControlPanelCustomId = msg.components.some(row => {
          if (row.components) {
            return row.components.some(comp => {
              const customId = comp.customId || comp.custom_id || comp.data?.custom_id;
              return customId?.startsWith('sticky_note:') ||
                customId?.startsWith('voice_settings:') ||
                customId?.startsWith('voice_permissions:');
            });
          }
          return false;
        });
        if (hasControlPanelCustomId) return true;
      }
      return false;
    });
    
    // Show "Renaming..." notification FIRST for immediate feedback (only if control panel exists)
    if (controlPanelMsg) {
      const latestUrl = getLatestMessageUrl(channelId);
      const { components: renamingComponents, flags: renamingFlags } = controlPanel.buildSuccessStatePanel(
        interaction.guildId,
        channelId,
        ownerId,
        '⏳ Renaming...',
        `Changing name to **${validation.value}**`,
        { stickyEnabled, latestMessageUrl: latestUrl }
      );
      await controlPanelMsg.edit({ components: renamingComponents, flags: renamingFlags }).catch(() => {});
    }
    
    // Now try to rename the channel
    try {
      await channel.setName(validation.value);
      
      // Track successful rename
      trackChannelRename(channelId);
      
      // Save channel name preference
      await voicePreferences.saveChannelName(interaction.user.id, interaction.guildId, validation.value);
      
      // Send ephemeral success message for universal interface users
      if (isUniversal) {
        await interaction.editReply({
          content: `✅ **Channel Renamed**\nName set to **${validation.value}**`
        }).catch(() => {});
      }
      
      // Show success message on control panel (for regular interface)
      if (controlPanelMsg && !isUniversal) {
        const latestUrl = getLatestMessageUrl(channelId);
        const { components: successComponents, flags: successFlags } = controlPanel.buildSuccessStatePanel(
          interaction.guildId,
          channelId,
          ownerId,
          'Channel Renamed',
          `Name set to **${validation.value}**`,
          { stickyEnabled, latestMessageUrl: latestUrl }
        );
        await controlPanelMsg.edit({ components: successComponents, flags: successFlags }).catch(() => {});
        
        // Revert to normal control panel after 1.5 seconds
        setTimeout(async () => {
          try {
            const latestUrl = getLatestMessageUrl(channelId);
            const tempData = dataStore.getTempChannel(channelId);
            const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
              interaction.guildId,
              channelId,
              ownerId,
              { 
                thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
                stickyEnabled,
                latestMessageUrl: latestUrl,
                waitingRoomEnabled
              }
            );
            await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
          } catch (e) {
            // Ignore
          }
        }, 1500);
      }
    } catch (renameError) {
      console.error('Error renaming voice channel:', renameError);
      
      // Check if it's a rate limit error
      const isRateLimit = renameError.code === 50013 || 
                          renameError.message?.includes('rate limit') ||
                          renameError.message?.includes('You are changing your name too fast') ||
                          renameError.code === 20028;
      
      if (isRateLimit) {
        // Send ephemeral rate limit message for universal interface users
        if (isUniversal) {
          const rateLimitUntil = setChannelRateLimit(channelId);
          const remainingMs = rateLimitUntil - Date.now();
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          await interaction.editReply({
            content: `⏳ **Rename Cooldown Active**\nYou can rename again in ${remainingMinutes} minute(s). Discord limits channel renames to 2 per 10 minutes.`
          }).catch(() => {});
        }
        
        // Update control panel with rate limit warning (for regular interface)
        if (controlPanelMsg && !isUniversal) {
        // Set the rate limit and start countdown
        const rateLimitUntil = setChannelRateLimit(channelId);
        const tracking = channelRenameTracking.get(channelId);
        
        // Clear any existing countdown interval
        if (tracking.countdownInterval) {
          clearInterval(tracking.countdownInterval);
          tracking.countdownInterval = null;
        }
        
        // Convert rateLimitUntil from milliseconds to Unix timestamp (seconds)
        const rateLimitUntilSeconds = Math.floor(rateLimitUntil / 1000);
        const latestUrl = getLatestMessageUrl(channelId);
        
        // Show full control panel with rate limit warning using Discord's live timestamp
        const { components: rateLimitComponents, flags } = controlPanel.buildVoiceControlPanelWithRateLimit(
          interaction.guildId,
          channelId,
          ownerId,
          rateLimitUntilSeconds,
          { 
            thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            stickyEnabled,
            latestMessageUrl: latestUrl
          }
        );
        
        try {
          await controlPanelMsg.edit({ components: rateLimitComponents, flags });
        } catch (e) {
          console.error('Error updating control panel with rate limit:', e);
        }
        
        // Revert to normal control panel after 3 seconds (just show the notification briefly)
        setTimeout(async () => {
          try {
            const latestUrl = getLatestMessageUrl(channelId);
            const tempData = dataStore.getTempChannel(channelId);
            const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
              interaction.guildId,
              channelId,
              ownerId,
              { 
                thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
                stickyEnabled,
                latestMessageUrl: latestUrl,
                waitingRoomEnabled
              }
            );
            await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
          } catch (e) {
            // Ignore - message may have been deleted
          }
        }, 3000); // 3 seconds
        }
      } else {
        // Non-rate-limit error
        if (isUniversal) {
          await interaction.editReply({
            content: '❌ **Error**\nFailed to rename channel.'
          }).catch(() => {});
        } else if (controlPanelMsg) {
          // Show error message on control panel
          const latestUrl = getLatestMessageUrl(channelId);
          const { components: errorComponents, flags: errorFlags } = controlPanel.buildErrorStatePanel(
            interaction.guildId,
            channelId,
            ownerId,
            'Error',
            'Failed to rename channel.',
            { stickyEnabled, latestMessageUrl: latestUrl }
          );
          await controlPanelMsg.edit({ components: errorComponents, flags: errorFlags }).catch(() => {});
          
          // Revert after 1.5 seconds
          setTimeout(async () => {
            try {
              const latestUrl = getLatestMessageUrl(channelId);
              const tempData = dataStore.getTempChannel(channelId);
              const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
              const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
                interaction.guildId,
                channelId,
                ownerId,
                { 
                  thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
                  stickyEnabled,
                  latestMessageUrl: latestUrl,
                  waitingRoomEnabled
                }
              );
              await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
            } catch (e) {
              // Ignore
            }
          }, 1500);
        }
      }
    }
  } catch (error) {
    console.error('Error in handleNameModalSubmit:', error);
    if (isUniversal) {
      await interaction.editReply({
        content: '❌ **Error**\nFailed to rename channel.'
      }).catch(() => {});
    } else {
      await findAndUpdateControlPanel(interaction, channelId, 'Error', 'Failed to rename channel.', false);
    }
  }
}

async function handleLimitModalSubmit(interaction, channelId) {
  const limitInput = interaction.fields.getTextInputValue('user_limit');
  const validation = modals.validateUserLimit(limitInput);
  
  if (!validation.valid) {
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Invalid Limit', validation.error, false);
    if (!updated) {
      await interaction.reply({ content: validation.error, ephemeral: true });
    }
    return;
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      const updated = await findAndUpdateControlPanel(interaction, channelId, 'Error', 'Channel not found.', false);
      if (!updated) {
        await interaction.reply({ content: 'Channel not found.', ephemeral: true });
      }
      return;
    }
    
    await channel.setUserLimit(validation.value);
    
    // Save user limit preference
    await voicePreferences.saveUserLimit(interaction.user.id, interaction.guildId, validation.value);
    
    const message = validation.value === 0 ? 'User limit removed' : `Limit set to **${validation.value}**`;
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Limit Updated', message, true);
    if (!updated) {
      const embed = controlPanel.buildSuccessEmbed('User Limit Updated', message);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error setting limit:', error);
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Error', 'Failed to set user limit.', false);
    if (!updated) {
      await interaction.reply({ content: 'Failed to set user limit.', ephemeral: true });
    }
  }
}

async function handleStatusModalSubmit(interaction, channelId) {
  const statusInput = interaction.fields.getTextInputValue('channel_status') || '';
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      const updated = await findAndUpdateControlPanel(interaction, channelId, 'Error', 'Channel not found.', false);
      if (!updated) {
        await interaction.reply({ content: 'Channel not found.', ephemeral: true });
      }
      return;
    }
    
    // Set voice channel status using REST API
    // Discord.js doesn't have a direct method, so we use the REST API
    const { REST, Routes } = require('discord.js');
    const rest = new REST().setToken(interaction.client.token);
    
    await rest.put(
      Routes.channel(channelId) + '/voice-status',
      { body: { status: statusInput || null } }
    );
    
    // Save channel status preference
    await voicePreferences.saveChannelStatus(interaction.user.id, interaction.guildId, statusInput || null);
    
    const message = statusInput ? `Status set to: ${statusInput}` : 'Status cleared';
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Status Updated', message, true);
    if (!updated) {
      const embed = controlPanel.buildSuccessEmbed('Status Updated', message);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error setting status:', error);
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Error', 'Failed to set status.', false);
    if (!updated) {
      await interaction.reply({ content: 'Failed to set status.', ephemeral: true });
    }
  }
}

async function handleBitrateModalSubmit(interaction, channelId) {
  const bitrateInput = interaction.fields.getTextInputValue('bitrate');
  const maxBitrate = getMaxBitrateForTier(interaction.guild?.premiumTier);
  const validation = modals.validateBitrate(bitrateInput, maxBitrate);
  
  if (!validation.valid) {
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Invalid Bitrate', validation.error, false);
    if (!updated) {
      await interaction.reply({ content: validation.error, ephemeral: true });
    }
    return;
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      const updated = await findAndUpdateControlPanel(interaction, channelId, 'Error', 'Channel not found.', false);
      if (!updated) {
        await interaction.reply({ content: 'Channel not found.', ephemeral: true });
      }
      return;
    }
    
    await channel.setBitrate(validation.value);
    
    // Save bitrate preference
    await voicePreferences.saveBitrate(interaction.user.id, interaction.guildId, validation.value);
    
    const message = `Bitrate set to **${validation.value / 1000} kbps**`;
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Bitrate Updated', message, true);
    if (!updated) {
      const embed = controlPanel.buildSuccessEmbed('Bitrate Updated', message);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error setting bitrate:', error);
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Error', 'Failed to set bitrate.', false);
    if (!updated) {
      await interaction.reply({ content: 'Failed to set bitrate.', ephemeral: true });
    }
  }
}

async function handleLfmModalSubmit(interaction, channelId) {
  const message = interaction.fields.getTextInputValue('lfm_message') || '';
  const ownerId = dataStore.getChannelOwner(channelId);
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
  
  // Defer the modal interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer LFM modal:', deferError.message);
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Channel not found.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }
    
    const lfmChannels = dataStore.getLfmChannels(interaction.guildId);
    
    if (lfmChannels.length === 0) {
      await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'No LFM Channels', 'No LFM announcement channels configured.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }
    
    // Admins bypass cooldown check
    if (!hasElevatedPermissions(interaction.member)) {
      const cooldownCheck = voiceManager.checkCooldown(interaction.guildId, interaction.user.id, 'lfm');
      if (!cooldownCheck.allowed) {
        await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Cooldown', cooldownCheck.message, stickyEnabled, latestMessageUrl, thumbnailUrl);
        return;
      }
    }
    
    const { embed, components } = controlPanel.buildLfmAnnouncement(
      channel,
      interaction.user.id,
      message
    );
    
    let sentCount = 0;
    for (const lfmChannelId of lfmChannels) {
      try {
        const lfmChannel = await interaction.guild.channels.fetch(lfmChannelId);
        if (lfmChannel) {
          await lfmChannel.send({ embeds: [embed], components });
          sentCount++;
        }
      } catch (e) {
        console.error(`Failed to send LFM to channel ${lfmChannelId}:`, e);
      }
    }
    
    // Only set cooldown for non-admins
    if (!hasElevatedPermissions(interaction.member)) {
      voiceManager.setCooldown(interaction.guildId, interaction.user.id, 'lfm');
    }
    
    // Show success and revert using the deferred method
    const { components: successComponents, flags } = controlPanel.buildSuccessStatePanel(
      interaction.guildId,
      channelId,
      ownerId,
      'LFM Sent',
      `Announcement sent to ${sentCount} channel(s).`,
      { stickyEnabled, latestMessageUrl, thumbnailUrl }
    );
    
    try {
      await interaction.editReply({ components: successComponents, flags });
    } catch (e) {
      // Fallback to editing the message directly
      await interaction.message?.edit({ components: successComponents, flags }).catch(() => {});
    }
    
    // Revert to normal control panel after delay
    setTimeout(async () => {
      try {
        // Find and update the control panel message
        const messages = await channel.messages.fetch({ limit: 50 });
        const controlPanelMsg = messages.find(msg => {
          if (msg.author.id !== interaction.client.user.id) return false;
          if (msg.components?.length > 0) {
            const firstComponent = msg.components[0];
            if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
          }
          return false;
        });
        
        if (controlPanelMsg) {
          const latestUrl = getLatestMessageUrl(channelId);
          const tempData = dataStore.getTempChannel(channelId);
          const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
            interaction.guildId,
            channelId,
            ownerId,
            { thumbnailUrl, stickyEnabled, latestMessageUrl: latestUrl, waitingRoomEnabled }
          );
          await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
        }
      } catch (e) {
        // Ignore errors when reverting
      }
    }, 1500);
  } catch (error) {
    console.error('Error sending LFM:', error);
    await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Failed to send LFM announcement.', stickyEnabled, latestMessageUrl, thumbnailUrl);
  }
}


async function handleTextModalSubmit(interaction, voiceChannelId) {
  const nameInput = interaction.fields.getTextInputValue('text_channel_name');
  const validation = modals.validateChannelName(nameInput);
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  const stickyEnabled = stickyNotes.isEnabled(voiceChannelId);
  
  // Acknowledge the modal FIRST to prevent timeout
  await interaction.deferUpdate().catch(() => {});
  
  if (!validation.valid) {
    const updated = await findAndUpdateControlPanel(interaction, voiceChannelId, 'Invalid Name', validation.error, false);
    if (!updated) {
      await interaction.followUp({ content: validation.error, ephemeral: true }).catch(() => {});
    }
    return;
  }
  
  try {
    const voiceChannel = await interaction.guild.channels.fetch(voiceChannelId);
    if (!voiceChannel) {
      const updated = await findAndUpdateControlPanel(interaction, voiceChannelId, 'Error', 'Voice channel not found.', false);
      if (!updated) {
        await interaction.followUp({ content: 'Voice channel not found.', ephemeral: true }).catch(() => {});
      }
      return;
    }
    
    // Find the control panel message first
    let controlPanelMsg = null;
    try {
      const messages = await voiceChannel.messages.fetch({ limit: 50 });
      controlPanelMsg = messages.find(msg => {
        if (msg.author.id !== interaction.client.user.id) return false;
        if (msg.components?.length > 0) return true;
        if (msg.flags?.has('IsComponentsV2')) return true;
        if (msg.flags?.bitfield && (msg.flags.bitfield & (1 << 15))) return true;
        return false;
      });
    } catch (e) {
      console.log('Could not find control panel:', e.message);
    }
    
    // Show "Creating..." state in the control panel
    const latestMessageUrl = getLatestMessageUrl(voiceChannelId);
    const unicodeDisplayName = convertToUnicodeBold(validation.value);
    const { components: creatingComponents, flags: creatingFlags } = controlPanel.buildSuccessStatePanel(
      interaction.guildId,
      voiceChannelId,
      ownerId,
      '⏳ Creating Text Channel...',
      `Creating **${unicodeDisplayName}**...`,
      { stickyEnabled, latestMessageUrl }
    );
    
    if (controlPanelMsg) {
      await controlPanelMsg.edit({ components: creatingComponents, flags: creatingFlags }).catch(() => {});
    }
    
    // Now create the channel in the background with Unicode bold text
    const unicodeChannelName = convertToUnicodeBold(validation.value);
    const textChannel = await interaction.guild.channels.create({
      name: unicodeChannelName,
      type: ChannelType.GuildText,
      parent: voiceChannel.parent,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages
          ]
        }
      ]
    });
    
    // Grant access to voice channel members
    for (const [memberId] of voiceChannel.members) {
      if (memberId !== interaction.user.id) {
        await textChannel.permissionOverwrites.edit(memberId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }
    }
    
    // Update data store
    const tempData = dataStore.getTempChannel(voiceChannelId);
    if (tempData) {
      tempData.text_channel_id = textChannel.id;
      dataStore.setTempChannel(voiceChannelId, tempData);
    }
    
    // Send control panel to the new text channel
    const { components, flags } = controlPanel.buildCompactTextControlPanel(
      interaction.guildId,
      textChannel.id,
      voiceChannelId,
      interaction.user.id,
      { stickyEnabled: true }
    );
    const textControlPanelMsg = await textChannel.send({ components, flags });
    
    // Enable sticky notes by default for the text channel
    const textControlPanelUrl = `https://discord.com/channels/${interaction.guildId}/${textChannel.id}/${textControlPanelMsg.id}`;
    stickyNotes.enableStickyNote(textChannel.id, textControlPanelUrl);
    
    // Send ghost ping to notify the channel owner
    const pingMsg = await textChannel.send(`<@${interaction.user.id}>`);
    await pingMsg.delete().catch(() => {});
    
    // Update voice control panel with success message
    const successLatestUrl = getLatestMessageUrl(voiceChannelId);
    const { components: successComponents, flags: successFlags } = controlPanel.buildSuccessStatePanel(
      interaction.guildId,
      voiceChannelId,
      ownerId,
      'Text Channel Created',
      `Created <#${textChannel.id}>`,
      { stickyEnabled, latestMessageUrl: successLatestUrl }
    );
    
    // Edit the message directly since we already used interaction.update
    if (controlPanelMsg) {
      await controlPanelMsg.edit({ components: successComponents, flags: successFlags });
    } else {
      // Try to find it again
      const messages = await voiceChannel.messages.fetch({ limit: 50 });
      const msg = messages.find(m => m.author.id === interaction.client.user.id && m.components?.length > 0);
      if (msg) await msg.edit({ components: successComponents, flags: successFlags });
    }
    
    // Revert to normal control panel after 1.5 seconds
    setTimeout(async () => {
      try {
        const latestUrl = getLatestMessageUrl(voiceChannelId);
        const tempData = dataStore.getTempChannel(voiceChannelId);
        const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
          interaction.guildId,
          voiceChannelId,
          ownerId,
          { 
            thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            stickyEnabled,
            latestMessageUrl: latestUrl,
            waitingRoomEnabled
          }
        );
        
        // Find the message again to edit it
        const messages = await voiceChannel.messages.fetch({ limit: 50 });
        const msg = messages.find(m => m.author.id === interaction.client.user.id && m.components?.length > 0);
        if (msg) await msg.edit({ components: normalComponents, flags: normalFlags });
      } catch (e) {
        // Ignore
      }
    }, 1500);
    
  } catch (error) {
    console.error('Error creating text channel:', error);
    // Show error in control panel
    try {
      const latestMessageUrl = getLatestMessageUrl(voiceChannelId);
      const { components: errorComponents, flags: errorFlags } = controlPanel.buildErrorStatePanel(
        interaction.guildId,
        voiceChannelId,
        ownerId,
        'Error',
        'Failed to create text channel.',
        { stickyEnabled, latestMessageUrl }
      );
      
      const voiceChannel = await interaction.guild.channels.fetch(voiceChannelId).catch(() => null);
      if (voiceChannel) {
        const messages = await voiceChannel.messages.fetch({ limit: 50 });
        const msg = messages.find(m => m.author.id === interaction.client.user.id && m.components?.length > 0);
        if (msg) {
          await msg.edit({ components: errorComponents, flags: errorFlags });
          
          // Revert after 1.5 seconds
          setTimeout(async () => {
            try {
              const latestUrl = getLatestMessageUrl(voiceChannelId);
              const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
                interaction.guildId,
                voiceChannelId,
                ownerId,
                { 
                  thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
                  stickyEnabled,
                  latestMessageUrl: latestUrl
                }
              );
              await msg.edit({ components: normalComponents, flags: normalFlags });
            } catch (e) {
              // Ignore
            }
          }, 1500);
        }
      }
    } catch (e) {
      console.error('Error showing error state:', e);
    }
  }
}

/**
 * Shows the invite options panel with Add Note, Without Note, and Cancel buttons
 */
async function showInviteOptionsPanel(interaction, channelId, ownerId, selectedUsers) {
  try {
    const userIdsStr = selectedUsers.join(',');
    const stickyEnabled = stickyNotes.isEnabled(channelId);
    
    // Build a panel with invite options
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([88, 101, 242]); // Discord blurple
    
    // Get user mentions for display
    const userMentions = selectedUsers.map(id => `<@${id}>`).join(', ');
    
    const headerText = new TextDisplayBuilder().setContent([
      `## 📨 Send Invitation`,
      ``,
      `Selected users: ${userMentions}`,
      ``,
      `Would you like to add a personal note to the invitation?`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    
    // Add Note button
    const addNoteButton = new ButtonBuilder()
      .setCustomId(`invite_with_note:${channelId}:${ownerId}:${userIdsStr}`)
      .setLabel('Add Note')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝');
    
    // Without Note button
    const withoutNoteButton = new ButtonBuilder()
      .setCustomId(`invite_without_note:${channelId}:${ownerId}:${userIdsStr}`)
      .setLabel('Without Note')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📨');
    
    // Cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_action:${channelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');
    
    const buttonsRow = new ActionRowBuilder().addComponents(addNoteButton, withoutNoteButton, cancelButton);
    container.addActionRowComponents(buttonsRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 5 minutes if no action taken
    setTimeout(async () => {
      try {
        const message = await interaction.message.fetch().catch(() => null);
        if (!message) return;
        
        // Check if it's still showing the invite options panel
        const hasInviteButton = message.components.some(row => 
          row.components?.some(comp => comp.customId?.startsWith('invite_with_note:') || comp.customId?.startsWith('invite_without_note:'))
        );
        
        if (hasInviteButton) {
          const latestMessageUrl = getLatestMessageUrl(channelId);
          const tempData = dataStore.getTempChannel(channelId);
          const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
            interaction.guildId,
            channelId,
            ownerId,
            { 
              thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
              stickyEnabled,
              latestMessageUrl,
              waitingRoomEnabled
            }
          );
          await message.edit({ components: normalComponents, flags: normalFlags });
        }
      } catch (error) {
        // Message may have been deleted, ignore
      }
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Error showing invite options panel:', error);
    await interaction.reply({ content: 'Failed to show invite options.', ephemeral: true });
  }
}

/**
 * Shows the reject type panel with "Current Users" and "Upcoming Users/Roles" buttons
 */
async function showRejectTypePanel(interaction, channelId, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(channelId);
  
  try {
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent for reject
    
    const headerText = new TextDisplayBuilder().setContent([
      `## ❌ Reject Users/Roles`,
      ``,
      `Choose the type of rejection:`,
      ``,
      `**Current Users** - Reject and disconnect users currently in the channel`,
      `**Upcoming Users/Roles** - Prevent users/roles from joining in the future`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    
    // Current Users button (users only)
    const currentButton = new ButtonBuilder()
      .setCustomId(`reject_current:${channelId}:${ownerId}`)
      .setLabel('Current Users')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👥');
    
    // Upcoming Users/Roles button (users + roles)
    const upcomingButton = new ButtonBuilder()
      .setCustomId(`reject_upcoming:${channelId}:${ownerId}`)
      .setLabel('Upcoming Users/Roles')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🚫');
    
    // Only add cancel button for regular interface (not universal)
    const buttons = [currentButton, upcomingButton];
    if (!isUniversal) {
      const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_action:${channelId}:${ownerId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');
      buttons.push(cancelButton);
    }
    
    const buttonsRow = new ActionRowBuilder().addComponents(...buttons);
    container.addActionRowComponents(buttonsRow);
    
    // For universal interface, send ephemeral message; for regular interface, update the panel
    if (isUniversal) {
      await interaction.reply({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
        ephemeral: true
      });
      return; // Don't set up auto-revert for ephemeral messages
    }
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 5 minutes
    setupAutoRevert(interaction, channelId, ownerId, 'reject_current:', 'reject_upcoming:');
  } catch (error) {
    console.error('Error showing reject type panel:', error);
    await interaction.reply({ content: 'Failed to show reject options.', ephemeral: true });
  }
}

/**
 * Handles the "Current Users" button - shows user select for current rejection (users only)
 */
async function handleRejectCurrentButton(interaction, channelId, ownerId) {
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  try {
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent
    
    const headerText = new TextDisplayBuilder().setContent([
      `## ❌ Reject Current Users`,
      ``,
      `Select a user to reject and disconnect:`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    
    // User select menu (users only) - only 1 selection at a time
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(`user_select:reject_current:${channelId}`)
      .setPlaceholder('Select a user to reject')
      .setMinValues(1)
      .setMaxValues(1);
    
    const selectRow = new ActionRowBuilder().addComponents(userSelect);
    container.addActionRowComponents(selectRow);
    
    // Cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_action:${channelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
    container.addActionRowComponents(cancelRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 2 minutes
    setupAutoRevert(interaction, channelId, ownerId, 'user_select:reject_current:');
  } catch (error) {
    console.error('Error showing reject current panel:', error);
    await interaction.reply({ content: 'Failed to show reject options.', ephemeral: true });
  }
}

/**
 * Handles the "Upcoming Users/Roles" button - shows mentionable select for upcoming rejection
 */
async function handleRejectUpcomingButton(interaction, channelId, ownerId) {
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  try {
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags, MentionableSelectMenuBuilder } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent
    
    const headerText = new TextDisplayBuilder().setContent([
      `## 🚫 Reject Upcoming Users/Roles`,
      ``,
      `Select a user or role to prevent from joining:`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    
    // Mentionable select menu (users + roles) - only 1 selection at a time
    const mentionableSelect = new MentionableSelectMenuBuilder()
      .setCustomId(`mentionable_select:reject_upcoming:${channelId}`)
      .setPlaceholder('Select a user or role to reject')
      .setMinValues(1)
      .setMaxValues(1);
    
    const selectRow = new ActionRowBuilder().addComponents(mentionableSelect);
    container.addActionRowComponents(selectRow);
    
    // Cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_action:${channelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
    container.addActionRowComponents(cancelRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 5 minutes
    setupAutoRevert(interaction, channelId, ownerId, 'mentionable_select:reject_upcoming:');
  } catch (error) {
    console.error('Error showing reject upcoming panel:', error);
    await interaction.reply({ content: 'Failed to show reject options.', ephemeral: true });
  }
}

/**
 * Handles rejecting a current user (shows reject options panel with reason choice)
 * Only allows rejecting users who are currently in the voice channel
 */
async function handleRejectCurrentUser(interaction, channelId, ownerId, userId) {
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });

  try {
    // Fetch the voice channel
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Channel not found.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }

    // Check if the user is currently in the voice channel
    const isInChannel = channel.members.has(userId);
    if (!isInChannel) {
      await showErrorAndRevert(
        interaction,
        channelId,
        ownerId,
        'User Not in Channel',
        'This user is not currently in the voice channel.\n\nUse **Upcoming Users/Roles** to reject users who are not in the channel.',
        stickyEnabled,
        latestMessageUrl,
        thumbnailUrl
      );
      return;
    }

    // Check if trying to reject themselves
    if (userId === ownerId) {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Cannot Reject', 'You cannot reject yourself.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }

    // Check if target user has elevated permissions
    const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
    if (targetMember && hasElevatedPermissions(targetMember)) {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Cannot Reject', 'You cannot reject moderators or administrators.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }
  } catch (e) {
    console.log('Could not check target user:', e.message);
  }

  // Show reject options panel (Add Reason / Without Reason / Cancel)
  await showRejectOptionsPanel(interaction, channelId, ownerId, [userId], true);
}

/**
 * Handles rejecting a role for current (no reason buttons, just reject)
 */
async function handleRejectCurrentRole(interaction, channelId, ownerId, roleId) {
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
  
  // Defer the interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer reject role interaction:', deferError.message);
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Channel not found.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }
    
    // Reject the role
    await channel.permissionOverwrites.edit(roleId, {
      Connect: false
    });
    
    // Disconnect all members with this role who are in the channel
    const role = interaction.guild.roles.cache.get(roleId);
    let disconnectedCount = 0;
    let skippedElevatedCount = 0;
    const roleName = role ? role.name : 'Unknown Role';
    
    if (role) {
      for (const [memberId, member] of channel.members) {
        if (member.roles.cache.has(roleId) && memberId !== ownerId) {
          // Skip members with elevated permissions (Admin, Ban Members, Kick Members)
          if (hasElevatedPermissions(member)) {
            skippedElevatedCount++;
            continue;
          }
          
          await member.voice.disconnect('Role rejected by channel owner');
          disconnectedCount++;
          
          // Track as current rejection for permit DM later
          trackCurrentRejection(channelId, memberId);
          
          // Send DM to the rejected member
          // Note: Role mentions don't work in DMs, so use role name with emoji
          const roleDisplay = role.unicodeEmoji 
            ? `${role.unicodeEmoji} ${roleName}` 
            : `@${roleName}`;
          
          try {
            const { embed: rejectEmbed, components: rejectComponents } = controlPanel.buildRejectNotificationEmbed({
              channelName: channel.name,
              channelId: channelId,
              guildId: interaction.guildId,
              serverName: interaction.guild.name,
              rejectedById: interaction.user.id,
              reason: `Role ${roleDisplay} was rejected`,
              serverIconUrl: interaction.guild.iconURL({ dynamic: true })
            });
            await member.send({ embeds: [rejectEmbed], components: rejectComponents });
          } catch (dmError) {
            console.log(`Could not send reject DM to role member ${memberId}:`, dmError.message);
          }
        }
      }
    }
    
    let message = `Role <@&${roleId}> has been rejected from this channel.`;
    if (disconnectedCount > 0) {
      message += ` ${disconnectedCount} member(s) with this role were disconnected.`;
    }
    if (skippedElevatedCount > 0) {
      message += ` ${skippedElevatedCount} moderator(s)/admin(s) were not affected.`;
    }
    
    // Show success using deferred method
    const { components, flags } = controlPanel.buildSuccessStatePanel(
      interaction.guildId,
      channelId,
      ownerId,
      'Role Rejected',
      message,
      { stickyEnabled, thumbnailUrl, latestMessageUrl }
    );
    
    try {
      await interaction.editReply({ components, flags });
    } catch (e) {
      await interaction.message.edit({ components, flags }).catch(() => {});
    }
    
    // Revert to normal control panel after delay
    setTimeout(async () => {
      try {
        const msg = await interaction.message.fetch().catch(() => null);
        if (!msg) return;
        const latestUrl = getLatestMessageUrl(channelId);
        const tempData = dataStore.getTempChannel(channelId);
        const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
          interaction.guildId,
          channelId,
          ownerId,
          { thumbnailUrl, stickyEnabled, latestMessageUrl: latestUrl, waitingRoomEnabled }
        );
        await msg.edit({ components: normalComponents, flags: normalFlags });
      } catch (e) {}
    }, 1500);
  } catch (error) {
    console.error('Error rejecting role:', error);
    await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Failed to reject role.', stickyEnabled, latestMessageUrl, thumbnailUrl);
  }
}

/**
 * Handles rejecting upcoming users/roles (no disconnect, no reason options)
 * Note: Does NOT send DMs for upcoming rejections - only for current users
 */
async function handleRejectUpcoming(interaction, channelId, ownerId, selectedIds, isRole = false) {
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
  
  // Defer the interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer reject upcoming interaction:', deferError.message);
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Channel not found.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }
    
    const id = selectedIds[0];
    
    // Check if trying to reject a bot (only for users, not roles)
    if (!isRole) {
      try {
        const targetMember = await interaction.guild.members.fetch(id).catch(() => null);
        if (targetMember && targetMember.user.bot) {
          await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Cannot Reject Bot', 'You cannot reject bots from your voice channel.', stickyEnabled, latestMessageUrl, thumbnailUrl);
          return;
        }
      } catch (e) {
        console.log('Could not check if target is bot:', e.message);
      }
    }
    
    await channel.permissionOverwrites.edit(id, {
      Connect: false
    });
    
    // Save rejected user/role to preferences
    if (isRole) {
      await voicePreferences.addRejectedRole(interaction.user.id, interaction.guildId, id);
    } else {
      await voicePreferences.addRejectedUser(interaction.user.id, interaction.guildId, id);
    }
    
    let message;
    if (isRole) {
      const role = interaction.guild.roles.cache.get(id);
      message = `Role <@&${id}> has been rejected from joining this channel.`;
      // Note: No DMs sent for upcoming role rejections
    } else {
      message = `<@${id}> has been rejected from joining this channel.`;
      // Note: No DMs sent for upcoming user rejections
    }
    
    // Show success using deferred method
    const { components, flags } = controlPanel.buildSuccessStatePanel(
      interaction.guildId,
      channelId,
      ownerId,
      isRole ? 'Role Rejected' : 'User Rejected',
      message,
      { stickyEnabled, thumbnailUrl, latestMessageUrl }
    );
    
    try {
      await interaction.editReply({ components, flags });
    } catch (e) {
      await interaction.message.edit({ components, flags }).catch(() => {});
    }
    
    // Revert to normal control panel after delay
    setTimeout(async () => {
      try {
        const msg = await interaction.message.fetch().catch(() => null);
        if (!msg) return;
        const latestUrl = getLatestMessageUrl(channelId);
        const tempData = dataStore.getTempChannel(channelId);
        const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
          interaction.guildId,
          channelId,
          ownerId,
          { thumbnailUrl, stickyEnabled, latestMessageUrl: latestUrl, waitingRoomEnabled }
        );
        await msg.edit({ components: normalComponents, flags: normalFlags });
      } catch (e) {}
    }, 1500);
  } catch (error) {
    console.error('Error rejecting upcoming users:', error);
    await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Failed to reject.', stickyEnabled, latestMessageUrl, thumbnailUrl);
  }
}

/**
 * Shows the permit select menu with only rejected users/roles
 */
async function showPermitRejectedSelect(interaction, channelId, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(channelId);
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      if (isUniversal) {
        await interaction.reply({ content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.', ephemeral: true });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Channel not found.');
      }
      return;
    }
    
    // Get rejected users/roles from permission overwrites
    const rejectedEntries = [];
    
    for (const [id, overwrite] of channel.permissionOverwrites.cache) {
      // Check if Connect is explicitly denied
      if (overwrite.deny.has(PermissionFlagsBits.Connect)) {
        // Skip @everyone role
        if (id === interaction.guild.id) continue;
        
        // Try to get as user first, then as role
        try {
          const member = await interaction.guild.members.fetch(id).catch(() => null);
          if (member) {
            rejectedEntries.push({
              id: id,
              type: 'user',
              displayName: member.displayName,
              username: member.user.username
            });
          } else {
            const role = interaction.guild.roles.cache.get(id);
            if (role) {
              rejectedEntries.push({
                id: id,
                type: 'role',
                displayName: role.name,
                username: role.name
              });
            }
          }
        } catch (e) {
          // Skip if we can't fetch
        }
      }
    }
    
    if (rejectedEntries.length === 0) {
      // Show info message
      if (isUniversal) {
        await interaction.reply({ content: '❌ **No Rejected Users**\nNo rejected users or roles found for this channel.', ephemeral: true });
      } else {
        await showErrorAndRevert(interaction, channelId, ownerId, 'No Rejected Users', 'No rejected users or roles found for this channel.');
      }
      return;
    }
    
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([87, 242, 135]); // Green accent for permit
    
    const headerText = new TextDisplayBuilder().setContent([
      `## ✅ Permit Users/Roles`,
      ``,
      `Select rejected users or roles to permit:`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    
    // Build string select menu with rejected entries
    const options = rejectedEntries.slice(0, 25).map(entry => ({
      label: entry.type === 'user' ? `@${entry.displayName}` : `@${entry.displayName}`,
      description: entry.type === 'user' ? `@${entry.username}` : `Role: ${entry.username}`,
      value: entry.id,
      emoji: entry.type === 'user' ? '👤' : '👥'
    }));
    
    const permitSelect = new StringSelectMenuBuilder()
      .setCustomId(`permit_rejected:${channelId}:${ownerId}`)
      .setPlaceholder('Select users/roles to permit')
      .setMinValues(1)
      .setMaxValues(Math.min(options.length, 10))
      .addOptions(options);
    
    const selectRow = new ActionRowBuilder().addComponents(permitSelect);
    container.addActionRowComponents(selectRow);
    
    // Only add cancel button for regular interface (not universal)
    if (!isUniversal) {
      const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_action:${channelId}:${ownerId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');
      
      const cancelRow = new ActionRowBuilder().addComponents(cancelButton);
      container.addActionRowComponents(cancelRow);
    }
    
    // For universal interface, send ephemeral message; for regular interface, update the panel
    if (isUniversal) {
      await interaction.reply({ 
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
        ephemeral: true
      });
      return; // Don't set up auto-revert for ephemeral messages
    }
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 5 minutes
    setupAutoRevert(interaction, channelId, ownerId, 'permit_rejected:');
  } catch (error) {
    console.error('Error showing permit rejected select:', error);
    // Try to show error in control panel, fallback to ephemeral
    try {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Failed to show permit options.');
    } catch (e) {
      await interaction.reply({ content: 'Failed to show permit options.', ephemeral: true }).catch(() => {});
    }
  }
}

/**
 * Helper function to store rejected IDs for a channel
 */
function storeRejectedIds(channelId, ids, guild) {
  // This is handled by Discord's permission overwrites, no need for separate storage
  // The permit function reads directly from permission overwrites
}

/**
 * Helper function to set up auto-revert timeout
 */
function setupAutoRevert(interaction, channelId, ownerId, ...customIdPrefixes) {
  setTimeout(async () => {
    try {
      const message = await interaction.message.fetch().catch(() => null);
      if (!message) return;
      
      // Check if it's still showing the panel by looking for the custom ID prefixes
      const hasPanel = message.components.some(row => 
        row.components?.some(comp => 
          customIdPrefixes.some(prefix => comp.customId?.startsWith(prefix))
        )
      );
      
      if (hasPanel) {
        const stickyEnabled = stickyNotes.isEnabled(channelId);
        const latestMessageUrl = getLatestMessageUrl(channelId);
        const tempData = dataStore.getTempChannel(channelId);
        const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
        const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
          interaction.guildId,
          channelId,
          ownerId,
          { 
            thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
            stickyEnabled,
            latestMessageUrl,
            waitingRoomEnabled
          }
        );
        await message.edit({ components: normalComponents, flags: normalFlags });
      }
    } catch (error) {
      // Message may have been deleted, ignore
    }
  }, 5 * 60 * 1000);
}

/**
 * Shows the reject options panel with Add Reason, Without Reason, and Cancel buttons
 * @param {boolean} isCurrent - If true, this is for current users (can disconnect)
 */
async function showRejectOptionsPanel(interaction, channelId, ownerId, selectedUsers, isCurrent = false) {
  try {
    const userIdsStr = selectedUsers.join(',');
    const stickyEnabled = stickyNotes.isEnabled(channelId);
    
    // Build a panel with reject options
    const { ContainerBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
    
    const container = new ContainerBuilder()
      .setAccentColor([237, 66, 69]); // Red accent for reject
    
    // Get user/role mentions for display
    const mentions = selectedUsers.map(id => `<@${id}>`).join(', ');
    
    const headerText = new TextDisplayBuilder().setContent([
      `## ❌ Reject Users/Roles`,
      ``,
      `Selected: ${mentions}`,
      ``,
      isCurrent 
        ? `Would you like to add a reason? Users in the channel will be disconnected.`
        : `Would you like to add a reason for the rejection?`
    ].join('\n'));
    
    container.addTextDisplayComponents(headerText);
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    
    // Add Reason button - include isCurrent flag
    const addReasonButton = new ButtonBuilder()
      .setCustomId(`reject_with_reason:${channelId}:${ownerId}:${userIdsStr}:${isCurrent ? '1' : '0'}`)
      .setLabel('Add Reason')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝');
    
    // Without Reason button - include isCurrent flag
    const withoutReasonButton = new ButtonBuilder()
      .setCustomId(`reject_without_reason:${channelId}:${ownerId}:${userIdsStr}:${isCurrent ? '1' : '0'}`)
      .setLabel('Without Reason')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    // Cancel button
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_action:${channelId}:${ownerId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🚫');
    
    const buttonsRow = new ActionRowBuilder().addComponents(addReasonButton, withoutReasonButton, cancelButton);
    container.addActionRowComponents(buttonsRow);
    
    await interaction.update({ 
      components: [container],
      flags: [MessageFlags.IsComponentsV2]
    });
    
    // Auto-revert after 5 minutes if no action taken
    setupAutoRevert(interaction, channelId, ownerId, 'reject_with_reason:', 'reject_without_reason:');
  } catch (error) {
    console.error('Error showing reject options panel:', error);
    await interaction.reply({ content: 'Failed to show reject options.', ephemeral: true });
  }
}

/**
 * Handles the "Add Reason" button for reject - shows the reject reason modal
 */
async function handleRejectWithReasonButton(interaction, channelId, ownerId, userIdsStr, isCurrent) {
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  // Pass isCurrent flag to modal (will be used in modal submit handler)
  await interaction.showModal(modals.buildRejectReasonModal(channelId, userIdsStr, isCurrent === '1'));
  await refreshControlPanelAfterModal(interaction, channelId, ownerId);
}

/**
 * Handles the "Without Reason" button for reject - rejects users without a reason
 */
async function handleRejectWithoutReasonButton(interaction, channelId, ownerId, userIdsStr, isCurrent) {
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  const userId = userIdsStr; // Only 1 user at a time now
  const shouldDisconnect = isCurrent === '1';
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
  
  // Check if target user has elevated permissions (Admin, Ban Members, Kick Members)
  try {
    const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
    if (targetMember && hasElevatedPermissions(targetMember)) {
      await showErrorAndRevert(
        interaction,
        channelId,
        ownerId,
        'Cannot Reject User',
        'This user has elevated permissions (Administrator, Ban Members, or Kick Members).'
      );
      return;
    }
  } catch (e) {
    console.log('Could not check target member permissions:', e.message);
  }
  
  // Defer the interaction immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer reject interaction:', deferError.message);
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Channel not found.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      return;
    }
    
    // Reject the user
    await channel.permissionOverwrites.edit(userId, {
      Connect: false
    });
    
    // Disconnect if current user and they're in the channel
    if (shouldDisconnect && channel.members.has(userId)) {
      const member = channel.members.get(userId);
      await member.voice.disconnect('Rejected by channel owner');
      
      // Track as current rejection for permit DM later
      trackCurrentRejection(channelId, userId);
      
      // Send DM to the rejected user (current users only)
      try {
        const { embed: rejectEmbed, components: rejectComponents } = controlPanel.buildRejectNotificationEmbed({
          channelName: channel.name,
          channelId: channelId,
          guildId: interaction.guildId,
          serverName: interaction.guild.name,
          rejectedById: interaction.user.id,
          reason: null,
          serverIconUrl: interaction.guild.iconURL({ dynamic: true })
        });
        await member.send({ embeds: [rejectEmbed], components: rejectComponents });
      } catch (dmError) {
        console.log(`Could not send reject DM to ${userId}:`, dmError.message);
      }
    }
    
    // Refresh the control panel (deferred update)
    const tempData = dataStore.getTempChannel(channelId);
    const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
    const { components, flags } = controlPanel.buildCompactVoiceControlPanel(
      interaction.guildId,
      channelId,
      ownerId,
      { thumbnailUrl, stickyEnabled, latestMessageUrl, waitingRoomEnabled }
    );
    
    await interaction.editReply({ components, flags });
  } catch (error) {
    console.error('Error rejecting user:', error);
    await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Failed to reject user.', stickyEnabled, latestMessageUrl, thumbnailUrl);
  }
}

/**
 * Handles the "Add Note" button - shows the invite note modal
 */
async function handleInviteWithNoteButton(interaction, channelId, ownerId, userIdsStr) {
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  await interaction.showModal(modals.buildInviteNoteModal(channelId, userIdsStr));
  await refreshControlPanelAfterModal(interaction, channelId, ownerId);
}

/**
 * Handles the "Without Note" button - sends invites without a note
 */
async function handleInviteWithoutNoteButton(interaction, channelId, ownerId, userIdsStr) {
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  const userIds = userIdsStr.split(',');
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Channel not found.');
      return;
    }
    
    // Get temp channel data for created time
    const tempData = dataStore.getTempChannel(channelId);
    const createdAt = tempData?.created_at || new Date().toISOString();
    
    // Get current members in the channel as user IDs for mentions
    const currentMembers = channel.members.map(m => m.user.id);
    
    // Get server icon
    const serverIconUrl = interaction.guild.iconURL({ dynamic: true, size: 128 });
    
    let sentCount = 0;
    const sentInvitations = tempData?.sent_invitations || [];
    
    for (const userId of userIds) {
      try {
        const user = await interaction.client.users.fetch(userId);
        
        // Grant the invited user permission to connect (bypass lock)
        await channel.permissionOverwrites.edit(userId, {
          Connect: true,
          ViewChannel: true
        }).catch(e => console.log(`Could not grant connect permission to ${userId}:`, e.message));
        
        // Use invitation embed format without note
        const { embed, components } = controlPanel.buildInvitationEmbed({
          channelName: channel.name,
          channelId: channelId,
          guildId: interaction.guildId,
          serverName: interaction.guild.name,
          invitedBy: interaction.user,
          createdAt: createdAt,
          currentMembers: currentMembers,
          serverIconUrl: serverIconUrl,
          note: '' // No note
        });
        
        const dmMessage = await user.send({ embeds: [embed], components });
        sentCount++;
        
        // Track the sent invitation for later update when channel is deleted
        sentInvitations.push({
          recipientId: userId,
          messageId: dmMessage.id,
          guildId: interaction.guildId,
          channelName: channel.name,
          serverName: interaction.guild.name,
          invitedById: interaction.user.id,
          invitedByUsername: interaction.user.username,
          createdAt: createdAt,
          serverIconUrl: serverIconUrl,
          note: ''
        });
      } catch (e) {
        console.error(`Failed to send invite to user ${userId}:`, e);
      }
    }
    
    // Save the invitation tracking data
    if (tempData) {
      tempData.sent_invitations = sentInvitations;
      dataStore.setTempChannel(channelId, tempData);
    }
    
    await showSuccessAndRevert(
      interaction,
      channelId,
      ownerId,
      'Invitations Sent',
      `Sent ${sentCount} invitation(s).`
    );
  } catch (error) {
    console.error('Error sending invites:', error);
    await showErrorAndRevert(interaction, channelId, ownerId, 'Error', 'Failed to send invitations.');
  }
}

async function handleInviteModalSubmit(interaction, channelId, userIdsStr) {
  const note = interaction.fields.getTextInputValue('invite_note') || '';
  const userIds = userIdsStr.split(',');
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await interaction.reply({ content: 'Channel not found.', ephemeral: true });
      return;
    }
    
    // Get temp channel data for created time
    const tempData = dataStore.getTempChannel(channelId);
    const createdAt = tempData?.created_at || new Date().toISOString();
    
    // Get current members in the channel as user IDs for mentions
    const currentMembers = channel.members.map(m => m.user.id);
    
    // Get server icon
    const serverIconUrl = interaction.guild.iconURL({ dynamic: true, size: 128 });
    
    let sentCount = 0;
    const sentInvitations = tempData?.sent_invitations || [];
    
    for (const userId of userIds) {
      try {
        const user = await interaction.client.users.fetch(userId);
        
        // Grant the invited user permission to connect (bypass lock)
        await channel.permissionOverwrites.edit(userId, {
          Connect: true,
          ViewChannel: true
        }).catch(e => console.log(`Could not grant connect permission to ${userId}:`, e.message));
        
        // Use new invitation embed format with note
        const { embed, components } = controlPanel.buildInvitationEmbed({
          channelName: channel.name,
          channelId: channelId,
          guildId: interaction.guildId,
          serverName: interaction.guild.name,
          invitedBy: interaction.user,
          createdAt: createdAt,
          currentMembers: currentMembers,
          serverIconUrl: serverIconUrl,
          note: note // Include the note from modal
        });
        
        const dmMessage = await user.send({ embeds: [embed], components });
        sentCount++;
        
        // Track the sent invitation for later update when channel is deleted
        sentInvitations.push({
          recipientId: userId,
          messageId: dmMessage.id,
          guildId: interaction.guildId,
          channelName: channel.name,
          serverName: interaction.guild.name,
          invitedById: interaction.user.id,
          invitedByUsername: interaction.user.username,
          createdAt: createdAt,
          serverIconUrl: serverIconUrl,
          note: note
        });
      } catch (e) {
        console.error(`Failed to send invite to user ${userId}:`, e);
      }
    }
    
    // Save the invitation tracking data
    if (tempData) {
      tempData.sent_invitations = sentInvitations;
      dataStore.setTempChannel(channelId, tempData);
    }
    
    // Update control panel with success message
    const ownerId = dataStore.getChannelOwner(channelId);
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Invitations Sent', `Sent ${sentCount} invitation(s) with note.`, true);
    if (!updated) {
      const embed = controlPanel.buildSuccessEmbed(
        'Invitations Sent',
        `Sent ${sentCount} invitation(s).`
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error sending invites:', error);
    const ownerId = dataStore.getChannelOwner(channelId);
    const updated = await findAndUpdateControlPanel(interaction, channelId, 'Error', 'Failed to send invitations.', false);
    if (!updated) {
      await interaction.reply({ content: 'Failed to send invitations.', ephemeral: true });
    }
  }
}

async function handleRejectModalSubmit(interaction, channelId, userIdsStr, isCurrent) {
  const reason = interaction.fields.getTextInputValue('reject_reason') || '';
  const shouldDisconnect = isCurrent === '1';
  
  const userId = userIdsStr; // Only 1 user at a time now
  const ownerId = dataStore.getChannelOwner(channelId);
  
  // Check if target user has elevated permissions (Admin, Ban Members, Kick Members)
  try {
    const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
    if (targetMember && hasElevatedPermissions(targetMember)) {
      await findAndUpdateControlPanel(
        interaction,
        channelId,
        'Cannot Reject User',
        'This user has elevated permissions (Administrator, Ban Members, or Kick Members).',
        false
      );
      return;
    }
  } catch (e) {
    console.log('Could not check target member permissions:', e.message);
  }
  
  // Defer the modal immediately to prevent timeout
  try {
    await interaction.deferUpdate();
  } catch (deferError) {
    console.log('Could not defer reject modal:', deferError.message);
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      return; // Can't reply after deferUpdate, just log
    }
    
    // Reject the user
    await channel.permissionOverwrites.edit(userId, {
      Connect: false
    });
    
    if (shouldDisconnect && channel.members.has(userId)) {
      const member = channel.members.get(userId);
      await member.voice.disconnect(reason || 'Rejected by channel owner');
      
      // Track as current rejection for permit DM later
      trackCurrentRejection(channelId, userId);
      
      // Send DM to the rejected user (current users only)
      try {
        const { embed: rejectEmbed, components: rejectComponents } = controlPanel.buildRejectNotificationEmbed({
          channelName: channel.name,
          channelId: channelId,
          guildId: interaction.guildId,
          serverName: interaction.guild.name,
          rejectedById: interaction.user.id,
          reason: reason || null,
          serverIconUrl: interaction.guild.iconURL({ dynamic: true })
        });
        await member.send({ embeds: [rejectEmbed], components: rejectComponents });
      } catch (dmError) {
        console.log(`Could not send reject DM to ${userId}:`, dmError.message);
      }
    }
  } catch (error) {
    console.error('Error rejecting user:', error);
  }
}

async function handleTextNameModalSubmit(interaction, textChannelId, voiceChannelId) {
  const nameInput = interaction.fields.getTextInputValue('text_channel_name');
  const validation = modals.validateChannelName(nameInput);
  const ownerId = dataStore.getChannelOwner(voiceChannelId);
  
  console.log('handleTextNameModalSubmit called:', { textChannelId, voiceChannelId, nameInput });
  
  // Acknowledge the modal FIRST to prevent "interaction failed" errors
  await interaction.deferUpdate().catch(() => {});
  
  try {
    const textChannel = await interaction.guild.channels.fetch(textChannelId);
    console.log('Text channel fetched:', textChannel?.name);
    
    // Find the control panel message in the text channel
    // Must exclude sticky note messages (which only have Link buttons, no customId)
    const messages = await textChannel.messages.fetch({ limit: 50 });
    console.log('Fetched messages count:', messages.size);
    
    const controlPanelMsg = messages.find(msg => {
      if (msg.author.id !== interaction.client.user.id) return false;
      
      // Check for Components V2 control panel (has Container type 17)
      if (msg.components?.length > 0) {
        const firstComponent = msg.components[0];
        
        // Components V2 containers have type 17
        if (firstComponent.type === 17 || firstComponent.data?.type === 17) {
          return true;
        }
        
        // Check for action rows with our control panel custom IDs
        // This excludes sticky notes which only have Link buttons (no customId)
        const hasControlPanelCustomId = msg.components.some(row => {
          if (row.components) {
            return row.components.some(comp => {
              const customId = comp.customId || comp.custom_id || comp.data?.custom_id;
              // Control panel buttons/selects have these prefixes
              return customId?.startsWith('text_settings:') ||
                customId?.startsWith('text_take_actions:') ||
                customId?.startsWith('text_remove_actions:') ||
                customId?.startsWith('text_edit_name:') ||
                customId?.startsWith('text_delete:') ||
                customId?.startsWith('text_sticky:') ||
                customId?.startsWith('sticky_note:');
            });
          }
          return false;
        });
        
        if (hasControlPanelCustomId) return true;
      }
      
      // Check for IsComponentsV2 flag
      if (msg.flags?.has('IsComponentsV2')) return true;
      
      return false;
    });
    
    console.log('Control panel message found:', controlPanelMsg?.id);
    
    const stickyEnabled = stickyNotes.isEnabled(textChannelId);
    const latestMessageUrl = getLatestMessageUrl(textChannelId);
    
    // Validation error - show in control panel
    if (!validation.valid) {
      if (controlPanelMsg) {
        const { components: errorComponents, flags } = controlPanel.buildErrorStatePanel(
          interaction.guildId,
          textChannelId,
          ownerId,
          'Invalid Name',
          validation.error,
          { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
        );
        await controlPanelMsg.edit({ components: errorComponents, flags });
        
        // Revert after 1.5 seconds
        setTimeout(async () => {
          try {
            const latestUrl = getLatestMessageUrl(textChannelId);
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
              interaction.guildId,
              textChannelId,
              voiceChannelId,
              ownerId,
              { stickyEnabled, latestMessageUrl: latestUrl }
            );
            await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
          } catch (e) {
            // Ignore
          }
        }, 1500);
      }
      return;
    }
    
    if (!textChannel) {
      if (controlPanelMsg) {
        const { components: errorComponents, flags } = controlPanel.buildErrorStatePanel(
          interaction.guildId,
          textChannelId,
          ownerId,
          'Error',
          'Text channel not found.',
          { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
        );
        await controlPanelMsg.edit({ components: errorComponents, flags });
        
        setTimeout(async () => {
          try {
            const latestUrl = getLatestMessageUrl(textChannelId);
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
              interaction.guildId,
              textChannelId,
              voiceChannelId,
              ownerId,
              { stickyEnabled, latestMessageUrl: latestUrl }
            );
            await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
          } catch (e) {
            // Ignore
          }
        }, 1500);
      }
      return;
    }
    
    // Show "Renaming..." notification FIRST for immediate feedback
    if (controlPanelMsg) {
      const unicodeDisplayName = convertToUnicodeBold(validation.value);
      const { components: renamingComponents, flags: renamingFlags } = controlPanel.buildSuccessStatePanel(
        interaction.guildId,
        textChannelId,
        ownerId,
        '⏳ Renaming...',
        `Changing name to **${unicodeDisplayName}**`,
        { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
      );
      await controlPanelMsg.edit({ components: renamingComponents, flags: renamingFlags }).catch(() => {});
    }
    
    // Now try to rename the channel with Unicode bold text - may fail due to rate limiting
    try {
      const unicodeChannelName = convertToUnicodeBold(validation.value);
      console.log('Attempting to rename channel to:', unicodeChannelName);
      await textChannel.setName(unicodeChannelName);
      console.log('Channel renamed successfully to:', unicodeChannelName);
    } catch (renameError) {
      console.error('Error renaming channel:', renameError);
      
      // Check if it's a rate limit error
      const isRateLimit = renameError.code === 50013 || 
                          renameError.message?.includes('rate limit') ||
                          renameError.message?.includes('You are changing your name too fast') ||
                          renameError.code === 20028;
      
      if (isRateLimit && controlPanelMsg) {
        // Set the rate limit and start countdown
        const rateLimitUntil = setChannelRateLimit(textChannelId);
        const tracking = channelRenameTracking.get(textChannelId);
        
        // Clear any existing countdown interval (we use Discord's live timestamp now)
        if (tracking.countdownInterval) {
          clearInterval(tracking.countdownInterval);
          tracking.countdownInterval = null;
        }
        
        // Convert rateLimitUntil from milliseconds to Unix timestamp (seconds)
        const rateLimitUntilSeconds = Math.floor(rateLimitUntil / 1000);
        const latestUrl = getLatestMessageUrl(textChannelId);
        
        // Show full control panel with rate limit warning using Discord's live timestamp
        const { components: rateLimitComponents, flags } = controlPanel.buildTextControlPanelWithRateLimit(
          interaction.guildId,
          textChannelId,
          voiceChannelId,
          ownerId,
          rateLimitUntilSeconds,
          { stickyEnabled, latestMessageUrl: latestUrl }
        );
        
        try {
          await controlPanelMsg.edit({ components: rateLimitComponents, flags });
        } catch (e) {
          console.error('Error updating text control panel with rate limit:', e);
        }
        
        // Revert to normal control panel after 3 seconds (just show the notification briefly)
        setTimeout(async () => {
          try {
            const latestUrl = getLatestMessageUrl(textChannelId);
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
              interaction.guildId,
              textChannelId,
              voiceChannelId,
              ownerId,
              { stickyEnabled, latestMessageUrl: latestUrl }
            );
            await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
          } catch (e) {
            // Ignore - message may have been deleted
          }
        }, 3000); // 3 seconds
        
      } else if (controlPanelMsg) {
        // Non-rate-limit error
        const { components: errorComponents, flags } = controlPanel.buildErrorStatePanel(
          interaction.guildId,
          textChannelId,
          ownerId,
          'Error',
          'Failed to rename channel.',
          { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
        );
        await controlPanelMsg.edit({ components: errorComponents, flags });
        
        // Revert after 1.5 seconds
        setTimeout(async () => {
          try {
            const latestUrl = getLatestMessageUrl(textChannelId);
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
              interaction.guildId,
              textChannelId,
              voiceChannelId,
              ownerId,
              { stickyEnabled, latestMessageUrl: latestUrl }
            );
            await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
          } catch (e) {
            // Ignore
          }
        }, 1500);
      }
      return;
    }
    
    // Track successful rename
    trackChannelRename(textChannelId);
    
    // Save text channel name preference (save the original name, not Unicode)
    await voicePreferences.saveTextChannelName(interaction.user.id, interaction.guildId, validation.value);
    
    if (controlPanelMsg) {
      // Show success state in control panel with Unicode name
      const unicodeSuccessName = convertToUnicodeBold(validation.value);
      const { components: successComponents, flags } = controlPanel.buildSuccessStatePanel(
        interaction.guildId,
        textChannelId,
        ownerId,
        'Channel Renamed',
        `Channel renamed to **${unicodeSuccessName}**`,
        { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
      );
      
      await controlPanelMsg.edit({ components: successComponents, flags });
      
      // Revert after 1.5 seconds
      setTimeout(async () => {
        try {
          const latestUrl = getLatestMessageUrl(textChannelId);
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
            interaction.guildId,
            textChannelId,
            voiceChannelId,
            ownerId,
            { stickyEnabled, latestMessageUrl: latestUrl }
          );
          await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
        } catch (e) {
          // Ignore
        }
      }, 1500);
    }
  } catch (error) {
    console.error('Error renaming text channel:', error);
    // Try to show error in control panel
    try {
      const textChannel = await interaction.guild.channels.fetch(textChannelId).catch(() => null);
      if (textChannel) {
        const messages = await textChannel.messages.fetch({ limit: 50 });
        const controlPanelMsg = messages.find(msg => {
          if (msg.author.id !== interaction.client.user.id) return false;
          
          // Check for Components V2 control panel or action rows with control panel custom IDs
          if (msg.components?.length > 0) {
            const firstComponent = msg.components[0];
            if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
            
            // Check for control panel custom IDs (excludes sticky notes)
            const hasControlPanelCustomId = msg.components.some(row => {
              if (row.components) {
                return row.components.some(comp => {
                  const customId = comp.customId || comp.custom_id || comp.data?.custom_id;
                  return customId?.startsWith('text_settings:') ||
                    customId?.startsWith('text_take_actions:') ||
                    customId?.startsWith('text_remove_actions:') ||
                    customId?.startsWith('text_edit_name:') ||
                    customId?.startsWith('text_delete:') ||
                    customId?.startsWith('text_sticky:') ||
                    customId?.startsWith('sticky_note:');
                });
              }
              return false;
            });
            if (hasControlPanelCustomId) return true;
          }
          return false;
        });
        
        if (controlPanelMsg) {
          const stickyEnabled = stickyNotes.isEnabled(textChannelId);
          const latestMessageUrl = getLatestMessageUrl(textChannelId);
          const { components: errorComponents, flags } = controlPanel.buildErrorStatePanel(
            interaction.guildId,
            textChannelId,
            ownerId,
            'Error',
            'Failed to rename text channel.',
            { stickyEnabled, isTextChannel: true, voiceChannelId, latestMessageUrl }
          );
          await controlPanelMsg.edit({ components: errorComponents, flags });
          
          setTimeout(async () => {
            try {
              const latestUrl = getLatestMessageUrl(textChannelId);
              const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactTextControlPanel(
                interaction.guildId,
                textChannelId,
                voiceChannelId,
                ownerId,
                { stickyEnabled, latestMessageUrl: latestUrl }
              );
              await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags });
            } catch (e) {
              // Ignore
            }
          }, 1500);
        }
      }
    } catch (e) {
      // Ignore
    }
    await interaction.deferUpdate().catch(() => {});
  }
}


// ============================================
// Setup Handlers
// ============================================

async function handleDefaultSetup(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const guild = interaction.guild;
    
    const mainCategory = await guild.channels.create({
      name: 'Temporary Voice Channels',
      type: ChannelType.GuildCategory
    });
    
    const joinChannel = await guild.channels.create({
      name: 'Join to Create',
      type: ChannelType.GuildVoice,
      parent: mainCategory.id
    });
    
    const tempCategory = await guild.channels.create({
      name: 'Your Temp Voice',
      type: ChannelType.GuildCategory
    });
    
    const settings = {
      voice_channel_id: joinChannel.id,
      category_id: mainCategory.id,
      temp_voice_category_id: tempCategory.id,
      channel_name_template: "🗣️ {username}'s Voice",
      default_limit: 0,
      default_bitrate: 64000,
      editable: true
    };
    
    dataStore.setGuildSettings(guild.id, settings);
    
    const embed = controlPanel.buildSetupSuccessEmbed(settings);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in default setup:', error);
    const embed = controlPanel.buildErrorEmbed(
      'Setup Failed',
      'Failed to complete setup. Please check bot permissions.'
    );
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleCustomSetupModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const guild = interaction.guild;
    
    const categoryName = interaction.fields.getTextInputValue('category_name');
    const joinChannelName = interaction.fields.getTextInputValue('join_channel_name');
    const channelTemplate = interaction.fields.getTextInputValue('channel_template');
    const defaultLimitStr = interaction.fields.getTextInputValue('default_limit');
    
    const limitValidation = modals.validateUserLimit(defaultLimitStr);
    if (!limitValidation.valid) {
      const embed = controlPanel.buildErrorEmbed('Invalid Input', limitValidation.error);
      await interaction.editReply({ embeds: [embed] });
      return;
    }
    
    const mainCategory = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory
    });
    
    const joinChannel = await guild.channels.create({
      name: joinChannelName,
      type: ChannelType.GuildVoice,
      parent: mainCategory.id
    });
    
    const tempCategory = await guild.channels.create({
      name: 'Temp Channels',
      type: ChannelType.GuildCategory
    });
    
    const settings = {
      voice_channel_id: joinChannel.id,
      category_id: mainCategory.id,
      temp_voice_category_id: tempCategory.id,
      channel_name_template: channelTemplate,
      default_limit: limitValidation.value,
      default_bitrate: 64000,
      editable: true
    };
    
    dataStore.setGuildSettings(guild.id, settings);
    
    const embed = controlPanel.buildSetupSuccessEmbed(settings);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in custom setup:', error);
    const embed = controlPanel.buildErrorEmbed(
      'Setup Failed',
      'Failed to complete setup. Please check bot permissions.'
    );
    await interaction.editReply({ embeds: [embed] });
  }
}

/**
 * Handles the sticky note toggle button from the control panel
 * Enables/disables sticky notes that repost the control panel link after every 8 messages
 * Updates the button appearance without sending ephemeral messages
 */
async function handleStickyNoteToggle(interaction, channelId, ownerId) {
  // Verify ownership
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  try {
    // Get the control panel message (the message with the button)
    const controlPanelMessage = interaction.message;
    const controlPanelUrl = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${controlPanelMessage.id}`;
    
    // Check if sticky notes are currently enabled
    const isCurrentlyEnabled = stickyNotes.isEnabled(interaction.channelId);
    
    if (isCurrentlyEnabled) {
      // Disable sticky notes
      stickyNotes.disableStickyNote(interaction.channelId);
    } else {
      // Enable sticky notes with the control panel URL
      stickyNotes.enableStickyNote(interaction.channelId, controlPanelUrl, 12);
    }
    
    // Rebuild the control panel with updated button state
    const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
    const latestMessageUrl = getLatestMessageUrl(channelId);
    const tempData = dataStore.getTempChannel(channelId);
    const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
    const { components, flags } = controlPanel.buildCompactVoiceControlPanel(
      interaction.guildId,
      channelId,
      ownerId,
      { 
        thumbnailUrl,
        stickyEnabled: !isCurrentlyEnabled, // Toggle the state
        latestMessageUrl,
        waitingRoomEnabled
      }
    );
    
    // Update the message with the new button state (no ephemeral reply)
    await interaction.update({ components, flags });
  } catch (error) {
    console.error('Error toggling sticky note:', error);
    await interaction.reply({ content: 'Failed to toggle sticky note.', ephemeral: true });
  }
}

/**
 * Handles the Sticky Note Manager button
 * Shows an ephemeral message with Enable/Disable buttons and status embed
 */
async function handleStickyNoteManager(interaction, channelId, ownerId) {
  // Verify ownership
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  try {
    // Check current sticky note status
    const isEnabled = stickyNotes.isEnabled(channelId);
    
    // Build status embed
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('📌 Sticky Note Manager')
      .setDescription(
        `**Current Status:** ${isEnabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `Sticky notes automatically repost the control panel after 8 messages to keep it visible.`
      )
      .setColor(isEnabled ? 0x57F287 : 0xED4245)
      .setTimestamp();
    
    // Build Enable/Disable buttons
    const enableButton = new ButtonBuilder()
      .setCustomId(`sticky_enable:${channelId}:${ownerId}`)
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(isEnabled); // Disable if already enabled
    
    const disableButton = new ButtonBuilder()
      .setCustomId(`sticky_disable:${channelId}:${ownerId}`)
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(!isEnabled); // Disable if already disabled
    
    const row = new ActionRowBuilder().addComponents(enableButton, disableButton);
    
    // Send ephemeral message
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error showing sticky note manager:', error);
    await interaction.reply({ content: '❌ Failed to open sticky note manager.', ephemeral: true });
  }
}

/**
 * Handles the Enable button in Sticky Note Manager
 */
async function handleStickyEnable(interaction, channelId, ownerId) {
  // Verify ownership
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  try {
    // Check if already enabled
    const isEnabled = stickyNotes.isEnabled(channelId);
    if (isEnabled) {
      await interaction.update({
        content: '⚠️ Sticky notes are already enabled!',
        embeds: [],
        components: []
      });
      return;
    }
    
    // Enable sticky notes - find the control panel message in the channel
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      await interaction.update({
        content: '❌ Channel not found.',
        embeds: [],
        components: []
      });
      return;
    }
    
    // Find the control panel message (look for bot's message with components)
    const messages = await channel.messages.fetch({ limit: 10 });
    const controlPanelMessage = messages.find(msg => 
      msg.author.id === interaction.client.user.id && 
      msg.components?.length > 0
    );
    
    if (controlPanelMessage) {
      const controlPanelUrl = `https://discord.com/channels/${interaction.guildId}/${channelId}/${controlPanelMessage.id}`;
      stickyNotes.enableStickyNote(channelId, controlPanelUrl, 12);
    } else {
      // No control panel found, enable anyway
      stickyNotes.enableStickyNote(channelId, '', 12);
    }
    
    // Update the manager message
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('📌 Sticky Note Manager')
      .setDescription(
        `**Current Status:** ✅ Enabled\n\n` +
        `Sticky notes automatically repost the control panel after 8 messages to keep it visible.`
      )
      .setColor(0x57F287)
      .setTimestamp();
    
    const enableButton = new ButtonBuilder()
      .setCustomId(`sticky_enable:${channelId}:${ownerId}`)
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(true);
    
    const disableButton = new ButtonBuilder()
      .setCustomId(`sticky_disable:${channelId}:${ownerId}`)
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(false);
    
    const row = new ActionRowBuilder().addComponents(enableButton, disableButton);
    
    await interaction.update({
      embeds: [embed],
      components: [row]
    });
  } catch (error) {
    console.error('Error enabling sticky note:', error);
    await interaction.update({
      content: '❌ Failed to enable sticky notes.',
      embeds: [],
      components: []
    });
  }
}

/**
 * Handles the Disable button in Sticky Note Manager
 */
async function handleStickyDisable(interaction, channelId, ownerId) {
  // Verify ownership
  if (!await verifyOwnership(interaction, channelId, ownerId)) return;
  
  try {
    // Check if already disabled
    const isEnabled = stickyNotes.isEnabled(channelId);
    if (!isEnabled) {
      await interaction.update({
        content: '⚠️ Sticky notes are already disabled!',
        embeds: [],
        components: []
      });
      return;
    }
    
    // Disable sticky notes
    stickyNotes.disableStickyNote(channelId);
    
    // Update the manager message
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('📌 Sticky Note Manager')
      .setDescription(
        `**Current Status:** ❌ Disabled\n\n` +
        `Sticky notes automatically repost the control panel after 8 messages to keep it visible.`
      )
      .setColor(0xED4245)
      .setTimestamp();
    
    const enableButton = new ButtonBuilder()
      .setCustomId(`sticky_enable:${channelId}:${ownerId}`)
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(false);
    
    const disableButton = new ButtonBuilder()
      .setCustomId(`sticky_disable:${channelId}:${ownerId}`)
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(true);
    
    const row = new ActionRowBuilder().addComponents(enableButton, disableButton);
    
    await interaction.update({
      embeds: [embed],
      components: [row]
    });
  } catch (error) {
    console.error('Error disabling sticky note:', error);
    await interaction.update({
      content: '❌ Failed to disable sticky notes.',
      embeds: [],
      components: []
    });
  }
}

/**
 * Handles the Load Settings button for voice channels
 * Loads saved user preferences (bitrate, lock, ghost, region, rejected users)
 */
async function handleLoadSettings(interaction, channelId, ownerId) {
  // For Load Settings, require actual ownership - admins/mods must claim ownership first
  const actualOwnerId = dataStore.getChannelOwner(channelId);
  
  // Check if the user is the actual owner
  if (interaction.user.id !== actualOwnerId) {
    // If they have elevated permissions but haven't claimed ownership, show specific message
    if (hasElevatedPermissions(interaction.member)) {
      await interaction.reply({ 
        content: 'You must claim ownership of this channel first before loading settings. Use the "Claim" option to take ownership.', 
        ephemeral: true 
      });
      return;
    } else {
      // Regular users get the standard ownership message
      await interaction.reply({ 
        content: 'Only the channel owner can load settings.', 
        ephemeral: true 
      });
      return;
    }
  }
  
  // Check if user is in the voice channel (if not, they're using universal interface)
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    await interaction.reply({ 
      content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.', 
      ephemeral: true 
    });
    return;
  }
  
  const isUniversal = !channel.members.has(interaction.user.id);
  
  // Defer the interaction immediately to prevent timeout
  if (isUniversal) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  } else {
    try {
      await interaction.deferUpdate();
    } catch (deferError) {
      console.log('Could not defer load settings interaction:', deferError.message);
    }
  }
  
  const stickyEnabled = stickyNotes.isEnabled(channelId);
  const latestMessageUrl = getLatestMessageUrl(channelId);
  const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
  
  try {
    // Get user preferences from database - use the interaction user's ID for Load Settings button
    // This allows users to load their own settings when they click the Load Settings button
    const prefs = await voicePreferences.getPreferences(interaction.user.id, interaction.guildId);
    
    if (!prefs) {
      if (isUniversal) {
        await interaction.editReply({
          content: '❌ **No Saved Settings**\nYou don\'t have any saved settings yet. Your settings will be saved automatically when you customize your channel.'
        });
      } else {
        await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'No Saved Settings', 'You don\'t have any saved settings yet. Your settings will be saved automatically when you customize your channel.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      }
      return;
    }
    
    let appliedSettings = [];
    
    // Apply bitrate if saved
    if (prefs.bitrate && prefs.bitrate !== channel.bitrate) {
      await channel.setBitrate(prefs.bitrate);
      appliedSettings.push(`Bitrate: ${prefs.bitrate / 1000} kbps`);
    }
    
    // Apply lock state if saved
    if (prefs.locked !== undefined) {
      const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
      const isCurrentlyLocked = everyoneOverwrite?.deny?.has('Connect') || false;
      
      if (prefs.locked && !isCurrentlyLocked) {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
        appliedSettings.push('Locked: Yes');
      } else if (!prefs.locked && isCurrentlyLocked) {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
        appliedSettings.push('Locked: No');
      }
    }
    
    // Apply ghost state if saved
    if (prefs.ghosted !== undefined) {
      const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
      const isCurrentlyGhosted = everyoneOverwrite?.deny?.has('ViewChannel') || false;
      
      if (prefs.ghosted && !isCurrentlyGhosted) {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
        appliedSettings.push('Ghost: Yes');
      } else if (!prefs.ghosted && isCurrentlyGhosted) {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: null });
        appliedSettings.push('Ghost: No');
      }
    }
    
    // Apply region if saved
    if (prefs.region) {
      try {
        await channel.setRTCRegion(prefs.region === 'automatic' ? null : prefs.region);
        appliedSettings.push(`Region: ${prefs.region}`);
      } catch (e) {
        console.log('Could not set region:', e.message);
      }
    }
    
    // Apply channel status if saved
    if (prefs.channelStatus) {
      try {
        // Set voice channel status using REST API (Discord.js doesn't have a direct method)
        const { REST, Routes } = require('discord.js');
        const rest = new REST().setToken(interaction.client.token);
        
        await rest.put(
          Routes.channel(channelId) + '/voice-status',
          { body: { status: prefs.channelStatus } }
        );
        appliedSettings.push(`Status: ${prefs.channelStatus}`);
      } catch (e) {
        console.log('Could not set status:', e.message);
      }
    }
    
    // Apply rejected users if saved
    if (prefs.rejectedUsers && prefs.rejectedUsers.length > 0) {
      let rejectedMentions = [];
      for (const userId of prefs.rejectedUsers) {
        try {
          await channel.permissionOverwrites.edit(userId, { Connect: false });
          rejectedMentions.push(`<@${userId}>`);
        } catch (e) {
          // User might not be in the server anymore
        }
      }
      if (rejectedMentions.length > 0) {
        appliedSettings.push(`Rejected users: ${rejectedMentions.join(', ')}`);
      }
    }
    
    // Apply rejected roles if saved
    if (prefs.rejectedRoles && prefs.rejectedRoles.length > 0) {
      let rejectedMentions = [];
      for (const roleId of prefs.rejectedRoles) {
        try {
          await channel.permissionOverwrites.edit(roleId, { Connect: false });
          rejectedMentions.push(`<@&${roleId}>`);
        } catch (e) {
          // Role might not exist anymore
        }
      }
      if (rejectedMentions.length > 0) {
        appliedSettings.push(`Rejected roles: ${rejectedMentions.join(', ')}`);
      }
    }
    
    // Show success message
    if (appliedSettings.length > 0) {
      if (isUniversal) {
        // Send ephemeral success message for universal interface
        await interaction.editReply({
          content: `✅ **Settings Loaded**\n${appliedSettings.join('\n')}`
        });
      } else {
        // Update control panel for regular interface
        const { components: successComponents, flags } = controlPanel.buildSuccessStatePanel(
          interaction.guildId,
          channelId,
          ownerId,
          'Settings Loaded',
          appliedSettings.join('\n'),
          { stickyEnabled, thumbnailUrl, latestMessageUrl }
        );
        
        // Use editReply for deferred interactions
        try {
          await interaction.editReply({ components: successComponents, flags });
        } catch (e) {
          // Fallback to editing message directly
          await interaction.message.edit({ components: successComponents, flags });
        }
        
        // Revert to normal control panel after delay
        setTimeout(async () => {
          try {
            const message = await interaction.message.fetch().catch(() => null);
            if (!message) return;
            
            const latestUrl = getLatestMessageUrl(channelId);
            const currentStickyEnabled = stickyNotes.isEnabled(channelId);
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
              interaction.guildId,
              channelId,
              ownerId,
              { thumbnailUrl, stickyEnabled: currentStickyEnabled, latestMessageUrl: latestUrl }
            );
            await message.edit({ components: normalComponents, flags: normalFlags });
        } catch (error) {
          // Message may have been deleted
        }
      }, 2500);
      }
    } else {
      if (isUniversal) {
        await interaction.editReply({
          content: '❌ **No Changes**\nYour saved settings are already applied or no settings to load.'
        });
      } else {
        await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'No Changes', 'Your saved settings are already applied or no settings to load.', stickyEnabled, latestMessageUrl, thumbnailUrl);
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    if (isUniversal) {
      await interaction.editReply({
        content: '❌ **Error**\nFailed to load settings.'
      }).catch(() => {});
    } else {
      await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Failed to load settings.', stickyEnabled, latestMessageUrl, thumbnailUrl);
    }
  }
}

/**
 * Shows current voice channel settings
 */
async function handleViewCurrentSettings(interaction, channelId, ownerId) {
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.reply({ 
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.', 
        ephemeral: true 
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await interaction.reply({ 
        content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.', 
        ephemeral: true 
      });
      return;
    }
    
    // Gather current settings
    const settings = [];
    
    // Channel name
    settings.push(`**Name:** ${channel.name}`);
    
    // User limit
    const limit = channel.userLimit === 0 ? 'Unlimited' : channel.userLimit;
    settings.push(`**User Limit:** ${limit}`);
    
    // Bitrate
    settings.push(`**Bitrate:** ${channel.bitrate / 1000} kbps`);
    
    // Lock status
    const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
    const isLocked = everyoneOverwrite?.deny?.has('Connect') || false;
    settings.push(`**Locked:** ${isLocked ? 'Yes' : 'No'}`);
    
    // Ghost status
    const isGhosted = everyoneOverwrite?.deny?.has('ViewChannel') || false;
    settings.push(`**Hidden (Ghost):** ${isGhosted ? 'Yes' : 'No'}`);
    
    // NSFW status
    settings.push(`**NSFW:** ${channel.nsfw ? 'Yes' : 'No'}`);
    
    // Region
    const region = channel.rtcRegion || 'Automatic';
    settings.push(`**Region:** ${region}`);
    
    // Waiting room status
    const waitingRoomEnabled = tempData.waiting_room_channel_id ? true : false;
    settings.push(`**Waiting Room:** ${waitingRoomEnabled ? 'Enabled' : 'Disabled'}`);
    
    // Channel status (if set)
    try {
      const { REST, Routes } = require('discord.js');
      const rest = new REST().setToken(interaction.client.token);
      const statusData = await rest.get(Routes.channel(channelId) + '/voice-status').catch(() => null);
      if (statusData?.status) {
        settings.push(`**Status:** ${statusData.status}`);
      }
    } catch (e) {
      // Ignore - status might not be set
    }
    
    // Text channel
    if (tempData.text_channel_id) {
      settings.push(`**Text Channel:** <#${tempData.text_channel_id}>`);
    }
    
    // Owner
    settings.push(`**Owner:** <@${ownerId}>`);
    
    await interaction.reply({
      content: `# 📊 Current Voice Channel Settings\n\n${settings.join('\n')}`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Error viewing current settings:', error);
    await interaction.reply({
      content: '❌ **Error**\nFailed to retrieve current settings.',
      ephemeral: true
    }).catch(() => {});
  }
}

/**
 * Auto-loads basic settings when a user claims ownership of a channel
 * Loads: channel name, status, user limit, and other basic preferences
 * If no settings exist, sets channel name to user's display name
 * @param {Object} interaction - The interaction object
 * @param {string} channelId - The voice channel ID
 * @param {string} ownerId - The new owner's user ID
 */
async function autoLoadBasicSettings(interaction, channelId, ownerId) {
  console.log(`[Auto-Load] Starting auto-load for owner ${ownerId} in channel ${channelId}`);
  try {
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) {
      console.log(`[Auto-Load] Channel ${channelId} not found`);
      return;
    }
    
    // Get user preferences from database
    const prefs = await voicePreferences.getPreferences(ownerId, interaction.guildId);
    console.log(`[Auto-Load] Retrieved preferences for ${ownerId}:`, prefs ? 'Found' : 'None');
    
    if (!prefs) {
      // No saved preferences, set channel name to user's display name as fallback
      console.log(`[Auto-Load] No preferences found, setting channel name to user's display name`);
      try {
        const newOwner = await interaction.guild.members.fetch(ownerId).catch(() => null);
        if (newOwner) {
          const guildSettings = dataStore.getGuildSettings(interaction.guildId);
          const channelNameTemplate = guildSettings?.channel_name_template || "🗣️ {username}'s Voice";
          const newChannelName = voiceManager.applyChannelNameTemplate(channelNameTemplate, newOwner.displayName);
          await channel.setName(newChannelName);
          console.log(`[Auto-Load] Set channel name to user's name: ${newChannelName}`);
        }
      } catch (e) {
        console.log('[Auto-Load] Could not set channel name to user name:', e.message);
      }
      return;
    }
    
    // Apply channel name if saved
    if (prefs.channelName && prefs.channelName !== channel.name) {
      try {
        await channel.setName(prefs.channelName);
        console.log(`[Auto-Load] Applied channel name: ${prefs.channelName}`);
      } catch (e) {
        // Ignore rate limit errors for auto-loading
        console.log('[Auto-Load] Could not auto-load channel name:', e.message);
      }
    }
    
    // Apply user limit if saved
    if (prefs.userLimit !== undefined && prefs.userLimit !== channel.userLimit) {
      try {
        await channel.setUserLimit(prefs.userLimit);
        console.log(`[Auto-Load] Applied user limit: ${prefs.userLimit}`);
      } catch (e) {
        console.log('[Auto-Load] Could not auto-load user limit:', e.message);
      }
    }
    
    // Apply channel status if saved
    if (prefs.channelStatus) {
      try {
        // Set voice channel status using REST API
        const { REST, Routes } = require('discord.js');
        const rest = new REST().setToken(interaction.client.token);
        
        await rest.put(
          Routes.channel(channelId) + '/voice-status',
          { body: { status: prefs.channelStatus } }
        );
        console.log(`[Auto-Load] Applied channel status: ${prefs.channelStatus}`);
      } catch (e) {
        console.log('[Auto-Load] Could not auto-load channel status:', e.message);
      }
    }
    
    // Apply bitrate if saved (basic setting)
    if (prefs.bitrate && prefs.bitrate !== channel.bitrate) {
      try {
        await channel.setBitrate(prefs.bitrate);
      } catch (e) {
        console.log('Could not auto-load bitrate:', e.message);
      }
    }
    
    // Apply region if saved (basic setting)
    if (prefs.region) {
      try {
        await channel.setRTCRegion(prefs.region === 'automatic' ? null : prefs.region);
      } catch (e) {
        console.log('Could not auto-load region:', e.message);
      }
    }
    
    // Disable waiting room if it's enabled (waiting room should be disabled when loading settings)
    const tempData = dataStore.getTempChannel(channelId);
    if (tempData?.waiting_room_channel_id) {
      console.log(`[Auto-Load] Disabling waiting room for channel ${channelId}`);
      try {
        // Delete the waiting room channel
        const waitingRoomChannel = await interaction.guild.channels.fetch(tempData.waiting_room_channel_id).catch(() => null);
        if (waitingRoomChannel) {
          await waitingRoomChannel.delete('Waiting room disabled due to settings load').catch(e => {
            console.log('[Auto-Load] Could not delete waiting room channel:', e.message);
          });
        }
        
        // Clear waiting room data
        clearWaitingRoomData(channelId);
        
        // Update temp data
        delete tempData.waiting_room_channel_id;
        dataStore.setTempChannel(channelId, tempData);
        
        // Unlock the channel
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null }).catch(e => {
          console.log('[Auto-Load] Could not unlock channel:', e.message);
        });
        
        console.log(`[Auto-Load] Waiting room disabled successfully`);
      } catch (e) {
        console.log('[Auto-Load] Could not disable waiting room:', e.message);
      }
    }
    
    // Note: Text channel name update is handled separately in the claim/transfer flow
    // to ensure it happens even when there are no saved preferences
    
  } catch (error) {
    console.error('Error auto-loading basic settings:', error);
    // Don't throw error - auto-loading is optional
  }
}

/**
 * Updates the linked text channel name when ownership changes
 * @param {Object} interaction - The interaction object
 * @param {string} voiceChannelId - The voice channel ID
 * @param {string} newOwnerId - The new owner's user ID
 */
async function updateTextChannelName(interaction, voiceChannelId, newOwnerId) {
  try {
    const tempData = dataStore.getTempChannel(voiceChannelId);
    if (!tempData?.text_channel_id) {
      // No linked text channel
      console.log(`[Text Channel Update] No linked text channel for voice channel ${voiceChannelId}`);
      return;
    }
    
    const textChannel = await interaction.guild.channels.fetch(tempData.text_channel_id).catch(() => null);
    if (!textChannel) {
      console.log(`[Text Channel Update] Text channel ${tempData.text_channel_id} not found`);
      return;
    }
    
    const newOwner = await interaction.guild.members.fetch(newOwnerId).catch(() => null);
    if (!newOwner) {
      console.log(`[Text Channel Update] New owner ${newOwnerId} not found`);
      return;
    }
    
    // Format: 💬 Username Text (e.g., 💬 Nehan Text) with Unicode bold styling
    const ownerName = newOwner.displayName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters but keep spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces
    
    const baseChannelName = `💬 ${ownerName} Text`.substring(0, 100);
    // Use the local convertToUnicodeBold function directly
    const newTextChannelName = convertToUnicodeBold(baseChannelName);
    
    // Only update if the name is different
    if (textChannel.name !== newTextChannelName) {
      await textChannel.setName(newTextChannelName);
      console.log(`[Text Channel Update] Updated text channel name to: ${newTextChannelName}`);
    }
    
  } catch (error) {
    console.error('[Text Channel Update] Error updating text channel name:', error);
    // Don't throw error - text channel update is optional
  }
}

// ============================================
// Voice Request Handlers
// Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
// ============================================

/**
 * Handles the approve button for voice requests
 * Only channel owner can approve requests
 * Deletes the request message after 3 seconds
 * @param {Object} interaction - Button interaction
 * @param {string} requestId - The voice request ID
 */
async function handleVoiceRequestApprove(interaction, requestId) {
  // Get the request first to check channel ownership
  const request = voiceRequestManager.getRequest(requestId);
  if (!request) {
    await interaction.reply({
      content: '❌ This request no longer exists.',
      ephemeral: true,
    });
    return;
  }

  // Verify user is channel owner
  const channelOwnerId = dataStore.getChannelOwner(request.channelId);
  console.log('[VoiceRequest] Approval check:', {
    requestId,
    channelId: request.channelId,
    channelOwnerId,
    interactionUserId: interaction.user.id,
    isOwner: interaction.user.id === channelOwnerId
  });
  
  if (interaction.user.id !== channelOwnerId) {
    await interaction.reply({
      content: '❌ Only the channel owner can respond to join requests.',
      ephemeral: true,
    });
    return;
  }

  if (request.status !== 'pending') {
    await interaction.reply({
      content: '❌ This request has already been resolved.',
      ephemeral: true,
    });
    return;
  }

  // Get the voice channel
  const channel = await interaction.guild.channels.fetch(request.channelId).catch(() => null);
  if (!channel) {
    await interaction.reply({
      content: '❌ The voice channel no longer exists.',
      ephemeral: true,
    });
    return;
  }

  // Approve the request
  const approvalResult = voiceRequestManager.approveRequest(requestId, interaction.user.id, channel);
  if (!approvalResult.success) {
    await interaction.reply({
      content: `❌ ${approvalResult.error}`,
      ephemeral: true,
    });
    return;
  }

  // Reset appeal attempts for the requester since they were approved
  voiceRequestManager.resetAppealAttempts(request.channelId, request.requesterId);

  // Remove the restriction
  await voiceRequestManager.removeRestriction(channel, request.requesterId, request.restrictionType);

  // Update the request message to show approved status
  const { embed: approvedEmbed, components: approvedComponents } =
    controlPanel.buildApprovedRequestMessage(approvalResult.request);
  await interaction.update({ embeds: [approvedEmbed], components: approvedComponents });

  // Delete the message after 3 seconds
  setTimeout(async () => {
    try {
      await interaction.message.delete();
    } catch (error) {
      console.log('[VoiceRequest] Could not delete request message:', error.message);
    }
  }, 3000);

  // Also update and delete the text channel message if it exists
  if (request.messageIds.textChannel) {
    const tempData = dataStore.getTempChannel(request.channelId);
    if (tempData && tempData.text_channel_id) {
      try {
        const textChannel = await interaction.guild.channels.fetch(tempData.text_channel_id);
        if (textChannel) {
          const textMessage = await textChannel.messages.fetch(request.messageIds.textChannel).catch(() => null);
          if (textMessage) {
            await textMessage.edit({ embeds: [approvedEmbed], components: approvedComponents });
            // Delete after 3 seconds
            setTimeout(async () => {
              try {
                await textMessage.delete();
              } catch (e) {
                /* ignore */
              }
            }, 3000);
          }
        }
      } catch (error) {
        console.log('[VoiceRequest] Could not update text channel message:', error.message);
      }
    }
  }

  // Also update and delete the voice channel message if it exists and is different from current message
  if (request.messageIds.voiceChannel && request.messageIds.voiceChannel !== interaction.message.id) {
    try {
      const voiceMessage = await channel.messages.fetch(request.messageIds.voiceChannel).catch(() => null);
      if (voiceMessage) {
        await voiceMessage.edit({ embeds: [approvedEmbed], components: approvedComponents });
        // Delete after 3 seconds
        setTimeout(async () => {
          try {
            await voiceMessage.delete();
          } catch (e) {
            /* ignore */
          }
        }, 3000);
      }
    } catch (error) {
      console.log('[VoiceRequest] Could not update voice channel message:', error.message);
    }
  }

  // Send DM to requester
  try {
    const requester = await interaction.client.users.fetch(request.requesterId);

    if (approvalResult.limitReached) {
      // Channel is full - send DM with "Join Immediately" button
      // Track the pending limit increase
      voiceRequestManager.trackLimitIncrease(channel.id, request.requesterId, channel.userLimit);
      
      const { embed: limitEmbed, components: limitComponents } = controlPanel.buildLimitReachedDM(
        channel.id,
        request.requesterId,
        channel.name,
        interaction.guild.name,
        interaction.guild.id
      );
      await requester.send({ embeds: [limitEmbed], components: limitComponents });
    } else {
      // Channel has space - send approval DM with join link
      const { embed: approvalEmbed, components: approvalComponents } = controlPanel.buildApprovalDM(
        channel.id,
        interaction.guild.id,
        channel.name,
        interaction.guild.name
      );
      await requester.send({ embeds: [approvalEmbed], components: approvalComponents });
    }
  } catch (error) {
    console.log('[VoiceRequest] Could not send DM to requester:', error.message);
  }
}

/**
 * Handles the deny button for voice requests
 * Only channel owner can deny requests
 * Deletes the request message after 3 seconds
 * @param {Object} interaction - Button interaction
 * @param {string} requestId - The voice request ID
 */
async function handleVoiceRequestDeny(interaction, requestId) {
  // Get the request first to check channel ownership
  const request = voiceRequestManager.getRequest(requestId);
  if (!request) {
    await interaction.reply({
      content: '❌ This request no longer exists.',
      ephemeral: true,
    });
    return;
  }

  // Verify user is channel owner
  const channelOwnerId = dataStore.getChannelOwner(request.channelId);
  if (interaction.user.id !== channelOwnerId) {
    await interaction.reply({
      content: '❌ Only the channel owner can respond to join requests.',
      ephemeral: true,
    });
    return;
  }

  // Deny the request
  const denyResult = voiceRequestManager.denyRequest(requestId, interaction.user.id);
  if (!denyResult.success) {
    await interaction.reply({
      content: `❌ ${denyResult.error}`,
      ephemeral: true,
    });
    return;
  }

  // Increment appeal attempts for the requester
  const newAttemptCount = voiceRequestManager.incrementAppealAttempts(request.channelId, request.requesterId);
  const attemptsRemaining = voiceRequestManager.MAX_APPEAL_ATTEMPTS - newAttemptCount;

  // Update the request message to show denied status
  const { embed: deniedEmbed, components: deniedComponents } =
    controlPanel.buildDeniedRequestMessage(denyResult.request);
  await interaction.update({ embeds: [deniedEmbed], components: deniedComponents });

  // Delete the message after 3 seconds
  setTimeout(async () => {
    try {
      await interaction.message.delete();
    } catch (error) {
      console.log('[VoiceRequest] Could not delete request message:', error.message);
    }
  }, 3000);

  // Also update and delete the text channel message if it exists
  if (request.messageIds.textChannel) {
    const tempData = dataStore.getTempChannel(request.channelId);
    if (tempData && tempData.text_channel_id) {
      try {
        const textChannel = await interaction.guild.channels.fetch(tempData.text_channel_id);
        if (textChannel) {
          const textMessage = await textChannel.messages.fetch(request.messageIds.textChannel).catch(() => null);
          if (textMessage) {
            await textMessage.edit({ embeds: [deniedEmbed], components: deniedComponents });
            // Delete after 3 seconds
            setTimeout(async () => {
              try {
                await textMessage.delete();
              } catch (e) {
                /* ignore */
              }
            }, 3000);
          }
        }
      } catch (error) {
        console.log('[VoiceRequest] Could not update text channel message:', error.message);
      }
    }
  }

  // Also update and delete the voice channel message if it exists and is different from current message
  if (request.messageIds.voiceChannel && request.messageIds.voiceChannel !== interaction.message.id) {
    try {
      const channel = await interaction.guild.channels.fetch(request.channelId);
      if (channel) {
        const voiceMessage = await channel.messages.fetch(request.messageIds.voiceChannel).catch(() => null);
        if (voiceMessage) {
          await voiceMessage.edit({ embeds: [deniedEmbed], components: deniedComponents });
          // Delete after 3 seconds
          setTimeout(async () => {
            try {
              await voiceMessage.delete();
            } catch (e) {
              /* ignore */
            }
          }, 3000);
        }
      }
    } catch (error) {
      console.log('[VoiceRequest] Could not update voice channel message:', error.message);
    }
  }
}

/**
 * Handles the Join Immediately button from the limit-reached DM
 * Increases the channel limit by 1 and edits the message with a link to join
 * @param {Object} interaction - Button interaction
 * @param {string} channelId - The voice channel ID
 * @param {string} userId - The user ID who should be joining
 * @param {string} guildId - The guild ID
 */
async function handleVoiceRequestJoin(interaction, channelId, userId, guildId) {
  // Verify the button clicker is the intended user
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: '❌ This button is not for you.',
      ephemeral: true
    });
    return;
  }
  
  // Get the channel
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    await interaction.update({
      content: '❌ The voice channel no longer exists.',
      embeds: [],
      components: []
    });
    return;
  }
  
  // Increase the channel limit by 1
  try {
    const currentLimit = channel.userLimit;
    const newLimit = currentLimit + 1;
    await channel.setUserLimit(newLimit);
    
    // Brief delay to ensure the limit change is applied
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Edit the DM with a link button to the channel
    const { embed: linkEmbed, components: linkComponents } = controlPanel.buildJoinLinkDM(
      channelId,
      guildId || channel.guildId,
      channel.name
    );
    
    await interaction.update({ embeds: [linkEmbed], components: linkComponents });
  } catch (error) {
    console.error('[VoiceRequest] Error increasing limit:', error);
    await interaction.update({
      content: '❌ Failed to increase the channel limit. Please try again or contact the channel owner.',
      embeds: [],
      components: []
    });
  }
}

// ============================================
// Voice Appeal Handlers
// ============================================

/**
 * Handles the Appeal To Join button from rejection/ban DMs
 * Shows channel selection for the user to appeal
 * @param {Object} interaction - Button interaction
 * @param {string} channelId - The original channel ID
 * @param {string} guildId - The guild ID
 */
async function handleVoiceAppealStart(interaction, channelId, guildId) {
  try {
    // Fetch the guild
    const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      await interaction.reply({
        content: '❌ Could not find the server. You may have been removed from it.',
        ephemeral: true,
      });
      return;
    }

    // Get restricted channels for this user
    const restrictedChannels = voiceRequestManager.getRestrictedChannels(guild, interaction.user.id);

    if (restrictedChannels.length === 0) {
      await interaction.reply({
        content: '❌ You are not restricted from any voice channels in this server.',
        ephemeral: true,
      });
      return;
    }

    // Build channel selection
    const channels = restrictedChannels.map((rc) => ({
      id: rc.channel.id,
      name: rc.channel.name,
    }));

    const { embed, components } = controlPanel.buildAppealChannelSelect(channels);
    await interaction.reply({ embeds: [embed], components, ephemeral: true });
  } catch (error) {
    console.error('[VoiceAppeal] Error in handleVoiceAppealStart:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true,
    });
  }
}

/**
 * Handles the channel selection for voice appeal
 * @param {Object} interaction - Select menu interaction
 */
async function handleVoiceAppealChannelSelect(interaction) {
  const channelId = interaction.values[0];

  try {
    // Get the channel name
    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.update({
        content: '❌ This channel no longer exists.',
        embeds: [],
        components: [],
      });
      return;
    }

    // Show note options
    const { embed, components } = controlPanel.buildAppealNoteOptions(channelId, channel.name);
    await interaction.update({ embeds: [embed], components });
  } catch (error) {
    console.error('[VoiceAppeal] Error in handleVoiceAppealChannelSelect:', error);
    await interaction.update({
      content: '❌ An error occurred. Please try again.',
      embeds: [],
      components: [],
    });
  }
}

/**
 * Handles the Add Note button for voice appeal
 * Shows a modal to enter the note
 * @param {Object} interaction - Button interaction
 * @param {string} channelId - The selected channel ID
 */
async function handleVoiceAppealAddNote(interaction, channelId) {
  await interaction.showModal(modals.buildVoiceAppealNoteModal(channelId));
}

/**
 * Handles the Without Note button for voice appeal
 * Sends the request without a note
 * @param {Object} interaction - Button interaction
 * @param {string} channelId - The selected channel ID
 */
async function handleVoiceAppealWithoutNote(interaction, channelId) {
  await processVoiceAppeal(interaction, channelId, null);
}

/**
 * Handles the Cancel button for voice appeal
 * @param {Object} interaction - Button interaction
 */
async function handleVoiceAppealCancel(interaction) {
  await interaction.update({
    content: '❌ Appeal cancelled.',
    embeds: [],
    components: [],
  });
}

/**
 * Handles the modal submission for voice appeal note
 * @param {Object} interaction - Modal submit interaction
 * @param {string} channelId - The selected channel ID
 */
async function handleVoiceAppealNoteModalSubmit(interaction, channelId) {
  const note = interaction.fields.getTextInputValue('appeal_note');
  await processVoiceAppeal(interaction, channelId, note);
}

/**
 * Process the voice appeal request
 * @param {Object} interaction - The interaction
 * @param {string} channelId - The channel ID
 * @param {string|null} note - Optional note
 */
async function processVoiceAppeal(interaction, channelId, note) {
  try {
    // Get the channel
    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      const content = '❌ This channel no longer exists.';
      if (interaction.isModalSubmit()) {
        await interaction.reply({ content, ephemeral: true });
      } else {
        await interaction.update({ content, embeds: [], components: [] });
      }
      return;
    }

    const guildId = channel.guildId;
    const userId = interaction.user.id;

    // Get the guild and member for role checking
    const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
    const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;

    // Check restriction
    const restriction = voiceRequestManager.hasRestriction(channel, userId, member);
    if (!restriction.restricted) {
      const content = '❌ You are not restricted from this voice channel.';
      if (interaction.isModalSubmit()) {
        await interaction.reply({ content, ephemeral: true });
      } else {
        await interaction.update({ content, embeds: [], components: [] });
      }
      return;
    }

    // Create the request
    const request = voiceRequestManager.createRequest(guildId, channelId, userId, restriction.type, note);

    // Get channel owner
    const channelOwnerId = dataStore.getChannelOwner(channelId);
    
    // Build the request message
    const { content, embed, components } = controlPanel.buildVoiceRequestMessage(request, channelOwnerId);

    // Send to voice channel
    let voiceMessageId = null;
    try {
      const voiceMessage = await channel.send({ content, embeds: [embed], components });
      voiceMessageId = voiceMessage.id;
    } catch (error) {
      console.error('[VoiceAppeal] Failed to send message to voice channel:', error);
      const content = '❌ Could not send the request to the voice channel. Please try again.';
      if (interaction.isModalSubmit()) {
        await interaction.reply({ content, ephemeral: true });
      } else {
        await interaction.update({ content, embeds: [], components: [] });
      }
      return;
    }

    // Try to send to linked text channel if it exists
    let textMessageId = null;
    const tempChannelData = dataStore.getTempChannel(channelId);
    if (tempChannelData && tempChannelData.text_channel_id) {
      try {
        const guild = await interaction.client.guilds.fetch(guildId);
        const textChannel = await guild.channels.fetch(tempChannelData.text_channel_id);
        if (textChannel) {
          const textMessage = await textChannel.send({ content, embeds: [embed], components });
          textMessageId = textMessage.id;
        }
      } catch (error) {
        console.log('[VoiceAppeal] Could not send to text channel:', error.message);
      }
    }

    // Update request with message IDs
    voiceRequestManager.updateRequestMessageIds(request.id, voiceMessageId, textMessageId);

    // Send confirmation
    const successContent = `✅ Your request to join **${channel.name}** has been sent.\n\nThe channel owner will review your request and respond.`;
    if (interaction.isModalSubmit()) {
      await interaction.reply({ content: successContent, ephemeral: true });
    } else {
      await interaction.update({ content: successContent, embeds: [], components: [] });
    }
  } catch (error) {
    console.error('[VoiceAppeal] Error in processVoiceAppeal:', error);
    const content = '❌ An error occurred. Please try again.';
    if (interaction.isModalSubmit()) {
      await interaction.reply({ content, ephemeral: true });
    } else {
      await interaction.update({ content, embeds: [], components: [] });
    }
  }
}

// ============================================
// Voice Preferences Management Handlers
// For /voice-settings command interactions
// ============================================

/**
 * Handle voice preferences edit select menu
 * Resets individual settings
 */
async function handleVoicePrefsEdit(interaction, params) {
  const [odUserId] = params;

  // Verify the user is the one who opened the menu
  if (interaction.user.id !== odUserId) {
    await interaction.reply({ content: 'You cannot use this menu.', ephemeral: true });
    return;
  }

  const selectedValue = interaction.values[0];
  const guildId = interaction.guildId;

  try {
    let fieldToReset = null;
    let fieldName = '';

    switch (selectedValue) {
      case 'reset_bitrate':
        fieldToReset = 'bitrate';
        fieldName = 'Bitrate';
        break;
      case 'reset_status':
        fieldToReset = 'channelStatus';
        fieldName = 'Channel Status';
        break;
      case 'reset_region':
        fieldToReset = 'region';
        fieldName = 'Region';
        break;
      case 'reset_locked':
        fieldToReset = 'locked';
        fieldName = 'Lock State';
        break;
      case 'reset_ghosted':
        fieldToReset = 'ghosted';
        fieldName = 'Ghost State';
        break;
      case 'reset_name':
        fieldToReset = 'channelName';
        fieldName = 'Voice Channel Name';
        break;
      case 'reset_limit':
        fieldToReset = 'userLimit';
        fieldName = 'User Limit';
        break;
      case 'reset_text_name':
        fieldToReset = 'textChannelName';
        fieldName = 'Text Channel Name';
        break;
      default:
        await interaction.reply({ content: 'Unknown setting.', ephemeral: true });
        return;
    }

    // Reset the field by setting it to null/undefined
    await voicePreferences.updatePreference(odUserId, guildId, fieldToReset, null);

    // Refresh the settings display
    await refreshVoicePrefsDisplay(interaction, odUserId, `✅ **${fieldName}** has been reset.`);
  } catch (error) {
    console.error('Error resetting voice preference:', error);
    await interaction.reply({ content: '❌ Failed to reset setting.', ephemeral: true });
  }
}

/**
 * Handle voice preferences permit select menu
 * Removes users/roles from rejected/banned/view-only lists
 */
async function handleVoicePrefsPermit(interaction, params) {
  const [odUserId] = params;

  if (interaction.user.id !== odUserId) {
    await interaction.reply({ content: 'You cannot use this menu.', ephemeral: true });
    return;
  }

  const selectedValue = interaction.values[0];
  const guildId = interaction.guildId;

  try {
    // Parse the action type and target ID
    // Format: vc_reject_user:ID, vc_reject_role:ID, txt_ban_user:ID, txt_ban_role:ID, txt_viewonly_user:ID, txt_viewonly_role:ID
    const parts = selectedValue.split(':');
    const action = parts[0];
    const targetId = parts[1];

    let successMessage = '';

    switch (action) {
      case 'vc_reject_user':
        await voicePreferences.removeRejectedUser(odUserId, guildId, targetId);
        successMessage = `✅ User has been removed from your voice channel rejected list.`;
        break;
      case 'vc_reject_role':
        await voicePreferences.removeRejectedRole(odUserId, guildId, targetId);
        successMessage = `✅ Role has been removed from your voice channel rejected list.`;
        break;
      case 'txt_ban_user':
        await voicePreferences.removeTextBannedUser(odUserId, guildId, targetId);
        successMessage = `✅ User has been unbanned from your text channel.`;
        break;
      case 'txt_ban_role':
        // Remove from textBannedRoles array
        const prefs = await voicePreferences.getPreferences(odUserId, guildId);
        if (prefs && prefs.textBannedRoles) {
          const updatedRoles = prefs.textBannedRoles.filter(id => id !== targetId);
          await voicePreferences.updatePreference(odUserId, guildId, 'textBannedRoles', updatedRoles);
        }
        successMessage = `✅ Role has been unbanned from your text channel.`;
        break;
      case 'txt_viewonly_user':
        await voicePreferences.removeTextViewOnlyUser(odUserId, guildId, targetId);
        successMessage = `✅ User has been removed from view-only in your text channel.`;
        break;
      case 'txt_viewonly_role':
        // Remove from textViewOnlyRoles array
        const prefsVO = await voicePreferences.getPreferences(odUserId, guildId);
        if (prefsVO && prefsVO.textViewOnlyRoles) {
          const updatedRoles = prefsVO.textViewOnlyRoles.filter(id => id !== targetId);
          await voicePreferences.updatePreference(odUserId, guildId, 'textViewOnlyRoles', updatedRoles);
        }
        successMessage = `✅ Role has been removed from view-only in your text channel.`;
        break;
      // Legacy support for old format
      case 'permit_user':
        await voicePreferences.removeRejectedUser(odUserId, guildId, targetId);
        successMessage = `✅ User has been removed from your rejected list.`;
        break;
      case 'permit_role':
        await voicePreferences.removeRejectedRole(odUserId, guildId, targetId);
        successMessage = `✅ Role has been removed from your rejected list.`;
        break;
      default:
        await interaction.reply({ content: 'Unknown action.', ephemeral: true });
        return;
    }

    await refreshVoicePrefsDisplay(interaction, odUserId, successMessage);
  } catch (error) {
    console.error('Error permitting user/role:', error);
    await interaction.reply({ content: '❌ Failed to update settings.', ephemeral: true });
  }
}

/**
 * Handle clear all voice preferences button
 */
async function handleVoicePrefsClearAll(interaction, userId) {
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'You cannot use this button.', ephemeral: true });
    return;
  }
  
  try {
    await voicePreferences.clearPreferences(userId, interaction.guildId);
    
    const { EmbedBuilder, MessageFlags } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Settings Cleared')
      .setDescription('All your saved voice settings have been cleared.\n\nYour settings will be saved again when you customize your next temporary voice channel.')
      .setColor(0x57F287)
      .setTimestamp();
    
    await interaction.update({ embeds: [embed], components: [] });
  } catch (error) {
    console.error('Error clearing voice preferences:', error);
    await interaction.reply({ content: '❌ Failed to clear settings.', ephemeral: true });
  }
}

/**
 * Handle refresh voice preferences button
 */
async function handleVoicePrefsRefresh(interaction, odUserId) {
  if (interaction.user.id !== odUserId) {
    await interaction.reply({ content: 'You cannot use this button.', ephemeral: true });
    return;
  }

  await refreshVoicePrefsDisplay(interaction, odUserId);
}

/**
 * Resolve user ID to display name
 */
async function resolveUserName(guild, odUserId) {
  try {
    const member = await guild.members.fetch(odUserId).catch(() => null);
    if (member) return member.displayName;
    const user = await guild.client.users.fetch(odUserId).catch(() => null);
    if (user) return user.username;
    return `Unknown (${odUserId})`;
  } catch {
    return `Unknown (${odUserId})`;
  }
}

/**
 * Resolve role ID to role name
 */
async function resolveRoleName(guild, roleId) {
  try {
    const role = await guild.roles.fetch(roleId).catch(() => null);
    return role ? role.name : `Unknown Role (${roleId})`;
  } catch {
    return `Unknown Role (${roleId})`;
  }
}

/**
 * Refresh the voice preferences display
 */
async function refreshVoicePrefsDisplay(interaction, odUserId, successMessage = null) {
  const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const prefs = await voicePreferences.getPreferences(odUserId, interaction.guildId);

  if (!prefs) {
    let content = '# Saved Voice Settings\n\n';
    if (successMessage) content += `${successMessage}\n\n`;
    content += '> You don\'t have any saved settings yet.\n\nYour settings are saved automatically when you customize your temporary voice channel.';

    await interaction.update({ content, embeds: [], components: [] });
    return;
  }

  // Build the settings content with resolved names
  const content = await buildVoicePrefsContent(prefs, interaction.guild, successMessage);

  // Build the action components with resolved names
  const components = await buildVoicePrefsComponents(prefs, odUserId, interaction.guild);

  await interaction.update({ content, embeds: [], components });
}

/**
 * Build the content showing current saved settings
 */
async function buildVoicePrefsContent(prefs, guild, successMessage = null) {
  let content = '# Saved Voice Settings\n';
  if (successMessage) content += `\n${successMessage}\n`;

  // Voice Channel Settings
  const vcSettings = [];
  if (prefs.channelName) vcSettings.push(`Name: ${prefs.channelName}`);
  if (prefs.userLimit !== undefined && prefs.userLimit !== null && prefs.userLimit !== 0) vcSettings.push(`Limit: ${prefs.userLimit}`);
  if (prefs.bitrate) vcSettings.push(`Bitrate: ${prefs.bitrate / 1000} kbps`);
  if (prefs.channelStatus) vcSettings.push(`Status: ${prefs.channelStatus}`);
  if (prefs.region) vcSettings.push(`Region: ${prefs.region}`);
  if (prefs.locked) vcSettings.push(`Locked: Yes`);
  if (prefs.ghosted) vcSettings.push(`Ghosted: Yes`);

  if (vcSettings.length > 0) {
    content += `\n### 🎙️ Voice Channel\n> ${vcSettings.join('\n> ')}\n`;
  }

  // Text Channel Settings
  if (prefs.textChannelName) {
    content += `\n### 💬 Text Channel\n> Name: ${prefs.textChannelName}\n`;
  }

  // Rejected Users/Roles (Voice)
  const vcRestrictions = [];
  if (prefs.rejectedUsers && prefs.rejectedUsers.length > 0) {
    const names = await Promise.all(prefs.rejectedUsers.map(id => resolveUserName(guild, id)));
    vcRestrictions.push(...names.map(n => `❌ ${n}`));
  }
  if (prefs.rejectedRoles && prefs.rejectedRoles.length > 0) {
    const names = await Promise.all(prefs.rejectedRoles.map(id => resolveRoleName(guild, id)));
    vcRestrictions.push(...names.map(n => `❌ @${n}`));
  }

  if (vcRestrictions.length > 0) {
    content += `\n### 🚫 Voice Restrictions\n> ${vcRestrictions.join('\n> ')}\n`;
  }

  // Text Channel Restrictions
  const txtRestrictions = [];
  if (prefs.textBannedUsers && prefs.textBannedUsers.length > 0) {
    const names = await Promise.all(prefs.textBannedUsers.map(id => resolveUserName(guild, id)));
    txtRestrictions.push(...names.map(n => `🚫 ${n} (banned)`));
  }
  if (prefs.textViewOnlyUsers && prefs.textViewOnlyUsers.length > 0) {
    const names = await Promise.all(prefs.textViewOnlyUsers.map(id => resolveUserName(guild, id)));
    txtRestrictions.push(...names.map(n => `👀 ${n} (view-only)`));
  }

  if (txtRestrictions.length > 0) {
    content += `\n### 📝 Text Restrictions\n> ${txtRestrictions.join('\n> ')}\n`;
  }

  return content;
}

/**
 * Build the action components for editing settings
 */
async function buildVoicePrefsComponents(prefs, odUserId, guild) {
  const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const components = [];

  // Reset Settings dropdown
  const editOptions = [
    { label: 'Reset Bitrate', description: 'Voice channel', value: 'reset_bitrate', emoji: '🔊' },
    { label: 'Reset Status', description: 'Voice channel', value: 'reset_status', emoji: '📝' },
    { label: 'Reset Region', description: 'Voice channel', value: 'reset_region', emoji: '🌍' },
    { label: 'Reset Lock State', description: 'Voice channel', value: 'reset_locked', emoji: '🔒' },
    { label: 'Reset Ghost State', description: 'Voice channel', value: 'reset_ghosted', emoji: '👻' },
    { label: 'Reset VC Name', description: 'Voice channel', value: 'reset_name', emoji: '🎙️' },
    { label: 'Reset User Limit', description: 'Voice channel', value: 'reset_limit', emoji: '👥' }
  ];

  if (prefs.textChannelName) {
    editOptions.push({
      label: 'Reset Text Name',
      description: 'Text channel',
      value: 'reset_text_name',
      emoji: '💬'
    });
  }

  const editSelect = new StringSelectMenuBuilder()
    .setCustomId(`voice_prefs_edit:${odUserId}`)
    .setPlaceholder('⚙️ Reset a Setting')
    .addOptions(editOptions);

  components.push(new ActionRowBuilder().addComponents(editSelect));

  // Permit dropdown - all restricted users/roles
  const hasRestricted =
    (prefs.rejectedUsers?.length > 0) ||
    (prefs.rejectedRoles?.length > 0) ||
    (prefs.textBannedUsers?.length > 0) ||
    (prefs.textBannedRoles?.length > 0) ||
    (prefs.textViewOnlyUsers?.length > 0) ||
    (prefs.textViewOnlyRoles?.length > 0);

  if (hasRestricted) {
    const permitOptions = [];

    if (prefs.rejectedUsers && prefs.rejectedUsers.length > 0) {
      for (const odUserId2 of prefs.rejectedUsers.slice(0, 6)) {
        const name = await resolveUserName(guild, odUserId2);
        permitOptions.push({
          label: name.substring(0, 25),
          description: 'Voice: Rejected',
          value: `vc_reject_user:${odUserId2}`,
          emoji: '❌'
        });
      }
    }

    if (prefs.rejectedRoles && prefs.rejectedRoles.length > 0) {
      for (const roleId of prefs.rejectedRoles.slice(0, 5)) {
        const name = await resolveRoleName(guild, roleId);
        permitOptions.push({
          label: name.substring(0, 25),
          description: 'Voice: Rejected Role',
          value: `vc_reject_role:${roleId}`,
          emoji: '❌'
        });
      }
    }

    if (prefs.textBannedUsers && prefs.textBannedUsers.length > 0) {
      for (const odUserId2 of prefs.textBannedUsers.slice(0, 5)) {
        const name = await resolveUserName(guild, odUserId2);
        permitOptions.push({
          label: name.substring(0, 25),
          description: 'Text: Banned',
          value: `txt_ban_user:${odUserId2}`,
          emoji: '🚫'
        });
      }
    }

    if (prefs.textBannedRoles && prefs.textBannedRoles.length > 0) {
      for (const roleId of prefs.textBannedRoles.slice(0, 4)) {
        const name = await resolveRoleName(guild, roleId);
        permitOptions.push({
          label: name.substring(0, 25),
          description: 'Text: Banned Role',
          value: `txt_ban_role:${roleId}`,
          emoji: '🚫'
        });
      }
    }

    if (prefs.textViewOnlyUsers && prefs.textViewOnlyUsers.length > 0) {
      for (const odUserId2 of prefs.textViewOnlyUsers.slice(0, 4)) {
        const name = await resolveUserName(guild, odUserId2);
        permitOptions.push({
          label: name.substring(0, 25),
          description: 'Text: View-Only',
          value: `txt_viewonly_user:${odUserId2}`,
          emoji: '👀'
        });
      }
    }

    if (prefs.textViewOnlyRoles && prefs.textViewOnlyRoles.length > 0) {
      for (const roleId of prefs.textViewOnlyRoles.slice(0, 3)) {
        const name = await resolveRoleName(guild, roleId);
        permitOptions.push({
          label: name.substring(0, 25),
          description: 'Text: View-Only Role',
          value: `txt_viewonly_role:${roleId}`,
          emoji: '👀'
        });
      }
    }

    if (permitOptions.length > 0) {
      const permitSelect = new StringSelectMenuBuilder()
        .setCustomId(`voice_prefs_permit:${odUserId}`)
        .setPlaceholder('✅ Remove Restriction')
        .addOptions(permitOptions.slice(0, 25));

      components.push(new ActionRowBuilder().addComponents(permitSelect));
    }
  }

  // Buttons
  const refreshButton = new ButtonBuilder()
    .setCustomId(`voice_prefs_refresh:${odUserId}`)
    .setLabel('Refresh')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🔄');

  const resetAllButton = new ButtonBuilder()
    .setCustomId(`voice_prefs_clear_all:${odUserId}`)
    .setLabel('Reset All')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');

  components.push(new ActionRowBuilder().addComponents(refreshButton, resetAllButton));

  return components;
}

// ============================================
// Waiting Room Feature Handlers
// ============================================

// Track waiting room join requests: Map<lockedChannelId, Map<userId, { messageId, requestCount }>>
const waitingRoomRequests = new Map();

// Track user rejection counts: Map<`${lockedChannelId}:${userId}`, number>
const waitingRoomRejectionCounts = new Map();

// Track accepted users per waiting room session: Map<waitingRoomChannelId, Set<userId>>
const waitingRoomAcceptedUsers = new Map();

const MAX_REJECTION_COUNT = 3;

/**
 * Gets or creates the waiting room requests map for a channel
 */
function getWaitingRoomRequests(lockedChannelId) {
  if (!waitingRoomRequests.has(lockedChannelId)) {
    waitingRoomRequests.set(lockedChannelId, new Map());
  }
  return waitingRoomRequests.get(lockedChannelId);
}

/**
 * Gets the rejection count for a user in a specific channel
 */
function getRejectionCount(lockedChannelId, userId) {
  const key = `${lockedChannelId}:${userId}`;
  return waitingRoomRejectionCounts.get(key) || 0;
}

/**
 * Increments the rejection count for a user
 */
function incrementRejectionCount(lockedChannelId, userId) {
  const key = `${lockedChannelId}:${userId}`;
  const count = (waitingRoomRejectionCounts.get(key) || 0) + 1;
  waitingRoomRejectionCounts.set(key, count);
  return count;
}

/**
 * Gets the accepted users set for a waiting room
 */
function getWaitingRoomAcceptedUsers(waitingRoomChannelId) {
  if (!waitingRoomAcceptedUsers.has(waitingRoomChannelId)) {
    waitingRoomAcceptedUsers.set(waitingRoomChannelId, new Set());
  }
  return waitingRoomAcceptedUsers.get(waitingRoomChannelId);
}

/**
 * Adds a user to the accepted users list for a waiting room
 */
function addAcceptedUser(waitingRoomChannelId, userId) {
  const acceptedUsers = getWaitingRoomAcceptedUsers(waitingRoomChannelId);
  acceptedUsers.add(userId);
}

/**
 * Checks if a user was previously accepted in this waiting room session
 */
function wasUserPreviouslyAccepted(waitingRoomChannelId, userId) {
  return waitingRoomAcceptedUsers.has(waitingRoomChannelId) && 
         waitingRoomAcceptedUsers.get(waitingRoomChannelId).has(userId);
}

/**
 * Clears waiting room data for a channel (called when waiting room is disabled)
 */
function clearWaitingRoomData(lockedChannelId) {
  waitingRoomRequests.delete(lockedChannelId);
  // Clear rejection counts for this channel
  for (const key of waitingRoomRejectionCounts.keys()) {
    if (key.startsWith(`${lockedChannelId}:`)) {
      waitingRoomRejectionCounts.delete(key);
    }
  }
  // Clear accepted users for this waiting room session
  // Find the waiting room channel ID for this locked channel
  const tempData = dataStore.getTempChannel(lockedChannelId);
  if (tempData?.waiting_room_channel_id) {
    waitingRoomAcceptedUsers.delete(tempData.waiting_room_channel_id);
  }
}

/**
 * Handles enabling/disabling the waiting room feature
 */
async function handleWaitingRoomToggle(interaction, channelId, isUniversal = false) {
  const ownerId = dataStore.getChannelOwner(channelId);
  
  // Strict ownership check - only actual owner can toggle waiting room
  if (interaction.user.id !== ownerId) {
    await interaction.reply({ 
      content: 'Only the channel owner can toggle the waiting room feature.', 
      ephemeral: true 
    });
    return;
  }
  
  // For universal interface, defer with ephemeral
  // For regular interface, defer the update
  if (isUniversal) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  } else {
    try {
      await interaction.deferUpdate();
    } catch (deferError) {
      console.log('Could not defer waiting room toggle interaction:', deferError.message);
    }
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      if (isUniversal) {
        await interaction.followUp({ 
          content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.', 
          ephemeral: true 
        });
      } else {
        await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Channel not found.');
      }
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    const isCurrentlyEnabled = tempData?.waiting_room_channel_id ? true : false;
    
    if (isCurrentlyEnabled) {
      // Disable waiting room - delete the waiting room channel
      await disableWaitingRoom(interaction, channel, tempData, ownerId, isUniversal);
    } else {
      // Enable waiting room - create the waiting room channel and lock main channel
      await enableWaitingRoom(interaction, channel, tempData, ownerId, isUniversal);
    }
  } catch (error) {
    console.error('Error toggling waiting room:', error);
    if (isUniversal) {
      await interaction.followUp({ 
        content: '❌ **Error**\nFailed to toggle waiting room.', 
        ephemeral: true 
      }).catch(() => {});
    } else {
      await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Failed to toggle waiting room.');
    }
  }
}

/**
 * Enables the waiting room for a voice channel
 */
async function enableWaitingRoom(interaction, channel, tempData, ownerId, isUniversal = false) {
  const channelId = channel.id;
  
  if (!isUniversal) {
    // Show success message immediately BEFORE doing the heavy work (only for regular interface)
    const stickyEnabled = stickyNotes.isEnabled(channelId);
    const latestMessageUrl = getLatestMessageUrl(channelId);
    const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
    
    const { components: successComponents, flags: successFlags } = controlPanel.buildSuccessStatePanel(
      interaction.guildId,
      channelId,
      ownerId,
      'Waiting Room Enabled',
      'Setting up waiting room... Users must now request to join.',
      { stickyEnabled, latestMessageUrl, thumbnailUrl }
    );
    
    try {
      await interaction.editReply({ components: successComponents, flags: successFlags });
    } catch (e) {
      await interaction.message.edit({ components: successComponents, flags: successFlags }).catch(() => {});
    }
  }
  
  // Run the actual setup
  try {
    // 1. Lock the main voice channel
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: false
    });
    
    // Ensure owner retains access
    await channel.permissionOverwrites.edit(ownerId, {
      Connect: true,
      ViewChannel: true,
      SendMessages: true
      });
      
      // Ensure current members retain access
      for (const [memberId, member] of channel.members) {
        if (memberId !== ownerId && !member.user.bot) {
          await channel.permissionOverwrites.edit(memberId, {
            Connect: true,
            ViewChannel: true,
            SendMessages: true
          }).catch(() => {});
        }
      }
      
      // 2. Create the waiting room voice channel (below the main channel)
      const waitingRoomName = `${channel.name} Join Request`.substring(0, 100);
      
      // Create the channel first, then move it to the correct position
      const waitingRoomChannel = await interaction.guild.channels.create({
        name: waitingRoomName,
        type: ChannelType.GuildVoice,
        parent: channel.parentId,
        permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
          id: overwrite.id,
          allow: overwrite.allow.toArray(),
          deny: overwrite.deny.toArray()
        }))
      });
      
      // Move the waiting room channel to be directly below the main channel
      try {
        await waitingRoomChannel.setPosition(channel.position + 1);
      } catch (e) {
        console.log('Could not set waiting room position:', e.message);
      }
      
      // Allow everyone to join the waiting room but disable sending messages
      await waitingRoomChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: null, // Reset to default (allow)
        ViewChannel: true,
        SendMessages: false // Disable sending messages in waiting room
      });
      
      // 3. Update temp data with waiting room info
      let currentTempData = dataStore.getTempChannel(channelId) || { owner_id: ownerId };
      currentTempData.waiting_room_channel_id = waitingRoomChannel.id;
      dataStore.setTempChannel(channelId, currentTempData);
      
      // 4. Show final success message
      if (isUniversal) {
        // For universal interface, send ephemeral success message (using editReply since we deferred)
        await interaction.editReply({
          content: '✅ **Waiting Room Enabled**\nUsers must now request to join your voice channel.'
        }).catch(() => {});
        
        // ALSO update the temp VC control panel to show waiting room is enabled
        try {
          const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
          const controlPanelMsg = messages?.find(msg => {
            if (msg.author.id !== interaction.client.user.id) return false;
            if (msg.components?.length > 0) {
              const firstComponent = msg.components[0];
              if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
            }
            return false;
          });
          
          if (controlPanelMsg) {
            const latestUrl = getLatestMessageUrl(channelId);
            const currentStickyEnabled = stickyNotes.isEnabled(channelId);
            const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
              interaction.guildId,
              channelId,
              ownerId,
              { 
                thumbnailUrl, 
                stickyEnabled: currentStickyEnabled, 
                latestMessageUrl: latestUrl,
                waitingRoomEnabled: true
              }
            );
            await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags }).catch(() => {});
          }
        } catch (e) {
          console.log('Could not update temp VC control panel:', e.message);
        }
      } else {
        // For regular interface, revert to normal control panel with waiting room enabled after delay
        const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
        setTimeout(async () => {
          try {
            const latestUrl = getLatestMessageUrl(channelId);
            const currentStickyEnabled = stickyNotes.isEnabled(channelId);
            const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
              interaction.guildId,
              channelId,
              ownerId,
              { 
                thumbnailUrl, 
                stickyEnabled: currentStickyEnabled, 
                latestMessageUrl: latestUrl,
                waitingRoomEnabled: true // Explicitly set to true since we just enabled it
              }
            );
            await interaction.message.edit({ components: normalComponents, flags: normalFlags }).catch(() => {});
          } catch (e) {
            console.log('Could not update control panel after waiting room enable:', e.message);
          }
        }, 2000);
      }
      
      // 5. Send professional welcome message to the waiting room
      try {
        await waitingRoomChannel.send({
          content: `# 🚪 Welcome to the Waiting Room\n\n` +
                  `## You are currently waiting for approval to join the voice channel\n\n` +
                  `> **Important Instructions:**\n` +
                  `> • Stay in this channel until you receive approval\n` +
                  `> • You will be **automatically moved** to the main voice channel once accepted\n` +
                  `> • **Do not leave** this channel or you will lose your place in queue\n\n` +
                  `### What happens next?\n` +
                  `\`\`\`\n` +
                  `1. The channel owner will receive your join request\n` +
                  `2. They can accept or reject your request\n` +
                  `3. If accepted, you'll be moved automatically\n` +
                  `4. If rejected, you'll receive a DM with details\n` +
                  `\`\`\`\n\n` +
                  `*Please be patient while waiting for approval.*`
        });
      } catch (e) {
        console.log('Could not send waiting room welcome message:', e.message);
      }
      
    } catch (error) {
      console.error('Error setting up waiting room:', error);
      if (isUniversal) {
        await interaction.followUp({ 
          content: '❌ **Error**\nFailed to complete waiting room setup.', 
          ephemeral: true 
        }).catch(() => {});
      } else {
        // Try to show error on control panel
        try {
          await showErrorAndRevertDeferred(interaction, channelId, ownerId, 'Error', 'Failed to complete waiting room setup.');
        } catch (e) {
          console.log('Could not show error after waiting room setup failure:', e.message);
        }
      }
    }
}

/**
 * Disables the waiting room for a voice channel
 */
async function disableWaitingRoom(interaction, channel, tempData, ownerId, isUniversal = false) {
  const channelId = channel.id;
  
  try {
    if (!isUniversal) {
      // 1. Show success message immediately (before doing the background work) - only for regular interface
      await showSuccessAndRevertDeferred(
        interaction,
        channelId,
        ownerId,
        'Waiting Room Disabled',
        'The waiting room has been removed and the channel has been unlocked.'
      );
    }
    
    // 2. Run cleanup operations
    // Delete the waiting room channel
    if (tempData.waiting_room_channel_id) {
      const waitingRoomChannel = await interaction.guild.channels.fetch(tempData.waiting_room_channel_id).catch(() => null);
      if (waitingRoomChannel) {
        waitingRoomChannel.delete('Waiting room disabled by owner').catch(e => {
          console.log('Could not delete waiting room channel:', e.message);
        });
      }
    }
    
    // 3. Clear waiting room data
    clearWaitingRoomData(channelId);
    
    // 4. Update temp data
    delete tempData.waiting_room_channel_id;
    dataStore.setTempChannel(channelId, tempData);
    
    // 5. Unlock the channel (remove the lock that was applied when waiting room was enabled)
    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
    } catch (e) {
      console.log('Could not unlock channel:', e.message);
    }
    
    // 6. Send success message for universal interface
    if (isUniversal) {
      await interaction.editReply({
        content: '✅ **Waiting Room Disabled**\nThe waiting room has been removed and the channel has been unlocked.'
      }).catch(() => {});
      
      // ALSO update the temp VC control panel to show waiting room is disabled
      try {
        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        const controlPanelMsg = messages?.find(msg => {
          if (msg.author.id !== interaction.client.user.id) return false;
          if (msg.components?.length > 0) {
            const firstComponent = msg.components[0];
            if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
          }
          return false;
        });
        
        if (controlPanelMsg) {
          const latestUrl = getLatestMessageUrl(channelId);
          const currentStickyEnabled = stickyNotes.isEnabled(channelId);
          const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
          const { components: normalComponents, flags: normalFlags } = controlPanel.buildCompactVoiceControlPanel(
            interaction.guildId,
            channelId,
            ownerId,
            { 
              thumbnailUrl, 
              stickyEnabled: currentStickyEnabled, 
              latestMessageUrl: latestUrl,
              waitingRoomEnabled: false
            }
          );
          await controlPanelMsg.edit({ components: normalComponents, flags: normalFlags }).catch(() => {});
        }
      } catch (e) {
        console.log('Could not update temp VC control panel:', e.message);
      }
    }
    
  } catch (error) {
    console.error('Error disabling waiting room:', error);
    if (isUniversal) {
      await interaction.followUp({ 
        content: '❌ **Error**\nFailed to disable waiting room.', 
        ephemeral: true 
      }).catch(() => {});
    } else {
      await showErrorAndRevertDeferred(interaction, channel.id, ownerId, 'Error', 'Failed to disable waiting room.');
    }
  }
}

/**
 * Handles a user joining the waiting room
 * Called from voiceStateUpdate handler
 */
async function handleWaitingRoomJoin(guild, member, waitingRoomChannel, lockedChannel, tempData) {
  const ownerId = tempData.owner_id;
  const lockedChannelId = lockedChannel.id;
  const userId = member.id;
  
  // Check if user already has permission to join the main channel
  try {
    const userPermissions = lockedChannel.permissionsFor(member);
    const hasConnectPermission = userPermissions?.has('Connect');
    
    // Also check if user has explicit permission overrides
    const userOverride = lockedChannel.permissionOverwrites.cache.get(userId);
    const hasExplicitConnect = userOverride?.allow?.has('Connect');
    
    if (hasConnectPermission || hasExplicitConnect) {
      // User already has permission, auto-redirect them to the main channel
      try {
        await member.voice.setChannel(lockedChannel);
        console.log(`Auto-redirected user ${member.user.tag} to main channel (has permission)`);
        return;
      } catch (error) {
        console.error('Error auto-redirecting user with permission:', error);
        // Continue with normal waiting room flow if redirect fails
      }
    }
  } catch (error) {
    console.error('Error checking user permissions:', error);
    // Continue with normal flow if permission check fails
  }
  
  // Check if user was previously accepted in this waiting room session
  if (wasUserPreviouslyAccepted(waitingRoomChannel.id, userId)) {
    try {
      // Auto-redirect previously accepted user
      await lockedChannel.permissionOverwrites.edit(userId, {
        Connect: true,
        ViewChannel: true
      });
      
      await member.voice.setChannel(lockedChannel);
      console.log(`Auto-redirected previously accepted user ${member.user.tag} to locked channel`);
      return;
    } catch (error) {
      console.error('Error auto-redirecting previously accepted user:', error);
      // Continue with normal flow if auto-redirect fails
    }
  }
  
  // Check if user has exceeded rejection limit
  const rejectionCount = getRejectionCount(lockedChannelId, userId);
  if (rejectionCount >= MAX_REJECTION_COUNT) {
    // Silently ignore - user has been rejected too many times
    console.log(`User ${userId} has exceeded rejection limit for channel ${lockedChannelId}`);
    return;
  }
  
  // Check if there's already a pending request for this user
  const requests = getWaitingRoomRequests(lockedChannelId);
  if (requests.has(userId)) {
    // Already has a pending request
    return;
  }
  
  try {
    // 1. Ghost ping the user in the waiting room
    try {
      const pingMsg = await waitingRoomChannel.send(`<@${userId}>`);
      await pingMsg.delete().catch(() => {});
    } catch (e) {
      console.log('Could not send ghost ping:', e.message);
    }
    
    // 2. Send join request to the locked VC (main voice channel)
    const targetChannel = lockedChannel;
    
    const { embed, components } = controlPanel.buildWaitingRoomRequestEmbed({
      requesterId: userId,
      ownerId: ownerId,
      lockedChannelId: lockedChannelId,
      waitingRoomChannelId: waitingRoomChannel.id,
      serverIconUrl: guild.iconURL({ dynamic: true })
    });
    
    const requestMessage = await targetChannel.send({
      content: `<@${ownerId}>`,
      embeds: [embed],
      components
    });
    
    // 3. Track the request
    requests.set(userId, {
      messageId: requestMessage.id,
      channelId: targetChannel.id
    });
    
  } catch (error) {
    console.error('Error handling waiting room join:', error);
  }
}

/**
 * Handles accepting a waiting room join request
 */
async function handleWaitingRoomAccept(interaction, lockedChannelId, waitingRoomChannelId, requesterId) {
  const ownerId = dataStore.getChannelOwner(lockedChannelId);
  
  // Only owner can accept
  if (interaction.user.id !== ownerId) {
    await interaction.reply({ 
      content: 'Only the channel owner can accept join requests.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    // 1. Get the requester member
    const requester = await interaction.guild.members.fetch(requesterId).catch(() => null);
    if (!requester) {
      await interaction.update({
        content: '❌ User not found or has left the server.',
        embeds: [],
        components: []
      });
      // Clean up tracking
      const requests = getWaitingRoomRequests(lockedChannelId);
      requests.delete(requesterId);
      return;
    }
    
    // 2. Check if user is still in the waiting room
    if (!requester.voice.channel || requester.voice.channel.id !== waitingRoomChannelId) {
      await interaction.update({
        content: '❌ User is no longer in the waiting room.',
        embeds: [],
        components: []
      });
      // Clean up tracking
      const requests = getWaitingRoomRequests(lockedChannelId);
      requests.delete(requesterId);
      return;
    }
    
    // 3. Grant permission and move user to locked channel
    const lockedChannel = await interaction.guild.channels.fetch(lockedChannelId);
    
    await lockedChannel.permissionOverwrites.edit(requesterId, {
      Connect: true,
      ViewChannel: true
    });
    
    await requester.voice.setChannel(lockedChannel);
    
    // Track this user as accepted for this waiting room session
    addAcceptedUser(waitingRoomChannelId, requesterId);
    
    // 4. Delete the request message
    await interaction.update({
      content: `✅ <@${requesterId}> has been accepted and moved to the channel.`,
      embeds: [],
      components: []
    });
    
    // 5. Clean up tracking
    const requests = getWaitingRoomRequests(lockedChannelId);
    requests.delete(requesterId);
    
  } catch (error) {
    console.error('Error accepting waiting room request:', error);
    await interaction.reply({ 
      content: 'Failed to accept the request. The user may have left.', 
      ephemeral: true 
    }).catch(() => {
      // If reply fails, try update
      interaction.update({
        content: '❌ Failed to accept the request.',
        embeds: [],
        components: []
      }).catch(() => {});
    });
  }
}

/**
 * Handles rejecting a waiting room join request
 */
async function handleWaitingRoomReject(interaction, lockedChannelId, waitingRoomChannelId, requesterId) {
  const ownerId = dataStore.getChannelOwner(lockedChannelId);
  
  // Only owner can reject
  if (interaction.user.id !== ownerId) {
    await interaction.reply({ 
      content: 'Only the channel owner can reject join requests.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    // 1. Get the requester member
    const requester = await interaction.guild.members.fetch(requesterId).catch(() => null);
    
    // 2. Increment rejection count
    const newCount = incrementRejectionCount(lockedChannelId, requesterId);
    
    // 3. Get locked channel info for DM
    const lockedChannel = await interaction.guild.channels.fetch(lockedChannelId).catch(() => null);
    
    if (requester) {
      // 4. Disconnect user from waiting room if still there
      if (requester.voice.channel && requester.voice.channel.id === waitingRoomChannelId) {
        await requester.voice.disconnect('Join request rejected');
      }
      
      // 5. Send rejection DM using existing reject notification embed
      try {
        const { embed: rejectEmbed, components: rejectComponents } = controlPanel.buildRejectNotificationEmbed({
          channelName: lockedChannel?.name || 'Voice Channel',
          channelId: lockedChannelId,
          guildId: interaction.guildId,
          serverName: interaction.guild.name,
          rejectedById: ownerId,
          reason: newCount >= MAX_REJECTION_COUNT 
            ? 'Your join request was rejected. You have reached the maximum number of requests for this channel.'
            : 'Your join request was rejected by the channel owner.',
          serverIconUrl: interaction.guild.iconURL({ dynamic: true })
        });
        
        await requester.send({ embeds: [rejectEmbed], components: rejectComponents });
      } catch (dmError) {
        console.log(`Could not send rejection DM to ${requesterId}:`, dmError.message);
      }
    }
    
    // 6. Update the request message
    const remainingAttempts = MAX_REJECTION_COUNT - newCount;
    await interaction.update({
      content: `❌ <@${requesterId}>'s request has been rejected.${remainingAttempts > 0 ? ` (${remainingAttempts} attempts remaining)` : ' (No more attempts allowed)'}`,
      embeds: [],
      components: []
    });
    
    // 7. Clean up tracking
    const requests = getWaitingRoomRequests(lockedChannelId);
    requests.delete(requesterId);
    
  } catch (error) {
    console.error('Error rejecting waiting room request:', error);
    await interaction.reply({ 
      content: 'Failed to reject the request.', 
      ephemeral: true 
    });
  }
}

/**
 * Handles cleanup when a user leaves the waiting room before approval
 * Called from voiceStateUpdate handler
 */
async function handleWaitingRoomLeave(guild, userId, lockedChannelId) {
  const requests = getWaitingRoomRequests(lockedChannelId);
  const requestData = requests.get(userId);
  
  if (!requestData) return;
  
  try {
    // Delete the request message
    const channel = await guild.channels.fetch(requestData.channelId).catch(() => null);
    if (channel) {
      const message = await channel.messages.fetch(requestData.messageId).catch(() => null);
      if (message) {
        await message.delete().catch(() => {});
      }
    }
  } catch (error) {
    console.log('Error cleaning up waiting room request:', error.message);
  }
  
  // Remove from tracking
  requests.delete(userId);
}

// Export waiting room handlers for use in voiceStateUpdate
module.exports.handleWaitingRoomJoin = handleWaitingRoomJoin;
module.exports.handleWaitingRoomLeave = handleWaitingRoomLeave;
module.exports.clearWaitingRoomData = clearWaitingRoomData;
