const { EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-extend-select-user',
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
        
        await interaction.reply({
            embeds: [embed],
            components: [row1],
            flags: ['Ephemeral']
        })
    }
}
