/**
 * Safe-Moderation Approval/Deny Button Handlers
 * Handles manual approval for restrictions when cooldown is set to -1
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const { getPermissionsToRemove } = require('../handler/safeModerationHelpers')
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('SafeModApproval')

// Routed via sm_approve_/sm_deny_ prefix in interactionCreate — no `name`
// export so this helper isn't registered as a cmd{} interaction (no run()).
module.exports = {
    async execute(client, interaction) {
        const customId = interaction.customId

        // Handle approve button
        if (customId.startsWith('sm_approve_')) {
            await handleApprove(client, interaction)
        }
        // Handle deny button
        else if (customId.startsWith('sm_deny_')) {
            await handleDeny(client, interaction)
        }
    }
}

/**
 * Handle Approve button click
 * Restores user's original role and removes restriction
 */
async function handleApprove(client, interaction) {
    try {
        // Parse customId: sm_approve_{guildId}_{userId}_{restrictionRoleId}_{actionType}
        const parts = interaction.customId.split('_')
        const guildId = parts[2]
        const userId = parts[3]
        const restrictionRoleId = parts[4]
        const actionType = parts.slice(5).join('_')
        
        // Authorization check - only managers or administrators
        const config = await safeModerationSchema.findOne({ guildID: guildId })
        if (!config) {
            return interaction.reply({
                content: '❌ Configuration not found.',
                ephemeral: true
            })
        }
        
        // Check if user has permission (manager role or administrator)
        const hasManagerRole = config.managerRoles?.some(roleId => 
            interaction.member.roles.cache.has(roleId)
        )
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator)
        
        if (!hasManagerRole && !isAdmin) {
            return interaction.reply({
                content: '❌ You do not have permission to approve restrictions. Only managers or administrators can do this.',
                ephemeral: true
            })
        }
        
        // Defer the reply for processing
        await interaction.deferUpdate()
        
        const guild = interaction.guild
        
        // Fetch the member
        const member = await guild.members.fetch(userId).catch(() => null)
        if (!member) {
            // Update message to show member left
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor(0x95A5A6) // Gray
                .setTitle('⚠️ Safe-Moderation: User Left Server')
                .setDescription(`User has left the server. Cleaning up restriction data.`)
            
            await interaction.editReply({
                embeds: [embed],
                components: []
            })
            
            // Clean up the role entry
            config.dynamicRestrictionRoles = config.dynamicRestrictionRoles?.filter(
                entry => entry.userId !== userId
            ) || []
            await config.save()
            
            return
        }
        
        // Find the dynamic restriction role entry
        const dynamicRoleEntry = config.dynamicRestrictionRoles?.find(
            entry => entry.userId === userId && entry.roleId === restrictionRoleId
        )
        
        if (!dynamicRoleEntry) {
            return interaction.followUp({
                content: '❌ Restriction entry not found in database.',
                ephemeral: true
            })
        }
        
        log.debug(`[ApprovalHandler] ✅ Approving restriction for ${member.user.tag}`)
        log.debug(`[ApprovalHandler] Action: ${actionType}`)
        log.debug(`[ApprovalHandler] Restriction role: ${restrictionRoleId}`)
        log.debug(`[ApprovalHandler] Original role: ${dynamicRoleEntry.originalRoleId}`)
        log.debug(`[ApprovalHandler] Current restricted perms: ${dynamicRoleEntry.restrictedPermissions.join(', ')}`)
        
        // Get the restriction role
        const restrictionRole = guild.roles.cache.get(restrictionRoleId)
        const originalRole = dynamicRoleEntry.originalRoleId ? guild.roles.cache.get(dynamicRoleEntry.originalRoleId) : null
        
        // Store thread ID before modifying config
        const threadIdToDelete = dynamicRoleEntry?.approvalThreadId
        
        // Determine if this is the ONLY remaining restriction or if others exist
        const remainingPerms = dynamicRoleEntry.restrictedPermissions.filter(p => p !== actionType)
        const isLastRestriction = remainingPerms.length === 0
        
        if (isLastRestriction) {
            // ── FULL RESTORE: No other restrictions remain ──
            log.debug(`[ApprovalHandler] Full restore — last restriction being approved`)
            
            // Remove restriction role from member
            if (restrictionRole && member.roles.cache.has(restrictionRole.id)) {
                await member.roles.remove(restrictionRole, `Safe-Moderation: Approved by ${interaction.user.tag}`)
                    .catch(err => log.error('[ApprovalHandler] Error removing restriction role:', err.message))
            }
            
            // Restore original role
            if (originalRole && !member.roles.cache.has(originalRole.id)) {
                await member.roles.add(originalRole, `Safe-Moderation: Approved by ${interaction.user.tag}`)
                    .catch(err => log.error('[ApprovalHandler] Error restoring original role:', err.message))
            }
            
            // Delete the dynamic restriction role from server (if no other members use it)
            if (restrictionRole) {
                const roleMembers = guild.members.cache.filter(m => m.roles.cache.has(restrictionRole.id))
                if (roleMembers.size === 0) {
                    await restrictionRole.delete(`Safe-Moderation: Approved by ${interaction.user.tag}`)
                        .catch(err => log.error('[ApprovalHandler] Error deleting restriction role:', err.message))
                }
            }
            
            // Remove entire entry from config
            config.dynamicRestrictionRoles = config.dynamicRestrictionRoles.filter(
                entry => !(entry.roleId === restrictionRoleId && entry.userId === userId)
            )
            await config.save()
        } else {
            // ── PARTIAL RESTORE: Other restrictions still active ──
            log.debug(`[ApprovalHandler] Partial restore — ${remainingPerms.length} restriction(s) remain: ${remainingPerms.join(', ')}`)
            
            // Remove this actionType from restrictedPermissions
            dynamicRoleEntry.restrictedPermissions = remainingPerms
            dynamicRoleEntry.approvalPending = remainingPerms.some(p => {
                const cd = config.permissions?.[p]?.cooldown
                return cd === -1
            })
            if (dynamicRoleEntry.expiryTimes) {
                delete dynamicRoleEntry.expiryTimes[actionType]
            }
            config.markModified('dynamicRestrictionRoles')
            await config.save()
            
            // Re-grant the approved permission on the restriction role
            if (restrictionRole && originalRole) {
                try {
                    // Recalculate: start from original perms, remove only the REMAINING restricted perms
                    const allPermsToRemove = new Set()
                    for (const remaining of remainingPerms) {
                        for (const p of getPermissionsToRemove(remaining)) {
                            allPermsToRemove.add(p)
                        }
                    }
                    
                    let newPerms
                    if (originalRole.permissions.has(PermissionFlagsBits.Administrator)) {
                        const removeBits = new Set([...allPermsToRemove].map(n => PermissionFlagsBits[n]).filter(Boolean))
                        newPerms = Object.values(PermissionFlagsBits)
                            .filter(p => typeof p === 'bigint' && p !== PermissionFlagsBits.Administrator && !removeBits.has(p))
                    } else {
                        newPerms = originalRole.permissions.toArray().filter(p => !allPermsToRemove.has(p))
                    }
                    
                    await restrictionRole.setPermissions(newPerms, `Safe-Moderation: Partial approval by ${interaction.user.tag} — restored ${actionType}`)
                    log.debug(`[ApprovalHandler] Updated restriction role perms — re-granted ${actionType}`)
                } catch (err) {
                    log.error('[ApprovalHandler] Error updating restriction role permissions:', err.message)
                }
            }
        }
        
        log.debug(`[ApprovalHandler] 💾 Saved config changes`)
        
        // Clear action history
        const tracker = client.safeModerationTracker
        if (tracker) {
            await tracker.clearActions(guild.id, userId, actionType)
        }
        
        // Update the message to show approval
        const actionNames = {
            banKickMembers: 'Ban/Kick Members',
            timeoutMembers: 'Timeout Members',
            deleteRole: 'Delete Role',
            deleteChannel: 'Delete Channel',
            deleteMessages: 'Delete Messages',
            changeNickname: 'Change Nickname',
            addingMassBots: 'Adding Mass Bots',
            voiceModeration: 'Voice Moderation',
            mutingMembers: 'Muting Members from VC',
            deafeningMembers: 'Deafening Members from VC',
            everyoneHereSpam: '@everyone / @here Spam',
            manageEmojis: 'Manage Emojis/Stickers',
            manageChannels: 'Manage Channels',
            manageRoles: 'Manage Roles',
            deleteEmojisStickers: 'Deleting Emojis & Stickers'
        }
        
        const actionName = actionNames[actionType] || actionType
        
        const descriptionText = isLastRestriction
            ? `**${member.user.tag}** has been approved and **fully restored**.`
            : `**${member.user.tag}**'s **${actionName}** restriction has been approved.\n⚠️ **${remainingPerms.length}** other restriction(s) remain active: ${remainingPerms.map(p => `\`${actionNames[p] || p}\``).join(', ')}`
        
        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(isLastRestriction ? 0x2ECC71 : 0xF1C40F) // Green for full, Yellow for partial
            .setTitle(isLastRestriction ? '✅ Safe-Moderation: Fully Approved' : '✅ Safe-Moderation: Partially Approved')
            .setDescription(descriptionText)
            .addFields(
                { name: 'Approved Permission', value: actionName, inline: true },
                { name: 'Approved By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Approved At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
        
        await interaction.editReply({
            embeds: [embed],
            components: [] // Remove buttons
        })
        
        // Send confirmation notification
        await sendApprovalNotification(guild, member, actionName, interaction.user, config)
        
        log.debug(`[ApprovalHandler] ✅ Approval complete`)
        
        // Delete thread after 5 seconds if it exists
        if (threadIdToDelete) {
            setTimeout(async () => {
                try {
                    const thread = guild.channels.cache.get(threadIdToDelete)
                    if (thread && thread.isThread()) {
                        await thread.delete('Safe-Moderation: Approval processed')
                        log.debug(`[ApprovalHandler] 🗑️ Deleted approval thread`)
                    }
                } catch (error) {
                    log.error('[ApprovalHandler] ❌ Error deleting thread:', error.message)
                }
            }, 5000)
        }
        
    } catch (error) {
        log.error('[ApprovalHandler] ❌ Error in handleApprove:', error)
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing the approval.',
                ephemeral: true
            }).catch(err => log.error('[SafeModApproval] Error:', err))
        }
    }
}

/**
 * Handle Deny button click
 * Keeps restriction in place
 */
async function handleDeny(client, interaction) {
    try {
        // Parse customId: sm_deny_{guildId}_{userId}_{restrictionRoleId}_{actionType}
        const parts = interaction.customId.split('_')
        const guildId = parts[2]
        const userId = parts[3]
        const restrictionRoleId = parts[4]
        const actionType = parts.slice(5).join('_')
        
        // Authorization check - only managers or administrators
        const config = await safeModerationSchema.findOne({ guildID: guildId })
        if (!config) {
            return interaction.reply({
                content: '❌ Configuration not found.',
                ephemeral: true
            })
        }
        
        // Check if user has permission (manager role or administrator)
        const hasManagerRole = config.managerRoles?.some(roleId => 
            interaction.member.roles.cache.has(roleId)
        )
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator)
        
        if (!hasManagerRole && !isAdmin) {
            return interaction.reply({
                content: '❌ You do not have permission to deny restrictions. Only managers or administrators can do this.',
                ephemeral: true
            })
        }
        
        // Defer the reply for processing
        await interaction.deferUpdate()
        
        const guild = interaction.guild
        
        // Fetch the member
        const member = await guild.members.fetch(userId).catch(() => null)
        if (!member) {
            // Update message to show member left
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor(0x95A5A6) // Gray
                .setTitle('⚠️ Safe-Moderation: User Left Server')
                .setDescription(`User has left the server. Cleaning up restriction data.`)
            
            await interaction.editReply({
                embeds: [embed],
                components: []
            })
            
            // Clean up the role entry
            config.dynamicRestrictionRoles = config.dynamicRestrictionRoles?.filter(
                entry => entry.userId !== userId
            ) || []
            await config.save()
            
            return
        }
        
        // Find the dynamic restriction role entry
        const dynamicRoleEntry = config.dynamicRestrictionRoles?.find(
            entry => entry.userId === userId && entry.roleId === restrictionRoleId
        )
        
        if (!dynamicRoleEntry) {
            return interaction.followUp({
                content: '❌ Restriction entry not found in database.',
                ephemeral: true
            })
        }
        
        log.debug(`[ApprovalHandler] ❌ Denying approval for ${member.user.tag}`)
        log.debug(`[ApprovalHandler] Action: ${actionType}`)
        log.debug(`[ApprovalHandler] Restriction will remain in place`)
        
        // Store thread ID before updating config
        const threadIdToDelete = dynamicRoleEntry?.approvalThreadId
        
        // Update approval status in config
        dynamicRoleEntry.approvalPending = false
        await config.save()
        
        // Update the message to show denial
        const actionNames = {
            banKickMembers: 'Ban/Kick Members',
            timeoutMembers: 'Timeout Members',
            deleteRole: 'Delete Role',
            deleteChannel: 'Delete Channel',
            deleteMessages: 'Delete Messages',
            changeNickname: 'Change Nickname',
            addingMassBots: 'Adding Mass Bots',
            voiceModeration: 'Voice Moderation',
            mutingMembers: 'Muting Members from VC',
            deafeningMembers: 'Deafening Members from VC',
            everyoneHereSpam: '@everyone / @here Spam',
            manageEmojis: 'Manage Emojis/Stickers',
            manageChannels: 'Manage Channels',
            manageRoles: 'Manage Roles',
            deleteEmojisStickers: 'Deleting Emojis & Stickers'
        }
        
        const actionName = actionNames[actionType] || actionType
        
        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0xE74C3C) // Red
            .setTitle('❌ Safe-Moderation: Denied')
            .setDescription(`**${member.user.tag}** will remain restricted. The restriction has been denied.`)
            .addFields(
                { name: 'Denied By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Denied At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
        
        await interaction.editReply({
            embeds: [embed],
            components: [] // Remove buttons
        })
        
        // Send confirmation notification
        await sendDenialNotification(guild, member, actionName, interaction.user, config)
        
        log.debug(`[ApprovalHandler] ✅ Denial complete`)
        
        // Delete thread after 5 seconds if it exists
        if (threadIdToDelete) {
            setTimeout(async () => {
                try {
                    const thread = guild.channels.cache.get(threadIdToDelete)
                    if (thread && thread.isThread()) {
                        await thread.delete('Safe-Moderation: Denial processed')
                        log.debug(`[ApprovalHandler] 🗑️ Deleted approval thread`)
                    }
                } catch (error) {
                    log.error('[ApprovalHandler] ❌ Error deleting thread:', error.message)
                }
            }, 5000)
        }
        
    } catch (error) {
        log.error('[ApprovalHandler] ❌ Error in handleDeny:', error)
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing the denial.',
                ephemeral: true
            }).catch(err => log.error('[SafeModApproval] Error:', err))
        }
    }
}

/**
 * Send approval notification
 */
async function sendApprovalNotification(guild, member, actionName, approver, config) {
    const { WebhookClient } = require('discord.js')
    
    const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Safe-Moderation: Restriction Approved')
        .setDescription(`**${member.user.tag}** has been approved and fully restored.`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Action Type', value: actionName, inline: true },
            { name: 'Approved By', value: `<@${approver.id}>`, inline: true }
        )
        .setTimestamp()
    
    // Send to Server Panel channel
    if (config.serverPanel?.enabled && config.serverPanel?.channelId) {
        const channel = guild.channels.cache.get(config.serverPanel.channelId)
        if (channel) {
            await channel.send({ embeds: [embed] }).catch(err => log.error('[SafeModApproval] Error:', err))
        }
    }
    
    // Send to webhook
    if (config.logWebhook) {
        try {
            const webhook = new WebhookClient({ url: config.logWebhook })
            await webhook.send({
                embeds: [embed],
                username: 'Safe-Moderation',
                avatarURL: guild.iconURL()
            })
            webhook.destroy()
        } catch (error) {
            log.error('[ApprovalHandler] Webhook notification error:', error.message)
        }
    }
}

/**
 * Send denial notification
 */
async function sendDenialNotification(guild, member, actionName, denier, config) {
    const { WebhookClient } = require('discord.js')
    
    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Safe-Moderation: Restriction Denied')
        .setDescription(`**${member.user.tag}** will remain restricted. The approval was denied.`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Action Type', value: actionName, inline: true },
            { name: 'Denied By', value: `<@${denier.id}>`, inline: true }
        )
        .setTimestamp()
    
    // Send to Server Panel channel
    if (config.serverPanel?.enabled && config.serverPanel?.channelId) {
        const channel = guild.channels.cache.get(config.serverPanel.channelId)
        if (channel) {
            await channel.send({ embeds: [embed] }).catch(err => log.error('[SafeModApproval] Error:', err))
        }
    }
    
    // Send to webhook
    if (config.logWebhook) {
        try {
            const webhook = new WebhookClient({ url: config.logWebhook })
            await webhook.send({
                embeds: [embed],
                username: 'Safe-Moderation',
                avatarURL: guild.iconURL()
            })
            webhook.destroy()
        } catch (error) {
            log.error('[ApprovalHandler] Webhook notification error:', error.message)
        }
    }
}
