const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, Collection, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ComponentType, MessageFlags, SeparatorSpacingSize } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const MemberRegexp = /mbr{(.*?)}/
module.exports = {
    name: 'like',
    nameLocalizations: {
        'ru': `лайк`,
        'uk': `лайк`,
        'es-ES': `me-gusta`
    },
    description: 'Like the user',
    descriptionLocalizations: {
        'ru': `Лайкнуть пользователя`,
        'uk': `Вподобати користувача`,
        'es-ES': `Dar me gusta al usuario`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': `юзер`,
                'uk': `користувач`,
                'es-ES': `usuario`
            },
            description: 'User to like',
            descriptionLocalizations: {
                'ru': `Пользователь, которого хотите лайкнуть`,
                'uk': `Користувач, якого ви хочете вподобати`,
                'es-ES': `Usuario al que quieres dar me gusta`
            },
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],
    dmPermission: false,
    group: `general-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.isButton()) {
            if (interaction.user.id !== MemberRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
        }
        let mentionMember
        if (args?.user) mentionMember = await interaction.guild.members.fetch(args.user).catch(e => null)
        else if (interaction.isContextMenuCommand()) mentionMember = await interaction.guild.members.fetch(interaction.tagertId).catch(e => null)
        else if (interaction.isButton()) mentionMember = await interaction.guild.members.fetch(UserRegexp.exec(interaction.customId)?.[1]).catch(e => null)
        else mentionMember = interaction.member
        if (!mentionMember) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const settings = client.cache.settings.get(interaction.guildId)
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const targetProfile = await client.functions.fetchProfile(client, mentionMember.user.id, interaction.guildId)
        if (interaction.user.id == mentionMember.user.id || mentionMember.user.bot == true) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You cannot like yourself or a bot", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        // Check if user has already liked this specific profile (one like per user)
        if (targetProfile.usersWhoLiked?.includes(interaction.user.id)) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You already liked this user", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        // Defer the reply to prevent interaction timeout (addLike takes time due to DB operations and DM sending)
        if (!interaction.isButton()) {
            await interaction.deferReply()
        }
        const data = await client.functions.addLike(client, interaction.user.id, interaction.guildId, mentionMember.user.id, 1, interaction.channel)
        const rewards = []
        const rewards1 = []
        if (settings.xpForLike && !data.likedProfile.blockActivities?.like?.XP) rewards.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${(settings.xpForLike + (settings.xpForLike * data.likedProfile.getXpBoost())).toLocaleString()}`)
        if (settings.xpForLike && !data.likingProfile.blockActivities?.like?.XP) rewards1.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${(settings.xpForLike + (settings.xpForLike * data.likingProfile.getXpBoost())).toLocaleString()}`)
        if (settings.curForLike && !data.likedProfile.blockActivities?.like?.CUR) rewards.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** ${(settings.curForLike + (settings.curForLike * data.likedProfile.getCurBoost())).toFixed()}`)
        if (settings.curForLike && !data.likingProfile.blockActivities?.like?.CUR) rewards1.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** ${(settings.curForLike + (settings.curForLike * data.likingProfile.getCurBoost())).toFixed()}`)
        if (settings.rpForLike && !data.likedProfile.blockActivities?.like?.RP) rewards.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** ${(settings.rpForLike + (settings.rpForLike * data.likedProfile.getRpBoost())).toLocaleString()}`)
        if (settings.rpForLike && !data.likingProfile.blockActivities?.like?.RP) rewards1.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** ${(settings.rpForLike + (settings.rpForLike * data.likingProfile.getRpBoost())).toLocaleString()}`)
        const like_btn = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel(`${client.language({ textId: "LIKE BACK", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setCustomId(`mbr{${mentionMember.user.id}}cmd{like}usr{${interaction.user.id}}`)
        const first_row = new ActionRowBuilder().addComponents([like_btn])
        const container = new ContainerBuilder()
            .addTextDisplayComponents([
                new TextDisplayBuilder().setContent([
                    `<@${interaction.user.id}> ${profile.sex === "male" ? `${client.language({ textId: "liked (male)", guildId: interaction.guildId, locale: interaction.locale })}` : profile.sex === "female" ? `${client.language({ textId: "liked (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "liked (neutral)", guildId: interaction.guildId, locale: interaction.locale })}`} <@${mentionMember.user.id}>`
                ].join("\n"))
            ])
            .addSeparatorComponents(SeparatorBuilder => SeparatorBuilder.setSpacing(SeparatorSpacingSize.Large))
            .addSectionComponents([
                new SectionBuilder()
                    .setThumbnailAccessory(ThumbnailBuilder => ThumbnailBuilder.setURL(mentionMember.displayAvatarURL()))
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent([
                                `## ${mentionMember.displayName}`,
                                `${client.language({ textId: "Received", guildId: interaction.guildId, locale: interaction.locale })}:`,
                                `${client.config.emojis.heart}**${client.language({ textId: "Like", guildId: interaction.guildId, locale: interaction.locale })}** 1`,
                                rewards.join("\n"),
                                `${data.likedUserRewards ? data.likedUserRewards.join("\n") : undefined}`
                            ].filter(e => e).join("\n"))
                    ])
            ])
        container.addSeparatorComponents(SeparatorBuilder => SeparatorBuilder.setSpacing(SeparatorSpacingSize.Large))
            .addSectionComponents([
                new SectionBuilder()
                    .setThumbnailAccessory(ThumbnailBuilder => ThumbnailBuilder.setURL(interaction.member.displayAvatarURL()))
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent([
                                `## ${interaction.member.displayName}`,
                                (settings.xpForLike || settings.curForLike || settings.rpForLike) && (!data.likingProfile.blockActivities?.like?.XP || !data.likingProfile.blockActivities?.like?.CUR || !data.likingProfile.blockActivities?.like?.RP || !data.likingProfile.blockActivities?.like?.items) ? `${client.language({ textId: "Received", guildId: interaction.guildId, locale: interaction.locale })}:\n${rewards1.join("\n")}\n${data.likingUserRewards ? data.likingUserRewards.join("\n") : "" }` : undefined
                            ].filter(e => e).join("\n"))
                    ])
            ])
        if (!interaction.isButton()) {
            container.addSeparatorComponents(SeparatorBuilder => SeparatorBuilder.setSpacing(SeparatorSpacingSize.Large))
            container.addActionRowComponents(first_row)
        }
        else {
            const container = new ContainerBuilder(interaction.message.components[0].toJSON())
            container.spliceComponents(container.components.length - 2, 2)
            await interaction.update({ components: [container] })
        }
        client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "liked", guildId: interaction.guildId })} <@${mentionMember.user.id}> (${mentionMember.user.username})`)
        if (!interaction.isButton()) return interaction.editReply({ components: [container], allowedMentions: { users: [mentionMember.user.id] }, flags: [MessageFlags.IsComponentsV2] })
        else {
            return interaction.followUp({ components: [container], allowedMentions: { users: [mentionMember.user.id] }, flags: [MessageFlags.IsComponentsV2] })
        }
    }   
}