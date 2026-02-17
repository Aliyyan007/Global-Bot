# Safe Server - New System Integration Guide

This folder contains the complete implementation of the new Safe Server system with granular permission control.

## Files Overview

### Core Files
1. **safeServerSchema.js** - Database schema (replace existing in `schemas/`)
2. **safe-server.js** - Slash command (replace existing in `slash-commands/`)
3. **safe-server-panel-new.js** - Main interaction handler (add to `interactions/`)
4. **safe-server-modals.js** - Modal handlers (add to `interactions/`)

### Manager Classes
5. **safeServerActionTracker.js** - Tracks moderator actions (add to `handler/`)
6. **safeServerRestrictionManager.js** - Applies/removes restrictions (add to `handler/`)

### Monitors
7. **auditLogMonitor.js** - Monitors audit logs (add to `handler/`)
8. **voiceStateMonitor.js** - Monitors voice actions (add to `handler/`)
9. **messageMonitor.js** - Monitors @everyone/@here (add to `handler/`)
10. **botProtectionHandler.js** - Bot protection system (add to `handler/`)

## Integration Steps

### Step 1: Replace Existing Files

```bash
# Backup old files first
copy schemas\safeServerSchema.js schemas\safeServerSchema.js.backup
copy slash-commands\safe-server.js slash-commands\safe-server.js.backup

# Replace with new files
copy safe-server-new-system\safeServerSchema.js schemas\
copy safe-server-new-system\safe-server.js slash-commands\
```

### Step 2: Add New Files

```bash
# Add interaction handlers
copy safe-server-new-system\safe-server-panel-new.js interactions\
copy safe-server-new-system\safe-server-modals.js interactions\

# Add manager classes
copy safe-server-new-system\safeServerActionTracker.js handler\
copy safe-server-new-system\safeServerRestrictionManager.js handler\
copy safe-server-new-system\auditLogMonitor.js handler\
copy safe-server-new-system\voiceStateMonitor.js handler\
copy safe-server-new-system\messageMonitor.js handler\
copy safe-server-new-system\botProtectionHandler.js handler\
```

### Step 3: Initialize in Main Bot File (index.js or shard.js)

Add this code after your client is created:

```javascript
// Import classes
const SafeServerActionTracker = require('./handler/safeServerActionTracker')
const SafeServerRestrictionManager = require('./handler/safeServerRestrictionManager')
const AuditLogMonitor = require('./handler/auditLogMonitor')
const VoiceStateMonitor = require('./handler/voiceStateMonitor')
const MessageMonitor = require('./handler/messageMonitor')
const BotProtectionHandler = require('./handler/botProtectionHandler')

// Initialize Safe Server systems
client.safeServerTracker = new SafeServerActionTracker()
client.safeServerRestrictionManager = new SafeServerRestrictionManager(client)
client.safeServerAuditMonitor = new AuditLogMonitor(client)
client.safeServerVoiceMonitor = new VoiceStateMonitor(client)
client.safeServerMessageMonitor = new MessageMonitor(client)
client.safeServerBotProtection = new BotProtectionHandler(client)

console.log('[Safe Server] All systems initialized')
```

### Step 4: Add Event Listeners

Add these event listeners in your main file or event handler:

```javascript
// Voice State Updates
client.on('voiceStateUpdate', (oldState, newState) => {
    if (client.safeServerVoiceMonitor) {
        client.safeServerVoiceMonitor.handleVoiceStateUpdate(oldState, newState)
            .catch(console.error)
    }
})

// Message Create (for @everyone/@here monitoring)
client.on('messageCreate', (message) => {
    if (client.safeServerMessageMonitor) {
        client.safeServerMessageMonitor.handleMessage(message)
            .catch(console.error)
    }
})

// Role Updates (for bot protection)
client.on('roleUpdate', (oldRole, newRole) => {
    if (client.safeServerBotProtection) {
        client.safeServerBotProtection.checkRoleUpdate(oldRole, newRole)
            .catch(console.error)
    }
})

// Member Updates (for bot protection)
client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (client.safeServerBotProtection) {
        client.safeServerBotProtection.checkMemberUpdate(oldMember, newMember)
            .catch(console.error)
    }
})
```

### Step 5: Update Interaction Handler

In your main interaction handler (usually `events/interactionCreate.js`), add:

```javascript
// Handle Safe Server interactions
if (interaction.customId?.startsWith('ss_')) {
    // Panel interactions
    if (interaction.isStringSelectMenu() || interaction.isButton() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
        const panelHandler = require('../interactions/safe-server-panel-new')
        return await panelHandler.execute(client, interaction)
    }
    
    // Modal interactions
    if (interaction.isModalSubmit()) {
        const modalHandler = require('../interactions/safe-server-modals')
        return await modalHandler.execute(client, interaction)
    }
}
```

### Step 6: Database Migration (Optional)

If you have existing Safe Server data, you may need to migrate it. The new schema is significantly different, so consider:

1. Backing up existing data
2. Clearing old restrictions
3. Letting users reconfigure

Or create a migration script to convert old data to new format.

## Testing Checklist

After integration, test these features:

### Basic Setup
- [ ] Run `/safe-server` command
- [ ] Try to enable (should require moderation system)
- [ ] Set log channel
- [ ] Set manager roles (minimum 1)
- [ ] Enable the system

### Permission Configuration
- [ ] Select each of the 12 permissions
- [ ] Toggle permission on/off
- [ ] Edit cooldown (test all options)
- [ ] Edit action count
- [ ] Edit time between actions
- [ ] Edit restriction type (global/specific)

### Restriction Testing
- [ ] Perform actions to trigger limits
- [ ] Verify restricted role is created
- [ ] Verify original role is removed
- [ ] Verify notification sent to log channel
- [ ] Wait for cooldown to expire
- [ ] Verify restoration works

### Bot Protection
- [ ] Enable bot protection
- [ ] Add a bot with dangerous permissions
- [ ] Verify quarantine notification
- [ ] Test approve/reject buttons

### Voice Actions
- [ ] Disconnect members from VC
- [ ] Move members between VCs
- [ ] Mute members in VC
- [ ] Verify tracking and restrictions

### Message Monitoring
- [ ] Send @everyone mentions
- [ ] Verify tracking
- [ ] Verify restriction after limit

## Troubleshooting

### "Safe Server not enabled" errors
- Check that moderation system is enabled first
- Verify log channel is set
- Verify at least one manager role is set

### Restrictions not applying
- Check bot has Manage Roles permission
- Verify bot's role is higher than target role
- Check console for error messages

### Audit log not detecting actions
- Verify bot has View Audit Log permission
- Check that actions are recent (within 10 seconds)
- Ensure audit log monitor is initialized

### Role creation fails
- Check bot has Manage Roles permission
- Verify bot's role position
- Check role name length (max 100 characters)

## Performance Notes

- Audit logs are checked every 10 seconds
- Action tracking uses in-memory cache (fast)
- Old actions are cleaned up every 5 minutes
- Restricted roles are deleted when no longer needed

## Security Considerations

- Manager roles bypass all restrictions
- Administrator permission is always removed from restricted roles
- Bot protection monitors role updates in real-time
- All actions are logged to the log channel

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify all files are in correct locations
3. Ensure all event listeners are registered
4. Test with a simple permission first (like Ban Members)
5. Check database connection

## Future Enhancements

Possible additions:
- Web dashboard for configuration
- Advanced analytics and reports
- Custom action limits per role
- Temporary whitelist system
- Action history viewer
- Export/import configurations
