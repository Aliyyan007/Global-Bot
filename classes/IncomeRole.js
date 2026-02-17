class IncomeRole {
	constructor(client, role) {
		this.client = client
		this.guildID = role.guildID
        this.id = role.id
        this.xp = role.xp
        this.cur = role.cur
        this.rp = role.rp
        this.items = role.items
        this.type = role.type
        this.cooldown = role.cooldown
        this.enabled = role.enabled
        this.permission = role.permission
        this.notification = role.notification
	}
    get isEnabled() {
        return this.enabled
    }
    async save() {
		await this.client.roleSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined }), { upsert: true })
	}
	async delete() {
		await this.client.roleSchema.deleteOne({ id: this.id })
		this.client.cache.roles.delete(this.id)
	}
    enable() {
        this.enabled = true
    }
    disable() {
        this.enabled = false
    }
}
module.exports = IncomeRole