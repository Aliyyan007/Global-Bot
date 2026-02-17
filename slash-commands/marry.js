const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, Collection } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const OneRegexp = /one{(.*?)}/
module.exports = {
    name: 'marry',
    nameLocalizations: {
        'ru': `вступить-в-брак`,
        'uk': `укласти-шлюб`,
        'es-ES': `casarse`
    },
    description: 'Get married',
    descriptionLocalizations: {
        'ru': `Вступить в брак`,
        'uk': `Укласти шлюб`,
        'es-ES': `Casarse con alguien`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': `юзер`,
                'uk': `користувач`,
                'es-ES': `usuario`
            },
            description: 'User to marry',
            descriptionLocalizations: {
                'ru': `Пользователь для вступления в брак`,
                'uk': `Користувач для укладення шлюбу`,
                'es-ES': `Usuario con el que casarse`
            },
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        if (interaction.isButton()) {
            if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
            const userID = OneRegexp.exec(interaction.customId)?.[1]
            const profileOne = await client.functions.fetchProfile(client, userID, interaction.guildId)
            const profileTwo = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            if (profileTwo.marry) {
                interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You are already married", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                return interaction.message.delete().catch(e => null)
            }
            if (profileOne.marry) {
                interaction.reply({ content: `${client.config.emojis.NO} <@${profileOne.userID}> ${client.language({ textId: "is already married", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                return interaction.message.delete().catch(e => null)
            }
            profileOne.marry = profileTwo.userID
            profileOne.marryDate = new Date()
            await profileOne.save()
            profileTwo.marry = profileOne.userID
            profileTwo.marryDate = new Date()
            await profileTwo.save()
            const embed = new EmbedBuilder()
                .setDescription(`${client.config.emojis.purplebutterflies} <@${profileOne.userID}> ${profileOne.sex === "male" ? `${client.language({ textId: "got married to", guildId: interaction.guildId, locale: interaction.locale })}` : profileOne.sex === "female" ? `${client.language({ textId: "got married to (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "got married to (neutral)", guildId: interaction.guildId, locale: interaction.locale })}`} <@${profileTwo.userID}>!`)
                .setImage("https://c.tenor.com/u7B_BCacat8AAAAC/wedding-ring-engaged.gif")
            return interaction.update({ content: " ", embeds: [embed], components: [] })
        }
        const profileOne = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        let profileTwo 
        if (interaction.isChatInputCommand()) {
            profileTwo = await client.functions.fetchProfile(client, args.user, interaction.guildId)
            const member = await interaction.guild.members.fetch(args.user).catch(e => null)
            if (!member) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
            }
            if (interaction.user.id === args.user) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You cannot marry yourself", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
            if (member.user.bot) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Cannot use command with a bot", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
            if (profileTwo.marry) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This user is already married", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] }) 
        }
        const embed = new EmbedBuilder()
            .setDescription(`<@${interaction.user.id}> ${profileOne.sex === "male" ? `${client.language({ textId: "proposed marriage to", guildId: interaction.guildId, locale: interaction.locale })}` : profileOne.sex === "female" ? `${client.language({ textId: "proposed marriage to (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "proposed marriage to (neutral)", guildId: interaction.guildId, locale: interaction.locale })}`} <@${args.user}>\n${client.language({ textId: "Accept the proposal", guildId: interaction.guildId, locale: interaction.locale })}?`)
            .setImage("https://c.tenor.com/_htAAZkd2nIAAAAC/anime-kiss.gif")
        const accept_btn = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel(`${client.language({ textId: "ACCEPT", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setCustomId(`usr{${profileTwo.userID}}cmd{marry}one{${profileOne.userID}}`)
        const decline_btn = new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setLabel(`${client.language({ textId: "DECLINE", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setCustomId(`usr{${args.user}} close`)
        const first_row = new ActionRowBuilder().addComponents([accept_btn, decline_btn])
        return interaction.reply({ content: `<@${args.user}>`, embeds: [embed], components: [first_row] })
    }
}