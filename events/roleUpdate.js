const { Events } = require('discord.js');
const client = require('../index');
const { handleError } = require('../handler/errorHandler');

client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
    try {
        // Safe Moderation Validator - Monitor role changes
        if (client.safeModerationValidator) {
            const monitor = require('./safeModerationMonitor');
            await monitor.handleRoleUpdate(client, oldRole, newRole);
        }

        // Bot Shield - Protect quarantine role position and permissions
        if (client.botShieldHandler) {
            await client.botShieldHandler.handleQuarantineRolePositionChange(oldRole, newRole);
        }
    } catch (error) {
        handleError(error, { 
            ownerId: client.config.discord.ownerId, 
            context: 'GuildRoleUpdate Event - Safe Moderation Monitor' 
        });
    }
});
