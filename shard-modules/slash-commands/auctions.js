const { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ApplicationCommandOptionType, Collection, GuildMember, TextInputStyle, ModalBuilder, TextInputBuilder, PermissionsBitField, PermissionFlagsBits, ThreadAutoArchiveDuration, LabelBuilder } = require("discord.js")
const { RewardType } = require("../enums")
const LimitRegexp = /limit{(.*?)}/
const idRegexp = /id{(.*?)}/
const Auction = require("../classes/Auction")
const auctionSchema = require("../schemas/auctionSchema")
const uniqid = require('uniqid')
module.exports = {
    name: 'auctions',
    nameLocalizations: {
        'ru': `аукционы`,
        'uk': `аукціони`,
        'es-ES': `subastas`
    },
    description: 'Create auction or view auctions',
    descriptionLocalizations: {
        'ru': `Создать аукцион или посмотреть аукционы`,
        'uk': `Створити аукціон або переглянути аукціони`,
        'es-ES': `Crear una subasta o ver subastas`
    },
    options: [
        {
            name: 'create',
            nameLocalizations: {
                'ru': `создать`,
                'uk': `створити`,
                'es-ES': `crear`
            },
            description: 'Create an auction',
            descriptionLocalizations: {
                'ru': `Создать аукцион`,
                'uk': `Створити аукціон`,
                'es-ES': `Crear una subasta`
            },
            options: [
                {
                    name: "item",
                    nameLocalizations: {
                        'ru': `предмет`,
                        'uk': `предмет`,
                        'es-ES': `objeto`
                    },
                    description: 'Sell an item on auction',
                    descriptionLocalizations: {
                        'ru': `Продать предмет на аукционе`,
                        'uk': `Продати предмет на аукціоні`,
                        'es-ES': `Vender un objeto en subasta`
                    },
                    type: ApplicationCommandOptionType.Subcommand,
                    autocomplete: true,
                    options: [
                        {
                            name: "item",
                            nameLocalizations: {
                                'ru': `предмет`,
                                'uk': `предмет`,
                                'es-ES': `objeto`
                            },
                            description: 'Sell an item on auction',
                            descriptionLocalizations: {
                                'ru': `Продать предмет на аукционе`,
                                'uk': `Продати предмет на аукціоні`,
                                'es-ES': `Vender un objeto en subasta`
                            },
                            type: ApplicationCommandOptionType.String,
                            min_value: 1,
                            required: true,
                            autocomplete: true
                        },
                        {
                            name: "amount",
                            nameLocalizations: {
                                'ru': `количество`,
                                'uk': `роль`,
                                'es-ES': `rol`
                            },
                            description: 'Amount of item',
                            descriptionLocalizations: {
                                'ru': `Количество предмета`,
                                'uk': `Продати роль на аукціоні`,
                                'es-ES': `Vender un rol en subasta`
                            },
                            type: ApplicationCommandOptionType.Integer,
                            min_value: 1,
                            required: true
                        }
                    ]
                },
                {
                    name: "role",
                    nameLocalizations: {
                        'ru': `роль`,
                        'uk': `роль`,
                        'es-ES': `rol`
                    },
                    description: 'Sell a role on auction',
                    descriptionLocalizations: {
                        'ru': `Продать роль на аукционе`,
                        'uk': 'Продати роль на аукціоні',
                        'es-ES': 'Vender un rol en una subasta'
                    },
                    type: ApplicationCommandOptionType.Subcommand,
                    autocomplete: true,
                    options: [
                        {
                            name: "role",
                            nameLocalizations: {
                                'ru': `роль`,
                                'uk': `роль`,
                                'es-ES': `rol`
                            },
                            description: 'Sell a role on auction',
                            descriptionLocalizations: {
                                'ru': `Продать роль на аукционе`,
                                'uk': 'Продати роль на аукціоні',
                                'es-ES': 'Vender un rol en una subasta'
                            },
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        },
                        {
                            name: "amount",
                            nameLocalizations: {
                                'ru': `количество`,
                                'uk': 'кількість',
                                'es-ES': 'cantidad'
                            },
                            description: 'Amount of roles',
                            descriptionLocalizations: {
                                'ru': `Количество ролей`,
                                'uk': 'Кількість ролей',
                                'es-ES': 'Número de roles'
                            },
                            type: ApplicationCommandOptionType.Integer,
                            min_value: 1,
                            required: true
                        }
                    ]
                },
            ],
            type: ApplicationCommandOptionType.SubcommandGroup
        },
        {
            name: 'view',
            nameLocalizations: {
                'ru': `просмотр`,
                'uk': `перегляд`,
                'es-ES': `ver`
            },
            description: 'View all auctions',
            descriptionLocalizations: {
                'ru': `Просмотр всех аукционов`,
                'uk': `Перегляд всіх аукціонів`,
                'es-ES': `Ver todas las subastas`
            },
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    dmPermission: false,
    group: `general-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        let auction
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const settings = client.cache.settings.get(interaction.guildId)
        if (args?.SubcommandGroup === "create" || interaction.customId?.includes("edit")) {
            if (!settings.channels.auctionsChannelId || !interaction.guild.channels.cache.get(settings.channels.auctionsChannelId)) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Auction creation is not configured on this server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            const permission = client.cache.permissions.get(settings.auctions_permission)
            if (permission) {
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
            if (interaction.isChatInputCommand()) {
                if (args.Subcommand === "item") {
                    const item = client.cache.items.find(e => e.itemID === args.item && e.guildID === interaction.guildId && e.enabled)
                    if (!item) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item with ID", guildId: interaction.guildId, locale: interaction.locale })} ${args.item} ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    const inventoryItem = profile.inventory.find(e => e.itemID === item.itemID && e.amount >= args.amount)
                    if (!inventoryItem) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}${item.name} (${args.amount})`, flags: ["Ephemeral"] })
                    }
                    if (item.notAuctionable) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This item cannot be sold at auction", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                }
                if (args.Subcommand === "role") {
                    const inventoryRole = profile.inventoryRoles?.find(e => e.uniqId === args.role && e.amount >= args.amount)
                    if (!inventoryRole) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have a role with unique ID", guildId: interaction.guildId, locale: interaction.locale })} ${args.role}`, flags: ["Ephemeral"] })
                    }
                    if (inventoryRole.amount < args.amount) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have", guildId: interaction.guildId, locale: interaction.locale })} <@&${inventoryRole.id}> (${args.amount})`, flags: ["Ephemeral"] })
                    }
                    const guildRole = interaction.guild.roles.cache.get(inventoryRole.id)
                    if (!guildRole) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role with ID", guildId: interaction.guildId, locale: interaction.locale })} ${args.role} ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    const roleProperties = await client.rolePropertiesSchema.findOne({ id: guildRole.id }).lean()
                    if (roleProperties && roleProperties.cannotAuction) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This role cannot be sold at auction", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                }
            }
            auction = client.cache.auctions.find(e => e.id === idRegexp.exec(interaction.customId)?.[1] && e.guildID === interaction.guildId)
            if (!auction) {
                auction = new auctionSchema({
                    id: uniqid.time(),
                    guildID: interaction.guildId,
                    item: {
                        type: args.Subcommand === "role" ? RewardType.Role : RewardType.Item,
                        id: args.Subcommand === "role" ? profile.inventoryRoles.find(e => e.uniqId === args.role).id : args.item,
                        amount: args.amount,
                        ms: args.Subcommand === "role" ? profile.inventoryRoles.find(e => e.uniqId === args.role).ms : undefined,
                        uniqId: args.Subcommand === "role" ? profile.inventoryRoles.find(e => e.uniqId === args.role).uniqId : undefined,
                    },
                    creatorId: interaction.user.id
                })
                await auction.save()
                auction = new Auction(client, auction)
                client.cache.auctions.set(auction.id, auction)
            }
            let auctionItem
            if (auction.item.type === RewardType.Role) {
                const guildRole = interaction.guild.roles.cache.get(auction.item.id)
                const inventoryRole = profile.inventoryRoles.find(e => e.uniqId === auction.item.uniqId && e.ms === auction.item.ms)
                auctionItem = `${guildRole.name} (${auction.item.amount.toLocaleString()}) ${inventoryRole.ms ? `[${client.functions.transformSecs(client, inventoryRole.ms, interaction.guildId, interaction.locale)}]` : ""}`
            }
            if (auction.item.type === RewardType.Item) {
                const item = client.cache.items.get(auction.item.id)
                auctionItem = `${item.displayEmoji}${item.name} (${auction.item.amount.toLocaleString()})`
            }
            if (interaction.customId?.includes("initial")) {
                const modal = new ModalBuilder()
                    .setCustomId(`auctions_initial_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Initial bid", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(settings.currencyName)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("initial")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${auction.bet?.initial || " "}`)
                                    .setMaxLength(25)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `auctions_initial_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (isNaN(+modalArgs.initial) || !Number.isInteger(+modalArgs.initial)) {
                        return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.initial}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    modalArgs.initial = +modalArgs.initial
                    if (modalArgs.initial <= 0) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Amount cannot be", guildId: interaction.guildId, locale: interaction.locale })} <= 0`, flags: ["Ephemeral"] })
                    }
                    if (!auction.bet) auction.bet = {}
                    auction.bet.initial = modalArgs.initial
                    auction.bet.type = RewardType.Currency
                    await auction.save()
                } else return
            }
            if (interaction.customId?.includes("step")) {
                const modal = new ModalBuilder()
                    .setCustomId(`auctions_step_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Bid step", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(settings.currencyName)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("step")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${auction.bet?.step || " "}`)
                                    .setMaxLength(25)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `auctions_step_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.isModalSubmit()) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (isNaN(+modalArgs.step) || !Number.isInteger(+modalArgs.step)) {
                        return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.step}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    modalArgs.step = +modalArgs.step
                    if (modalArgs.step <= 0) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Amount cannot be", guildId: interaction.guildId, locale: interaction.locale })} <= 0`, flags: ["Ephemeral"] })
                    }
                    auction.bet.step = modalArgs.step
                    await auction.save()
                } else return
            }
            const initialBetEmoji = auction.bet?.type === RewardType.Currency ? settings.displayCurrencyEmoji : auction.bet?.type === RewardType.Item ? client.cache.items.get(auction.bet.id).displayEmoji : undefined
            if (interaction.customId?.includes("create")) {
                if (auction.status !== "editing") {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Auction has already been created", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (!settings.channels.auctionsChannelId || !interaction.guild.channels.cache.get(settings.channels.auctionsChannelId)) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Auction creation is not configured on this server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const channel = interaction.guild.channels.cache.get(settings.channels.auctionsChannelId)
                if (!channel) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Auction creation is not configured on this server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages") || !channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory") || !channel.permissionsFor(interaction.guild.members.me).has("ViewChannel")) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}> ${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Send messages", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (auction.item.type === RewardType.Role) {
                    const guildRole = interaction.guild.roles.cache.get(auction.item.id)
                    if (!guildRole) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role with ID", guildId: interaction.guildId, locale: interaction.locale })} ${auction.item.id} ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    const inventoryRole = profile.inventoryRoles?.find(e => e.uniqId === auction.item.uniqId && e.amount >= auction.item.amount && e.ms === auction.item.ms)
                    if (!inventoryRole) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have", guildId: interaction.guildId, locale: interaction.locale })} <@&${guildRole.id}> (${auction.item.amount}) ${inventoryRole.ms ? `[${client.functions.transformSecs(client, inventoryRole.ms, interaction.guildId, interaction.locale)}]` : ""}`, flags: ["Ephemeral"] })
                    }
                    const roleProperties = await client.rolePropertiesSchema.findOne({ id: guildRole.id }).lean()
                    if (roleProperties && roleProperties.cannotAuction) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This role cannot be sold at auction", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    await profile.subtractRole(guildRole.id, auction.item.amount, auction.item.ms)
                }
                if (auction.item.type === RewardType.Item) {
                    const item = client.cache.items.find(e => e.itemID === auction.item.id && e.guildID === interaction.guildId && e.enabled)
                    if (!item) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item with ID", guildId: interaction.guildId, locale: interaction.locale })} ${auction.item.id} ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    const inventoryItem = profile.inventory.find(e => e.itemID === item.itemID && e.amount >= auction.item.amount && e.ms === auction.item.ms)
                    if (!inventoryItem) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}${item.name} (${auction.item.amount})`, flags: ["Ephemeral"] })
                    }
                    if (item.notAuctionable) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This item cannot be sold at auction", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    await profile.subtractItem(auction.item.id, auction.item.amount)
                }
                profile.save()
                auction.status = "started"
                auction.endDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
                auction.setTimeoutEnd()
                const message = await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
                            .setTitle(`${client.language({ textId: "Auction", guildId: interaction.guildId })}`)
                            .setColor(3093046)
                            .setDescription([
                                auctionItem,
                                `${client.language({ textId: "Initial bid", guildId: interaction.guildId })}: ${initialBetEmoji}${auction.bet.initial.toLocaleString()}`,
                                `${client.language({ textId: "Bid step", guildId: interaction.guildId })}: ${initialBetEmoji}${auction.bet.step.toLocaleString()}`,
                                `${client.language({ textId: "Auction end date", guildId: interaction.guildId })}: <t:${Math.floor(auction.endDate/1000)}:f>`
                            ].join("\n"))
                            .setFields({
                                name: `${client.language({ textId: "Participants", guildId: interaction.guildId })}:`,
                                value: !auction.participants.length ? `${client.language({ textId: "No participants", guildId: interaction.guildId })}` : auction.participants.sort((a, b) => b.bet.amount - a.bet.amount).map((e, index) => `${index+1}. <@${e.userID}> ➜ ${initialBetEmoji}${e.bet.amount.toLocaleString()} ${index === 0 ? `(${client.language({ textId: "Will win at auction end", guildId: interaction.guildId })})` : ``}`).join("\n")
                            })
                            .setFooter({ text: `ID: ${auction.id}` })
                    ],
                    components: [
                        new ActionRowBuilder()
                            .setComponents([
                                new ButtonBuilder()
                                    .setCustomId(`cmd{auctions}id{${auction.id}} placeBet`)
                                    .setLabel(`${client.language({ textId: "Place bid", guildId: interaction.guildId })}`)
                                    .setStyle(ButtonStyle.Primary)
                            ])
                    ]
                })
                if (channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.CreatePublicThreads) && channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessagesInThreads)) {
                    await message.startThread({ name: `${client.language({ textId: "Auction: comments", guildId: interaction.guildId })}`, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay })
                }
                auction.channelId = channel.id
                auction.messageId = message.id
                await auction.save()
                return interaction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Auction created", guildId: interaction.guildId, locale: interaction.locale })} ➜ https://discord.com/channels/${auction.guildID}/${auction.channelId}/${auction.messageId}`, embeds: [], components: [] })
            }
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${client.language({ textId: "Create auction", guildId: interaction.guildId, locale: interaction.locale })}` })
                .setTitle(auctionItem)
                .setColor(3093046)
                .setDescription([
                    `${client.language({ textId: "Initial bid", guildId: interaction.guildId, locale: interaction.locale })}: ${auction.bet?.initial ? `${initialBetEmoji}${auction.bet.initial.toLocaleString()}` : `${client.language({ textId: "Initial bid needs to be set", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `${client.language({ textId: "Bid step", guildId: interaction.guildId, locale: interaction.locale })}: ${auction.bet?.step ? `${initialBetEmoji}${auction.bet.step.toLocaleString()}` : `${client.language({ textId: "Bid step needs to be set", guildId: interaction.guildId, locale: interaction.locale })}`}`
                ].join("\n"))
                .setFields([
                    { name: `${client.language({ textId: "Initial bid", guildId: interaction.guildId, locale: interaction.locale })}`, value: `${client.language({ textId: "This is the bid that needs to be placed initially if there are no active auction participants", guildId: interaction.guildId, locale: interaction.locale })}` },
                    { name: `${client.language({ textId: "Bid step", guildId: interaction.guildId, locale: interaction.locale })}`, value: `${client.language({ textId: "If there are active auction participants, the bid step needs to be added on top of the first place participant's bid", guildId: interaction.guildId, locale: interaction.locale })}` }
                ])
            const components = [
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder().setLabel(`${client.language({ textId: "Set initial bid", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}id{${auction.id}} edit initial`),
                    new ButtonBuilder().setLabel(`${client.language({ textId: "Set bid step", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}id{${auction.id}} edit step`).setDisabled(!auction.bet?.initial),
                    new ButtonBuilder().setLabel(`${client.language({ textId: "Create auction", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Success).setCustomId(`cmd{auctions}id{${auction.id}} edit create`).setDisabled(!auction.bet?.initial || !auction.bet?.step),
                ])
            ]
            if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components, flags: ["Ephemeral"] })
            else return interaction.update({ embeds: [embed], components })
        }
        if (args?.Subcommand === "view" || interaction.customId?.includes("view")) {
            let min = 0
            let limit = 20
            if (interaction.customId?.includes("limit")) {
                limit = +LimitRegexp.exec(interaction.customId)?.[1]
                min = limit - 20
                if (isNaN(limit) || isNaN(min)) {
                    limit = +LimitRegexp.exec(interaction.customId)?.[1]
                    min = limit - 20  
                }
            }
            const auctions = client.cache.auctions.filter(e => e.status === "started")
            let array_btn = [
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}limit{20}1 view`).setDisabled((auctions.size <= 20 && min == 0) || (auctions.size > 20 && min < 20)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}limit{${limit - 20}}2 view`).setDisabled((auctions.size <= 20 && min == 0) || (auctions.size > 20 && min < 20)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}limit{${limit + 20}}3 view`).setDisabled((auctions.size <= 20 && min == 0) || (auctions.size > 20 && min >= auctions.size - 20)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}limit{${auctions.size + (auctions.size % 20 == 0 ? 0 : 20 - (auctions.size % 20))}}4 view`).setDisabled((auctions.size <= 20 && min == 0) || (auctions.size > 20 && min >= auctions.size - 20))
            ]
            const embed = new EmbedBuilder()
                .setTitle(`${client.language({ textId: "Auctions", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setDescription(
                    auctions.size ? auctions.map(e => e).slice(min, limit).map((auction, index) => {
                        let auctionItem
                        if (auction.item.type === RewardType.Role) {
                            const guildRole = interaction.guild.roles.cache.get(auction.item.id)
                            auctionItem = `${guildRole.name} (${auction.item.amount.toLocaleString()}) ${auction.item.ms ? `[${client.functions.transformSecs(client, auction.item.ms, interaction.guildId, interaction.locale)}]` : ""}`
                        }
                        if (auction.item.type === RewardType.Item) {
                            const item = client.cache.items.get(auction.item.id)
                            auctionItem = `${item.displayEmoji}${item.name} (${auction.item.amount.toLocaleString()})`
                        }
                        return `${index+1+min}. ${auctionItem} ➜ https://discord.com/channels/${auction.guildID}/${auction.channelId}/${auction.messageId}`
                    }).join("\n") : `${client.language({ textId: "No auctions", guildId: interaction.guildId, locale: interaction.locale })}`
                )
                .setColor(3093046)
            if (interaction.isChatInputCommand()) return interaction.reply({ 
                embeds: [embed],
                components: [new ActionRowBuilder().setComponents(array_btn)],
                flags: ["Ephemeral"]
            }) 
            else return interaction.update({ 
                embeds: [embed],
                components: [new ActionRowBuilder().setComponents(array_btn)]
            })
        }
        if (interaction.customId?.includes("placeBet")) {
            const auction = client.cache.auctions.find(e => e.id === idRegexp.exec(interaction.customId)?.[1] && e.guildID === interaction.guildId)
            if (!auction) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This auction no longer exists", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (auction.creatorId === interaction.user.id) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Auction creator cannot place bids", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            const modal = new ModalBuilder()
                .setCustomId(`auctions_placeBet_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Add bid", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(settings.currencyName)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("bet")
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        ),
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `auctions_placeBet_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                if (isNaN(+modalArgs.bet) || !Number.isInteger(+modalArgs.bet)) {
                    return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.bet}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                modalArgs.bet = +modalArgs.bet
                if (modalArgs.bet <= 0) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Amount cannot be", guildId: interaction.guildId, locale: interaction.locale })} <= 0`, flags: ["Ephemeral"] })
                }
                if (profile.currency < modalArgs.bet) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}${settings.currencyName} (${modalArgs.bet.toLocaleString()})`, flags: ["Ephemeral"] })
                }
                if (!auction.participants.length) {
                    if (modalArgs.bet < auction.bet.initial) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Initial bid must be", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}${settings.currencyName} (${auction.bet.initial.toLocaleString()})`, flags: ["Ephemeral"] })
                    }
                    profile.subtractCurrency(modalArgs.bet, false, true)
                    profile.save()
                    auction.participants.push({ userID: interaction.user.id, bet: { type: RewardType.Currency, amount: modalArgs.bet } })
                    await auction.save()
                } else {
                    const participant = auction.participants.find(e => { return e.userID === interaction.user.id })
                    const min_bet = auction.participants.sort((a, b) => b.bet.amount - a.bet.amount)[0].bet.amount + auction.bet.step - (participant?.bet.amount || 0)
                    if (modalArgs.bet < min_bet) {
                        return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Next bid must be at least", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}${settings.currencyName} (${min_bet.toLocaleString()})`, flags: ["Ephemeral"] })
                    }
                    profile.subtractCurrency(modalArgs.bet, false, true)
                    profile.save()
                    const channel = interaction.guild.channels.cache.get(auction.channelId)
                    const message = await channel.messages.fetch(auction.messageId).catch(e => null)
                    if (channel && message && channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessagesInThreads) && interaction.user.id !== auction.participants.sort((a, b) => b.bet.amount - a.bet.amount)[0].userID) {
                        let thread
                        if (!message.hasThread) {
                            if (channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.CreatePublicThreads)) thread = await message.startThread({ name: `${client.language({ textId: "Auction: comments", guildId: interaction.guildId })}`, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay }).catch(e => null)
                        } else thread = message.thread
                        if (thread) {
                            const participant_leader = auction.participants.sort((a, b) => b.bet.amount - a.bet.amount)[0]
                            thread.send({ content: `<@${participant_leader.userID}>, ${client.language({ textId: "your bid has been outbid", guildId: interaction.guildId })}` })
                        }
                    }
                    if (!participant) auction.participants.push({ userID: interaction.user.id, bet: { type: RewardType.Currency, amount: modalArgs.bet } })
                    else {
                        participant.bet.amount += modalArgs.bet
                    }
                    if (auction.endDate.getTime() - Date.now() <= 1 * 60 * 60 * 1000) {
                        auction.endDate = new Date(auction.endDate.getTime() + 1 * 60 * 60 * 1000)
                        auction.resetTimeout()    
                    }
                    await auction.save()
                }
                auction.updateMessage(interaction)
            } else return
        }
        if (interaction.customId?.includes("participants")) {
            const auction = client.cache.auctions.find(e => e.id === idRegexp.exec(interaction.customId)?.[1] && e.guildID === interaction.guildId)
            const initialBetEmoji = auction.bet?.type === RewardType.Currency ? settings.displayCurrencyEmoji : auction.bet?.type === RewardType.Item ? client.cache.items.get(auction.bet.id).displayEmoji : undefined
            let min = 0
            let limit = 10
            if (interaction.customId.includes("limit")) {
                limit = +LimitRegexp.exec(interaction.customId)?.[1]
                min = limit - 10
                if (isNaN(limit) || isNaN(min)) {
                    limit = +LimitRegexp.exec(interaction.customId)?.[1]
                    min = limit - 10  
                }
            }
            let array_btn = [
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}id{${auction.id}}limit{10}1 participants`).setDisabled((auction.participants.length <= 10 && min == 0) || (auction.participants.length > 10 && min < 10)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}id{${auction.id}}limit{${limit - 10}}2 participants`).setDisabled((auction.participants.length <= 10 && min == 0) || (auction.participants.length > 10 && min < 10)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}id{${auction.id}}limit{${limit + 10}}3 participants`).setDisabled((auction.participants.length <= 10 && min == 0) || (auction.participants.length > 10 && min >= auction.participants.length - 10)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{auctions}id{${auction.id}}limit{${auction.participants.length + (auction.participants.length % 10 == 0 ? 0 : 10 - (auction.participants.length % 10))}}4 participants`).setDisabled((auction.participants.length <= 10 && min == 0) || (auction.participants.length > 10 && min >= auction.participants.length - 10))
            ]
            const embed = new EmbedBuilder()
                .setColor(3093046)
                .setTitle(`${client.language({ textId: "All participants", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setDescription(auction.participants.sort((a, b) => b.bet.amount - a.bet.amount).slice(min, limit).map((e, index) => `${index+1+min}. <@${e.userID}> ➜ ${initialBetEmoji}${e.bet.amount.toLocaleString()} ${index+min === 0 ? `(${client.language({ textId: "Will win at auction end", guildId: interaction.guildId, locale: interaction.locale })})` : ``}`).join("\n"))
            if (!interaction.customId.includes("limit")) return interaction.reply({ 
                embeds: [embed],
                components: [new ActionRowBuilder().setComponents(array_btn)],
                flags: ["Ephemeral"]
            })
            else return interaction.update({ 
                embeds: [embed],
                components: [new ActionRowBuilder().setComponents(array_btn)]
            })
        }
    }
}