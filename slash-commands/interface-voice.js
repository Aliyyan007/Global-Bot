/**
 * Interface Voice Command
 * Sends the voice control panel interface to a specified channel
 * This interface allows users to control their temporary voice channels from any channel
 */

const { 
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  Collection
} = require('discord.js');
const { buildCompactVoiceControlPanel } = require('../modules/auto-voice/voice/controlPanel');
const dataStore = require('../modules/auto-voice/voice/dataStore');

const commandBuilder = new SlashCommandBuilder()
  .setName('interface-voice')
  .setDescription('Send the voice control panel interface to a channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('The text channel where the interface will be sent')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText)
  );

module.exports = {
  ...commandBuilder.toJSON(),
  cooldowns: new Collection(),

  run: async (client, interaction, args) => {
    try {
      const targetChannel = interaction.options.getChannel('channel');
      
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

      // Build the universal voice control panel with custom text and button
      // This is specifically for the universal interface, different from temp VC panel
      const { buildUniversalVoiceControlPanel } = require('../modules/auto-voice/voice/controlPanel');
      const { components, flags } = buildUniversalVoiceControlPanel(
        interaction.guildId,
        'UNIVERSAL', // Placeholder - will be replaced with actual channel ID on interaction
        'UNIVERSAL', // Placeholder - will be replaced with actual owner ID on interaction
        { 
          thumbnailUrl,
          stickyEnabled: false, // Universal panel doesn't have sticky enabled by default
          waitingRoomEnabled: false
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
