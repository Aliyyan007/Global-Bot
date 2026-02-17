/**
 * Control Panel Module for Auto Voice Channel System
 * Builds embeds and interactive components for voice/text channel management
 * Requirements: 2.5, 3.1-3.6, 4.1-4.9
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

const { VOICE_REGIONS } = require('./constants');

/**
 * Builds the main voice channel control panel embed and components
 * @deprecated Use buildCompactVoiceControlPanel for the new compact style
 */
function buildVoiceControlPanel(guildId, channelId, ownerId) {
  const embed = new EmbedBuilder()
    .setTitle('🎙️ Voice Channel Control Panel')
    .setDescription(
      `Welcome to your temporary voice channel!\n\n` +
      `**Owner:** <@${ownerId}>\n\n` +
      `Use the dropdown menus below to manage your channel settings and permissions.`
    )
    .setColor(0x5865F2)
    .addFields(
      {
        name: '⚙️ Settings',
        value: 'Name, Limit, Status, Bitrate, LFM, Text Channel',
        inline: true
      },
      {
        name: '🔒 Permissions',
        value: 'Lock, Permit, Reject, Ghost, Transfer, Region',
        inline: true
      }
    )
    .setFooter({ text: 'Only the channel owner can use these controls' })
    .setTimestamp();

  const settingsSelect = buildSettingsSelect(channelId, ownerId);
  const permissionsSelect = buildPermissionsSelect(channelId, ownerId);

  const settingsRow = new ActionRowBuilder().addComponents(settingsSelect);
  const permissionsRow = new ActionRowBuilder().addComponents(permissionsSelect);

  return {
    embed,
    components: [settingsRow, permissionsRow]
  };
}

/**
 * Builds the compact voice channel control panel (VoiceMaster style)
 * Uses Discord Components V2 for compact layout
 * Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3
 * @param {string} guildId - The guild ID
 * @param {string} channelId - The voice channel ID
 * @param {string} ownerId - The channel owner's user ID
 * @param {Object} options - Optional configuration
 * @param {string} options.thumbnailUrl - Bot thumbnail URL
 * @param {boolean} options.stickyEnabled - Whether sticky notes are enabled
 * @param {string} options.latestMessageUrl - URL to the latest message for Go to Latest button
 * @param {boolean} options.waitingRoomEnabled - Whether waiting room is enabled for this channel
 * @returns {{ components: any[], flags: number[] }}
 */
function buildCompactVoiceControlPanel(guildId, channelId, ownerId, options = {}) {
  const { thumbnailUrl, stickyEnabled = false, latestMessageUrl, waitingRoomEnabled = false } = options;
  
  // Build Components V2 container for compact VoiceMaster-style layout
  const container = new ContainerBuilder()
    .setAccentColor([88, 101, 242]); // Discord blurple RGB
  
  // Add Waiting Room status indicator at the top if enabled
  if (waitingRoomEnabled) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('🚪 **Waiting Room Enabled**')
    );
    
    // Add separator after waiting room indicator
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  }
  
  // Main section with text and thumbnail
  const mainText = new TextDisplayBuilder().setContent([
    `## ⚙️ Welcome to your own temporary voice channel`,
    ``,
    `• Use the \`/voice-settings\` command to configure and manage your saved voice channel settings`,
    `• Use the \`/voice-request\` command to submit a request to join a voice channel if it is full or if your previous request was denied`
  ].join('\n'));
  
  // Add section with thumbnail if provided
  if (thumbnailUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(mainText)
        .setThumbnailAccessory(thumb => thumb.setURL(thumbnailUrl))
    );
  } else {
    container.addTextDisplayComponents(mainText);
  }
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Channel Settings section with Load Settings button on the right
  const loadSettingsButton = new ButtonBuilder()
    .setCustomId(`load_settings:${channelId}:${ownerId}`)
    .setLabel('Load Settings')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📥');
  
  const settingsHeaderText = new TextDisplayBuilder().setContent('### Channel Settings');
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(settingsHeaderText)
      .setButtonAccessory(loadSettingsButton)
  );
  
  // Build settings dropdown
  const settingsSelect = buildCompactSettingsSelect(channelId, ownerId, { waitingRoomEnabled });
  const settingsRow = new ActionRowBuilder().addComponents(settingsSelect);
  container.addActionRowComponents(settingsRow);
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Channel Permissions section with larger heading
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('### Channel Permissions')
  );
  
  // Build permissions dropdown
  const permissionsSelect = buildCompactPermissionsSelect(channelId, ownerId);
  const permissionsRow = new ActionRowBuilder().addComponents(permissionsSelect);
  container.addActionRowComponents(permissionsRow);
  
  // Add separator before buttons
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Sticky Note button - toggles color and label based on state
  // Green (Success) when disabled, Red (Danger) when enabled
  const stickyNoteButton = new ButtonBuilder()
    .setCustomId(`sticky_note:${channelId}:${ownerId}`)
    .setLabel(stickyEnabled ? 'Disable Sticky Note' : 'Enable Sticky Note')
    .setStyle(stickyEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
    .setEmoji('📌');
  
  // Go to Latest button - links to the tracked 5th message or channel
  const goToLatestUrl = latestMessageUrl || `https://discord.com/channels/${guildId}/${channelId}`;
  const goToLatestButton = new ButtonBuilder()
    .setLabel('Go to Latest')
    .setStyle(ButtonStyle.Link)
    .setURL(goToLatestUrl)
    .setEmoji('📩');
  
  const buttonsRow = new ActionRowBuilder().addComponents(stickyNoteButton, goToLatestButton);
  container.addActionRowComponents(buttonsRow);
  
  return {
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  };
}

/**
 * Builds the universal voice channel control panel (for /interface-voice command)
 * Similar to buildCompactVoiceControlPanel but with customizations for universal interface:
 * - Different title text
 * - Sticky Note Manager button instead of toggle
 * @param {string} guildId - The guild ID
 * @param {string} channelId - The voice channel ID (or "UNIVERSAL")
 * @param {string} ownerId - The channel owner's user ID (or "UNIVERSAL")
 * @param {Object} options - Optional configuration
 * @returns {{ components: any[], flags: number[] }}
 */
function buildUniversalVoiceControlPanel(guildId, channelId, ownerId, options = {}) {
  const { thumbnailUrl, stickyEnabled = false, latestMessageUrl, waitingRoomEnabled = false } = options;
  
  // Build Components V2 container for compact VoiceMaster-style layout
  const container = new ContainerBuilder()
    .setAccentColor([88, 101, 242]); // Discord blurple RGB
  
  // NOTE: Universal interface does NOT show waiting room indicator
  // It's a static interface that works for any user's temp VC
  
  // Main section with text and thumbnail - CUSTOM TEXT FOR UNIVERSAL INTERFACE
  const mainText = new TextDisplayBuilder().setContent([
    `## ⚙️ Temporary VC Channel Controls Interface`,
    ``,
    `• Use the \`/voice-settings\` command to configure and manage your saved voice channel settings`,
    `• Use the \`/voice-request\` command to submit a request to join a voice channel if it is full or if your previous request was denied`
  ].join('\n'));
  
  // Add section with thumbnail if provided
  if (thumbnailUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(mainText)
        .setThumbnailAccessory(thumb => thumb.setURL(thumbnailUrl))
    );
  } else {
    container.addTextDisplayComponents(mainText);
  }
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Channel Settings section with Load Settings button on the right
  const loadSettingsButton = new ButtonBuilder()
    .setCustomId(`load_settings:UNIVERSAL:UNIVERSAL`)
    .setLabel('Load Settings')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📥');
  
  const settingsHeaderText = new TextDisplayBuilder().setContent('### Channel Settings');
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(settingsHeaderText)
      .setButtonAccessory(loadSettingsButton)
  );
  
  // Build settings dropdown - USE UNIVERSAL PLACEHOLDERS
  const settingsSelect = buildCompactSettingsSelect('UNIVERSAL', 'UNIVERSAL', { waitingRoomEnabled, isUniversal: true });
  const settingsRow = new ActionRowBuilder().addComponents(settingsSelect);
  container.addActionRowComponents(settingsRow);
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Channel Permissions section with larger heading
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('### Channel Permissions')
  );
  
  // Build permissions dropdown - USE UNIVERSAL PLACEHOLDERS
  const permissionsSelect = buildCompactPermissionsSelect('UNIVERSAL', 'UNIVERSAL');
  const permissionsRow = new ActionRowBuilder().addComponents(permissionsSelect);
  container.addActionRowComponents(permissionsRow);
  
  // Add separator before buttons
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Sticky Note Manager button - DIFFERENT FROM REGULAR PANEL
  const stickyNoteButton = new ButtonBuilder()
    .setCustomId(`sticky_note_manager:UNIVERSAL:UNIVERSAL`)
    .setLabel('Sticky Note Manager')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📌');
  
  // View Current Settings button - shows current VC settings
  const viewSettingsButton = new ButtonBuilder()
    .setCustomId(`view_current_settings:UNIVERSAL:UNIVERSAL`)
    .setLabel('View Current Settings')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📊');
  
  const buttonsRow = new ActionRowBuilder().addComponents(stickyNoteButton, viewSettingsButton);
  container.addActionRowComponents(buttonsRow);
  
  return {
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  };
}

