/**
 * Safe-Server Restriction Manager
 * Handles applying and removing restrictions, creating restricted roles
 */

const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const safeServerSchema = require('../schemas/safeServerSchema')

class SafeServerRestrictionManager {
    constructor(client) {
        this.client = client
    }

    /**
     * Apply restriction to a moderator
     * @param {Guild} guild 
     * @param {GuildMember} member 
     * @param {string} permissionKey 
     * @returns {Promise<Object>}
     */
    async applyRestriction(guild, member, permissionKey) {
        console.log(`[SafeServerRestriction] Applying restriction to ${member.user.tag} for ${permissionKey}`)
        
        const config = await safeServerSchema.findOne({ guildID: guild.id })
        
        if (!config || !config.enabled) {
            return { success: false, message: 'Safe Server not enabled' }
        }

        const permConfig = config.permissions[permissionKey]
        
        if (!permConfig || !permConfig.enabled) {
            return { success: false, message: 'Permission not configured' }
        }

        try {
            // Find the role that grants this permission
            const permission = this.getDiscordPermission(permissionKey)
            const roleWithPermission = member.roles.cache
                .filter(r => r.id !== guild.id && r.permissions.has(permission))
                .sort((a, b) => b.position - a.position)
                .first()

            if (!roleWithPermission) {
                console.log(`[SafeServerRestriction] No role found with ${permissionKey} permission`)
                return { success: false, message: 'No role with this permission found' }
            }

            console.log(`[SafeServerRestriction] Found role: ${roleWithPermission.name}`)

            // Check if user already has an active restriction
            let restriction = config.activeRestrictions.find(r => r.userId === member.id)

            if (restriction) {
                // Add to existing restriction
                if (!restriction.restrictedPermissions.includes(permissionKey)) {
                    restriction.restrictedPermissions.push(permissionKey)
                    
                    // Update the restricted role
                    const restrictedRole = guild.roles.cache.get(restriction.restrictedRoleId)
                    if (restrictedRole) {
                        await this.updateRestrictedRole(guild, restrictedRole, restriction.restrictedPermissions)
                    }
                    
                    // Update expiration if needed
                    const newExpiry = new Date(Date.now() + (permConfig.cooldown * 1000))
                    if (newExpiry > restriction.expiresAt) {
                        restriction.expiresAt = newExpiry
                    }
                }
            } else {
                // Create new restriction
                const restrictedRole = await this.createRestrictedRole(guild, roleWithPermission, [permissionKey])
                
                if (!restrictedRole) {
                    return { success: false, message: 'Failed to create restricted role' }
                }

                // Remove original role and add restricted role
                await member.roles.remove(roleWithPermission, `Safe Server: ${permissionKey} limit exceeded`)
                await member.roles.add(restrictedRole, `Safe Server: ${permissionKey} restriction`)

                const expiresAt = permConfig.cooldown === -1 
                    ? null 
                    : new Date(Date.now() + (permConfig.cooldown * 1000))

                restriction = {
                    userId: member.id,
                    originalRoleId: roleWithPermission.id,
                    restrictedRoleId: restrictedRole.id,
                    restrictedPermissions: [permissionKey],
                    restrictedAt: new Date(),
                    expiresAt: expiresAt,
                    approvalPending: permConfig.cooldown === -1,
                    approvalMessageId: null
                }

                config.activeRestrictions.push(restriction)
            }

            await config.save()

            // Send notification
            await this.sendRestrictionNotification(guild, member, permissionKey, permConfig, restriction, config)

            // Schedule automatic restoration if not approval mode
            if (permConfig.cooldown !== -1) {
                setTimeout(() => {
                    this.removeRestriction(guild.id, member.id, permissionKey).catch(console.error)
                }, permConfig.cooldown * 1000)
            }

            return { success: true, restriction }
        } catch (error) {
            console.error('[SafeServerRestriction] Error applying restriction:', error)
            return { success: false, message: error.message }
        }
    }

    /**
     * Remove restriction from a moderator
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} permissionKey 
     * @returns {Promise<Object>}
     */
    async removeRestriction(guildId, userId, permissionKey = null) {
        console.log(`[SafeServerRestriction] Removing restriction from ${userId}`)
        
        const config = await safeServerSchema.findOne({ guildID: guildId })
        
        if (!config) {
            return { success: false, message: 'Config not found' }
        }

        const restriction = config.activeRestrictions.find(r => r.userId === userId)
        
        if (!restriction) {
            return { success: false, message: 'No active restriction found' }
        }

        const guild = this.client.guilds.cache.get(guildId)
        if (!guild) {
            return { success: false, message: 'Guild not found' }
        }

        const member = await guild.members.fetch(userId).catch(() => null)
        
        if (!member) {
            // User left, just remove from database
            config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
            await config.save()
            return { success: true, message: 'User left server' }
        }

        try {
            if (permissionKey) {
                // Remove specific permission from restriction
                restriction.restrictedPermissions = restriction.restrictedPermissions.filter(p => p !== permissionKey)
                
                if (restriction.restrictedPermissions.length === 0) {
                    // No more restrictions, fully restore
                    await this.fullyRestoreMember(guild, member, restriction, config)
                } else {
                    // Update restricted role
                    const restrictedRole = guild.roles.cache.get(restriction.restrictedRoleId)
                    if (restrictedRole) {
                        await this.updateRestrictedRole(guild, restrictedRole, restriction.restrictedPermissions)
                    }
                    await config.save()
                }
            } else {
                // Remove all restrictions
                await this.fullyRestoreMember(guild, member, restriction, config)
            }

            // Send restoration notification
            await this.sendRestorationNotification(guild, member, permissionKey, config)

            // Clear action tracking
            if (this.client.safeServerTracker) {
                this.client.safeServerTracker.clearActions(guildId, userId, permissionKey)
            }

            return { success: true }
        } catch (error) {
            console.error('[SafeServerRestriction] Error removing restriction:', error)
            return { success: false, message: error.message }
        }
    }

