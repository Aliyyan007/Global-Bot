/**
 * Universal Interface Handlers (Refactored)
 * Handles all interactions from the universal voice control panel interface
 * 
 * Key Features:
 * - Single ephemeral message per user (edited for all interactions)
 * - No close buttons (Discord auto-dismisses ephemeral messages)
 * - Interface resets after each interaction for reusability
 * - Waiting Room & Sticky Note managers don't edit the universal interface
 * - All changes sync to the temp VC control panel
 * - Independent of text channel settings
 * - Owner/Admin/Mod must be IN the VC to control it
 */

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const dataStore = require('../voice/dataStore');
const controlPanel = require('../voice/controlPanel');
const modals = require('../voice/modals');
const stickyNotes = require('../voice/stickyNotes');
const voicePreferences = require('../voice/voicePreferences');
const { getLatestMessageUrl } = require('./messageCreate');

// Import shared utilities
const { parseEmojisInText } = require('../voice/utils/emojiParser');
const { hasElevatedPermissions } = require('../voice/utils/permissionUtils');
const { canRenameChannel: checkRenameLimit, trackChannelRename } = require('../voice/utils/rateLimitTracker');
const { sendEphemeralMessage: sendEphemeral } = require('../voice/utils/ephemeralMessageManager');

/**
 * Verifies user can control the temp VC
 * - Owner can always control their VC (if in it)
 * - Admin/Mod can control any VC (if in it)
 * - Must be in the voice channel
 */
async function verifyUniversalPermissions(interaction, channelId, ownerId) {
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isVoiceBased()) {
      return { allowed: false, reason: 'Channel not found or not a voice channel' };
    }


    // Check if user is in the voice channel
    const isInChannel = channel.members.has(interaction.user.id);
    if (!isInChannel) {
      return { 
        allowed: false, 
        reason: '❌ **Not in Voice Channel**\nYou must be in the temporary voice channel to use these controls.' 
      };
    }

    // Check if user is owner
    const isOwner = interaction.user.id === ownerId;
    if (isOwner) {
      return { allowed: true };
    }

    // Check if user has elevated permissions
    const isElevated = hasElevatedPermissions(interaction.member);
    if (isElevated) {
      return { allowed: true };
    }

    // Not owner and not elevated
    return { 
      allowed: false, 
      reason: '❌ **Permission Denied**\nOnly the channel owner or server moderators can use these controls.' 
    };
  } catch (error) {
    console.error('Error verifying universal permissions:', error);
    return { allowed: false, reason: '❌ **Error**\nFailed to verify permissions.' };
  }
}

/**
 * Refreshes the universal interface (resets select menus)
 * This allows users to select the same option again
 * Runs in background, doesn't block the ephemeral response
 */
async function refreshUniversalInterface(interaction, channelId, ownerId) {
  // Run in background
  setImmediate(async () => {
    try {
      // Skip if interaction doesn't have a message (e.g., modal interactions)
      if (!interaction.message) {
        return;
      }

      // Get the current state
      const tempData = dataStore.getTempChannel(channelId);
      const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;

      // Rebuild the universal interface
      const { components, flags } = controlPanel.buildUniversalVoiceControlPanel(
        interaction.guildId,
        'UNIVERSAL', // Keep as UNIVERSAL for future interactions
        'UNIVERSAL',
        {
          thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
          waitingRoomEnabled: false // Universal interface doesn't show state
        }
      );

      // Edit the original message to reset select menus
      await interaction.message.edit({ components, flags }).catch(() => {});
    } catch (error) {
      console.log('Could not refresh universal interface:', error.message);
    }
  });
}

/**
 * Updates the temp VC control panel in the voice channel
 * Syncs changes made via universal interface to the actual control panel
 * Runs in background
 */
async function updateTempVCPanel(interaction, channelId, ownerId, options = {}) {
  // Run in background
  setImmediate(async () => {
    try {
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (!messages) return;

      // Find the control panel message (Components V2 container)
      const controlPanelMsg = messages.find(msg => {
        if (msg.author.id !== interaction.client.user.id) return false;
        if (msg.components?.length > 0) {
          const firstComponent = msg.components[0];
          // Check for Components V2 container (type 17)
          if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
        }
        return false;
      });

      if (!controlPanelMsg) return;

      // Get current state
      const latestUrl = getLatestMessageUrl(channelId);
      const currentStickyEnabled = stickyNotes.isEnabled(channelId);
      const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
      const tempData = dataStore.getTempChannel(channelId);
      const waitingRoomEnabled = options.waitingRoomEnabled !== undefined 
        ? options.waitingRoomEnabled 
        : (tempData?.waiting_room_channel_id ? true : false);

      // Rebuild the temp VC control panel with updated state
      const { components, flags } = controlPanel.buildCompactVoiceControlPanel(
        interaction.guildId,
        channelId,
        ownerId,
        {
          thumbnailUrl,
          stickyEnabled: currentStickyEnabled,
          latestMessageUrl: latestUrl,
          waitingRoomEnabled
        }
      );

      // Edit the control panel message
      await controlPanelMsg.edit({ components, flags }).catch(() => {});
    } catch (error) {
      console.log('Could not update temp VC control panel:', error.message);
    }
  });
}

