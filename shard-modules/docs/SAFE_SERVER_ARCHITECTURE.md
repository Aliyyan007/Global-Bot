# Safe-Server Technical Architecture

## System Design Philosophy

Safe-Server is built on three core principles:

1. **Event-Driven Detection**: Monitor Discord events, not commands
2. **Audit Log Verification**: Always verify executor via audit logs
3. **Non-Destructive Restriction**: Temporarily limit permissions, don't remove roles

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Discord Gateway                          │
│  (Events: Ban, Kick, Timeout, Channel/Role Changes, etc.)  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Event Handlers                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ guildBanAdd  │  │channelDelete │  │roleUpdate    │     │
│  │ (Ban)        │  │ (Ch. Delete) │  │ (Perm Grant) │ ... │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Audit Log Verification Layer                    │
│  • Fetch recent audit logs (5-10 second window)             │
│  • Match event to audit entry by target ID & timestamp      │
│  • Extract executor (who performed the action)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 SafeServerTracker                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  In-Memory Action Log                              │    │
│  │  Map<guildId, Map<userId, Map<actionType, [ts]>>> │    │
│  └────────────────────────────────────────────────────┘    │
│  • Record action with timestamp                             │
│  • Check if executor is whitelisted                         │
│  • Calculate action count in sliding window                 │
│  • Determine if limit exceeded                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Limit Exceeded Decision                         │
│  if (count >= limit.count) {                                │
│    → Trigger Restriction                                    │
│  }                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                SafeServerManager                             │
│  • Fetch moderator's current SS roles                       │
│  • Remove high-privilege SS roles                           │
│  • Apply SS-Mod-Restricted role                             │
│  • Save restriction to database                             │
│  • Schedule automatic restoration                           │
│  • Send notifications                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Notification System                         │
│  • Log channel embed (detailed info)                        │
│  • DM to restricted moderator                               │
│  • DM to server owner (alert)                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Action Detection Flow

```
Discord Action (e.g., Ban)
    ↓
GuildBanAdd Event Fired
    ↓
Event Handler: events/safeServer/guildBanAdd.js
    ↓
Fetch Audit Logs (AuditLogEvent.MemberBanAdd)
    ↓
Find Matching Entry (target ID + timestamp < 5s)
    ↓
Extract Executor
    ↓
Check: Is executor bot? → YES → STOP
    ↓ NO
Check: Is executor owner? → YES → STOP
    ↓ NO
Check: Is executor whitelisted? → YES → STOP
    ↓ NO
Record Action in SafeServerTracker
    ↓
Check Limit (count in sliding window)
    ↓
Limit Exceeded? → NO → STOP
    ↓ YES
Restrict Moderator via SafeServerManager
    ↓
Send Notifications
```

### 2. Restriction Flow

```
Moderator Exceeds Limit
    ↓
SafeServerManager.restrictModerator()
    ↓
Fetch Moderator's Current SS Roles
    ↓
Remove SS-Admin and/or SS-Moderator
    ↓
Add SS-Mod-Restricted
    ↓
Calculate Expiration Time (now + cooldownDuration)
    ↓
Save to activeRestrictions in Database
    ↓
Schedule setTimeout for Automatic Restoration
    ↓
Send Notifications (Log Channel, DM, Owner)
```

### 3. Restoration Flow

```
Cooldown Timer Expires
    ↓
SafeServerManager.restoreModerator()
    ↓
Fetch Restriction from Database
    ↓
Remove SS-Mod-Restricted Role
    ↓
Restore Original SS Roles
    ↓
Remove from activeRestrictions
    ↓
Clear Action History in SafeServerTracker
    ↓
Send Restoration Notification
```

## Component Details

### SafeServerTracker

**Purpose**: Track moderator actions in real-time with minimal latency.

**Data Structure**:
```javascript
Map<guildId, Map<userId, Map<actionType, timestamp[]>>>

Example:
{
  "123456789": {  // Guild ID
    "987654321": {  // User ID
      "ban": [1704067200000, 1704067260000, 1704067320000],
      "kick": [1704067100000, 1704067150000]
    }
  }
}
```

**Key Methods**:
- `recordAction(guildId, userId, actionType)`: Add timestamp to action log
- `getActionCount(guildId, userId, actionType, duration)`: Count actions in window
- `checkLimit(guildId, userId, actionType, config)`: Compare count to limit
- `isWhitelisted(guildId, userId, userRoles, config)`: Check whitelist
- `clearActions(guildId, userId)`: Reset user's action history
- `cleanup()`: Remove expired timestamps (runs every 5 minutes)

