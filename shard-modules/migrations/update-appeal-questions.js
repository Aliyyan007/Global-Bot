/**
 * Migration: Update Appeal Questions
 * Updates all existing moderation systems with new default appeal questions
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ModerationSystem = require('../schemas/moderationSystemSchema');

async function updateAppealQuestions() {
    try {
        console.log('Starting appeal questions migration...');
        
        const newBanQuestions = [
            'Why do you think you were banned?',
            'Do you accept you broke a rule? Explain',
            'Why should staff give you another chance?',
            'What changes will you make if unbanned?',
            'Any extra info or proof to share?'
        ];
        
        const newTimeoutQuestions = [
            'Why do you think you were timed out?',
            'Was the timeout fair? Why/why not?',
            'Do you understand the rule you broke?',
            'What will you do to avoid future timeouts?',
            'Anything else for the moderators?'
        ];
        
        // First, show current questions
        console.log('\n📋 Current questions in database:');
        const systems = await ModerationSystem.find({});
        systems.forEach((sys, idx) => {
            console.log(`\nServer ${idx + 1} (${sys.guildId}):`);
            console.log('Ban Q1:', sys.banAppealSystem.questions[0]);
            console.log('Timeout Q1:', sys.timeoutAppealSystem.questions[0]);
        });
        
        // Update all moderation systems
        const result = await ModerationSystem.updateMany(
            {},
            {
                $set: {
                    'banAppealSystem.questions': newBanQuestions,
                    'timeoutAppealSystem.questions': newTimeoutQuestions
                }
            }
        );
        
        console.log(`\n✅ Migration complete!`);
        console.log(`   Updated ${result.modifiedCount} moderation system(s)`);
        console.log(`   Matched ${result.matchedCount} document(s)`);
        
        // Verify the update
        console.log('\n✅ Verifying update:');
        const updatedSystems = await ModerationSystem.find({});
        updatedSystems.forEach((sys, idx) => {
            console.log(`\nServer ${idx + 1} (${sys.guildId}):`);
            console.log('Ban Q1:', sys.banAppealSystem.questions[0]);
            console.log('Timeout Q1:', sys.timeoutAppealSystem.questions[0]);
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const dbUrl = process.env.mongoDB_SRV;
    
    if (!dbUrl) {
        console.error('❌ No database URL found in environment variables');
        console.error('   Make sure mongoDB_SRV is set in your .env file');
        process.exit(1);
    }
    
    mongoose.connect(dbUrl)
        .then(() => {
            console.log('✅ Connected to database');
            return updateAppealQuestions();
        })
        .then(() => {
            console.log('✅ All done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = updateAppealQuestions;
