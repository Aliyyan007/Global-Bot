const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js")
const { formatDuration } = require('../modules/tempRoleManager')

const UserRegexp = /usr{(.*?)}/
const RoleRegexp = /role{(.*?)}/

module.exports = {
    name: 'temprole-config-duration-select',
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
        
        // Extract role ID
        const roleMatch = interaction.customId.match(RoleRegexp)
        if (!roleMatch) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Invalid configuration!',
                flags: ['Ephemeral']
            })
        }
        
        const roleID = roleMatch[1]
        const selectedValue = interaction.values[0]
        
        // Handle custom duration - show modal
        if (selectedValue === 'custom') {
            const modal = new ModalBuilder()
                .setCustomId(`cmd{temprole-config-duration-modal}-role{${roleID}}-usr{${interaction.user.id}}`)
                .setTitle('Custom Duration')
            
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
        const duration = parseInt(selectedValue, 10)
        
        if (isNaN(duration) || duration <= 0) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Invalid duration value!',
                flags: ['Ephemeral']
            })
        }
        
        // Validate duration range (10 minutes to 1 year)
        const minDuration = 600000 // 10 minutes
        const maxDuration = 31536000000 // 1 year
        
        if (duration < minDuration) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Duration must be at least 10 minutes!',
                flags: ['Ephemeral']
            })
        }
        
        if (duration > maxDuration) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Duration cannot exceed 1 year!',
                flags: ['Ephemeral']
            })
        }
        
        await interaction.deferUpdate()
        
        try {
            const role = interaction.guild.roles.cache.get(roleID)
            
            if (!role) {
                return interaction.editReply({
                    content: client.config.emojis.NO + ' Role not found!',
                    components: []
                })
            }
            
            // Save to database
            await client.tempRoleConfigSchema.create({
                guildID: interaction.guildId,
                roleID: roleID,
                duration: duration,
                createdBy: interaction.user.id,
                enabled: true
            })
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Temporary Role Configured')
                .setDescription(`> Role ${role} has been configured as temporary.`)
                .addFields(
                    { name: '⏱️ Duration', value: `\`${formatDuration(duration)}\``, inline: true },
                    { name: '📊 Status', value: '✅ Enabled', inline: true }
                )
                .setFooter({ text: 'Users assigned this role will have it automatically removed after the duration' })
                .setTimestamp()
            
            await interaction.editReply({
                embeds: [embed],
                components: []
            })
        } catch (error) {
            console.error('[TempRole] Error saving config:', error)
            
            // Check for duplicate key error (E11000)
            if (error.code === 11000 || error.message.includes('duplicate')) {
                return interaction.editReply({
                    content: client.config.emojis.NO + ' This role is already configured as temporary!',
                    components: []
                })
            }
            
            await interaction.editReply({
                content: client.config.emojis.NO + ` Failed to save configuration: ${error.message}`,
                components: []
            })
        }
    }
}
