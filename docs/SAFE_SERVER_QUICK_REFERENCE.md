# Safe-Server Quick Reference Card

## 🚀 Quick Setup (5 Minutes)

```
1. /safe-server initialize
2. /safe-server set-log-channel channel:#logs
3. /safe-server enable
4. Assign SS-Admin and SS-Moderator roles to staff
```

## 📋 Essential Commands

| Command | Purpose |
|---------|---------|
| `/safe-server status` | View current config |
| `/safe-server enable` | Turn on protection |
| `/safe-server disable` | Turn off protection |
| `/safe-server set-limit` | Configure action limits |
| `/safe-server whitelist-add` | Add trusted user/role |
| `/safe-server active-restrictions` | View restricted mods |

## 🎯 Default Limits

| Action | Limit | Duration |
|--------|-------|----------|
| Ban | 3 | 10 min |
| Kick | 5 | 5 min |
| Timeout | 10 | 5 min |
| Channel Delete | 3 | 10 min |
| Role Delete | 2 | 10 min |
| Bot Add | 1 | 1 hour |

## 🛡️ Managed Roles

- **SS-Admin** (Red) - Full admin permissions
- **SS-Moderator** (Blue) - Kick, timeout, manage messages
- **SS-Mod-Restricted** (Gray) - Timeout only
- **SS-Bot-Quarantine** (Orange) - No permissions

## 🔧 Common Configurations

### Small Server (< 100 members)
```
/safe-server set-limit action:ban count:2 duration:600
/safe-server set-limit action:kick count:3 duration:300
/safe-server set-cooldown duration:1800
```

### Medium Server (100-1000 members)
```
/safe-server set-limit action:ban count:3 duration:600
/safe-server set-limit action:kick count:5 duration:300
/safe-server set-cooldown duration:3600
```

### Large Server (1000+ members)
```
/safe-server set-limit action:ban count:5 duration:600
/safe-server set-limit action:kick count:10 duration:300
/safe-server set-cooldown duration:7200
```

## 🚨 Emergency Commands

```
/safe-server disable                           # Turn off immediately
/safe-server restore-moderator user:@Mod       # Manual restore
/safe-server active-restrictions               # See who's restricted
```

## 🔍 Troubleshooting

| Problem | Solution |
|---------|----------|
| Not initialized | `/safe-server initialize` |
| Actions not detected | Grant bot ViewAuditLog permission |
| Can't restrict mods | Move bot role to top of hierarchy |
| Bot quarantine not working | Enable bot protection |

## 📊 What Gets Detected

✅ Bans (any method)  
✅ Kicks (any method)  
✅ Timeouts (any method)  
✅ Channel deletions  
✅ Channel creation spam  
✅ Role deletions  
✅ Admin permission grants  
✅ Bot additions  
✅ Emoji deletions  

## 🎯 What Gets Protected

✅ Server from mass bans  
✅ Channels from deletion  
✅ Roles from deletion  
✅ Permissions from escalation  
✅ Server from malicious bots  
✅ Assets from destruction  

## 🔐 Security Features

- **Whitelist**: Trusted users bypass limits
- **Bot Quarantine**: New bots auto-quarantined
- **Anti-Bypass**: Prevents role manipulation
- **Owner Immunity**: Owner always bypassed

## 📈 Performance

- Detection: < 100ms
- Restriction: < 500ms
- Memory: ~2 KB per guild
- Scalability: 100,000+ members

## 🎓 Best Practices

1. ✅ Initialize before enabling
2. ✅ Set log channel first
3. ✅ Whitelist trusted admins
4. ✅ Test with trusted mod
5. ✅ Monitor logs daily (first week)
6. ✅ Adjust limits as needed
7. ✅ Train staff on system

## 📚 Documentation

- **Full Docs**: `docs/SAFE_SERVER_DOCUMENTATION.md`
- **Setup**: `docs/SAFE_SERVER_SETUP_GUIDE.md`
- **Architecture**: `docs/SAFE_SERVER_ARCHITECTURE.md`
- **Testing**: `docs/SAFE_SERVER_TESTING_CHECKLIST.md`

## 🔔 Notification Colors

- 🔴 Red: Restriction applied / Bypass attempt
- 🟢 Green: Moderator restored
- 🟠 Orange: Bot quarantined / SS role modified

## ⚙️ Required Permissions

Bot needs:
- `ManageRoles`
- `ViewAuditLog`
- `ModerateMembers`
- `ManageChannels`

Bot role must be:
- Above all SS roles in hierarchy

## 🎯 Use Cases

**Compromised Account**: Auto-restricts after 3 bans  
**Rogue Admin**: Stops after 3 channel deletions  
**Malicious Bot**: Quarantined immediately  
**Mass Action**: Detected and stopped in real-time  

## 📞 Quick Support

1. Check `/safe-server status`
2. Review log channel
3. Check console for `[SafeServer]` logs
4. Verify bot permissions
5. Check role hierarchy

## 🔄 Maintenance Schedule

**Weekly**: Review logs, check restrictions  
**Monthly**: Adjust limits, update whitelist  
**After Staff Changes**: Update roles and whitelist  

---

**Print this card and keep it handy!**

Version 1.0.0 | January 2026
