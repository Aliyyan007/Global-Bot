const { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ApplicationCommandOptionType, Collection, GuildMember } = require("discord.js")
const { RewardType, AchievementType } = require("../enums")
const MemberRegexp = /mbr{(.*?)}/
const UserRegexp = /usr{(.*?)}/
const LimitRegexp = /lim{(.*?)}/
module.exports = {
    name: 'achievements',
    nameLocalizations: {
        'ru': `достижения`,
        'uk': `досягнення`,
        'es-ES': `logros`
    },
    description: 'View achievements',
    descriptionLocalizations: {
        'ru': `Просмотр достижений`,
        'uk': `Перегляд досягнень`,
        'es-ES': `Ver logros`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': `юзер`,
                'uk': `користувач`,
                'es-ES': `usuario`
            },
            description: 'User to view achievements',
            descriptionLocalizations: {
                'ru': `Просмотр достижений пользователя`,
                'uk': `Перегляд досягнень користувача`,
                'es-ES': `Ver logros del usuario`
            },
            type: ApplicationCommandOptionType.User,
            required: false
        },
        {
            name: 'ephemeral',
            nameLocalizations: {
                'ru': `эфемерный`,
                'uk': `ефемерний`,
                'es-ES': `efímero`
            },
            description: 'Message visible only for you',
            descriptionLocalizations: {
                'ru': `Сообщение видно только тебе`,
                'uk': `Повідомлення видно тільки тобі`,
                'es-ES': `El mensaje solo es visible para ti`
            },
            type: ApplicationCommandOptionType.Boolean
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
        let components = interaction.message?.components
        const flags = []
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || args?.ephemeral) flags.push("Ephemeral")
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) {
            // Allow anyone to use achievements from profile-menu
            const isFromProfileMenu = interaction.isStringSelectMenu() && interaction.customId.includes("profile-menu")
            if (!isFromProfileMenu && UserRegexp.exec(interaction.customId) && interaction.user.id !== UserRegexp.exec(interaction.customId)[1]) return interaction.deferUpdate().catch(e => null)
            // Skip update if already deferred (from UCP buttons)
            if (!interaction.deferred && !interaction.customId.includes("reply") && !interaction.values?.[0].includes("reply")) await interaction.update({ content: "# ⏳", embeds: [], components: [], flags })
            else if (!interaction.deferred) await interaction.deferReply({ flags })
        } else await interaction.deferReply({ flags })
        let min = 0
        let limit = 10
        let member
        if (args?.user) member = await interaction.guild.members.fetch(args.user).catch(e => null)
        else if (interaction.isButton() && MemberRegexp.exec(interaction.customId)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(e => null)
        else if (interaction.isStringSelectMenu() && (MemberRegexp.exec(interaction.customId) || MemberRegexp.exec(interaction.values[0]))) {
            member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.values[0])?.[1]).catch(e => null)
            if (!(member instanceof GuildMember)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(e => null)
        }
        else member = interaction.member
        if (!member) {
            if (!interaction.replied && !interaction.deferred) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            else return interaction.editReply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        const achievementsMemberSince = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.type === AchievementType.MemberSince && e.enabled)
        await Promise.all(achievementsMemberSince.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && Date.now() - member.joinedTimestamp >= achievement.amount * 60 * 1000 && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                client.tempAchievements[profile.userID].push(achievement.id)
                await profile.addAchievement(achievement, true)
            }    
        }))
        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled).map(e => e)
        if (!interaction.isChatInputCommand()) {
            if (interaction.customId.includes(`select`)) {
                await interaction.editReply({ components: [] })
                const filter = m => m.author.id == interaction.user.id && !m.content.includes(`\u200B`) && m.content.length > 0 && m.channel.id == interaction.channel.id
                const message = await interaction.followUp({ content: `${client.language({ textId: "Type page in chat", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel type", guildId: interaction.guildId, locale: interaction.locale })}: cancel` })
                const collected = await waitingForPage(client, interaction, filter, achievements.length)
                message.delete().catch(e => null)
                if (!collected) return interaction.editReply({ components: components }).catch(e => null)
                limit = +collected.content * 10
                min = limit - 10   
            } else {
                if (!interaction.isStringSelectMenu()) {
                    limit = LimitRegexp.exec(interaction.customId) ? +LimitRegexp.exec(interaction.customId)[1] : 10
                    min = limit - 10       
                } else {
                    limit = LimitRegexp.exec(interaction.values[0]) ? +LimitRegexp.exec(interaction.values[0])[1] : 10
                    min = limit - 10  
                }
            }    
        }
        const embed = new EmbedBuilder()
        let globalUser = await client.globalProfileSchema.findOne({ userID: member.user.id })
        if (member.user.bot || (profile.achievementsHiden && interaction.user.id !== profile.userID)) {
            embed.setAuthor({ name: `${member.displayName} | ${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, iconURL: member.displayAvatarURL() }) 
            embed.setDescription(`${client.config.emojis.block} ${client.language({ textId: "Achievements are hidden", guildId: interaction.guildId, locale: interaction.locale })}.`)
            embed.setColor(member.displayHexColor)
            return interaction.editReply({ content: ` `, embeds: [embed] })
        }
        const settings = client.cache.settings.get(interaction.guildId)
        const first_page_btn = new ButtonBuilder()
            .setEmoji(`${client.config.emojis.arrowLeft2}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}1`)
            .setDisabled((achievements.length <= 10 && min == 0) || (achievements.length > 10 && min < 10) ? true : false)
        const previous_page_btn = new ButtonBuilder()
            .setEmoji(`${client.config.emojis.arrowLeft}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`usr{${interaction.user.id}}cmd{achievements}lim{${limit - 10}}mbr{${member.user.id}}2`)
            .setDisabled((achievements.length <= 10 && min == 0) || (achievements.length > 10 && min < 10) ? true : false)
        const select_page_btn = new ButtonBuilder()
            .setLabel(`${Math.ceil(limit/10).toString()}/${achievements.length ? Math.ceil(achievements.length/10) : 1}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`usr{${interaction.user.id}}cmd{achievements}select_mbr{${member.user.id}}`)
            .setDisabled(achievements.length <= 10)
        const next_page_btn = new ButtonBuilder()
            .setEmoji(`${client.config.emojis.arrowRight}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`usr{${interaction.user.id}}cmd{achievements}lim{${limit + 10}}mbr{${member.user.id}}3`)
            .setDisabled((achievements.length <= 10 && min == 0) || (achievements.length > 10 && min >= achievements.length - 10) ? true : false)
        const last_page_btn = new ButtonBuilder()
            .setEmoji(`${client.config.emojis.arrowRight2}`)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`usr{${interaction.user.id}}cmd{achievements}lim{${achievements.length + (achievements.length % 10 == 0 ? 0 : 10 - (achievements.length % 10))}}mbr{${member.user.id}}4`)
            .setDisabled((achievements.length <= 10 && min == 0) || (achievements.length > 10 && min >= achievements.length - 10) ? true : false)
        const array_btn = [first_page_btn, previous_page_btn, select_page_btn, next_page_btn, last_page_btn]
        embed.setColor(member.displayHexColor)
        embed.setAuthor({ name: `${member.displayName} | ${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, iconURL: member.displayAvatarURL() })
        if (!achievements.length) {
            embed.setDescription(`${client.language({ textId: "There are no achievements on this server yet", guildId: interaction.guildId, locale: interaction.locale })}.`)
        }
        let i = min
        const users = client.cache.profiles.filter(profile => profile.guildID === interaction.guildId && profile.achievements?.[0])
        while (achievements[i] && i < limit) {
            const rewardArray = []
            for (const element of achievements[i].rewards) {
                if (element.type === RewardType.Currency) {
                    rewardArray.push(`${settings.displayCurrencyEmoji}${element.amount.toLocaleString()}`)
                }
                else if (element.type === RewardType.Experience) {
                    rewardArray.push(`${client.config.emojis.XP}${element.amount.toLocaleString()}`)
                }
                else if (element.type === RewardType.Reputation) {
                    rewardArray.push(`${client.config.emojis.RP}${element.amount.toLocaleString()}`)
                }
                else if (element.type === RewardType.Item) {
                    rewardArray.push(`${client.cache.items.get(element.id)?.displayEmoji || ""}${element.amount.toLocaleString()}`)
                } else if (element.type === RewardType.Role) {
                    const role = interaction.guild.roles.cache.get(element.id)
                    if (role) rewardArray.push(`<@&${interaction.guild.roles.cache.get(element.id).id}>`)
                    else rewardArray.push(`(${client.language({ textId: "Deleted role", guildId: interaction.guildId, locale: interaction.locale })})`)
                }
            }
            const done = profile.achievements?.some(e => e.achievmentID == achievements[i].id) ? true : false
            const description = client.functions.getAchievementDescription(achievements[i], profile, settings, interaction, member)
            const countUsers = users.filter(e => e.achievements.some(ach => ach.achievmentID === achievements[i].id))
            embed.addFields([{ name: `${done ? client.config.emojis.DONE : ``}${achievements[i].displayEmoji}${achievements[i].name}`, value: `> ${description}${rewardArray.length ? `\n> ${client.language({ textId: "Rewards", guildId: interaction.guildId, locale: interaction.locale })}: ${rewardArray.join(` `)}` : ``}\n> ${client.config.emojis.profile}**${countUsers.size}**` }])
            i++
        }
        let menu_options = [
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your personal profile", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your statistics", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.inventory}`, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your inventory with items", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.roles}`, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your inventory with roles", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your invites", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.shop, label: `${settings.shopName ? settings.shopName.slice(0, 100) : client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale }) }`, description: `${client.language({ textId: "Server shop", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{shop}lim{10}` },
            { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your achievements", guildId: interaction.guildId, locale: interaction.locale })}`, default: true },
            { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })}` },
        ]
        if (member.user.id !== interaction.user.id) {
            menu_options = [
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Personal profile", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Statistics of", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.inventory, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Inventory with items of", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.roles, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Inventory with roles of", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}`, default: true },
                { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
            ]
        }
        components = []
        const nav_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}}mbr{${member.user.id}menu`).addOptions(menu_options)])
        components.push(nav_row)    
        components.push(new ActionRowBuilder().addComponents(array_btn))
        const close_btn = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(client.config.emojis.close)
            .setCustomId(`usr{${interaction.user.id}}close_mbr{${member.user.id}}`)
        const close_row = new ActionRowBuilder().addComponents([close_btn])
        if (!flags.includes("Ephemeral")) components.push(close_row)
        if (interaction.replied || interaction.deferred) {
            return interaction.editReply({ content: ` `, embeds: [embed], components: components })
        } else return interaction.update({ content: ` `, embeds: [embed], components: components })
    }
}
async function waitingForPage(client, interaction, filter, length) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        if (!isNaN(collected.first().content) && Number.isInteger(+collected.first().content)) {
            if (collected.first().content <= 0 || collected.first().content > (length + (length % 10 == 0 ? 0 : 10 - (length % 10)))/10) {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "This page does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            } else {
                collected.first().delete().catch(e => null) 
                return collected.first()
            }
        } else {
            if (collected.first().content.toLowerCase() == `cancel`) {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    } 
}