/**
 * Handles waiting room manager for universal interface
 * Opens a manager panel that doesn't edit the universal interface
 */
async function handleWaitingRoomManagerUniversal(interaction, channelId, ownerId) {
  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      await refreshUniversalInterface(interaction, channelId, ownerId);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      await refreshUniversalInterface(interaction, channelId, ownerId);
      return;
    }

    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      await refreshUniversalInterface(interaction, channelId, ownerId);
      return;
    }

    const isEnabled = tempData.waiting_room_channel_id ? true : false;

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embed = new EmbedBuilder()
      .setTitle('🚪 Waiting Room Manager')
      .setDescription(`Current Status: **${isEnabled ? 'Enabled' : 'Disabled'}**\n\nWaiting Room creates a separate channel where users must request to join your voice channel.`)
      .setColor(isEnabled ? 0x57F287 : 0x5865F2);

    const enableButton = new ButtonBuilder()
      .setCustomId(`waiting_room_enable:${channelId}:${ownerId}:UNIVERSAL`)
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(isEnabled);

    const disableButton = new ButtonBuilder()
      .setCustomId(`waiting_room_disable:${channelId}:${ownerId}:UNIVERSAL`)
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(!isEnabled);

    const row = new ActionRowBuilder().addComponents(enableButton, disableButton);

    // Send manager panel (doesn't edit universal interface)
    await sendEphemeral(interaction, '', {
      embeds: [embed],
      components: [row],
      channelId,
      ownerId
    });

    // Refresh universal interface in background
    await refreshUniversalInterface(interaction, channelId, ownerId);
  } catch (error) {
    console.error('Error in handleWaitingRoomManagerUniversal:', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to open waiting room manager.');
  }
}

/**
 * Handles waiting room enable button
 */
async function handleWaitingRoomEnableUniversal(interaction, channelId, ownerId) {
  console.log('[handleWaitingRoomEnableUniversal] ENTRY - Function called:', {
    channelId,
    ownerId,
    userId: interaction.user.id
  });
  
  // Defer update (button interaction)
  await interaction.deferUpdate().catch(() => {});

  try {
    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    const tempData = dataStore.getTempChannel(channelId);
    
    // Send immediate response
    console.log('[handleWaitingRoomEnableUniversal] Sending immediate response...');
    await sendEphemeral(interaction, '⏳ **Enabling Waiting Room...**\nPlease wait while the waiting room is being set up.');
    
    // Process in background
    console.log('[handleWaitingRoomEnableUniversal] Starting background process...');
    setImmediate(async () => {
      console.log('[handleWaitingRoomEnableUniversal] Background process started');
      try {
        await enableWaitingRoomUniversal(interaction, channel, tempData, ownerId);
        console.log('[handleWaitingRoomEnableUniversal] Background process completed successfully');
      } catch (error) {
        console.error('[handleWaitingRoomEnableUniversal] Background process error:', error);
        await sendEphemeral(interaction, '❌ **Error**\nFailed to enable waiting room.');
      }
    });
    console.log('[handleWaitingRoomEnableUniversal] setImmediate scheduled');
  } catch (error) {
    console.error('Error enabling waiting room (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to enable waiting room.');
  }
}

/**
 * Handles waiting room disable button
 */
async function handleWaitingRoomDisableUniversal(interaction, channelId, ownerId) {
  // Defer update (button interaction)
  await interaction.deferUpdate().catch(() => {});

  try {
    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    const tempData = dataStore.getTempChannel(channelId);
    
    // Send immediate response
    await sendEphemeral(interaction, '⏳ **Disabling Waiting Room...**\nPlease wait while the waiting room is being removed.');
    
    // Process in background
    setImmediate(async () => {
      await disableWaitingRoomUniversal(interaction, channel, tempData, ownerId);
    });
  } catch (error) {
    console.error('Error disabling waiting room (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to disable waiting room.');
  }
}

/**
 * Enables waiting room for universal interface
 */
