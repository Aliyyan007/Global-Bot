/**
 * Setup LFM Channel Slash Command
 * Allows administrators to configure LFM announcement channels
 */

const { 
  PermissionFlagsBits, 
  ChannelType,
  EmbedBuilder,
  ApplicationCommandOptionType,
  Collection
} = require('discord.js');
const dataStore = require('../modules/auto-voice/voice/dataStore');
const controlPanel = require('../modules/auto-voice/voice/controlPanel');

module.exports = {
  name: 'setup-lfm-channel',
  description: 'Configure channels for LFM (Looking for Members) announcements',
  default_member_permissions: String(PermissionFlagsBits.Administrator),
  dm_permission: false,
  cooldowns: new Collection(),
  options: [
    {
      name: 'add',
      description: 'Add a channel for LFM announcements',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'The text channel for LFM announcements',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
          required: true
        }
      ]
    },
    {
      name: 'remove',
      description: 'Remove a channel from LFM announcements',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'The channel to remove',
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
          required: true
        }
      ]
    },
    {
      name: 'list',
      description: 'List all configured LFM announcement channels',
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: 'clear',
      description: 'Remove all LFM announcement channels',
      type: ApplicationCommandOptionType.Subcommand
    }
  ],

  run: async (client, interaction, args) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add': {
        const channel = interaction.options.getChannel('channel');
        const currentChannels = dataStore.getLfmChannels(interaction.guildId);

        if (currentChannels.includes(channel.id)) {
          const embed = controlPanel.buildInfoEmbed(
            'Channel Already Added',
            `<#${channel.id}> is already configured for LFM announcements.`
          );
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        dataStore.addLfmChannel(interaction.guildId, channel.id);

        const embed = controlPanel.buildSuccessEmbed(
          'LFM Channel Added',
          `<#${channel.id}> will now receive LFM announcements.\n\n` +
          `**Total LFM channels:** ${currentChannels.length + 1}`
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'remove': {
        const channel = interaction.options.getChannel('channel');
        const currentChannels = dataStore.getLfmChannels(interaction.guildId);

        if (!currentChannels.includes(channel.id)) {
          const embed = controlPanel.buildInfoEmbed(
            'Channel Not Found',
            `<#${channel.id}> is not configured for LFM announcements.`
          );
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        dataStore.removeLfmChannel(interaction.guildId, channel.id);

        const embed = controlPanel.buildSuccessEmbed(
          'LFM Channel Removed',
          `<#${channel.id}> will no longer receive LFM announcements.\n\n` +
          `**Remaining LFM channels:** ${currentChannels.length - 1}`
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'list': {
        const channels = dataStore.getLfmChannels(interaction.guildId);

        if (channels.length === 0) {
          const embed = controlPanel.buildInfoEmbed(
            'No LFM Channels',
            'No LFM announcement channels are configured.\n\n' +
            'Use `/setup-lfm-channel add` to add a channel.'
          );
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('📢 LFM Announcement Channels')
          .setDescription(channels.map((id, index) => `${index + 1}. <#${id}>`).join('\n'))
          .setColor(0x5865F2)
          .setFooter({ text: `${channels.length} channel(s) configured` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'clear': {
        const channels = dataStore.getLfmChannels(interaction.guildId);

        if (channels.length === 0) {
          const embed = controlPanel.buildInfoEmbed(
            'No LFM Channels',
            'There are no LFM channels to clear.'
          );
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        dataStore.setLfmChannels(interaction.guildId, []);

        const embed = controlPanel.buildSuccessEmbed(
          'LFM Channels Cleared',
          `Removed ${channels.length} LFM announcement channel(s).`
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  }
};
