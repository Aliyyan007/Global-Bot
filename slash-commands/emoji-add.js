/**
 * Emoji Add Slash Command
 * Allows users to add emojis from other servers to their own server
 * Requires: Manage Emojis and Stickers permission
 */

const { 
  PermissionFlagsBits, 
  ApplicationCommandOptionType,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  name: 'emoji-add',
  description: 'Add an emoji from another server to your server',
  default_member_permissions: String(PermissionFlagsBits.ManageEmojisAndStickers),
  dm_permission: false,
  options: [
    {
      name: 'name',
      description: 'The name of the emoji',
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 32,
      min_length: 2
    },
    {
      name: 'emoji',
      description: 'The emoji to add (use an emoji from another server)',
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],

  run: async (client, interaction, args) => {
    await interaction.deferReply({ flags: 64 }); // 64 = Ephemeral flag

    const name = interaction.options.getString('name');
    const emojiInput = interaction.options.getString('emoji');

    // Auto-fix emoji name: replace invalid characters with underscores
    const fixedName = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    
    // Ensure name is not empty after cleaning
    if (!fixedName || fixedName.length < 2) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Invalid Emoji Name')
        .setDescription(
          '> The emoji name must contain at least **2 valid characters**\n' +
          '> *(letters, numbers, or underscores)*\n\n' +
          `### Your Input\n` +
          `\`\`\`\n${name}\`\`\``
        )
        .setColor(0xED4245)
        .setTimestamp();

      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Missing Permissions')
        .setDescription(
          '> I need the **Manage Emojis and Stickers** permission\n' +
          '> to add emojis to this server.\n\n' +
          '## Required Permission\n' +
          '`Manage Emojis and Stickers`'
        )
        .setColor(0xED4245)
        .setTimestamp();

      return interaction.editReply({ embeds: [errorEmbed] });
    }

    let emojiURL;
    let isAnimated = false;

    // Parse emoji from input - Check for custom emoji first
    const customEmojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);
    
    if (customEmojiMatch) {
      // Custom Discord emoji
      const emojiId = customEmojiMatch[2];
      isAnimated = emojiInput.startsWith('<a:');
      emojiURL = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;
    } else {
      // Try to parse as Unicode emoji
      const unicodeEmoji = emojiInput.trim();
      
      // Convert emoji to codepoints
      const codePoints = [];
      for (const char of unicodeEmoji) {
        const codePoint = char.codePointAt(0);
        if (codePoint) {
          codePoints.push(codePoint.toString(16));
        }
      }

      if (codePoints.length === 0) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Invalid Emoji')
          .setDescription(
            '> Please provide a valid emoji to add to your server\n\n' +
            '## Supported Formats\n' +
            '### Custom Emoji\n' +
            '```\n:emoji_name: from another server\n```\n' +
            '### Unicode Emoji\n' +
            '```\n😀 🎉 ❤️ 🔥 👍\n```'
          )
          .setColor(0xED4245)
          .setTimestamp();

        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Use Twemoji CDN for Unicode emojis
      const emojiCode = codePoints.join('-');
      emojiURL = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${emojiCode}.png`;
    }

    try {
      // Check emoji limit
      const emojiLimit = interaction.guild.premiumTier === 0 ? 50 :
                         interaction.guild.premiumTier === 1 ? 100 :
                         interaction.guild.premiumTier === 2 ? 150 : 250;

      const currentEmojis = interaction.guild.emojis.cache.filter(e => e.animated === isAnimated).size;

      if (currentEmojis >= emojiLimit) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Emoji Limit Reached')
          .setDescription(
            `> This server has reached its **${isAnimated ? 'animated' : 'static'}** emoji limit\n\n` +
            `## Current Limit\n` +
            `\`\`\`\n${currentEmojis} / ${emojiLimit} emojis\`\`\`\n` +
            `### Solutions\n` +
            `> • Delete some ${isAnimated ? 'animated' : 'static'} emojis\n` +
            `> • Boost the server to increase the limit`
          )
          .setColor(0xED4245)
          .setTimestamp();

        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Add the emoji to the server
      const newEmoji = await interaction.guild.emojis.create({
        attachment: emojiURL,
        name: fixedName,
        reason: `Added by ${interaction.user.tag} via /emoji-add command`
      });

      const emojiType = customEmojiMatch ? (newEmoji.animated ? 'Animated' : 'Static') : 'Unicode (converted to static)';

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Emoji Added Successfully')
        .setDescription(
          `# ${newEmoji}\n` +
          `> Successfully added **:${fixedName}:** to your server\n\n` +
          `### Emoji Name\n\`\`\`\n${fixedName}\`\`\`\n` +
          `## Details\n` +
          `> **ID:** \`${newEmoji.id}\`\n` +
          `> **Type:** \`${emojiType}\``
        )
        .setThumbnail(emojiURL)
        .setColor(0x57F287)
        .setTimestamp()
        .setFooter({ 
          text: `${currentEmojis + 1} / ${emojiLimit} ${isAnimated ? 'animated' : 'static'} emojis` 
        });

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error adding emoji:', error);

      let errorMessage = 'An error occurred while adding the emoji.';

      if (error.code === 30008) {
        errorMessage = '> Maximum number of emojis reached for this server';
      } else if (error.code === 50035) {
        errorMessage = '> Invalid emoji name or file is too large\n> *(max 256kb)*';
      } else if (error.code === 50013) {
        errorMessage = '> I don\'t have permission to manage emojis\n> in this server';
      } else if (error.message.includes('fetch')) {
        errorMessage = '> Could not fetch the emoji\n> It may have been deleted or is from a private server';
      }

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Failed to Add Emoji')
        .setDescription(
          `## Error\n${errorMessage}\n\n` +
          `### Emoji Details\n` +
          `> **Name:** \`${fixedName}\`\n` +
          `> **Type:** \`${isAnimated ? 'Animated' : 'Static'}\``
        )
        .setColor(0xED4245)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};
