/**
 * Message Create Event Handler
 * Handles sticky note tracking and posting for control panels
 * Requirements: 1.2, 3.2, 3.3, 7.1, 7.2
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const stickyNotes = require('../voice/stickyNotes');
const dataStore = require('../voice/dataStore');
const controlPanel = require('../voice/controlPanel');

// Track message counts for "Go to Latest" button updates
// Map<channelId, { controlMessageId, messagesSincePanel, fifthMessageId, guildId, ownerId }>
const goToLatestTracking = new Map();

// Threshold for updating "Go to Latest" button (every 5th message)
const GO_TO_LATEST_THRESHOLD = 5;

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    // Ignore bot messages to prevent loops
    if (message.author.bot) return;
    
    try {
      const channelId = message.channel.id;
      
      // Handle sticky notes tracking
      await handleStickyNotes(message, channelId);
      
      // Handle "Go to Latest" button tracking
      await handleGoToLatest(message, channelId);
    } catch (error) {
      console.error('Error in messageCreate:', error);
    }
  }
};

/**
 * Handles sticky note message tracking and posting
 * Deletes the previous sticky message before posting a new one
 * Requirements: 1.2, 3.2, 3.3
 */
async function handleStickyNotes(message, channelId) {
  // Check if sticky notes are enabled for this channel
  if (!stickyNotes.isEnabled(channelId)) return;
  
  // Increment the message counter
  const newCount = stickyNotes.incrementMessageCount(channelId);
  
  // Check if we should post a sticky note link
  // Use the count directly to avoid race conditions
  const stickyState = stickyNotes.getStickyState(channelId);
  if (!stickyState || !stickyState.controlPanelUrl) return;
  
  const threshold = stickyState.threshold || 12;
  if (newCount < threshold) return;
  
  // Reset counter IMMEDIATELY to prevent multiple posts
  stickyNotes.resetCounter(channelId);
  
  try {
    // Delete the previous sticky message if it exists
    const lastStickyId = stickyNotes.getLastStickyMessageId(channelId);
    if (lastStickyId) {
      try {
        const lastStickyMessage = await message.channel.messages.fetch(lastStickyId);
        if (lastStickyMessage) {
          await lastStickyMessage.delete();
          console.log(`Deleted previous sticky message ${lastStickyId} in channel ${channelId}`);
        }
      } catch (deleteError) {
        // Message may already be deleted, ignore
        console.log(`Could not delete previous sticky message: ${deleteError.message}`);
      }
    }
    
    // Build the "Jump to Control Panel" button
    const jumpButton = new ButtonBuilder()
      .setLabel('Jump to Control Panel')
      .setStyle(ButtonStyle.Link)
      .setURL(stickyState.controlPanelUrl)
      .setEmoji('📌');
    
    const row = new ActionRowBuilder().addComponents(jumpButton);
    
    // Send just the button (no text message)
    const stickyMessage = await message.channel.send({
      components: [row]
    });
    
    // Track the new sticky message ID for future deletion
    stickyNotes.setLastStickyMessageId(channelId, stickyMessage.id);
    
    console.log(`Posted sticky note link in channel ${channelId}`);
  } catch (error) {
    console.error('Error posting sticky note link:', error);
  }
}

/**
 * Handles "Go to Latest" button tracking and updates
 * Tracks every 3rd message and updates the control panel button
 * Works for both voice channel chats and linked text channels
 * Requirements: 7.1, 7.2
 */
