# Moderation System Documentation

## Overview

The Moderation System is a comprehensive Discord bot feature that provides server moderation tools with an integrated appeal system. It allows moderators to ban, kick, and timeout users while giving those users the ability to appeal their punishments through a structured process.

## Features

### Core Moderation Commands
- **Ban**: Permanently or temporarily ban users from the server
- **Unban**: Remove bans from users
- **Kick**: Remove users from the server
- **Timeout**: Temporarily restrict users from interacting
- **Timeout Remove**: Remove timeout restrictions

### Appeal System
- **Ban Appeals**: Users can appeal permanent or temporary bans
- **Timeout Appeals**: Users can appeal timeout restrictions
- **Customizable Questions**: Server admins can set custom appeal questions
- **Appeal Limits**: Configurable maximum appeals per user
- **Appeal Manager Roles**: Designated roles can review and process appeals
- **Mutual Server Integration**: For ban appeals, users can join a mutual server to maintain contact

## Setup Guide

### 1. Initial Configuration

Run the `/moderation-system` command to open the configuration panel.

### 2. Enable the System

Click the **"Enable System"** button at the bottom of the panel. 

**Important**: The bot's role must be positioned just below the server owner role in the role hierarchy. If not, you'll receive an error message with instructions.

### 3. Configure Prefix

Use the select menu to choose **"Edit Prefix"** and set your desired command prefix (default is `-`).

### 4. Enable Appeal Systems

#### For Ban Appeals:
1. Click **"Enable Ban Appeal System"**
2. Select Appeal Manager Roles (roles that can review appeals)
3. Select the Appeal Channel (where appeals will be posted)
4. Enter the Mutual Server Link (optional Discord invite link)
5. Set or customize the 5 appeal questions

#### For Timeout Appeals:
1. Click **"Enable Timeout Appeal System"**
2. Select Appeal Manager Roles
3. Select the Appeal Channel
4. Set or customize the 5 appeal questions

### 5. Configure Additional Settings

Use the select menu to access:
- **View Appeal Questions**: See current questions
- **Edit Appeal Questions**: Modify existing questions
- **Edit Max Appeals Per User**: Set limits (1-10)
- **Edit Appeal Channel**: Change appeal channels
- **Edit Appeal Manager Role**: Add or remove manager roles

## Command Usage

### Ban Command
```
<prefix>ban @user (duration) (reason)
```
**Examples:**
- `-ban @user Spamming` (permanent ban)
- `-ban @user 7d Repeated violations` (7-day ban)
- `-ban @user 30d` (30-day ban, no reason)

**Duration Format:**
- `s` = seconds
- `m` = minutes
- `h` = hours
- `d` = days

### Unban Command
```
<prefix>unban @user
```
**Example:**
- `-unban @user`

### Kick Command
```
<prefix>kick @user (reason)
```
**Example:**
- `-kick @user Breaking rules`

### Timeout Command
```
<prefix>timeout @user (duration) (reason)
```
**Examples:**
- `-timeout @user 10m Spamming` (10-minute timeout)
- `-timeout @user 1h` (1-hour timeout)

### Timeout Remove Command
```
<prefix>timeout remove @user
```
**Example:**
- `-timeout remove @user`

## Appeal Process

### For Banned Users

1. User receives a DM with ban information
2. DM includes:
   - Server name
   - Duration (if temporary)
   - Reason
   - Moderator who banned them
   - Link to mutual server (if configured)
   - **"Appeal To Join"** button

3. User clicks "Appeal To Join" button
4. Modal appears with 5 customizable questions
5. User fills out answers (max 1000 characters per question)
6. Appeal is submitted to the designated appeal channel
7. Appeal managers are notified
8. Manager reviews and clicks **Accept** or **Reject**
9. User receives DM with decision
10. If accepted, user is unbanned and receives server invite link

### For Timed Out Users

1. User receives a DM with timeout information
2. DM includes:
   - Server name
   - Duration
   - Reason
   - Moderator who timed them out
   - **"Appeal To Remove Restriction"** button

3. User clicks the appeal button
4. Modal appears with 5 customizable questions
5. User fills out answers
6. Appeal is submitted to the designated appeal channel
7. Appeal managers review and decide
8. User receives DM with decision
9. If accepted, timeout is removed immediately

### Appeal Limits

