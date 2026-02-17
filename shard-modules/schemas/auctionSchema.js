const { Schema, model, models } = require('mongoose')
const auctionSchema = new Schema({
    id: { type: String, require: true, unique: true },
    guildID: { type: String, require: true },
    creatorId: { type: String, require: true },
    bet: {
        type: { type: Number, require: true },
        id: { type: String },
        initial: { type: Number, require: true },
        step: { type: Number, require: true }
    },
    item: {
        type: { type: Number, require: true },
        id: { type: String, require: true },
        amount: { type: Number, require: true },
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
    status: { type: String, default: "editing", require: true },
    endDate: { type: Date },
    deleteDate: { type: Date },
    winnerId: { type: String },
    channelId: { type: String },
    messageId: { type: String }
})
const name = "auctions"
module.exports = models[name] || model(name, auctionSchema)