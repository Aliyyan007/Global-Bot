const { Schema, model, models } = require('mongoose')
const promocodeSchema = new Schema({
    code: { type: String, require: true },
    guildID: { type: String, require: true },
    enabled: { type: Boolean, default: false },
    items: [],
    used: [],
    resetCronPattern: { type: String },
    enabledUntil: { type: Date },
    permission: { type: String },
    channelId: { type: String },
    messageId: { type: String },
    amountUses: { type: Number, default: 1 },
    deleteDate: { type: Date },
    createdDate: { type: Date, default: new Date() }
})
promocodeSchema.index({ code: 1, guildID: 1 }, { unique: true })
const name = "promocodes"
module.exports = models[name] || model(name, promocodeSchema)