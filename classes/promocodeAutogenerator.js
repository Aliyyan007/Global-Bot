const Cron = require("croner")
const Promocode = require("./promocode")
const uniqid = require('uniqid')
class Autogenerator {
	constructor(client, autogenerator) {
		this.client = client
		this.guildID = autogenerator.guildID
		this.id = autogenerator.id
        this.name = autogenerator.name
		this.enabled = autogenerator.enabled
		this.items = autogenerator.items
		this.channelId = autogenerator.channelId
		this.cronPattern = autogenerator.cronPattern
        this.runsLeft = autogenerator.runsLeft
        this.cycles = autogenerator.cycles
        this.lifeTime = autogenerator.lifeTime
        this.permission = autogenerator.permission
		this.amountUses = autogenerator.amountUses
	}
	get isEnabled() {
		return this.enabled && this.runsLeft && this.cronPattern
	}
	async save() {
		await this.client.promocodeAutogeneratorSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined, cronJob: undefined }), { upsert: true })
	}
	async delete() {
        if (this.cronJob) this.cronJob.stop()
		await this.client.promocodeAutogeneratorSchema.deleteOne({ id: this.id })
		this.client.cache.promocodeAutogenerators.delete(this.id)
	}
	cronJobStart() {
		this.cronJob = Cron(this.cronPattern, { interval: 60 * 10, timezone: "Africa/Conakry" }, async (job) => {
			if (this.client.cache.promocodes.filter(e => e.guildID === this.guildID).size >= 1000) {
				this.disable()
				await this.save()
				return
			}
			const guild = this.client.guilds.cache.get(this.guildID)
			const channel = guild.channels.cache.get(this.channelId)
			if (!channel) {
				this.channelId = undefined
				this.disable()
				await this.save()
			} else {
				const promocode = await this.generate()
				if (promocode) promocode.send()	
			}
		})
	}
	disable() {
        if (this.cronJob) this.cronJob.stop()
		this.enabled = false
	}
	enable() {
        this.cronJobStart()
		this.enabled = true
	}
    async generate() {
		console.log(`[${this.client.shard.ids[0]}] ${new Date()} Generating promocode ${this.id}`)
		const pool = this.generatePool()
		if (!pool.length) return
		let promocode = new this.client.promocodeSchema({
			code: uniqid.time().toUpperCase(),
			guildID: this.guildID,
			enabled: true,
			amountUses: this.amountUses,
			items: pool,
			permission: this.permission,
			channelId: this.channelId,
			deleteDate: new Date(Date.now() + this.lifeTime * 60 * 1000),
			createdDate: new Date()
		})
		await promocode.save()
		promocode = new Promocode(this.client, promocode)
		promocode.setTimeoutDelete()
		this.client.cache.promocodes.set(`${promocode.code}_${promocode.guildID}`, promocode)
		this.runsLeft --
		if (!this.runsLeft) this.disable()
		await this.save()
		return promocode
    }
	generatePool() {
		const array = []
		const lerp = (min, max, roll) => ((1 - roll) * min + roll * max)
		const drop = (items, roll) => {
			const chance = lerp(0, 100, roll)
			let current = 0
			for (const item of items) {
				if (current <= chance && chance <= current + item.chance) {
					return item
				}
				current += item.chance
			}
		}
		for (let i = 0; i < this.cycles; i++) {
			let base_chance = Math.random()
            if (base_chance === 0) base_chance = 1
            const item = drop(this.items, base_chance)
			if (item) {
				const arrayItem = array.find(e => { return e.type === item.type && e.id === item.id })
				if (arrayItem) arrayItem.amount += item.amount
				else {
					array.push({
						type: item.type,
						id: item.id,
						amount: item.amount
					})	
				}
			}
		}
		return array
	}
}
module.exports = Autogenerator