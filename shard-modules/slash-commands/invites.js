const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection } = require("discord.js")
const MemberRegexp = /mbr{(.*?)}/
const UserRegexp = /usr{(.*?)}/
const LimitRegexp = /lim{(.*?)}/
module.exports = {
    name: 'invites',
    nameLocalizations: {
        'ru': `приглашения`,
        'uk': `запрошення`,
        'es-ES': `invitaciones`,
    },
    description: 'View invites',
    descriptionLocalizations: {
        'ru': `Просмотр приглашений`,
        'uk': `Перегляд запрошень`,
        'es-ES': `Ver invitaciones`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': `юзер`,
                'uk': `користувач`,
                'es-ES': `usuario`,
            },
            description: 'User to view invites',
            descriptionLocalizations: {
                'ru': `Просмотр приглашений пользователя`,
                'uk': `Перегляд запрошень користувача`,
                'es-ES': `Ver invitaciones del usuario`
            },
            type: ApplicationCommandOptionType.User,
            required: false
        },
        {
            name: 'ephemeral',
            nameLocalizations: {
                'ru': `эфемерный`,
                'uk': `тимчасовий`,
                'es-ES': `efímero`,
            },
            description: 'Message visible only for you',
            descriptionLocalizations: {
                'ru': `Сообщение видно только тебе`,
                'uk': `Повідомлення видно тільки вам`,
                'es-ES': `Mensaje visible solo para ti`
            },
            type: ApplicationCommandOptionType.Boolean
        }
    ],
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (!interaction.isChatInputCommand()) {
            // Allow anyone to use invites from profile-menu
            const isFromProfileMenu = interaction.isStringSelectMenu() && interaction.customId.includes("profile-menu")
            if (!isFromProfileMenu && interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
        }
        const flags = []
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || args?.ephemeral) flags.push("Ephemeral")
        let min = 0
        let limit = 10
        let member
        if (args?.user) member = await interaction.guild.members.fetch(args.user).catch(e => null)
        else if (interaction.isButton()) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)?.[1]).catch(e => null)
        else if (interaction.isStringSelectMenu()) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.values[0])?.[1]).catch(e => null)
        else member = interaction.member
        if (!member) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags})
        }
        const profiles = client.cache.profiles.filter(p => p.guildID === interaction.guildId && p.inviterInfo?.userID === member.user.id).map(p => Object.assign({}, p)).sort((a, b) => b.level - a.level)
        if (interaction.customId?.includes("select")) {
            const components = interaction.message?.components
            interaction.update({ embeds: [interaction.message.embeds[0]], components: [] })
            const filter = m => m.author.id == interaction.user.id && !m.content.includes("\u200B") && m.content.length > 0 && m.channel.id == interaction.channel.id
            interaction.followUp({ content: `${client.language({ textId: "Type page in chat", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel type", guildId: interaction.guildId, locale: interaction.locale })}: cancel`, flags: ["Ephemeral"] })
            const collected = await waitingForPage(client, interaction, filter, profiles.length)
            if (!collected) return interaction.editReply({ components: components })
            limit = +collected.content * 10
            min = limit - 10    
        } else if (interaction.isButton()) {
            limit = +LimitRegexp.exec(interaction.customId)?.[1]
            min = limit - 10    
        }     
        const usersPage = profiles.slice(min, limit)
        const embed = new EmbedBuilder()
        const settings = client.cache.settings.get(interaction.guildId) 
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        if (member.user.bot || (profile.isHiden && interaction.user.id !== profile.userID && !interaction.member.permissions.has("Administrator"))) {
            embed.setAuthor({ name: `${member.displayName} | ${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, iconURL: member.displayAvatarURL() }) 
            embed.setDescription(`${client.config.emojis.block} ${client.language({ textId: "Profile hidden", guildId: interaction.guildId, locale: interaction.locale })}.`)
            embed.setColor(member.displayHexColor)
            return interaction.reply({ embeds: [embed], flags })
        }
        embed.setColor(member.displayHexColor)
        embed.setAuthor({ name: `${member.user.username} | ${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, iconURL: member.displayAvatarURL() })
        let totalRewardRaw = []
        for (const profile1 of profiles) {
            if (profile1.inviterInfo?.items?.length) {
                for (const item of profile1.inviterInfo.items) {
                    const reward = totalRewardRaw.find(e => { return e.itemID === item.itemID})
                    if (reward) reward.amount += item.amount
                    else totalRewardRaw.push({ itemID: item.itemID, amount: item.amount })
                }    
            }
        }
        let totalReward = ""
        for (const item of totalRewardRaw) {
            if (item.itemID === "xp") totalReward += `${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${item.amount}\n`
            else if (item.itemID === "rp") totalReward += `${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** ${item.amount}\n`
            else if (item.itemID === "currency") totalReward += `${settings.displayCurrencyEmoji}**${settings.currencyName}** ${item.amount}\n`
            else {
                const serverItem = client.cache.items.find(e => e.itemID === item.itemID && !e.temp)
                if (serverItem) {
                    totalReward += `${serverItem.displayEmoji}**${serverItem.name}** ${item.amount}\n`
                } else totalReward += `**${item.itemID}** ${item.amount}\n`
            }
        }
        embed.addFields([{ name: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.invite} ${profile.invites}`, value: `${client.language({ textId: "Total received for invites", guildId: interaction.guildId, locale: interaction.locale })}:\n${totalReward}` }])
        embed.setThumbnail(member.displayAvatarURL())
        const page = (profiles.length + (profiles.length % 10 == 0 ? 0 : 10 - (profiles.length % 10)))/10 == 0 ? 1 : (profiles.length + (profiles.length % 10 == 0 ? 0 : 10 - (profiles.length % 10)))/10  
        const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}1`).setDisabled((profiles.length <= 10 && min == 0) || (profiles.length > 10 && min < 10))
        const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{invites}lim{${limit - 10}}mbr{${member.user.id}}2`).setDisabled((profiles.length <= 10 && min == 0) || (profiles.length > 10 && min < 10))
        const select_page_btn = new ButtonBuilder().setLabel(`${Math.ceil(limit/10).toString()}/${page}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{invites}mbr{${member.user.id}} select`).setDisabled(profiles.length <= 10 && min == 0)
        const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{invites}lim{${limit + 10}}mbr{${member.user.id}}3`).setDisabled((profiles.length <= 10 && min == 0) || (profiles.length > 10 && min >= profiles.length - 10))
        const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{invites}lim{${profiles.length + (profiles.length % 10 == 0 ? 0 : 10 - (profiles.length % 10))}_${member.user.id}}mbr{${member.user.id}}4`).setDisabled((profiles.length <= 10 && min == 0) || (profiles.length > 10 && min >= profiles.length - 10))
        const array_btn = [first_page_btn, previous_page_btn, select_page_btn, next_page_btn, last_page_btn]
        let computedArray = []
        for (const key of usersPage) {
            computedArray.push([
            `${(profiles.findIndex(i => i.userID === key.userID) + 1)}. <@${key.userID}> 🎖${key.level}`
            ])
        }
        computedArray = computedArray.length ? computedArray.join('\n') : `${client.language({ textId: "No invites", guildId: interaction.guildId, locale: interaction.locale })}`
        embed.addFields([{ name: `${client.language({ textId: "Invited", guildId: interaction.guildId, locale: interaction.locale })}:`, value: computedArray }])
        let menu_options = [
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your personal profile", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your statistics", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.inventory}`, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your inventory with items", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.roles}`, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your inventory with roles", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your invites", guildId: interaction.guildId, locale: interaction.locale })}`, default: true },
            { emoji: client.config.emojis.shop, label: `${settings.shopName ? settings.shopName.slice(0, 100) : client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale }) }`, value: `usr{${interaction.user.id}}cmd{shop}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Server shop", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your achievements", guildId: interaction.guildId, locale: interaction.locale })}`},
            { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })}` },
        ]
        if (member.user.id !== interaction.user.id) {
            menu_options = [
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Personal profile", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.inventory, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Inventory with items", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.roles, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Inventory with roles", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}`, default: true },
                { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
            ]
        }
        const nav_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}} menu`).addOptions(menu_options)])
        const components = [nav_row, new ActionRowBuilder().addComponents(array_btn)]
        if (!flags.includes("Ephemeral")) {
            const close_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(client.config.emojis.close)
                .setCustomId(`usr{${interaction.user.id}}mbr{${member.user.id}} close`)
            const close_row = new ActionRowBuilder().addComponents([close_btn])
            components.push(close_row)    
        }
        if ((interaction.customId?.includes("reply") || interaction.values?.[0].includes("reply")) || interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            return interaction.reply({ embeds: [embed], components, flags })
        }
        return await interaction.update({ embeds: [embed], components })
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
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    } 
}