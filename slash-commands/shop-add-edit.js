const { ApplicationCommandOptionType, Collection } = require("discord.js")
module.exports = {
    name: 'shop-add-edit',
    nameLocalizations: {
        'ru': `shop-add-edit`,
        'uk': `shop-add-edit`,
        'es-ES': `tienda-agregar-editar`
    },
    description: 'Add or edit an item in shop',
    descriptionLocalizations: {
        'ru': `Добавить или изменить предмет в магазине`,
        'uk': `Додати або змінити предмет у магазині`,
        'es-ES': `Agregar o editar un objeto en la tienda`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': `item`,
                'uk': `item`,
                'es-ES': `objeto`
            },
            description: 'An item name to add or edit',
            descriptionLocalizations: {
                'ru': `Имя предмета для добавления или изменения`,
                'uk': `Назва предмета для додавання або зміни`,
                'es-ES': `Nombre del objeto para agregar o editar`
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
        {
            name: 'price',
            nameLocalizations: {
                'ru': `price`,
                'uk': `price`,
                'es-ES': `precio`
            },
            description: 'An item price in shop',
            descriptionLocalizations: {
                'ru': `Цена предмета в магазине`,
                'uk': `Ціна предмета в магазині`,
                'es-ES': `Precio del objeto en la tienda`
            },
            type: ApplicationCommandOptionType.Number,
            required: true
        },
        {
            name: 'price_type',
            nameLocalizations: {
                'ru': `price_type`,
                'uk': `price_type`,
                'es-ES': `tipo_precio`
            },
            description: 'Currency of price. Enter name of item or leave blank for guild currency',
            descriptionLocalizations: {
                'ru': `Тип цены предмета. Введи имя предмета, чтобы установить его ценой`,
                'uk': `Тип ціни предмета. Введіть назву предмета, щоб встановити його ціною`,
                'es-ES': `Moneda del precio. Ingrese el nombre del objeto o deje en blanco para la moneda del gremio`
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'amount',
            nameLocalizations: {
                'ru': `amount`,
                'uk': `amount`,
                'es-ES': `cantidad`
            },
            description: 'An amount of items in shop',
            descriptionLocalizations: {
                'ru': `Количество предметов в магазине`,
                'uk': `Кількість предметів у магазині`,
                'es-ES': `Cantidad de objetos en la tienda`
            },
            type: ApplicationCommandOptionType.Integer,
            required: false
        },
        {
            name: 'can_discount',
            nameLocalizations: {
                'ru': `can_discount`,
                'uk': `can_discount`,
                'es-ES': `descuento`
            },
            description: 'Discount on item based on reputation (RP)',
            descriptionLocalizations: {
                'ru': `Скидка на предмет в зависимости от репутации (RP)`,
                'uk': `Знижка на предмет залежно від репутації (RP)`,
                'es-ES': `Descuento en el objeto basado en reputación (RP)`
            },
            type: ApplicationCommandOptionType.Boolean,
            required: false
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `shop-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.isChatInputCommand()) await interaction.deferReply()
        const settings = client.cache.settings.get(interaction.guildId) || await client.functions.fetchSettings(client, interaction.guildId)
        let amount = !args.amount || args.amount < 0 ? 0 : args.amount
        const canDiscount = args.can_discount ? args.can_discount : false
        if (interaction.isChatInputCommand() && args.item && args.item.length < 2) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}` })  
        }
        const filteredItems = client.cache.items.filter(e => e.name.toLowerCase().includes(args.item.toLowerCase()) && !e.temp && e.guildID === interaction.guildId)
        if (filteredItems.size > 1 && !filteredItems.some(e => interaction.isStringSelectMenu() ? e.itemID.toLowerCase() === interaction.values[0] : e.name.toLowerCase() === args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            return interaction.editReply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}` })  
        }
        const shop_item = filteredItems.some(e => e.name.toLowerCase() === args.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === args.item.toLowerCase()) : filteredItems.first()
        if (!shop_item) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item does not exist or is disabled. To create an item use command", guildId: interaction.guildId, locale: interaction.locale })} **/manager-items**` })
        }
        if (args.price < 0) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item price cannot be less than zero", guildId: interaction.guildId, locale: interaction.locale })}` })
        }
        const priceType = !args.price_type ? "currency" : client.cache.items.find(e => e.name === args.price_type && e.enabled && !e.temp && e.guildID === interaction.guildId)
        if (!priceType) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item with name", guildId: interaction.guildId, locale: interaction.locale })} **${args.price_type}** ${client.language({ textId: "does not exist or is invisible. To create an item use command", guildId: interaction.guildId, locale: interaction.locale })} **/manager-items**` })
        }
        if (shop_item.itemID === (!args.price_type ? false : priceType.itemID)) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Cannot set price type that is the same item, choose another price type besides", guildId: interaction.guildId, locale: interaction.locale })} **${shop_item.name}**.` })
        const add = shop_item.shop.inShop ? false : true
        shop_item.shop.priceType = !args.price_type ? "currency" : priceType.itemID
        shop_item.shop.price = args.price
        shop_item.shop.amount = amount
        shop_item.shop.inShop = true
        shop_item.shop.canDiscount = canDiscount
        await shop_item.save()
        let content = add ? `${client.config.emojis.YES} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${shop_item.displayEmoji}**${shop_item.name}** ${client.language({ textId: "was added to shop", guildId: interaction.guildId, locale: interaction.locale })}:\n` : `${client.config.emojis.YES} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${shop_item.displayEmoji}**${shop_item.name}** ${client.language({ textId: "was edited in shop", guildId: interaction.guildId, locale: interaction.locale })}:\n`
        content += `> ${client.language({ textId: "Price", guildId: interaction.guildId, locale: interaction.locale })}: ${!args.price_type ? settings.displayCurrencyEmoji : priceType.displayEmoji}${args.price}\n> ${client.language({ textId: "Amount in shop", guildId: interaction.guildId, locale: interaction.locale })}: ${amount}\n> ${client.language({ textId: "Discount based on reputation", guildId: interaction.guildId, locale: interaction.locale })}: ${canDiscount ? client.config.emojis.YES : client.config.emojis.NO }`
        return interaction.editReply({ content: content })
    }
}
