# Safe-Server: 3-Command Ultra-Minimal Guide

## 🎯 Overview

Safe-Server has been optimized to use only **3 commands** (down from 14) while maintaining 100% of the functionality through interactive buttons, select menus, and modals.

**Reduction**: 79% fewer commands (14 → 3)

---

## 📋 The 3 Commands

### 1. `/safe-server panel`
**Main control panel for setup and configuration**

Opens an interactive dashboard with buttons for:
- 📊 **View Status** - See current configuration
- ⚙️ **Configure** - Access configuration menu
- 👥 **Manage** - Manage restrictions and bots
- 🔄 **Initialize** - Create SS roles (one-time)
- ✅ **Enable** - Turn on protection
- ❌ **Disable** - Turn off protection

### 2. `/safe-server whitelist`
**Manage trusted users and roles**

**Syntax:**
```
/safe-server whitelist action:[add|remove|view] user:[@User] role:[@Role]
```

**Examples:**
```
/safe-server whitelist action:add user:@TrustedAdmin
/safe-server whitelist action:add role:@SeniorMod
/safe-server whitelist action:remove user:@FormerAdmin
/safe-server whitelist action:view
```

### 3. `/safe-server manage`
**Manage active restrictions and quarantined bots**

Opens an interactive panel with:
- 🚨 **View Restrictions** - See restricted moderators with restore buttons
- 🤖 **View Quarantined Bots** - See quarantined bots with approve/kick buttons

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Initialize
```
/safe-server panel
```
Click **[🔄 Initialize]** button

### Step 2: Configure
Click **[⚙️ Configure]** button, then:
- Click **[📢 Log Channel]** → Enter channel ID
- Click **[📊 Action Limits]** → Select action → Set limits
- Click **[🤖 Bot Protection]** → Click **[Enable]**

### Step 3: Enable
Click **[◀️ Back to Panel]**, then click **[✅ Enable]**

**Done!** Your server is protected.

---

## 🎛️ Configuration Menu Navigation

### From Panel → Configure

```
╔════════════════════════════════════════╗
║         ⚙️ Configuration Menu          ║
╠════════════════════════════════════════╣
║ [📢 Log Channel] [⏱️ Cooldown] [🔒 Method] ║
║ [🤖 Bot Protection] [📊 Action Limits]    ║
║ [◀️ Back to Panel]                     ║
╚════════════════════════════════════════╝
```

#### Log Channel
- Click **[📢 Log Channel]**
- Modal opens → Enter channel ID or #mention
- Click **[Save]**

#### Cooldown
- Click **[⏱️ Cooldown]**
- Modal opens → Enter duration in seconds (60-86400)
- Click **[Save]**

#### Method
- Click **[🔒 Method]**
- Choose **[Role Swap]** or **[Timeout]**

#### Bot Protection
- Click **[🤖 Bot Protection]**
- Choose **[Enable]** or **[Disable]**

#### Action Limits
- Click **[📊 Action Limits]**
- Select action from dropdown menu
- Modal opens → Enter count and duration
- Click **[Save]**

---

## 👥 Management Panel Navigation

### From Panel → Manage

```
╔════════════════════════════════════════╗
║      🛡️ Safe-Server Management         ║
╠════════════════════════════════════════╣
║ Active Restrictions: 2                 ║
║ Quarantined Bots: 1                    ║
║                                        ║
║ [🚨 View Restrictions] [🤖 View Bots]  ║
╚════════════════════════════════════════╝
```

#### View Restrictions
Shows list of restricted moderators with:
- User mention
- Reason for restriction
- Expiration time
- **[✅ Restore Now]** button for each

#### View Quarantined Bots
Shows list of quarantined bots with:
- Bot mention
- Who added it
- When it was added
- **[✅ Approve]** and **[❌ Kick Bot]** buttons

---

## 📊 Command Comparison

