/**
 * Universal Interface Handlers
 * Separate handlers for universal interface interactions
 * These handlers send ephemeral messages AND edit the interface to reset select menus
 */

const { ChannelType } = require('discord.js');
const dataStore = require('../voice/dataStore');
const controlPanel = require('../voice/controlPanel');
const modals = require('../voice/modals');
const stickyNotes = require('../voice/stickyNotes');
const voicePreferences = require('../voice/voicePreferences');
const { getLatestMessageUrl } = require('./messageCreate');

/**
 * Helper function to refresh the universal interface (reset select menus)
 * This allows users to select the same option again
 */
async function refreshUniversalInterface(interaction, channelId, ownerId) {
  try {
    // Skip if interaction doesn't have a message (e.g., modal interactions)
    if (!interaction.message) {
      console.log('[Universal Interface] No message to refresh (likely a modal interaction)');
      return;
    }
    
    // Get the current state
    const tempData = dataStore.getTempChannel(channelId);
    const waitingRoomEnabled = tempData?.waiting_room_channel_id ? true : false;
    
    // Rebuild the universal interface
    const { components, flags } = controlPanel.buildUniversalVoiceControlPanel(
      interaction.guildId,
      channelId,
      ownerId,
      {
        thumbnailUrl: interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
        waitingRoomEnabled
      }
    );
    
    // Edit the original message to reset select menus
    await interaction.message.edit({ components, flags }).catch(() => {});
  } catch (error) {
    console.log('Could not refresh universal interface:', error.message);
  }
}

/**
 * Handles waiting room manager for universal interface (shows enable/disable buttons)
 */
async function handleWaitingRoomManagerUniversal(interaction, channelId, ownerId) {
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
    
    const isEnabled = tempData.waiting_room_channel_id ? true : false;
    
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const embed = new EmbedBuilder()
      .setTitle('🚪 Waiting Room Manager')
      .setDescription(`Current Status: **${isEnabled ? 'Enabled' : 'Disabled'}**\n\nWaiting Room creates a separate channel where users must request to join your voice channel.`)
      .setColor(isEnabled ? 0x57F287 : 0x5865F2);
    
    const enableButton = new ButtonBuilder()
      .setCustomId(`waiting_room_enable:${channelId}:${ownerId}`)
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(isEnabled);
    
    const disableButton = new ButtonBuilder()
      .setCustomId(`waiting_room_disable:${channelId}:${ownerId}`)
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(!isEnabled);
    
    const row = new ActionRowBuilder().addComponents(enableButton, disableButton);
    
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
    
    // Refresh the universal interface to reset select menu
    await refreshUniversalInterface(interaction, channelId, ownerId);
  } catch (error) {
    console.error('Error in handleWaitingRoomManagerUniversal:', error);
    await interaction.reply({
      content: '❌ **Error**\nFailed to open waiting room manager.',
      ephemeral: true
    }).catch(() => {});
  }
}

/**
 * Handles waiting room enable button for universal interface
 */
async function handleWaitingRoomEnableUniversal(interaction, channelId, ownerId) {
  // Update the message (don't create a new one)
  await interaction.deferUpdate().catch(() => {});
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.',
        embeds: [],
        components: []
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    await enableWaitingRoomUniversal(interaction, channel, tempData, ownerId);
  } catch (error) {
    console.error('Error enabling waiting room (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to enable waiting room.',
      embeds: [],
      components: []
    }).catch(() => {});
  }
}

/**
 * Handles waiting room disable button for universal interface
 */
async function handleWaitingRoomDisableUniversal(interaction, channelId, ownerId) {
  // Update the message (don't create a new one)
  await interaction.deferUpdate().catch(() => {});
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.',
        embeds: [],
        components: []
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    await disableWaitingRoomUniversal(interaction, channel, tempData, ownerId);
  } catch (error) {
    console.error('Error disabling waiting room (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to disable waiting room.',
      embeds: [],
      components: []
    }).catch(() => {});
  }
}

/**
 * Handles waiting room toggle for universal interface
 */
