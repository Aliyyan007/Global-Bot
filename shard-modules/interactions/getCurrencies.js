const { AttachmentBuilder } = require("discord.js")
module.exports = {
    name: `getCurrencies`,
    run: async (client, interaction) => {
        let currencies
        try {
            currencies = await fetch(`https://api.coinbase.com/v2/currencies`).then(response => response.json())
        } catch (err) {
            return interaction.reply({ conent: `${client.config.emojis.NO}**${client.language({ textId: "An error occurred, please try again later", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        }
        currencies = currencies.data.map(e => `${e.id} - ${e.name}`).join("\n")
        return interaction.reply({ files: [new AttachmentBuilder().setFile(Buffer.from(currencies, "utf8")).setName("currencies.txt")], flags: ["Ephemeral"] })
    }
}