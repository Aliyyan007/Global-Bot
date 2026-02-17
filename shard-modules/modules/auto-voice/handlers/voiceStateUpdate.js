/**
 * Voice State Update Event Handler
 * Handles temp channel creation, deletion, and ownership claims
 * Requirements: 2.1-2.5, 5.1-5.3, 12.1-12.3, 13.2, 13.3
 */

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const dataStore = require('../voice/dataStore');
const voiceManager = require('../voice/voiceManager');
const { buildCompactVoiceControlPanel, buildClaimOwnershipPanel, buildInvitationEmbed, calculateDurationText } = require('../voice/controlPanel');
const stickyNotes = require('../voice/stickyNotes');
const textChannelRestrictions = require('../voice/textChannelRestrictions');
const { clearGoToLatestTracking } = require('./messageCreate');
const voicePreferences = require('../voice/voicePreferences');

const pendingDeletions = new Set();
const DELETE_DELAY = 100;

/**
 * Creates an auto text channel linked to a voice channel
 * @param {Guild} guild - The Discord guild
 * @param {VoiceChannel} voiceChannel - The voice channel to link
 * @param {GuildMember} owner - The channel owner
 * @returns {Promise<string|null>} - The text channel ID or null if failed
 */
async function createAutoTextChannel(guild, voiceChannel, owner) {
  try {
    // Import the Unicode converter function
    const { convertToUnicodeBold } = require('./interactionCreate');
    
    // Get text channel category if configured, otherwise use voice channel's parent
    const categoryId = dataStore.getTextChannelCategory(guild.id) || voiceChannel.parentId;
    
    // Format: 💬 Username Text (e.g., 💬 Nehan Text) with Unicode bold styling
    const ownerName = owner.displayName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters but keep spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces
    
    const baseChannelName = `💬 ${ownerName} Text`.substring(0, 100);
    const channelName = convertToUnicodeBold(baseChannelName);
    
    const textChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: owner.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages
          ]
        }
      ]
    });
    
    // Grant access to all current voice channel members (excluding the owner who already has access)
    for (const [memberId, member] of voiceChannel.members) {
      if (memberId !== owner.id && !member.user.bot) {
        await textChannel.permissionOverwrites.edit(memberId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        }).catch(() => {});
      }
    }
    
    // Send control panel to the text channel
    try {
      const { buildCompactTextControlPanel } = require('../voice/controlPanel');
      const { components, flags } = buildCompactTextControlPanel(
        guild.id,
        textChannel.id,
        voiceChannel.id,
        owner.id,
        { stickyEnabled: true }
      );
      
      const controlPanelMsg = await textChannel.send({ components, flags });
      
      // Enable sticky notes for the text channel
      const controlPanelUrl = `https://discord.com/channels/${guild.id}/${textChannel.id}/${controlPanelMsg.id}`;
      stickyNotes.enableStickyNote(textChannel.id, controlPanelUrl);
    } catch (panelError) {
      console.error('[Auto Voice] Error sending text channel control panel:', panelError);
    }
    
    // Send ghost ping to notify the channel owner
    try {
      const pingMsg = await textChannel.send(`<@${owner.id}>`);
      await pingMsg.delete().catch(() => {});
    } catch (pingError) {
      console.error('[Auto Voice] Error sending ghost ping to text channel:', pingError);
    }
    
    console.log(`[Auto Voice] Created auto text channel "${textChannel.name}" for voice channel "${voiceChannel.name}"`);
    return textChannel.id;
  } catch (error) {
    console.error('[Auto Voice] Error creating auto text channel:', error);
    return null;
  }
}

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState) {
    try {
      // Ignore voice state changes that don't involve channel changes (mute/unmute, deafen, etc.)
      if (oldState.channelId === newState.channelId) {
        return;
      }
      
      if (newState.channel) {
        await handleChannelJoin(oldState, newState);
      }
      
      if (oldState.channel) {
        await handleChannelLeave(oldState, newState);
      }
    } catch (error) {
      console.error('Error in voiceStateUpdate:', error);
    }
  }
};

