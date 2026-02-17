/**
 * Migration script to add notificationChannels field to existing guild settings
 * 
 * This script adds the new notificationChannels field to all existing guild documents
 * in the settings collection. The field is initialized with default values (all disabled).
 * 
 * Usage: node migrations/add-notification-channels.js
 */

const mongoose = require('mongoose');
const Settings = require('../schemas/settingsSchema');

/**
 * Default notification channels configuration
 */
const defaultNotificationChannels = {
    levelUp: {
        enabled: false,
        messageType: 'default'
    },
    birthday: {
        enabled: false,
        messageType: 'default'
    },
    welcome: {
        enabled: false,
        messageType: 'default'
    },
    goodbye: {
        enabled: false,
        messageType: 'default'
    },
    dailyReward: {
        enabled: false
    }
};

/**
 * Run the migration
 */
async function migrate() {
    try {
        console.log('Starting migration: Adding notificationChannels field...');

        // Check if MongoDB connection string is available
        if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
            throw new Error('MongoDB connection string not found in environment variables');
        }

        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

        // Connect to MongoDB
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Find all guild settings that don't have the notificationChannels field
        const guildsToUpdate = await Settings.find({
            notificationChannels: { $exists: false }
        });

        console.log(`Found ${guildsToUpdate.length} guilds to update`);

        if (guildsToUpdate.length === 0) {
            console.log('No guilds need migration. All guilds already have notificationChannels field.');
            await mongoose.connection.close();
            return;
        }

        // Update each guild with the default notificationChannels configuration
        let successCount = 0;
        let errorCount = 0;

        for (const guild of guildsToUpdate) {
            try {
                await Settings.updateOne(
                    { _id: guild._id },
                    { $set: { notificationChannels: defaultNotificationChannels } }
                );
                successCount++;
                console.log(`✓ Updated guild ${guild.guildID}`);
            } catch (error) {
                errorCount++;
                console.error(`✗ Failed to update guild ${guild.guildID}:`, error.message);
            }
        }

        console.log('\nMigration completed:');
        console.log(`  Success: ${successCount} guilds`);
        console.log(`  Errors: ${errorCount} guilds`);

        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    migrate()
        .then(() => {
            console.log('Migration script finished successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrate, defaultNotificationChannels };
