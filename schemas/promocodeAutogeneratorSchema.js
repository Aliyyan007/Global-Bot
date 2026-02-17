const { Schema, model, models } = require('mongoose')
const promocodeAutogeneratorSchema = new Schema({
    id: { type: String, require: true, unique: true },
    name: { type: String, require: true },
    guildID: { type: String, require: true },
    enabled: { type: Boolean, default: false },
    channelId: { type: String },
    items: [],
    cronPattern: { type: String },
    runsLeft: { type: Number, default: Infinity },
    cycles: { type: Number, default: 10 },
    lifeTime: { type: Number, default: 1 * 60 * 24 },
    permission: { type: String },
    amountUses: { type: Number, default: 1 }
})
promocodeAutogeneratorSchema.index({ name: 1, guildID: 1 }, { unique: true })
const name = "promocode_autogenerators"
module.exports = models[name] || model(name, promocodeAutogeneratorSchema)