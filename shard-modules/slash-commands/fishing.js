const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, Collection } = require("discord.js")
const { AchievementType } = require("../enums")
const UserRegexp = /usr{(.*?)}/
const Decimal = require('decimal.js')
module.exports = {
    name: 'fishing',
    nameLocalizations: {
        'ru': `рыбалка`,
        'uk': `риболовля`,
        'es-ES': `pesca`
    },
    description: 'Start fishing',
    descriptionLocalizations: {
        'ru': `Начать рыбачить`,
        'uk': `Почати ловити рибу`,
        'es-ES': `Empezar a pescar`
    },
    options: [
        {
            name: 'executions',
            nameLocalizations: {
                'ru': `выполнения`,
                'uk': `виконання`,
                'es-ES': `ejecuciones`
            },
            description: 'Number of command executions',
            descriptionLocalizations: {
                'ru': `Количество выполнений команды`,
                'uk': `Кількість виконань команди`,
                'es-ES': `Número de ejecuciones del comando`
            },
            type: ApplicationCommandOptionType.Integer,
            required: false,
            choices: [
                {
                    name: '1',
                    value: 1
                },
                {
                    name: '5',
                    value: 5
                },
                {
                    name: '10',
                    value: 10
                },
            ]
        }
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
        const flags = []
        if (interaction.customId?.includes("eph")) flags.push("Ephemeral")
        const settings = client.cache.settings.get(interaction.guildId)
        if (!interaction.isChatInputCommand()) {
            if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
        }
        let fishingItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.activities?.fishing?.chance).sort((a, b) => a.activities.fishing.chance - b.activities.fishing.chance).map(e => { 
            return { itemID: e.itemID, displayEmoji: e.displayEmoji, emoji: e.emoji, name: e.name, activities: { fishing: { chance: e.activities.fishing.chance, amountFrom: e.activities.fishing.amountFrom, amountTo: e.activities.fishing.amountTo, minxp: e.activities.fishing.minxp, maxxp: e.activities.fishing.maxxp } }, found: e.found, rarity: e.rarity, description: e.description, hex: e.hex, image: e.image, activities_fishing_permission: e.activities_fishing_permission }
        })
        if (fishingItems.length === 0) {
            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No items for fishing", guildId: interaction.guildId, locale: interaction.locale })}**`, embeds: [], flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const fishingPrice = {
            id: settings.baitCurrency !== "currency" ? client.cache.items.find(e => !e.temp && e.itemID === settings.baitCurrency)?.itemID : "currency",
            name: settings.baitCurrency !== "currency" ? client.cache.items.find(e => !e.temp && e.itemID === settings.baitCurrency)?.name : settings.currencyName,
            emoji: settings.baitCurrency !== "currency" ? client.cache.items.find(e => !e.temp && e.itemID === settings.baitCurrency)?.displayEmoji : settings.displayCurrencyEmoji,
            amount: settings.baitPrice
        }
        let userFishingTool = fishingPrice.id === "currency" ? profile.currency : profile.inventory.find((e) => { return e.itemID == settings.baitCurrency })
        let amount = fishingPrice.id === "currency" ? userFishingTool : userFishingTool?.amount || 0
        if (fishingPrice.id !== "currency" && !fishingPrice.id) {
            return interaction.reply({
                content: `${client.config.emojis.NO}**${client.language({ textId: "UNKNOWN FISHING PRICE", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.baitCurrency}**`,
                embeds: [],
                components: [],
                flags: ["Ephemeral"]
            })
        }
        const fishing_btn = new ButtonBuilder()
            .setLabel(`${fishingPrice.amount}`)
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`usr{${interaction.user.id}}cmd{fishing}`)
            .setEmoji(fishingPrice.emoji)
        const fishing_x5_btn = new ButtonBuilder()
            .setLabel(`${fishingPrice.amount*5}`)
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`usr{${interaction.user.id}}cmd{fishing} x5`)
            .setEmoji(fishingPrice.emoji)
        const fishing_x10_btn = new ButtonBuilder()
            .setLabel(`${fishingPrice.amount*10}`)
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`usr{${interaction.user.id}}cmd{fishing} x10`)
            .setEmoji(fishingPrice.emoji)
        
        if (amount < fishingPrice.amount) fishing_btn.setDisabled(true)
        if (amount < fishingPrice.amount*5) fishing_x5_btn.setDisabled(true)
        if (amount < fishingPrice.amount*10) fishing_x10_btn.setDisabled(true)
        const count = interaction.isChatInputCommand() ? args?.executions || 1 : interaction.customId.includes("x5") ? 5 : interaction.customId.includes("x10") ? 10 : 1
        const components = [new ActionRowBuilder().addComponents([fishing_btn, fishing_x5_btn, fishing_x10_btn])]
        if (amount < fishingPrice.amount * count) {
            const toolAmount = fishingPrice.id === "currency" ? profile.currency.toLocaleString() : userFishingTool?.amount.toLocaleString() || 0
            return interaction.reply({ 
                content: `‼ ${client.language({ textId: "Fishing costs", guildId: interaction.guildId, locale: interaction.locale })} ${fishingPrice.emoji}${fishingPrice.amount*count}. ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })} ${fishingPrice.emoji}${toolAmount}`, 
                embeds: [],
                components: components, 
                flags: ["Ephemeral"]
            })
        }
        let array = []
        const object_items = {}
        const achievements_to_give = []
        const rewards = {
            xp: 0,
            currency: 0,
        }
        let luck_multiplier_for_channel = 0
        let channel = client.cache.channels.find(channel => channel.id === interaction.channel.id && channel.isEnabled)
        if (!channel) channel = client.cache.channels.find(channel => channel.id === interaction.channel.parentId && channel.isEnabled)
        if (channel) {
            luck_multiplier_for_channel = channel.luck_multiplier
        }
        const bonus = new Decimal(1).plus(profile.getLuckBoost(luck_multiplier_for_channel))
        fishingItems = client.functions.adjustActivityChanceByLuck(fishingItems, bonus, "fishing")
        for (let i = 1; i <= count; i++) {
            let base_chance = Math.random()
            if (base_chance === 0) base_chance = 1
            const asyncFilter = async (arr, predicate) => {
                const results = await Promise.all(arr.map(predicate))
                return results.filter((_v, index) => results[index])
            }
            let items = await asyncFilter(fishingItems, async (e) => {
                if (e.activities_fishing_permission) {
                    const permission = client.cache.permissions.find(i => i.id === e.activities_fishing_permission)
                    if (permission) {
                        const isPassing = permission.for(profile, interaction.member, interaction.channel)
                        if (isPassing.value === true) return e	
                    } else return e
                } else return e
            })
            const item = drop(items, base_chance)
            if (!item) {
                array.push({
                    item: undefined
                })
            } else {
                amount = client.functions.getRandomNumber(item.activities.fishing.amountFrom, item.activities.fishing.amountTo)
                if (!object_items[item.itemID]) {
                    object_items[item.itemID] = {
                        itemID: item.itemID,
                        name: item.name,
                        emoji: item.displayEmoji,
                        rarity: item.rarity,
                        amount: amount,
                        found: item.found
                    }    
                } else object_items[item.itemID].amount += amount
                let xp_multiplier_for_channel = 0
                let channel = client.cache.channels.find(channel => channel.id === interaction.channel.id && channel.isEnabled)
                if (!channel) channel = client.cache.channels.find(channel => channel.id === interaction.channel.parentId && channel.isEnabled)
                if (channel) {
                    xp_multiplier_for_channel = channel.xp_multiplier
                }
                const base_xp = client.functions.getRandomNumber(item.activities.fishing.minxp, item.activities.fishing.maxxp) * amount
                const xp = base_xp + (base_xp * profile.getXpBoost(xp_multiplier_for_channel))
                if (xp) rewards.xp += xp
                array.push({
                    item: item,
                    amount: amount,
                    xp: xp
                })
            }
        }
        for (const itemID in object_items) {
            await profile.addItem(itemID, object_items[itemID].amount)
            await profile.addQuestProgression("fishing", object_items[itemID].amount, itemID)
            const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.FishingItem)
            await Promise.all(achievements.map(async achievement => {
                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && achievement.items?.includes(itemID) && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { 
                    if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                    client.tempAchievements[profile.userID].push(achievement.id)
                    await profile.addAchievement(achievement)
                }    
            }))
        }
        profile.fishing += count
        await profile.addQuestProgression("fishing", count)
        if (rewards.xp) await profile.addXp(rewards.xp)
        if (rewards.currency) await profile.addCurrency(rewards.currency)
        if (fishingPrice.amount > 0) {
            if (fishingPrice.id === "currency") await profile.subtractCurrency(fishingPrice.amount*count)
            else await profile.subtractItem(fishingPrice.id, fishingPrice.amount*count)
        }
        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Fishing)
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.fishing >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { 
                if (!achievements_to_give.includes(achievement.id)) {
                    if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                    client.tempAchievements[profile.userID].push(achievement.id)
                    achievements_to_give.push(achievement.id)
                }
            }
        }))
        if (achievements_to_give.length) {
            for (const achievementID of achievements_to_give) {
                await profile.addAchievement(achievementID)
            }
        }
        await profile.save()
        if (fishingPrice.id === "currency") {
            if (profile.currency < fishingPrice.amount) fishing_btn.setDisabled(true)
            if (profile.currency < fishingPrice.amount*5) fishing_x5_btn.setDisabled(true)
            if (profile.currency < fishingPrice.amount*10) fishing_x10_btn.setDisabled(true)
        } else {
            userFishingTool = fishingPrice.id === "currency" ? profile.currency : profile.inventory.find((e) => { return e.itemID == fishingPrice.id })
            if (userFishingTool === undefined || userFishingTool.amount < fishingPrice.amount) fishing_btn.setDisabled(true)
            if (userFishingTool === undefined || userFishingTool.amount < fishingPrice.amount*5) fishing_x5_btn.setDisabled(true)
            if (userFishingTool === undefined || userFishingTool.amount < fishingPrice.amount*10) fishing_x10_btn.setDisabled(true)
        }
        const toolAmount = fishingPrice.id === "currency" ? profile.currency.toLocaleString() : userFishingTool?.amount.toLocaleString() || 0
        const embed = new EmbedBuilder()
        const luck = bonus.mul(100).minus(100) > 0 || bonus.mul(100).minus(100) < 0 ? `${client.config.emojis.random}${client.language({ textId: `Luck`, guildId: interaction.guildId, locale: interaction.locale })} ${bonus.mul(100).minus(100)}%\n` : ""
        if (array.length > 1) {
            embed.setDescription(`${luck}${client.language({ textId: "You caught", guildId: interaction.guildId, locale: interaction.locale })}:\n${array.map((e, index) => `${index+1}. ${e.item ? `${e.item.displayEmoji}**${e.item.name}** (${e.amount}) ${e.xp ? `(${client.config.emojis.XP}${e.xp.toFixed()})` : ""}`: `${client.language({ textId: "Nothing caught", guildId: interaction.guildId, locale: interaction.locale })}` }`).join("\n")}`)
                .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
                .setColor(3093046)
                .setThumbnail(settings.fishingIcon || null)
                .addFields([{ name: `\u200B`, value: `${fishingPrice.emoji}**${fishingPrice.name}**: ${toolAmount}`}])    
        } else {
            if (!array[0].item) {
                if (interaction.isChatInputCommand() || interaction.customId?.includes("reply")) return interaction.reply({ content: `${luck}${client.language({ textId: "You couldn't catch anything! Balance", guildId: interaction.guildId, locale: interaction.locale })}: ${fishingPrice.emoji}${toolAmount}`, components: components, embeds: [], flags })
                else return interaction.update({ content: `${luck}${client.language({ textId: "You couldn't catch anything! Balance", guildId: interaction.guildId, locale: interaction.locale })}: ${fishingPrice.emoji}${toolAmount}`, components: components, embeds: [] })
            }
            embed.setDescription(`${luck}${client.language({ textId: "You caught", guildId: interaction.guildId, locale: interaction.locale })}: ${array[0].item.displayEmoji}**${array[0].item.name}** (${array[0].amount})\n${array[0].item.rarity}\n${array[0].item.description}`)
                .setColor(array[0].item.hex || null)
                .setThumbnail(array[0].item.image || await client.functions.getEmojiURL(client, array[0].item.emoji) || settings.fishingIcon || null)
                .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
            if (array[0].xp) embed.addFields([{ name: `\u200B`, value: `${client.language({ textId: "For the find you received", guildId: interaction.guildId, locale: interaction.locale })}:\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${array[0].xp.toFixed()}` }])
            embed.addFields([{ name: `\u200B`, value: `${`${fishingPrice.emoji}**${fishingPrice.name}**: ${toolAmount}`}` }])
        }
        if (settings.fishingName) embed.setTitle(settings.fishingName)
        if (interaction.isChatInputCommand() || interaction.customId?.includes("reply")) return interaction.reply({ content: ` `, embeds: [embed], components: components, flags })
        else return interaction.update({ content: ` `, embeds: [embed], components: components })
    }
}
const lerp = (min, max, roll) => ((1 - roll) * min + roll * max)
const drop = (items, roll) => {
    const chance = lerp(0, 100, roll)
    let current = new Decimal(0)
    for (const item of items) {
        if (current.lte(chance) && current.plus(item.activities.fishing.chance).gte(chance)) {
            return item
        }
        current = current.plus(item.activities.fishing.chance)
    }
}