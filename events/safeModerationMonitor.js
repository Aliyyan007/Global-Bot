/**
 * Safe Moderation Monitoring Events
 * Listens to role and member updates to detect violations
 */

const safeModerationSchema = require('../schemas/safeModerationSchema');
const logger = require('../handler/safeModerationLogger');
const log = logger.scope('SafeModMonitor');

module.exports = {
    name: 'safeModerationMonitor',
    
    /**
     * Handle role updates (position changes, permission changes)
     */
    async handleRoleUpdate(client, oldRole, newRole) {
        // Only check if it's the bot's role or an admin role
        const guild = newRole.guild;
        const botMember = await guild.members.fetchMe().catch(() => null);
        if (!botMember) return;

        const botRole = botMember.roles.highest;
        const isBotRole = newRole.id === botRole.id;
        const wasAdminRole = oldRole.permissions.has('Administrator');
        const isAdminRole = newRole.permissions.has('Administrator');

        // Check if this affects Safe Moderation
        if (isBotRole || wasAdminRole || isAdminRole) {
            log.debug(`[SafeModMonitor] Role update detected: ${newRole.name}`);
            
            const config = await safeModerationSchema.findOne({ guildID: guild.id });
            if (config && config.enabled && client.safeModerationValidator) {
                // Trigger immediate check
                await client.safeModerationValidator.checkAndHandleState(guild, config);
            }
        }
    },

    /**
     * Handle role deletion
     */
    async handleRoleDelete(client, role) {
        const guild = role.guild;
        const wasAdminRole = role.permissions.has('Administrator');

        if (wasAdminRole) {
            log.debug(`[SafeModMonitor] Admin role deleted: ${role.name}`);
            
            const config = await safeModerationSchema.findOne({ guildID: guild.id });
            if (config && config.enabled && client.safeModerationValidator) {
                // Trigger immediate check (hierarchy may have changed)
                await client.safeModerationValidator.checkAndHandleState(guild, config);
            }
        }
    },

    /**
     * Handle guild member updates (role assignments)
     */
    async handleGuildMemberUpdate(client, oldMember, newMember) {
        // Only check if it's the bot
        if (newMember.id !== client.user.id) return;

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        // Check if roles changed
        if (oldRoles.size !== newRoles.size || 
            !oldRoles.every(role => newRoles.has(role.id))) {
            
            log.debug(`[SafeModMonitor] Bot roles changed`);
            
            const config = await safeModerationSchema.findOne({ guildID: newMember.guild.id });
            if (config && config.enabled && client.safeModerationValidator) {
                // Trigger immediate check
                await client.safeModerationValidator.checkAndHandleState(newMember.guild, config);
            }
        }
    }
};