async function handleChannelJoin(oldState, newState) {
  const member = newState.member;
  const channel = newState.channel;
  const guild = newState.guild;
  
  const settings = dataStore.getGuildSettings(guild.id);
  if (!settings) return;
  
  if (channel.id === settings.voice_channel_id) {
    await createTempChannel(member, guild, settings);
    return;
  }
  
  // Check if user joined a waiting room channel
  // Find if any temp channel has this as its waiting room
  const allTempChannels = dataStore.loadVoiceData().temp_channels || {};
  
  for (const [lockedChannelId, tempData] of Object.entries(allTempChannels)) {
    if (tempData.waiting_room_channel_id === channel.id) {
      // User joined a waiting room - handle the join request
      const lockedChannel = await guild.channels.fetch(lockedChannelId).catch(() => null);
      if (lockedChannel && !member.user.bot) {
        const { handleWaitingRoomJoin } = require('./interactionCreate');
        await handleWaitingRoomJoin(guild, member, channel, lockedChannel, tempData);
      }
      return;
    }
  }
  
  const tempData = dataStore.getTempChannel(channel.id);
  if (tempData && tempData.text_channel_id) {
    await grantTextChannelAccess(guild, tempData.text_channel_id, member);
  }
}

async function handleChannelLeave(oldState, newState) {
  const member = oldState.member;
  const channel = oldState.channel;
  const guild = oldState.guild;
  
  // Check if user left a waiting room channel - clean up their request
  const allTempChannels = dataStore.loadVoiceData().temp_channels || {};
  for (const [lockedChannelId, tempData] of Object.entries(allTempChannels)) {
    if (tempData.waiting_room_channel_id === channel.id) {
      // User left a waiting room - clean up their pending request
      const { handleWaitingRoomLeave } = require('./interactionCreate');
      await handleWaitingRoomLeave(guild, member.id, lockedChannelId);
      break;
    }
  }
  
  const tempData = dataStore.getTempChannel(channel.id);
  if (!tempData) return;
  
  if (tempData.text_channel_id) {
    await removeTextChannelAccess(guild, tempData.text_channel_id, member);
  }
  
  if (channel.members.size === 0) {
    await scheduleChannelDeletion(channel, tempData);
    return;
  }
  
  const ownerId = dataStore.getChannelOwner(channel.id);
  if (ownerId && member.id === ownerId) {
    await handleOwnerLeft(channel, tempData);
  }
}

async function createTempChannel(member, guild, settings) {
  try {
    // Check for saved user preferences (channel name and user limit are auto-applied)
    const userPrefs = await voicePreferences.getPreferences(member.id, guild.id);
    
    // Use saved channel name if available, otherwise use template
    let channelName;
    if (userPrefs?.channelName) {
      channelName = userPrefs.channelName;
    } else {
      channelName = voiceManager.applyChannelNameTemplate(
        settings.channel_name_template,
        member.displayName
      );
    }
    
    // Use saved user limit if available, otherwise use default
    const userLimit = userPrefs?.userLimit ?? settings.default_limit ?? 0;
    
    const tempChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: settings.temp_voice_category_id,
      userLimit: userLimit,
      bitrate: settings.default_bitrate || 64000,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.SendMessages
          ]
        }
      ]
    });
    
    await member.voice.setChannel(tempChannel);
    
    // Check if autotext feature is enabled and create linked text channel
    let textChannelId = null;
    if (voiceManager.isFeatureEnabled(guild.id, 'autotext')) {
      textChannelId = await createAutoTextChannel(guild, tempChannel, member);
    }
    
    dataStore.setTempChannel(tempChannel.id, {
      owner_id: member.id,
      created_at: new Date().toISOString(),
      text_channel_id: textChannelId
    });
    
    dataStore.setChannelOwner(tempChannel.id, member.id);
    
    // Check if a control panel message already exists (prevent duplicates)
    const existingMessages = await tempChannel.messages.fetch({ limit: 10 }).catch(() => null);
    const hasControlPanel = existingMessages?.some(msg => {
      if (msg.author.id !== guild.client.user.id) return false;
      if (msg.components?.length > 0) {
        const firstComponent = msg.components[0];
        if (firstComponent.type === 17 || firstComponent.data?.type === 17) return true;
      }
      return false;
    });
    
    if (!hasControlPanel) {
      // Get bot thumbnail URL for compact control panel
      const thumbnailUrl = guild.client.user.displayAvatarURL({ dynamic: true, size: 128 });
      const { components, flags } = buildCompactVoiceControlPanel(guild.id, tempChannel.id, member.id, { 
        thumbnailUrl, 
        stickyEnabled: true,
        waitingRoomEnabled: false // New channels don't have waiting room enabled by default
      });
      const controlPanelMsg = await tempChannel.send({ components, flags });
      
      // Enable sticky notes by default for the voice channel
      const controlPanelUrl = `https://discord.com/channels/${guild.id}/${tempChannel.id}/${controlPanelMsg.id}`;
      stickyNotes.enableStickyNote(tempChannel.id, controlPanelUrl);
    }
    
    // Send ghost ping to notify the channel owner
    const pingMsg = await tempChannel.send(`<@${member.id}>`);
    await pingMsg.delete().catch(() => {});
    
    console.log(`Created temp channel "${channelName}" for ${member.user.tag} in ${guild.name}`);
  } catch (error) {
    console.error('Error creating temp channel:', error);
  }
}


