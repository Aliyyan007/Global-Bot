const { ApplicationCommandOptionType, Collection, EmbedBuilder } = require("discord.js")
const { AchievementType } = require("../enums")
const { default: Decimal } = require("decimal.js")
const amountRegexp = /amount{(.*?)}/
const itemRegexp = /item{(.*?)}/
module.exports = {
    name: 'sell',
    nameLocalizations: {
        'ru': `продать`,
        'uk': `продати`,
        'es-ES': `vender`
    },
    description: 'Sell an item',
    descriptionLocalizations: {
        'ru': `Продать предмет`,
        'uk': `Продати предмет`,
        'es-ES': `Vender un objeto`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': `предмет`,
                'uk': `предмет`,
                'es-ES': `objeto`
            },
            description: 'An item name to sell',
            descriptionLocalizations: {
                'ru': `Имя предмета для продажи`,
                'uk': `Назва предмета для продажу`,
                'es-ES': `Nombre del objeto para vender`
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
            description: 'An amount of items to sell',
            descriptionLocalizations: {
                'ru': `Количество предметов для продажи`,
                'uk': `Кількість предметів для продажу`,
                'es-ES': `Cantidad de objetos para vender`
            },
            type: ApplicationCommandOptionType.Integer,
            required: false
        }
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
        if (interaction.isButton()) {
            args = {}
            if (!itemRegexp.exec(interaction.customId)) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Missing argument", guildId: interaction.guildId, locale: interaction.locale })}: item{itemId}**`, flags: ["Ephemeral"] })
            const itemName = client.cache.items.get(itemRegexp.exec(interaction.customId)[1])?.name
            if (!itemName) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] }) 
            args.item = itemName
            if (!amountRegexp.exec(interaction.customId)) args.amount = 1
            else args.amount = +amountRegexp.exec(interaction.customId)[1]
        }
        let amount = !args.amount || args.amount < 1 ? 1 : args.amount
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if (profile.rp > 1000) profile.rp = 1000 - profile.rp
        const settings = client.cache.settings.get(interaction.guildId)
        if (args.item.length < 2) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })  
        }
        const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.name.toLowerCase().includes(args.item.toLowerCase()) && profile.inventory.some(x => x.itemID == e.itemID))
        if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })   
        }
        let userItem
        let serverItem
        if (filteredItems.some(e => e.name.toLowerCase() === args.item.toLowerCase())) {
            serverItem = filteredItems.find(e => e.name.toLowerCase() === args.item.toLowerCase())
            if (!serverItem) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            userItem = profile.inventory.find(e => { return e.itemID == serverItem.itemID && e.amount > 0 })
        } else {
            serverItem = filteredItems.first()
            if (!serverItem) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            userItem = profile.inventory.find(e => { return e.itemID == serverItem.itemID && e.amount > 0})
        }
        if (!userItem) {
            return interaction.reply({ content: `‼ ${client.language({ textId: "You don't have this item in inventory", guildId: interaction.guildId, locale: interaction.locale })}: **${serverItem.displayEmoji}${serverItem.name}**`, flags: ["Ephemeral"] })
        }
        if ((!serverItem.shop.sellingPrice && !serverItem.shop.cryptoSellingPrice) || !serverItem.shop.sellingPriceType) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.displayEmoji}**${serverItem.name}** ${client.language({ textId: "cannot be sold", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
        }
        if (serverItem.sellPermission && client.cache.permissions.some(e => e.id === serverItem.sellPermission)) {
            const permission = client.cache.permissions.find(e => e.id === serverItem.sellPermission)
            const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
            if (isPassing.value === false) {
                return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
            }
        }
        const serverSellingItemEmoji = serverItem.shop.sellingPriceType == "currency" ? settings.displayCurrencyEmoji : client.cache.items.find(i => i.itemID == serverItem.shop.sellingPriceType && !i.temp && i.enabled)?.displayEmoji
        const userItemAmount = userItem.amount === undefined ? 1 : userItem.amount
        if (amount > userItemAmount) amount = userItemAmount
        if (amount < serverItem.min_sell || (serverItem.max_sell ? amount > serverItem.max_sell : false)) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Sell amount range for this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.min_sell}${serverItem.max_sell ? ` ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.max_sell}` : ""}`, flags: ["Ephemeral"] })  
        }
        if (profile.itemsCooldowns && profile.itemsCooldowns.get(serverItem.itemID)?.sell > new Date()) {
            return interaction.reply({ content: `⏳${client.language({ textId: "Wait for cooldown on this item", guildId: interaction.guildId, locale: interaction.locale })}: ${transformSecs(client, profile.itemsCooldowns.get(serverItem.itemID).sell - new Date(), interaction.guildId, interaction.locale)}`, flags: ["Ephemeral"] })
        }
        await interaction.deferReply({ flags: ["Ephemeral"] })
        const shopItem = client.cache.items.find(e => e.itemID === userItem.itemID && e.shop.inShop)
        if (shopItem) {
            shopItem.shop.amount += amount
            await shopItem.save()
        }
        userItem.amount -= amount
        let price = serverItem.shop.cryptoSellingPrice ? await fetch(`https://api.coinbase.com/v2/prices/${serverItem.shop.cryptoSellingPrice}/sell`).then(response => response.json().then(response => response.data.amount * serverItem.shop.cryptoSellingPriceMultiplier)).catch(err => NaN) : serverItem.shop.sellingPrice
        if (serverItem.shop.sellingDiscount) price = (price * (1 - profile.rp / 2000)) * amount
        else price = price * amount
        if (!price) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Error getting price", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        if (serverItem.shop.sellingPriceType !== "currency") {
            await profile.addItem(serverItem.shop.sellingPriceType, price)
        } else await profile.addCurrency(price)
        await profile.addQuestProgression("itemsSold", amount, userItem.itemID)
        profile.itemsSold = +`${new Decimal(profile.itemsSold).plus(amount)}`
        if (serverItem.cooldown_sell) {
            if (!profile.itemsCooldowns) profile.itemsCooldowns = new Map()
            if (profile.itemsCooldowns.get(serverItem.itemID)) profile.itemsCooldowns.set(serverItem.itemID, {...profile.itemsCooldowns.get(serverItem.itemID), sell: new Date(Date.now() + serverItem.cooldown_sell * 1000) })
            else profile.itemsCooldowns.set(serverItem.itemID, { sell: new Date(Date.now() + serverItem.cooldown_sell * 1000) })
        }
        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.ItemsSold)
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.itemsSold >= achievement.amount && !client.tempAchievements[interaction.user.id]?.includes(achievement.id)) { 
                if (!client.tempAchievements[interaction.user.id]) client.tempAchievements[interaction.user.id] = []
                client.tempAchievements[interaction.user.id].push(achievement.id)
                await profile.addAchievement(achievement)
            }
        }))
        await profile.save()
        client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "sold item", guildId: interaction.guildId })} ${serverItem.displayEmoji}**${serverItem.name}** (${serverItem.itemID}) (${amount})`)
        return interaction.editReply({ content: `<@${interaction.user.id}>, ${client.language({ textId: "you", guildId: interaction.guildId, locale: interaction.locale })} ${profile.sex === "male" ? `${client.language({ textId: "sold (male)", guildId: interaction.guildId, locale: interaction.locale })}` : profile.sex === "female" ? `${client.language({ textId: "sold (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "sold (neutral)", guildId: interaction.guildId, locale: interaction.locale })}`} ${serverItem.displayEmoji}**${serverItem.name}** (${amount}) ${client.language({ textId: "for", guildId: interaction.guildId, locale: interaction.locale })} ${serverSellingItemEmoji}${!price.toString().split('.')[1] ? price : price.toString().split('.')[1].length == 1 ? price.toFixed(1) : price.toFixed(2)}.`, flags: ["Ephemeral"] })
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
            if (!secs) return `${ms} ${client.language({ textId: "milliseconds", guildId: guildId, locale: locale })}.`
        }
    }
}