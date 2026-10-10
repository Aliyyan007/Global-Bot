const { Schema, model, models } = require('mongoose')

/**
 * Schema for storing temporary role configurations
 * Tracks which roles are set as temporary and their default durations
 */
const tempRoleConfigSchema = new Schema({
    guildID: { type: String, required: true },
    roleID: { type: String, required: true },
    duration: { type: Number, required: true }, // Duration in milliseconds
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }, // User ID who configured this
    enabled: { type: Boolean, default: true }
})

// Compound index for efficient queries
tempRoleConfigSchema.index({ guildID: 1, roleID: 1 }, { unique: true })
tempRoleConfigSchema.index({ guildID: 1, enabled: 1 })

const name = "temproleconfigs"
module.exports = models[name] || model(name, tempRoleConfigSchema)
