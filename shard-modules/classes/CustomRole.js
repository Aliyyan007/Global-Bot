const customRoleSchema = require("../schemas/customRoleSchema.js")
const lt = require('long-timeout')
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { RewardType } = require("../enums/RewardType.js")
class CustomRole {
    constructor(client, customRole) {
        this.client = client
        this.guildID = customRole.guildID
        this.userID = customRole.userID
        this.id = customRole.id
        this.deleteDate = customRole.deleteDate
        this.name = customRole.name
        this.color = customRole.color
        this.channelId = customRole.channelId
        this.messageId = customRole.messageId
        this.minutes = customRole.minutes
        this.roleId = customRole.roleId
        this.icon = customRole.icon
        this.status = customRole.status
        this.displayIcon = customRole.displayIcon
        this.iconURL = customRole.iconURL
    }
    async save() {
        await customRoleSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined, displayIcon: undefined, timeoutDeleteId: undefined }), { upsert: true })
    }
    async delete() {
        if (this.timeoutDeleteId) this.clearTimeoutDelete()
        this.client.cache.customRoles.delete(this.id)
        await customRoleSchema.deleteOne({ id: this.id })
    }
    setTimeoutDelete() {
        if (!this.timeoutDeleteId) this.timeoutDeleteId = lt.setTimeout(async () => {
            if (this.status !== "moderation") return this.delete()
            const guild = this.client.guilds.cache.get(this.guildID)
            const member = await guild.members.fetch(this.userID).catch(e => null)
            if (member) {
                const profile = await this.client.functions.fetchProfile(this.client, this.userID, guild.id)
                const settings = this.client.cache.settings.get(guild.id)
                if (this.minutes === Infinity && settings.customRolePrice.length) {
                    for (let item of settings.customRolePrice) {
                        if (item.type === RewardType.Item) {
                            await profile.addItem(item.id, item.amount)
                        }
                        if (item.type === RewardType.Currency) {
                            profile.currency = item.amount
                        }
                        if (item.type === RewardType.Role) {
                            await profile.addRole(item.id, item.amount)
                        }
                        if (item.type === RewardType.Reputation) {
                            await profile.addRp(item.amount)
                        }
                    }
                    await profile.save()    
                }
                if (this.minutes !== Infinity && settings.customRolePriceMinute.length) {
                    for (let item of settings.customRolePriceMinute) {
                        if (item.type === RewardType.Item) {
                            await profile.addItem(item.id, item.amount * this.minutes)
                        }
                        if (item.type === RewardType.Currency) {
                            profile.currency = item.amount * this.minutes
                        }
                        if (item.type === RewardType.Role) {
                            await profile.addRole(item.id, item.amount * this.minutes)
                        }
                        if (item.type === RewardType.Reputation) {
                            await profile.addRp(item.amount * this.minutes)
                        }
                    }
                    await profile.save()    
                }
                member.send({ embeds: [new EmbedBuilder().setThumbnail(guild.iconURL()).setColor(3093046).setTitle(guild.name).setDescription(`${this.client.language({ textId: "You have been denied custom role creation, reason", guildId: guild.id })}: **${this.client.language({ textId: "3 days expiration", guildId: guild.id })}**`)] })
            }
            const channel = guild.channels.cache.get(this.channelId)
            if (channel) {
                const message = await channel.messages.fetch(this.messageId).catch(e => null)
                if (message) message.edit({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("0").setDisabled(true).setLabel(`${this.client.language({ textId: "NOT ALLOWED", guildId: guild.id })}`).setStyle(ButtonStyle.Danger))] })
            }
            this.delete()
        }, this.deleteDate.getTime() - Date.now())
    }
    clearTimeoutDelete() {
        if (this.timeoutDeleteId) {
            lt.clearTimeout(this.timeoutDeleteId)
            delete this.timeoutDeleteId    
        }
    }
}
module.exports = CustomRole