const { ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, ActionRowBuilder, Collection, LabelBuilder } = require("discord.js")
module.exports = {
    name: 'Edit message',
    nameLocalizations: {
        'ru': `Изменить сообщение`,
        'uk': `Редагувати повідомлення`,
        'es-ES': `Editar mensaje`,
    },
    description: 'Edit content of message',
    descriptionLocalizations: {
        'ru': `Изменить содержимое сообщение`,
        'uk': `Змінити вміст повідомлення`,
        'es-ES': `Editar el contenido del mensaje`,
        'en-US': `Edit content of message`,
        'en-GB': `Edit content of message`,
    },
    type: ApplicationCommandType.Message,
    dmPermission: false,
    defaultMemberPermissions: "Administrator",
    group: `context-group`,
    cooldowns: new Collection(),
    run: async (client, interaction) => {
        const message = await interaction.channel.messages.fetch({ message: interaction.targetId, cache: false, force: true }).catch(e => null)
        if (!message) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Could not find message", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        if (message.author.id !== client.user.id) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This message is not mine", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        if (!message.editable) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "I cannot edit this message", guildId: interaction.guildId })}.`, flags: ["Ephemeral"] })
        const modal = new ModalBuilder()
            .setCustomId("edit")
            .setTitle(`${client.language({ textId: "Edit message content", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setLabelComponents([
                new LabelBuilder()
                    .setLabel(`${client.language({ textId: "Message", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId("message")
                            .setRequired(!message.embeds.length)
                            .setStyle(TextInputStyle.Paragraph)
                            .setMaxLength(2000)
                            .setValue(message.content?.slice(0, 2000) || "")
                    ),
            ])
        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
        const filter = (i) => i.customId === 'edit' && i.user.id === interaction.user.id
        interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
        if (interaction && interaction.type === InteractionType.ModalSubmit) {
            const modalArgs = {}
            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
            message.edit({ content: modalArgs.message.length ? modalArgs.message : " ", embeds: message.embeds, files: message.attachments, components: message.components })
        } else return
        return interaction.deferUpdate().catch(e => null)
    }   
}