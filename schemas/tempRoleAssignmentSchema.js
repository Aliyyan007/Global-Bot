const { Schema, model, models } = require('mongoose')

/**
 * Schema for tracking active temporary role assignments
 * Stores when roles were assigned and when they should expire
 */
const tempRoleAssignmentSchema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    roleID: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    assignedBy: { type: String }, // User ID who assigned this role
    originalDuration: { type: Number, required: true }, // Original duration in milliseconds
    extended: { type: Boolean, default: false }, // Whether this role has been extended
    extensionCount: { type: Number, default: 0 } // Number of times extended
})

// Compound index for efficient queries
tempRoleAssignmentSchema.index({ guildID: 1, userID: 1, roleID: 1 }, { unique: true })
tempRoleAssignmentSchema.index({ expiresAt: 1 }) // For cleanup queries
tempRoleAssignmentSchema.index({ guildID: 1, roleID: 1 }) // For role-specific queries

const name = "temproleassignments"
module.exports = models[name] || model(name, tempRoleAssignmentSchema)
