const { Collection } = require("discord.js")

module.exports = {
    name: "profile-edit",
    nameLocalizations: {
        "ru": "профиль-редактировать",
        "uk": "профіль-редагувати",
        "es-ES": "perfil-editar"
    },
    description: `Edit your profile settings`,
    descriptionLocalizations: {
       "ru": "Редактировать настройки профиля",
       "uk": "Редагувати налаштування профілю",
       "es-ES": "Editar configuración del perfil"
    },
    options: [
        {
            name: 'ephemeral',
            nameLocalizations: {
                'ru': "эфемерный",
                'uk': "ефемерний",
                'es-ES': "efímero"
            },
            description: 'Message visible only for you',
            descriptionLocalizations: {
                'ru': "Сообщение видно только тебе",
                'uk': "Повідомлення видно тільки вам",
                'es-ES': "Mensaje visible solo para ti"
            },
            type: 5, // ApplicationCommandOptionType.Boolean
            required: false
        }
    ],
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        // Get the profile command and run it with editMode: true
        // This will show the profile with the settings menu
        const profileCommand = client.slashCommands.get('profile')
        
        if (!profileCommand) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} Profile command not found`, 
                flags: ["Ephemeral"] 
            })
        }

        // Extract ephemeral option from interaction if it's a chat input command
        const ephemeralOption = interaction.isChatInputCommand() ? interaction.options.getBoolean('ephemeral') : args?.ephemeral

        // Run the profile command with editMode flag to show settings menu
        await profileCommand.run(client, interaction, { 
            ...args,
            editMode: true,
            ephemeral: ephemeralOption
        })
    }
}