async function handleWaitingRoomToggleUniversal(interaction, channelId, ownerId) {
  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    const isCurrentlyEnabled = tempData?.waiting_room_channel_id ? true : false;
    
    if (isCurrentlyEnabled) {
      await disableWaitingRoomUniversal(interaction, channel, tempData, ownerId);
    } else {
      await enableWaitingRoomUniversal(interaction, channel, tempData, ownerId);
    }
  } catch (error) {
    console.error('Error toggling waiting room (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to toggle waiting room.'
    }).catch(() => {});
  }
}

/**
 * Enables waiting room for universal interface
 */
async function enableWaitingRoomUniversal(interaction, channel, tempData, ownerId) {
  const channelId = channel.id;
  
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
    
    // 2. Create the waiting room voice channel
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
    
    // Move the waiting room channel below the main channel
    try {
      await waitingRoomChannel.setPosition(channel.position + 1);
    } catch (e) {
      console.log('Could not set waiting room position:', e.message);
    }
    
    // Allow everyone to join the waiting room
    await waitingRoomChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: null,
      ViewChannel: true,
      SendMessages: false
    });
    
    // 3. Update temp data
    let currentTempData = dataStore.getTempChannel(channelId) || { owner_id: ownerId };
    currentTempData.waiting_room_channel_id = waitingRoomChannel.id;
    dataStore.setTempChannel(channelId, currentTempData);
    
    // 4. Send ephemeral success message (clear embeds and components)
    await interaction.editReply({
      content: '✅ **Waiting Room Enabled**\nUsers must now request to join your voice channel.',
      embeds: [],
      components: []
    });
    
    // 5. Update the temp VC control panel
    await updateTempVCPanel(interaction, channelId, ownerId, { waitingRoomEnabled: true });
    
    // 6. Send welcome message to waiting room
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
    console.error('Error enabling waiting room (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to enable waiting room.'
    }).catch(() => {});
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
    
    // Send ephemeral success message (clear embeds and components)
    await interaction.editReply({
      content: '✅ **Waiting Room Disabled**\nThe waiting room has been removed and the channel has been unlocked.',
      embeds: [],
      components: []
    });
    
    // Update the temp VC control panel
    await updateTempVCPanel(interaction, channelId, ownerId, { waitingRoomEnabled: false });
  } catch (error) {
    console.error('Error disabling waiting room (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to disable waiting room.'
    }).catch(() => {});
  }
}

/**
 * Handles name modal submit for universal interface
 */
async function handleNameModalSubmitUniversal(interaction, channelId) {
  const nameInput = interaction.fields.getTextInputValue('channel_name');
  const validation = modals.validateChannelName(nameInput);
  
  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  
  if (!validation.valid) {
    await interaction.editReply({
      content: `❌ **Invalid Name**\n${validation.error}`
    });
    return;
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await interaction.editReply({
        content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.'
      });
      return;
    }
    
    // Try to rename
    try {
      await channel.setName(validation.value);
      
      // Save preference
      await voicePreferences.saveChannelName(interaction.user.id, interaction.guildId, validation.value);
      
      // Send success message
      await interaction.editReply({
        content: `✅ **Channel Renamed**\nName set to **${validation.value}**`
      });
    } catch (renameError) {
      console.error('Error renaming channel (universal):', renameError);
      
      // Check if rate limit
      const isRateLimit = renameError.code === 50013 || 
                          renameError.message?.includes('rate limit') ||
                          renameError.message?.includes('You are changing your name too fast') ||
                          renameError.code === 20028;
      
      if (isRateLimit) {
        await interaction.editReply({
          content: '⏳ **Rename Cooldown Active**\nYou are changing the channel name too fast. Please wait a moment before trying again.\n\nDiscord limits channel renames to 2 per 10 minutes.'
        });
        
        // Update the temp VC control panel to show cooldown
        await updateTempVCPanel(interaction, channelId, tempData.owner_id, {});
      } else {
        await interaction.editReply({
          content: '❌ **Error**\nFailed to rename channel.'
        });
      }
    }
  } catch (error) {
    console.error('Error in handleNameModalSubmitUniversal:', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to rename channel.'
    }).catch(() => {});
  }
}

