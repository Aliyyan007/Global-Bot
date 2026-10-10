/**
 * Notification System Diagnostic Tool
 * 
 * This script helps diagnose issues with the notification system
 * (welcome, goodbye, levelup, birthday, daily reward)
 * 
 * Usage: node utils/diagnose-notifications.js <guildId>
 */

const Settings = require('../schemas/settingsSchema');
const mongoose = require('mongoose');

async function diagnoseNotifications(guildId) {
    console.log('='.repeat(60));
    console.log('NOTIFICATION SYSTEM DIAGNOSTIC');
    console.log('='.repeat(60));
    console.log(`\nGuild ID: ${guildId}\n`);
    
    try {
        // Connect to database if not connected
        if (mongoose.connection.readyState !== 1) {
            console.log('⏳ Connecting to database...');
            await mongoose.connect(process.env.mongoDB_SRV || process.env.MONGODB_URI || process.env.MONGO_URI);
            console.log('✅ Connected to database\n');
        }
        
        // Fetch settings
        console.log('📊 Fetching guild settings...');
        const settings = await Settings.findOne({ guildID: guildId });
        
        if (!settings) {
            console.log('❌ No settings found for this guild');
            console.log('   The guild may not have been initialized yet.');
            console.log('   Try running any command in the guild first.\n');
            return;
        }
        
        console.log('✅ Settings found\n');
        
        // Check notification channels configuration
        console.log('='.repeat(60));
        console.log('NOTIFICATION CHANNELS CONFIGURATION');
        console.log('='.repeat(60));
        
        if (!settings.notificationChannels) {
            console.log('❌ notificationChannels field is missing');
            console.log('   This means the schema may not be up to date.\n');
            return;
        }
        
        // Check each notification type
        const types = [
            { key: 'welcome', label: '👋 Welcome', emoji: '👋' },
            { key: 'goodbye', label: '👋 Goodbye', emoji: '👋' },
            { key: 'levelUp', label: '📈 Level Up', emoji: '📈' },
            { key: 'birthday', label: '🎂 Birthday', emoji: '🎂' },
            { key: 'dailyReward', label: '🎁 Daily Reward', emoji: '🎁' }
        ];
        
        for (const type of types) {
            console.log(`\n${type.emoji} ${type.label.toUpperCase()}`);
            console.log('-'.repeat(40));
            
            const config = settings.notificationChannels[type.key];
            
            if (!config) {
                console.log('❌ Not configured');
                continue;
            }
            
            console.log(`Status: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}`);
            
            if (config.channelId) {
                console.log(`Channel ID: ${config.channelId}`);
            } else {
                console.log('⚠️  No channel ID set');
            }
            
            if (config.messageType) {
                console.log(`Message Type: ${config.messageType}`);
            }
            
            if (config.thumbnailType) {
                console.log(`Thumbnail Type: ${config.thumbnailType}`);
            }
            
            if (config.showMemberCount !== undefined) {
                console.log(`Show Member Count: ${config.showMemberCount ? 'Yes' : 'No'}`);
            }
            
            if (config.mentions && config.mentions.length > 0) {
                console.log(`Mentions: ${config.mentions.length} configured`);
                config.mentions.forEach((id, index) => {
                    console.log(`  ${index + 1}. ${id}`);
                });
            }
            
            if (config.threadId) {
                console.log(`Thread ID: ${config.threadId}`);
            }
            
            if (config.messageId) {
                console.log(`Message ID: ${config.messageId}`);
            }
        }
        
        // Check old levelup notification system
        console.log('\n' + '='.repeat(60));
        console.log('LEGACY LEVEL UP NOTIFICATIONS');
        console.log('='.repeat(60));
        
        if (settings.levelUpNotifications) {
            console.log(`\nStatus: ${settings.levelUpNotifications.enabled ? '✅ Enabled' : '❌ Disabled'}`);
            if (settings.levelUpNotifications.channelId) {
                console.log(`Channel ID: ${settings.levelUpNotifications.channelId}`);
                console.log('⚠️  This is the OLD system. Consider migrating to the new notification channels system.');
            }
        } else {
            console.log('\n✅ No legacy configuration found');
        }
        
        // Recommendations
        console.log('\n' + '='.repeat(60));
        console.log('RECOMMENDATIONS');
        console.log('='.repeat(60));
        
        const recommendations = [];
        
        // Check if any notifications are enabled
        const anyEnabled = types.some(type => {
            const config = settings.notificationChannels[type.key];
            return config && config.enabled;
        });
        
        if (!anyEnabled) {
            recommendations.push('⚠️  No notifications are currently enabled');
            recommendations.push('   Use /manager-settings to configure notification channels');
        }
        
        // Check for missing channel IDs
        types.forEach(type => {
            const config = settings.notificationChannels[type.key];
            if (config && config.enabled && !config.channelId) {
                recommendations.push(`⚠️  ${type.label} is enabled but has no channel ID`);
                recommendations.push(`   Reconfigure ${type.label} in /manager-settings`);
            }
        });
        
        if (recommendations.length === 0) {
            console.log('\n✅ No issues found! Configuration looks good.');
        } else {
            console.log('');
            recommendations.forEach(rec => console.log(rec));
        }
        
        // Next steps
        console.log('\n' + '='.repeat(60));
        console.log('NEXT STEPS');
        console.log('='.repeat(60));
        console.log('\n1. Verify bot has permissions in notification channels:');
        console.log('   - View Channel');
        console.log('   - Send Messages');
        console.log('   - Embed Links');
        console.log('\n2. Test by having a member join/leave the server');
        console.log('\n3. Check console logs for any errors');
        console.log('\n4. If issues persist, check:');
        console.log('   - Bot is online and connected');
        console.log('   - Event handlers are registered');
        console.log('   - No errors in console during member join/leave');
        
        console.log('\n' + '='.repeat(60));
        console.log('DIAGNOSTIC COMPLETE');
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('\n❌ Error during diagnostic:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Close database connection if we opened it
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

// Run diagnostic if called directly
if (require.main === module) {
    const guildId = process.argv[2];
    
    if (!guildId) {
        console.error('Usage: node utils/diagnose-notifications.js <guildId>');
        process.exit(1);
    }
    
    diagnoseNotifications(guildId).then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { diagnoseNotifications };
