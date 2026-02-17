# Safe Server - New Comprehensive Implementation Guide

## Overview
This document outlines the complete implementation of the new Safe Server system with granular permission control, dynamic role creation, and comprehensive audit log monitoring.

## Key Features

### 1. Control Panel Format
- **Description**: "Safe Server Settings" (not as title)
- **Permissions List**: Shows all 12 permissions with their settings
- **Each Permission Shows**:
  - Status (✅ enabled / ❌ disabled)
  - Cooldown duration
  - Number of actions allowed
  - Restriction type (Global/Specific)
  - Time between actions

### 2. Monitored Permissions
1. Ban Members
2. Kick Members
3. Timeout Members
4. Delete Role
5. Delete Channel (VC, Stage, Text)
6. Delete Messages
7. Change Nickname
8. Adding Mass Bots
9. Disconnecting Members from VC
10. Moving Members from VC
11. Muting Members from VC
12. @everyone / @here Spam

### 3. Control Panel Components

#### Select Menu 1: Permission Selection
- Lists all 12 permissions
- When selected, shows Enable/Disable button
- Enables Select Menu 2

#### Select Menu 2: Settings (appears after permission selection)
Options:
- Edit Cooldown
- Edit No. of Actions
- Edit Restriction Type
- Edit Time between Actions

#### Buttons:
1. **Enable/Disable Safe Server**
   - Checks moderation system is enabled
   - Requires log channel to be set
   - Requires at least one manager role
   
2. **Enable/Disable Bot Protection**
   - Monitors bot additions
   - Detects permission grants to bots
   - Sends approval requests to log channel

3. **Edit Log Channel**
   - Channel select menu
   - Where all notifications are sent

4. **Edit Manager Roles**
   - Multi-select role menu
   - Minimum 1 role required
   - Remove role button available

### 4. Cooldown Options
Preset durations:
- 6h
- 12h
- 1 day
- 7 days
- 30 days
- Owner/Admin Approval (sends approval request)
- Custom (modal with format: 3days, 3day, 3 day, 3 days)

Variables supported: min, h, days, months, year (max 1 year)

### 5. Action Count
- Modal input
- Range: 1-99
- Number of actions allowed within time window

### 6. Time Between Actions
- Same options as Cooldown (except Owner/Admin Approval)
- Defines the window for counting actions
- After this time, action count resets

### 7. Restriction Types

#### Global Restriction (Default - RECOMMENDED)
- Applies to all server moderators
- No exceptions

#### Specific Role/Member
- Select specific roles and/or members
- Only applies restrictions to selected entities
- Uses same UI as VC "Upcoming users/roles" system
- Reset button to return to Global

## Implementation Files

### 1. Schema Updates (`schemas/safeServerSchema.js`)
```javascript
{
  guildID: String,
  enabled: Boolean,
  logChannelId: String,
  managerRoles: [String],
  botProtection: { enabled: Boolean },
  
  permissions: {
    banMembers: {
      enabled: Boolean,
      cooldown: Number (seconds),
      actionCount: Number,
      timeBetweenActions: Number (seconds),
      restrictionType: 'global' | 'specific',
      specificRoles: [String],
      specificUsers: [String]
    },
    // ... repeat for all 12 permissions
  },
  
  activeRestrictions: [{
    userId: String,
    originalRoleId: String,
    restrictedRoleId: String,
    restrictedPermissions: [String],
    restrictedAt: Date,
    expiresAt: Date,
    approvalPending: Boolean,
    approvalMessageId: String
  }],
  
  quarantinedBots: [{
    botId: String,
    addedBy: String,
    addedAt: Date,
    removedPermissions: [String],
    approvalMessageId: String
  }]
}
```

### 2. Command File (`slash-commands/safe-server.js`)
- Builds control panel embed
- Shows all permissions with current settings
- Creates select menus and buttons
- Handles initial display

### 3. Interaction Handler (`interactions/safe-server-panel-new.js`)
Handles:
- Permission selection
- Settings menu interactions
- Toggle buttons
- Cooldown selection
- Action count modals
- Time between actions
- Restriction type selection
- Channel/Role selects

### 4. Audit Log Monitor (`events/safeServer/auditLogMonitor.js`)
Monitors:
- Member bans (MEMBER_BAN_ADD)
- Member kicks (MEMBER_KICK)
- Member timeouts (MEMBER_UPDATE)
- Role deletions (ROLE_DELETE)
- Channel deletions (CHANNEL_DELETE)
- Message bulk deletions (MESSAGE_BULK_DELETE)
- Member nickname changes (MEMBER_UPDATE)
- Bot additions (BOT_ADD)
- Voice state updates (VOICE_STATE_UPDATE)
- @everyone/@here mentions (MESSAGE_CREATE)

### 5. Restriction Manager (`handler/safeServerRestrictionManager.js`)
Functions:
- `trackAction(guildId, userId, actionType)` - Records action
- `checkLimit(guildId, userId, actionType)` - Checks if limit exceeded
- `applyRestriction(guild, member, permission)` - Creates restricted role
- `removeRestriction(guild, member, permission)` - Restores original role
- `scheduleRestoration(guildId, userId, permission, duration)` - Auto-restore

