const { Schema, model, models } = require('mongoose')
const auctionSchema = new Schema({
    id: { type: String, required: true, unique: true },
    guildID: { type: String, required: true },
    creatorId: { type: String, required: true },
    bet: {
        type: { type: Number, required: true },
        id: { type: String },
        initial: { type: Number, required: true },
        step: { type: Number, required: true }
    },
    item: {
        type: { type: Number, required: true },
        id: { type: String, required: true },
        amount: { type: Number, required: true },
        ms: { type: Number },
        uniqId: { type: String }
    },
    participants: [{
        userID: { type: String },
        bet: {
            type: { type: Number },
            id: { type: String },
            amount: { type: Number }
        }
    }],
    status: { type: String, default: "editing", required: true },
    endDate: { type: Date },
    deleteDate: { type: Date },
    winnerId: { type: String },
    channelId: { type: String },
    messageId: { type: String }
})
const name = "auctions"
module.exports = models[name] || model(name, auctionSchema)
