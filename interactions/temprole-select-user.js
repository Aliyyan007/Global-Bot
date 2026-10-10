const { EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder } = require("discord.js")

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-select-user',
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
            .setTitle('👤 Select User')
            .setDescription('> Select a user to assign a temporary role.\n\n**Step 1 of 2:** Select the user below')
            .setFooter({ text: 'Next: Select role to assign' })
            .setTimestamp()
        
        const userSelect = new UserSelectMenuBuilder()
            .setCustomId(`cmd{temprole-assign-user-select}-usr{${interaction.user.id}}`)
            .setPlaceholder('Select a user')
            .setMinValues(1)
            .setMaxValues(1)
        
        const row = new ActionRowBuilder().addComponents(userSelect)
        
        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: ['Ephemeral']
        })
    }
}
