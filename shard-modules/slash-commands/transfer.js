const { ApplicationCommandOptionType, Collection, EmbedBuilder } = require("discord.js")
module.exports = {
    name: 'transfer',
    nameLocalizations: {
        'ru': `передать`,
        'uk': `передати`,
        'es-ES': `transferir`
    },
    description: 'Transfer currency or items to another user\'s inventory',
    descriptionLocalizations: {
        'ru': `Передать валюту или предмет другому пользователю`,
        'uk': `Передати валюту або предмет іншому користувачу`,
        'es-ES': `Transferir moneda o objetos a otro usuario`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': `юзер`,
                'uk': `користувач`,
                'es-ES': `usuario`
            },
            description: 'The user to transfer an item',
            descriptionLocalizations: {
                'ru': `Пользователь для передачи предмета`,
                'uk': `Користувач для передачі предмету`,
                'es-ES': `Usuario para transferir el objeto`
            },
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: 'item',
            nameLocalizations: {
                'ru': `предмет`,
                'uk': `предмет`,
                'es-ES': `objeto`
            },
            description: 'An item name to transfer',
            descriptionLocalizations: {
                'ru': `Название предмета для передачи`,
                'uk': `Назва предмету для передачі`,
                'es-ES': `Nombre del objeto a transferir`
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
            description: 'An amount to transfer',
            descriptionLocalizations: {
                'ru': `Количество для передачи`,
                'uk': `Кількість для передачі`,
                'es-ES': `Cantidad para transferir`
            },
            type: ApplicationCommandOptionType.Integer,
            required: true
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
        const mentionMember = await interaction.guild.members.fetch(args.user).catch(e => null)
        if (!mentionMember) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User with ID", guildId: interaction.guildId, locale: interaction.locale })} **${args.user}** ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
        if (mentionMember.user.bot || mentionMember.user.id === interaction.user.id) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "You cannot use this command on yourself or a bot", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
        }
        if (!interaction.channel.permissionsFor(mentionMember, false).has("ViewChannel")) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This user does not have access to view this channel", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const settings = client.cache.settings.get(interaction.guildId)
        const amount = args.amount <= 0 ? 1 : args.amount
        const profile1 = await client.functions.fetchProfile(client, mentionMember.user.id, interaction.guildId)
        if (args.item.toLowerCase() === settings.currencyName.toLowerCase()) {
            if (settings.currency_no_transfer) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${settings.displayCurrencyEmoji}${settings.currencyName} ${client.language({ textId: "cannot be transferred", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (profile.currency < amount) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}${settings.currencyName} (${profile.currency})`, flags: ["Ephemeral"] })
            }
            const permission = client.cache.permissions.get(settings.currency_transfer_permission)
            if (permission) {
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
            profile1.currency = amount
            profile.currency = amount*-1
            const guildQuests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled && quest.targets.some(target => target.type === "transfer"))
            if (guildQuests.size) await profile.addQuestProgression("transfer", amount)
            await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
            await profile1.save().catch(err => console.error(`Failed to save profile ${profile1.userID}:`, err))
            client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "transferred", guildId: interaction.guildId })} ${settings.displayCurrencyEmoji}${settings.currencyName} (${amount}) ${client.language({ textId: "to user", guildId: interaction.guildId, locale: interaction.locale })} <@${mentionMember.user.id}>`)
            return interaction.reply({ content: `<@${interaction.user.id}> ${profile.sex === "male" ? `${client.language({ textId: "transferred (male)", guildId: interaction.guildId, locale: interaction.locale })}` : profile.sex === "female" ? `${client.language({ textId: "transferred (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "transferred (neutral)", guildId: interaction.guildId, locale: interaction.locale })}`} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${amount.toLocaleString()}) ${client.language({ textId: "to user", guildId: interaction.guildId, locale: interaction.locale })} <@${mentionMember.user.id}>` })
        } else {
            const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.name.toLowerCase().includes(args.item.toLowerCase()) && profile.inventory.some(x => x.itemID == e.itemID && x.amount > 0))
            if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === args.item.toLowerCase())) {
                let result = ""
                filteredItems.forEach(item => {
                    result += `> ${item.displayEmoji}**${item.name}**\n`
                })
                return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
            }
            let userItem
            let guildItem
            if (filteredItems.some(e => e.name.toLowerCase() === args.item.toLowerCase())) {
                guildItem = filteredItems.find(e => e.name.toLowerCase() === args.item.toLowerCase())
                if (!guildItem) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}: ${args.item}.`, flags: ["Ephemeral"] })  
                userItem = profile.inventory.find(e => { return e.itemID == guildItem.itemID })
            } else {
                guildItem = filteredItems.first()
                if (!guildItem) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}: ${args.item}.`, flags: ["Ephemeral"] })  
                userItem = profile.inventory.find(e => { return e.itemID == guildItem.itemID })
            }
            if (!userItem) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "You don't have this item in inventory", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            }
            if (amount < guildItem.min_transfer || (guildItem.max_transfer ? amount > guildItem.max_transfer : false)) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Transfer amount range for this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${guildItem.min_transfer}${guildItem.max_transfer ? ` ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${guildItem.max_transfer}` : ""}`, flags: ["Ephemeral"] })  
            }
            if (profile.itemsCooldowns && profile.itemsCooldowns.get(guildItem.itemID)?.transfer > new Date()) {
                return interaction.reply({ content: `⏳${client.language({ textId: "Wait for cooldown on this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.functions.transformSecs(client, profile.itemsCooldowns.get(guildItem.itemID).transfer - new Date(), interaction.guildId, interaction.locale)}`, flags: ["Ephemeral"] })
            }
            if (userItem.amount < amount) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "In inventory", guildId: interaction.guildId, locale: interaction.locale })} ${guildItem.displayEmoji}**${guildItem.name}** (${userItem.amount})`, flags: ["Ephemeral"] })
            }
            if (guildItem.notTransable && !interaction.member.permissions.has("Administrator")) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "This item cannot be transferred", guildId: interaction.guildId, locale: interaction.locale })}: ${guildItem.displayEmoji}${guildItem.name}`, flags: ["Ephemeral"]})
            if (guildItem.transferPermission && client.cache.permissions.some(e => e.id === guildItem.transferPermission)) {
                const permission = client.cache.permissions.find(e => e.id === guildItem.transferPermission)
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
            await profile1.addItem(guildItem.itemID, amount)
            await profile.subtractItem(guildItem.itemID, amount)
            const guildQuests = client.cache.quests.filter(quest => quest.guildID === interaction.guildId && quest.isEnabled && quest.targets.some(target => target.type === "transfer"))
            if (guildQuests.size) await profile.addQuestProgression("transfer", amount, guildItem.itemID)
            if (guildItem.cooldown_transfer) {
                if (!profile.itemsCooldowns) profile.itemsCooldowns = new Map()
                if (profile.itemsCooldowns.get(guildItem.itemID)) profile.itemsCooldowns.set(guildItem.itemID, {...profile.itemsCooldowns.get(guildItem.itemID), transfer: new Date(Date.now() + guildItem.cooldown_transfer * 1000) })
                else profile.itemsCooldowns.set(guildItem.itemID, { transfer: new Date(Date.now() + guildItem.cooldown_transfer * 1000) })
            }
            await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
            await profile1.save().catch(err => console.error(`Failed to save profile ${profile1.userID}:`, err))
            client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "transferred", guildId: interaction.guildId })} ${guildItem.displayEmoji}**${guildItem.name}** (${amount}) ${client.language({ textId: "to user", guildId: interaction.guildId, locale: interaction.locale })} <@${mentionMember.user.id}>`)
            return interaction.reply({ content: `<@${interaction.user.id}> ${profile.sex === "male" ? `${client.language({ textId: "transferred (male)", guildId: interaction.guildId, locale: interaction.locale })}` : profile.sex === "female" ? `${client.language({ textId: "transferred (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "transferred (neutral)", guildId: interaction.guildId, locale: interaction.locale })}`} ${guildItem.displayEmoji}**${guildItem.name}** (${amount.toLocaleString()}) ${client.language({ textId: "to user", guildId: interaction.guildId, locale: interaction.locale })} <@${mentionMember.user.id}>` })
        }
    }
}