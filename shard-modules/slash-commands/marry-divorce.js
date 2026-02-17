const { EmbedBuilder, Collection } = require("discord.js")
module.exports = {
    name: 'marry-divorce',
    nameLocalizations: {
        'ru': `расторгнуть-брак`,
        'uk': `розірвати-шлюб`,
        'es-ES': `divorciarse`
    },
    description: 'Divorce a marriage',
    descriptionLocalizations: {
        'ru': `Расторгнуть брак`,
        'uk': `Розірвати шлюб`,
        'es-ES': `Divorciarse de un matrimonio`
    },
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction) => {
        const profileOne = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if (!profileOne.marry) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You are not married", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        const marriedId = profileOne.marry
        const profileTwo = await client.functions.fetchProfile(client, marriedId, interaction.guildId)
        profileOne.marry = undefined
        profileOne.marryDate = undefined
        await profileOne.save()
        if (profileTwo) {
            profileTwo.marry = undefined
            profileTwo.marryDate = undefined
            await profileTwo.save()
        }
        const embed = new EmbedBuilder()
        embed.setDescription(`<@${interaction.user.id}> ${profileOne.sex === "male" ? `${client.language({ textId: "divorced (male)", guildId: interaction.guildId, locale: interaction.locale })}` : profileOne.sex === "female" ? `${client.language({ textId: "divorced (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "divorced", guildId: interaction.guildId, locale: interaction.locale })}`} ${client.language({ textId: "marriage with", guildId: interaction.guildId, locale: interaction.locale })} <@${marriedId}>!`)
        embed.setImage("https://c.tenor.com/A0g9Rrx4aNsAAAAC/sad-angry.gif")
        return interaction.reply({ content: `<@${marriedId}>`, embeds: [embed] })
    }
}