class ChannelMultipliers {
	constructor(client, channel) {
		this.client = client
		this.id = channel.id
		this.guildID = channel.guildID
		this.xp_multiplier = channel.xp_multiplier
		this.xp_multiplier_for_members = channel.xp_multiplier_for_members
		this.cur_multiplier = channel.cur_multiplier
		this.cur_multiplier_for_members = channel.cur_multiplier_for_members
		this.rp_multiplier = channel.rp_multiplier
		this.rp_multiplier_for_members = channel.rp_multiplier_for_members
		this.luck_multiplier = channel.luck_multiplier
		this.luck_multiplier_for_members = channel.luck_multiplier_for_members
		this.xp_max_members_size = channel.xp_max_members_size
		this.cur_max_members_size = channel.cur_max_members_size
		this.rp_max_members_size = channel.rp_max_members_size
		this.xp_min_members_size = channel.xp_min_members_size
		this.cur_min_members_size = channel.cur_min_members_size
		this.rp_min_members_size = channel.rp_min_members_size
		this.luck_min_members_size = channel.luck_min_members_size
		this.luck_max_members_size = channel.luck_max_members_size
		this.enabled = channel.enabled
	}
	get isEnabled() {
		return this.enabled
	}
	async save() {
		await this.client.channelMultipliersSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined }), { upsert: true })
	}
	async delete() {
		await this.client.channelMultipliersSchema.deleteOne({ id: this.id })
		this.client.cache.channels.delete(this.id)
	}
}
module.exports = ChannelMultipliers