/**
 * Builds the compact settings dropdown menu
 * Requirements: 2.1, 3.1
 * @param {boolean} isUniversal - Whether this is for the universal interface (changes waiting room label)
 */
function buildCompactSettingsSelect(channelId, ownerId, options = {}) {
  const { waitingRoomEnabled = false, isUniversal = false } = options;
  
  // Waiting room label differs between universal and temp VC panel
  const waitingRoomLabel = isUniversal ? 'Manage Waiting Room' : (waitingRoomEnabled ? 'Disable Waiting Room' : 'Enable Waiting Room');
  const waitingRoomDescription = isUniversal 
    ? (waitingRoomEnabled ? 'Waiting room is enabled' : 'Create a waiting room for join requests')
    : (waitingRoomEnabled ? 'Remove the waiting room channel' : 'Create a waiting room for join requests');
  
  const menuOptions = [
    { label: 'Name', description: 'Change the channel name', value: 'name', emoji: '✏️' },
    { label: 'Limit', description: 'Set user limit (0-99)', value: 'limit', emoji: '👥' },
    { label: 'Status', description: 'Set channel status', value: 'status', emoji: '📝' },
    { label: 'Bitrate', description: 'Set audio bitrate (based on server boost)', value: 'bitrate', emoji: '🔊' },
    { label: 'LFM', description: 'Send Looking for Members announcement', value: 'lfm', emoji: '📢' },
    { label: 'Text Channel', description: 'Create a linked text channel', value: 'text', emoji: '💬' },
    { 
      label: waitingRoomLabel, 
      description: waitingRoomDescription, 
      value: 'waitingroom', 
      emoji: '🚪' 
    },
    { label: 'Game', description: 'Set name to current game', value: 'game', emoji: '🎮' },
    { label: 'NSFW', description: 'Toggle NSFW mode', value: 'nsfw', emoji: '⚠️' },
    { label: 'Claim', description: 'Claim channel ownership', value: 'claim', emoji: '👑' }
  ];
  
  return new StringSelectMenuBuilder()
    .setCustomId(`voice_settings:${channelId}:${ownerId}`)
    .setPlaceholder('Change channel settings')
    .addOptions(menuOptions);
}

/**
 * Builds the compact permissions dropdown menu
 * Requirements: 2.2, 4.1
 */
function buildCompactPermissionsSelect(channelId, ownerId) {
  return new StringSelectMenuBuilder()
    .setCustomId(`voice_permissions:${channelId}:${ownerId}`)
    .setPlaceholder('Change channel permissions')
    .addOptions([
      { label: 'Lock', description: 'Prevent new users from connecting', value: 'lock', emoji: '🔒' },
      { label: 'Unlock', description: 'Allow users to connect', value: 'unlock', emoji: '🔓' },
      { label: 'Permit', description: 'Grant specific users connect permission', value: 'permit', emoji: '✅' },
      { label: 'Reject', description: 'Deny specific users and optionally disconnect', value: 'reject', emoji: '❌' },
      { label: 'Invite', description: 'Send DM invitations to users', value: 'invite', emoji: '📨' },
      { label: 'Ghost', description: 'Hide channel from non-members', value: 'ghost', emoji: '👻' },
      { label: 'Unghost', description: 'Make channel visible to everyone', value: 'unghost', emoji: '👁️' },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'transfer', emoji: '🔄' },
      { label: 'Region', description: 'Change voice region', value: 'region', emoji: '🌍' }
    ]);
}


/**
 * Builds the text channel control panel embed and components
 * @deprecated Use buildCompactTextControlPanel for the new compact style
 */
function buildTextControlPanel(guildId, textChannelId, voiceChannelId, ownerId) {
  const embed = new EmbedBuilder()
    .setTitle('💬 Text Channel Control Panel')
    .setDescription(
      `This text channel is linked to your voice channel.\n\n` +
      `**Owner:** <@${ownerId}>\n\n` +
      `Use the dropdown menu below to manage this text channel.`
    )
    .setColor(0x57F287)
    .addFields(
      {
        name: '📝 Available Actions',
        value: 'Edit Name, Delete Channel, Sticky Notes, View-Only Mode, Ban Users',
        inline: false
      }
    )
    .setFooter({ text: 'Only the channel owner can use these controls' })
    .setTimestamp();

  const textSettingsSelect = buildTextSettingsSelect(textChannelId, voiceChannelId, ownerId);
  const textSettingsRow = new ActionRowBuilder().addComponents(textSettingsSelect);

  return {
    embed,
    components: [textSettingsRow]
  };
}

/**
 * Builds the compact text channel control panel (VoiceMaster style)
 * Uses Discord Components V2 for compact layout with:
 * - Container with accent color
 * - Title and description
 * - Note with Edit Name button on the right
 * - Take Actions and Remove Actions dropdowns
 * - Sticky Note and Go to Latest buttons inside container
 * - Delete Channel button outside container
 * 
 * @param {string} guildId - The guild ID
 * @param {string} textChannelId - The text channel ID
 * @param {string} voiceChannelId - The linked voice channel ID
 * @param {string} ownerId - The channel owner's user ID
 * @param {Object} options - Optional configuration
 * @param {boolean} options.stickyEnabled - Whether sticky notes are enabled
 * @param {string} options.latestMessageUrl - URL to the latest message
 * @returns {{ components: any[], flags: number[] }}
 */
