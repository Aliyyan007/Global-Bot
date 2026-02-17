/**
 * Voice Settings Slash Command
 * Allows users to view and edit their saved voice channel preferences
 * These settings are loaded when users click "Load Settings" in their temp VC
 */

const {
  EmbedBuilder,
  Collection,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const voicePreferences = require('../modules/auto-voice/voice/voicePreferences');

module.exports = {
  name: 'voice-settings',
  description: 'View and edit your saved voice channel preferences',
  dm_permission: false,
  cooldowns: new Collection(),

  run: async (client, interaction, args) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const prefs = await voicePreferences.getPreferences(interaction.user.id, interaction.guildId);

    if (!prefs) {
      await interaction.editReply({
        content: '# Saved Voice Settings\n\n> You don\'t have any saved settings yet.\n\nYour settings are saved automatically when you customize your temporary voice channel.'
      });
      return;
    }

    const content = await buildSettingsContent(prefs, interaction.guild);
    const components = await buildSettingsComponents(prefs, interaction.user.id, interaction.guild);

    await interaction.editReply({ content, components });
  }
};

async function resolveUserName(guild, odUserId) {
  try {
    const member = await guild.members.fetch(odUserId).catch(() => null);
    if (member) return `<@${odUserId}>`;
    const user = await guild.client.users.fetch(odUserId).catch(() => null);
    if (user) return `<@${odUserId}>`;
    return `Unknown`;
  } catch {
    return `Unknown`;
  }
}

async function resolveRoleName(guild, roleId) {
  try {
    const role = await guild.roles.fetch(roleId).catch(() => null);
    return role ? `<@&${roleId}>` : `Unknown Role`;
  } catch {
    return `Unknown Role`;
  }
}

async function buildSettingsContent(prefs, guild) {
  let content = '# Saved Voice Settings\n';

  // Voice Channel Settings
  const vcSettings = [];
  if (prefs.channelName) vcSettings.push(`Name: ${prefs.channelName}`);
  if (prefs.userLimit !== undefined && prefs.userLimit !== 0) vcSettings.push(`Limit: ${prefs.userLimit}`);
  if (prefs.bitrate) vcSettings.push(`Bitrate: ${prefs.bitrate / 1000} kbps`);
  if (prefs.channelStatus) vcSettings.push(`Status: ${prefs.channelStatus}`);
  if (prefs.region) vcSettings.push(`Region: ${prefs.region}`);
  if (prefs.locked) vcSettings.push(`Locked: Yes`);
  if (prefs.ghosted) vcSettings.push(`Ghosted: Yes`);

  if (vcSettings.length > 0) {
    content += `\n### 🎙️ Voice Channel\n> ${vcSettings.join('\n> ')}\n`;
  }

  // Rejected Users/Roles (Voice) - Filter out bots
  const vcRestrictions = [];
  if (prefs.rejectedUsers && prefs.rejectedUsers.length > 0) {
    // Filter out bots
    const nonBotUsers = [];
    for (const userId of prefs.rejectedUsers) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member && !member.user.bot) {
        nonBotUsers.push(userId);
      }
    }
    
    if (nonBotUsers.length > 0) {
      const names = await Promise.all(nonBotUsers.map(id => resolveUserName(guild, id)));
      vcRestrictions.push(...names.map(n => `❌ ${n}`));
    }
  }
  if (prefs.rejectedRoles && prefs.rejectedRoles.length > 0) {
    const names = await Promise.all(prefs.rejectedRoles.map(id => resolveRoleName(guild, id)));
    vcRestrictions.push(...names.map(n => `❌ ${n}`));
  }

  if (vcRestrictions.length > 0) {
    content += `\n### 🚫 Voice Restrictions\n> ${vcRestrictions.join('\n> ')}\n`;
  }

  // Text Channel Restrictions - REMOVED (not displayed)

  return content;
}

async function buildSettingsComponents(prefs, odUserId, guild) {
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

  const editSelect = new StringSelectMenuBuilder()
    .setCustomId(`voice_prefs_edit:${odUserId}`)
    .setPlaceholder('⚙️ Reset a Setting')
    .addOptions(editOptions);

  components.push(new ActionRowBuilder().addComponents(editSelect));

  // Permit dropdown - only voice restrictions (no text restrictions)
  const hasRestricted =
    (prefs.rejectedUsers?.length > 0) ||
    (prefs.rejectedRoles?.length > 0);

  if (hasRestricted) {
    const permitOptions = [];

    if (prefs.rejectedUsers && prefs.rejectedUsers.length > 0) {
      // Filter out bots
      for (const odUserId2 of prefs.rejectedUsers.slice(0, 25)) {
        const member = await guild.members.fetch(odUserId2).catch(() => null);
        if (member && !member.user.bot) {
          const name = await resolveUserName(guild, odUserId2);
          permitOptions.push({
            label: name.substring(0, 25),
            description: 'Voice: Rejected',
            value: `vc_reject_user:${odUserId2}`,
            emoji: '❌'
          });
        }
      }
    }

    if (prefs.rejectedRoles && prefs.rejectedRoles.length > 0) {
      for (const roleId of prefs.rejectedRoles.slice(0, 25)) {
        const name = await resolveRoleName(guild, roleId);
        permitOptions.push({
          label: name.substring(0, 25),
          description: 'Voice: Rejected Role',
          value: `vc_reject_role:${roleId}`,
          emoji: '❌'
        });
      }
    }

    // Text restrictions removed - no longer shown

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
