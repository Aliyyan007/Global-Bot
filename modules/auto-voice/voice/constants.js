/**
 * Constants for the Auto Voice Channel system
 * Requirements: 9.3 - Feature list for toggling
 */

// All toggleable features for the voice system
const ALL_FEATURES = [
  'name',           // Change channel name
  'limit',          // Set user limit
  'status',         // Set channel status
  'lock',           // Lock/unlock channel
  'claim',          // Claim abandoned channel
  'reject',         // Reject users from channel
  'permit',         // Permit specific users
  'ghost',          // Hide channel from non-members
  'lfm',            // Looking for Members announcements
  'text',           // Create linked text channel
  'bitrate',        // Change audio bitrate
  'invite',         // Send DM invitations
  'transfer',       // Transfer ownership
  'nsfw',           // Toggle NSFW
  'request',        // Request to join
  'interface',      // Control panel interface
  'interfaceping',  // Ping in interface
  'autotext',       // Auto-create text channel
  'logging',        // Activity logging
  'region'          // Voice region selection
];

// Available voice regions with metadata
const VOICE_REGIONS = [
  { id: 'automatic', name: 'Automatic', emoji: '🌐' },
  { id: 'brazil', name: 'Brazil', emoji: '🇧🇷' },
  { id: 'hongkong', name: 'Hong Kong', emoji: '🇭🇰' },
  { id: 'india', name: 'India', emoji: '🇮🇳' },
  { id: 'japan', name: 'Japan', emoji: '🇯🇵' },
  { id: 'rotterdam', name: 'Rotterdam', emoji: '🇳🇱' },
  { id: 'singapore', name: 'Singapore', emoji: '🇸🇬' },
  { id: 'southkorea', name: 'South Korea', emoji: '🇰🇷' },
  { id: 'southafrica', name: 'South Africa', emoji: '🇿🇦' },
  { id: 'sydney', name: 'Sydney', emoji: '🇦🇺' },
  { id: 'us-central', name: 'US Central', emoji: '🇺🇸' },
  { id: 'us-east', name: 'US East', emoji: '🇺🇸' },
  { id: 'us-south', name: 'US South', emoji: '🇺🇸' },
  { id: 'us-west', name: 'US West', emoji: '🇺🇸' }
];

// Cooldown duration in hours for rate-limited features
const COOLDOWN_HOURS = 6;

// Default channel settings
const DEFAULT_SETTINGS = {
  channelNameTemplate: "🗣️ {username}'s Voice",
  defaultLimit: 0,
  defaultBitrate: 64000,
  editable: true
};

// Bitrate limits (in kbps)
const BITRATE_LIMITS = {
  min: 8,
  max: 384
};

// Bitrate limits by server boost tier (in kbps)
// Tier 0: No boosts, Tier 1: 2 boosts, Tier 2: 7 boosts, Tier 3: 14 boosts
const BITRATE_LIMITS_BY_TIER = {
  0: 96,   // No boosts
  1: 128,  // Level 1 (2 boosts)
  2: 256,  // Level 2 (7 boosts)
  3: 384   // Level 3 (14 boosts)
};

/**
 * Get the maximum bitrate for a given premium tier
 * @param {number} premiumTier - The guild's premium tier (0-3)
 * @returns {number} Maximum bitrate in kbps
 */
function getMaxBitrateForTier(premiumTier) {
  return BITRATE_LIMITS_BY_TIER[premiumTier] ?? BITRATE_LIMITS_BY_TIER[0];
}

// User limit range
const USER_LIMIT = {
  min: 0,
  max: 99
};

// Channel name edit cooldown in seconds
const NAME_EDIT_COOLDOWN_SECONDS = 60;

module.exports = {
  ALL_FEATURES,
  VOICE_REGIONS,
  COOLDOWN_HOURS,
  DEFAULT_SETTINGS,
  BITRATE_LIMITS,
  BITRATE_LIMITS_BY_TIER,
  getMaxBitrateForTier,
  USER_LIMIT,
  NAME_EDIT_COOLDOWN_SECONDS
};
