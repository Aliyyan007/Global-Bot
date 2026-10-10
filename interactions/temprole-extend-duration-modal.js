const { EmbedBuilder } = require("discord.js")
const { parseCooldown } = require('../handler/cooldownParser')
const { extendTempRole, formatDuration } = require('../modules/tempRoleManager')

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'ext-modal',
    run: async (client, interaction) => {
        if (!interaction.isModalSubmit()) return
        
        // Validate user
        const userMatch = interaction.customId.match(UserRegexp)
        if (!userMatch || userMatch[1] !== interaction.user.id) {
            return interaction.reply({
                content: client.config.emojis.NO + ' This modal is not for you!',
                flags: ['Ephemeral']
            })
        }
        
        // Extract target user ID and role ID (using shortened patterns)
        const targetUserMatch = interaction.customId.match(/u{(.*?)}/)
        const roleMatch = interaction.customId.match(/r{(.*?)}/)
        
        if (!targetUserMatch || !roleMatch) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Invalid configuration!',
                flags: ['Ephemeral']
            })
        }
        
        const targetUserID = targetUserMatch[1]
        const roleID = roleMatch[1]
        
        const role = interaction.guild.roles.cache.get(roleID)
        const targetMember = await interaction.guild.members.fetch(targetUserID).catch(() => null)
        
        if (!role) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Role not found!',
                flags: ['Ephemeral']
            })
        }
        
        if (!targetMember) {
            return interaction.reply({
                content: client.config.emojis.NO + ' User not found!',
                flags: ['Ephemeral']
            })
        }
        
        const durationStr = interaction.fields.getTextInputValue('duration')
        
        // Parse duration using cooldownParser
        const extensionDuration = parseCooldown(durationStr)
        
        if (extensionDuration === null) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Invalid duration format! Use: 30min, 2h, 1d',
                flags: ['Ephemeral']
            })
        }
        
        // Validate duration (min 10 minutes, max 1 year)
        const minDuration = 600000 // 10 minutes
        const maxDuration = 31536000000 // 1 year
        
        if (extensionDuration < minDuration) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Extension duration must be at least 10 minutes!',
                flags: ['Ephemeral']
            })
        }
        
        if (extensionDuration > maxDuration) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Extension duration cannot exceed 1 year!',
                flags: ['Ephemeral']
            })
        }
        
        await interaction.deferReply({ flags: ['Ephemeral'] })
        
        try {
            // Extend the temporary role
            const result = await extendTempRole(client, interaction.guildId, targetUserID, roleID, extensionDuration)
            
            if (!result.success) {
                return interaction.editReply({
                    content: client.config.emojis.NO + ` Failed to extend role: ${result.error}`
                })
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Temporary Role Extended')
                .setDescription(`> Extended ${role} for <@${targetUserID}>`)
                .addFields(
                    { name: '⏱️ Extension', value: `\`${result.extensionDuration}\``, inline: true },
                    { name: '📅 New Expiry', value: `<t:${Math.floor(result.newExpiresAt.getTime() / 1000)}:R>`, inline: true }
                )
                .setTimestamp()
            
            await interaction.editReply({
                embeds: [embed]
            })
        } catch (error) {
            console.error('[TempRole] Error extending role:', error)
            await interaction.editReply({
                content: client.config.emojis.NO + ` Failed to extend role: ${error.message}`
            })
        }
    }
}
