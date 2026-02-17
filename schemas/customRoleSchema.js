const { Schema, model, models } = require('mongoose')
const customRoleSchema = new Schema({
    guildID: { type: String },
    userID: { type: String },
    id: { type: String },
    name: { type: String },
    color: { type: String },
    deleteDate: { type: Date },
    channelId: { type: String },
    messageId: { type: String },
    minutes: { type: Number },
    roleId: { type: String },
    icon: { type: String },
    status: { type: String },
    iconURL: { type: String }
})
const name = "custom_roles"
module.exports = models[name] || model(name, customRoleSchema)