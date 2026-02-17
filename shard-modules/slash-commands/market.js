const { ButtonBuilder, ApplicationCommandOptionType, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, RoleSelectMenuBuilder, Colors, LabelBuilder } = require("discord.js")
const { handleEmojiError } = require("../handler/componentUtils")
const LotRegexp = /lot{(.*?)}/
const LimitRegexp = /lim{(.*?)}/
const uniqid = require('uniqid')
const { RewardType, AchievementType } = require('../enums/index')
const Lot = require("../classes/Lot")
module.exports = {
    name: 'market',
    nameLocalizations: {
        'ru': `маркет`,
        'uk': `маркет`,
        'es-ES': `mercado`
    },
    description: 'Items market of users',
    descriptionLocalizations: {
        'ru': `Маркет предметов пользователей`,
        'uk': `Маркет предметів користувачів`,
        'es-ES': `Mercado de objetos de usuarios`
    },
    options: [
        {
			name: 'view',
            nameLocalizations: {
                'ru': `просмотр`,
                'uk': `перегляд`,
                'es-ES': `ver`
            },
            description: 'View all lots',
            descriptionLocalizations: {
                'ru': `Просмотр всех лотов`,
                'uk': `Перегляд усіх лотів`,
                'es-ES': `Ver todos los lotes`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'item',
                    nameLocalizations: {
                        'ru': `предмет`,
                        'uk': `предмет`,
                        'es-ES': `objeto`
                    },
                    description: 'Filter by item',
                    descriptionLocalizations: {
                        'ru': `Фильтр по предмету`,
                        'uk': `Фільтр за предметом`,
                        'es-ES': `Filtrar por objeto`
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                },
                {
                    name: 'role',
                    nameLocalizations: {
                        'ru': `роль`,
                        'uk': `роль`,
                        'es-ES': `rol`
                    },
                    description: 'Filter by role',
                    descriptionLocalizations: {
                        'ru': `Фильтр по роли`,
                        'uk': `Фільтр за роллю`,
                        'es-ES': `Filtrar por rol`
                    },
                    type: ApplicationCommandOptionType.Role
                },
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `пользователь`,
                        'uk': `користувач`,
                        'es-ES': `usuario`
                    },
                    description: 'Filter by user',
                    descriptionLocalizations: {
                        'ru': `Фильтр по пользователю`,
                        'uk': `Фільтр за користувачем`,
                        'es-ES': `Filtrar por usuario`
                    },
                    type: ApplicationCommandOptionType.User,
                }
            ]
		},
        {
			name: 'create',
            nameLocalizations: {
                'ru': `создать`,
                'uk': `створити`,
                'es-ES': `crear`
            },
            description: 'Create lot',
            descriptionLocalizations: {
                'ru': `Создать лот`,
                'uk': `Створити лот`,
                'es-ES': `Crear lote`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `количество`,
                        'uk': `кількість`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount',
                    descriptionLocalizations: {
                        'ru': `Количество`,
                        'uk': `Кількість`,
                        'es-ES': `Cantidad`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    required: true
                },
                {
                    name: 'item',
                    nameLocalizations: {
                        'ru': `предмет`,
                        'uk': `предмет`,
                        'es-ES': `objeto`
                    },
                    description: 'Item to sell',
                    descriptionLocalizations: {
                        'ru': `Предмет на продажу`,
                        'uk': `Предмет на продаж`,
                        'es-ES': `Objeto para vender`
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                },
                {
                    name: 'role',
                    nameLocalizations: {
                        'ru': `роль`,
                        'uk': `роль`,
                        'es-ES': `rol`
                    },
                    description: 'Role to sell',
                    descriptionLocalizations: {
                        'ru': `Роль на продажу`,
                        'uk': `Роль на продаж`,
                        'es-ES': `Rol para vender`
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true
                }
            ]
		},
        {
			name: 'buy',
            nameLocalizations: {
                'ru': `купить`,
                'uk': `купити`,
                'es-ES': `comprar`
            },
            description: 'Buy lot',
            descriptionLocalizations: {
                'ru': `Купить лот`,
                'uk': `Купити лот`,
                'es-ES': `Comprar lote`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'lot_id',
                    nameLocalizations: {
                        'ru': `лот_id`,
                        'uk': `лот_id`,
                        'es-ES': `id_lote`
                    },
                    description: 'ID of lot',
                    descriptionLocalizations: {
                        'ru': `ID лота`,
                        'uk': `ID лоту`,
                        'es-ES': `ID del lote`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                },
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `количество`,
                        'uk': `кількість`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount',
                    descriptionLocalizations: {
                        'ru': `Количество`,
                        'uk': `Кількість`,
                        'es-ES': `Cantidad`
                    },
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    required: true
                }
            ]
		}
    ],
    dmPermission: false,
    group: `general-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        const settings = client.cache.settings.get(interaction.guildId)
        if (args?.Subcommand === "create" || interaction.customId?.includes("create")) {
            const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            let lot
            if (interaction.isChatInputCommand()) {
                if (!args.item && !args.role) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Arguments 'Item' or 'Role' must be filled", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                let type
                let id
                let ms
                if (args.item) {
                    const item = client.cache.items.find(item => !item.temp && item.enabled && item.found && item.guildID === interaction.guildId && item.name === args.item)
                    if (!item) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This item does not exist or is unknown", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                    }
                    if (item.notSellable) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Error: this item is not allowed to be sold on the market", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                    }
                    const userItem = profile.inventory.find(e => { return e.itemID === item.itemID })
                    if (args.amount > (userItem?.amount || 0)) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}${item.name} (${userItem?.amount || 0})**`, flags: ["Ephemeral"] })
                    }
                    id = item.itemID
                    type = RewardType.Item
                } else if (args.role) {
                    const roleInventory = profile.inventoryRoles?.find(e => e.uniqId === args.role)
                    if (!roleInventory) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found in inventory", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                    }
                    const role = interaction.guild.roles.cache.get(roleInventory.id)
                    if (!role) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${roleInventory.id})**`, flags: ["Ephemeral"] })
                    }
                    const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                    if (roleProperties && roleProperties.cannotSell) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be sold", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                    }
                    if (args.amount > (roleInventory?.amount || 0)) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} <@&${role.id}> (${roleInventory?.amount || 0})**`, flags: ["Ephemeral"] })
                    }
                    id = roleInventory.uniqId
                    type = RewardType.Role
                    ms = roleInventory.ms
                }
                await interaction.deferReply({ flags: ["Ephemeral"] })
                lot = new client.marketSchema({
                    guildID: interaction.guildId,
                    userID: interaction.user.id,
                    lotID: uniqid.time(),
                    item: {
                        type: type,
                        id: id,
                        amount: args.amount,
                        ms: ms
                    },
                    items: [],
                    created: Date.now(),
                    enable: false,
                    lifeTime: settings.marketStorageLifeDays ? Date.now() + settings.marketStorageLifeDays * 24 * 60 * 60 * 1000 : undefined
                })
                await lot.save()
                lot = new Lot(client, lot)
                client.cache.lots.set(lot.lotID, lot)
            } else {
                lot = client.cache.lots.get(LotRegexp.exec(interaction.customId)?.[1])
                if (!lot) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This lot no longer exists", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
            }
            if (lot.item.type === RewardType.Item) {
                const item = client.cache.items.find(item => !item.temp && item.enabled && item.found && item.guildID === interaction.guildId && item.itemID === lot.item.id)
                if (!item) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This item does not exist or is unknown", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                if (item.notSellable) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Error: this item is not allowed to be sold on the market", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }    
            } else if (lot.item.type === RewardType.Role) {
                const roleInventory = profile.inventoryRoles.find(e => e.uniqId === lot.item.id)
                const role = interaction.guild.roles.cache.get(roleInventory.id)
                if (!role) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${roleInventory.id})**`, flags: ["Ephemeral"] })
                }
                const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                if (roleProperties && roleProperties.cannotSell) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be sold", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                }
            }
            if (interaction.isButton()) {
                if (lot.enable) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This lot is already published on the market, further editing is prohibited", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                if (interaction.customId.includes("done")) {
                    if (!lot.items.length) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Specify the lot price", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                    }
                    for (const element of lot.items) {
                        if (element.type === RewardType.Item) {
                            const item = client.cache.items.find(e => !e.temp && e.enabled && e.itemID == element.id && e.found)
                            if (!item) {
                                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Unknown item", guildId: interaction.guildId, locale: interaction.locale })} **${element.id}**`, flags: ["Ephemeral"] })    
                            }
                            if (item.notSellable) {
                                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "cannot be set as a price on the market", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })    
                            }
                        }
                        if (element.type === RewardType.Role) {
                            const role = interaction.guild.roles.cache.get(lot.item.id)
                            if (!role) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${lot.item.id})**`, flags: ["Ephemeral"] })
                            }
                            const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                            if (roleProperties && roleProperties.cannotSell) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be set as a price", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                            }
                        }
                    }
                    if (lot.item.type === RewardType.Item) {
                        const item = client.cache.items.find(e => !e.temp && e.itemID == lot.item.id && e.enabled)
                        if (!item) {
                            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Unknown item", guildId: interaction.guildId, locale: interaction.locale })} (${lot.item.id})`, flags: ["Ephemeral"] })
                        }
                        if (item.notSellable) {
                            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Error: this item is not allowed to be sold on the market", guildId: interaction.guildId, locale: interaction.locale })} (${item.displayEmoji}**${item.name}**)`, flags: ["Ephemeral"] })
                        }
                        const userItem = profile.inventory.find((item) => { return item.itemID == lot.item.id })
                        if (lot.item.amount > (userItem?.amount || 0)) {
                            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}${item.name} (${userItem?.amount || 0})**`, flags: ["Ephemeral"] })
                        }
                        userItem.amount -= lot.item.amount
                        await profile.save()
                        lot.enable = true
                        await lot.save()
                        await interaction.update({ content: `${client.config.emojis.YES}${client.language({ textId: "Lot was published on the market", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** (${lot.item.amount})${lot.lifeTime ? `\n${client.language({ textId: "Storage expiration date", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(lot.lifeTime/1000)}:f>` : ``}`, embeds: [], components: [] })
                        if (settings.channels.marketChannel) {
                            const channel = interaction.guild.channels.cache.get(settings.channels.marketChannel)
                            if (!channel) return
                            const embed = new EmbedBuilder()
                                .setAuthor({ iconURL: interaction.member.displayAvatarURL(), name: interaction.member.displayName })
                                .setTitle(`${client.language({ textId: "Lot published on the market", guildId: interaction.guildId })}`)
                                .setDescription([
                                    `${item.displayEmoji}${item.name} (${lot.item.amount})`,
                                    `${client.language({ textId: "Price per 1 pc.", guildId: interaction.guildId })}:`,
                                    await Promise.all(lot.items.map(async i => {
                                        if (i.type === RewardType.Currency) {
                                            return `${settings.displayCurrencyEmoji}${settings.currencyName} (${i.amount.toLocaleString()})`
                                        }
                                        if (i.type === RewardType.Item) {
                                            const it = client.cache.items.find(e => e.itemID === i.id && !e.temp && e.enabled && e.found && !e.notSellable)
                                            return `${it?.displayEmoji || ""}${it?.name || i.id} (${i.amount.toLocaleString()})`
                                        }
                                        if (i.type === RewardType.Role) {
                                            return `<@&${i.id}> (${i.amount.toLocaleString()})`
                                        }
                                    })).then(array => array.join("\n")),
                                    lot.lifeTime ? `${client.language({ textId: "Storage expiration date", guildId: interaction.guildId })}: <t:${Math.floor(lot.lifeTime/1000)}:f>` : undefined
                                ].filter(e => e).join("\n"))
                                .setThumbnail(item.image || await item.getEmojiURL())
                                .setColor(Colors.White)
                            const message = await channel.send({
                                embeds: [embed],
                                components: [
                                    new ActionRowBuilder()
                                        .setComponents(
                                            new ButtonBuilder()
                                                .setCustomId(`cmd{market-buy}lot{${lot.lotID}}`)
                                                .setLabel(`${client.language({ textId: "Buy", guildId: interaction.guildId })}`)
                                                .setStyle(ButtonStyle.Success)
                                                .setEmoji(item.emoji)
                                        )
                                ]
                            }).catch(async e => {
                                if (e.message.includes(`Invalid emoji`)) {
                                    return await channel.send({
                                        embeds: [embed],
                                        components: [
                                            new ActionRowBuilder()
                                                .setComponents(
                                                    new ButtonBuilder()
                                                        .setCustomId(`cmd{market-buy}lot{${lot.lotID}}`)
                                                        .setLabel(`${client.language({ textId: "Buy", guildId: interaction.guildId })}`)
                                                        .setStyle(ButtonStyle.Success)
                                                )
                                        ]
                                    })
                                } else {
                                    client.functions.sendError(e)
                                    return null
                                }
                            })
                            if (message) {
                                lot.channelId = channel.id
                                lot.messageId = message.id
                                await lot.save()
                            }
                        }
                        return
                    }
                    if (lot.item.type === RewardType.Role) {
                        const roleInventory = profile.inventoryRoles?.find(e => { return e.uniqId === lot.item.id })
                        if (!roleInventory) {
                            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found in inventory", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                        }
                        const role = interaction.guild.roles.cache.get(roleInventory.id)
                        if (!role) {
                            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${roleInventory.id})**`, flags: ["Ephemeral"] })
                        }
                        const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                        if (roleProperties && roleProperties.cannotSell) {
                            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be sold", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                        }
                        if (lot.item.amount > (roleInventory?.amount || 0)) {
                            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} <@&${role.id}> (${roleInventory?.amount || 0})**`, flags: ["Ephemeral"] })
                        }
                        profile.subtractRole(role.id, lot.item.amount, roleInventory.ms)
                        await profile.save()
                        lot.enable = true
                        lot.item.id = role.id
                        await lot.save()
                        await interaction.update({ content: `${client.config.emojis.YES}${client.language({ textId: "Lot was published on the market", guildId: interaction.guildId, locale: interaction.locale })} <@&${role.id}>${roleInventory.ms ? ` [${client.functions.transformSecs(client, roleInventory.ms, interaction.guildId, interaction.locale)}]` : ``} (${lot.item.amount})${lot.lifeTime ? `\n${client.language({ textId: "Storage expiration date", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(lot.lifeTime/1000)}:f>` : ``}`, embeds: [], components: [] })
                        if (settings.channels.marketChannel) {
                            const channel = interaction.guild.channels.cache.get(settings.channels.marketChannel)
                            if (!channel) return
                            const embed = new EmbedBuilder()
                                .setAuthor({ iconURL: interaction.member.displayAvatarURL(), name: interaction.member.displayName })
                                .setTitle(`${client.language({ textId: "Lot published on the market", guildId: interaction.guildId })}`)
                                .setDescription([
                                    `<@&${role.id}>${roleInventory.ms ? ` [${client.functions.transformSecs(client, roleInventory.ms, interaction.guildId, interaction.locale)}]` : ``} (${lot.item.amount})`,
                                    `${client.language({ textId: "Price per 1 pc.", guildId: interaction.guildId })}:`,
                                    await Promise.all(lot.items.map(async i => {
                                        if (i.type === RewardType.Currency) {
                                            return `${settings.displayCurrencyEmoji}${settings.currencyName} (${i.amount.toLocaleString()})`
                                        }
                                        if (i.type === RewardType.Item) {
                                            const it = client.cache.items.find(e => e.itemID === i.id && !e.temp && e.enabled && e.found && !e.notSellable)
                                            return `${it?.displayEmoji || ""}${it?.name || i.id} (${i.amount.toLocaleString()})`
                                        }
                                        if (i.type === RewardType.Role) {
                                            return `<@&${i.id}> (${i.amount.toLocaleString()})`
                                        }
                                    })).then(array => array.join("\n")),
                                    lot.lifeTime ? `${client.language({ textId: "Storage expiration date", guildId: interaction.guildId })}: <t:${Math.floor(lot.lifeTime/1000)}:f>` : undefined
                                ].filter(e => e).join("\n"))
                                .setColor(Colors.White)
                            const message = await channel.send({
                                embeds: [embed],
                                components: [
                                    new ActionRowBuilder()
                                        .setComponents(
                                            new ButtonBuilder()
                                                .setCustomId(`cmd{market-buy}lot{${lot.lotID}}`)
                                                .setLabel(`${client.language({ textId: "Buy", guildId: interaction.guildId })}`)
                                                .setStyle(ButtonStyle.Success)
                                        )
                                ]
                            })
                            if (message) {
                                lot.channelId = channel.id
                                lot.messageId = message.id
                                await lot.save()
                            }
                        }
                        return
                    }
                } else
                if (interaction.customId.includes("delete")) {
                    await lot.delete()
                    return interaction.update({ content: `${client.config.emojis.YES}**${client.language({ textId: "Lot deleted", guildId: interaction.guildId, locale: interaction.locale })}**`, embeds: [], components: [] })
                } else
                if (interaction.customId.includes("clearPrice")) {
                    lot.items = []
                    await lot.save()
                } else
                if (interaction.customId.includes("addItem")) {
                    let id
                    let type = RewardType.Currency
                    const modalComponents = [
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("amount")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                            )
                    ]
                    if (interaction.customId.includes("item")) {
                        type = RewardType.Item
                        modalComponents.unshift(
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("item")
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                )
                        )
                    }
                    if (interaction.customId.includes("role")) {
                        if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
							return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "I don't have permission to manage roles", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                        const embeds = JSON.parse(JSON.stringify(interaction.message.embeds))
                        interaction.message.components.forEach(row => row.components.forEach(component => {
                            component.data.disabled = true
                        }))
                        await interaction.update({ components: interaction.message.components })
						await interaction.followUp({ 
							components: [
								new ActionRowBuilder()
									.addComponents(
										new RoleSelectMenuBuilder()
											.setCustomId(`addRole`)
											.setPlaceholder(`${client.language({ textId: "Select a role", guildId: interaction.guildId, locale: interaction.locale })}...`)
									),
								new ActionRowBuilder().addComponents(
									new ButtonBuilder()
										.setCustomId("addRoleCancel")
										.setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
										.setStyle(ButtonStyle.Danger)
								)
							],
							flags: ["Ephemeral"]
						})    
						const filter = (i) => i.customId.includes(`addRole`) && i.user.id === interaction.user.id
						interaction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => interaction)
						if (interaction && interaction.customId.includes("addRole")) {
							if (interaction.customId === "addRole") {
								const role = interaction.roles.first()
								if (!interaction.guild.members.me.permissions.has("ManageRoles") || interaction.guild.members.me.roles.highest.position <= role.position) {
									await interaction.update({ embeds: embeds, components: components })
                                    return interaction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "No permission to manage this role", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
									
								}
                                const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                                if (roleProperties && roleProperties.cannotSell) {
                                    await interaction.update({ embeds: embeds, components: components })
                                    return interaction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be set as a price", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                                }
                                id = role.id
                                type = RewardType.Role
                            } else {
                                return interaction.update({ embeds: embeds, components: components })
							}
                        } else return interaction.update({ embeds: embeds, components: components })
                    }
                    const modal = new ModalBuilder()
                        .setCustomId(`market_addItem_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Add price", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents(modalComponents)
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `market_addItem_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        await interaction.deferUpdate()
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        let pass = true
                        if (type === RewardType.Item) {
                            const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()) && e.found && e.enabled)
                            if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
                                let result = ""
                                filteredItems.forEach(item => {
                                    result += `> ${item.displayEmoji}**${item.name}**\n`	
                                })
                                pass = false
                                await interaction.followUp({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), components: [], flags: ["Ephemeral"] })  
                            } else {
                                searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
                                if (!searchedItem) {
                                    pass = false
                                    await interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                }
                                else {
                                    if (searchedItem.notSellable) {
                                        pass = false
                                        await interaction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${searchedItem.displayEmoji}**${searchedItem.name}** ${client.language({ textId: "cannot be set as a price on the market", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })  
                                    } else {
                                        id = searchedItem.itemID
                                    }
                                }
                            }
                        } else if (type === RewardType.Currency) id = undefined
                        if (pass) {
                            if (isNaN(+modalArgs.amount)) {
                                await interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                            } else {
                                modalArgs.amount = +modalArgs.amount
                                if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
                                    await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Amount must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100 000 000 000`, components: [], flags: ["Ephemeral"] })
                                } else {
                                    const lotItem = lot.items.find(e => { return e.type === type && e.id === id })
                                    if (lotItem) {
                                        if (modalArgs.amount === 0) lot.items = lot.items.filter(e => e.id !== id && e.type !== type)
                                        else lotItem.amount = modalArgs.amount
                                    } else {
                                        if (modalArgs.amount > 0) {
                                            if (lot.items.length >= 5) {
                                                await interaction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Maximum number of items for price reached", guildId: interaction.guildId, locale: interaction.locale })}: 5**`, components: [], flags: ["Ephemeral"] })
                                            } else {
                                                lot.items.push({
                                                    type: type,
                                                    id: id,
                                                    amount: modalArgs.amount
                                                })    
                                            }
                                        }
                                    }
                                    await lot.save()
                                }
                            }    
                        }
                    }
                }
            }
            let sellingItem
            if (lot.item.type === RewardType.Item) {
                const item = client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.enabled)
                sellingItem = `${item?.displayEmoji || ""}${item.name} (${lot.item.amount.toLocaleString()})`
            }
            if (lot.item.type === RewardType.Role) {
                const role = profile.inventoryRoles.find(e => e.uniqId === lot.item.id)
                sellingItem = `<@&${role.id}>${role.ms ? ` [${client.functions.transformSecs(client, role.ms, interaction.guildId, interaction.locale)}]` : ``} (${lot.item.amount.toLocaleString()})`
            }
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${client.language({ textId: "Creating lot", guildId: interaction.guildId, locale: interaction.locale })}` })
                .setFields([
                    {
                        name: `${client.language({ textId: "Sell", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: sellingItem
                    },
                    {
                        name: `${client.language({ textId: "Price (per one unit of item)", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: !lot.items.length ? `**${client.language({ textId: "Add price", guildId: interaction.guildId, locale: interaction.locale })}**` : await Promise.all(lot.items.map(async i => {
                            if (i.type === RewardType.Currency) {
                                return `${settings.displayCurrencyEmoji}${settings.currencyName} (${i.amount.toLocaleString()})`
                            }
                            if (i.type === RewardType.Item) {
                                const it = client.cache.items.find(e => e.itemID === i.id && !e.temp && e.enabled && e.found && !e.notSellable)
                                return `${it?.displayEmoji || ""}${it?.name || i.id} (${i.amount.toLocaleString()})`
                            }
                            if (i.type === RewardType.Role) {
                                return `<@&${i.id}> (${i.amount.toLocaleString()})`
                            }
                        })).then(array => array.join("\n"))
                    },
                    lot.lifeTime ? {
                        name: `${client.language({ textId: "Storage expiration date", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `<t:${Math.floor(lot.lifeTime/1000)}:f>`
                    } : undefined,
                    {
                        name: `${client.language({ textId: "Full list of items", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `</items:1150455842076905504>`
                    }
                ].filter(e => e))
                .setFooter({ text: `ID: ${lot.lotID}` })
                .setColor(3093046)
            const create_btn = new ButtonBuilder()
                .setCustomId(`cmd{market}lot{${lot.lotID}}create done`)
                .setLabel(`${client.language({ textId: "Create", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Success)
            const delete_btn = new ButtonBuilder()
                .setCustomId(`cmd{market}lot{${lot.lotID}}create delete`)
                .setLabel(`${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Danger)
            const clearPrice_btn = new ButtonBuilder()
                .setCustomId(`cmd{market}lot{${lot.lotID}}create clearPrice`)
                .setLabel(`${client.language({ textId: "Clear price", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!lot.items.length)
            const addItem_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setLabel(`${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setEmoji(client.config.emojis.box)
                .setCustomId(`cmd{market}lot{${lot.lotID}}create addItem_item`)
            const addCur_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setLabel(`${settings.currencyName}`)
                .setEmoji(settings.displayCurrencyEmoji)
                .setCustomId(`cmd{market}lot{${lot.lotID}}create addItem_currency`)
            const addRole_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setLabel(`${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setEmoji(client.config.emojis.roles)
                .setCustomId(`cmd{market}lot{${lot.lotID}}create addItem_role`)
            const addPrice_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`${client.language({ textId: "Price", guildId: interaction.guildId, locale: interaction.locale })}:`)
                .setCustomId(`0`)
                .setDisabled(true)
            if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(addPrice_btn, addItem_btn, addCur_btn, addRole_btn), new ActionRowBuilder().addComponents(create_btn, clearPrice_btn, delete_btn)] })
            else return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(addPrice_btn, addItem_btn, addCur_btn, addRole_btn), new ActionRowBuilder().addComponents(create_btn, clearPrice_btn, delete_btn)] })
        }
        if (args?.Subcommand === "view" || interaction.customId?.includes("view")) {
            let lots_raw
            let min = 0
            let max = 25
            if (interaction.isChatInputCommand()) {
                const message = await interaction.deferReply({ flags: ["Ephemeral"], fetchReply: true })
                const query = { guildID: interaction.guildId, enable: true }
                if (args.user) query.userID = args.user
                if (args.item) {
                    const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.found && item.enabled && item.name.toLowerCase().includes(args.item.toLowerCase()))
                    if (items.size) {
                        query["item.id"] = { $in: items.map(e => e.itemID) }
                    }    
                }
                if (args.role) {
                    query["item.id"] = args.role
                }
                lots_raw = await client.marketSchema.find(query).sort({ created: -1 }).lean()
                client.marketFilters.set(message.id, query)
            } else {
                max = +LimitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                if (!client.marketFilters.get(interaction.message.id)) {
                    return interaction.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "Filter data no longer exists, restart the command", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"], embeds: [], components: [] })
                }
                lots_raw = await client.marketSchema.find(client.marketFilters.get(interaction.message.id)).sort({ created: -1 }).lean()
                if (interaction.customId.includes("delete")) {
                    const lot = client.cache.lots.find(e => e.lotID === interaction.values[0] && e.enable)
                    if (!lot) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This lot no longer exists", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                    }
                    await lot.return()
                    lots_raw = await client.marketSchema.find(client.marketFilters.get(interaction.message.id)).sort({ created: -1 }).lean()
                }
                if (interaction.customId.includes("buy")) {
                    const lotID = interaction.values[0]
                    const lot = client.cache.lots.find(e => e.lotID === lotID && e.enable)
                    if (!lot) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This lot no longer exists", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                    }
                    const modal = new ModalBuilder()
                        .setCustomId(`market_buy_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Buy lot", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `market_buy_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                    let amount
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
                            return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                        }
                        modalArgs.amount = +modalArgs.amount
                        if (modalArgs.amount <= 0) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Amount must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0`, components: [], flags: ["Ephemeral"] })
                        }
                        amount = modalArgs.amount
                    } else return
                    for (const element of lot.items) {
                        if (element.type === RewardType.Item) {
                            const item = client.cache.items.find(e => !e.temp && e.enabled && e.itemID == element.id && e.found)
                            if (!item) {
                                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Unknown item", guildId: interaction.guildId, locale: interaction.locale })} **${element.id}**`, flags: ["Ephemeral"] })    
                            }
                            if (item.notSellable) {
                                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "cannot be set as a price on the market", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })    
                            }
                        }
                        if (element.type === RewardType.Role) {
                            const role = interaction.guild.roles.cache.get(lot.item.id)
                            if (!role) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${lot.item.id})**`, flags: ["Ephemeral"] })
                            }
                            const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                            if (roleProperties && roleProperties.cannotSell) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be set as a price", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                            }
                        }
                    }
                    if (lot.item.type === RewardType.Item) {
                        const item = client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.enabled)
                        if (!item) {
                            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Unknown item", guildId: interaction.guildId, locale: interaction.locale })} (${lot.item.id})`, flags: ["Ephemeral"] })
                        }
                        if (item.notSellable) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "cannot be bought on the market", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }    
                    }
                    if (lot.item.type === RewardType.Role) {
                        const role = interaction.guild.roles.cache.get(lot.item.id)
                        if (!role) {
                            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${lot.item.id})**`, flags: ["Ephemeral"] })
                        }
                        const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                        if (roleProperties && roleProperties.cannotSell) {
                            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be bought", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                        }
                    }
                    if (lot.item.amount < amount) amount = lot.item.amount
                    const profileSeller = await client.functions.fetchProfile(client, lot.userID, interaction.guildId)
                    const memberSeller = await interaction.guild.members.fetch(lot.userID)
                    const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                    let canBuy = true
                    const notEnough = []
                    for (let item of lot.items) {
                        if (item.type === RewardType.Item) {
                            const serverItem = client.cache.items.find(e => !e.temp && e.itemID == item.id && e.enabled)
                            if (!serverItem) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This item does not exist or is unknown", guildId: interaction.guildId, locale: interaction.locale })} (${item.id})**`, flags: ["Ephemeral"] })
                            }
                            const buyerUserItem = profile.inventory.find((e) => { return e.itemID == item.id })
                            if (!buyerUserItem || buyerUserItem.amount < item.amount * amount) {
                                notEnough.push(`${serverItem.displayEmoji}${serverItem.name} (${item.amount * amount - (buyerUserItem?.amount || 0)})`)
                                canBuy = false
                            }  
                        }
                        if (item.type === RewardType.Currency) {
                            if (profile.currency < item.amount * amount) {
                                notEnough.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${item.amount * amount - profile.currency})`)
                                canBuy = false
                            }
                        }
                        if (item.type === RewardType.Role) {
                            const role = interaction.guild.roles.cache.get(item.id)
                            if (!role) {
                                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${item.id})**`, flags: ["Ephemeral"] })
                            }
                            const roleInventory = profile.inventoryRoles?.find(e => { return e.id === item.id && e.ms === undefined })
                            if (!roleInventory || (roleInventory.amount < (item.amount * amount))) {
                                notEnough.push(`<@&${item.id}> (${item.amount * amount - (roleInventory?.amount || 0)})`)
                                canBuy = false
                            }
                        }
                    }
                    if (!canBuy) {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "You are missing for purchase", guildId: interaction.guildId, locale: interaction.locale })}:\n${notEnough.join(", ")}`, flags: ["Ephemeral"] })
                    }
                    await interaction.deferUpdate()
                    await lot.buy(profile, profileSeller, amount, memberSeller, interaction)
                    lots_raw = await client.marketSchema.find(client.marketFilters.get(interaction.message.id)).sort({ created: -1 }).lean()
                }
            }
            let lots = lots_raw.slice(min, max)
            while (!lots.length && min !== 0) {
                min -= 25
                max -= 25
                lots = lots_raw.slice(min, max)
            }
            const embed = new EmbedBuilder()
                .setTitle(`${client.language({ textId: "Market", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setColor(3093046)
            if (!lots.length) embed.setDescription(`${client.language({ textId: "No lots for the specified filter", guildId: interaction.guildId, locale: interaction.locale })}`)
            if (lots.length) {
                embed.setFields(await Promise.all(lots.map(async (lot, index) => {
                    let sellingItem
                    if (lot.item.type === RewardType.Item) {
                        const item = client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.enabled)
                        sellingItem = `${item?.displayEmoji || ""}${item?.name || lot.item.id} (${lot.item.amount.toLocaleString()})`
                    }
                    if (lot.item.type === RewardType.Role) {
                        const role = interaction.guild.roles.cache.get(lot.item.id)
                        sellingItem = `${role?.name || lot.item.id}${lot.item.ms ? ` [${client.functions.transformSecs(client, lot.item.ms, interaction.guildId, interaction.locale)}]` : ``} (${lot.item.amount.toLocaleString()})`
                    }
                    return {
                        name: `${lots_raw.findIndex(i => i.lotID === lot.lotID)+1}. ${sellingItem}`,
                        value: `${client.language({ textId: "Seller", guildId: interaction.guildId, locale: interaction.locale })}: <@${lot.userID}> | ID: ${lot.lotID} | ${client.language({ textId: "Price", guildId: interaction.guildId, locale: interaction.locale })}: ${await Promise.all(lot.items.map(async item => {
                            if (item.type === RewardType.Item) {
                                const serverItem = client.cache.items.find(e => !e.temp && e.enabled && !e.notSellable && e.itemID === item.id)
                                return `${serverItem?.displayEmoji || ""}${serverItem?.name || item.id} (${item.amount.toLocaleString()})`
                            }
                            if (item.type === RewardType.Currency) {
                                return `${settings.displayCurrencyEmoji}${settings.currencyName} (${item.amount.toLocaleString()})`
                            }
                            if (item.type === RewardType.Role) {
                                return `<@&${item.id}> (${item.amount.toLocaleString()})`
                            }
                        })).then(array => array.join(" "))}`
                    }
                })))
            }
            const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{market}view lim{25}1`).setDisabled((lots_raw.length <= 25 && min == 0) || (lots_raw.length > 25 && min < 25))
            const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{market}view lim{${max - 25}}2`).setDisabled((lots_raw.length <= 25 && min == 0) || (lots_raw.length > 25 && min < 25))
            const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{market}view lim{${max + 25}}3`).setDisabled((lots_raw.length <= 25 && min == 0) || (lots_raw.length > 25 && min >= lots_raw.length - 25))
            const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{market}view lim{${lots_raw.length + (lots_raw.length % 25 == 0 ? 0 : 25 - (lots_raw.length % 25))}}4`).setDisabled((lots_raw.length <= 25 && min == 0) || (lots_raw.length > 25 && min >= lots_raw.length - 25))
            const components = [new ActionRowBuilder().addComponents(first_page_btn, previous_page_btn, next_page_btn, last_page_btn)]
            if (lots.filter(lot => lot.userID !== interaction.user.id).length) {
                components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`cmd{market}lim{${max}}view buy`).setPlaceholder(`${client.language({ textId: "Buy lot", guildId: interaction.guildId, locale: interaction.locale })}`).addOptions(lots.map((lot, index) => {
                    if (lot.userID !== interaction.user.id) {
                        let sellingItem
                        if (lot.item.type === RewardType.Item) {
                            const item = client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.enabled)
                            sellingItem = `${item?.name || lot.item.id} (${lot.item.amount.toLocaleString()})`
                        }
                        if (lot.item.type === RewardType.Role) {
                            const role = interaction.guild.roles.cache.get(lot.item.id)
                            sellingItem = `${role?.name || lot.item.id}${lot.item.ms ? ` [${client.functions.transformSecs(client, lot.item.ms, interaction.guildId, interaction.locale)}]` : ``} (${lot.item.amount.toLocaleString()})`
                        }
                        return {
                            label: `${lots_raw.findIndex(i => i.lotID === lot.lotID)+1}. ${sellingItem}`,
                            emoji: lot.item.type === RewardType.Item ? client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.enabled)?.displayEmoji : undefined,
                            description: `${interaction.guild.members.cache.get(lot.userID)?.displayName || client.users.cache.get(lot.userID)?.username} | ${lot.lotID}`,
                            value: lot.lotID
                        }    
                    }
                }).filter(e => e))))
            }
            if (lots.filter(e => e.userID === interaction.user.id).length || (interaction.member.permissions.has("Administrator") && lots.length)) {
                components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`cmd{market}lim{${max}}view delete`).setPlaceholder(`${client.language({ textId: "Delete lot", guildId: interaction.guildId, locale: interaction.locale })}`).addOptions(lots.map((lot, index) => {
                    if (lot.userID === interaction.user.id || interaction.member.permissions.has("Administrator")) {
                        let sellingItem
                        if (lot.item.type === RewardType.Item) {
                            const item = client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.enabled)
                            sellingItem = `${item?.name || lot.item.id} (${lot.item.amount.toLocaleString()})`
                        }
                        if (lot.item.type === RewardType.Role) {
                            const role = interaction.guild.roles.cache.get(lot.item.id)
                            sellingItem = `${role?.name || lot.item.id}${lot.item.ms ? ` [${client.functions.transformSecs(client, lot.item.ms, interaction.guildId, interaction.locale)}]` : ``} (${lot.item.amount.toLocaleString()})`
                        }
                        return {
                            label: `${lots_raw.findIndex(i => i.lotID === lot.lotID)+1}. ${sellingItem}`,
                            emoji: lot.item.type === RewardType.Item ? client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.enabled)?.displayEmoji : undefined,
                            description: `${interaction.guild.members.cache.get(lot.userID)?.displayName || client.users.cache.get(lot.userID)?.username} | ${lot.lotID}`,
                            value: lot.lotID
                        }    
                    }
                }).filter(e => e))))
            }
            if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [embed], components: components }).catch(e => {
                if (handleEmojiError(e, components)) {
                    interaction.editReply({ embeds: [embed], components: components })
                } else client.functions.sendError(e)
            })
            else return interaction.update({ embeds: [embed], components: components }).catch(e => {
                if (handleEmojiError(e, components)) {
                    interaction.editReply({ embeds: [embed], components: components })
                } else client.functions.sendError(e)
            })
        }
        if (args?.Subcommand === "buy") {
            if (!Number.isInteger(args.amount)) {
                return interaction.reply({ content: `${client.config.emojis.NO} **${args.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
            }
            if (args.amount <= 0) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Amount must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0`, components: [], flags: ["Ephemeral"] })
            }
            const lot = client.cache.lots.find(e => e.lotID === args.lot_id && e.enable)
            if (!lot) {
                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This lot no longer exists", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            }
            for (const element of lot.items) {
                if (element.type === RewardType.Item) {
                    const item = client.cache.items.find(e => !e.temp && e.enabled && e.itemID == element.id && e.found)
                    if (!item) {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Unknown item", guildId: interaction.guildId, locale: interaction.locale })} **${element.id}**`, flags: ["Ephemeral"] })    
                    }
                    if (item.notSellable) {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "cannot be set as a price on the market", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })    
                    }
                }
                if (element.type === RewardType.Role) {
                    const role = interaction.guild.roles.cache.get(element.id)
                    if (!role) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${element.id})**`, flags: ["Ephemeral"] })
                    }
                    const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                    if (roleProperties && roleProperties.cannotSell) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be set as a price", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                    }
                }
            }
            if (lot.item.type === RewardType.Item) {
                const item = client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.enabled)
                if (!item) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Unknown item", guildId: interaction.guildId, locale: interaction.locale })} (${lot.item.id})`, flags: ["Ephemeral"] })
                }
                if (item.notSellable) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "cannot be bought on the market", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }    
            }
            if (lot.item.type === RewardType.Role) {
                const role = interaction.guild.roles.cache.get(lot.item.id)
                if (!role) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${lot.item.id})**`, flags: ["Ephemeral"] })
                }
                const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                if (roleProperties && roleProperties.cannotSell) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be bought", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
                }
            }
            if (lot.item.amount < args.amount) args.amount = lot.item.amount
            const profileSeller = await client.functions.fetchProfile(client, lot.userID, interaction.guildId)
            const memberSeller = await interaction.guild.members.fetch(lot.userID)
            const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            let canBuy = true
            const notEnough = []
            for (let item of lot.items) {
                if (item.type === RewardType.Item) {
                    const serverItem = client.cache.items.find(e => !e.temp && e.itemID == item.id && e.enabled)
                    if (!serverItem) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This item does not exist or is unknown", guildId: interaction.guildId, locale: interaction.locale })} (${item.id})**`, flags: ["Ephemeral"] })
                    }
                    const buyerUserItem = profile.inventory.find((e) => { return e.itemID === item.id })
                    if (!buyerUserItem || buyerUserItem.amount < item.amount * args.amount) {
                        notEnough.push(`${serverItem.displayEmoji}${serverItem.name} (${item.amount * args.amount - (buyerUserItem?.amount || 0)})`)
                        canBuy = false
                    }  
                }
                if (item.type === RewardType.Currency) {
                    if (profile.currency < item.amount * args.amount) {
                        notEnough.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${item.amount * args.amount - profile.currency})`)
                        canBuy = false
                    }
                }
                if (item.type === RewardType.Role) {
                    const role = interaction.guild.roles.cache.get(item.id)
                    if (!role) {
                        return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${item.id})**`, flags: ["Ephemeral"] })
                    }
                    const roleInventory = profile.inventoryRoles?.find(e => { return e.id === item.id && e.ms === undefined })
                    if (!roleInventory || (roleInventory.amount < (item.amount * args.amount))) {
                        notEnough.push(`<@&${item.id}> (${item.amount * args.amount - (roleInventory?.amount || 0)})`)
                        canBuy = false
                    }
                }
            }
            if (!canBuy) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "You are missing for purchase", guildId: interaction.guildId, locale: interaction.locale })}:\n${notEnough.join(", ")}`, flags: ["Ephemeral"] })
            }
            await lot.buy(profile, profileSeller, args.amount, memberSeller, interaction, true)
        }
    }
}