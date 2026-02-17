# Safe-Server Flow Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Discord Server                           │
│  Moderator performs action (ban, kick, delete channel, etc.)   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Discord Gateway                             │
│              Emits event (GuildBanAdd, etc.)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Safe-Server Event Handler                     │
│  • Receives event                                               │
│  • Fetches audit logs                                           │
│  • Identifies executor                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Validation Checks                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Is executor a bot? ────────────────────────► YES → STOP  │  │
│  │         │                                                 │  │
│  │         NO                                                │  │
│  │         ▼                                                 │  │
│  │ Is executor the owner? ────────────────────► YES → STOP  │  │
│  │         │                                                 │  │
│  │         NO                                                │  │
│  │         ▼                                                 │  │
│  │ Is executor whitelisted? ──────────────────► YES → STOP  │  │
│  │         │                                                 │  │
│  │         NO                                                │  │
│  │         ▼                                                 │  │
│  │    CONTINUE                                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SafeServerTracker                              │
│  • Record action with timestamp                                 │
│  • Get action count in sliding window                           │
│  • Compare count to configured limit                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Limit Check                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Count < Limit? ────────────────────────────► YES → STOP  │  │
│  │         │                                                 │  │
│  │         NO (LIMIT EXCEEDED)                               │  │
│  │         ▼                                                 │  │
│  │    RESTRICT MODERATOR                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SafeServerManager                               │
│  • Fetch moderator's current SS roles                           │
│  • Remove high-privilege SS roles                               │
│  • Add SS-Mod-Restricted role                                   │
│  • Save restriction to database                                 │
│  • Schedule automatic restoration                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Notification System                            │
│  • Send embed to log channel                                    │
│  • DM restricted moderator                                      │
│  • DM server owner (alert)                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Ban Detection Flow

```
User Banned
    │
    ▼
GuildBanAdd Event
    │
    ▼
Fetch Audit Logs
(AuditLogEvent.MemberBanAdd)
    │
    ▼
Find Entry Where:
• target.id === banned_user.id
• timestamp < 5 seconds ago
    │
    ▼
Extract Executor
    │
    ├─► Is Bot? ──────────────► STOP
    │
    ├─► Is Owner? ────────────► STOP
    │
    ├─► Is Whitelisted? ──────► STOP
    │
    ▼
Record Action
(guild, executor, 'ban', timestamp)
    │
    ▼
Get Ban Count
(last 10 minutes)
    │
    ▼
Count >= 3?
    │
    ├─► NO ──────────────────► STOP
    │
    ▼ YES
Apply Restriction
    │
    ├─► Remove SS-Admin
    ├─► Remove SS-Moderator
    ├─► Add SS-Mod-Restricted
    │
    ▼
Save to Database
    │
    ▼
Schedule Restoration
(setTimeout 1 hour)
    │
    ▼
Send Notifications
```

## Restriction Flow

```
Moderator Exceeds Limit
    │
    ▼
SafeServerManager.restrictModerator()
    │
    ▼
┌─────────────────────────────────┐
│ Get Current SS Roles            │
│ • Check for SS-Admin            │
│ • Check for SS-Moderator        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Remove High-Privilege Roles     │
│ await member.roles.remove([     │
│   SS-Admin,                     │
│   SS-Moderator                  │
│ ])                              │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Add Restricted Role             │
│ await member.roles.add(         │
│   SS-Mod-Restricted             │
│ )                               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Calculate Expiration            │
│ expiresAt = now + cooldown      │
│ (default: 1 hour)               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Save to Database                │
│ config.activeRestrictions.push({│
│   userId,                       │
│   originalRoles: [SS-Admin],    │
│   restrictedAt: now,            │
│   expiresAt: expiresAt,         │
│   reason: "3/3 bans in 600s"    │
│ })                              │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Schedule Auto-Restore           │
│ setTimeout(() => {              │
│   restoreModerator(userId)      │
│ }, cooldownDuration)            │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Send Notifications              │
│ • Log channel embed (red)       │
│ • DM to moderator               │
│ • DM to server owner            │
└─────────────────────────────────┘
```

## Restoration Flow