function buildCompactTextControlPanel(guildId, textChannelId, voiceChannelId, ownerId, options = {}) {
  const { stickyEnabled = false, latestMessageUrl } = options;
  
  // Build Components V2 container for compact layout
  const container = new ContainerBuilder()
    .setAccentColor([237, 66, 69]); // Red accent color
  
  // Title using # heading
  const headerText = new TextDisplayBuilder().setContent([
    `# 💬 Text Channel Control Panel`,
    ``,
    `Manage your temporary text channel using the controls below.`,
    `Only the channel owner can use these controls.`
  ].join('\n'));
  
  container.addTextDisplayComponents(headerText);
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Note text with Edit Channel Name button on the right (using SectionBuilder)
  const editNameButton = new ButtonBuilder()
    .setCustomId(`text_edit_name:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setLabel('Edit Name')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📝');
  
  const noteText = new TextDisplayBuilder().setContent(
    `-# Note: These controls only affect this text channel | Auto-returns after 2 minutes if not responding`
  );
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(noteText)
      .setButtonAccessory(editNameButton)
  );
  
  // Add separator before dropdowns
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Take Actions dropdown (View-Only, Ban) - Users only
  const takeActionsSelect = new StringSelectMenuBuilder()
    .setCustomId(`text_take_actions:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setPlaceholder('Take Actions')
    .addOptions([
      { label: 'View-Only Users', description: 'Set users to view-only (can see but not send)', value: 'viewonly', emoji: '👀' },
      { label: 'Ban Users', description: 'Ban users from this text channel', value: 'ban', emoji: '🚫' }
    ]);
  
  const takeActionsRow = new ActionRowBuilder().addComponents(takeActionsSelect);
  container.addActionRowComponents(takeActionsRow);
  
  // Remove Actions dropdown - Users only
  const removeActionsSelect = new StringSelectMenuBuilder()
    .setCustomId(`text_remove_actions:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setPlaceholder('Remove Actions')
    .addOptions([
      { label: 'Give Access Users', description: 'Restore access for view-only users', value: 'giveaccess', emoji: '✅' },
      { label: 'Unban Users', description: 'Unban users from this channel', value: 'unban', emoji: '🔓' }
    ]);
  
  const removeActionsRow = new ActionRowBuilder().addComponents(removeActionsSelect);
  container.addActionRowComponents(removeActionsRow);
  
  // Sticky Note and Go to Latest buttons (inside container)
  const stickyNoteButton = new ButtonBuilder()
    .setCustomId(`text_sticky:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setLabel(stickyEnabled ? 'Disable Sticky Note' : 'Enable Sticky Note')
    .setStyle(stickyEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
    .setEmoji('📌');
  
  const goToLatestUrl = latestMessageUrl || `https://discord.com/channels/${guildId}/${textChannelId}`;
  const goToLatestButton = new ButtonBuilder()
    .setLabel('Go to Latest')
    .setStyle(ButtonStyle.Link)
    .setURL(goToLatestUrl)
    .setEmoji('📩');
  
  const buttonsRow = new ActionRowBuilder().addComponents(stickyNoteButton, goToLatestButton);
  container.addActionRowComponents(buttonsRow);
  
  // Delete Channel button - OUTSIDE the container
  const deleteChannelButton = new ButtonBuilder()
    .setCustomId(`text_delete:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setLabel('Delete Channel')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');
  
  const bottomRow = new ActionRowBuilder().addComponents(deleteChannelButton);
  
  return {
    components: [container, bottomRow],
    flags: [MessageFlags.IsComponentsV2]
  };
}

/**
 * Builds the settings dropdown menu for voice channel management
 */
function buildSettingsSelect(channelId, ownerId) {
  return new StringSelectMenuBuilder()
    .setCustomId(`voice_settings:${channelId}:${ownerId}`)
    .setPlaceholder('⚙️ Channel Settings')
    .addOptions([
      { label: 'Name', description: 'Change the channel name', value: 'name', emoji: '✏️' },
      { label: 'Limit', description: 'Set user limit (0-99)', value: 'limit', emoji: '👥' },
      { label: 'Status', description: 'Set channel status', value: 'status', emoji: '📝' },
      { label: 'Bitrate', description: 'Set audio bitrate (based on server boost)', value: 'bitrate', emoji: '🔊' },
      { label: 'LFM', description: 'Send Looking for Members announcement', value: 'lfm', emoji: '📢' },
      { label: 'Text Channel', description: 'Create a linked text channel', value: 'text', emoji: '💬' },
      { label: 'Game', description: 'Set name to current game', value: 'game', emoji: '🎮' },
      { label: 'NSFW', description: 'Toggle NSFW mode', value: 'nsfw', emoji: '⚠️' },
      { label: 'Claim', description: 'Claim channel ownership', value: 'claim', emoji: '👑' }
    ]);
}

/**
 * Builds the permissions dropdown menu for voice channel management
 */
function buildPermissionsSelect(channelId, ownerId) {
  return new StringSelectMenuBuilder()
    .setCustomId(`voice_permissions:${channelId}:${ownerId}`)
    .setPlaceholder('🔒 Channel Permissions')
    .addOptions([
      { label: 'Lock', description: 'Prevent new users from connecting', value: 'lock', emoji: '🔒' },
      { label: 'Unlock', description: 'Allow users to connect', value: 'unlock', emoji: '🔓' },
      { label: 'Permit', description: 'Grant specific users connect permission', value: 'permit', emoji: '✅' },
      { label: 'Reject', description: 'Deny specific users and optionally disconnect', value: 'reject', emoji: '❌' },
      { label: 'Invite', description: 'Send DM invitations to users', value: 'invite', emoji: '📨' },
      { label: 'Ghost', description: 'Hide channel from non-members', value: 'ghost', emoji: '👻' },
      { label: 'Unghost', description: 'Make channel visible to everyone', value: 'unghost', emoji: '👁️' },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'transfer', emoji: '🔄' },
      { label: 'Region', description: 'Change voice region', value: 'region', emoji: '🌍' }
    ]);
}

/**
 * Builds the text channel settings dropdown menu
 */
function buildTextSettingsSelect(textChannelId, voiceChannelId, ownerId) {
  return new StringSelectMenuBuilder()
    .setCustomId(`text_settings:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setPlaceholder('📝 Text Channel Settings')
    .addOptions([
      { label: 'Edit Name', description: 'Change the text channel name', value: 'edit_name', emoji: '✏️' },
      { label: 'Delete Channel', description: 'Delete this text channel', value: 'delete', emoji: '🗑️' },
      { label: 'Sticky Notes', description: 'Enable/disable sticky notes', value: 'sticky', emoji: '📌' },
      { label: 'View-Only Mode', description: 'Set users to view-only', value: 'viewonly', emoji: '👀' },
      { label: 'Ban User', description: 'Ban a user from this text channel', value: 'ban', emoji: '🚫' },
      { label: 'Give Access', description: 'Restore access for view-only users', value: 'giveaccess', emoji: '✅' },
      { label: 'Unban', description: 'Unban users from this channel', value: 'unban', emoji: '🔓' }
    ]);
}


/**
 * Builds the region selection dropdown menu
 */
function buildRegionSelect(channelId, ownerId) {
  const options = VOICE_REGIONS.map(region => ({
    label: region.name,
    description: `Set voice region to ${region.name}`,
    value: region.id,
    emoji: region.emoji
  }));

  return new StringSelectMenuBuilder()
    .setCustomId(`voice_region:${channelId}:${ownerId}`)
    .setPlaceholder('🌍 Select Voice Region')
    .addOptions(options);
}

/**
 * Builds a user selection menu for various actions
 */
function buildUserSelect(action, channelId, maxValues = 1) {
  const placeholders = {
    permit: '✅ Select users to permit',
    reject: '❌ Select users to reject',
    invite: '📨 Select users to invite',
    transfer: '🔄 Select new owner'
  };

  return new UserSelectMenuBuilder()
    .setCustomId(`user_select:${action}:${channelId}`)
    .setPlaceholder(placeholders[action] || 'Select users')
    .setMinValues(1)
    .setMaxValues(maxValues);
}

/**
 * Builds the claim ownership button for abandoned channels
 * @param {string} channelId - The voice channel ID
 * @param {string} previousOwnerId - The ID of the previous owner who left
 */
function buildClaimOwnershipPanel(channelId, previousOwnerId = '') {
  const description = previousOwnerId 
    ? `The channel owner has left this voice channel.\n\n<@${previousOwnerId}>\n\nClick the button below to claim ownership of this channel.`
    : 'The channel owner has left this voice channel.\n\nClick the button below to claim ownership of this channel.';
  
  const embed = new EmbedBuilder()
    .setTitle('👑 Channel Owner Left')
    .setDescription(description)
    .setColor(0xFEE75C)
    .setTimestamp();

  const claimButton = new ButtonBuilder()
    .setCustomId(`claim_ownership:${channelId}`)
    .setLabel('Claim Ownership')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('👑');

  const row = new ActionRowBuilder().addComponents(claimButton);

  return {
    embed,
    components: [row]
  };
}

/**
 * Builds the waiting room join request message
 * Sent to the locked VC when a user joins the waiting room
 * @param {Object} options - Request details
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildWaitingRoomRequestEmbed(options) {
  const { requesterId, ownerId, lockedChannelId, waitingRoomChannelId, serverIconUrl } = options;
  
  const embed = new EmbedBuilder()
    .setTitle('🚪 Join Request')
    .setDescription(
      `<@${requesterId}> is waiting to join your voice channel.\n\n` +
      `They are currently in the waiting room.\n` +
      `Use the buttons below to accept or reject their request.`
    )
    .setColor(0x5865F2)
    .setTimestamp();
  
  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }
  
  const acceptButton = new ButtonBuilder()
    .setCustomId(`waitingroom_accept:${lockedChannelId}:${waitingRoomChannelId}:${requesterId}`)
    .setLabel('Accept')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');
  
  const rejectButton = new ButtonBuilder()
    .setCustomId(`waitingroom_reject:${lockedChannelId}:${waitingRoomChannelId}:${requesterId}`)
    .setLabel('Reject')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('❌');
  
  const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);
  
  return { embed, components: [row] };
}

/**
 * Builds the LFM (Looking for Members) announcement embed
 */
function buildLfmAnnouncement(voiceChannel, ownerId, message = '') {
  const memberCount = voiceChannel.members?.size || 0;
  const userLimit = voiceChannel.userLimit || 'Unlimited';
  
  const embed = new EmbedBuilder()
    .setTitle('📢 Looking for Members!')
    .setDescription(
      (message ? `## Note\n${message}\n\n` : '') +
      `**Owner:** <@${ownerId}>\n` +
      `**Current Members:** ${memberCount}\n` +
      `**Limit:** ${userLimit}\n` +
      `**Channel:** <#${voiceChannel.id}>`
    )
    .setColor(0x5865F2)
    .setTimestamp();

  const joinButton = new ButtonBuilder()
    .setURL(`https://discord.com/channels/${voiceChannel.guild.id}/${voiceChannel.id}`)
    .setLabel('Join Channel')
    .setStyle(ButtonStyle.Link)
    .setEmoji('🎙️');

  const row = new ActionRowBuilder().addComponents(joinButton);

  return {
    embed,
    components: [row]
  };
}

/**
 * Builds the setup interface with Default and Custom setup options
 */
function buildSetupInterface() {
  const embed = new EmbedBuilder()
    .setTitle('🔧 Auto Voice Channel Setup')
    .setDescription(
      'Welcome to the Auto Voice Channel setup!\n\n' +
      'Choose how you want to configure the system:\n\n' +
      '**Default Setup** - Quick setup with standard settings\n' +
      '• Creates "Temporary Voice Channels" category\n' +
      '• Creates "Join to Create" voice channel\n' +
      '• Creates "Your Temp Voice" category for temp channels\n\n' +
      '**Custom Setup** - Customize all settings\n' +
      '• Choose your own category and channel names\n' +
      '• Set custom channel name template\n' +
      '• Configure default user limit'
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'Select an option below to continue' });

  const defaultButton = new ButtonBuilder()
    .setCustomId('setup_default')
    .setLabel('Default Setup')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('⚡');

  const customButton = new ButtonBuilder()
    .setCustomId('setup_custom')
    .setLabel('Custom Setup')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⚙️');

  const row = new ActionRowBuilder().addComponents(defaultButton, customButton);

  return {
    embed,
    components: [row]
  };
}

/**
 * Builds a success embed for setup completion
 */
function buildSetupSuccessEmbed(settings) {
  return new EmbedBuilder()
    .setTitle('✅ Setup Complete!')
    .setDescription(
      'The Auto Voice Channel system has been configured successfully!\n\n' +
      `**Join to Create Channel:** <#${settings.voice_channel_id}>\n` +
      `**Temp Voice Category:** <#${settings.temp_voice_category_id}>\n` +
      `**Channel Template:** ${settings.channel_name_template}\n` +
      `**Default User Limit:** ${settings.default_limit || 'Unlimited'}`
    )
    .setColor(0x57F287)
    .setTimestamp();
}

function buildErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(0xED4245)
    .setTimestamp();
}

function buildSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(0x57F287)
    .setTimestamp();
}

function buildInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setColor(0x5865F2)
    .setTimestamp();
}

// ============================================
// Confirm Delete Panel
// ============================================

/**
 * Builds the confirm delete panel for text channels
 * Shows only Yes, Delete and Cancel buttons (2 buttons only)
 * @param {string} guildId - The guild ID
 * @param {string} textChannelId - The text channel ID
 * @param {string} voiceChannelId - The linked voice channel ID
 * @param {string} ownerId - The channel owner's user ID
 * @param {Object} options - Optional configuration (unused, kept for compatibility)
 * @returns {{ components: any[], flags: number[] }}
 */
function buildConfirmDeletePanel(guildId, textChannelId, voiceChannelId, ownerId, options = {}) {
  const container = new ContainerBuilder()
    .setAccentColor([237, 66, 69]); // Red accent
  
  const headerText = new TextDisplayBuilder().setContent([
    `## ⚠️ Confirm Delete`,
    ``,
    `Are you sure you want to delete this text channel?`,
    `This action cannot be undone.`
  ].join('\n'));
  
  container.addTextDisplayComponents(headerText);
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Only Yes, Delete and Cancel buttons - no other buttons
  const yesDeleteButton = new ButtonBuilder()
    .setCustomId(`text_confirm_delete:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setLabel('Yes, Delete')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');
  
  const cancelButton = new ButtonBuilder()
    .setCustomId(`text_cancel_delete:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');
  
  const buttonsRow = new ActionRowBuilder().addComponents(yesDeleteButton, cancelButton);
  container.addActionRowComponents(buttonsRow);
  
  return {
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  };
}

/**
 * Builds a success state panel that shows a success message
 * Used to show feedback in the control panel before reverting
 * @param {string} title - Success title
 * @param {string} description - Success description
 * @param {Object} options - Options for sticky/go to latest buttons
 * @returns {{ components: any[], flags: number[] }}
 */
function buildSuccessStatePanel(guildId, channelId, ownerId, title, description, options = {}) {
  const { stickyEnabled = false, latestMessageUrl, isTextChannel = false, voiceChannelId } = options;
  
  const container = new ContainerBuilder()
    .setAccentColor([87, 242, 135]); // Green accent
  
  const headerText = new TextDisplayBuilder().setContent([
    `## ✅ ${title}`,
    ``,
    description
  ].join('\n'));
  
  container.addTextDisplayComponents(headerText);
  
  // No buttons in success state panel
  
  return {
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  };
}

/**
 * Builds an error state panel that shows an error message
 * Used to show feedback in the control panel before reverting
 */
function buildErrorStatePanel(guildId, channelId, ownerId, title, description, options = {}) {
  const { stickyEnabled = false, latestMessageUrl, isTextChannel = false, voiceChannelId } = options;
  
  const container = new ContainerBuilder()
    .setAccentColor([237, 66, 69]); // Red accent
  
  const headerText = new TextDisplayBuilder().setContent([
    `## ❌ ${title}`,
    ``,
    description
  ].join('\n'));
  
  container.addTextDisplayComponents(headerText);
  
  // No buttons in error state panel
  
  return {
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  };
}

// ============================================
// New DM Message Formats
// ============================================

/**
 * Builds the ban notification DM embed (new format)
 * Shows: Channel, Server, Banned By, Reason (## with ### content), When
 * Uses @user mentions and #channel mentions
 * @param {Object} options - Ban details
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildBanNotificationEmbed(options) {
  const { channelName, channelId, guildId, serverName, bannedById, reason, serverIconUrl } = options;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Build description with proper mentions and ## Reason / ### reason content format
  let description = `You have been banned from a temporary voice channel.\n\n`;
  description += `🔊 **Channel:** ${channelName}\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Banned By:** <@${bannedById}>\n\n`;

  if (reason && reason !== 'No reason provided') {
    description += `## 📋 Reason\n### ${reason}\n\n`;
  }

  description += `⏰ **When:** ${formattedDate}\n\n`;
  description += `💡 **Tip:** You can use \`/voice-request\` or click the button below to appeal and request access to the voice channel.`;

  const embed = new EmbedBuilder()
    .setTitle('🚫 Banned from Voice Channel')
    .setDescription(description)
    .setColor(0xed4245) // Red
    .setFooter({ text: 'You can no longer join this voice channel.' });

  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }

  // Appeal To Join button
  const appealButton = new ButtonBuilder()
    .setCustomId(`voice_appeal_start:${channelId}:${guildId}`)
    .setLabel('Appeal To Join')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📩');

  const row = new ActionRowBuilder().addComponents(appealButton);

  return { embed, components: [row] };
}

/**
 * Builds the text channel ban notification DM embed
 * Shows: Channel, Server, Banned By, Reason, When
 * @param {Object} options - Ban details
 * @returns {{ embed: EmbedBuilder }}
 */
function buildTextBanNotificationEmbed(options) {
  const { channelName, channelId, guildId, serverName, bannedById, reason, serverIconUrl } = options;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Build description for text channel ban
  let description = `You have been banned from a temporary text channel.\n\n`;
  description += `💬 **Channel:** ${channelName}\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Banned By:** <@${bannedById}>\n\n`;

  if (reason && reason !== 'No reason provided') {
    description += `## 📋 Reason\n### ${reason}\n\n`;
  }

  description += `⏰ **When:** ${formattedDate}`;

  const embed = new EmbedBuilder()
    .setTitle('🚫 Banned from Text Channel')
    .setDescription(description)
    .setColor(0xed4245) // Red
    .setFooter({ text: 'You can no longer view or send messages in this text channel.' });

  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }

  return { embed };
}

