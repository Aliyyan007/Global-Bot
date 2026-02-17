# Interface Voice Command Documentation

## Overview
The `/interface-voice` command allows administrators to send a universal voice control panel interface to any text channel. This interface enables users to control their temporary voice channels from anywhere in the server, not just from within their voice channel.

## Command Details

### Command Name
`/interface-voice`

### Required Permissions
- `Manage Channels` permission

### Parameters
- **channel** (required): The text channel where the interface will be sent
  - Type: Text Channel
  - Description: The interface will be posted in this channel

## How It Works

### Universal Control Panel
The interface sent by this command is a "universal" control panel that works for all users who have temporary voice channels created by the bot. When a user interacts with the panel:

1. The bot automatically detects which temporary voice channel belongs to that user
2. The interaction is processed for their specific channel
3. All features work exactly as they do in the regular voice channel control panel

### Features Available
Users can access all standard voice channel controls through this interface:

#### Channel Settings
- **Name**: Change the channel name
- **Limit**: Set user limit (0-99)
- **Status**: Set channel status
- **Bitrate**: Set audio bitrate
- **LFM**: Send Looking for Members announcement
- **Text Channel**: Create a linked text channel
- **Waiting Room**: Enable/disable waiting room
- **Game**: Set name to current game
- **NSFW**: Toggle NSFW mode
- **Claim**: Claim channel ownership

#### Channel Permissions
- **Lock/Unlock**: Control who can join
- **Permit**: Grant specific users access
- **Reject**: Deny specific users access
- **Invite**: Send DM invitations
- **Ghost/Unghost**: Hide/show channel
- **Transfer**: Transfer ownership
- **Region**: Change voice region

### User Experience
1. User creates a temporary voice channel by joining the "Join to Create" channel
2. User can then use the universal interface from any channel where it's posted
3. If a user doesn't have an active temporary voice channel, they'll receive a message: 
   > ❌ You don't have an active temporary voice channel. Create one by joining the "Join to Create" channel first.

## Usage Example

### Posting the Interface
```
/interface-voice channel:#general
```

This will send the voice control panel to the #general channel, where all users can access it to control their temporary voice channels.

### Use Cases
1. **Central Control Hub**: Post the interface in a dedicated voice-management channel
2. **Convenience**: Allow users to manage their voice channels without switching channels
3. **Accessibility**: Make voice controls available in frequently-visited channels

## Technical Details

### Implementation
- The interface uses placeholder IDs (`UNIVERSAL`) in the component custom IDs
- When a user interacts, the bot resolves these placeholders to the user's actual channel ID
- The resolution happens in the interaction handler before processing the action
- All existing voice channel features are fully supported

### Supported Interactions
- Select menus (voice_settings, voice_permissions)
- Buttons (sticky_note, load_settings, cancel_action)
- Modals (all voice channel modals)

### Limitations
- Users can only control their own temporary voice channels
- Users must have an active temporary voice channel to use the interface
- Administrators with elevated permissions can use the interface for any channel

## Related Commands
- `/auto-voice-manager setup`: Initial setup of the auto-voice system
- `/voice-settings`: Manage saved voice channel preferences
- `/voice-request`: Request to join a voice channel

## Notes
- The interface is user-specific - each user controls only their own channel
- The bot must have permission to send messages in the target channel
- The auto-voice system must be configured before using this command
