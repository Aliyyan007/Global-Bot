class Job {
	constructor(client, job) {
		this.client = client
		this.id = job.id
		this.guildID = job.guildID
		this.name = job.name
		this.description = job.description
		this.action1 = job.action1
		this.action2 = job.action2
		this.enable = job.enable
		this.hide = job.hide
	}
	async save() {
		await this.client.jobSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined }), { upsert: true })
	}
	async delete() {
		await this.client.jobSchema.deleteOne({ id: this.id })
		this.client.cache.jobs.delete(this.id)
	}
}
module.exports = Job