```
Cooldown Timer Expires
    │
    ▼
SafeServerManager.restoreModerator()
    │
    ▼
┌─────────────────────────────────┐
│ Fetch Restriction from DB       │
│ restriction = config            │
│   .activeRestrictions           │
│   .find(r => r.userId === id)   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Remove Restricted Role          │
│ await member.roles.remove(      │
│   SS-Mod-Restricted             │
│ )                               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Restore Original Roles          │
│ await member.roles.add(         │
│   restriction.originalRoles     │
│ )                               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Remove from Database            │
│ config.activeRestrictions =     │
│   config.activeRestrictions     │
│   .filter(r => r.userId !== id) │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Clear Action History            │
│ tracker.clearActions(           │
│   guildId, userId               │
│ )                               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Send Notification               │
│ • Log channel embed (green)     │
│ • Confirmation message          │
└─────────────────────────────────┘
```

## Bot Quarantine Flow

```
Bot Joins Server
    │
    ▼
GuildMemberAdd Event
    │
    ▼
Is Bot?
    │
    ├─► NO ──────────────────► STOP
    │
    ▼ YES
Fetch Audit Logs
(AuditLogEvent.BotAdd)
    │
    ▼
Find Entry Where:
• target.id === bot.id
• timestamp < 10 seconds ago
    │
    ▼
Extract Executor
(who added the bot)
    │
    ├─► Is Owner? ────────────► STOP
    │
    ├─► Is Whitelisted? ──────► STOP
    │
    ▼
Record Action
(guild, executor, 'botAdd')
    │
    ▼
Bot Protection Enabled?
    │
    ├─► NO ──────────────────► Check Limit Only
    │
    ▼ YES
Quarantine Bot
    │
    ├─► Remove all roles
    ├─► Add SS-Bot-Quarantine
    │
    ▼
Save to Database
(quarantinedBots array)
    │
    ▼
Send Notifications
    │
    ├─► Log channel (orange)
    ├─► Owner DM with approval instructions
    │
    ▼
Check Executor Limit
    │
    ▼
Exceeded 1 bot per hour?
    │
    ├─► NO ──────────────────► STOP
    │
    ▼ YES
Restrict Executor
```

## Anti-Bypass Detection Flow

```
GuildMemberUpdate Event
    │
    ▼
Compare Old vs New Roles
    │
    ▼
SS Role Removed?
    │
    ├─► NO ──────────────────► Check Other Changes
    │
    ▼ YES
Fetch Audit Logs
(AuditLogEvent.MemberRoleUpdate)
    │
    ▼
Extract Executor
    │
    ├─► Is Bot Itself? ───────► STOP (Legitimate)
    │
    ├─► Is Owner? ────────────► STOP
    │
    ▼
Check Active Restriction
    │
    ▼
User Has Active Restriction?
    │
    ├─► NO ──────────────────► STOP (Legitimate)
    │
    ▼ YES
Restriction Still Active?
(expiresAt > now)
    │
    ├─► NO ──────────────────► STOP (Expired)
    │
    ▼ YES (BYPASS ATTEMPT!)
Restore Removed Roles
    │
    ▼
await member.roles.add(
  removedSSRoles
)
    │
    ▼
Log Bypass Attempt
    │
    ├─► Log channel (red)
    ├─► Show executor
    ├─► Show target
    ├─► Show roles restored
    │
    ▼
Consider Punishing Executor
(optional future enhancement)
```

## Rate Limiting Algorithm

```
┌─────────────────────────────────────────────────────────┐
│              Sliding Window Rate Limiting                │
└─────────────────────────────────────────────────────────┘

Example: Ban limit = 3 per 600 seconds (10 minutes)

Timeline:
─────────────────────────────────────────────────────────►
0s      300s     600s     900s     1200s    1500s    Time

Action History:
Ban #1 at 100s   ●
Ban #2 at 400s        ●
Ban #3 at 700s             ●
Ban #4 at 1100s                  ●

Check at 1100s:
─────────────────────────────────────────────────────────►
        500s                    1100s (now)
         ↑                        ↑
         └─ 600s window ──────────┘

Actions in window (500s - 1100s):
• Ban #2 at 400s ✗ (outside window)
• Ban #3 at 700s ✓ (inside window)
• Ban #4 at 1100s ✓ (inside window)

Count = 2 (< 3) → ALLOWED

Check at 1200s:
─────────────────────────────────────────────────────────►
        600s                    1200s (now)
         ↑                        ↑
         └─ 600s window ──────────┘

Actions in window (600s - 1200s):
• Ban #3 at 700s ✓ (inside window)
• Ban #4 at 1100s ✓ (inside window)

Count = 2 (< 3) → ALLOWED

If Ban #5 at 1200s:
Count = 3 (>= 3) → RESTRICT!
```

