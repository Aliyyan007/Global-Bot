const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } = require("discord.js")
const idRegexp = /selectorId{(.*?)}/
const EmojiSelector = require("../classes/EmojiSelector.js")
const emojiSelectorSchema = require("../schemas/emojiSelectorSchema.js")
const uniqid = require('uniqid')
const LimitRegexp = /limit{(.*?)}/
const node_emoji = require(`node-emoji`)
module.exports = {
    name: `emoji-selector`,
    run: async (client, interaction, {}, select_for, select_for_id) => {
        let totalEmojis = await client.shard.broadcastEval(async (c) => {
            return c.emojis.cache.map(e => e)
        }).then(array => array.flat().sort((a, b) => a.name.localeCompare(b.name)))
        let selector
        if (!idRegexp.exec(interaction.customId)) {
            selector = new emojiSelectorSchema({
                id: uniqid.time(),
                guildID: interaction.guildId,
                filter_guild_id: interaction.guildId,
                select_for: select_for,
                select_for_id: select_for_id,
                deleteDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
            })
            await selector.save()
            selector = new EmojiSelector(client, selector)
            selector.setTimeoutDelete()
            client.cache.emojiSelectors.set(selector.id, selector)
        }
        if (!selector) selector = client.cache.emojiSelectors.get(idRegexp.exec(interaction.customId)[1])
        if (!selector) {
            selector = new emojiSelectorSchema({
                id: uniqid.time(),
                guildID: interaction.guildId,
                filter_guild_id: interaction.guildId,
                select_for: select_for,
                select_for_id: select_for_id,
                deleteDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
            })
            await selector.save()
            selector = new EmojiSelector(client, selector)
            selector.setTimeoutDelete()
            client.cache.emojiSelectors.set(selector.id, selector)
        }
        let min = 0
        let limit = 75
        if (LimitRegexp.exec(interaction.customId)) {
            limit = +LimitRegexp.exec(interaction.customId)?.[1]
            min = limit - 75
            if (isNaN(limit) || isNaN(min)) {
                limit = +LimitRegexp.exec(interaction.customId)?.[1]
                min = limit - 75  
            }
        }
        if (interaction.isButton() && interaction.customId.includes("show_all")) {
            selector.filter_guild_id = undefined
            selector.filter_name = undefined
            await selector.save()
        }
        if (interaction.isButton() && interaction.customId.includes("server_id_filter")) {
            const modal = new ModalBuilder()
                .setCustomId(`server_id_filter_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Search by server ID", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: `Server ID`, guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("id")
                                .setRequired(false)
                                .setStyle(TextInputStyle.Short)
                                .setValue(selector.filter_guild_id || " ")
                        )
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `server_id_filter_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                if (!modalArgs.id) selector.filter_guild_id = undefined
                else {
                    selector.filter_guild_id = modalArgs.id
                }
                await selector.save()
            } else return
        }
        if (interaction.isButton() && interaction.customId.includes("name_filter")) {
            const modal = new ModalBuilder()
                .setCustomId(`name_filter_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Search by emoji name", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Emoji name or part of it", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("name")
                                .setRequired(false)
                                .setStyle(TextInputStyle.Short)
                                .setValue(selector.filter_name || " ")
                        )
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `name_filter_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                if (!modalArgs.name) selector.filter_name = undefined
                else {
                    selector.filter_name = modalArgs.name
                }
                await selector.save()
            } else return
        }
        const settings = client.cache.settings.get(interaction.guildId)
        if (interaction.isButton() && interaction.customId.includes("manually")) {
            const modal = new ModalBuilder()
                .setCustomId(`manually_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Manual emoji selection", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: `Emoji`, guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("emoji")
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder(`${client.language({ textId: "Insert emoji or emoji ID", guildId: interaction.guildId, locale: interaction.locale })}`)
                        )
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `manually_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                let isDefaultEmoji = false
                const emojis = node_emoji.search(modalArgs.emoji)
                if (emojis.length === 1) {
                    modalArgs.emoji = emojis[0].emoji
                    isDefaultEmoji = true
                } else if (emojis.length > 1) {
                    await interaction.update({ content: `${client.language({ textId: "Multiple emojis found. Select one.", guildId: interaction.guildId, locale: interaction.locale })}`, components: [
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`selectDefaultEmoji`)
                                .setOptions(emojis.slice(0, 25).map(e => {
                                    return { label: e.key, emoji: e.emoji, value: e.key }
                                }))
                        )
                    ], embeds: [], flags: ["Ephemeral"] })
					const filter = (i) => i.customId.includes(`selectDefaultEmoji`) && i.user.id === interaction.user.id
					interaction = await interaction.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
					if (interaction) {
                        modalArgs.emoji = node_emoji.find(interaction.values[0]).emoji
                        isDefaultEmoji = true
                    } else return
                } else {
                    const emoji = node_emoji.find(modalArgs.emoji)
                    if (emoji) {
                        modalArgs.emoji = emoji.emoji
                        isDefaultEmoji = true
                    }
                }
                const emoji = !isDefaultEmoji ? await client.functions.getEmoji(client, modalArgs.emoji) : modalArgs.emoji
                if (!isDefaultEmoji && emoji === "❓") {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} ${modalArgs.emoji} ${client.language({ textId: "does not contain emoji or contains unsupported emoji", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                const displayEmoji = await client.functions.getEmoji(client, modalArgs.emoji)
                let iconURL
                if (!isDefaultEmoji && selector.select_for === "customRole") iconURL = await client.functions.getEmojiURL(client, modalArgs.emoji, "png")
                if (selector.select_for === "item") {
                    const item = client.cache.items.get(selector.select_for_id)
                    item.emoji = modalArgs.emoji
                    item.displayEmoji = displayEmoji
                    await item.save()
                }
                if (selector.select_for === "achievement") {
                    const achievement = client.cache.achievements.get(selector.select_for_id)
                    achievement.emoji = modalArgs.emoji
                    achievement.displayEmoji = displayEmoji
                    await achievement.save()
                }
                if (selector.select_for === "quest") {
                    const quest = client.cache.quests.get(selector.select_for_id)
                    quest.emoji = modalArgs.emoji
                    quest.displayEmoji = displayEmoji
                    await quest.save()
                }
                if (selector.select_for === "currency") {
                    settings.emojis.currency = modalArgs.emoji
                    settings.displayCurrencyEmoji = displayEmoji
                    await settings.save()
                }
                if (selector.select_for === "customRole") {
                    const customRole = client.cache.customRoles.get(selector.select_for_id)
                    if (customRole.status !== "editing") {
                        return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Custom role is not in 'Editing' status", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                    customRole.icon = modalArgs.emoji
                    customRole.displayIcon = displayEmoji
                    customRole.iconURL = iconURL
                    await customRole.save()
                }
                return interaction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Emoji selected", guildId: interaction.guildId, locale: interaction.locale })}: ${displayEmoji}`, components: [] })
            } else return
        }
        if (interaction.isStringSelectMenu() && interaction.customId.includes("select")) {
            if (selector.select_for === "item") {
                const item = client.cache.items.get(selector.select_for_id)
                item.emoji = interaction.values[0]
                item.displayEmoji = await client.functions.getEmoji(client, interaction.values[0])
                await item.save()
            }
            if (selector.select_for === "achievement") {
                const achievement = client.cache.achievements.get(selector.select_for_id)
                achievement.emoji = interaction.values[0]
                achievement.displayEmoji = await client.functions.getEmoji(client, interaction.values[0])
                await achievement.save()
            }
            if (selector.select_for === "quest") {
                const quest = client.cache.quests.get(selector.select_for_id)
                quest.emoji = interaction.values[0]
                quest.displayEmoji = await client.functions.getEmoji(client, interaction.values[0])
                await quest.save()
            }
            if (selector.select_for === "currency") {
                settings.emojis.currency = interaction.values[0]
                settings.displayCurrencyEmoji = await client.functions.getEmoji(client, interaction.values[0])
                await settings.save()
            }
            if (selector.select_for === "customRole") {
                const customRole = client.cache.customRoles.get(selector.select_for_id)
                if (customRole.status !== "editing") {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Custom role is not in 'Editing' status", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                customRole.icon = interaction.values[0]
                customRole.displayIcon = await client.functions.getEmoji(client, interaction.values[0])
                customRole.iconURL = await client.functions.getEmojiURL(client, interaction.values[0], "png")
                await customRole.save()
            }
            return interaction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Emoji selected", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
        }
        if (selector.filter_name) totalEmojis = totalEmojis.filter(emoji => emoji.name.toLowerCase().includes(selector.filter_name.toLowerCase()))
        if (selector.filter_guild_id) totalEmojis = totalEmojis.filter(emoji => emoji.guild.id === selector.filter_guild_id)
        if (interaction.customId.includes(`page`)) {
            const modal = new ModalBuilder()
                .setCustomId(`page_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Open page", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Page number", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("page")
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        )
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `page_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                if (isNaN(+modalArgs.page) || !Number.isInteger(+modalArgs.page)) {
                    return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.page}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                let page = +modalArgs.page
                if (page <= 0) page = 1
                if (page > ((totalEmojis.length + (totalEmojis.length % 75 == 0 ? 0 : 75 - (totalEmojis.length % 75)))/75 == 0 ? 1 : (totalEmojis.length + (totalEmojis.length % 75 == 0 ? 0 : 75 - (totalEmojis.length % 75)))/75)) page = (totalEmojis.length + (totalEmojis.length % 75 == 0 ? 0 : 75 - (totalEmojis.length % 75)))/75 == 0 ? 1 : (totalEmojis.length + (totalEmojis.length % 75 == 0 ? 0 : 75 - (totalEmojis.length % 75)))/75
                limit = page * 75
                min = limit - 75
            } else return 
        }
        const emojis = totalEmojis.slice(min, limit)
        const page = (totalEmojis.length + (totalEmojis.length % 75 == 0 ? 0 : 75 - (totalEmojis.length % 75)))/75 == 0 ? 1 : (totalEmojis.length + (totalEmojis.length % 75 == 0 ? 0 : 75 - (totalEmojis.length % 75)))/75
        const array_btn = [
            new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}limit{75}1`).setDisabled((totalEmojis.length <= 75 && min == 0) || (totalEmojis.length > 75 && min < 75)),
            new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}limit{${limit - 75}}2`).setDisabled((totalEmojis.length <= 75 && min == 0) || (totalEmojis.length > 75 && min < 75)),
            new ButtonBuilder().setLabel(`${Math.ceil(limit/75).toString()}/${page}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}page`).setDisabled(totalEmojis.length <= 75 && min == 0),
            new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}limit{${limit + 75}}3`).setDisabled((totalEmojis.length <= 75 && min == 0) || (totalEmojis.length > 75 && min >= totalEmojis.length - 75)),
            new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}limit{${totalEmojis.length + (totalEmojis.length % 75 == 0 ? 0 : 75 - (totalEmojis.length % 75))}}4`).setDisabled((totalEmojis.length <= 75 && min == 0) || (totalEmojis.length > 75 && min >= totalEmojis.length - 75))
        ]
        const components = selectEmojisComponent(client, emojis, interaction, selector, min)
        const show_all_btn = new ButtonBuilder().setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}show_all`).setLabel(`${client.language({ textId: "Show all", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Secondary)
        const server_id_filter_btn = new ButtonBuilder().setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}server_id_filter`).setLabel(`${client.language({ textId: "Search by server ID", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Secondary)//.setDisabled(selector.select_for === "customRole")
        const name_filter_btn = new ButtonBuilder().setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}name_filter`).setLabel(`${client.language({ textId: "Search by name", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Secondary)
        const manually_btn = new ButtonBuilder().setCustomId(`cmd{emoji-selector}selectorId{${selector.id}}manually`).setLabel(`${client.language({ textId: "Enter manually", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Secondary)
        components.push(new ActionRowBuilder().addComponents(array_btn))
        components.push(new ActionRowBuilder().addComponents([show_all_btn, server_id_filter_btn, name_filter_btn, manually_btn]))
        if (select_for && select_for_id) return interaction.reply({ content: [
            selector.filter_name ? `${client.language({ textId: "Search by name", guildId: interaction.guildId, locale: interaction.locale })}: **${selector.filter_name}**` : undefined,
            selector.filter_guild_id ? `${client.language({ textId: "Search by server ID", guildId: interaction.guildId, locale: interaction.locale })}: **${selector.filter_guild_id}**` : undefined
        ].filter(e => e).join("\n"), components: components, flags: ["Ephemeral"] })
        else return interaction.update({ content: [
            selector.filter_name ? `${client.language({ textId: "Search by name", guildId: interaction.guildId, locale: interaction.locale })}: **${selector.filter_name}**` : undefined,
            selector.filter_guild_id ? `${client.language({ textId: "Search by server ID", guildId: interaction.guildId, locale: interaction.locale })}: **${selector.filter_guild_id}**` : undefined
        ].filter(e => e).join("\n"), components: components, flags: ["Ephemeral"] })
    }
}
function selectEmojisComponent(client, emojis, interaction, selector, min) {
    const length = emojis.length
    let selectMenu1 = new StringSelectMenuBuilder()
    .setCustomId(`cmd{emoji-selector}selectorId{${selector.id}} select 1`)
    let selectMenu2 = new StringSelectMenuBuilder()
    .setCustomId(`cmd{emoji-selector}selectorId{${selector.id}} select 2`)
    let selectMenu3 = new StringSelectMenuBuilder()
    .setCustomId(`cmd{emoji-selector}selectorId{${selector.id}} select 3`)
    let optionsArray = []
    if (length == 0) selectMenu1.setPlaceholder(`${client.language({ textId: "No emoji", guildId: interaction.guildId, locale: interaction.locale })}`).setDisabled(true).addOptions([{label: `${client.language({ textId: "No emoji", guildId: interaction.guildId, locale: interaction.locale })}`, value: "0"}])
    for (let i = 0; i < length; i++) {
        optionsArray.push({
            emoji: `<${emojis[i].animated ? "a" : ""}:${emojis[i].name}:${emojis[i].id}>`,
            label: emojis[i].name,
            value: emojis[i].id,
        })
        if (i == 24 || (i < 24 && i == length - 1)) {
            selectMenu1.addOptions(optionsArray)
            selectMenu1.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} ${1+min}-${i+1+min}`)
            optionsArray = []
        }
        if (i == 49 || (i < 49 && i == length - 1)) {
            selectMenu2.addOptions(optionsArray)
            selectMenu2.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} ${26+min}-${i + 1+min}`)
            optionsArray = []
        }
        if (i == 74 || (i < 74 && i == length - 1)) {
            selectMenu3.addOptions(optionsArray)
            selectMenu3.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} ${51+min}-${i+1+min}`)
            optionsArray = []
        }
    }
    if (length > 50) return [new ActionRowBuilder().addComponents([selectMenu1]), new ActionRowBuilder().addComponents([selectMenu2]), new ActionRowBuilder().addComponents([selectMenu3])]
    else if (length > 25) return [new ActionRowBuilder().addComponents([selectMenu1]), new ActionRowBuilder().addComponents([selectMenu2])]
    else return [new ActionRowBuilder().addComponents([selectMenu1])]
}