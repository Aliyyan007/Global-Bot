/**
 * Modals Module for Auto Voice Channel System
 * Modal definitions and submission handlers for voice channel management
 * Requirements: 3.1-3.6, 4.4, 4.5, 1.3
 */

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

const { BITRATE_LIMITS, USER_LIMIT, DEFAULT_SETTINGS, getMaxBitrateForTier } = require('./constants');

// ============================================
// Modal Builders
// ============================================

function buildNameModal(channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_name:${channelId}`)
    .setTitle('Change Channel Name');

  const nameInput = new TextInputBuilder()
    .setCustomId('channel_name')
    .setLabel('New Channel Name')
    .setPlaceholder('Enter a new name for your channel')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(100)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(nameInput);
  modal.addComponents(row);

  return modal;
}

function buildLimitModal(channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_limit:${channelId}`)
    .setTitle('Set User Limit');

  const limitInput = new TextInputBuilder()
    .setCustomId('user_limit')
    .setLabel(`User Limit (${USER_LIMIT.min}-${USER_LIMIT.max}, 0 = unlimited)`)
    .setPlaceholder('Enter a number between 0 and 99')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(2)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(limitInput);
  modal.addComponents(row);

  return modal;
}

function buildStatusModal(channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_status:${channelId}`)
    .setTitle('Set Channel Status');

  const statusInput = new TextInputBuilder()
    .setCustomId('channel_status')
    .setLabel('Channel Status')
    .setPlaceholder('Enter a status for your channel (leave empty to clear)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(500)
    .setRequired(false);

  const row = new ActionRowBuilder().addComponents(statusInput);
  modal.addComponents(row);

  return modal;
}

function buildBitrateModal(channelId, guild) {
  const maxBitrate = getMaxBitrateForTier(guild?.premiumTier);
  
  const modal = new ModalBuilder()
    .setCustomId(`modal_bitrate:${channelId}`)
    .setTitle('Set Audio Bitrate');

  const bitrateInput = new TextInputBuilder()
    .setCustomId('bitrate')
    .setLabel(`Bitrate in kbps (${BITRATE_LIMITS.min}-${maxBitrate})`)
    .setPlaceholder(`Enter a number between ${BITRATE_LIMITS.min} and ${maxBitrate}`)
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(3)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(bitrateInput);
  modal.addComponents(row);

  return modal;
}

function buildLfmModal(channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_lfm:${channelId}`)
    .setTitle('Looking for Members');

  const messageInput = new TextInputBuilder()
    .setCustomId('lfm_message')
    .setLabel('Message (optional)')
    .setPlaceholder('Add a message to your LFM announcement')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(false);

  const row = new ActionRowBuilder().addComponents(messageInput);
  modal.addComponents(row);

  return modal;
}

function buildTextChannelNameModal(voiceChannelId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_text:${voiceChannelId}`)
    .setTitle('Create Text Channel');

  const nameInput = new TextInputBuilder()
    .setCustomId('text_channel_name')
    .setLabel('Text Channel Name')
    .setPlaceholder('Enter a name for the text channel')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(100)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(nameInput);
  modal.addComponents(row);

  return modal;
}


function buildInviteNoteModal(channelId, userIds) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_invite:${channelId}:${userIds}`)
    .setTitle('Send Invitation');

  const noteInput = new TextInputBuilder()
    .setCustomId('invite_note')
    .setLabel('Invitation Note (optional)')
    .setPlaceholder('Add a personal note to your invitation')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false);

  const row = new ActionRowBuilder().addComponents(noteInput);
  modal.addComponents(row);

  return modal;
}

function buildRejectReasonModal(channelId, userIds, isCurrent = false) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_reject:${channelId}:${userIds}:${isCurrent ? '1' : '0'}`)
    .setTitle('Reject Users/Roles');

  const reasonInput = new TextInputBuilder()
    .setCustomId('reject_reason')
    .setLabel('Reason (optional)')
    .setPlaceholder('Provide a reason for rejecting these users/roles')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false);

  const reasonRow = new ActionRowBuilder().addComponents(reasonInput);
  modal.addComponents(reasonRow);

  return modal;
}

function buildCustomSetupModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_custom_setup')
    .setTitle('Custom Voice Setup');

  const categoryNameInput = new TextInputBuilder()
    .setCustomId('category_name')
    .setLabel('Main Category Name')
    .setPlaceholder('e.g., Voice Channels')
    .setStyle(TextInputStyle.Short)
    .setValue('Temporary Voice Channels')
    .setMaxLength(100)
    .setRequired(true);

  const channelNameInput = new TextInputBuilder()
    .setCustomId('join_channel_name')
    .setLabel('Join to Create Channel Name')
    .setPlaceholder('e.g., Join to Create')
    .setStyle(TextInputStyle.Short)
    .setValue('Join to Create')
    .setMaxLength(100)
    .setRequired(true);

  const templateInput = new TextInputBuilder()
    .setCustomId('channel_template')
    .setLabel('Channel Name Template (use {username})')
    .setPlaceholder("e.g., 🗣️ {username}'s Voice")
    .setStyle(TextInputStyle.Short)
    .setValue(DEFAULT_SETTINGS.channelNameTemplate)
    .setMaxLength(100)
    .setRequired(true);

  const limitInput = new TextInputBuilder()
    .setCustomId('default_limit')
    .setLabel('Default User Limit (0 = unlimited)')
    .setPlaceholder('Enter a number between 0 and 99')
    .setStyle(TextInputStyle.Short)
    .setValue('0')
    .setMaxLength(2)
    .setRequired(true);

  const categoryRow = new ActionRowBuilder().addComponents(categoryNameInput);
  const channelRow = new ActionRowBuilder().addComponents(channelNameInput);
  const templateRow = new ActionRowBuilder().addComponents(templateInput);
  const limitRow = new ActionRowBuilder().addComponents(limitInput);

  modal.addComponents(categoryRow, channelRow, templateRow, limitRow);

  return modal;
}

function buildTextEditNameModal(textChannelId, voiceChannelId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_text_name:${textChannelId}:${voiceChannelId}`)
    .setTitle('Edit Text Channel Name');

  const nameInput = new TextInputBuilder()
    .setCustomId('text_channel_name')
    .setLabel('New Channel Name')
    .setPlaceholder('Enter a new name for the text channel')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(100)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(nameInput);
  modal.addComponents(row);

  return modal;
}

