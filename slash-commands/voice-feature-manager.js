/**
 * Voice Feature Manager Slash Command
 * Manages voice feature permissions, cooldowns, and restrictions
 * 
 * Features:
 * - Feature Selection Menu: Lists all available voice features
 * - Action Menu: Allowed Users/Roles, Permission Requirements, Cooldown, Restricted Users/Roles, Restore Default
 * - Live preview embed showing all features and their configuration status
 * 
 * Uses persistent interaction handling (no timeout/collector)
 */

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Collection
} = require('discord.js');

const dataStore = require('../modules/auto-voice/voice/dataStore');
const { ALL_FEATURES } = require('../modules/auto-voice/voice/constants');
const { FEATURE_INFO } = require('../modules/auto-voice/voice/featureCategories');

// Features that are disabled by default
const DISABLED_BY_DEFAULT = ['autotext'];

// Command prefix for customIds
const CMD_PREFIX = 'cmd{voice-feature-manager}';

// Cooldown presets (matching sticky-cmd-manager pattern)
const COOLDOWN_PRESETS = [
  { label: '10 Minutes', value: '600000' },
  { label: '20 Minutes', value: '1200000' },
  { label: '30 Minutes', value: '1800000' },
  { label: '1 Hour', value: '3600000' },
  { label: '6 Hours', value: '21600000' },
  { label: '24 Hours', value: '86400000' },
  { label: 'Custom', value: 'custom' },
  { label: 'Remove Cooldown', value: 'remove' }
];

// Action menu options
const ACTION_OPTIONS = [
  { label: 'Allowed Users & Roles', value: 'allowed', description: 'Set who can use this feature' },
  { label: 'Permission Requirements', value: 'permission', description: 'Require permission presets' },
  { label: 'Usage Cooldown', value: 'cooldown', description: 'Set usage cooldown' },
  { label: 'Restricted Users & Roles', value: 'restricted', description: 'Block specific users/roles' },
  { label: 'Restore Default Settings', value: 'restore', description: 'Reset to default configuration' }
];

// Regex patterns for parsing custom IDs
const FeatureRegexp = /feat{(.*?)}/;
const RolesRegexp = /roles{(.*?)}/;
const MsgRegexp = /msg{(.*?)}/;

/**
 * Formats cooldown milliseconds to human-readable string
 */
function formatCooldown(ms) {
  if (ms >= 86400000) {
    const days = Math.floor(ms / 86400000);
    return days + 'd';
  } else if (ms >= 3600000) {
    const hours = Math.floor(ms / 3600000);
    return hours + 'h';
  } else {
    const minutes = Math.floor(ms / 60000);
    return minutes + 'min';
  }
}

/**
 * Parses cooldown string to milliseconds
 * Supports formats: 10min, 1h, 1d
 */
function parseCooldown(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(min|h|d)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'min': return value * 60000;
    case 'h': return value * 3600000;
    case 'd': return value * 86400000;
    default: return null;
  }
}

/**
 * Gets the feature display name
 */
function getFeatureName(feature) {
  const info = FEATURE_INFO[feature];
  return info?.name || feature.charAt(0).toUpperCase() + feature.slice(1);
}

/**
 * Gets the feature emoji
 */
function getFeatureEmoji(feature) {
  const info = FEATURE_INFO[feature];
  return info?.emoji || '*';
}

/**
 * Checks if a feature is enabled (considering defaults)
 */
function isFeatureEnabled(toggles, feature) {
  if (DISABLED_BY_DEFAULT.includes(feature)) {
    return toggles[feature] === true;
  }
  return toggles[feature] !== false;
}


/**
 * Formats a count for compact display
 */
function formatCount(roles, users) {
  const parts = [];
  if (roles?.length > 0) parts.push(roles.length + 'R');
  if (users?.length > 0) parts.push(users.length + 'U');
  return parts.join('/') || null;
}

/**
 * Builds the main embed showing all features in a compact format
 */
