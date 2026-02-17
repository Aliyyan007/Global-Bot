/**
 * Auto Voice Manager Command
 * Consolidated admin command for voice system management
 * Combines: setup-voice, voice-disable, reset-voice
 */

const { 
  SlashCommandBuilder,
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  EmbedBuilder,
  Collection
} = require('discord.js');
const dataStore = require('../modules/auto-voice/voice/dataStore');
const controlPanel = require('../modules/auto-voice/voice/controlPanel');

const commandBuilder = new SlashCommandBuilder()
  .setName('auto-voice-manager')
  .setDescription('Manage the auto voice system (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand(subcommand =>
    subcommand
      .setName('setup')
      .setDescription('Setup the temporary voice channel system')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('disable')
      .setDescription('Disable the temporary voice channel system')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('reset')
      .setDescription('Reset voice system settings')
      .addStringOption(option =>
        option
          .setName('setting')
          .setDescription('The setting to reset')
          .setRequired(true)
          .addChoices(
            { name: 'Reset My Settings', value: 'reset_myself' },
            { name: 'Reset LFM Channels', value: 'lfm_channel' },
            { name: 'Reset Feature Toggles', value: 'feature_toggles' },
            { name: 'Reset Feature Permissions', value: 'feature_permissions' },
            { name: 'Reset Server Settings (Full Reset)', value: 'server_settings' }
          )
      )
  )

module.exports = {
  ...commandBuilder.toJSON(),
  cooldowns: new Collection(),

  run: async (client, interaction, args) => {
    const subcommand = interaction.options.getSubcommand()

    try {
      switch (subcommand) {
        case 'setup':
          await handleSetup(client, interaction)
          break
        case 'disable':
          await handleDisable(client, interaction)
          break
        case 'reset':
          await handleReset(client, interaction)
          break
        default:
          await interaction.reply({
            content: 'Unknown subcommand',
            ephemeral: true
          })
      }
    } catch (error) {
      console.error('[Auto Voice Manager] Error:', error)
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while processing your request.',
          ephemeral: true
        }).catch(console.error)
      }
    }
  }
}

// ==================== SETUP ====================

async function handleSetup(client, interaction) {
  const existingSettings = dataStore.getGuildSettings(interaction.guildId)
  
  if (existingSettings) {
    const embed = controlPanel.buildInfoEmbed(
      'Voice System Already Configured',
      `The auto voice system is already set up.\n\n` +
      `**Join to Create Channel:** <#${existingSettings.voice_channel_id}>\n` +
      `**Temp Voice Category:** <#${existingSettings.temp_voice_category_id}>\n\n` +
      `Use \`/auto-voice-manager disable\` to remove the current configuration before setting up again.`
    )
    await interaction.reply({ embeds: [embed], ephemeral: true })
    return
  }

  const { embed, components } = controlPanel.buildSetupInterface()
  await interaction.reply({ embeds: [embed], components, ephemeral: true })
}

// ==================== DISABLE ====================

async function handleDisable(client, interaction) {
  const settings = dataStore.getGuildSettings(interaction.guildId)

  if (!settings) {
    const embed = controlPanel.buildInfoEmbed(
      'Voice System Not Configured',
      'The auto voice system is not currently configured.\n\n' +
      'Use `/auto-voice-manager setup` to set it up.'
    )
    await interaction.reply({ embeds: [embed], ephemeral: true })
    return
  }

  const embed = controlPanel.buildInfoEmbed(
    'Confirm Disable',
    'Are you sure you want to disable the auto voice system?\n\n' +
    '**This will:**\n' +
    '• Remove the voice system configuration\n' +
    '• Stop creating new temporary channels\n' +
    '• Existing temporary channels will remain until empty\n\n' +
    '**Note:** This will NOT delete the Join to Create channel or categories.'
  )

  const confirmButton = new ButtonBuilder()
    .setCustomId('voice_disable_confirm')
    .setLabel('Disable Voice System')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('⚠️')

  const cancelButton = new ButtonBuilder()
    .setCustomId('voice_disable_cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton)

  const response = await interaction.reply({ 
    embeds: [embed], 
    components: [row], 
    ephemeral: true 
  })

  try {
    const buttonInteraction = await response.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id,
      time: 30000
    })

    if (buttonInteraction.customId === 'voice_disable_confirm') {
      dataStore.deleteGuildSettings(interaction.guildId)
      dataStore.setFeatureToggles(interaction.guildId, {})
      dataStore.setLfmChannels(interaction.guildId, [])
      
      const data = dataStore.loadVoiceData()
      if (data.feature_permissions[String(interaction.guildId)]) {
        delete data.feature_permissions[String(interaction.guildId)]
      }
      if (data.text_channel_category[String(interaction.guildId)]) {
        delete data.text_channel_category[String(interaction.guildId)]
      }
      const guildPrefix = `${String(interaction.guildId)}_`
      for (const key of Object.keys(data.user_cooldowns)) {
        if (key.startsWith(guildPrefix)) {
          delete data.user_cooldowns[key]
        }
      }
      dataStore.saveVoiceData(data)

      const successEmbed = controlPanel.buildSuccessEmbed(
        'Voice System Disabled',
        'The auto voice system has been disabled.\n\n' +
        'Use `/auto-voice-manager setup` to re-enable the system.'
      )
      await buttonInteraction.update({ embeds: [successEmbed], components: [] })
    } else {
      const cancelEmbed = controlPanel.buildInfoEmbed(
        'Cancelled',
        'The voice system has not been disabled.'
      )
      await buttonInteraction.update({ embeds: [cancelEmbed], components: [] })
    }
  } catch (error) {
    const timeoutEmbed = controlPanel.buildInfoEmbed(
      'Timed Out',
      'No response received. The voice system has not been disabled.'
    )
    await interaction.editReply({ embeds: [timeoutEmbed], components: [] })
  }
}