async function scheduleChannelDeletion(channel, tempData) {
  const channelId = channel.id;
  
  if (pendingDeletions.has(channelId)) return;
  pendingDeletions.add(channelId);
  
  await new Promise(resolve => setTimeout(resolve, DELETE_DELAY));
  
  try {
    const freshChannel = await channel.guild.channels.fetch(channelId).catch(() => null);
    
    if (!freshChannel) {
      pendingDeletions.delete(channelId);
      return;
    }
    
    if (freshChannel.members.size > 0) {
      pendingDeletions.delete(channelId);
      return;
    }
    
    // Calculate final duration before deleting
    const deletedAt = new Date();
    const createdAt = tempData?.created_at || deletedAt.toISOString();
    const finalDuration = calculateDurationText(createdAt, deletedAt);
    
    // Update all invitation DM messages with static duration
    if (tempData?.sent_invitations && tempData.sent_invitations.length > 0) {
      await updateInvitationMessages(channel.guild.client, tempData.sent_invitations, finalDuration, channelId);
    }
    
    if (tempData.text_channel_id) {
      const textChannel = await channel.guild.channels.fetch(tempData.text_channel_id).catch(() => null);
      if (textChannel) {
        await textChannel.delete('Linked voice channel deleted').catch(console.error);
      }
      // Clean up sticky notes, restrictions, and go-to-latest tracking for the text channel
      stickyNotes.clearChannel(tempData.text_channel_id);
      textChannelRestrictions.clearRestrictions(tempData.text_channel_id);
      clearGoToLatestTracking(tempData.text_channel_id);
    }
    
    // Delete waiting room channel if it exists
    if (tempData.waiting_room_channel_id) {
      const waitingRoomChannel = await channel.guild.channels.fetch(tempData.waiting_room_channel_id).catch(() => null);
      if (waitingRoomChannel) {
        await waitingRoomChannel.delete('Linked voice channel deleted').catch(console.error);
      }
      // Clean up waiting room data
      const { clearWaitingRoomData } = require('./interactionCreate');
      clearWaitingRoomData(channelId);
    }
    
    await freshChannel.delete('Temp channel empty');
    
    dataStore.deleteTempChannel(channelId);
    dataStore.deleteChannelOwner(channelId);
    
    console.log(`Deleted empty temp channel in ${channel.guild.name}`);
  } catch (error) {
    console.error('Error deleting temp channel:', error);
  } finally {
    pendingDeletions.delete(channelId);
  }
}

/**
 * Updates all invitation DM messages with static duration when channel is deleted
 * @param {Client} client - Discord client
 * @param {Array} sentInvitations - Array of invitation tracking data
 * @param {string} finalDuration - Static duration text (e.g., "1h 30m")
 * @param {string} channelId - The voice channel ID (for logging)
 */