| Old (14 commands) | New (3 commands) |
|-------------------|------------------|
| `/safe-server status` | `/safe-server panel` → **[📊 View Status]** |
| `/safe-server initialize` | `/safe-server panel` → **[🔄 Initialize]** |
| `/safe-server enable` | `/safe-server panel` → **[✅ Enable]** |
| `/safe-server disable` | `/safe-server panel` → **[❌ Disable]** |
| `/safe-server set-log-channel` | `/safe-server panel` → **[⚙️ Configure]** → **[📢 Log Channel]** |
| `/safe-server set-limit` | `/safe-server panel` → **[⚙️ Configure]** → **[📊 Action Limits]** |
| `/safe-server set-cooldown` | `/safe-server panel` → **[⚙️ Configure]** → **[⏱️ Cooldown]** |
| `/safe-server set-method` | `/safe-server panel` → **[⚙️ Configure]** → **[🔒 Method]** |
| `/safe-server bot-protection` | `/safe-server panel` → **[⚙️ Configure]** → **[🤖 Bot Protection]** |
| `/safe-server whitelist-add` | `/safe-server whitelist action:add` |
| `/safe-server whitelist-remove` | `/safe-server whitelist action:remove` |
| `/safe-server whitelist-list` | `/safe-server whitelist action:view` |
| `/safe-server active-restrictions` | `/safe-server manage` → **[🚨 View Restrictions]** |
| `/safe-server restore-moderator` | `/safe-server manage` → **[🚨 View Restrictions]** → **[✅ Restore]** |
| `/safe-server approve-bot` | `/safe-server manage` → **[🤖 View Bots]** → **[✅ Approve]** |

---

## 🎯 Common Workflows

### Initial Setup
```
1. /safe-server panel
2. Click [🔄 Initialize]
3. Click [⚙️ Configure]
4. Click [📢 Log Channel] → Enter #logs
5. Click [◀️ Back to Panel]
6. Click [✅ Enable]
```

### Add Trusted Admin
```
/safe-server whitelist action:add user:@Admin
```

### Configure Ban Limit
```
1. /safe-server panel
2. Click [⚙️ Configure]
3. Click [📊 Action Limits]
4. Select "Ban" from dropdown
5. Enter count: 5
6. Enter duration: 600
7. Click [Save]
```

### Restore Restricted Moderator
```
1. /safe-server manage
2. Click [🚨 View Restrictions]
3. Click [✅ Restore Now] next to moderator
```

### Approve Quarantined Bot
```
1. /safe-server manage
2. Click [🤖 View Quarantined Bots]
3. Click [✅ Approve] next to bot
```

---

## ✅ Benefits of 3-Command Design

1. **Cleaner Command List** - Much easier to remember
2. **Intuitive Navigation** - Visual menus are familiar
3. **Mobile-Friendly** - Buttons work great on mobile
4. **All Functionality Preserved** - Nothing lost
5. **Better UX** - No need to remember complex command syntax
6. **Faster Configuration** - Visual feedback at every step

## ⚠️ Trade-offs

1. **More Clicks** - 2-3 clicks vs 1 command (but more intuitive)
2. **Requires Interaction** - Can't script commands as easily

---

## 🎓 Tips

- **Bookmark the Panel**: Keep `/safe-server panel` handy
- **Use Whitelist Command**: Fastest way to add trusted users
- **Check Status Often**: Use **[📊 View Status]** button to verify config
- **Mobile Works Great**: All buttons work perfectly on mobile Discord

---

## 📱 Mobile Experience

The 3-command design is **optimized for mobile**:
- Large, tappable buttons
- Clear visual hierarchy
- No complex command syntax to type
- Modals work perfectly on mobile keyboards

---

## 🔄 Migration from 14-Command Version

If you were using the old 14-command version:

**Nothing changes functionally!** All the same features are available, just accessed through buttons instead of separate commands.

**Your existing configuration is preserved** - all settings, whitelists, and restrictions remain intact.

---

## 📚 Full Documentation

For complete details, see:
- **Setup Guide**: `docs/SAFE_SERVER_SETUP_GUIDE.md`
- **Full Documentation**: `docs/SAFE_SERVER_DOCUMENTATION.md`
- **Architecture**: `docs/SAFE_SERVER_ARCHITECTURE.md`

---

**Version**: 2.0.0 (3-Command Design)  
**Last Updated**: January 2026  
**Reduction**: 79% fewer commands (14 → 3)