**Performance**:
- O(1) insertion
- O(n) filtering (where n = number of timestamps for that action)
- Automatic cleanup prevents memory bloat
- Redis persistence for crash recovery

### SafeServerManager

**Purpose**: Manage role-based restrictions and bot quarantine.

**Key Methods**:
- `initialize(guild)`: Create SS managed roles
- `restrictModerator(guild, moderator, actionType, limitInfo, config)`: Apply restriction
- `restoreModerator(guildId, userId)`: Remove restriction and restore roles
- `quarantineBot(guild, bot, addedBy, config)`: Quarantine newly added bot
- `sendRestrictionNotification()`: Send alerts
- `sendRestorationNotification()`: Confirm restoration
- `sendBotQuarantineNotification()`: Alert about quarantined bot

**Role Management Logic**:
```javascript
// Restriction
const ssRoles = moderator.roles.cache.filter(role => 
  [config.managedRoles.admin, config.managedRoles.moderator].includes(role.id)
)
await moderator.roles.remove(ssRoles)
await moderator.roles.add(config.managedRoles.restricted)

// Restoration
await moderator.roles.remove(config.managedRoles.restricted)
await moderator.roles.add(restriction.originalRoles)
```

### Event Handlers

**Common Pattern**:
```javascript
client.on(Events.EventName, async (eventData) => {
  // 1. Check if Safe-Server is enabled
  const config = await safeServerSchema.findOne({ guildID: guild.id })
  if (!config || !config.enabled) return
  
  // 2. Fetch audit logs
  const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.Type })
  
  // 3. Find matching entry
  const auditEntry = auditLogs.entries.find(entry => 
    entry.target.id === target.id && 
    (Date.now() - entry.createdTimestamp) < 5000
  )
  
  // 4. Extract executor
  const executor = auditEntry.executor
  
  // 5. Validation checks
  if (executor.bot) return
  if (executor.id === guild.ownerId) return
  if (isWhitelisted(executor)) return
  
  // 6. Record action
  await client.safeServerTracker.recordAction(guild.id, executor.id, 'actionType')
  
  // 7. Check limit
  const limitCheck = await client.safeServerTracker.checkLimit(...)
  
  // 8. Restrict if exceeded
  if (limitCheck.exceeded) {
    await client.safeServerManager.restrictModerator(...)
  }
})
```

**Timing Considerations**:
- Audit logs may take 100-500ms to populate
- 5-second detection window accounts for Discord API latency
- Some events (like kicks) add 500ms delay before checking audit logs

### Anti-Bypass System

**Monitored Events**:
- `GuildMemberUpdate`: Detects role changes
- `GuildRoleUpdate`: Detects permission changes to SS roles

**Bypass Detection Logic**:
```javascript
// Check if SS role was removed
const removedSSRoles = oldMember.roles.cache.filter(role =>
  ssRoleIds.includes(role.id) && !newMember.roles.cache.has(role.id)
)

if (removedSSRoles.size > 0) {
  // Check if user has active restriction
  const restriction = config.activeRestrictions.find(r => r.userId === member.id)
  
  if (restriction && restriction.expiresAt > new Date()) {
    // This is unauthorized - restore roles
    await member.roles.add(removedSSRoles.map(r => r.id))
    // Log bypass attempt
  }
}
```

## Database Schema Design

### Rationale

**Embedded Documents vs References**:
- `activeRestrictions`: Embedded (small, frequently accessed together)
- `quarantinedBots`: Embedded (small, guild-specific)
- `whitelist`: Embedded (small, frequently checked)
- `limits`: Embedded (always loaded together)

**Indexes**:
```javascript
// Primary index
{ guildID: 1 } // Unique

// Compound indexes for queries
{ guildID: 1, enabled: 1 }
{ guildID: 1, 'activeRestrictions.userId': 1 }
```

**Schema Evolution**:
- `minimize: false` allows empty objects
- Flexible limits object for adding new action types
- Version field for future migrations

## Scalability Considerations

### Memory Usage

**Per Guild**:
- Config: ~2 KB
- Active restrictions: ~200 bytes per restriction
- Action tracking: ~50 bytes per action timestamp

**Example**: 1000 guilds, 10 active restrictions per guild, 100 tracked actions per guild:
- Configs: 2 MB
- Restrictions: 2 MB
- Action tracking: 5 MB
- **Total**: ~10 MB

### Performance Optimizations

