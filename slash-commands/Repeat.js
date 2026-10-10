const { ApplicationCommandType, Collection } = require("discord.js")
module.exports = {
    name: 'Repeat',
    nameLocalizations: {
        'ru': `Repeat`,
        'uk': `Repeat`,
        'es-ES': `Repetir mensaje`
    },
    description: 'Repeat the message',
    descriptionLocalizations: {
        'ru': `Повторить сообщение от имени бота`,
        'uk': `Повторити повідомлення від імені бота`,
        'es-ES': `Repetir el mensaje como el bot`,
        'en-US': `Repeat the message`,
        'en-GB': `Repeat the message`,
    },
    type: ApplicationCommandType.Message,
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `context-group`,
    cooldowns: new Collection(),
    run: async (client, interaction) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
        const originalMessage = await interaction.channel.messages.fetch({ message: interaction.targetId, cache: false, force: true })
        await originalMessage.channel.send({ content: originalMessage.content, embeds: originalMessage.embeds, files: originalMessage.attachments, components: originalMessage.components }).catch(e => null)
        interaction.editReply(`${client.language({ textId: "Message sent", guildId: interaction.guildId, locale: interaction.locale })}`)
    }  
}
