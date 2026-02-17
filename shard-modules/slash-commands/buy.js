const { ApplicationCommandOptionType, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { AchievementType } = require("../enums")
const amountRegexp = /amount{(.*?)}/
const itemRegexp = /item{(.*?)}/
const price_typeRegexp = /price_type{(.*?)}/
const priceRegexp = /price{(.*?)}/
module.exports = {
    name: 'buy',
    nameLocalizations: {
        'ru': 'купить',
        'uk': 'купити',
        'es-ES': 'comprar'
    },
    description: 'Buy an item from the shop',
    descriptionLocalizations: {
        'ru': 'Купить предмет из магазина',
        'uk': 'Купити предмет з магазину',
        'es-ES': 'Comprar un objeto de la tienda'
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': 'предмет',
                'uk': 'предмет',
                'es-ES': 'objeto'
            },
            description: 'Item name to buy',
            descriptionLocalizations: {
                'ru': 'Название предмета для покупки',
                'uk': 'Назва предмета для покупки',
                'es-ES': 'Nombre del objeto a comprar'
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
        {
            name: 'amount',
            nameLocalizations: {
                'ru': 'количество',
                'uk': 'кількість',
                'es-ES': 'cantidad'
            },
            description: 'Amount of items to buy',
            descriptionLocalizations: {
                'ru': 'Количество предметов для покупки',
                'uk': 'Кількість предметів для покупки',
                'es-ES': 'Cantidad de objetos a comprar'
            },
            type: ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 1,
            max_value: 100000
        }
    ],
    dmPermission: false,
    group: `shop-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        let priceType
        let price
        let ignorePermissions = false
        let discount = true
        let limits = true
        if (interaction.isButton()) {
            args = {}
            if (!itemRegexp.exec(interaction.customId)) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Missing argument", guildId: interaction.guildId, locale: interaction.locale })}: item{itemId}**`, flags: ["Ephemeral"] })
            const itemName = client.cache.items.get(itemRegexp.exec(interaction.customId)[1])?.name
            if (!itemName) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] }) 
            args.item = itemName
            if (!amountRegexp.exec(interaction.customId)) args.amount = 1
            else args.amount = +amountRegexp.exec(interaction.customId)[1]
            if (price_typeRegexp.exec(interaction.customId)) priceType = price_typeRegexp.exec(interaction.customId)[1]
            if (priceRegexp.exec(interaction.customId)) price = +priceRegexp.exec(interaction.customId)[1]
            if (interaction.customId.includes("prms-off")) ignorePermissions = true
            if (interaction.customId.includes("dscnt-off")) discount = false
            if (interaction.customId.includes("limits-off")) limits = false
        }
        const { guild } = interaction
        const settings = client.cache.settings.get(guild.id)
        let amount = !args.amount || args.amount < 1 ? 1 : args.amount
        if (amount > 100000) amount = 100000
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const globalUser = await client.globalProfileSchema.findOne({ userID: interaction.user.id })
        if (profile.rp > 1000) profile.rp = 1000 - profile.rp
        if (profile.rp < -1000) profile.rp = Math.abs(profile.rp - -1000)
        let shopItem
        if (args.item.length < 2) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })  
        }
        const filteredItems = client.cache.items.filter(e => (interaction.isButton() ? e.name.toLowerCase() === args.item.toLowerCase() : e.name.toLowerCase().includes(args.item.toLowerCase())) && (interaction.customId?.includes("ignr-shop") ? true : e.shop.inShop && e.found) && e.guildID === interaction.guildId && !e.temp && e.enabled)
        if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() == args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })  
            else return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })  
        }
        shopItem = filteredItems.some(e => e.name.toLowerCase() == args.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() == args.item.toLowerCase()) : filteredItems.first()
        //ЕСЛИ В МАГАЗИНЕ НЕТ ПРЕДМЕТА
        if (!shopItem) {
            if (interaction.replied || interaction.deferred) return interaction.editReply({ content: `‼ ${client.language({ textId: "This item does not exist in shop", guildId: interaction.guildId, locale: interaction.locale })}: **${args.item}**`, flags: ["Ephemeral"] })
            else return interaction.reply({ content: `‼ ${client.language({ textId: "This item does not exist in shop", guildId: interaction.guildId, locale: interaction.locale })}: **${args.item}**`, flags: ["Ephemeral"] })
        }
        const emoji = shopItem.displayEmoji
        if (!interaction.customId?.includes("ignr-shop") && shopItem.shop.amount < amount) return interaction.reply({ content: `‼ ${client.language({ textId: "In shop", guildId: interaction.guildId, locale: interaction.locale })} ${emoji}**${shopItem.name}**: ${shopItem.shop.amount} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
        if (!ignorePermissions && shopItem.buyPermission && client.cache.permissions.some(e => e.id === shopItem.buyPermission)) {
            const permission = client.cache.permissions.find(e => e.id === shopItem.buyPermission)
            const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
            if (isPassing.value === false) {
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                else return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
            }
        }   
        if (amount > shopItem.shop.amount && shopItem.shop.amount > 0) amount = shopItem.shop.amount
        if (!priceType) priceType = shopItem.shop.priceType
        if ((!price || price < 0) && (shopItem.shop.price || shopItem.shop.cryptoPrice)) price = shopItem.shop.cryptoPrice ? await fetch(`https://api.coinbase.com/v2/prices/${shopItem.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * shopItem.shop.cryptoPriceMultiplier)).catch(err => NaN) : shopItem.shop.price
        else if (!price || price < 0) price = 1
        else if (price > 100000000) price = 100000000
        if (!price) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Error getting price", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        let serverPriceItemEmoji
        if (client.cache.items.find(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.itemID === priceType)) serverPriceItemEmoji = client.cache.items.find(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.itemID === priceType).displayEmoji
        else if (priceType === "currency") serverPriceItemEmoji = settings.displayCurrencyEmoji
        else if (priceType === "cookie") serverPriceItemEmoji = "🍪"
        else serverPriceItemEmoji = "❓"
        let spent = 0
        if (shopItem.shop.canDiscount && discount) spent = (price * (1 - profile.rp / 2000)) * amount
        else spent = price * amount
        //ЕСЛИ НЕ ХВАТАЕТ ВАЛЮТЫ
        const priceItem = profile.inventory.find((element) => { return element.itemID == priceType })
        if (priceType === "currency") {
            if (profile.currency < spent) {
                return interaction.reply({ content: `‼ ${client.language({ textId: "Cost", guildId: interaction.guildId, locale: interaction.locale })} ${emoji}${shopItem.name} (${amount}): ${serverPriceItemEmoji}${shopItem.shop.canDiscount ? (price * (1 - profile.rp / 2000)) * amount : price * amount}. ${client.language({ textId: "You only have", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.displayCurrencyEmoji}${!profile.currency.toString().split('.')[1] ? profile.currency : profile.currency.toString().split('.')[1].length == 1 ?  profile.currency.toFixed(1) : profile.currency.toFixed(2)}`, flags: ["Ephemeral"] })
            }
        } else {
            if (!priceItem || priceItem.amount < spent) {
                return interaction.reply({ content: `‼ ${client.language({ textId: "Cost", guildId: interaction.guildId, locale: interaction.locale })} ${emoji}${shopItem.name} (${amount}): ${serverPriceItemEmoji}${shopItem.shop.canDiscount ? (price * (1 - profile.rp / 2000)) * amount : price * amount}. ${client.language({ textId: "You only have", guildId: interaction.guildId, locale: interaction.locale })}: ${serverPriceItemEmoji}${priceItem ? !priceItem.amount.toString().split('.')[1] ? priceItem.amount : priceItem.amount.toString().split('.')[1].length === 1 ? priceItem.amount.toFixed(1) : priceItem.amount.toFixed(2) : 0}`, flags: ["Ephemeral"] })
            }
        }
        const limitDescription = []
        if (limits) {
            if (shopItem.shop.monthlyShopping) {
                if (((profile.monthlyLimits && profile.monthlyLimits[shopItem.itemID]) || 0) + amount > shopItem.shop.monthlyShopping) {
                    return interaction.reply({ content: `${client.language({ textId: "Monthly purchase limit for this item", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.monthlyShopping}**. ${client.language({ textId: "Remaining limit", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.monthlyShopping - (profile.monthlyLimits?.[shopItem.itemID] || 0) < 0 ? 0 : shopItem.shop.monthlyShopping - (profile.monthlyLimits?.[shopItem.itemID] || 0)}**.`, flags: ["Ephemeral"] })
                }
            }
            if (shopItem.shop.weeklyShopping) {
                if (((profile.weeklyLimits && profile.weeklyLimits[shopItem.itemID]) || 0) + amount > shopItem.shop.weeklyShopping) {
                    return interaction.reply({ content: `${client.language({ textId: "Weekly purchase limit for this item", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.weeklyShopping}**. ${client.language({ textId: "Remaining limit", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.weeklyShopping - (profile.weeklyLimits?.[shopItem.itemID] || 0) < 0 ? 0 : shopItem.shop.weeklyShopping - (profile.weeklyLimits?.[shopItem.itemID] || 0)}**.`, flags: ["Ephemeral"] })
                }
            }
            if (shopItem.shop.dailyShopping) {
                if (((profile.dailyLimits && profile.dailyLimits[shopItem.itemID]) || 0) + amount > shopItem.shop.dailyShopping) {
                    return interaction.reply({ content: `${client.language({ textId: "Daily purchase limit for this item", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.dailyShopping}**. ${client.language({ textId: "Remaining limit", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.dailyShopping - (profile.dailyLimits?.[shopItem.itemID] || 0) < 0 ? 0 : shopItem.shop.dailyShopping - (profile.dailyLimits?.[shopItem.itemID] || 0)}**.`, flags: ["Ephemeral"] })
                }
            }    
        }
        await interaction.deferReply({ flags: ["Ephemeral"] })
        await profile.addItem(shopItem.itemID, amount)
        if (shopItem.shop.monthlyShopping) {
            if (!profile.monthlyLimits || profile.monthlyLimits[shopItem.itemID] === undefined) {
                if (!profile.monthlyLimits) profile.monthlyLimits = {}
                profile.monthlyLimits[shopItem.itemID] = 0
            }
            profile.monthlyLimits[shopItem.itemID] += amount
            limitDescription.push(`${client.language({ textId: "Remaining monthly limit", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.monthlyShopping - profile.monthlyLimits[shopItem.itemID] < 0 ? 0 : shopItem.shop.monthlyShopping - profile.monthlyLimits[shopItem.itemID]}**`)
        }
        if (shopItem.shop.weeklyShopping) {
            if (!profile.weeklyLimits || profile.weeklyLimits[shopItem.itemID] === undefined) {
                if (!profile.weeklyLimits) profile.weeklyLimits = {}
                profile.weeklyLimits[shopItem.itemID] = 0
            }
            profile.weeklyLimits[shopItem.itemID] += amount
            limitDescription.push(`${client.language({ textId: "Remaining weekly limit", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.weeklyShopping - profile.weeklyLimits[shopItem.itemID] < 0 ? 0 : shopItem.shop.weeklyShopping - profile.weeklyLimits[shopItem.itemID]}**`)
        }
        if (shopItem.shop.dailyShopping) {
            if (!profile.dailyLimits || profile.dailyLimits[shopItem.itemID] === undefined) {
                if (!profile.dailyLimits) profile.dailyLimits = {}
                profile.dailyLimits[shopItem.itemID] = 0
            }
            profile.dailyLimits[shopItem.itemID] += amount
            limitDescription.push(`${client.language({ textId: "Remaining daily limit", guildId: interaction.guildId, locale: interaction.locale })}: **${shopItem.shop.dailyShopping - profile.dailyLimits[shopItem.itemID] < 0 ? 0 : shopItem.shop.dailyShopping - profile.dailyLimits[shopItem.itemID]}**`)
        }
        if (priceType === "currency") {
            await profile.subtractCurrency(spent)
        } else {
            await profile.subtractItem(priceType, spent)
        }
        if (shopItem.shop.inShop && shopItem.shop.amount >= amount) {
            shopItem.shop.amount -= amount
            await shopItem.save().catch(e => console.error(e))    
        }
        await profile.addQuestProgression("itemsBoughtInShop", amount, shopItem.itemID)
        profile.itemsBoughtInShop += amount
        client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "bought item", guildId: interaction.guildId })} ${shopItem.displayEmoji}${shopItem.name} (${shopItem.itemID}) (${amount.toLocaleString()})`)
        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.ItemsBoughtInShop)
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.itemsBoughtInShop >= achievement.amount && !client.tempAchievements[interaction.user.id]?.includes(achievement.id)) { 
                if (!client.tempAchievements[interaction.user.id]) client.tempAchievements[interaction.user.id] = []
                client.tempAchievements[interaction.user.id].push(achievement.id)
                await profile.addAchievement(achievement)
            }
        }))
        await profile.save()
        const description = [
            `<@${interaction.user.id}>, ${client.language({ textId: "you", guildId: interaction.guildId, locale: interaction.locale })} ${profile.sex === "male" ? client.language({ textId: "bought (male)", guildId: interaction.guildId, locale: interaction.locale }) : profile.sex === "female" ? client.language({ textId: "bought (female)", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "bought", guildId: interaction.guildId, locale: interaction.locale })}: ${emoji}**${shopItem.name}** (${amount.toLocaleString()}) ${client.language({ textId: "for", guildId: interaction.guildId, locale: interaction.locale })} ${serverPriceItemEmoji}${spent.toLocaleString()}`
        ]
        if (limits) description.push(limitDescription.join("\n"))
        return interaction.editReply({ content: description.join("\n"), flags: ["Ephemeral"] })
    }
}