/**
 * Builds the reject notification DM embed for voice channel rejections
 * Shows: Channel, Server, Rejected By, Reason, When
 * Includes Appeal To Join button
 * @param {Object} options - Rejection details
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildRejectNotificationEmbed(options) {
  const { channelName, channelId, guildId, serverName, rejectedById, reason, serverIconUrl } = options || {};
  
  // Validate required parameters
  if (!channelName || !channelId || !guildId || !serverName || !rejectedById) {
    console.error('buildRejectNotificationEmbed: Missing required parameters', { channelName, channelId, guildId, serverName, rejectedById });
  }
  
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Build description with ## Reason and ### reason content
  let description = `You have been rejected from a temporary voice channel.\n\n`;
  description += `🔊 **Channel:** ${channelName}\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Rejected By:** <@${rejectedById}>\n\n`;

  if (reason) {
    description += `## 📋 Reason\n### ${reason}\n\n`;
  }

  description += `⏰ **When:** ${formattedDate}\n\n`;
  description += `💡 **Tip:** You can use \`/voice-request\` or click the button below to appeal and request access to the voice channel.`;

  const embed = new EmbedBuilder()
    .setTitle('❌ Rejected from Voice Channel')
    .setDescription(description)
    .setColor(0xed4245) // Red
    .setFooter({ text: 'You can no longer join this voice channel.' });

  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }

  // Appeal To Join button
  const appealButton = new ButtonBuilder()
    .setCustomId(`voice_appeal_start:${channelId}:${guildId}`)
    .setLabel('Appeal To Join')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📩');

  const row = new ActionRowBuilder().addComponents(appealButton);

  return { embed, components: [row] };
}

/**
 * Builds the permit notification DM embed for voice channel permits
 * Shows: Channel, Server, Permitted By, When, and Join VC button
 * @param {Object} options - Permit details
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildPermitNotificationEmbed(options) {
  const { channelName, channelId, guildId, serverName, permittedById, serverIconUrl } = options;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  let description = `You have been permitted to join a temporary voice channel.\n\n`;
  description += `🔊 **Channel:** ${channelName}\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Permitted By:** <@${permittedById}>\n\n`;
  description += `⏰ **When:** ${formattedDate}`;
  
  const embed = new EmbedBuilder()
    .setTitle('✅ Permitted to Voice Channel')
    .setDescription(description)
    .setColor(0x57F287) // Green
    .setFooter({ text: 'You can now join this voice channel.' });
  
  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }
  
  // Join VC button
  const joinButton = new ButtonBuilder()
    .setLabel('Join Voice Channel')
    .setStyle(ButtonStyle.Link)
    .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
    .setEmoji('🔊');
  
  const row = new ActionRowBuilder().addComponents(joinButton);
  
  return { embed, components: [row] };
}

/**
 * Builds the unban notification DM embed for text channel unbans
 * Same format as ban notification but without reason section
 * Shows: Channel, Server, Unbanned By, When, and Go to Channel button
 * @param {Object} options - Unban details
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildUnbanNotificationEmbed(options) {
  const { channelName, channelId, guildId, serverName, unbannedById, serverIconUrl } = options;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  // Build description matching ban format but without reason
  let description = `You have been unbanned from a temporary text channel.\n\n`;
  description += `💬 **Channel:** <#${channelId}>\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Unbanned By:** <@${unbannedById}>\n\n`;
  description += `⏰ **When:** ${formattedDate}`;
  
  const embed = new EmbedBuilder()
    .setTitle('✅ Unbanned from Text Channel')
    .setDescription(description)
    .setColor(0x57F287) // Green
    .setFooter({ text: 'You can now view and send messages in this channel again.' });
  
  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }
  
  // Go to Channel button
  const joinButton = new ButtonBuilder()
    .setLabel('Go to Channel')
    .setStyle(ButtonStyle.Link)
    .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
    .setEmoji('💬');
  
  const row = new ActionRowBuilder().addComponents(joinButton);
  
  return { embed, components: [row] };
}

/**
 * Builds the forced ownership claim notification DM embed
 * Sent to the previous owner when an admin/mod forcefully claims their channel
 * Shows: Who claimed, their permissions, channel info
 * @param {Object} options - Claim details
 * @returns {{ embed: EmbedBuilder }}
 */
function buildForcedClaimNotificationEmbed(options) {
  const { channelName, channelId, guildId, serverName, claimedById, claimerPermissions, serverIconUrl } = options;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  // Build permissions string
  const permissionsList = [];
  if (claimerPermissions.administrator) permissionsList.push('Administrator');
  if (claimerPermissions.banMembers) permissionsList.push('Ban Members');
  if (claimerPermissions.kickMembers) permissionsList.push('Kick Members');
  if (claimerPermissions.moderateMembers) permissionsList.push('Moderate Members');
  
  const permissionsText = permissionsList.length > 0 
    ? permissionsList.join(', ') 
    : 'Standard permissions';
  
  let description = `Your voice channel ownership has been claimed by a moderator.\n\n`;
  description += `🔊 **Channel:** ${channelName}\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Claimed By:** <@${claimedById}>\n`;
  description += `🛡️ **Their Permissions:** ${permissionsText}\n\n`;
  description += `⏰ **When:** ${formattedDate}`;
  
  const embed = new EmbedBuilder()
    .setTitle('👑 Voice Channel Ownership Claimed')
    .setDescription(description)
    .setColor(0xFEE75C) // Yellow/Warning
    .setFooter({ text: 'A moderator has taken ownership of your voice channel.' });
  
  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }
  
  return { embed };
}

/**
 * Builds the ownership transfer notification DM embed
 * Sent to the new owner when ownership is voluntarily transferred to them
 * Shows: Channel info, who transferred ownership
 * @param {Object} options - Transfer details
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildOwnershipTransferNotificationEmbed(options) {
  const { channelName, channelId, guildId, serverName, previousOwnerId, serverIconUrl } = options;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  let description = `You have been given ownership of a voice channel.\n\n`;
  description += `🔊 **Channel:** ${channelName}\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Transferred By:** <@${previousOwnerId}>\n\n`;
  description += `⏰ **When:** ${formattedDate}`;
  
  const embed = new EmbedBuilder()
    .setTitle('👑 Voice Channel Ownership Transferred')
    .setDescription(description)
    .setColor(0x57F287) // Green
    .setFooter({ text: 'You are now the owner of this voice channel.' });
  
  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }
  
  // Go to Channel button
  const joinButton = new ButtonBuilder()
    .setLabel('Go to Voice Channel')
    .setStyle(ButtonStyle.Link)
    .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
    .setEmoji('🔊');
  
  const row = new ActionRowBuilder().addComponents(joinButton);
  
  return { embed, components: [row] };
}

/**
 * Builds the view-only notification DM embed for text channel restrictions
 * Shows: Channel, Server, Restricted By, When
 * @param {Object} options - View-only details
 * @returns {EmbedBuilder}
 */
function buildViewOnlyNotificationEmbed(options) {
  const { channelId, serverName, restrictedById, serverIconUrl } = options;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  let description = `You have been set to view-only mode in a temporary text channel.\n\n`;
  description += `💬 **Channel:** <#${channelId}>\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Restricted By:** <@${restrictedById}>\n\n`;
  description += `⏰ **When:** ${formattedDate}`;
  
  const embed = new EmbedBuilder()
    .setTitle('👀 View-Only Mode Applied')
    .setDescription(description)
    .setColor(0xFEE75C) // Yellow
    .setFooter({ text: 'You can view messages but cannot send messages in this channel.' });
  
  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }
  
  return embed;
}

