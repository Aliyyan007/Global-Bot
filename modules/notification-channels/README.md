# Unified Notification Channels

This module implements a comprehensive notification channel system for Discord bots, allowing server administrators to configure dedicated channels for automated system messages.

## Features

- **Level Up Notifications**: Automated messages when members level up
- **Birthday Announcements**: Celebrate member birthdays automatically
- **Welcome Messages**: Greet new members with custom or default messages
- **Goodbye Messages**: Professional farewell messages when members leave
- **Daily Reward Channel**: Interactive channel with claim buttons and private threads

## Components

### Core Modules

- **settingsSchemaManager.js**: Database persistence for notification configurations
- **languageKeys.js**: Multi-language support (ru, en-US, es-ES, uk)
- **notificationChannelsMenu.js**: Main menu interface for /manager-settings
- **channelConfigHandler.js**: Simple channel configuration (Level Up, Goodbye)
- **messageTemplateHandler.js**: Custom message configuration (Birthday, Welcome)
- **thumbnailProcessor.js**: Thumbnail customization for custom messages
- **dailyRewardManager.js**: Daily reward channel creation and management
- **notificationDispatcher.js**: Sends notifications to configured channels
- **eventIntegration.js**: Integrates with Discord events
- **defaultTemplates.js**: Professional default message templates

### Integration Files

- **interactions/notification-channels-handler.js**: Handles all button/menu interactions
- **events/interactionCreate.js**: Routes notification channel interactions
- **slash-commands/manager-settings.js**: Adds notification channels to settings menu

## Usage

### For Administrators

1. Use `/manager-settings` command
2. Select "Level Up, Greet, Birthday, Daily Reward… Channel" from the menu
3. Choose the notification type to configure
4. Follow the prompts to enable/disable and configure channels

### Configuration Options

**Level Up & Goodbye**: Simple enable/disable with channel selection

**Birthday & Welcome**: 
- Default message with channel selection
- Custom message with Discord message link
- Static or user-specific thumbnail options

**Daily Reward**:
- Automatic channel creation
- Interactive claim button
- Private threads for each user

## Multi-Language Support

All UI text, button labels, and messages support:
- Russian (ru)
- English (en-US)
- Spanish (es-ES)
- Ukrainian (uk)

## Database Schema

Configurations are stored in the MongoDB settings schema under `notificationChannels`:

```javascript
{
  notificationChannels: {
    levelUp: {
      enabled: Boolean,
      channelId: String,
      messageType: 'default' | 'custom'
    },
    birthday: {
      enabled: Boolean,
      channelId: String,
      messageType: 'default' | 'custom',
      customMessage: Object,
      thumbnailType: 'static' | 'user_specific'
    },
    welcome: { /* same as birthday */ },
    goodbye: { /* same as levelUp */ },
    dailyReward: {
      enabled: Boolean,
      channelId: String,
      messageId: String
    }
  }
}
```

## Event Integration

The module integrates with existing Discord events:

- **guildMemberAdd**: Triggers welcome notifications
- **guildMemberRemove**: Triggers goodbye notifications
- **Level Up Events**: Triggers level-up notifications (from existing leveling system)
- **Birthday Scheduler**: Triggers birthday notifications (from existing birthday system)

## Error Handling

All components include comprehensive error handling:
- Invalid channel validation
- Missing permissions detection
- Database connection failures
- Message link validation
- Deleted channel handling

## Testing

The module includes:
- Property-based tests for correctness properties
- Unit tests for specific scenarios and error cases
- Integration tests for complete workflows

Run tests with:
```bash
npm test -- tests/notification-channels-*.test.js
```

## Development

### Adding New Notification Types

1. Add configuration to `settingsSchemaManager.js`
2. Create handler in appropriate module
3. Add menu option to `notificationChannelsMenu.js`
4. Add dispatcher function to `notificationDispatcher.js`
5. Add event integration to `eventIntegration.js`
6. Add language keys to `languageKeys.js`
7. Add translations to `config/lang.json`

### Custom ID Format

All interaction custom IDs follow the pattern: `notif_{action}_{type}`

Examples:
- `notif_setup_levelup`
- `notif_enable_birthday`
- `notif_channel_welcome`
- `notif_claim_daily`

## License

Part of the Global Bot (Kiro) project.
