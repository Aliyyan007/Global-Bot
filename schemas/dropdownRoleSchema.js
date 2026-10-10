const { Schema, model, models } = require('mongoose')
const dropDownRoleSchema = new Schema({
    guildID: { type: String, required: true },
    messageID: { type: String, required: true, unique: true },
    channelID: { type: String, required: true },
    roles: { type: Map },
    cooldown: { type: Number },
    multi: { type: Boolean }
})
const name = "dropdownroles"
module.exports = models[name] || model(name, dropDownRoleSchema)