function buildPreviewEmbed(guildId, selectedFeature, client, locale) {
  const toggles = dataStore.getFeatureToggles(guildId);
  const configs = dataStore.getAllVoiceFeatureConfigs(guildId);
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2);

  // Build compact list of features - title as header, features as normal text
  const lines = ['# ' + lang('Voice Feature Manager') + '\n'];
  
  ALL_FEATURES.forEach(feature => {
    const enabled = isFeatureEnabled(toggles, feature);
    const config = configs[feature] || {};
    const emoji = getFeatureEmoji(feature);
    const name = getFeatureName(feature);
    const isSelected = selectedFeature === feature;
    
    const statusText = enabled ? '`Enabled`' : '`Disabled`';
    
    // Check if feature has any config
    const hasConfig = config.allowedRoles?.length > 0 || config.allowedUsers?.length > 0 ||
                      config.permissionId || config.cooldown ||
                      config.restrictedRoles?.length > 0 || config.restrictedUsers?.length > 0;
    
    const configDot = hasConfig ? ' •' : '';
    const selector = isSelected ? ' **◀**' : '';
    
    lines.push(emoji + ' **' + name + '** ' + statusText + configDot + selector);
  });

  embed.setDescription(lines.join('\n'));
  
  // Show selected feature details if one is selected
  if (selectedFeature) {
    const config = configs[selectedFeature] || {};
    const detailLines = [];
    
    if (config.allowedRoles?.length > 0 || config.allowedUsers?.length > 0) {
      const parts = [];
      if (config.allowedRoles?.length > 0) parts.push(config.allowedRoles.map(r => '<@&' + r + '>').join(' '));
      if (config.allowedUsers?.length > 0) parts.push(config.allowedUsers.map(u => '<@' + u + '>').join(' '));
      detailLines.push('✅ **' + lang('Allowed') + ':** ' + parts.join(' '));
    }
    
    if (config.permissionId) {
      const permission = client.cache?.permissions?.find(p => p.permissionID === config.permissionId || p._id === config.permissionId);
      detailLines.push('🔐 **' + lang('Permission') + ':** ' + (permission?.name || config.permissionId));
    }
    
    if (config.cooldown) {
      detailLines.push('⏱️ **' + lang('Cooldown') + ':** ' + formatCooldown(config.cooldown));
    }
    
    if (config.restrictedRoles?.length > 0 || config.restrictedUsers?.length > 0) {
      const parts = [];
      if (config.restrictedRoles?.length > 0) parts.push(config.restrictedRoles.map(r => '<@&' + r + '>').join(' '));
      if (config.restrictedUsers?.length > 0) parts.push(config.restrictedUsers.map(u => '<@' + u + '>').join(' '));
      detailLines.push('🚫 **' + lang('Restricted') + ':** ' + parts.join(' '));
    }
    
    if (detailLines.length > 0) {
      embed.addFields({ 
        name: getFeatureEmoji(selectedFeature) + ' ' + getFeatureName(selectedFeature) + ' ' + lang('Config'),
        value: detailLines.join('\n').substring(0, 1024),
        inline: false 
      });
    }
  }

  embed.setFooter({ text: lang('Select a feature, then choose an action') });
  return embed;
}

/**
 * Builds the feature selection menu
 */
function buildFeatureSelectMenu(guildId, selectedFeature) {
  const toggles = dataStore.getFeatureToggles(guildId);
  const configs = dataStore.getAllVoiceFeatureConfigs(guildId);

  const options = ALL_FEATURES.map(feature => {
    const enabled = isFeatureEnabled(toggles, feature);
    const config = configs[feature];
    const name = getFeatureName(feature);
    const emoji = getFeatureEmoji(feature);
    
    let desc = enabled ? 'Enabled' : 'Disabled';
    if (config) {
      const parts = [];
      if (config.allowedRoles?.length > 0 || config.allowedUsers?.length > 0) parts.push('Allowed');
      if (config.permissionId) parts.push('Permission');
      if (config.cooldown) parts.push('CD: ' + formatCooldown(config.cooldown));
      if (config.restrictedRoles?.length > 0 || config.restrictedUsers?.length > 0) parts.push('Restricted');
      if (parts.length > 0) desc = parts.join(' | ');
    }

    return {
      label: name,
      description: desc.substring(0, 100),
      value: feature,
      emoji: emoji,
      default: feature === selectedFeature
    };
  });

  return new StringSelectMenuBuilder()
    .setCustomId(CMD_PREFIX + 'feature')
    .setPlaceholder('Select a feature to configure')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);
}

/**
 * Builds the action selection menu
 */
