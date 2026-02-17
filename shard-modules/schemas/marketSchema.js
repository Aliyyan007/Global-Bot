const { Schema, model, models } = require('mongoose')
const marketplaceItemSchema = new Schema({
    guildID: { type: String, require: true },
    userID: { type: String, require: true },
    lotID: { type: String, require: true, unique: true },
    item: {
        type: { type: Number },
        id: { type: String },
        amount: { type: Number },
        ms: { type: Number }
    },
    items: [{
        type: { type: Number },
        id: { type: String },
        amount: { type: Number }
    }],
    created: { type: Number },
    lifeTime: { type: Number },
    enable: { type: Boolean },
    channelId: { type: String },
    messageId: { type: String }
})
const name = "market"
module.exports = models[name] || model(name, marketplaceItemSchema)