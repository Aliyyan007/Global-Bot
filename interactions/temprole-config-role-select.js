const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-config-role-select',
    run: async (client, interaction) => {
        if (!interaction.isRoleSelectMenu()) return
        
        // Validate user
        const userMatch = interaction.customId.match(UserRegexp)
        if (!userMatch || userMatch[1] !== interaction.user.id) {
            return interaction.reply({
                content: client.config.emojis.NO + ' This menu is not for you!',
                flags: ['Ephemeral']
            })
        }
        
        const selectedRole = interaction.values[0]
        const role = interaction.guild.roles.cache.get(selectedRole)
        
        if (!role) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Role not found!',
                flags: ['Ephemeral']
            })
        }
        
        // Check if role is managed (bot role, integration role, etc.)
        if (role.managed) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Cannot configure managed roles (bot roles, integration roles, etc.) as temporary!',
                flags: ['Ephemeral']
            })
        }
        
        // Check if bot can manage this role
        const botMember = interaction.guild.members.me
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: client.config.emojis.NO + ` Cannot configure this role! The role must be lower than my highest role (${botMember.roles.highest.name}).`,
                flags: ['Ephemeral']
            })
        }
        
        // Check if bot has Manage Roles permission
        if (!botMember.permissions.has('ManageRoles')) {
            return interaction.reply({
                content: client.config.emojis.NO + ' I need the "Manage Roles" permission to configure temporary roles!',
                flags: ['Ephemeral']
            })
        }
        
        // Check if role is already configured
        const existing = await client.tempRoleConfigSchema.findOne({
            guildID: interaction.guildId,
            roleID: selectedRole
        })
        
        if (existing) {
            return interaction.reply({
                content: client.config.emojis.NO + ` Role ${role.name} is already configured as temporary!`,
                flags: ['Ephemeral']
            })
        }
        
        // Show duration selection menu
        const durationMenu = new StringSelectMenuBuilder()
            .setCustomId(`cmd{temprole-config-duration-select}-role{${selectedRole}}-usr{${interaction.user.id}}`)
            .setPlaceholder('⏱️ Select duration for temporary role')
            .addOptions([
                {
                    label: '10 Minutes',
                    description: 'Role expires after 10 minutes',
                    value: '600000',
                    emoji: '⏱️'
                },
                {
                    label: '1 Hour',
                    description: 'Role expires after 1 hour',
                    value: '3600000',
                    emoji: '🕐'
                },
                {
                    label: '1 Day',
                    description: 'Role expires after 1 day',
                    value: '86400000',
                    emoji: '📅'
                },
                {
                    label: '7 Days',
                    description: 'Role expires after 7 days',
                    value: '604800000',
                    emoji: '📆'
                },
                {
                    label: '30 Days',
                    description: 'Role expires after 30 days',
                    value: '2592000000',
                    emoji: '🗓️'
                },
                {
                    label: '1 Year',
                    description: 'Role expires after 1 year',
                    value: '31536000000',
                    emoji: '📊'
                },
                {
                    label: 'Custom Duration',
                    description: 'Enter a custom duration',
                    value: 'custom',
                    emoji: '✏️'
                }
            ])
        
        const backButton = new ButtonBuilder()
            .setCustomId(`cmd{temprole-config-back-to-role}-usr{${interaction.user.id}}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️')
        
        const row1 = new ActionRowBuilder().addComponents(durationMenu)
        const row2 = new ActionRowBuilder().addComponents(backButton)
        
        await interaction.update({
            content: `⏱️ **Select Duration for ${role.name}**\n\nChoose how long users should keep this role after it's assigned:`,
            components: [row1, row2]
        })
    }
}