function buildActionSelectMenu(selectedFeature, client, locale) {
  const lang = (textId) => client?.language?.({ textId, locale }) || textId;

  const options = ACTION_OPTIONS.map(opt => ({
    label: lang(opt.label),
    description: lang(opt.description),
    value: opt.value
  }));

  return new StringSelectMenuBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + (selectedFeature || 'none') + '}action')
    .setPlaceholder('Select an action')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);
}

/**
 * Builds the main panel components
 */
function buildMainComponents(guildId, selectedFeature, client, locale) {
  const featureRow = new ActionRowBuilder().addComponents(
    buildFeatureSelectMenu(guildId, selectedFeature)
  );
  const actionRow = new ActionRowBuilder().addComponents(
    buildActionSelectMenu(selectedFeature, client, locale)
      .setDisabled(!selectedFeature)
  );
  return [featureRow, actionRow];
}


/**
 * Builds the cooldown selection embed and components
 */
function buildCooldownPanel(feature, mainMsgId, client, locale) {
  const lang = (textId) => client?.language?.({ textId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(lang('Set Cooldown') + ' - ' + getFeatureName(feature))
    .setDescription(lang('Select a cooldown duration or choose Custom to enter your own.'))
    .setColor(0x5865F2);

  const options = COOLDOWN_PRESETS.map(preset => ({
    label: lang(preset.label),
    value: preset.value
  }));

  const cooldownSelect = new StringSelectMenuBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}cooldown')
    .setPlaceholder('Select cooldown duration')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const backButton = new ButtonBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + feature + '}back')
    .setLabel(lang('Back'))
    .setStyle(ButtonStyle.Secondary);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(cooldownSelect),
      new ActionRowBuilder().addComponents(backButton)
    ]
  };
}

/**
 * Builds the allowed roles/users selection panel
 */
function buildAllowedPanel(feature, mainMsgId, guildId, client, locale, guild) {
  const lang = (textId) => client?.language?.({ textId, locale }) || textId;
  const featureName = getFeatureName(feature);
  const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};

  // Show current allowed users/roles
  const currentParts = [];
  if (config.allowedRoles?.length > 0) currentParts.push(config.allowedRoles.map(r => '<@&' + r + '>').join(' '));
  if (config.allowedUsers?.length > 0) currentParts.push(config.allowedUsers.map(u => '<@' + u + '>').join(' '));
  const currentStr = currentParts.length > 0 ? currentParts.join(' ') : lang('None');

  const embed = new EmbedBuilder()
    .setTitle(lang('Allowed Users & Roles') + ' - ' + featureName)
    .setDescription('**' + lang('Current') + ':** ' + currentStr)
    .setColor(0x57F287);

  const components = [];

  // Add select menu for adding
  const mentionableSelect = new MentionableSelectMenuBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}allowed_select')
    .setPlaceholder(lang('Select to add'))
    .setMinValues(1)
    .setMaxValues(10);
  components.push(new ActionRowBuilder().addComponents(mentionableSelect));

  // Add remove select menu if there are existing entries
  const existingEntries = [];
  if (config.allowedRoles?.length > 0) {
    config.allowedRoles.forEach(r => {
      const role = guild?.roles?.cache?.get(r);
      const roleName = role?.name || r;
      existingEntries.push({ label: roleName.substring(0, 95), value: 'role_' + r, emoji: '�' });
    });
  }
  if (config.allowedUsers?.length > 0) {
    config.allowedUsers.forEach(u => {
      const member = guild?.members?.cache?.get(u);
      const userName = member?.displayName || member?.user?.username || u;
      existingEntries.push({ label: userName.substring(0, 95), value: 'user_' + u, emoji: '👤' });
    });
  }

  if (existingEntries.length > 0) {
    const removeSelect = new StringSelectMenuBuilder()
      .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}allowed_remove')
      .setPlaceholder(lang('Select to remove'))
      .setMinValues(1)
      .setMaxValues(Math.min(existingEntries.length, 25))
      .addOptions(existingEntries.slice(0, 25));
    components.push(new ActionRowBuilder().addComponents(removeSelect));
  }

  // Buttons
  const backButton = new ButtonBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + feature + '}back')
    .setLabel(lang('Done'))
    .setStyle(ButtonStyle.Secondary);

  const buttonRow = [backButton];
  
  if (existingEntries.length > 0) {
    const clearButton = new ButtonBuilder()
      .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}allowed_clear')
      .setLabel(lang('Clear All'))
      .setStyle(ButtonStyle.Danger);
    buttonRow.unshift(clearButton);
  }

  components.push(new ActionRowBuilder().addComponents(buttonRow));

  return { embeds: [embed], components };
}

