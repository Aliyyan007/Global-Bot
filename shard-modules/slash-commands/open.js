const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, StringSelectMenuBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorSpacingSize, MessageFlags, LabelBuilder } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const ItemRegexp = /item{(.*?)}/
const fetch = require("node-fetch")
const { AchievementType, RewardType } = require("../enums")
const Decimal = require('decimal.js')
module.exports = {
    name: 'open',
    nameLocalizations: {
        'ru': `открыть`,
        'uk': `відкрити`,
        'es-ES': `abrir`
    },
    description: 'Open an item',
    descriptionLocalizations: {
        'ru': `Открыть предмет`,
        'uk': `Відкрити предмет`,
        'es-ES': `Abrir un objeto`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': `предмет`,
                'uk': `предмет`,
                'es-ES': `objeto`
            },
            description: 'An item to open',
            descriptionLocalizations: {
                'ru': `Предмет для открытия`,
                'uk': `Предмет для відкриття`,
                'es-ES': `Objeto para abrir`
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: false,
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
        if (!interaction.isChatInputCommand()) {
            if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
        }
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const flags = [MessageFlags.IsComponentsV2]
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || profile.settings_open_ephemeral) flags.push("Ephemeral")
        if ((interaction.isButton() || interaction.isStringSelectMenu()) && interaction.customId.includes("settings")) {
            if (interaction.customId.includes("edit")) {
                interaction.values.forEach(value => {
                    if (!profile[value]) profile[value] = true
                    else profile[value] = undefined
                })
                await profile.save()
            }
            return interaction.reply({ embeds: [
                new EmbedBuilder()
                    .setTitle(`${client.language({ textId: "Settings", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setDescription([
                        `${client.language({ textId: "Opening window visible only to you", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.settings_open_ephemeral ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}`: `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                        `${client.language({ textId: "Always open maximum amount", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.settings_open_always_maximum ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}`: `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                        `${client.language({ textId: "Apply luck bonus to opening", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.settings_open_disallow_luck ? `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`: `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                        `${client.language({ textId: "Open button always active", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.settings_open_always_active ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}`: `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`}`
                    ].join("\n"))
                    .setColor(3093046)
            ],
            components: [new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{open}usr{${interaction.user.id}}settings edit`).setMaxValues(4).setOptions([
                {
                    label: client.language({ textId: "Opening window visible only to you", guildId: interaction.guildId, locale: interaction.locale }),
                    value: `settings_open_ephemeral`
                },
                {
                    label: client.language({ textId: "Always open maximum amount", guildId: interaction.guildId, locale: interaction.locale }),
                    value: `settings_open_always_maximum`
                },
                {
                    label: client.language({ textId: "Apply luck bonus to opening", guildId: interaction.guildId, locale: interaction.locale }),
                    value: `settings_open_disallow_luck`
                },
                {
                    label: client.language({ textId: "Open button always active", guildId: interaction.guildId, locale: interaction.locale }),
                    value: `settings_open_always_active`
                }
            ])])], flags: ["Ephemeral"] })
        }
        if (interaction.isChatInputCommand() && !args.item) {
            const items = []
            for (const item of profile.inventory.filter(element => element.amount > 0).sort((a, b) => {
                const aItem = client.cache.items.find(e => !e.temp && e.enabled && e.contains[0] && e.itemID === a.itemID)
                const bItem = client.cache.items.find(e => !e.temp && e.enabled && e.contains[0] && e.itemID === b.itemID)
                if (!aItem) return 1
                if (!bItem) return -1
                return aItem.sort - bItem.sort
            })) {
                const serverItem = client.cache.items.find(e => !e.temp && e.enabled && e.contains[0] && e.itemID === item.itemID)
                if (serverItem) items.push({ name: serverItem.name, emoji: serverItem.displayEmoji, amount: item.amount })
            }
            const array = []
            let countTotal = 1
            items.forEach(item => {
                array.push(`${countTotal}. ${item.emoji}**${item.name}** (${item.amount})`)
                countTotal++
            })
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent([
                    "## " + client.language({ textId: "All openable items in your inventory", guildId: interaction.guildId, locale: interaction.locale }),
                    !items.length ? client.language({ textId: "No items", guildId: interaction.guildId, locale: interaction.locale }) :  array.join("\n")
                ].join("\n")))
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] })
        }
        if (interaction.isChatInputCommand() && args.item?.length < 2) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })  
        }
        const search = (element) => element.guildID === interaction.guildId && !element.temp && element.enabled && (interaction.isButton() ? element.itemID === ItemRegexp.exec(interaction.customId)?.[1] && element.found : interaction.isChatInputCommand() ? element.name.toLowerCase().includes(args.item.toLowerCase()) && element.found : element.itemID === undefined)
        const filteredItems = client.cache.items.filter(search)
        if (filteredItems.size > 1 && !filteredItems.some(e => interaction.isStringSelectMenu() ? e.itemID.toLowerCase() == interaction.values[0] : e.name.toLowerCase() == args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })  
        }
        const serverItem = filteredItems.some(e => e.name.toLowerCase() == args?.item?.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() == args?.item?.toLowerCase()) : filteredItems.first()
        if (!serverItem) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        let contains = JSON.parse(JSON.stringify(serverItem.contains.filter(e => (e.type === RewardType.Item && client.cache.items.find(it => it.itemID === e.id && it.enabled && !it.temp)) || e.type !== RewardType.Item)))
        if (contains.length < 1) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This item cannot be opened", guildId: interaction.guildId, locale: interaction.locale })}: ${serverItem.displayEmoji}**${serverItem.name}**`, flags: ["Ephemeral"] })
        }
        let item = profile.inventory.find((element) => { return element.itemID == serverItem.itemID })
        if (!item || item.amount < 1) {
            if (interaction.isButton()) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "No such item in inventory", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const settings = client.cache.settings.get(interaction.guildId)
        let canOpen = true
        let userKeyAmount
        if (serverItem.openByItem?.itemID) {
            if (serverItem.openByItem.itemID == "currency") {
                if (profile.currency < serverItem.openByItem.amount) canOpen = false
                else userKeyAmount = profile.currency
            }
            else if (serverItem.openByItem.itemID == "xp") {
                if (profile.totalxp < serverItem.openByItem.amount) canOpen = false
                else userKeyAmount = profile.totalxp
            }
            else if (serverItem.openByItem.itemID == "rp") {
                if (profile.rp - serverItem.openByItem.amount < -1000) canOpen = false
                else userKeyAmount = profile.rp
            }
            else if (serverItem.openByItem.itemID !== "currency" && serverItem.openByItem.itemID !== "rp" && serverItem.openByItem.itemID !== "xp") {
                const userItemKey = profile.inventory.find((element) => { return element.itemID == serverItem.openByItem.itemID })
                if (userItemKey?.amount < serverItem.openByItem.amount ) canOpen = false
                else if (!userItemKey) canOpen = false
                else userKeyAmount = userItemKey.amount
            }
        }
        if (!item || item.amount < 1) canOpen = false
        //ОТКРЫТИЕ//
        let rewards, object_items
        let openAmount = 1
        const array = []
        let gameURL
        let gameImageURL
        if (interaction.isButton() && interaction.customId.includes("letsOpen")) {
            if (serverItem.openPermission && client.cache.permissions.get(serverItem.openPermission)) {
                const permission = client.cache.permissions.get(serverItem.openPermission)
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
            if (profile.itemsCooldowns && profile.itemsCooldowns.get(serverItem.itemID)?.open > new Date()) {
                return interaction.reply({ content: `⏳${client.language({ textId: "Wait for cooldown on this item", guildId: interaction.guildId, locale: interaction.locale })}: ${transformSecs(client, profile.itemsCooldowns.get(serverItem.itemID).open - new Date(), interaction.guildId, interaction.locale)}`, flags: ["Ephemeral"] })
            }
            if (((item.amount > 1 && userKeyAmount > 1) || item.amount > 1) && !contains.some(e => e.type === RewardType.SteamGame) && serverItem.max_open !== 1) {
                if (!profile.settings_open_always_maximum) {
                    const modal = new ModalBuilder()
                        .setCustomId(`open_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Open item", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(4)
                                        .setStyle(TextInputStyle.Short)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `open_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
                            return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        const amount = +modalArgs.amount
                        if (amount <= 0 || amount > 100000) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000`, flags: ["Ephemeral"] })
                        }
                        openAmount = amount
                    } else return    
                } else {
                    openAmount = 100000
                    if (serverItem.max_open) {
                        openAmount = serverItem.max_open
                    }
                }
            }
            if (openAmount) {
                if (openAmount > item.amount) openAmount = Math.floor(item.amount)
                if (openAmount < serverItem.min_open || (serverItem.max_open ? openAmount > serverItem.max_open : false)) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Opening amount range for this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.min_open}${serverItem.max_open ? ` ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.max_open}` : ""}`, flags: ["Ephemeral"] })  
                }
                if (serverItem.openByItem && serverItem.openByItem.itemID == "rp" && (userKeyAmount + 1000) / serverItem.openByItem.amount < openAmount) openAmount = Math.floor((userKeyAmount + 1000) / serverItem.openByItem.amount)
                else if (serverItem.openByItem && serverItem.openByItem.itemID !== "rp" && userKeyAmount && openAmount > (userKeyAmount / serverItem.openByItem.amount)) openAmount = Math.floor(userKeyAmount / serverItem.openByItem.amount)
                object_items = {}
                const achievements_to_give = []
                rewards = {
                    xp: 0,
                    currency: 0,
                    rp: 0,
                    roles: new Collection()
                }
                if (contains.length < 1) {
                    delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This item cannot be opened", guildId: interaction.guildId, locale: interaction.locale })}: ${emoji}**${serverItem.name}**`, flags: [MessageFlags.Ephemeral] })
                }
                if (item?.amount >= 1 && canOpen === true) {
                    let luck_multiplier_for_channel = 0
                    let channel = client.cache.channels.find(channel => channel.id === interaction.channel.id && channel.isEnabled)
                    if (!channel) channel = client.cache.channels.find(channel => channel.id === interaction.channel.parentId && channel.isEnabled)
                    if (channel) {
                        luck_multiplier_for_channel = channel.luck_multiplier
                    }
                    const bonus = new Decimal(1).plus(profile.getLuckBoost(luck_multiplier_for_channel))
                    if (!profile.settings_open_disallow_luck) contains = client.functions.adjustChanceByLuck(contains, bonus, serverItem.open_mode)
                    for (let i = 1; i <= openAmount; i++) {
                        let base_chance = Math.random()
                        if (base_chance === 0) base_chance = 1
                        if (serverItem.open_mode === "multiple") {
                            for (const openedItem of contains.filter(e => new Decimal(e.chance).gte(base_chance * 100))) {
                                const amount = client.functions.getRandomNumber(openedItem.amountFrom, openedItem.amountTo)
                                switch (openedItem.type) {
                                    case RewardType.SteamGame: {
                                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                                        const container = new ContainerBuilder(interaction.message.components[0].toJSON())
                                        const section = container.components.find(e => { return e.data.id === 144 })
                                        const accessory_btn = new ButtonBuilder()
                                            .setEmoji("⏳")
                                            .setDisabled(true)
                                            .setLabel(`${client.language({ textId: "OPEN", guildId: interaction.guildId, locale: interaction.locale })}`)
                                            .setStyle(ButtonStyle.Secondary)
                                            .setCustomId("0")
                                        section.setButtonAccessory(accessory_btn)
                                        await interaction.update({ components: [container] })
                                        const rawData = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/').then(response => response.json())
                                        const game = await getRandomGame(rawData, openedItem.amountFrom, openedItem.amountTo, openedItem.currency)
                                        if (game !== null) {
                                            gameURL = `https://store.steampowered.com/app/${game.data.steam_appid}`
                                            gameImageURL = game.data.header_image
                                            array.push(`**${game.data.name}**`)
                                        } else {
                                            await interaction.editReply({ components: components })
                                            return interaction.followUp({ content: `${client.language({ textId: "Could not find a game with suitable price in 10 attempts", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                                        }
                                        break
                                    }
                                    case RewardType.Role: {
                                        const role = rewards.roles.find(e => e.id === openedItem.id && e.ms === openedItem.ms)
                                        if (role) rewards.roles.set(openedItem.id, { id: openedItem.id, amount: role.amount + amount, ms: openedItem.ms })
                                        else rewards.roles.set(openedItem.id, { id: openedItem.id, amount: amount, ms: openedItem.ms })
                                        break
                                    }
                                    case RewardType.Currency:
                                        rewards.currency += amount
                                        break
                                    case RewardType.Experience:
                                        rewards.xp += amount
                                        break
                                    case RewardType.Reputation:
                                        rewards.rp += amount
                                        break
                                    case RewardType.Item: {
                                        const openedItemServer = client.cache.items.find(element => element.itemID === openedItem.id && !element.temp && element.enabled)
                                        if (openedItemServer) {
                                            if (!object_items[openedItemServer.itemID]) {
                                                object_items[openedItemServer.itemID] = {
                                                    itemID: openedItemServer.itemID,
                                                    amount: amount,
                                                }    
                                            } else object_items[openedItemServer.itemID].amount += amount    
                                        }
                                        break
                                    }
                                }
                            }
                        } else {
                            const openedItem = drop(contains.sort((a,b) => +`${new Decimal(a.chance).minus(b.chance)}`), base_chance)
                            if (openedItem) {
                                const amount = client.functions.getRandomNumber(openedItem.amountFrom, openedItem.amountTo)
                                switch (openedItem.type) {
                                    case RewardType.SteamGame: {
                                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                                        const container = new ContainerBuilder(interaction.message.components[0].toJSON())
                                        const section = container.components.find(e => { return e.data.id === 144 })
                                        const accessory_btn = new ButtonBuilder()
                                            .setEmoji("⏳")
                                            .setDisabled(true)
                                            .setLabel(`${client.language({ textId: "OPEN", guildId: interaction.guildId, locale: interaction.locale })}`)
                                            .setStyle(ButtonStyle.Secondary)
                                            .setCustomId("0")
                                        section.setButtonAccessory(accessory_btn)
                                        await interaction.update({ components: [container] })
                                        const rawData = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/').then(response => response.json())
                                        const game = await getRandomGame(rawData, openedItem.amountFrom, openedItem.amountTo, openedItem.currency)
                                        if (game !== null) {
                                            gameURL = `https://store.steampowered.com/app/${game.data.steam_appid}`
                                            gameImageURL = game.data.header_image
                                            array.push(`**${game.data.name}**`)
                                        } else {
                                            await interaction.editReply({ components: components })
                                            return interaction.followUp({ content: `${client.language({ textId: "Could not find a game with suitable price in 10 attempts", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                                        }
                                        break
                                    }
                                    case RewardType.Role: {
                                        const role = rewards.roles.find(e => e.id === openedItem.id && e.ms === openedItem.ms)
                                        if (role) rewards.roles.set(openedItem.id, { id: openedItem.id, amount: role.amount + amount, ms: openedItem.ms })
                                        else rewards.roles.set(openedItem.id, { id: openedItem.id, amount: amount, ms: openedItem.ms })
                                        break
                                    }
                                    case RewardType.Currency:
                                        rewards.currency += amount
                                        break
                                    case RewardType.Experience:
                                        rewards.xp += amount
                                        break
                                    case RewardType.Reputation:
                                        rewards.rp += amount
                                        break
                                    case RewardType.Item: {
                                        const openedItemServer = client.cache.items.find(element => element.itemID === openedItem.id && !element.temp && element.enabled)
                                        if (openedItemServer) {
                                            if (!object_items[openedItemServer.itemID]) {
                                                object_items[openedItemServer.itemID] = {
                                                    itemID: openedItemServer.itemID,
                                                    amount: amount,
                                                }    
                                            } else object_items[openedItemServer.itemID].amount += amount    
                                        }
                                        break
                                    }
                                }
                            }    
                        }
                    }
                    for (const itemID in object_items) {
                        const openedItemServer = client.cache.items.find(element => element.itemID === itemID && !element.temp && element.enabled)
                        array.push(`${openedItemServer.displayEmoji}**${openedItemServer.name}** (${object_items[itemID].amount.toLocaleString()})`)
                        client.emit("economyLogCreate", interaction.guildId, `${client.language({ textId: "Inventory change", guildId: interaction.guildId })} (${openedItemServer.displayEmoji}**${openedItemServer.name}**) (${object_items[itemID].amount})) ${client.language({ textId: "for", guildId: interaction.guildId })} <@${interaction.guildId}>`)
                        await profile.addItem(itemID, object_items[itemID].amount)
                    }
                    profile.itemsOpened = new Decimal(profile.itemsOpened).plus(openAmount)
                    if (rewards.xp) {
                        array.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${rewards.xp.toLocaleString()})`)
                        await profile.addXp(rewards.xp)
                    }
                    if (rewards.currency) {
                        array.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${rewards.currency.toLocaleString()})`)
                        await profile.addCurrency(rewards.currency)
                    }
                    if (rewards.rp) {
                        array.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${rewards.rp.toLocaleString()})`)
                        await profile.addRp(rewards.rp)
                    }
                    if (rewards.roles.size) {
                        rewards.roles.forEach((role) => {
                            array.push(`<@&${role.id}>${role.ms ? ` [${client.functions.transformSecs(client, role.ms, interaction.guildId, interaction.locale)}]` : ``} (${role.amount.toLocaleString()})`)
                            profile.addRole(role.id, role.amount, role.ms)
                        })
                    }
                    if (Object.keys(object_items).length > 0) {
                        client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled).forEach(e => {
                            if (!profile.inventory.find(ui => ui.itemID == e.itemID)) foundAllItems = false
                        })
                        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Items)
                        await Promise.all(achievements.map(async achievement => {
                            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && foundAllItems == true && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { 
                                if (!achievements_to_give.includes(achievement.id)) {
                                    if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                                    client.tempAchievements[profile.userID].push(achievement.id)
                                    achievements_to_give.push(achievement.id)
                                }
                            }    
                        }))
                    }
                    await profile.subtractItem(serverItem.itemID, openAmount)
                    if (serverItem.openByItem?.itemID) {
                        switch (serverItem.openByItem.itemID) {
                            case "currency":
                                await profile.subtractCurrency(serverItem.openByItem.amount * openAmount)
                                break
                            case "xp":
                                await profile.subtractXp(serverItem.openByItem.amount * openAmount)
                                break
                            case "rp":
                                await profile.subtractRp(serverItem.openByItem.amount * openAmount)
                                break
                            default: 
                                await profile.subtractItem(serverItem.openByItem.itemID, serverItem.openByItem.amount * openAmount)
                                break
                        }    
                    }
                    await profile.addQuestProgression("itemsOpened", openAmount, serverItem.itemID)
                    const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.ItemsOpened)
                    await Promise.all(achievements.map(async achievement => {
                        if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.itemsOpened >= achievement.amount && !client.tempAchievements[interaction.user.id]?.includes(achievement.id)) { 
                            if (!client.tempAchievements[interaction.user.id]) client.tempAchievements[interaction.user.id] = []
                            client.tempAchievements[interaction.user.id].push(achievement.id)
                            achievements_to_give.push(achievement.id)
                        }
                    }))
                    if (achievements_to_give.length) {
                        for (const achievementID of achievements_to_give) {
                            await profile.addAchievement(achievementID)
                        }
                    }
                    client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "opened", guildId: interaction.guildId })} ${serverItem.displayEmoji}**${serverItem.name}** (${serverItem.itemID}) (${openAmount}) (${interaction.message.url})`)
                    item = profile.inventory.find((element) => { return element.itemID == serverItem.itemID })
                    if (serverItem.openByItem?.itemID) {
                        if (serverItem.openByItem.itemID == "currency" && profile.currency < serverItem.openByItem.amount) canOpen = false
                        else if (serverItem.openByItem.itemID == "xp" && profile.totalxp < serverItem.openByItem.amount) canOpen = false
                        else if (serverItem.openByItem.itemID == "rp" && profile.rp - serverItem.openByItem.amount < -1000) canOpen = false
                        else if (serverItem.openByItem.itemID !== "currency" && serverItem.openByItem.itemID !== "rp" && serverItem.openByItem.itemID !== "xp") {
                            const userItemKey = profile.inventory.find((element) => { return element.itemID === serverItem.openByItem.itemID })
                            if (userItemKey?.amount < serverItem.openByItem.amount ) canOpen = false
                            else if (!userItemKey) canOpen = false
                        }
                    }
                    if (item.amount < 1) canOpen = false
                    if (serverItem.cooldown_open) {
                        if (!profile.itemsCooldowns) profile.itemsCooldowns = new Map()
                        if (profile.itemsCooldowns.get(serverItem.itemID)) profile.itemsCooldowns.set(serverItem.itemID, {...profile.itemsCooldowns.get(serverItem.itemID), open: new Date(Date.now() + serverItem.cooldown_open * 1000) })
                        else profile.itemsCooldowns.set(serverItem.itemID, { open: new Date(Date.now() + serverItem.cooldown_open * 1000) })
                    }
                    await profile.save()
                    contains = JSON.parse(JSON.stringify(serverItem.contains.filter(e => (e.type === RewardType.Item && client.cache.items.find(it => it.itemID === e.id && it.enabled && !it.temp)) || e.type !== RewardType.Item)))
                }
            }
        }
        if (contains.length < 1) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This item cannot be opened", guildId: interaction.guildId, locale: interaction.locale })}: ${serverItem.displayEmoji}${serverItem.name}`, flags: ["Ephemeral"] })
        }
        const open_btn = new ButtonBuilder().setStyle(ButtonStyle.Success).setEmoji(client.config.emojis.open).setLabel(`${client.language({ textId: "OPEN", guildId: interaction.guildId, locale: interaction.locale })}`).setCustomId(`usr{${interaction.user.id}}cmd{open}item{${serverItem.itemID}}letsOpen`)    
        const itemsForOpenDescription = []
        let key_emoji
        let key_name
        let key_inventory_amount
        if (serverItem.openByItem?.itemID) {
            switch (serverItem.openByItem.itemID) {
                case "currency":
                    key_emoji = settings.displayCurrencyEmoji
                    key_name = settings.currencyName
                    key_inventory_amount = Math.floor(profile.currency).toLocaleString()
                    itemsForOpenDescription.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${serverItem.openByItem.amount.toLocaleString()})`)
                    break
                case "xp":
                    key_emoji = client.config.emojis.XP
                    key_name = `${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}`
                    key_inventory_amount = Math.floor(profile.totalxp).toLocaleString()
                    itemsForOpenDescription.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${serverItem.openByItem.amount.toLocaleString()})`)
                    break
                case "rp":
                    key_emoji = client.config.emojis.RP
                    key_name = `${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`
                    key_inventory_amount = `${+profile.rp.toFixed(2)} / -1000`
                    itemsForOpenDescription.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${serverItem.openByItem.amount.toLocaleString()})`)
                    break
                default: {
                    const serverItemForOpen = client.cache.items.find(element => element.itemID == serverItem.openByItem.itemID && !element.temp && element.enabled)
                    if (!serverItemForOpen) {
                        key_emoji = ""
                        key_name = serverItem.openByItem.itemID
                        itemsForOpenDescription.push(`${serverItem.openByItem.itemID}`)
                    } else if (serverItemForOpen.found) {
                        key_emoji = serverItemForOpen.displayEmoji
                        key_name = serverItemForOpen.name
                        itemsForOpenDescription.push(`${serverItemForOpen.displayEmoji}**${serverItemForOpen.name}** (${serverItem.openByItem.amount.toLocaleString()})`)
                    } else {
                        key_emoji = ""
                        key_name = `||???????????||`
                        itemsForOpenDescription.push(`||???????????||`)
                    }
                    const key_inventory = profile.inventory.find((element) => { return element.itemID == serverItem.openByItem.itemID })
                    if (key_inventory) key_inventory_amount = key_inventory.amount.toLocaleString()
                    else key_inventory_amount = 0
                    break
                }
            }
        }
        let luck_multiplier_for_channel = 0
        let channel = client.cache.channels.find(channel => channel.id === interaction.channel.id && channel.isEnabled)
        if (!channel) channel = client.cache.channels.find(channel => channel.id === interaction.channel.parentId && channel.isEnabled)
        if (channel) {
            luck_multiplier_for_channel = channel.luck_multiplier
        }
        const bonus = new Decimal(1).plus(profile.getLuckBoost(luck_multiplier_for_channel))
        const description = [serverItem.description]
        if (itemsForOpenDescription.length) description.push(`${client.language({ textId: "Required to open", guildId: interaction.guildId, locale: interaction.locale })}: ${itemsForOpenDescription.join(", ")}`)
        if (bonus < 1) description.push(`${client.config.emojis.random}${client.language({ textId: "Luck", guildId: interaction.guildId, locale: interaction.locale })} ${bonus.mul(100).minus(100)}%`)
        else if (bonus > 1 && !profile.settings_open_disallow_luck) description.push(`${client.config.emojis.random}${client.language({ textId: "Luck", guildId: interaction.guildId, locale: interaction.locale })} ${bonus.mul(100).minus(100)}%`)
        if (!canOpen && !profile.settings_open_always_active) open_btn.setStyle(ButtonStyle.Secondary).setDisabled(true)
        const containsItems = []
        if (!profile.settings_open_disallow_luck) contains = client.functions.adjustChanceByLuck(contains, bonus, serverItem.open_mode)
        contains.sort((a, b) => +`${new Decimal(b.chance).minus(a.chance)}`)    
        contains.forEach(itemContent => {
            const amount = itemContent.amountFrom !== itemContent.amountTo ? `${itemContent.amountFrom.toLocaleString()}-${itemContent.amountTo.toLocaleString()}` : `${itemContent.amountFrom.toLocaleString()}`
            const chance = itemContent.chance
            switch (itemContent.type) {
                case RewardType.SteamGame:
                    containsItems.push(`${client.config.emojis.Steam}**${client.language({ textId: "Random game", guildId: interaction.guildId, locale: interaction.locale })}** (${itemContent.amountFrom}-${itemContent.amountTo} ${client.language({ textId: itemContent.currency, guildId: interaction.guildId, locale: interaction.locale })}) (${client.config.emojis.random}${chance}%)`)
                    break
                case RewardType.Currency:
                    containsItems.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${amount}) (${client.config.emojis.random}${chance}%)`)
                    break
                case RewardType.Experience:
                    containsItems.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${amount}) (${client.config.emojis.random}${chance}%)`)
                    break
                case RewardType.Reputation:
                    containsItems.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${amount}) (${client.config.emojis.random}${chance}%)`)
                    break
                case RewardType.Role:
                    containsItems.push(`<@&${itemContent.id}>${itemContent.minutes ? ` [${client.functions.transformSecs(client, itemContent.minutes*60*1000, interaction.guildId, interaction.locale)}]` : ``} (${amount}) (${client.config.emojis.random}${chance}%)`)
                    break
                default: {
                    const item = client.cache.items.find(element => element.itemID === itemContent.id && !element.temp && element.enabled)
                    if (item) {
                        if (item.found) containsItems.push(`${item.displayEmoji}**${item.name}** (${amount}) (${client.config.emojis.random}${chance}%)`)
                        else containsItems.push(`||???????????|| (${client.config.emojis.random}${chance}%)`)
                    } else containsItems.push(`${itemContent.id} (${client.config.emojis.random}${chance}%)`) 
                    break
                }
            }
        })
        if (serverItem.open_mode === "single") {
            const sum = contains.reduce((prev, current) => prev.plus(current.chance), new Decimal(0))
            if (sum < 100) {
                const nothing = new Decimal(100).minus(sum)
                containsItems.push(`${client.language({ textId: "Nothing", guildId: interaction.guildId, locale: interaction.locale })} (${client.config.emojis.random}${nothing}%)`)
            }    
        } else if (serverItem.open_mode === "multiple" && new Decimal(contains[0].chance).lt(100)) {
            const nothing = new Decimal(100).minus(contains[0].chance)
            containsItems.push(`${client.language({ textId: "Nothing", guildId: interaction.guildId, locale: interaction.locale })} (${client.config.emojis.random}${nothing}%)`)
        }
        const row = new ActionRowBuilder().addComponents([new ButtonBuilder().setCustomId(`cmd{open}usr{${interaction.user.id}}settings`).setEmoji(client.config.emojis.gear).setStyle(ButtonStyle.Secondary)])
        const emojiURL = await serverItem.getEmojiURL()
        const container = new ContainerBuilder()
            .addSectionComponents([
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent([
                                "# " + client.language({ textId: "OPEN", guildId: interaction.guildId, locale: interaction.locale }),
                                "## " + serverItem.name,
                                `-# ${serverItem.description}`,
                                itemsForOpenDescription.length ? `${client.language({ textId: "Required to open", guildId: interaction.guildId, locale: interaction.locale })}: ${itemsForOpenDescription.join(", ")}` : undefined,
                                bonus < 1 ? `${client.config.emojis.random}${client.language({ textId: "Luck", guildId: interaction.guildId, locale: interaction.locale })} ${bonus.mul(100).minus(100)}%` : bonus > 1 && !profile.settings_open_disallow_luck ? `${client.config.emojis.random}${client.language({ textId: "Luck", guildId: interaction.guildId, locale: interaction.locale })} ${bonus.mul(100).minus(100)}%` : undefined,
                                `${serverItem.displayEmoji}**${serverItem.name}**: ${Math.floor(item.amount).toLocaleString()}${serverItem.openByItem?.itemID ? `\n${key_emoji}**${key_name}**: ${key_inventory_amount}` : ""}`
                            ].filter(e => e).join("\n"))
                    ])
                    .setThumbnailAccessory(ThumbnailBuilder => ThumbnailBuilder.setURL(serverItem.image || emojiURL || "https://www.meme-arsenal.com/memes/15ef8d1ccbb4514e0a758c61e1623b2f.jpg"))
            ])
            .addActionRowComponents(row)
            .addSeparatorComponents(SeparatorBuilder => SeparatorBuilder.setSpacing(SeparatorSpacingSize.Large))
            .addSectionComponents([
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent([
                                `### ${client.language({ textId: "Inside", guildId: interaction.guildId, locale: interaction.locale })}:`,
                                containsItems.join("\n")
                            ].join('\n'))
                    ])
                    .setButtonAccessory(open_btn).setId(144)
            ])
        if (rewards) {
            container.addSeparatorComponents(SeparatorBuilder => SeparatorBuilder.setSpacing(SeparatorSpacingSize.Large))
            const textDisplay = new TextDisplayBuilder()
                .setContent(`### ${client.language({ textId: "You", guildId: interaction.guildId, locale: interaction.locale })} ${client.language({ textId: "opened", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.displayEmoji}**${serverItem.name}** (${openAmount})` + "\n" + (array.length ? array.join("\n") : `${client.language({ textId: "Empty", guildId: interaction.guildId, locale: interaction.locale })}`))
            if (array.length) {
                const section = new SectionBuilder().addTextDisplayComponents(textDisplay)
                if (gameURL) {
                    section.setButtonAccessory(new ButtonBuilder().setEmoji(client.config.emojis.Steam).setLabel(client.language({ textId: "Store page", guildId: interaction.guildId, locale: interaction.locale })).setStyle(ButtonStyle.Link).setURL(gameURL))
                } else {
                    section.setButtonAccessory(new ButtonBuilder().setCustomId(`cmd{inventory}usr{${interaction.user.id}}eph reply`).setEmoji(client.config.emojis.inventory).setLabel(client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })).setStyle(ButtonStyle.Secondary))
                }
                container.addSectionComponents(section)    
            } else {
                container.addTextDisplayComponents(textDisplay)
            }
            if (gameImageURL) {
                container.addMediaGalleryComponents(MediaGalleryBuilder => MediaGalleryBuilder.addItems(MediaGalleryItemBuilder => MediaGalleryItemBuilder.setURL(gameImageURL)))
            }
        }
        if (interaction.isChatInputCommand() || interaction.customId?.includes("reply")) return interaction.reply({ components: [container], flags })
        else {
            if (interaction.replied || interaction.deferred) return interaction.editReply({ components: [container] })
            else return interaction.update({ components: [container] })
        }
    }
}
async function getRandomGame(games, lowestPrice, highestPrice, priceType) {
    const fetch = require("node-fetch")
    let i = 0
    while (true) {
        const game = games.applist.apps[Math.floor(Math.random()*games.applist.apps.length)]
        const gameDetails = await fetch(`https://store.steampowered.com/api/appdetails?appids=${game.appid}&cc=${priceType}`).then(response => response.json().then(response => {
            if (response === null) return null
            return response[game.appid]
        }))
        if (gameDetails.success && gameDetails.data.is_free == false && gameDetails.data.type == "game" && gameDetails.data.price_overview?.initial <= highestPrice*100 && gameDetails.data.price_overview?.initial >= lowestPrice*100) {
            return gameDetails
        }
        i++
        if (i === 10) return null
    }
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
    if (!secs) return `${ms} ${client.language({ textId: "milliseconds", guildId: guildId, locale: locale })}.`
}
const lerp = (min, max, roll) => ((1 - roll) * min + roll * max)
const drop = (items, roll) => {
    const chance = lerp(0, 100, roll)
    let current = new Decimal(0)
    for (const item of items) {
        if (current.lte(chance) && current.plus(item.chance).gte(chance)) {
            return item
        }
        current = current.plus(item.chance)
    }
}