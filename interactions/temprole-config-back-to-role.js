const { EmbedBuilder, RoleSelectMenuBuilder, ActionRowBuilder } = require("discord.js")

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-config-back-to-role',
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
            .setTitle('➕ Add Temporary Role Configuration')
            .setDescription('> Select a role to configure as temporary.\n\n**Note:** The role will be automatically removed after the duration you set.')
            .setFooter({ text: 'Step 1 of 2: Select Role' })
            .setTimestamp()
        
        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId(`cmd{temprole-config-role-select}-usr{${interaction.user.id}}`)
            .setPlaceholder('Select a role to configure')
            .setMinValues(1)
            .setMaxValues(1)
        
        const row = new ActionRowBuilder().addComponents(roleSelect)
        
        await interaction.update({
            content: null,
            embeds: [embed],
            components: [row]
        })
    }
}
