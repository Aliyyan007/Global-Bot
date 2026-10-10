const { Schema, model, models } = require('mongoose')
const wormholeSchema = new Schema({
	guildID: { type: String, required: true },
    wormholeID: { type: String, required: true, unique: true },
    chance: { type: Number, required: true },
    name : { type: String, required: true },
    itemID: { type: String, required: true },
    amountFrom: { type: Number, required: true },
    amountTo: { type: Number, required: true },
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
