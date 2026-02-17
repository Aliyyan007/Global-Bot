const mongoose = require('mongoose');

const moderationAppealSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    
    // Appeal Type
    appealType: { type: String, enum: ['ban', 'timeout'], required: true },
    
    // Moderation Details
    moderatorId: { type: String, required: true },
    moderatorUsername: { type: String, required: true },
    reason: { type: String, default: 'No reason provided' },
    duration: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
    
    // Appeal Details
    answers: [{ type: String }],
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    
    // Resolution Details
    resolvedBy: { type: String, default: null },
    resolvedByUsername: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    
    // Appeal Message ID
    appealMessageId: { type: String, default: null }
});

// Index for efficient queries
moderationAppealSchema.index({ guildId: 1, userId: 1, appealType: 1 });

module.exports = mongoose.model('ModerationAppeal', moderationAppealSchema);
