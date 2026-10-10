const { Schema, model, models } = require('mongoose')
const giveawaySchema = new Schema({
    guildID: { type: String, required: true },
    giveawayID: { type: String, required: true, unique: true },
    creator: { type: String, required: true },
    type: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    url: { type: String, required: true },
    endsTime: { type: Date, required: true },
    winnerCount: { type: Number, required: true },
    rewards: [],
    status: { type: String, required: true },
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
