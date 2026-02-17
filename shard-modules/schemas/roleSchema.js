const { Schema, model, models } = require('mongoose')
const roleIncomeSchema = new Schema({
    id: { type: String, unique: true, require: true },
    guildID: { type: String, require: true },
    xp: { type: Number, default: 0 },
    cur: { type: Number, default: 0 },
    rp: { type: Number, default: 0 },
    items: [{
        itemID: { type: String },
        amount: { type: Number }
    }],
    type: { type: String, default: "static"},
    cooldown: { type: Number, default: 1 },
    enabled: { type: Boolean, default: false },
    permission: { type: String },
    notification: { type: Boolean }
})
const name = "roles"
module.exports = models[name] || model(name, roleIncomeSchema)