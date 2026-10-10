const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js")
const { getActiveTempRoles } = require('../modules/tempRoleManager')

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-refresh-active',
    run: async (client, interaction) => {
        if (!interaction.isButton()) return
        
        // Validate user
        const userMatch = interaction.customId.match(UserRegexp)
        if (!userMatch || userMatch[1] !== interaction.user.id) {
            return interaction.reply({
                content: client.config.emojis.NO + ' This button is not for you!',
                flags: ['Ephemeral']
            })
        }
        
        const assignments = await getActiveTempRoles(client, interaction.guildId)
        
        // Build main panel embed with details
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
            .setTitle('👥 Active Temporary Role Assignments')
            .setDescription('```yaml\nUsers with temporary roles that will expire automatically\n```')
            .setTimestamp()
        
        if (assignments.length > 0) {
            const grouped = {}
            for (const assignment of assignments) {
                if (!grouped[assignment.roleID]) {
                    grouped[assignment.roleID] = []
                }
                grouped[assignment.roleID].push(assignment)
            }
            
            let fieldCount = 0
            for (const [roleID, roleAssignments] of Object.entries(grouped)) {
                if (fieldCount >= 25) break
                
                const role = interaction.guild.roles.cache.get(roleID)
                if (!role) continue
                
                const userList = roleAssignments.map(a => {
                    return `> <@${a.userID}> • Expires <t:${Math.floor(a.expiresAt.getTime() / 1000)}:R>`
                }).join('\n')
                
                embed.addFields({
                    name: `${role.name} • ${roleAssignments.length} user${roleAssignments.length > 1 ? 's' : ''}`,
                    value: userList,
                    inline: false
                })
                fieldCount++
            }
            
            embed.setFooter({ text: `Total: ${assignments.length} active assignment(s) • Select an action above` })
        } else {
            embed.addFields({
                name: '❌ No Active Assignments',
                value: '```diff\n- No users currently have temporary roles assigned\n+ Assign roles from the main menu\n```',
                inline: false
            })
            embed.setFooter({ text: 'Select an action above' })
        }
        
        // Create main select menu (always visible)
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`cmd{temprole-manager-menu}-usr{${interaction.user.id}}`)
            .setPlaceholder('🎯 Select an action...')
            .addOptions([
                {
                    label: 'Configure Temp Roles',
                    description: 'Set roles as temporary with durations',
                    value: 'configure',
                    emoji: '📋'
                },
                {
                    label: 'View Active Assignments',
                    description: 'See all active temporary role assignments',
                    value: 'active',
                    emoji: '👥',
                    default: true
                },
                {
                    label: 'Assign Temp Role',
                    description: 'Assign a temporary role to a user',
                    value: 'assign',
                    emoji: '➕'
                },
                {
                    label: 'Extend Role Duration',
                    description: 'Extend temporary role expiration',
                    value: 'extend',
                    emoji: '⏰'
                },
                {
                    label: 'Remove Configuration',
                    description: 'Remove temp role configurations',
                    value: 'remove',
                    emoji: '🗑️'
                },
                {
                    label: 'View Statistics',
                    description: 'View temporary role statistics',
                    value: 'stats',
                    emoji: '📊'
                }
            ])
        
        const first_row = new ActionRowBuilder().addComponents(selectMenu)
        
        // Add refresh button in second row
        const refreshButton = new ButtonBuilder()
            .setCustomId(`cmd{temprole-refresh-active}-usr{${interaction.user.id}}`)
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄')
        
        const second_row = new ActionRowBuilder().addComponents(refreshButton)
        
        // Update the main panel (not ephemeral)
        await interaction.update({
            embeds: [embed],
            components: [first_row, second_row]
        })
    }
}
