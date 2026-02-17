const { Schema, model, models } = require('mongoose')
const giftSchema = new Schema({
    giftID: { type: String, unique: true, require: true },
    guildID: { type: String, require: true },
    giftName: { type: String, require: true },
    enable: { type: Boolean, default: false },
    items: [{
        itemID: { type: String },
        amount: { type: Number }
    }],
    members: [{
        userID: { type: String },
        count: { type: Number },
        lastDate: { type: Date }
    }],
    maxUniqueMembers: { type: Number, default: 0 },
    maxCount: { type: Number, default: 1 },
    cooldown: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    comment: { type: String },
    image: { type: String },
    thumbnail: { type: String },
    color: { type: String },
    permission: { type: String }
})
giftSchema.index({ giftName: 1, guildID: 1 }, { unique: true })
const name = "gifts"
module.exports = models[name] || model(name, giftSchema)