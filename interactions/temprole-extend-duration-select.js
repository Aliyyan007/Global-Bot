const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js")
const { extendTempRole } = require('../modules/tempRoleManager')

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'ext-dur',
    run: async (client, interaction) => {
        if (!interaction.isStringSelectMenu()) return
        
        // Validate user
        const userMatch = interaction.customId.match(UserRegexp)
        if (!userMatch || userMatch[1] !== interaction.user.id) {
            return interaction.reply({
                content: client.config.emojis.NO + ' This menu is not for you!',
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
        const selectedValue = interaction.values[0]
        
        // Handle custom duration - show modal (shortened custom ID)
        if (selectedValue === 'custom') {
            const modal = new ModalBuilder()
                .setCustomId(`cmd{ext-modal}-u{${targetUserID}}-r{${roleID}}-usr{${interaction.user.id}}`)
                .setTitle('Custom Extension Duration')
            
            const durationInput = new TextInputBuilder()
                .setCustomId('duration')
                .setLabel('Enter duration (e.g., 30min, 2h, 1d)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('1d')
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(10)
            
            const row = new ActionRowBuilder().addComponents(durationInput)
            modal.addComponents(row)
            
            return interaction.showModal(modal)
        }
        
        // Handle preset duration
        const extensionDuration = parseInt(selectedValue, 10)
        
        if (isNaN(extensionDuration) || extensionDuration <= 0) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Invalid duration value!',
                flags: ['Ephemeral']
            })
        }
        
        // Validate duration range (10 minutes to 1 year)
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
        
        await interaction.deferUpdate()
        
        try {
            const role = interaction.guild.roles.cache.get(roleID)
            const targetMember = await interaction.guild.members.fetch(targetUserID).catch(() => null)
            
            if (!role) {
                return interaction.editReply({
                    content: client.config.emojis.NO + ' Role not found!',
                    components: []
                })
            }
            
            if (!targetMember) {
                return interaction.editReply({
                    content: client.config.emojis.NO + ' User not found!',
                    components: []
                })
            }
            
            // Extend the temporary role
            const result = await extendTempRole(client, interaction.guildId, targetUserID, roleID, extensionDuration)
            
            if (!result.success) {
                return interaction.editReply({
                    content: client.config.emojis.NO + ` Failed to extend role: ${result.error}`,
                    components: []
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
                content: client.config.emojis.NO + ` Failed to extend role: ${error.message}`,
                components: []
            })
        }
    }
}
