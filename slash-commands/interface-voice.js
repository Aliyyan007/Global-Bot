/**
 * Interface Voice Command (Refactored)
 * Sends the universal voice control panel interface to a specified channel
 * This interface allows users to control their temporary voice channels from any channel
 * 
 * Key Features:
 * - Users can only control their own temp VCs (must be bot-created)
 * - Owners/Admins/Mods can control any temp VC (must be IN the VC)
 * - All interactions send ephemeral messages
 * - Interface resets after each use for reusability
 * - Independent of text channel settings
 */

const { 
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  Collection
} = require('discord.js');
const { buildUniversalVoiceControlPanel } = require('../modules/auto-voice/voice/controlPanel');
const dataStore = require('../modules/auto-voice/voice/dataStore');

const commandBuilder = new SlashCommandBuilder()
  .setName('interface-voice')
  .setDescription('Send the voice control panel interface to a channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('The text channel where the interface will be sent (defaults to current channel)')
      .setRequired(false)
      .addChannelTypes(ChannelType.GuildText)
  );

module.exports = {
  ...commandBuilder.toJSON(),
  group: 'admins-group',
  cooldowns: new Collection(),

  run: async (client, interaction, args) => {
    try {
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      
      // Check if target channel is a text channel
      if (targetChannel.type !== ChannelType.GuildText) {
        return await interaction.reply({
          content: '❌ The interface can only be sent to text channels.',
          ephemeral: true
        });
      }
      
      // Check if auto-voice system is configured
      const settings = dataStore.getGuildSettings(interaction.guildId);
      if (!settings) {
        return await interaction.reply({
          content: '❌ The auto voice system is not configured in this server. Use `/auto-voice-manager setup` first.',
          ephemeral: true
        });
      }

      // Check if bot has permission to send messages in the target channel
      const botMember = await interaction.guild.members.fetch(client.user.id);
      const permissions = targetChannel.permissionsFor(botMember);
      
      if (!permissions.has(PermissionFlagsBits.SendMessages)) {
        return await interaction.reply({
          content: `❌ I don't have permission to send messages in ${targetChannel}.`,
          ephemeral: true
        });
      }

      if (!permissions.has(PermissionFlagsBits.ViewChannel)) {
        return await interaction.reply({
          content: `❌ I don't have permission to view ${targetChannel}.`,
          ephemeral: true
        });
      }

      // Defer reply since we're about to send a message
      await interaction.deferReply({ ephemeral: true });

      // Get bot thumbnail URL for the control panel
      const thumbnailUrl = client.user.displayAvatarURL({ dynamic: true, size: 128 });

      // Build the universal voice control panel with UNIVERSAL placeholders
      // These will be resolved to actual IDs when users interact with the interface
      const { components, flags } = buildUniversalVoiceControlPanel(
        interaction.guildId,
        'UNIVERSAL', // Placeholder - resolved to actual channel ID on interaction
        'UNIVERSAL', // Placeholder - resolved to actual owner ID on interaction
        { 
          thumbnailUrl,
          stickyEnabled: false, // Universal panel doesn't show sticky state
          waitingRoomEnabled: false // Universal panel doesn't show waiting room state
        }
      );

      // Send the interface to the target channel
      const sentMessage = await targetChannel.send({ 
        components, 
        flags 
      });

      // Reply to the user
      await interaction.editReply({
        content: `✅ Voice control panel interface has been sent to ${targetChannel}!\n\n` +
                 `Users can now control their temporary voice channels from that channel.\n` +
                 `[Jump to message](${sentMessage.url})`
      });

    } catch (error) {
      console.error('[Interface Voice] Error:', error);
      
      const errorMessage = '❌ An error occurred while sending the interface. Please try again.';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage }).catch(console.error);
      } else if (!interaction.replied) {
        await interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
      }
    }
  }
};