/**
 * Handles load settings for universal interface
 */
async function handleLoadSettingsUniversal(interaction, channelId, ownerId) {
  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
      });
      return;
    }
    
    const prefs = await voicePreferences.getPreferences(interaction.user.id, interaction.guildId);
    if (!prefs) {
      await interaction.editReply({
        content: '❌ **No Saved Settings**\nYou don\'t have any saved settings yet. Your settings will be saved automatically when you customize your channel.'
      });
      return;
    }
    
    let appliedSettings = [];
    
    // Apply bitrate
    if (prefs.bitrate && prefs.bitrate !== channel.bitrate) {
      await channel.setBitrate(prefs.bitrate);
      appliedSettings.push(`Bitrate: ${prefs.bitrate / 1000} kbps`);
    }
    
    // Apply lock state
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
    
    // Send success message
    if (appliedSettings.length > 0) {
      await interaction.editReply({
        content: `✅ **Settings Loaded**\n${appliedSettings.join('\n')}`
      });
    } else {
      await interaction.editReply({
        content: '❌ **No Changes**\nYour saved settings are already applied or no settings to load.'
      });
    }
    
    // Update the temp VC control panel
    await updateTempVCPanel(interaction, channelId, ownerId, {});
    
    // Refresh the universal interface to reset select menu
    await refreshUniversalInterface(interaction, channelId, ownerId);
  } catch (error) {
    console.error('Error loading settings (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to load settings.'
    }).catch(() => {});
  }
}

/**
 * Handles view current settings for universal interface
 */
async function handleViewCurrentSettingsUniversal(interaction, channelId, ownerId) {
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
    
    settings.push(`**Owner:** <@${ownerId}>`);
    
    await interaction.reply({
      content: `# 📊 Current Voice Channel Settings\n\n${settings.join('\n')}`,
      ephemeral: true
    });
    
    // Refresh the universal interface to reset select menu
    await refreshUniversalInterface(interaction, channelId, ownerId);
  } catch (error) {
    console.error('Error viewing current settings (universal):', error);
    await interaction.reply({
      content: '❌ **Error**\nFailed to retrieve current settings.',
      ephemeral: true
    }).catch(() => {});
  }
}

/**
 * Helper function to update the temp VC control panel
 */
async function updateTempVCPanel(interaction, channelId, ownerId, options = {}) {
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;
    
    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (!messages) return;
    
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
    const currentStickyEnabled = stickyNotes.isEnabled(channelId);
    const thumbnailUrl = interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 });
    
    const { components, flags } = controlPanel.buildCompactVoiceControlPanel(
      interaction.guildId,
      channelId,
      ownerId,
      {
        thumbnailUrl,
        stickyEnabled: currentStickyEnabled,
        latestMessageUrl: latestUrl,
        waitingRoomEnabled: options.waitingRoomEnabled
      }
    );
    
    await controlPanelMsg.edit({ components, flags }).catch(() => {});
  } catch (e) {
    console.log('Could not update temp VC control panel:', e.message);
  }
}

/**
 * Handles sticky note manager for universal interface
 */
