const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { getUserTempRoles, formatDuration } = require('../modules/tempRoleManager')

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-extend-user-select',
    run: async (client, interaction) => {
        // Handle both UserSelectMenu and Button (for back navigation)
        if (!interaction.isUserSelectMenu() && !interaction.isButton()) return
        
        // If it's a button, show the user selection again
        if (interaction.isButton()) {
            const userMatch = interaction.customId.match(/usr{(.*?)}/)
            if (!userMatch || userMatch[1] !== interaction.user.id) {
                return interaction.reply({
                    content: client.config.emojis.NO + ' This button is not for you!',
                    flags: ['Ephemeral']
                })
            }
            
            const embed = new EmbedBuilder()
                .setColor(3093046)
                .setTitle('👤 Select User to Extend')
                .setDescription('> Select a user whose temporary role duration you want to extend.\n\n**Step 1 of 3:** Select the user')
                .setFooter({ text: 'Next: Select role to extend' })
                .setTimestamp()
            
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId(`cmd{temprole-extend-user-select}-usr{${interaction.user.id}}`)
                .setPlaceholder('Select a user')
                .setMinValues(1)
                .setMaxValues(1)
            
            const row1 = new ActionRowBuilder().addComponents(userSelect)
            
            return interaction.update({
                embeds: [embed],
                components: [row1]
            })
        }
        
        // Original user select menu logic
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
        
        // Get user's temp roles
        const assignments = await getUserTempRoles(client, interaction.guildId, selectedUser)
        
        if (assignments.length === 0) {
            return interaction.followUp({
                content: client.config.emojis.NO + ` ${member} has no active temporary roles!`,
                flags: ['Ephemeral']
            })
        }
        
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setTitle('🎭 Select Role to Extend')
            .setDescription(`> Extending temporary role for ${member}\n\n**Step 2 of 3:** Select the role to extend`)
            .setFooter({ text: `${assignments.length} temporary role(s) active` })
            .setTimestamp()
        
        const options = assignments.map(assignment => {
            const role = interaction.guild.roles.cache.get(assignment.roleID)
            const timeLeft = assignment.expiresAt.getTime() - Date.now()
            return {
                label: role ? role.name : 'Unknown Role',
                description: `Expires: ${formatDuration(timeLeft)} remaining`,
                value: assignment.roleID,
                emoji: '⏱️'
            }
        })
        
        const roleSelect = new StringSelectMenuBuilder()
            .setCustomId(`cmd{temprole-extend-role-select}-usr{${interaction.user.id}}-target{${selectedUser}}`)
            .setPlaceholder('Select role to extend')
            .addOptions(options)
        
        const backButton = new ButtonBuilder()
            .setCustomId(`cmd{temprole-extend-user-select}-usr{${interaction.user.id}}`)
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
