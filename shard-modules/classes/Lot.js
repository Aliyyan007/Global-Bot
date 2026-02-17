const marketSchema = require("../schemas/marketSchema.js")
const { RewardType, AchievementType } = require('../enums/index')
const { EmbedBuilder } = require("discord.js")
class Lot {
	constructor(client, lot) {
		this.client = client
		this.guildID = lot.guildID
		this.lotID = lot.lotID
        this.userID = lot.userID
        this.item = {
            type: lot.item.type,
            id: lot.item.id,
            amount: lot.item.amount,
            ms: lot.item.ms
        }
        this.items = lot.items
        this.created = lot.created
        this.lifeTime = lot.lifeTime
        this.enable = lot.enable
        this.channelId = lot.channelId
        this.messageId = lot.messageId
	}
    async save() {
		await marketSchema.replaceOne({ lotID: this.lotID }, Object.assign({}, { ...this, client: undefined, timeoutDeleteId: undefined }), { upsert: true })
	}
    async return() {
        const seller = this.client.cache.profiles.get(this.guildID+this.userID)
        if (seller) {
            if (this.item.type === RewardType.Item) {
                if (!this.client.cache.items.find(item => item.itemID === this.item.id && item.guildID === this.guildID && !item.temp && item.enabled)) return await this.delete()
                await seller.addItem(this.item.id, this.item.amount)
            }
            if (this.item.type === RewardType.Role) seller.addRole(this.item.id, this.item.amount, this.item.ms)
            await seller.save()
        }
        await this.delete()
    }
    async delete() {
        if (this.channelId && this.messageId) {
            const guild = this.client.guilds.cache.get(this.guildID)
            const channel = guild.channels.cache.get(this.channelId)
            if (channel) {
                const message = await channel.messages.fetch(this.messageId).catch(e => null)
                if (message) await message.delete()
            }
        }
        if (this.timeoutDeleteId) this.clearTimeoutDelete()
        this.client.cache.lots.delete(this.lotID)
        await marketSchema.deleteOne({ lotID: this.lotID })
    }
    async buy(profile, profileSeller, amount, memberSeller, interaction, reply) {
        if (!this.enable) return interaction.reply({ content: `${this.client.config.emojis.NO}**${this.client.language({ textId: "This lot no longer exists", guildId: this.guildID, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        this.enable = false
        const guild = this.client.guilds.cache.get(this.guildID)
        for (let item of this.items) {
            if (item.type === RewardType.Item) {
                await profile.subtractItem(item.id, item.amount * amount)
                await profileSeller.addItem(item.id, item.amount * amount)
            }
            if (item.type === RewardType.Currency) {
                profileSeller.currency = item.amount * amount
                profile.currency = item.amount * amount * -1
            }
            if (item.type === RewardType.Role) {
                await profile.subtractRole(item.id, item.amount * amount)
                await profileSeller.addRole(item.id, item.amount * amount)
            }
        }
        if (this.item.type === RewardType.Role) {
            await profile.addRole(this.item.id, amount, this.item.ms)   
        }
        profileSeller.itemsSoldOnMarketPlace = amount
        this.item.amount -= amount
        if (this.item.type === RewardType.Item) {
            const serverItem = this.client.cache.items.find(e => !e.temp && e.itemID === this.item.id && e.enabled)
            await profile.addItem(serverItem.itemID, amount)
            this.client.emit("economyLogCreate", this.guildID, `<@${interaction.user.id}> (${interaction.user.username}) ${this.client.language({ textId: "bought item on market", guildId: this.guildID })} ${serverItem.displayEmoji}**${serverItem.name}** (${serverItem.itemID}) (${amount})`)
            await profile.addQuestProgression("itemsBoughtOnMarket", amount, serverItem.itemID)
            await profileSeller.addQuestProgression("marketplace", amount, serverItem.itemID)
        }
        if (this.item.type === RewardType.Role) {
            await profileSeller.addQuestProgression("marketplace", amount)
        }
        let achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.enabled && e.type === AchievementType.Marketplace)
        await Promise.all(achievements.map(async achievement => {
            if (!profileSeller.achievements?.some(ach => ach.achievmentID === achievement.id) && profileSeller.itemsSoldOnMarketPlace >= achievement.amount && !this.client.tempAchievements[profileSeller.userID]?.includes(achievement.id)) { 
                if (!this.client.tempAchievements[profileSeller.userID]) this.client.tempAchievements[profileSeller.userID] = []
                this.client.tempAchievements[profileSeller.userID].push(achievement.id)
                await profileSeller.addAchievement(achievement)
            }    
        }))
        await profileSeller.save()
        profile.itemsBoughtOnMarket += amount
        achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.enabled && e.type === AchievementType.ItemsBoughtOnMarket)
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.itemsBoughtOnMarket >= achievement.amount && !this.client.tempAchievements[interaction.user.id]?.includes(achievement.id)) { 
                if (!this.client.tempAchievements[interaction.user.id]) this.client.tempAchievements[interaction.user.id] = []
                this.client.tempAchievements[interaction.user.id].push(achievement.id)
                await profile.addAchievement(achievement)
            }    
        }))
        await profile.save()
        let sellingItem
        if (this.item.type === RewardType.Item) {
            const item = this.client.cache.items.find(e => !e.temp && e.itemID === this.item.id && e.enabled)
            sellingItem = `${item?.displayEmoji || ""}${item?.name || this.item.id} (${amount.toLocaleString()})`
        }
        if (this.item.type === RewardType.Role) {
            const role = guild.roles.cache.get(this.item.id)
            sellingItem = `${role.name}${this.item.ms ? ` [${client.functions.transformSecs(client, this.item.ms, interaction.guildId, interaction.locale)}]` : ``} (${amount.toLocaleString()})`
        }
        if (memberSeller) memberSeller.send({ embeds: [
            new EmbedBuilder()
                .setTitle(guild.name)
                .setThumbnail(interaction.member.displayAvatarURL())
                .setDescription(`${this.client.language({ textId: "From your lot on market", guildId: this.guildID })} (${this.lotID}) <@${interaction.user.id}> (${interaction.member.displayName}) ${this.client.language({ textId: "bought", guildId: this.guildID })} ${sellingItem}`)
                .setColor(3093046)
        ] }).catch(e => null)
        if (reply) await interaction.reply({ content: `${this.client.config.emojis.YES}${this.client.language({ textId: "You bought", guildId: this.guildID, locale: interaction.locale })}: ${sellingItem}`, flags: ["Ephemeral"] })
        else await interaction.followUp({ content: `${this.client.config.emojis.YES}${this.client.language({ textId: "You bought", guildId: this.guildID, locale: interaction.locale })}: ${sellingItem}`, flags: ["Ephemeral"] })
        let message
        if (this.item.amount === 0) {
            await this.delete()
        } else {
            this.enable = true
            await this.save()
            if (this.channelId && this.messageId) {
                const channel = guild.channels.cache.get(this.channelId)
                if (channel) {
                    message = await channel.messages.fetch(this.messageId).catch(e => null)
                }
            }
        }
        if (message) {
            const item = this.client.cache.items.find(e => !e.temp && e.itemID === this.item.id && e.enabled)
            const settings = await this.client.cache.settings.find(settings => settings.guildID === this.guildID)
            const embed = EmbedBuilder.from(message.embeds[0])
            embed.setDescription([
                `${this.item.type === RewardType.Role ? `<@&${this.item.id}>` : `${item.displayEmoji}${item.name}`} (${this.item.amount})`,
                `${this.client.language({ textId: "Price per 1 pc.", guildId: this.guildID })}:`,
                this.items.map(i => {
                    if (i.type === RewardType.Currency) {
                        return `${settings.displayCurrencyEmoji}${settings.currencyName} (${i.amount.toLocaleString()})`
                    }
                    if (i.type === RewardType.Item) {
                        const it = this.client.cache.items.find(e => e.itemID === i.id && !e.temp && e.enabled && !e.notSellable)
                        return `${it?.displayEmoji || ""}${it?.name || i.id} (${i.amount.toLocaleString()})`
                    }
                    if (i.type === RewardType.Role) {
                        return `<@&${i.id}> (${i.amount.toLocaleString()})`
                    }
                }).join("\n"),
                this.lifeTime ? `${this.client.language({ textId: "Storage expiration date", guildId: this.guildID })}: <t:${Math.floor(this.lifeTime/1000)}:f>` : undefined
            ].filter(e => e).join("\n"))
            await message.edit({ embeds: [embed] }).catch(e => null)
        }
    }
    setTimeoutDelete() {
		this.timeoutDeleteId = setTimeout(async () => {
            const guild = this.client.guilds.cache.get(this.guildID)
            const profile = this.client.cache.profiles.get(guild.id+this.userID)
            if (profile) {
                const member = await guild.members.fetch(this.userID).catch(e => null)
                let sellingItem
                if (this.item.type === RewardType.Item) {
                    const item = this.client.cache.items.find(e => !e.temp && e.itemID === this.item.id && e.enabled)
                    if (item) {
                        sellingItem = `${item?.name || this.item.id} (${this.item.amount.toLocaleString()})`
                    }
                }
                if (this.item.type === RewardType.Role) {
                    const role = guild.roles.cache.get(this.item.id)
                    if (role) {
                        sellingItem = `${role.name} (${this.item.amount.toLocaleString()})`	
                    }
                }
                await this.return()
                if (member && sellingItem) member.send({ embeds: [
                    new EmbedBuilder()
                        .setTitle(guild.name)
                        .setThumbnail(guild.iconURL())
                        .setDescription(`${this.client.language({ textId: "Your lot", guildId: guild.id })} ${sellingItem} (${this.lotID}) ${this.client.language({ textId: "was automatically deleted after 14 days. Items were returned.", guildId: guild.id })}`)
                        .setColor(3093046)
                ] }).catch(e => null)
            }
		}, this.lifeTime - Date.now())
	}
    clearTimeoutDelete() {
		clearTimeout(this.timeoutDeleteId)
		delete this.timeoutDeleteId
	}
}
module.exports = Lot