/**
 * Builds the access restored notification DM embed for text channel
 * Shows: Channel, Server, Restored By, When, and Go to Channel button
 * @param {Object} options - Access restored details
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildAccessRestoredNotificationEmbed(options) {
  const { channelId, guildId, serverName, restoredById, serverIconUrl } = options;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  let description = `Your full access has been restored in a temporary text channel.\n\n`;
  description += `💬 **Channel:** <#${channelId}>\n`;
  description += `🏠 **Server:** ${serverName}\n`;
  description += `👤 **Restored By:** <@${restoredById}>\n\n`;
  description += `⏰ **When:** ${formattedDate}`;
  
  const embed = new EmbedBuilder()
    .setTitle('✅ Access Restored')
    .setDescription(description)
    .setColor(0x57F287) // Green
    .setFooter({ text: 'You can now view and send messages in this channel again.' });
  
  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }
  
  // Go to Channel button
  const joinButton = new ButtonBuilder()
    .setLabel('Go to Channel')
    .setStyle(ButtonStyle.Link)
    .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
    .setEmoji('💬');
  
  const row = new ActionRowBuilder().addComponents(joinButton);
  
  return { embed, components: [row] };
}

/**
 * Builds the invitation DM embed for voice channel invitations
 * Shows: Voice Channel, Server, Created, VC Duration (live), Current Members, Invited by
 * 
 * VC Duration uses Discord's live timestamp that updates automatically.
 * When the channel is deleted, the invitation message should be edited to show
 * static duration text instead.
 * 
 * @param {Object} options - Invitation details
 * @param {string} options.finalDuration - If provided, shows static duration (for deleted channels)
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildInvitationEmbed(options) {
  const { 
    channelName, 
    channelId,
    serverName, 
    invitedBy, 
    createdAt, 
    currentMembers, // Array of user IDs now
    serverIconUrl,
    note, // Optional note from inviter
    finalDuration // Optional: static duration text when channel is deleted
  } = options;
  
  // Use Discord timestamp for live "Created" time (relative format)
  const createdTimestamp = Math.floor(new Date(createdAt).getTime() / 1000);
  const createdText = `<t:${createdTimestamp}:R>`; // Relative time (e.g., "2 minutes ago")
  
  // VC Duration - use live timestamp while channel is active
  // When channel is deleted, finalDuration will be passed as static text
  let durationText;
  if (finalDuration) {
    // Channel was deleted - show static duration
    durationText = finalDuration;
  } else {
    // Channel is active - show live timestamp that counts up from creation
    // Using :R format shows "X minutes ago" but we want elapsed time
    // We'll use a custom approach: show the created timestamp with :R
    // This will show "1 minute ago", "2 hours ago" etc. which represents duration
    durationText = `<t:${createdTimestamp}:R>`;
  }
  
  // Build description with optional note using ## and ### format
  let description = `<@${invitedBy.id}> has invited you to join their voice channel!`;
  if (note && note.trim()) {
    description += `\n\n## 📝 Note:\n### ${note}`;
  }
  
  // Format current members as mentions (expects array of user IDs)
  const membersText = currentMembers && currentMembers.length > 0 
    ? currentMembers.map(id => `<@${id}>`).join('\n') 
    : 'None';
  
  const embed = new EmbedBuilder()
    .setTitle('📬 Voice Channel Invitation')
    .setDescription(description)
    .setColor(0x5865F2) // Blurple
    .addFields(
      { name: '🎵 Voice Channel', value: channelName, inline: true },
      { name: '🏠 Server', value: serverName, inline: true },
      { name: '🕐 Created', value: createdText, inline: true },
      { name: '⏱️ VC Duration', value: durationText, inline: true },
      { name: '👤 Current Members', value: membersText, inline: false }
    )
    .setFooter({ text: `🎅 Invited by ${invitedBy.username}` });
  
  if (serverIconUrl) {
    embed.setThumbnail(serverIconUrl);
  }
  
  // Join Voice Channel link button
  const joinButton = new ButtonBuilder()
    .setLabel('Join Voice Channel')
    .setStyle(ButtonStyle.Link)
    .setURL(`https://discord.com/channels/${options.guildId}/${channelId}`)
    .setEmoji('🔊');
  
  const row = new ActionRowBuilder().addComponents(joinButton);
  
  return { embed, components: [row] };
}

/**
 * Calculates static duration text from a start time to an end time
 * Used when channel is deleted to convert live timestamp to static text
 * @param {Date|string|number} startTime - The channel creation time
 * @param {Date|string|number} endTime - The channel deletion time (defaults to now)
 * @returns {string} Duration text like "1h 30m" or "2d 5h"
 */
function calculateDurationText(startTime, endTime = new Date()) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = Math.abs(end - start);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return `${diffDays}d ${remainingHours}h`;
  } else if (diffHours > 0) {
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m`;
  } else {
    return `${diffMins}m`;
  }
}

// ============================================
// Custom ID Encoding/Decoding Utilities
// Requirements: 8.1, 8.2
// ============================================

/**
 * Encodes channel ID and owner ID into a custom ID string
 * @param {string} prefix - The custom ID prefix (e.g., 'voice_settings')
 * @param {string} channelId - The channel ID
 * @param {string} ownerId - The owner ID
 * @returns {string} The encoded custom ID
 */
function encodeCustomId(prefix, channelId, ownerId) {
  return `${prefix}:${channelId}:${ownerId}`;
}

/**
 * Parses a custom ID string back to its component values
 * @param {string} customId - The custom ID string to parse
 * @returns {{ prefix: string, channelId: string, ownerId: string } | null}
 */
function parseCustomId(customId) {
  if (!customId || typeof customId !== 'string') {
    return null;
  }
  
  const parts = customId.split(':');
  if (parts.length < 3) {
    return null;
  }
  
  return {
    prefix: parts[0],
    channelId: parts[1],
    ownerId: parts[2]
  };
}

/**
 * Verifies if a user ID matches the owner ID
 * Pure function for ownership verification
 * Requirements: 6.1, 6.2
 * @param {string} userId - The user attempting the action
 * @param {string} ownerId - The channel owner ID
 * @returns {boolean} True if the user is the owner
 */
function isOwner(userId, ownerId) {
  return userId === ownerId;
}

// ============================================
// Control Panel Serialization
// Requirements: 8.3, 8.4
// ============================================

/**
 * Serializes control panel configuration to JSON
 * @param {Object} config - The control panel configuration
 * @returns {string} JSON string representation
 */
function serializeControlPanel(config) {
  return JSON.stringify(config);
}

/**
 * Deserializes JSON string to control panel configuration
 * @param {string} json - The JSON string to deserialize
 * @returns {Object | null} The deserialized configuration or null if invalid
 */
function deserializeControlPanel(json) {
  try {
    const config = JSON.parse(json);
    // Validate required fields
    if (!config || typeof config !== 'object') {
      return null;
    }
    return config;
  } catch (error) {
    return null;
  }
}

/**
 * Builds a voice control panel with a rate limit warning at the top
 * Uses Discord's live timestamp format for automatic countdown
 * @param {string} guildId - The guild ID
 * @param {string} channelId - The voice channel ID
 * @param {string} ownerId - The channel owner's user ID
 * @param {number} rateLimitUntil - Unix timestamp (seconds) when rate limit expires
 * @param {Object} options - Optional configuration
 * @returns {{ components: any[], flags: number[] }}
 */
function buildVoiceControlPanelWithRateLimit(guildId, channelId, ownerId, rateLimitUntil, options = {}) {
  const { thumbnailUrl, stickyEnabled = false, latestMessageUrl, waitingRoomEnabled = false } = options;
  
  // Build Components V2 container
  const container = new ContainerBuilder()
    .setAccentColor([88, 101, 242]); // Discord blurple RGB
  
  // Add Waiting Room status indicator at the top if enabled
  if (waitingRoomEnabled) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('🚪 **Waiting Room Enabled**')
    );
    
    // Add separator after waiting room indicator
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  }
  
  // Rate limit warning at the top with Discord's live timestamp
  const rateLimitText = new TextDisplayBuilder().setContent([
    `## ⏳ Rename Cooldown Active`,
    ``,
    `You can rename again <t:${rateLimitUntil}:R>`,
    `Discord limits channel renames to 2 per 10 minutes.`
  ].join('\n'));
  
  container.addTextDisplayComponents(rateLimitText);
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Main section with text and thumbnail
  const mainText = new TextDisplayBuilder().setContent([
    `## ⚙️ Welcome to your own temporary voice channel`,
    ``,
    `• Use the \`/voice-settings\` command to configure and manage your saved voice channel settings`,
    `• Use the \`/voice-request\` command to submit a request to join a voice channel if it is full or if your previous request was denied`
  ].join('\n'));
  
  // Add section with thumbnail if provided
  if (thumbnailUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(mainText)
        .setThumbnailAccessory(thumb => thumb.setURL(thumbnailUrl))
    );
  } else {
    container.addTextDisplayComponents(mainText);
  }
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Channel Settings section
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('### Channel Settings')
  );
  
  const settingsSelect = buildCompactSettingsSelect(channelId, ownerId, { waitingRoomEnabled });
  const settingsRow = new ActionRowBuilder().addComponents(settingsSelect);
  container.addActionRowComponents(settingsRow);
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Channel Permissions section
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('### Channel Permissions')
  );
  
  const permissionsSelect = buildCompactPermissionsSelect(channelId, ownerId);
  const permissionsRow = new ActionRowBuilder().addComponents(permissionsSelect);
  container.addActionRowComponents(permissionsRow);
  
  // Add separator before buttons
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Sticky Note button
  const stickyNoteButton = new ButtonBuilder()
    .setCustomId(`sticky_note:${channelId}:${ownerId}`)
    .setLabel(stickyEnabled ? 'Disable Sticky Note' : 'Enable Sticky Note')
    .setStyle(stickyEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
    .setEmoji('📌');
  
  // Go to Latest button
  const goToLatestUrl = latestMessageUrl || `https://discord.com/channels/${guildId}/${channelId}`;
  const goToLatestButton = new ButtonBuilder()
    .setLabel('Go to Latest')
    .setStyle(ButtonStyle.Link)
    .setURL(goToLatestUrl)
    .setEmoji('📩');
  
  const buttonsRow = new ActionRowBuilder().addComponents(stickyNoteButton, goToLatestButton);
  container.addActionRowComponents(buttonsRow);
  
  return {
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  };
}

/**
 * Builds a text control panel with a rate limit warning at the top
 * Uses Discord's live timestamp format for automatic countdown
 * @param {string} guildId - The guild ID
 * @param {string} textChannelId - The text channel ID
 * @param {string} voiceChannelId - The linked voice channel ID
 * @param {string} ownerId - The channel owner's user ID
 * @param {number} rateLimitUntil - Unix timestamp (seconds) when rate limit expires
 * @param {Object} options - Optional configuration
 * @returns {{ components: any[], flags: number[] }}
 */