- Each user has a maximum number of appeals they can submit
- Configurable per appeal type (ban/timeout)
- Range: 1-10 appeals
- Default: 3 appeals per type

## Default Appeal Questions

### Ban Appeal Questions
1. Why do you think you were banned from the server?
2. Do you accept that you broke a server rule? (Yes / No — explain)
3. Why should the staff give you another chance?
4. What changes will you make if you are unbanned?
5. Is there any extra information or proof you want to share?

### Timeout Appeal Questions
1. Why do you think you were timed out?
2. Do you believe the timeout was fair? Why or why not?
3. Do you understand the rule you broke? (Yes / No — explain if yes)
4. What will you do to avoid getting timed out again?
5. Is there anything else you want the moderators to know?

## Database Schemas

### ModerationSystem Schema
Stores server-wide moderation configuration including:
- System enabled status
- Command prefix
- Ban appeal system settings
- Timeout appeal system settings
- Appeal questions
- Manager roles
- Appeal channels
- Max appeals per user

### ModerationAppeal Schema
Stores individual appeal records including:
- User information
- Appeal type (ban/timeout)
- Moderator information
- Reason and duration
- User's answers to questions
- Appeal status (pending/accepted/rejected)
- Resolution details

### UserAppealCount Schema
Tracks appeal usage per user:
- Ban appeal count
- Timeout appeal count

## Permissions Required

### For Moderators
- **Ban Members**: Required for ban/unban commands
- **Kick Members**: Required for kick command
- **Moderate Members**: Required for timeout commands

### For Bot
- **Ban Members**: To execute bans/unbans
- **Kick Members**: To execute kicks
- **Moderate Members**: To execute timeouts
- **Send Messages**: To send DMs and channel messages
- **Embed Links**: To send formatted embeds
- **Manage Channels**: To create invite links for accepted appeals

## Troubleshooting

### Bot Role Position Error
**Problem**: Cannot enable system
**Solution**: Move the bot's role to just below the server owner role in Server Settings > Roles

### Appeals Not Appearing
**Problem**: Appeals aren't showing in the channel
**Solution**: 
- Verify the appeal channel is set correctly
- Check bot has permission to send messages in that channel
- Ensure the appeal system is enabled

### Users Can't Receive DMs
**Problem**: Users don't receive ban/timeout notifications
**Solution**: This is a Discord limitation. Users must have DMs enabled from server members.

### Appeal Button Not Working
**Problem**: Button doesn't respond
**Solution**:
- Check if user has reached maximum appeals
- Verify appeal system is enabled
- Ensure bot is online and responsive

## Best Practices

1. **Set Clear Appeal Questions**: Make questions specific and relevant to your server rules
2. **Choose Trusted Appeal Managers**: Only give appeal manager roles to trusted staff
3. **Monitor Appeal Channels**: Regularly check and respond to appeals
4. **Document Decisions**: Keep records of why appeals were accepted or rejected
5. **Update Max Appeals**: Adjust limits based on your server's needs
6. **Use Mutual Server**: For ban appeals, a mutual server helps maintain communication
7. **Regular Reviews**: Periodically review and update appeal questions

## Files Structure

```
schemas/
├── moderationSystemSchema.js      # Main configuration schema
├── moderationAppealSchema.js      # Appeal records schema
└── userAppealCountSchema.js       # Appeal count tracking

slash-commands/
└── moderation-system.js           # Main command file

interactions/
├── moderation-system-toggle.js    # System enable/disable
├── moderation-enable-appeal.js    # Enable appeal systems
├── moderation-select-roles.js     # Role selection handler
├── moderation-select-channel.js   # Channel selection handler
├── moderation-modals.js           # Modal handlers
├── moderation-settings-menu.js    # Settings menu handler
├── moderation-edit-buttons.js     # Edit button handlers
├── moderation-role-management.js  # Role management handlers
├── moderation-appeal-buttons.js   # Appeal button handlers
└── moderation-appeal-submit.js    # Appeal submission handler

events/
└── moderationMessageCreate.js     # Prefix command handler

handler/
└── moderationHelpers.js           # Helper functions
```

## Support

For issues or questions:
1. Check this documentation
2. Review the troubleshooting section
3. Verify all permissions are correctly set
4. Check bot logs for error messages
5. Ensure all schemas are properly loaded

## Version History

- **v1.0.0**: Initial release with full moderation and appeal system
