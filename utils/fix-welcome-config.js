/**
 * Welcome Configuration Fix Script
 * 
 * This script helps fix common issues with welcome message configuration
 * 
 * Usage: node utils/fix-welcome-config.js <guildId> <channelId>
 */

const Settings = require('../schemas/settingsSchema');
const mongoose = require('mongoose');

async function fixWelcomeConfig(guildId, channelId) {
    console.log('='.repeat(60));
    console.log('WELCOME CONFIGURATION FIX');
    console.log('='.repeat(60));
    console.log(`\nGuild ID: ${guildId}`);
    console.log(`Channel ID: ${channelId}\n`);
    
    try {
        // Connect to database if not connected
        if (mongoose.connection.readyState !== 1) {
            console.log('⏳ Connecting to database...');
            await mongoose.connect(process.env.mongoDB_SRV || process.env.MONGODB_URI || process.env.MONGO_URI);
            console.log('✅ Connected to database\n');
        }
        
        // Fetch or create settings
        console.log('📊 Fetching guild settings...');
        let settings = await Settings.findOne({ guildID: guildId });
        
        if (!settings) {
            console.log('⚠️  No settings found, creating new settings document...');
            settings = new Settings({ guildID: guildId });
        } else {
            console.log('✅ Settings found\n');
        }
        
        // Initialize notificationChannels if it doesn't exist
        if (!settings.notificationChannels) {
            console.log('⚠️  notificationChannels field missing, initializing...');
            settings.notificationChannels = {};
        }
        
        // Configure welcome notification
        console.log('🔧 Configuring welcome notification...');
        settings.notificationChannels.welcome = {
            enabled: true,
            channelId: channelId,
            messageType: 'default',
            showMemberCount: true
        };
        
        // Save settings
        console.log('💾 Saving configuration...');
        await settings.save();
        console.log('✅ Configuration saved successfully!\n');
        
        // Verify the save
        console.log('🔍 Verifying configuration...');
        const verifySettings = await Settings.findOne({ guildID: guildId });
        const welcomeConfig = verifySettings.notificationChannels?.welcome;
        
        if (welcomeConfig && welcomeConfig.enabled && welcomeConfig.channelId === channelId) {
            console.log('✅ Verification successful!');
            console.log('\nConfiguration details:');
            console.log(`  - Enabled: ${welcomeConfig.enabled}`);
            console.log(`  - Channel ID: ${welcomeConfig.channelId}`);
            console.log(`  - Message Type: ${welcomeConfig.messageType}`);
            console.log(`  - Show Member Count: ${welcomeConfig.showMemberCount}`);
        } else {
            console.log('❌ Verification failed!');
            console.log('   The configuration was not saved correctly.');
            console.log('   Please check database permissions and try again.');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('NEXT STEPS');
        console.log('='.repeat(60));
        console.log('\n1. Verify the bot has permissions in the welcome channel:');
        console.log('   - View Channel');
        console.log('   - Send Messages');
        console.log('   - Embed Links');
        console.log('\n2. Test by having a member join the server');
        console.log('\n3. Check console logs for welcome notification messages');
        console.log('\n4. If issues persist, run the diagnostic tool:');
        console.log(`   node utils/diagnose-notifications.js ${guildId}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('FIX COMPLETE');
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('\n❌ Error during fix:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Close database connection if we opened it
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

// Run fix if called directly
if (require.main === module) {
    const guildId = process.argv[2];
    const channelId = process.argv[3];
    
    if (!guildId || !channelId) {
        console.error('Usage: node utils/fix-welcome-config.js <guildId> <channelId>');
        console.error('\nExample:');
        console.error('  node utils/fix-welcome-config.js 123456789012345678 987654321098765432');
        process.exit(1);
    }
    
    fixWelcomeConfig(guildId, channelId).then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { fixWelcomeConfig };
