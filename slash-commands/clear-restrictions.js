// Command to clear Safe-Moderation restrictions
// Works with the dynamic restriction roles system

const { PermissionFlagsBits, Collection, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')

module.exports = {
    name: 'clear-restrictions',
    description: 'Clear Safe-Moderation restrictions from users',
    defaultMemberPermissions: String(PermissionFlagsBits.Administrator),
    dmPermission: false,
    group: 'admins-group',
    guildOnly: true,
    cooldowns: new Collection(),
    options: [
        {
            name: 'user',
            description: 'Select user to clear restrictions from (leave empty to clear all)',
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
        }
    ],
    
    autocomplete: async (client, interaction) => {
        try {
            const config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
            
            if (!config || !config.dynamicRestrictionRoles || config.dynamicRestrictionRoles.length === 0) {
                return interaction.respond([
                    {
                        name: 'No restricted users found',
                        value: 'none'
                    }
                ])
            }
            
            // Get unique user IDs from dynamic restriction roles
            const uniqueUserIds = [...new Set(config.dynamicRestrictionRoles.map(entry => entry.userId))]
            
            // Fetch user information and build autocomplete options
            const options = [
                {
                    name: '🌐 All Users (Clear all restrictions)',
                    value: 'all'
                }
            ]
            
            for (const userId of uniqueUserIds.slice(0, 24)) { // Discord limit: 25 options (1 reserved for "All Users")
                try {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null)
                    if (!member) continue // Skip if member not found
                    
                    // Find all restrictions for this user
                    const userRestrictions = config.dynamicRestrictionRoles.filter(entry => entry.userId === userId)
                    
                    // CRITICAL FIX: Only show users who actually have the restriction role applied
                    const hasActiveRestriction = userRestrictions.some(entry => {
                        const restrictionRole = interaction.guild.roles.cache.get(entry.roleId)
                        return restrictionRole && member.roles.cache.has(restrictionRole.id)
                    })
                    
                    if (!hasActiveRestriction) continue // Skip if no active restriction role
                    
                    const restrictionCount = userRestrictions.reduce((sum, entry) => sum + entry.restrictedPermissions.length, 0)
                    
                    options.push({
                        name: `${member.user.tag} (${restrictionCount} restriction${restrictionCount !== 1 ? 's' : ''})`,
                        value: userId
                    })
                } catch (err) {
                    // Skip users that can't be fetched
                }
            }
            
            // If only "All Users" option exists, show a message
            if (options.length === 1) {
                return interaction.respond([
                    {
                        name: 'No restricted users found',
                        value: 'none'
                    }
                ])
            }
            
            await interaction.respond(options)
        } catch (error) {
            console.error('[Clear Restrictions] Autocomplete error:', error)
            await interaction.respond([
                {
                    name: 'Error loading restricted users',
                    value: 'error'
                }
            ])
        }
    },
    
    run: async (client, interaction) => {
        // Admin check (owner or administrator)
        if (interaction.user.id !== interaction.guild.ownerId && 
            !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Only administrators can use this command.',
                flags: ["Ephemeral"]
            })
        }

        // CRITICAL FIX: Defer reply immediately to prevent "application didn't respond" error
        await interaction.deferReply({ ephemeral: true })

        try {
            const config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
            
            if (!config) {
                return interaction.editReply({
                    content: '❌ Safe-Moderation not configured.'
                })
            }

            // Check dynamic restriction roles (current system)
            if (!config.dynamicRestrictionRoles || config.dynamicRestrictionRoles.length === 0) {
                return interaction.editReply({
                    content: '❌ No active restrictions found.'
                })
            }
            
            // CRITICAL FIX: Use .get() to handle both String and User option types
            // This works regardless of how the command was registered
            const userOption = interaction.options.get('user')
            let selectedUserId
            
            // CRITICAL FIX: If no user specified, default to 'all'
            if (!userOption || !userOption.value) {
                selectedUserId = 'all'
            } else {
                // Handle different option types
                if (userOption.type === ApplicationCommandOptionType.User) {
                    // If registered as User type, get the user ID from the user object
                    selectedUserId = userOption.user?.id || userOption.value
                } else {
                    // If registered as String type, get the string value
                    selectedUserId = userOption.value
                }
            }
            
            if (!selectedUserId) {
                return interaction.editReply({
                    content: '❌ Invalid user selection.'
                })
            }
            
            // Handle special cases
            if (selectedUserId === 'none' || selectedUserId === 'error') {
                return interaction.editReply({
                    content: '❌ No restricted users available to clear.'
                })
            }
            
            // CRITICAL FIX: Filter to only include users who actually have restriction roles applied
            const activeRestrictions = []
            for (const entry of config.dynamicRestrictionRoles) {
                const member = await interaction.guild.members.fetch(entry.userId).catch(() => null)
                if (!member) continue
                
                const restrictionRole = interaction.guild.roles.cache.get(entry.roleId)
                if (restrictionRole && member.roles.cache.has(restrictionRole.id)) {
                    activeRestrictions.push(entry)
                }
            }
            
            if (activeRestrictions.length === 0) {
                return interaction.editReply({
                    content: '❌ No members currently have active restriction roles applied.'
                })
            }
            
            if (selectedUserId === 'all') {
                // Clear all restrictions
                
                // Use only active restrictions (users who have the restriction role)
                const uniqueUserIds = [...new Set(activeRestrictions.map(entry => entry.userId))]
                const totalRestrictions = activeRestrictions.length
                
                console.log(`[Clear Restrictions] Found ${totalRestrictions} dynamic restriction roles for ${uniqueUserIds.length} users`)
                
                let clearedCount = 0
                let rolesDeleted = 0
                let rolesRestored = 0
                const errors = []
                
                // Process each unique user
                for (const userId of uniqueUserIds) {
                    try {
                        const member = await interaction.guild.members.fetch(userId).catch(() => null)
                        
                        // Get all restriction entries for this user (only active ones)
                        const userRestrictions = activeRestrictions.filter(entry => entry.userId === userId)
                        
                        for (const restrictionEntry of userRestrictions) {
                            try {
                                const restrictionRole = interaction.guild.roles.cache.get(restrictionEntry.roleId)
                                const originalRole = interaction.guild.roles.cache.get(restrictionEntry.originalRoleId)
                                
                                let roleRemoved = false
                                let roleRestored = false
                                let roleDeleted = false
                                
                                // Step 1: Remove restriction role from member
                                if (member && restrictionRole && member.roles.cache.has(restrictionRole.id)) {
                                    await member.roles.remove(restrictionRole, `Clear Restrictions: Cleared by ${interaction.user.tag}`)
                                        .then(() => {
                                            roleRemoved = true
                                            console.log(`[Clear Restrictions] ✅ Removed restriction role from ${member.user.tag}`)
                                        })
                                        .catch(err => {
                                            console.error(`[Clear Restrictions] Error removing role from ${userId}:`, err.message)
                                            const userTag = (member && member.user && member.user.tag) ? member.user.tag : userId
                                            errors.push(`Failed to remove role from ${userTag}`)
                                        })
                                }
                                
                                // Step 2: Restore original role to member (always try, even if they already have it)
                                if (member && originalRole) {
                                    // Remove first if they have it to ensure clean state
                                    if (member.roles.cache.has(originalRole.id)) {
                                        await member.roles.remove(originalRole, 'Clear Restrictions: Cleanup').catch(() => {})
                                        // Wait a bit for Discord to sync
                                        await new Promise(resolve => setTimeout(resolve, 500))
                                    }
                                    
                                    // Now add it back
                                    await member.roles.add(originalRole, `Clear Restrictions: Restored by ${interaction.user.tag}`)
                                        .then(() => {
                                            roleRestored = true
                                            rolesRestored++
                                            console.log(`[Clear Restrictions] ✅ Restored original role to ${member.user.tag}`)
                                        })
                                        .catch(err => {
                                            console.error(`[Clear Restrictions] Error restoring role to ${userId}:`, err.message)
                                            const userTag = (member && member.user && member.user.tag) ? member.user.tag : userId
                                            errors.push(`Failed to restore role to ${userTag}`)
                                        })
                                }
                                
                                // Step 3: Delete the dynamic restriction role from server (only if role operations succeeded)
                                if (restrictionRole && (roleRemoved || !member)) {
                                    // Wait a bit to ensure Discord synced the role changes
                                    await new Promise(resolve => setTimeout(resolve, 1000))
                                    
                                    await restrictionRole.delete(`Clear Restrictions: Cleared by ${interaction.user.tag}`)
                                        .then(() => {
                                            roleDeleted = true
                                            rolesDeleted++
                                            console.log(`[Clear Restrictions] ✅ Deleted restriction role ${restrictionRole.name}`)
                                        })
                                        .catch(err => {
                                            console.error(`[Clear Restrictions] Error deleting role ${restrictionRole.name}:`, err.message)
                                            errors.push(`Failed to delete role ${restrictionRole.name}`)
                                        })
                                }
                                
                                if (roleRemoved || roleRestored || roleDeleted) {
                                    clearedCount++
                                }
                                
                            } catch (err) {
                                console.error(`[Clear Restrictions] Error processing restriction entry:`, err)
                                errors.push(`Error processing restriction for user ${userId}`)
                            }
                        }
                        
                        // Clear action tracking for this user
                        if (client.safeModerationTracker) {
                            await client.safeModerationTracker.clearActions(interaction.guild.id, userId)
                        }
                        
                    } catch (err) {
                        console.error(`[Clear Restrictions] Error processing user ${userId}:`, err)
                        errors.push(`Error processing user ${userId}`)
                    }
                }
                
                // CRITICAL FIX: Use atomic update to prevent version conflicts
                // Instead of modifying and saving, use findOneAndUpdate
                await safeModerationSchema.findOneAndUpdate(
                    { guildID: interaction.guild.id },
                    { $set: { dynamicRestrictionRoles: [] } },
                    { new: true }
                ).catch(err => {
                    console.error('[Clear Restrictions] Error clearing dynamicRestrictionRoles:', err.message)
                    errors.push('Failed to update database')
                })

                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('✅ Restrictions Cleared')
                    .setDescription(`Successfully cleared all Safe-Moderation restrictions.`)
                    .addFields(
                        { name: 'Users Processed', value: `${uniqueUserIds.length}`, inline: true },
                        { name: 'Restrictions Cleared', value: `${clearedCount}`, inline: true },
                        { name: 'Roles Deleted', value: `${rolesDeleted}`, inline: true },
                        { name: 'Original Roles Restored', value: `${rolesRestored}`, inline: true }
                    )
                    .setFooter({ text: `Cleared by ${interaction.user.tag}` })
                    .setTimestamp()
                
                if (errors.length > 0) {
                    embed.addFields({
                        name: '⚠️ Errors',
                        value: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more` : '')
                    })
                    embed.setColor(0xF39C12) // Orange if there were errors
                }

                await interaction.editReply({ embeds: [embed] })

                console.log(`[Clear Restrictions] ✅ Cleared ${clearedCount} restrictions for ${uniqueUserIds.length} users in guild ${interaction.guild.id}`)
                
            } else {
                // Clear restriction for specific user
                const member = await interaction.guild.members.fetch(selectedUserId).catch(() => null)
                if (!member) {
                    return interaction.editReply({
                        content: `❌ User <@${selectedUserId}> is not in the server.`
                    })
                }
                
                // CRITICAL FIX: Only get restrictions where the user actually has the restriction role
                const userRestrictions = config.dynamicRestrictionRoles.filter(entry => {
                    if (entry.userId !== selectedUserId) return false
                    
                    // CRITICAL FIX: Check if member exists before accessing roles
                    if (!member) return false
                    
                    const restrictionRole = interaction.guild.roles.cache.get(entry.roleId)
                    return restrictionRole && member.roles.cache.has(restrictionRole.id)
                })
                
                if (userRestrictions.length === 0) {
                    // CRITICAL FIX: Handle case where member or member.user might be null/undefined
                    let userTag
                    if (member && member.user && member.user.tag) {
                        userTag = member.user.tag
                    } else if (member && member.user && member.user.username) {
                        userTag = member.user.username
                    } else {
                        userTag = `User ${selectedUserId}`
                    }
                    
                    return interaction.editReply({
                        content: `❌ **${userTag}** has no active restriction roles applied.`
                    })
                }

                let rolesDeleted = 0
                let rolesRestored = 0
                const restrictedActions = []
                const errors = []
                
                // Process all restriction entries for this user
                for (const restrictionEntry of userRestrictions) {
                    try {
                        const restrictionRole = interaction.guild.roles.cache.get(restrictionEntry.roleId)
                        const originalRole = interaction.guild.roles.cache.get(restrictionEntry.originalRoleId)
                        
                        // Collect restricted actions
                        restrictedActions.push(...restrictionEntry.restrictedPermissions)
                        
                        // Remove restriction role from member
                        if (member && restrictionRole && member.roles.cache.has(restrictionRole.id)) {
                            await member.roles.remove(restrictionRole, `Clear Restrictions: Cleared by ${interaction.user.tag}`)
                                .catch(err => {
                                    console.error(`[Clear Restrictions] Error removing role:`, err.message)
                                    errors.push(`Failed to remove restriction role`)
                                })
                        }
                        
                        // Restore original role to member
                        if (member && originalRole && !member.roles.cache.has(originalRole.id)) {
                            await member.roles.add(originalRole, `Clear Restrictions: Restored by ${interaction.user.tag}`)
                                .catch(err => {
                                    console.error(`[Clear Restrictions] Error restoring role:`, err.message)
                                    errors.push(`Failed to restore original role`)
                                })
                            rolesRestored++
                        }
                        
                        // Delete the dynamic restriction role from server
                        if (restrictionRole) {
                            await restrictionRole.delete(`Clear Restrictions: Cleared by ${interaction.user.tag}`)
                                .catch(err => {
                                    console.error(`[Clear Restrictions] Error deleting role:`, err.message)
                                    errors.push(`Failed to delete restriction role from server`)
                                })
                            rolesDeleted++
                        }
                        
                    } catch (err) {
                        console.error(`[Clear Restrictions] Error processing restriction:`, err)
                        errors.push(`Error processing restriction entry`)
                    }
                }
                
                // Clear action tracking
                if (client.safeModerationTracker) {
                    await client.safeModerationTracker.clearActions(interaction.guild.id, selectedUserId)
                }

                // CRITICAL FIX: Use atomic update to prevent version conflicts
                // Reload config to get latest version, then update
                const freshConfig = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
                if (freshConfig) {
                    freshConfig.dynamicRestrictionRoles = freshConfig.dynamicRestrictionRoles.filter(
                        entry => entry.userId !== selectedUserId
                    )
                    
                    // Use retry logic for save to handle concurrent modifications
                    let saveSuccess = false
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            await freshConfig.save()
                            saveSuccess = true
                            break
                        } catch (saveErr) {
                            if (saveErr.name === 'VersionError' && attempt < 2) {
                                console.log(`[Clear Restrictions] Version conflict, retrying... (attempt ${attempt + 1})`)
                                // Reload and try again
                                const retryConfig = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
                                if (retryConfig) {
                                    retryConfig.dynamicRestrictionRoles = retryConfig.dynamicRestrictionRoles.filter(
                                        entry => entry.userId !== selectedUserId
                                    )
                                    freshConfig.overwrite(retryConfig)
                                }
                                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
                            } else {
                                console.error('[Clear Restrictions] Error saving config:', saveErr.message)
                                errors.push('Failed to update database')
                                break
                            }
                        }
                    }
                    
                    if (!saveSuccess) {
                        console.error('[Clear Restrictions] Failed to save after 3 attempts')
                    }
                }

                const actionNames = {
                    banKickMembers: 'Ban & Kick Members',
                    timeoutMembers: 'Timeout Members',
                    deleteRole: 'Delete Role',
                    deleteChannel: 'Delete Channel',
                    deleteMessages: 'Delete Messages',
                    changeNickname: 'Change Nickname',
                    addingMassBots: 'Adding Mass Bots',
                    voiceModeration: 'Voice Moderation (Disconnect/Move)',
                    mutingMembers: 'Muting Members from VC',
                    deafeningMembers: 'Deafening Members from VC',
                    everyoneHereSpam: '@everyone / @here Spam',
                    deleteEmojisStickers: 'Deleting Emojis & Stickers'
                }
                
                const formattedActions = [...new Set(restrictedActions)]
                    .map(action => actionNames[action] || action)
                    .join(', ')

                // CRITICAL FIX: Safely get user tag and ID
                const userTag = (member && member.user && member.user.tag) ? member.user.tag : `User ${selectedUserId}`
                const userId = (member && member.user) ? member.user.id : selectedUserId

                const embed = new EmbedBuilder()
                    .setColor(errors.length > 0 ? 0xF39C12 : 0x2ECC71)
                    .setTitle('✅ Restriction Cleared')
                    .setDescription(`Cleared restrictions for **${userTag}**.`)
                    .addFields(
                        { name: 'User', value: `<@${userId}>`, inline: true },
                        { name: 'Restrictions Cleared', value: `${userRestrictions.length}`, inline: true },
                        { name: 'Roles Deleted', value: `${rolesDeleted}`, inline: true },
                        { name: 'Original Roles Restored', value: `${rolesRestored}`, inline: true },
                        { name: 'Restricted Actions', value: formattedActions || 'None', inline: false }
                    )
                    .setFooter({ text: `Cleared by ${interaction.user.tag}` })
                    .setTimestamp()
                
                if (errors.length > 0) {
                    embed.addFields({
                        name: '⚠️ Errors',
                        value: errors.join('\n')
                    })
                }

                await interaction.editReply({ embeds: [embed] })

                console.log(`[Clear Restrictions] ✅ Cleared ${userRestrictions.length} restrictions for user ${member.user.id} in guild ${interaction.guild.id}`)
            }
        } catch (error) {
            console.error('[Clear Restrictions] Command error:', error)
            
            const errorMessage = `❌ An error occurred while clearing restrictions: ${error.message}`
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage })
            } else {
                await interaction.reply({ content: errorMessage, flags: ["Ephemeral"] })
            }
        }
    }
}
