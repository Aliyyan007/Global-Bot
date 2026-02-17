const { Schema, model, models } = require('mongoose')
const giveawaySchema = new Schema({
    guildID: { type: String, require: true },
    giveawayID: { type: String, require: true, unique: true },
    creator: { type: String, require: true },
    type: { type: String, require: true },
    channelId: { type: String, require: true },
    messageId: { type: String, require: true },
    url: { type: String, require: true },
    endsTime: { type: Date, require: true },
    winnerCount: { type: Number, require: true },
    rewards: [],
    status: { type: String, require: true },
    description: { type: String },
    thumbnail: { type: String, default: null },
    permission: { type: String },
    deleteTemp: { type: Date },
    winners: [],
    ends: {
        type: { type: String },
        amount: { type: Number }
    }
})
const name = "giveaways"
module.exports = models[name] || model(name, giveawaySchema)