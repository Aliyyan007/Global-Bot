const { ApplicationCommandOptionType, Collection } = require("discord.js")
module.exports = {
    name: 'achievement-take-from-user',
    nameLocalizations: {
        'ru': `забрать-достижение`,
        'uk': `забрати-досягнення`,
        'es-ES': `quitar-logro`
    },
    description: 'Take an achievement from user',
    descriptionLocalizations: {
        'ru': `Забрать достижение у пользователя`,
        'uk': `Забрати досягнення у користувача`,
        'es-ES': `Quitar un logro al usuario`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': 'юзер',
                'uk': 'користувач',
                'es-ES': 'usuario'
            },
            description: 'User to take an achievement',
            descriptionLocalizations: {
                'ru': 'Пользователь, у которого забрать достижение',
                'uk': 'Користувач, у якого забрати досягнення',
                'es-ES': 'Usuario al que quitar el logro'
            },
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'achievement',
            nameLocalizations: {
                'ru': 'достижение',
                'uk': 'досягнення',
                'es-ES': 'logro'
            },
            description: 'Achievement name or ID',
            descriptionLocalizations: {
                'ru': 'Название достижения или его ID',
                'uk': 'Назва досягнення або його ID',
                'es-ES': 'Nombre del logro o su ID'
            },
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
        const member = await interaction.guild.members.fetch(args.user).catch(e => null)
        if (!member) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "User with ID", guildId: interaction.guildId, locale: interaction.locale })} **${args.user}** ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}.` })
        }
        if (member.user.bot) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You cannot use this command for a bot", guildId: interaction.guildId, locale: interaction.locale })}.` })
        }
        const profile = await client.functions.fetchProfile(client, args.user, interaction.guildId)
        const achievement = client.cache.achievements.find(e => e.guildID === interaction.guildId && (e.id === args.achievement || e.name === args.achievement))
        if (!achievement) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Achievement with name or ID", guildId: interaction.guildId, locale: interaction.locale })} **${args.achievement}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`})
        }
        if (!profile.achievements?.find(e => e.achievmentID == achievement.id)) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "User does not have achievement", guildId: interaction.guildId, locale: interaction.locale })}: ${achievement.displayEmoji}**${achievement.name}**`})
        await profile.delAchievement(achievement, true)
        delete client.tempAchievements[args.user]
        return interaction.editReply({ content: `${client.config.emojis.DONE} ${client.language({ textId: "Achievement removed from user", guildId: interaction.guildId, locale: interaction.locale })}: ${achievement.displayEmoji}**${achievement.name}**`})
    }
}