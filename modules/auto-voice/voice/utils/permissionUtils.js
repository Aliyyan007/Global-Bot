/**
 * Permission Utilities
 * Handles permission checks for voice channel management
 */

const { PermissionFlagsBits } = require('discord.js');

/**
 * Checks if a member has elevated permissions (Admin, Ban, or Kick)
 * @param {GuildMember} member - The guild member to check
 * @returns {boolean} - True if member has elevated permissions
 */
function hasElevatedPermissions(member) {
  if (!member || !member.permissions) return false;
  
  // Check if member is server owner
  if (member.guild.ownerId === member.id) return true;
  
  // Check for elevated permissions
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.BanMembers) ||
         member.permissions.has(PermissionFlagsBits.KickMembers);
}

/**
 * Checks if a user is the owner of a voice channel or has elevated permissions
 * @param {string} userId - The user ID to check
 * @param {string} ownerId - The owner ID of the voice channel
 * @param {GuildMember} member - The guild member object
 * @returns {boolean} - True if user is owner or has elevated permissions
 */
function canManageChannel(userId, ownerId, member) {
  // Check if user is the owner
  if (userId === ownerId) return true;
  
  // Check if user has elevated permissions
  return hasElevatedPermissions(member);
}

module.exports = {
  hasElevatedPermissions,
  canManageChannel
};
