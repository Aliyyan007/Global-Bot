const { ApplicationCommandOptionType, Collection } = require("discord.js")
module.exports = {
    name: 'shop-del',
    nameLocalizations: {
        'ru': `магазин-удалить-предмет`,
        'uk': `магазин-видалити-предмет`,
        'es-ES': `tienda-eliminar-objeto`
    },
    description: 'Delete an item from the shop',
    descriptionLocalizations: {
        'ru': `Удалить предмет из магазина`,
        'uk': `Видалити предмет з магазину`,
        'es-ES': `Eliminar un objeto de la tienda`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': `предмет`,
                'uk': `предмет`,
                'es-ES': `objeto`
            },
            description: 'Name of the item to delete from shop',
            descriptionLocalizations: {
                'ru': `Название предмета для удаления из магазина`,
                'uk': `Назва предмета для видалення з магазину`,
                'es-ES': `Nombre del objeto para eliminar de la tienda`
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `shop-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.isChatInputCommand()) await interaction.deferReply()
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
            return interaction.editReply({ content: `${client.config.emojis.NO} ${shop_item.displayEmoji}**${shop_item.name}** ${client.language({ textId: "is not in shop", guildId: interaction.guildId, locale: interaction.locale })}` })
        }
        shop_item.shop.priceType = undefined
        shop_item.shop.price = undefined
        shop_item.shop.amount = undefined
        shop_item.shop.inShop = false
        shop_item.shop.canDiscount = false
        await shop_item.save()
        return interaction.editReply({ content: `${client.config.emojis.YES} ${shop_item.displayEmoji}**${shop_item.name}** ${client.language({ textId: "was removed from shop", guildId: interaction.guildId, locale: interaction.locale })}` })
    }
}