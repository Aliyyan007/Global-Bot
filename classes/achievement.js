const achievementSchema = require("../schemas/achievementSchema.js")
class Achievement {
	constructor(client, achievement) {
		this.client = client
		this.guildID = achievement.guildID
		this.id = achievement.id
        this.name = achievement.name
        this.emoji = achievement.emoji
        this.type = achievement.type
        this.amount = achievement.amount
        this.items = achievement.items
        this.roles = achievement.roles
        this.rewards = achievement.rewards
        this.enable = achievement.enable
        this.displayEmoji = "⏳"
	}
    get enabled() {
        return this.enable
    }
    async save() {
		await achievementSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined, displayEmoji: undefined }), { upsert: true })
	}
    async delete() {
        await Promise.all(this.client.cache.items.filter(e => e.guildID === this.guildID && e.onUse.addAchievement === this.id).map(async item => {
            item.onUse.addAchievement = undefined
            await item.save()
        }))
        await Promise.all(this.client.cache.profiles.filter(e => e.guildID === this.guildID && e.achievements?.some(a => a.achievmentID === this.id)).map(async profile => {
            profile.achievements = profile.achievements?.filter(a => a.achievmentID !== this.id)
            await profile.save()
        }))
        this.client.cache.achievements.delete(this.id)
        await achievementSchema.deleteOne({ id: this.id })
    }
}
module.exports = Achievement