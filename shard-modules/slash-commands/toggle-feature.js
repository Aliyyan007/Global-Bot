/**
 * Toggle Feature Slash Command
 * Allows administrators to toggle voice channel features on/off
 * Clean, compact interface matching voice-feature-manager style
 */

const { 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  EmbedBuilder,
  Collection
} = require('discord.js');
const dataStore = require('../modules/auto-voice/voice/dataStore');
const { ALL_FEATURES } = require('../modules/auto-voice/voice/constants');
const { FEATURE_INFO, FEATURE_CATEGORIES } = require('../modules/auto-voice/voice/featureCategories');

// Features that are disabled by default
const DISABLED_BY_DEFAULT = ['autotext'];

// Command prefix for customIds
const CMD_PREFIX = 'cmd{toggle-feature}';

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
  return info?.emoji || '•';
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
 * Builds the compact feature status embed
 */
function buildFeatureEmbed(toggles, client, locale) {
  const lang = (textId) => client?.language?.({ textId, locale }) || textId;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2);

  // Group features by category with markdown headers
  let description = '# ' + lang('Toggle Features') + '\n';
  
  for (const [categoryKey, category] of Object.entries(FEATURE_CATEGORIES)) {
    const categoryFeatures = category.features;
    
    // Category header
    description += `### ${category.emoji} ${category.name}\n`;
    
    // Feature lines
    const featureLines = categoryFeatures.map(feature => {
      const enabled = isFeatureEnabled(toggles, feature);
      const statusText = enabled ? '`Enabled`' : '`Disabled`';
      const emoji = getFeatureEmoji(feature);
      const name = getFeatureName(feature);
      return `${emoji} **${name}** ${statusText}`;
    });
    
    description += featureLines.join('\n') + '\n';
  }

  embed.setDescription(description.trim());
  
  // Count enabled features
  let enabledCount = 0;
  ALL_FEATURES.forEach(f => { if (isFeatureEnabled(toggles, f)) enabledCount++; });
  
  embed.setFooter({ text: `${enabledCount}/${ALL_FEATURES.length} ${lang('features enabled')}` });

  return embed;
}

/**
 * Builds the feature selection menu
 */
function buildFeatureSelectMenu(toggles, client, locale) {
  const lang = (textId) => client?.language?.({ textId, locale }) || textId;
  
  const options = ALL_FEATURES.map(feature => {
    const enabled = isFeatureEnabled(toggles, feature);
    const name = getFeatureName(feature);
    const emoji = getFeatureEmoji(feature);
    const info = FEATURE_INFO[feature];
    
    return {
      label: name,
      description: (enabled ? '✅ ' : '❌ ') + (info?.description || ''),
      value: feature,
      emoji: emoji
    };
  });

  return new StringSelectMenuBuilder()
    .setCustomId(CMD_PREFIX + 'select')
    .setPlaceholder(lang('Select a feature to toggle'))
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);
}

module.exports = {
  name: 'toggle-feature',
  description: 'Toggle voice channel features on/off',
  default_member_permissions: String(PermissionFlagsBits.Administrator),
  dm_permission: false,
  cooldowns: new Collection(),

  run: async (client, interaction, args) => {
    const guildId = interaction.guildId;
    const lang = (textId) => client?.language?.({ textId, guildId, locale: interaction.locale }) || textId;
    const emojis = client?.config?.emojis || {};

    // Handle slash command invocation
    if (interaction.isChatInputCommand()) {
      const toggles = dataStore.getFeatureToggles(guildId);
      const featureRow = new ActionRowBuilder().addComponents(
        buildFeatureSelectMenu(toggles, client, interaction.locale)
      );

      await interaction.reply({
        embeds: [buildFeatureEmbed(toggles, client, interaction.locale)],
        components: [featureRow]
      });
      return;
    }

    // Handle select menu interaction
    if (interaction.isStringSelectMenu() && interaction.customId === CMD_PREFIX + 'select') {
      const feature = interaction.values[0];
      const toggles = dataStore.getFeatureToggles(guildId);
      const currentState = isFeatureEnabled(toggles, feature);
      
      // Toggle the feature
      const newState = !currentState;
      dataStore.setFeatureToggle(guildId, feature, newState);
      
      // Get updated toggles
      const updatedToggles = dataStore.getFeatureToggles(guildId);
      
      // Rebuild menu with updated state
      const featureRow = new ActionRowBuilder().addComponents(
        buildFeatureSelectMenu(updatedToggles, client, interaction.locale)
      );

      const featureName = getFeatureName(feature);
      const statusEmoji = newState ? (emojis.YES || '✅') : (emojis.NO || '❌');

      await interaction.update({
        embeds: [buildFeatureEmbed(updatedToggles, client, interaction.locale)],
        components: [featureRow]
      });

      // Send confirmation as followup
      await interaction.followUp({
        content: `${statusEmoji} **${featureName}** ${newState ? lang('enabled') : lang('disabled')}`,
        flags: ["Ephemeral"]
      });
      return;
    }
  }
};
