const { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection, ApplicationCommandOptionType } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const LimitRegexp = /lim{(.*?)}/
module.exports = {
    name: "shop",
    nameLocalizations: {
        "ru": `магазин`,
        "uk": `магазин`,
        "es-ES": `tienda`
    },
    description: `View shop`,
    descriptionLocalizations: {
        "ru": `Посмотреть магазин`,
        "uk": `Переглянути магазин`,
        "es-ES": `Ver tienda`
    },
    options: [{
        name: 'ephemeral',
        nameLocalizations: {
            'ru': `эфемерный`,
            'uk': `тимчасовий`,
            'es-ES': `efímero`
        },
        description: 'Message visible only for you',
        descriptionLocalizations: {
            'ru': `Сообщение видно только тебе`,
            'uk': `Повідомлення видно тільки вам`,
            'es-ES': `Mensaje visible solo para ti`
        },
        type: ApplicationCommandOptionType.Boolean
    }],
    dmPermission: false,
    group: `shop-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        
        if (!interaction.isChatInputCommand()) {
            // Allow anyone to use shop from profile-menu or UCP buttons
            const isFromProfileMenu = interaction.isStringSelectMenu() && interaction.customId.includes("profile-menu")
            const isFromUCP = args?.fromUCP
            if (!isFromProfileMenu && !isFromUCP && interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
        }
        const flags = []
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || args?.ephemeral) flags.push("Ephemeral")
        let min = 0
        let limit = 10
        let category
        if (interaction.isChatInputCommand()) {
            category = await client.shopCategorySchema.findOne({ guildID: interaction.guildId, default: true }).lean()
        }
        if (interaction.isStringSelectMenu() && interaction.customId.includes("cat")) {
            category = await client.shopCategorySchema.findOne({ guildID: interaction. guildId, categoryID: interaction.values[0] }).lean()
        }
        if (interaction.isButton() && !args?.fromUCP) {
            // Only try to get category from message components if not from UCP (UCP buttons don't have message components)
            category = await client.shopCategorySchema.findOne({ guildID: interaction. guildId, categoryID: interaction.message?.components?.[1]?.components?.[0]?.options?.find(e => e.default === true)?.value }).lean()
        } else if (interaction.isButton() && args?.fromUCP) {
            // For UCP buttons, use default category
            category = await client.shopCategorySchema.findOne({ guildID: interaction.guildId, default: true }).lean()
        }
        let shopItems = client.cache.items.filter(e => e.guildID === interaction.guildId && e.shop.inShop && (category ? category.items.includes(e.itemID) : true) && e.found && !e.temp && e.enabled).map(e => e).sort((a, b) => a.sort - b.sort)
        if (!interaction.isChatInputCommand()) {
            if (interaction.customId.includes(`select`)) {
                const components = interaction.message.components
                await interaction.update({ components: [] })
                const filter = m => m.author.id == interaction.user.id && !m.content.includes(`\u200B`) && m.content.length > 0 && m.channel.id == interaction.channel.id
                const message = await interaction.followUp({ content: `${client.language({ textId: "Type page in chat", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel type", guildId: interaction.guildId, locale: interaction.locale })}: cancel` })
                const collected = await waitingForPage(client, interaction, filter, shopItems.length)
                message.delete().catch(e => null)
                if (!collected) return interaction.editReply({ components: components })
                limit = +collected.content * 10
                min = limit - 10    
            } else {
                if (interaction.customId.includes(`menu`)) {
                    limit = +LimitRegexp.exec(interaction.values[0])?.[1]
                    min = limit - 10   
                } else {
                    limit = +LimitRegexp.exec(interaction.customId)?.[1]
                    min = limit - 10    
                }
            }
        }
        const guild = interaction.guild
        const settings = client.cache.settings.get(interaction.guildId)
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        let shopMessage = settings.shopMessages?.length ? settings.shopMessages.map(e => {
            e = e.replace(/{member}/i, interaction.member.displayName)
            e = e.replace(/{currency}/i, profile.currency.toFixed())
            e = e.replace(/{guild}/i, interaction.guild.name)
            return e
        }) : [`${client.language({ textId: "I knew you would come.", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "I have a special offer for you.", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "I have a very good offer for you.", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "What are we buying?", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "Boosts, roles, food! I have everything you want.", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "Sorry", guildId: interaction.guildId, locale: interaction.locale })} ${interaction.member.displayName}. ${client.language({ textId: "I can't give you credit. Come back when you're... mmm... richer!", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "I have everything you want.", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "Better not come with an empty wallet.", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "I always have an offer.", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "Global Bot is pleased with you, but I'll be more pleased if you buy a couple of things from me!", guildId: interaction.guildId, locale: interaction.locale })}`, `${client.language({ textId: "If you need tackle, I have it.", guildId: interaction.guildId, locale: interaction.locale })}`]
        let discount = ``
        let discount1 = ``
        if (profile.rp !== 0) {
            if (profile.rp > 1000) profile.rp = 1000 - profile.rp
            if (profile.rp < -1000) profile.rp = Math.abs(profile.rp - -1000)
            let discount = profile.rp / 20
            discount = `(${profile.rp < 0 ? "+" : "-"}${Math.abs(+discount.toFixed())}% ${client.language({ textId: "to price", guildId: interaction.guildId, locale: interaction.locale })})`
            discount1 = `\n${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.rp.toFixed()} ${discount}`
        }
        let amount = ``
        const shopEmbed = new EmbedBuilder()
        shopEmbed.setColor(interaction.member.displayHexColor)
        shopEmbed.setAuthor({ name: `${guild.name} | ${settings.shopName || `${client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}`}`, iconURL: client.user.displayAvatarURL() })
        shopMessage = shopMessage[Math.floor(Math.random() * shopMessage.length)]
        shopEmbed.setThumbnail(settings.shopThumbnail?.length ? settings.shopThumbnail : null)
        let menu_options = [
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${interaction.user.id}}eph reply`, description: `${client.language({ textId: "Your personal profile", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${interaction.user.id}}`, description: `${client.language({ textId: "Your statistics", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.inventory}`, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${interaction.user.id}}eph reply`, description: `${client.language({ textId: "Your inventory with items", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.roles}`, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${interaction.user.id}}`, description: `${client.language({ textId: "Your inventory with roles", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${interaction.user.id}}`, description: `${client.language({ textId: "Your invites", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.shop, label: `${settings.shopName ? settings.shopName.slice(0, 100) : client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale }) }`, value: `usr{${interaction.user.id}}cmd{shop}lim{10}mbr{${interaction.user.id}}`, description: `${client.language({ textId: "Server shop", guildId: interaction.guildId, locale: interaction.locale })}`, default: true },
            { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${interaction.user.id}}`, description: `${client.language({ textId: "Your achievements", guildId: interaction.guildId, locale: interaction.locale })}`},
            { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${interaction.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })}` },
        ]
        const category_options = [{ label: `${client.language({ textId: "All", guildId: interaction.guildId, locale: interaction.locale })}`, value: `all`, default: true }]
        const categories = await client.shopCategorySchema.find({ guildID: interaction.guildId }).lean()
        for (const category_ of categories) {
            const emoji = await client.functions.getEmoji(client, category_.emoji)
            if (category?.categoryID === category_.categoryID) category_options[0].default = false
            category_options.push({ emoji: category_.emoji ? emoji : undefined, label: category_.name, value: category_.categoryID, default: category?.categoryID === category_.categoryID })
        }
        const nav_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}} menu`).addOptions(menu_options)])
        const category_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}}cmd{shop}lim{10} cat`).addOptions(category_options)])
        if (shopItems.length < 1) {
            shopEmbed.setDescription(`${client.language({ textId: "Nothing in the shop yet", guildId: interaction.guildId, locale: interaction.locale })}.`)
            const components = [nav_row, category_row]
            // For UCP buttons (already deferred), use editReply
            if (args?.fromUCP) {
                return interaction.editReply({ content: ` `, embeds: [shopEmbed], components: components, flags })
            }
            if ((interaction.customId?.includes("reply") || interaction.values?.[0]?.includes("reply")) || interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
                return interaction.reply({ content: ` `, embeds: [shopEmbed], components: components, flags })
            }
            if (interaction.replied || interaction.deferred) return interaction.editReply({ content: ` `, embeds: [shopEmbed], components: components, flags })
            else return interaction.reply({ content: ` `, embeds: [shopEmbed], components: components, flags })
        }
        let shopPage = shopItems.slice(min, limit)
        const page = (shopItems.length + (shopItems.length % 10 == 0 ? 0 : 10 - (shopItems.length % 10)))/10 == 0 ? 1 : (shopItems.length + (shopItems.length % 10 == 0 ? 0 : 10 - (shopItems.length % 10)))/10
        const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{shop}lim{10}1`).setDisabled((shopItems.length <= 10 && min == 0) || (shopItems.length > 10 && min < 10))
        const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{shop}lim{${limit - 10}}2`).setDisabled((shopItems.length <= 10 && min == 0) || (shopItems.length > 10 && min < 10))
        const select_page_btn = new ButtonBuilder().setLabel(`${Math.ceil(limit/10).toString()}/${page}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{shop} select`).setDisabled(shopItems.length <= 10 && min == 0)
        const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{shop}lim{${limit + 10}}3`).setDisabled((shopItems.length <= 10 && min == 0) || (shopItems.length > 10 && min >= shopItems.length - 10))
        const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`usr{${interaction.user.id}}cmd{shop}lim{${shopItems.length + (shopItems.length % 10 == 0 ? 0 : 10 - (shopItems.length % 10))}}4`).setDisabled((shopItems.length <= 10 && min == 0) || (shopItems.length > 10 && min >= shopItems.length - 10))
        const array_btn = [first_page_btn, previous_page_btn, select_page_btn, next_page_btn, last_page_btn]
        const computedArray = []
        for (const key of shopPage) {
            computedArray.push({
                name: key.name,
                emoji: key.displayEmoji,
                shop: {
                    canDiscount: key.shop.canDiscount,
                    amount: key.shop.amount,
                    price: key.shop.cryptoPrice ? await fetch(`https://api.coinbase.com/v2/prices/${key.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * key.shop.cryptoPriceMultiplier)).catch(err => NaN) : key.shop.price,
                    priceType: key.shop.priceType
                },
                rarity: key.rarity,
                description: key.description
            })
        }
        let i = 0
        const permissions = category && category.filter && category.roles.length ? category.filter === "hasAll" ? `\n${client.language({ textId: "Buyer must have", guildId: interaction.guildId, locale: interaction.locale })}: ${category.roles.map(e => `<@&${e}>`).join(", ")}` : category.filter === "hasAny" ? `\n${client.language({ textId: "Buyer must have one of", guildId: interaction.guildId, locale: interaction.locale })}: ${category.roles.map(e => `<@&${e}>`).join(", ")}` : `\n${client.language({ textId: "Buyer must not have one of", guildId: interaction.guildId, locale: interaction.locale })}: ${category.roles.map(e => `<@&${e}>`).join(", ")}` : ""
        shopEmbed.setDescription(`\`\`\`${shopMessage}\`\`\`${discount1}${permissions}`)
        shopEmbed.setFooter({ text: `❓ ${client.language({ textId: "To buy an item use command - /buy <item> [quantity]", guildId: interaction.guildId, locale: interaction.locale })}` })
        while (computedArray[i]) {
            if (computedArray[i].shop.amount !== null && computedArray[i].shop.amount >= 0) {
                amount = `\n${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: computedArray[i].shop.amount.toLocaleString(), guildId: interaction.guildId, locale: interaction.locale })}`
            }
            const priceItemEmoji = computedArray[i].shop.priceType === `currency` ? settings.displayCurrencyEmoji : computedArray[i].shop.priceType === `cookie` ? "🍪" : client.cache.items.find(e => e.itemID == computedArray[i].shop.priceType && e.enabled && e.found && !e.temp)?.displayEmoji || `||??||`
            let price = computedArray[i].shop.canDiscount ? computedArray[i].shop.price * (1 - profile.rp / 2000) : computedArray[i].shop.price
            if (computedArray[i].shop.canDiscount) {
                shopEmbed.addFields([{ name: `${computedArray[i].emoji}${computedArray[i].name} › ${priceItemEmoji}${price.toLocaleString()} ${discount}`, value: `${computedArray[i].description}${amount}\n${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: computedArray[i].rarity, guildId: interaction.guildId, locale: interaction.locale })}` }])
            }
            else {
                shopEmbed.addFields([{ name: `${computedArray[i].emoji}${computedArray[i].name} › ${priceItemEmoji}${price.toLocaleString()}`, value: `${computedArray[i].description}${amount}\n${client.language({ textId: "Rarity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: computedArray[i].rarity, guildId: interaction.guildId, locale: interaction.locale })}` }])
            }
            i++
            amount = ``
        }
        {
            const components = [nav_row, category_row, new ActionRowBuilder().addComponents(array_btn)]
            // For UCP buttons (already deferred), use editReply
            if (args?.fromUCP) {
                return interaction.editReply({ embeds: [shopEmbed], components: components, flags })
            }
            if ((interaction.customId?.includes("reply") || interaction.values?.[0]?.includes("reply")) || interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
                return interaction.reply({ embeds: [shopEmbed], components: components, flags })
            }
            if (!interaction.replied && !interaction.deferred) return interaction.update({ embeds: [shopEmbed], components: components })
            else return interaction.editReply({ embeds: [shopEmbed], components: components, flags })
        }
    } 
}
async function waitingForPage(client, interaction, filter, length) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        if (!isNaN(collected.first().content) && Number.isInteger(+collected.first().content)) {
            if (collected.first().content <= 0 || collected.first().content > (length + (length % 10 == 0 ? 0 : 10 - (length % 10)))/10 ) {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "This page does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            } else {
                collected.first().delete().catch(e => null) 
                return collected.first()
            }
        } else {
            if (collected.first().content.toLowerCase() == `cancel`) {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    } 
}