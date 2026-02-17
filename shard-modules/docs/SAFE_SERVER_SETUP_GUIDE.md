# Safe-Server Quick Setup Guide

## Prerequisites

- Bot must have the following permissions:
  - `ManageRoles`
  - `ManageChannels` (for log channel access)
  - `ViewAuditLog`
  - `ModerateMembers`
- Bot's role must be at the top of the role hierarchy
- You must be the server owner

## Step-by-Step Setup

### 1. Initialize Safe-Server

```
/safe-server initialize
```

This creates four managed roles:
- SS-Admin (Red)
- SS-Moderator (Blue)
- SS-Mod-Restricted (Gray)
- SS-Bot-Quarantine (Orange)

**Important**: Move the bot's role above these new roles in Server Settings → Roles.

### 2. Set Log Channel

```
/safe-server set-log-channel channel:#safe-server-logs
```

Create a private channel that only you and the bot can see.

### 3. Configure Action Limits (Optional)

Adjust limits based on your server's needs:

```
/safe-server set-limit action:ban count:3 duration:600
/safe-server set-limit action:kick count:5 duration:300
/safe-server set-limit action:channelDelete count:2 duration:600
```

### 4. Add Trusted Staff to Whitelist

```
/safe-server whitelist-add user:@TrustedAdmin
/safe-server whitelist-add role:@SeniorModerator
```

Whitelisted users bypass all limits.

### 5. Configure Bot Protection

```
/safe-server bot-protection enabled:True require-approval:True
```

New bots will be quarantined until you approve them.

### 6. Enable Safe-Server

```
/safe-server enable
```

The system is now active and monitoring all moderation actions.

### 7. Assign SS Roles to Your Staff

Manually assign the SS roles to your moderators:
- Give `SS-Admin` to administrators
- Give `SS-Moderator` to moderators

**Important**: These roles work alongside existing roles. Don't remove their original roles.

## Quick Configuration Examples

### Small Server (< 100 members)
```
Ban: 2 per 10 minutes
Kick: 3 per 5 minutes
Channel Delete: 1 per 10 minutes
Cooldown: 30 minutes
```

### Medium Server (100-1000 members)
```
Ban: 3 per 10 minutes
Kick: 5 per 5 minutes
Channel Delete: 2 per 10 minutes
Cooldown: 1 hour
```

### Large Server (1000+ members)
```
Ban: 5 per 10 minutes
Kick: 10 per 5 minutes
Channel Delete: 3 per 10 minutes
Cooldown: 2 hours
```

## Testing Your Configuration

1. Ask a trusted moderator to perform actions near the limit
2. Verify they receive a restriction when exceeding the limit
3. Check the log channel for notifications
4. Wait for cooldown to expire and verify restoration
5. Test bot quarantine by adding a test bot

## Common Commands

### View Status
```
/safe-server status
```

### View Active Restrictions
```
/safe-server active-restrictions
```

### Manually Restore a Moderator
```
/safe-server restore-moderator user:@Moderator
```

### Approve a Quarantined Bot
```
/safe-server approve-bot bot:@NewBot
```

### View Whitelist
```
/safe-server whitelist-list
```

## Troubleshooting

### "Failed to create roles"
- Ensure bot has `ManageRoles` permission
- Move bot's role to the top of the hierarchy

### "Failed to restrict moderator"
- Bot's role must be higher than SS roles
- Bot needs `ManageRoles` permission

### Actions not being detected
- Bot needs `ViewAuditLog` permission
- Check that Safe-Server is enabled (`/safe-server status`)

### Bot quarantine not working
- Verify bot protection is enabled
- Check if the person who added the bot is whitelisted

## Best Practices

1. **Test First**: Test in a development server before production
2. **Start Strict**: Begin with low limits and increase if needed
3. **Monitor Logs**: Check the log channel daily for the first week
4. **Whitelist Carefully**: Only whitelist highly trusted staff
5. **Document Changes**: Keep a record of limit adjustments
6. **Regular Reviews**: Review active restrictions weekly
7. **Staff Training**: Educate moderators about the system

## Emergency Procedures

### Disable Safe-Server Immediately
```
/safe-server disable
```

### Restore All Restricted Moderators
Use `/safe-server active-restrictions` to see who's restricted, then:
```
/safe-server restore-moderator user:@Moderator
```

### Remove Whitelist Entry
```
/safe-server whitelist-remove user:@User
```

## Maintenance

### Weekly
- Review log channel for patterns
- Check active restrictions
- Verify quarantined bots

### Monthly
- Review and adjust limits based on activity
- Update whitelist as staff changes
- Test system functionality

### After Staff Changes
- Remove departed staff from whitelist
- Assign SS roles to new staff
- Brief new moderators on the system

## Support

For issues or questions:
1. Check the full documentation: `docs/SAFE_SERVER_DOCUMENTATION.md`
2. Review error messages in the log channel
3. Check bot console logs for `[SafeServer]` entries
4. Verify bot permissions and role hierarchy

---

**Setup Time**: ~5 minutes  
**Recommended Testing Period**: 1 week  
**Maintenance**: Minimal (weekly reviews)
