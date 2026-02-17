/**
 * Safe-Server: Bot Addition Detection
 * Detects when bots are added and quarantines them if protection is enabled
 */

const client = require("../../index")
const { Events, AuditLogEvent } = require("discord.js")
const { handleError } = require("../../handler/errorHandler")

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        if (!client.safeServerTracker || !client.safeServerManager) return
        
        // Only process bot additions
        if (!member.user.bot) return
        
        const guild = member.guild
        
        // Get Safe-Server config
        const safeServerSchema = require('../../schemas/safeServerSchema')
        const config = await safeServerSchema.findOne({ guildID: guild.id })
        
        if (!config || !config.enabled || !config.botProtection.enabled) return
        
        // Wait a moment to let audit log populate
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Fetch audit log to identify who added the bot
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.BotAdd,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        // Find the matching audit log entry
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === member.id && 
            (now - entry.createdTimestamp) < 10000 // 10 second window for bot adds
        )
        
        if (!auditEntry || !auditEntry.executor) return
        
        const executor = auditEntry.executor
        
        // Check if executor is guild owner
        if (executor.id === guild.ownerId) {
            console.log(`[SafeServer] Bot ${member.user.tag} added by owner, skipping quarantine`)
            return
        }
        
        // Fetch executor as guild member
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (!executorMember) return
        
        // Check if executor is whitelisted
        const executorRoles = executorMember.roles.cache.map(r => r.id)
        if (client.safeServerTracker.isWhitelisted(guild.id, executor.id, executorRoles, config)) {
            console.log(`[SafeServer] Bot ${member.user.tag} added by whitelisted user, skipping quarantine`)
            return
        }
        
        // Record the action
        await client.safeServerTracker.recordAction(guild.id, executor.id, 'botAdd')
        
        // Check if limit exceeded
        const limitCheck = await client.safeServerTracker.checkLimit(guild.id, executor.id, 'botAdd', config)
        
        // Quarantine the bot if protection is enabled
        if (config.botProtection.requireApproval) {
            console.log(`[SafeServer] Quarantining bot ${member.user.tag} added by ${executor.tag}`)
            
            const result = await client.safeServerManager.quarantineBot(
                guild,
                member,
                executor.id,
                config
            )
            
            if (result.success) {
                console.log(`[SafeServer] Bot ${member.user.tag} quarantined successfully`)
            } else {
                console.error(`[SafeServer] Failed to quarantine bot:`, result.message)
            }
        }
        
        // If limit exceeded, restrict the executor
        if (limitCheck.exceeded) {
            console.log(`[SafeServer] Bot addition limit exceeded by ${executor.tag} in ${guild.name}`)
            
            const result = await client.safeServerManager.restrictModerator(
                guild,
                executorMember,
                'botAdd',
                limitCheck,
                config
            )
            
            if (result.success) {
                console.log(`[SafeServer] Restricted ${executor.tag} for excessive bot additions`)
            } else {
                console.error(`[SafeServer] Failed to restrict ${executor.tag}:`, result.message)
            }
        }
        
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'SafeServer GuildMemberAdd Event' })
    }
})