async function enableWaitingRoomUniversal(interaction, channel, tempData, ownerId) {
  console.log('[enableWaitingRoomUniversal] ENTRY - Function called:', {
    channelId: channel.id,
    ownerId,
    userId: interaction.user.id
  });
  
  const channelId = channel.id;

  try {
    console.log('[enableWaitingRoomUniversal] Step 1: Locking main voice channel...');
    // 1. Lock the main voice channel
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: false
    });
    console.log('[enableWaitingRoomUniversal] Main channel locked');

    // Ensure owner retains access
    await channel.permissionOverwrites.edit(ownerId, {
      Connect: true,
      ViewChannel: true,
      SendMessages: true
    });
    console.log('[enableWaitingRoomUniversal] Owner permissions set');

    // Ensure current members retain access
    console.log('[enableWaitingRoomUniversal] Setting permissions for current members...');
    for (const [memberId, member] of channel.members) {
      if (memberId !== ownerId && !member.user.bot) {
        await channel.permissionOverwrites.edit(memberId, {
          Connect: true,
          ViewChannel: true,
          SendMessages: true
        }).catch(() => {});
      }
    }
    console.log('[enableWaitingRoomUniversal] Current member permissions set');

    // 2. Create the waiting room voice channel
    console.log('[enableWaitingRoomUniversal] Step 2: Creating waiting room channel...');
    const waitingRoomName = `${channel.name} Join Request`.substring(0, 100);
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
    console.log('[enableWaitingRoomUniversal] Waiting room channel created:', waitingRoomChannel.id);

    // Move the waiting room channel below the main channel
    try {
      await waitingRoomChannel.setPosition(channel.position + 1);
      console.log('[enableWaitingRoomUniversal] Waiting room position set');
    } catch (e) {
      console.log('Could not set waiting room position:', e.message);
    }

    // Allow everyone to join the waiting room
    console.log('[enableWaitingRoomUniversal] Setting waiting room permissions...');
    await waitingRoomChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: null,
      ViewChannel: true,
      SendMessages: false
    });

    // 3. Update temp data
    let currentTempData = dataStore.getTempChannel(channelId) || { owner_id: ownerId };
    currentTempData.waiting_room_channel_id = waitingRoomChannel.id;
    dataStore.setTempChannel(channelId, currentTempData);

    // 4. Send ephemeral success message
    await sendEphemeral(interaction, '✅ **Waiting Room Enabled**\nUsers must now request to join your voice channel.');

    // 5. Update the temp VC control panel in background
    await updateTempVCPanel(interaction, channelId, ownerId, { waitingRoomEnabled: true });

    // 6. Send welcome message to waiting room
    setImmediate(async () => {
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
    });
  } catch (error) {
    console.error('Error enabling waiting room (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to enable waiting room.');
  }
}

/**
 * Disables waiting room for universal interface
 */
async function disableWaitingRoomUniversal(interaction, channel, tempData, ownerId) {
  const channelId = channel.id;

  try {
    // Delete the waiting room channel
    if (tempData.waiting_room_channel_id) {
      const waitingRoomChannel = await interaction.guild.channels.fetch(tempData.waiting_room_channel_id).catch(() => null);
      if (waitingRoomChannel) {
        await waitingRoomChannel.delete('Waiting room disabled by owner').catch(e => {
          console.log('Could not delete waiting room channel:', e.message);
        });
      }
    }

    // Update temp data
    delete tempData.waiting_room_channel_id;
    dataStore.setTempChannel(channelId, tempData);

    // Unlock the channel
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null }).catch(() => {});

    // Send ephemeral success message
    await sendEphemeral(interaction, '✅ **Waiting Room Disabled**\nThe waiting room has been removed and the channel has been unlocked.');

    // Update the temp VC control panel in background
    await updateTempVCPanel(interaction, channelId, ownerId, { waitingRoomEnabled: false });
  } catch (error) {
    console.error('Error disabling waiting room (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to disable waiting room.');
  }
}

/**
 * Handles sticky note manager for universal interface
 * Opens a manager panel that doesn't edit the universal interface
 */
async function handleStickyNoteManagerUniversal(interaction, channelId, ownerId) {
  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      await refreshUniversalInterface(interaction, channelId, ownerId);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      await refreshUniversalInterface(interaction, channelId, ownerId);
      return;
    }

    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      await refreshUniversalInterface(interaction, channelId, ownerId);
      return;
    }

    // Check sticky note status for both voice channel and text channel (if exists)
    const textChannelId = tempData.text_channel_id;
    const voiceChannelId = channelId;

    // Determine which channel has sticky notes enabled
    const voiceStickyEnabled = stickyNotes.isEnabled(voiceChannelId);
    const textStickyEnabled = textChannelId ? stickyNotes.isEnabled(textChannelId) : false;
    const isEnabled = voiceStickyEnabled || textStickyEnabled;

    console.log('[Sticky Note Manager] Status check:', {
      voiceChannelId,
      textChannelId,
      voiceStickyEnabled,
      textStickyEnabled,
      isEnabled
    });

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    let description = `Current Status: **${isEnabled ? 'Enabled' : 'Disabled'}**\n\nSticky Notes automatically sends the control panel link after every 8 messages to keep it accessible.`;

    // Add info about which channel has sticky notes
    if (voiceStickyEnabled && textStickyEnabled) {
      description += `\n\n*Enabled for both voice and text channels*`;
    } else if (voiceStickyEnabled) {
      description += `\n\n*Enabled for voice channel only*`;
    } else if (textStickyEnabled) {
      description += `\n\n*Enabled for text channel only*`;
    }

    const embed = new EmbedBuilder()
      .setTitle('📌 Sticky Note Manager')
      .setDescription(description)
      .setColor(isEnabled ? 0x57F287 : 0x5865F2);

    const enableButton = new ButtonBuilder()
      .setCustomId(`sticky_enable:${channelId}:${ownerId}:UNIVERSAL`)
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(isEnabled);

    const disableButton = new ButtonBuilder()
      .setCustomId(`sticky_disable:${channelId}:${ownerId}:UNIVERSAL`)
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(!isEnabled);

    const row = new ActionRowBuilder().addComponents(enableButton, disableButton);

    // Send manager panel (doesn't edit universal interface)
    await sendEphemeral(interaction, '', {
      embeds: [embed],
      components: [row],
      channelId,
      ownerId
    });

    // Refresh universal interface in background
    await refreshUniversalInterface(interaction, channelId, ownerId);
  } catch (error) {
    console.error('Error in handleStickyNoteManagerUniversal:', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to open sticky note manager.');
  }
}

