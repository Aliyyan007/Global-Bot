const { RewardType } = require("../enums")
const client = require("../index")
const { Events, EmbedBuilder } = require("discord.js")
const { handleError } = require("../handler/errorHandler")
const { batchSave } = require("../handler/safeDbOperations")

client.on(Events.GuildRoleDelete, async (role) => {
    try {
        // Safe Moderation Validator - Monitor role deletions
        if (client.safeModerationValidator) {
            const monitor = require('./safeModerationMonitor');
            await monitor.handleRoleDelete(client, role);
        }
        
        if (client.blacklist(role.guild.id, "full_ban", "guilds")) return
        
        // ============================================================
        // QUARANTINE ROLE PROTECTION (Auto-recreate if deleted)
        // ============================================================
        const guild = role.guild
        const safeModerationSchema = require("../schemas/safeModerationSchema")
        const config = await safeModerationSchema.findOne({ guildID: guild.id })
        
        // ============================================================
        // MANAGER ROLE PROTECTION (Auto-recreate if deleted)
        // ============================================================
        if (config && config.enabled && config.managerRoles && config.managerRoles.includes(role.id)) {
            try {
                const { AuditLogEvent } = require("discord.js")
                // Get audit log to find who deleted it
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleDelete,
                    limit: 1
                })
                
                const auditEntry = auditLogs.entries.first()
                if (auditEntry && auditEntry.target.id === role.id) {
                    const executor = auditEntry.executor
                    
                    console.log(`[Safe-Moderation] 🚨 Manager role deleted by ${executor.tag}`)
                    
                    // Send DM to the person who deleted it
                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⚠️ Manager Role Deletion Detected')
                            .setDescription(`You deleted a **Safe-Moderation Manager Role** in **${guild.name}**.`)
                            .addFields([
                                {
                                    name: '🔒 What Happened',
                                    value: [
                                        `**Role Deleted:** ${role.name}`,
                                        `**Server:** ${guild.name}`,
                                        `**Action:** Role will be automatically recreated`
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '⚠️ Important Information',
                                    value: [
                                        '• This role is **managed by Safe-Moderation** system',
                                        '• It will be **automatically recreated** to maintain protection',
                                        '• Deleting it does not disable the system',
                                        '• Manager roles can approve restrictions and manage the system'
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '🛡️ How to Properly Remove',
                                    value: [
                                        '1. Use `/safe-moderation` command',
                                        '2. Go to **Settings** section',
                                        '3. Remove the role from Manager Roles list',
                                        '4. Or disable Safe-Moderation entirely'
                                    ].join('\n'),
                                    inline: false
                                }
                            ])
                            .setFooter({ text: 'Safe-Moderation - Manager Role Protection' })
                            .setTimestamp()
                        
                        await executor.send({ embeds: [dmEmbed] })
                        console.log(`[Safe-Moderation] ✅ Sent DM to ${executor.tag} about manager role deletion`)
                    } catch (dmError) {
                        console.log(`[Safe-Moderation] ⚠️ Could not send DM to ${executor.tag}: ${dmError.message}`)
                    }
                    
                    // Auto-recreate the manager role
                    try {
                        console.log(`[Safe-Moderation] 🔄 Auto-recreating manager role...`)
                        
                        const newRole = await guild.roles.create({
                            name: role.name,
                            color: role.color,
                            hoist: role.hoist,
                            mentionable: role.mentionable,
                            permissions: role.permissions,
                            reason: 'Safe-Moderation: Auto-recreating deleted manager role'
                        })
                        
                        // Try to set position
                        const botMember = await guild.members.fetch(client.user.id)
                        const botHighestRole = botMember.roles.highest
                        const targetPosition = Math.max(1, role.position)
                        
                        let positionSet = false
                        try {
                            // Try to set the original position
                            await newRole.setPosition(targetPosition)
                            positionSet = true
                            console.log(`[Safe-Moderation] ✅ Manager role position set to ${targetPosition}`)
                        } catch (positionError) {
                            console.log(`[Safe-Moderation] ⚠️ Could not set position to ${targetPosition}: ${positionError.message}`)
                            
                            // If failed, try to position just below bot's highest role
                            try {
                                const safeBotPosition = Math.max(1, botHighestRole.position - 1)
                                await newRole.setPosition(safeBotPosition)
                                positionSet = true
                                console.log(`[Safe-Moderation] ✅ Manager role positioned below bot role at ${safeBotPosition}`)
                            } catch (fallbackError) {
                                console.log(`[Safe-Moderation] ⚠️ Could not set fallback position: ${fallbackError.message}`)
                            }
                        }
                        
                        // Update config with new role ID
                        const roleIndex = config.managerRoles.indexOf(role.id)
                        if (roleIndex !== -1) {
                            config.managerRoles[roleIndex] = newRole.id
                            await config.save()
                            
                            // Invalidate cache
                            if (client.safeModerationConfigCache) {
                                await client.safeModerationConfigCache.invalidate(guild.id)
                            }
                        }
                        
                        console.log(`[Safe-Moderation] ✅ Manager role recreated: ${newRole.name} (${newRole.id})`)
                        
                        // If position couldn't be set, DM the owner
                        if (!positionSet) {
                            try {
                                const owner = await guild.fetchOwner()
                                const ownerDmEmbed = new EmbedBuilder()
                                    .setColor('#FFA500')
                                    .setTitle('⚠️ Manager Role Position Issue')
                                    .setDescription(`A **Manager Role** was recreated in **${guild.name}** but couldn't be positioned correctly.`)
                                    .addFields([
                                        {
                                            name: '🔧 Action Required',
                                            value: [
                                                `**Role:** ${newRole.name}`,
                                                `**Issue:** Role position is limited by bot's role hierarchy`,
                                                `**Solution:** Manually reposition the role just below the bot's role`
                                            ].join('\n'),
                                            inline: false
                                        },
                                        {
                                            name: '📍 How to Fix',
                                            value: [
                                                '1. Go to Server Settings → Roles',
                                                `2. Move **${newRole.name}** just below the bot's highest role`,
                                                '3. This ensures proper permission management'
                                            ].join('\n'),
                                            inline: false
                                        }
                                    ])
                                    .setFooter({ text: 'Safe-Moderation - Manager Role Protection' })
                                    .setTimestamp()
                                
                                await owner.send({ embeds: [ownerDmEmbed] })
                                console.log(`[Safe-Moderation] ✅ Sent position warning DM to server owner`)
                            } catch (ownerDmError) {
                                console.log(`[Safe-Moderation] ⚠️ Could not send DM to owner: ${ownerDmError.message}`)
                            }
                        }
                    } catch (recreateError) {
                        console.error(`[Safe-Moderation] ❌ Failed to recreate manager role:`, recreateError.message)
                    }
                }
            } catch (managerRoleError) {
                console.error('[Safe-Moderation] Error handling manager role deletion:', managerRoleError)
            }
        }
        
        // Check if this is the quarantine role and Bot Shield is enabled
        if (config && config.botShield?.enabled && config.botShield?.quarantineRoleId === role.id) {
            try {
                const { AuditLogEvent } = require("discord.js")
                // Get audit log to find who deleted it
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleDelete,
                    limit: 1
                })
                
                const auditEntry = auditLogs.entries.first()
                if (auditEntry && auditEntry.target.id === role.id) {
                    const executor = auditEntry.executor
                    
                    console.log(`[Bot Shield] 🚨 Quarantine role deleted by ${executor.tag}`)
                    
                    // Send DM to the person who deleted it
                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⚠️ Quarantine Role Deletion Detected')
                            .setDescription(`You deleted the **Bot Shield Quarantine Role** in **${guild.name}**.`)
                            .addFields([
                                {
                                    name: '🔒 What Happened',
                                    value: [
                                        `**Role Deleted:** ${role.name}`,
                                        `**Server:** ${guild.name}`,
                                        `**Action:** Role will be automatically recreated`
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '⚠️ Important Information',
                                    value: [
                                        '• This role is **managed by Bot Shield** for bot security',
                                        '• It will be **automatically recreated** to maintain protection',
                                        '• Deleting it does not disable the system',
                                        '• The role will be re-added to all quarantined bots'
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '🛡️ How to Properly Disable',
                                    value: [
                                        '1. Use `/safe-moderation` command',
                                        '2. Click on **Bot Shield** button',
                                        '3. Click **Disable Bot Shield**',
                                        '4. This will properly disable the system and remove the role'
                                    ].join('\n'),
                                    inline: false
                                }
                            ])
                            .setFooter({ text: 'Bot Shield - Quarantine Role Protection' })
                            .setTimestamp()
                        
                        await executor.send({ embeds: [dmEmbed] })
                        console.log(`[Bot Shield] ✅ Sent DM to ${executor.tag} about quarantine role deletion`)
                    } catch (dmError) {
                        console.log(`[Bot Shield] ⚠️ Could not send DM to ${executor.tag}: ${dmError.message}`)
                    }
                    
                    // Auto-recreate the quarantine role
                    if (client.botShieldHandler) {
                        console.log(`[Bot Shield] 🔄 Auto-recreating quarantine role...`)
                        const quarantineRole = await client.botShieldHandler.getOrCreateQuarantineRole(guild)
                        
                        if (quarantineRole) {
                            // Update config with new role ID
                            config.botShield.quarantineRoleId = quarantineRole.id
                            await config.save()
                            
                            console.log(`[Bot Shield] ✅ Quarantine role recreated: ${quarantineRole.name} (${quarantineRole.id})`)
                            
                            // Re-add quarantine role to all bots that are pending approval
                            if (client.sentinelHubHandler && client.sentinelHubHandler.pendingBots) {
                                for (const [botId, pendingBot] of client.sentinelHubHandler.pendingBots) {
                                    try {
                                        const botMember = await guild.members.fetch(botId).catch(() => null)
                                        if (botMember) {
                                            await botMember.roles.add(quarantineRole, 'Bot Shield: Re-adding quarantine role after deletion')
                                            console.log(`[Bot Shield] ✅ Re-added quarantine role to ${botMember.user.tag}`)
                                        }
                                    } catch (readdError) {
                                        console.error(`[Bot Shield] ❌ Error re-adding quarantine role to bot ${botId}:`, readdError.message)
                                    }
                                }
                            }
                        } else {
                            console.error(`[Bot Shield] ❌ Failed to recreate quarantine role`)
                        }
                    }
                }
            } catch (quarantineError) {
                console.error('[Bot Shield] Error handling quarantine role deletion:', quarantineError)
            }
        }
        
        // ============================================================
        // PROTECTION SYSTEM (Auto-recreate if deleted by bot)
        // ============================================================
        // Reuse guild, safeModerationSchema, and config from above
        
        if (config && config.enabled) {
            try {
                const { AuditLogEvent } = require("discord.js")
                // Get audit log to find who deleted it
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleDelete,
                    limit: 1
                })
                
                const auditEntry = auditLogs.entries.first()
                if (auditEntry && auditEntry.target.id === role.id) {
                    // CRITICAL: Skip restriction roles (they are intentionally deleted during restoration/approval)
                    const isRestrictionRole = role.name.includes('(Restricted)') || 
                                             config.dynamicRestrictionRoles?.some(entry => entry.roleId === role.id)
                    
                    if (isRestrictionRole) {
                        console.log('[Protection] ⏭️ Skipping auto-recreation for restriction role:', role.name)
                        return
                    }
                    
                    // SERVER RECOVERY SYSTEM - Store deletion for manual recovery
                    if (client.serverRecoveryHandler) {
                        const recoveryResult = await client.serverRecoveryHandler.handleRoleDelete(
                            role,
                            auditEntry.executor,
                            config
                        )
                        
                        if (recoveryResult && recoveryResult.success) {
                            console.log('[Server Recovery] ✅ Role deletion logged for recovery')
                        } else {
                            console.log('[Server Recovery] ⚠️ Recovery not triggered:', recoveryResult?.reason || 'Unknown reason')
                        }
                    }
                    
                    // Pass full role object with executor
                    if (client.autoProtectionHandler) {
                        await client.autoProtectionHandler.recreateDeletedRole(
                            role,
                            auditEntry.executor,
                            guild,
                            config
                        )
                    }
                }
            } catch (protectionError) {
                console.error('[Protection] Role recreation error:', protectionError)
            }
        }
        
        // ============================================================
        // EXISTING CLEANUP LOGIC
        // ============================================================
        const profilesToUpdate = client.cache.profiles.filter(profile => profile.roles?.some(r => r.id === role.id)).map(profile => {
            profile.roles = profile.roles.filter(r => r.id !== role.id)
            if (!profile.roles[0]) profile.roles = undefined
            return profile
        })
        await batchSave(profilesToUpdate, { 
            context: 'Role Delete - Profiles',
            ownerId: client.config.discord.ownerId 
        })
        
        const itemsToUpdate = client.cache.items.filter(item => item.onUse.roleAdd === role.id || item.onUse.roleDel === role.id).map(item => {
            if (item.onUse.roleAdd === role.id) {
                item.onUse.roleAdd = undefined
                item.onUse.roleTimely = undefined
            }
            if (item.onUse.roleDel === role.id) {
                item.onUse.roleDel = undefined
            }
            return item
        })
        await batchSave(itemsToUpdate, { 
            context: 'Role Delete - Items',
            ownerId: client.config.discord.ownerId 
        })
        
        await Promise.all(client.cache.achievements.filter(e => e.rewards.some(rew => rew.id === role.id)).map(async achievement => {
        achievement.rewards = achievement.rewards.filter(e => e.id !== role.id)
        await achievement.save()
    }))
    await Promise.all(client.cache.roles.filter(e => e.id === role.id).map(async role => {
        await role.delete()
    }))
    await client.rolePropertiesSchema.findOneAndDelete({ id: role.id })
    const customRole = client.cache.customRoles.find(e => e.roleId === role.id)
    if (customRole) await customRole.delete()
    await Promise.all(client.cache.lots.filter(lot => lot.guildID === role.guild.id && lot.items.some(e => e.id === role.id)).map(async lot => {
        const { guild } = role
        const member = await guild.members.fetch(lot.userID).catch(e => null)
        const profile = client.cache.profiles.get(guild.id+lot.userID)
        if (profile) {
            let sellingItem
            if (lot.item.type === RewardType.Item) {
                const item = client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.visible)
                sellingItem = `${item?.name || lot.item.id} (${(lot.item.amount || 0).toLocaleString()})`
            }
            if (lot.item.type === RewardType.Role) {
                const guildRole = guild.roles.cache.get(lot.item.id)
                sellingItem = `${guildRole?.name || lot.item.id} (${(lot.item.amount || 0).toLocaleString()})`
            }
            await lot.return()
            if (member) member.send({ embeds: [
                new EmbedBuilder()
                    .setTitle(guild.name)
                    .setThumbnail(guild.iconURL())
                    .setDescription(`${client.language({ textId: "Your lot", guildId: guild.id })} ${sellingItem} (${lot.lotID}) ${client.language({ textId: "was automatically deleted - one of the price items was removed. Items returned.", guildId: guild.id })}`)
                    .setColor(3093046)
            ] }).catch(e => null)    
        }
    }))
    await Promise.all(client.cache.profiles.filter(profile => profile.guildID === role.guild.id && profile.inventoryRoles?.some(r => r.id === role.id)).map(async profile => {
        profile.inventoryRoles = profile.inventoryRoles.filter(r => r.id !== role.id)
        if (!profile.inventoryRoles.length) profile.inventoryRoles = undefined
        await profile.save()
    }))
    await Promise.all(client.cache.settings.filter(settings => settings.roles.mutedRoles.includes(role.id) || settings.roles.giveawaysNotification === role.id || settings.roles.wormholesNotification === role.id || settings.roles.bumpNotification === role.id || settings.roles.customRolePosition === role.id).map(async settings => {
        if (settings.roles.mutedRoles.includes(role.id)) {
            settings.roles.mutedRoles = settings.roles.mutedRoles.filter(e => e !== role.id)
        }
        if (settings.roles.giveawaysNotification === role.id) {
            settings.roles.giveawaysNotification = undefined
        }
        if (settings.roles.wormholesNotification === role.id) {
            settings.roles.wormholesNotification = undefined
        }
        if (settings.roles.bumpNotification === role.id) {
            settings.roles.bumpNotification = undefined
        }
        if (settings.roles.customRolePosition === role.id) {
            settings.roles.customRolePosition = undefined
        }
        await settings.save()
    }))
    await Promise.all(client.cache.auctions.filter(e => e.guildID === role.guild.id && e.item.id === role.id).map(async auction => {
        await auction.delete(true)
    }))
    
    // Clean up temporary role configurations
    await Promise.all([
        client.tempRoleConfigSchema.deleteMany({ roleID: role.id }),
        client.tempRoleAssignmentSchema.deleteMany({ roleID: role.id })
    ])
    
    // Cancel scheduled jobs for this role
    const { cancelScheduledJobsForRole } = require('../modules/tempRoleManager')
    cancelScheduledJobsForRole(role.id)
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildRoleDelete Event' })
    }
})