// ==================== RESET ====================

const RESET_OPTIONS = {
  reset_myself: { name: 'Reset My Settings', description: 'Clear your personal voice channel settings' },
  lfm_channel: { name: 'Reset LFM Channels', description: 'Remove all LFM announcement channels' },
  feature_toggles: { name: 'Reset Feature Toggles', description: 'Re-enable all features' },
  feature_permissions: { name: 'Reset Feature Permissions', description: 'Clear all feature permission restrictions' },
  server_settings: { name: 'Reset Server Settings', description: 'Reset all voice system settings for this server' }
}

async function handleReset(client, interaction) {
  const setting = interaction.options.getString('setting')
  const resetOption = RESET_OPTIONS[setting]

  if (!resetOption) {
    await interaction.reply({ content: 'Invalid reset option.', ephemeral: true })
    return
  }

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Confirm Reset')
    .setDescription(
      `Are you sure you want to **${resetOption.name.toLowerCase()}**?\n\n` +
      `**Action:** ${resetOption.description}\n\n` +
      '⚠️ This action cannot be undone!'
    )
    .setColor(0xFEE75C)
    .setTimestamp()

  const confirmButton = new ButtonBuilder()
    .setCustomId(`reset_confirm:${setting}`)
    .setLabel('Confirm Reset')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('⚠️')

  const cancelButton = new ButtonBuilder()
    .setCustomId('reset_cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton)

  const response = await interaction.reply({ 
    embeds: [embed], 
    components: [row], 
    ephemeral: true 
  })

  try {
    const buttonInteraction = await response.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id,
      time: 30000
    })

    if (buttonInteraction.customId.startsWith('reset_confirm')) {
      await performReset(interaction.guildId, interaction.user.id, setting)

      const successEmbed = controlPanel.buildSuccessEmbed(
        'Reset Complete',
        `Successfully completed: **${resetOption.name}**`
      )
      await buttonInteraction.update({ embeds: [successEmbed], components: [] })
    } else {
      const cancelEmbed = controlPanel.buildInfoEmbed(
        'Cancelled',
        'Reset operation has been cancelled.'
      )
      await buttonInteraction.update({ embeds: [cancelEmbed], components: [] })
    }
  } catch (error) {
    if (error.code === 'InteractionCollectorError') {
      const timeoutEmbed = controlPanel.buildInfoEmbed(
        'Timed Out',
        'No response received. Reset operation has been cancelled.'
      )
      await interaction.editReply({ embeds: [timeoutEmbed], components: [] })
    } else {
      throw error
    }
  }
}

async function performReset(guildId, userId, setting) {
  const data = dataStore.loadVoiceData()

  switch (setting) {
    case 'reset_myself':
      const userPrefix = `${guildId}_${userId}_`
      for (const key of Object.keys(data.user_cooldowns)) {
        if (key.startsWith(userPrefix)) {
          delete data.user_cooldowns[key]
        }
      }
      break

    case 'lfm_channel':
      delete data.lfm_channels[guildId]
      break

    case 'feature_toggles':
      delete data.feature_toggles[guildId]
      break

    case 'feature_permissions':
      delete data.feature_permissions[guildId]
      break

    case 'server_settings':
      delete data.voice_settings[guildId]
      delete data.feature_toggles[guildId]
      delete data.feature_permissions[guildId]
      delete data.lfm_channels[guildId]
      delete data.text_channel_category[guildId]
      
      const serverPrefix = `${guildId}_`
      for (const key of Object.keys(data.user_cooldowns)) {
        if (key.startsWith(serverPrefix)) {
          delete data.user_cooldowns[key]
        }
      }
      break
  }

  dataStore.saveVoiceData(data)
}
