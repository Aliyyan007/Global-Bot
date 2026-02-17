const mongoose = require('mongoose');

const userAppealCountSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    banAppeals: { type: Number, default: 0 },
    timeoutAppeals: { type: Number, default: 0 }
});

// Compound index for efficient queries
userAppealCountSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('UserAppealCount', userAppealCountSchema);
