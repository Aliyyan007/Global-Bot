const { ChannelType, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ActionRowBuilder, Collection, EmbedBuilder } = require("discord.js")
const DropRegexp = /dr{(.*?)}/
const UserRegexp = /usr{(.*?)}/
const AmountRegexp = /am{(.*?)}/
const ItemRegexp = /it{(.*?)}/
const drops = new Collection()
module.exports = {
    name: 'drop',
    nameLocalizations: {
        'ru': `дроп`,
        'uk': `дроп`, 
        'es-ES': `soltar`
    },
    description: 'Drop an item in text channel',
    descriptionLocalizations: {
        'ru': `Выкинуть предмет в текстовый канал`,
        'uk': `Викинути предмет у текстовому каналі`,
        'es-ES': `Soltar el objeto en el canal de texto`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': 'предмет',
                'uk': 'предмет',
                'es-ES': 'objeto'
            },
            description: 'Item name to drop',
            descriptionLocalizations: {
                'ru': 'Имя предмета для дропа',
                'uk': 'Назва предмета для дропу',
                'es-ES': 'Nombre del objeto para soltar'
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
            description: 'Amount of items to drop',
            descriptionLocalizations: {
                'ru': 'Количество предметов для дропа',
                'uk': 'Кількість предметів для дропу',
                'es-ES': 'Número de objetos para soltar'
            },
            type: ApplicationCommandOptionType.Number,
            required: true
        },
        {
            name: 'channel',
            nameLocalizations: {
                'ru': 'канал',
                'uk': 'канал',
                'es-ES': 'canal'
            },
            description: 'Text channel for drop',
            descriptionLocalizations: {
                'ru': 'Текстовый канал для дропа',
                'uk': 'Текстовий канал для дропу',
                'es-ES': 'Canal de texto para soltar'
            },
            type: ApplicationCommandOptionType.Channel,
            required: true,
            channelTypes: [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.AnnouncementThread, ChannelType.PublicThread, ChannelType.PrivateThread]
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
            const dropID = DropRegexp.exec(interaction.customId)[1]
            if (!drops.has(dropID)) drops.set(dropID, new Collection())
            const drop = drops.get(dropID)
            if (drop.first() && drop.first() !== interaction.user.id) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This drop was already taken", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
            }
            let userDrop = UserRegexp.exec(interaction.customId)[1]
            if (interaction.user.id === userDrop) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You cannot take your own drop", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
            }
            drop.set(interaction.user.id, new Date())
            const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            const amount = +AmountRegexp.exec(interaction.customId)?.[1]
            const itemID = ItemRegexp.exec(interaction.customId)?.[1]
            if (itemID === `currency`) {
                const settings = client.cache.settings.get(interaction.guildId)
                await profile.addCurrency(amount, true)
                client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "picked up", guildId: interaction.guildId })} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${amount})`)
                await interaction.update({ content: `${client.config.emojis.DONE} <@${interaction.user.id}> ${profile.sex === `male` ? `${client.language({ textId: "took (male)", guildId: interaction.guildId, locale: interaction.locale })}` : profile.sex === `female` ? `${client.language({ textId: "took (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "took", guildId: interaction.guildId, locale: interaction.locale })}`} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${amount.toLocaleString()}) ${client.language({ textId: "from drop by", guildId: interaction.guildId, locale: interaction.locale })} <@${userDrop}>.`, components: [] })
                return drops.delete(dropID)
            } else {
                const item = client.cache.items.find(item => item.guildID === interaction.guildId && !item.temp && item.enabled && item.itemID === itemID)
                if (item) {
                    await profile.addItem(itemID, amount, false, true)
                    client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "picked up", guildId: interaction.guildId })} ${item.displayEmoji}**${item.name}** (${amount})`)
                    await interaction.update({ content: `${client.config.emojis.DONE} <@${interaction.user.id}> ${profile.sex === `male` ? `${client.language({ textId: "took (male)", guildId: interaction.guildId, locale: interaction.locale })}` : profile.sex === `female` ? `${client.language({ textId: "took (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "took", guildId: interaction.guildId, locale: interaction.locale })}`} ${item.displayEmoji}**${item.name}** (${amount.toLocaleString()}) ${client.language({ textId: "from drop by", guildId: interaction.guildId, locale: interaction.locale })} <@${userDrop}>.`, components: [] })
                    return drops.delete(dropID)
                } else return
            }
        }
        const settings = client.cache.settings.get(interaction.guildId)
        const amount = args.amount <= 0 ? 1 : args.amount
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if (args.item.length < 2) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })  
        }
        if (args.item.toLowerCase() === settings.currencyName.toLowerCase()) {
            if (settings.currency_no_drop) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${settings.displayCurrencyEmoji}${settings.currencyName} ${client.language({ textId: "cannot be dropped", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (profile.currency < amount) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}${settings.currencyName} (${profile.currency})` })
            }
            const permission = client.cache.permissions.get(settings.currency_drop_permission)
            if (permission) {
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
            const channel = await interaction.guild.channels.fetch(args.channel).catch(e => null)
            if (!channel) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Unknown channel entered", guildId: interaction.guildId, locale: interaction.locale })}.` })  
            }
            if (!channel.permissionsFor(interaction.guild.members.me).has("ViewChannel")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permission to view this channel", guildId: interaction.guildId, locale: interaction.locale })}.` })  
            }
            if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permission to send messages in this channel", guildId: interaction.guildId, locale: interaction.locale })}.` })  
            }
            if (!channel.permissionsFor(interaction.member).has("ViewChannel")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You do not have permission to view this channel", guildId: interaction.guildId, locale: interaction.locale })}.` })  
            }
            if (!channel.permissionsFor(interaction.member).has("SendMessages")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You do not have permission to send messages in this channel", guildId: interaction.guildId, locale: interaction.locale })}.` })  
            }
            const uniqid = require('uniqid')
            const dropBTN = new ButtonBuilder()
                .setLabel(`${client.language({ textId: "Take drop", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`dr{${uniqid.time()}}cmd{drop}it{currency}am{${amount}}usr{${interaction.user.id}}`)
                .setEmoji('🤏')
            channel.send({ content: `${client.language({ textId: "Drop", guildId: interaction.guildId, locale: interaction.locale })} ➜ ||${settings.displayCurrencyEmoji}**${settings.currencyName} (${amount.toLocaleString()})**|| ${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} <@${interaction.user.id}>`, components: [new ActionRowBuilder().addComponents([dropBTN])]}).catch(e => null)
            profile.currency = amount*-1
            const guildQuests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled && quest.targets.some(target => target.type === "drop"))
            if (guildQuests.size) await profile.addQuestProgression("drop", amount, args.item)
            await profile.save()
            client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "dropped", guildId: interaction.guildId })} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${amount}) (<#${args.channel}>)`)
            return interaction.reply({ content: `${client.config.emojis.DONE} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${amount.toLocaleString()}) ${client.language({ textId: "was dropped in", guildId: interaction.guildId, locale: interaction.locale })} <#${args.channel}>`, flags: ["Ephemeral"] })
        } else {
            const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.name.toLowerCase().includes(args.item.toLowerCase()) && profile.inventory.some(x => x.itemID == e.itemID && x.amount > 0))
            if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() == args.item.toLowerCase())) {
                let result = ""
                filteredItems.forEach(item => {
                    result += `> ${item.displayEmoji}**${item.name}**\n`
                })
                return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] }) 
            }
            let userItem
            let guildItem
            if (filteredItems.some(e => e.name.toLowerCase() == args.item.toLowerCase())) {
                guildItem = filteredItems.find(e => e.name.toLowerCase() == args.item.toLowerCase())
                if (!guildItem) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}: ${args.item}.`, flags: ["Ephemeral"] })  
                userItem = profile.inventory.find(e => { return e.itemID == guildItem.itemID })
            } else {
                guildItem = filteredItems.first()
                if (!guildItem) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}: ${args.item}.`, flags: ["Ephemeral"] })  
                userItem = profile.inventory.find(e => { return e.itemID == guildItem.itemID })
            }
            if (!userItem) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No such item in inventory", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            }
            const channel = await interaction.guild.channels.fetch(args.channel).catch(e => null)
            if (!channel) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Unknown channel entered", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            }
            if (!channel.permissionsFor(interaction.guild.members.me).has("ViewChannel") || !channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permission to view or send messages in this channel", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            }
            if (!channel.permissionsFor(interaction.member).has("ViewChannel") || !channel.permissionsFor(interaction.member).has("SendMessages")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You do not have permission to view or send messages in this channel", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            }
            if (amount < guildItem.min_drop || (guildItem.max_drop ? amount > guildItem.max_drop : false)) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Drop amount range for this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${guildItem.min_drop}${guildItem.max_drop ? ` ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${guildItem.max_drop}` : ""}`, flags: ["Ephemeral"] })  
            }
            if (profile.itemsCooldowns && profile.itemsCooldowns.get(guildItem.itemID)?.drop > new Date()) {
                return interaction.reply({ content: `⏳${client.language({ textId: "Wait for cooldown on this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.functions.transformSecs(client, profile.itemsCooldowns.get(guildItem.itemID).drop - new Date(), interaction.guildId, interaction.locale)}`, flags: ["Ephemeral"] })
            }
            if (guildItem.notDropable && !interaction.member.permissions.has("Administrator")) return interaction.reply({ content: `${client.config.emojis.NO} ${guildItem.displayEmoji}**${guildItem.name}** ${client.language({ textId: "cannot be dropped", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            if (userItem.amount < amount) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} ${guildItem.displayEmoji}${guildItem.name} (${userItem.amount})`, flags: ["Ephemeral"] })
            if (guildItem.dropPermission && client.cache.permissions.some(e => e.id === guildItem.dropPermission)) {
                const permission = client.cache.permissions.find(e => e.id === guildItem.dropPermission)
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
            const uniqid = require('uniqid')
            const dropBTN = new ButtonBuilder()
                .setLabel(client.language({ textId: "Take drop", guildId: interaction.guildId, locale: interaction.locale }))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`dr{${uniqid.time()}}cmd{drop}it{${guildItem.itemID}}am{${amount}}usr{${interaction.user.id}}`)
                .setEmoji('🤏')
            await profile.subtractItem(guildItem.itemID, amount)
            channel.send({ content: `${client.language({ textId: "Drop", guildId: interaction.guildId, locale: interaction.locale })} --> ||${guildItem.displayEmoji}**${guildItem.name} (${amount.toLocaleString()})**|| ${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} <@${interaction.user.id}>`, components: [new ActionRowBuilder().addComponents([dropBTN])]}).catch(e => null)
            if (guildItem.cooldown_drop) {
                if (!profile.itemsCooldowns) profile.itemsCooldowns = new Map()
                if (profile.itemsCooldowns.get(guildItem.itemID)) profile.itemsCooldowns.set(guildItem.itemID, {...profile.itemsCooldowns.get(guildItem.itemID), drop: new Date(Date.now() + guildItem.cooldown_drop * 1000) })
                else profile.itemsCooldowns.set(guildItem.itemID, { drop: new Date(Date.now() + guildItem.cooldown_drop * 1000) })
            }
            await profile.save()
            client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "dropped", guildId: interaction.guildId })} ${guildItem.displayEmoji}**${guildItem.name}** (${amount}) (<#${args.channel}>)`)
            return interaction.reply({ content: `${client.config.emojis.DONE} ${guildItem.displayEmoji}**${guildItem.name}** (${amount.toLocaleString()}) ${client.language({ textId: "was dropped in", guildId: interaction.guildId, locale: interaction.locale })} <#${args.channel}>`, flags: ["Ephemeral"] })    
        }
    }
}