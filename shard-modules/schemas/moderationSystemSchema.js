const mongoose = require('mongoose');

const moderationSystemSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    prefix: { type: String, default: '-' },
    
    // Logging System
    logChannel: { type: String, default: null },
    logManagerRoles: [{ type: String }],
    
    // Ban Appeal System
    banAppealSystem: {
        enabled: { type: Boolean, default: false },
        appealChannel: { type: String, default: null },
        appealManagerRoles: [{ type: String }],
        mutualServerLink: { type: String, default: null },
        mutualServerGuildId: { type: String, default: null },
        maxAppealsPerUser: { type: Number, default: 3 },
        questions: {
            type: [String],
            default: [
                'Why do you think you were banned?',
                'Do you accept you broke a rule? Explain',
                'Why should staff give you another chance?',
                'What changes will you make if unbanned?',
                'Any extra info or proof to share?'
            ]
        }
    },
    
    // Timeout Appeal System
    timeoutAppealSystem: {
        enabled: { type: Boolean, default: false },
        appealChannel: { type: String, default: null },
        appealManagerRoles: [{ type: String }],
        maxAppealsPerUser: { type: Number, default: 3 },
        questions: {
            type: [String],
            default: [
                'Why do you think you were timed out?',
                'Was the timeout fair? Why/why not?',
                'Do you understand the rule you broke?',
                'What will you do to avoid future timeouts?',
                'Anything else for the moderators?'
            ]
        }
    }
});

module.exports = mongoose.model('ModerationSystem', moderationSystemSchema);