function buildTextControlPanelWithRateLimit(guildId, textChannelId, voiceChannelId, ownerId, rateLimitUntil, options = {}) {
  const { stickyEnabled = false, latestMessageUrl } = options;
  
  // Build Components V2 container
  const container = new ContainerBuilder()
    .setAccentColor([237, 66, 69]); // Red accent color
  
  // Rate limit warning at the top with Discord's live timestamp
  const rateLimitText = new TextDisplayBuilder().setContent([
    `## ⏳ Rename Cooldown Active`,
    ``,
    `You can rename again <t:${rateLimitUntil}:R>`,
    `Discord limits channel renames to 2 per 10 minutes.`
  ].join('\n'));
  
  container.addTextDisplayComponents(rateLimitText);
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Title and description
  const headerText = new TextDisplayBuilder().setContent([
    `## 🔧 Text Channel Control Panel`,
    ``,
    `Manage your temporary text channel using the controls below.`,
    `Only the channel owner can use these controls.`
  ].join('\n'));
  
  container.addTextDisplayComponents(headerText);
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Feature descriptions
  const featuresText = new TextDisplayBuilder().setContent([
    `📝 **Edit Channel Name**  🗑️ **Delete Channel**  📌 **Sticky Note**`,
    `Change the channel name  Delete this text channel  Send sticky after 8 messages`,
    ``,
    `⚠️ **Take Actions**  ✅ **Remove Actions**`,
    `View-Only, Ban users  Give Access, Unban users`
  ].join('\n'));
  
  container.addTextDisplayComponents(featuresText);
  
  // Add separator
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Footer text
  const footerText = new TextDisplayBuilder().setContent(
    `These controls only affect this text channel | Auto-returns after 2 minutes if not responding`
  );
  container.addTextDisplayComponents(footerText);
  
  // Add separator before buttons
  container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
  
  // Buttons row
  const editNameButton = new ButtonBuilder()
    .setCustomId(`text_edit_name:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setLabel('Edit Channel Name')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📝');
  
  const deleteChannelButton = new ButtonBuilder()
    .setCustomId(`text_delete:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setLabel('Delete Channel')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');
  
  const stickyNoteButton = new ButtonBuilder()
    .setCustomId(`text_sticky:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setLabel(stickyEnabled ? 'Disable Sticky Note' : 'Enable Sticky Note')
    .setStyle(stickyEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
    .setEmoji('📌');
  
  const buttonsRow = new ActionRowBuilder().addComponents(editNameButton, deleteChannelButton, stickyNoteButton);
  container.addActionRowComponents(buttonsRow);
  
  // Take Actions dropdown
  const takeActionsSelect = new StringSelectMenuBuilder()
    .setCustomId(`text_take_actions:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setPlaceholder('Take Actions')
    .addOptions([
      { label: 'View-Only Users/Roles', description: 'Set users/roles to view-only (can see but not send)', value: 'viewonly', emoji: '👀' },
      { label: 'Ban Users/Roles', description: 'Ban users or roles from this text channel', value: 'ban', emoji: '🚫' }
    ]);
  
  const takeActionsRow = new ActionRowBuilder().addComponents(takeActionsSelect);
  container.addActionRowComponents(takeActionsRow);
  
  // Remove Actions dropdown
  const removeActionsSelect = new StringSelectMenuBuilder()
    .setCustomId(`text_remove_actions:${textChannelId}:${voiceChannelId}:${ownerId}`)
    .setPlaceholder('Remove Actions')
    .addOptions([
      { label: 'Give Access Users/Roles', description: 'Restore access for view-only users/roles', value: 'giveaccess', emoji: '✅' },
      { label: 'Unban Users/Roles', description: 'Unban users or roles from this channel', value: 'unban', emoji: '🔓' }
    ]);
  
  const removeActionsRow = new ActionRowBuilder().addComponents(removeActionsSelect);
  container.addActionRowComponents(removeActionsRow);
  
  // Go to Latest button
  const goToLatestUrl = latestMessageUrl || `https://discord.com/channels/${guildId}/${textChannelId}`;
  const goToLatestButton = new ButtonBuilder()
    .setLabel('Go to Latest')
    .setStyle(ButtonStyle.Link)
    .setURL(goToLatestUrl)
    .setEmoji('📩');
  
  const goToLatestRow = new ActionRowBuilder().addComponents(goToLatestButton);
  container.addActionRowComponents(goToLatestRow);
  
  return {
    components: [container],
    flags: [MessageFlags.IsComponentsV2]
  };
}

// ============================================
// Voice Request Message Builders
// Requirements: 1.3, 2.3, 2.4, 3.3, 3.5, 4.1, 4.3
// ============================================

/**
 * Builds the voice request message embed and components
 * Shows requester, restriction type, optional note, and approve/deny buttons
 * Tags the channel owner
 * @param {Object} requestData - The voice request data
 * @param {string} ownerId - The channel owner ID to tag
 * @returns {{ content: string, embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildVoiceRequestMessage(requestData, ownerId) {
  const { id, requesterId, restrictionType, note } = requestData;

  // Color based on restriction type
  const colors = {
    banned: 0xed4245, // Red for banned
    rejected: 0xfee75c, // Yellow for rejected
    limit: 0x5865f2, // Blue for limit reached
  };

  const restrictionLabels = {
    banned: '🚫 Banned',
    rejected: '❌ Rejected',
    limit: '👥 Channel Full',
  };

  let description = `**Requester:** <@${requesterId}>\n`;
  description += `**Restriction:** ${restrictionLabels[restrictionType] || restrictionType}`;

  // Add note with ## heading style if provided
  if (note) {
    description += `\n\n## Note\n### ${note}`;
  }

  const embed = new EmbedBuilder()
    .setTitle('📩 Voice Channel Join Request')
    .setDescription(description)
    .setColor(colors[restrictionType] || 0x5865f2)
    .setFooter({ text: 'Only the channel owner can respond to this request' })
    .setTimestamp();

  const approveButton = new ButtonBuilder()
    .setCustomId(`voice_request_approve:${id}`)
    .setLabel('Approve')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  const denyButton = new ButtonBuilder()
    .setCustomId(`voice_request_deny:${id}`)
    .setLabel('Deny')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('❌');

  const row = new ActionRowBuilder().addComponents(approveButton, denyButton);

  // Content to tag the channel owner
  const content = ownerId ? `<@${ownerId}>` : '';

  return {
    content,
    embed,
    components: [row],
  };
}

/**
 * Builds the approval DM message for when a request is approved
 * Includes VC join link button and info about /voice-request command
 * @param {string} channelId - The voice channel ID
 * @param {string} guildId - The guild ID
 * @param {string} channelName - The voice channel name
 * @param {string} serverName - The server name
 * @param {boolean} limitIncreased - Whether the channel limit was increased
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildApprovalDM(channelId, guildId, channelName, serverName, limitIncreased = false) {
  let description = `Your request to join 🔊 **${channelName}** in **${serverName}** has been approved!\n\n`;
  
  if (limitIncreased) {
    description += `✨ **The channel limit has been increased for you.**\n\n`;
  }
  
  description += `You can now join the voice channel.\n\n`;
  description += `💡 **Tip:** If you get banned, rejected, or the channel becomes full in the future, you can use \`/voice-request\` to request access again.`;
  
  const embed = new EmbedBuilder()
    .setTitle('✅ Voice Request Approved!')
    .setDescription(description)
    .setColor(0x57f287)
    .setTimestamp();

  const channelUrl = `https://discord.com/channels/${guildId}/${channelId}`;
  const joinButton = new ButtonBuilder()
    .setLabel('Join Voice Channel')
    .setStyle(ButtonStyle.Link)
    .setURL(channelUrl)
    .setEmoji('🔊');

  const row = new ActionRowBuilder().addComponents(joinButton);

  return { embed, components: [row] };
}

/**
 * Builds the limit-reached DM with Join Immediately button
 * Sent when request is approved but channel is at capacity
 * @param {string} channelId - The voice channel ID
 * @param {string} userId - The requester's user ID
 * @param {string} channelName - The voice channel name
 * @param {string} serverName - The server name
 * @param {string} guildId - The guild ID
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildLimitReachedDM(channelId, userId, channelName, serverName, guildId) {
  const embed = new EmbedBuilder()
    .setTitle('✅ Voice Request Approved!')
    .setDescription(
      `Your request to join 🔊 **${channelName}** in **${serverName}** has been approved!\n\n` +
        `⚠️ **The channel is currently full.**\n\n` +
        `Click the button below to increase the limit and join immediately.\n\n` +
        `💡 **Tip:** If you get banned, rejected, or the channel becomes full in the future, you can use \`/voice-request\` to request access again.`
    )
    .setColor(0xfee75c)
    .setTimestamp();

  const joinNowButton = new ButtonBuilder()
    .setCustomId(`voice_request_join:${channelId}:${userId}:${guildId}`)
    .setLabel('Join Immediately')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🎙️');

  const row = new ActionRowBuilder().addComponents(joinNowButton);

  return {
    embed,
    components: [row],
  };
}

/**
 * Builds the DM with channel link after limit increase
 * @param {string} channelId - The voice channel ID
 * @param {string} guildId - The guild ID
 * @param {string} channelName - The voice channel name
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildJoinLinkDM(channelId, guildId, channelName) {
  const embed = new EmbedBuilder()
    .setTitle('🎙️ Ready to Join!')
    .setDescription(
      `The channel limit has been increased for you.\n\n` +
        `Click the button below to join **${channelName}**.\n\n` +
        `💡 **Tip:** If you get banned, rejected, or the channel becomes full in the future, you can use \`/voice-request\` to request access again.`
    )
    .setColor(0x57f287)
    .setTimestamp();

  const channelUrl = `https://discord.com/channels/${guildId}/${channelId}`;
  const joinButton = new ButtonBuilder()
    .setLabel('Join Voice Channel')
    .setStyle(ButtonStyle.Link)
    .setURL(channelUrl)
    .setEmoji('🔊');

  const row = new ActionRowBuilder().addComponents(joinButton);

  return {
    embed,
    components: [row],
  };
}

/**
 * Builds the denied request message update
 * Shows denial status with disabled buttons
 * @param {Object} requestData - The voice request data
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildDeniedRequestMessage(requestData) {
  const { id, requesterId, restrictionType, note, resolvedBy } = requestData;

  const restrictionLabels = {
    banned: '🚫 Banned',
    rejected: '❌ Rejected',
    limit: '👥 Channel Full',
  };

  let description = `**Requester:** <@${requesterId}>\n`;
  description += `**Restriction:** ${restrictionLabels[restrictionType] || restrictionType}\n`;
  description += `\n**Status:** ❌ Denied`;
  if (resolvedBy) {
    description += ` by <@${resolvedBy}>`;
  }

  // Add note with ## heading style if provided
  if (note) {
    description += `\n\n## Note\n### ${note}`;
  }

  const embed = new EmbedBuilder()
    .setTitle('📩 Voice Channel Join Request')
    .setDescription(description)
    .setColor(0xed4245) // Red for denied
    .setTimestamp();

  const approveButton = new ButtonBuilder()
    .setCustomId(`voice_request_approve:${id}`)
    .setLabel('Approve')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('✅')
    .setDisabled(true);

  const denyButton = new ButtonBuilder()
    .setCustomId(`voice_request_deny:${id}`)
    .setLabel('Denied')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('❌')
    .setDisabled(true);

  const row = new ActionRowBuilder().addComponents(approveButton, denyButton);

  return {
    embed,
    components: [row],
  };
}

/**
 * Builds the approved request message update
 * Shows approval status with disabled buttons
 * @param {Object} requestData - The voice request data
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildApprovedRequestMessage(requestData) {
  const { id, requesterId, restrictionType, note, resolvedBy } = requestData;

  const restrictionLabels = {
    banned: '🚫 Banned',
    rejected: '❌ Rejected',
    limit: '👥 Channel Full',
  };

  let description = `**Requester:** <@${requesterId}>\n`;
  description += `**Restriction:** ${restrictionLabels[restrictionType] || restrictionType}\n`;
  description += `\n**Status:** ✅ Approved`;
  if (resolvedBy) {
    description += ` by <@${resolvedBy}>`;
  }

  // Add note with ## heading style if provided
  if (note) {
    description += `\n\n## Note\n### ${note}`;
  }

  const embed = new EmbedBuilder()
    .setTitle('📩 Voice Channel Join Request')
    .setDescription(description)
    .setColor(0x57f287) // Green for approved
    .setTimestamp();

  const approveButton = new ButtonBuilder()
    .setCustomId(`voice_request_approve:${id}`)
    .setLabel('Approved')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅')
    .setDisabled(true);

  const denyButton = new ButtonBuilder()
    .setCustomId(`voice_request_deny:${id}`)
    .setLabel('Deny')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌')
    .setDisabled(true);

  const row = new ActionRowBuilder().addComponents(approveButton, denyButton);

  return {
    embed,
    components: [row],
  };
}

/**
 * Builds the appeal channel selection message
 * Shows a dropdown of voice channels the user can appeal to
 * @param {Array} channels - Array of { id, name } for restricted channels
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildAppealChannelSelect(channels) {
  const embed = new EmbedBuilder()
    .setTitle('📩 Appeal to Join Voice Channel')
    .setDescription(
      'Select the voice channel you want to request access to.\n\n' +
        'After selecting, you can choose to add a note or send without one.'
    )
    .setColor(0x5865f2)
    .setTimestamp();

  const options = channels.slice(0, 25).map((ch) => ({
    label: ch.name.substring(0, 100),
    value: ch.id,
    emoji: '🔊',
  }));

  const channelSelect = new StringSelectMenuBuilder()
    .setCustomId('voice_appeal_channel_select')
    .setPlaceholder('Select a voice channel')
    .addOptions(options);

  const selectRow = new ActionRowBuilder().addComponents(channelSelect);

  const cancelButton = new ButtonBuilder()
    .setCustomId('voice_appeal_cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const buttonRow = new ActionRowBuilder().addComponents(cancelButton);

  return {
    embed,
    components: [selectRow, buttonRow],
  };
}

/**
 * Builds the appeal note options message
 * Shows buttons to add note, send without note, or cancel
 * @param {string} channelId - The selected channel ID
 * @param {string} channelName - The selected channel name
 * @returns {{ embed: EmbedBuilder, components: ActionRowBuilder[] }}
 */
function buildAppealNoteOptions(channelId, channelName) {
  const embed = new EmbedBuilder()
    .setTitle('📩 Appeal to Join Voice Channel')
    .setDescription(
      `You selected: 🔊 **${channelName}**\n\n` +
        'Would you like to add a note to your request?'
    )
    .setColor(0x5865f2)
    .setTimestamp();

  const addNoteButton = new ButtonBuilder()
    .setCustomId(`voice_appeal_add_note:${channelId}`)
    .setLabel('Add a Note')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📝');

  const withoutNoteButton = new ButtonBuilder()
    .setCustomId(`voice_appeal_without_note:${channelId}`)
    .setLabel('Without Note')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📨');

  const cancelButton = new ButtonBuilder()
    .setCustomId('voice_appeal_cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('❌');

  const row = new ActionRowBuilder().addComponents(addNoteButton, withoutNoteButton, cancelButton);

  return {
    embed,
    components: [row],
  };
}

module.exports = {
  buildVoiceControlPanel,
  buildCompactVoiceControlPanel,
  buildUniversalVoiceControlPanel,
  buildVoiceControlPanelWithRateLimit,
  buildTextControlPanel,
  buildCompactTextControlPanel,
  buildTextControlPanelWithRateLimit,
  buildConfirmDeletePanel,
  buildSuccessStatePanel,
  buildErrorStatePanel,
  buildBanNotificationEmbed,
  buildTextBanNotificationEmbed,
  buildRejectNotificationEmbed,
  buildPermitNotificationEmbed,
  buildUnbanNotificationEmbed,
  buildViewOnlyNotificationEmbed,
  buildAccessRestoredNotificationEmbed,
  buildForcedClaimNotificationEmbed,
  buildOwnershipTransferNotificationEmbed,
  buildInvitationEmbed,
  calculateDurationText,
  buildSettingsSelect,
  buildCompactSettingsSelect,
  buildPermissionsSelect,
  buildCompactPermissionsSelect,
  buildTextSettingsSelect,
  buildRegionSelect,
  buildUserSelect,
  buildClaimOwnershipPanel,
  buildWaitingRoomRequestEmbed,
  buildLfmAnnouncement,
  buildSetupInterface,
  buildSetupSuccessEmbed,
  buildErrorEmbed,
  buildSuccessEmbed,
  buildInfoEmbed,
  encodeCustomId,
  parseCustomId,
  isOwner,
  serializeControlPanel,
  deserializeControlPanel,
  // Voice Request builders
  buildVoiceRequestMessage,
  buildApprovalDM,
  buildLimitReachedDM,
  buildJoinLinkDM,
  buildDeniedRequestMessage,
  buildApprovedRequestMessage,
  buildAppealChannelSelect,
  buildAppealNoteOptions,
};
