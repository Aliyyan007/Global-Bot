const { Schema, model, models } = require('mongoose')
const globalProfileSchema = new Schema({
    userID: { type: String, require: true, unique: true },
    action_logs: { type: Array, default: undefined },
    lastOnline: { type: Number },
    device: { type: String },
    lastOnlineHiden: { type: Boolean }
})
const name = "globalprofiles"
module.exports = models[name] || model(name, globalProfileSchema)