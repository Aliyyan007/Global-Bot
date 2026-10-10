const {
    ApplicationCommandOptionType,
    Collection,
    GuildMember,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js")
const { generateRankCard } = require('../modules/generateRankCard')

const MemberRegexp = /mbr{(.*?)}/

module.exports = {
    name: "rank",
    nameLocalizations: {
        "ru": `ранг`,
        "uk": `ранг`,
        "es-ES": `rango`
    },
    description: `View profile card`,
    descriptionLocalizations: {
        "ru": `Посмотреть карточку профиля`,
        "uk": `Переглянути картку профілю`,
        "es-ES": `Ver la tarjeta de perfil`
    },
    options: [
        {
            name: "user",
            nameLocalizations: {
                "ru": `юзер`,
                "uk": `користувач`,
                "es-ES": `usuario`
            },
            description: `View user's card profile`,
            descriptionLocalizations: {
                "ru": `Посмотреть карточку профиля пользователя`,
                "uk": `Переглянути картку профілю користувача`,
                "es-ES": `Ver la tarjeta de perfil del usuario`
            },
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        const flags = []
        if (interaction.customId?.includes("eph") || interaction.values?.[0]?.includes("eph") || args?.ephemeral) flags.push("Ephemeral")
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) {
            if (!interaction.deferred && !interaction.customId.includes("reply")) {
                await interaction.update({
                    content: interaction.message.content || " ",
                    embeds: interaction.message.embeds,
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true)
                    )]
                }).catch(() => null)
            } else if (!interaction.deferred) {
                await interaction.deferReply({ flags })
            }
        } else {
            await interaction.deferReply({ flags })
        }

        // Resolve target member
        let member
        if (args?.user) {
            member = await interaction.guild.members.fetch(args.user).catch(() => null)
        } else if (interaction.isButton() && MemberRegexp.exec(interaction.customId)) {
            member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(() => null)
        } else if (interaction.isStringSelectMenu() && (MemberRegexp.exec(interaction.customId) || MemberRegexp.exec(interaction.values[0]))) {
            member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.values[0])?.[1]).catch(() => null)
            if (!(member instanceof GuildMember)) {
                member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(() => null)
            }
        } else {
            member = interaction.member
        }

        if (!member) {
            return interaction.editReply({
                content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`,
                flags: ["Ephemeral"]
            })
        }

        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        const settings = client.cache.settings.get(interaction.guildId) || await client.functions.fetchSettings(client, interaction.guildId)

        // Rank position
        const profiles = client.cache.profiles
            .filter(e => e.guildID === interaction.guildId)
            .map(e => e)
            .sort((a, b) => b.totalxp - a.totalxp)
        const rank = profiles.findIndex(e => e.userID === profile.userID) + 1

        // Render
        const buffer = await generateRankCard({ member, profile, settings, rank })

        // Silent mention (no notification)
        const mentionContent = `<@${member.user.id}>`
        const payload = {
            content: mentionContent,
            files: [{ attachment: buffer, name: `rank_${member.user.id}.png` }],
            allowedMentions: { users: [] }
        }

        if (interaction.replied || interaction.deferred) return interaction.editReply(payload)
        return interaction.update(payload)
    }
}