1. **In-Memory Tracking**: Avoid database queries for every action
2. **Lazy Loading**: Only load config when needed
3. **Batch Operations**: Group role changes when possible
4. **Efficient Queries**: Limit audit log fetches to 5 entries
5. **Automatic Cleanup**: Remove expired data every 5 minutes

### Horizontal Scaling

**Sharding Considerations**:
- Each shard has its own SafeServerTracker instance
- Redis provides cross-shard persistence
- Database operations are shard-independent
- No cross-shard communication required

## Security Model

### Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Compromised Moderator | Rate limiting + automatic restriction |
| Malicious Bot Addition | Quarantine system |
| Role Hierarchy Manipulation | Anti-bypass detection |
| Permission Escalation | Monitor role updates for dangerous permissions |
| Mass Actions | Sliding window rate limiting |
| Bypass Attempts | Real-time detection and reversion |

### Attack Vectors NOT Covered

1. **Owner Account Compromise**: Owner has absolute power (by design)
2. **Bot Account Compromise**: Bot can disable itself
3. **Discord API Exploits**: Outside bot's control
4. **Social Engineering**: Cannot detect legitimate-looking abuse

### Defense in Depth

```
Layer 1: Whitelist (Trusted users bypass)
    ↓
Layer 2: Rate Limiting (Detect excessive actions)
    ↓
Layer 3: Role Restriction (Limit permissions)
    ↓
Layer 4: Anti-Bypass (Prevent circumvention)
    ↓
Layer 5: Notifications (Alert owner)
```

## Error Handling

### Graceful Degradation

```javascript
try {
  // Attempt restriction
  await restrictModerator(...)
} catch (error) {
  // Fallback to timeout if role swap fails
  if (config.restriction.timeoutFallback) {
    await member.timeout(duration)
  }
  // Log error but don't crash
  console.error('[SafeServer] Error:', error)
}
```

### Failure Modes

| Failure | Behavior |
|---------|----------|
| Audit log unavailable | Action not tracked (fail-safe) |
| Role hierarchy issue | Fallback to timeout |
| Database error | Use in-memory data, retry later |
| Redis unavailable | Continue with in-memory only |
| Notification failure | Log error, continue operation |

## Testing Strategy

### Unit Tests (Recommended)

```javascript
// Test rate limiting logic
test('should detect limit exceeded', async () => {
  const tracker = new SafeServerTracker(mockClient)
  
  // Record 3 bans
  await tracker.recordAction('guild1', 'user1', 'ban')
  await tracker.recordAction('guild1', 'user1', 'ban')
  await tracker.recordAction('guild1', 'user1', 'ban')
  
  // Check limit (3 per 600s)
  const result = await tracker.checkLimit('guild1', 'user1', 'ban', mockConfig)
  
  expect(result.exceeded).toBe(true)
  expect(result.count).toBe(3)
})
```

### Integration Tests

1. **Action Detection**: Trigger real Discord actions, verify detection
2. **Restriction Flow**: Verify role changes and database updates
3. **Restoration Flow**: Verify automatic restoration after cooldown
4. **Anti-Bypass**: Attempt to remove roles, verify reversion

### Load Testing

- Simulate 100 concurrent actions
- Verify no race conditions
- Check memory usage under load
- Measure audit log fetch latency

## Monitoring & Observability

### Key Metrics

```javascript
// Action tracking
safeserver.actions.recorded (counter)
safeserver.actions.limit_exceeded (counter)

// Restrictions
safeserver.restrictions.active (gauge)
safeserver.restrictions.applied (counter)
safeserver.restrictions.restored (counter)

// Performance
safeserver.audit_log.fetch_time (histogram)
safeserver.tracker.memory_usage (gauge)
```

### Logging

```javascript
console.log('[SafeServer] Ban limit exceeded by UserTag in GuildName')
console.log('[SafeServer] Restricted UserTag for excessive bans')
console.log('[SafeServer] Restored UserTag from restriction')
console.error('[SafeServer] Failed to restrict UserTag:', error.message)
```

## Future Architecture Improvements

1. **Event Sourcing**: Store all events for replay and analysis
2. **CQRS Pattern**: Separate read and write models
3. **Microservices**: Extract Safe-Server into standalone service
4. **GraphQL API**: Expose configuration via API
5. **Real-Time Dashboard**: WebSocket-based monitoring UI
6. **Machine Learning**: Anomaly detection for unusual patterns

---

**Architecture Version**: 1.0.0  
**Last Updated**: January 2026  
**Designed For**: Discord.js v14, MongoDB, Redis
