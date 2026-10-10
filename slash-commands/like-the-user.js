const { ApplicationCommandType, Collection } = require("discord.js")
module.exports = {
    name: 'Like the user',
    nameLocalizations: {
        'ru': `Like the user`,
        'uk': `Like the user`,
        'es-ES': `Dar me gusta`
    },
    description: 'Like the user',
    descriptionLocalizations: {
        'ru': `Лайкнуть пользователя`,
        'uk': `Вподобати користувача`,
        'es-ES': `Dar me gusta al usuario`,
        'en-US': `Like the user`,
        'en-GB': `Like the user`,
    },
    type: ApplicationCommandType.User,
    dmPermission: false,
    group: `context-group`,
    cooldowns: new Collection(),
    run: async (client, interaction) => {
        const command = client.slashCommands.get("like")
        if (!command) return interaction.reply({ content: `${client.language({ textId: "Unknown command", guildId: interaction.guildId, locale: interaction.locale })} like`, flags: ["Ephemeral"] })
        command.run(client, interaction, { user: interaction.targetId })
    }   
}