/**
 * Builds the restricted roles/users selection panel
 */
function buildRestrictedPanel(feature, mainMsgId, guildId, client, locale, guild) {
  const lang = (textId) => client?.language?.({ textId, locale }) || textId;
  const featureName = getFeatureName(feature);
  const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};

  // Show current restricted users/roles
  const currentParts = [];
  if (config.restrictedRoles?.length > 0) currentParts.push(config.restrictedRoles.map(r => '<@&' + r + '>').join(' '));
  if (config.restrictedUsers?.length > 0) currentParts.push(config.restrictedUsers.map(u => '<@' + u + '>').join(' '));
  const currentStr = currentParts.length > 0 ? currentParts.join(' ') : lang('None');

  const embed = new EmbedBuilder()
    .setTitle(lang('Restricted Users & Roles') + ' - ' + featureName)
    .setDescription('**' + lang('Current') + ':** ' + currentStr)
    .setColor(0xED4245);

  const components = [];

  // Add select menu for adding
  const mentionableSelect = new MentionableSelectMenuBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}restricted_select')
    .setPlaceholder(lang('Select to add'))
    .setMinValues(1)
    .setMaxValues(10);
  components.push(new ActionRowBuilder().addComponents(mentionableSelect));

  // Add remove select menu if there are existing entries
  const existingEntries = [];
  if (config.restrictedRoles?.length > 0) {
    config.restrictedRoles.forEach(r => {
      const role = guild?.roles?.cache?.get(r);
      const roleName = role?.name || r;
      existingEntries.push({ label: roleName.substring(0, 95), value: 'role_' + r, emoji: '👥' });
    });
  }
  if (config.restrictedUsers?.length > 0) {
    config.restrictedUsers.forEach(u => {
      const member = guild?.members?.cache?.get(u);
      const userName = member?.displayName || member?.user?.username || u;
      existingEntries.push({ label: userName.substring(0, 95), value: 'user_' + u, emoji: '👤' });
    });
  }

  if (existingEntries.length > 0) {
    const removeSelect = new StringSelectMenuBuilder()
      .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}restricted_remove')
      .setPlaceholder(lang('Select to remove'))
      .setMinValues(1)
      .setMaxValues(Math.min(existingEntries.length, 25))
      .addOptions(existingEntries.slice(0, 25));
    components.push(new ActionRowBuilder().addComponents(removeSelect));
  }

  // Buttons
  const backButton = new ButtonBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + feature + '}back')
    .setLabel(lang('Done'))
    .setStyle(ButtonStyle.Secondary);

  const buttonRow = [backButton];
  
  if (existingEntries.length > 0) {
    const clearButton = new ButtonBuilder()
      .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}restricted_clear')
      .setLabel(lang('Clear All'))
      .setStyle(ButtonStyle.Danger);
    buttonRow.unshift(clearButton);
  }

  components.push(new ActionRowBuilder().addComponents(buttonRow));

  return { embeds: [embed], components };
}


/**
 * Builds the permission selection panel
 */
function buildPermissionPanel(feature, mainMsgId, guildId, client, locale) {
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;
  const featureName = getFeatureName(feature);

  const embed = new EmbedBuilder()
    .setTitle(lang('Permission Requirements') + ' - ' + featureName)
    .setDescription(lang('Select a permission preset that users must have to use this feature.'))
    .setColor(0x5865F2);

  const permissions = client.cache?.permissions?.filter(p => p.guildID === guildId) || new Collection();

  if (permissions.size === 0) {
    embed.setDescription(
      (client.config?.emojis?.NO || '❌') + ' ' + lang('No permission presets found on this server.') + '\n\n' +
      lang('Use') + ' </manager-permissions create:1150455842294988943> ' + lang('to create one.')
    );

    // No back button - just return embed with no components
    return {
      embeds: [embed],
      components: []
    };
  }

  const options = [];
  permissions.forEach((perm, id) => {
    if (options.length < 24) {
      options.push({
        label: perm.name || id,
        description: perm.description?.substring(0, 100) || lang('Permission preset'),
        value: id
      });
    }
  });

  options.push({
    label: lang('Remove Permission Requirement'),
    description: lang('Clear the permission requirement'),
    value: 'remove'
  });

  const permSelect = new StringSelectMenuBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}permission')
    .setPlaceholder('Select permission requirement')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const backButton = new ButtonBuilder()
    .setCustomId(CMD_PREFIX + 'feat{' + feature + '}back')
    .setLabel(lang('Back'))
    .setStyle(ButtonStyle.Secondary);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(permSelect),
      new ActionRowBuilder().addComponents(backButton)
    ]
  };
}


