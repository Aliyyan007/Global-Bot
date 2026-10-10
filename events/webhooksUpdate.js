const client = require("../index")
const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js")
const { handleError } = require("../handler/errorHandler")
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('WebhookUpdate')

client.on(Events.WebhooksUpdate, async (channel) => {
    try {
        const guild = channel.guild
        const safeModerationSchema = require("../schemas/safeModerationSchema")
        const config = await safeModerationSchema.findOne({ guildID: guild.id })
        
        if (!config || !config.enabled || !config.logWebhook) return
        
        // Check if the log webhook still exists
        try {
            const webhooks = await channel.fetchWebhooks()
            const webhookId = config.logWebhook.split('/').slice(-2)[0] // Extract webhook ID from URL
            const webhookExists = webhooks.has(webhookId)
            
            if (!webhookExists) {
                // Log webhook was deleted
                log.warn(`Log webhook deleted in ${guild.name}`)
                
                // Get audit log to find who deleted it
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.WebhookDelete,
                    limit: 5
                })
                
                // Find the audit entry for our webhook
                const auditEntry = auditLogs.entries.find(entry => 
                    entry.target?.id === webhookId || 
                    entry.target?.channelId === channel.id
                )
                
                if (auditEntry) {
                    const executor = auditEntry.executor
                    
                    log.warn(`Log webhook deleted by ${executor.tag}`)
                    
                    // Send DM to the person who deleted it
                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⚠️ Safe-Moderation Log Webhook Deletion Detected')
                            .setDescription(`You deleted the **Safe-Moderation Log Webhook** in **${guild.name}**.`)
                            .addFields([
                                {
                                    name: '🔒 What Happened',
                                    value: [
                                        `**Webhook Deleted:** Safe-Moderation Logs`,
                                        `**Channel:** ${channel.name}`,
                                        `**Server:** ${guild.name}`,
                                        `**Action:** Webhook will be automatically recreated`
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '⚠️ Important Information',
                                    value: [
                                        '• This webhook is **managed by Safe-Moderation** system',
                                        '• It will be **automatically recreated** to maintain logging',
                                        '• Deleting it does not disable the system',
                                        '• Log webhook is used for restriction notifications'
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '🛡️ How to Properly Disable',
                                    value: [
                                        '1. Use `/safe-moderation` command',
                                        '2. Go to **Settings** section',
                                        '3. Remove or change the log webhook',
                                        '4. Or disable Safe-Moderation entirely'
                                    ].join('\n'),
                                    inline: false
                                }
                            ])
                            .setFooter({ text: 'Safe-Moderation - Log Webhook Protection' })
                            .setTimestamp()
                        
                        await executor.send({ embeds: [dmEmbed] })
                        log.debug(`Sent DM to ${executor.tag} about log webhook deletion`)
                    } catch (dmError) {
                        log.debug(`Could not send DM to ${executor.tag}: ${dmError.message}`)
                    }
                }
                
                // Auto-recreate the log webhook
                try {
                    log.info('Auto-recreating log webhook...')
                    
                    // Check if bot has permission to create webhooks
                    const botPermissions = channel.permissionsFor(client.user.id)
                    if (!botPermissions || !botPermissions.has('ManageWebhooks')) {
                        log.error(`Missing MANAGE_WEBHOOKS permission in channel ${channel.name}`)
                        return
                    }
                    
                    const newWebhook = await channel.createWebhook({
                        name: 'Safe-Moderation Logs',
                        avatar: guild.iconURL(),
                        reason: 'Safe-Moderation: Auto-recreating deleted log webhook'
                    })
                    
                    // Update config with new webhook URL
                    config.logWebhook = newWebhook.url
                    await config.save()
                    
                    // Invalidate config cache so /safe-moderation shows correct webhook
                    if (client.safeModerationConfigCache) {
                        client.safeModerationConfigCache.invalidate(guild.id)
                    }
                    
                    log.info(`Log webhook recreated: ${newWebhook.name} (${newWebhook.id})`)
                    
                    // Send notification using the new webhook
                    if (auditEntry) {
                        const notificationEmbed = new EmbedBuilder()
                            .setColor('#FF6B35')
                            .setTitle('🔄 Log Webhook Recreated')
                            .setDescription('The Safe-Moderation log webhook was deleted and has been automatically recreated.')
                            .addFields([
                                { name: '👤 Deleted By', value: `<@${auditEntry.executor.id}>`, inline: true },
                                { name: '⏰ Deleted At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            ])
                            .setFooter({ text: 'This webhook is protected by Safe-Moderation' })
                            .setTimestamp()
                        
                        await newWebhook.send({ embeds: [notificationEmbed] })
                    }
                } catch (recreateError) {
                    log.error(`Failed to recreate log webhook: ${recreateError.message}`)
                }
            }
        } catch (webhookCheckError) {
            // Webhook check failed, might be permissions issue
            log.error('Error checking webhook:', webhookCheckError.message)
        }
        
    } catch (error) {
        handleError(error, { 
            ownerId: client.config.discord.ownerId, 
            context: 'WebhooksUpdate Event' 
        })
    }
})