async function handleGoToLatest(message, channelId) {
  // Check if this is a temp voice channel or a linked text channel
  let voiceChannelId = null;
  let isLinkedTextChannel = false;
  
  // First check if this is a temp voice channel directly
  const tempData = dataStore.getTempChannel(channelId);
  if (tempData) {
    voiceChannelId = channelId;
    console.log(`Go to Latest: Channel ${channelId} is a temp voice channel`);
  } else {
    // Check if this is a text channel linked to a voice channel
    const tempChannels = getAllLinkedTextChannels();
    voiceChannelId = tempChannels.get(channelId);
    if (voiceChannelId) {
      isLinkedTextChannel = true;
      console.log(`Go to Latest: Channel ${channelId} is linked to voice channel ${voiceChannelId}`);
    }
  }
  
  if (!voiceChannelId) {
    // Not a tracked channel, skip
    return;
  }
  
  const channelTempData = dataStore.getTempChannel(voiceChannelId);
  if (!channelTempData) return;
  
  // Initialize tracking if not exists
  if (!goToLatestTracking.has(channelId)) {
    console.log(`Go to Latest: Initializing tracking for channel ${channelId}`);
    // Try to find the control panel message
    const controlMessageId = await findControlPanelMessage(message.channel, message.client);
    if (controlMessageId) {
      goToLatestTracking.set(channelId, {
        controlMessageId,
        messagesSincePanel: 1,
        fifthMessageId: message.id, // First message becomes the initial target
        guildId: message.guild.id,
        ownerId: channelTempData.owner_id,
        voiceChannelId: voiceChannelId,
        isLinkedTextChannel: isLinkedTextChannel
      });
      console.log(`Go to Latest: Tracking initialized with control message ${controlMessageId}`);
    } else {
      console.log(`Go to Latest: Could not find control panel message`);
    }
    return;
  }
  
  const tracking = goToLatestTracking.get(channelId);
  tracking.messagesSincePanel++;
  console.log(`Go to Latest: Message count for ${channelId}: ${tracking.messagesSincePanel}/${GO_TO_LATEST_THRESHOLD}`);
  
  // Every 5th message, update the tracking and the control panel
  if (tracking.messagesSincePanel >= GO_TO_LATEST_THRESHOLD) {
    tracking.fifthMessageId = message.id;
    
    try {
      await updateControlPanelGoToLatest(message.channel, tracking, message.client);
      // Reset counter after update
      tracking.messagesSincePanel = 0;
    } catch (error) {
      console.error('Error updating Go to Latest button:', error);
    }
  }
}

/**
 * Gets all text channels linked to voice channels
 * Returns Map<textChannelId, voiceChannelId>
 */
function getAllLinkedTextChannels() {
  const linkedChannels = new Map();
  const data = dataStore.loadVoiceData();
  
  for (const [voiceChannelId, tempData] of Object.entries(data.temp_channels)) {
    if (tempData.text_channel_id) {
      linkedChannels.set(tempData.text_channel_id, voiceChannelId);
    }
  }
  
  return linkedChannels;
}

/**
 * Finds the control panel message in a channel
 * Works with both embed-based and Components V2 control panels
 * Excludes sticky note messages (which only have Link buttons)
 */
async function findControlPanelMessage(channel, client) {
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const controlMessage = messages.find(msg => {
      if (msg.author.id !== client.user.id) return false;
      
      // Check for Components V2 control panel
      // Components V2 uses containers which have a different structure
      if (msg.components && msg.components.length > 0) {
        // For Components V2, the first component is usually a Container
        // Check if message has the IsComponentsV2 flag or has container-like structure
        const firstComponent = msg.components[0];
        
        // Components V2 containers have type 17 (Container)
        if (firstComponent.type === 17 || firstComponent.data?.type === 17) {
          return true;
        }
        
        // Also check for action rows with our custom IDs
        // This excludes sticky notes which only have Link buttons (no customId)
        const hasControlPanelButton = msg.components.some(row => {
          // Check direct components
          if (row.components) {
            return row.components.some(comp => {
              const customId = comp.customId || comp.custom_id || comp.data?.custom_id;
              // Must have a customId (Link buttons don't have customId)
              if (!customId) return false;
              // Control panel buttons/selects have these prefixes
              return customId.startsWith('sticky_note:') ||
                customId.startsWith('voice_settings:') ||
                customId.startsWith('voice_permissions:') ||
                customId.startsWith('text_settings:') ||
                customId.startsWith('text_take_actions:') ||
                customId.startsWith('text_remove_actions:') ||
                customId.startsWith('text_edit_name:') ||
                customId.startsWith('text_delete:') ||
                customId.startsWith('text_sticky:');
            });
          }
          return false;
        });
        if (hasControlPanelButton) return true;
      }
      
      // Check for embed-based control panel (legacy)
      if (msg.embeds.length > 0 && msg.embeds[0].title?.includes('Control Panel')) {
        return true;
      }
      
      return false;
    });
    
    if (controlMessage) {
      console.log(`Found control panel message: ${controlMessage.id}`);
    } else {
      console.log(`No control panel message found in channel ${channel.id}`);
    }
    
    return controlMessage?.id || null;
  } catch (error) {
    console.error('Error finding control panel message:', error);
    return null;
  }
}

