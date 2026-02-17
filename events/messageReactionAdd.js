const { RewardType } = require("../enums")
const client = require("../index")
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.MessageReactionAdd, async (reaction) => {
    try {
        if (reaction.emoji === "🎉" && client.cache.giveaways.find(giveaway => giveaway.ends?.type === "reaction" && giveaway.status === "started" && giveaway.messageId === reaction.message.id)) {
        let { message } = reaction
        if (reaction.partial) message = await reaction.message.fetch()
        reaction = message.reactions.cache.get("🎉")
        const giveaway = client.cache.giveaways.find(e => e.messageId === message.id)
        if (!reaction || reaction.count - 1 < giveaway.ends.amount) return
        const { guild } = message
        const object = await giveaway.end(guild, reaction)
        if (!object.winners.length && giveaway.type === "user") {
            const profile = await client.functions.fetchProfile(client, giveaway.creator, guild.id)
            for (const element of giveaway.rewards) {
                if (element.type === RewardType.Currency) {
                    profile.currency = element.amount
                }
                else if (element.type === RewardType.Item) {
                    const item = client.cache.items.find(i => i.itemID === element.id && !i.temp)
                    if (item) await profile.addItem(element.id, element.amount)
                } else if (element.type === RewardType.Role) {
                    const role = guild.roles.cache.get(element.id)
                    if (role) profile.addRole(element.id, element.amount, element.ms)
                }
                await profile.save()
            }
        }
        const embed = EmbedBuilder.from(message.embeds[0])
        embed.addFields([
            {
                name: `${client.language({ textId: "Winners", guildId: guild.id })}`,
                value: object.winners.length ? object.winners.length > 42 ? object.winners.slice(0, 42).map(e => `<@${e.id}>`).join(", ") + ` ${client.language({ textId: "and more", guildId: guild.id })} ${object.winners.length - 42}...` : object.winners.map(e => `<@${e.id}>`).join(", ") : `${client.language({ textId: "No suitable", guildId: guild.id })}`
            }
        ])
        message.edit({ 
            content: `${client.config.emojis.tada}${client.config.emojis.tada}${client.language({ textId: "GIVEAWAY ENDED", guildId: guild.id })}${client.config.emojis.tada}${client.config.emojis.tada}`, 
            embeds: [embed], 
            components: giveaway.permission && client.cache.permissions.get(giveaway.permission) ? 
                [ 
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setLabel(`${client.language({ textId: "Requirement", guildId: guild.id })}`)
                                .setCustomId(`cmd{check-giveaway-requirements}giveaway{${giveaway.giveawayID}}`),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setLabel(`${client.language({ textId: "Reroll", guildId: guild.id })}`)
                                .setCustomId(`cmd{giveaway-reroll}giveaway{${giveaway.giveawayID}}`)
                        ) 
                ] : [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setLabel(`${client.language({ textId: "Reroll", guildId: guild.guildId })}`)
                                .setCustomId(`cmd{giveaway-reroll}giveaway{${giveaway.giveawayID}}`)
                        )
                ]
            })
        if (object.winners.length) {
            return message.reply({ 
                content: `🥳 ${object.winners.map(e => `<@${e.id}>`).join(", ")} [${client.language({ textId: "congratulations", guildId: guild.id })}! ${object.winners.length === 1 ? client.language({ textId: "You became the giveaway winner and won", guildId: guild.id }) : client.language({ textId: "You became the giveaway winners and won", guildId: guild.id })}](<${message.url}>): ${object.rewards.join(", ")}`,
                allowedMentions: { users: object.winners.map(e => e.id) } 
            })
        }
    }
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'MessageReactionAdd Event' })
    }
})