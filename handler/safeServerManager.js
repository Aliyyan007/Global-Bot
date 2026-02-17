/**
 * Safe-Server Manager
 * Handles role management, restrictions, and bot quarantine
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js')

class SafeServerManager {
    constructor(client) {
        this.client = client
        this.safeServerSchema = require('../schemas/safeServerSchema')
    }

    /**
     * Initialize Safe-Server for a guild (create managed roles)
     * @param {Guild} guild 
     * @returns {Promise<Object>}
     */
    async initialize(guild) {
        let config = await this.safeServerSchema.findOne({ guildID: guild.id })
        
        if (!config) {
            config = new this.safeServerSchema({ guildID: guild.id })
        }

        if (config.rolesCreated) {
            return { success: true, message: 'Roles already created', config }
        }

        try {
            // Create SS-Admin role (full permissions)
            const adminRole = await guild.roles.create({
                name: 'SS-Admin',
                color: 0xE74C3C,
                permissions: [
                    PermissionFlagsBits.ManageGuild,
                    PermissionFlagsBits.ManageRoles,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.KickMembers,
                    PermissionFlagsBits.BanMembers,
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.MentionEveryone,
                    PermissionFlagsBits.ManageEmojisAndStickers,
                    PermissionFlagsBits.ViewAuditLog
                ],
                reason: 'Safe-Server: Admin role'
            })

            // Create SS-Moderator role (moderate permissions)
            const modRole = await guild.roles.create({
                name: 'SS-Moderator',
                color: 0x3498DB,
                permissions: [
                    PermissionFlagsBits.KickMembers,
                    PermissionFlagsBits.BanMembers,
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.MentionEveryone,
                    PermissionFlagsBits.ViewAuditLog
                ],
                reason: 'Safe-Server: Moderator role'
            })

            // Create SS-Bot-Quarantine role (no permissions)
            const botQuarantineRole = await guild.roles.create({
                name: 'SS-Bot-Quarantine',
                color: 0xE67E22,
                permissions: [],
                reason: 'Safe-Server: Bot quarantine role'
            })

            // Save base role IDs to config
            config.managedRoles = {
                admin: adminRole.id,
                moderator: modRole.id,
                botQuarantine: botQuarantineRole.id
            }
            
            // Create granular restriction roles
            await this.createGranularRoles(guild, config, adminRole, modRole)
            
            config.rolesCreated = true
            config.initialized = true
            await config.save()

            return {
                success: true,
                message: 'Safe-Server roles created successfully',
                config
            }
        } catch (error) {
            console.error('[SafeServer] Role creation error:', error)
            return {
                success: false,
                message: `Failed to create roles: ${error.message}`,
                config
            }
        }
    }

    /**
     * Create granular restriction roles
     * @private
     */
    async createGranularRoles(guild, config, adminRole, modRole) {
        const restrictionRoles = [
            {
                key: 'restrictedBan',
                name: 'SS-No-Ban',
                removePerms: [PermissionFlagsBits.BanMembers],
                color: 0x95A5A6
            },
            {
                key: 'restrictedKick',
                name: 'SS-No-Kick',
                removePerms: [PermissionFlagsBits.KickMembers],
                color: 0x95A5A6
            },
            {
                key: 'restrictedTimeout',
                name: 'SS-No-Timeout',
                removePerms: [PermissionFlagsBits.ModerateMembers],
                color: 0x95A5A6
            },
            {
                key: 'restrictedChannelDelete',
                name: 'SS-No-Channel-Delete',
                removePerms: [PermissionFlagsBits.ManageChannels],
                color: 0x95A5A6
            },
            {
                key: 'restrictedChannelCreate',
                name: 'SS-No-Channel-Create',
                removePerms: [PermissionFlagsBits.ManageChannels],
                color: 0x95A5A6
            },
            {
                key: 'restrictedRoleDelete',
                name: 'SS-No-Role-Delete',
                removePerms: [PermissionFlagsBits.ManageRoles],
                color: 0x95A5A6
            },
            {
                key: 'restrictedRoleUpdate',
                name: 'SS-No-Role-Update',
                removePerms: [PermissionFlagsBits.ManageRoles],
                color: 0x95A5A6
            },
            {
                key: 'restrictedEveryoneMention',
                name: 'SS-No-Everyone-Mention',
                removePerms: [PermissionFlagsBits.MentionEveryone],
                color: 0x95A5A6
            },
            {
                key: 'restrictedEmojiDelete',
                name: 'SS-No-Emoji-Delete',
                removePerms: [PermissionFlagsBits.ManageEmojisAndStickers],
                color: 0x95A5A6
            }
        ]

        for (const roleConfig of restrictionRoles) {
            // Get base permissions from admin role
            const basePermissions = adminRole.permissions.toArray()
            
            // Remove the restricted permission(s)
            const allowedPermissions = basePermissions.filter(perm => 
                !roleConfig.removePerms.includes(perm)
            )

            const role = await guild.roles.create({
                name: roleConfig.name,
                color: roleConfig.color,
                permissions: allowedPermissions,
                reason: `Safe-Server: Granular restriction role`
            })

            config.managedRoles[roleConfig.key] = role.id
        }
    }

    /**
     * Apply granular restriction to a moderator
     * @param {Guild} guild 
     * @param {GuildMember} moderator 
     * @param {string} actionType 
     * @param {Object} limitInfo 
     * @param {Object} config 
     * @returns {Promise<Object>}
     */
    async restrictModerator(guild, moderator, actionType, limitInfo, config) {
        console.log('[SafeServerManager] 🔒 restrictModerator called')
        console.log('[SafeServerManager] Guild:', guild.name, guild.id)
        console.log('[SafeServerManager] Moderator:', moderator.user.tag, moderator.id)
        console.log('[SafeServerManager] Action type:', actionType)
        console.log('[SafeServerManager] Limit info:', limitInfo)
        console.log('[SafeServerManager] Config enabled:', config?.enabled)
        
        if (!config || !config.enabled) {
            console.log('[SafeServerManager] ❌ Safe-Server not enabled')
            return { success: false, message: 'Safe-Server not enabled' }
        }

        try {
            // Map action types to restriction role keys
            const actionToRoleMap = {
                'ban': 'restrictedBan',
                'kick': 'restrictedKick',
                'timeout': 'restrictedTimeout',
                'channelDelete': 'restrictedChannelDelete',
                'channelCreate': 'restrictedChannelCreate',
                'roleDelete': 'restrictedRoleDelete',
                'roleUpdate': 'restrictedRoleUpdate',
                'everyoneMention': 'restrictedEveryoneMention',
                'emojiDelete': 'restrictedEmojiDelete'
            }

            const restrictionRoleKey = actionToRoleMap[actionType]
            if (!restrictionRoleKey) {
                console.log('[SafeServerManager] ❌ Unknown action type:', actionType)
                return { success: false, message: 'Unknown action type' }
            }

            console.log('[SafeServerManager] Restriction role key:', restrictionRoleKey)
            console.log('[SafeServerManager] Managed roles:', config.managedRoles)
            
            // Check if granular roles exist, if not create them
            if (!config.managedRoles[restrictionRoleKey]) {
                console.log('[SafeServerManager] ⚠️ Granular roles not found, creating them...')
                
                // We need to create restriction roles based on the actual admin role being used
                // Find the highest role with admin permissions to use as template
                const adminRoles = guild.roles.cache.filter(r => 
                    r.id !== guild.id && 
                    (r.permissions.has(PermissionFlagsBits.Administrator) || 
                     r.permissions.has(PermissionFlagsBits.BanMembers))
                ).sort((a, b) => b.position - a.position)
                
                const templateRole = adminRoles.first() || guild.roles.cache.get(config.managedRoles.admin)
                
                if (templateRole) {
                    await this.createGranularRoles(guild, config, templateRole, templateRole)
                    await config.save()
                    console.log('[SafeServerManager] ✅ Granular roles created')
                } else {
                    console.log('[SafeServerManager] ❌ Cannot create granular roles, no template role found')
                    return { success: false, message: 'No template role found for creating restriction roles' }
                }
            }
            
            const restrictionRoleId = config.managedRoles[restrictionRoleKey]
            if (!restrictionRoleId) {
                console.log('[SafeServerManager] ❌ Restriction role not found for:', restrictionRoleKey)
                return { success: false, message: `Restriction role not found: ${restrictionRoleKey}` }
            }

            let restrictionRole = guild.roles.cache.get(restrictionRoleId)
            if (!restrictionRole) {
                console.log('[SafeServerManager] ❌ Restriction role not in cache:', restrictionRoleId)
                return { success: false, message: 'Restriction role not found in guild' }
            }
            
            console.log('[SafeServerManager] ✅ Found restriction role:', restrictionRole.name, restrictionRole.id)

            // Find which role(s) grant them the dangerous permission
            const permissionMap = {
                'ban': 'BanMembers',
                'kick': 'KickMembers',
                'timeout': 'ModerateMembers',
                'channelDelete': 'ManageChannels',
                'channelCreate': 'ManageChannels',
                'roleDelete': 'ManageRoles',
                'roleUpdate': 'ManageRoles',
                'everyoneMention': 'MentionEveryone',
                'emojiDelete': 'ManageEmojisAndStickers'
            }
            
            const { PermissionFlagsBits } = require('discord.js')
            const requiredPerm = PermissionFlagsBits[permissionMap[actionType]]
            
            console.log('[SafeServerManager] Looking for roles with permission:', permissionMap[actionType])
            
            // Find all roles that grant this permission
            const rolesWithPermission = moderator.roles.cache.filter(role => 
                role.id !== guild.id && // Exclude @everyone
                role.permissions.has(requiredPerm)
            )
            
            console.log('[SafeServerManager] Found roles with permission:', rolesWithPermission.map(r => r.name).join(', '))
            
            if (rolesWithPermission.size === 0) {
                console.log('[SafeServerManager] ⚠️ Moderator has no roles with this permission')
                return { success: false, message: 'Moderator has no roles with this permission' }
            }
            
            // Get the highest role with this permission (most likely their main admin/mod role)
            const highestRoleWithPerm = rolesWithPermission.sort((a, b) => b.position - a.position).first()
            console.log('[SafeServerManager] Highest role with permission:', highestRoleWithPerm.name, highestRoleWithPerm.id)

            // Update restriction role to match the removed role's permissions (except the restricted one)
            console.log('[SafeServerManager] Updating restriction role permissions to match removed role...')
            
            // Get the permission bitfield as a BigInt
            const basePermissionsBitfield = highestRoleWithPerm.permissions.bitfield
            console.log('[SafeServerManager] Base permissions bitfield:', basePermissionsBitfield.toString())
            
            // Remove the restricted permission by using bitwise operations
            let newPermissionsBitfield = basePermissionsBitfield
            
            // Remove the specific restricted permission
            if ((newPermissionsBitfield & requiredPerm) === requiredPerm) {
                newPermissionsBitfield = newPermissionsBitfield & ~requiredPerm
                console.log('[SafeServerManager] ❌ Removed:', permissionMap[actionType])
            }
            
            // ALWAYS remove Administrator permission
            if ((newPermissionsBitfield & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator) {
                newPermissionsBitfield = newPermissionsBitfield & ~PermissionFlagsBits.Administrator
                console.log('[SafeServerManager] ❌ Removed: Administrator (bypasses all restrictions)')
            }
            
            console.log('[SafeServerManager] New permissions bitfield:', newPermissionsBitfield.toString())
            
            // Verify the permissions were removed
            const stillHasRestricted = (newPermissionsBitfield & requiredPerm) === requiredPerm
            const stillHasAdmin = (newPermissionsBitfield & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator
            
            console.log('[SafeServerManager] New bitfield still has restricted permission?', stillHasRestricted)
            console.log('[SafeServerManager] New bitfield still has Administrator?', stillHasAdmin)
            
            try {
                await restrictionRole.setPermissions(newPermissionsBitfield, 'Safe-Server: Match removed role permissions')
                console.log('[SafeServerManager] ✅ Updated restriction role permissions')
                
                // Verify the permissions were actually removed
                // Refetch the role from the guild
                const updatedRole = await guild.roles.fetch(restrictionRole.id, { force: true })
                const finalHasRestricted = updatedRole.permissions.has(requiredPerm)
                const finalHasAdministrator = updatedRole.permissions.has(PermissionFlagsBits.Administrator)
                
                console.log('[SafeServerManager] Restriction role still has restricted permission?', finalHasRestricted)
                console.log('[SafeServerManager] Restriction role still has Administrator?', finalHasAdministrator)
                
                if (finalHasRestricted || finalHasAdministrator) {
                    console.error('[SafeServerManager] ⚠️ WARNING: Restriction role still has dangerous permissions!')
                    if (finalHasRestricted) {
                        console.error('[SafeServerManager]   - Still has:', permissionMap[actionType])
                    }
                    if (finalHasAdministrator) {
                        console.error('[SafeServerManager]   - Still has: Administrator (this bypasses everything!)')
                    }
                } else {
                    console.log('[SafeServerManager] ✅ Verified: Restriction role permissions are correct')
                }
                
                // Update our local reference
                restrictionRole = updatedRole
            } catch (error) {
                console.error('[SafeServerManager] ⚠️ Failed to update restriction role permissions:', error.message)
                console.error('[SafeServerManager] Error stack:', error.stack)
                // Continue anyway, role might still work
            }

            // Find or create active restriction entry
            let restriction = config.activeRestrictions.find(r => r.userId === moderator.id)
            
            if (!restriction) {
                // First restriction for this user
                console.log('[SafeServerManager] Creating new restriction entry')
                
                // Check if bot can manage this role
                const botMember = await guild.members.fetchMe()
                const botHighestRole = botMember.roles.highest
                
                console.log('[SafeServerManager] Bot highest role:', botHighestRole.name, 'Position:', botHighestRole.position)
                console.log('[SafeServerManager] Target role:', highestRoleWithPerm.name, 'Position:', highestRoleWithPerm.position)
                
                if (highestRoleWithPerm.position >= botHighestRole.position) {
                    console.error('[SafeServerManager] ❌ Cannot remove role - bot role is not high enough')
                    return { 
                        success: false, 
                        message: `Cannot remove ${highestRoleWithPerm.name} - bot's role must be higher in the role hierarchy. Move bot's role above ${highestRoleWithPerm.name} in Server Settings → Roles.` 
                    }
                }
                
                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    console.error('[SafeServerManager] ❌ Bot lacks Manage Roles permission')
                    return { success: false, message: 'Bot lacks Manage Roles permission' }
                }
                
                // Remove the role that grants the dangerous permission
                console.log('[SafeServerManager] 🔍 About to remove role...')
                console.log('[SafeServerManager] Moderator current roles:', moderator.roles.cache.map(r => r.name).join(', '))
                console.log('[SafeServerManager] Role to remove:', highestRoleWithPerm.name, highestRoleWithPerm.id)
                console.log('[SafeServerManager] Moderator has this role?', moderator.roles.cache.has(highestRoleWithPerm.id))
                
                try {
                    await moderator.roles.remove(highestRoleWithPerm, `Safe-Server: ${actionType} limit exceeded`)
                    console.log('[SafeServerManager] ✅ Role removal command executed')
                    
                    // Verify removal
                    await moderator.fetch(true) // Force refresh from Discord
                    const stillHasRole = moderator.roles.cache.has(highestRoleWithPerm.id)
                    console.log('[SafeServerManager] After removal, still has role?', stillHasRole)
                    
                    if (stillHasRole) {
                        console.error('[SafeServerManager] ⚠️ Role removal command succeeded but role still present!')
                        console.error('[SafeServerManager] This might be a Discord API delay or caching issue')
                    } else {
                        console.log('[SafeServerManager] ✅ Confirmed: Role successfully removed')
                    }
                } catch (error) {
                    console.error('[SafeServerManager] ❌ Failed to remove role:', error.message)
                    console.error('[SafeServerManager] Error code:', error.code)
                    console.error('[SafeServerManager] Error stack:', error.stack)
                    return { 
                        success: false, 
                        message: `Failed to remove role: ${error.message}. Check bot's role position and permissions.` 
                    }
                }
                
                // Add restriction role (has all perms except the restricted one)
                console.log('[SafeServerManager] 🔍 About to add restriction role...')
                console.log('[SafeServerManager] Restriction role:', restrictionRole.name, restrictionRole.id)
                console.log('[SafeServerManager] Restriction role permissions:', restrictionRole.permissions.toArray().join(', '))
                
                try {
                    await moderator.roles.add(restrictionRole, `Safe-Server: ${actionType} limit exceeded`)
                    console.log('[SafeServerManager] ✅ Restriction role add command executed')
                    
                    // Verify addition
                    await moderator.fetch(true) // Force refresh from Discord
                    const hasRestrictionRole = moderator.roles.cache.has(restrictionRole.id)
                    console.log('[SafeServerManager] After addition, has restriction role?', hasRestrictionRole)
                    
                    if (!hasRestrictionRole) {
                        console.error('[SafeServerManager] ⚠️ Role addition command succeeded but role not present!')
                        console.error('[SafeServerManager] This might be a Discord API delay or caching issue')
                    } else {
                        console.log('[SafeServerManager] ✅ Confirmed: Restriction role successfully added')
                    }
                    
                    // CRITICAL: Verify the user no longer has the restricted permission
                    await moderator.fetch(true) // Force refresh permissions
                    const stillHasPermission = moderator.permissions.has(requiredPerm)
                    console.log('[SafeServerManager] 🔍 VERIFICATION: User still has', permissionMap[actionType], 'permission?', stillHasPermission)
                    
                    if (stillHasPermission) {
                        console.error('[SafeServerManager] ❌ CRITICAL: User still has the restricted permission!')
                        console.error('[SafeServerManager] This means the restriction did not work properly')
                        console.error('[SafeServerManager] Possible causes:')
                        console.error('[SafeServerManager]   1. User has permission from another role')
                        console.error('[SafeServerManager]   2. User has Administrator permission')
                        console.error('[SafeServerManager]   3. Restriction role has the permission (bug)')
                        
                        // List all roles that grant this permission
                        const rolesWithPerm = moderator.roles.cache.filter(r => r.permissions.has(requiredPerm))
                        console.error('[SafeServerManager] Roles that grant this permission:', rolesWithPerm.map(r => r.name).join(', '))
                    } else {
                        console.log('[SafeServerManager] ✅ VERIFIED: User no longer has', permissionMap[actionType], 'permission')
                    }
                    
                    console.log('[SafeServerManager] Final roles:', moderator.roles.cache.map(r => r.name).join(', '))
                } catch (error) {
                    console.error('[SafeServerManager] ❌ Failed to add restriction role:', error.message)
                    console.error('[SafeServerManager] Error code:', error.code)
                    console.error('[SafeServerManager] Error stack:', error.stack)
                    // Try to restore the original role since we removed it
                    try {
                        await moderator.roles.add(highestRoleWithPerm, 'Safe-Server: Restoring role after error')
                        console.log('[SafeServerManager] ✅ Restored original role after error')
                    } catch (restoreError) {
                        console.error('[SafeServerManager] ❌ Failed to restore role:', restoreError.message)
                    }
                    return { 
                        success: false, 
                        message: `Failed to add restriction role: ${error.message}` 
                    }
                }
                
                const expiresAt = new Date(Date.now() + (config.restriction.cooldownDuration * 1000))
                
                restriction = {
                    userId: moderator.id,
                    originalRole: highestRoleWithPerm.id, // Store their actual admin/mod role
                    restrictedActions: [actionType],
                    restrictedAt: new Date(),
                    expiresAt: expiresAt,
                    actionTimers: [{
                        actionType: actionType,
                        expiresAt: expiresAt
                    }]
                }
                
                config.activeRestrictions.push(restriction)
                
            } else {
                // User already has restrictions, add another one
                console.log('[SafeServerManager] Adding to existing restriction')
                console.log('[SafeServerManager] Current restricted actions:', restriction.restrictedActions)
                console.log('[SafeServerManager] Trying to add:', actionType)
                
                if (!restriction.restrictedActions.includes(actionType)) {
                    // They already have some restrictions, need to add another
                    
                    // Find the role that grants this NEW permission
                    const newRolesWithPermission = moderator.roles.cache.filter(role => 
                        role.id !== guild.id && // Exclude @everyone
                        role.permissions.has(requiredPerm)
                    )
                    
                    console.log('[SafeServerManager] Roles with this permission:', newRolesWithPermission.map(r => r.name).join(', '))
                    
                    if (newRolesWithPermission.size > 0) {
                        const newHighestRole = newRolesWithPermission.sort((a, b) => b.position - a.position).first()
                        console.log('[SafeServerManager] Highest role with permission:', newHighestRole.name)
                        console.log('[SafeServerManager] Original stored role ID:', restriction.originalRole)
                        
                        // Only remove if it's different from the already stored original role
                        if (newHighestRole.id !== restriction.originalRole) {
                            console.log('[SafeServerManager] This is a different role, removing it...')
                            await moderator.roles.remove(newHighestRole, `Safe-Server: ${actionType} limit exceeded`)
                            console.log('[SafeServerManager] ✅ Removed additional role:', newHighestRole.name)
                            
                            // Store this as an additional removed role
                            if (!restriction.additionalRemovedRoles) {
                                restriction.additionalRemovedRoles = []
                            }
                            restriction.additionalRemovedRoles.push(newHighestRole.id)
                        } else {
                            console.log('[SafeServerManager] ⚠️ This is the same role already removed, skipping removal')
                        }
                    }
                    
                    // Remove current restriction role(s)
                    const currentRestrictionRoles = restriction.restrictedActions.map(action => {
                        const roleKey = actionToRoleMap[action]
                        return config.managedRoles[roleKey]
                    }).filter(Boolean)
                    
                    console.log('[SafeServerManager] Current restriction roles to remove:', currentRestrictionRoles)
                    
                    if (currentRestrictionRoles.length > 0) {
                        await moderator.roles.remove(currentRestrictionRoles, 'Safe-Server: Updating restrictions')
                        console.log('[SafeServerManager] ✅ Removed old restriction roles')
                    }
                    
                    // Add new action to restricted list
                    restriction.restrictedActions.push(actionType)
                    console.log('[SafeServerManager] Updated restricted actions:', restriction.restrictedActions)
                    
                    // Add all restriction roles (including new one)
                    const allRestrictionRoles = restriction.restrictedActions.map(action => {
                        const roleKey = actionToRoleMap[action]
                        return config.managedRoles[roleKey]
                    }).filter(Boolean)
                    
                    console.log('[SafeServerManager] All restriction roles to add:', allRestrictionRoles)
                    
                    await moderator.roles.add(allRestrictionRoles, `Safe-Server: ${actionType} limit exceeded`)
                    console.log('[SafeServerManager] ✅ Added all restriction roles')
                    
                    // Add timer for this action
                    const expiresAt = new Date(Date.now() + (config.restriction.cooldownDuration * 1000))
                    restriction.actionTimers.push({
                        actionType: actionType,
                        expiresAt: expiresAt
                    })
                    
                    // Update overall expiration to latest
                    if (expiresAt > restriction.expiresAt) {
                        restriction.expiresAt = expiresAt
                    }
                } else {
                    console.log('[SafeServerManager] ⚠️ Action already restricted')
                    console.log('[SafeServerManager] ⚠️ This means the user already has this restriction active')
                    console.log('[SafeServerManager] ⚠️ Skipping duplicate restriction')
                }
            }
            
            await config.save()
            console.log('[SafeServerManager] ✅ Restriction saved to database')

            // Schedule automatic restoration for this specific action
            setTimeout(() => {
                this.restoreModeratorAction(guild.id, moderator.id, actionType).catch(console.error)
            }, config.restriction.cooldownDuration * 1000)
            console.log('[SafeServerManager] ✅ Scheduled automatic restoration for', actionType)

            // Send notification
            await this.sendRestrictionNotification(guild, moderator, actionType, limitInfo, config, restriction.expiresAt)
            console.log('[SafeServerManager] ✅ Notification sent')

            return {
                success: true,
                message: 'Moderator restricted successfully',
                restrictedActions: restriction.restrictedActions,
                expiresAt: restriction.expiresAt
            }
        } catch (error) {
            console.error('[SafeServerManager] ❌ Restriction error:', error)
            console.error('[SafeServerManager] Error stack:', error.stack)

            return {
                success: false,
                message: `Failed to restrict: ${error.message}`
            }
        }
    }

    /**
     * Restore a specific action for a moderator after cooldown expires
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} actionType 
     * @returns {Promise<void>}
     */
    async restoreModeratorAction(guildId, userId, actionType) {
        try {
            console.log(`[SafeServerManager] 🔓 Restoring ${actionType} for user ${userId}`)
            
            const config = await this.safeServerSchema.findOne({ guildID: guildId })
            if (!config) return

            const restriction = config.activeRestrictions.find(r => r.userId === userId)
            if (!restriction) return

            const guild = this.client.guilds.cache.get(guildId)
            if (!guild) return

            const member = await guild.members.fetch(userId).catch(() => null)
            if (!member) {
                // Remove restriction if member left
                config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
                await config.save()
                return
            }

            // Remove this action from restricted list
            restriction.restrictedActions = restriction.restrictedActions.filter(a => a !== actionType)
            restriction.actionTimers = restriction.actionTimers.filter(t => t.actionType !== actionType)
            
            console.log(`[SafeServerManager] Remaining restricted actions:`, restriction.restrictedActions)

            // Map action types to restriction role keys
            const actionToRoleMap = {
                'ban': 'restrictedBan',
                'kick': 'restrictedKick',
                'timeout': 'restrictedTimeout',
                'channelDelete': 'restrictedChannelDelete',
                'channelCreate': 'restrictedChannelCreate',
                'roleDelete': 'restrictedRoleDelete',
                'roleUpdate': 'restrictedRoleUpdate',
                'everyoneMention': 'restrictedEveryoneMention',
                'emojiDelete': 'restrictedEmojiDelete'
            }

            if (restriction.restrictedActions.length === 0) {
                // No more restrictions, fully restore
                console.log('[SafeServerManager] No more restrictions, fully restoring moderator')
                
                // Remove all restriction roles
                const allRestrictionRoles = Object.keys(actionToRoleMap).map(action => {
                    const roleKey = actionToRoleMap[action]
                    return config.managedRoles[roleKey]
                }).filter(roleId => roleId && member.roles.cache.has(roleId))
                
                if (allRestrictionRoles.length > 0) {
                    await member.roles.remove(allRestrictionRoles, 'Safe-Server: All cooldowns expired')
                    console.log('[SafeServerManager] ✅ Removed all restriction roles')
                }
                
                // Restore original role
                if (restriction.originalRole && guild.roles.cache.has(restriction.originalRole)) {
                    await member.roles.add(restriction.originalRole, 'Safe-Server: All cooldowns expired')
                    console.log('[SafeServerManager] ✅ Restored original role')
                }
                
                // Restore any additional removed roles
                if (restriction.additionalRemovedRoles && restriction.additionalRemovedRoles.length > 0) {
                    const rolesToRestore = restriction.additionalRemovedRoles.filter(roleId => 
                        guild.roles.cache.has(roleId)
                    )
                    if (rolesToRestore.length > 0) {
                        await member.roles.add(rolesToRestore, 'Safe-Server: All cooldowns expired')
                        console.log('[SafeServerManager] ✅ Restored additional roles')
                    }
                }
                
                // Remove from active restrictions
                config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
                
                // Clear action history
                if (this.client.safeServerTracker) {
                    await this.client.safeServerTracker.clearActions(guildId, userId)
                }
                
                // Send full restoration notification
                await this.sendRestorationNotification(guild, member, config, actionType)
                
            } else {
                // Still has other restrictions, update roles
                console.log('[SafeServerManager] Still has restrictions, updating roles')
                
                // Remove all current restriction roles
                const currentRestrictionRoles = Object.keys(actionToRoleMap).map(action => {
                    const roleKey = actionToRoleMap[action]
                    return config.managedRoles[roleKey]
                }).filter(roleId => roleId && member.roles.cache.has(roleId))
                
                if (currentRestrictionRoles.length > 0) {
                    await member.roles.remove(currentRestrictionRoles, 'Safe-Server: Updating restrictions')
                }
                
                // Add back only the remaining restriction roles
                const remainingRestrictionRoles = restriction.restrictedActions.map(action => {
                    const roleKey = actionToRoleMap[action]
                    return config.managedRoles[roleKey]
                }).filter(Boolean)
                
                if (remainingRestrictionRoles.length > 0) {
                    await member.roles.add(remainingRestrictionRoles, 'Safe-Server: Partial restoration')
                    console.log('[SafeServerManager] ✅ Updated restriction roles')
                }
                
                // Send partial restoration notification
                await this.sendPartialRestorationNotification(guild, member, config, actionType, restriction.restrictedActions)
            }
            
            await config.save()
            console.log('[SafeServerManager] ✅ Restoration complete')

        } catch (error) {
            console.error('[SafeServerManager] Restoration error:', error)
        }
    }

    /**
     * Restore moderator after cooldown expires (legacy support)
     * @param {string} guildId 
     * @param {string} userId 
     * @returns {Promise<void>}
     */
    async restoreModerator(guildId, userId) {
        try {
            const config = await this.safeServerSchema.findOne({ guildID: guildId })
            if (!config) return

            const restriction = config.activeRestrictions.find(r => r.userId === userId)
            if (!restriction) return

            const guild = this.client.guilds.cache.get(guildId)
            if (!guild) return

            const member = await guild.members.fetch(userId).catch(() => null)
            if (!member) {
                // Remove restriction if member left
                config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
                await config.save()
                return
            }

            const restrictedRole = guild.roles.cache.get(config.managedRoles?.restricted)
            
            // Remove restricted role
            if (restrictedRole && member.roles.cache.has(restrictedRole.id)) {
                await member.roles.remove(restrictedRole, 'Safe-Server: Cooldown expired')
            }

            // Restore original SS roles
            if (restriction.originalRoles && restriction.originalRoles.length > 0) {
                const rolesToRestore = restriction.originalRoles.filter(roleId => 
                    guild.roles.cache.has(roleId)
                )
                if (rolesToRestore.length > 0) {
                    await member.roles.add(rolesToRestore, 'Safe-Server: Cooldown expired')
                }
            }

            // Remove from active restrictions
            config.activeRestrictions = config.activeRestrictions.filter(r => r.userId !== userId)
            await config.save()

            // Clear action history
            if (this.client.safeServerTracker) {
                await this.client.safeServerTracker.clearActions(guildId, userId)
            }

            // Send restoration notification
            await this.sendRestorationNotification(guild, member, config)

        } catch (error) {
            console.error('[SafeServer] Restoration error:', error)
        }
    }

    /**
     * Quarantine a bot
     * @param {Guild} guild 
     * @param {GuildMember} bot 
     * @param {string} addedBy 
     * @param {Object} config 
     * @returns {Promise<Object>}
     */
    async quarantineBot(guild, bot, addedBy, config) {
        if (!config || !config.enabled || !config.botProtection.enabled) {
            return { success: false, message: 'Bot protection not enabled' }
        }

        try {
            const quarantineRole = guild.roles.cache.get(config.managedRoles?.botQuarantine)
            if (!quarantineRole) {
                return { success: false, message: 'SS-Bot-Quarantine role not found' }
            }

            // Remove all roles and add quarantine role
            await bot.roles.set([quarantineRole.id], 'Safe-Server: Bot quarantine')

            // Add to quarantined bots
            config.quarantinedBots.push({
                botId: bot.id,
                addedBy: addedBy,
                addedAt: new Date(),
                approved: false
            })
            await config.save()

            // Send notification
            await this.sendBotQuarantineNotification(guild, bot, addedBy, config)

            return {
                success: true,
                message: 'Bot quarantined successfully'
            }
        } catch (error) {
            console.error('[SafeServer] Bot quarantine error:', error)
            return {
                success: false,
                message: `Failed to quarantine bot: ${error.message}`
            }
        }
    }

    /**
     * Send timeout notification
     * @private
     */
    async sendTimeoutNotification(guild, moderator, actionType, limitInfo, config) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const actionNames = {
            'ban': 'Ban',
            'kick': 'Kick',
            'timeout': 'Timeout',
            'channelDelete': 'Channel Delete',
            'channelCreate': 'Channel Create',
            'roleDelete': 'Role Delete',
            'roleUpdate': 'Role Update',
            'everyoneMention': '@everyone/@here Mention',
            'emojiDelete': 'Emoji Delete'
        }

        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('⏱️ Safe-Server: Moderator Timed Out')
            .setDescription(`<@${moderator.id}> has been timed out for exceeding action limits.\n\n**Note:** User doesn't have SS role, so timeout was used instead of granular restriction.`)
            .addFields(
                { name: 'Moderator', value: `${moderator.user.tag} (${moderator.id})`, inline: true },
                { name: 'Action Type', value: actionNames[actionType] || actionType, inline: true },
                { name: 'Limit', value: `${limitInfo.count}/${limitInfo.limit} in ${limitInfo.duration}s`, inline: true },
                { name: 'Duration', value: `${config.restriction.cooldownDuration} seconds`, inline: true },
                { name: 'Recommendation', value: 'Assign SS-Admin or SS-Moderator role for granular restrictions' }
            )
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(console.error)
    }

    /**
     * Send restriction notification
     * @private
     */
    async sendRestrictionNotification(guild, moderator, actionType, limitInfo, config, expiresAt) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const actionNames = {
            'ban': 'Ban',
            'kick': 'Kick',
            'timeout': 'Timeout',
            'channelDelete': 'Channel Delete',
            'channelCreate': 'Channel Create',
            'roleDelete': 'Role Delete',
            'roleUpdate': 'Role Update',
            'everyoneMention': '@everyone/@here Mention',
            'emojiDelete': 'Emoji Delete'
        }

        // Get the restriction info
        const restriction = config.activeRestrictions.find(r => r.userId === moderator.id)
        let removedRoleName = 'Unknown'
        if (restriction && restriction.originalRole) {
            const removedRole = guild.roles.cache.get(restriction.originalRole)
            if (removedRole) removedRoleName = removedRole.name
        }

        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🚨 Safe-Server: Action Restricted')
            .setDescription(`<@${moderator.id}> has been restricted from using **${actionNames[actionType] || actionType}**.`)
            .addFields(
                { name: 'Moderator', value: `${moderator.user.tag} (${moderator.id})`, inline: true },
                { name: 'Action Type', value: actionNames[actionType] || actionType, inline: true },
                { name: 'Limit', value: `${limitInfo.count}/${limitInfo.limit} in ${limitInfo.duration}s`, inline: true },
                { name: 'Role Removed', value: removedRoleName, inline: true },
                { name: 'Restriction Role Added', value: `SS-No-${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`, inline: true },
                { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Original role will be restored after cooldown' })
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(console.error)

        // Try to DM the moderator
        try {
            await moderator.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setTitle('⚠️ Safe-Server Restriction')
                        .setDescription(`You have been temporarily restricted from using **${actionNames[actionType] || actionType}** in **${guild.name}**.`)
                        .addFields(
                            { name: 'Reason', value: `${limitInfo.count}/${limitInfo.limit} actions in ${limitInfo.duration} seconds` },
                            { name: 'Your Role', value: `${removedRoleName} was temporarily removed` },
                            { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` },
                            { name: 'Note', value: 'You can still use other moderation actions. Your role will be restored automatically.' }
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
    async sendRestorationNotification(guild, member, config, actionType) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const actionNames = {
            'ban': 'Ban',
            'kick': 'Kick',
            'timeout': 'Timeout',
            'channelDelete': 'Channel Delete',
            'channelCreate': 'Channel Create',
            'roleDelete': 'Role Delete',
            'roleUpdate': 'Role Update',
            'everyoneMention': '@everyone/@here Mention',
            'emojiDelete': 'Emoji Delete'
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('✅ Safe-Server: Fully Restored')
            .setDescription(`<@${member.id}> has been fully restored after all cooldowns expired.`)
            .addFields(
                { name: 'Moderator', value: `${member.user.tag} (${member.id})` },
                { name: 'Last Restriction', value: actionNames[actionType] || actionType }
            )
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(console.error)
    }

    /**
     * Send partial restoration notification
     * @private
     */
    async sendPartialRestorationNotification(guild, member, config, restoredAction, remainingActions) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const actionNames = {
            'ban': 'Ban',
            'kick': 'Kick',
            'timeout': 'Timeout',
            'channelDelete': 'Channel Delete',
            'channelCreate': 'Channel Create',
            'roleDelete': 'Role Delete',
            'roleUpdate': 'Role Update',
            'everyoneMention': '@everyone/@here Mention',
            'emojiDelete': 'Emoji Delete'
        }

        const remainingList = remainingActions.map(a => actionNames[a] || a).join(', ')

        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('🔓 Safe-Server: Partial Restoration')
            .setDescription(`<@${member.id}> can now use **${actionNames[restoredAction] || restoredAction}** again.`)
            .addFields(
                { name: 'Moderator', value: `${member.user.tag} (${member.id})` },
                { name: 'Restored Action', value: actionNames[restoredAction] || restoredAction },
                { name: 'Still Restricted', value: remainingList || 'None' }
            )
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(console.error)
    }

    /**
     * Send bot quarantine notification
     * @private
     */
    async sendBotQuarantineNotification(guild, bot, addedBy, config) {
        if (!config.logChannelId) return

        const logChannel = guild.channels.cache.get(config.logChannelId)
        if (!logChannel) return

        const embed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🤖 Safe-Server: Bot Quarantined')
            .setDescription(`A new bot has been quarantined and requires approval.`)
            .addFields(
                { name: 'Bot', value: `${bot.user.tag} (${bot.id})`, inline: true },
                { name: 'Added By', value: `<@${addedBy}>`, inline: true }
            )
            .setTimestamp()

        await logChannel.send({ embeds: [embed] }).catch(console.error)

        // Notify server owner
        try {
            const owner = await guild.fetchOwner()
            await owner.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE67E22)
                        .setTitle('🤖 Safe-Server: Bot Approval Required')
                        .setDescription(`A new bot was added to **${guild.name}** and has been quarantined.`)
                        .addFields(
                            { name: 'Bot', value: `${bot.user.tag} (${bot.id})` },
                            { name: 'Added By', value: `<@${addedBy}>` },
                            { name: 'Action Required', value: 'Use `/safe-server approve-bot` to approve or remove the bot manually.' }
                        )
                ]
            })
        } catch (error) {
            // Owner has DMs disabled
        }
    }
}

module.exports = SafeServerManager
