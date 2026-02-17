/**
 * Voice Request Slash Command
 * Allows users to request access to voice channels they are restricted from
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 5.1, 5.2, 5.3, 5.4
 */

const { ApplicationCommandOptionType, Collection } = require('discord.js');
const dataStore = require('../modules/auto-voice/voice/dataStore');
const controlPanel = require('../modules/auto-voice/voice/controlPanel');
const voiceRequestManager = require('../modules/auto-voice/voice/voiceRequestManager');

module.exports = {
  name: 'voice-request',
  description: 'Request access to a voice channel you are restricted from',
  dm_permission: false,
  cooldowns: new Collection(),
  options: [
    {
      name: 'channel',
      description: 'Select the voice channel to request access to',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true
    },
    {
      name: 'add_note',
      description: 'Add an optional note to your request (max 500 characters)',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 500
    }
  ],

  run: async (client, interaction, args) => {
    // Defer reply immediately to prevent timeout
    await interaction.deferReply({ flags: ['Ephemeral'] });

    const channelId = interaction.options.getString('channel');
    const note = interaction.options.getString('add_note');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    // Check if auto-voice is configured
    const settings = dataStore.getGuildSettings(guildId);
    if (!settings) {
      const embed = controlPanel.buildErrorEmbed(
        'Voice System Not Configured',
        'The auto voice system has not been set up on this server.'
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Fetch the channel
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      const embed = controlPanel.buildErrorEmbed(
        'Invalid Channel',
        'The selected channel no longer exists or could not be found.'
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Verify the channel is a temp voice channel
    if (channel.parentId !== settings.temp_voice_category_id) {
      const embed = controlPanel.buildErrorEmbed(
        'Invalid Channel',
        'This channel is not a temporary voice channel.'
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Skip the "Join to Create" channel
    if (channel.id === settings.voice_channel_id) {
      const embed = controlPanel.buildErrorEmbed(
        'Invalid Channel',
        'You cannot request access to the "Join to Create" channel.'
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Check if user has a restriction on this channel
    const member = interaction.member;
    const restriction = voiceRequestManager.hasRestriction(channel, userId, member);
    
    if (!restriction.restricted) {
      const embed = controlPanel.buildErrorEmbed(
        'No Restriction Found',
        'You are not restricted from this voice channel.\n\n' +
        'You can only request access to channels where you have been banned, rejected, or the channel is full.'
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Check if user has appeal attempts remaining
    const appealCheck = voiceRequestManager.canUserAppeal(channelId, userId);
    if (!appealCheck.canAppeal) {
      const embed = controlPanel.buildErrorEmbed(
        'Appeal Limit Reached',
        `You have used all **${voiceRequestManager.MAX_APPEAL_ATTEMPTS}** appeal attempts for this channel.\n\n` +
        'You cannot send any more requests to this voice channel.'
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Validate note if provided
    if (note) {
      const noteValidation = voiceRequestManager.validateNote(note);
      if (!noteValidation.valid) {
        const embed = controlPanel.buildErrorEmbed(
          'Invalid Note',
          noteValidation.error
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    }

    // Create the request
    const request = voiceRequestManager.createRequest(
      guildId,
      channel.id,
      userId,
      restriction.type,
      note
    );

    // Get channel owner
    const channelOwnerId = dataStore.getChannelOwner(channel.id);

    // Build the request message
    const { content, embed, components } = controlPanel.buildVoiceRequestMessage(request, channelOwnerId);

    // Send to voice channel
    let voiceMessageId = null;
    try {
      const voiceMessage = await channel.send({ content, embeds: [embed], components });
      voiceMessageId = voiceMessage.id;
    } catch (error) {
      console.error('[VoiceRequest] Failed to send message to voice channel:', error);
      const errorEmbed = controlPanel.buildErrorEmbed(
        'Failed to Send Request',
        'Could not send the request to the voice channel. Please try again.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    // Try to send to linked text channel if it exists
    let textMessageId = null;
    const tempChannelData = dataStore.getTempChannel(channel.id);
    if (tempChannelData && tempChannelData.text_channel_id) {
      try {
        const textChannel = await interaction.guild.channels.fetch(tempChannelData.text_channel_id);
        if (textChannel) {
          const textMessage = await textChannel.send({ content, embeds: [embed], components });
          textMessageId = textMessage.id;
        }
      } catch (error) {
        // Text channel might not exist or bot lacks permissions - continue anyway
        console.error('Could not send voice request to text channel:', error.message);
      }
    }

    // Update request with message IDs
    voiceRequestManager.updateRequestMessageIds(request.id, voiceMessageId, textMessageId);

    // Send confirmation to user
    const successEmbed = controlPanel.buildSuccessEmbed(
      'Request Sent',
      `Your request to join **${channel.name}** has been sent.\n\n` +
      `The channel owner will review your request and respond.`
    );
    await interaction.editReply({ embeds: [successEmbed] });
  }
};
