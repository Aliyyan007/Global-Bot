const { Schema, model, models } = require('mongoose')
const timedRoleSchema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    roleID: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    messageID: { type: String }, // Reference to the dropdown message
    createdAt: { type: Date, default: Date.now }
})
// Compound index for efficient queries
timedRoleSchema.index({ guildID: 1, userID: 1, roleID: 1 }, { unique: true })
timedRoleSchema.index({ expiresAt: 1 })

const name = "timedroles"
module.exports = models[name] || model(name, timedRoleSchema)
