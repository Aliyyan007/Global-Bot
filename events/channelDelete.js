const client = require("../index")
const { Events, AuditLogEvent } = require("discord.js")
const stickyCommandSchema = require("../schemas/stickyCommandSchema")
const { handleError } = require("../handler/errorHandler")
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('ChannelDelete')

client.on(Events.ChannelDelete, async (channel) => {
    try {
        // ============================================================
        // PROTECTION SYSTEM (Dual approach for reliability)
        // ============================================================
        const guild = channel.guild
        const safeModerationSchema = require("../schemas/safeModerationSchema")
        const { EmbedBuilder } = require("discord.js")
        const config = await safeModerationSchema.findOne({ guildID: guild.id })
        
        // ============================================================
        // SERVER PANEL CHANNEL PROTECTION (Auto-recreate if deleted)
        // ============================================================
        if (config && config.serverPanel?.enabled && config.serverPanel?.channelId === channel.id) {
            try {
                // Get audit log to find who deleted it
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.ChannelDelete,
                    limit: 1
                })
                
                const auditEntry = auditLogs.entries.first()
                if (auditEntry && auditEntry.target.id === channel.id) {
                    const executor = auditEntry.executor
                    
                    log.warn(`[ChannelDelete] 🚨 Server Panel channel deleted by ${executor.tag}`)
                    
                    // Send DM to the person who deleted it
                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⚠️ Server Panel Channel Deletion Detected')
                            .setDescription(`You deleted the **Server Panel Channel** in **${guild.name}**.`)
                            .addFields([
                                {
                                    name: '🔒 What Happened',
                                    value: [
                                        `**Channel Deleted:** ${channel.name}`,
                                        `**Server:** ${guild.name}`,
                                        `**Action:** Channel will be automatically recreated`
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '⚠️ Important Information',
                                    value: [
                                        '• This channel is **managed by Safe-Moderation** system',
                                        '• It will be **automatically recreated** to maintain protection',
                                        '• Deleting it does not disable the system',
                                        '• Server Panel is used for recovery messages and bot approvals'
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '🛡️ How to Properly Disable',
                                    value: [
                                        '1. Use `/safe-moderation` command',
                                        '2. Click **Disable Server Panel** button',
                                        '3. This will properly disable the system and remove the channel'
                                    ].join('\n'),
                                    inline: false
                                }
                            ])
                            .setFooter({ text: 'Safe-Moderation - Server Panel Protection' })
                            .setTimestamp()
                        
                        await executor.send({ embeds: [dmEmbed] })
                        log.debug(`[ChannelDelete] ✅ Sent DM to ${executor.tag} about server panel channel deletion`)
                    } catch (dmError) {
                        log.debug(`[ChannelDelete] ⚠️ Could not send DM to ${executor.tag}: ${dmError.message}`)
                    }
                    
                    // Auto-recreate the server panel channel
                    try {
                        log.info(`[ChannelDelete] 🔄 Auto-recreating server panel channel...`)
                        
                        // CRITICAL: Always use 'server-panel' as name, NOT the deleted channel's name
                        // The deleted channel could be a log channel; the server panel channel must keep its identity
                        const panelName = config.serverPanel?.channelName || 'server-panel'
                        
                        const newChannel = await guild.channels.create({
                            name: panelName,
                            type: channel.type,
                            topic: channel.topic || 'Safe-Moderation Server Panel - Recovery messages, bot approvals, and system notifications',
                            permissionOverwrites: channel.permissionOverwrites?.cache?.map(overwrite => ({
                                id: overwrite.id,
                                allow: overwrite.allow,
                                deny: overwrite.deny
                            })) || [],
                            reason: 'Safe-Moderation: Auto-recreating deleted server panel channel'
                        })
                        
                        // Set position after creation
                        if (channel.position !== undefined && channel.position !== null) {
                            try {
                                await newChannel.setPosition(channel.position, { reason: 'Safe-Moderation: Restoring original position' })
                                log.debug(`[ChannelDelete] ✅ Restored channel position: ${channel.position}`)
                            } catch (posError) {
                                log.error(`[ChannelDelete] ⚠️ Failed to restore channel position:`, posError.message)
                            }
                        }
                        
                        // Create a new webhook in the recreated channel and update config
                        try {
                            const newWebhook = await newChannel.createWebhook({
                                name: 'Safe-Moderation Logs',
                                avatar: guild.iconURL({ size: 256 }),
                                reason: 'Safe-Moderation: Recreating webhook for server panel channel'
                            })
                            config.logWebhook = newWebhook.url
                            config.logChannelId = newChannel.id
                            log.info(`[ChannelDelete] ✅ New webhook created: ${newWebhook.id}`)
                        } catch (whErr) {
                            log.error(`[ChannelDelete] ⚠️ Failed to create webhook:`, whErr.message)
                        }
                        
                        // Update config with new channel ID
                        config.serverPanel.channelId = newChannel.id
                        await config.save()
                        
                        // Invalidate config cache
                        if (client.safeModerationConfigCache) {
                            client.safeModerationConfigCache.invalidate(guild.id)
                        }
                        
                        log.info(`[ChannelDelete] ✅ Server panel channel recreated: ${newChannel.name} (${newChannel.id})`)
                        
                        // Send notification in the new channel about the deletion
                        const notificationEmbed = new EmbedBuilder()
                            .setColor('#FF6B35')
                            .setTitle('🔄 Server Panel Channel Recreated')
                            .setDescription('The Server Panel channel was deleted and has been automatically recreated.')
                            .addFields([
                                { name: '👤 Deleted By', value: `<@${executor.id}>`, inline: true },
                                { name: '⏰ Deleted At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            ])
                            .setFooter({ text: 'This channel is protected by Safe-Moderation' })
                            .setTimestamp()
                        
                        await newChannel.send({ embeds: [notificationEmbed] })
                    } catch (recreateError) {
                        log.error(`[ChannelDelete] ❌ Failed to recreate server panel channel:`, recreateError.message)
                    }
                }
            } catch (serverPanelError) {
                log.error('[ChannelDelete] Error handling server panel channel deletion:', serverPanelError)
            }
        }
        
        if (config && config.enabled) {
            try {
                // Debug: Log channel data before fetching audit log
                log.debug('[ChannelDelete] Channel object data:', {
                    name: channel.name,
                    id: channel.id,
                    type: channel.type,
                    hasPermissionOverwrites: !!channel.permissionOverwrites,
                    permissionCount: channel.permissionOverwrites?.cache?.size || 0
                })
                
                // Get audit log to find who deleted it
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.ChannelDelete,
                    limit: 1
                })
                
                const auditEntry = auditLogs.entries.first()
                if (auditEntry && auditEntry.target.id === channel.id) {
                    log.debug('[ChannelDelete] Audit entry found:', {
                        executor: auditEntry.executor?.tag,
                        targetId: auditEntry.target.id,
                        targetName: auditEntry.target.name
                    })
                    
                    // SERVER RECOVERY SYSTEM - Store deletion for manual recovery
                    if (client.serverRecoveryHandler) {
                        const recoveryResult = await client.serverRecoveryHandler.handleChannelDelete(
                            channel,
                            auditEntry.executor,
                            config
                        )
                        
                        if (recoveryResult && recoveryResult.success) {
                            log.debug('[ChannelDelete] ✅ Channel deletion logged for recovery')
                        } else {
                            log.debug('[ChannelDelete] ⚠️ Recovery not triggered:', recoveryResult?.reason || 'Unknown reason')
                        }
                    }
                    
                    // Try unified protection first (backup-based, more complete)
                    if (client.unifiedProtection) {
                        const result = await client.unifiedProtection.handleChannelDelete(
                            channel,
                            auditEntry.executor,
                            config
                        )
                        
                        // If unified protection succeeded, we're done
                        if (result && result.success) {
                            log.debug('[ChannelDelete] ✅ Unified protection handled deletion')
                        } else {
                            // Fallback to autoProtectionHandler - pass full channel object
                            log.debug('[ChannelDelete] Unified protection failed/unavailable, using fallback')
                            if (client.autoProtectionHandler) {
                                await client.autoProtectionHandler.recreateDeletedChannel(
                                    channel,
                                    auditEntry.executor,
                                    guild,
                                    config
                                )
                            }
                        }
                    } else if (client.autoProtectionHandler) {
                        // Only autoProtectionHandler available - pass full channel object
                        await client.autoProtectionHandler.recreateDeletedChannel(
                            channel,
                            auditEntry.executor,
                            guild,
                            config
                        )
                    }
                }
            } catch (protectionError) {
                log.error('[ChannelDelete] Protection error:', protectionError)
            }
        }
        
        // ============================================================
        // EXISTING CLEANUP LOGIC
        // ============================================================
        // Channel fields stored under settings.channels that reference a single channel
        const channelRefFields = ['botChannelId', 'generalChannelId', 'bumpNotification', 'giveawaysChannelId',
            'levelNotificationChannelId', 'itemsNotificationChannelId', 'achievmentsNotificationChannelId',
            'giveawaysMeetingRoom', 'customRoleModerationChannel', 'marketChannel', 'auctionsChannelId',
            'usedSeasonCardsChannelId', 'usedAllTimeCardsChannelId', 'usedTeamCardsChannelId']
        await Promise.all(client.cache.settings.filter(settings => settings.channels.mutedChannels.includes(channel.id) || settings.top_report.channelId === channel.id || channelRefFields.some(field => settings.channels[field] === channel.id)).map(async settings => {
        if (settings.channels.mutedChannels.includes(channel.id)) {
            settings.channels.mutedChannels = settings.channels.mutedChannels.filter(e => e !== channel.id)
        }
        for (const field of channelRefFields) {
            if (settings.channels[field] === channel.id) {
                settings.channels[field] = undefined
            }
        }
        if (settings.top_report.channelId === channel.id) {
            settings.top_report.channelId = undefined
        }
        await settings.save()
    }))
    await Promise.all(client.cache.promocodeAutogenerators.filter(autogenerator => autogenerator.channelId === channel.id).map(async autogenerator => {
        autogenerator.channelId = undefined
        if (autogenerator.enabled) {
            autogenerator.disable()
        }
        await autogenerator.save()
    }))
    await Promise.all(client.cache.auctions.filter(auction => auction.channelId === channel.id).map(async auction => {
        if (auction.status === "started") {
            await auction.delete(true, true)
        } else await auction.delete()
    }))
    await Promise.all(client.cache.giveaways.filter(giveaway => giveaway.channelId === channel.id).map(async giveaway => {
        await giveaway.delete()
    }))
    await Promise.all(client.cache.lots.filter(lot => lot.channelId === channel.id).map(async lot => {
        await lot.return()
    }))
    await Promise.all(client.cache.promocodes.filter(promocode => promocode.channelId === channel.id).map(async promocode => {
        await promocode.delete()
    }))
    await Promise.all(client.cache.wormholes.filter(wormhole => wormhole.channelId === channel.id && wormhole.isEnabled).map(async wormhole => {
        await wormhole.disable()
    }))
    const multipliersChannel = client.cache.channels.get(channel.id)
    if (multipliersChannel) multipliersChannel.delete()
    
    // Clean up sticky commands for the deleted channel
    const stickyCommandsToDelete = client.cache.stickyCommands.filter(
        stickyCommand => stickyCommand.channelID === channel.id
    )
    if (stickyCommandsToDelete.size > 0) {
        // Remove from cache
        for (const [key, stickyCommand] of stickyCommandsToDelete) {
            client.cache.stickyCommands.delete(key)
        }
        // Remove from database
        await stickyCommandSchema.deleteMany({ channelID: channel.id })
    }
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'ChannelDelete Event' })
    }
})
