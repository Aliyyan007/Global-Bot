const { Schema, model, models } = require('mongoose')
const blacklistSchema = new Schema({
	guildID: { type: String },
	userID: { type: String },
	full_ban: { type: Boolean }
})
const name = "blacklist"
module.exports = models[name] || model(name, blacklistSchema)