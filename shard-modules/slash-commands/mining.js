const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, Collection, AttachmentBuilder } = require("discord.js")
const { AchievementType } = require("../enums")
const UserRegexp = /usr{(.*?)}/
const Decimal = require('decimal.js')
module.exports = {
    name: 'mining',
    nameLocalizations: {
        'ru': `копать`,
        'uk': `копати`,
        'es-ES': `minar`
    },
    description: 'Start mining',
    descriptionLocalizations: {
        'ru': `Начать копать`,
        'uk': `Почати копати`,
        'es-ES': `Empezar a minar`
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
        const settings = client.cache.settings.get(interaction.guildId)
        const flags = []
        if (interaction.customId?.includes("eph")) flags.push("Ephemeral")
        if (!interaction.isChatInputCommand()) {
            if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
        }
        let miningItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.activities?.mining?.chance).sort((a, b) => a.activities.mining.chance - b.activities.mining.chance).map(e => { 
            return { itemID: e.itemID, displayEmoji: e.displayEmoji, emoji: e.emoji, name: e.name, activities: { mining: { chance: e.activities.mining.chance, amountFrom: e.activities.mining.amountFrom, amountTo: e.activities.mining.amountTo, minxp: e.activities.mining.minxp, maxxp: e.activities.mining.maxxp } }, found: e.found, rarity: e.rarity, description: e.description, hex: e.hex, image: e.image, activities_mining_permission: e.activities_mining_permission }
        })
        if (miningItems.length === 0) {
            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No items for mining", guildId: interaction.guildId, locale: interaction.locale })}**`, embeds: [], flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const miningPrice = {
            id: settings.miningTool !== "currency" ? client.cache.items.find(e => !e.temp && e.itemID === settings.miningTool)?.itemID : "currency",
            name: settings.miningTool !== "currency" ? client.cache.items.find(e => !e.temp && e.itemID === settings.miningTool)?.name : settings.currencyName,
            emoji: settings.miningTool !== "currency" ? client.cache.items.find(e => !e.temp && e.itemID === settings.miningTool)?.displayEmoji : settings.displayCurrencyEmoji,
            amount: settings.miningPrice
        }
        let userMiningTool = miningPrice.id === "currency" ? profile.currency : profile.inventory.find((e) => { return e.itemID == settings.miningTool })
        let amount = miningPrice.id === "currency" ? userMiningTool : userMiningTool?.amount || 0
        if (miningPrice.id !== "currency" && !miningPrice.id) {
            return interaction.reply({
                content: `${client.config.emojis.NO}**${client.language({ textId: "UNKNOWN MINING PRICE", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.miningTool}**`,
                embeds: [],
                components: [],
                flags: ["Ephemeral"]
            })
        }
        const mining_btn = new ButtonBuilder()
            .setLabel(`${miningPrice.amount}`)
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`usr{${interaction.user.id}}cmd{mining}`)
            .setEmoji(miningPrice.emoji)
        const mining_x5_btn = new ButtonBuilder()
            .setLabel(`${miningPrice.amount*5}`)
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`usr{${interaction.user.id}}cmd{mining} x5`)
            .setEmoji(miningPrice.emoji)
        const mining_x10_btn = new ButtonBuilder()
            .setLabel(`${miningPrice.amount*10}`)
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`usr{${interaction.user.id}}cmd{mining} x10`)
            .setEmoji(miningPrice.emoji)
        
        if (amount < miningPrice.amount) mining_btn.setDisabled(true)
        if (amount < miningPrice.amount*5) mining_x5_btn.setDisabled(true)
        if (amount < miningPrice.amount*10) mining_x10_btn.setDisabled(true)
        const count = interaction.isChatInputCommand() ? args?.executions || 1 : interaction.customId.includes("x5") ? 5 : interaction.customId.includes("x10") ? 10 : 1
        const components = [new ActionRowBuilder().addComponents([mining_btn, mining_x5_btn, mining_x10_btn])]
        if (amount < miningPrice.amount * count) {
            const toolAmount = miningPrice.id === "currency" ? profile.currency.toLocaleString() : userMiningTool?.amount.toLocaleString() || 0
            return interaction.reply({ 
                content: `‼ ${client.language({ textId: "Mining costs", guildId: interaction.guildId, locale: interaction.locale })} ${miningPrice.emoji}${miningPrice.amount*count}. ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })} ${miningPrice.emoji}${toolAmount}`, 
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
        miningItems = client.functions.adjustActivityChanceByLuck(miningItems, bonus, "mining")
        for (let i = 1; i <= count; i++) {
            let base_chance = Math.random()
            if (base_chance === 0) base_chance = 1
            const asyncFilter = async (arr, predicate) => {
                const results = await Promise.all(arr.map(predicate))
                return results.filter((_v, index) => results[index])
            }
            let items = await asyncFilter(miningItems, async (e) => {
                if (e.activities_mining_permission) {
                    const permission = client.cache.permissions.find(i => i.id === e.activities_mining_permission)
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
                amount = client.functions.getRandomNumber(item.activities.mining.amountFrom, item.activities.mining.amountTo)
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
                const base_xp = client.functions.getRandomNumber(item.activities.mining.minxp, item.activities.mining.maxxp) * amount
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
            await profile.addQuestProgression("mining", object_items[itemID].amount, itemID)
            const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.MiningItem)
            await Promise.all(achievements.map(async achievement => {
                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && achievement.items?.includes(itemID) && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { 
                    if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                    client.tempAchievements[profile.userID].push(achievement.id)
                    await profile.addAchievement(achievement)
                }    
            }))
        }
        profile.mining += count
        await profile.addQuestProgression("mining", count)
        if (rewards.xp) await profile.addXp(rewards.xp)
        if (rewards.currency) await profile.addCurrency(rewards.currency)
        if (miningPrice.amount > 0) {
            if (miningPrice.id === "currency") await profile.subtractCurrency(miningPrice.amount*count)
            else await profile.subtractItem(miningPrice.id, miningPrice.amount*count)
        }
        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Mining)
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.mining >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { 
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
        if (miningPrice.id === "currency") {
            if (profile.currency < miningPrice.amount) mining_btn.setDisabled(true)
            if (profile.currency < miningPrice.amount*5) mining_x5_btn.setDisabled(true)
            if (profile.currency < miningPrice.amount*10) mining_x10_btn.setDisabled(true)
        } else {
            userMiningTool = miningPrice.id === "currency" ? profile.currency : profile.inventory.find((e) => { return e.itemID == miningPrice.id })
            if (userMiningTool === undefined || userMiningTool.amount < miningPrice.amount) mining_btn.setDisabled(true)
            if (userMiningTool === undefined || userMiningTool.amount < miningPrice.amount*5) mining_x5_btn.setDisabled(true)
            if (userMiningTool === undefined || userMiningTool.amount < miningPrice.amount*10) mining_x10_btn.setDisabled(true)
        }
        const toolAmount = miningPrice.id === "currency" ? profile.currency.toLocaleString() : userMiningTool?.amount.toLocaleString() || 0
        const embed = new EmbedBuilder()
        const luck = bonus.mul(100).minus(100) > 0 || bonus.mul(100).minus(100) < 0 ? `${client.config.emojis.random}${client.language({ textId: `Luck`, guildId: interaction.guildId, locale: interaction.locale })} ${bonus.mul(100).minus(100)}%\n` : ""
        if (array.length > 1) {
            embed.setDescription(`${luck}${client.language({ textId: "You mined", guildId: interaction.guildId, locale: interaction.locale })}:\n${array.map((e, index) => `${index+1}. ${e.item ? `${e.item.displayEmoji}**${e.item.name}** (${e.amount}) ${e.xp ? `(${client.config.emojis.XP}${e.xp.toFixed()})` : ""}`: `${client.language({ textId: "Nothing mined", guildId: interaction.guildId, locale: interaction.locale })}` }`).join("\n")}`)
                .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
                .setColor(3093046)
                .setThumbnail(settings.miningIcon || null)
                .addFields([{ name: `\u200B`, value: `${miningPrice.emoji}**${miningPrice.name}**: ${toolAmount}`}])    
        } else {
            if (!array[0].item) {
                if (interaction.isChatInputCommand() || interaction.customId?.includes("reply")) return interaction.reply({ content: `${luck}${client.language({ textId: "You couldn't mine anything! Balance", guildId: interaction.guildId, locale: interaction.locale })}: ${miningPrice.emoji}${toolAmount}`, components: components, embeds: [], flags })
                return interaction.update({ content: `${luck}${client.language({ textId: "You couldn't mine anything! Balance", guildId: interaction.guildId, locale: interaction.locale })}: ${miningPrice.emoji}${toolAmount}`, components: components, embeds: [] })
            }
            embed.setDescription(`${luck}${client.language({ textId: "You mined", guildId: interaction.guildId, locale: interaction.locale })}: ${array[0].item.displayEmoji}**${array[0].item.name}** (${array[0].amount})\n${array[0].item.rarity}\n${array[0].item.description}`)
                .setColor(array[0].item.hex || null)
                .setThumbnail(array[0].item.image || await client.functions.getEmojiURL(client, array[0].item.emoji) || settings.miningIcon || null)
                .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
            if (array[0].xp) embed.addFields([{ name: `\u200B`, value: `${client.language({ textId: "For the find you received", guildId: interaction.guildId, locale: interaction.locale })}:\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${array[0].xp.toFixed()}` }])
            embed.addFields([{ name: `\u200B`, value: `${`${miningPrice.emoji}**${miningPrice.name}**: ${toolAmount}`}` }])
        }
        if (settings.miningName) embed.setTitle(settings.miningName)
        if (interaction.isChatInputCommand() || interaction.customId?.includes("reply")) return interaction.reply({ content: ` `, embeds: [embed], components: components, flags })
        else return interaction.update({ content: ` `, embeds: [embed], components: components })
    }
}
const lerp = (min, max, roll) => ((1 - roll) * min + roll * max)
const drop = (items, roll) => {
    const chance = lerp(0, 100, roll)
    let current = new Decimal(0)
    for (const item of items) {
        if (current.lte(chance) && current.plus(item.activities.mining.chance).gte(chance)) {
            return item
        }
        current = current.plus(item.activities.mining.chance)
    }
}