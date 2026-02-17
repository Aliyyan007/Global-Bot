const { ApplicationCommandOptionType, StringSelectMenuBuilder, ActionRowBuilder, Collection } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
module.exports = {
    name: 'fav',
    nameLocalizations: {
        'ru': `избранное`,
        'uk': `обране`,
        'es-ES': `favoritos`
    },
    description: 'Add/remove an item from favorites',
    descriptionLocalizations: {
        'ru': `Добавить/удалить предмет из избранного`,
        'uk': `Додати/видалити предмет з обраного`,
        'es-ES': `Añadir/eliminar un objeto de favoritos`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': 'предмет',
                'uk': 'предмет',
                'es-ES': 'objeto'
            },
            description: 'Name of item',
            descriptionLocalizations: {
                'ru': 'Имя предмета',
                'uk': 'Назва предмета',
                'es-ES': 'Nombre del objeto'
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
    ],
    dmPermission: false,
    group: `inventory-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if (args.item && args.item.length < 2) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}` })  
        }
        const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && profile.inventory.some(x => x.itemID == e.itemID) && e.name.toLowerCase().includes(args.item.toLowerCase()))
        if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() == args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            return interaction.editReply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}` }) 
        }
        let favItem
        let guildItem
        if (filteredItems.some(e => e.name.toLowerCase() === args.item.toLowerCase())) {
            guildItem = filteredItems.find(e => e.name.toLowerCase() === args.item.toLowerCase())
            if (!guildItem) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.` })  
            favItem = profile.inventory.find(e => { return e.itemID == guildItem.itemID })
        } else {
            guildItem = filteredItems.first()
            if (!guildItem) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.` })  
            favItem = profile.inventory.find(e => { return e.itemID == guildItem.itemID })
        }
        if (!favItem) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No such item in inventory", guildId: interaction.guildId, locale: interaction.locale })}.` })  
        }
        let content
        if (!favItem.fav) {
            favItem.fav = true
            await profile.save()
            content  = `${client.config.emojis.XP} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${guildItem.displayEmoji}**${guildItem.name}** ${client.language({ textId: "added to favorites", guildId: interaction.guildId, locale: interaction.locale })}.`
        } else {
            favItem.fav = undefined
            await profile.save()
            content = `${client.config.emojis.NO}${client.config.emojis.XP} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${guildItem.displayEmoji}**${guildItem.name}** ${client.language({ textId: "removed from favorites", guildId: interaction.guildId, locale: interaction.locale })}.`
        }
        return interaction.editReply({ content: content })
    }
}