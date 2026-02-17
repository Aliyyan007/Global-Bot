const { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ApplicationCommandOptionType, GuildMember, Collection } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const MemberRegexp = /mbr{(.*?)}/
module.exports = {
    name: "stats",
    nameLocalizations: {
        "ru": `статистика`,
        "uk": `статистика`,
        "es-ES": `estadísticas`
    },
    description: `View stats`,
    descriptionLocalizations: {
       "ru": `Посмотреть статистику`,
       "uk": `Переглянути статистику`,
       "es-ES": `Ver estadísticas`
    },
    options: [
        {
            name: "user",
            nameLocalizations: {
                "ru": `юзер`,
                "uk": `користувач`,
                "es-ES": `usuario`
            },
            description: `View user stats`,
            descriptionLocalizations: {
                "ru": `Посмотреть статистику пользователя`,
                "uk": `Переглянути статистику користувача`,
                "es-ES": `Ver estadísticas del usuario`
            },
            type: ApplicationCommandOptionType.User,
            required: false
        },
        {
            name: 'ephemeral',
            nameLocalizations: {
                'ru': `эфемерный`,
                'uk': `тимчасовий`,
                'es-ES': `efímero`
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
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand() && UserRegexp.exec(interaction.customId)) {
            // Allow anyone to use stats from profile-menu
            const isFromProfileMenu = interaction.isStringSelectMenu() && interaction.customId.includes("profile-menu")
            if (!isFromProfileMenu && interaction.user.id !== UserRegexp.exec(interaction.customId)[1]) return interaction.deferUpdate().catch(e => null)
        }
        const flags = []
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || args?.ephemeral) flags.push("Ephemeral")
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
        const embed = new EmbedBuilder()
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        if (member.user.bot || (profile.isHiden && interaction.user.id !== profile.userID && !interaction.member.permissions.has("Administrator"))) {
            embed.setAuthor({ name: `${member.displayName} | ${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, iconURL: member.displayAvatarURL() }) 
            embed.setDescription(`${client.config.emojis.block} ${client.language({ textId: "Profile is hidden", guildId: interaction.guildId, locale: interaction.locale })}.`)
            embed.setColor(member.displayHexColor)
            return interaction.reply({ content: ` `, embeds: [embed], flags: ["Ephemeral"] })
        }
        const settings = client.cache.settings.get(interaction.guildId)
        let filter = "alltime"
        if (interaction.isStringSelectMenu() && interaction.customId.includes("filter")) filter = interaction.values[0]
        let menu_options = [
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your personal profile", guildId: interaction.guildId, locale: interaction.locale })}`},
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your statistics", guildId: interaction.guildId, locale: interaction.locale })}`, default: true },
            { emoji: client.config.emojis.inventory, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your inventory with items", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.roles}`, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your inventory with roles", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your invites", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.shop, label: `${settings.shopName ? settings.shopName.slice(0, 100) : client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale }) }`, value: `usr{${interaction.user.id}}cmd{shop}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Server shop", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your achievements", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })}` }
        ]
        if (member.user.id !== interaction.user.id) {
            menu_options = [
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Personal profile of", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Statistics of", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}`, default: true },
                { emoji: client.config.emojis.inventory, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Inventory with items of", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.roles, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Inventory with roles of", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
            ]
            if (profile.achievementsHiden && !interaction.member.permissions.has("Administrator")) menu_options = menu_options.filter(e => e.value !== `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`)
        }
        const filterMenu = new StringSelectMenuBuilder()
            .setCustomId(`cmd{stats}}usr{${interaction.user.id}}mbr{${member.user.id}}filter`)
            .setOptions([
                {
                    label: `${client.language({ textId: "All time", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `alltime`,
                    default: filter === "alltime"
                },
                {
                    label: `${client.language({ textId: "For day", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `daily`,
                    default: filter === "daily"
                },
                {
                    label: `${client.language({ textId: "For week", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `weekly`,
                    default: filter === "weekly"
                },
                {
                    label: `${client.language({ textId: "For month", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `monthly`,
                    default: filter === "monthly"
                },
                {
                    label: `${client.language({ textId: "For year", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `yearly`,
                    default: filter === "yearly"
                }
            ])
        const components = []
        const first_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}}mbr{${member.user.id}}profile-menu`).addOptions(menu_options)])
        components.push(first_row)  
        components.push(new ActionRowBuilder().addComponents(filterMenu))
        embed.setTitle(`${member.displayName} | ${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`)
        const description = []
        if (filter === "alltime") {
            description.push(
                `# ${client.language({ textId: "Statistics for all time", guildId: interaction.guildId, locale: interaction.locale })}:`,
                `${client.language({ textId: "Level", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.medal} ${profile.level}`,
                `${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.XP} ${profile.totalxp.toFixed()}`,
                settings.seasonLevelsEnabled ? `${client.language({ textId: "Season XP", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.seasonXP} ${profile.seasonTotalXp.toFixed()}` : false,
                `${client.language({ textId: "Hours in voice", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.mic} ${profile.hours.toFixed(1)}`,
                `${client.language({ textId: "Messages", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.message} ${profile.messages}`,
                `${client.language({ textId: "Likes", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.heart} ${profile.likes}`,
                `${settings.currencyName}: ${settings.displayCurrencyEmoji} ${(profile.currency).toFixed()}`,
                `${settings.currencyName} ${client.language({ textId: "spent", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.displayCurrencyEmoji} ${(profile.currencySpent).toFixed()}`,
                `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.invite} ${profile.invites}`,
                `${client.language({ textId: "Bumps", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.bump} ${profile.bumps}`,
                `${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.RP} ${profile.rp.toFixed(2)}`,
                `${client.language({ textId: "Quests completed", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.quests} ${profile.doneQuests}`,
                `${client.language({ textId: "Giveaways", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.giveaway} ${profile.giveawaysCreated}`,
                `${client.language({ textId: "Wormholes", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.wormhole} ${profile.wormholeTouched}`,
                `${client.language({ textId: "Fishing", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.fishing} ${profile.fishing}`,
                `${client.language({ textId: "Mining", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.mining} ${profile.mining}`,
                `${client.language({ textId: "Wormholes spawned", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.wormhole} ${profile.wormholesSpawned}`,
                `${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.box}`,
                `* ${client.language({ textId: "sold on market", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.itemsSoldOnMarketPlace}`,
                `* ${client.language({ textId: "opened", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.itemsOpened}`,
                `* ${client.language({ textId: "received", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.itemsReceived}`,
                `* ${client.language({ textId: "crafted", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.itemsCrafted}`,
                `* ${client.language({ textId: "used (items)", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.itemsUsed}`,
                `* ${client.language({ textId: "bought in shop", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.itemsBoughtInShop}`,
                `* ${client.language({ textId: "bought on market", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.itemsBoughtOnMarket}`,
                `* ${client.language({ textId: "sold", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.itemsSold}`,
        )
        } else {
            description.push(
                `# ${client.language({ textId: "Statistics for", guildId: interaction.guildId, locale: interaction.locale })} ${client.language({ textId: filter, guildId: interaction.guildId, locale: interaction.locale })}:`,
                `${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.XP} ${profile.stats?.[filter]?.totalxp?.toFixed() || 0}`,
                `${client.language({ textId: "Hours in voice", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.mic} ${profile.stats?.[filter]?.hours?.toFixed(1) || 0}`,
                `${client.language({ textId: "Messages", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.message} ${profile.stats?.[filter]?.messages || 0}`,
                `${client.language({ textId: "Likes", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.heart} ${profile.stats?.[filter]?.likes || 0}`,
                `${settings.currencyName}: ${settings.displayCurrencyEmoji} ${profile.stats?.[filter]?.currency?.toFixed() || 0}`,
                `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.invite} ${profile.stats?.[filter]?.invites || 0}`,
                `${client.language({ textId: "Bumps", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.bump} ${profile.stats?.[filter]?.bumps || 0}`,
                `${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.RP} ${profile.stats?.[filter]?.rp?.toFixed(2) || 0}`,
                `${client.language({ textId: "Quests completed", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.quests} ${profile.stats?.[filter]?.doneQuests || 0}`,
                `${client.language({ textId: "Giveaways", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.giveaway} ${profile.stats?.[filter]?.giveawaysCreated || 0}`,
                `${client.language({ textId: "Wormholes", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.wormhole} ${profile.stats?.[filter]?.wormholeTouched || 0}`,
                `${client.language({ textId: "Items sold on market", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.box} ${profile.stats?.[filter]?.itemsSoldOnMarketPlace || 0}`,
            )
        }
        embed.setDescription(description.filter(e => e).join("\n"))
        embed.setColor(member.displayHexColor)
        embed.setThumbnail(member.displayAvatarURL())
        embed.setFooter({ text: `${client.language({ textId: "Until next level", guildId: interaction.guildId, locale: interaction.locale })} ⭐${profile.xp.toFixed()}/${profile.level * settings.levelfactor + 100} XP (${Math.floor((profile.xp / (profile.level * settings.levelfactor + 100)) * 100)}%)${settings.seasonLevelsEnabled ? `\n${client.language({ textId: "Until next season level", guildId: interaction.guildId, locale: interaction.locale })} ⭐${profile.seasonXp.toFixed()}/${profile.seasonLevel * settings.seasonLevelfactor + 100} XP (${Math.floor((profile.seasonXp / (profile.seasonLevel * settings.seasonLevelfactor + 100)) * 100)}%)` : ""}`, iconURL: client.user.displayAvatarURL() })
        if (!flags.includes("Ephemeral")) {
            const close_btn = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(client.config.emojis.close)
            .setCustomId(`usr{${interaction.user.id}} close`)
            const close_row = new ActionRowBuilder().addComponents([close_btn])
            components.push(close_row)    
        }
        if ((interaction.customId?.includes("reply") || interaction.values?.[0].includes("reply")) || interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
            return interaction.reply({ content: ` `, embeds: [embed], components: components, flags })
        }
        return interaction.update({ content: ` `, embeds: [embed], components: components })
    }
}