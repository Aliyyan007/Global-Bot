const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { getTempRoleConfigs, formatDuration } = require('../modules/tempRoleManager')

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-assign-user-select',
    run: async (client, interaction) => {
        if (!interaction.isUserSelectMenu()) return
        
        // Validate user
        const userMatch = interaction.customId.match(UserRegexp)
        if (!userMatch || userMatch[1] !== interaction.user.id) {
            return interaction.reply({
                content: client.config.emojis.NO + ' This menu is not for you!',
                flags: ['Ephemeral']
            })
        }
        
        await interaction.deferUpdate()
        
        const selectedUser = interaction.values[0]
        const member = await interaction.guild.members.fetch(selectedUser).catch(() => null)
        
        if (!member) {
            return interaction.followUp({
                content: client.config.emojis.NO + ' User not found in this server!',
                flags: ['Ephemeral']
            })
        }
        
        // Get available temp role configs
        const configs = await getTempRoleConfigs(client, interaction.guildId)
        
        if (configs.length === 0) {
            return interaction.followUp({
                content: client.config.emojis.NO + ' No temporary roles configured!',
                flags: ['Ephemeral']
            })
        }
        
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setTitle('🎭 Select Temporary Role')
            .setDescription(`> Assigning temporary role to ${member}\n\n**Step 2 of 2:** Select the role to assign`)
            .setFooter({ text: `${configs.length} temporary role(s) available` })
            .setTimestamp()
        
        const options = configs.slice(0, 25).map(config => {
            const role = interaction.guild.roles.cache.get(config.roleID)
            return {
                label: role ? role.name : 'Unknown Role',
                description: `Duration: ${formatDuration(config.duration)}`,
                value: config.roleID,
                emoji: '⏱️'
            }
        })
        
        const roleSelect = new StringSelectMenuBuilder()
            .setCustomId(`cmd{temprole-assign-role-select}-usr{${interaction.user.id}}-target{${selectedUser}}`)
            .setPlaceholder('Select role to assign')
            .addOptions(options)
        
        const backButton = new ButtonBuilder()
            .setCustomId(`cmd{temprole-assign-back-to-user}-usr{${interaction.user.id}}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️')
        
        const row1 = new ActionRowBuilder().addComponents(roleSelect)
        const row2 = new ActionRowBuilder().addComponents(backButton)
        
        await interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        })
    }
}
