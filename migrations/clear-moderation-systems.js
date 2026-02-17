/**
 * Migration: Clear All Moderation Systems
 * Deletes all moderation system documents so they can be recreated with new defaults
 * WARNING: This will reset all moderation system configurations!
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ModerationSystem = require('../schemas/moderationSystemSchema');

async function clearModerationSystems() {
    try {
        console.log('⚠️  WARNING: This will delete ALL moderation system configurations!');
        console.log('   All servers will need to reconfigure their moderation systems.');
        console.log('');
        
        // Show what will be deleted
        const systems = await ModerationSystem.find({});
        console.log(`📋 Found ${systems.length} moderation system(s) to delete:`);
        systems.forEach((sys, idx) => {
            console.log(`   ${idx + 1}. Guild ID: ${sys.guildId}`);
            console.log(`      - Enabled: ${sys.enabled}`);
            console.log(`      - Ban Appeal: ${sys.banAppealSystem.enabled}`);
            console.log(`      - Timeout Appeal: ${sys.timeoutAppealSystem.enabled}`);
        });
        
        console.log('');
        console.log('🗑️  Deleting all moderation systems...');
        
        // Delete all moderation systems
        const result = await ModerationSystem.deleteMany({});
        
        console.log(`✅ Deleted ${result.deletedCount} moderation system(s)`);
        console.log('');
        console.log('✅ All moderation systems have been cleared!');
        console.log('   When servers enable the moderation system again, they will get the new default questions.');
        
        return result;
        
    } catch (error) {
        console.error('❌ Failed to clear moderation systems:', error);
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
            console.log('');
            return clearModerationSystems();
        })
        .then(() => {
            console.log('');
            console.log('✅ All done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = clearModerationSystems;
