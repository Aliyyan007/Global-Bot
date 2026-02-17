/**
 * Safe-Server: Role Deletion Detection
 * Detects mass role deletion attempts
 */

const client = require("../../index")
const { Events, AuditLogEvent } = require("discord.js")
const { handleError } = require("../../handler/errorHandler")

client.on(Events.GuildRoleDelete, async (role) => {
    try {
        if (!client.safeServerTracker || !client.safeServerManager) return
        
        const guild = role.guild
        
        // Get Safe-Server config
        const safeServerSchema = require('../../schemas/safeServerSchema')
        const config = await safeServerSchema.findOne({ guildID: guild.id })
        
        if (!config || !config.enabled) return
        
        // Fetch audit log to identify executor
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.RoleDelete,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        // Find the matching audit log entry
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === role.id && 
            (now - entry.createdTimestamp) < 5000
        )
        
        if (!auditEntry || !auditEntry.executor) return
        
        const executor = auditEntry.executor
        
        // Ignore bot actions
        if (executor.bot) return
        
        // Fetch executor as guild member
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (!executorMember) return
        
        // Check if executor is guild owner
        if (executor.id === guild.ownerId) return
        
        // Check if executor is whitelisted
        const executorRoles = executorMember.roles.cache.map(r => r.id)
        if (client.safeServerTracker.isWhitelisted(guild.id, executor.id, executorRoles, config)) {
            return
        }
        
        // Record the action
        await client.safeServerTracker.recordAction(guild.id, executor.id, 'roleDelete')
        
        // Check if limit exceeded
        const limitCheck = await client.safeServerTracker.checkLimit(guild.id, executor.id, 'roleDelete', config)
        
        if (limitCheck.exceeded) {
            console.log(`[SafeServer] Role deletion limit exceeded by ${executor.tag} in ${guild.name}`)
            
            // Apply restriction
            const result = await client.safeServerManager.restrictModerator(
                guild,
                executorMember,
                'roleDelete',
                limitCheck,
                config
            )
            
            if (result.success) {
                console.log(`[SafeServer] Restricted ${executor.tag} for excessive role deletions`)
            } else {
                console.error(`[SafeServer] Failed to restrict ${executor.tag}:`, result.message)
            }
        }
        
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'SafeServer RoleDelete Event' })
    }
})