/**
 * Handles sticky note enable for universal interface
 */
async function handleStickyEnableUniversal(interaction, channelId, ownerId) {
  // Defer update (button interaction)
  await interaction.deferUpdate().catch(() => {});

  try {
    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      return;
    }

    // Send immediate response
    await sendEphemeral(interaction, '⏳ **Enabling Sticky Notes...**\nSearching for control panel message...');

    // Process in background
    setImmediate(async () => {
      try {
        console.log('[Sticky Enable] Starting enable process:', {
          voiceChannelId: channelId,
          textChannelId: tempData.text_channel_id,
          voiceEnabled: stickyNotes.isEnabled(channelId),
          textEnabled: tempData.text_channel_id ? stickyNotes.isEnabled(tempData.text_channel_id) : false
        });

        // Try to enable for voice channel first
        const voiceChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (voiceChannel) {
          // Find control panel message in voice channel
          const messages = await voiceChannel.messages.fetch({ limit: 50 }).catch(() => null);
          const controlMessage = messages?.find(msg =>
            msg.author.id === interaction.client.user.id &&
            msg.components?.length > 0 &&
            (msg.components[0].type === 17 || msg.components[0].data?.type === 17)
          );

          console.log('[Sticky Enable] Voice channel check:', {
            channelId,
            foundControlMessage: !!controlMessage,
            messageId: controlMessage?.id
          });

          if (controlMessage) {
            stickyNotes.enableStickyNote(channelId, controlMessage.id, interaction.guildId);
            console.log('[Sticky Enable] Enabled for voice channel:', channelId);

            await sendEphemeral(interaction, '✅ **Sticky Notes Enabled**\nThe control panel link will be reposted automatically after 8 messages in the voice channel.');

            // Update the temp VC control panel in background
            const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
            await updateTempVCPanel(interaction, channelId, ownerId, { waitingRoomEnabled });
            return;
          }
        }

        // If no voice channel control panel, try text channel
        if (tempData.text_channel_id) {
          const textChannelId = tempData.text_channel_id;
          const textChannel = await interaction.guild.channels.fetch(textChannelId).catch(() => null);
          if (textChannel) {
            // Find control panel message in text channel
            const messages = await textChannel.messages.fetch({ limit: 50 }).catch(() => null);
            const controlMessage = messages?.find(msg =>
              msg.author.id === interaction.client.user.id &&
              msg.components?.length > 0 &&
              (msg.components[0].type === 17 || msg.components[0].data?.type === 17)
            );

            console.log('[Sticky Enable] Text channel check:', {
              textChannelId,
              foundControlMessage: !!controlMessage,
              messageId: controlMessage?.id
            });

            if (controlMessage) {
              stickyNotes.enableStickyNote(textChannelId, controlMessage.id, interaction.guildId);
              console.log('[Sticky Enable] Enabled for text channel:', textChannelId);

              await sendEphemeral(interaction, '✅ **Sticky Notes Enabled**\nThe control panel link will be reposted automatically after 8 messages in the text channel.');

              // Update the temp VC control panel in background
              const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
              await updateTempVCPanel(interaction, channelId, ownerId, { waitingRoomEnabled });
              return;
            }
          }
        }

        // No control panel found in either channel
        console.log('[Sticky Enable] No control panel found in voice or text channel');
        await sendEphemeral(interaction, '❌ **Control Panel Not Found**\nCould not find the control panel message in the voice or text channel.');
      } catch (error) {
        console.error('Error in handleStickyEnableUniversal background process:', error);
        await sendEphemeral(interaction, '❌ **Error**\nFailed to enable sticky notes.');
      }
    });
  } catch (error) {
    console.error('Error in handleStickyEnableUniversal:', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to enable sticky notes.');
  }
}

/**
 * Handles sticky note disable for universal interface
 */
