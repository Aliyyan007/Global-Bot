const { Schema, model, models } = require('mongoose')
const achievementSchema = new Schema({
    id: { type: String, required: true, unique: true },
    guildID: { type: String, required: true },
    name: { type: String, required: true },
    emoji: { type: String },
    type: { type: Schema.Types.Mixed },
    amount: { type: Number },
    items: [],
    roles: [],
    rewards: [{
        type: { type: Number },
        id: { type: String },
        amount: { type: Number },
    }],
    enable: { type: Boolean, default: false }
})
achievementSchema.index({ name: 1, guildID: 1 }, { unique: true })
const name = "achievements"
module.exports = models[name] || model(name, achievementSchema)