### 6. Role Manager (`handler/safeServerRoleManager.js`)
Functions:
- `createRestrictedRole(guild, originalRole, restrictedPermission)` - Creates role with ⏱ emoji
- `getOrCreateRestrictedRole(guild, member, permissions)` - Gets existing or creates new
- `cleanupRestrictedRoles(guild)` - Removes unused restricted roles
- `updateRestrictedRole(guild, restrictedRole, permissions)` - Updates role permissions

### 7. Bot Protection Handler (`handler/safeServerBotProtection.js`)
Functions:
- `monitorBotAddition(guild, bot, addedBy)` - Checks bot permissions
- `monitorPermissionGrant(guild, bot, permission, grantedBy)` - Detects perm grants
- `sendApprovalRequest(guild, bot, permissions, requestedBy)` - Sends to log channel
- `handleApproval(guild, bot, permissions)` - Grants permissions
- `handleRejection(guild, bot)` - Removes permissions

### 8. Notification System (`handler/safeServerNotifications.js`)
Sends notifications for:
- Moderator restrictions
- Restriction expirations
- Bot quarantines
- Permission approval requests
- Action limit warnings

## Role Creation System

### Dynamic Restricted Roles
When a moderator reaches the action limit:

1. **Find Original Role**: Identify the role granting the dangerous permission
2. **Create Restricted Role**: 
   - Name: `@OriginalRoleName ⏱`
   - Position: Just below original role
   - Permissions: Same as original EXCEPT the restricted permission(s)
   - Color: Same as original
   - Settings: Same as original (mentionable, hoisted, etc.)

3. **Apply Restriction**:
   - Remove original role
   - Add restricted role
   - Store mapping in database

4. **Multiple Restrictions**:
   - If user already has restrictions, update existing restricted role
   - Remove additional permissions from the restricted role
   - Track all restricted permissions

5. **Restoration**:
   - After cooldown expires, remove restricted role
   - Restore original role
   - Delete restricted role if no longer needed

### Role Naming Convention
- Single restriction: `@Moderator ⏱`
- Multiple restrictions: `@Moderator ⏱ (2)`, `@Moderator ⏱ (3)`, etc.

## Audit Log Monitoring

### Efficient Reading
```javascript
// Fetch recent audit logs
const logs = await guild.fetchAuditLogs({
  limit: 10,
  type: AuditLogEvent.MemberBanAdd
})

// Process each entry
for (const entry of logs.entries.values()) {
  const { executor, target, createdTimestamp } = entry
  
  // Track action
  await trackAction(guild.id, executor.id, 'ban')
  
  // Check if limit exceeded
  const exceeded = await checkLimit(guild.id, executor.id, 'ban')
  
  if (exceeded) {
    await applyRestriction(guild, executor, 'banMembers')
  }
}
```

### Action Tracking
Store actions in memory with timestamps:
```javascript
{
  guildId: {
    userId: {
      actionType: [
        { timestamp: Date, targetId: String },
        { timestamp: Date, targetId: String }
      ]
    }
  }
}
```

Clean up old entries after `timeBetweenActions` expires.

## Bot Protection System

### Detection Points

1. **Bot Addition** (`guildMemberAdd` event)
   - Check if member is a bot
   - Check bot's permissions
   - If has dangerous permissions, send approval request

2. **Permission Grant** (`roleUpdate` event)
   - Monitor role permission changes
   - If dangerous permission added to role with bots, send approval request

3. **Role Assignment** (`guildMemberUpdate` event)
   - Monitor role additions to bots
   - If role has dangerous permissions, send approval request

### Approval Flow
1. Detect dangerous permission on bot
2. Immediately remove the permission
3. Send message to log channel with:
   - Bot information
   - Permissions detected
   - Who added/granted
   - Approve/Reject buttons
4. On Approve: Grant permissions back
5. On Reject: Keep permissions removed

## Testing Checklist

- [ ] Enable system (checks moderation system)
- [ ] Set log channel
- [ ] Set manager roles (minimum 1)
- [ ] Select each permission
- [ ] Toggle permission on/off
- [ ] Edit cooldown (all options)
- [ ] Edit action count
- [ ] Edit time between actions
- [ ] Edit restriction type (global/specific)
- [ ] Test restriction application
- [ ] Test role creation
- [ ] Test multiple restrictions
- [ ] Test restoration after cooldown
- [ ] Test bot protection
- [ ] Test approval system
- [ ] Test notifications

## Next Steps

1. Complete interaction handler implementation
2. Create audit log monitor events
3. Implement restriction manager
4. Implement role manager
5. Implement bot protection
6. Create notification system
7. Test all features
8. Document for users

## Notes

- All durations stored in seconds
- Restricted roles created dynamically
- Audit logs checked every 30 seconds
- Action tracking uses in-memory cache with Redis backup
- Manager roles can approve restrictions via log channel
- Global restriction is RECOMMENDED for security