async function handleStickyDisableUniversal(interaction, channelId, ownerId) {
  // Defer update (button interaction)
  await interaction.deferUpdate().catch(() => {});

  try {
    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      return;
    }

    console.log('[Sticky Disable] Starting disable process:', {
      voiceChannelId: channelId,
      textChannelId: tempData.text_channel_id,
      voiceEnabled: stickyNotes.isEnabled(channelId),
      textEnabled: tempData.text_channel_id ? stickyNotes.isEnabled(tempData.text_channel_id) : false
    });

    // Disable for both voice and text channels (instant operation)
    stickyNotes.disableStickyNote(channelId); // Voice channel
    console.log('[Sticky Disable] Disabled for voice channel:', channelId);

    if (tempData.text_channel_id) {
      stickyNotes.disableStickyNote(tempData.text_channel_id); // Text channel
      console.log('[Sticky Disable] Disabled for text channel:', tempData.text_channel_id);
    }

    // Send immediate response
    await sendEphemeral(interaction, '✅ **Sticky Notes Disabled**\nThe control panel link will no longer be reposted automatically.');

    // Update the temp VC control panel in background
    setImmediate(async () => {
      const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
      await updateTempVCPanel(interaction, channelId, ownerId, { waitingRoomEnabled });
    });
  } catch (error) {
    console.error('Error in handleStickyDisableUniversal:', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to disable sticky notes.');
  }
}

/**
 * Handles name modal submit for universal interface
 */
