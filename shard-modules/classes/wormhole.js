const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Webhook, Message } = require("discord.js")
const Cron = require("croner")
class Wormhole {
	constructor(client, wormhole) {
		this.client = client
		this.guildID = wormhole.guildID
		this.wormholeID = wormhole.wormholeID
		this.chance = wormhole.chance
		this.name = wormhole.name
		this.itemID = wormhole.itemID
		this.amountFrom = wormhole.amountFrom
		this.amountTo = wormhole.amountTo
		this.deleteTimeOut = wormhole.deleteTimeOut
		this.deleteAfterTouch = wormhole.deleteAfterTouch
		this.enabled = wormhole.enabled
		this.styleID = wormhole.styleID
		this.webhookId = wormhole.webhookId
		this.channelId = wormhole.channelId
		this.threadId = wormhole.threadId
		this.permission = wormhole.permission
		this.cronPattern = wormhole.cronPattern
		this.runsLeft = wormhole.runsLeft
		this.visibleDate = wormhole.visibleDate
	}
	get isEnabled() {
		return this.enabled
	}
	async save() {
		await this.client.wormholeSchema.replaceOne({ wormholeID: this.wormholeID }, Object.assign({}, { ...this, client: undefined, cronJob: undefined }), { upsert: true })
	}
	async delete() {
		if (this.enabled) await this.disable()
		await this.client.wormholeSchema.deleteOne({ wormholeID: this.wormholeID })
		this.client.cache.wormholes.delete(this.wormholeID)
	}
	async spawn(webhook) {
		const guild = this.client.guilds.cache.get(this.guildID)
		if (!guild) return
		if (this.client.blacklist(guild.id, "full_ban", "guilds")) {
			this.disable()
			await this.save()
			console.log(`${new Date()} | ${this.wormholeID} | Failed wormhole spawn: server is blocked`)
			return
		} else {
			const settings = this.client.cache.settings.find(settings => settings.guildID === guild.id)
			const item = this.client.cache.items.find(item => item.itemID === this.itemID && item.guildID === guild.id && !item.temp)
			if (this.itemID !== "rp" && this.itemID !== "xp" && this.itemID !== "currency" && !item) return this.delete()
			else if (item && !item.enabled) {
				this.disable()
				await this.save()
				console.log(`${new Date()} | ${this.wormholeID} | Failed wormhole spawn: item ${item.itemID} is invisible`)
			}
			else {
				const emoji = item ? item.displayEmoji : this.itemID === "currency" ? settings.displayCurrencyEmoji : this.itemID === "xp" ? this.client.config.emojis.XP : this.client.config.emojis.RP
				let style = await this.client.styleSchema.findOne({ guildID: guild.id, styleID: this.styleID }).lean()
				if (!style) style = {
					appearance: {
						author: {
							name: this.client.language({ textId: "Wormhole", guildId: guild.id }),
							iconURL: 'https://i.imgur.com/gi8qKFX.gif'
						},
						description: this.itemID === "currency" ? `${this.client.language({ textId: "Wormhole", guildId: guild.id })}: ${emoji}${settings.currencyName} ${this.client.language({ textId: "appeared", guildId: guild.id })}!` : this.itemID === "xp" ? `${this.client.language({ textId: "Wormhole", guildId: guild.id })} ${this.client.config.emojis.XP}XP ${this.client.language({ textId: "appeared", guildId: guild.id })}!` :  this.itemID === "rp" ? `${this.client.language({ textId: "Wormhole", guildId: guild.id })} ${this.client.config.emojis.RP}RP ${this.client.language({ textId: "appeared", guildId: guild.id })}!` : `${this.client.language({ textId: "Wormhole", guildId: guild.id })} ${item.found ? `${emoji}${item.name}` : `||???????????||`} ${this.client.language({ textId: "appeared", guildId: guild.id })}!`,
						footer: {
							text: null,
							iconURL: null
						},
						thumbnailURL: null,
						imageURL: null,
						color: "#FFD500",
						title: null,
						button: {
							label: this.client.language({ textId: "Touch", guildId: guild.id }),
							style: "PRIMARY",
							emoji: `🤏`
						}    
					}
				}
				const name = this.itemID == "currency" ? settings.currencyName : this.itemID == "xp" ? `XP` :  this.itemID == "rp" ? `RP` : `${item.found ? `${item.name}` : `||???????????||`}`
				const wormholeBtn = new ButtonBuilder({
					label: style.appearance.button.label.replace(/{item_name}/gi, name).slice(0, 80),
					style: style.appearance.button.style === "SUCCESS" ? ButtonStyle.Success : style.appearance.button.style === "DANGER" ? ButtonStyle.Danger : style.appearance.button.style === "SECONDARY" ? ButtonStyle.Secondary : style.appearance.button.style === "PRIMARY" ? ButtonStyle.Primary : ButtonStyle.Link,
					customId: `cmd{wormhole}id{${this.wormholeID}}`,
					emoji: style.appearance.button.emoji === "{item_emoji}" ? emoji : await this.client.functions.getEmoji(this.client, style.appearance.button.emoji)
				})
				const embedWormhole = new EmbedBuilder()
				if (style.appearance.author.name) {
					if (style.appearance.author.iconURL) {
						if (style.appearance.author.iconURL === `{item_image}`) {
							if (item?.image) embedWormhole.setAuthor({ name: style.appearance.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 2048), iconURL: style.appearance.author.iconURL?.replace(/{item_image}/i, item.image) })
							else embedWormhole.setAuthor({ name: style.appearance.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 2048) })
						} else embedWormhole.setAuthor({ name: style.appearance.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 2048), iconURL: style.appearance.author.iconURL })	
					} else embedWormhole.setAuthor({ name: style.appearance.author.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 2048) })
				}
				if (style.appearance.description) embedWormhole.setDescription(style.appearance.description.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 4096))
				if (style.appearance.footer.text) {
					if (style.appearance.footer.iconURL) {
						if (style.appearance.footer.iconURL === `{item_image}`) {
							if (item?.image) embedWormhole.setFooter({ text: style.appearance.footer.text.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 2048), iconURL: style.appearance.footer.iconURL?.replace(/{item_image}/i, item.image) })
							else embedWormhole.setFooter({ text: style.appearance.footer.name.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 2048) })
						} else embedWormhole.setFooter({ text: style.appearance.footer.text.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 2048), iconURL: style.appearance.footer.iconURL })	
					} else embedWormhole.setFooter({ text: style.appearance.footer.text.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 2048) })
				}
				if (style.appearance.thumbnailURL) {
					if (style.appearance.thumbnailURL === `{item_image}`) {
						if (item?.image) embedWormhole.setThumbnail(style.appearance.thumbnailURL.replace(/{item_image}/i, item.image))
					} else embedWormhole.setThumbnail(style.appearance.thumbnailURL)
				}
				if (style.appearance.imageURL) {
					if (style.appearance.imageURL === `{item_image}`) {
						if (item?.image) embedWormhole.setImage(style.appearance.imageURL.replace(/{item_image}/i, item.image))
					} else embedWormhole.setImage(style.appearance.imageURL)
				}
				embedWormhole.setColor(style.appearance.color.replace(/{item_color}/i, item?.hex))
				if (style.appearance.title) embedWormhole.setTitle(style.appearance.title.replace(/{item_emoji}/gi, emoji).replace(/{item_name}/gi, name).slice(0, 256))
				const components = [new ActionRowBuilder().addComponents([wormholeBtn])]
				webhook.send({
					content: settings.roles?.wormholesNotification ? `<@&${settings.roles.wormholesNotification}>` : " ",
					components: components,
					embeds: [embedWormhole],
					threadId: this.threadId
				}).then(async (msg) => {
					console.info(`[${this.client.shard.ids[0]}] ${new Date()} | ${this.wormholeID} | Wormhole spawn`)
					this.runsLeft --
					await this.save()
					if (this.runsLeft <= 0) {
						await this.disable()
					}
					if (msg && webhook && this.deleteTimeOut > 0) {
						setTimeout(async () => {
							msg = await msg.fetch().catch(e => console.error(e))
							if (msg && msg instanceof Message && !msg.editedAt) webhook.deleteMessage(msg, this.threadId)
						}, this.deleteTimeOut)
					}
				}).catch(async e => {
					if (e.message.includes(`Invalid emoji`)) {
						const array = e.message.split(`\n`)
						for (const message of array.splice(1, array.length-1)) {
							const expression = message.replace(/data./, "").slice(0, message.indexOf(".emoji"))
							eval(expression).data.emoji.id = this.client.config.emojis.unknown
						}
						return webhook.send({ content: settings.roles?.wormholesNotification ? `<@&${settings.roles.wormholesNotification}>` : " ", embeds: [embedWormhole], components: components }).catch(async e => {
							console.error(e)
							console.log(`${new Date()} | ${this.wormholeID} | Failed wormhole spawn: ${e.message}`)
							this.disable()
							await this.save()
						})
					} else {
						console.error(e)
						console.log(`${new Date()} | ${this.wormholeID} | Failed wormhole spawn: ${e.message}`)
						this.disable()
						await this.save()
					}
				})
			}
		}
	}
	cronJobPause() {
		this.cronJob.pause()
	}
	cronJobStop() {
		this.cronJob.stop()
		this.cronJob = undefined
	}
	cronJobResume() {
		this.cronJob.resume()
	}
	cronJobStart() {
		this.cronJob = Cron(this.cronPattern, { interval: 60, timezone: "Africa/Conakry" }, async (job) => {
			let webhook = this.client.cache.webhooks.get(this.webhookId)
			if (!webhook) {
				webhook = await this.client.fetchWebhook(this.webhookId).catch(e => null)
				if (webhook instanceof Webhook) this.client.cache.webhooks.set(webhook.id, webhook)
			}
			if (!webhook) {
				await this.disable()
			} else {
				const chance = Math.random() * 100
				if (this.chance >= chance) {
					this.spawn(webhook)
				}
			}
		})
	}
	async disable() {
		if (this.cronJob) this.cronJobStop()
		this.enabled = false
		await this.save()
	}
	async enable() {
		this.cronJobStart()
		this.enabled = true
		await this.save()
	}
}
module.exports = Wormhole