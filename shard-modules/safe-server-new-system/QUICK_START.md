# Safe Server - Quick Start Guide

## Installation (5 Minutes)

### Step 1: Copy Files

Copy all files from `safe-server-new-system/` to your bot:

```bash
# Schema
copy safe-server-new-system\safeServerSchema.js schemas\

# Command
copy safe-server-new-system\safe-server.js slash-commands\

# Interactions
copy safe-server-new-system\safe-server-panel-new.js interactions\
copy safe-server-new-system\safe-server-modals.js interactions\

# Handlers
copy safe-server-new-system\safeServerActionTracker.js handler\
copy safe-server-new-system\safeServerRestrictionManager.js handler\
copy safe-server-new-system\auditLogMonitor.js handler\
copy safe-server-new-system\voiceStateMonitor.js handler\
copy safe-server-new-system\messageMonitor.js handler\
copy safe-server-new-system\botProtectionHandler.js handler\
copy safe-server-new-system\initializeSafeServer.js handler\
```

### Step 2: Initialize in Your Bot

In your main file (`index.js` or `shard.js`), add this after client creation:

```javascript
// At the top of your file
const { initializeSafeServer, handleSafeServerInteraction } = require('./handler/initializeSafeServer')

// After client.login() or when bot is ready
client.once('ready', () => {
    console.log('Bot is ready!')
    
    // Initialize Safe Server
    initializeSafeServer(client)
})
```

### Step 3: Update Interaction Handler

In your `events/interactionCreate.js` file, add:

```javascript
// Inside your interactionCreate event handler
client.on('interactionCreate', async (interaction) => {
    // ... your existing code ...

    // Handle Safe Server interactions
    const handled = await handleSafeServerInteraction(client, interaction)
    if (handled) return

    // ... rest of your interaction handling ...
})
```

### Step 4: Restart Bot

```bash
node index.js
# or
node shard.js
```

## First Time Setup (2 Minutes)

### 1. Enable Moderation System
```
/moderation-system
```
Enable the moderation system first (required).

### 2. Open Safe Server
```
/safe-server
```

### 3. Set Log Channel
Click "Edit Log Channel" button and select a channel.

### 4. Set Manager Roles
Click "Edit Manager Roles" button and select at least one role.

### 5. Enable System
Click "Enable Safe Server" button.

## Configure Permissions (1 Minute Each)

### Example: Configure Ban Members

1. Select "Ban Members" from the dropdown
2. Click "Enable/Disable" button to toggle it on
3. Select "Edit Cooldown" from settings menu
4. Choose "1 Day" (or any duration)
5. Select "Edit No. of Actions"
6. Enter "3" (allows 3 bans)
7. Select "Edit Time between Actions"
8. Choose "6 Hours" (3 bans within 6 hours triggers restriction)
9. Select "Edit Restriction Type"
10. Choose "Global Restriction" (recommended)

Done! Repeat for other permissions as needed.

## Test It

### Test Ban Restriction

1. Have a moderator ban 4 members quickly
2. After the 4th ban, they should be restricted
3. Check log channel for notification
4. Verify restricted role was created
5. Wait for cooldown to expire
6. Verify restoration

### Test Bot Protection

1. Enable bot protection
2. Add a bot with dangerous permissions
3. Check log channel for quarantine notification
4. Click "Approve Bot" or "Kick Bot"

## Default Settings

All permissions start with these defaults:
- **Cooldown**: 24 hours
- **Action Count**: 3
- **Time Between Actions**: 6 hours
- **Restriction Type**: Global
- **Status**: Enabled

## Common Use Cases

### Prevent Server Nuking
```
Ban Members: 3 actions in 6h, 24h cooldown
Kick Members: 5 actions in 6h, 24h cooldown
Delete Channel: 3 actions in 6h, 24h cooldown
Delete Role: 3 actions in 6h, 24h cooldown
```

### Prevent Spam
```
@everyone/@here Spam: 3 actions in 1h, 12h cooldown
Delete Messages: 10 actions in 5min, 1h cooldown
```

### Prevent Bot Abuse
```
Adding Mass Bots: 2 actions in 1h, 24h cooldown
Bot Protection: Enabled
```

### Voice Channel Protection
```
Disconnecting Members: 5 actions in 10min, 6h cooldown
Moving Members: 10 actions in 10min, 6h cooldown
Muting Members: 10 actions in 10min, 6h cooldown
```

## Approval Mode

For sensitive permissions, use "Owner/Admin Approval":

1. Select permission
2. Edit Cooldown → "Owner/Admin Approval"
3. When limit is exceeded, managers must approve restoration
4. Notification sent to log channel with Approve/Reject buttons

## Specific Restrictions

To restrict only certain roles/members:

1. Select permission
2. Edit Restriction Type → "Specific Role/Member"
3. Select roles (optional)
4. Select users (optional)
5. Only selected entities will be restricted

## Troubleshooting

### "Please enable moderation system first"
- Run `/moderation-system` and enable it

### "Please set a log channel first"
- Click "Edit Log Channel" and select a channel

### "Please select at least one manager role"
- Click "Edit Manager Roles" and select roles

### Restrictions not working
- Check bot has "Manage Roles" permission
- Verify bot's role is above target roles
- Check console for errors

### Bot protection not working
- Verify bot protection is enabled
- Check bot has "Manage Roles" permission
- Ensure log channel is set

## Tips

1. **Start with Global Restrictions** - Easier to manage
2. **Use Reasonable Limits** - Don't set too strict
3. **Test First** - Try with one permission before configuring all
4. **Monitor Log Channel** - Watch for false positives
5. **Adjust as Needed** - Fine-tune based on your server's needs

## Support

If you need help:
1. Check console logs for errors
2. Verify all files are copied correctly
3. Ensure initialization code is added
4. Test with a simple permission first
5. Check the full README.md for detailed troubleshooting

## What's Next?

- Configure all 12 permissions
- Set up bot protection
- Test with your moderators
- Adjust limits based on usage
- Monitor and refine

Enjoy your protected server! 🛡️
