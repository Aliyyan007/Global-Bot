# Safe Server - Test Commands & Verification

## Pre-Test Setup

1. **Enable Moderation System First**
   ```
   /moderation-system
   ```
   - Click "Enable System"
   - Set up log channel
   - Set up manager roles

2. **Verify Bot Permissions**
   - ✅ Manage Roles
   - ✅ View Audit Log
   - ✅ Manage Channels (for testing)
   - ✅ Ban Members (for testing)
   - ✅ Kick Members (for testing)

## Test 1: Command Execution ✅

**Command:** `/safe-server`

**Expected Result:**
- Control panel appears
- Shows "Safe Server Settings" in description
- Lists all 12 permissions with default settings
- Shows 4 buttons (all disabled except Enable/Disable)
- Shows 1 select menu (permission selection)
- Status shows "Disabled" in footer

**Verify:**
- [ ] Command executes without errors
- [ ] Embed displays correctly
- [ ] All 12 permissions visible
- [ ] Buttons present
- [ ] Select menu present

## Test 2: Enable System Flow ✅

**Step 1:** Click "Enable Safe Server" button

**Expected Result:**
- Ephemeral message: "Please enable moderation system first" (if not enabled)
- OR: Ephemeral message asking to set log channel

**Step 2:** Click "Edit Log Channel"

**Expected Result:**
- Channel select menu appears
- Can select a text channel

**Step 3:** Select a channel

**Expected Result:**
- Success message
- Control panel updates showing selected channel

**Step 4:** Click "Edit Manager Roles"

**Expected Result:**
- Role select menu appears (multi-select, min 1, max 10)

**Step 5:** Select 1+ roles

**Expected Result:**
- Success message
- Control panel updates showing selected roles

**Step 6:** Click "Enable Safe Server" again

**Expected Result:**
- System enables
- All buttons become clickable
- Select menu becomes clickable
- Status changes to "Enabled"
- Control panel updates

**Verify:**
- [ ] Moderation system check works
- [ ] Log channel required
- [ ] Manager roles required (min 1)
- [ ] System enables successfully
- [ ] UI updates correctly

## Test 3: Permission Configuration ✅

**Step 1:** Select "Ban Members" from dropdown

**Expected Result:**
- Second select menu appears (Settings)
- New "Enable/Disable" button appears
- Control panel updates

**Step 2:** Click settings menu → "Edit Cooldown"

**Expected Result:**
- Ephemeral message with cooldown options:
  - 6h
  - 12h
  - 1 day
  - 7 days
  - 30 days
  - Owner/Admin Approval
  - Custom

**Step 3:** Select "1 day"

**Expected Result:**
- Success message
- Control panel updates showing "1 day" cooldown

**Step 4:** Click settings menu → "Edit No. of Actions"

**Expected Result:**
- Modal appears
- Input field for number (1-99)

**Step 5:** Enter "5"

**Expected Result:**
- Success message
- Control panel updates showing "5" actions

**Step 6:** Click settings menu → "Edit Time between Actions"

**Expected Result:**
- Same options as cooldown (except Approval)

**Step 7:** Select "6h"

**Expected Result:**
- Success message
- Control panel updates

**Step 8:** Click settings menu → "Edit Restriction Type"

**Expected Result:**
- Select menu with:
  - Global Restriction (with status)
  - Specific Role/Member
- Reset button

**Step 9:** Select "Global Restriction"

**Expected Result:**
- Success message
- Control panel shows "Global"

**Verify:**
- [ ] Permission selection works
- [ ] Settings menu appears
- [ ] Enable/Disable button appears
- [ ] All settings options work
- [ ] Control panel updates after each change
- [ ] Custom duration modal works
- [ ] Action count modal works

## Test 4: Toggle Permission ✅

**Step 1:** Select a permission

**Step 2:** Click "Enable/Disable" button

**Expected Result:**
- Permission toggles
- ✅ changes to ❌ (or vice versa)
- Control panel updates

**Verify:**
- [ ] Toggle works
- [ ] Emoji changes
- [ ] Control panel updates

## Test 5: Bot Protection ✅

**Step 1:** Click "Enable Bot Protection"

**Expected Result:**
- Button changes to "Disable Bot Protection"
- Control panel shows "Bot Protection: Enabled"

**Step 2:** Add a bot with dangerous permissions (or simulate)

**Expected Result:**
- Bot's dangerous permissions removed
- Notification sent to log channel
- Approve/Reject buttons in log channel

**Verify:**
- [ ] Bot protection toggles
- [ ] Control panel updates
- [ ] (If tested) Bot quarantine works

## Test 6: Restriction Application (Advanced) ⚠️

**Setup:**
1. Enable Safe Server
2. Configure Ban Members: 3 actions in 6h
3. Have a test moderator account

**Test:**
1. Test moderator bans 4 members quickly

**Expected Result:**
- After 4th ban:
  - Restricted role created: `@ModeratorRole ⏱`
  - Original role removed
  - Restricted role added
  - Notification sent to log channel
  - Moderator can't ban anymore

