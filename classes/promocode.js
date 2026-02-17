const Cron = require("croner")
const { EmbedBuilder, Colors } = require("discord.js")
const { RewardType } = require("../enums")
class Promocode {
	constructor(client, promocode) {
		this.client = client
		this.guildID = promocode.guildID
		this.code = promocode.code
		this.enabled = promocode.enabled
		this.items = promocode.items
		this.used = promocode.used
        this.amountUses = promocode.amountUses
		this.resetCronPattern = promocode.resetCronPattern
		this.enabledUntil = promocode.enabledUntil
        this.permission = promocode.permission
        this.channelId = promocode.channelId
        this.messageId = promocode.messageId
        this.deleteDate = promocode.deleteDate
        this.createdDate = promocode.createdDate
	}
	get isEnabled() {
		return this.enabled && (!this.enabledUntil || this.enabledUntil > new Date())
	}
	async save() {
		await this.client.promocodeSchema.replaceOne({ code: this.code, guildID: this.guildID }, Object.assign({}, { ...this, client: undefined, cronJob: undefined, timeoutDeleteId: undefined }), { upsert: true })
	}
	async delete() {
        if (this.timeoutDeleteId) this.clearTimeoutDelete()
        if (this.cronJob) this.cronJob.stop()
		await this.client.promocodeSchema.deleteOne({ code: this.code, guildID: this.guildID })	
		this.client.cache.promocodes.delete(`${this.code}_${this.guildID}`)	
	}
	cronJobStart() {
		this.cronJob = Cron(this.resetCronPattern, { interval: 60, timezone: "Africa/Conakry" }, async (job) => {
            this.resetUses()
		})
	}
	disable() {
		this.enabled = false
	}
	enable() {
		this.enabled = true
	}
    async use(profile, interaction) {
		this.used.push(profile.userID)
		if (this.channelId && this.messageId) {
			const guild = this.client.guilds.cache.get(this.guildID)
			const channel = guild.channels.cache.get(this.channelId)
			if (channel) {
				const message = await channel.messages.fetch(this.messageId).catch(e => null)
				if (message) {
					await message.edit({ embeds: [ this.generateEmbed() ] }).catch(e => null)
				} else {
					this.channelId = undefined
					this.messageId = undefined
				}
			} else {
				this.channelId = undefined
				this.messageId = undefined
			}
		}
		await this.save()
		const array = []
		for (const element of this.items) {
			if (element.type === RewardType.Currency) {
				const settings = this.client.cache.settings.get(this.guildID)
				await profile.addCurrency(element.amount)
				array.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${element.amount})`)
			} else
			if (element.type === RewardType.Experience) {
				await profile.addXp(element.amount)
				array.push(`${this.client.config.emojis.XP}${this.client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })} (${element.amount})`)
			} else
			if (element.type === RewardType.Reputation) {
				await profile.addRp(element.amount)
				array.push(`${this.client.config.emojis.RP}${this.client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${element.amount})`)
			} else
			if (element.type === RewardType.Item) {
				const rewardItem = this.client.cache.items.find(item => item.itemID === element.id && !item.temp && item.enabled)
				if (rewardItem) {
					await profile.addItem(rewardItem.itemID, element.amount)
					array.push(`${rewardItem.displayEmoji}${rewardItem.name} (${element.amount})`)
				} else {
					array.push(`${element.id} (${element.amount})`)
				}
			} else if (element.type === RewardType.Role) {
				profile.addRole(element.id, element.amount, element.ms)
				array.push(`<@&${element.id}>${element.ms ? ` [${this.client.functions.transformSecs(this.client, element.ms, interaction.guildId, interaction.locale)}]` : ``} (${element.amount})`)
			}
		}
		profile.promocodesUsed ++
		await profile.save()
		return array
    }
	async resetUses() {
		if (this.used.length) {
			this.used = []
			await this.save()
			if (this.channelId && this.messageId) {
				const guild = this.client.guilds.cache.get(this.guildID)
				const channel = guild.channels.cache.get(this.channelId)
				if (channel) {
					const message = await channel.messages.fetch(this.messageId).catch(e => null)
					if (message) {
						await message.edit({ embeds: [ this.generateEmbed() ] }).catch(e => null)
					} else {
						this.channelId = undefined
						this.messageId = undefined
						await this.save()
					}
				} else {
					this.channelId = undefined
					this.messageId = undefined
					await this.save()
				}
			}
		}
	}
    setTimeoutDelete() {
		console.log(`${this.code} | Delete timeout set`)
		this.timeoutDeleteId = setTimeout(async () => {
			console.log(`${this.code} | Delete timeout triggered`)
			if (this.channelId && this.messageId) {
				const guild = this.client.guilds.cache.get(this.guildID)
				if (guild) {
					const channel = guild.channels.cache.get(this.channelId)
					if (channel) {
						const message = await channel.messages.fetch(this.messageId).catch(e => null)
						if (message) {
							const embed = EmbedBuilder.from(message.embeds[0])
							embed.setDescription(`~~${embed.data.description}~~\n**${this.client.language({ textId: "PROMOCODE EXPIRED", guildId: this.guildID })}**`)
							await message.edit({ embeds: [embed] }).catch(e => null)
						}	
					}
				}
			}
			await this.delete()
		}, this.deleteDate.getTime() - Date.now())
	}
    clearTimeoutDelete() {
		console.log(`${this.code} | Delete timeout cleared`)
		clearTimeout(this.timeoutDeleteId)
		delete this.timeoutDeleteId
	}
	async send() {
		const guild = this.client.guilds.cache.get(this.guildID)
		const channel = guild.channels.cache.get(this.channelId)
		const message = await channel.send({
			embeds: [ this.generateEmbed() ]
		})
		if (!this.channelId) this.channelId = channelId
		this.messageId = message.id
		await this.save()
		return message
	}
	generateEmbed() {
		return new EmbedBuilder()
			.setDescription([
				`**${this.client.language({ textId: "PROMOCODE", guildId: this.guildID })}**`,
				`${this.client.config.emojis.ticket}\`${this.code}\``,
				`**${this.client.config.emojis.activities}${this.client.language({ textId: "ACTIVATION COUNT", guildId: this.guildID })} ${this.used.length}/${this.amountUses}**`,
				this.enabledUntil || this.deleteDate ? `**${this.client.config.emojis.watch}${this.client.language({ textId: "UNTIL", guildId: this.guildID })} <t:${Math.floor((this.enabledUntil || this.deleteDate) / 1000)}:f>**` : undefined,
				`**${this.client.language({ textId: "To activate use command </promocode:1243977361792172102> <CODE>", guildId: this.guildID })}**`
			].filter(e => e).join("\n"))
			.setColor(Colors.White)
	}
}
module.exports = Promocode