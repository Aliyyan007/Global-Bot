/**
 * Feature Manager Panel Builder
 * Builds embeds and components for the voice feature manager UI
 * Requirements: 2.1, 2.2, 4.1, 6.1, 6.2
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder
} = require('discord.js');

const { FEATURE_CATEGORIES, FEATURE_INFO, getCategoryForFeature } = require('./featureCategories');
const dataStore = require('./dataStore');

// Color constants for consistent UI
const COLORS = {
  INFO: 0x5865F2,    // Blurple - informational
  SUCCESS: 0x57F287, // Green - success
  ERROR: 0xED4245,   // Red - error
  WARNING: 0xFEE75C  // Yellow - warning
};

/**
 * Builds the main control panel for voice feature management
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID who invoked the command
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildMainPanel(guildId, userId, client, locale) {
  const permissions = dataStore.getFeaturePermissions(guildId);
  const configuredCount = Object.keys(permissions).filter(
    f => permissions[f]?.roles?.length > 0 || permissions[f]?.members?.length > 0
  ).length;

  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`🔐 ${lang('Voice Feature Manager')}`)
    .setDescription(
      `${lang('Manage which roles and members can use voice channel features.')}\n\n` +
      `**${lang('Configured Features')}:** ${configuredCount}\n\n` +
      `${lang('Select a category below to view and configure features.')}`
    )
    .setColor(COLORS.INFO)
    .setFooter({ text: lang('Only administrators can use this panel') })
    .setTimestamp();

  // Add category overview fields
  for (const [key, category] of Object.entries(FEATURE_CATEGORIES)) {
    const categoryPermissions = category.features.filter(
      f => permissions[f]?.roles?.length > 0 || permissions[f]?.members?.length > 0
    );
    embed.addFields({
      name: `${category.emoji} ${lang(category.name)}`,
      value: `${categoryPermissions.length}/${category.features.length} ${lang('configured')}`,
      inline: true
    });
  }

  // Category selection dropdown
  const categoryOptions = Object.entries(FEATURE_CATEGORIES).map(([key, category]) => ({
    label: lang(category.name),
    description: lang(category.description),
    value: key,
    emoji: category.emoji
  }));

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId(`cmd{voice-feature-manager}usr{${userId}}`)
    .setPlaceholder(lang('Select a category'))
    .addOptions(categoryOptions);

  const categoryRow = new ActionRowBuilder().addComponents(categorySelect);

  // View all and refresh buttons
  const viewAllButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}usr{${userId}}view_all`)
    .setLabel(lang('View All Permissions'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📋');

  const refreshButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}usr{${userId}}refresh`)
    .setLabel(lang('Refresh'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🔄');

  const buttonRow = new ActionRowBuilder().addComponents(viewAllButton, refreshButton);

  return {
    embeds: [embed],
    components: [categoryRow, buttonRow]
  };
}

/**
 * Builds the category view showing features and their status
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @param {string} categoryKey - The category identifier
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildCategoryPanel(guildId, userId, categoryKey, client, locale) {
  const category = FEATURE_CATEGORIES[categoryKey];
  if (!category) {
    return buildErrorPanel(client, locale, 'Invalid Category', 'The selected category does not exist.');
  }

  const permissions = dataStore.getFeaturePermissions(guildId);
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`${category.emoji} ${lang(category.name)}`)
    .setDescription(`${lang(category.description)}\n\n${lang('Select a feature to configure or view its permissions.')}`)
    .setColor(COLORS.INFO)
    .setTimestamp();

  // Add feature status fields
  for (const feature of category.features) {
    const info = FEATURE_INFO[feature];
    const perm = permissions[feature];
    const isConfigured = perm?.roles?.length > 0 || perm?.members?.length > 0;
    
    const statusEmoji = isConfigured ? '✅' : '⚪';
    const statusText = isConfigured 
      ? `${perm.roles?.length || 0} ${lang('roles')}, ${perm.members?.length || 0} ${lang('members')}`
      : lang('Not configured');

    embed.addFields({
      name: `${info?.emoji || '•'} ${info?.name || feature}`,
      value: `${statusEmoji} ${statusText}`,
      inline: true
    });
  }

  // Feature selection dropdown
  const featureOptions = category.features.map(feature => {
    const info = FEATURE_INFO[feature];
    const perm = permissions[feature];
    const isConfigured = perm?.roles?.length > 0 || perm?.members?.length > 0;
    
    return {
      label: info?.name || feature,
      description: isConfigured ? lang('Configured - Click to edit') : lang('Not configured - Click to set up'),
      value: feature,
      emoji: info?.emoji || '•'
    };
  });

  const featureSelect = new StringSelectMenuBuilder()
    .setCustomId(`cmd{voice-feature-manager}cat{${categoryKey}}usr{${userId}}`)
    .setPlaceholder(lang('Select a feature to configure'))
    .addOptions(featureOptions);

  const featureRow = new ActionRowBuilder().addComponents(featureSelect);

  // Back button
  const backButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}usr{${userId}}back`)
    .setLabel(lang('Back to Main Menu'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const buttonRow = new ActionRowBuilder().addComponents(backButton);

  return {
    embeds: [embed],
    components: [featureRow, buttonRow]
  };
}

/**
 * Builds the permission overview panel showing all configured permissions
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildOverviewPanel(guildId, userId, client, locale) {
  const permissions = dataStore.getFeaturePermissions(guildId);
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const configuredFeatures = Object.entries(permissions)
    .filter(([, perm]) => perm?.roles?.length > 0 || perm?.members?.length > 0);

  const embed = new EmbedBuilder()
    .setTitle(`📋 ${lang('All Feature Permissions')}`)
    .setColor(COLORS.INFO)
    .setTimestamp();

  if (configuredFeatures.length === 0) {
    embed.setDescription(
      `${lang('No feature permissions are currently configured.')}\n\n` +
      `${lang('All voice features are available to everyone.')}\n\n` +
      `${lang('Use the category menu to configure feature restrictions.')}`
    );
  } else {
    embed.setDescription(`${lang('Showing all configured feature permissions:')}`);

    for (const [feature, perm] of configuredFeatures) {
      const info = FEATURE_INFO[feature];
      const category = getCategoryForFeature(feature);
      const categoryInfo = FEATURE_CATEGORIES[category];
      
      const rolesText = perm.roles?.length > 0 
        ? perm.roles.map(r => `<@&${r}>`).join(', ')
        : lang('None');
      const membersText = perm.members?.length > 0
        ? perm.members.map(m => `<@${m}>`).join(', ')
        : lang('None');

      embed.addFields({
        name: `${info?.emoji || '•'} ${info?.name || feature} (${categoryInfo?.emoji || ''} ${lang(categoryInfo?.name || 'Unknown')})`,
        value: `**${lang('Roles')}:** ${rolesText}\n**${lang('Members')}:** ${membersText}`,
        inline: false
      });
    }
  }

  // Back button
  const backButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}usr{${userId}}back`)
    .setLabel(lang('Back to Main Menu'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const buttonRow = new ActionRowBuilder().addComponents(backButton);

  return {
    embeds: [embed],
    components: [buttonRow]
  };
}


/**
 * Builds the feature detail panel for viewing a specific feature's permissions
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @param {string} feature - The feature name
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildFeatureDetailPanel(guildId, userId, feature, client, locale) {
  const permission = dataStore.getFeaturePermission(guildId, feature);
  const info = FEATURE_INFO[feature];
  const categoryKey = getCategoryForFeature(feature);
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`${info?.emoji || '🔐'} ${info?.name || feature} ${lang('Permissions')}`)
    .setDescription(info?.description || lang('Configure who can use this feature'))
    .setColor(COLORS.INFO)
    .setTimestamp();

  if (!permission || (permission.roles?.length === 0 && permission.members?.length === 0)) {
    embed.addFields({
      name: `⚪ ${lang('Status')}`,
      value: lang('Not configured - All users can use this feature'),
      inline: false
    });
  } else {
    embed.addFields({
      name: `✅ ${lang('Status')}`,
      value: lang('Configured - Only allowed roles/members can use this feature'),
      inline: false
    });

    if (permission.roles?.length > 0) {
      embed.addFields({
        name: `👥 ${lang('Allowed Roles')}`,
        value: permission.roles.map(r => `<@&${r}>`).join('\n'),
        inline: true
      });
    }

    if (permission.members?.length > 0) {
      embed.addFields({
        name: `👤 ${lang('Allowed Members')}`,
        value: permission.members.map(m => `<@${m}>`).join('\n'),
        inline: true
      });
    }

    if (permission.deny_message) {
      embed.addFields({
        name: `💬 ${lang('Deny Message')}`,
        value: permission.deny_message,
        inline: false
      });
    }
  }

  // Action buttons
  const configureButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}feat{${feature}}usr{${userId}}configure`)
    .setLabel(lang('Configure'))
    .setStyle(ButtonStyle.Primary)
    .setEmoji('⚙️');

  const clearButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}feat{${feature}}usr{${userId}}clear`)
    .setLabel(lang('Clear Permissions'))
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️')
    .setDisabled(!permission || (permission.roles?.length === 0 && permission.members?.length === 0));

  const backButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}cat{${categoryKey}}usr{${userId}}back`)
    .setLabel(lang('Back to Category'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const buttonRow = new ActionRowBuilder().addComponents(configureButton, clearButton, backButton);

  return {
    embeds: [embed],
    components: [buttonRow]
  };
}

/**
 * Builds the role selection panel (Step 1 of 3)
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @param {string} feature - The feature being configured
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildRoleSelectionPanel(guildId, userId, feature, client, locale) {
  const info = FEATURE_INFO[feature];
  const currentPermission = dataStore.getFeaturePermission(guildId, feature);
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`🔐 ${lang('Configure')} ${info?.name || feature} ${lang('Permissions')}`)
    .setDescription(
      `**${lang('Step 1 of 3')}:** ${lang('Select roles that can use the')} **${info?.name || feature}** ${lang('feature.')}\n\n` +
      `${lang('Leave empty to skip role restrictions.')}\n\n` +
      (currentPermission?.roles?.length > 0 
        ? `**${lang('Current allowed roles')}:** ${currentPermission.roles.map(r => `<@&${r}>`).join(', ')}`
        : `*${lang('No role restrictions currently set.')}*`)
    )
    .setColor(COLORS.INFO)
    .setFooter({ text: `${lang('Step')} 1/3` })
    .setTimestamp();

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(`cmd{voice-feature-manager}feat{${feature}}usr{${userId}}roles`)
    .setPlaceholder(lang('Select allowed roles (optional)'))
    .setMinValues(0)
    .setMaxValues(10);

  const roleRow = new ActionRowBuilder().addComponents(roleSelect);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}feat{${feature}}usr{${userId}}cancel`)
    .setLabel(lang('Cancel'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const buttonRow = new ActionRowBuilder().addComponents(cancelButton);

  return {
    embeds: [embed],
    components: [roleRow, buttonRow]
  };
}

/**
 * Builds the member selection panel (Step 2 of 3)
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @param {string} feature - The feature being configured
 * @param {string[]} selectedRoles - Previously selected roles
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildMemberSelectionPanel(guildId, userId, feature, selectedRoles, client, locale) {
  const info = FEATURE_INFO[feature];
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`🔐 ${lang('Configure')} ${info?.name || feature} ${lang('Permissions')}`)
    .setDescription(
      `**${lang('Step 2 of 3')}:** ${lang('Select specific members that can use the')} **${info?.name || feature}** ${lang('feature.')}\n\n` +
      `${lang('Leave empty to skip member restrictions.')}\n\n` +
      (selectedRoles.length > 0 
        ? `**${lang('Selected roles')}:** ${selectedRoles.map(r => `<@&${r}>`).join(', ')}`
        : `*${lang('No roles selected.')}*`)
    )
    .setColor(COLORS.INFO)
    .setFooter({ text: `${lang('Step')} 2/3` })
    .setTimestamp();

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId(`cmd{voice-feature-manager}feat{${feature}}roles{${selectedRoles.join(',')}}usr{${userId}}members`)
    .setPlaceholder(lang('Select allowed members (optional)'))
    .setMinValues(0)
    .setMaxValues(10);

  const userRow = new ActionRowBuilder().addComponents(userSelect);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}feat{${feature}}usr{${userId}}cancel`)
    .setLabel(lang('Cancel'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const buttonRow = new ActionRowBuilder().addComponents(cancelButton);

  return {
    embeds: [embed],
    components: [userRow, buttonRow]
  };
}

/**
 * Builds the success panel after configuration
 * @param {string} feature - The configured feature
 * @param {Object} permission - The saved permission object
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildSuccessPanel(guildId, userId, feature, permission, client, locale) {
  const info = FEATURE_INFO[feature];
  const categoryKey = getCategoryForFeature(feature);
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`✅ ${lang('Permissions Updated')}`)
    .setDescription(`${lang('Permissions for')} **${info?.name || feature}** ${lang('have been configured.')}`)
    .setColor(COLORS.SUCCESS)
    .setTimestamp();

  if (permission.roles?.length > 0) {
    embed.addFields({
      name: `👥 ${lang('Allowed Roles')}`,
      value: permission.roles.map(r => `<@&${r}>`).join(', '),
      inline: true
    });
  }

  if (permission.members?.length > 0) {
    embed.addFields({
      name: `👤 ${lang('Allowed Members')}`,
      value: permission.members.map(u => `<@${u}>`).join(', '),
      inline: true
    });
  }

  if (permission.deny_message) {
    embed.addFields({
      name: `💬 ${lang('Deny Message')}`,
      value: permission.deny_message,
      inline: false
    });
  }

  if (permission.roles?.length === 0 && permission.members?.length === 0) {
    embed.setDescription(
      `${lang('Permissions for')} **${info?.name || feature}** ${lang('have been cleared.')}\n` +
      `${lang('All users can now use this feature.')}`
    );
  }

  const backButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}cat{${categoryKey}}usr{${userId}}back`)
    .setLabel(lang('Back to Category'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const mainButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}usr{${userId}}back`)
    .setLabel(lang('Main Menu'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🏠');

  const buttonRow = new ActionRowBuilder().addComponents(backButton, mainButton);

  return {
    embeds: [embed],
    components: [buttonRow]
  };
}

/**
 * Builds the clear confirmation panel
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @param {string} feature - The feature to clear
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildClearConfirmPanel(guildId, userId, feature, client, locale) {
  const info = FEATURE_INFO[feature];
  const lang = (textId) => client?.language?.({ textId, guildId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`⚠️ ${lang('Confirm Clear Permissions')}`)
    .setDescription(
      `${lang('Are you sure you want to clear all permissions for')} **${info?.name || feature}**?\n\n` +
      `${lang('This will allow all users to use this feature.')}`
    )
    .setColor(COLORS.WARNING)
    .setTimestamp();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}feat{${feature}}usr{${userId}}clear_confirm`)
    .setLabel(lang('Yes, Clear'))
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cmd{voice-feature-manager}feat{${feature}}usr{${userId}}clear_cancel`)
    .setLabel(lang('Cancel'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  return {
    embeds: [embed],
    components: [buttonRow]
  };
}

/**
 * Builds an error panel
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @param {string} title - Error title
 * @param {string} description - Error description
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildErrorPanel(client, locale, title, description) {
  const lang = (textId) => client?.language?.({ textId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`❌ ${lang(title)}`)
    .setDescription(lang(description))
    .setColor(COLORS.ERROR)
    .setTimestamp();

  return {
    embeds: [embed],
    components: []
  };
}

/**
 * Builds a timeout panel
 * @param {Object} client - Discord client for localization
 * @param {string} locale - User's locale
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildTimeoutPanel(client, locale) {
  const lang = (textId) => client?.language?.({ textId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setTitle(`⏰ ${lang('Timed Out')}`)
    .setDescription(lang('No response received. Configuration has been cancelled.'))
    .setColor(COLORS.WARNING)
    .setTimestamp();

  return {
    embeds: [embed],
    components: []
  };
}

module.exports = {
  COLORS,
  buildMainPanel,
  buildCategoryPanel,
  buildOverviewPanel,
  buildFeatureDetailPanel,
  buildRoleSelectionPanel,
  buildMemberSelectionPanel,
  buildSuccessPanel,
  buildClearConfirmPanel,
  buildErrorPanel,
  buildTimeoutPanel
};
