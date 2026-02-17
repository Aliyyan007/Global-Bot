const { ApplicationCommandType, AttachmentBuilder, Collection } = require("discord.js")
module.exports = {
    name: 'Embed to JSON',
    nameLocalizations: {
        'ru': `Эмбед в JSON`,
        'uk': `Эмбед у JSON`,
        'es-ES': `Embed a JSON`
    },
    descriptionLocalizations: {
        'ru': `Перевести embed объект в формат JSON`,
        'uk': `Перетворити ембед об'єкт у формат JSON`,
        'es-ES': `Convertir un objeto embed a formato JSON`,
        'en-US': `Transform an embed object to JSON`,
        'en-GB': `Transform an embed object to JSON`,
    },
    type: ApplicationCommandType.Message,
    dmPermission: true,
    group: `context-group`,
    cooldowns: new Collection(),
    run: async (client, interaction) => {
        const message = await interaction.channel.messages.fetch({ message: interaction.targetId, cache: false, force: true })
        if (!message.embeds.length) return interaction.reply({ content: `${client.language({ textId: "No embed messages", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        const json = []
        for (const embed of message.embeds) {
            json.push(embed.toJSON())  
        }
        const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(json, null, 2), 'utf-8'), { name:`${message.id}.json` })
        interaction.reply({ content: message.url, files: [attachment], flags: ["Ephemeral"] }) 
    }   
}