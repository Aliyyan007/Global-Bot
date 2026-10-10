const client = require("../index")
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { handleError } = require("../handler/errorHandler")
const { returnGiveawayRewards } = require("../handler/giveawayHelpers")

client.on(Events.MessageReactionAdd, async (reaction) => {
    try {
        if (reaction.emoji.name === "🎉" && client.cache.giveaways.find(giveaway => giveaway.ends?.type === "reaction" && giveaway.status === "started" && giveaway.messageId === reaction.message.id)) {
        let { message } = reaction
        if (reaction.partial) message = await reaction.message.fetch()
        reaction = message.reactions.cache.get("🎉")
        const giveaway = client.cache.giveaways.find(e => e.messageId === message.id)
        if (!reaction || reaction.count - 1 < giveaway.ends.amount) return
        const { guild } = message
        const object = await giveaway.end(guild, reaction)
        if (!object.winners.length) await returnGiveawayRewards(client, giveaway, guild)
        const embed = EmbedBuilder.from(message.embeds[0])
        embed.addFields([
            {
                name: `${client.language({ textId: "Winners", guildId: guild.id })}`,
                value: object.winners.length ? object.winners.length > 42 ? object.winners.slice(0, 42).map(e => `<@${e.id}>`).join(", ") + ` ${client.language({ textId: "and more", guildId: guild.id })} ${object.winners.length - 42}...` : object.winners.map(e => `<@${e.id}>`).join(", ") : `${client.language({ textId: "No suitable", guildId: guild.id })}`
            }
        ])
        await message.edit({ 
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
                                .setLabel(`${client.language({ textId: "Reroll", guildId: guild.id })}`)
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
