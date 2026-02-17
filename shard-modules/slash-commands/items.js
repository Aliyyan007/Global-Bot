const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection } = require("discord.js")
const { handleEmojiError, UNKNOWN_EMOJI_ID } = require("../handler/componentUtils")
const { RewardType } = require("../enums")
const Decimal = require('decimal.js')
const UserRegexp = /usr{(.*?)}/
const limitRegexp = /lim{(.*?)}/
const itemRegexp = /item{(.*?)}/
const value1Regexp = /value1{(.*?)}/
const value2Regexp = /value2{(.*?)}/
module.exports = {
    name: 'items',
    nameLocalizations: {
        'ru': `предметы`,
        'uk': `предмети`,
        'es-ES': `objetos`
    },
    description: 'View items wiki',
    descriptionLocalizations: {
        'ru': `Просмотр предметопедии`,
        'uk': `Перегляд предметів`,
        'es-ES': `Ver la wiki de objetos`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': `предмет`,
                'uk': `предмет`,
                'es-ES': `objeto`
            },
            description: 'View info about item',
            descriptionLocalizations: {
                'ru': `Получить информацию о предмете в предметопедии`,
                'uk': `Отримати інформацію про предмет`,
                'es-ES': `Obtener información sobre el objeto en la wiki`
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
        },
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
        let min = 0
        let max = 25
        if (!interaction.isChatInputCommand()) {
            if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
            max = +limitRegexp.exec(interaction.customId)?.[1]
            if (!max) max = 25
            min = max - 25
        }
        const embed = new EmbedBuilder()
        const settings = client.cache.settings.get(interaction.guildId)
        const items = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled).map(e => e).sort((a, b) => a.name > b.name)
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if ((interaction.isChatInputCommand() && !args.item) || (interaction.isButton() && interaction.customId.includes("view"))) {
            const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}usr{${interaction.user.id}}view lim{25}1`).setDisabled((items.length <= 25 && min == 0) || (items.length > 25 && min < 25))
            const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}usr{${interaction.user.id}}view lim{${max - 25}}2`).setDisabled((items.length <= 25 && min == 0) || (items.length > 25 && min < 25))
            const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}usr{${interaction.user.id}}view lim{${max + 25}}3`).setDisabled((items.length <= 25 && min == 0) || (items.length > 25 && min >= items.length - 25))
            const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}usr{${interaction.user.id}}view lim{${items.length + (items.length % 25 == 0 ? 0 : 25 - (items.length % 25))}}4`).setDisabled((items.length <= 25 && min == 0) || (items.length > 25 && min >= items.length - 25))
            embed.setAuthor({ name: `${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}: ${items.filter(e => e.found).length}/${items.length} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.`, iconURL: interaction.guild.iconURL() })
            embed.setColor(3093046)
            const description = []
            items.slice(min, max).forEach(item => {
                let itemIsFound = "❌"
                if (profile.inventory.find(element => element.itemID == item.itemID)) itemIsFound = "✅"
                if (item.found) {
                    description.push(`${itemIsFound}${(items.findIndex(i => i.itemID === item.itemID) + 1)}. ${item.displayEmoji}**${item.name}**`)
                }
                else description.push(`❌${(items.findIndex(i => i.itemID === item.itemID) + 1)}. ||???????????||`)
                embed.setDescription(description.join("\n"))
            })
            embed.setFooter({ text: `❓${client.language({ textId: "To view item info, enter command: /items <item>", guildId: interaction.guildId, locale: interaction.locale })}` })
            const components = [new ActionRowBuilder().addComponents(first_page_btn, previous_page_btn, next_page_btn, last_page_btn)]
            if (items.length) {
                components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`cmd{items}usr{${interaction.user.id}}chooseItem`).setOptions(items.slice(min, max).map(item => {
                    return {
                        label: item.name,
                        value: item.itemID,
                        emoji: item.displayEmoji,
                        description: item.description.slice(0, 100)
                    }
                }))))
            }
            if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components }).catch(e => {
                    if (handleEmojiError(e, components, UNKNOWN_EMOJI_ID)) {
                        interaction.reply({ embeds: [embed], components: components })
                    } else client.functions.sendError(e)
                })
            else return interaction.update({ embeds: [embed], components }).catch(async e => {
                if (handleEmojiError(e, components, UNKNOWN_EMOJI_ID)) {
                    interaction.update({ embeds: [embed], components: components })
                } else client.functions.sendError(e)
            })
        }
        const filteredItems = items.filter(e => itemRegexp.exec(interaction.customId)?.[1] ? e.itemID.includes(itemRegexp.exec(interaction.customId)[1]) : interaction.isStringSelectMenu() ? e.itemID.includes(interaction.values[0]) : e.name.toLowerCase().includes(args.item.toLowerCase()))
        if (filteredItems.length > 1 && !filteredItems.some(e => interaction.isStringSelectMenu() ? e.itemID === interaction.values[0] : e.name.toLowerCase() === args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
        }
        const item = itemRegexp.exec(interaction.customId)?.[1] ? filteredItems.find(e => e.itemID === itemRegexp.exec(interaction.customId)[1]) : filteredItems.some(e => interaction.isStringSelectMenu() ? e.itemID === interaction.values[0] : 
            e.name.toLowerCase() === args.item.toLowerCase()) ? filteredItems.find(e => interaction.isStringSelectMenu() ? e.itemID === interaction.values[0] : e.name.toLowerCase() === args.item.toLowerCase()) : 
            filteredItems[0]
        if (!item) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such item does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
        }
        if (!item.found) {
            embed.setAuthor({ name: item.itemID, iconURL: "https://www.meme-arsenal.com/memes/15ef8d1ccbb4514e0a758c61e1623b2f.jpg" })
            embed.setTitle(`???????????`)
            embed.setDescription(`${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}: ||???????????||\n${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}: ||????????????????????????????????????????????????????????????????????????????????????????||`)
            embed.setThumbnail(`https://www.meme-arsenal.com/memes/15ef8d1ccbb4514e0a758c61e1623b2f.jpg`)
            return interaction.update({ embeds: [embed] })
        }
        embed.setColor(item.hex || null)
        embed.setAuthor({ name: item.name, iconURL: item.image || await item.getEmojiURL() })
        const options = [{
            label: `${client.language({ textId: "General information", guildId: interaction.guildId, locale: interaction.locale })}`,
            value: `general`,
            emoji: client.config.emojis.gear
        }]
        if (item.canObtaining) {
            options.push({
                label: `${client.language({ textId: "Ways to obtain", guildId: interaction.guildId, locale: interaction.locale })}`,
                value: `obtaining`,
                emoji: client.config.emojis.description
            })
        }
        if (item.canUse) {
            options.push({
                label: `${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}`,
                value: `using`,
                emoji: client.config.emojis.use
            })
        }
        const contains = item.contains.filter(e => (e.type === RewardType.Item && client.cache.items.find(it => it.itemID === e.id && it.enabled && !it.temp)) || e.type !== RewardType.Item)
        if (contains.length) {
            options.push({
                label: `${client.language({ textId: "Inside", guildId: interaction.guildId, locale: interaction.locale })}`,
                value: `case`,
                emoji: client.config.emojis.box
            })
        }
        if (client.cache.items.some(ITEM => ITEM.crafts?.some(e => e.items?.some(el => el.itemID === item.itemID) && e.isFound) && ITEM.found && ITEM.enabled && !ITEM.temp)) {
            options.push({
                label: `${client.language({ textId: "Used in crafting", guildId: interaction.guildId, locale: interaction.locale })}`,
                value: `usingInCraft`,
                emoji: client.config.emojis.craft
            })
        }
        const components = []
        if ((interaction.isStringSelectMenu() && interaction.customId.includes("menu1") && interaction.values[0] === "general") || (interaction.isStringSelectMenu() && interaction.customId.includes("chooseItem")) || (interaction.isChatInputCommand() && args.item)) {
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
            const option = options.find(e => { return e.value === "general"})
            option.default = true
        }
        if ((interaction.isStringSelectMenu() && interaction.customId.includes("menu1") && interaction.values[0] === "obtaining") || (value1Regexp.exec(interaction.customId)?.[1] === "obtaining")) {
            const options2 = []
            if (item.shop.inShop && (item.shop.price || item.shop.cryptoPrice) && item.shop.priceType && item.shop.amount) {
                options2.push({
                    label: `${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `shop`,
                    emoji: client.config.emojis.shop
                })
            }
            if (item.crafts.length) {
                options2.push({
                    label: `${client.language({ textId: "Craft", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `craft`,
                    emoji: client.config.emojis.craft
                })
            }
            if (item.activities && Object.keys(item.activities).length) {
                options2.push({
                    label: `${client.language({ textId: "Activities", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `activities`,
                    emoji: client.config.emojis.activities
                })
            }
            if (client.cache.items.filter(e => e.guildID === item.guildID).some(e => e.contains.some(e1 => e1.id === item.itemID))) {
                options2.push({
                    label: `${client.language({ textId: "Inside case", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `insideCase`,
                    emoji: client.config.emojis.box
                })
            }
            if (client.cache.items.filter(e => e.guildID === item.guildID).some(e => e.canUse?.itemAdd?.itemID === item.itemID)) {
                options2.push({
                    label: `${client.language({ textId: "When using item", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `obtainingUsing`,
                    emoji: client.config.emojis.use
                })
            }
            if (client.cache.achievements.filter(e => e.guildID === item.guildID).some(e => e.rewards.some(e1 => e1.id === item.itemID))) {
                options2.push({
                    label: `${client.language({ textId: "Achievement reward", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `acr`,
                    emoji: client.config.emojis.achievements
                })
            }
            if (client.cache.auctions.some(e => e.guildID === item.guildID && e.item.id === item.itemID && e.status === "started")) {
                options2.push({
                    label: `${client.language({ textId: "Auctions", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `auctions`,
                    emoji: client.config.emojis.auction
                })
            }
            if (client.cache.giveaways.some(e => e.guildID === item.guildID && e.rewards.some(e1 => e1.id === item.itemID) && e.status === "started")) {
                options2.push({
                    label: `${client.language({ textId: "Giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `giveaways`,
                    emoji: client.config.emojis.giveaway
                })
            }
            if (client.cache.roles.some(e => e.guildID === item.guildID && e.type === "static" && e.items.some(e1 => e1.itemID === item.itemID) && e.isEnabled)) {
                options2.push({
                    label: `${client.language({ textId: "Income roles", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `incomeRoles`,
                    emoji: client.config.emojis.roles
                })
            }
            if (client.cache.jobs.some(e => e.guildID === item.guildID && e.enable && (e.action1.success.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0) || e.action1.fail.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0) || e.action2.success.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0) || e.action2.fail.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)))) {
                options2.push({
                    label: `${client.language({ textId: "Job", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `jobs`,
                    emoji: client.config.emojis.job
                })
            }
            if (client.cache.lots.some(e => e.guildID === item.guildID && e.item.id === item.itemID && e.enable && e.created)) {
                options2.push({
                    label: `${client.language({ textId: "Market", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `market`,
                    emoji: client.config.emojis.dol
                })
            }
            if (client.cache.quests.some(e => e.guildID === item.guildID && e.rewards.some(e1 => e1.id === item.itemID) && e.isEnabled)) {
                options2.push({
                    label: `${client.language({ textId: "Quest reward", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `quests`,
                    emoji: client.config.emojis.quests
                })
            }
            if (client.cache.wormholes.some(e => e.guildID === item.guildID && e.itemID === item.itemID && e.isEnabled && e.runsLeft)) {
                options2.push({
                    label: `${client.language({ textId: "Wormholes", guildId: interaction.guildId, locale: interaction.locale })}`,
                    value: `wormholes`,
                    emoji: client.config.emojis.wormhole
                })
            }
            if (interaction.isStringSelectMenu() && interaction.customId.includes("menu1") && interaction.values[0] === "obtaining") {
                options2[0].default = true
                interaction.values = [options2[0].value]
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "shop") || (value2Regexp.exec(interaction.customId)?.[1] === "shop")) {
                if (item.shop.inShop && (item.shop.price || item.shop.cryptoPrice) && item.shop.priceType && item.shop.amount) {
                    embed.setDescription([
                        `# ${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}`,
                        `${client.language({ textId: "Buy: </buy:1150455840818614306>", guildId: interaction.guildId, locale: interaction.locale })}`,
                        `${client.language({ textId: "Full shop list: </shop:1150455842827665444>", guildId: interaction.guildId, locale: interaction.locale })}`
                    ].join("\n"))
                    let priceItem
                    if (item.shop.priceType === `currency`) {
                        priceItem = `${settings.displayCurrencyEmoji}${settings.currencyName}`
                    } else
                    if (item.shop.priceType === `cookie`) {
                        priceItem = `🍪${client.language({ textId: "Cookies", guildId: interaction.guildId, locale: interaction.locale })}`
                    } else 
                    if (client.cache.items.find(e => e.itemID === item.shop.priceType && e.enabled && !e.temp)) {
                        const i = client.cache.items.find(e => e.itemID === item.shop.priceType && e.enabled && !e.temp)
                        if (i.found) priceItem = `${i.displayEmoji}${i.name}`
                        else priceItem = "||????????||"
                    } else {
                        priceItem = `${i.item.shop.priceType}`
                    }
                    const discount = item.shop.canDiscount ? 1 - profile.rp / 2000 : 0
                    let price = item.shop.cryptoPrice ? await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoPriceMultiplier)).catch(err => NaN) : item.shop.price
                    if (price) price = price * (discount ? discount : 1)
                    const fields = [
                        {
                            name: `${client.language({ textId: "In shop", guildId: interaction.guildId, locale: interaction.locale })}`,
                            value: `${item.displayEmoji}${item.name} (${item.shop.amount})`
                        },
                        {
                            name: `${client.language({ textId: "Price", guildId: interaction.guildId, locale: interaction.locale })}`,
                            value: `${priceItem} (${price?.toLocaleString() || `${client.config.emojis.NO}**${client.language({ textId: "Error getting price", guildId: interaction.guildId, locale: interaction.locale })}**`}) ${discount ? `(${discount > 1 ? "+" : "-"}${(1 - discount) * 100}%)` : ``}`
                        }
                    ]
                    if (item.shop.dailyShopping > 0) {
                        fields.push({
                            name: `${client.language({ textId: "Daily purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`,
                            value: `${(profile.dailyLimits && profile.dailyLimits[item.itemID]) || 0}/${item.shop.dailyShopping}`
                        })
                    }
                    if (item.shop.weeklyShopping > 0) {
                        fields.push({
                            name: `${client.language({ textId: "Weekly purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`,
                            value: `${(profile.weeklyLimits && profile.weeklyLimits[item.itemID]) || 0}/${item.shop.weeklyShopping}`
                        })
                    }
                    if (item.shop.monthlyShopping > 0) {
                        fields.push({
                            name: `${client.language({ textId: "Monthly purchase limit", guildId: interaction.guildId, locale: interaction.locale })}`,
                            value: `${(profile.monthlyLimits && profile.monthlyLimits[item.itemID]) || 0}/${item.shop.monthlyShopping}`
                        })
                    }
                    if (item.shop.autodelivery?.daily.amount || item.shop.autodelivery?.weekly.amount || item.shop.autodelivery?.monthly.amount) {
                        fields.push({
                            name: `${client.language({ textId: "Auto-delivery", guildId: interaction.guildId, locale: interaction.locale })}`,
                            value: [
                                item.shop.autodelivery?.daily.amount > 0 ? `${client.language({ textId: "Every day", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery.daily.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.daily.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.daily.amount}`}` : undefined,
                                item.shop.autodelivery?.weekly.amount > 0 ? `${client.language({ textId: "Every week", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery.weekly.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.weekly.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.weekly.amount}`}` : undefined,
                                item.shop.autodelivery?.monthly.amount > 0 ? `${client.language({ textId: "Every month", guildId: interaction.guildId, locale: interaction.locale })}: ${item.shop.autodelivery.monthly.type === "increase" ? `${client.language({ textId: "increases current quantity by", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.monthly.amount}` : `${client.language({ textId: "sets current quantity to", guildId: interaction.guildId, locale: interaction.locale })} ${item.shop.autodelivery.monthly.amount}`}` : undefined
                            ].filter(e => e).join("\n")
                        })
                    }
                    embed.setFields(fields)
                }
                const option2 = options2.find(e => { return e.value === "shop"})
                option2.default = true
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "craft") || (value2Regexp.exec(interaction.customId)?.[1] === "craft")) {
                embed.setDescription(`# ${client.language({ textId: "Craft", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Craft", guildId: interaction.guildId, locale: interaction.locale })}: </craft:1150455841284161609>`)
                let itemsForCraft = ""
                let a = 0
                let index = -1
                let values = []
                for (const craft of item.crafts) {
                    index++
                    craftingItems = craft.isFound ? item.crafts[index].amountFrom !== item.crafts[index].amountTo ? `${item.crafts[index].amountFrom}-${item.crafts[index].amountTo}` : item.crafts[index].amountFrom == item.crafts[index].amountTo ? `${item.crafts[index].amountTo}` : "" : "||??||"
                    a++
                    for (const i of craft.items) {
                        let amount = ""
                        if (i.amount > 1) amount = ` (${i.amount})`
                        if (!craft.isFound) {
                            if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += `> ||??||`
                            else itemsForCraft += ` + ||??||`
                        } else {
                            if (i.itemID === "currency") {
                                if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += `> ${settings.displayCurrencyEmoji}**${settings.currencyName}**${amount}`
                                else itemsForCraft += ` + ${settings.displayCurrencyEmoji}**${settings.currencyName}**${amount}`
                                values.push(Math.floor(profile.currency / i.amount))
                            } else {
                                const Item = client.cache.items.find(i1 => i1.itemID === i.itemID && !i1.temp && i1.enabled)
                                if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) {
                                    if (Item?.found) {
                                        itemsForCraft += `> ${Item.displayEmoji}**${Item.name}**${amount}`
                                        values.push(Math.floor(profile.inventory.find(itm => itm.itemID === i.itemID)?.amount / i.amount))
                                    } else {
                                        itemsForCraft += "||??||"
                                        values.push(0)
                                    }
                                } else {
                                    if (Item?.found) {
                                        itemsForCraft += ` + ${Item.displayEmoji}**${Item.name}**${amount}`
                                        values.push(Math.floor(profile.inventory.find(itm => itm.itemID === i.itemID)?.amount / i.amount))
                                    } else {
                                        itemsForCraft += ` + ||??||`
                                        values.push(0)
                                    }
                                }     
                            }    
                        }
                    }
                    const min = Math.min.apply(null, values)
                    itemsForCraft += ` = ${item.displayEmoji}**${item.name}** (${craftingItems}) (${client.language({ textId: "You can craft", guildId: interaction.guildId, locale: interaction.locale })}: ${craft.isFound ? min || 0 : 0} ${client.language({ textId: "times", guildId: interaction.guildId, locale: interaction.locale })})`
                    embed.addFields([{ name: `${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })} №${a} ${!craft.isFound ? `${client.language({ textId: "(unknown)", guildId: interaction.guildId, locale: interaction.locale })}` : ""}`, value: itemsForCraft }])
                    itemsForCraft = ""    
                    values = []
                }
                const option2 = options2.find(e => { return e.value === "craft"})
                option2.default = true
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "activities") || (value2Regexp.exec(interaction.customId)?.[1] === "activities")) {
                if (item.activities?.fishing?.chance && item.activities?.fishing?.amountFrom && item.activities?.fishing?.amountTo) {
                    const fitems = items.filter(i => i.activities?.fishing?.chance).sort((a, b) => b.activities.fishing.chance - a.activities.fishing.chance)
                    const chance = fitems.find(i => i.itemID === item.itemID).activities.fishing.chance
                    embed.addFields([{
                        name: `🎣${client.language({ textId: "Fishing", guildId: interaction.guildId, locale: interaction.locale })} (</fishing:1150455841779105905>)`,
                        value: [
                            `${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}: 🎲${chance}%`,
                            `${client.language({ textId: "Reward", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.XP}${item.activities.fishing.minxp !== item.activities.fishing.maxxp ? `${item.activities.fishing.minxp}-${item.activities.fishing.maxxp}` : `${item.activities.fishing.minxp}`}`,
                            `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${item.activities.fishing.amountFrom !== item.activities.fishing.amountTo ? `${item.activities.fishing.amountFrom}-${item.activities.fishing.amountTo}` :  `${item.activities.fishing.amountFrom}`}`
                        ].join("\n")
                    }])
                }
                if (item.activities?.mining?.chance && item.activities?.mining?.amountFrom && item.activities?.mining?.amountTo) {
                    const mitems = items.filter(i => i.activities?.mining?.chance).sort((a, b) => b.activities.mining.chance - a.activities.mining.chance)
                    const chance = mitems.find(i => i.itemID === item.itemID).activities.mining.chance
                    embed.addFields([{
                        name: `⛏️${client.language({ textId: "Mining", guildId: interaction.guildId, locale: interaction.locale })} (</mining:1150455842454388758>)`,
                        value: [
                            `${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}: 🎲${chance}%`,
                            `${client.language({ textId: "Reward", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.XP}${item.activities.mining.minxp !== item.activities.mining.maxxp ? `${item.activities.mining.minxp}-${item.activities.mining.maxxp}` : `${item.activities.mining.minxp}`}`,
                            `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${item.activities.mining.amountFrom !== item.activities.mining.amountTo ? `${item.activities.mining.amountFrom}-${item.activities.mining.amountTo}` :  `${item.activities.mining.amountFrom}`}`
                        ].join("\n")
                    }])
                }
                if (item.activities?.voice?.chance && item.activities?.voice?.amountFrom && item.activities?.voice?.amountTo) {
                    const fOrbit = items.filter(i => i.activities?.voice?.chance && i.activities?.voice?.amountFrom && i.activities?.voice?.amountTo).sort((a, b) => b.activities.voice.chance - a.activities.voice.chance)
                    const chance = fOrbit.find(i => i.itemID === item.itemID).activities.voice.chance
                    embed.addFields([{
                        name: `🔊${client.language({ textId: "In voice channel", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: [
                            `${client.language({ textId: "Chance per minute", guildId: interaction.guildId, locale: interaction.locale })}: 🎲${chance}%`,
                            `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${item.activities.voice.amountFrom !== item.activities.voice.amountTo ? `${item.activities.voice.amountFrom}-${item.activities.voice.amountTo}` :  `${item.activities.voice.amountFrom}`}`
                        ].join("\n")
                    }])
                }
                if (item.activities?.message?.chance && item.activities?.message?.amountFrom && item.activities?.message?.amountTo) {
                    const fMessage = items.filter(i => i.activities?.message?.chance && i.activities?.message?.amountFrom && i.activities?.message?.amountTo).sort((a, b) => b.activities.message.chance - a.activities.message.chance)
                    const chance = fMessage.find(i => i.itemID === item.itemID).activities.message.chance
                    embed.addFields([{
                        name: `💬${client.language({ textId: "In text channel", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: [
                            `${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}: 🎲${chance}%`,
                            `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${item.activities.message.amountFrom !== item.activities.message.amountTo ? `${item.activities.message.amountFrom}-${item.activities.message.amountTo}` :  `${item.activities.message.amountFrom}`}`
                        ].join("\n")
                    }])
                }
                if (item.activities?.like?.amountFrom && item.activities?.like?.amountTo) {
                    embed.addFields([{
                        name: `❤️${client.language({ textId: "For like", guildId: interaction.guildId, locale: interaction.locale })} (</like:1150455842076905507>)`,
                        value: [
                            `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${item.activities.like.amountFrom !== item.activities.like.amountTo ? `${item.activities.like.amountFrom}-${item.activities.like.amountTo}` :  `${item.activities.like.amountFrom}`}`
                        ].join("\n")
                    }])
                }
                if (item.activities?.invite?.amountFrom && item.activities?.invite?.amountTo) {
                    embed.addFields([{
                        name: `${client.config.emojis.invite}${client.language({ textId: "For invite", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: [
                            `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${item.activities.invite.amountFrom !== item.activities.invite.amountTo ? `${item.activities.invite.amountFrom}-${item.activities.invite.amountTo}` :  `${item.activities.invite.amountFrom}`}`
                        ].join("\n")
                    }])
                }
                if (item.activities?.bump?.chance && item.activities?.bump?.amountFrom && item.activities?.bump?.amountTo) {
                    embed.addFields([{
                        name: `🆙${client.language({ textId: "For bump", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: [
                            `${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}: 🎲${item.activities.bump.chance}%`,
                            `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${item.activities.bump.amountFrom !== item.activities.bump.amountTo ? `${item.activities.bump.amountFrom}-${item.activities.bump.amountTo}` :  `${item.activities.bump.amountFrom}`}`
                        ].join("\n")
                    }])
                }
                if (item.activities?.daily) {
                    for (day in item.activities.daily) {
                        embed.addFields([{
                            name: `🕐${client.language({ textId: "For daily reward", guildId: interaction.guildId, locale: interaction.locale })} (${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} ${day.slice(3)}) (</daily:1150455841284161611>)`,
                            value: [
                                `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${item.activities.daily[day].amountFrom !== item.activities.daily[day].amountTo ? `${item.activities.daily[day].amountFrom}-${item.activities.daily[day].amountTo}` :  `${item.activities.daily[day].amountFrom}`}`
                            ].join("\n")
                        }])
                    }
                }
                embed.setDescription(`# ${client.language({ textId: "Activities", guildId: interaction.guildId, locale: interaction.locale })}`)
                const option2 = options2.find(e => { return e.value === "activities"})
                option2.default = true
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "insideCase") || (value2Regexp.exec(interaction.customId)?.[1] === "insideCase")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Inside case", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "Open case", guildId: interaction.guildId, locale: interaction.locale })}: </open:1150455842454388760>`
                ]
                const contains = []
                client.cache.items.filter(e => e.guildID === item.guildID && e.enabled && !e.temp).filter(e => e.contains.some(e1 => e1.id === item.itemID)).forEach(i => {
                    let key_emoji = ""
                    let key_name = ""
                    if (item.openByItem?.itemID) {
                        if (item.openByItem.itemID === "xp") {
                            key_emoji = client.config.emojis.XP
                            key_name = `${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}`
                        } else if (item.openByItem.itemID === "currency") {
                            key_emoji = settings.displayCurrencyEmoji
                            key_name = settings.currencyName
                        } else if (item.openByItem.itemID === "rp") {
                            key_emoji = client.config.emojis.RP
                            key_name = `${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`
                        }  else {
                            const guild_item = client.cache.items.find(element => element.itemID === item.openByItem.itemID && !element.temp && element.enabled)
                            if (guild_item) {
                                key_emoji = guild_item.displayEmoji
                                key_name = guild_item.name    
                            } else {
                                key_name = serverItem.openByItem.itemID
                            }
                        }
                    }
                    i.contains.filter(e => e.id === item.itemID).forEach(e => {
                        contains.push(`${i.found ? `${i.displayEmoji}${i.name}` : `||????????||`} (1)${item.openByItem?.itemID ? ` + ${key_emoji}${key_name} (${item.openByItem.amount.toLocaleString()})` : ""} ➜ ${client.config.emojis.random}${e.chance}% ➜ ${item.displayEmoji}${item.name} (${e.amountFrom !== e.amountTo ? `${e.amountFrom}-${e.amountTo}` :  `${e.amountFrom}`})`)
                    })
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{insideCase}1`).setDisabled((contains.length <= 25 && min == 0) || (contains.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{insideCase}2`).setDisabled((contains.length <= 25 && min == 0) || (contains.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{insideCase}3`).setDisabled((contains.length <= 25 && min == 0) || (contains.length > 25 && min >= contains.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${contains.length + (contains.length % 25 == 0 ? 0 : 25 - (contains.length % 25))}}value1{obtaining}value2{insideCase}4`).setDisabled((contains.length <= 25 && min == 0) || (contains.length > 25 && min >= contains.length - 25))
                description.push(contains.slice(min, max).join("\n"))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "insideCase"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "obtainingUsing") || (value2Regexp.exec(interaction.customId)?.[1] === "obtainingUsing")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "When using item", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "Use item", guildId: interaction.guildId, locale: interaction.locale })}: </use:1150455843138060413>`
                ]
                const items = client.cache.items.filter(e => e.guildID === item.guildID && e.canUse.itemAdd?.itemID === item.itemID).map(e => e)
                items.slice(min, max).forEach(e => {
                    description.push(`${e.found ? `${e.displayEmoji}${e.name}` : "||????????||"} (1) ➜ ${item.displayEmoji}${item.name} (${e.canUse.itemAdd.amount.toLocaleString()})`)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{obtainingUsing}1`).setDisabled((items.length <= 25 && min == 0) || (items.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{obtainingUsing}2`).setDisabled((items.length <= 25 && min == 0) || (items.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{obtainingUsing}3`).setDisabled((items.length <= 25 && min == 0) || (items.length > 25 && min >= items.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${items.length + (items.length % 25 == 0 ? 0 : 25 - (items.length % 25))}}value1{obtaining}value2{obtainingUsing}4`).setDisabled((items.length <= 25 && min == 0) || (items.length > 25 && min >= items.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "obtainingUsing"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "acr") || (value2Regexp.exec(interaction.customId)?.[1] === "acr")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Achievement reward", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "All achievements", guildId: interaction.guildId, locale: interaction.locale })}: </achievements:1150455840818614304>`
                ]
                const achievements = client.cache.achievements.filter(e => e.guildID === item.guildID && e.rewards.some(e1 => e1.id === item.itemID) && e.enabled).map(e => e)
                achievements.slice(min, max).forEach(achievement => {
                    const reward = achievement.rewards.find(e => e.id === item.itemID)
                    description.push(`${achievement.displayEmoji}${achievement.name} ➜ ${item.displayEmoji}${item.name} (${reward.amount.toLocaleString()})`)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{acr}1`).setDisabled((achievements.length <= 25 && min == 0) || (achievements.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{acr}2`).setDisabled((achievements.length <= 25 && min == 0) || (achievements.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{acr}3`).setDisabled((achievements.length <= 25 && min == 0) || (achievements.length > 25 && min >= achievements.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${achievements.length + (achievements.length % 25 == 0 ? 0 : 25 - (achievements.length % 25))}}value1{obtaining}value2{acr}4`).setDisabled((achievements.length <= 25 && min == 0) || (achievements.length > 25 && min >= achievements.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "acr"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "auctions") || (value2Regexp.exec(interaction.customId)?.[1] === "auctions")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Auctions", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "All auctions", guildId: interaction.guildId, locale: interaction.locale })}: </auctions view:1336296293730881678>`
                ]
                const auctions = client.cache.auctions.filter(e => e.guildID === item.guildID && e.item.id === item.itemID && e.status === "started").map(e => e)
                auctions.slice(min, max).forEach(auction => {
                    description.push(`https://discord.com/channels/${item.guildID}/${auction.channelId}/${auction.messageId} ➜ ${item.displayEmoji}${item.name} (${auction.item.amount.toLocaleString()})`)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{auctions}1`).setDisabled((auctions.length <= 25 && min == 0) || (auctions.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{auctions}2`).setDisabled((auctions.length <= 25 && min == 0) || (auctions.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{auctions}3`).setDisabled((auctions.length <= 25 && min == 0) || (auctions.length > 25 && min >= auctions.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${auctions.length + (auctions.length % 25 == 0 ? 0 : 25 - (auctions.length % 25))}}value1{obtaining}value2{auctions}4`).setDisabled((auctions.length <= 25 && min == 0) || (auctions.length > 25 && min >= auctions.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "auctions"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "giveaways") || (value2Regexp.exec(interaction.customId)?.[1] === "giveaways")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "All giveaways", guildId: interaction.guildId, locale: interaction.locale })}: </manager-giveaways:1150455842294988940>`
                ]
                const giveaways = client.cache.giveaways.filter(e => e.guildID === item.guildID && e.rewards.some(e1 => e1.id === item.itemID) && e.status === "started").map(e => e)
                giveaways.slice(min, max).forEach(giveaway => {
                    const reward = giveaway.rewards.find(e => e.id === item.itemID)
                    description.push(`${giveaway.url} ➜ ${item.displayEmoji}${item.name} (${giveaway.type === "admin" ? reward.amount.toLocaleString() : (reward.amount/giveaway.winnerCount).toLocaleString()})`)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{giveaways}1`).setDisabled((giveaways.length <= 25 && min == 0) || (giveaways.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{giveaways}2`).setDisabled((giveaways.length <= 25 && min == 0) || (giveaways.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{giveaways}3`).setDisabled((giveaways.length <= 25 && min == 0) || (giveaways.length > 25 && min >= giveaways.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${giveaways.length + (giveaways.length % 25 == 0 ? 0 : 25 - (giveaways.length % 25))}}value1{obtaining}value2{giveaways}4`).setDisabled((giveaways.length <= 25 && min == 0) || (giveaways.length > 25 && min >= giveaways.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "giveaways"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "incomeRoles") || (value2Regexp.exec(interaction.customId)?.[1] === "incomeRoles")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Income roles", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "Get income from role", guildId: interaction.guildId, locale: interaction.locale })}: </role-income:1150455842680885356>`
                ]
                const incomeRoles = client.cache.roles.filter(e => e.guildID === item.guildID && e.type === "static" && e.items.some(e1 => e1.itemID === item.itemID) && e.isEnabled).map(e => e)
                incomeRoles.slice(min, max).forEach(incomeRole => {
                    const reward = incomeRole.items.find(e => e.itemID === item.itemID)
                    description.push(`<@&${incomeRole.id}> ➜ ${client.functions.transformSecs(client, incomeRole.cooldown * 60 * 60 * 1000, interaction.guildId, interaction.locale)} ➜ ${item.displayEmoji}${item.name} (${reward.amount.toLocaleString()})`)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{incomeRoles}1`).setDisabled((incomeRoles.length <= 25 && min == 0) || (incomeRoles.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{incomeRoles}2`).setDisabled((incomeRoles.length <= 25 && min == 0) || (incomeRoles.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{incomeRoles}3`).setDisabled((incomeRoles.length <= 25 && min == 0) || (incomeRoles.length > 25 && min >= incomeRoles.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${incomeRoles.length + (incomeRoles.length % 25 == 0 ? 0 : 25 - (incomeRoles.length % 25))}}value1{obtaining}value2{incomeRoles}4`).setDisabled((incomeRoles.length <= 25 && min == 0) || (incomeRoles.length > 25 && min >= incomeRoles.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "incomeRoles"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "jobs") || (value2Regexp.exec(interaction.customId)?.[1] === "jobs")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Job", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "Work", guildId: interaction.guildId, locale: interaction.locale })}: </work:1150455843138060417>`
                ]
                const jobs = client.cache.jobs.filter(e => e.guildID === item.guildID && e.enable && (e.action1.success.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0) || e.action1.fail.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0) || e.action2.success.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0) || e.action2.fail.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0))).map(e => e)
                const rewards = []
                jobs.forEach(job => {
                    if (job.action1.success.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)) {
                        const reward = job.action1.success.rewards.find(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)
                        rewards.push(`${job.name} ➜ ${job.action1.name} ➜ ${client.language({ textId: "Success", guildId: interaction.guildId, locale: interaction.locale })} ➜ ${item.displayEmoji}${item.name} (${reward.minAmount !== reward.maxAmount ? `${reward.minAmount.toLocaleString()}~${reward.maxAmount.toLocaleString()}` : reward.minAmount.toLocaleString()})`)
                    }
                    if (job.action1.fail.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)) {
                        const reward = job.action1.fail.rewards.find(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)
                        rewards.push(`${job.name} ➜ ${job.action1.name} ➜ ${client.language({ textId: "Failure", guildId: interaction.guildId, locale: interaction.locale })} ➜ ${item.displayEmoji}${item.name} (${reward.minAmount !== reward.maxAmount ? `${reward.minAmount.toLocaleString()}~${reward.maxAmount.toLocaleString()}` : reward.minAmount.toLocaleString()})`)
                    }
                    if (job.action2.success.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)) {
                        const reward = job.action2.success.rewards.find(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)
                        rewards.push(`${job.name} ➜ ${job.action2.name} ➜ ${client.language({ textId: "Success", guildId: interaction.guildId, locale: interaction.locale })} ➜ ${item.displayEmoji}${item.name} (${reward.minAmount !== reward.maxAmount ? `${reward.minAmount.toLocaleString()}~${reward.maxAmount.toLocaleString()}` : reward.minAmount.toLocaleString()})`)
                    }
                    if (job.action2.fail.rewards.some(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)) {
                        const reward = job.action2.fail.rewards.find(e1 => e1.itemID === item.itemID && e1.maxAmount > 0)
                        rewards.push(`${job.name} ➜ ${job.action2.name} ➜ ${client.language({ textId: "Failure", guildId: interaction.guildId, locale: interaction.locale })} ➜ ${item.displayEmoji}${item.name} (${reward.minAmount !== reward.maxAmount ? `${reward.minAmount.toLocaleString()}~${reward.maxAmount.toLocaleString()}` : reward.minAmount.toLocaleString()})`)
                    }
                })
                rewards.slice(min, max).forEach(reward => {
                    description.push(reward)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{jobs}1`).setDisabled((rewards.length <= 25 && min == 0) || (rewards.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{jobs}2`).setDisabled((rewards.length <= 25 && min == 0) || (rewards.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{jobs}3`).setDisabled((rewards.length <= 25 && min == 0) || (rewards.length > 25 && min >= rewards.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${rewards.length + (rewards.length % 25 == 0 ? 0 : 25 - (rewards.length % 25))}}value1{obtaining}value2{jobs}4`).setDisabled((rewards.length <= 25 && min == 0) || (rewards.length > 25 && min >= rewards.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "jobs"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "market") || (value2Regexp.exec(interaction.customId)?.[1] === "market")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Market", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "View market", guildId: interaction.guildId, locale: interaction.locale })}: </market view:1150455842294988949>`
                ]
                const lots = client.cache.lots.filter(e => e.guildID === item.guildID && e.item.id === item.itemID && e.enable && e.created).map(e => e)
                lots.slice(min, max).forEach(lot => {
                    description.push(`${lot.channelId && lot.messageId ? `https://discord.com/channels/${item.guildID}/${lot.channelId}/${lot.messageId}` : `${lot.items.map(item => {
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
                        }).join(", ")}`} ➜ ${item.displayEmoji}${item.name} (1)`)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{market}1`).setDisabled((lots.length <= 25 && min == 0) || (lots.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{market}2`).setDisabled((lots.length <= 25 && min == 0) || (lots.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{market}3`).setDisabled((lots.length <= 25 && min == 0) || (lots.length > 25 && min >= lots.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${lots.length + (lots.length % 25 == 0 ? 0 : 25 - (lots.length % 25))}}value1{obtaining}value2{market}4`).setDisabled((lots.length <= 25 && min == 0) || (lots.length > 25 && min >= lots.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "market"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "quests") || (value2Regexp.exec(interaction.customId)?.[1] === "quests")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Quest reward", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "Quest overview", guildId: interaction.guildId, locale: interaction.locale })}: </quests overview:1150455842680885351>`
                ]
                const quests = client.cache.quests.filter(e => e.guildID === item.guildID && e.rewards.some(e1 => e1.id === item.itemID) && e.isEnabled).map(e => e)
                quests.slice(min, max).forEach(quest => {
                    const reward = quest.rewards.find(e1 => e1.id === item.itemID)
                    description.push(`${quest.displayEmoji}${quest.name} ➜ ${item.displayEmoji}${item.name} (${reward.amount.toLocaleString()})`)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{quests}1`).setDisabled((quests.length <= 25 && min == 0) || (quests.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{quests}2`).setDisabled((quests.length <= 25 && min == 0) || (quests.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{quests}3`).setDisabled((quests.length <= 25 && min == 0) || (quests.length > 25 && min >= quests.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${quests.length + (quests.length % 25 == 0 ? 0 : 25 - (quests.length % 25))}}value1{obtaining}value2{quests}4`).setDisabled((quests.length <= 25 && min == 0) || (quests.length > 25 && min >= quests.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "quests"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            if ((interaction.isStringSelectMenu() && interaction.values[0] === "wormholes") || (value2Regexp.exec(interaction.customId)?.[1] === "wormholes")) {
                let min = 0
                let max = 25
                max = +limitRegexp.exec(interaction.customId)?.[1]
                if (!max) max = 25
                min = max - 25
                const description = [
                    `# ${client.language({ textId: "Wormholes", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `${client.language({ textId: "All wormholes", guildId: interaction.guildId, locale: interaction.locale })}: </wormhole:1196085962728558674>`
                ]
                const wormholes = client.cache.wormholes.filter(e => e.guildID === item.guildID && e.itemID === item.itemID && e.isEnabled && e.runsLeft).map(e => e)
                wormholes.slice(min, max).forEach(wormhole => {
                    description.push(`${wormhole.name}${wormhole.threadId || client.cache.webhooks.get(wormhole.webhookId) ? ` ➜ <#${wormhole.threadId || client.cache.webhooks.get(wormhole.webhookId).channelId}>` : ""}${wormhole.visibleDate ? ` ➜ ${wormhole.cronJob.nextRuns(1).map(date => `<t:${Math.floor(date.getTime()/1000)}:R>`).join(", ")}` : ``} ➜ ${item.displayEmoji}${item.name} (${wormhole.amountFrom !== wormhole.amountTo ? `${wormhole.amountFrom.toLocaleString()}~${wormhole.amountTo.toLocaleString()}` : wormhole.amountFrom.toLocaleString()})`)
                })
                const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{25}value1{obtaining}value2{wormholes}1`).setDisabled((wormholes.length <= 25 && min == 0) || (wormholes.length > 25 && min < 25))
                const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 25}}value1{obtaining}value2{wormholes}2`).setDisabled((wormholes.length <= 25 && min == 0) || (wormholes.length > 25 && min < 25))
                const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 25}}value1{obtaining}value2{wormholes}3`).setDisabled((wormholes.length <= 25 && min == 0) || (wormholes.length > 25 && min >= wormholes.length - 25))
                const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${wormholes.length + (wormholes.length % 25 == 0 ? 0 : 25 - (wormholes.length % 25))}}value1{obtaining}value2{wormholes}4`).setDisabled((wormholes.length <= 25 && min == 0) || (wormholes.length > 25 && min >= wormholes.length - 25))
                embed.setDescription(description.join("\n"))
                const option2 = options2.find(e => { return e.value === "wormholes"})
                option2.default = true
                components.push(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
            }
            const option = options.find(e => { return e.value === "obtaining"})
            option.default = true
            components.unshift(new ActionRowBuilder().setComponents(new StringSelectMenuBuilder().setCustomId(`cmd{items}usr{${interaction.user.id}}item{${item.itemID}}value1{obtaining}lim{25}menu2`).setOptions(options2)))
        }
        if ((interaction.isStringSelectMenu() && interaction.customId.includes("menu1") && interaction.values[0] === "using") || (value1Regexp.exec(interaction.customId)?.[1] === "using")) {
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
                    if (unknownRecipeItem.found || isFunction) {
                        onUse += `\n> 📃${client.language({ textId: "Opens unknown recipe for item", guildId: interaction.guildId, locale: interaction.locale })} ${unknownRecipeItem.displayEmoji}${unknownRecipeItem.name}`
                    } else onUse += `\n> 📃${client.language({ textId: "Opens unknown recipe for item", guildId: interaction.guildId, locale: interaction.locale })} ||?????????||`
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
                    if (itemDel.found || isFunction) {

                        onUse += `\n> ❌${client.language({ textId: "Deletes from server", guildId: interaction.guildId, locale: interaction.locale })} ${itemDel.displayEmoji}**${itemDel.name}**`     
                    } else onUse += `\n> ${client.language({ textId: "Deletes from server", guildId: interaction.guildId, locale: interaction.locale })} ||?????????||`
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
                    if (itemAdd.found || isFunction) {
                        onUse += `\n> 📦${client.language({ textId: "Grants", guildId: interaction.guildId, locale: interaction.locale })} ${itemAdd.displayEmoji}**${itemAdd.name}** (${item.onUse.itemAdd.amount})`     
                    } else onUse += `\n> 📦${client.language({ textId: "Grants", guildId: interaction.guildId, locale: interaction.locale })} ||?????????|| (${item.onUse.itemAdd.amount})`
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
                    if (itemTake.found || isFunction) {
                        onUse += `\n> 📦${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} ${itemTake.displayEmoji}**${itemTake.name}** (${item.onUse.takeItem.amount})`     
                    } else onUse += `\n> 📦${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} ||?????????|| (${item.onUse.takeItem.amount})`
                } else onUse += `\n> 📦${client.language({ textId: "Subtracts", guildId: interaction.guildId, locale: interaction.locale })} **${item.onUse.takeItem.itemID}** (${item.onUse.takeItem.amount})` 
            }
            if (onUse !== "") embed.addFields([{ name: `${client.language({ textId: "Usage", guildId: interaction.guildId, locale: interaction.locale })}:`, value: onUse.slice(0, 1023) }])
            const option = options.find(e => { return e.value === "using"})
            option.default = true
        }
        if ((interaction.isStringSelectMenu() && interaction.customId.includes("menu1") && interaction.values[0] === "case") || (value1Regexp.exec(interaction.customId)?.[1] === "case")) {
            let containsItems = ""
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
                        if (i.found || isFunction) {
                            containsItems += `\n> #${index} ${i.displayEmoji}${i.name} (${amount}) (🎲${e.chance}%)`
                        }
                        else containsItems += `\n> #${index} ||???????????|| (🎲${e.chance}%)`    
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
            let openable = ""
            if (item.openByItem?.itemID && item.openByItem.itemID !== "currency" && item.openByItem.itemID !== "xp" && item.openByItem.itemID !== "rp") {
                const itm = items.find(i => i.itemID === item.openByItem.itemID)
                if (itm && itm.found || isFunction && itm) {
                    openable += ` ${itm.displayEmoji}${itm.name} (${item.openByItem.amount})`
                } else if (itm) openable += ` ||???????????||` 
                else openable += ` ${item.openByItem.itemID} (${item.openByItem.amount})`
            } else if (item.openByItem?.itemID == "currency") {
                openable += ` ${settings.displayCurrencyEmoji}${settings.currencyName} (${item.openByItem.amount})`
            } else if (item.openByItem?.itemID == "xp") {
                openable += ` ${client.config.emojis.XP}XP (${item.openByItem.amount})`
            } else if (item.openByItem?.itemID == "rp") {
                openable += ` ${client.config.emojis.RP}RP (${item.openByItem.amount})`
            }
            if (item.levelForOpen) openable += ` ${client.language({ textId: "lvl", guildId: interaction.guildId, locale: interaction.locale })}. ${item.levelForOpen}`
            embed.setDescription(`${client.language({ textId: "Open", guildId: interaction.guildId, locale: interaction.locale })}: </open:1150455842454388760>${openable ? `\n${client.language({ textId: "Opens with", guildId: interaction.guildId, locale: interaction.locale })}: ${openable}` : ""}`)
            const option = options.find(e => { return e.value === "case"})
            option.default = true
        }
        if ((interaction.isStringSelectMenu() && interaction.customId.includes("menu1") && interaction.values[0] === "usingInCraft") || (value1Regexp.exec(interaction.customId)?.[1] === "usingInCraft")) {
            let min = 0
            let max = 10
            max = +limitRegexp.exec(interaction.customId)?.[1]
            if (max === 25) max = 10
            if (!max) max = 10
            min = max - 10
            const crafts = []
            client.cache.items.filter(ITEM => ITEM.crafts?.some(e => e.items?.some(el => el.itemID === item.itemID) && e.isFound) && ITEM.found && ITEM.enabled && !ITEM.temp).forEach(a => {
                const craft = a.crafts.find(e => e.items.find(el => el.itemID === item.itemID))
                if (craft) {
                    crafts.push(`${craft.items.map(e => {
                        if (e.itemID === "currency") {
                            return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.amount.toLocaleString()})`
                        } else {
                            const it = client.cache.items.find(e1 => e1.itemID === e.itemID && !e1.temp && e1.enabled)
                            return `${it?.found ? `${it?.displayEmoji || ""}${it?.name || e.itemID}` : `||???????????||`} (${e.amount.toLocaleString()})`
                        }
                    }).join(" + ")} = ${a.displayEmoji}${a.name} (${craft.amountFrom !== craft.amountTo ? `${craft.amountFrom.toLocaleString()}~${craft.amountTo.toLocaleString()}` : craft.amountFrom.toLocaleString()})`)
                }    
            })
            embed.setDescription(`# ${client.language({ textId: "Used in crafting", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Craft", guildId: interaction.guildId, locale: interaction.locale })}: </craft:1150455841284161609>\n${crafts.slice(min, max).join("\n")}`)
            const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{10}value1{usingInCraft}1`).setDisabled((crafts.length <= 10 && min == 0) || (crafts.length > 10 && min < 10))
            const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max - 10}}value1{usingInCraft}2`).setDisabled((crafts.length <= 10 && min == 0) || (crafts.length > 10 && min < 10))
            const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${max + 10}}value1{usingInCraft}3`).setDisabled((crafts.length <= 10 && min == 0) || (crafts.length > 10 && min >= crafts.length - 10))
            const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{items}item{${item.itemID}}usr{${interaction.user.id}}lim{${crafts.length + (crafts.length % 10 == 0 ? 0 : 10 - (crafts.length % 10))}}value1{usingInCraft}4`).setDisabled((crafts.length <= 10 && min == 0) || (crafts.length > 10 && min >= crafts.length - 10))
            const option = options.find(e => { return e.value === "usingInCraft"})
            option.default = true
            components.unshift(new ActionRowBuilder().setComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn]))
        }
        components.unshift(new ActionRowBuilder().setComponents(new StringSelectMenuBuilder().setCustomId(`cmd{items}usr{${interaction.user.id}}item{${item.itemID}}lim{25}menu1`).setOptions(options)))
        if (interaction.isChatInputCommand() || interaction.customId?.includes("chooseItem")) return interaction.reply({ embeds: [embed], components })
        else return interaction.update({ embeds: [embed], components })
    }
}
