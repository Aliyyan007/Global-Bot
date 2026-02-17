# Safe-Server Anti-Abuse System Documentation

## Overview

Safe-Server is a production-grade anti-abuse and anti-nuke protection system designed to protect Discord servers from malicious or compromised moderators and administrators. The system operates independently of command execution, relying entirely on Discord events and audit logs to detect and prevent abuse.

## Core Architecture

### 1. Event-Driven Detection
The system monitors Discord events and cross-references them with audit logs to identify the executor of each action. This approach ensures detection regardless of how actions are performed:
- Slash commands
- Prefix commands (from any bot)
- Discord's built-in moderation tools
- Manual UI actions

### 2. Components

#### **SafeServerTracker** (`handler/safeServerTracker.js`)
- In-memory action tracking with Redis persistence fallback
- Sliding window rate limiting algorithm
- Automatic timestamp cleanup
- Whitelist checking

#### **SafeServerManager** (`handler/safeServerManager.js`)
- Role-based permission profile system
- Moderator restriction and restoration
- Bot quarantine management
- Notification system

#### **Event Handlers** (`events/safeServer/`)
- `guildBanAdd.js` - Ban detection
- `guildMemberRemove.js` - Kick detection
- `guildMemberUpdate.js` - Timeout detection & anti-bypass
- `channelDelete.js` - Channel deletion detection
- `channelCreate.js` - Channel creation spam detection
- `roleDelete.js` - Role deletion detection
- `roleUpdate.js` - Dangerous permission grants & role manipulation
- `guildMemberAdd.js` - Bot addition detection & quarantine
- `emojiDelete.js` - Emoji deletion detection

#### **Database Schema** (`schemas/safeServerSchema.js`)
- Per-guild configuration storage
- Action limits and durations
- Whitelist management
- Active restrictions tracking
- Quarantined bots registry

## Event → Audit Log Mapping

| Abuse Type | Discord Event | Audit Log Event | Detection Window |
|------------|---------------|-----------------|------------------|
| Ban | `GuildBanAdd` | `MemberBanAdd` | 5 seconds |
| Kick | `GuildMemberRemove` | `MemberKick` | 5 seconds |
| Timeout | `GuildMemberUpdate` | `MemberUpdate` | 5 seconds |
| Channel Delete | `ChannelDelete` | `ChannelDelete` | 5 seconds |
| Channel Create | `ChannelCreate` | `ChannelCreate` | 5 seconds |
| Role Delete | `GuildRoleDelete` | `RoleDelete` | 5 seconds |
| Role Update | `GuildRoleUpdate` | `RoleUpdate` | 5 seconds |
| Bot Add | `GuildMemberAdd` | `BotAdd` | 10 seconds |
| Emoji Delete | `GuildEmojiDelete` | `EmojiDelete` | 5 seconds |

## Permission Profile System

### Managed Roles

Safe-Server creates and manages four roles:

1. **SS-Admin** (Red, 0xE74C3C)
   - ManageGuild, ManageRoles, ManageChannels
   - KickMembers, BanMembers, ModerateMembers
   - ManageMessages, ViewAuditLog

2. **SS-Moderator** (Blue, 0x3498DB)
   - KickMembers, ModerateMembers
   - ManageMessages, ViewAuditLog

3. **SS-Mod-Restricted** (Gray, 0x95A5A6)
   - ModerateMembers (timeout only)
   - ViewAuditLog
   - Cannot ban, kick, or perform destructive actions

4. **SS-Bot-Quarantine** (Orange, 0xE67E22)
   - No permissions
   - Applied to newly added bots pending approval

### Role Swap Mechanism

When a moderator exceeds action limits:

1. **Capture State**: Save their current SS roles
2. **Remove Privileges**: Remove SS-Admin and/or SS-Moderator roles
3. **Apply Restriction**: Add SS-Mod-Restricted role
4. **Schedule Restoration**: Set automatic restoration timer
5. **Notify**: Alert server owner and log channel

After cooldown expires:
1. **Remove Restriction**: Remove SS-Mod-Restricted role
2. **Restore Roles**: Re-apply original SS roles
3. **Clear History**: Reset action tracking for the user
4. **Notify**: Confirm restoration in log channel

## Rate Limiting Logic

### Sliding Window Algorithm

```javascript
// Example: Ban limit = 3 bans per 600 seconds (10 minutes)
const now = Date.now()
const cutoff = now - (600 * 1000)

// Get all ban timestamps for this moderator
const timestamps = [t1, t2, t3, t4, ...]

// Filter to only recent actions within the window
const recentActions = timestamps.filter(ts => ts > cutoff)

// Check if limit exceeded
if (recentActions.length >= 3) {
    // RESTRICT MODERATOR
}
```

### Default Limits

