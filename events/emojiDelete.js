const client = require("../index")
const { Events, AuditLogEvent } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildEmojiDelete, async (emoji) => {
    try {
        // ============================================================
        // PROTECTION SYSTEM (Auto-recreate if deleted by bot)
        // ============================================================
        const guild = emoji.guild
        const safeModerationSchema = require("../schemas/safeModerationSchema")
        const config = await safeModerationSchema.findOne({ guildID: guild.id })
        
        if (config && config.enabled) {
            try {
                // Get audit log to find who deleted it (increased limit for rapid deletions)
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.EmojiDelete,
                    limit: 10 // Increased to handle rapid deletions by nuke bots
                })
                
                const auditEntry = auditLogs.entries.find(entry => entry.target?.id === emoji.id)
                if (auditEntry) {
                    // SERVER RECOVERY SYSTEM - Store deletion for manual recovery
                    if (client.serverRecoveryHandler) {
                        const recoveryResult = await client.serverRecoveryHandler.handleEmojiDelete(
                            emoji,
                            auditEntry.executor,
                            config
                        )
                        
                        if (recoveryResult && recoveryResult.success) {
                            console.log('[Server Recovery] ✅ Emoji deletion logged for recovery')
                        } else {
                            console.log('[Server Recovery] ⚠️ Recovery not triggered:', recoveryResult?.reason || 'Unknown reason')
                        }
                    }
                    
                    // Trigger protection handler
                    if (client.emojiStickerProtection) {
                        await client.emojiStickerProtection.recreateDeletedEmoji(
                            emoji,
                            auditEntry.executor,
                            guild,
                            config
                        )
                    }
                }
            } catch (protectionError) {
                console.error('[Protection] Emoji recreation error:', protectionError)
            }
        }
        
        // ============================================================
        // EXISTING CLEANUP LOGIC (if any)
        // ============================================================
        // Add any existing cleanup logic here
        
    } catch (error) {
        handleError(error, { 
            ownerId: client.config.discord.ownerId, 
            context: 'GuildEmojiDelete Event' 
        })
    }
})