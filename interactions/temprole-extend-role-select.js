const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

const UserRegexp = /usr{(.*?)}/
const TargetRegexp = /target{(.*?)}/

module.exports = {
    name: 'temprole-extend-role-select',
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
        
        const targetUserID = targetMatch[1]
        const roleID = interaction.values[0]
        
        // Show duration selection menu for extension
        // Shortened custom ID to avoid 100 char limit
        const durationMenu = new StringSelectMenuBuilder()
            .setCustomId(`cmd{ext-dur}-u{${targetUserID}}-r{${roleID}}-usr{${interaction.user.id}}`)
            .setPlaceholder('⏱️ Select extension duration')
            .addOptions([
                {
                    label: '10 Minutes',
                    description: 'Extend by 10 minutes',
                    value: '600000',
                    emoji: '⏱️'
                },
                {
                    label: '1 Hour',
                    description: 'Extend by 1 hour',
                    value: '3600000',
                    emoji: '🕐'
                },
                {
                    label: '1 Day',
                    description: 'Extend by 1 day',
                    value: '86400000',
                    emoji: '📅'
                },
                {
                    label: '7 Days',
                    description: 'Extend by 7 days',
                    value: '604800000',
                    emoji: '📆'
                },
                {
                    label: '30 Days',
                    description: 'Extend by 30 days',
                    value: '2592000000',
                    emoji: '🗓️'
                },
                {
                    label: '1 Year',
                    description: 'Extend by 1 year',
                    value: '31536000000',
                    emoji: '📊'
                },
                {
                    label: 'Custom Duration',
                    description: 'Enter a custom extension duration',
                    value: 'custom',
                    emoji: '✏️'
                }
            ])
        
        const targetMember = await interaction.guild.members.fetch(targetUserID).catch(() => null)
        const role = interaction.guild.roles.cache.get(roleID)
        
        const backButton = new ButtonBuilder()
            .setCustomId(`cmd{temprole-extend-user-select}-usr{${interaction.user.id}}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️')
        
        const row1 = new ActionRowBuilder().addComponents(durationMenu)
        const row2 = new ActionRowBuilder().addComponents(backButton)
        
        await interaction.update({
            content: `⏱️ **Select Extension Duration**\n\nExtending ${role ? role.name : 'role'} for <@${targetUserID}>\n\nChoose how much time to add:`,
            components: [row1, row2]
        })
    }
}
