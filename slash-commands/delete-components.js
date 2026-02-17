const { ApplicationCommandType, Collection } = require("discord.js")
module.exports = {
    name: 'Delete components',
    nameLocalizations: {
        'ru': `Удалить компоненты`,
        'uk': `Видалити компоненти`, 
        'es-ES': `Eliminar componentes`
    },
    description: 'Delete components from message',
    descriptionLocalizations: {
        'ru': `Удалить компоненты из сообщения`,
        'uk': `Видалити компоненти з повідомлення`,
        'es-ES': `Eliminar componentes del mensaje`,
        'en-US': `Delete components from message`,
        'en-GB': `Delete components from message`,
    },
    type: ApplicationCommandType.Message,
    dmPermission: false,
    defaultMemberPermissions: "Administrator",
    group: `context-group`,
    cooldowns: new Collection(),
    run: async (client, interaction) => {
        if (!interaction.channel) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "I may not have access to this channel", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        if (!interaction.channel.messages) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "I may not have access to messages in this channel", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        const message = await interaction.channel.messages.fetch({ message: interaction.targetId, cache: false, force: true }).catch(e => null)
        if (!message) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Could not find message", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        if (message.author.id !== client.user.id) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This message is not mine", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        if (!message.components?.length) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This message has no components", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        if (!message.editable) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "I cannot edit this message", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        message.edit({ content: message.content, embeds: message.embeds, files: message.attachments, components: [] })
        return interaction.reply({ content: `${client.config.emojis.YES}${client.language({ textId: "Components were removed from message", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
    }   
}