## Data Structure Visualization

```
SafeServerTracker In-Memory Storage:

Map<guildId, Map<userId, Map<actionType, timestamp[]>>>

{
  "123456789012345678": {              // Guild ID
    "987654321098765432": {            // User ID (Moderator)
      "ban": [
        1704067200000,                 // Timestamp 1
        1704067260000,                 // Timestamp 2
        1704067320000                  // Timestamp 3
      ],
      "kick": [
        1704067100000,
        1704067150000
      ],
      "channelDelete": [
        1704067400000
      ]
    },
    "111222333444555666": {            // Another User ID
      "ban": [
        1704067500000
      ]
    }
  },
  "999888777666555444": {              // Another Guild ID
    "777888999000111222": {
      "timeout": [
        1704067600000,
        1704067650000,
        1704067700000
      ]
    }
  }
}

Cleanup Process (every 5 minutes):
1. Iterate through all guilds
2. For each user in guild
3. For each action type
4. Filter timestamps: keep only if (now - timestamp) < 2 hours
5. Remove empty maps
```

## Permission Profile Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                  Permission Levels                       │
└─────────────────────────────────────────────────────────┘

HIGHEST
   ↑
   │  ┌──────────────────────────────────────────┐
   │  │         Server Owner                     │
   │  │  • Cannot be restricted                  │
   │  │  • Bypasses all limits                   │
   │  │  • Full control                          │
   │  └──────────────────────────────────────────┘
   │
   │  ┌──────────────────────────────────────────┐
   │  │         SS-Admin                         │
   │  │  • ManageGuild, ManageRoles              │
   │  │  • ManageChannels                        │
   │  │  • Ban, Kick, Timeout                    │
   │  │  • Subject to limits                     │
   │  └──────────────────────────────────────────┘
   │
   │  ┌──────────────────────────────────────────┐
   │  │         SS-Moderator                     │
   │  │  • Kick, Timeout                         │
   │  │  • ManageMessages                        │
   │  │  • ViewAuditLog                          │
   │  │  • Subject to limits                     │
   │  └──────────────────────────────────────────┘
   │
   │  ┌──────────────────────────────────────────┐
   │  │      SS-Mod-Restricted                   │
   │  │  • Timeout only                          │
   │  │  • ViewAuditLog                          │
   │  │  • Cannot ban/kick                       │
   │  │  • Cannot delete channels                │
   │  └──────────────────────────────────────────┘
   │
   │  ┌──────────────────────────────────────────┐
   │  │      SS-Bot-Quarantine                   │
   │  │  • No permissions                        │
   │  │  • Applied to new bots                   │
   │  │  • Requires approval                     │
   │  └──────────────────────────────────────────┘
   ↓
LOWEST
```

## Configuration Flow

```
Server Owner
    │
    ▼
/safe-server initialize
    │
    ├─► Create SS-Admin
    ├─► Create SS-Moderator
    ├─► Create SS-Mod-Restricted
    ├─► Create SS-Bot-Quarantine
    │
    ▼
/safe-server set-log-channel
    │
    ├─► Save channel ID to config
    │
    ▼
/safe-server set-limit
    │
    ├─► Update limits.ban.count
    ├─► Update limits.ban.duration
    │
    ▼
/safe-server whitelist-add
    │
    ├─► Add user to whitelist.users[]
    ├─► OR add role to whitelist.roles[]
    │
    ▼
/safe-server bot-protection
    │
    ├─► Set botProtection.enabled
    ├─► Set botProtection.requireApproval
    │
    ▼
/safe-server enable
    │
    ├─► Set enabled = true
    │
    ▼
System Active
    │
    ├─► Monitoring all actions
    ├─► Tracking rate limits
    ├─► Ready to restrict
```

---

**These diagrams provide a visual understanding of Safe-Server's operation.**

Version 1.0.0 | January 2026
