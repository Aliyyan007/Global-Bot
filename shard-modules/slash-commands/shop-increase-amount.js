const { ApplicationCommandOptionType, Collection } = require("discord.js")
module.exports = {
    name: 'shop-increase-amount',
    nameLocalizations: {
        'ru': `магазин-увеличить-количество`,
        'uk': `магазин-збільшити-кількість`,
        'es-ES': `tienda-aumentar-cantidad`
    },
    description: 'Increase amount of an item in shop',
    descriptionLocalizations: {
        'ru': `Увеличить количество предметов в магазине`,
        'uk': `Збільшити кількість предметів у магазині`,
        'es-ES': `Aumentar la cantidad de un objeto en la tienda`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': `предмет`,
                'uk': `предмет`,
                'es-ES': `objeto`
            },
            description: 'Name of the item to increase amount',
            descriptionLocalizations: {
                'ru': `Название предмета, для которого хотите добавить количество`,
                'uk': `Назва предмета, для якого хочете додати кількість`,
                'es-ES': `Nombre del objeto para aumentar la cantidad`
            },
            minLength: 2,
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
            description: 'An amount of items to increase in shop',
            descriptionLocalizations: {
                'ru': `Количество предметов для увеличения в магазине`,
                'uk': `Кількість предметів для збільшення в магазині`,
                'es-ES': `Cantidad de objetos para aumentar en la tienda`
            },
            type: ApplicationCommandOptionType.Integer,
            required: true
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `shop-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.isChatInputCommand()) await interaction.deferReply()
        let amount = args.amount < 1 ? 1 : args.amount
        if (interaction.isChatInputCommand() && args.item && args.item.length < 2) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}` })  
        }
        const filteredItems = client.cache.items.filter(e => e.name.toLowerCase().includes(args.item.toLowerCase()) && e.guildID === interaction.guildId)
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
        if (!shop_item.shop.inShop) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${shop_item.displayEmoji}**${shop_item.name}** ${client.language({ textId: "is not in shop. To add item to shop use command", guildId: interaction.guildId, locale: interaction.locale })} **/shop-add-edit**` })
        }
        shop_item.shop.amount += amount
        await shop_item.save()
        return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Added to shop", guildId: interaction.guildId, locale: interaction.locale })} ${shop_item.displayEmoji}${amount}` })
    }
}