module.exports = {
  name: 'voice-feature-manager',
  nameLocalizations: {
    'ru': 'управление-голосовыми-функциями',
    'uk': 'управління-голосовими-функціями',
    'es-ES': 'gestor-funciones-voz'
  },
  description: 'Manage voice feature permissions, cooldowns, and restrictions',
  descriptionLocalizations: {
    'ru': 'Управление правами, кулдаунами и ограничениями голосовых функций',
    'uk': 'Управління правами, кулдаунами та обмеженнями голосових функцій',
    'es-ES': 'Gestionar permisos, tiempos de espera y restricciones de funciones de voz'
  },
  defaultMemberPermissions: "Administrator",
  dmPermission: false,
  group: 'managers',
  cooldowns: new Collection(),

  run: async (client, interaction, args) => {
    const guildId = interaction.guildId;
    const lang = (textId) => client?.language?.({ textId, guildId, locale: interaction.locale }) || textId;

    // Helper function to update main panel
    const updateMainPanel = async (mainMsgId, feature) => {
      if (!mainMsgId) return;
      try {
        const channel = interaction.channel;
        const mainMessage = await channel.messages.fetch(mainMsgId).catch(() => null);
        if (mainMessage) {
          await mainMessage.edit({
            embeds: [buildPreviewEmbed(guildId, feature, client, interaction.locale)],
            components: buildMainComponents(guildId, feature, client, interaction.locale)
          });
        }
      } catch (e) { /* ignore */ }
    };

    // Handle slash command invocation
    if (interaction.isChatInputCommand()) {
      await interaction.reply({
        embeds: [buildPreviewEmbed(guildId, null, client, interaction.locale)],
        components: buildMainComponents(guildId, null, client, interaction.locale)
      });
      return;
    }

    const customId = interaction.customId;

    // Extract feature, roles, and message ID from customId
    const featureMatch = FeatureRegexp.exec(customId);
    const feature = featureMatch?.[1];
    const rolesMatch = RolesRegexp.exec(customId);
    const rolesStr = rolesMatch?.[1] || '';
    const selectedRoles = rolesStr ? rolesStr.split(',').filter(r => r) : [];
    const msgMatch = MsgRegexp.exec(customId);
    const mainMsgId = msgMatch?.[1];

    // Handle feature selection - updates main panel
    if (customId === CMD_PREFIX + 'feature') {
      const selectedFeature = interaction.values[0];
      await interaction.update({
        embeds: [buildPreviewEmbed(guildId, selectedFeature, client, interaction.locale)],
        components: buildMainComponents(guildId, selectedFeature, client, interaction.locale)
      });
      return;
    }

    // Handle action selection - sends ephemeral message
    if (customId.endsWith('action') && feature && feature !== 'none') {
      const action = interaction.values[0];
      const currentMsgId = interaction.message.id;

      // Check if feature is disabled - don't allow configuration except restore
      if (action !== 'restore') {
        const toggles = dataStore.getFeatureToggles(guildId);
        const isEnabled = isFeatureEnabled(toggles, feature);
        
        if (!isEnabled) {
          await interaction.reply({
            content: (client.config?.emojis?.NO || '❌') + ' ' + lang('This feature is disabled. Enable it first using') + ' `/toggle-feature`',
            flags: ["Ephemeral"]
          });
          return;
        }
      }

      switch (action) {
        case 'allowed':
          await interaction.reply({
            ...buildAllowedPanel(feature, currentMsgId, guildId, client, interaction.locale, interaction.guild),
            flags: ["Ephemeral"]
          });
          break;

        case 'permission':
          await interaction.reply({
            ...buildPermissionPanel(feature, currentMsgId, guildId, client, interaction.locale),
            flags: ["Ephemeral"]
          });
          break;

        case 'cooldown':
          await interaction.reply({
            ...buildCooldownPanel(feature, currentMsgId, client, interaction.locale),
            flags: ["Ephemeral"]
          });
          break;

        case 'restricted':
          await interaction.reply({
            ...buildRestrictedPanel(feature, currentMsgId, guildId, client, interaction.locale, interaction.guild),
            flags: ["Ephemeral"]
          });
          break;

        case 'restore':
          dataStore.deleteVoiceFeatureConfig(guildId, feature);
          await interaction.update({
            embeds: [buildPreviewEmbed(guildId, feature, client, interaction.locale)],
            components: buildMainComponents(guildId, feature, client, interaction.locale)
          });
          await interaction.followUp({
            content: (client.config?.emojis?.YES || 'OK') + ' ' + lang('Settings restored to default for') + ' **' + getFeatureName(feature) + '**',
            flags: ["Ephemeral"]
          });
          break;

        default:
          await interaction.reply({
            content: (client.config?.emojis?.NO || 'X') + ' ' + lang('Please select a feature first'),
            flags: ["Ephemeral"]
          });
      }
      return;
    }

    // Handle back button - deletes ephemeral message
    if (customId.includes('back')) {
      await interaction.update({
        content: (client.config?.emojis?.YES || 'OK') + ' ' + lang('Cancelled'),
        embeds: [],
        components: []
      });
      return;
    }

    // Handle cooldown selection (ephemeral)
    if (customId.includes('cooldown') && feature && !customId.includes('modal')) {
      const value = interaction.values[0];

      if (value === 'custom') {
        // Show modal for custom cooldown
        const modal = new ModalBuilder()
          .setCustomId(CMD_PREFIX + 'feat{' + feature + '}msg{' + mainMsgId + '}cooldown_modal')
          .setTitle(lang('Custom Cooldown'));

        const cooldownInput = new TextInputBuilder()
          .setCustomId('cooldown_value')
          .setLabel(lang('Enter cooldown (e.g., 15min, 2h, 1d)'))
          .setPlaceholder('15min')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10);

        modal.addComponents(new ActionRowBuilder().addComponents(cooldownInput));
        await interaction.showModal(modal);
        return;
      }

      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};

      if (value === 'remove') {
        delete config.cooldown;
      } else {
        config.cooldown = parseInt(value);
      }

      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      // Update ephemeral message with success
      await interaction.update({
        content: (client.config?.emojis?.YES || 'OK') + ' ' + lang('Cooldown updated for') + ' **' + getFeatureName(feature) + '**',
        embeds: [],
        components: []
      });

      // Update main panel
      await updateMainPanel(mainMsgId, feature);
      return;
    }

    // Handle cooldown modal submit
    if (customId.includes('cooldown_modal') && feature) {
      const cooldownStr = interaction.fields.getTextInputValue('cooldown_value');
      const cooldownMs = parseCooldown(cooldownStr);

      if (!cooldownMs) {
        await interaction.reply({
          content: (client.config?.emojis?.NO || 'X') + ' ' + lang('Invalid format. Use: 10min, 1h, or 1d'),
          flags: ["Ephemeral"]
        });
        return;
      }

      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};
      config.cooldown = cooldownMs;
      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      await interaction.reply({
        content: (client.config?.emojis?.YES || 'OK') + ' ' + lang('Cooldown set to') + ' **' + formatCooldown(cooldownMs) + '** ' + lang('for') + ' **' + getFeatureName(feature) + '**',
        flags: ["Ephemeral"]
      });

      // Update main panel
      await updateMainPanel(mainMsgId, feature);
      return;
    }

    // Handle permission selection (ephemeral)
    if (customId.includes('permission') && feature && !customId.includes('action')) {
      const value = interaction.values[0];
      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};

      if (value === 'remove') {
        delete config.permissionId;
      } else {
        config.permissionId = value;
      }

      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      await interaction.update({
        content: (client.config?.emojis?.YES || 'OK') + ' ' + lang('Permission requirement updated for') + ' **' + getFeatureName(feature) + '**',
        embeds: [],
        components: []
      });

      // Update main panel
      await updateMainPanel(mainMsgId, feature);
      return;
    }

    // Handle allowed mentionable selection (ephemeral) - ADDS to existing
    if (customId.includes('allowed_select') && feature) {
      const selectedUsers = interaction.users ? Array.from(interaction.users.keys()) : [];
      const selectedRolesNew = interaction.roles ? Array.from(interaction.roles.keys()) : [];

      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};
      
      // Merge with existing (add new, avoid duplicates)
      const existingRoles = config.allowedRoles || [];
      const existingUsers = config.allowedUsers || [];
      config.allowedRoles = [...new Set([...existingRoles, ...selectedRolesNew])];
      config.allowedUsers = [...new Set([...existingUsers, ...selectedUsers])];
      
      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      // Update the panel to show new state
      await interaction.update({
        ...buildAllowedPanel(feature, mainMsgId, guildId, client, interaction.locale, interaction.guild)
      });

      // Update main panel
      await updateMainPanel(mainMsgId, feature);
      return;
    }

    // Handle allowed clear button
    if (customId.includes('allowed_clear') && feature) {
      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};
      config.allowedRoles = [];
      config.allowedUsers = [];
      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      await interaction.update({
        ...buildAllowedPanel(feature, mainMsgId, guildId, client, interaction.locale, interaction.guild)
      });

      await updateMainPanel(mainMsgId, feature);
      return;
    }

    // Handle allowed remove selection
    if (customId.includes('allowed_remove') && feature) {
      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};
      
      for (const value of interaction.values) {
        if (value.startsWith('role_')) {
          const roleId = value.substring(5);
          config.allowedRoles = (config.allowedRoles || []).filter(r => r !== roleId);
        } else if (value.startsWith('user_')) {
          const userId = value.substring(5);
          config.allowedUsers = (config.allowedUsers || []).filter(u => u !== userId);
        }
      }
      
      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      await interaction.update({
        ...buildAllowedPanel(feature, mainMsgId, guildId, client, interaction.locale, interaction.guild)
      });

      await updateMainPanel(mainMsgId, feature);
      return;
    }

    // Handle restricted mentionable selection (ephemeral) - ADDS to existing
    if (customId.includes('restricted_select') && feature) {
      const selectedUsers = interaction.users ? Array.from(interaction.users.keys()) : [];
      const selectedRolesNew = interaction.roles ? Array.from(interaction.roles.keys()) : [];

      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};
      
      // Merge with existing (add new, avoid duplicates)
      const existingRoles = config.restrictedRoles || [];
      const existingUsers = config.restrictedUsers || [];
      config.restrictedRoles = [...new Set([...existingRoles, ...selectedRolesNew])];
      config.restrictedUsers = [...new Set([...existingUsers, ...selectedUsers])];
      
      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      // Update the panel to show new state
      await interaction.update({
        ...buildRestrictedPanel(feature, mainMsgId, guildId, client, interaction.locale, interaction.guild)
      });

      // Update main panel
      await updateMainPanel(mainMsgId, feature);
      return;
    }

    // Handle restricted clear button
    if (customId.includes('restricted_clear') && feature) {
      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};
      config.restrictedRoles = [];
      config.restrictedUsers = [];
      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      await interaction.update({
        ...buildRestrictedPanel(feature, mainMsgId, guildId, client, interaction.locale, interaction.guild)
      });

      await updateMainPanel(mainMsgId, feature);
      return;
    }

    // Handle restricted remove selection
    if (customId.includes('restricted_remove') && feature) {
      const config = dataStore.getVoiceFeatureConfig(guildId, feature) || {};
      
      for (const value of interaction.values) {
        if (value.startsWith('role_')) {
          const roleId = value.substring(5);
          config.restrictedRoles = (config.restrictedRoles || []).filter(r => r !== roleId);
        } else if (value.startsWith('user_')) {
          const userId = value.substring(5);
          config.restrictedUsers = (config.restrictedUsers || []).filter(u => u !== userId);
        }
      }
      
      dataStore.setVoiceFeatureConfig(guildId, feature, config);

      await interaction.update({
        ...buildRestrictedPanel(feature, mainMsgId, guildId, client, interaction.locale, interaction.guild)
      });

      await updateMainPanel(mainMsgId, feature);
      return;
    }
  }
};
