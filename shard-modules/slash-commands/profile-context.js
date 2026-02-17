const { ApplicationCommandType, Collection } = require("discord.js")
module.exports = {
    name: 'Profile',
    nameLocalizations: {
        'ru': 'Профиль',
        'uk': 'Профіль',
        'es-ES': 'Perfil'
    },
    description: 'View user\'s profile',
    descriptionLocalizations: {
        'ru': 'Посмотреть профиль пользователя',
        'uk': 'Переглянути профіль користувача',
        'es-ES': 'Ver el perfil del usuario',
        'en-US': 'View user\'s profile',
        'en-GB': 'View user\'s profile'
    },
    type: ApplicationCommandType.User,
    dmPermission: false,
    group: `context-group`,
    cooldowns: new Collection(),
    run: async (client, interaction) => {
        const command = client.slashCommands.get("profile")
        if (!command) return interaction.reply({ contnet: `Неизвестная команда profile`, flags: ["Ephemeral"] })
        command.run(client, interaction, { user: interaction.targetId })
    }
}