async function handleStickyNoteManagerUniversal(interaction, channelId, ownerId) {
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
    
    // Check sticky note status for both voice channel and text channel (if exists)
    const textChannelId = tempData.text_channel_id;
    const voiceChannelId = channelId;
    
    // Determine which channel has sticky notes enabled
    const voiceStickyEnabled = stickyNotes.isEnabled(voiceChannelId);
    const textStickyEnabled = textChannelId ? stickyNotes.isEnabled(textChannelId) : false;
    const isEnabled = voiceStickyEnabled || textStickyEnabled;
    
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    let description = `Current Status: **${isEnabled ? 'Enabled' : 'Disabled'}**\n\nSticky Notes automatically sends the control panel link after every 8 messages to keep it accessible.`;
    
    // Add info about which channel has sticky notes
    if (voiceStickyEnabled && textStickyEnabled) {
      description += `\n\n*Enabled for both voice and text channels*`;
    } else if (voiceStickyEnabled) {
      description += `\n\n*Enabled for voice channel*`;
    } else if (textStickyEnabled) {
      description += `\n\n*Enabled for text channel*`;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📌 Sticky Note Manager')
      .setDescription(description)
      .setColor(isEnabled ? 0x57F287 : 0x5865F2);
    
    const enableButton = new ButtonBuilder()
      .setCustomId(`sticky_enable:${channelId}:${ownerId}`)
      .setLabel('Enable')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(isEnabled);
    
    const disableButton = new ButtonBuilder()
      .setCustomId(`sticky_disable:${channelId}:${ownerId}`)
      .setLabel('Disable')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
      .setDisabled(!isEnabled);
    
    const row = new ActionRowBuilder().addComponents(enableButton, disableButton);
    
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
    
    // Refresh the universal interface to reset select menu
    await refreshUniversalInterface(interaction, channelId, ownerId);
  } catch (error) {
    console.error('Error in handleStickyNoteManagerUniversal:', error);
    await interaction.reply({
      content: '❌ **Error**\nFailed to open sticky note manager.',
      ephemeral: true
    }).catch(() => {});
  }
}

/**
 * Handles sticky note enable for universal interface
 */
async function handleStickyEnableUniversal(interaction, channelId, ownerId) {
  try {
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await interaction.reply({
        content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.',
        ephemeral: true
      });
      return;
    }
    
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
      
      if (controlMessage) {
        stickyNotes.enableStickyNote(channelId, controlMessage.id, interaction.guildId);
        
        await interaction.reply({
          content: '✅ **Sticky Notes Enabled**\nThe control panel link will be reposted automatically after 8 messages in the voice channel.',
          ephemeral: true
        });
        
        // Update the temp VC control panel
        await updateTempVCPanel(interaction, channelId, ownerId, {});
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
        
        if (controlMessage) {
          stickyNotes.enableStickyNote(textChannelId, controlMessage.id, interaction.guildId);
          
          await interaction.reply({
            content: '✅ **Sticky Notes Enabled**\nThe control panel link will be reposted automatically after 8 messages in the text channel.',
            ephemeral: true
          });
          
          // Update the temp VC control panel
          await updateTempVCPanel(interaction, channelId, ownerId, {});
          return;
        }
      }
    }
    
    // No control panel found in either channel
    await interaction.reply({
      content: '❌ **Control Panel Not Found**\nCould not find the control panel message in the voice or text channel.',
      ephemeral: true
    });
  } catch (error) {
    console.error('Error in handleStickyEnableUniversal:', error);
    await interaction.reply({
      content: '❌ **Error**\nFailed to enable sticky notes.',
      ephemeral: true
    }).catch(() => {});
  }
}

/**
 * Handles sticky note disable for universal interface
 */
