const { RewardType } = require("../enums/RewardType.js")
const auctionSchema = require("../schemas/auctionSchema.js")
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js")
const lt = require('long-timeout')
class Auction {
    constructor(client, auction) {
        this.client = client
        this.guildID = auction.guildID
        this.id = auction.id
        this.creatorId = auction.creatorId
        this.bet = auction.bet
        this.item = auction.item
        this.participants = auction.participants
        this.status = auction.status
        this.endDate = auction.endDate
        this.deleteDate = auction.deleteDate
        this.winnerId = auction.winnerId
        this.channelId = auction.channelId
        this.messageId = auction.messageId
    }
    async save() {
        await auctionSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined, timeoutEndId: undefined, timeoutDeleteId: undefined }), { upsert: true })
    }
    async delete(returnBets, returnAuctionItem) {
        if (this.timeoutEndId) this.clearTimeoutEnd()
        if (this.timeoutDeleteId) this.clearTimeoutDelete()
        if (returnAuctionItem) {
            const profile = await this.client.functions.fetchProfile(this.client, this.creatorId, this.guildID)
            if (this.item.type === RewardType.Item) profile.addItem(this.item.id, this.item.amount)
            if (this.item.type === RewardType.Role) profile.addRole(this.item.id, this.item.amount, this.item.ms)
            profile.save()
        }
        if (returnBets) {
            this.participants.forEach(async participant => {
                const profile = await this.client.functions.fetchProfile(this.client, participant.userID, this.guildID)
                if (participant.bet.type === RewardType.Currency) profile.currency = participant.bet.amount
                if (participant.bet.type === RewardType.Item) profile.addItem(participant.bet.id, participant.bet.amount)
                profile.save()
            })
        }
        this.client.cache.auctions.delete(this.id)
        await auctionSchema.deleteOne({ id: this.id })
    }
    async updateMessage(interaction) {
        const guild = this.client.guilds.cache.get(this.guildID)
        const channel = guild.channels.cache.get(this.channelId)
        const message = await channel.messages.fetch(this.messageId).catch(e => null)
        if (!message) return
        const memberCreator = await guild.members.fetch(this.creatorId).catch(e => null)
        const settings = this.client.cache.settings.get(this.guildID)
        const initialBetEmoji = this.bet.type === RewardType.Currency ? settings.displayCurrencyEmoji : this.client.cache.items.get(this.bet.id).displayEmoji
        let auctionItem
        if (this.item.type === RewardType.Role) {
            const guildRole = guild.roles.cache.get(this.item.id)
            auctionItem = `${guildRole.name} (${this.item.amount.toLocaleString()}) ${this.item.ms ? `[${this.client.functions.transformSecs(this.client, this.item.ms, this.guildID, interaction?.locale)}]` : ""}`
        }
        if (this.item.type === RewardType.Item) {
            const item = this.client.cache.items.get(this.item.id)
            auctionItem = `${item.displayEmoji}${item.name} (${this.item.amount.toLocaleString()})`
        }
        const embed = new EmbedBuilder()
            .setAuthor({ name: memberCreator?.displayName || this.creatorId, iconURL: memberCreator?.displayAvatarURL() })
            .setTitle(`${this.client.language({ textId: "Auction", guildId: this.guildID })}`)
            .setColor(3093046)
            .setDescription([
                auctionItem,
                `${this.client.language({ textId: "Starting bid", guildId: this.guildID })}: ${initialBetEmoji}${this.bet.initial.toLocaleString()}`,
                `${this.client.language({ textId: "Bid step", guildId: this.guildID })}: ${initialBetEmoji}${this.bet.step.toLocaleString()}`,
                `${this.client.language({ textId: "Auction end date", guildId: this.guildID })}: <t:${Math.floor(this.endDate/1000)}:f>`
            ].join("\n"))
            .setFields({
                name: `${this.client.language({ textId: "Participants", guildId: this.guildID })}:`,
                value: !this.participants.length ? `${this.client.language({ textId: "No participants", guildId: this.guildID })}` : this.participants.sort((a, b) => b.bet.amount - a.bet.amount).slice(0, 10).map((e, index) => `${index+1}. <@${e.userID}> ➜ ${initialBetEmoji}${e.bet.amount.toLocaleString()} ${index === 0 ? `(${this.client.language({ textId: "At auction end - will win", guildId: this.guildID })})` : ``}`).join("\n") + `${this.participants.length > 10 ? `\n*... ${this.client.language({ textId: "and more", guildId: this.guildID })} ${this.participants.length - 10}*` : ""}`
            })
            .setFooter({ text: `ID: ${this.id}` })
        const components = [
            new ActionRowBuilder()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId(`cmd{auctions}id{${this.id}} placeBet`)
                        .setLabel(`${this.client.language({ textId: "Place bet", guildId: this.guildID })}`)
                        .setStyle(ButtonStyle.Primary),
                    this.participants.length > 10 ? 
                        new ButtonBuilder()
                            .setCustomId(`cmd{auctions}id{${this.id}} participants`)
                            .setLabel(`${this.client.language({ textId: "All participants", guildId: this.guildID })}`)
                            .setStyle(ButtonStyle.Primary) : undefined
                ].filter(e => e))
        ].filter(e => e)
        if (interaction) {
            await interaction.update({
                embeds: [embed],
                components: components
            })
        } else await message.edit({
            embeds: [embed],
            components: components
        })
    }
    async end() {
        const guild = this.client.guilds.cache.get(this.guildID)
        const settings = this.client.cache.settings.get(this.guildID)
        const winner = this.participants.sort((a, b) => b.bet.amount - a.bet.amount)[0]
        if (winner) this.winnerId = winner.userID
        this.deleteDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
        this.status = "finished"
        this.setTimeoutDelete()
        await this.save()
        if (winner) {
            const winnerProfile = await this.client.functions.fetchProfile(this.client, winner.userID, this.guildID)
            if (this.item.type === RewardType.Item) await winnerProfile.addItem(this.item.id, this.item.amount)
            if (this.item.type === RewardType.Role) await winnerProfile.addRole(this.item.id, this.item.amount, this.item.ms)
            winnerProfile.currencySpent += winner.bet.amount
            winnerProfile.save()
        } else {
            const profile = await this.client.functions.fetchProfile(this.client, this.creatorId, this.guildID)
            if (this.item.type === RewardType.Item) await profile.addItem(this.item.id, this.item.amount)
            if (this.item.type === RewardType.Role) await profile.addRole(this.item.id, this.item.amount, this.item.ms)
            profile.save()
        }
        this.participants.forEach(async participant => {
            if (participant.userID !== winner.userID) {
                const profile = await this.client.functions.fetchProfile(this.client, participant.userID, this.guildID)
                if (participant.bet.type === RewardType.Currency) profile.currency = participant.bet.amount
                if (participant.bet.type === RewardType.Item) await profile.addItem(participant.bet.id, participant.bet.amount)
                profile.save()
            } else {
                const creatorProfile = await this.client.functions.fetchProfile(this.client, this.creatorId, this.guildID)
                await creatorProfile.addCurrency(participant.bet.amount)
                creatorProfile.save()
            }
        })
        let auctionItem
        if (this.item.type === RewardType.Role) {
            const guildRole = guild.roles.cache.get(this.item.id)
            auctionItem = `${guildRole.name} (${this.item.amount.toLocaleString()}) ${this.item.ms ? `[${this.client.functions.transformSecs(this.client, this.item.ms, this.guildID)}]` : ""}`
        }
        if (this.item.type === RewardType.Item) {
            const item = this.client.cache.items.get(this.item.id)
            auctionItem = `${item.displayEmoji}${item.name} (${this.item.amount.toLocaleString()})`
        }
        const initialBetEmoji = this.bet.type === RewardType.Currency ? settings.displayCurrencyEmoji : this.client.cache.items.get(this.bet.id).displayEmoji
        const memberCreator = await guild.members.fetch(this.creatorId).catch(e => null)
        const embed = new EmbedBuilder()
            .setAuthor({ name: memberCreator?.displayName || this.creatorId, iconURL: memberCreator?.displayAvatarURL() })
            .setTitle(`${this.client.language({ textId: "Auction ended", guildId: this.guildID })}`)
            .setColor(3093046)
            .setDescription([
                `${this.client.language({ textId: "Winner", guildId: this.guildID })}: ${winner ? `<@${winner.userID}>, ${this.client.language({ textId: "placed", guildId: this.guildID })} ➜ ${initialBetEmoji}${winner.bet.amount.toLocaleString()} ${this.client.language({ textId: "and won", guildId: this.guildID })} ${auctionItem}` : `${this.client.language({ textId: "missing", guildId: this.guildID })}`}`,
                `${this.client.language({ textId: "Deletion date of this message", guildId: this.guildID })}: <t:${Math.floor(this.deleteDate/1000)}:f>`
            ].join("\n"))
            .setFields({
                name: `${this.client.language({ textId: "Participants", guildId: this.guildID })}:`,
                value: !this.participants.length ? `${this.client.language({ textId: "No participants", guildId: this.guildID })}` : this.participants.sort((a, b) => b.bet.amount - a.bet.amount).slice(0, 10).map((e, index) => `${index+1}. <@${e.userID}> ➜ ${initialBetEmoji}${e.bet.amount.toLocaleString()} ${index === 0 ? `(${this.client.language({ textId: "Winner", guildId: this.guildID })})` : ``}`).join("\n") + `${this.participants.length > 10 ? `\n*... ${this.client.language({ textId: "and more", guildId: this.guildID })} ${this.participants.length - 10}*` : ""}`
            })
            .setFooter({ text: `ID: ${this.id}` })
        const components = []
        if (this.participants.length > 10) {
            components.push(new ButtonBuilder()
            .setCustomId(`cmd{auctions}id{${this.id}} participants`)
            .setLabel(`${this.client.language({ textId: "All participants", guildId: this.guildID })}`)
            .setStyle(ButtonStyle.Primary))
        }
        const channel = guild.channels.cache.get(this.channelId)
        const message = await channel.messages.fetch(this.messageId).catch(e => null)
        if (!message) return
        await message.edit({ embeds: [embed], components })
    }
    setTimeoutEnd() {
        this.timeoutEndId = lt.setTimeout(() => {
            this.end()
        }, this.endDate.getTime() - Date.now())
    }
    setTimeoutDelete() {
        this.timeoutDeleteId = lt.setTimeout(async () => {
            const guild = this.client.guilds.cache.get(this.guildID)
            const channel = guild.channels.cache.get(this.channelId)
            if (channel) {
                const message = await channel.messages.fetch(this.messageId).catch(e => null)
                if (message) {
                    message.delete().catch(e => null)
                }
            }
            this.delete()
        }, this.deleteDate.getTime() - Date.now())
    }
    clearTimeoutEnd() {
        lt.clearTimeout(this.timeoutEndId)
        delete this.timeoutEndId
    }
    clearTimeoutDelete() {
        lt.clearTimeout(this.timeoutDeleteId)
        delete this.timeoutDeleteId
    }
    resetTimeout() {
        this.clearTimeoutEnd()
        this.setTimeoutEnd()
    }
}
module.exports = Auction