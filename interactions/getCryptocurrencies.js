const { AttachmentBuilder } = require("discord.js")
module.exports = {
    name: `getCryptocurrencies`,
    run: async (client, interaction) => {
        let currencies
        try {
            currencies = await fetch(`https://api.coinbase.com/v2/currencies/crypto`).then(response => response.json())
        } catch (err) {
            return interaction.reply({ conent: `${client.config.emojis.NO}**${client.language({ textId: "An error occurred, please try again later", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        }
        currencies = currencies.data.map(e => `${e.code} - ${e.name}`).join("\n")
        return interaction.reply({ files: [new AttachmentBuilder().setFile(Buffer.from(currencies, "utf8")).setName("cryptocurrencies.txt")], flags: ["Ephemeral"] })
    }
}