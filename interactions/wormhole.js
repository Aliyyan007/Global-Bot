const { EmbedBuilder, Webhook } = require("discord.js")
const { AchievementType } = require("../enums")
const { sendWebhook } = require("../handler/httpClient")
const IdRegexp = /id{(.*?)}/
require('dotenv').config()
const config = require('../config/botconfig')
const takenWormholes = new Set()
module.exports = {
    name: `wormhole`,
    run: async (client, interaction) => {
        if (takenWormholes.has(interaction.message.id)) return interaction.reply({ content: `${client.language({ textId: "This wormhole has already been taken", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
        const id = IdRegexp.exec(interaction.customId)?.[1]
        const wormhole = client.cache.wormholes.get(id)
        if (!wormhole) {
            await interaction.reply({ content: `${client.language({ textId: "Wormhole with ID", guildId: interaction.guildId, locale: interaction.locale })} ${id} ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            return interaction.message.delete().catch(e => null)
        }
        if (wormhole.permission) {
            const permission = client.cache.permissions.get(wormhole.permission)
            if (permission) {
                const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
        }
        takenWormholes.add(interaction.message.id)
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        profile.wormholeTouched = 1
        const amount = client.functions.getRandomNumber(wormhole.amountFrom, wormhole.amountTo)
        let reward = ``
        let emoji 
        let name
        let image
        let color
        if (wormhole.itemID === `currency`) {
            const settings = client.cache.settings.get(interaction.guildId)
            emoji = settings.displayCurrencyEmoji
            name = settings.currencyName
            await profile.addCurrency(amount)
            reward += `${settings.displayCurrencyEmoji}${amount}`
        } else if (wormhole.itemID === `xp`) {
            emoji = client.config.emojis.XP
            name = "XP"
            await profile.addXp(amount)
            reward += `${client.config.emojis.XP}${amount}`
        } else if (wormhole.itemID === `rp`) {
            emoji = client.config.emojis.RP
            name = "RP"
            await profile.addRp(amount)
            reward += `${client.config.emojis.RP}${amount}`
        } else {
            const rewardItem = client.cache.items.find(i => i.itemID === wormhole.itemID && !i.temp && i.enabled)
            if (rewardItem) {
                await profile.addItem(wormhole.itemID, amount)
                emoji = rewardItem.displayEmoji
                name = rewardItem.name
                image = rewardItem.image
                color = rewardItem.hex
                reward += `${rewardItem.displayEmoji}${amount}`    
            } else {
                await interaction.reply({ content: `ERROR: ${client.language({ textId: "Item with ID", guildId: interaction.guildId, locale: interaction.locale })}: ${wormhole.itemID} ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                return interaction.message.delete().catch(e => null)
            }
        }
        try {
            let style = await client.styleSchema.findOne({ guildID: interaction.guildId, styleID: wormhole.styleID }).lean()
            if (!style) style = {
                collect: {
                    author: {
                        name: client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale }),
                        iconURL: 'https://i.imgur.com/gi8qKFX.gif'
                    },
                    description: `${interaction.member.displayName} ${profile.sex === `male` ? `${client.language({ textId: "took_male", guildId: interaction.guildId, locale: interaction.locale })}` : profile.sex === `female` ? `${client.language({ textId: "took_female", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "took", guildId: interaction.guildId, locale: interaction.locale })}`} ${reward} ${client.language({ textId: "from wormhole", guildId: interaction.guildId, locale: interaction.locale })}`,
                    footer: {
                        text: null,
                        iconURL: null
                    },
                    thumbnailURL: null,
                    imageURL: null,
                    color: "#FFD500",
                    title: null   
                }
            }
            const embedWormhole = new EmbedBuilder()
            if (style.collect.author.name) {
                if (style.collect.author.iconURL) {
                    if (style.collect.author.iconURL === `{item_image}`) {
                        if (image) embedWormhole.setAuthor({ name: style.collect.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048), iconURL: style.collect.author.iconURL.replace(/{item_image}/i, image) })
                        else embedWormhole.setAuthor({ name: style.collect.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048) })
                    } else if (style.collect.author.iconURL === `{member_avatar}`) {
                        embedWormhole.setAuthor({ name: style.collect.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048), iconURL: style.collect.author.iconURL.replace(/{member_avatar}/i, interaction.member.displayAvatarURL()) })
                    } else embedWormhole.setAuthor({ name: style.collect.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048), iconURL: style.collect.author.iconURL })	
                } else embedWormhole.setAuthor({ name: style.collect.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048) })
            }

            if (style.collect.footer.text) {
                if (style.collect.footer.iconURL) {
                    if (style.collect.footer.iconURL === `{item_image}`) {
                        if (image) embedWormhole.setFooter({ text: style.collect.footer.text.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048), iconURL: style.collect.footer.iconURL?.replace(/{item_image}/i, image) })
                        else embedWormhole.setFooter({ text: style.collect.footer.text.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048) })
                    } else if (style.collect.footer.iconURL === `{member_avatar}`) {
                        embedWormhole.setFooter({ text: style.collect.footer.text.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048), iconURL: style.collect.footer.iconURL.replace(/{member_avatar}/i, interaction.member.displayAvatarURL()) })
                    } else embedWormhole.setFooter({ text: style.collect.footer.text.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048), iconURL: style.collect.footer.iconURL })	
                } else embedWormhole.setFooter({ text: style.collect.footer.text.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).replace(/{member_name}/gi, interaction.member.displayName).slice(0, 2048) })
            }

            if (style.collect.description) embedWormhole.setDescription(style.collect.description.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).slice(0, 4096))

            if (style.collect.thumbnailURL) {
                if (style.collect.thumbnailURL === `{item_image}`) {
                    if (image) embedWormhole.setThumbnail(style.collect.thumbnailURL.replace(/{item_image}/i, image))
                } else if (style.collect.thumbnailURL === `{member_avatar}`) {
                    embedWormhole.setThumbnail(style.collect.thumbnailURL.replace(/{member_avatar}/i, interaction.member.displayAvatarURL()))
                } else embedWormhole.setThumbnail(style.collect.thumbnailURL)
            }

            if (style.collect.imageURL) {
                if (style.collect.imageURL === `{item_image}`) {
                    if (image) embedWormhole.setImage(style.collect.imageURL.replace(/{item_image}/i, image))
                } else if (style.collect.imageURL === `{member_avatar}`) {
                    embedWormhole.setThumbnail(style.collect.imageURL.replace(/{member_avatar}/i, interaction.member.displayAvatarURL()))
                } else embedWormhole.setImage(style.collect.imageURL)
            }

            embedWormhole.setColor(style.collect.color.replace(/{member_color}/i, interaction.member.displayHexColor).replace(/{item_color}/i, color))

            if (style.collect.title) embedWormhole.setTitle(style.collect.title.replace(/{member_name}/gi, interaction.member.displayName).replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).replace(/{amount}/gi, amount).slice(0, 256))
            
            try {
                await interaction.update({ content: " ",components: [], embeds: [embedWormhole] })
                takenWormholes.delete(interaction.message.id)
            } catch (err) {
                if (err.message === "Unknown interaction") {
                    return await interaction.message.edit({ content: " ", components: [], embeds: [embedWormhole] }).catch(e => null).then(msg => takenWormholes.delete(interaction.message.id))
                }
            }
            let webhook = client.cache.webhooks.get(wormhole.webhookId)
            if (!webhook) {
                webhook = await client.fetchWebhook(wormhole.webhookId).catch(e => null)
                if (webhook instanceof Webhook) client.cache.webhooks.set(webhook.id, webhook)
            }
            if (webhook) {
                if (wormhole.deleteAfterTouch && wormhole.deleteTimeOut > 0) {
                    setTimeout(() => {
                        webhook.deleteMessage(interaction.message, wormhole.threadId)
                    }, wormhole.deleteTimeOut)    
                }    
            }
        } catch (error) {
            if (error.stack.includes(`Missing Permissions`) || error.stack.includes(`Missing Access`) || error.stack.includes(`Unknown interaction`) || error.stack.includes(`Regular expression is invalid`) || error.stack.includes(`Unknown Channel`) || error.stack.includes(`Unknown Message`)) console.error(error)
            else {
                const embed = new EmbedBuilder()
                .setColor(3093046)
                .setAuthor({ name: `Error ${error.message}` })
                .setDescription(`\`\`\`ml\n${error.stack}\`\`\``)
                .setTimestamp()
                sendWebhook(process.env.errorWebhook, {
                    content: `<@${config.discord.ownerId}>`,
                    embeds: [embed]
                })
                console.error(error)
            }
        }
        await profile.addQuestProgression("wormhole", 1, wormhole.wormholeID)
        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.type === AchievementType.Wormhole && e.enabled)
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.wormholeTouched >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                client.tempAchievements[profile.userID].push(achievement.id)
                await profile.addAchievement(achievement)
            }
        }))
        await profile.save() 
    }
}