# Notification Channels Schema Documentation

## Overview

This document describes the MongoDB schema extensions for the Unified Notification Channels feature. The schema has been extended to support five types of notification channels: Level Up, Birthday, Welcome, Goodbye, and Daily Reward.

## Schema Structure

### Main Field: `notificationChannels`

The `notificationChannels` field is added to the guild settings schema and contains configuration for all notification types.

```javascript
notificationChannels: {
    levelUp: NotificationChannelConfig,
    birthday: NotificationChannelConfig,
    welcome: NotificationChannelConfig,
    goodbye: NotificationChannelConfig,
    dailyReward: DailyRewardChannelConfig
}
```

### NotificationChannelConfig

Used for: Level Up, Birthday, Welcome, and Goodbye notifications

```javascript
{
    enabled: Boolean,              // Whether this notification type is enabled
    channelId: String,             // Discord channel ID where notifications are sent
    messageType: String,           // 'default' or 'custom'
    customMessage: {               // Only present when messageType is 'custom'
        content: String,           // Text content of the message
        embeds: [{                 // Array of Discord embed objects
            title: String,
            description: String,
            color: Number,         // Decimal color code
            thumbnail: {
                url: String
            },
            image: {
                url: String
            },
            fields: [{
                name: String,
                value: String,
                inline: Boolean
            }],
            footer: {
                text: String,
                iconURL: String
            },
            timestamp: String      // ISO timestamp
        }]
    },
    thumbnailType: String          // 'static' or 'user_specific'
}
```

### DailyRewardChannelConfig

Used for: Daily Reward notifications

```javascript
{
    enabled: Boolean,              // Whether daily reward channel is enabled
    channelId: String,             // Discord channel ID for daily rewards
    messageId: String              // Message ID of the claim button message
}
```

## Field Descriptions

### Common Fields

- **enabled**: Boolean flag indicating whether the notification type is active
  - Default: `false`
  - When `false`, no notifications of this type will be sent

- **channelId**: Discord channel ID (snowflake string)
  - Required when enabled is `true`
  - Must reference a valid, accessible text channel in the guild

### Message Configuration

- **messageType**: Determines which message template to use
  - `'default'`: Use the bot's built-in message template
  - `'custom'`: Use a custom message defined by the admin
  - Default: `'default'`

- **customMessage**: Contains the custom message template
  - Only used when `messageType` is `'custom'`
  - Supports both text content and rich embeds
  - Structure matches Discord.js message format

### Thumbnail Configuration

- **thumbnailType**: Determines how thumbnails are handled in custom messages
  - `'static'`: Use the thumbnail from the custom message template as-is
  - `'user_specific'`: Replace the thumbnail with the relevant user's profile picture
  - Only applicable when using custom messages with embeds

### Daily Reward Specific

- **messageId**: Stores the ID of the message containing the "Claim Reward" button
  - Used to track which message users interact with
  - Required for the daily reward channel to function

## Default Values

When a guild is first created or migrated, all notification channels are initialized with:

```javascript
{
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
}
```

## Usage Examples

### Example 1: Simple Level Up Channel

```javascript
{
    levelUp: {
        enabled: true,
        channelId: '123456789012345678',
        messageType: 'default'
    }
}
```

### Example 2: Custom Birthday Message with User-Specific Thumbnail

```javascript
{
    birthday: {
        enabled: true,
        channelId: '123456789012345678',
        messageType: 'custom',
        customMessage: {
            content: '🎉 Happy Birthday!',
            embeds: [{
                title: 'Birthday Celebration',
                description: 'Wishing you a wonderful day!',
                color: 0xFF69B4,
                thumbnail: {
                    url: 'https://example.com/birthday-cake.png'
                }
            }]
        },
        thumbnailType: 'user_specific'
    }
}
```

### Example 3: Daily Reward Channel

```javascript
{
    dailyReward: {
        enabled: true,
        channelId: '123456789012345678',
        messageId: '987654321098765432'
    }
}
```

## Migration

Existing guild documents need to be migrated to include the `notificationChannels` field. Use the migration script:

```bash
node migrations/add-notification-channels.js
```

See `migrations/README.md` for detailed migration instructions.

## Type Definitions

JSDoc type definitions are available in `schemas/notificationChannelTypes.js`. Import and use them for type safety:

```javascript
/**
 * @typedef {import('./notificationChannelTypes').NotificationChannelConfig} NotificationChannelConfig
 * @typedef {import('./notificationChannelTypes').DailyRewardChannelConfig} DailyRewardChannelConfig
 */
```

## Validation Rules

1. **Channel ID Validation**
   - Must be a valid Discord snowflake (17-19 digit string)
   - Channel must exist in the guild
   - Bot must have permission to send messages in the channel

2. **Message Type Validation**
   - Must be either `'default'` or `'custom'`
   - If `'custom'`, `customMessage` must be provided

3. **Thumbnail Type Validation**
   - Must be either `'static'` or `'user_specific'`
   - Only applicable when using custom messages

4. **Custom Message Validation**
   - Must follow Discord message format
   - Embed color must be a valid decimal color code (0-16777215)
   - URLs must be valid and accessible

## Related Files

- **Schema Definition**: `schemas/settingsSchema.js`
- **Type Definitions**: `schemas/notificationChannelTypes.js`
- **Migration Script**: `migrations/add-notification-channels.js`
- **Migration Documentation**: `migrations/README.md`

## Requirements Mapping

This schema implementation satisfies the following requirements from the specification:

- **Requirement 1.4**: Settings Panel Integration - Data persistence
- **Requirement 8.1**: Data Persistence - MongoDB storage
- **Requirement 8.2**: State Management - Configuration loading
- **Requirement 8.3**: Configuration Removal - Disable functionality
- **Requirement 8.4**: Referential Integrity - Channel ID validation