/**
 * Updates the control panel with the new "Go to Latest" URL
 * Rebuilds the entire control panel with the updated button
 * Uses the correct builder based on whether it's a voice or text channel
 * Requirements: 7.1, 7.2
 */
async function updateControlPanelGoToLatest(channel, tracking, client) {
  try {
    const controlMessage = await channel.messages.fetch(tracking.controlMessageId);
    if (!controlMessage) return;
    
    // Build the new Go to Latest URL
    const latestMessageUrl = `https://discord.com/channels/${tracking.guildId}/${channel.id}/${tracking.fifthMessageId}`;
    
    // Check if sticky notes are enabled for this channel
    const stickyEnabled = stickyNotes.isEnabled(channel.id);
    
    let components, flags;
    
    if (tracking.isLinkedTextChannel) {
      // Use text channel control panel for linked text channels
      const result = controlPanel.buildCompactTextControlPanel(
        tracking.guildId,
        channel.id,
        tracking.voiceChannelId,
        tracking.ownerId,
        {
          stickyEnabled,
          latestMessageUrl
        }
      );
      components = result.components;
      flags = result.flags;
    } else {
      // Use voice channel control panel for voice channels
      const thumbnailUrl = client.user.displayAvatarURL({ dynamic: true, size: 128 });
      const result = controlPanel.buildCompactVoiceControlPanel(
        tracking.guildId,
        channel.id,
        tracking.ownerId,
        {
          thumbnailUrl,
          stickyEnabled,
          latestMessageUrl
        }
      );
      components = result.components;
      flags = result.flags;
    }
    
    // Update the message with the new control panel
    await controlMessage.edit({ components, flags });
    
    console.log(`Updated Go to Latest button in channel ${channel.id} to message ${tracking.fifthMessageId}`);
  } catch (error) {
    console.error('Error updating control panel Go to Latest:', error);
  }
}

/**
 * Initializes tracking for a channel when control panel is created/reset
 * Called from other modules when needed
 */
function initializeGoToLatestTracking(channelId, controlMessageId, guildId, ownerId) {
  goToLatestTracking.set(channelId, {
    controlMessageId,
    messagesSincePanel: 0,
    fifthMessageId: null,
    guildId,
    ownerId
  });
}

/**
 * Clears tracking for a channel (cleanup on channel delete)
 */
function clearGoToLatestTracking(channelId) {
  goToLatestTracking.delete(channelId);
}

/**
 * Gets the latest message URL for a channel from tracking data
 * Used by interactionCreate.js to preserve the Go to Latest URL when rebuilding control panels
 * @param {string} channelId - The channel ID to get the URL for
 * @returns {string|null} The latest message URL or null if not tracked/no fifthMessageId
 */
function getLatestMessageUrl(channelId) {
  const tracking = goToLatestTracking.get(channelId);
  if (!tracking || !tracking.fifthMessageId) {
    return null;
  }
  return `https://discord.com/channels/${tracking.guildId}/${channelId}/${tracking.fifthMessageId}`;
}

// Export helper functions for use by other modules
module.exports.initializeGoToLatestTracking = initializeGoToLatestTracking;
module.exports.clearGoToLatestTracking = clearGoToLatestTracking;
module.exports.getLatestMessageUrl = getLatestMessageUrl;
module.exports.goToLatestTracking = goToLatestTracking;