**Verify:**
- [ ] Action tracking works
- [ ] Limit detection works
- [ ] Role creation works
- [ ] Role swap works
- [ ] Notification sent
- [ ] Permission actually restricted

## Test 7: Approval Mode ⚠️

**Setup:**
1. Configure a permission with "Owner/Admin Approval" cooldown

**Test:**
1. Trigger the limit

**Expected Result:**
- Restriction applied
- Notification sent to log channel with Approve/Reject buttons
- Manager roles mentioned

**Test Approval:**
1. Click "Approve" button

**Expected Result:**
- Restriction removed
- Original role restored
- Success message

**Verify:**
- [ ] Approval mode works
- [ ] Buttons appear
- [ ] Manager roles mentioned
- [ ] Approval removes restriction
- [ ] Rejection keeps restriction

## Test 8: Multiple Restrictions ⚠️

**Test:**
1. Trigger limit for Ban Members
2. Trigger limit for Kick Members

**Expected Result:**
- Same restricted role updated
- Both permissions removed from role
- Moderator can't ban OR kick

**Verify:**
- [ ] Multiple restrictions on same role
- [ ] Role updates correctly
- [ ] All restricted permissions removed

## Test 9: Restoration ⚠️

**Test:**
1. Wait for cooldown to expire (or set short cooldown for testing)

**Expected Result:**
- After cooldown:
  - Restricted role removed
  - Original role restored
  - Notification sent
  - Moderator can use permission again

**Verify:**
- [ ] Auto-restoration works
- [ ] Role swap reversed
- [ ] Notification sent
- [ ] Permission restored

## Test 10: Voice Monitoring ⚠️

**Setup:**
1. Configure "Disconnecting Members from VC"
2. Set low limit (e.g., 2 actions in 5 minutes)

**Test:**
1. Disconnect 3 members from voice

**Expected Result:**
- Restriction applied after 3rd disconnect

**Verify:**
- [ ] Voice actions tracked
- [ ] Audit log read correctly
- [ ] Restriction applied

## Test 11: Message Monitoring ⚠️

**Setup:**
1. Configure "@everyone / @here Spam"
2. Set low limit (e.g., 2 actions in 1 minute)

**Test:**
1. Send 3 messages with @everyone

**Expected Result:**
- Restriction applied after 3rd mention
- Messages may be deleted

**Verify:**
- [ ] @everyone mentions tracked
- [ ] Restriction applied
- [ ] Messages handled

## Quick Test Checklist

### Basic Functionality
- [ ] Command executes
- [ ] Control panel displays
- [ ] Enable system flow works
- [ ] Log channel sets
- [ ] Manager roles set
- [ ] System enables

### Configuration
- [ ] Permission selection works
- [ ] Settings menu appears
- [ ] Cooldown options work
- [ ] Action count modal works
- [ ] Time between actions works
- [ ] Restriction type works
- [ ] Toggle permission works

### Advanced Features
- [ ] Bot protection toggles
- [ ] Restriction application (if tested)
- [ ] Approval mode (if tested)
- [ ] Multiple restrictions (if tested)
- [ ] Auto-restoration (if tested)

## Known Issues to Check

1. **Embed Field Length**
   - ✅ Fixed: Split into multiple fields

2. **Ephemeral Flag Warning**
   - ⚠️ Use `flags: MessageFlags.Ephemeral` instead of `ephemeral: true`

3. **Role Hierarchy**
   - Bot's role must be above target roles

4. **Audit Log Permissions**
   - Bot needs View Audit Log permission

## Performance Tests

### Memory Usage
```javascript
// Check action tracker size
console.log(client.safeServerTracker.actions.size)
```

### Audit Log Frequency
- Monitor console for audit log checks
- Should be every 10 seconds per guild

### Database Queries
- Monitor for excessive queries
- Should cache configs

## Error Scenarios to Test

1. **No Moderation System**
   - Should show error message

2. **No Log Channel**
   - Should require setting

3. **No Manager Roles**
   - Should require at least 1

4. **Bot Missing Permissions**
   - Should fail gracefully with error message

5. **Role Hierarchy Issue**
   - Should show clear error about role position

## Success Criteria

✅ **Basic Tests (Required)**
- Command executes without errors
- Control panel displays correctly
- Enable flow works
- Configuration works
- UI updates properly

✅ **Advanced Tests (Optional but Recommended)**
- Restriction application works
- Role creation works
- Audit log monitoring works
- Auto-restoration works

## Notes

- Some tests require actual Discord actions (bans, kicks, etc.)
- Use test server with test accounts
- Set low limits for easier testing
- Monitor console for errors
- Check log channel for notifications

## After Testing

If all basic tests pass:
1. ✅ System is ready for production
2. Configure real limits
3. Monitor for a few days
4. Adjust as needed

If tests fail:
1. Check console errors
2. Verify bot permissions
3. Check role hierarchy
4. Review configuration
5. Report issues with error logs
