const { EmbedBuilder } = require("discord.js")
const { assignTempRole } = require('../modules/tempRoleManager')

const UserRegexp = /usr{(.*?)}/
const TargetRegexp = /target{(.*?)}/

module.exports = {
    name: 'temprole-assign-role-select',
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
        
        // Extract target user ID
        const targetMatch = interaction.customId.match(TargetRegexp)
        if (!targetMatch) {
            return interaction.reply({
                content: client.config.emojis.NO + ' Invalid configuration!',
                flags: ['Ephemeral']
            })
        }
        
        await interaction.deferUpdate()
        
        const targetUserID = targetMatch[1]
        const roleID = interaction.values[0]
        
        const member = await interaction.guild.members.fetch(targetUserID).catch(() => null)
        const role = interaction.guild.roles.cache.get(roleID)
        
        if (!member) {
            return interaction.followUp({
                content: client.config.emojis.NO + ' User not found!',
                flags: ['Ephemeral']
            })
        }
        
        if (!role) {
            return interaction.followUp({
                content: client.config.emojis.NO + ' Role not found!',
                flags: ['Ephemeral']
            })
        }
        
        // Check if bot can manage this role
        const botMember = interaction.guild.members.me
        if (role.position >= botMember.roles.highest.position) {
            return interaction.followUp({
                content: client.config.emojis.NO + ` Cannot assign this role! The role must be lower than my highest role (${botMember.roles.highest.name}).`,
                flags: ['Ephemeral']
            })
        }
        
        // Check if bot has Manage Roles permission
        if (!botMember.permissions.has('ManageRoles')) {
            return interaction.followUp({
                content: client.config.emojis.NO + ' I need the "Manage Roles" permission to assign roles!',
                flags: ['Ephemeral']
            })
        }
        
        // Check if user already has the role
        if (member.roles.cache.has(roleID)) {
            return interaction.followUp({
                content: client.config.emojis.NO + ` ${member} already has the ${role} role!`,
                flags: ['Ephemeral']
            })
        }
        
        // Get role config
        const config = await client.tempRoleConfigSchema.findOne({
            guildID: interaction.guildId,
            roleID: roleID
        })
        
        if (!config) {
            return interaction.followUp({
                content: client.config.emojis.NO + ' Role configuration not found!',
                flags: ['Ephemeral']
            })
        }
        
        // Assign temporary role
        const result = await assignTempRole(client, member, role, config.duration, interaction.user.id)
        
        if (!result.success) {
            return interaction.followUp({
                content: client.config.emojis.NO + ` Failed to assign role: ${result.error}`,
                flags: ['Ephemeral']
            })
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Temporary Role Assigned')
            .setDescription(`> Successfully assigned ${role} to ${member}`)
            .addFields(
                { name: '⏱️ Duration', value: `\`${result.duration}\``, inline: true },
                { name: '📅 Expires', value: `<t:${Math.floor(result.expiresAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Role will be automatically removed when it expires' })
            .setTimestamp()
        
        await interaction.editReply({
            embeds: [embed]
        })
    }
}