async function handleStickyDisableUniversal(interaction, channelId, ownerId) {
  try {
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await interaction.reply({
        content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.',
        ephemeral: true
      });
      return;
    }
    
    // Disable for both voice and text channels
    stickyNotes.disableStickyNote(channelId); // Voice channel
    
    if (tempData.text_channel_id) {
      stickyNotes.disableStickyNote(tempData.text_channel_id); // Text channel
    }
    
    await interaction.reply({
      content: '✅ **Sticky Notes Disabled**\nThe control panel link will no longer be reposted automatically.',
      ephemeral: true
    });
    
    // Update the temp VC control panel
    await updateTempVCPanel(interaction, channelId, ownerId, {});
  } catch (error) {
    console.error('Error in handleStickyDisableUniversal:', error);
    await interaction.reply({
      content: '❌ **Error**\nFailed to disable sticky notes.',
      ephemeral: true
    }).catch(() => {});
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
    await interaction.editReply({
      content: `❌ **Invalid Limit**\n${validation.error}`
    });
    return;
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await interaction.editReply({
        content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.'
      });
      return;
    }
    
    await channel.setUserLimit(validation.value);
    
    // Save user limit preference
    await voicePreferences.saveUserLimit(interaction.user.id, interaction.guildId, validation.value);
    
    const message = validation.value === 0 ? 'User limit removed' : `Limit set to **${validation.value}**`;
    await interaction.editReply({
      content: `✅ **Limit Updated**\n${message}`
    });
    
    // Update the temp VC control panel
    await updateTempVCPanel(interaction, channelId, tempData.owner_id, {});
  } catch (error) {
    console.error('Error setting limit (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to set user limit.'
    }).catch(() => {});
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
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await interaction.editReply({
        content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.'
      });
      return;
    }
    
    // Set voice channel status using REST API
    const { REST, Routes } = require('discord.js');
    const rest = new REST().setToken(interaction.client.token);
    
    await rest.put(
      Routes.channel(channelId) + '/voice-status',
      { body: { status: statusInput || null } }
    );
    
    // Save channel status preference
    await voicePreferences.saveChannelStatus(interaction.user.id, interaction.guildId, statusInput || null);
    
    const message = statusInput ? `Status set to **${statusInput}**` : 'Status cleared';
    await interaction.editReply({
      content: `✅ **Status Updated**\n${message}`
    });
    
    // Update the temp VC control panel
    await updateTempVCPanel(interaction, channelId, tempData.owner_id, {});
  } catch (error) {
    console.error('Error setting status (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to set channel status.'
    }).catch(() => {});
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
    await interaction.editReply({
      content: `❌ **Invalid Bitrate**\n${validation.error}`
    });
    return;
  }
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await interaction.editReply({
        content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.'
      });
      return;
    }
    
    await channel.setBitrate(validation.value * 1000); // Convert kbps to bps
    
    // Save bitrate preference
    await voicePreferences.saveBitrate(interaction.user.id, interaction.guildId, validation.value);
    
    await interaction.editReply({
      content: `✅ **Bitrate Updated**\nBitrate set to **${validation.value} kbps**`
    });
    
    // Update the temp VC control panel
    await updateTempVCPanel(interaction, channelId, tempData.owner_id, {});
  } catch (error) {
    console.error('Error setting bitrate (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to set bitrate.'
    }).catch(() => {});
  }
}

/**
 * Handles LFM modal submit for universal interface
 */
async function handleLfmModalSubmitUniversal(interaction, channelId) {
  const lfmInput = interaction.fields.getTextInputValue('lfm_text') || '';
  
  // Defer with ephemeral
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  
  try {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await interaction.editReply({
        content: '❌ **Channel Not Found**\nThe temporary voice channel no longer exists.'
      });
      return;
    }
    
    const tempData = dataStore.getTempChannel(channelId);
    if (!tempData) {
      await interaction.editReply({
        content: '❌ **Not a Temporary Channel**\nThis channel is no longer a temporary voice channel.'
      });
      return;
    }
    
    // Update LFM text in temp data
    tempData.lfm_text = lfmInput || null;
    dataStore.setTempChannel(channelId, tempData);
    
    const message = lfmInput ? `LFM text set to **${lfmInput}**` : 'LFM text cleared';
    await interaction.editReply({
      content: `✅ **LFM Updated**\n${message}`
    });
    
    // Update the temp VC control panel
    await updateTempVCPanel(interaction, channelId, tempData.owner_id, {});
  } catch (error) {
    console.error('Error setting LFM (universal):', error);
    await interaction.editReply({
      content: '❌ **Error**\nFailed to set LFM text.'
    }).catch(() => {});
  }
}

module.exports = {
  refreshUniversalInterface,
  handleWaitingRoomManagerUniversal,
  handleWaitingRoomEnableUniversal,
  handleWaitingRoomDisableUniversal,
  handleWaitingRoomToggleUniversal,
  handleNameModalSubmitUniversal,
  handleLimitModalSubmitUniversal,
  handleStatusModalSubmitUniversal,
  handleBitrateModalSubmitUniversal,
  handleLfmModalSubmitUniversal,
  handleLoadSettingsUniversal,
  handleViewCurrentSettingsUniversal,
  handleStickyNoteManagerUniversal,
  handleStickyEnableUniversal,
  handleStickyDisableUniversal
};
