# Database Migrations

This directory contains database migration scripts for the Discord bot.

## Available Migrations

### add-notification-channels.js

**Purpose:** Adds the `notificationChannels` field to existing guild settings documents.

**What it does:**
- Adds a new `notificationChannels` object to all guild settings that don't have it
- Initializes all notification types (levelUp, birthday, welcome, goodbye, dailyReward) as disabled
- Sets default message types to 'default'

**When to run:**
- After deploying the unified notification channels feature
- Before using any notification channel configuration commands

**How to run:**

```bash
# Set your MongoDB connection string
export MONGODB_URI="your_mongodb_connection_string"

# Run the migration
node migrations/add-notification-channels.js
```

**Environment Variables:**
- `MONGODB_URI` or `MONGO_URI` - MongoDB connection string (required)

**Output:**
The script will display:
- Number of guilds found that need migration
- Progress for each guild update
- Summary of successful and failed updates

**Safety:**
- The script only updates guilds that don't have the `notificationChannels` field
- Existing data is not modified
- The migration is idempotent (safe to run multiple times)

## Creating New Migrations

When creating a new migration script:

1. Create a new file in this directory with a descriptive name
2. Include clear documentation at the top of the file
3. Add error handling and logging
4. Make the migration idempotent when possible
5. Update this README with migration details
6. Test the migration on a development database first
