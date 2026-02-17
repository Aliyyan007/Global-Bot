/**
 * Sticker Add Slash Command
 * Allows users to add stickers from other servers to their own server
 * Requires: Manage Emojis and Stickers permission
 */

const { 
  PermissionFlagsBits, 
  ApplicationCommandOptionType,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  name: 'sticker-add',
  description: 'Add a sticker from another server to your server using its ID',
  default_member_permissions: String(PermissionFlagsBits.ManageEmojisAndStickers),
  dm_permission: false,
  options: [
    {
      name: 'sticker_id',
      description: 'The ID of the sticker to add',
      type: ApplicationCommandOptionType.String,
      required: true,
      min_length: 17,
      max_length: 20
    },
    {
      name: 'name',
      description: 'Custom name for the sticker (optional, uses original name if not provided)',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 30,
      min_length: 2
    }
  ],

  run: async (client, interaction, args) => {
    await interaction.deferReply({ flags: 64 }); // 64 = Ephemeral flag

    const stickerId = interaction.options.getString('sticker_id');
    const customName = interaction.options.getString('name');

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Missing Permissions')
        .setDescription(
          '> I need the **Manage Emojis and Stickers** permission\n' +
          '> to add stickers to this server.\n\n' +
          '## Required Permission\n' +
          '`Manage Emojis and Stickers`'
        )
        .setColor(0xED4245)
        .setTimestamp();

      return interaction.editReply({ embeds: [errorEmbed] });
    }

    try {
      // Fetch the sticker from Discord
      let sourceSticker;
      try {
        sourceSticker = await client.fetchSticker(stickerId);
      } catch (fetchError) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Sticker Not Found')
          .setDescription(
            '> Could not find a sticker with that ID\n\n' +
            '## Possible Reasons\n' +
            '> • The sticker ID is invalid\n' +
            '> • The sticker has been deleted\n' +
            '> • The sticker is from a private server\n\n' +
            '### How to Get a Sticker ID\n' +
            '> 1. Right-click on a sticker in Discord\n' +
            '> 2. Select "Copy Sticker Link"\n' +
            '> 3. The ID is the number at the end of the URL\n' +
            '> Example: `https://discord.com/stickers/123456789012345678`'
          )
          .setColor(0xED4245)
          .setTimestamp()
          .setFooter({ text: `Provided ID: ${stickerId}` });

        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if sticker is from a guild (not a default Discord sticker)
      if (!sourceSticker.guildId) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Cannot Add Default Sticker')
          .setDescription(
            '> This is a default Discord sticker\n' +
            '> Only custom guild stickers can be added\n\n' +
            '## Sticker Details\n' +
            `> **Name:** \`${sourceSticker.name}\`\n` +
            `> **Type:** \`Default Discord Sticker\``
          )
          .setColor(0xED4245)
          .setTimestamp();

        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check sticker limit
      const stickerLimit = interaction.guild.premiumTier === 0 ? 5 :
                          interaction.guild.premiumTier === 1 ? 15 :
                          interaction.guild.premiumTier === 2 ? 30 : 60;

      const currentStickers = interaction.guild.stickers.cache.size;

      if (currentStickers >= stickerLimit) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Sticker Limit Reached')
          .setDescription(
            `> This server has reached its sticker limit\n\n` +
            `## Current Limit\n` +
            `\`\`\`\n${currentStickers} / ${stickerLimit} stickers\`\`\`\n` +
            `### Solutions\n` +
            `> • Delete some stickers\n` +
            `> • Boost the server to increase the limit\n\n` +
            `### Sticker Limits by Boost Level\n` +
            `> **No Boosts:** 5 stickers\n` +
            `> **Level 1:** 15 stickers\n` +
            `> **Level 2:** 30 stickers\n` +
            `> **Level 3:** 60 stickers`
          )
          .setColor(0xED4245)
          .setTimestamp();

        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Determine the name to use
      let stickerName = customName || sourceSticker.name;
      
      // Auto-fix sticker name: replace invalid characters with underscores
      stickerName = stickerName.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      
      // Ensure name is not empty after cleaning
      if (!stickerName || stickerName.length < 2) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Invalid Sticker Name')
          .setDescription(
            '> The sticker name must contain at least **2 valid characters**\n' +
            '> *(letters, numbers, or underscores)*\n\n' +
            `### Your Input\n` +
            `\`\`\`\n${customName || sourceSticker.name}\`\`\``
          )
          .setColor(0xED4245)
          .setTimestamp();

        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Get the sticker URL
      const stickerURL = sourceSticker.url;

      // Add the sticker to the server
      const newSticker = await interaction.guild.stickers.create({
        file: stickerURL,
        name: stickerName,
        tags: sourceSticker.tags || 'custom',
        description: sourceSticker.description || `Added from another server`,
        reason: `Added by ${interaction.user.tag} via /sticker-add command`
      });

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Sticker Added Successfully')
        .setDescription(
          `> Successfully added **${stickerName}** to your server\n\n` +
          `### Sticker Name\n\`\`\`\n${stickerName}\`\`\`\n` +
          `## Details\n` +
          `> **ID:** \`${newSticker.id}\`\n` +
          `> **Format:** \`${newSticker.format === 1 ? 'PNG' : newSticker.format === 2 ? 'APNG' : newSticker.format === 3 ? 'LOTTIE' : 'GIF'}\`\n` +
          `> **Tags:** \`${newSticker.tags}\`\n` +
          (newSticker.description ? `> **Description:** ${newSticker.description}\n` : '')
        )
        .setThumbnail(stickerURL)
        .setColor(0x57F287)
        .setTimestamp()
        .setFooter({ 
          text: `${currentStickers + 1} / ${stickerLimit} stickers` 
        });

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error adding sticker:', error);

      let errorMessage = 'An error occurred while adding the sticker.';

      if (error.code === 30039) {
        errorMessage = '> Maximum number of stickers reached for this server';
      } else if (error.code === 50035) {
        errorMessage = '> Invalid sticker file or file is too large\n> *(max 512kb for PNG/APNG, max 500kb for Lottie)*';
      } else if (error.code === 50013) {
        errorMessage = '> I don\'t have permission to manage stickers\n> in this server';
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = '> Could not fetch the sticker\n> It may have been deleted or is from a private server';
      } else if (error.code === 50081) {
        errorMessage = '> Invalid sticker format\n> Only PNG, APNG, and Lottie formats are supported';
      }

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Failed to Add Sticker')
        .setDescription(
          `## Error\n${errorMessage}\n\n` +
          `### Sticker ID\n` +
          `\`\`\`\n${stickerId}\`\`\``
        )
        .setColor(0xED4245)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
