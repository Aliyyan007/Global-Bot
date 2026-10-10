const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js")

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-back',
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
        
        // Dismiss the ephemeral message
        await interaction.update({
            content: '✅ Returned to main menu',
            embeds: [],
            components: []
        })
        
        // Update main panel to default state
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
            .setDescription('```yaml\nManage roles that automatically expire after set durations\n```\n**Features:**\n> • Configure roles as temporary with default durations\n> • Assign temporary roles to users\n> • Extend role durations\n> • Monitor active temporary roles\n> • View role expiration times')
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp()
        
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
                    emoji: '👥'
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
        
        const row = new ActionRowBuilder().addComponents(selectMenu)
        
        await interaction.message.edit({
            embeds: [embed],
            components: [row]
        })
    }
}