| Action | Count | Duration | Rationale |
|--------|-------|----------|-----------|
| Ban | 3 | 10 min | Bans are severe; 3 is reasonable for legitimate use |
| Kick | 5 | 5 min | Less severe than bans; slightly higher limit |
| Timeout | 10 | 5 min | Common moderation action; higher limit |
| Channel Delete | 3 | 10 min | Destructive; low limit |
| Channel Create | 5 | 5 min | Spam prevention |
| Role Delete | 2 | 10 min | Very destructive; very low limit |
| Role Update | 5 | 5 min | Dangerous permission grants |
| Bot Add | 1 | 1 hour | Bots can be malicious; strict limit |
| Emoji Delete | 5 | 10 min | Asset protection |
| Sticker Delete | 5 | 10 min | Asset protection |

## Bot Protection System

### Quarantine Process

1. **Detection**: Bot joins server via `GuildMemberAdd` event
2. **Audit Log Check**: Identify who added the bot via `BotAdd` audit log
3. **Whitelist Check**: Skip quarantine if added by owner or whitelisted user
4. **Quarantine**: 
   - Remove all roles from bot
   - Apply SS-Bot-Quarantine role
   - Add to quarantined bots registry
5. **Notification**: Alert server owner with approval instructions
6. **Approval**: Owner uses `/safe-server approve-bot` to release

### Auto-Approval Bypass

Bots added by:
- Server owner
- Whitelisted users
- Whitelisted roles

...are NOT quarantined.

## Anti-Bypass Protection

### Monitored Bypass Attempts

1. **SS Role Removal**
   - Detects unauthorized removal of SS roles during active restriction
   - Automatically restores removed roles
   - Logs bypass attempt

2. **Restricted Role Removal**
   - Detects premature removal of SS-Mod-Restricted role
   - Re-applies restricted role
   - Logs bypass attempt

3. **SS Role Modification**
   - Detects permission changes to SS roles
   - Logs modification for owner review

### Implementation

Uses `GuildMemberUpdate` and `GuildRoleUpdate` events with audit log verification to detect and revert unauthorized changes.

## Configuration Commands

### `/safe-server status`
View current configuration and system status.

### `/safe-server initialize`
Create managed roles (SS-Admin, SS-Moderator, SS-Mod-Restricted, SS-Bot-Quarantine).

### `/safe-server enable`
Enable Safe-Server protection.

### `/safe-server disable`
Disable Safe-Server protection.

### `/safe-server set-log-channel <channel>`
Set the channel for Safe-Server notifications.

### `/safe-server set-limit <action> <count> <duration>`
Configure action limits.

**Example**: `/safe-server set-limit action:ban count:5 duration:600`
- Allows 5 bans per 10 minutes

### `/safe-server whitelist-add <user|role>`
Add a user or role to the whitelist (bypasses all limits).

### `/safe-server whitelist-remove <user|role>`
Remove a user or role from the whitelist.

### `/safe-server whitelist-list`
View current whitelist.

### `/safe-server set-cooldown <duration>`
Set restriction cooldown duration in seconds (60-86400).

### `/safe-server set-method <method>`
Set restriction method:
- `role_swap`: Use permission profile system (recommended)
- `timeout`: Use Discord timeout feature

### `/safe-server bot-protection <enabled> [require-approval]`
Configure bot protection settings.

### `/safe-server approve-bot <bot>`
Approve a quarantined bot.

### `/safe-server active-restrictions`
View currently restricted moderators.

### `/safe-server restore-moderator <user>`
Manually restore a restricted moderator before cooldown expires.

## Notification System

### Log Channel Embeds

**Restriction Notification** (Red, 0xE74C3C)
- Moderator details
- Action type and limit exceeded
- Restriction method
- Expiration timestamp

**Restoration Notification** (Green, 0x2ECC71)
- Moderator details
- Confirmation of restoration

**Bot Quarantine Notification** (Orange, 0xE67E22)
- Bot details
- Who added the bot
- Approval instructions

**Bypass Attempt Notification** (Red, 0xE74C3C)
- Target and executor
- Type of bypass attempted
- Action taken

### Direct Messages

- **Restricted Moderator**: Notified of restriction and expiration
- **Server Owner**: Alerted to all security events

## Edge Cases & Best Practices

### Edge Cases Handled

1. **Member Left Server**: Restriction removed from database
2. **Role Deleted**: System handles missing roles gracefully
3. **Bot Offline**: Events queued and processed when online
4. **Audit Log Unavailable**: Action not tracked (fail-safe)
5. **Race Conditions**: Timestamp-based deduplication
6. **Owner Actions**: Always bypassed (owner cannot be restricted)
7. **Bot Self-Actions**: Ignored to prevent loops

### Best Practices

1. **Initialize First**: Always run `/safe-server initialize` before enabling
2. **Set Log Channel**: Configure logging before enabling
3. **Whitelist Trusted Admins**: Add senior staff to whitelist
4. **Adjust Limits**: Tune limits based on server size and activity
5. **Monitor Logs**: Regularly review log channel for patterns
6. **Test Configuration**: Test with a trusted moderator before full deployment
7. **Backup Roles**: Document role permissions before implementing

