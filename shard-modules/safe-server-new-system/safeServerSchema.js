const { Schema, model, models } = require('mongoose')

const safeServerSchema = new Schema({
    guildID: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    
    // Log channel for notifications
    logChannelId: { type: String },
    
    // Manager roles - users with these roles can approve restrictions
    managerRoles: [{ type: String }],
    
    // Bot protection
    botProtection: {
        enabled: { type: Boolean, default: false }
    },
    
    // Permission configurations with individual settings
    permissions: {
        banMembers: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 }, // 24h in seconds
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 }, // 6h in seconds
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        kickMembers: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        timeoutMembers: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        deleteRole: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        deleteChannel: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        deleteMessages: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        changeNickname: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        addingMassBots: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        disconnectingMembers: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        movingMembers: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        mutingMembers: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        everyoneHereSpam: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        }
    },
    
    // Active restrictions (users currently restricted)
    activeRestrictions: [{
        userId: { type: String },
        originalRoleId: { type: String }, // Their original role
        restrictedRoleId: { type: String }, // The restricted role created for them
        restrictedPermissions: [{ type: String }], // Array of permission keys
        restrictedAt: { type: Date },
        expiresAt: { type: Date },
        approvalPending: { type: Boolean, default: false },
        approvalMessageId: { type: String }
    }],
    
    // Quarantined bots awaiting approval
    quarantinedBots: [{
        botId: { type: String },
        addedBy: { type: String },
        addedAt: { type: Date },
        removedPermissions: [{ type: String }],
        approvalMessageId: { type: String }
    }],
    
    // System initialization
    initialized: { type: Boolean, default: false }
}, { minimize: false })

const name = "safeServer"
module.exports = models[name] || model(name, safeServerSchema)