/**
 * Builds the ban reason modal for text channel bans
 * @param {string} textChannelId - The text channel ID
 * @param {string} voiceChannelId - The linked voice channel ID
 * @param {string} ids - Comma-separated user/role IDs to ban
 * @param {string} isRoleStr - 'true'/'false' or '1'/'0' indicating if it's a role
 */
function buildBanReasonModal(textChannelId, voiceChannelId, ids, isRoleStr = '') {
  // Shorten isRoleStr to single char
  const shortIsRole = isRoleStr === 'true' || isRoleStr === '1' ? '1' : '0';
  const modal = new ModalBuilder()
    .setCustomId(`m_ban:${textChannelId}:${voiceChannelId}:${ids}:${shortIsRole}`)
    .setTitle('Ban - Add Reason');

  const reasonInput = new TextInputBuilder()
    .setCustomId('ban_reason')
    .setLabel('Ban Reason')
    .setPlaceholder('Enter a reason for banning (users will receive DM)')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false);

  const row = new ActionRowBuilder().addComponents(reasonInput);
  modal.addComponents(row);

  return modal;
}

// ============================================
// Modal Validation Helpers
// ============================================

function validateUserLimit(input) {
  const value = parseInt(input, 10);
  
  if (isNaN(value)) {
    return { valid: false, value: 0, error: 'Please enter a valid number.' };
  }
  
  if (value < USER_LIMIT.min || value > USER_LIMIT.max) {
    return { 
      valid: false, 
      value: 0, 
      error: `User limit must be between ${USER_LIMIT.min} and ${USER_LIMIT.max}.` 
    };
  }
  
  return { valid: true, value, error: '' };
}

function validateBitrate(input, maxBitrate = 96) {
  const value = parseInt(input, 10);
  
  if (isNaN(value)) {
    return { valid: false, value: 0, error: 'Please enter a valid number.' };
  }
  
  if (value < BITRATE_LIMITS.min || value > maxBitrate) {
    return { 
      valid: false, 
      value: 0, 
      error: `Bitrate must be between ${BITRATE_LIMITS.min} and ${maxBitrate} kbps.` 
    };
  }
  
  return { valid: true, value: value * 1000, error: '' };
}

function validateChannelName(input) {
  const trimmed = input?.trim() || '';
  
  if (trimmed.length === 0) {
    return { valid: false, value: '', error: 'Channel name cannot be empty.' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, value: '', error: 'Channel name cannot exceed 100 characters.' };
  }
  
  return { valid: true, value: trimmed, error: '' };
}

function validateYesNo(input) {
  const normalized = input?.toLowerCase().trim();
  
  if (normalized === 'yes' || normalized === 'y') {
    return { valid: true, value: true, error: '' };
  }
  
  if (normalized === 'no' || normalized === 'n') {
    return { valid: true, value: false, error: '' };
  }
  
  return { valid: false, value: false, error: 'Please enter "yes" or "no".' };
}

function parseModalCustomId(customId) {
  const parts = customId.split(':');
  return {
    type: parts[0],
    params: parts.slice(1)
  };
}

/**
 * Builds the modal for voice appeal note
 * @param {string} channelId - The channel ID being appealed to
 */
function buildVoiceAppealNoteModal(channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_voice_appeal:${channelId}`)
    .setTitle('Add Note to Appeal');

  const noteInput = new TextInputBuilder()
    .setCustomId('appeal_note')
    .setLabel('Note (optional)')
    .setPlaceholder('Explain why you should be allowed to join...')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(false);

  const row = new ActionRowBuilder().addComponents(noteInput);
  modal.addComponents(row);

  return modal;
}

module.exports = {
  buildNameModal,
  buildLimitModal,
  buildStatusModal,
  buildBitrateModal,
  buildLfmModal,
  buildTextChannelNameModal,
  buildInviteNoteModal,
  buildRejectReasonModal,
  buildBanReasonModal,
  buildCustomSetupModal,
  buildTextEditNameModal,
  buildVoiceAppealNoteModal,
  validateUserLimit,
  validateBitrate,
  validateChannelName,
  validateYesNo,
  parseModalCustomId
};
