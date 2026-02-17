const { ApplicationCommandOptionType, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ShardClientUtil, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, ButtonBuilder, ButtonStyle, Collection, LabelBuilder } = require("discord.js")
const GuildRegexp = /guildId{(.*?)}/
const UserRegexp = /userId{(.*?)}/
const { addBlackList, removeBlackList } = require("../handler/blacklist")
module.exports = {
    name: 'editor',
    description: 'Editor',
    options: [
        {
            name: 'server',
            nameLocalizations: {
                'ru': 'сервер'
            },
            description: 'Server editor',
            descriptionLocalizations: {
                'ru': `Редактор сервера`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'guild_id',
                    description: 'Guild ID',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: 'user',
            nameLocalizations: {
                'ru': 'пользователь'
            },
            description: 'User editor',
            descriptionLocalizations: {
                'ru': `Редактор пользователя`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user_id',
                    description: 'User ID',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        }
    ],
    dmPermission: true,
    defaultMemberPermissions: "Administrator",
    owner: true,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        const subcommand = interaction.isChatInputCommand() ? args.Subcommand : interaction.customId.includes("guildId") ? "server" : "user"
        if (subcommand === "server") {
            const guildID = interaction.isChatInputCommand() ? args.guild_id : GuildRegexp.exec(interaction.customId)?.[1]
            const shardNum = ShardClientUtil.shardIdForGuildId(guildID, client.shard.count)
            const data = await client.shard.broadcastEval(async (c, { guildID }) => {
                const { PermissionFlagsBits } = require("discord.js")
                const guild = await c.guilds.cache.get(guildID)
                if (!guild) return { found: false }
                const owner = await guild?.fetchOwner()
                return { 
                    found: true, 
                    owner: `${owner.user.displayName} (${owner.user.username})`, 
                    icon: guild.iconURL(), 
                    banner: guild.bannerURL({ format: "png", size: 4096 }), 
                    description: guild.description, 
                    memberCount: guild.memberCount || guild.approximateMemberCount, 
                    ID: guild.id, 
                    name: guild.name,
                    permissions: guild.members.me.permissions.has(PermissionFlagsBits.Administrator) ? ["Administrator"] : guild.members.me.permissions.toArray()
                }
            }, { shard: shardNum, context: { guildID: guildID } })
            if (!data.found) return interaction.reply({ content: `Bot is not in this server (**${guildID}**)`, flags: ["Ephemeral"] })
            let settings = await client.settingsSchema.findOne({ guildID: guildID }).lean()
            if (interaction.isStringSelectMenu()) {
                if (interaction.values[0].includes("max_")) {
                    if (interaction.user.id !== client.config.discord.ownerId) return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    const values = interaction.values
                    const modal = new ModalBuilder()
                        .setCustomId(`editSlots_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Change slots", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(values[0])
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings[values[0]]}`)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `editSlots_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 30000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        modalArgs.amount = +modalArgs.amount
                        if (isNaN(modalArgs.amount)) return interaction.reply({ content: `Not a valid number`, flags: ["Ephemeral"] })
                        if (modalArgs.amount < 0) modalArgs.amount = 0
                        await client.shard.broadcastEval(async (c, { guildID, value, amount }) => {
                            const settings = c.cache.settings.get(guildID)
                            settings[value] = amount
                            await settings.save()
                        }, { shard: shardNum, context: { guildID: guildID, value: values[0], amount: modalArgs.amount } })
                        settings = await client.settingsSchema.findOne({ guildID: guildID }).lean()
                    } else return
                } else
                if (interaction.values[0] === "invite") {
                    const invite = await client.shard.broadcastEval(async (c, { guildID }) => {
                        const guild = await c.guilds.cache.get(guildID)
                        let invite = await guild.invites.fetch().then(invites => invites.first()).catch(e => null)
                        if (!invite) invite = await guild.invites.create(guild.channels.cache.find(channel => channel.permissionsFor(guild.members.me).has("CreateInstantInvite")), { maxAge: 60 })
                        return invite
                    }, { shard: shardNum, context: { guildID: guildID } })
                    return interaction.reply({ content: invite ? `Invite link: https://discord.gg/${invite.code}` : `Failed to create invite`, flags: ["Ephemeral"] })
                } else
                if (interaction.values[0] === "logs") {
                    const action_logs = settings.action_logs.sort((a, b) => b.date - a.date)
                    const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(action_logs, null, 2), 'utf-8'), { name: `${guildID}_logs.json` })
                    return interaction.reply({ files: [attachment], flags: ["Ephemeral"] })
                } else
                if (interaction.values[0] === "blacklist") {
                    if (interaction.user.id !== client.config.discord.ownerId) return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    if (client.blacklist(guildID, "full_ban", "guilds")) await removeBlackList(client, guildID, "full_ban", "guilds")
                    else await addBlackList(client, guildID, "full_ban", "guilds")
                } else
                if (interaction.values[0] === "kick") {
                    if (interaction.user.id !== client.config.discord.ownerId) return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    await interaction.update({ content: `Are you sure you want to kick the bot from server ${data.name}?`, embeds: [], components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                            .setCustomId(`kick confirm`)
                            .setLabel(`${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                            .setCustomId(`kick decline`)
                            .setLabel(`${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setStyle(ButtonStyle.Danger))
                    ] })    
                    const filter = (i) => (i.customId === `kick confirm` || i.customId === `kick decline`) && i.user.id === interaction.user.id
                    interaction = await interaction.channel.awaitMessageComponent({ filter, time: 20000 }).catch(e => null)
                    if (!interaction) return
                    if (interaction && interaction.customId !== "kick decline") {
                        await client.shard.broadcastEval(async (c, { guildID }) => {
                            const guild = await c.guilds.cache.get(guildID)
                            await guild.leave()
                        }, { shard: shardNum, context: { guildID: guildID } })
                        return interaction.update({ content: `Bot successfully left the server`, embeds: [], components: [], flags: ["Ephemeral"] })    
                    }
                }
            }
            const items = await client.itemSchema.find({ guildID: guildID }).lean()
            const achievements = await client.achievementSchema.find({ guildID: guildID }).lean()
            const wormholes = await client.wormholeSchema.find({ guildID: guildID }).lean()
            const styles = await client.styleSchema.find({ guildID: guildID }).lean()
            const quests = await client.questSchema.find({ guildID: guildID }).lean()
            const categories = await client.shopCategorySchema.find({ guildID: guildID }).lean()
            const roles = await client.roleSchema.find({ guildID: guildID }).lean()
            const gifts = await client.giftSchema.find({ guildID: guildID }).lean()
            const permissions = await client.permissionSchema.find({ guildID: guildID }).lean()
            const jobs = await client.jobSchema.find({ guildID: guildID }).lean()
            const channelsMultipliers = await client.channelMultipliersSchema.find({ guildID: guildID }).lean()
            const embed = new EmbedBuilder()
            embed.setColor(3093046)
            embed.setThumbnail(data.icon)
            embed.setImage(data.banner)
            embed.setTitle(data.name)
            embed.setFooter({ text: `ID: ${guildID} | Shard #${shardNum}` })
            const description = [
                `${data.description ? `\`\`\`${data.description}\`\`\`` : "No description"}`,
                `${client.language({ textId: "Participants", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.profile}${data.memberCount}`,
                `${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.box}${items.length} / ${settings.max_items}`,
                `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.achievements}${achievements.length} / ${settings.max_achievements}`,
                `${client.language({ textId: "Wormholes", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.wormhole}${wormholes.length} / ${settings.max_wormholes}`,
                `${client.language({ textId: "Styles", guildId: interaction.guildId, locale: interaction.locale })}: 🖌️${styles.length} / ${settings.max_styles}`,
                `${client.language({ textId: "Bonus channels", guildId: interaction.guildId, locale: interaction.locale })}: 🔈${channelsMultipliers.length} / ${settings.max_bonusChannels}`,
                `${client.language({ textId: "Categories", guildId: interaction.guildId, locale: interaction.locale })}: 🛒${categories.length} / ${settings.max_categories}`,
                `${client.language({ textId: "Roles", guildId: interaction.guildId, locale: interaction.locale })}: 🎭${roles.length} / ${settings.max_roles}`,
                `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}: 📜${quests.length} / ${settings.max_quests}`,
                `${client.language({ textId: "Gifts", guildId: interaction.guildId, locale: interaction.locale })}: 🎁${gifts.length}`,
                `${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}: 👑${permissions.length}`,
                `${client.language({ textId: "Job", guildId: interaction.guildId, locale: interaction.locale })}: ⛑️${jobs.length}`,
                `${client.language({ textId: "Owner", guildId: interaction.guildId, locale: interaction.locale })}: ${data.owner}`,
                `${client.language({ textId: "In blacklist", guildId: interaction.guildId, locale: interaction.locale })}: ${client.blacklist(guildID, "full_ban", "guilds") ? client.language({ textId: "yes", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "no", guildId: interaction.guildId, locale: interaction.locale })}`,
                `Permissions: ${data.permissions.join(", ")}`,
                `Logs:\n${settings.action_logs ? settings.action_logs.sort((a, b) => b.date - a.date).slice(0, 4).map((log) => `\`${log.label}\`<t:${Math.round(log.date / 1000)}:R>`).join("\n") : "None"}`,
            ]
            embed.setDescription(description.join("\n"))
            const options = [
                {
                    emoji: "📨",
                    label: `Get invite link`,
                    value: `invite`
                },
                {
                    emoji: client.config.emojis.box,
                    label: `Edit max items`,
                    value: `max_items`
                },
                {
                    emoji: client.config.emojis.achievements,
                    label: `Edit max achievements`,
                    value: `max_achievements`
                },
                {
                    emoji: "📜",
                    label: `Edit max quests`,
                    value: `max_quests`
                },
                {
                    emoji: client.config.emojis.wormhole,
                    label: `Edit max wormholes`,
                    value: `max_wormholes`
                },
                {
                    emoji: "🖌️",
                    label: `Edit max styles`,
                    value: `max_styles`
                },
                {
                    emoji: "🛒",
                    label: `Edit max categories`,
                    value: `max_categories`
                },
                {
                    emoji: "🔈",
                    label: `Edit max channels`,
                    value: `max_bonusChannels`
                },
                {
                    emoji: "🎭",
                    label: `Edit max roles`,
                    value: `max_roles`
                },
                {
                    emoji: "📄",
                    label: `Get logs`,
                    value: `logs`
                },
                {
                    emoji: "⛔",
                    label: client.blacklist(guildID, "full_ban", "guilds") ? `Remove server from blacklist` : `Add server to blacklist`,
                    value: `blacklist`
                },
                {
                    emoji: "❌",
                    label: `Kick bot`,
                    value: `kick`
                },
            ]
            const menu = new StringSelectMenuBuilder().setOptions(options).setCustomId(`cmd{editor}guildId{${guildID}}`)
            if (interaction.isChatInputCommand()) {
                return interaction.reply({ 
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(menu)
                    ], 
                    flags: ["Ephemeral"] 
                })     
            } else {
                return interaction.update({ 
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(menu)
                    ], 
                    flags: ["Ephemeral"] 
                }) 
            }  
        }
        if (subcommand === "user") {
            const userID = interaction.isChatInputCommand() ? args.user_id : UserRegexp.exec(interaction.customId)?.[1]
            const user = await client.users.fetch(userID, { force: true, cache: false }).catch(e => null)
            if (!user) return interaction.reply({ content: `User does not exist (**${userID}**)`, flags: ["Ephemeral"] })
            const globalProfile = await client.functions.fetchGlobalProfile(client, userID)
            if (interaction.isStringSelectMenu()) {
                if (interaction.values[0].includes("ban")) {
                    if (interaction.user.id !== client.config.discord.ownerId) return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    if (client.blacklist(userID, interaction.values[0], "users")) await removeBlackList(client, userID, interaction.values[0], "users")
                    else await addBlackList(client, userID, interaction.values[0], "users")
                } else
                if (interaction.values[0] === "logs") {
                    const action_logs = globalProfile.action_logs?.sort((a, b) => b.date - a.date) || []
                    const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(action_logs, null, 2), 'utf-8'), { name: `${userID}_logs.json` })
                    return interaction.reply({ files: [attachment], flags: ["Ephemeral"] })
                } else
                if (interaction.values[0] === "servers") {
                    await interaction.deferUpdate()
                    const guildIds = await client.profileSchema.find({ userID: userID, deleteFromDB: { $exists: false } }).distinct("guildID")
                    const content = [`All servers associated with ${user.username} (${userID}):`]
                    for (const guildID of guildIds) {
                        const guildName = await client.shard.broadcastEval(async (c, { guildID, userID }) => {
                            const guild = await c.guilds.cache.get(guildID)
                            if (guild) {
                                const member = await guild.members.fetch(userID).catch(e => null)
                                if (member) return guild.name  
                                else return false
                            } else return false
                        }, { shard: ShardClientUtil.shardIdForGuildId(guildID, client.shard.count), context: { guildID: guildID, userID: userID } })
                        if (guildName) content.push(`${guildName} (${guildID})`)
                    }
                    return interaction.followUp({ content: content.join("\n"), flags: ["Ephemeral"] })
                }
            }
            const embed = new EmbedBuilder()
            embed.setColor(3093046)
            embed.setThumbnail(user.displayAvatarURL())
            embed.setImage(user.bannerURL({ size: 4096 }) || undefined)
            embed.setTitle(user.username)
            embed.setFooter({ text: `ID: ${userID}` })
            const description = [
                `${client.language({ textId: "In blacklist (full)", guildId: interaction.guildId, locale: interaction.locale })}: ${client.blacklist(userID, "full_ban", "users") ? client.language({ textId: "yes", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "no", guildId: interaction.guildId, locale: interaction.locale })}`,
                `Logs:\n${globalProfile.action_logs?.sort((a, b) => b.date - a.date)?.slice(0, 4)?.map((log) => `\`${log.label}\`<t:${Math.round(log.date / 1000)}:R>`)?.join("\n") || ""}`
            ]
            embed.setDescription(description.join("\n"))
            const options = [
                {
                    emoji: "⛔",
                    label: client.blacklist(userID, "full_ban", "users") ? `Remove user from blacklist (full)` : `Add user to blacklist (full)`,
                    value: `full_ban`
                },
                {
                    emoji: "📄",
                    label: `Get logs`,
                    value: `logs`
                },
                {
                    emoji: "🌐",
                    label: `Show servers`,
                    value: `servers`
                },
            ]
            const menu = new StringSelectMenuBuilder().setOptions(options).setCustomId(`cmd{editor}userId{${userID}}`)
            if (interaction.isChatInputCommand()) {
                return interaction.reply({ 
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(menu)
                    ], 
                    flags: ["Ephemeral"] 
                })     
            } else {
                return interaction.update({
                    content: " ",
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(menu)
                    ], 
                    flags: ["Ephemeral"] 
                }) 
            }
        }
    }
}