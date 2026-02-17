const ModerationSystem = require('../schemas/moderationSystemSchema');

/**
 * Default appeal questions (45 characters or less)
 */
const DEFAULT_BAN_QUESTIONS = [
    'Why do you think you were banned?',
    'Do you accept you broke a rule? Explain',
    'Why should staff give you another chance?',
    'What changes will you make if unbanned?',
    'Any extra info or proof to share?'
];

const DEFAULT_TIMEOUT_QUESTIONS = [
    'Why do you think you were timed out?',
    'Was the timeout fair? Why/why not?',
    'Do you understand the rule you broke?',
    'What will you do to avoid future timeouts?',
    'Anything else for the moderators?'
];

/**
 * Get or create moderation system config for a guild
 * Ensures new configs always have the latest default questions
 * @param {string} guildId - The guild ID
 * @returns {Promise<Object>} The moderation system config
 */
async function getOrCreateConfig(guildId) {
    let config = await ModerationSystem.findOne({ guildId });
    
    if (!config) {
        config = await ModerationSystem.create({
            guildId,
            banAppealSystem: {
                questions: DEFAULT_BAN_QUESTIONS
            },
            timeoutAppealSystem: {
                questions: DEFAULT_TIMEOUT_QUESTIONS
            }
        });
    }
    
    return config;
}

module.exports = {
    getOrCreateConfig,
    DEFAULT_BAN_QUESTIONS,
    DEFAULT_TIMEOUT_QUESTIONS
};