    /**
     * Fully restore a member (remove all restrictions)
     * @private
     */
    async fullyRestoreMember(guild, member, restriction, config) {
        const restrictedRole = guild.roles.cache.get(restriction.restrictedRoleId)
        const originalRole = guild.roles.cache.get(restriction.originalRoleId)

        if (restrictedRole) {
            await member.roles.remove(restrictedRole, 'Safe Server: Restriction expired')
            
            // Delete the restricted role if no one else has it
            const membersWithRole = restrictedRole.members.size
            if (membersWithRole === 0) {
                await restrictedRole.delete('Safe Server: No longer needed').catch(console.error)
            }
        }

        if (originalRole) {
            await member.roles.add(originalRole, 'Safe Server: Restriction expired')
        }

        config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== member.id)
        await config.save()
    }

    /**
     * Create a restricted role based on original role
     * @private
     */
    async createRestrictedRole(guild, originalRole, restrictedPermissions) {
        console.log(`[SafeServerRestriction] Creating restricted role for ${originalRole.name}`)
        
        // Get base permissions from original role
        let permissions = originalRole.permissions.bitfield

        // Remove restricted permissions
        for (const permKey of restrictedPermissions) {
            const permission = this.getDiscordPermission(permKey)
            if ((permissions & permission) === permission) {
                permissions = permissions & ~permission
            }
        }

        // Always remove Administrator (bypasses everything)
        if ((permissions & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator) {
            permissions = permissions & ~PermissionFlagsBits.Administrator
        }

        // Count existing restricted roles for this original role
        const existingCount = guild.roles.cache.filter(r => 
            r.name.startsWith(`${originalRole.name} ⏱`)
        ).size

        const roleName = existingCount > 0 
            ? `${originalRole.name} ⏱ (${existingCount + 1})`
            : `${originalRole.name} ⏱`

        try {
            const restrictedRole = await guild.roles.create({
                name: roleName,
                color: originalRole.color,
                permissions: permissions,
                hoist: originalRole.hoist,
                mentionable: originalRole.mentionable,
                position: originalRole.position - 1,
                reason: 'Safe Server: Restricted role'
            })

            console.log(`[SafeServerRestriction] Created restricted role: ${restrictedRole.name}`)
            return restrictedRole
        } catch (error) {
            console.error('[SafeServerRestriction] Failed to create restricted role:', error)
            return null
        }
    }

    /**
     * Update restricted role permissions
     * @private
     */
    async updateRestrictedRole(guild, restrictedRole, restrictedPermissions) {
        console.log(`[SafeServerRestriction] Updating restricted role: ${restrictedRole.name}`)
        
        // Get the original role name (remove ⏱ and count)
        const originalRoleName = restrictedRole.name.replace(/ ⏱.*$/, '')
        const originalRole = guild.roles.cache.find(r => r.name === originalRoleName)

        if (!originalRole) {
            console.log('[SafeServerRestriction] Original role not found')
            return
        }

        let permissions = originalRole.permissions.bitfield

        // Remove all restricted permissions
        for (const permKey of restrictedPermissions) {
            const permission = this.getDiscordPermission(permKey)
            if ((permissions & permission) === permission) {
                permissions = permissions & ~permission
            }
        }

        // Always remove Administrator
        if ((permissions & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator) {
            permissions = permissions & ~PermissionFlagsBits.Administrator
        }

        await restrictedRole.setPermissions(permissions, 'Safe Server: Updated restrictions')
    }

    /**
     * Get Discord permission flag from permission key
     * @private
     */
    getDiscordPermission(permissionKey) {
        const permissionMap = {
            'banMembers': PermissionFlagsBits.BanMembers,
            'kickMembers': PermissionFlagsBits.KickMembers,
            'timeoutMembers': PermissionFlagsBits.ModerateMembers,
            'deleteRole': PermissionFlagsBits.ManageRoles,
            'deleteChannel': PermissionFlagsBits.ManageChannels,
            'deleteMessages': PermissionFlagsBits.ManageMessages,
            'changeNickname': PermissionFlagsBits.ManageNicknames,
            'addingMassBots': PermissionFlagsBits.ManageGuild,
            'disconnectingMembers': PermissionFlagsBits.MoveMembers,
            'movingMembers': PermissionFlagsBits.MoveMembers,
            'mutingMembers': PermissionFlagsBits.MuteMembers,
            'everyoneHereSpam': PermissionFlagsBits.MentionEveryone
        }

        return permissionMap[permissionKey] || PermissionFlagsBits.SendMessages
    }

    /**
     * Send restriction notification to log channel
     * @private
     */
    async sendRestrictionNotification(guild, member, permissionKey, permConfig, restriction, config) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const permissionNames = {
            'banMembers': 'Ban Members',
            'kickMembers': 'Kick Members',
            'timeoutMembers': 'Timeout Members',
            'deleteRole': 'Delete Role',
            'deleteChannel': 'Delete Channel',
            'deleteMessages': 'Delete Messages',
            'changeNickname': 'Change Nickname',
            'addingMassBots': 'Adding Mass Bots',
            'disconnectingMembers': 'Disconnecting Members from VC',
            'movingMembers': 'Moving Members from VC',
            'mutingMembers': 'Muting Members from VC',
            'everyoneHereSpam': '@everyone / @here Spam'
        }

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🚨 Safe Server: Moderator Restricted')
            .setDescription(`<@${member.id}> has been restricted from using **${permissionNames[permissionKey]}**`)
            .addFields(
                { name: 'Moderator', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Permission', value: permissionNames[permissionKey], inline: true },
                { name: 'Action Limit', value: `${permConfig.actionCount} actions`, inline: true },
                { name: 'Time Window', value: formatDuration(permConfig.timeBetweenActions), inline: true },
                { name: 'Restricted Role', value: `<@&${restriction.restrictedRoleId}>`, inline: true }
            )
            .setTimestamp()

        if (permConfig.cooldown === -1) {
            embed.addFields({ name: 'Approval Required', value: 'Manager roles must approve to restore permissions' })
            
            const approveButton = new ButtonBuilder()
                .setCustomId(`ss_approve_restriction_${member.id}_${permissionKey}`)
                .setLabel('Approve Restoration')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)

            const rejectButton = new ButtonBuilder()
                .setCustomId(`ss_reject_restriction_${member.id}_${permissionKey}`)
                .setLabel('Keep Restricted')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)

            const row = new ActionRowBuilder().addComponents(approveButton, rejectButton)

            const message = await logChannel.send({ 
                content: config.managerRoles.map(id => `<@&${id}>`).join(' '),
                embeds: [embed], 
                components: [row] 
            })

            // Store message ID for later
            restriction.approvalMessageId = message.id
            await safeServerSchema.updateOne(
                { guildID: guild.id, 'activeRestrictions.userId': member.id },
                { $set: { 'activeRestrictions.$.approvalMessageId': message.id } }
            )
        } else {
            embed.addFields({ 
                name: 'Expires', 
                value: `<t:${Math.floor(restriction.expiresAt.getTime() / 1000)}:R>`, 
                inline: true 
            })
            
            await logChannel.send({ embeds: [embed] })
        }

        // Try to DM the moderator
        try {
            await member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setTitle('⚠️ Safe Server Restriction')
                        .setDescription(`You have been temporarily restricted from using **${permissionNames[permissionKey]}** in **${guild.name}**`)
                        .addFields(
                            { name: 'Reason', value: `Exceeded action limit (${permConfig.actionCount} actions in ${formatDuration(permConfig.timeBetweenActions)})` },
                            { name: 'Duration', value: permConfig.cooldown === -1 ? 'Until approved by managers' : formatDuration(permConfig.cooldown) }
                        )
                ]
            })
        } catch (error) {
            // User has DMs disabled
        }
    }

    /**
     * Send restoration notification
     * @private
     */
    async sendRestorationNotification(guild, member, permissionKey, config) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const permissionNames = {
            'banMembers': 'Ban Members',
            'kickMembers': 'Kick Members',
            'timeoutMembers': 'Timeout Members',
            'deleteRole': 'Delete Role',
            'deleteChannel': 'Delete Channel',
            'deleteMessages': 'Delete Messages',
            'changeNickname': 'Change Nickname',
            'addingMassBots': 'Adding Mass Bots',
            'disconnectingMembers': 'Disconnecting Members from VC',
            'movingMembers': 'Moving Members from VC',
            'mutingMembers': 'Muting Members from VC',
            'everyoneHereSpam': '@everyone / @here Spam'
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('✅ Safe Server: Restriction Removed')
            .setDescription(`<@${member.id}> has been restored`)
            .addFields(
                { name: 'Moderator', value: `${member.user.tag} (${member.id})` },
                { name: 'Permission Restored', value: permissionKey ? permissionNames[permissionKey] : 'All permissions' }
            )
            .setTimestamp()

        await logChannel.send({ embeds: [embed] })
    }
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''}`
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} month${Math.floor(seconds / 2592000) > 1 ? 's' : ''}`
    return `${Math.floor(seconds / 31536000)} year${Math.floor(seconds / 31536000) > 1 ? 's' : ''}`
}

module.exports = SafeServerRestrictionManager
