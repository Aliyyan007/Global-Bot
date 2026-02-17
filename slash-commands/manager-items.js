const { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, RoleSelectMenuBuilder, ApplicationCommandOptionType, LabelBuilder } = require("discord.js")
const { handleEmojiError } = require("../handler/componentUtils")
const Item = require("../classes/item.js")
const { RewardType } = require("../enums/RewardType.js")
const UserRegexp = /usr{(.*?)}/
const ItemRegexp = /it{(.*?)}/
const IndexRegexp = /index{(.*?)}/
const limRegexp = /lim{(.*?)}/
const bannedWords = [
    `copy`,
    `description`,
    `itemID`,
    `currency`,
    `rp`,
    `null`,
    `undefined`,
    `NaN`
]
const isImageURL = require('image-url-validator').default
const Decimal = require('decimal.js')
module.exports = {
    name: 'manager-items',
    nameLocalizations: {
        'ru': `управление-предметами`,
        'uk': `управління-предметами`,
        'es-ES': `gestión-de-objetos`
    },
    description: 'Manage guild items',
    descriptionLocalizations: {
        'ru': `Управление предметами сервера`,
        'uk': `Управління предметами сервера`,
        'es-ES': `Gestión de objetos del servidor`
    },
    options: [
        {
            name: 'view',
            nameLocalizations: {
                'ru': `просмотр`,
                'uk': `перегляд`,
                'es-ES': `ver`
            },
            description: 'View all items',
            descriptionLocalizations: {
                'ru': `Просмотр всех предметов`,
                'uk': `Перегляд усіх предметів`,
                'es-ES': `Ver todos los objetos`
            },
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'create',
            nameLocalizations: {
                'ru': `создать`,
                'uk': `створити`,
                'es-ES': `crear`
            },
            description: 'Create an item',
            descriptionLocalizations: {
                'ru': `Создать предмет`,
                'uk': `Створити предмет`,
                'es-ES': `Crear un objeto`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Item name',
                    descriptionLocalizations: {
                        'ru': `Название предмета`,
                        'uk': `Назва предмету`,
                        'es-ES': `Nombre del objeto`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    required: true
                }
            ]
        },
        {
            name: 'edit',
            nameLocalizations: {
                'ru': `изменить`,
                'uk': `змінити`,
                'es-ES': `editar`
            },
            description: 'Edit an item',
            descriptionLocalizations: {
                'ru': `Изменить предмет`,
                'uk': `Змінити предмет`,
                'es-ES': `Editar un objeto`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Item name',
                    descriptionLocalizations: {
                        'ru': `Название предмета`,
                        'uk': `Назва предмету`,
                        'es-ES': `Nombre del objeto`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    autocomplete: true,
                    required: true
                }
            ]
        },
        {
            name: 'copy',
            nameLocalizations: {
                'ru': `копировать`,
                'uk': `копіювати`,
                'es-ES': `copiar`
            },
            description: 'Copy an item',
            descriptionLocalizations: {
                'ru': `Копировать предмет`,
                'uk': `Копіювати предмет`,
                'es-ES': `Copiar un objeto`
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
                    description: 'Item name',
                    descriptionLocalizations: {
                        'ru': `Название предмета`,
                        'uk': `Назва предмету`,
                        'es-ES': `Nombre del objeto`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    autocomplete: true,
                    required: true
                },
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Name for new item',
                    descriptionLocalizations: {
                        'ru': `Название для нового предмета`,
                        'uk': `Назва для нового предмету`,
                        'es-ES': `Nombre para el nuevo objeto`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    required: true
                }
            ]
        },
        {
            name: 'delete',
            nameLocalizations: {
                'ru': `удалить`,
                'uk': `видалити`,
                'es-ES': `eliminar`
            },
            description: 'Delete an item',
            descriptionLocalizations: {
                'ru': `Удалить предмет`,
                'uk': `Видалити предмет`,
                'es-ES': `Eliminar un objeto`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Item name',
                    descriptionLocalizations: {
                        'ru': `Название предмета`,
                        'uk': `Назва предмету`,
                        'es-ES': `Nombre del objeto`
                    },
                    type: ApplicationCommandOptionType.String,
                    minLength: 2,
                    maxLength: 30,
                    autocomplete: true,
                    required: true
                }
            ]
        },
        {
            name: 'enable',
            nameLocalizations: {
                'ru': `включить`,
                'uk': `увімкнути`,
                'es-ES': `activar`
            },
            description: 'Enable options of items',
            descriptionLocalizations: {
                'ru': `Включить параметры предметов`,
                'uk': `Увімкнути параметри предметів`,
                'es-ES': `Activar parámetros de objetos`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'parameter',
                    nameLocalizations: {
                        'ru': `параметр`,
                        'uk': `параметр`,
                        'es-ES': `parámetro`
                    },
                    description: 'Option of item',
                    descriptionLocalizations: {
                        'ru': `Параметр предмета`,
                        'uk': `Параметр предмету`,
                        'es-ES': `Parámetro del objeto`
                    },
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: "Visibility of all items",
                            nameLocalizations: {
                                'ru': `Видимость всех предметов`,
                                'uk': `Видимість усіх предметів`,
                                'es-ES': `Visibilidad de todos los objetos`
                            },
                            value: "visible"
                        },
                        {
                            name: "Knowing of all items",
                            nameLocalizations: {
                                'ru': `Известность всех предметов`,
                                'uk': `Відомість усіх предметів`,
                                'es-ES': `Conocimiento de todos los objetos`
                            },
                            value: "found"
                        },
                        {
                            name: "Parameter 'can transfer' for all items",
                            nameLocalizations: {
                                'ru': `Параметр 'передача' для всех предметов`,
                                'uk': `Параметр 'передача' для всіх предметів`,
                                'es-ES': `Parámetro 'transferencia' para todos los objetos`
                            },
                            value: "notTransable"
                        },
                        {
                            name: "Parameter 'can drop' for all items",
                            nameLocalizations: {
                                'ru': `Параметр 'выкидывание' для всех предметов`,
                                'uk': `Параметр 'викидання' для всіх предметів`,
                                'es-ES': `Parámetro 'tirar' para todos los objetos`
                            },
                            value: "notDropable"
                        },
                        {
                            name: "Parameter 'can giveaway' for all items",
                            nameLocalizations: {
                                'ru': `Параметр 'раздаваемый' для всех предметов`,
                                'uk': `Параметр 'роздаваний' для всіх предметів`,
                                'es-ES': `Parámetro 'regalable' para todos los objetos`
                            },
                            value: "notGiveawayable"
                        },
                        {
                            name: "Parameter 'can sell on market' for all items",
                            nameLocalizations: {
                                'ru': `Параметр 'продаваемый на маркете' для всех предметов`,
                                'uk': `Параметр 'продається на маркеті' для всіх предметів`,
                                'es-ES': `Parámetro 'vendible en el mercado' para todos los objetos`
                            },
                            value: "notSellable"
                        }
                    ],
                    required: true
                }
            ]
        },
        {
            name: 'disable',
            nameLocalizations: {
                'ru': `выключить`,
                'uk': `вимкнути`,
                'es-ES': `desactivar`
            },
            description: 'Disable options of items',
            descriptionLocalizations: {
                'ru': `Выключить параметры предметов`,
                'uk': `Вимкнути параметри предметів`,
                'es-ES': `Desactivar parámetros de objetos`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'parameter',
                    nameLocalizations: {
                        'ru': `параметр`,
                        'uk': `параметр`,
                        'es-ES': `parámetro`
                    },
                    description: 'Option of item',
                    descriptionLocalizations: {
                        'ru': `Параметр предмета`,
                        'uk': `Параметр предмету`,
                        'es-ES': `Parámetro del objeto`
                    },
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: "Visibility of all items",
                            nameLocalizations: {
                                'ru': `Видимость всех предметов`,
                                'uk': `Видимість усіх предметів`,
                                'es-ES': `Visibilidad de todos los objetos`
                            },
                            value: "visible"
                        },
                        {
                            name: "Knowing of all items",
                            nameLocalizations: {
                                'ru': `Известность всех предметов`,
                                'uk': `Відомість усіх предметів`,
                                'es-ES': `Conocimiento de todos los objetos`
                            },
                            value: "found"
                        },
                        {
                            name: "Parameter 'can transfer' for all items",
                            nameLocalizations: {
                                'ru': `Параметр 'передача' для всех предметов`,
                                'uk': `Параметр 'передача' для всіх предметів`,
                                'es-ES': `Parámetro 'transferencia' para todos los objetos`
                            },
                            value: "notTransable"
                        },
                        {
                            name: "Parameter 'can drop' for all items",
                            nameLocalizations: {
                                'ru': `Параметр 'выкидывание' для всех предметов`,
                                'uk': `Параметр 'викидання' для всіх предметів`,
                                'es-ES': `Parámetro 'tirar' para todos los objetos`
                            },
                            value: "notDropable"
                        },
                        {
                            name: "Parameter 'can giveaway' for all items",
                            nameLocalizations: {
                                'ru': `Параметр 'раздаваемый' для всех предметов`,
                                'uk': `Параметр 'роздаваний' для всіх предметів`,
                                'es-ES': `Parámetro 'regalable' para todos los objetos`
                            },
                            value: "notGiveawayable"
                        },
                        {
                            name: "Parameter 'can sell on market' for all items",
                            nameLocalizations: {
                                'ru': `Параметр 'продаваемый на маркете' для всех предметов`,
                                'uk': `Параметр 'продається на маркеті' для всіх предметів`,
                                'es-ES': `Parámetro 'vendible en el mercado' para todos los objetos`
                            },
                            value: "notSellable"
                        }
                    ],
                    required: true
                }
            ]
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `managers`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (!interaction.isChatInputCommand() && UserRegexp.exec(interaction.customId)?.[1] !== interaction.user.id) return interaction.deferUpdate().catch(e => null)
		const settings = client.cache.settings.get(interaction.guildId)
		//СОЗДАНИЕ ПРЕДМЕТА
        if (interaction.isChatInputCommand() && args.Subcommand === "create") {
			if (client.cache.items.filter(item => item.guildID === interaction.guildId).size >= settings.max_items) return interaction.reply({ content: `${client.language({ textId: "Maximum items reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_items}`, flags: ["Ephemeral"] })
			if (client.cache.items.find(i => i.guildID === interaction.guildId && i.name.toLowerCase() === args.name.toLowerCase())) {
				return interaction.reply({ content: `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${args.name} ${client.language({ textId: "already exists, choose a different name", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
			} else if (bannedWords.some(word => args.name.toLowerCase() === word)) {
				return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })} **${args.name}** ${client.language({ textId: "contains banned words. Banned words", guildId: interaction.guildId, locale: interaction.locale })}:\n${bannedWords.join(`\n`)}`, flags: ["Ephemeral"] })
			}
			const uniqid = require('uniqid')
			let item = new client.itemSchema({
				itemID: uniqid.time(),
				name: args.name,
				guildID: interaction.guildId,
				temp: true,
				tempCreated: new Date().setDate(new Date().getDate() + 7),
				sort: 1
			})
			await item.save()
			item = new Item(client, item)
			client.cache.items.set(item.itemID, item)
			const NavigationOptions = [
				{ label: `${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`, value: 'name', emoji: client.config.emojis.name },
				{ label: `${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}${item.description ? ` [+]` : `*`}`, value: 'description', emoji: client.config.emojis.description },
				{ label: `${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}${item.displayEmoji ? ` [+]` : `*`}`, value: 'emoji', emoji: item.displayEmoji },
				{ label: `${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}${item.image ? ` [+]` : `` }`, value: 'image', emoji: client.config.emojis.picture },
				{ label: `${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}${item.hex ? ` [+]` : `` }`, value: 'hex', emoji: client.config.emojis.colorpalette },
				{ label: `${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}${item.rarity ? ` [+]` : `*` }`, value: 'rarity', emoji: client.config.emojis.ring },
				{ label: `${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}${item.shop.inShop && item.shop.amount && item.shop.price && item.shop.priceType ? ` [+]` : `` }`, value: 'shop', emoji: client.config.emojis.shop },
				{ label: `${client.language({ textId: "Crafting", guildId: interaction.guildId, locale: interaction.locale })}${item.crafts?.length ? ` [${item.crafts.length}]` : `` }`, value: 'craft', emoji: client.config.emojis.craft },
				{ label: `${client.language({ textId: "Case", guildId: interaction.guildId, locale: interaction.locale })}${item.contains?.length ? ` [${item.contains.length}]` : `` }`, value: 'cont', emoji: client.config.emojis.open } ,
				{ label: `${client.language({ textId: "Case (key)", guildId: interaction.guildId, locale: interaction.locale })}${item.openByItem?.itemID ? ` [+]` : `` }`, value: 'openByItem', emoji: client.config.emojis.key },
				{ label: `${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}${item.canUse ? ` [+]` : `` }`, value: 'onUse', emoji: client.config.emojis.use },
				{ label: `${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'activities', emoji: client.config.emojis.random },
				{ label: `${client.language({ textId: "Options", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'properties', emoji: client.config.emojis.gear },
				{ label: `${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'permissions', emoji: client.config.emojis.crown },
				{ label: `${client.language({ textId: "Cooldowns", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'cooldowns', emoji: client.config.emojis.watch }
			]
			if (item.temp) NavigationOptions.push({ label: `${client.language({ textId: "Finish", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'finish', emoji: client.config.emojis.finish })
			const navigationSM = new StringSelectMenuBuilder()
				.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
				.addOptions(NavigationOptions)
				.setPlaceholder(`🔤${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`)
			const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
			const embed = await generateItemEmbed(client, interaction, item)
			const editBTN = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(client.config.emojis.edit)
				.setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
				.setCustomId(`it{${item.itemID}}cmd{manager-items} name_edit usr{${interaction.user.id}}`)
			const nextBTN = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(client.config.emojis.arrowRight)
				.setCustomId(`it{${item.itemID}}cmd{manager-items} description usr{${interaction.user.id}}`)
			const firstRow = new ActionRowBuilder().addComponents([editBTN, nextBTN])
			return interaction.reply({ embeds: [embed], components: [navigationRow, firstRow] })
        }
        //КОПИРОВАНИЕ ПРЕДМЕТА
        if (interaction.isChatInputCommand() && args.Subcommand === "copy") {
			if (client.cache.items.filter(item => item.guildID === interaction.guildId).size >= settings.max_items) return interaction.reply({ content: `${client.language({ textId: "Maximum items reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_items}`, flags: ["Ephemeral"] })
			const originalItem = client.cache.items.find(e => e.guildID === interaction.guildId && e.name.toLowerCase() === args.item.toLowerCase())
			if (!originalItem) return interaction.reply({ content: `${client.language({ textId: "Item with name", guildId: interaction.guildId, locale: interaction.locale })}: **${args.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
			if (client.cache.items.find(e => e.guildID === interaction.guildId && e.name.toLowerCase() === args.name.toLowerCase())) {
				return interaction.reply({ content: `${client.language({ textId: "Item with name", guildId: interaction.guildId, locale: interaction.locale })}: **${args.name}** ${client.language({ textId: "already exists, choose a different name", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
			}
			let copyItem = structuredClone(Object.assign({}, { ...originalItem, client: undefined, crafts: [], contains: [], activities: { ...originalItem.activities, fishing: undefined, mining: undefined, voice: undefined, message: undefined } }))
			if (originalItem.crafts.length) copyItem.crafts = JSON.parse(JSON.stringify(originalItem.crafts))
			if (originalItem.contains.length) copyItem.contains = JSON.parse(JSON.stringify(originalItem.contains))
			delete copyItem._id
			const uniqid = require('uniqid')
			copyItem.name = args.name
			copyItem.itemID = uniqid.time()
			copyItem = new client.itemSchema(copyItem)
			await copyItem.save()
			const item = new Item(client, copyItem)
			item.displayEmoji = originalItem.displayEmoji
			client.cache.items.set(item.itemID, item)
			const NavigationOptions = [
				{ label: `${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`, value: 'name', emoji: client.config.emojis.name },
				{ label: `${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}${item.description ? ` [+]` : `*`}`, value: 'description', emoji: client.config.emojis.description },
				{ label: `${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}${item.displayEmoji ? ` [+]` : `*`}`, value: 'emoji', emoji: `${client.config.emojis.smile}` },
				{ label: `${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}${item.image ? ` [+]` : `` }`, value: 'image', emoji: client.config.emojis.picture },
				{ label: `${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}${item.hex ? ` [+]` : `` }`, value: 'hex', emoji: client.config.emojis.colorpalette },
				{ label: `${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}${item.rarity ? ` [+]` : `*` }`, value: 'rarity', emoji: client.config.emojis.ring},
				{ label: `${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}${item.shop.inShop && item.shop.amount && item.shop.price && item.shop.priceType ? ` [+]` : `` }`, value: 'shop', emoji: client.config.emojis.shop},
				{ label: `${client.language({ textId: "Crafting", guildId: interaction.guildId, locale: interaction.locale })}${item.crafts?.length ? ` [${item.crafts.length}]` : `` }`, value: 'craft', emoji: client.config.emojis.craft},
				{ label: `${client.language({ textId: "Case", guildId: interaction.guildId, locale: interaction.locale })}${item.contains?.length ? ` [${item.contains.length}]` : `` }`, value: 'cont', emoji: client.config.emojis.open},
				{ label: `${client.language({ textId: "Case (key)", guildId: interaction.guildId, locale: interaction.locale })}${item.openByItem?.itemID ? ` [+]` : `` }`, value: 'openByItem', emoji: client.config.emojis.key},
				{ label: `${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}${item.canUse ? ` [+]` : `` }`, value: 'onUse', emoji: client.config.emojis.use},
				{ label: `${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'activities', emoji: client.config.emojis.random},
				{ label: `${client.language({ textId: "Options", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'properties', emoji: client.config.emojis.gear},
				{ label: `${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'permissions', emoji: client.config.emojis.crown },
				{ label: `${client.language({ textId: "Cooldowns", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'cooldowns', emoji: client.config.emojis.watch }
			]
			if (item.temp) NavigationOptions.push({ label: `${client.language({ textId: "Finish", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'finish', emoji: client.config.emojis.finish})
			const navigationSM = new StringSelectMenuBuilder()
				.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
				.addOptions(NavigationOptions)
				.setPlaceholder(`🔤${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`)
			const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
			const embed = await generateItemEmbed(client, interaction, item)
			const editBTN = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(client.config.emojis.edit)
				.setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
				.setCustomId(`it{${item.itemID}}cmd{manager-items} name_edit usr{${interaction.user.id}}`)
			const nextBTN = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setEmoji(client.config.emojis.arrowRight)
				.setCustomId(`it{${item.itemID}}cmd{manager-items} description usr{${interaction.user.id}}`)
			const firstRow = new ActionRowBuilder().addComponents([editBTN, nextBTN])
			return interaction.reply({ embeds: [embed], components: [navigationRow, firstRow] })   
        }
        //ИЗМЕНЕНИЕ ПРЕДМЕТА
        if (interaction.isChatInputCommand() && args.Subcommand === "edit") {
			const item = client.cache.items.find(e => e.guildID === interaction.guildId && e.name.toLowerCase() === args.name.toLowerCase())
			if (!item) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item with name does not exist", guildId: interaction.guildId, locale: interaction.locale })}: **${args.name}**` })
			const NavigationOptions = [
                { label: `${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`, value: 'name', emoji: client.config.emojis.name },
                { label: `${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}${item.description ? ` [+]` : `*`}`, value: 'description', emoji: client.config.emojis.description },
                { label: `${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}${item.displayEmoji ? ` [+]` : `*`}`, value: 'emoji', emoji: client.config.emojis.box },
                { label: `${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}${item.image ? ` [+]` : `` }`, value: 'image', emoji: client.config.emojis.picture },
                { label: `${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}${item.hex ? ` [+]` : `` }`, value: 'hex', emoji: client.config.emojis.colorpalette },
                { label: `${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}${item.rarity ? ` [+]` : `*` }`, value: 'rarity', emoji: client.config.emojis.ring},
                { label: `${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}${item.shop.inShop && item.shop.amount && item.shop.price && item.shop.priceType ? ` [+]` : `` }`, value: 'shop', emoji: client.config.emojis.shop},
                { label: `${client.language({ textId: "Crafting", guildId: interaction.guildId, locale: interaction.locale })}${item.crafts?.length ? ` [${item.crafts.length}]` : `` }`, value: 'crafting', emoji: client.config.emojis.craft},
                { label: `${client.language({ textId: "Case", guildId: interaction.guildId, locale: interaction.locale })}${item.contains?.length ? ` [${item.contains.length}]` : `` }`, value: 'cont', emoji: client.config.emojis.open},
                { label: `${client.language({ textId: "Case (key)", guildId: interaction.guildId, locale: interaction.locale })}${item.openByItem?.itemID ? ` [+]` : `` }`, value: 'openByItem', emoji: client.config.emojis.key},
                { label: `${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}${item.canUse ? ` [+]` : `` }`, value: 'onUse', emoji: client.config.emojis.use},
                { label: `${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'activities', emoji: client.config.emojis.random},
                { label: `${client.language({ textId: "Options", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'properties', emoji: client.config.emojis.gear},
                { label: `${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'permissions', emoji: client.config.emojis.crown },
				{ label: `${client.language({ textId: "Cooldowns", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'cooldowns', emoji: client.config.emojis.watch }
            ]
            if (item.temp) NavigationOptions.push({ label: `${client.language({ textId: "Finish", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'finish', emoji: client.config.emojis.finish})
            const navigationSM = new StringSelectMenuBuilder()
            	.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
            	.addOptions(NavigationOptions)
            	.setPlaceholder(`🔤${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`)
            const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
            const embed = await generateItemEmbed(client, interaction, item)
            const editBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Secondary)
            	.setEmoji(client.config.emojis.edit)
            	.setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`it{${item.itemID}}cmd{manager-items} name edit usr{${interaction.user.id}}`)
            const nextBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Secondary)
            	.setEmoji(client.config.emojis.arrowRight)
            	.setCustomId(`it{${item.itemID}}cmd{manager-items} description usr{${interaction.user.id}}`)
			const firstRow = new ActionRowBuilder().addComponents([editBTN, nextBTN])
			return interaction.reply({ content: `**${client.language({ textId: "NAME", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "All server members will interact with the item name, so create a simple and straightforward name", guildId: interaction.guildId, locale: interaction.locale })}.\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}:**\n${client.language({ textId: "Symbols", guildId: interaction.guildId, locale: interaction.locale })}: <= 30\n${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "not repeated", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [embed], components: [navigationRow, firstRow] })
        }
        //УДАЛЕНИЕ ПРЕДМЕТА
        if (interaction.isChatInputCommand() && args.Subcommand === "delete") {
			const item = client.cache.items.find(e => e.guildID === interaction.guildId && e.name === args.name)
			if (!item) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item with name", guildId: interaction.guildId, locale: interaction.locale })} **${args.name}** ${client.language({ textId: "was not found in database", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
			await item.delete()
			return interaction.reply({ content: `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}${item.name} ${client.language({ textId: "was removed", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
        }
        if (interaction.isChatInputCommand() && args.Subcommand === "enable") {
			await Promise.all(client.cache.items.filter(e => e.guildID === interaction.guildId).map(async item => {
				item[args.parameter] = args.parameter === "visible" || args.parameter === "found" ? true : false
				await item.save()
			}))
			return interaction.reply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Parameter", guildId: interaction.guildId, locale: interaction.locale })} ${args.parameter === "visible" ? client.language({ textId: "'visibility'", guildId: interaction.guildId, locale: interaction.locale }) : args.parameter === "found" ? client.language({ textId: "'discovered'", guildId: interaction.guildId, locale: interaction.locale }) : args.parameter === "notTransable" ? client.language({ textId: "'transferable'", guildId: interaction.guildId, locale: interaction.locale }) : args.parameter === "notDropable" ? client.language({ textId: "'droppable'", guildId: interaction.guildId, locale: interaction.locale }) : args.parameter === "notGiveawayable" ? client.language({ textId: "'giveawayable'", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "'marketable'", guildId: interaction.guildId, locale: interaction.locale })} ${client.language({ textId: "was enabled for all items", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
		if (interaction.isChatInputCommand() && args.Subcommand === "disable") {
			await Promise.all(client.cache.items.filter(e => e.guildID === interaction.guildId).map(async item => {
				item[args.parameter] = args.parameter === "visible" || args.parameter === "found" ? false : true
				await item.save()
			}))
			return interaction.reply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Parameter", guildId: interaction.guildId, locale: interaction.locale })} ${args.parameter === "visible" ? client.language({ textId: "'visibility'", guildId: interaction.guildId, locale: interaction.locale }) : args.parameter === "found" ? client.language({ textId: "'discovered'", guildId: interaction.guildId, locale: interaction.locale }) : args.parameter === "notTransable" ? client.language({ textId: "'transferable'", guildId: interaction.guildId, locale: interaction.locale }) : args.parameter === "notDropable" ? client.language({ textId: "'droppable'", guildId: interaction.guildId, locale: interaction.locale }) : args.parameter === "notGiveawayable" ? client.language({ textId: "'giveawayable'", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "'marketable'", guildId: interaction.guildId, locale: interaction.locale })} ${client.language({ textId: "was disabled for all items", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
		if (args?.Subcommand === "view" || interaction.customId?.includes("view")) {
			const items = client.cache.items.filter(e => e.guildID === interaction.guildId).map(e => e)
			const embed = new EmbedBuilder()
				.setAuthor({ name: `${client.language({ textId: "Item Manager", guildId: interaction.guildId, locale: interaction.locale })} (${items.length}/${settings.max_items})` })
				.setColor(3093046)
			let min = 0
			let max = 25
			if (interaction.customId?.includes("lim")) {
				max = +limRegexp.exec(interaction.customId)[1]
				min = max - 25
			}
			const description = [`🕐 - ${client.language({ textId: "uncreated (temporary) item", guildId: interaction.guildId, locale: interaction.locale })}\n🌫️ - ${client.language({ textId: "invisible item (disabled)", guildId: interaction.guildId, locale: interaction.locale })}\n❓ - ${client.language({ textId: "unknown (unlearned) item", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}:`]
			items.slice(min, max).forEach(item => {
				description.push(`${item.temp ? '🕐' : ``}${!item.enabled ? `🌫️` : ``}${!item.found ? "❓" : ``} ${items.findIndex(e => e.itemID === item.itemID)+1}. ${item.displayEmoji}${item.name}`)
			})
			embed.setDescription(description.join("\n"))
			const components = [
				new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(`${client.config.emojis.arrowLeft2}`)
							.setCustomId(`cmd{manager-items}usr{${interaction.user.id}}lim{25}view1`)
							.setDisabled((items.length <= 25 && min === 0) || (items.length > 25 && min < 25) ? true : false),
						new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(`${client.config.emojis.arrowLeft}`)
							.setCustomId(`cmd{manager-items}usr{${interaction.user.id}}lim{${max - 25}}view2`)
							.setDisabled((items.length <= 25 && min === 0) || (items.length > 25 && min < 25) ? true : false),
						new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(`${client.config.emojis.arrowRight}`)
							.setCustomId(`cmd{manager-items}usr{${interaction.user.id}}lim{${max + 25}}view3`)
							.setDisabled((items.length <= 25 && min === 0) || (items.length > 25 && min >= items.length - 25) ? true : false),
						new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(`${client.config.emojis.arrowRight2}`)
							.setCustomId(`cmd{manager-items}usr{${interaction.user.id}}lim{${items.length + (items.length % 25 === 0 ? 0 : 25 - (items.length % 25))}}view4`)
							.setDisabled((items.length <= 25 && min === 0) || (items.length > 25 && min >= items.length - 25) ? true : false)
					)
			]
			if (interaction.isChatInputCommand()) return interaction.reply({ 
				embeds: [
					embed, 
					new EmbedBuilder().setColor(3093046).setDescription(`${client.config.emojis.plus}${client.language({ textId: "Create item", guildId: interaction.guildId, locale: interaction.locale })}: </manager-items create:1150455842294988941>\n${client.config.emojis.edit}${client.language({ textId: "Change item", guildId: interaction.guildId, locale: interaction.locale })}: </manager-items edit:1150455842294988941>\n${client.config.emojis.copy}${client.language({ textId: "Copy item", guildId: interaction.guildId, locale: interaction.locale })}: </manager-items copy:1150455842294988941>\n${client.config.emojis.trash}${client.language({ textId: "Delete item", guildId: interaction.guildId, locale: interaction.locale })}: </manager-items delete:1150455842294988941>`)
				],
				components: components
			}) 
			else return interaction.update({ 
				embeds: [
					embed, 
					new EmbedBuilder().setColor(3093046).setDescription(`${client.config.emojis.plus}${client.language({ textId: "Create item", guildId: interaction.guildId, locale: interaction.locale })}: </manager-items create:1150455842294988941>\n${client.config.emojis.edit}${client.language({ textId: "Change item", guildId: interaction.guildId, locale: interaction.locale })}: </manager-items edit:1150455842294988941>\n${client.config.emojis.copy}${client.language({ textId: "Copy item", guildId: interaction.guildId, locale: interaction.locale })}: </manager-items copy:1150455842294988941>\n${client.config.emojis.trash}${client.language({ textId: "Delete item", guildId: interaction.guildId, locale: interaction.locale })}: </manager-items delete:1150455842294988941>`)
				],
				components: components
			})
		}
		if (!interaction.isChatInputCommand()) {
			const item = client.cache.items.get(ItemRegexp.exec(interaction.customId)?.[1])
			if (!item) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item with ID does not exist", guildId: interaction.guildId, locale: interaction.locale })}: **${ItemRegexp.exec(interaction.customId)?.[1]}**`, embeds: [], components: [] })
			const NavigationOptions = [
				{ label: `${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`, value: 'name', emoji: client.config.emojis.name },
				{ label: `${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}${item.description ? ` [+]` : `*`}`, value: 'description', emoji: client.config.emojis.description },
				{ label: `${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}${item.displayEmoji ? ` [+]` : `*`}`, value: 'emoji', emoji: client.config.emojis.box },
				{ label: `${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}${item.image ? ` [+]` : `` }`, value: 'image', emoji: client.config.emojis.picture },
				{ label: `${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}${item.hex ? ` [+]` : `` }`, value: 'hex', emoji: client.config.emojis.colorpalette },
				{ label: `${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}${item.rarity ? ` [+]` : `*` }`, value: 'rarity', emoji: client.config.emojis.ring},
				{ label: `${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}${item.shop.inShop && item.shop.amount && item.shop.price && item.shop.priceType ? ` [+]` : `` }`, value: 'shop', emoji: client.config.emojis.shop},
				{ label: `${client.language({ textId: "Crafting", guildId: interaction.guildId, locale: interaction.locale })}${item.crafts?.length ? ` [${item.crafts.length}]` : `` }`, value: 'crafting', emoji: client.config.emojis.craft},
				{ label: `${client.language({ textId: "Case", guildId: interaction.guildId, locale: interaction.locale })}${item.contains?.length ? ` [${item.contains.length}]` : `` }`, value: 'cont', emoji: client.config.emojis.open},
				{ label: `${client.language({ textId: "Case (key)", guildId: interaction.guildId, locale: interaction.locale })}${item.openByItem?.itemID ? ` [+]` : `` }`, value: 'openByItem', emoji: client.config.emojis.key},
				{ label: `${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}${item.canUse ? ` [+]` : `` }`, value: 'onUse', emoji: client.config.emojis.use},
				{ label: `${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'activities', emoji: client.config.emojis.random},
				{ label: `${client.language({ textId: "Options", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'properties', emoji: client.config.emojis.gear},
				{ label: `${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'permissions', emoji: client.config.emojis.crown },
				{ label: `${client.language({ textId: "Cooldowns", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'cooldowns', emoji: client.config.emojis.watch }
			]
			if (item.temp) NavigationOptions.push({ label: `${client.language({ textId: "Finish", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'finish', emoji: client.config.emojis.finish})
			//НАЗВАНИЕ
			if ((interaction.customId.includes(`name`)) || interaction.values?.[0] == `name`) {
				let navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🔤${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`)
				let navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				let embed = await generateItemEmbed(client, interaction, item)
				let editBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.edit)
					.setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} name edit usr{${interaction.user.id}}`)
				let nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} description usr{${interaction.user.id}}`)
				if (interaction.isButton() && interaction.customId.includes(`edit`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_name_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setMinLength(2)
										.setMaxLength(30)
										.setRequired(true)
										.setStyle(TextInputStyle.Short)
										.setPlaceholder(`${client.language({ textId: "Enter item name", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setValue(item.name)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_name_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (client.cache.items.find(i => i.name.toLowerCase() === modalArgs.name.toLowerCase() && i.guildID === interaction.guildId)) {
							return interaction.reply({ content: `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${modalArgs.name} ${client.language({ textId: "already exists, choose a different name", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						} else if (bannedWords.some(word => modalArgs.name.toLowerCase() === word)) {
							return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "contains banned words. Banned words", guildId: interaction.guildId, locale: interaction.locale })}:\n${bannedWords.join(`\n`)}`, flags: ["Ephemeral"] })
						}
						item.name = modalArgs.name
						await item.save()
						embed = await generateItemEmbed(client, interaction, item)
						const NavigationOptions = [
							{ label: `${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`, value: 'name', emoji: client.config.emojis.name },
							{ label: `${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}${item.description ? ` [+]` : `*`}`, value: 'description', emoji: client.config.emojis.description },
							{ label: `${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}${item.displayEmoji ? ` [+]` : `*`}`, value: 'emoji', emoji: client.config.emojis.box },
							{ label: `${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}${item.image ? ` [+]` : `` }`, value: 'image', emoji: client.config.emojis.picture },
							{ label: `${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}${item.hex ? ` [+]` : `` }`, value: 'hex', emoji: client.config.emojis.colorpalette },
							{ label: `${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}${item.rarity ? ` [+]` : `*` }`, value: 'rarity', emoji: client.config.emojis.ring},
							{ label: `${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}${item.shop.inShop && item.shop.amount && item.shop.price && item.shop.priceType ? ` [+]` : `` }`, value: 'shop', emoji: client.config.emojis.shop},
							{ label: `${client.language({ textId: "Crafting", guildId: interaction.guildId, locale: interaction.locale })}${item.crafts?.length ? ` [${item.crafts.length}]` : `` }`, value: 'crafting', emoji: client.config.emojis.craft},
							{ label: `${client.language({ textId: "Case", guildId: interaction.guildId, locale: interaction.locale })}${item.contains?.length ? ` [${item.contains.length}]` : `` }`, value: 'cont', emoji: client.config.emojis.open},
							{ label: `${client.language({ textId: "Case (key)", guildId: interaction.guildId, locale: interaction.locale })}${item.openByItem?.itemID ? ` [+]` : `` }`, value: 'openByItem', emoji: client.config.emojis.key},
							{ label: `${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}${item.canUse ? ` [+]` : `` }`, value: 'onUse', emoji: client.config.emojis.use},
							{ label: `${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'activities', emoji: client.config.emojis.random},
							{ label: `${client.language({ textId: "Options", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'properties', emoji: client.config.emojis.gear},
							{ label: `${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'permissions', emoji: client.config.emojis.crown },
							{ label: `${client.language({ textId: "Cooldowns", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'cooldowns', emoji: client.config.emojis.watch }
						]
						if (item.temp) NavigationOptions.push({ label: `${client.language({ textId: "Finish", guildId: interaction.guildId, locale: interaction.locale })}`, value: 'finish', emoji: client.config.emojis.finish})
						navigationSM = new StringSelectMenuBuilder()
							.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
							.addOptions(NavigationOptions)
							.setPlaceholder(`🔤${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}${item.name ? `: ${item.name}` : `*` }`)
						navigationRow = new ActionRowBuilder().addComponents([navigationSM])
						editBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(client.config.emojis.edit)
							.setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setCustomId(`it{${item.itemID}}cmd{manager-items} name edit usr{${interaction.user.id}}`)
						nextBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(client.config.emojis.arrowRight)
							.setCustomId(`it{${item.itemID}}cmd{manager-items} description usr{${interaction.user.id}}`)
					} else return
				}
				const firstRow = new ActionRowBuilder().addComponents([editBTN, nextBTN])
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `**${client.language({ textId: "NAME", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "All server members will interact with the item name, so create a simple and straightforward name", guildId: interaction.guildId, locale: interaction.locale })}.\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}:**\n${client.language({ textId: "Symbols", guildId: interaction.guildId, locale: interaction.locale })}: <= 30\n${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "not repeated", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [embed], components: [navigationRow, firstRow] })
				else return interaction.update({ content: `**${client.language({ textId: "NAME", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "All server members will interact with the item name, so create a simple and straightforward name", guildId: interaction.guildId, locale: interaction.locale })}.\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}:**\n${client.language({ textId: "Symbols", guildId: interaction.guildId, locale: interaction.locale })}: <= 30\n${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "not repeated", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [embed], components: [navigationRow, firstRow] })
			}
			//ОПИСАНИЕ
			if ((interaction.customId.includes(`description`)) || interaction.values?.[0] == `description`) {
				if (interaction.isStringSelectMenu() && interaction.values?.[0] !== `description`) item = client.cache.items.get(interaction.values[0])
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🗯️${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}${item.description ? ` [+]` : `*`}`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				let embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} name usr{${interaction.user.id}}`)
				const editBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.edit)
					.setLabel(`${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} description edit usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} emoji usr{${interaction.user.id}}`)
				if (interaction.isButton() && interaction.customId.includes(`description edit`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_description_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item description", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("description")
										.setMaxLength(200)
										.setRequired(true)
										.setStyle(TextInputStyle.Paragraph)
										.setPlaceholder(`${client.language({ textId: "Enter item description", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setValue(item.description || "")
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_description_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						item.description = modalArgs.description
						await item.save()
						embed = await generateItemEmbed(client, interaction, item)  
					} else return
				}
				item.description.length > 0 ? nextBTN.setDisabled(false) : nextBTN.setDisabled(true)
				const firstRow = new ActionRowBuilder().addComponents([backBTN, editBTN, nextBTN])
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `**${client.language({ textId: "DESCRIPTION", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Item description can contain any information", guildId: interaction.guildId, locale: interaction.locale })}.\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}:**\n${client.language({ textId: "Symbols", guildId: interaction.guildId, locale: interaction.locale })}: <= 200`, embeds: [embed], components: [navigationRow, firstRow] })
				else return interaction.update({ content: `**${client.language({ textId: "DESCRIPTION", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Item description can contain any information", guildId: interaction.guildId, locale: interaction.locale })}.\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}:**\n${client.language({ textId: "Symbols", guildId: interaction.guildId, locale: interaction.locale })}: <= 200`, embeds: [embed], components: [navigationRow, firstRow] })
			}
			//ЭМОДЗИ
			if ((interaction.customId.includes(`emoji`)) || interaction.values?.[0] == `emoji`) {
				let navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`😀${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}${item.displayEmoji ? ` [+]` : `*`}`)
				let navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				const oldNavigationRow = navigationRow
				let embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} description usr{${interaction.user.id}}`)
				const editBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.edit)
					.setLabel(`${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} emoji edit usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} image usr{${interaction.user.id}}`)
				if (interaction.isButton() && interaction.customId.includes(`emoji edit`)) {
					const command = client.interactions.get("emoji-selector")
					return command.run(client, interaction, args, "item", item.itemID)
				}
				item.emoji?.length > 0 ? nextBTN.setDisabled(false) : nextBTN.setDisabled(true)
				const firstRow = new ActionRowBuilder().addComponents([backBTN, editBTN, nextBTN])
				const components = [navigationRow, firstRow]
				const content = `**${client.language({ textId: "EMOJI", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Emoji will be displayed in inventory, shop and anywhere else next to item name", guildId: interaction.guildId, locale: interaction.locale })}.\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}:**\n${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "standard emoji", guildId: interaction.guildId, locale: interaction.locale })} || ${client.language({ textId: "server emoji", guildId: interaction.guildId, locale: interaction.locale })}`
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content, embeds: [embed], components: [navigationRow, firstRow] }).catch(async e => {
					if (e.message.includes(`Invalid emoji`)) {
						interaction.editReply({ content, embeds: [embed], components: [oldNavigationRow, firstRow] })
						interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "This emoji is not supported", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						item.emoji = undefined
						item.displayEmoji = undefined
						await item.save()
					} else client.functions.sendError(e)
				})
				else return interaction.update({ content, embeds: [embed], components }).catch(async e => {
					if (e.message.includes(`Invalid emoji`)) {
						await interaction.update({ content, embeds: [embed], components: [oldNavigationRow, firstRow] })
						interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "This emoji is not supported", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						item.emoji = undefined
						item.displayEmoji = undefined
						await item.save()
					} else client.functions.sendError(e)
				})
			}
			//ИЗОБРАЖЕНИЕ
			if ((interaction.customId.includes(`image`)) || interaction.values?.[0] == `image`) {
				const item = client.cache.items.get(ItemRegexp.exec(interaction.customId)?.[1])
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🖼️${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}${item.image ? ` [+]` : `` }`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				let embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} emoji usr{${interaction.user.id}}`)
				const editBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.edit)
					.setLabel(`${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} image edit usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} hex usr{${interaction.user.id}}`)
				if (interaction.isButton() && interaction.customId.includes(`image edit`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_image_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item image", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("image")
										.setRequired(false)
										.setStyle(TextInputStyle.Paragraph)
										.setPlaceholder(`${client.language({ textId: "Paste link to item image", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setValue(item.image || "")
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_image_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => null)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.image.length) item.image = undefined
						else {
							const image = await isImageURL(modalArgs.image)
							if (!image) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.image}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							item.image = modalArgs.image
						}
						await item.save()
						embed = await generateItemEmbed(client, interaction, item) 
					} else return
				}
				const firstRow = new ActionRowBuilder().addComponents([backBTN, editBTN, nextBTN])
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `**${client.language({ textId: "IMAGE", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Image will be shown in the top right corner: in item info, in item opening menu (/open), in item crafting menu (/craft) and other places", guildId: interaction.guildId, locale: interaction.locale })}.\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}:**\n${client.language({ textId: "Link", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "direct image link", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [embed], components: [navigationRow, firstRow] })
				else return interaction.update({ content: `**${client.language({ textId: "IMAGE", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Image will be shown in the top right corner: in item info, in item opening menu (/open), in item crafting menu (/craft) and other places", guildId: interaction.guildId, locale: interaction.locale })}.\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}:**\n${client.language({ textId: "Link", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "direct image link", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [embed], components: [navigationRow, firstRow] })
			}
			//ЦВЕТ
			if ((interaction.customId.includes(`hex`)) || interaction.values?.[0] == `hex`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🌈${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}${item.hex ? ` [+]` : `` }`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				let embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} image usr{${interaction.user.id}}`)
				const editBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.edit)
					.setLabel(`${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} hex edit usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setDisabled(false)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} rarity usr{${interaction.user.id}}`)
				if (!item.temp) nextBTN.setCustomId(`it{${item.itemID}}cmd{manager-items} shop usr{${interaction.user.id}}`)
				if (interaction.isButton() && interaction.customId.includes(`hex edit`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_color_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Border color", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Color", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("color")
										.setRequired(false)
										.setStyle(TextInputStyle.Paragraph)
										.setPlaceholder(`${client.language({ textId: "Paste HEX color code", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setValue(item.hex || "")
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_color_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.color.length) item.hex = undefined
						else {
							if (/^#[0-9A-F]{6}$/i.test(modalArgs.color) === false) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.color}** ${client.language({ textId: "is not a HEX color. HEX color example", guildId: interaction.guildId, locale: interaction.locale })}: **#FF5733**. ${client.language({ textId: "Please select HEX color from this site", guildId: interaction.guildId, locale: interaction.locale })}: https://htmlcolorcodes.com/color-picker/`, flags: ["Ephemeral"] })
							}
							item.hex = modalArgs.color
						}
						await item.save()
						embed = await generateItemEmbed(client, interaction, item) 
					} else return
				}
				const firstRow = new ActionRowBuilder().addComponents([backBTN, editBTN, nextBTN])
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `**${client.language({ textId: "COLOR", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Embed message border color is purely decorative. For example, border color can be chosen based on item rarity or any other preference", guildId: interaction.guildId, locale: interaction.locale })}.\n${client.language({ textId: "HEX color format example", guildId: interaction.guildId, locale: interaction.locale })}: #FF5733\n${client.language({ textId: `You can pick a HEX color on this website`, guildId: interaction.guildId, locale: interaction.locale })}: <https://htmlcolorcodes.com/color-picker/>\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}**:\n${client.language({ textId: "COLOR", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "HEX format", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [embed], components: [navigationRow, firstRow] })
				else return interaction.update({ content: `**${client.language({ textId: "COLOR", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Embed message border color is purely decorative. For example, border color can be chosen based on item rarity or any other preference", guildId: interaction.guildId, locale: interaction.locale })}.\n${client.language({ textId: "HEX color format example", guildId: interaction.guildId, locale: interaction.locale })}: #FF5733\n${client.language({ textId: `You can pick a HEX color on this website`, guildId: interaction.guildId, locale: interaction.locale })}: <https://htmlcolorcodes.com/color-picker/>\n**${client.language({ textId: "Requirements", guildId: interaction.guildId, locale: interaction.locale })}**:\n${client.language({ textId: "COLOR", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "HEX format", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [embed], components: [navigationRow, firstRow] })
			}
			//РЕДКОСТЬ
			if ((interaction.customId.includes(`rarity`)) || interaction.values?.[0] == `rarity`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`💍${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}${item.rarity ? ` [+]` : `*` }`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				if (interaction.isButton() && interaction.customId.includes(`rarity edit`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_rarity_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item rarity", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Rarity name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("rarity")
										.setRequired(true)
										.setStyle(TextInputStyle.Short)
										.setMaxLength(45)
										.setValue(client.language({ textId: item.rarity, guildId: interaction.guildId, locale: interaction.locale }))
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Sort", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("sort")
										.setRequired(true)
										.setStyle(TextInputStyle.Short)
										.setPlaceholder(`1 ~ 1000`)
										.setMaxLength(4)
										.setValue(`${item.sort}`)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_rarity_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => null)
					if (interaction && interaction.isModalSubmit()) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (isNaN(+modalArgs.sort) || !Number.isInteger(+modalArgs.sort)) {
							return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.sort}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						if (+modalArgs.sort < 1 || +modalArgs.sort > 1000) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 1 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
						}
						item.rarity = modalArgs.rarity
						item.sort = +modalArgs.sort
						await item.save()
					} else return
				}
				let embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} hex usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} shop usr{${interaction.user.id}}`)
				const rarityBTN = new ButtonBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} rarity edit usr{${interaction.user.id}}`)
					.setLabel(`${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.edit)
				const firstRow = new ActionRowBuilder().addComponents([backBTN, rarityBTN, nextBTN])
				return interaction.update({ content: `**${client.language({ textId: "RARITY", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Items are sorted from smallest to largest (1 to 1000). Lower sort value means higher position in shop and inventory", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [embed], components: [navigationRow, firstRow ] })
			}
			//МАГАЗИН
			if ((interaction.customId.includes(`shop`)) || interaction.values?.[0] == `shop`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🛒${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}${item.shop.inShop && item.shop.amount && item.shop.price && item.shop.priceType ? ` [+]` : `` }`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				if (interaction.isStringSelectMenu() && interaction.values[0] === "switchInShop") {
					if (!item.shop.inShop) {
						if ((item.shop.price || item.shop.cryptoPrice) && item.shop.priceType) {
							item.shop.inShop = !item.shop.inShop
							await item.save() 
						} else return interaction.reply({ content: `${client.language({ textId: "Cannot add to shop: price or currency not specified", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					} else {
						item.shop.inShop = !item.shop.inShop
						await item.save()
					}
				}
				if (interaction.isStringSelectMenu() && interaction.values[0] === "shopAmount") {
					const components = JSON.parse(JSON.stringify(interaction.message.components))
					interaction.message.components.forEach(row => row.components.forEach(component => {
						component.data.disabled = true
					}))
					await interaction.update({ components: interaction.message.components })
					await interaction.followUp({ 
						content: `${client.language({ textId: "Set shop item quantity", guildId: interaction.guildId, locale: interaction.locale })}`,
						components: [
							new ActionRowBuilder()
								.addComponents(
									new ButtonBuilder()
										.setCustomId(`shop_amount_enter_value`)
										.setStyle(ButtonStyle.Secondary)
										.setEmoji(client.config.emojis.edit)
										.setLabel(client.language({ textId: "Enter number", guildId: interaction.guildId, locale: interaction.locale })),
									new ButtonBuilder()
										.setCustomId("shop_amount_infinity")
										.setLabel(client.language({ textId: "Infinite", guildId: interaction.guildId, locale: interaction.locale }))
										.setEmoji("♾️")
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId("shop_amount_cancel")
										.setEmoji(client.config.emojis.NO)
										.setStyle(ButtonStyle.Danger)
								),
						],
						flags: ["Ephemeral"]
					})    
					const filter = (i) => i.customId.includes(`shop_amount`) && i.user.id === interaction.user.id
					let followUpInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
					if (followUpInteraction && followUpInteraction.customId.includes("shop_amount")) {
						if (followUpInteraction.customId === "shop_amount_enter_value") {
							const modal = new ModalBuilder()
								.setCustomId(`manager-items_shopAmount_${interaction.id}`)
								.setTitle(`${client.language({ textId: "Quantity in shop", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setLabelComponents([
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("amount")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
												.setPlaceholder(`${client.language({ textId: "Enter quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setValue(`${item.shop.amount || "0"}`)
										),
								])
							await followUpInteraction.showModal(modal);delete client.globalCooldown[`${followUpInteraction.guildId}_${followUpInteraction.user.id}`]
							const filter = (i) => i.customId === `manager-items_shopAmount_${interaction.id}` && i.user.id === interaction.user.id
							followUpInteraction = await followUpInteraction.awaitModalSubmit({ filter, time: 120000 }).catch(e => followUpInteraction)
							if (followUpInteraction && followUpInteraction.type === InteractionType.ModalSubmit) {
								const modalArgs = {}
								followUpInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
								if (isNaN(+modalArgs.amount)) {
									await followUpInteraction.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
									return interaction.editReply({ components: components })
								}
								modalArgs.amount = +modalArgs.amount
								if (modalArgs.amount < 0) {
									await followUpInteraction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0`, components: [], flags: ["Ephemeral"] })
									return interaction.editReply({ components: components })
								}
								item.shop.amount = modalArgs.amount
								await item.save()
								followUpInteraction.update({ content: client.config.emojis.YES, components: [] })
							} else return	
						} else if (followUpInteraction.customId === "shop_amount_infinity") {
							item.shop.amount = Infinity
							await item.save()
							await followUpInteraction.update({ content: client.config.emojis.YES, components: [] })
						}  else if (followUpInteraction.customId === "shop_amount_cancel") {
							await followUpInteraction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
							return interaction.editReply({ components: components })
						}
					}
				}
				if (interaction.isStringSelectMenu() && interaction.values[0] === "shopDiscount") {
					item.shop.canDiscount = !item.shop.canDiscount
					await item.save()
				}
				if ((interaction.isStringSelectMenu() && interaction.values[0] === "shopPrice") || interaction.customId.includes("shopPrice")) {
					const components1 = JSON.parse(JSON.stringify(interaction.message.components))
					interaction.message.components.forEach(row => row.components.forEach(component => {
						component.data.disabled = true
					}))
					await interaction.update({ components: interaction.message.components })
					const setItemBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setLabel(`${client.language({ textId: "Set item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setEmoji(client.config.emojis.box)
						.setCustomId(`shop_PriceSelectItem`)
					const setCurBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setLabel(`${client.language({ textId: "Set", guildId: interaction.guildId, locale: interaction.locale })} ${settings.currencyName}`)
						.setEmoji(settings.displayCurrencyEmoji)
						.setCustomId(`shop_PriceSelectCurrency`)
					const setCookieBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setLabel(`${client.language({ textId: "Set", guildId: interaction.guildId, locale: interaction.locale })} ${client.language({ textId: "Cookies", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setEmoji(client.config.emojis.cookie)
						.setCustomId(`shop_PriceSelectCookie`)
					const cancelBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Danger)
						.setEmoji(client.config.emojis.NO)
						.setLabel(`${client.language({ textId: "Cancel", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}shop`)	
					const removeBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Danger)
						.setLabel(`${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setEmoji(client.config.emojis.NO)
						.setCustomId(`shop_PriceRemove`)
					if (item.shop.priceType === undefined && item.shop.price === 0) removeBTN.setDisabled(true)
					const row1 = new ActionRowBuilder().addComponents(setItemBTN, setCurBTN, setCookieBTN)
					const row2 = new ActionRowBuilder().addComponents(removeBTN, cancelBTN)
					const components = [row1, row2]
					await interaction.followUp({ content: `${client.language({ textId: "Select currency for shop item purchase. Timeout: 30s.", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "When buying item priced in cookies, spent cookies will be transferred to server account", guildId: interaction.guildId, locale: interaction.locale })}`, components, embeds: [], flags: ["Ephemeral"] }).catch(async e => {
						if (handleEmojiError(e, components)) {
							await interaction.followUp({ 
								content: `${client.language({ textId: "Select currency for shop item purchase. Timeout: 30s.", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "When buying item priced in cookies, spent cookies will be transferred to server account", guildId: interaction.guildId, locale: interaction.locale })}`, components, embeds: [], flags: ["Ephemeral"]
							})
						} else client.functions.sendError(e)
					})
					const filter = (i) => i.customId.includes(`shop_Price`) && i.user.id === interaction.user.id
					let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
					let check = false
					if (interaction2 && interaction2.customId.includes(`shop_Price`)) {
						let priceType
						if (interaction2.isButton() && interaction2.customId === "shop_PriceSelectItem") {
							const modal = new ModalBuilder()
								.setCustomId(`manager-items_setPrice_${interaction2.id}`)
								.setTitle(`${client.language({ textId: "Set purchase price", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setLabelComponents([
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("item")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
								])
							await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
							const filter = (i) => i.customId === `manager-items_setPrice_${interaction2.id}` && i.user.id === interaction.user.id
							interaction2 = await interaction2.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction2)
							if (interaction2 && interaction2.isModalSubmit()) {
								const modalArgs = {}
								interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
								const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()))
								if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
									let result = ""
									filteredItems.forEach(item => {
										result += `> ${item.displayEmoji}**${item.name}**\n`
									})
									await interaction2.update({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), components: [], flags: ["Ephemeral"] })
									return interaction.editReply({ components: components1 })
								} else {
									const searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
									if (!searchedItem) {
										await interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										return interaction.editReply({ components: components1 })
									}
									else {
										if (item.itemID === searchedItem.itemID) {
											await interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Cannot set currency type that is this item, select different currency type except", guildId: interaction.guildId, locale: interaction.locale })} ${searchedItem.displayEmoji}**${searchedItem.name}**`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components1 })
										} else {
											check = true
											priceType = searchedItem.itemID
										}
									}
								}
							} else return
						}
						else if (interaction2.isButton() && interaction2.customId === "shop_PriceSelectCurrency") {
							check = true
							priceType = "currency"
						}
						else if (interaction2.isButton() && interaction2.customId === "shop_PriceSelectCookie") {
							check = true
							priceType = "cookie"
						}
						else if (interaction2.isButton() && interaction2.customId === "shop_PriceRemove") {
							check = false
							item.shop.priceType = undefined
							item.shop.price = 0
							item.shop.cryptoPrice = undefined
							item.shop.cryptoPriceMultiplier = undefined
							await item.save()
						}
						if (check) {
							await interaction2.update({ content: ` `, components: [
								new ActionRowBuilder().addComponents([
									new ButtonBuilder()
										.setCustomId(`shop_TypePriceCrypto`)
										.setLabel(`${client.language({ textId: "Create currency pair", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId(`shop_TypePriceDefault`)
										.setLabel(`${client.language({ textId: "Enter price", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId(`shop_TypePriceCancel`)
										.setLabel(`${client.language({ textId: "Cancel", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Danger)
								]),
								new ActionRowBuilder().addComponents([
									new ButtonBuilder()
										.setCustomId(`cmd{getCurrencies}`)
										.setLabel(`${client.language({ textId: "All currencies list", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId(`cmd{getCryptocurrencies}`)
										.setLabel(`${client.language({ textId: "All cryptocurrencies list", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Secondary)
								])
							], embeds: [] })
							const filter = (i) => i.customId.includes(`shop_TypePrice`) && i.user.id === interaction.user.id
							interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
							if (interaction2 && interaction2.customId.includes(`shop_TypePrice`)) {
								if (interaction2.customId === "shop_TypePriceCrypto") {
									const modal = new ModalBuilder()
										.setCustomId(`manager-items_shop_currency_pair_${interaction2.id}`)
										.setTitle(`${client.language({ textId: "Create currency pair", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setLabelComponents([
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Currency pair", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("pair")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
														.setPlaceholder("USD-RUB")
												),
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Price multiplier", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("multiplier")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
														.setValue(`1`)
												),
										])
									await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
									const filter = (i) => i.customId === `manager-items_shop_currency_pair_${interaction2.id}` && i.user.id === interaction.user.id
									interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction2)
									if (interaction2 && interaction2.isModalSubmit()) {
										const modalArgs = {}
										interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
										modalArgs.price = +modalArgs.price
										const isValidPair = await fetch(`https://api.coinbase.com/v2/prices/${modalArgs.pair}/buy`).then(response => response.json().then(response => response.code !== 5 && response.code !== 3 && !Array.isArray(response.data)))
										if (!isValidPair) {
											await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.pair}** ${client.language({ textId: "is not a valid currency pair", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components1 })
										}
										if (isNaN(+modalArgs.multiplier)) {
											await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.multiplier}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components1 })
										}
										item.shop.priceType = priceType
										item.shop.cryptoPrice = modalArgs.pair
										item.shop.cryptoPriceMultiplier = +modalArgs.multiplier
										await item.save()
									} else return
								}
								if (interaction2.isButton() && interaction2.customId === "shop_TypePriceDefault") {
									const modal = new ModalBuilder()
										.setCustomId(`manager-items_price_${interaction2.id}`)
										.setTitle(`${client.language({ textId: "Item purchase price", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setLabelComponents([
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Price", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("price")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
														.setPlaceholder(`${client.language({ textId: "Enter price", guildId: interaction.guildId, locale: interaction.locale })}`)
														.setValue(`${item.shop.price || "0"}`)
												),
										])
									await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
									const filter = (i) => i.customId === `manager-items_price_${interaction2.id}` && i.user.id === interaction.user.id
									interaction2 = await interaction2.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction2)
									if (interaction2 && interaction2.isModalSubmit()) {
										const modalArgs = {}
										interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
										if (isNaN(+modalArgs.price)) {
											await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.price}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components1 })
										}
										modalArgs.price = +modalArgs.price
										if (modalArgs.price <= 0 || modalArgs.price > 100000000000) {
											await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Price must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components1 })
										}
										item.shop.priceType = priceType
										item.shop.price = modalArgs.price
										item.shop.cryptoPrice = undefined
										item.shop.cryptoPriceMultiplier = undefined
										await item.save()
									} else return
								}
							} else return
							await interaction2.update({ content: client.config.emojis.YES, components: [] })
						}
					} else return
				}
				if (interaction.isStringSelectMenu() && interaction.values[0] === "sellingDiscount") {
					item.shop.sellingDiscount = !item.shop.sellingDiscount
					await item.save()
				}
				if ((interaction.isStringSelectMenu() && interaction.values[0] === "shopSellingPrice") || interaction.customId.includes("shopSellingPrice")) {
					const components = JSON.parse(JSON.stringify(interaction.message.components))
					interaction.message.components.forEach(row => row.components.forEach(component => {
						component.data.disabled = true
					}))
					await interaction.update({ components: interaction.message.components })
					const setCurBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setLabel(`${client.language({ textId: "Set", guildId: interaction.guildId, locale: interaction.locale })} ${settings.currencyName}`)
						.setEmoji(settings.displayCurrencyEmoji)
						.setCustomId(`shop_SellingPriceSelect_currency`)
					const setItemBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setLabel(`${client.language({ textId: "Set item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setEmoji(client.config.emojis.box)
						.setCustomId(`shop_SellingPriceSelect_item`)
					const cancelBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Danger)
						.setEmoji(client.config.emojis.NO)
						.setLabel(`${client.language({ textId: "Cancel", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}shop`)
					const removeBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Danger)
						.setLabel(`${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setEmoji(client.config.emojis.NO)
						.setCustomId(`shop_SellingPriceRemove`)
					if (item.shop.sellingPriceType === undefined && item.shop.sellingPrice === 0) removeBTN.setDisabled(true)
					const row1 = new ActionRowBuilder().addComponents(setItemBTN, setCurBTN)
					const row2 = new ActionRowBuilder().addComponents(removeBTN, cancelBTN)
					const sellingComponents = [row1, row2]
					await interaction.followUp({ content: client.language({ textId: "Select currency for item sale. Timeout: 30s.", guildId: interaction.guildId, locale: interaction.locale }), components: sellingComponents, embeds: [], flags: ["Ephemeral"] }).catch(async e => {
						if (handleEmojiError(e, sellingComponents)) {
							await interaction.followUp({ 
								content: client.language({ textId: "Select currency for item sale. Timeout: 30s.", guildId: interaction.guildId, locale: interaction.locale }), components: sellingComponents, embeds: [], flags: ["Ephemeral"]
							})
						} else client.functions.sendError(e)
					})
					const filter = (i) => i.customId.includes(`shop_SellingPrice`) && i.user.id === interaction.user.id
					let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
					let check = false
					if (interaction2 && interaction2.customId.includes("shop_SellingPrice")) {
						let sellingPriceType
						if (interaction2.customId.includes("item")) {
							const modal = new ModalBuilder()
								.setCustomId(`manager-items_setSellingPrice_${interaction2.id}`)
								.setTitle(`${client.language({ textId: "Set sale price", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setLabelComponents([
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("item")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
								])
							await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
							const filter = (i) => i.customId === `manager-items_setSellingPrice_${interaction2.id}` && i.user.id === interaction.user.id
							interaction2 = await interaction2.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction2)
							if (interaction2 && interaction2.isModalSubmit()) {
								const modalArgs = {}
								interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
								const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()))
								if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
									let result = ""
									filteredItems.forEach(item => {
										result += `> ${item.displayEmoji}**${item.name}**\n`
									})
									await interaction2.update({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), components: [], flags: ["Ephemeral"] })
									return interaction.editReply({ components: components })
								} else {
									const searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
									if (!searchedItem) {
										await interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										return interaction.editReply({ components: components })
									} else {
										if (item.itemID === searchedItem.itemID) {
											await interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Cannot set currency type that is this item, select different currency type except", guildId: interaction.guildId, locale: interaction.locale })} ${searchedItem.displayEmoji}**${searchedItem.name}**`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components })
										} else {
											check = true
											sellingPriceType = searchedItem.itemID
										}
									}
								}
							} else return
						}
						else if (interaction2.isButton() && interaction2.customId === "shop_SellingPriceSelect_currency") {
							check = true
							sellingPriceType = "currency"
						}
						else if (interaction2.isButton() && interaction2.customId === "shop_SellingPriceRemove") {
							check = false
							item.shop.sellingPriceType = undefined
							item.shop.sellingPrice = 0
							item.shop.cryptoSellingPrice = undefined
							item.shop.cryptoSellingPriceMultiplier = undefined
							await item.save()
						}
						if (check) {
							await interaction2.update({ content: ``, components: [
								new ActionRowBuilder().addComponents([
									new ButtonBuilder()
										.setCustomId(`shop_TypeSellingPriceCrypto`)
										.setLabel(`${client.language({ textId: "Create currency pair", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId(`shop_TypeSellingPriceDefault`)
										.setLabel(`${client.language({ textId: "Enter sale price", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId(`shop_TypeSellingPriceCancel`)
										.setLabel(`${client.language({ textId: "Cancel", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Danger)
								]),
								new ActionRowBuilder().addComponents([
									new ButtonBuilder()
										.setCustomId(`cmd{getCurrencies}`)
										.setLabel(`${client.language({ textId: "All currencies list", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId(`cmd{getCryptocurrencies}`)
										.setLabel(`${client.language({ textId: "All cryptocurrencies list", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setStyle(ButtonStyle.Secondary)
								])
							], embeds: [] })
							const filter = (i) => i.customId.includes(`shop_TypeSellingPrice`) && i.user.id === interaction.user.id
							interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
							if (interaction2 && interaction2.customId.includes(`shop_TypeSellingPrice`)) {
								if (interaction2.customId === "shop_TypeSellingPriceCrypto") {
									const modal = new ModalBuilder()
										.setCustomId(`manager-items_shop_currency_pair_${interaction2.id}`)
										.setTitle(`${client.language({ textId: "Create currency pair", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setLabelComponents([
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Currency pair", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("pair")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
														.setPlaceholder("USD-RUB")
												),
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Price multiplier", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("multiplier")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
														.setValue(`1`)
												),
										])
									await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
									const filter = (i) => i.customId === `manager-items_shop_currency_pair_${interaction2.id}` && i.user.id === interaction.user.id
									interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction2)
									if (interaction2 && interaction2.isModalSubmit()) {
										const modalArgs = {}
										interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
										modalArgs.price = +modalArgs.price
										const isValidPair = await fetch(`https://api.coinbase.com/v2/prices/${modalArgs.pair}/sell`).then(response => response.json().then(response => response.code !== 5 && response.code !== 3 && !Array.isArray(response.data)))
										if (!isValidPair) {
											await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.pair}** ${client.language({ textId: "is not a valid currency pair", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components })
										}
										if (isNaN(+modalArgs.multiplier)) {
											await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.multiplier}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components })
										}
										item.shop.sellingPriceType = sellingPriceType
										item.shop.cryptoSellingPrice = modalArgs.pair
										item.shop.cryptoSellingPriceMultiplier = +modalArgs.multiplier
										await item.save()
									} else return
								}
								if (interaction2.isButton() && interaction2.customId === "shop_TypeSellingPriceDefault") {
									const modal = new ModalBuilder()
										.setCustomId(`manager-items_sellingPrice_${interaction2.id}`)
										.setTitle(`${client.language({ textId: "Item sale price", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setLabelComponents([
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Price", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("price")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
														.setPlaceholder(`${client.language({ textId: "Enter price", guildId: interaction.guildId, locale: interaction.locale })}`)
														.setValue(`${item.shop.sellingPrice || " "}`)
												),
										])
									await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
									const filter = (i) => i.customId === `manager-items_sellingPrice_${interaction2.id}` && i.user.id === interaction.user.id
									interaction2 = await interaction2.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction2)
									if (interaction2 && interaction2.isModalSubmit()) {
										const modalArgs = {}
										interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
										if (isNaN(+modalArgs.price)) {
											await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.price}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components })
										}
										modalArgs.price = +modalArgs.price
										if (modalArgs.price <= 0 || modalArgs.price > 100000000000) {
											await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Price must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, components: [], flags: ["Ephemeral"] })
											return interaction.editReply({ components: components })
										}
										item.shop.sellingPriceType = sellingPriceType
										item.shop.sellingPrice = modalArgs.price
										item.shop.cryptoSellingPrice = undefined
										item.shop.cryptoSellingPriceMultiplier = undefined
										await item.save()
									} else return
								}
							} else return
							await interaction2.update({ content: client.config.emojis.YES, components: [] })
						}
					} else return
				}
				if (interaction.isStringSelectMenu() && interaction.values[0] === "dailyLimit") {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_dailyLimit_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Daily item purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Limit", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(true)
										.setStyle(TextInputStyle.Short)
										.setPlaceholder(`${client.language({ textId: "Enter limit", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setValue(`${item.shop.dailyShopping || "0"}`)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_dailyLimit_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
							return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						modalArgs.amount = +modalArgs.amount
						if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, flags: ["Ephemeral"] })
						}
						item.shop.dailyShopping = modalArgs.amount
						await item.save()
					} else return
				}
				if (interaction.isStringSelectMenu() && interaction.values[0] === "weeklyLimit") {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_weeklyLimit_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Weekly item purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Limit", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(true)
										.setStyle(TextInputStyle.Short)
										.setPlaceholder(`${client.language({ textId: "Enter limit", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setValue(`${item.shop.weeklyShopping || "0"}`)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_weeklyLimit_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
							return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						modalArgs.amount = +modalArgs.amount
						if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, flags: ["Ephemeral"] })
						}
						item.shop.weeklyShopping = modalArgs.amount
						await item.save()
					} else return
				}
				if (interaction.isStringSelectMenu() && interaction.values[0] === "monthlyLimit") {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_monthlyLimit_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Monthly item purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Limit", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(true)
										.setStyle(TextInputStyle.Short)
										.setPlaceholder(`${client.language({ textId: "Enter limit", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setValue(`${item.shop.monthlyShopping || "0"}`)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_monthlyLimit_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
							return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						modalArgs.amount = +modalArgs.amount
						if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, flags: ["Ephemeral"] })
						}
						item.shop.monthlyShopping = modalArgs.amount
						await item.save()
					} else return
				}
				if (interaction.isStringSelectMenu() && (interaction.values[0] === "dailyDelivery" || interaction.values[0] === "weeklyDelivery" || interaction.values[0] === "monthlyDelivery")) {
					const components = JSON.parse(JSON.stringify(interaction.message.components))
					interaction.message.components.forEach(row => row.components.forEach(component => {
						component.data.disabled = true
					}))
					await interaction.update({ components: interaction.message.components })
					const cancelBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Danger)
						.setEmoji(client.config.emojis.NO)
						.setLabel(`${client.language({ textId: "Cancel", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}shop`)
					const time = interaction.values[0] === "dailyDelivery" ? "daily" : interaction.values[0] === "weeklyDelivery" ? "weekly" : "monthly"
					const selectMenu = new StringSelectMenuBuilder()
						.setCustomId(`Delivery`)
						.setOptions([
							{
								label: `${client.language({ textId: "Quantity will be replaced", guildId: interaction.guildId, locale: interaction.locale })}`,
								description: `${client.language({ textId: "Auto-delivery will replace current quantity", guildId: interaction.guildId, locale: interaction.locale })}`,
								value: `set`
							},
							{
								label: `${client.language({ textId: "Quantity will increase", guildId: interaction.guildId, locale: interaction.locale })}`,
								description: `${client.language({ textId: "Auto-delivery will increase current quantity", guildId: interaction.guildId, locale: interaction.locale })}`,
								value: `increase`
							}
						])
						.setPlaceholder(`${client.language({ textId: "Select auto-delivery type", guildId: interaction.guildId, locale: interaction.locale })}...`)
					const firstRow = new ActionRowBuilder().addComponents(selectMenu)
					const secondRow = new ActionRowBuilder().addComponents(cancelBTN)
					await interaction.followUp({ content: client.language({ textId: "Select auto-delivery type", guildId: interaction.guildId, locale: interaction.locale }), components: [firstRow, secondRow], flags: ["Ephemeral"] })
					const filter = (i) => i.customId.includes(`Delivery`) && i.user.id === interaction.user.id
					let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
					if (interaction2 && interaction2.isStringSelectMenu()) {
						const value = interaction2.values[0]
						const modal = new ModalBuilder()
							.setCustomId(`manager-items_Delivery_${interaction2.id}`)
							.setTitle(`${client.language({ textId: "Item auto-delivery quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Auto-delivery", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("amount")
											.setRequired(true)
											.setStyle(TextInputStyle.Short)
											.setPlaceholder(`${client.language({ textId: "Enter quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
											.setValue(`${item.shop.autodelivery[time].amount || "0"}`)
									),
							])
						await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_Delivery_${interaction2.id}` && i.user.id === interaction.user.id
						interaction2 = await interaction2.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction2)
						if (interaction2 && interaction2.isModalSubmit()) {
							const modalArgs = {}
							interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
							if (isNaN(+modalArgs.amount)) {
								await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
								return interaction.editReply({ components: components })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
								await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, components: [], flags: ["Ephemeral"] })
								return interaction.editReply({ components: components })
							}
							item.shop.autodelivery[time].amount = modalArgs.amount
							item.shop.autodelivery[time].type = value
							await item.save()
							await interaction2.update({ content: client.config.emojis.YES, components: [] })
						} else return
					} else return
				}
				const priceItem = item.shop.priceType === "currency" ? { name: settings.currencyName } : item.shop.priceType === "cookie" ? { name: client.language({ textId: "Cookies", guildId: interaction.guildId, locale: interaction.locale }) } : client.cache.items.get(item.shop.priceType)
				const priceEmoji = priceItem?.name === settings.currencyName ? settings.displayCurrencyEmoji : priceItem?.name === client.language({ textId: "Cookies", guildId: interaction.guildId, locale: interaction.locale }) ? `🍪` : await client.functions.getEmoji(client, priceItem?.emoji)
				const sellingPriceItem = item.shop.sellingPriceType === "currency" ? { name: settings.currencyName } : client.cache.items.get(item.shop.sellingPriceType)
				const sellingPriceEmoji = sellingPriceItem?.name === settings.currencyName ? settings.displayCurrencyEmoji : await client.functions.getEmoji(client, sellingPriceItem?.emoji)
				const description = [
					`${client.language({ textId: "In shop", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.inShop ? client.config.emojis.YES : client.config.emojis.NO}`,
					`${client.language({ textId: "Quantity in shop", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.amount}`,
					`${client.language({ textId: "Discount or penalty to price when buying depending on reputation", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.canDiscount ? client.config.emojis.YES : client.config.emojis.NO}`,
					`${client.language({ textId: "Shop price", guildId: interaction.guildId, locale: interaction.locale })}: ${priceItem && item.shop.cryptoPrice ? `${priceEmoji}**${priceItem.name}** ${await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoPriceMultiplier))}` : priceItem && item.shop.price ? `${priceEmoji}**${priceItem.name}** ${item.shop.price}` : client.config.emojis.NO}`,
					`${client.language({ textId: "Bonus or penalty to sale depending on reputation", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.sellingDiscount ? client.config.emojis.YES : client.config.emojis.NO}`,
					`${client.language({ textId: "Sale price to shop", guildId: interaction.guildId, locale: interaction.locale })}: ${sellingPriceItem && item.shop.cryptoSellingPrice ? `${sellingPriceEmoji}**${sellingPriceItem.name}** ${await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoSellingPrice}/sell`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoSellingPriceMultiplier))}` : sellingPriceItem && item.shop.sellingPrice ? `${sellingPriceEmoji}**${sellingPriceItem.name}** ${item.shop.sellingPrice}` : client.config.emojis.NO}`,
					`${client.language({ textId: "Daily purchase limit", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.dailyShopping > 0 ? item.shop.dailyShopping : client.language({ textId: "Unlimited", guildId: interaction.guildId, locale: interaction.locale })}`,
					`${client.language({ textId: "Weekly purchase limit", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.weeklyShopping > 0 ? item.shop.weeklyShopping : client.language({ textId: "Unlimited", guildId: interaction.guildId, locale: interaction.locale })}`,
					`${client.language({ textId: "Monthly purchase limit", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.monthlyShopping > 0 ? item.shop.monthlyShopping : client.language({ textId: "Unlimited", guildId: interaction.guildId, locale: interaction.locale })}`,
					`**${client.language({ textId: "Auto-delivery", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`${client.language({ textId: "Every day", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery?.daily.amount > 0 ? `${item.shop.autodelivery.daily.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.daily.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.daily.amount}`}` : 0}`,
					`${client.language({ textId: "Every week", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery?.weekly.amount > 0 ? `${item.shop.autodelivery.weekly.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.weekly.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.weekly.amount}`}` : 0}`,
					`${client.language({ textId: "Every month", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery?.monthly.amount > 0 ? `${item.shop.autodelivery.monthly.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.monthly.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.monthly.amount}`}` : 0}`
				]
				const actions = [
					{
						label: item.shop.inShop ? `${client.language({ textId: "Remove from shop", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Add to shop", guildId: interaction.guildId, locale: interaction.locale })}`,
						value: `switchInShop`
					},
					{
						label: `${client.language({ textId: "Change shop quantity", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${item.shop.amount}`,
						value: `shopAmount`
					},
					{
						label: `${client.language({ textId: "Discount or penalty to price when buying depending on reputation", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${item.shop.canDiscount ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}` }`,
						value: `shopDiscount`
					},
					{
						label: `${client.language({ textId: "Change shop price", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${priceItem && (item.shop.price || item.shop.cryptoPrice) ? `${priceItem.name} (${item.shop.cryptoPrice ? await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoPriceMultiplier)) : item.shop.price})` : `${client.language({ textId: "Not purchasable", guildId: interaction.guildId, locale: interaction.locale })}` }`,
						value: `shopPrice`
					},
					{
						label: `${client.language({ textId: "Bonus or penalty to sale depending on reputation", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${item.shop.sellingDiscount ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}` }`,
						value: `sellingDiscount`
					},
					{
						label: `${client.language({ textId: "Change sale price", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${sellingPriceItem && (item.shop.sellingPrice || item.shop.cryptoSellingPrice) ? `${sellingPriceItem.name} (${item.shop.cryptoSellingPrice ? await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoSellingPrice}/sell`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoSellingPriceMultiplier)) : item.shop.sellingPrice})` : `${client.language({ textId: "Not sellable", guildId: interaction.guildId, locale: interaction.locale })}` }`,
						value: `shopSellingPrice`
					},
					{
						label: `${client.language({ textId: "Change daily purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${client.language({ textId: "Limit", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.dailyShopping}`,
						value: `dailyLimit`
					},
					{
						label: `${client.language({ textId: "Change weekly purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${client.language({ textId: "Limit", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.weeklyShopping}`,
						value: `weeklyLimit`
					},
					{
						label: `${client.language({ textId: "Change monthly purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${client.language({ textId: "Limit", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.monthlyShopping}`,
						value: `monthlyLimit`
					},
					{
						label: `${client.language({ textId: "Change daily auto-delivery quantity", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${client.language({ textId: "Every day", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery?.daily.amount > 0 ? `${item.shop.autodelivery.daily.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.daily.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.daily.amount}`}` : 0}`,
						value: `dailyDelivery`
					},
					{
						label: `${client.language({ textId: "Change weekly auto-delivery quantity", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${client.language({ textId: "Every week", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery?.weekly.amount > 0 ? `${item.shop.autodelivery.weekly.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.weekly.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.weekly.amount}`}` : 0}`,
						value: `weeklyDelivery`
					},
					{
						label: `${client.language({ textId: "Change monthly auto-delivery quantity", guildId: interaction.guildId, locale: interaction.locale })}`,
						description: `${client.language({ textId: "Every month", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery?.monthly.amount > 0 ? `${item.shop.autodelivery.monthly.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.monthly.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.monthly.amount}`}` : 0}`,
						value: `monthlyDelivery`
					},
				]
				const selectMenu = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}shop`)
					.setOptions(actions)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} rarity usr{${interaction.user.id}}`)
				if (!item.temp) backBTN.setCustomId(`it{${item.itemID}}cmd{manager-items} hex usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting usr{${interaction.user.id}}`)
				const firstRow = new ActionRowBuilder().addComponents([selectMenu])
				const secondRow = new ActionRowBuilder().addComponents([backBTN, nextBTN])
				let embed = await generateItemEmbed(client, interaction, item)
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: description.join("\n"), embeds: [embed], components: [navigationRow, firstRow, secondRow] })
				else return interaction.update({ content: description.join("\n"), embeds: [embed], components: [navigationRow, firstRow, secondRow] })
			}
			//СОЗДАНИЕ
			if ((interaction.customId.includes(`crafting`)) && !interaction.customId.includes(`recipe`) || interaction.values?.[0] == `crafting`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🛠️${client.language({ textId: "Crafting", guildId: interaction.guildId, locale: interaction.locale })}${item.crafts?.length ? ` [${item.crafts.length}]` : `` }`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				let content = [
					`**${client.language({ textId: "CRAFT", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Item can be created by combining other items. Maximum recipes: 10. If you don't want to add craft, you can skip this step by clicking NEXT", guildId: interaction.guildId, locale: interaction.locale })}.`
				]
				let temp = client.temp.find((e) => { return e.itemID == item.itemID })
				if (interaction.customId.includes(`add_amount`))  {
					let name = interaction.customId.slice(interaction.customId.indexOf(`add_amount_`)+11)
					if (!temp) {
						client.temp.push({
							itemID: item.itemID,
							openByItem: {
								itemID: undefined,
								amount: undefined
							},
							contains: [],
							crafts: []
						})
						temp = client.temp.find((e) => { return e.itemID == item.itemID }) 
					}
					if (name === "item") {
						const modal = new ModalBuilder()
							.setCustomId(`manager-items_add_recipeAmount_${interaction.id}`)
							.setTitle(`${client.language({ textId: "Add item to recipe", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("item")
											.setRequired(true)
											.setStyle(TextInputStyle.Short)
									),
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("amount")
											.setRequired(true)
											.setStyle(TextInputStyle.Short)
									),
							])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_add_recipeAmount_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)	
					} else {
						const modal = new ModalBuilder()
							.setCustomId(`manager-items_add_recipeAmount_${interaction.id}`)
							.setTitle(`${client.language({ textId: "Item quantity for recipe", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("amount")
											.setRequired(true)
											.setStyle(TextInputStyle.Short)
											.setPlaceholder(`${client.language({ textId: "Enter quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									),
							])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_add_recipeAmount_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)	
					}
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (name === "item") {
							const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()))
							if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
								let result = ""
								filteredItems.forEach(item => {
									result += `> ${item.displayEmoji}**${item.name}**\n`
								})
								return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), flags: ["Ephemeral"] })  
							}
							const searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
							if (!searchedItem) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })  
							name = searchedItem.itemID
						}
						if (isNaN(+modalArgs.amount)) {
							return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						modalArgs.amount = +modalArgs.amount
						if (modalArgs.amount < 0 || modalArgs.amount > 100000) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
						}
						if (temp.crafts.length == 0) {
							temp.crafts.push({ items: [{ itemID: name }], min_craft: 0 })  
						} else if (!temp.crafts[0].items.some(e => e.itemID == name)) temp.crafts[0].items.push({ itemID: name }) 
						const item1 = temp.crafts[0].items.find((e) => { return e.itemID == name })
						item1.amount ? item1.amount += modalArgs.amount : item1.amount = modalArgs.amount 
					} else return
				}
				if (interaction.customId.includes(`done`))  {
					if (temp) {
						item.crafts.push(temp.crafts[0])
						await item.save()
						client.temp = client.temp.filter(e => e.itemID !== item.itemID)    
					} else {
						await interaction.deferUpdate()
						interaction.followUp({ content: `${client.language({ textId: "Error: recipe not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
				}
				if (interaction.customId.includes(`del`))  {
					const index = IndexRegexp.exec(interaction.customId)?.[1]
					if (item.crafts[index]) {
						item.crafts.splice(index, 1)
						await item.save()   
					} else {
						await interaction.deferUpdate()
						interaction.followUp({ content: `${client.language({ textId: "Error: recipe not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
				}
				if (interaction.customId.includes(`opt`))  {
					let pass = true
					if (interaction.isStringSelectMenu()) {
						if (interaction.customId.includes("rf")) {
							if (temp) {
								if (interaction.values[0] === "no") temp.crafts[0].isFound = false
								if (interaction.values[0] === "yes") temp.crafts[0].isFound = true
							} else {
								pass = false
								await interaction.deferUpdate()
								interaction.followUp({ content: `${client.language({ textId: "Error: recipe not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
						}
					}
					if (interaction.customId.includes("permission")) {
						if (!temp) return interaction.reply({ content: `${client.language({ textId: "Error: recipe not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						const modal = new ModalBuilder()
							.setCustomId(`manager-items_carftpermissions_${interaction.id}`)
							.setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("name")
											.setRequired(false)
											.setValue(`${client.cache.permissions.find(e => e.id === temp.crafts[0].permission)?.name || ""}`)
											.setStyle(TextInputStyle.Short)
									),
							])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_carftpermissions_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						if (interaction && interaction.type === InteractionType.ModalSubmit) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
							if (!modalArgs.name) {
								temp.crafts[0].permission = undefined
							} else {
								const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
								if (!permission) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
								} else {
									temp.crafts[0].permission = permission.id
								}
							}
						} else return
					}
					if (interaction.customId.includes("cooldown")) {
						const modal = new ModalBuilder()
							.setCustomId(`manager-items_cooldown_craft_${interaction.id}`)
							.setTitle(`${client.language({ textId: `craft`, guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Cooldown (sec)", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("cooldown")
											.setRequired(true)
											.setValue(`${temp.crafts[0].cooldown_craft || 0}`)
											.setStyle(TextInputStyle.Short)
									),
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Min. quantity at once", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("min")
											.setRequired(true)
											.setValue(`${temp.crafts[0].min_craft || 1}`)
											.setStyle(TextInputStyle.Short)
									),
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Max. quantity at once", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("max")
											.setRequired(false)
											.setValue(`${temp.crafts[0].max_craft || ""}`)
											.setStyle(TextInputStyle.Short)
									),
							])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_cooldown_craft_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						if (interaction && interaction.type === InteractionType.ModalSubmit) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
							await interaction.deferUpdate()
							if (isNaN(+modalArgs.cooldown) || !Number.isInteger(+modalArgs.cooldown)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.cooldown}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.min) || !Number.isInteger(+modalArgs.min)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.min}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if ((modalArgs.max && (isNaN(+modalArgs.max)) || !Number.isInteger(+modalArgs.max))) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.max}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.cooldown = +modalArgs.cooldown
							modalArgs.min = +modalArgs.min
							if (modalArgs.max) modalArgs.max = +modalArgs.max
							if (modalArgs.max && modalArgs.min > modalArgs.max) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.cooldown <= 0 || modalArgs.cooldown > 2592000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Cooldown must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 2592000`, flags: ["Ephemeral"] })
								pass = false
							}
							temp.crafts[0].cooldown_craft = modalArgs.cooldown
							temp.crafts[0].min_craft = modalArgs.min
							if (modalArgs.max) temp.crafts[0].max_craft = modalArgs.max
							else temp.crafts[0].max_craft = undefined
						}
					}
					const foundMenu = new StringSelectMenuBuilder()
						.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}crafting_optrf`)
						.addOptions([
							{
								label: `${client.language({ textId: "Recipe known", guildId: interaction.guildId, locale: interaction.locale })}`,
								value: `yes`,
								default: temp.crafts[0].isFound,
								emoji: client.config.emojis.YES
							},
							{
								label: `${client.language({ textId: "Recipe unknown", guildId: interaction.guildId, locale: interaction.locale })}`,
								value: `no`,
								default: !temp.crafts[0].isFound,
								emoji: client.config.emojis.NO
							}
						])
					const permissionBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setLabel(`${client.language({ textId: "Craft permissions", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}craftingoptpermission`)
					const cooldownBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setLabel(`${client.language({ textId: "Cooldown", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}craftingoptcooldown`)
					const backBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setEmoji(client.config.emojis.arrowLeft)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting_amountForCraft usr{${interaction.user.id}}`)
					const addBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setLabel(`${client.language({ textId: "Add recipe", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setEmoji(client.config.emojis.YES)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting_done usr{${interaction.user.id}}`)
					temp.crafts[0].amountFrom && temp.crafts[0].amountTo ? addBTN.setDisabled(false) : addBTN.setDisabled(true)
					const firstRow = new ActionRowBuilder().addComponents([foundMenu])
					const secondRow = new ActionRowBuilder().addComponents([backBTN, permissionBTN, cooldownBTN, addBTN])
					const content = [
						`**${client.language({ textId: "Craft settings", guildId: interaction.guildId, locale: interaction.locale })}**`,
						`${client.language({ textId: "Recipe known", guildId: interaction.guildId, locale: interaction.locale })}: ${temp.crafts[0].isFound ? client.config.emojis.YES : client.config.emojis.NO}`,
						`${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}: ${temp.crafts[0].permission ? `${client.cache.permissions.find(e => e.id === temp.crafts[0].permission)?.name || temp.crafts[0].permission}` : `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`}`,
						`${client.language({ textId: "Cooldown", guildId: interaction.guildId, locale: interaction.locale })}: ${transformSecs(client, temp.crafts[0].cooldown_craft*1000 || 0, interaction.guildId, interaction.locale)}`
					]
					if (interaction.replied || interaction.deferred) return interaction.editReply({ content: content.join("\n"), components: [firstRow, secondRow], embeds: [] })
					else return interaction.update({ content: content.join("\n"), components: [firstRow, secondRow], embeds: [] })
				}
				if (interaction.customId.includes(`cancel`))  {
					client.temp = client.temp.filter(e => e.itemID !== item.itemID)
				}
				if (interaction.customId.includes(`amountForCraft`))  {
					content = [`Выбери количество получаемого предмета (${item.name}) ${client.language({ textId: "for this craft. You can select number range, then random number from range will be chosen", guildId: interaction.guildId, locale: interaction.locale })}.`]
					const temp = client.temp.find((e) => { return e.itemID == item.itemID })
					if (temp) temp.crafts[0].isFound = true
					let itemsForCraft = ``
					let d = false
					if (temp) {
						for (const craft of temp.crafts) {
							d = true
							let craftingItems = ``
							for (const i of craft.items) {
								let Item = client.cache.items.get(i.itemID)
								let amount = ``
								if (i.amount > 1) amount += i.amount
								if (i.itemID === `currency`) {
									if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += `${settings.displayCurrencyEmoji}**${settings.currencyName}** ${amount}`
									else itemsForCraft += ` + ${settings.displayCurrencyEmoji}**${settings.currencyName}** ${amount}` 
								} else {
									if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += `${Item.displayEmoji}**${Item.name}** ${amount}`
									else itemsForCraft += ` + ${Item.displayEmoji}**${Item.name}** ${amount}`
								}
							}
							craft.amountFrom !== craft.amountTo ? craftingItems = `${craft.amountFrom}-${craft.amountTo} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.` : craft.amountFrom > 1 ? craftingItems = `${craft.amountFrom} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.` : craftingItems = ``
							itemsForCraft += ` = ${item.displayEmoji}**${item.name}** ${craftingItems}`
						}
						if (d) content = [`${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })}:\n${itemsForCraft}`]
						if (interaction.customId.includes(`edit`)) {
							const modal = new ModalBuilder()
								.setCustomId(`manager-items_minMaxRecipeAmount_${interaction.id}`)
								.setTitle(`${client.language({ textId: "Number of items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setLabelComponents([
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Minimum quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("min")
												.setRequired(true)
												.setValue(`${temp.crafts[0].amountFrom || ""}`)
												.setStyle(TextInputStyle.Short)
										),
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("max")
												.setRequired(true)
												.setValue(`${temp.crafts[0].amountTo || ""}`)
												.setStyle(TextInputStyle.Short)
										),
								])
							await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
							const filter = (i) => i.customId === `manager-items_minMaxRecipeAmount_${interaction.id}` && i.user.id === interaction.user.id
							interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
							if (interaction && interaction.type === InteractionType.ModalSubmit) {
								const modalArgs = {}
								interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
								if (isNaN(+modalArgs.min)) {
									return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.min}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								}
								if (isNaN(+modalArgs.max)) {
									return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.max}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								}
								modalArgs.min = +modalArgs.min
								modalArgs.max = +modalArgs.max
								if (modalArgs.min <= 0 || modalArgs.min > 1000000000 || modalArgs.max <= 0 || modalArgs.max > 1000000000) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
								}
								if (modalArgs.min > modalArgs.max) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								}
								temp.crafts[0].amountFrom = modalArgs.min
								temp.crafts[0].amountTo = modalArgs.max
								let itemsForCraft = ``
								let d = false
								for (const craft of temp.crafts) {
									d = true
									let craftingItems = ``
									for (const i of craft.items) {
										let Item = client.cache.items.get(i.itemID)
										let amount = ``
										if (i.amount > 1) amount = `(${i.amount})`
										if (i.itemID === `currency`) {
											if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += `${settings.displayCurrencyEmoji}**${settings.currencyName}** ${amount}`
											else itemsForCraft += ` + ` + `${settings.displayCurrencyEmoji}**${settings.currencyName}** ${amount}`
										} else {
											if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += `${Item.displayEmoji}**${Item.name}** ${amount}`
											else itemsForCraft += ` + ${Item.displayEmoji}**${Item.name}** ${amount}` 
										}
									}
									craft.amountFrom !== craft.amountTo ? craftingItems = `${craft.amountFrom}-${craft.amountTo} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.` : craft.amountFrom > 1 ? craftingItems = `${craft.amountFrom} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.` : craftingItems = ``
									itemsForCraft += ` = ${item.displayEmoji}**${item.name}** ${craftingItems}`
								}
								if (d) content = [`${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })}:\n${itemsForCraft}`]
							}
						}
						const backBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(client.config.emojis.arrowLeft)
							.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting_add usr{${interaction.user.id}}`)
						const editBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Success)
							.setEmoji(client.config.emojis.edit)
							.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting_amountForCraft_edit usr{${interaction.user.id}}`)
						const nextBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(client.config.emojis.arrowRight)
							.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}craftingopt`)
						temp.crafts[0].amountFrom && temp.crafts[0].amountTo ? nextBTN.setDisabled(false) : nextBTN.setDisabled(true)
						const firstRow = new ActionRowBuilder().addComponents(backBTN, editBTN, nextBTN)
						if (interaction.replied || interaction.deferred) return interaction.editReply({ content: content.join("\n"), components: [firstRow] })
						else return interaction.update({ content: content.join("\n"), components: [firstRow] })
					} else {
						await interaction.deferUpdate()
						interaction.followUp({ content: `${client.language({ textId: "Error: recipe not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
				}
				if (interaction.customId.includes(`add`))  {
					if (item.crafts.length < 10) {
						content = [`${client.language({ textId: "Select item for recipe. Up to 10 items can be added to one recipe", guildId: interaction.guildId, locale: interaction.locale })}.`]
						if (!client.temp.find(e => e.itemID == item.itemID)) {
							client.temp.push({
								itemID: item.itemID,
								openByItem: {
									itemID: undefined,
									amount: undefined
								},
								contains: [],
								crafts: []
							})    
						}
						const temp = client.temp.find((e) => { return e.itemID == item.itemID })
						let itemsForCraft = ``
						let d = false
						for (const craft of temp.crafts) {
							d = true
							let craftingItems = ``
							for (const i of craft.items) {
								let Item = client.cache.items.get(i.itemID)
								let amount = ``
								if (i.amount > 1) amount += i.amount
								if (i.itemID === `currency`) {
									if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += settings.displayCurrencyEmoji + amount
									else itemsForCraft += ` + ` + settings.displayCurrencyEmoji + amount 
								} else {
									if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += Item.displayEmoji + amount
									else itemsForCraft += ` + ` + Item.displayEmoji + amount 
								}
							}
							craft.amountFrom !== craft.amountTo ? craftingItems = `${craft.amountFrom}-${craft.amountTo} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.` : craft.amountFrom > 1 ? craftingItems = `${craft.amountFrom} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.` : craftingItems = ``
							itemsForCraft += ` = ${item.displayEmoji}${craftingItems}`
						}
						if (d) content = [`${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })}:\n${itemsForCraft}`]
						const addItemBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setLabel(`${client.language({ textId: "Add item", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setEmoji(client.config.emojis.box)
							.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}} crafting_add_amount_item`)
						const addCurBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setLabel(`${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} ${settings.currencyName}`)
							.setEmoji(settings.displayCurrencyEmoji)
							.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}} crafting_add_amount_currency`)
						const cancelBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Danger)
							.setLabel(`${client.language({ textId: "Cancel", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setEmoji(client.config.emojis.NO)
							.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}} crafting_cancel`)
						const nextBTN = new ButtonBuilder()
							.setStyle(ButtonStyle.Secondary)
							.setEmoji(client.config.emojis.arrowRight)
							.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}} crafting_amountForCraft`)
						if (temp.crafts.length > 0 && temp.crafts[0].items.length >= 10) {
							addCurBTN.setDisabled(true)
							addItemBTN.setDisabled(true)
						}
						temp.crafts.length > 0 ? nextBTN.setDisabled(false) : nextBTN.setDisabled(true)
						const components = [new ActionRowBuilder().addComponents(addItemBTN, addCurBTN), new ActionRowBuilder().addComponents(cancelBTN, nextBTN)]
						if (interaction.replied || interaction.deferred) return interaction.editReply({ content: content.join("\n"), components: components, embeds: [] })
						else return interaction.update({ content: content.join("\n"), components: components, embeds: [] })
					} else {
						await interaction.deferUpdate()
						interaction.followUp({ content: `${client.language({ textId: "Error: maximum recipes reached", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
				}
				let itemsForCraft = ""
				let craftIndex = -1
				let a = 0
				for (const craft of item.crafts) {
					craftIndex++
					craftingItems = item.crafts[craftIndex].amountFrom !== item.crafts[craftIndex].amountTo ? `(${item.crafts[craftIndex].amountFrom}-${item.crafts[craftIndex].amountTo})` : item.crafts[craftIndex].amountFrom == item.crafts[craftIndex].amountTo ? `(${item.crafts[craftIndex].amountTo})` : ""
					a++
					if (craft.items.length > 0) {
						for (const i of craft.items) {
							let Item = client.cache.items.get(i.itemID)
							let amount = ""
							if (i.amount > 1) amount = ` (${i.amount})`
							if (i.itemID === "currency") {
								if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += `> ${settings.displayCurrencyEmoji}**${settings.currencyName}**${amount}`
								else itemsForCraft += ` + ${settings.displayCurrencyEmoji}**${settings.currencyName}**${amount}`
							} else {
								if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) {
									itemsForCraft += `> ${Item.displayEmoji}**${Item.name}**${amount}`
								} else {
									itemsForCraft += ` + ${Item.displayEmoji}**${Item.name}**${amount}`
								}     
							}
						}
					} else {
						itemsForCraft = `> ${client.language({ textId: "No items", guildId: interaction.guildId, locale: interaction.locale })}`
					}
					itemsForCraft += ` = ${item.displayEmoji}**${item.name}** ${craftingItems}${!craft.isFound ? `\n${client.language({ textId: "Recipe unknown", guildId: interaction.guildId, locale: interaction.locale })}` : ``}${craft.channelId ? `\n${client.language({ textId: "This craft recipe can only be used in", guildId: interaction.guildId, locale: interaction.locale })} <#${craft.channelId}>` : ``}`
					content.push(`${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })} №${a}\n${itemsForCraft}`)
					itemsForCraft = ""  
				}
				const embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} shop usr{${interaction.user.id}}`)
				const addCraftBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.plus)
					.setLabel(`${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting_add usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} cont usr{${interaction.user.id}}`)
				item.crafts.length >= 10 ? addCraftBTN.setDisabled(true) : addCraftBTN.setDisabled(false)
				const buttonsArray1 = []
				const buttonsArray2 = []
				let index = 0
				item.crafts.forEach(craft => {
					index++
					index > 5 ? buttonsArray2.push(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Danger)
							.setEmoji(client.config.emojis.NO)
							.setLabel(`#${index}`)
							.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting_del_${index-1} usr{${interaction.user.id}}`)
						) : buttonsArray1.push(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Danger)
							.setEmoji(client.config.emojis.NO)
							.setLabel(`#${index}`)
							.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting_del index{${index-1}} usr{${interaction.user.id}}`)
						)
				})
				const components = []
				const firstRow = new ActionRowBuilder().addComponents(buttonsArray1)
				const secondRow = new ActionRowBuilder().addComponents(buttonsArray2)
				const thirdRow = new ActionRowBuilder().addComponents([backBTN, addCraftBTN, nextBTN])
				index > 5 ? components.push(navigationRow, firstRow, secondRow, thirdRow) : index > 0 ? components.push(navigationRow, firstRow, thirdRow) : components.push(navigationRow, thirdRow)
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: content.join("\n"), embeds: [embed], components: components })
				else return interaction.update({ content: content.join("\n"), embeds: [embed], components: components })
			}
			//КЕЙС
			if ((interaction.customId.includes(`cont`)) || interaction.values?.[0] == `cont`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🎊${client.language({ textId: "Case", guildId: interaction.guildId, locale: interaction.locale })}${item.contains?.length ? ` [${item.contains.length}]` : `` }`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				let content = [`**${client.language({ textId: "CASE", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "You can add up to 10 items inside. When opening, each item's drop chance will be considered", guildId: interaction.guildId, locale: interaction.locale })}.`]
				if (interaction.customId.includes(`cancel`)) {
					client.temp = client.temp.filter(e => e.itemID !== item.itemID)
				}
				if (interaction.customId.includes(`del`))  {
					const index = IndexRegexp.exec(interaction.customId)?.[1]
					if (item.contains[index]) {
						item.contains.splice(index, 1)
						await item.save()  
					} else {
						await interaction.deferUpdate()
						interaction.followUp({ content: `${client.language({ textId: "Error: item not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
				}
				if (interaction.customId.includes(`am`)) {
					if (item.contains.length >= 10) return interaction.reply({ content: `${client.language({ textId: "Error: maximum quantity reached", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					if (!client.temp.find(e => e.itemID == item.itemID)) {
						client.temp.push({
							itemID: item.itemID,
							openByItem: {
								itemID: undefined,
								amount: undefined
							},
							contains: [],
							crafts: []
						})    
					}
					const temp = client.temp.find((e) => { return e.itemID == item.itemID })
					if (temp) {
						const name = interaction.customId.slice(interaction.customId.indexOf(`am`)+2)
						const type = name === "randomSteamGame" ? RewardType.SteamGame : name === "item" ? RewardType.Item : name === "role" ? RewardType.Role : name === "currency" ? RewardType.Currency : name === "xp" ? RewardType.Experience : RewardType.Reputation
						temp.contains.push({ type: type })
						if (type === RewardType.SteamGame) {
							interaction.message.components.forEach(row => row.components.forEach(component => {
								component.data.disabled = true
							}))
							await interaction.update({ components: interaction.message.components })
							await interaction.followUp({ 
								content: `${client.language({ textId: "Select currency for game search", guildId: interaction.guildId, locale: interaction.locale })}`,
								components: [
									new ActionRowBuilder()
										.addComponents(
											new StringSelectMenuBuilder()
												.setCustomId(`steamPriceCurrencySelect`)
												.setPlaceholder(`${client.language({ textId: "Select currency", guildId: interaction.guildId, locale: interaction.locale })}...`)
												.setOptions([
													{
														emoji: "🇷🇺",
														label: "RUB (₽)",
														description: `${client.language({ textId: "Russian ruble", guildId: interaction.guildId, locale: interaction.locale })}`,
														value: "ru"
													},
													{
														emoji: "🇺🇦",
														label: "UAH (₴)",
														description: `${client.language({ textId: "Ukrainian hryvnia", guildId: interaction.guildId, locale: interaction.locale })}`,
														value: "ua"
													},
													{
														emoji: "🇰🇿",
														label: "KZT (₸)",
														description: `${client.language({ textId: "Kazakhstani tenge", guildId: interaction.guildId, locale: interaction.locale })}`,
														value: "kz"
													},
													{
														emoji: "🇹🇷",
														label: "TL (₺)",
														description: `${client.language({ textId: "Turkish lira", guildId: interaction.guildId, locale: interaction.locale })}`,
														value: "tr"
													},
													{
														emoji: "🇺🇸",
														label: "USD ($)",
														description: `${client.language({ textId: "American dollar", guildId: interaction.guildId, locale: interaction.locale })}`,
														value: "en"
													}
												])
										),
									new ActionRowBuilder().addComponents(
										new ButtonBuilder()
											.setCustomId("steamPriceCurrencyCancel")
											.setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
											.setStyle(ButtonStyle.Danger)
									)
								],
								flags: ["Ephemeral"]
							})    
							const filter = (i) => i.customId.includes(`steamPriceCurrency`) && i.user.id === interaction.user.id
							const currencySelectMenuInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
							if (currencySelectMenuInteraction && currencySelectMenuInteraction.customId.includes("steamPriceCurrency")) {
								if (currencySelectMenuInteraction.customId === "steamPriceCurrencySelect") {
									temp.contains[0].currency = currencySelectMenuInteraction.values[0]
									const modal = new ModalBuilder()
										.setCustomId(`manager-items_steamPriceCurrencyAmount_${interaction.id}`)
										.setTitle(`${client.language({ textId: "Price range and game drop chance", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setLabelComponents([
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Min.", guildId: interaction.guildId, locale: interaction.locale })} (${currencySelectMenuInteraction.values[0]})`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("min")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
												),
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Max.", guildId: interaction.guildId, locale: interaction.locale })} (${currencySelectMenuInteraction.values[0]})`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("max")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
												),
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Drop chance", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("chance")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
												),
										])
									await currencySelectMenuInteraction.showModal(modal);delete client.globalCooldown[`${currencySelectMenuInteraction.guildId}_${currencySelectMenuInteraction.user.id}`]
									const filter = (i) => i.customId === `manager-items_steamPriceCurrencyAmount_${interaction.id}` && i.user.id === interaction.user.id
									const modalInteraction = await currencySelectMenuInteraction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
									if (modalInteraction && modalInteraction.type === InteractionType.ModalSubmit) {
										const modalArgs = {}
										modalInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
										await modalInteraction.deferUpdate()
										if (isNaN(+modalArgs.min)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO} **${modalArgs.min}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										}
										if (isNaN(+modalArgs.max)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO} **${modalArgs.max}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										}
										if (isNaN(+modalArgs.chance)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										}
										modalArgs.min = +modalArgs.min
										modalArgs.max = +modalArgs.max
										modalArgs.chance = +modalArgs.chance
										if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, components: [], flags: ["Ephemeral"] })
										}
										if (item.open_mode === "single" && item.contains.reduce((previousValue, element) => previousValue += element.chance, 0) + modalArgs.chance > 100) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Total chance of all items in container must not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										}
										if (modalArgs.min <= 0 || modalArgs.min > (temp.contains[0].currency === "ru" ? 3499 : temp.contains[0].currency === "ua" ? 1700 : temp.contains[0].currency === "kz" ? 20000 : temp.contains[0].currency === "en" ? 70 : 1300) || modalArgs.max <= 0 || modalArgs.max > (temp.contains[0].currency === "ru" ? 3499 : temp.contains[0].currency === "ua" ? 1700 : temp.contains[0].currency === "kz" ? 20000 : temp.contains[0].currency === "en" ? 70 : 1300)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Price must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > ${temp.contains[0].currency === "ru" ? 3499 : temp.contains[0].currency === "ua" ? 1700 : temp.contains[0].currency === "kz" ? 20000 : temp.contains[0].currency === "en" ? 70 : 1300} ${client.language({ textId: temp.contains[0].currency, guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										}
										if (modalArgs.min > modalArgs.max) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum price must not exceed maximum price", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										}
										if (modalArgs.max - modalArgs.min < (temp.contains[0].currency === "ru" ? 100 : temp.contains[0].currency === "ua" ? 45 : temp.contains[0].currency === "kz" ? 530 : temp.contains[0].currency === "en" ? 1 : 28)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Difference between minimum and maximum price must not be less than", guildId: interaction.guildId, locale: interaction.locale })} > ${temp.contains[0].currency === "ru" ? 100 : temp.contains[0].currency === "ua" ? 45 : temp.contains[0].currency === "kz" ? 530 : temp.contains[0].currency === "en" ? 1 : 28} ${client.language({ textId: temp.contains[0].currency, guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
										}
										if (item.contains.find(e => e.chance === modalArgs.chance && e.amountFrom === modalArgs.min && e.amountTo === modalArgs.max && e.currency === temp.contains[0].currency && e.type === type)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											interaction.editReply({ components: interaction.message.components })
											return modalInteraction.editReply({ content: `${client.config.emojis.NO}${client.language({ textId: "Same item with this chance already exists.", guildId: interaction.guildId, locale: interaction.locale })}`,components: [],  flags: ["Ephemeral"] })
										}
										temp.contains[0].amountFrom = modalArgs.min
										temp.contains[0].amountTo = modalArgs.max
										temp.contains[0].chance = modalArgs.chance
										item.contains.push(temp.contains[0])
										await item.save()
										modalInteraction.editReply({ content: client.config.emojis.YES, components: [] })
										client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									} else return client.temp = client.temp.filter(e => e.itemID !== item.itemID)
								} else
								if (currencySelectMenuInteraction.customId === "steamPriceCurrencyCancel") {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									currencySelectMenuInteraction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
									interaction.message.components.forEach(row => row.components.forEach(component => {
										component.data.disabled = false
									}))
									return interaction.editReply({ components: interaction.message.components })
								} else return client.temp = client.temp.filter(e => e.itemID !== item.itemID)
							} else return client.temp = client.temp.filter(e => e.itemID !== item.itemID) 
						} else if (type === RewardType.Item) {
							const modal = new ModalBuilder()
								.setCustomId(`manager-items_containerAmount_${interaction.id}`)
								.setTitle(`${client.language({ textId: "Adding to case", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setLabelComponents([
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("item")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Minimum quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("min")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("max")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Drop chance", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("chance")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
								])
							await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
							const filter = (i) => i.customId === `manager-items_containerAmount_${interaction.id}` && i.user.id === interaction.user.id
							interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						} else if (type === RewardType.Role) {
							if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
								client.temp = client.temp.filter(e => e.itemID !== item.itemID)
								return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "I don't have permission to manage roles", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
							}
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
												.setPlaceholder(`${client.language({ textId: "Select role", guildId: interaction.guildId, locale: interaction.locale })}...`)
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
							const roleSelectMenuInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
							if (roleSelectMenuInteraction && roleSelectMenuInteraction.customId.includes("addRole")) {
								if (roleSelectMenuInteraction.customId === "addRole") {
									const role = roleSelectMenuInteraction.roles.first()
									if (!interaction.guild.members.me.permissions.has("ManageRoles") || interaction.guild.members.me.roles.highest.position <= role.position) {
										client.temp = client.temp.filter(e => e.itemID !== item.itemID)
										roleSelectMenuInteraction.update({ content: `${client.config.emojis.NO}${client.language({ textId: "No permission to manage this role", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
										interaction.message.components.forEach(row => row.components.forEach(component => {
											component.data.disabled = false
										}))
										return interaction.editReply({ components: interaction.message.components })
									}
									temp.contains[0].id = role.id
									const modal = new ModalBuilder()
										.setCustomId(`manager-items_addRoleAmount_${interaction.id}`)
										.setTitle(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setLabelComponents([
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Minimum quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("min")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
												),
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("max")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
												),
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Drop chance", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("chance")
														.setRequired(true)
														.setStyle(TextInputStyle.Short)
												),
											new LabelBuilder()
												.setLabel(`${client.language({ textId: "Temporary (minutes)", guildId: interaction.guildId, locale: interaction.locale })}`)
												.setTextInputComponent(
													new TextInputBuilder()
														.setCustomId("minutes")
														.setRequired(false)
														.setStyle(TextInputStyle.Short)
												),
										])
									await roleSelectMenuInteraction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
									const filter = (i) => i.customId === `manager-items_addRoleAmount_${interaction.id}` && i.user.id === interaction.user.id
									const modalInteraction = await roleSelectMenuInteraction.awaitModalSubmit({ filter, time: 120000 }).catch(e => roleSelectMenuInteraction)
									if (modalInteraction && modalInteraction.type === InteractionType.ModalSubmit) {
										const modalArgs = {}
										modalInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
										if (isNaN(+modalArgs.min)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											await modalInteraction.update({ content: `${client.config.emojis.NO} **${modalArgs.min}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
										if (isNaN(+modalArgs.max)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											await modalInteraction.update({ content: `${client.config.emojis.NO} **${modalArgs.max}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
										if (isNaN(+modalArgs.chance)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											await modalInteraction.update({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
										if (modalArgs.minutes) {
											if (isNaN(+modalArgs.minutes) || !Number.isInteger(+modalArgs.minutes)) {
												client.temp = client.temp.filter(e => e.itemID !== item.itemID)
												await modalInteraction.update({ content: `${client.config.emojis.NO} **${modalArgs.minutes}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
												interaction.message.components.forEach(row => row.components.forEach(component => {
													component.data.disabled = false
												}))
												return interaction.editReply({ components: interaction.message.components })
											}
											modalArgs.minutes = +modalArgs.minutes
											if (modalArgs.minutes <= 0) {
												client.temp = client.temp.filter(e => e.itemID !== item.itemID)
												await modalInteraction.update({ content: `${client.config.emojis.NO} **${client.language({ textId: "Number cannot be", guildId: interaction.guildId, locale: interaction.locale })} <= 0**`, components: [], flags: ["Ephemeral"] })
												interaction.message.components.forEach(row => row.components.forEach(component => {
													component.data.disabled = false
												}))
												return interaction.editReply({ components: interaction.message.components })
											}	
										}
										modalArgs.min = +modalArgs.min
										modalArgs.max = +modalArgs.max
										modalArgs.chance = +modalArgs.chance
										if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											await modalInteraction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, flags: ["Ephemeral"] })
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
										if (modalArgs.min <= 0 || modalArgs.min > 1000000000 || modalArgs.max <= 0 || modalArgs.max > 1000000000) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											await modalInteraction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
										if (modalArgs.min > modalArgs.max) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											await modalInteraction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
										if (item.open_mode === "single" && item.contains.reduce((previousValue, element) => previousValue += element.chance, 0) + modalArgs.chance > 100) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											await modalInteraction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Total chance of all items in container must not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
										if (item.contains.find(e => e.chance === modalArgs.chance && e.amountFrom === modalArgs.min && e.amountTo === modalArgs.max && e.id === temp.contains[0].id && e.type === type)) {
											client.temp = client.temp.filter(e => e.itemID !== item.itemID)
											await modalInteraction.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Same item with this chance already exists.", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
										temp.contains[0].amountFrom = modalArgs.min
										temp.contains[0].amountTo = modalArgs.max
										temp.contains[0].chance = modalArgs.chance
										if (modalArgs.minutes) temp.contains[0].ms = modalArgs.minutes * 60 * 1000
										item.contains.push(temp.contains[0])
										await item.save()
										client.temp = client.temp.filter(e => e.itemID !== item.itemID)
										await modalInteraction.update({ content: client.config.emojis.YES, embeds: [], components: [] })
									}
								} else {
									roleSelectMenuInteraction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
									interaction.message.components.forEach(row => row.components.forEach(component => {
										component.data.disabled = false
									}))
									return interaction.editReply({ components: interaction.message.components })
								}
							}
						} else {
							const modal = new ModalBuilder()
								.setCustomId(`manager-items_containerAmount_${interaction.id}`)
								.setTitle(`${client.language({ textId: "Item drop quantity and chance", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setLabelComponents([
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Minimum quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("min")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("max")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Drop chance", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("chance")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
										),
								])
							await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
							const filter = (i) => i.customId === `manager-items_containerAmount_${interaction.id}` && i.user.id === interaction.user.id
							interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						}
						if (type !== RewardType.SteamGame && type !== RewardType.Role) {
							if (interaction && interaction.type === InteractionType.ModalSubmit) {
								const modalArgs = {}
								interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
								await interaction.deferUpdate()
								if (type === RewardType.Item) {
									const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()))
									if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
										let result = ""
										filteredItems.forEach(item => {
											result += `> ${item.displayEmoji}**${item.name}**\n`	
										})
										client.temp = client.temp.filter(e => e.itemID !== item.itemID)
										return interaction.followUp({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), flags: ["Ephemeral"] })  
									}
									const searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
									if (!searchedItem) {
										client.temp = client.temp.filter(e => e.itemID !== item.itemID)
										return interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
									}
									temp.contains[0].id = searchedItem.itemID
								}
								if (isNaN(+modalArgs.min)) {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.min}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								}
								if (isNaN(+modalArgs.max)) {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.max}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								}
								if (isNaN(+modalArgs.chance)) {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								}
								modalArgs.min = +modalArgs.min
								modalArgs.max = +modalArgs.max
								modalArgs.chance = +modalArgs.chance
								if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, flags: ["Ephemeral"] })
								}
								if (modalArgs.min <= 0 || modalArgs.min > 1000000000 || modalArgs.max <= 0 || modalArgs.max > 1000000000) {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
								}
								if (modalArgs.min > modalArgs.max) {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								}
								if (item.open_mode === "single" && item.contains.reduce((previousValue, element) => previousValue += element.chance, 0) + modalArgs.chance > 100) {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Total chance of all items in container must not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
								}
								if (item.contains.find(e => e.chance === modalArgs.chance && e.amountFrom === modalArgs.min && e.amountTo === modalArgs.max && e.id === temp.contains[0].id && e.type === type)) {
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Same item with this chance already exists.", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
								}
								temp.contains[0].amountFrom = modalArgs.min
								temp.contains[0].amountTo = modalArgs.max
								temp.contains[0].chance = modalArgs.chance
								item.contains.push(temp.contains[0])
								await item.save()
								client.temp = client.temp.filter(e => e.itemID !== item.itemID)
							} else return client.temp = client.temp.filter(e => e.itemID !== item.itemID)  
						}
					} else {
						await interaction.deferUpdate()
						interaction.followUp({ content: `${client.language({ textId: "Error: unknown case", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
				}
				if (interaction.customId.includes("mode")) {
					if (item.open_mode === "single") item.open_mode = "multiple"
					else {
						if (item.contains.reduce((previousValue, element) => previousValue += element.chance, 0) > 100) {
							return interaction.reply({ content: `${client.language({ textId: "To disable multi-item mode, total chance of all items must be less than or equal to 100%", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						item.open_mode = "single"
					}
					await item.save()
				}
				const embed = await generateItemEmbed(client, interaction, item)
				const addItemBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add item", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setEmoji(client.config.emojis.box)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}contamitem`)
				const addCurBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} ${settings.currencyName}`)
					.setEmoji(settings.displayCurrencyEmoji)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}contamcurrency`)
				const addXPBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} XP`)
					.setEmoji(client.config.emojis.XP)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}contamxp`)
				const addGameBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add Steam game", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setEmoji(client.config.emojis.Steam)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}contamrandomSteamGame`)
				const addRoleBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add role", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setEmoji(client.config.emojis.roles)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}contamrole`)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} crafting usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} openByItems usr{${interaction.user.id}}`)
				const switchModeBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Mode", guildId: interaction.guildId, locale: interaction.locale })}: ${item.open_mode === "single" ? `${client.language({ textId: "Single item", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Multiple items", guildId: interaction.guildId, locale: interaction.locale })}`}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}contmode`)
				if (item.contains.length >= 10) {
					addItemBTN.setDisabled(true)
					addCurBTN.setDisabled(true)
					addXPBTN.setDisabled(true)
					addGameBTN.setDisabled(true)
				} else {
					addItemBTN.setDisabled(false)
					addCurBTN.setDisabled(false)
					addXPBTN.setDisabled(false)
					addGameBTN.setDisabled(false)
				}
				const buttonsArray1 = []
				const buttonsArray2 = []
				item.contains.sort((a, b) => b.chance - a.chance)
				await item.save()
				item.contains.forEach((i, index) => {
					index > 4 ? buttonsArray2.push(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Danger)
							.setEmoji(client.config.emojis.NO)
							.setLabel(`#${index+1}`)
							.setCustomId(`it{${item.itemID}}cmd{manager-items} cont_del_index{${index}} usr{${interaction.user.id}}`)) 
						: buttonsArray1.push(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Danger)
							.setEmoji(client.config.emojis.NO)
							.setLabel(`#${index+1}`)
							.setCustomId(`it{${item.itemID}}cmd{manager-items} cont_del_index{${index}}usr{${interaction.user.id}}`)
						)
				})
				const components = []
				const row1 = new ActionRowBuilder().addComponents(buttonsArray1)
				const row2 = new ActionRowBuilder().addComponents(buttonsArray2)
				const row3 = new ActionRowBuilder().addComponents([addItemBTN, addCurBTN, addXPBTN, addGameBTN, addRoleBTN])
				const row4 = new ActionRowBuilder().addComponents([backBTN, switchModeBTN, nextBTN])
				item.contains.length > 5 ? components.push(navigationRow, row1, row2, row3, row4) : item.contains.length > 0 ? components.push(navigationRow, row1, row3, row4) : components.push(navigationRow, row3, row4)
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: content.join("\n"), embeds: [embed], components: components })
				else return interaction.update({ content: content.join("\n"), embeds: [embed], components: components })
			}
			//КЕЙС (КЛЮЧ)
			if ((interaction.customId.includes(`openByItem`)) || interaction.values?.[0] == `openByItem`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🔑${client.language({ textId: "Case (key)", guildId: interaction.guildId, locale: interaction.locale })}${item.openByItem?.itemID ? ` [+]` : `` }`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				if (interaction.customId.includes(`del`)) {
					item.openByItem.itemID = undefined
					item.openByItem.amount = undefined
					await item.save()
				}
				if (interaction.customId.includes(`amount`)) {
					if (item.contains.length === 0) return interaction.reply({ content: `${client.language({ textId: "Error: this item is not a case", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					if (!client.temp.find(e => e.itemID == item.itemID)) {
						client.temp.push({
							itemID: item.itemID,
							openByItem: {
								itemID: undefined,
								amount: undefined
							},
							contains: [],
							crafts: []
						})    
					}
					const temp = client.temp.find((e) => { return e.itemID == item.itemID })
					if (temp) {
						const name = interaction.customId.slice(interaction.customId.indexOf("amount")+6)
						if (name === "item") {
							const modal = new ModalBuilder()
								.setCustomId(`manager-items_openByItem_${interaction.id}`)
								.setTitle(`${client.language({ textId: "Required quantity to open case", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setLabelComponents([
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("item")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
												.setValue(`${client.cache.items.get(item.openByItem?.itemID)?.name || ""}`)
										),
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("amount")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
												.setValue(`${item.openByItem?.amount || ""}`)
										),
								])
							await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
							const filter = (i) => i.customId === `manager-items_openByItem_${interaction.id}` && i.user.id === interaction.user.id
							interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						} else {
							temp.openByItem.itemID = name
							const modal = new ModalBuilder()
								.setCustomId(`manager-items_openByItem_${interaction.id}`)
								.setTitle(`${client.language({ textId: "Required quantity to open case", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setLabelComponents([
									new LabelBuilder()
										.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
										.setTextInputComponent(
											new TextInputBuilder()
												.setCustomId("amount")
												.setRequired(true)
												.setStyle(TextInputStyle.Short)
												.setValue(`${item.openByItem?.amount || ""}`)
										),
								])
							await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
							const filter = (i) => i.customId === `manager-items_openByItem_${interaction.id}` && i.user.id === interaction.user.id
							interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)	
						}
						if (interaction && interaction.type === InteractionType.ModalSubmit) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
							await interaction.deferUpdate()
							if (name === "item") {
								const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()))
								if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
									let result = ""
									filteredItems.forEach(item => {
										result += `> ${item.displayEmoji}**${item.name}**\n`	
									})
									client.temp = client.temp.filter(e => e.itemID !== item.itemID)
									return interaction.followUp({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), flags: ["Ephemeral"] })  
								}
								const searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
								if (!searchedItem) return interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] }) 
								temp.openByItem.itemID = searchedItem.itemID
							}
							if (isNaN(+modalArgs.amount)) {
								client.temp = client.temp.filter(e => e.itemID !== item.itemID)
								return interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 1000000000) {
								client.temp = client.temp.filter(e => e.itemID !== item.itemID)
								return interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
							}
							temp.openByItem.amount = modalArgs.amount
							item.openByItem = temp.openByItem
							await item.save()
							client.temp = client.temp.filter(e => e.itemID !== item.itemID)
						}
					} else {
						await interaction.deferUpdate()
						interaction.followUp({ content: `${client.language({ textId: "Error: unknown item", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
				}
				const embed = await generateItemEmbed(client, interaction, item)
				const addItemBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add item", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setEmoji(client.config.emojis.box)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}openByItem_amountitem`)
				const addCurBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} ${settings.currencyName}`)
					.setEmoji(settings.displayCurrencyEmoji)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}openByItem_amountcurrency`)
				const addXPBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} XP`)
					.setEmoji(client.config.emojis.XP)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}openByItem_amountxp`)
				const addRPBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(`${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} RP`)
					.setEmoji(client.config.emojis.RP)
					.setCustomId(`it{${item.itemID}}cmd{manager-items}usr{${interaction.user.id}}openByItem_amountrp`)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} cont usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} onUse usr{${interaction.user.id}}`)
				const delBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Danger)
					.setEmoji(client.config.emojis.NO)
					.setDisabled(true)
					.setLabel(`${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} openByItem_del usr{${interaction.user.id}}`)
				const firstRow = new ActionRowBuilder().addComponents([addItemBTN, addCurBTN, addXPBTN, addRPBTN])
				const secondRow = new ActionRowBuilder().addComponents(backBTN, nextBTN, delBTN)
				if (item.openByItem?.itemID) delBTN.setDisabled(false)
				if (item.contains.length === 0) delBTN.setDisabled(true)
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `**${client.language({ textId: "CASE", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "If you want your item to be opened with a special item, you can select it or just skip this step", guildId: interaction.guildId, locale: interaction.locale })}.`, embeds: [embed], components: [navigationRow, firstRow, secondRow] })
				else return interaction.update({ content: `**${client.language({ textId: "CASE", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "If you want your item to be opened with a special item, you can select it or just skip this step", guildId: interaction.guildId, locale: interaction.locale })}.`, embeds: [embed], components: [navigationRow, firstRow, secondRow] })
			}
			//ИСПОЛЬЗОВАНИЕ
			if ((interaction.customId.includes(`onUse`)) || interaction.values?.[0] == `onUse`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🪄${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}${item.canUse ? ` [+]` : `` }`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				if (interaction.values?.[0].includes(`roleAdd`)) {
					if (item.onUse.roleAdd) {
						item.onUse.roleAdd = undefined
						item.onUse.roleTimely = undefined
					}
					else {
						interaction.message.components.forEach(row => row.components.forEach(component => {
							component.data.disabled = true
						}))
						await interaction.update({ components: interaction.message.components })
						await interaction.followUp({ 
							content: `${client.language({ textId: "Select role to add to member when using item", guildId: interaction.guildId, locale: interaction.locale })}`,
							components: [
								new ActionRowBuilder()
									.addComponents(
										new RoleSelectMenuBuilder()
											.setCustomId(`useRoleAddSelect`)
											.setPlaceholder(`${client.language({ textId: "Select role", guildId: interaction.guildId, locale: interaction.locale })}...`)
									),
								new ActionRowBuilder()
									.addComponents(
										new ButtonBuilder()
											.setCustomId("useRoleAddCancel")
											.setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
											.setStyle(ButtonStyle.Danger)
									)
							],
							flags: ["Ephemeral"]
						})    
						const filter = (i) => i.customId.includes(`useRoleAdd`) && i.user.id === interaction.user.id
						const roleSelectMenuInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
						if (roleSelectMenuInteraction && roleSelectMenuInteraction.customId.includes("useRoleAdd")) {
							if (roleSelectMenuInteraction.customId === "useRoleAddSelect") {
								const selectedRole = roleSelectMenuInteraction.roles.first()
								let direct = undefined
								await roleSelectMenuInteraction.update({ 
									content: `${client.language({ textId: "Role will be added directly to Discord profile, not to </inventory-roles:1198617221170204833>?", guildId: interaction.guildId, locale: interaction.locale })}`,
									components: [
										new ActionRowBuilder()
											.addComponents(
												new ButtonBuilder()
													.setCustomId(`useRoleAddDirectYes`)
													.setLabel(`${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`)
													.setStyle(ButtonStyle.Success),
												new ButtonBuilder()
													.setCustomId("useRoleAddDirectNo")
													.setLabel(client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale }))
													.setStyle(ButtonStyle.Danger)
											)
									],
									flags: ["Ephemeral"]
								})
								let filter = (i) => i.customId.includes(`useRoleAddDirect`) && i.user.id === interaction.user.id
								let directInteraction = await roleSelectMenuInteraction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
								if (directInteraction && directInteraction.customId.includes("useRoleAddDirect")) {
									if (directInteraction.customId === "useRoleAddDirectYes") {
										direct = true
									}
								} else {
									interaction.message.components.forEach(row => row.components.forEach(component => {
										component.data.disabled = false
									}))
									return interaction.editReply({ components: interaction.message.components })
								}
								await directInteraction.update({ 
									content: `${client.language({ textId: "If this is a temporary role, write in minutes when it will be removed", guildId: interaction.guildId, locale: interaction.locale })}.`,
									components: [
										new ActionRowBuilder()
											.addComponents(
												new ButtonBuilder()
													.setCustomId(`useRoleAddTimeEnter`)
													.setLabel(`${client.language({ textId: "Enter number", guildId: interaction.guildId, locale: interaction.locale })}`)
													.setStyle(ButtonStyle.Secondary),
												new ButtonBuilder()
													.setCustomId("useRoleAddTimeSkip")
													.setLabel(client.language({ textId: "SKIP", guildId: interaction.guildId, locale: interaction.locale }))
													.setStyle(ButtonStyle.Secondary)
											)
									],
									flags: ["Ephemeral"]
								})
								filter = (i) => i.customId.includes(`useRoleAddTime`) && i.user.id === interaction.user.id
								let timeInteraction = await directInteraction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
								if (timeInteraction && timeInteraction.customId.includes("useRoleAddTime")) {
									if (timeInteraction.customId === "useRoleAddTimeEnter") {
										const modal = new ModalBuilder()
											.setCustomId(`manager-items_roleTime_${timeInteraction.message.id}`)
											.setTitle(`${client.language({ textId: "Time after which role is removed (minutes)", guildId: interaction.guildId, locale: interaction.locale })}`)
											.setLabelComponents([
												new LabelBuilder()
													.setLabel(`${client.language({ textId: "Minutes", guildId: interaction.guildId, locale: interaction.locale })}`)
													.setTextInputComponent(
														new TextInputBuilder()
															.setCustomId("mins")
															.setRequired(true)
															.setStyle(TextInputStyle.Short)
													),
											])
										await timeInteraction.showModal(modal);delete client.globalCooldown[`${timeInteraction.guildId}_${timeInteraction.user.id}`]
										const filter = (i) => i.customId === `manager-items_roleTime_${timeInteraction.message.id}` && i.user.id === timeInteraction.user.id
										timeInteraction = await timeInteraction.awaitModalSubmit({ filter, time: 120000 }).catch(e => null)
										if (timeInteraction && timeInteraction.type === InteractionType.ModalSubmit) {
											const modalArgs = {}
											timeInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
											if (isNaN(+modalArgs.mins)) {
												interaction.message.components.forEach(row => row.components.forEach(component => {
													component.data.disabled = false
												}))
												interaction.editReply({ components: interaction.message.components })
												return timeInteraction.update({ content: `${client.config.emojis.NO} **${modalArgs.mins}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
											}
											if (+modalArgs.mins <= 0 || +modalArgs.mins > 525600 ) {
												interaction.message.components.forEach(row => row.components.forEach(component => {
													component.data.disabled = false
												}))
												interaction.editReply({ components: interaction.message.components })
												return timeInteraction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Time in minutes must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 525600`, flags: ["Ephemeral"] })
											}
											item.onUse.roleAdd = selectedRole.id
											item.onUse.roleTimely = +modalArgs.mins
											item.onUse.role_add_direct = direct
											timeInteraction.update({ content: `${client.config.emojis.YES}`, components: [] })
										} else {
											interaction.message.components.forEach(row => row.components.forEach(component => {
												component.data.disabled = false
											}))
											return interaction.editReply({ components: interaction.message.components })
										}
									} else {
										item.onUse.roleAdd = selectedRole.id
										item.onUse.role_add_direct = direct
										timeInteraction.update({ content: `${client.config.emojis.YES}`, components: [] })
									}
								} else {
									interaction.message.components.forEach(row => row.components.forEach(component => {
										component.data.disabled = false
									}))
									return interaction.editReply({ components: interaction.message.components })
								}
							}
							if (roleSelectMenuInteraction.customId === "useRoleAddCancel") {
								roleSelectMenuInteraction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
								interaction.message.components.forEach(row => row.components.forEach(component => {
									component.data.disabled = false
								}))
								return interaction.editReply({ components: interaction.message.components })
							}
						} else {
							interaction.message.components.forEach(row => row.components.forEach(component => {
								component.data.disabled = false
							}))
							return interaction.editReply({ components: interaction.message.components })
						}
					}
				} else
				if (interaction.values?.[0].includes(`roleDel`)) {
					if (item.onUse.roleDel) {
						item.onUse.roleDel = undefined
					}
					else {
						interaction.message.components.forEach(row => row.components.forEach(component => {
							component.data.disabled = true
						}))
						await interaction.update({ components: interaction.message.components })
						await interaction.followUp({ 
							content: `${client.language({ textId: "Select role to remove from member when using item", guildId: interaction.guildId, locale: interaction.locale })}`,
							components: [
								new ActionRowBuilder()
									.addComponents(
										new RoleSelectMenuBuilder()
											.setCustomId(`useRoleDelSelect`)
											.setPlaceholder(`${client.language({ textId: "Select role", guildId: interaction.guildId, locale: interaction.locale })}...`)
									),
								new ActionRowBuilder()
									.addComponents(
										new ButtonBuilder()
											.setCustomId("useRoleDelCancel")
											.setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
											.setStyle(ButtonStyle.Danger)
									)
							],
							flags: ["Ephemeral"]
						})    
						const filter = (i) => i.customId.includes(`useRoleDel`) && i.user.id === interaction.user.id
						const roleSelectMenuInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
						if (roleSelectMenuInteraction && roleSelectMenuInteraction.customId.includes("useRoleDel")) {
							if (roleSelectMenuInteraction.customId === "useRoleDelSelect") {
								item.onUse.roleDel = roleSelectMenuInteraction.roles.first().id
								roleSelectMenuInteraction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Role selected", guildId: interaction.guildId, locale: interaction.locale })} <@&${roleSelectMenuInteraction.roles.first().id}>`, components: [] })
							} else
							if (roleSelectMenuInteraction.customId === "useRoleDelCancel") {
								roleSelectMenuInteraction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
								interaction.message.components.forEach(row => row.components.forEach(component => {
									component.data.disabled = false
								}))
								return interaction.editReply({ components: interaction.message.components })
							}
						} else return
					}
				} else
				if (interaction.values?.[0].includes(`trophyAdd`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_trophyAdd_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Trophy grant when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Trophy name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("trophy")
										.setRequired(false)
										.setMaxLength(30)
										.setValue(`${item.onUse.trophyAdd || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_trophyAdd_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (modalArgs.trophy.length > 30) {
							interaction.followUp({ content: `${client.language({ textId: "Trophy name length cannot exceed 30 characters", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						if (!modalArgs.trophy.length) item.onUse.trophyAdd = undefined
						else item.onUse.trophyAdd = modalArgs.trophy
					} else return
				} else
				if (interaction.values?.[0].includes(`trophyDel`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_trophyDel_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Trophy deletion when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Trophy name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("trophy")
										.setRequired(false)
										.setMaxLength(30)
										.setValue(`${item.onUse.trophyDel || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_trophyDel_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (modalArgs.trophy.length > 30) {
							interaction.followUp({ content: `${client.language({ textId: "Trophy name length cannot exceed 30 characters", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						if (!modalArgs.trophy.length) item.onUse.trophyDel = undefined
						else item.onUse.trophyDel = modalArgs.trophy
					} else return
				} else
				if (interaction.values?.[0].includes(`addmessage`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_addmessage_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Send message when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Message", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("message")
										.setRequired(false)
										.setValue(`${item.onUse.message?.slice(0, 4000) || ""}`)
										.setStyle(TextInputStyle.Paragraph)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_addmessage_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.message.length) item.onUse.message = undefined
						else item.onUse.message = modalArgs.message
					} else return
				} else
				if (interaction.values?.[0].includes(`messageDM`)) {
					item.onUse.messageOnDM ? item.onUse.messageOnDM = false : item.onUse.messageOnDM = true
				} else
				if (interaction.values?.[0].includes(`delItem`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_delItem_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item deletion when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.deleteItemFromServer ? client.cache.items.get(item.onUse.deleteItemFromServer)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_delItem_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.name.length) {
							item.onUse.deleteItemFromServer = undefined
						}
						else {
							const filteredItems = client.cache.items.filter(e => !e.temp && e.name.toLowerCase().includes(modalArgs.name.toLowerCase()) && e.guildID === interaction.guildId)
							if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								for (const item of filteredItems) {
									result += `> ${item.displayEmoji}**${item.name}**\n`
								}
								interaction.followUp({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const _item = filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredItems.first()
								if (!_item) {
									interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such item does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
								} else {
									item.onUse.deleteItemFromServer = _item.itemID
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`addCUR`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_addCUR_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Currency boost, when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Duration (minutes)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("mins")
										.setRequired(false)
										.setValue(`${item.onUse.multiplier?.CUR?.time || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Multiplier (%)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("multiplier")
										.setRequired(false)
										.setValue(`${item.onUse.multiplier?.CUR?.x * 100 || ""}`)
										.setPlaceholder(client.language({ textId: "E.g.: 100", guildId: interaction.guildId, locale: interaction.locale }))
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_addCUR_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.mins || !modalArgs.multiplier) {
							if (item.onUse.multiplier?.CUR) item.onUse.multiplier.CUR = undefined
						} else {
							if (isNaN(+modalArgs.mins)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.mins}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							if (isNaN(+modalArgs.multiplier)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.multiplier}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.mins = +modalArgs.mins
							modalArgs.multiplier = +modalArgs.multiplier
							if (modalArgs.mins <= 0) modalArgs.mins = 1
							if (modalArgs.multiplier < 0) modalArgs.multiplier = 0
							if (modalArgs.multiplier > 1000) modalArgs.multiplier = 1000
							if (!item.onUse.multiplier) item.onUse.multiplier = { CUR: {} }
							else if (!item.onUse.multiplier.CUR) item.onUse.multiplier.CUR = {}
							item.onUse.multiplier.CUR.x = modalArgs.multiplier / 100
							item.onUse.multiplier.CUR.time = modalArgs.mins
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`addXP`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_addXP_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Experience boost, when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Duration (minutes)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("mins")
										.setRequired(false)
										.setValue(`${item.onUse.multiplier?.XP?.time || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Multiplier (%)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("multiplier")
										.setRequired(false)
										.setValue(`${item.onUse.multiplier?.XP?.x * 100 || ""}`)
										.setPlaceholder(client.language({ textId: "E.g.: 100", guildId: interaction.guildId, locale: interaction.locale }))
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_addXP_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.mins || !modalArgs.multiplier) {
							if (item.onUse.multiplier?.XP) item.onUse.multiplier.XP = undefined
						} else {
							if (isNaN(+modalArgs.mins)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.mins}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							if (isNaN(+modalArgs.multiplier)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.multiplier}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.mins = +modalArgs.mins
							modalArgs.multiplier = +modalArgs.multiplier
							if (modalArgs.mins <= 0) modalArgs.mins = 1
							if (modalArgs.multiplier < 0) modalArgs.multiplier = 0
							if (modalArgs.multiplier > 1000) modalArgs.multiplier = 1000
							if (!item.onUse.multiplier) item.onUse.multiplier = { XP: {} }
							else if (!item.onUse.multiplier.XP) item.onUse.multiplier.XP = {}
							item.onUse.multiplier.XP.x = modalArgs.multiplier / 100
							item.onUse.multiplier.XP.time = modalArgs.mins
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`addLuck`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_addLuck_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Luck boost, when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Duration (minutes)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("mins")
										.setRequired(false)
										.setValue(`${item.onUse.multiplier?.Luck?.time || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Multiplier (%)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("multiplier")
										.setRequired(false)
										.setValue(`${item.onUse.multiplier?.Luck?.x * 100 || ""}`)
										.setPlaceholder(client.language({ textId: "E.g.: 100", guildId: interaction.guildId, locale: interaction.locale }))
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_addLuck_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.mins || !modalArgs.multiplier) {
							if (item.onUse.multiplier?.Luck) item.onUse.multiplier.Luck = undefined
						} else {
							if (isNaN(+modalArgs.mins)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.mins}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							if (isNaN(+modalArgs.multiplier)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.multiplier}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.mins = +modalArgs.mins
							modalArgs.multiplier = +modalArgs.multiplier
							if (modalArgs.mins <= 0) modalArgs.mins = 1
							if (modalArgs.multiplier > 1000) modalArgs.multiplier = 1000
							if (!item.onUse.multiplier) item.onUse.multiplier = { Luck: {} }
							else if (!item.onUse.multiplier.Luck) item.onUse.multiplier.Luck = {}
							item.onUse.multiplier.Luck.x = modalArgs.multiplier / 100
							item.onUse.multiplier.Luck.time = modalArgs.mins
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`addRP`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_addRP_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Reputation boost, when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Duration (minutes)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("mins")
										.setRequired(false)
										.setValue(`${item.onUse.multiplier?.RP?.time || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Multiplier (%)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("multiplier")
										.setRequired(false)
										.setValue(`${item.onUse.multiplier?.RP?.x * 100 || ""}`)
										.setPlaceholder(client.language({ textId: "E.g.: 100", guildId: interaction.guildId, locale: interaction.locale }))
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_addRP_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.mins || !modalArgs.multiplier) {
							if (item.onUse.multiplier?.RP) item.onUse.multiplier.RP = undefined
						} else {
							if (isNaN(+modalArgs.mins)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.mins}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							if (isNaN(+modalArgs.multiplier)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.multiplier}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.mins = +modalArgs.mins
							modalArgs.multiplier = +modalArgs.multiplier
							if (modalArgs.mins <= 0) modalArgs.mins = 1
							if (modalArgs.multiplier < 0) modalArgs.multiplier = 0
							if (modalArgs.multiplier > 1000) modalArgs.multiplier = 1000
							if (!item.onUse.multiplier) item.onUse.multiplier = { RP: {} }
							else if (!item.onUse.multiplier.RP) item.onUse.multiplier.RP = {}
							item.onUse.multiplier.RP.x = modalArgs.multiplier / 100
							item.onUse.multiplier.RP.time = modalArgs.mins
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`delCUR`)) {
					item.onUse.delCUR = !item.onUse.delCUR
				} else
				if (interaction.values?.[0].includes(`delXP`)) {
					item.onUse.delXP = !item.onUse.delXP
				} else
				if (interaction.values?.[0].includes(`delLuck`)) {
					item.onUse.delLuck = !item.onUse.delLuck
				} else
				if (interaction.values?.[0].includes(`delRP`)) {
					item.onUse.delRP = !item.onUse.delRP
				} else
				if (interaction.values?.[0].includes(`addQuest`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_addQuest_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Adding quest when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quest name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.addQuest ? client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === item.onUse.addQuest && quest.isEnabled)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_addQuest_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.name.length) {
							item.onUse.addQuest = undefined
						}
						else {
							const quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled)
							const filteredQuests = quests.filter(e => e.name.toLowerCase().includes(modalArgs.name.toLowerCase()))
							if (filteredQuests.size > 1 && !filteredQuests.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								filteredQuests.forEach(quest => {
									result += `> ${quest.displayEmoji}**${quest.name}**\n`
								})
								interaction.followUp({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple quests found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const quest = filteredQuests.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredQuests.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredQuests.first()
								if (!quest) {
									interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such quest does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
								} else {
									item.onUse.addQuest = quest.questID
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`delQuest`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_delQuest_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Quest deletion when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quest name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.delQuest ? client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === item.onUse.delQuest && quest.isEnabled)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_delQuest_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.name.length) {
							item.onUse.delQuest = undefined
						}
						else {
							const quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled)
							const filteredQuests = quests.filter(e => e.name.toLowerCase().includes(modalArgs.name.toLowerCase()))
							if (filteredQuests.size > 1 && !filteredQuests.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								filteredQuests.forEach(quest => {
									result += `> ${quest.displayEmoji}**${quest.name}**\n`
								})
								interaction.followUp({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple quests found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const quest = filteredQuests.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredQuests.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredQuests.first()
								if (!quest) {
									interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such quest does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
								} else {
									item.onUse.delQuest = quest.questID
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`wipeQuest`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_wipeQuest_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Clear quest progress", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quest name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.wipeQuest ? client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === item.onUse.wipeQuest && quest.isEnabled)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_wipeQuest_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.name.length) {
							item.onUse.wipeQuest = undefined
						}
						else {
							const quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled)
							const filteredQuests = quests.filter(e => e.name.toLowerCase().includes(modalArgs.name.toLowerCase()))
							if (filteredQuests.size > 1 && !filteredQuests.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								filteredQuests.forEach(quest => {
									result += `> ${quest.displayEmoji}**${quest.name}**\n`
								})
								interaction.followUp({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple quests found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const quest = filteredQuests.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredQuests.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredQuests.first()
								if (!quest) {
									interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such quest does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
								} else {
									item.onUse.wipeQuest = quest.questID
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`levelAdd`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_levelAdd_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Add levels when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (levels)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.levelAdd || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_levelAdd_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.amount.length) {
							item.onUse.levelAdd = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 1000 ) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
							}
							item.onUse.levelAdd = modalArgs.amount
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`rpAdd`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_rpAdd_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Add reputation when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (reputation)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.rpAdd || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_rpAdd_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.amount.length) {
							item.onUse.rpAdd = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount < -1000 || modalArgs.amount > 1000 ) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < -1000 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
							}
							item.onUse.rpAdd = modalArgs.amount
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`xpAdd`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_xpAdd_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Add experience when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (experience)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.xpAdd || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_xpAdd_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.amount.length) {
							item.onUse.xpAdd = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 1000000000) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
							}
							item.onUse.xpAdd = modalArgs.amount
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`currencyAdd`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_currencyAdd_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Add currency when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (currency)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.currencyAdd || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_currencyAdd_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.amount.length) {
							item.onUse.currencyAdd = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 1000000000) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
							}
							item.onUse.currencyAdd = modalArgs.amount
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`itemAdd`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_itemAdd_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item grant when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.itemAdd ? client.cache.items.get(item.onUse.itemAdd.itemID)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (items)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.itemAdd?.amount || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_itemAdd_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.name.length || !modalArgs.amount) {
							item.onUse.itemAdd = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 1000000000) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
							}
							const filteredItems = client.cache.items.filter(e => !e.temp && e.name.toLowerCase().includes(modalArgs.name.toLowerCase()) && e.guildID === interaction.guildId)
							if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								for (const item of filteredItems) {
									result += `> ${item.displayEmoji}**${item.name}**\n`
								}
								return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const _item = filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredItems.first()
								if (!_item) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such item does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
								} else {
									if (!item.onUse.itemAdd) item.onUse.itemAdd = {}
									item.onUse.itemAdd.itemID = _item.itemID
									item.onUse.itemAdd.amount = modalArgs.amount
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`addAchievement`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_addAchievement_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Achievement grant when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Achievement name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.addAchievement ? client.cache.achievements.get(item.onUse.addAchievement)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_addAchievement_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.name.length) {
							item.onUse.addAchievement = undefined
						}
						else {
							const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled)
							const filteredAchievements = achievements.filter(e => e.name.toLowerCase().includes(modalArgs.name.toLowerCase()))
							if (filteredAchievements.size > 1 && !filteredAchievements.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								filteredAchievements.forEach(achievement => {
									result += `> ${achievement.displayEmoji}**${achievement.name}**\n`	
								})
								return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple achievements found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const achievement = filteredAchievements.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredAchievements.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredAchievements.first()
								if (!achievement) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such achievement does not exist", guildId: interaction.guildId, locale: interaction.locale })}: **${modalArgs.name}**`, flags: ["Ephemeral"] })
								} else {
									item.onUse.addAchievement = achievement.id
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`spawnWormhole`)) {
					if (item.onUse.spawnWormhole) item.onUse.spawnWormhole = undefined
					else {
						const modal = new ModalBuilder()
                        .setCustomId(`manager-items_spawnWormhole_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Wormhole spawn", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Wormhole name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									 new TextInputBuilder()
                                        .setCustomId("wormhole")
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
								),
						])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_spawnWormhole_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
						if (interaction && interaction.isModalSubmit()) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
							const wormhole = client.cache.wormholes.find(e => e.name.toLowerCase() === modalArgs.wormhole.toLowerCase() && e.chance && e.itemID && e.amountFrom && e.amountTo && e.deleteTimeOut !== undefined && e.webhookId)
							if (!wormhole) {
								return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Wormhole with that name does not exist", guildId: interaction.guildId, locale: interaction.locale })} (${modalArgs.wormhole})**`, flags: ["Ephemeral"] })
							}
							item.onUse.spawnWormhole = wormhole.wormholeID
						}
					}
				} else
				if (interaction.values?.[0].includes(`itemResearch`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_itemResearch_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item learning when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.itemResearch ? client.cache.items.get(item.onUse.itemResearch)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_itemResearch_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.name.length){
							item.onUse.itemResearch = undefined
						}
						else {
							modalArgs.amount = +modalArgs.amount
							const filteredItems = client.cache.items.filter(e => !e.temp && e.name.toLowerCase().includes(modalArgs.name.toLowerCase()) && e.guildID === interaction.guildId)
							if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								for (const item of filteredItems) {
									result += `> ${item.displayEmoji}**${item.name}**\n`
								}
								return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const _item = filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredItems.first()
								if (!_item) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such item does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
								} else {
									item.onUse.itemResearch = _item.itemID
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`craftResearch`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_craftResearch_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item craft learning when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.craftResearch ? client.cache.items.get(item.onUse.craftResearch)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_craftResearch_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.name.length) {
							item.onUse.craftResearch = undefined
						}
						else {
							modalArgs.amount = +modalArgs.amount
							const filteredItems = client.cache.items.filter(e => !e.temp && e.name.toLowerCase().includes(modalArgs.name.toLowerCase()) && e.guildID === interaction.guildId)
							if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								for (const item of filteredItems) {
									result += `> ${item.displayEmoji}**${item.name}**\n`
								}
								return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const _item = filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredItems.first()
								if (!_item) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such item does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
								} else {
									item.onUse.craftResearch = _item.itemID
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`takeXP`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_takeXP_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Experience subtraction when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (experience)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.takeXP || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_takeXP_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.amount.length) {
							item.onUse.takeXP = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 1000000000) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
							}
							item.onUse.takeXP = modalArgs.amount
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`takeCUR`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_takeCUR_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Currency subtraction when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (currency)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.takeCUR || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_takeCUR_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.amount.length) {
							item.onUse.takeCUR = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 1000000000) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
							}
							item.onUse.takeCUR = modalArgs.amount
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`takeRP`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_takeRP_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Reputation subtraction when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (reputation)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.takeRP || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_takeRP_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.amount.length) {
							item.onUse.takeRP = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount < -1000 || modalArgs.amount > 1000 ) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < -1000 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
							}
							item.onUse.takeRP = modalArgs.amount
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`takeItem`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_takeItem_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item subtraction", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("name")
										.setRequired(false)
										.setValue(`${item.onUse.takeItem ? client.cache.items.get(item.onUse.takeItem.itemID)?.name || "" : ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (items)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.takeItem?.amount || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_takeItem_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.name.length || !modalArgs.amount) {
							item.onUse.takeItem = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 1000000000) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
							}
							const filteredItems = client.cache.items.filter(e => !e.temp && e.name.toLowerCase().includes(modalArgs.name.toLowerCase()) && e.guildID === interaction.guildId)
							if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase())) {
								let result = ``
								for (const item of filteredItems) {
									result += `> ${item.displayEmoji}**${item.name}**\n`
								}
								return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
							} else {
								const _item = filteredItems.some(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase()) : filteredItems.first()
								if (!_item) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such item does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
								} else {
									if (!item.onUse.takeItem) item.onUse.takeItem = { itemID: _item.itemID, amount: modalArgs.amount }
									else {
										item.onUse.takeItem.itemID = _item.itemID
										item.onUse.takeItem.amount = modalArgs.amount
									}
								}  
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes(`takeLevel`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_takeLevel_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Level subtraction when using item", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Quantity (levels)", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("amount")
										.setRequired(false)
										.setValue(`${item.onUse.takeLevel || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_takeLevel_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.amount.length) {
							item.onUse.takeLevel = undefined
						}
						else {
							if (isNaN(+modalArgs.amount)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.amount = +modalArgs.amount
							if (modalArgs.amount <= 0 || modalArgs.amount > 100000 ) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
							}
							item.onUse.takeLevel = modalArgs.amount
						}
					} else return
				} else
				if (interaction.values?.[0].includes("thumbnail")) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_thumbnail_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Appearance: thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Image link", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("link")
										.setRequired(false)
										.setValue(`${item.onUse.thumbnail?.slice(0,4000) || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_thumbnail_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.link.length) {
							item.onUse.thumbnail = undefined
						} else {
							const isImage = await isImageURL(modalArgs.link)
							if (!isImage) {
								await interaction.deferUpdate()
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.link}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							} else {
								item.onUse.thumbnail = modalArgs.link
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes("img")) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_image_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Appearance: image", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Image link", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("link")
										.setRequired(false)
										.setValue(`${item.onUse.image?.slice(0, 4000) || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_image_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.link.length) {
							item.onUse.image = undefined
						} else {
							const isImage = await isImageURL(modalArgs.link)
							if (!isImage) {
								await interaction.deferUpdate()
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.link}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							} else {
								item.onUse.image = modalArgs.link
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes("color")) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_color_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Appearance: border color", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: `HEX color code`, guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("color")
										.setRequired(false)
										.setValue(`${item.onUse.color || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_color_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.color.length) {
							item.onUse.color = undefined
						} else {
							if (!/^#[0-9A-F]{6}$/i.test(modalArgs.color)) {
								await interaction.deferUpdate()
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.color}** ${client.language({ textId: "is not a HEX color. HEX color example", guildId: interaction.guildId, locale: interaction.locale })}: **#FF5733**. ${client.language({ textId: "Please select HEX color from this site", guildId: interaction.guildId, locale: interaction.locale })}: https://htmlcolorcodes.com/color-picker/`, flags: ["Ephemeral"] })
							} else {
								item.onUse.color = modalArgs.color
							}
						}
					} else return
				} else
				if (interaction.values?.[0].includes("autoIncome")) {
					const modal = new ModalBuilder()
					.setCustomId(`manager-items_autoIncome_${interaction.id}`)
					.setTitle(`${client.language({ textId: "Auto role income", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setLabelComponents([
						new LabelBuilder()
							.setLabel(`${client.language({ textId: "Minutes", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setTextInputComponent(
								new TextInputBuilder()
									.setCustomId("minutes")
									.setRequired(false)
									.setValue(`${item.onUse.autoIncome || ""}`)
									.setStyle(TextInputStyle.Short)
							),
					])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_autoIncome_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						if (!modalArgs.minutes.length) {
							item.onUse.autoIncome = undefined
						}
						else {
							if (isNaN(+modalArgs.minutes)) {
								return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.minutes}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							modalArgs.minutes = +modalArgs.minutes
							if (modalArgs.minutes < 0 || modalArgs.minutes > 2628000) {
								return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 2628000`, flags: ["Ephemeral"] })
							}
							if (!modalArgs.minutes) item.onUse.autoIncome = undefined
							else item.onUse.autoIncome = modalArgs.minutes
						}
					} else return
				} else
				if (interaction.values?.[0].includes("resetUsage")) {
					// Reset all usage properties
					item.onUse = {}
					item.canUse = false
					await interaction.deferUpdate()
				}
				await item.save()
				let message = ``
				if (item.onUse.message) {
					if (item.onUse.messageOnDM) message = `${client.language({ textId: "DM message", guildId: interaction.guildId, locale: interaction.locale })}: **${item.onUse.message}**`
					else message = `${client.language({ textId: "Channel message", guildId: interaction.guildId, locale: interaction.locale })}: **${item.onUse.message}**`
				}
				const embed = await generateItemEmbed(client, interaction, item)
				let options = [
					{ emoji: client.config.emojis.medal, label: `${client.language({ textId: "Level grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `levelAdd` },
					{ emoji: client.config.emojis.RP, label: `${client.language({ textId: "Reputation grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rpAdd` },
					{ emoji: client.config.emojis.XP, label: `${client.language({ textId: "Experience grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xpAdd` },
					{ emoji: client.config.emojis.coin, label: `${client.language({ textId: "Currency grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `currencyAdd` },
					{ emoji: client.config.emojis.box, label: `${client.language({ textId: "Item grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `itemAdd` },
					{ emoji: client.config.emojis.roles, label: `${client.language({ textId: "Role grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `roleAdd` },
					{ emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Trophy grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `trophyAdd` },
					{ emoji: client.config.emojis.message, label: `${client.language({ textId: "Sending message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `addmessage` },
					{ emoji: client.config.emojis.message, label: `${client.language({ textId: "DM message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `messageDM`, description: item.onUse.messageOnDM ? `${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}` },
					{ emoji: client.config.emojis.XP100Booster, label: `${client.language({ textId: "Adding currency booster", guildId: interaction.guildId, locale: interaction.locale })}`, value: `addCUR` },
					{ emoji: client.config.emojis.XP100Booster, label: `${client.language({ textId: "Adding experience booster", guildId: interaction.guildId, locale: interaction.locale })}`, value: `addXP` },
					{ emoji: client.config.emojis.XP100Booster, label: `${client.language({ textId: "Adding luck booster", guildId: interaction.guildId, locale: interaction.locale })}`, value: `addLuck` },
					{ emoji: client.config.emojis.XP100Booster, label: `${client.language({ textId: "Adding reputation booster", guildId: interaction.guildId, locale: interaction.locale })}`, value: `addRP` },
					{ emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievement grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `addAchievement` },
					{ emoji: client.config.emojis.wormhole, label: `${client.language({ textId: "Wormhole spawn", guildId: interaction.guildId, locale: interaction.locale })}`, value: `spawnWormhole` },
					{ emoji: client.config.emojis.scroll, label: `${client.language({ textId: "Item learning", guildId: interaction.guildId, locale: interaction.locale })}`, value: `itemResearch` },
					{ emoji: client.config.emojis.recipe, label: `${client.language({ textId: "Craft recipe learning", guildId: interaction.guildId, locale: interaction.locale })}`, value: `craftResearch` },
					{ emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quest grant", guildId: interaction.guildId, locale: interaction.locale })}`, value: `addQuest` },
					{ emoji: client.config.emojis.roles, label: `${client.language({ textId: "Automatic income from roles", guildId: interaction.guildId, locale: interaction.locale })}`, value: `autoIncome` },
					{ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Reset", guildId: interaction.guildId, locale: interaction.locale })}`, value: `resetUsage` },
				]
				let options2 = [
					{ emoji: client.config.emojis.roles, label: `${client.language({ textId: "Clear role", guildId: interaction.guildId, locale: interaction.locale })}`, value: `roleDel` },
					{ emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Clear trophy", guildId: interaction.guildId, locale: interaction.locale })}`, value: `trophyDel` },
					{ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Item deletion from server", guildId: interaction.guildId, locale: interaction.locale })}`, value: `delItem` },
					{ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Clear currency booster", guildId: interaction.guildId, locale: interaction.locale })}`, value: `delCUR` },
					{ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Clear experience booster", guildId: interaction.guildId, locale: interaction.locale })}`, value: `delXP` },
					{ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Clear luck booster", guildId: interaction.guildId, locale: interaction.locale })}`, value: `delLuck` },
					{ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Clear reputation booster", guildId: interaction.guildId, locale: interaction.locale })}`, value: `delRP` },
					{ emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quest progress reset", guildId: interaction.guildId, locale: interaction.locale })}`, value: `wipeQuest` },
					{ emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quest deletion from profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `delQuest` },
					{ emoji: client.config.emojis.XP, label: `${client.language({ textId: "Experience subtraction", guildId: interaction.guildId, locale: interaction.locale })}`, value: `takeXP` },
					{ emoji: client.config.emojis.coin, label: `${client.language({ textId: "Currency subtraction", guildId: interaction.guildId, locale: interaction.locale })}`, value: `takeCUR` },
					{ emoji: client.config.emojis.RP, label: `${client.language({ textId: "Reputation subtraction", guildId: interaction.guildId, locale: interaction.locale })}`, value: `takeRP` },
					{ emoji: client.config.emojis.box, label: `${client.language({ textId: "Item subtraction", guildId: interaction.guildId, locale: interaction.locale })}`, value: `takeItem` },
					{ emoji: client.config.emojis.medal, label: `${client.language({ textId: "Level subtraction", guildId: interaction.guildId, locale: interaction.locale })}`, value: `takeLevel` },
					{ emoji: client.config.emojis.roles, label: `${client.language({ textId: "Disable automatic income from roles", guildId: interaction.guildId, locale: interaction.locale })}`, value: `autoIncomeDel` },
					{ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Reset", guildId: interaction.guildId, locale: interaction.locale })}`, value: `resetUsage` },
				]
				let options3 = [
					{ emoji: client.config.emojis.picture, label: `${client.language({ textId: "Thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, value: `thumbnail`, description: item.onUse.thumbnail?.slice(0, 99) || undefined },
					{ emoji: client.config.emojis.picture, label: `${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}`, value: `img`, description: item.onUse.image?.slice(0, 99) || undefined },
					{ emoji: client.config.emojis.colorpalette, label: `${client.language({ textId: "Embed border color", guildId: interaction.guildId, locale: interaction.locale })}`, value: `color`, description: item.onUse.color || undefined },
				]
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} openByItem usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities usr{${interaction.user.id}}`)
				const row1 = new ActionRowBuilder()
					.addComponents([new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} onUse usr{${interaction.user.id}}1`)
					.addOptions(options)
					.setPlaceholder(`${client.language({ textId: "Positive effects", guildId: interaction.guildId, locale: interaction.locale })}`)])
				const row2 = new ActionRowBuilder()
					.addComponents([new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} onUse usr{${interaction.user.id}}2`)
					.addOptions(options2)
					.setPlaceholder(`${client.language({ textId: "Negative effects", guildId: interaction.guildId, locale: interaction.locale })}`)])
				const row3 = new ActionRowBuilder()
					.addComponents([new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} onUse usr{${interaction.user.id}}3`)
					.addOptions(options3)
					.setPlaceholder(`${client.language({ textId: "Appearance", guildId: interaction.guildId, locale: interaction.locale })}`)])
				const row4 = new ActionRowBuilder().addComponents([backBTN, nextBTN])
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `**${client.language({ textId: "USAGE", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Here you can select what events will occur when using the item. This step can be skipped", guildId: interaction.guildId, locale: interaction.locale })}.`, embeds: [embed], components: [navigationRow, row1, row2, row3, row4] })
				else return interaction.update({ content: `**${client.language({ textId: "USAGE", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Here you can select what events will occur when using the item. This step can be skipped", guildId: interaction.guildId, locale: interaction.locale })}.`, embeds: [embed], components: [navigationRow, row1, row2, row3, row4] })
			}
			//СПОСОБЫ ПОЛУЧЕНИЯ
			if ((interaction.customId.includes(`activities`)) || interaction.values?.[0] == `activities`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🎲${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				if (interaction.customId.includes(`fishing`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_fishing_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Fishing", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("chance")
										.setRequired(false)
										.setValue(`${item.activities?.fishing?.chance || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. experience for receiving item", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minXP")
										.setRequired(true)
										.setValue(`${item.activities?.fishing?.minxp || "0"}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. experience for receiving item", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxXP")
										.setRequired(true)
										.setValue(`${item.activities?.fishing?.maxxp || "0"}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minAmount")
										.setRequired(false)
										.setValue(`${item.activities?.fishing?.amountFrom || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxAmount")
										.setRequired(false)
										.setValue(`${item.activities?.fishing?.amountTo || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_fishing_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.chance || !modalArgs.minAmount || !modalArgs.maxAmount) {
							if (item.activities?.fishing) item.activities.fishing = undefined
							await item.save()
						} else {
							let pass = true
							if (isNaN(+modalArgs.chance)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.minAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.minXP)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minXP}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxXP)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxXP}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.chance = +modalArgs.chance
							modalArgs.minAmount = +modalArgs.minAmount
							modalArgs.maxAmount = +modalArgs.maxAmount
							modalArgs.minXP = +modalArgs.minXP
							modalArgs.maxXP = +modalArgs.maxXP
							if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, flags: ["Ephemeral"] })
								pass = false
							}
							if (client.cache.items.filter(e => e.itemID !== item.itemID && e.guildID === interaction.guildId).reduce((previousValue, element) => previousValue += element.activities?.fishing?.chance || 0, 0) + modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Total chance of all items in fishing must not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount <= 0 || modalArgs.minAmount > 1000 || modalArgs.maxAmount <= 0 || modalArgs.maxAmount > 1000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount > modalArgs.maxAmount) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minXP < 0 || modalArgs.minXP > 100000 || modalArgs.maxXP < 0 || modalArgs.maxXP > 100000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Experience amount must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minXP > modalArgs.maxXP) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum experience must not exceed maximum", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (pass) {
								if (!item.activities) item.activities = { fishing: {} }
								else if (!item.activities.fishing) item.activities.fishing = {}
								item.activities.fishing.chance = modalArgs.chance
								item.activities.fishing.minxp = modalArgs.minXP
								item.activities.fishing.maxxp = modalArgs.maxXP
								item.activities.fishing.amountFrom = modalArgs.minAmount
								item.activities.fishing.amountTo = modalArgs.maxAmount
								await item.save()
							}
						}
					} else return
				} else
				if (interaction.customId.includes(`mining`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_mining_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Mining", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("chance")
										.setRequired(false)
										.setValue(`${item.activities?.mining?.chance || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. experience for receiving item", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minXP")
										.setRequired(true)
										.setValue(`${item.activities?.mining?.minxp || "0"}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. experience for receiving item", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxXP")
										.setRequired(true)
										.setValue(`${item.activities?.mining?.maxxp || "0"}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minAmount")
										.setRequired(false)
										.setValue(`${item.activities?.mining?.amountFrom || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxAmount")
										.setRequired(false)
										.setValue(`${item.activities?.mining?.amountTo || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_mining_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.chance || !modalArgs.minAmount || !modalArgs.maxAmount) {
							if (item.activities?.mining) item.activities.mining = undefined
							await item.save()
						} else {
							let pass = true
							if (isNaN(+modalArgs.chance)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.minAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.minXP)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minXP}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxXP)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxXP}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.chance = +modalArgs.chance
							modalArgs.minAmount = +modalArgs.minAmount
							modalArgs.maxAmount = +modalArgs.maxAmount
							modalArgs.minXP = +modalArgs.minXP
							modalArgs.maxXP = +modalArgs.maxXP
							if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, flags: ["Ephemeral"] })
								pass = false
							}
							if (client.cache.items.filter(e => e.itemID !== item.itemID && e.guildID === interaction.guildId).reduce((previousValue, element) => previousValue += element.activities?.mining?.chance || 0, 0) + modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Total chance of all items in mining must not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount <= 0 || modalArgs.minAmount > 1000 || modalArgs.maxAmount <= 0 || modalArgs.maxAmount > 1000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount > modalArgs.maxAmount) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minXP < 0 || modalArgs.minXP > 100000 || modalArgs.maxXP < 0 || modalArgs.maxXP > 100000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Experience amount must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minXP > modalArgs.maxXP) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum experience must not exceed maximum", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (pass) {
								if (!item.activities) item.activities = { mining: {} }
								else if (!item.activities.mining) item.activities.mining = {}
								item.activities.mining.chance = modalArgs.chance
								item.activities.mining.minxp = modalArgs.minXP
								item.activities.mining.maxxp = modalArgs.maxXP
								item.activities.mining.amountFrom = modalArgs.minAmount
								item.activities.mining.amountTo = modalArgs.maxAmount
								await item.save()
							}
						}
					} else return
				} else
				if (interaction.customId.includes(`message`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_message_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item for message", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("chance")
										.setRequired(false)
										.setValue(`${item.activities?.message?.chance || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minAmount")
										.setRequired(false)
										.setValue(`${item.activities?.message?.amountFrom || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxAmount")
										.setRequired(false)
										.setValue(`${item.activities?.message?.amountTo || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_message_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.chance || !modalArgs.minAmount || !modalArgs.maxAmount) {
							if (item.activities?.message) item.activities.message = undefined
							await item.save()
						} else {
							let pass = true
							if (isNaN(+modalArgs.chance)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.minAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.chance = +modalArgs.chance
							modalArgs.minAmount = +modalArgs.minAmount
							modalArgs.maxAmount = +modalArgs.maxAmount
							if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, flags: ["Ephemeral"] })
								pass = false
							}
							if (client.cache.items.filter(e => e.itemID !== item.itemID && e.guildID === interaction.guildId).reduce((previousValue, element) => previousValue += element.activities?.message?.chance || 0, 0) + modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Total chance of all items given for message must not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount <= 0 || modalArgs.minAmount > 100000 || modalArgs.maxAmount <= 0 || modalArgs.maxAmount > 100000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount > modalArgs.maxAmount) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (pass) {
								if (!item.activities) item.activities = { message: {} }
								else if (!item.activities.message) item.activities.message = {}
								item.activities.message.chance = modalArgs.chance
								item.activities.message.amountFrom = modalArgs.minAmount
								item.activities.message.amountTo = modalArgs.maxAmount
								await item.save()
							}
						}
					} else return
				} else
				if (interaction.customId.includes(`voice`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_voice_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item for 1 minute of voice activity", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("chance")
										.setRequired(false)
										.setValue(`${item.activities?.voice?.chance || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minAmount")
										.setRequired(false)
										.setValue(`${item.activities?.voice?.amountFrom || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxAmount")
										.setRequired(false)
										.setValue(`${item.activities?.voice?.amountTo || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_voice_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.chance || !modalArgs.minAmount || !modalArgs.maxAmount) {
							if (item.activities?.voice) item.activities.voice = undefined
							await item.save()
						} else {
							let pass = true
							if (isNaN(+modalArgs.chance)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.minAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.chance = +modalArgs.chance
							modalArgs.minAmount = +modalArgs.minAmount
							modalArgs.maxAmount = +modalArgs.maxAmount
							if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, flags: ["Ephemeral"] })
								pass = false
							}
							if (client.cache.items.filter(e => e.itemID !== item.itemID && e.guildID === interaction.guildId).reduce((previousValue, element) => previousValue += element.activities?.voice?.chance || 0, 0) + modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Total chance of all items given for voice activity must not exceed 100", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount <= 0 || modalArgs.minAmount > 100000 || modalArgs.maxAmount <= 0 || modalArgs.maxAmount > 100000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount > modalArgs.maxAmount) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (pass) {
								if (!item.activities) item.activities = { voice: {} }
								else if (!item.activities.voice) item.activities.voice = {}
								item.activities.voice.chance = modalArgs.chance
								item.activities.voice.amountFrom = modalArgs.minAmount
								item.activities.voice.amountTo = modalArgs.maxAmount
								await item.save()
							}
						}
					} else return
				} else
				if (interaction.customId.includes(`like`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_like_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item for like", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minAmount")
										.setRequired(false)
										.setValue(`${item.activities?.like?.amountFrom || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxAmount")
										.setRequired(false)
										.setValue(`${item.activities?.like?.amountTo || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_like_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.minAmount || !modalArgs.maxAmount) {
							if (item.activities?.like) item.activities.like = undefined
							await item.save()
						} else {
							let pass = true
							if (isNaN(+modalArgs.minAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.minAmount = +modalArgs.minAmount
							modalArgs.maxAmount = +modalArgs.maxAmount
							if (modalArgs.minAmount <= 0 || modalArgs.minAmount > 100000 || modalArgs.maxAmount <= 0 || modalArgs.maxAmount > 100000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount > modalArgs.maxAmount) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (pass) {
								if (!item.activities) item.activities = { like: {} }
								else if (!item.activities.like) item.activities.like = {}
								item.activities.like.amountFrom = modalArgs.minAmount
								item.activities.like.amountTo = modalArgs.maxAmount
								await item.save()
							}
						}
					} else return
				} else
				if (interaction.customId.includes(`invite`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_invite_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item for invite", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minAmount")
										.setRequired(false)
										.setValue(`${item.activities?.invite?.amountFrom || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxAmount")
										.setRequired(false)
										.setValue(`${item.activities?.invite?.amountTo || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_invite_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.minAmount || !modalArgs.maxAmount) {
							if (item.activities?.invite) item.activities.invite = undefined
							await item.save()
						} else {
							let pass = true
							if (isNaN(+modalArgs.minAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.minAmount = +modalArgs.minAmount
							modalArgs.maxAmount = +modalArgs.maxAmount
							if (modalArgs.minAmount <= 0 || modalArgs.minAmount > 100000 || modalArgs.maxAmount <= 0 || modalArgs.maxAmount > 100000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount > modalArgs.maxAmount) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (pass) {
								if (!item.activities) item.activities = { invite: {} }
								else if (!item.activities.invite) item.activities.invite = {}
								item.activities.invite.amountFrom = modalArgs.minAmount
								item.activities.invite.amountTo = modalArgs.maxAmount
								await item.save()
							}
						}
					} else return
				} else
				if (interaction.customId.includes(`bump`)) {
					const modal = new ModalBuilder()
						.setCustomId(`manager-items_bump_${interaction.id}`)
						.setTitle(`${client.language({ textId: "Item for bump", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("chance")
										.setRequired(false)
										.setValue(`${item.activities?.bump?.chance || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Min. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("minAmount")
										.setRequired(false)
										.setValue(`${item.activities?.bump?.amountFrom || ""}`)
										.setStyle(TextInputStyle.Short)
								),
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Max. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("maxAmount")
										.setRequired(false)
										.setValue(`${item.activities?.bump?.amountTo || ""}`)
										.setStyle(TextInputStyle.Short)
								),
						])
					await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
					const filter = (i) => i.customId === `manager-items_bump_${interaction.id}` && i.user.id === interaction.user.id
					interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
					if (interaction && interaction.type === InteractionType.ModalSubmit) {
						const modalArgs = {}
						interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
						await interaction.deferUpdate()
						if (!modalArgs.chance || !modalArgs.minAmount || !modalArgs.maxAmount) {
							if (item.activities?.bump) item.activities.bump = undefined
							await item.save()
						} else {
							let pass = true
							if (isNaN(+modalArgs.chance)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.chance}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.minAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (isNaN(+modalArgs.maxAmount)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.chance = +modalArgs.chance
							modalArgs.minAmount = +modalArgs.minAmount
							modalArgs.maxAmount = +modalArgs.maxAmount
							if (modalArgs.chance <= 0 || modalArgs.chance > 100) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Chance must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount <= 0 || modalArgs.minAmount > 100000 || modalArgs.maxAmount <= 0 || modalArgs.maxAmount > 100000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.minAmount > modalArgs.maxAmount) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (pass) {
								if (!item.activities) item.activities = { bump: {} }
								else if (!item.activities.bump) item.activities.bump = {}
								item.activities.bump.chance = modalArgs.chance
								item.activities.bump.amountFrom = modalArgs.minAmount
								item.activities.bump.amountTo = modalArgs.maxAmount
								await item.save()
							}
						}
					} else return
				} else
				if (interaction.customId.includes(`daily`)) {
					let day
					if (interaction.customId.includes(`day1`)) day = "day1"
					if (interaction.customId.includes(`day2`)) day = "day2"
					if (interaction.customId.includes(`day3`)) day = "day3"
					if (interaction.customId.includes(`day4`)) day = "day4"
					if (interaction.customId.includes(`day5`)) day = "day5"
					if (interaction.customId.includes(`day6`)) day = "day6"
					if (interaction.customId.includes(`day7`)) day = "day7"
					if (interaction.customId.includes(`day`)) {
						const modal = new ModalBuilder()
							.setCustomId(`manager-items_daily_${day}_${interaction.id}`)
							.setTitle(`${client.language({ textId: "Item for ${day} daily rewards", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Min. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("minAmount")
											.setRequired(false)
											.setValue(`${item.activities?.daily?.[day]?.amountFrom || ""}`)
											.setStyle(TextInputStyle.Short)
									),
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Max. items received", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("maxAmount")
											.setRequired(false)
											.setValue(`${item.activities?.daily?.[day]?.amountTo || ""}`)
											.setStyle(TextInputStyle.Short)
									),
							])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_daily_${day}_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						if (interaction && interaction.type === InteractionType.ModalSubmit) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
							await interaction.deferUpdate()
							if ((!modalArgs.minAmount || !modalArgs.maxAmount) && item.activities?.daily?.[day]) {
								if (item.activities?.daily?.[day]) delete item.activities.daily[day]
								await item.save()
							} else {
								let pass = true
								if (isNaN(+modalArgs.minAmount)) {
									interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.minAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
									pass = false
								}
								if (isNaN(+modalArgs.maxAmount)) {
									interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.maxAmount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
									pass = false
								}
								modalArgs.minAmount = +modalArgs.minAmount
								modalArgs.maxAmount = +modalArgs.maxAmount
								if (modalArgs.minAmount <= 0 || modalArgs.minAmount > 100000 || modalArgs.maxAmount <= 0 || modalArgs.maxAmount > 100000) {
									interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
									pass = false
								}
								if (modalArgs.minAmount > modalArgs.maxAmount) {
									interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
									pass = false
								}
								if (pass) {
									if (!item.activities) item.activities = { daily: { [day]: {} } }
									else if (!item.activities.daily) item.activities.daily = { [day]: {}}
									else if (!item.activities.daily[day]) item.activities.daily[day] = {}
									item.activities.daily[day].amountFrom = modalArgs.minAmount
									item.activities.daily[day].amountTo = modalArgs.maxAmount
									await item.save()
								}
							}
						} else return    
					}
					const embed = await generateItemEmbed(client, interaction, item)
					const day1BTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setEmoji(`1️⃣`)
						.setLabel(`${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 1`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_daily_day1 usr{${interaction.user.id}}`)
					const day2BTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setEmoji(`2️⃣`)
						.setLabel(`${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 2`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_daily_day2 usr{${interaction.user.id}}`)
					const day3BTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setEmoji(`3️⃣`)
						.setLabel(`${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 3`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_daily_day3 usr{${interaction.user.id}}`)
					const day4BTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setEmoji(`4️⃣`)
						.setLabel(`${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 4`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_daily_day4 usr{${interaction.user.id}}`)
					const day5BTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setEmoji(`5️⃣`)
						.setLabel(`${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 5`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_daily_day5 usr{${interaction.user.id}}`)
					const day6BTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setEmoji(`6️⃣`)
						.setLabel(`${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 6`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_daily_day6 usr{${interaction.user.id}}`)
					const day7BTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setEmoji(`7️⃣`)
						.setLabel(`${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 7`)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_daily_day7 usr{${interaction.user.id}}`)
					const returnBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setEmoji(client.config.emojis.arrowLeft)
						.setCustomId(`it{${item.itemID}}cmd{manager-items} activities usr{${interaction.user.id}}`)
					const firstRow = new ActionRowBuilder().addComponents([day1BTN, day2BTN, day3BTN, day4BTN])
					const secondRow = new ActionRowBuilder().addComponents([day5BTN, day6BTN, day7BTN])
					const thirdRow = new ActionRowBuilder().addComponents([returnBTN])
					if (interaction.replied || interaction.deferred) return interaction.editReply({ content: ` `, embeds: [embed], components: [navigationRow, firstRow, secondRow, thirdRow] })
					else return interaction.update({ content: ` `, embeds: [embed], components: [navigationRow, firstRow, secondRow, thirdRow] })
				}
				const embed = await generateItemEmbed(client, interaction, item)
				const messageBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.balloon)
					.setLabel(`${client.language({ textId: "Message", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_message usr{${interaction.user.id}}`)
				const voiceBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.mic)
					.setLabel(`${client.language({ textId: "Voice channel", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_voice usr{${interaction.user.id}}`)
				const likeBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.heart)
					.setLabel(`${client.language({ textId: "Like", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_like usr{${interaction.user.id}}`)
				const inviteBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.invite)
					.setLabel(`${client.language({ textId: "Invitation", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_invite usr{${interaction.user.id}}`)
				const bumpBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.bump)
					.setLabel(`${client.language({ textId: "Bump", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_bump usr{${interaction.user.id}}`)
				const dailyBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.watch)
					.setLabel(`${client.language({ textId: "Daily reward", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_daily usr{${interaction.user.id}}`)
				const fishingBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.fishing)
					.setLabel(`${client.language({ textId: "Fishing", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_fishing usr{${interaction.user.id}}`)
				const miningBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.mining)
					.setLabel(`${client.language({ textId: "Mining", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities_mining usr{${interaction.user.id}}`)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} onUse usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} properties usr{${interaction.user.id}}`)
				const firstRow = new ActionRowBuilder().addComponents([messageBTN, voiceBTN, likeBTN])
				const secondRow = new ActionRowBuilder().addComponents([inviteBTN, bumpBTN, dailyBTN])
				const thirdRow = new ActionRowBuilder().addComponents([fishingBTN, miningBTN])
				const lastRow = new ActionRowBuilder().addComponents([backBTN, nextBTN])
				if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `**${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Here you can configure item acquisition methods", guildId: interaction.guildId, locale: interaction.locale })}.`, embeds: [embed], components: [navigationRow, firstRow, secondRow, thirdRow, lastRow] })
				else return interaction.update({ content: `**${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}**\n${client.language({ textId: "Here you can configure item acquisition methods", guildId: interaction.guildId, locale: interaction.locale })}.`, embeds: [embed], components: [navigationRow, firstRow, secondRow, thirdRow, lastRow] })
			}
			//ПАРАМЕТРЫ
			if ((interaction.customId.includes(`properties`)) || interaction.values?.[0] == `properties`) {
				const navigationSM = new StringSelectMenuBuilder().setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`).addOptions(NavigationOptions).setPlaceholder(`⚙️${client.language({ textId: "Options", guildId: interaction.guildId, locale: interaction.locale })}`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				if (interaction.customId.includes("select")) {
					for (const value of interaction.values) {
						item[value] = !item[value]    
					}
					await item.save()
				}
				let options = [
					{ emoji: `${item.found ? client.config.emojis.YES : client.config.emojis.NO}`, label: `${client.language({ textId: "Known", guildId: interaction.guildId, locale: interaction.locale })}: ${item.found ? `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `found` },
					{ emoji: `${item.enabled ? client.config.emojis.YES : client.config.emojis.NO}`, label: `${client.language({ textId: "Visible", guildId: interaction.guildId, locale: interaction.locale })}: ${item.enabled ? `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `visible` },
					{ emoji: `${item.notTransable ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${client.language({ textId: "Transferable", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notTransable ? `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `notTransable` },
					{ emoji: `${item.notDropable ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${client.language({ textId: "Droppable", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notDropable ? `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `notDropable` },
					{ emoji: `${item.notGiveawayable ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${client.language({ textId: "Giveaway-able", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notGiveawayable ? `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `notGiveawayable` },
					{ emoji: `${item.notSellable ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${client.language({ textId: "Sellable on market", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notSellable ? `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `notSellable` },
					{ emoji: `${item.notAuctionable ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${client.language({ textId: "Sellable at auction", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notAuctionable ? `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `notAuctionable` },
					{ emoji: `${item.notCrashable ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${client.language({ textId: "Playable in crash", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notCrashable ? `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `notCrashable` },
					{ emoji: `${item.blackJackBan ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${client.language({ textId: "Bet in blackjack", guildId: interaction.guildId, locale: interaction.locale })}: ${item.blackJackBan ? `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "YES", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `blackJackBan` }
				]
				const embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} activities usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} permissions usr{${interaction.user.id}}`)
				const firstRow = new ActionRowBuilder()
					.addComponents([
						new StringSelectMenuBuilder()
							.setCustomId(`it{${item.itemID}}cmd{manager-items} properties_select usr{${interaction.user.id}}`)
							.addOptions(options)
							.setMinValues(1)
							.setMaxValues(options.length)
							.setPlaceholder(`${client.language({ textId: "Select parameter to toggle", guildId: interaction.guildId, locale: interaction.locale })}`)
					])
				const lastRow = new ActionRowBuilder().addComponents([backBTN, nextBTN])
				const content = [
					`**${client.language({ textId: "OPTIONS", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`**${client.language({ textId: "Known", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`${client.language({ textId: "Parameter affecting item info display. If item is unknown, info cannot be viewed - it will be hidden. For item info to become visible, any user must receive it in inventory or use item for learning", guildId: interaction.guildId, locale: interaction.locale })}.`,
					`**${client.language({ textId: "Visible", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`${client.language({ textId: "Parameter that hides item everywhere. Invisible item cannot be obtained, viewed or interacted with in any way, imagine item doesn't exist, but you can enable visibility anytime", guildId: interaction.guildId, locale: interaction.locale })}.`,
					`**${client.language({ textId: "Transferable", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`${client.language({ textId: "Parameter that allows transferring item via </transfer:1150455843138060411> command", guildId: interaction.guildId, locale: interaction.locale })}.`,
					`**${client.language({ textId: "Droppable", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`${client.language({ textId: "Parameter that allows dropping item via </drop:1150455841284161613> command", guildId: interaction.guildId, locale: interaction.locale })}.`,
					`**${client.language({ textId: "Giveaway-able", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`${client.language({ textId: "Parameter that allows giving away item via </manager-giveaways:1150455842294988940> command", guildId: interaction.guildId, locale: interaction.locale })}.`,
					`**${client.language({ textId: "Sellable on market", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`${client.language({ textId: "Parameter that allows selling item on market via </market create:1150455842294988949> command", guildId: interaction.guildId, locale: interaction.locale })}.`,
					`**${client.language({ textId: "Sellable at auction", guildId: interaction.guildId, locale: interaction.locale })}**`,
					`${client.language({ textId: "Parameter that allows selling item at auction via </auction create item:1336296293730881678> command", guildId: interaction.guildId, locale: interaction.locale })}.`
				]
				return interaction.update({ 
					content: content.join("\n"), 
					embeds: [embed], 
					components: [navigationRow, firstRow, lastRow]
				})
			}
			//ПРАВА
			if ((interaction.customId.includes(`permissions`)) || interaction.values?.[0] === `permissions`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`👑${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				if (interaction.isStringSelectMenu()) {
					if (interaction.customId.includes("permissions_select")) {
						if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						const value = interaction.values[0]
						const modal = new ModalBuilder()
							.setCustomId(`manager-items_permissions_${value}_${interaction.id}`)
							.setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("name")
											.setRequired(false)
											.setValue(`${client.cache.permissions.find(e => e.id === item[value])?.name || ""}`)
											.setStyle(TextInputStyle.Short)
									),
							])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_permissions_${value}_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						if (interaction && interaction.type === InteractionType.ModalSubmit) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
							if (!modalArgs.name) {
								item[value] = undefined
								await item.save()
							} else {
								const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
								if (!permission) {
									await interaction.deferUpdate()
									interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
								} else {
									item[value] = permission.id
									await item.save()
								}
							}
						} else return
					}
				}
				const embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} properties usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} cooldowns usr{${interaction.user.id}}`)
				const firstRow = new ActionRowBuilder()
					.addComponents([
						new StringSelectMenuBuilder()
							.setCustomId(`it{${item.itemID}}cmd{manager-items} permissions_select usr{${interaction.user.id}}`)
							.addOptions([
								{
									label: `${client.language({ textId: "Permission for purchase", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `buyPermission`,
									description: client.cache.permissions.find(e => e.id === item.buyPermission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for sale", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `sellPermission`,
									description: client.cache.permissions.find(e => e.id === item.sellPermission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for opening", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `openPermission`,
									description: client.cache.permissions.find(e => e.id === item.openPermission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for usage", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `usePermission`,
									description: client.cache.permissions.find(e => e.id === item.usePermission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for transfer", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `transferPermission`,
									description: client.cache.permissions.find(e => e.id === item.transferPermission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for drop", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `dropPermission`,
									description: client.cache.permissions.find(e => e.id === item.dropPermission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for receiving for message", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `activities_message_permission`,
									description: client.cache.permissions.find(e => e.id === item.activities_message_permission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for receiving for voice activity", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `activities_voice_permission`,
									description: client.cache.permissions.find(e => e.id === item.activities_voice_permission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for receiving for like", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `activities_like_permission`,
									description: client.cache.permissions.find(e => e.id === item.activities_like_permission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for receiving for invite", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `activities_invite_permission`,
									description: client.cache.permissions.find(e => e.id === item.activities_invite_permission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for receiving for server bump", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `activities_bump_permission`,
									description: client.cache.permissions.find(e => e.id === item.activities_bump_permission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for receiving for fishing", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `activities_fishing_permission`,
									description: client.cache.permissions.find(e => e.id === item.activities_fishing_permission)?.name || undefined
								},
								{
									label: `${client.language({ textId: "Permission for receiving for mining", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `activities_mining_permission`,
									description: client.cache.permissions.find(e => e.id === item.activities_mining_permission)?.name || undefined
								}
							])
					])
				const lastRow = new ActionRowBuilder().addComponents([backBTN, nextBTN])
				if (interaction.replied || interaction.deferred) {
					return interaction.editReply({ 
						content: " ", 
						embeds: [embed], 
						components: [navigationRow, firstRow, lastRow]
					})
				} else {
					return interaction.update({ 
						content: " ", 
						embeds: [embed], 
						components: [navigationRow, firstRow, lastRow]
					})
				}
			}
			//КУЛДАУНЫ
			if ((interaction.customId.includes("cooldowns")) || interaction.values?.[0] === "cooldowns") {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🕒${client.language({ textId: "Cooldowns", guildId: interaction.guildId, locale: interaction.locale })}`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				if (interaction.isStringSelectMenu()) {
					if (interaction.customId.includes("cooldowns_select")) {
						const value = interaction.values[0]
						const modal = new ModalBuilder()
							.setCustomId(`manager-items_cooldowns_${value}_${interaction.id}`)
							.setTitle(`${client.language({ textId: value, guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Cooldown (sec)", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("cooldown")
											.setRequired(true)
											.setValue(`${item[`cooldown_${value}`] || 0}`)
											.setStyle(TextInputStyle.Short)
									),
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Min. quantity at once", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("min")
											.setRequired(true)
											.setValue(`${item[`min_${value}`]}`)
											.setStyle(TextInputStyle.Short)
									),
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Max. quantity at once", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
											.setCustomId("max")
											.setRequired(value === "use" || value === "open" ? true : false)
											.setValue(`${item[`max_${value}`] || ""}`)
											.setStyle(TextInputStyle.Short)
									),
							])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `manager-items_cooldowns_${value}_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						if (interaction && interaction.type === InteractionType.ModalSubmit) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
							await interaction.deferUpdate()
							let pass = true
							if (isNaN(+modalArgs.cooldown) || !Number.isInteger(+modalArgs.cooldown)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.cooldown}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (value !== "open" && value !== "use" && isNaN(+modalArgs.min)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.min}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if ((value === "open" || value === "use") && (isNaN(+modalArgs.min) || !Number.isInteger(+modalArgs.min))) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.min}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							} 
							if (modalArgs.max && isNaN(+modalArgs.max)) {
								interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.max}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							modalArgs.cooldown = +modalArgs.cooldown
							modalArgs.min = +modalArgs.min
							if (modalArgs.max) modalArgs.max = +modalArgs.max
							if (modalArgs.max && modalArgs.min > modalArgs.max) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Minimum quantity must not exceed maximum quantity", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
								pass = false
							}
							if (modalArgs.cooldown < 0 || modalArgs.cooldown > 2592000) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Cooldown must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 2592000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (value === "use" && modalArgs.max && (modalArgs.max > 1000 || modalArgs.max < 1)) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum quantity at once must not be", guildId: interaction.guildId, locale: interaction.locale })} < 1 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (value === "open" && modalArgs.max && (modalArgs.max > 1000 || modalArgs.max < 1)) {
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum quantity at once must not be", guildId: interaction.guildId, locale: interaction.locale })} < 1 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
								pass = false
							}
							if (pass) {
								item[`cooldown_${value}`] = modalArgs.cooldown
								item[`min_${value}`] = modalArgs.min
								if (modalArgs.max) item[`max_${value}`] = modalArgs.max
								else item[`max_${value}`] = undefined
								await item.save()
								await Promise.all(client.cache.profiles.filter(profile => profile.itemsCooldowns?.get(item.itemID)?.[value]).map(async profile => {
									profile.itemsCooldowns.set(item.itemID, { ...profile.itemsCooldowns.get(item.itemID), [value]: undefined })
									if (!Object.values(profile.itemsCooldowns.get(item.itemID)).filter(e => e).length) profile.itemsCooldowns.delete(item.itemID)
									if (!profile.itemsCooldowns.size) profile.itemsCooldowns = undefined
									await profile.save()
								}))
							}
						} else return
					}
				}
				const embed = await generateItemEmbed(client, interaction, item)
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowLeft)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} permissions usr{${interaction.user.id}}`)
				const nextBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setEmoji(client.config.emojis.arrowRight)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} finish usr{${interaction.user.id}}`)
					.setDisabled(!item.temp)
				const firstRow = new ActionRowBuilder()
					.addComponents([
						new StringSelectMenuBuilder()
							.setCustomId(`it{${item.itemID}}cmd{manager-items} cooldowns_select usr{${interaction.user.id}}`)
							.addOptions([
								{
									label: `${client.language({ textId: "Usage cooldown", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `use`,
									description: transformSecs(client, item.cooldown_use*1000 || 0, interaction.guildId, interaction.locale)
								},
								{
									label: `${client.language({ textId: "Opening cooldown", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `open`,
									description: transformSecs(client, item[`cooldown_open`]*1000 || 0, interaction.guildId, interaction.locale)
								},
								{
									label: `${client.language({ textId: "Sale cooldown", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `sell`,
									description: transformSecs(client, item[`cooldown_sell`]*1000 || 0, interaction.guildId, interaction.locale)
								},
								{
									label: `${client.language({ textId: "Drop cooldown", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `drop`,
									description: transformSecs(client, item[`cooldown_drop`]*1000 || 0, interaction.guildId, interaction.locale)
								},
								{
									label: `${client.language({ textId: "Transfer cooldown", guildId: interaction.guildId, locale: interaction.locale })}`,
									value: `transfer`,
									description: transformSecs(client, item[`cooldown_transfer`]*1000 || 0, interaction.guildId, interaction.locale)
								}
							])
					])
				const lastRow = new ActionRowBuilder().addComponents([backBTN, nextBTN])
				if (interaction.replied || interaction.deferred) {
					return interaction.editReply({ 
						content: " ", 
						embeds: [embed], 
						components: [navigationRow, firstRow, lastRow]
					})
				} else {
					return interaction.update({ 
						content: " ", 
						embeds: [embed], 
						components: [navigationRow, firstRow, lastRow]
					})
				}
			}
			//ФИНИШ
			if ((interaction.customId.includes(`finish`)) || interaction.values?.[0] === `finish`) {
				const navigationSM = new StringSelectMenuBuilder()
					.setCustomId(`it{${item.itemID}}cmd{manager-items} navigation usr{${interaction.user.id}}`)
					.addOptions(NavigationOptions)
					.setPlaceholder(`🏁${client.language({ textId: "Finish", guildId: interaction.guildId, locale: interaction.locale })}`)
				const navigationRow = new ActionRowBuilder().addComponents([navigationSM])
				const embed = await generateItemEmbed(client, interaction, item)
				if (interaction.customId.includes(`done`)) {
					if (client.cache.items.filter(e => e.guildID === interaction.guildId).size >= settings.max_items) return interaction.reply({ content: `${client.language({ textId: "Maximum items reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_items}`, flags: ["Ephemeral"] })
					if (item.name && item.description && item.emoji && item.sort && item.rarity) {
						item.tempCreated = undefined
						item.temp = undefined
						await item.save()
						return interaction.update({ content: `${client.language({ textId: "Item created", guildId: interaction.guildId, locale: interaction.locale })}:`, embeds: [embed], components: [] })  
					} else return interaction.reply({ content: `${client.language({ textId: "To create an item, you need at least: NAME, DESCRIPTION, EMOJI, RARITY", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })  
				}
				const backBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Danger)
					.setEmoji(client.config.emojis.arrowLeft)
					.setLabel(`${client.language({ textId: "Cooldowns", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} cooldowns usr{${interaction.user.id}}`)
				const createBTN = new ButtonBuilder()
					.setStyle(ButtonStyle.Success)
					.setEmoji(client.config.emojis.plus)
					.setLabel(`${client.language({ textId: "CREATE", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setCustomId(`it{${item.itemID}}cmd{manager-items} finish_done usr{${interaction.user.id}}`)
				const firstRow = new ActionRowBuilder().addComponents([backBTN, createBTN])
				return interaction.update({ content: ` `, embeds: [embed], components: [navigationRow, firstRow] })
			}
		}
    }
}
async function generateItemEmbed(client, interaction, item) {
    const embed = new EmbedBuilder()
	const settings = client.cache.settings.get(interaction.guildId)
	const items = client.cache.items.filter(e => e.guildID === interaction.guildId).map(e => e).sort((a, b) => a.name > b.name)
	embed.setColor(item.hex || null)
	embed.setAuthor({ name: item.name, iconURL: item.image || await item.getEmojiURL() })
	embed.setThumbnail(item.image || await item.getEmojiURL())
	let usable = client.config.emojis.NO
	let command = ""
	if (item.canUse) {
		usable = client.config.emojis.YES
		command += `\n❓/use ${item.name} - ${client.language({ textId: "to use", guildId: interaction.guildId, locale: interaction.locale })}`
	}
	let openable = client.config.emojis.NO
	const contains = item.contains.filter(e => (e.type === RewardType.Item && client.cache.items.find(it => it.itemID === e.id && it.enabled && !it.temp)) || e.type !== RewardType.Item)
	if (contains.length) {
		if (item.openByItem?.itemID && item.openByItem.itemID !== "currency" && item.openByItem.itemID !== "xp" && item.openByItem.itemID !== "rp") {
			openable = client.config.emojis.YES
			const itm = items.find(i => i.itemID === item.openByItem.itemID)
			if (itm) {
				openable += ` ${itm.displayEmoji}${itm.name} (${item.openByItem.amount})`
			} else openable += ` ${item.openByItem.itemID} (${item.openByItem.amount})`
		} else if (item.openByItem?.itemID == "currency") {
			openable = client.config.emojis.YES
			openable += ` ${settings.displayCurrencyEmoji}${settings.currencyName} (${item.openByItem.amount})`
		} else if (item.openByItem?.itemID == "xp") {
			openable = client.config.emojis.YES
			openable += ` ${client.config.emojis.XP}XP (${item.openByItem.amount})`
		} else if (item.openByItem?.itemID == "rp") {
			openable = client.config.emojis.YES
			openable += ` ${client.config.emojis.RP}RP (${item.openByItem.amount})`
		} else openable = client.config.emojis.YES
		if (item.levelForOpen) openable += ` ${client.language({ textId: "lvl", guildId: interaction.guildId, locale: interaction.locale })}. ${item.levelForOpen}`
		command += `\n❓/open ${item.name} - ${client.language({ textId: "to open", guildId: interaction.guildId, locale: interaction.locale })}`
	}
	let itemPrice
	let sellingItemPrice
	if (item.shop.inShop && (item.shop.price || item.shop.cryptoPrice) && item.shop.priceType) itemPrice = items.find(e => e.itemID === item.shop.priceType)
	if ((item.shop.sellingPrice || item.shop.cryptoSellingPrice) && item.shop.sellingPriceType) sellingItemPrice = items.find(e => e.itemID === item.shop.sellingPriceType)         
	let sellingItemPriceEmoji
	if (sellingItemPrice) {
		if (item.shop.cryptoSellingPrice) {
			sellingItemPriceEmoji = `${sellingItemPrice.displayEmoji}${await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoSellingPrice}/sell`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoSellingPriceMultiplier)).catch(err => NaN)}`
		} else {
			sellingItemPriceEmoji = `${sellingItemPrice.displayEmoji}${item.shop.sellingPrice}`
		}
	} else {
		if (item.shop.cryptoSellingPrice) {
			sellingItemPriceEmoji = `${settings.displayCurrencyEmoji}${await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoSellingPrice}/sell`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoSellingPriceMultiplier)).catch(err => NaN)}`
		} else {
			sellingItemPriceEmoji = `${settings.displayCurrencyEmoji}${item.shop.sellingPrice}`
		}
	}
	let itemPriceEmoji
	if (itemPrice) {
		if (item.shop.cryptoPrice) {
			itemPriceEmoji = `${itemPrice.displayEmoji}${await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoPriceMultiplier)).catch(err => NaN)}`
		} else {
			itemPriceEmoji = `${itemPrice.displayEmoji}${item.shop.price}`
		}
	} else if (item.shop.priceType === "currency") {
		if (item.shop.cryptoPrice) {
			itemPriceEmoji = `${settings.displayCurrencyEmoji}${await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoPriceMultiplier)).catch(err => NaN)}`
		} else {
			itemPriceEmoji = `${settings.displayCurrencyEmoji}${item.shop.price}`
		}
	} else if (item.shop.priceType === "cookie") {
		if (item.shop.cryptoPrice) {
			itemPriceEmoji = `🍪${await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoPriceMultiplier)).catch(err => NaN)}`
		} else {
			itemPriceEmoji = `🍪${item.shop.price}`   
		}
	}
	if (!item.shop.inShop || (!item.shop.price && !item.shop.cryptoPrice)) price = `\n> ${client.language({ textId: "Buy", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.NO}`
	if (item.shop.inShop && (item.shop.price || item.shop.cryptoPrice)) price = `\n> ${client.language({ textId: "Buy", guildId: interaction.guildId, locale: interaction.locale })}: ${itemPriceEmoji}`    
	if (!item.shop.sellingPrice && !item.shop.cryptoSellingPrice) price += `\n> ${client.language({ textId: "Sell", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.NO}`
	if (item.shop.sellingPrice || item.shop.cryptoSellingPrice) price += `\n> ${client.language({ textId: "Sell", guildId: interaction.guildId, locale: interaction.locale })}: ${sellingItemPriceEmoji}`
	embed.setDescription(`${item.description}\n> ${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: item.rarity, guildId: interaction.guildId, locale: interaction.locale })}${price}\n> ${client.language({ textId: "Can be used", guildId: interaction.guildId, locale: interaction.locale })}: ${usable}\n> ${client.language({ textId: "Can be opened", guildId: interaction.guildId, locale: interaction.locale })}: ${openable}\n> ${client.language({ textId: "Can be transferred", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notTransable ? client.config.emojis.NO : client.config.emojis.YES}\n> ${client.language({ textId: "Can be dropped", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notDropable ? client.config.emojis.NO : client.config.emojis.YES}\n> ${client.language({ textId: "Can be given away", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notGiveawayable ? client.config.emojis.NO : client.config.emojis.YES}\n> ${client.language({ textId: "Can be sold on market", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notSellable ? client.config.emojis.NO : client.config.emojis.YES}\n> ${client.language({ textId: "Can be sold at auction", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notAuctionable ? client.config.emojis.NO : client.config.emojis.YES}\n> ${client.language({ textId: "Can be bet in crash", guildId: interaction.guildId, locale: interaction.locale })}: ${item.notCrashable ? client.config.emojis.NO : client.config.emojis.YES}\n> ${client.language({ textId: "Can be bet in blackjack", guildId: interaction.guildId, locale: interaction.locale })}: ${item.blackJackBan ? client.config.emojis.NO : client.config.emojis.YES}`)
	let woo = ""
	if (item.activities?.fishing?.chance && item.activities?.fishing?.amountFrom && item.activities?.fishing?.amountTo) {
		const fitems = items.filter(i => i.activities?.fishing?.chance).sort((a, b) => b.activities.fishing.chance - a.activities.fishing.chance)
		const chance = fitems.find(i => i.itemID === item.itemID).activities.fishing.chance
		woo += `\n> 🎣${client.language({ textId: "Fishing", guildId: interaction.guildId, locale: interaction.locale })} (🎲${chance}%, ${client.config.emojis.XP}${item.activities.fishing.minxp !== item.activities.fishing.maxxp ? `${item.activities.fishing.minxp}-${item.activities.fishing.maxxp}` : `${item.activities.fishing.minxp}`} ${item.activities.fishing.amountFrom !== item.activities.fishing.amountTo ? `(${item.activities.fishing.amountFrom}-${item.activities.fishing.amountTo})` :  `(${item.activities.fishing.amountFrom})`})`
	}
	if (item.activities?.mining?.chance && item.activities?.mining?.amountFrom && item.activities?.mining?.amountTo) {
		const mitems = items.filter(i => i.activities?.mining?.chance).sort((a, b) => b.activities.mining.chance - a.activities.mining.chance)
		const chance = mitems.find(i => i.itemID === item.itemID).activities.mining.chance
		woo += `\n> ⛏️${client.language({ textId: "Mining", guildId: interaction.guildId, locale: interaction.locale })} (🎲${chance}%, ${client.config.emojis.XP}${item.activities.mining.minxp !== item.activities.mining.maxxp ? `${item.activities.mining.minxp}-${item.activities.mining.maxxp}` : `${item.activities.mining.minxp}`} ${item.activities.mining.amountFrom !== item.activities.mining.amountTo ? `(${item.activities.mining.amountFrom}-${item.activities.mining.amountTo})` :  `(${item.activities.mining.amountFrom})`})`
	}
	if (item.shop.inShop && item.shop.price) {
		woo += `\n> ${client.config.emojis.shop}${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })} (${itemPriceEmoji})`
		command += `\n❓/buy ${item.name} - ${client.language({ textId: "to buy", guildId: interaction.guildId, locale: interaction.locale })}`
	}
	if (items.some(i => i.shop.inShop && i.shop.sellingPrice && i.shop.sellingPriceType == item.itemID)) {
		woo += `\n> 🪙${client.language({ textId: "Sale", guildId: interaction.guildId, locale: interaction.locale })}`
		command += `\n❓/sell <${client.language({ textId: "item", guildId: interaction.guildId, locale: interaction.locale })}> - ${client.language({ textId: "to sell", guildId: interaction.guildId, locale: interaction.locale })}`
	}
	if (item.crafts.length) {
		woo += `\n> 🛠️${client.language({ textId: "Crafting", guildId: interaction.guildId, locale: interaction.locale })} </craft:1150455841284161609>`
		command += `\n❓/craft ${item.name} - ${client.language({ textId: "to create", guildId: interaction.guildId, locale: interaction.locale })}`
	}
	let containsItems = items.filter(e => e.contains.length > 0 && e.contains.some(a => a.id == item.itemID))
	if (containsItems.length) woo += `\n> 🎊${client.language({ textId: "In case", guildId: interaction.guildId, locale: interaction.locale })}`
	if (item.activities?.voice?.chance && item.activities?.voice?.amountFrom && item.activities?.voice?.amountTo) {
		const fOrbit = items.filter(i => i.activities?.voice?.chance && i.activities?.voice?.amountFrom && i.activities?.voice?.amountTo).sort((a, b) => b.activities.voice.chance - a.activities.voice.chance)
		const chance = fOrbit.find(i => i.itemID === item.itemID).activities.voice.chance
		woo += `\n> 🔊${client.language({ textId: "In voice channel", guildId: interaction.guildId, locale: interaction.locale })} (🎲${chance}%/1${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}. ${item.activities.voice.amountFrom !== item.activities.voice.amountTo ? `(${item.activities.voice.amountFrom}-${item.activities.voice.amountTo})` :  `(${item.activities.voice.amountFrom})`})`
	}
	if (item.activities?.message?.chance && item.activities?.message?.amountFrom && item.activities?.message?.amountTo) {
		const fMessage = items.filter(i => i.activities?.message?.chance && i.activities?.message?.amountFrom && i.activities?.message?.amountTo).sort((a, b) => b.activities.message.chance - a.activities.message.chance)
		const chance = fMessage.find(i => i.itemID === item.itemID).activities.message.chance
		woo += `\n> 💬${client.language({ textId: "In text channel", guildId: interaction.guildId, locale: interaction.locale })} (🎲${chance}% ${item.activities.message.amountFrom !== item.activities.message.amountTo ? `(${item.activities.message.amountFrom}-${item.activities.message.amountTo})` :  `(${item.activities.message.amountFrom})`})`
	}
	if (item.activities?.like?.amountFrom && item.activities?.like?.amountTo) {
		woo += `\n> ❤️${client.language({ textId: "For like", guildId: interaction.guildId, locale: interaction.locale })} ${item.activities.like.amountFrom !== item.activities.like.amountTo ? `(${item.activities.like.amountFrom}-${item.activities.like.amountTo})` :  `(${item.activities.like.amountFrom})`}`
	}
	if (item.activities?.invite?.amountFrom && item.activities?.invite?.amountTo) {
		woo += `\n> ${client.config.emojis.invite}${client.language({ textId: "For invite", guildId: interaction.guildId, locale: interaction.locale })} ${item.activities.invite.amountFrom !== item.activities.invite.amountTo ? `(${item.activities.invite.amountFrom}-${item.activities.invite.amountTo})` :  `(${item.activities.invite.amountFrom})`}`
	}
	if (item.activities?.bump?.chance && item.activities?.bump?.amountFrom && item.activities?.bump?.amountTo) {
		woo += `\n> 🆙${client.language({ textId: "For bump", guildId: interaction.guildId, locale: interaction.locale })} (🎲${item.activities.bump.chance}% ${item.activities.bump.amountFrom !== item.activities.bump.amountTo ? `(${item.activities.bump.amountFrom}-${item.activities.bump.amountTo})` :  `(${item.activities.bump.amountFrom})`})`
	}
	if (item.activities?.daily) {
		for (day in item.activities.daily) {
			woo += `\n> 🕐${client.language({ textId: "For daily reward", guildId: interaction.guildId, locale: interaction.locale })} (${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} ${day.slice(3)}) ${item.activities.daily[day].amountFrom !== item.activities.daily[day].amountTo ? `(${item.activities.daily[day].amountFrom}-${item.activities.daily[day].amountTo})` :  `(${item.activities.daily[day].amountFrom})`}`
		}
	}
	if (woo !== "") embed.addFields([{ name: `${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}:`, value: woo.slice(0, 1023) }])
	embed.setFooter({ text: command + `\nID: ${item.itemID}` })
	if (item.canUse) {
		let onUse = ""
		if (item.onUse.itemResearch) {
			const unknownItem = items.find(e => e.itemID == item.onUse.itemResearch)
			if (unknownItem) {
				onUse += `\n> 📜${client.language({ textId: "Learns item", guildId: interaction.guildId, locale: interaction.locale })} ${unknownItem.displayEmoji}${unknownItem.name}`
			} else onUse += `\n> 📜${client.language({ textId: "Learns item", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.itemResearch}**`
		}
		if (item.onUse.craftResearch) {
			const unknownRecipeItem = items.find(e => e.itemID == item.onUse.craftResearch)
			if (unknownRecipeItem) {
				onUse += `\n> 📃${client.language({ textId: "Opens unknown recipe for item", guildId: interaction.guildId, locale: interaction.locale })} ${unknownRecipeItem.displayEmoji}${unknownRecipeItem.name}`
			} else onUse += `\n> 📃${client.language({ textId: "Opens unknown recipe for item", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.craftResearch}**`
		}
		onUse += item.onUse.roleAdd ? `\n> 🎭${client.language({ textId: "Role is added", guildId: interaction.guildId, locale: interaction.locale })}: <@&${item.onUse.roleAdd}> ${item.onUse.roleTimely ? `${client.language({ textId: "on", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.roleTimely >= 1440 ? `${(item.onUse.roleTimely/60/24).toFixed(1)} ${client.language({ textId: "days", guildId: interaction.guildId, locale: interaction.locale })}.` : item.onUse.roleTimely >= 60 ? `${(item.onUse.roleTimely/60).toFixed(1)} ${client.language({ textId: "h", guildId: interaction.guildId, locale: interaction.locale })}.` : `${item.onUse.roleTimely} ${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}.`}`: ""}` : ""
		onUse += item.onUse.roleDel ? `\n> 🎭${client.language({ textId: "Role is removed", guildId: interaction.guildId, locale: interaction.locale })}: <@&${item.onUse.roleDel}>` : ""
		onUse += item.onUse.trophyAdd ? `\n> ${client.config.emojis.achievements}${client.language({ textId: "Trophy is added", guildId: interaction.guildId, locale: interaction.locale })}: ${item.onUse.trophyAdd}` : ""
		onUse += item.onUse.trophyDel ? `\n> ${client.config.emojis.achievements}${client.language({ textId: "Trophy is deleted", guildId: interaction.guildId, locale: interaction.locale })}: ${item.onUse.trophyDel}` : ""
		onUse += item.onUse.message && !item.onUse.messageOnDM ? `\n> ✉️${client.language({ textId: "Message is sent to channel", guildId: interaction.guildId, locale: interaction.locale })}` : item.onUse.message && item.onUse.messageOnDM ? `\n> ✉️${client.language({ textId: "Message is sent to DM", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		if (item.onUse.deleteItemFromServer) {
			const itemDel = items.find(e => e.itemID === item.onUse.deleteItemFromServer)
			if (itemDel) {
				onUse += `\n> ❌${client.language({ textId: "Deletes from server", guildId: interaction.guildId, locale: interaction.locale })} ${itemDel.displayEmoji}**${itemDel.name}**`     
			} else onUse += `\n> ❌${client.language({ textId: "Deletes from server", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.itemDel.itemID}**` 
		}
		onUse += item.onUse.multiplier?.CUR?.time && item.onUse.multiplier?.CUR?.x ? `\n> 🪙${client.language({ textId: "Currency booster", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.multiplier.CUR.x*100}% ${client.language({ textId: "within", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, item.onUse.multiplier.CUR.time * 60 * 1000, interaction.guildId, interaction.locale)}` : ""
		onUse += item.onUse.multiplier?.XP?.time && item.onUse.multiplier?.XP?.x ? `\n> ⭐${client.language({ textId: "Experience booster", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.multiplier.XP.x*100}% ${client.language({ textId: "within", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, item.onUse.multiplier.XP.time * 60 * 1000, interaction.guildId, interaction.locale)}` : ""
		onUse += item.onUse.multiplier?.Luck?.time && item.onUse.multiplier?.Luck?.x ? `\n> 🎲${client.language({ textId: "Luck booster", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.multiplier.Luck.x*100}% ${client.language({ textId: "within", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, item.onUse.multiplier.Luck.time * 60 * 1000, interaction.guildId, interaction.locale)}` : ""
		onUse += item.onUse.multiplier?.RP?.time && item.onUse.multiplier?.RP?.x ? `\n> ${client.config.emojis.RP}${client.language({ textId: "Reputation booster", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.multiplier.RP.x*100}% ${client.language({ textId: "within", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, item.onUse.multiplier.RP.time * 60 * 1000, interaction.guildId, interaction.locale)}` : ""
		onUse += item.onUse.delCUR ? `\n> ♨️ ${client.language({ textId: "Clears currency booster", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		onUse += item.onUse.delXP ? `\n> ♨️ ${client.language({ textId: "Clears experience booster", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		onUse += item.onUse.delLuck ? `\n> ♨️ ${client.language({ textId: "Clears luck booster", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		onUse += item.onUse.delRP ? `\n> ♨️ ${client.language({ textId: "Clears reputation booster", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		onUse += item.onUse.autoIncome ? `\n> 🎭 ${client.language({ textId: "Auto role income on", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, item.onUse.autoIncome * 60 * 1000, interaction.guildId, interaction.locale)}` : ""
		if (item.onUse.addQuest || item.onUse.delQuest || item.onUse.wipeQuest) {
			const quests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled)
			if (item.onUse.addQuest) {
				const quest = quests.find(e => e.questID === item.onUse.addQuest)
				if (quest) onUse += `\n> 📓${client.language({ textId: "Adds quest", guildId: interaction.guildId, locale: interaction.locale })} **${quest.name}**`
				else onUse += `\n> 📓${client.language({ textId: "Adds quest", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.addQuest}**`
			}
			if (item.onUse.delQuest) {
				const quest = quests.find(e => e.questID === item.onUse.delQuest)
				if (quest) onUse += `\n> 📓${client.language({ textId: "Deletes quest from profile", guildId: interaction.guildId, locale: interaction.locale })} **${quest.name}**`
				else onUse += `\n> 📓${client.language({ textId: "Deletes quest from profile", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.delQuest}**`
			}
			if (item.onUse.wipeQuest) {
				const quest = quests.find(e => e.questID === item.onUse.wipeQuest)
				if (quest) onUse += `\n> 📓${client.language({ textId: "Clears quest progress", guildId: interaction.guildId, locale: interaction.locale })} **${quest.name}**`
				else onUse += `\n> 📓${client.language({ textId: "Clears quest progress", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.wipeQuest}**`
			}
		}
		onUse += item.onUse.levelAdd ? `\n> ${client.config.emojis.medal}${client.language({ textId: "Grants", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.levelAdd} ${client.language({ textId: "levels", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		onUse += item.onUse.rpAdd ? `\n> ${client.config.emojis.RP}${client.language({ textId: "Grants", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.rpAdd} ${client.language({ textId: "reputation", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		onUse += item.onUse.xpAdd ? `\n> ⭐${client.language({ textId: "Grants", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.xpAdd} ${client.language({ textId: "experience", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		onUse += item.onUse.currencyAdd ? `\n> 🪙${client.language({ textId: "Grants", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.currencyAdd} ${client.language({ textId: "currency", guildId: interaction.guildId, locale: interaction.locale })}` : ""
		if (item.onUse.itemAdd?.itemID) {
			const itemAdd = items.find(e => e.itemID === item.onUse.itemAdd.itemID)
			if (itemAdd) {
				onUse += `\n> 📦${client.language({ textId: "Grants", guildId: interaction.guildId, locale: interaction.locale })} ${itemAdd.displayEmoji}**${itemAdd.name}** (${item.onUse.itemAdd.amount})`     
			} else onUse += `\n> 📦${client.language({ textId: "Grants", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.itemAdd.itemID}** (${item.onUse.itemAdd.amount})` 
		}
		if (item.onUse.addAchievement) {
			const achievement = client.cache.achievements.find(e => e.guildID === interaction.guildId && e.enabled && e.id === item.onUse.addAchievement)
			if (achievement) {
				onUse += `\n> ${client.config.emojis.achievements}${client.language({ textId: "Grants achievement", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.displayEmoji}**${achievement.name}**`
			} else onUse += `\n> ${client.config.emojis.achievements}${client.language({ textId: "Grants achievement", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.addAchievement}**`
		}
		if (item.onUse.spawnWormhole) {
			const wormhole = client.cache.wormholes.find(e => e.wormholeID === item.onUse.spawnWormhole && e.isEnabled)
			if (wormhole) {
				onUse += `\n> 🌀${client.language({ textId: "Spawns wormhole", guildId: interaction.guildId, locale: interaction.locale })} ${wormhole.name}`      
			} else onUse += `\n> 🌀${client.language({ textId: "Spawns wormhole", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.spawnWormhole}**`
		}
		if (item.onUse.takeXP) {
			onUse += `\n> ⭐${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.takeXP} ${client.language({ textId: "experience", guildId: interaction.guildId, locale: interaction.locale })}`
		}
		if (item.onUse.takeCUR) {
			onUse += `\n> 🪙${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.takeCUR} ${client.language({ textId: "currency", guildId: interaction.guildId, locale: interaction.locale })}`
		}
		if (item.onUse.takeRP) {
			onUse += `\n> ${client.config.emojis.RP}${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.takeRP} ${client.language({ textId: "reputation", guildId: interaction.guildId, locale: interaction.locale })}`
		}
		if (item.onUse.takeLevel) {
			onUse += `\n> ${client.config.emojis.medal}${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} ${item.onUse.takeLevel} ${client.language({ textId: "levels", guildId: interaction.guildId, locale: interaction.locale })}`
		}
		if (item.onUse.takeItem?.itemID) {
			const itemTake = items.find(e => e.itemID === item.onUse.takeItem.itemID)
			if (itemTake) {
				onUse += `\n> 📦${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} ${itemTake.displayEmoji}**${itemTake.name}** (${item.onUse.takeItem.amount})`     
			} else onUse += `\n> 📦${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.takeItem.itemID}** (${item.onUse.takeItem.amount})` 
		}
		if (onUse !== "") embed.addFields([{ name: `${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}:`, value: onUse.slice(0, 1023) }])
	}
	if (contains.length > 0) {
		containsItems = ""
		contains.sort((a, b) => b.chance - a.chance)
		let index = 0
		for (let e of contains) {
			index++
			let amount = ""
			if (e.amountFrom !== e.amountTo) amount = `${e.amountFrom}-${e.amountTo}`
			else if (e.amountFrom >= 1) amount = `${e.amountTo}`
			if (e.type === RewardType.SteamGame) {
				containsItems += `\n> #${index} ${client.config.emojis.Steam}**${client.language({ textId: "Random game", guildId: interaction.guildId, locale: interaction.locale })}** (${e.amountFrom}-${e.amountTo} ${client.language({ textId: e.currency, guildId: interaction.guildId, locale: interaction.locale })}) (🎲${e.chance}%)`
			} else if (e.type === RewardType.Currency) containsItems += `\n> #${index} ${settings.displayCurrencyEmoji}${settings.currencyName} (${amount}) (🎲${e.chance}%)`
			else if (e.type === RewardType.Experience) containsItems += `\n> #${index} ${client.config.emojis.XP}XP (${amount}) (🎲${e.chance}%)`
			else if (e.type === RewardType.Role) containsItems += `\n> #${index} <@&${e.id}>${e.ms ? ` [${client.functions.transformSecs(client, e.ms, interaction.guildId, interaction.locale)}]` : ``} (${amount}) (🎲${e.chance}%)`
			else {
				i = items.find(i => i.itemID === e.id)
				if (i) {
					containsItems += `\n> #${index} ${i.displayEmoji}${i.name} (${amount}) (🎲${e.chance}%)`
				}
				
			}
		}
		if (item.open_mode === "single") {
			const sum = contains.reduce((prev, current) => prev.plus(current.chance), new Decimal(0))
			if (sum < 100) {
				const nothing = new Decimal(100).minus(sum)
				containsItems += `\n> ${client.language({ textId: "Nothing", guildId: interaction.guildId, locale: interaction.locale })} (${client.config.emojis.random}${nothing}%)`
			}    
		} else if (item.open_mode === "multiple" && contains[0].chance < 100) {
			const nothing = new Decimal(100).minus(contains[0].chance)
			containsItems += `\n> ${client.language({ textId: "Nothing", guildId: interaction.guildId, locale: interaction.locale })} (${client.config.emojis.random}${nothing}%)`
		}
		if (containsItems.length) embed.addFields([{ name: `${client.language({ textId: "Inside", guildId: interaction.guildId, locale: interaction.locale })}:`, value: containsItems.slice(0, 1023) }])
	}
	if (items.some(i => i.shop.inShop && i.shop.sellingPriceType == item.itemID && i.shop.sellingPrice)) {
		let sellingItems = ""
		let shopItems = items.filter(i => i.shop.inShop && i.shop.sellingPriceType == item.itemID)
		for (const i of shopItems) {
			sellingItems += `\n> ${i.displayEmoji}${i.name} (${item.displayEmoji}${i.shop.sellingPrice})`
		}
		embed.addFields([{ name: `${client.language({ textId: "Sale", guildId: interaction.guildId, locale: interaction.locale })}:`, value: sellingItems.slice(0, 1023) }])
	}
	return embed
}
function transformSecs(client, duration, guildId, locale) {
	let ms = parseInt((duration % 1000) / 100),
	secs = Math.floor((duration / 1000) % 60),
	mins = Math.floor((duration / (1000 * 60)) % 60),
	hrs = Math.floor((duration / (1000 * 60 * 60)) % 24)
	days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 30)
	if (days) return `${days} ${client.language({ textId: "days", guildId: guildId, locale: locale })}. ${hrs} ${client.language({ textId: "HOURS_SMALL", guildId: guildId, locale: locale })}. ${mins} ${client.language({ textId: "minutes", guildId: guildId, locale: locale })}. ${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`
	if (!days) return `${hrs} ${client.language({ textId: "HOURS_SMALL", guildId: guildId, locale: locale })}. ${mins} ${client.language({ textId: "minutes", guildId: guildId, locale: locale })}. ${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`
	if (!hrs) return `${mins} ${client.language({ textId: "minutes", guildId: guildId, locale: locale })}. ${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`
	if (!mins) return `${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`
}