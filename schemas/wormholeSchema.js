const { Schema, model, models } = require('mongoose')
const wormholeSchema = new Schema({
	guildID: { type: String, require: true },
    wormholeID: { type: String, require: true, unique: true },
    chance: { type: Number, require: true },
    name : { type: String, require: true },
    itemID: { type: String, require: true },
    amountFrom: { type: Number, require: true },
    amountTo: { type: Number, require: true },
    deleteTimeOut: { type: Number },
    deleteAfterTouch: { type: Boolean },
    enabled: { type: Boolean },
    styleID: { type: String },
    webhookId: { type: String },
    threadId: { type: String },
    permission: { type: String },
    cronPattern: { type: String },
    runsLeft: { type: Number },
    visibleDate: { type: Boolean, default: true }
})
const name = "wormholes"
module.exports = models[name] || model(name, wormholeSchema)