async function updateInvitationMessages(client, sentInvitations, finalDuration, channelId) {
  console.log(`Updating ${sentInvitations.length} invitation message(s) with final duration: ${finalDuration}`);
  
  for (const invitation of sentInvitations) {
    try {
      const user = await client.users.fetch(invitation.recipientId);
      const dmChannel = await user.createDM();
      const message = await dmChannel.messages.fetch(invitation.messageId).catch(() => null);
      
      if (message) {
        // Rebuild the embed with static duration
        const { embed, components } = buildInvitationEmbed({
          channelName: invitation.channelName,
          channelId: channelId,
          guildId: invitation.guildId,
          serverName: invitation.serverName,
          invitedBy: { id: invitation.invitedById, username: invitation.invitedByUsername },
          createdAt: invitation.createdAt,
          currentMembers: [], // Channel is deleted, no members
          serverIconUrl: invitation.serverIconUrl,
          note: invitation.note,
          finalDuration: finalDuration // Pass static duration
        });
        
        // Update the embed to show channel is deleted
        embed.setColor(0x99AAB5); // Gray color to indicate inactive
        embed.setFooter({ text: `🎅 Invited by ${invitation.invitedByUsername} • Channel Deleted` });
        
        await message.edit({ embeds: [embed], components: [] }); // Remove join button
        console.log(`Updated invitation message for user ${invitation.recipientId}`);
      }
    } catch (error) {
      console.log(`Could not update invitation message for user ${invitation.recipientId}:`, error.message);
    }
  }
}

async function handleOwnerLeft(channel, tempData) {
  const guildId = channel.guild.id;
  if (!voiceManager.isFeatureEnabled(guildId, 'claim')) {
    return;
  }
  
  try {
    // Get all current members in the VC (excluding bots)
    const currentMembers = channel.members.filter(m => !m.user.bot);
    if (currentMembers.size === 0) return;
    
    // Build mentions string for all current members (for notification ping)
    const memberMentions = currentMembers.map(m => `<@${m.id}>`).join(' ');
    
    // Get the previous owner ID to display in the embed
    const previousOwnerId = tempData.owner_id;
    
    // Build the claim ownership panel with previous owner mention
    const { embed, components } = buildClaimOwnershipPanel(channel.id, previousOwnerId);
    
    // Send claim message to the voice channel (ping current members, show previous owner in embed)
    const vcClaimMessage = await channel.send({ 
      content: memberMentions, 
      embeds: [embed], 
      components 
    });
    
    // Track the claim message IDs for deletion when claimed
    const claimMessageIds = {
      voiceChannelMessageId: vcClaimMessage.id,
      textChannelMessageId: null
    };
    
    // If there's a linked text channel, send claim message there too
    if (tempData.text_channel_id) {
      const textChannel = await channel.guild.channels.fetch(tempData.text_channel_id).catch(() => null);
      if (textChannel) {
        const textClaimMessage = await textChannel.send({ 
          content: memberMentions, 
          embeds: [embed], 
          components 
        });
        claimMessageIds.textChannelMessageId = textClaimMessage.id;
      }
    }
    
    // Store the claim message IDs in temp data for later deletion
    tempData.claim_message_ids = claimMessageIds;
    dataStore.setTempChannel(channel.id, tempData);
    
  } catch (error) {
    console.error('Error sending claim panel:', error);
  }
}

async function grantTextChannelAccess(guild, textChannelId, member) {
  try {
    const textChannel = await guild.channels.fetch(textChannelId).catch(() => null);
    if (!textChannel) return;
    
    await textChannel.permissionOverwrites.edit(member.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
  } catch (error) {
    console.error('Error granting text channel access:', error);
  }
}

async function removeTextChannelAccess(guild, textChannelId, member) {
  try {
    const textChannel = await guild.channels.fetch(textChannelId).catch(() => null);
    if (!textChannel) return;
    
    const tempData = dataStore.getTempChannel(textChannel.id);
    if (tempData && tempData.owner_id === member.id) return;
    
    await textChannel.permissionOverwrites.delete(member.id);
  } catch (error) {
    console.error('Error removing text channel access:', error);
  }
}