async function handleNameModalSubmitUniversal(interaction, channelId) {
  console.log('[handleNameModalSubmitUniversal] ENTRY - Function called:', {
    channelId,
    userId: interaction.user.id,
    customId: interaction.customId
  });
  
  const nameInput = interaction.fields.getTextInputValue('channel_name');
  const validation = modals.validateChannelName(nameInput);
  
  console.log('[handleNameModalSubmitUniversal] Name validation:', {
    input: nameInput,
    valid: validation.valid,
    error: validation.error
  });

  // Defer with ephemeral
  console.log('[handleNameModalSubmitUniversal] Deferring reply...');
  try {
    await interaction.deferReply({ ephemeral: true });
    console.log('[handleNameModalSubmitUniversal] Defer successful');
  } catch (err) {
    console.error('[handleNameModalSubmitUniversal] Failed to defer reply:', err);
    // If defer fails, try to reply directly
    console.log('[handleNameModalSubmitUniversal] Attempting direct reply instead...');
  }

  console.log('[handleNameModalSubmitUniversal] Continuing after defer...');

  if (!validation.valid) {
    console.log('[handleNameModalSubmitUniversal] Validation failed, sending error');
    await sendEphemeral(interaction, `❌ **Invalid Name**\n${validation.error}`);
    return;
  }

  console.log('[handleNameModalSubmitUniversal] Starting rename process...');

  try {
    const tempData = dataStore.getTempChannel(channelId);
    console.log('[handleNameModalSubmitUniversal] Temp data:', { exists: !!tempData });
    
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      return;
    }

    const ownerId = tempData.owner_id;
    console.log('[handleNameModalSubmitUniversal] Owner ID:', ownerId);

    // Verify permissions
    console.log('[handleNameModalSubmitUniversal] Verifying permissions...');
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    console.log('[handleNameModalSubmitUniversal] Permission check result:', permCheck);
    
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    // Check client-side rate limit BEFORE attempting rename
    console.log('[handleNameModalSubmitUniversal] Checking rate limit...');
    const rateLimitCheck = checkRenameLimit(channelId);
    console.log('[handleNameModalSubmitUniversal] Rate limit check:', rateLimitCheck);
    
    if (!rateLimitCheck.canRename) {
      console.log('[handleNameModalSubmitUniversal] Rate limited - showing instant error');
      // Use Discord's live timestamp for countdown
      await sendEphemeral(interaction, `⏳ **Rename Cooldown Active**\n\nYou can rename again <t:${rateLimitCheck.expiryTimestamp}:R>\nDiscord limits channel renames to 2 per 10 minutes.`);
      return;
    }

    console.log('[handleNameModalSubmitUniversal] Fetching channel...');
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    console.log('[handleNameModalSubmitUniversal] Channel fetched:', { exists: !!channel });
    
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    // Try to rename with reduced timeout (since we already checked rate limit)
    console.log('[handleNameModalSubmitUniversal] Attempting to rename channel to:', validation.value);
    try {
      // Reduced timeout since we pre-checked rate limit
      const renamePromise = channel.setName(validation.value);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Rename timeout')), 3000) // Reduced from 5s to 3s
      );
      
      await Promise.race([renamePromise, timeoutPromise]);
      console.log('[handleNameModalSubmitUniversal] Rename successful');

      // Track successful rename for rate limit detection
      trackChannelRename(channelId);

      // Save preference
      await voicePreferences.saveChannelName(interaction.user.id, interaction.guildId, validation.value);

      // Send success message
      await sendEphemeral(interaction, `✅ **Channel Renamed**\nName set to **${validation.value}**`);
    } catch (renameError) {
      console.error('[handleNameModalSubmitUniversal] Rename error:', renameError);
      console.error('[handleNameModalSubmitUniversal] Rename error details:', {
        code: renameError.code,
        message: renameError.message,
        httpStatus: renameError.httpStatus,
        method: renameError.method,
        name: renameError.name
      });

      // Check if timeout
      if (renameError.message?.includes('timeout')) {
        console.log('[handleNameModalSubmitUniversal] Timeout detected - unexpected rate limit');
        // Estimate 10 minutes wait time for timeout errors
        const availableAt = Math.floor((Date.now() + (10 * 60 * 1000)) / 1000);
        await sendEphemeral(interaction, `⏳ **Rename Cooldown Active**\n\nYou can rename again <t:${availableAt}:R>\nDiscord limits channel renames to 2 per 10 minutes.`);
        return;
      }

      // Check if rate limit - Discord error code 50013 is "Missing Permissions" but can also indicate rate limit
      // The actual rate limit error is usually in the message
      const isRateLimit = renameError.code === 50013 ||
                          renameError.code === 20028 || // Rate limit exceeded
                          renameError.httpStatus === 429 || // Too Many Requests
                          renameError.message?.toLowerCase().includes('rate limit') ||
                          renameError.message?.toLowerCase().includes('too fast') ||
                          renameError.message?.toLowerCase().includes('slow down');

      if (isRateLimit) {
        console.log('[handleNameModalSubmitUniversal] Rate limit detected, sending cooldown message');
        // Track this as a rename attempt even though it failed (to prevent spam)
        trackChannelRename(channelId);
        // Estimate 10 minutes wait time for rate limit errors
        const availableAt = Math.floor((Date.now() + (10 * 60 * 1000)) / 1000);
        await sendEphemeral(interaction, `⏳ **Rename Cooldown Active**\n\nYou can rename again <t:${availableAt}:R>\nDiscord limits channel renames to 2 per 10 minutes.`);
      } else {
        console.log('[handleNameModalSubmitUniversal] Non-rate-limit error, sending generic error');
        await sendEphemeral(interaction, `❌ **Error**\nFailed to rename channel: ${renameError.message || 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('[handleNameModalSubmitUniversal] Outer catch error:', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to rename channel.');
  }
}

/**
 * Handles user limit modal submit for universal interface
 */
async function handleLimitModalSubmitUniversal(interaction, channelId) {
  const limitInput = interaction.fields.getTextInputValue('user_limit');
  const validation = modals.validateUserLimit(limitInput);

  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  if (!validation.valid) {
    await sendEphemeral(interaction, `❌ **Invalid Limit**\n${validation.error}`);
    return;
  }

  try {
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      return;
    }

    const ownerId = tempData.owner_id;

    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    await channel.setUserLimit(validation.value);

    // Save user limit preference
    await voicePreferences.saveUserLimit(interaction.user.id, interaction.guildId, validation.value);

    const message = validation.value === 0 ? 'User limit removed' : `Limit set to **${validation.value}**`;
    await sendEphemeral(interaction, `✅ **Limit Updated**\n${message}`);
  } catch (error) {
    console.error('Error setting limit (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to set user limit.');
  }
}

/**
 * Handles status modal submit for universal interface
 */
async function handleStatusModalSubmitUniversal(interaction, channelId) {
  const statusInput = interaction.fields.getTextInputValue('channel_status') || '';

  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      return;
    }

    const ownerId = tempData.owner_id;

    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    // Parse emojis in the status text
    const parsedStatus = parseEmojisInText(statusInput, interaction.guild);

    // Set voice channel status using REST API
    const { REST, Routes } = require('discord.js');
    const rest = new REST().setToken(interaction.client.token);

    await rest.put(
      Routes.channel(channelId) + '/voice-status',
      { body: { status: parsedStatus || null } }
    );

    // Save channel status preference (save the parsed version with emoji IDs)
    await voicePreferences.saveChannelStatus(interaction.user.id, interaction.guildId, parsedStatus || null);

    const message = statusInput ? `Status set to **${statusInput}**` : 'Status cleared';
    await sendEphemeral(interaction, `✅ **Status Updated**\n${message}`);
  } catch (error) {
    console.error('Error setting status (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to set channel status.');
  }
}

/**
 * Handles bitrate modal submit for universal interface
 */
async function handleBitrateModalSubmitUniversal(interaction, channelId) {
  const bitrateInput = interaction.fields.getTextInputValue('bitrate');
  const validation = modals.validateBitrate(bitrateInput, interaction.guild);

  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  if (!validation.valid) {
    await sendEphemeral(interaction, `❌ **Invalid Bitrate**\n${validation.error}`);
    return;
  }

  try {
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      return;
    }

    const ownerId = tempData.owner_id;

    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    await channel.setBitrate(validation.value); // validation.value is already in bps

    // Save bitrate preference
    await voicePreferences.saveBitrate(interaction.user.id, interaction.guildId, validation.value / 1000); // Save as kbps

    await sendEphemeral(interaction, `✅ **Bitrate Updated**\nBitrate set to **${validation.value / 1000} kbps**`);
  } catch (error) {
    console.error('Error setting bitrate (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to set bitrate.');
  }
}

/**
 * Handles LFM (Looking for Members) modal submit for universal interface
 */
async function handleLfmModalSubmitUniversal(interaction, channelId) {
  const message = interaction.fields.getTextInputValue('lfm_message') || '';

  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      return;
    }

    const ownerId = tempData.owner_id;

    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    // Get LFM channels
    const lfmChannels = dataStore.getLfmChannels(interaction.guildId);

    if (lfmChannels.length === 0) {
      await sendEphemeral(interaction, '❌ **No LFM Channels**\nNo LFM announcement channels configured. Ask an admin to set them up.');
      return;
    }

    // Check cooldown (admins bypass)
    const voiceManager = require('../voice/voiceManager');
    if (!hasElevatedPermissions(interaction.member)) {
      const cooldownCheck = voiceManager.checkCooldown(interaction.guildId, interaction.user.id, 'lfm');
      if (!cooldownCheck.allowed) {
        await sendEphemeral(interaction, `⏳ **Cooldown Active**\n${cooldownCheck.message}`);
        return;
      }
    }

    // Build LFM announcement
    const { embed, components } = controlPanel.buildLfmAnnouncement(
      channel,
      interaction.user.id,
      message
    );

    // Send to all LFM channels
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

    // Set cooldown for non-admins
    if (!hasElevatedPermissions(interaction.member)) {
      voiceManager.setCooldown(interaction.guildId, interaction.user.id, 'lfm');
    }

    // Send success message
    await sendEphemeral(interaction, `✅ **LFM Sent**\nAnnouncement sent to ${sentCount} channel(s).`);
  } catch (error) {
    console.error('Error sending LFM (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to send LFM announcement.');
  }
}

/**
 * Handles load settings for universal interface
 */
async function handleLoadSettingsUniversal(interaction, channelId, ownerId) {
  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    const prefs = await voicePreferences.getPreferences(interaction.user.id, interaction.guildId);
    if (!prefs) {
      await sendEphemeral(interaction, '❌ **No Saved Settings**\nYou don\'t have any saved settings yet. Your settings will be saved automatically when you customize your channel.');
      return;
    }

    let appliedSettings = [];

    // Apply bitrate
    if (prefs.bitrate) {
      // Migration: Handle old data that might be stored in bps instead of kbps
      // Maximum bitrate is 384 kbps, so any value > 1000 is clearly in bps format
      let bitrateInKbps = prefs.bitrate;
      if (prefs.bitrate > 1000) {
        console.log(`[Load Settings] Detected bitrate in bps format (${prefs.bitrate}), converting to kbps`);
        bitrateInKbps = Math.round(prefs.bitrate / 1000);
        // Update the database with the correct format
        await voicePreferences.saveBitrate(interaction.user.id, interaction.guildId, bitrateInKbps);
      }
      
      // prefs.bitrate is stored in kbps, convert to bps for Discord API
      const bitrateInBps = bitrateInKbps * 1000;
      const currentBitrateInKbps = Math.round(channel.bitrate / 1000);
      
      // Compare in kbps to avoid floating point issues
      if (bitrateInKbps !== currentBitrateInKbps) {
        await channel.setBitrate(bitrateInBps);
        appliedSettings.push(`Bitrate: ${bitrateInKbps} kbps`);
      }
    }

    // Apply lock state
    if (prefs.locked !== undefined) {
      const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
      const isCurrentlyLocked = everyoneOverwrite?.deny?.has('Connect') || false;

      // Check if waiting room is enabled - if so, don't unlock the channel
      const tempData = dataStore.getTempChannel(channelId);
      const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;

      if (prefs.locked && !isCurrentlyLocked) {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
        appliedSettings.push('Locked: Yes');
      } else if (!prefs.locked && isCurrentlyLocked && !waitingRoomEnabled) {
        // Only unlock if waiting room is NOT enabled
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
        appliedSettings.push('Locked: No');
      } else if (!prefs.locked && isCurrentlyLocked && waitingRoomEnabled) {
        // Skip unlocking because waiting room needs the channel locked
        console.log('[Load Settings] Skipping unlock because waiting room is enabled');
      }
    }

    // Apply ghost state
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

    // Apply region
    if (prefs.region) {
      try {
        await channel.setRTCRegion(prefs.region === 'automatic' ? null : prefs.region);
        appliedSettings.push(`Region: ${prefs.region}`);
      } catch (e) {
        console.log('Could not set region:', e.message);
      }
    }

    // Apply channel status
    if (prefs.channelStatus) {
      try {
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
          // Add timeout protection for permission edits
          await Promise.race([
            channel.permissionOverwrites.edit(userId, { Connect: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          rejectedMentions.push(`<@${userId}>`);
        } catch (e) {
          console.log(`Could not reject user ${userId}:`, e.message);
          // User might not be in the server anymore or permission edit timed out
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
          // Add timeout protection for permission edits
          await Promise.race([
            channel.permissionOverwrites.edit(roleId, { Connect: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          rejectedMentions.push(`<@&${roleId}>`);
        } catch (e) {
          console.log(`Could not reject role ${roleId}:`, e.message);
          // Role might not exist anymore or permission edit timed out
        }
      }
      if (rejectedMentions.length > 0) {
        appliedSettings.push(`Rejected roles: ${rejectedMentions.join(', ')}`);
      }
    }

    // Send success message
    if (appliedSettings.length > 0) {
      await sendEphemeral(interaction, `✅ **Settings Loaded**\n${appliedSettings.join('\n')}`);
    } else {
      await sendEphemeral(interaction, '❌ **No Changes**\nYour saved settings are already applied or no settings to load.');
    }
  } catch (error) {
    console.error('Error loading settings (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to load settings.');
  }
}

/**
 * Handles view current settings for universal interface
 */
async function handleViewCurrentSettingsUniversal(interaction, channelId, ownerId) {
  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
    // Verify permissions
    const permCheck = await verifyUniversalPermissions(interaction, channelId, ownerId);
    if (!permCheck.allowed) {
      await sendEphemeral(interaction, permCheck.reason);
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await sendEphemeral(interaction, '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.');
      return;
    }

    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await sendEphemeral(interaction, '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.');
      return;
    }

    const settings = [];
    settings.push(`**Name:** ${channel.name}`);
    settings.push(`**User Limit:** ${channel.userLimit === 0 ? 'Unlimited' : channel.userLimit}`);
    settings.push(`**Bitrate:** ${channel.bitrate / 1000} kbps`);

    const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
    const isLocked = everyoneOverwrite?.deny?.has('Connect') || false;
    settings.push(`**Locked:** ${isLocked ? 'Yes' : 'No'}`);

    const isGhosted = everyoneOverwrite?.deny?.has('ViewChannel') || false;
    settings.push(`**Hidden (Ghost):** ${isGhosted ? 'Yes' : 'No'}`);

    settings.push(`**NSFW:** ${channel.nsfw ? 'Yes' : 'No'}`);
    settings.push(`**Region:** ${channel.rtcRegion || 'Automatic'}`);

    const waitingRoomEnabled = tempData.waiting_room_channel_id ? true : false;
    settings.push(`**Waiting Room:** ${waitingRoomEnabled ? 'Enabled' : 'Disabled'}`);

    if (tempData.text_channel_id) {
      settings.push(`**Text Channel:** <#${tempData.text_channel_id}>`);
    }

    // Get rejected users and roles from permission overwrites
    const rejectedUsers = [];
    const rejectedRoles = [];
    
    for (const [id, overwrite] of channel.permissionOverwrites.cache) {
      // Skip @everyone role (already shown as locked/unlocked)
      if (id === interaction.guild.roles.everyone.id) continue;
      
      // Check if Connect permission is explicitly denied
      if (overwrite.deny?.has('Connect')) {
        // Check if it's a role or user
        const role = interaction.guild.roles.cache.get(id);
        if (role) {
          rejectedRoles.push(`<@&${id}>`);
        } else {
          rejectedUsers.push(`<@${id}>`);
        }
      }
    }

    // Add rejected users to settings if any
    if (rejectedUsers.length > 0) {
      settings.push(`**Rejected Users:** ${rejectedUsers.join(', ')}`);
    }

    // Add rejected roles to settings if any
    if (rejectedRoles.length > 0) {
      settings.push(`**Rejected Roles:** ${rejectedRoles.join(', ')}`);
    }

    settings.push(`**Owner:** <@${ownerId}>`);

    await sendEphemeral(interaction, `# 📊 Current Voice Channel Settings\n\n${settings.join('\n')}`);
  } catch (error) {
    console.error('Error viewing current settings (universal):', error);
    await sendEphemeral(interaction, '❌ **Error**\nFailed to retrieve current settings.');
  }
}

// Export all handlers
module.exports = {
  verifyUniversalPermissions,
  sendEphemeralMessage: sendEphemeral,
  refreshUniversalInterface,
  updateTempVCPanel,
  handleWaitingRoomManagerUniversal,
  handleWaitingRoomEnableUniversal,
  handleWaitingRoomDisableUniversal,
  handleStickyNoteManagerUniversal,
  handleStickyEnableUniversal,
  handleStickyDisableUniversal,
  handleNameModalSubmitUniversal,
  handleLimitModalSubmitUniversal,
  handleStatusModalSubmitUniversal,
  handleBitrateModalSubmitUniversal,
  handleLfmModalSubmitUniversal,
  handleLoadSettingsUniversal,
  handleViewCurrentSettingsUniversal
};

