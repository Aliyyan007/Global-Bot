const { Schema, model, models } = require('mongoose')

const safeModerationSchema = new Schema({
    guildID: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    
    // Log channel for notifications (deprecated - use logWebhook instead)
    logChannelId: { type: String },
    
    // Webhook URL for notifications
    logWebhook: { type: String },
    
    // Approval channel (auto-created when cooldown is set to approval mode)
    // Note: Uses Server Panel channel if enabled, otherwise creates separate channel
    approvalChannelId: { type: String },
    approvalChannelCreatedAt: { type: Date },
    
    // Manager roles - users with these roles can approve restrictions
    managerRoles: [{ type: String }],
    
    // Whitelist roles - users with these roles are exempt from safe moderation actions
    whitelistRoles: [{ type: String }],
    
    // Server Panel System (Centralized logging channel)
    serverPanel: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String },
        channelCreatedAt: { type: Date }
    },
    
    // Bot protection
    botProtection: {
        enabled: { type: Boolean, default: false },
        requireApproval: { type: Boolean, default: true }
    },
    
    // Bot Shield System (Auto-quarantine and kick unauthorized bots)
    botShield: {
        enabled: { type: Boolean, default: false },
        quarantineRoleId: { type: String }, // ID of the quarantine role
        managerRoles: [{ type: String }] // Roles that can add bots without restriction (deprecated - uses main managerRoles)
    },
    
    // Server Recovery System (for mod/admin deletions)
    serverRecovery: {
        enabled: { type: Boolean, default: false },
        channelRoleRecovery: { type: Boolean, default: false },
        emojiStickerRecovery: { type: Boolean, default: false }
    },
    
    // Bot Shield System (Advanced Bot Security Console)
    sentinelHub: {
        enabled: { type: Boolean, default: false },
        controlChannelId: { type: String }, // Channel for approval messages (uses Server Panel if available)
        autoKickTimeout: { type: Number, default: 86400000 }, // 24 hours in ms
        riskThreshold: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' }
    },
    
    // Pending Server Recovery requests
    pendingRecoveries: [{
        recoveryId: { type: String, required: true },
        type: { type: String, enum: ['channel', 'role', 'emoji', 'sticker'], required: true },
        data: { type: Object, required: true }, // Channel, role, emoji, or sticker data
        executorId: { type: String, required: true },
        executorTag: { type: String, required: true },
        guildId: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        isBackup: { type: Boolean, default: false } // Flag to distinguish proactive backups from actual deletions
    }],
    
    // Permission configurations with individual settings
    permissions: {
        banKickMembers: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 }, // 24h in seconds
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 }, // 6h in seconds
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
        voiceModeration: {
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
        deafeningMembers: {
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
        },
        manageEmojis: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        deleteEmojisStickers: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 }, // 1 day in seconds
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 }, // 6h in seconds
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        manageChannels: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        manageRoles: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        serverSettings: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        },
        autoModRules: {
            enabled: { type: Boolean, default: true },
            cooldown: { type: Number, default: 86400 },
            actionCount: { type: Number, default: 3 },
            timeBetweenActions: { type: Number, default: 21600 },
            restrictionType: { type: String, enum: ['global', 'specific'], default: 'global' },
            specificRoles: [{ type: String }],
            specificUsers: [{ type: String }]
        }
    },
    
    // Spam Prevention System Configuration
    spamPrevention: {
        enabled: { type: Boolean, default: false },
        punishmentType: { type: String, enum: ['WARN', 'BAN', 'KICK', 'TIMEOUT'], default: 'TIMEOUT' },
        punishmentDuration: { type: String, default: '2days' }, // For TIMEOUT: 6h, 1day, 30day, 1year, 0 (permanent)
        actionsLimit: { type: Number, default: 1 }, // Number of spam violations allowed
        timeBetweenActions: { type: Number, default: 21600 }, // 6h in seconds
        restrictionType: { type: String, enum: ['global', 'role-based', 'channel-based'], default: 'global' },
        specificRoles: [{ type: String }], // For role-based restriction
        specificChannels: [{ type: String }], // For channel-based restriction
        whitelistDomains: [{ type: String }] // Whitelisted domains for link spam
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
    
    // Dynamic restriction roles (created per user, deleted after expiry)
    dynamicRestrictionRoles: [{
        roleId: { type: String },
        originalRoleId: { type: String },
        userId: { type: String },
        restrictedPermissions: [{ type: String }],
        createdAt: { type: Date },
        // CRITICAL FIX: Store expiry times for each permission to handle bot restarts
        expiryTimes: { type: Map, of: Date, default: {} },
        // Approval system fields
        approvalPending: { type: Boolean, default: false },
        approvalMessageId: { type: String },
        approvalThreadId: { type: String }
    }],
    
    // Quarantined bots awaiting approval
    quarantinedBots: [{
        botId: { type: String },
        addedBy: { type: String },
        addedAt: { type: Date },
        approved: { type: Boolean, default: false },
        approvedAt: { type: Date },
        originalRoles: [{ type: String }],
        originalRolePermissions: { type: Map, of: String, default: {} },
        approvalMessageId: { type: String },
        approvalThreadId: { type: String }
    }],
    
    // Bot restrictions (when bots exceed action limits)
    botRestrictions: [{
        botId: { type: String },
        restrictedAt: { type: Date },
        restrictions: [{
            actionType: { type: String },
            restrictedAt: { type: Date },
            expiresAt: { type: Date },
            originalPermissions: { type: Map, of: String, default: {} }
        }]
    }],
    
    // System initialization
    initialized: { type: Boolean, default: false },
    
    // Validator tracking fields
    disabledReason: { type: String }, // 'POSITION' or 'PERMISSION'
    disabledAt: { type: Date },
    recoveredAt: { type: Date }
}, { minimize: false })

const name = "safeModeration"
module.exports = models[name] || model(name, safeModerationSchema)