### Performance Considerations

- **In-Memory Tracking**: Fast lookups, minimal database queries
- **Redis Fallback**: Persistence without performance impact
- **Automatic Cleanup**: Expired timestamps removed every 5 minutes
- **Efficient Queries**: Audit log queries limited to 5 entries
- **Scalable**: Tested for servers with 100,000+ members

## Security Considerations

### Threat Model

**Protected Against:**
- Compromised moderator accounts
- Malicious moderators
- Rogue administrators
- Automated nuke bots
- Mass action scripts
- Unauthorized bot additions

**NOT Protected Against:**
- Server owner actions (by design)
- Discord API outages
- Bots with Administrator permission (pre-existing)

### Limitations

1. **Owner Immunity**: Server owner cannot be restricted
2. **Existing Bots**: Only new bot additions are quarantined
3. **Audit Log Dependency**: Requires ViewAuditLog permission
4. **5-Second Window**: Actions must appear in audit log within detection window
5. **Role Hierarchy**: Bot must have higher role than SS roles to manage them

## Troubleshooting

### "Safe-Server is not initialized"
**Solution**: Run `/safe-server initialize` to create managed roles.

### "Failed to create roles"
**Cause**: Bot lacks ManageRoles permission or role hierarchy issue.
**Solution**: Ensure bot has ManageRoles and its role is at the top of the hierarchy.

### "Failed to restrict moderator"
**Cause**: Bot cannot modify target's roles (hierarchy issue).
**Solution**: Ensure bot's role is higher than all SS roles and moderator roles.

### Actions not being detected
**Cause**: Audit log not populating or bot lacks ViewAuditLog permission.
**Solution**: Grant bot ViewAuditLog permission.

### Bot quarantine not working
**Cause**: Bot protection disabled or bot added by whitelisted user.
**Solution**: Check `/safe-server status` and verify bot protection is enabled.

## Database Schema

```javascript
{
  guildID: String (unique),
  enabled: Boolean,
  logChannelId: String,
  
  whitelist: {
    users: [String],
    roles: [String]
  },
  
  limits: {
    ban: { count: Number, duration: Number },
    kick: { count: Number, duration: Number },
    timeout: { count: Number, duration: Number },
    channelDelete: { count: Number, duration: Number },
    channelCreate: { count: Number, duration: Number },
    roleDelete: { count: Number, duration: Number },
    roleUpdate: { count: Number, duration: Number },
    botAdd: { count: Number, duration: Number },
    emojiDelete: { count: Number, duration: Number },
    stickerDelete: { count: Number, duration: Number }
  },
  
  restriction: {
    method: String ('role_swap' | 'timeout'),
    cooldownDuration: Number,
    timeoutFallback: Boolean
  },
  
  botProtection: {
    enabled: Boolean,
    requireApproval: Boolean,
    quarantineRoleId: String
  },
  
  managedRoles: {
    admin: String,
    moderator: String,
    restricted: String,
    botQuarantine: String
  },
  
  activeRestrictions: [{
    userId: String,
    originalRoles: [String],
    restrictedAt: Date,
    expiresAt: Date,
    reason: String,
    actionType: String
  }],
  
  quarantinedBots: [{
    botId: String,
    addedBy: String,
    addedAt: Date,
    approved: Boolean
  }],
  
  initialized: Boolean,
  rolesCreated: Boolean
}
```

## Integration with Existing Bot

The Safe-Server system integrates seamlessly with your existing bot:

1. **No Command Conflicts**: Uses its own namespace (`/safe-server`)
2. **Independent Operation**: Doesn't interfere with existing moderation commands
3. **Event Coexistence**: Event handlers don't conflict with existing handlers
4. **Database Separation**: Uses dedicated schema
5. **Graceful Degradation**: If disabled, has zero impact on bot performance

## Future Enhancements

Potential additions for future versions:

- **Webhook Monitoring**: Detect malicious webhook creation/usage
- **Message Spam Detection**: Track @everyone/@here abuse
- **Sticker Deletion Tracking**: Already in schema, needs event handler
- **Soundboard Sound Deletion**: Track audio asset deletion
- **Advanced Analytics**: Dashboard for abuse patterns
- **Multi-Server Blacklist**: Share known malicious actors across servers
- **Machine Learning**: Anomaly detection for unusual patterns
- **Automated Backups**: Snapshot server state before restrictions

## Support & Maintenance

### Logging

All Safe-Server operations are logged with the `[SafeServer]` prefix:
- Action detections
- Restrictions applied
- Restorations completed
- Errors encountered

### Monitoring

Monitor these metrics:
- Active restrictions count
- Quarantined bots count
- Action tracking memory usage
- Redis connection status

### Updates

When updating Safe-Server:
1. Backup database
2. Test in development environment
3. Review changelog for breaking changes
4. Update during low-activity period

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Discord.js Version**: 14.25.1  
**License**: GPL-3.0-only
