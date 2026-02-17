/**
 * Safe-Server: Channel Creation Detection
 * Detects channel creation spam
 */

const client = require("../../index")
const { Events, AuditLogEvent } = require("discord.js")
const { handleError } = require("../../handler/errorHandler")

client.on(Events.ChannelCreate, async (channel) => {
    try {
        if (!client.safeServerTracker || !client.safeServerManager) return
        
        const guild = channel.guild
        
        // Get Safe-Server config
        const safeServerSchema = require('../../schemas/safeServerSchema')
        const config = await safeServerSchema.findOne({ guildID: guild.id })
        
        if (!config || !config.enabled) return
        
        // Fetch audit log to identify executor
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelCreate,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        // Find the matching audit log entry
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === channel.id && 
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
        await client.safeServerTracker.recordAction(guild.id, executor.id, 'channelCreate')
        
        // Check if limit exceeded
        const limitCheck = await client.safeServerTracker.checkLimit(guild.id, executor.id, 'channelCreate', config)
        
        if (limitCheck.exceeded) {
            console.log(`[SafeServer] Channel creation limit exceeded by ${executor.tag} in ${guild.name}`)
            
            // Apply restriction
            const result = await client.safeServerManager.restrictModerator(
                guild,
                executorMember,
                'channelCreate',
                limitCheck,
                config
            )
            
            if (result.success) {
                console.log(`[SafeServer] Restricted ${executor.tag} for excessive channel creation`)
            } else {
                console.error(`[SafeServer] Failed to restrict ${executor.tag}:`, result.message)
            }
        }
        
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'SafeServer ChannelCreate Event' })
    }
})
