const { Collection, MessageFlags, ApplicationCommandOptionType } = require("discord.js");
const BlackjackGame = require("../classes/BlackjackGame");
const { RewardType } = require("../enums");
const gameRegexp = /id{(.*?)}/
module.exports = {
    name: 'blackjack',
    nameLocalizations: {
        'ru': `блекджек`,
        'uk': `блекджек`,
        'es-ES': `blackjack`
    },
    description: 'Play blackjack',
    descriptionLocalizations: {
        'ru': `Играть в блекджек`,
        'uk': `Грати в блекджек`,
        'es-ES': `Jugar blackjack`
    },
    options: [
        {
            name: 'bet',
            nameLocalizations: {
                'ru': 'ставка',
                'uk': 'ставка',
                'es-ES': 'apuesta'
            },
            description: 'Place a bet',
            descriptionLocalizations: {
                'ru': 'Поставить ставку',
                'uk': 'Зробити ставку',
                'es-ES': 'Hacer una apuesta'
            },
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
            description: 'Bet amount',
            descriptionLocalizations: {
                'ru': 'Количество ставки',
                'uk': 'Кількість ставки',
                'es-ES': 'Cantidad de la apuesta'
            },
            min_value: 1,
            type: ApplicationCommandOptionType.Integer,
            required: true
        }
    ],
    dmPermission: false,
    group: `games-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        let game
        if (interaction.isChatInputCommand()) {
            const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            const settings = client.cache.settings.get(interaction.guildId)
            let userItem
            let serverItem
            if (args.bet !== "currency") {
                const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.name.toLowerCase().includes(args.bet.toLowerCase()) && profile.inventory.some(x => x.itemID == e.itemID))
                if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === args.bet.toLowerCase())) {
                    let result = ""
                    filteredItems.forEach(item => {
                        result += `> ${item.displayEmoji}**${item.name}**\n`
                    })
                    return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })   
                }
                if (filteredItems.some(e => e.name.toLowerCase() === args.bet.toLowerCase())) {
                    serverItem = filteredItems.find(e => e.name.toLowerCase() === args.bet.toLowerCase())
                    if (!serverItem) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
                    userItem = profile.inventory.find(e => { return e.itemID == serverItem.itemID && e.amount > 0 })
                } else {
                    serverItem = filteredItems.first()
                    if (!serverItem) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
                    userItem = profile.inventory.find(e => { return e.itemID == serverItem.itemID && e.amount > 0})
                }
                if (!userItem) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have this item in inventory", guildId: interaction.guildId, locale: interaction.locale })}: **${serverItem.displayEmoji}${serverItem.name}**`, flags: ["Ephemeral"] })
                }
                if (serverItem.blackJackBan) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This item cannot be bet in blackjack", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
            }
            const serverItemEmoji = args.bet === "currency" ? settings.displayCurrencyEmoji : serverItem?.displayEmoji
            const serverItemName = args.bet === "currency" ? settings.currencyName : serverItem?.name
            if ((args.bet === "currency" ? profile.currency : userItem.amount) < args.amount) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} ${serverItemEmoji}${serverItemName} (${(args.bet === "currency" ? profile.currency.toLocaleString() : userItem.amount.toLocaleString())})`, flags: ["Ephemeral"] })
            if (args.bet !== "currency") {
                await profile.subtractItem(serverItem.itemID, args.amount)    
            } else {
                await profile.subtractCurrency(args.amount)
            }
            game = new BlackjackGame(client, interaction.user.id, interaction.guildId, args.bet === "currency" ? RewardType.Currency : RewardType.Item, args.bet === "currency" ? undefined : serverItem.itemID, args.amount, serverItemEmoji, serverItemName)
            client.cache.blackjack.set(game.id, game)
        } else {
            game = client.cache.blackjack.get(gameRegexp.exec(interaction.customId)[1])
            if (!game) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Game not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
        }
        if (interaction.isChatInputCommand()) {
            game.startGame()
            await interaction.reply({
                components: [await game.getContainer(interaction)],
                flags: [MessageFlags.IsComponentsV2]
            })
        } else {
            if (game.userId !== interaction.user.id) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This game is not for you!", guildId: interaction.guildId, locale: interaction.locale })}`, flags: [MessageFlags.Ephemeral] })
            }
            if (interaction.customId.includes("hit")) game.playerHit()
            if (interaction.customId.includes("stand")) game.playerStand()
            if (interaction.customId.includes("double")) {
                const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                const settings = client.cache.settings.get(interaction.guildId)
                const serverItem = client.cache.items.find(e => e.guildID === interaction.guildId && e.itemID === game.betId)
                const userItem = profile.inventory.find(e => { return e.itemID == game.betId && e.amount > 0 })
                const serverItemEmoji = game.betType === RewardType.Currency ? settings.displayCurrencyEmoji : serverItem?.displayEmoji
                const serverItemName = game.betType === RewardType.Currency ? settings.currencyName : serverItem?.name
                if ((game.betType === RewardType.Currency ? profile.currency : userItem?.amount || 0) < game.currentBet * 2) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} ${serverItemEmoji}${serverItemName} (${(game.betType === RewardType.Currency ? profile.currency.toLocaleString() : userItem?.amount.toLocaleString() || 0)})`, flags: ["Ephemeral"] })
                if (game.betType === RewardType.Currency) {
                    await profile.subtractCurrency(game.currentBet)
                } else {
                    await profile.subtractItem(serverItem.itemID, game.currentBet)
                }
                await profile.save()
                game.playerDouble()
            }
            await interaction.update({
                components: [await game.getContainer(interaction)]
            })
        }
    }
}