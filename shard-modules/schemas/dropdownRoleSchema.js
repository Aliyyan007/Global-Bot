const { Schema, model, models } = require('mongoose')
const dropDownRoleSchema = new Schema({
    guildID: { type: String, require: true },
    messageID: { type: String, require: true, unique: true },
    channelID: { type: String, require: true },
    roles: { type: Map },
    cooldown: { type: Number },
    multi: { type: Boolean }
})
const name = "dropdownroles"
module.exports = models[name] || model(name, dropDownRoleSchema)
