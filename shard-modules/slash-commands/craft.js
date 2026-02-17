const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } = require("discord.js")
const { AchievementType } = require("../enums")
const UserRegexp = /usr{(.*?)}/
const IndexRegexp = /index{(.*?)}/
const ItemRegexp = /item{(.*?)}/
const LimitRegexp = /limit{(.*?)}/
module.exports = {
    name: 'craft',
    nameLocalizations: {
        'ru': `крафт`,
        'uk': `крафт`,
        'es-ES': `fabricar`
    },
    description: 'Craft an item',
    descriptionLocalizations: {
        'ru': `Скрафтить предмет`,
        'uk': `Скрафтити предмет`,
        'es-ES': `fabricar un objeto`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': 'предмет',
                'uk': 'предмет',
                'es-ES': 'objeto'
            },
            description: 'Item name to craft',
            descriptionLocalizations: {
                'ru': 'Имя предмета для крафта',
                'uk': 'Назва предмету для крафту',
                'es-ES': 'Nombre del objeto para fabricar'
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
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
        if (!interaction.isChatInputCommand() && interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) {
            return interaction.deferUpdate()
        }
        const settings = client.cache.settings.get(interaction.guildId)
        if ((interaction.isChatInputCommand() && !args.item) || (interaction.isButton() && interaction.customId.includes("view"))) {
            const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.found && !item.temp && item.enabled && item.crafts.some(craft => craft.isFound)).sort((a, b) => a.name > b.name).map(e => e)
            let min = 0
            let limit = 20
            if (!interaction.isChatInputCommand()) {
                limit = +LimitRegexp.exec(interaction.customId)?.[1]
                min = limit - 20
                if (isNaN(limit) || isNaN(min)) {
                    limit = +LimitRegexp.exec(interaction.customId)?.[1]
                    min = limit - 20  
                }
            }
            const array_btn = [
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{craft}usr{${interaction.user.id}}limit{20}view 1`).setDisabled((items.length <= 20 && min == 0) || (items.length > 20 && min < 20)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{craft}usr{${interaction.user.id}}limit{${limit - 20}}view 2`).setDisabled((items.length <= 20 && min == 0) || (items.length > 20 && min < 20)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{craft}usr{${interaction.user.id}}limit{${limit + 20}}view 3`).setDisabled((items.length <= 20 && min == 0) || (items.length > 20 && min >= items.length - 20)),
                new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{craft}usr{${interaction.user.id}}limit{${items.length + (items.length % 20 == 0 ? 0 : 20 - (items.length % 20))}}view 4`).setDisabled((items.length <= 20 && min == 0) || (items.length > 20 && min >= items.length - 20))
            ]
            const embed = new EmbedBuilder()
                .setColor(3093046)
                .setTitle(`${client.language({ textId: "All crafts", guildId: interaction.guildId, locale: interaction.locale })} (${items.length})`)
            if (!items.length) embed.setDescription(`${client.language({ textId: "No items", guildId: interaction.guildId, locale: interaction.locale })}`)
            else embed.setDescription(items.slice(min, limit).map((item, index) => {
                return `${index+1+min}. ${item.displayEmoji}**${item.name}**`
            }).join("\n"))
            if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(array_btn)] })
            else return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(array_btn)] })
        }
        if (interaction.isChatInputCommand() && args.item?.length < 2) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}` })  
        }
        const search = (element) => { return element.guildID === interaction.guildId && !element.temp && element.enabled && (interaction.isButton() ? element.itemID === ItemRegexp.exec(interaction.customId)?.[1] && element.found : interaction.isChatInputCommand() ? element.name.toLowerCase().includes(args.item.toLowerCase()) && element.found : element.itemID == undefined )}
        const filteredItems = client.cache.items.filter(search)
        if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() == args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}` })  
        }
        const serverItem = filteredItems.some(e => e.name.toLowerCase() == args?.item?.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() == args.item.toLowerCase()) : filteredItems.first()
        const embed = new EmbedBuilder().setColor(3093046)
        let amount1 = 1
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if (!serverItem || !serverItem.found) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This item does not exist or is unknown", guildId: interaction.guildId, locale: interaction.locale })}.` })
        }
        if (interaction.isButton()) {
            let index = IndexRegexp.exec(interaction.customId)?.[1]
            if (!serverItem.crafts[index]) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This recipe does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
            if (serverItem.crafts[index].permission) {
                const permission = client.cache.permissions.find(e => e.id === serverItem.crafts[index].permission)
                if (permission) {
                    const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                    if (isPassing.value === false) {
                        return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                    }
                }
            }
            if (profile.itemsCooldowns && profile.itemsCooldowns.get(serverItem.itemID)?.[`craft${index}`] > new Date()) {
                return interaction.reply({ content: `⏳${client.language({ textId: "Wait for cooldown on this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.functions.transformSecs(client, profile.itemsCooldowns.get(serverItem.itemID)[`craft${index}`] - new Date(), interaction.guildId, interaction.locale)}`, flags: ["Ephemeral"] })
            }
            const modal = new ModalBuilder()
                .setCustomId(`craft_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Craft item", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("amount")
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        ),
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `craft_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
                    return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const amount = +modalArgs.amount
                if (amount <= 0) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0`, flags: ["Ephemeral"] })
                }
                const values = []
                serverItem.crafts[index].items.forEach(i => {
                    if (i.itemID !== "currency") {
                        values.push(Math.floor(profile.inventory.find(itm => itm.itemID === i.itemID)?.amount / i.amount) || 0)
                    } else if (i.itemID === "currency") {
                        values.push(Math.floor(profile.currency / i.amount))
                    }
                })
                const min = Math.min.apply(null, values)
                if (min < 1) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have enough resources to craft", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (amount < min) amount1 = amount
                else amount1 = min
            } else return
            if (amount1 < serverItem.crafts[index].min_craft || (serverItem.crafts[index].max_craft ? amount1 > serverItem.crafts[index].max_craft : false)) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Craft amount range for this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.crafts[index].min_craft}${serverItem.crafts[index].max_craft ? ` ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.crafts[index].max_craft}` : ""}`, flags: ["Ephemeral"] })  
            }
            for (const e of serverItem.crafts[index].items) {
                if (e.itemID == "currency") {
                    await profile.subtractCurrency(e.amount * amount1)
                } else {
                    await profile.subtractItem(e.itemID, e.amount * amount1)
                }
            }
            const amount = client.functions.getRandomNumber(serverItem.crafts[index].amountFrom * amount1, serverItem.crafts[index].amountTo * amount1)
            await profile.addItem(serverItem.itemID, amount)
            client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "crafted item", guildId: interaction.guildId })} ${serverItem.displayEmoji}${serverItem.name} (${serverItem.itemID}) (${amount})`)
            await interaction.deferUpdate()
            interaction.followUp({ content: `<@${interaction.user.id}>, ${client.language({ textId: "You crafted", guildId: interaction.guildId, locale: interaction.locale })}: ${serverItem.displayEmoji}**${serverItem.name}** (${amount})` })
            let achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Craft)
            await Promise.all(achievements.map(async achievement => {
                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && achievement.items?.includes(serverItem.itemID) && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { 
                    if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                    client.tempAchievements[profile.userID].push(achievement.id)
                    await profile.addAchievement(achievement)
                }    
            }))
            await profile.addQuestProgression("itemsCrafted", amount, serverItem.itemID)
            profile.itemsCrafted += amount
            if (serverItem.crafts[index].cooldown_craft) {
                const key = `craft${index}`
                if (!profile.itemsCooldowns) profile.itemsCooldowns = new Map()
                if (profile.itemsCooldowns.get(serverItem.itemID)) profile.itemsCooldowns.set(serverItem.itemID, {...profile.itemsCooldowns.get(serverItem.itemID), [key]: new Date(Date.now() + serverItem.crafts[index].cooldown_craft * 1000) })
                else profile.itemsCooldowns.set(serverItem.itemID, { [key]: new Date(Date.now() + serverItem.crafts[index].cooldown_craft * 1000) })
            }
            achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.ItemsCrafted)
            await Promise.all(achievements.map(async achievement => {
                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.itemsCrafted >= achievement.amount && !client.tempAchievements[interaction.user.id]?.includes(achievement.id)) { 
                    if (!client.tempAchievements[interaction.user.id]) client.tempAchievements[interaction.user.id] = []
                    client.tempAchievements[interaction.user.id].push(achievement.id)
                    await profile.addAchievement(achievement)
                }    
            }))
            await profile.save()
        }
        embed.setAuthor({ name: `${client.language({ textId: "CRAFT", guildId: interaction.guildId, locale: interaction.locale })}`, iconURL: serverItem.image || await serverItem.getEmojiURL() })
        embed.setTitle(serverItem.name)
        embed.setThumbnail(serverItem.image || await serverItem.getEmojiURL())
        embed.setDescription(`${client.language({ textId: serverItem.rarity, guildId: interaction.guildId, locale: interaction.locale })}\n${serverItem.description}`)
        let itemsForCraft = ""
        let a = 0
        let index = -1
        let array_btn = []
        let values = []
        for (const craft of serverItem.crafts) {
            index++
            craftingItems = serverItem.crafts[index].amountFrom !== serverItem.crafts[index].amountTo ? `(${serverItem.crafts[index].amountFrom}-${serverItem.crafts[index].amountTo})` : serverItem.crafts[index].amountFrom == serverItem.crafts[index].amountTo ? `(${serverItem.crafts[index].amountTo})` : ""
            let canCraft = true
            let foundCraft = false
            if (craft.isFound === true) {
                a++
                foundCraft = true
                if (craft.items.length > 0) {
                    for (const i of craft.items) {
                        if (i.itemID !== "currency" && !profile.inventory.find(itm => itm.itemID === i.itemID && itm.amount >= i.amount)) {
                            canCraft = false
                        } else if (i.itemID == "currency" && profile.currency < i.amount) {
                            canCraft = false
                        }
                        let Item = client.cache.items.find(i1 => i1.itemID === i.itemID && !i1.temp && i1.enabled)
                        let amount = ""
                        if (i.amount > 1) amount = ` (${i.amount})`
                        if (i.itemID === "currency") {
                            if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) itemsForCraft += `> ${settings.displayCurrencyEmoji}**${settings.currencyName}**${amount}`
                            else itemsForCraft += ` + ${settings.displayCurrencyEmoji}**${settings.currencyName}**${amount}`
                            values.push(Math.floor(profile.currency / i.amount))
                        } else {
                            if (craft.items.findIndex(i2 => i2.itemID === i.itemID) === 0) {
                                if (Item?.found) {
                                    itemsForCraft += `> ${Item.displayEmoji}**${Item.name}**${amount}`
                                    values.push(Math.floor(profile.inventory.find(itm => itm.itemID === i.itemID)?.amount / i.amount))
                                } else {
                                    itemsForCraft += "||??||"
                                    canCraft = false
                                    values.push(0)
                                }
                            } else {
                                if (Item?.found) {
                                    itemsForCraft += ` + ${Item.displayEmoji}**${Item.name}**${amount}`
                                    values.push(Math.floor(profile.inventory.find(itm => itm.itemID === i.itemID)?.amount / i.amount))
                                } else {
                                    itemsForCraft += ` + ||??||`
                                    canCraft = false
                                    values.push(0)
                                }
                            }     
                        }
                    }
                } else {
                    canCraft = false
                    itemsForCraft = `> ${client.language({ textId: "No items", guildId: interaction.guildId, locale: interaction.locale })}`
                    values.push(0)
                }
            }
            if (foundCraft === true) {
                const min = Math.min.apply(null, values)
                itemsForCraft += ` = ${serverItem.displayEmoji}**${serverItem.name}** ${craftingItems} (${client.language({ textId: "You can craft", guildId: interaction.guildId, locale: interaction.locale })}: ${min || 0} ${client.language({ textId: "times", guildId: interaction.guildId, locale: interaction.locale })})`
                embed.addFields([{ name: `${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })} №${a}`, value: itemsForCraft }])
                itemsForCraft = ""
                if (canCraft) array_btn.push(
                    new ButtonBuilder()
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(client.config.emojis.craft)
                    .setLabel(`${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })} №${a}`)
                    .setCustomId(`usr{${interaction.user.id}}cmd{craft}item{${serverItem.itemID}}index{${index}}`)    
                ) 
                else array_btn.push(
                    new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(client.config.emojis.craft)
                    .setLabel(`${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })} №${a}`)
                    .setCustomId(`usr{${interaction.user.id}}cmd{craft}item{${serverItem.itemID}}index{${index}}`)  
                    .setDisabled(true)  
                )    
            }
            values = []
        }
        const components = []
        if (array_btn.length > 0) {
            components.push(new ActionRowBuilder().addComponents(array_btn.slice(0, 5)))
            if (array_btn.length > 5) components.push(new ActionRowBuilder().addComponents(array_btn.slice(5)))    
        } else {
            embed.addFields([{ name: `${client.language({ textId: "Recipe", guildId: interaction.guildId, locale: interaction.locale })}:`, value: `${client.language({ textId: "Item cannot be crafted or its recipe is unknown", guildId: interaction.guildId, locale: interaction.locale })}` }])
        }
        if (interaction.isChatInputCommand()) return interaction.reply({  embeds: [embed], components: components })
        else {
            if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: components })
            else return interaction.update({ embeds: [embed], components: components })
        }
    }
}