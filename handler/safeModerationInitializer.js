/**
 * Safe Moderation Initializer - FIXED VERSION
 * Loads active restrictions from database on bot startup
 * Reschedules automatic role restorations with atomic operations
 */

const lt = require('long-timeout')
const { PermissionFlagsBits, EmbedBuilder, WebhookClient } = require('discord.js')
const { retryOperation } = require('./safeDbOperations')
const { getActionName } = require('./safeModerationHelpers')
const logger = require('./safeModerationLogger')

const log = logger.scope('Initializer')

// Store active restoration timeouts
const restorationTimeouts = new Map()

/**
 * Initialize safe-moderation restrictions on bot startup
 * Loads all active restrictions and reschedules their restorations
 * @param {Client} client 
 */
async function initSafeModerationRestrictions(client) {
    log.info('Initializing active restrictions...')
    
    try {
        const safeModerationSchema = require('../schemas/safeModerationSchema')
        
        // Get all guilds the bot is in
        const guilds = client.guilds.cache.filter(e => e.available).map(e => e.id)
        
        // Find all configs with active restrictions or dynamic roles
        const configs = await safeModerationSchema.find({
            guildID: { $in: guilds },
            $or: [
                { 'dynamicRestrictionRoles.0': { $exists: true } },
                { 'activeRestrictions.0': { $exists: true } }
            ]
        })
        
        let totalScheduled = 0
        let totalExpired = 0
        let totalCleaned = 0
        
        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guildID)
            if (!guild) continue
            
            // Process dynamic restriction roles
            if (config.dynamicRestrictionRoles && config.dynamicRestrictionRoles.length > 0) {
                const rolesToRemove = []
                
                for (const roleEntry of config.dynamicRestrictionRoles) {
                    try {
                        // Check if the role still exists using role ID
                        const restrictionRole = guild.roles.cache.get(roleEntry.roleId)
                        if (!restrictionRole) {
                            rolesToRemove.push(roleEntry.roleId)
                            totalCleaned++
                            continue
                        }
                        
                        // Check if the user still exists
                        const member = await guild.members.fetch(roleEntry.userId).catch(() => null)
                        if (!member) {
                            await restrictionRole.delete('Safe-Moderation: User left server').catch(() => {})
                            rolesToRemove.push(roleEntry.roleId)
                            totalCleaned++
                            continue
                        }
                        
                        // Check if user still has the restriction role
                        if (!member.roles.cache.has(roleEntry.roleId)) {
                            await restrictionRole.delete('Safe-Moderation: Role removed manually').catch(() => {})
                            rolesToRemove.push(roleEntry.roleId)
                            totalCleaned++
                            continue
                        }
                        
                        // Schedule restoration for each restricted permission
                        for (const actionType of roleEntry.restrictedPermissions) {
                            const permissionConfig = config.permissions[actionType]
                            if (!permissionConfig) continue
                            
                            // CRITICAL: Skip approval-mode permissions — they must wait for manual approval
                            if (permissionConfig.cooldown === -1 || roleEntry.approvalPending) {
                                log.debug(`Skipping ${actionType} for ${member.user.tag} - approval mode (awaiting manual approval)`)
                                continue
                            }
                            
                            // Use stored expiry time if available, otherwise calculate
                            let expiresAt
                            if (roleEntry.expiryTimes && roleEntry.expiryTimes[actionType]) {
                                expiresAt = new Date(roleEntry.expiryTimes[actionType])
                            } else {
                                const restrictedAt = roleEntry.createdAt || new Date()
                                const cooldownMs = permissionConfig.cooldown * 1000
                                expiresAt = new Date(restrictedAt.getTime() + cooldownMs)
                            }
                            
                            const timeUntilExpiry = expiresAt.getTime() - Date.now()
                            
                            if (timeUntilExpiry <= 0) {
                                // Already expired, restore immediately
                                await restoreRestriction(
                                    client,
                                    guild,
                                    member,
                                    actionType,
                                    config,
                                    roleEntry
                                )
                                totalExpired++
                            } else {
                                // Schedule future restoration
                                scheduleRestrictionRestoration(
                                    client,
                                    guild,
                                    member,
                                    actionType,
                                    config,
                                    roleEntry,
                                    timeUntilExpiry
                                )
                                totalScheduled++
                            }
                        }
                        
                    } catch (error) {
                        log.error('Error processing role entry', error)
                    }
                }
                
                // Clean up invalid entries
                if (rolesToRemove.length > 0) {
                    await retryOperation(async () => {
                        // Reload config to avoid version conflicts
                        const safeModerationSchema = require('../schemas/safeModerationSchema')
                        const freshConfig = await safeModerationSchema.findOne({ guildID: config.guildID })
                        if (freshConfig) {
                            freshConfig.dynamicRestrictionRoles = freshConfig.dynamicRestrictionRoles.filter(
                                entry => !rolesToRemove.includes(entry.roleId)
                            )
                            await freshConfig.save()
                        }
                    }, {
                        maxRetries: 5,
                        initialDelay: 100,
                        context: 'SafeModeration Init - Cleanup invalid entries'
                    }).catch(err => {
                        log.error('Failed to cleanup invalid entries after retries', err)
                    })
                }
            }
        }
        
        log.info(`Init complete: ${totalScheduled} scheduled, ${totalExpired} expired, ${totalCleaned} cleaned`)
        
        // Initialize bot quarantine auto-cleanup
        try {
            await initBotQuarantineCleanup(client)
        } catch (error) {
            log.error('Failed to init bot quarantine cleanup', error)
        }
        
        // Run initial cleanup of empty restriction roles
        try {
            const cleanupStats = await cleanupEmptyRestrictionRoles(client)
            log.info(`Initial empty role cleanup: ${cleanupStats.rolesDeleted} deleted, ${cleanupStats.dbEntriesRemoved} DB entries removed`)
            
            // Schedule periodic cleanup of empty restriction roles (every 12 hours)
            const emptyRoleCleanupInterval = 12 * 60 * 60 * 1000 // 12 hours
            setInterval(async () => {
                log.debug('Running periodic empty restriction role cleanup')
                try {
                    const stats = await cleanupEmptyRestrictionRoles(client)
                    if (stats.rolesDeleted > 0 || stats.dbEntriesRemoved > 0) {
                        log.info(`Periodic cleanup: ${stats.rolesDeleted} deleted, ${stats.dbEntriesRemoved} DB entries removed`)
                    }
                } catch (error) {
                    log.error('Periodic empty role cleanup error', error)
                }
            }, emptyRoleCleanupInterval)
            
            log.info('Periodic empty role cleanup scheduled (every 12h)')
        } catch (error) {
            log.error('Failed to run initial empty role cleanup', error)
        }
        
    } catch (error) {
        log.error('Initialization error', error)
    }
}

/**
 * Schedule a restriction restoration
 * @param {Client} client 
 * @param {Guild} guild 
 * @param {GuildMember} member 
 * @param {string} actionType 
 * @param {Object} config 
 * @param {Object} roleEntry 
 * @param {number} timeUntilExpiry 
 */
function scheduleRestrictionRestoration(client, guild, member, actionType, config, roleEntry, timeUntilExpiry) {
    const key = `${guild.id}_${member.id}_${roleEntry.roleId}_${actionType}`
    
    log.debug(`Scheduling restoration: ${member.user.tag} ${actionType} in ${Math.round(timeUntilExpiry / 60000)}m`)
    
    // Clear existing timeout if any
    if (restorationTimeouts.has(key)) {
        lt.clearTimeout(restorationTimeouts.get(key))
    }
    
    const timeoutId = lt.setTimeout(async () => {
        log.info(`Timeout fired: ${member.user.tag} - ${actionType}`)
        await restoreRestriction(client, guild, member, actionType, config, roleEntry)
        restorationTimeouts.delete(key)
    }, timeUntilExpiry)
    
    restorationTimeouts.set(key, timeoutId)
}

/**
 * Restore a restriction using ATOMIC operations to prevent race conditions
 * @param {Client} client 
 * @param {Guild} guild 
 * @param {GuildMember} member 
 * @param {string} actionType 
 * @param {Object} config 
 * @param {Object} roleEntry 
 */
async function restoreRestriction(client, guild, member, actionType, config, roleEntry) {
    try {
        log.info(`Restoring ${member.user.tag} - ${actionType}`)
        
        const safeModerationSchema = require('../schemas/safeModerationSchema')
        
        // ATOMIC OPERATION: Remove action from array and get updated document
        const updateResult = await safeModerationSchema.findOneAndUpdate(
            { 
                guildID: guild.id,
                'dynamicRestrictionRoles': {
                    $elemMatch: {
                        userId: member.id,
                        roleId: roleEntry.roleId,
                        restrictedPermissions: actionType
                    }
                }
            },
            {
                $pull: {
                    'dynamicRestrictionRoles.$.restrictedPermissions': actionType
                },
                $unset: {
                    [`dynamicRestrictionRoles.$.expiryTimes.${actionType}`]: ""
                }
            },
            { 
                new: true, // Return updated document
                runValidators: true
            }
        )
        
        if (!updateResult) {
            log.warn('Config or role entry not found during atomic update')
            return
        }
        
        // Find the updated role entry
        const dynamicRoleEntry = updateResult.dynamicRestrictionRoles?.find(
            entry => entry.userId === member.id && entry.roleId === roleEntry.roleId
        )
        
        if (!dynamicRoleEntry) {
            log.warn('Dynamic role entry not found after update')
            return
        }
        
        log.debug(`After atomic removal: remaining=${dynamicRoleEntry.restrictedPermissions.length} removed=${actionType}`)
        
        // Check if this was the last restriction
        const hasRemainingRestrictions = dynamicRoleEntry.restrictedPermissions.length > 0
        
        if (!hasRemainingRestrictions) {
            log.info('No more restrictions, fully restoring')
            
            await handleFullRestoration(guild, member, roleEntry, updateResult, actionType)
            
        } else {
            log.info(`Partial restore, remaining: ${dynamicRoleEntry.restrictedPermissions.join(', ')}`)
            
            await handlePartialRestoration(client, guild, member, roleEntry, dynamicRoleEntry, updateResult, actionType)
        }
        
        // Clear action history for this specific action
        if (client.safeModerationTracker) {
            await client.safeModerationTracker.clearActions(guild.id, member.id, actionType)
        }
        
        log.info('Restoration complete')
        
    } catch (error) {
        log.error('Restoration error', error)
    }
}

/**
 * Handle full restoration (delete role, restore original)
 * @param {Guild} guild 
 * @param {GuildMember} member 
 * @param {Object} roleEntry 
 * @param {Object} config 
 * @param {string} actionType 
 */
async function handleFullRestoration(guild, member, roleEntry, config, actionType) {
    try {
        const restrictionRole = guild.roles.cache.get(roleEntry.roleId)
        const originalRole = guild.roles.cache.get(roleEntry.originalRoleId)
        
        log.debug(`Restriction role: ${restrictionRole?.name || 'NOT FOUND'}, Original: ${originalRole?.name || 'NOT FOUND'}`)
        
        // Remove restriction role from member
        if (restrictionRole && member.roles.cache.has(restrictionRole.id)) {
            try {
                await member.roles.remove(restrictionRole, 'Safe-Moderation: All cooldowns expired')
            } catch (error) {
                log.error('Error removing restriction role', error)
            }
        }
        
        // Restore original role
        if (originalRole && !member.roles.cache.has(originalRole.id)) {
            try {
                await member.roles.add(originalRole, 'Safe-Moderation: Cooldown expired')
            } catch (error) {
                log.error('Error restoring original role', error)
            }
        }
        
        // Check if any other members have this restriction role before deleting
        if (restrictionRole) {
            try {
                await guild.members.fetch({ force: true }).catch(() => {})
                const roleMembers = guild.members.cache.filter(m => m.roles.cache.has(restrictionRole.id))
                
                if (roleMembers.size === 0) {
                    await restrictionRole.delete('Safe-Moderation: All restrictions expired, no members')
                        .catch(e => log.error('Error deleting restriction role', e))
                } else {
                    log.debug(`Not deleting restriction role - ${roleMembers.size} member(s) still have it`)
                }
            } catch (error) {
                log.error('Error checking role members', error)
            }
        }
        
        // ATOMIC: Remove the entire role entry from config
        try {
            const safeModerationSchema = require('../schemas/safeModerationSchema')
            await safeModerationSchema.findOneAndUpdate(
                { guildID: guild.id },
                {
                    $pull: {
                        dynamicRestrictionRoles: {
                            roleId: roleEntry.roleId,
                            userId: member.id
                        }
                    }
                }
            )
        } catch (error) {
            log.error('Error removing role entry from database', error)
        }
        
        // Send notification
        try {
            await sendFullRestorationNotification(guild, member, config, actionType)
        } catch (error) {
            log.error('Error sending full restoration notification', error)
        }
        
    } catch (error) {
        log.error('Error in handleFullRestoration', error)
    }
}

/**
 * Handle partial restoration (edit role permissions)
 * @param {Client} client 
 * @param {Guild} guild 
 * @param {GuildMember} member 
 * @param {Object} roleEntry 
 * @param {Object} dynamicRoleEntry 
 * @param {Object} config 
 * @param {string} actionType 
 */
async function handlePartialRestoration(client, guild, member, roleEntry, dynamicRoleEntry, config, actionType) {
    try {
        const restrictionRole = guild.roles.cache.get(roleEntry.roleId)
        const originalRole = guild.roles.cache.get(roleEntry.originalRoleId)
        
        if (!restrictionRole || !originalRole) {
            log.error(`Missing roles - restriction: ${!!restrictionRole}, original: ${!!originalRole}`)
            return
        }
        
        log.debug(`Recalculating permissions for ${restrictionRole.name}, remaining: ${dynamicRoleEntry.restrictedPermissions.join(', ')}`)
        
        const fastRestrictor = client.fastRestrictionApplier
        
        if (!fastRestrictor) {
            log.error('fastRestrictionApplier not available on client')
            return
        }
        
        // Collect ALL permissions to remove from ALL remaining restrictions
        const allPermsToRemove = []
        for (const remainingAction of dynamicRoleEntry.restrictedPermissions) {
            try {
                allPermsToRemove.push(...fastRestrictor.getPermissionsToRemove(remainingAction))
            } catch (error) {
                log.error(`Error getting permissions for action ${remainingAction}`, error)
            }
        }
        
        const uniquePermsToRemove = [...new Set(allPermsToRemove)]
        log.debug(`Permissions to keep restricted: ${uniquePermsToRemove.join(', ')}`)
        
        // Calculate new permissions
        let newPerms
        try {
            if (originalRole.permissions.has(PermissionFlagsBits.Administrator)) {
                const permsToRemoveValues = uniquePermsToRemove
                    .map(permName => PermissionFlagsBits[permName])
                    .filter(Boolean)
                
                const allPermissionValues = Object.values(PermissionFlagsBits).filter(val => typeof val === 'bigint')
                newPerms = allPermissionValues.filter(permValue => 
                    permValue !== PermissionFlagsBits.Administrator && 
                    !permsToRemoveValues.includes(permValue)
                )
            } else {
                const currentPerms = originalRole.permissions.toArray()
                newPerms = currentPerms.filter(perm => 
                    !uniquePermsToRemove.includes(perm) && perm !== 'Administrator'
                )
            }
        } catch (error) {
            log.error('Error calculating new permissions', error)
            return
        }
        
        // Update role permissions
        try {
            await restrictionRole.setPermissions(newPerms, 'Safe-Moderation: Partial restoration')
            
            // Verify the update
            try {
                const updatedRole = await guild.roles.fetch(restrictionRole.id, { force: true })
                const permsToRemoveValues = uniquePermsToRemove
                    .map(permName => PermissionFlagsBits[permName])
                    .filter(Boolean)
                
                const verificationFailed = permsToRemoveValues.some(permValue => 
                    updatedRole.permissions.has(permValue)
                )
                
                if (verificationFailed) {
                    log.warn('Verification failed - retrying...')
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    await restrictionRole.setPermissions(newPerms, 'Safe-Moderation: Retry')
                }
            } catch (error) {
                log.error('Error verifying role update', error)
            }
            
            // Send notification
            try {
                await sendPartialRestorationNotification(guild, member, config, actionType, dynamicRoleEntry.restrictedPermissions)
            } catch (error) {
                log.error('Error sending partial restoration notification', error)
            }
            
        } catch (error) {
            log.error('Failed to update role permissions', error)
            
            // Send failure notification
            try {
                await sendRoleUpdateFailureNotification(guild, member, actionType, config, error.message)
            } catch (notificationError) {
                log.error('Error sending failure notification', notificationError)
            }
        }
        
    } catch (error) {
        log.error('Error in handlePartialRestoration', error)
    }
}

/**
 * Cancel a scheduled restoration
 */
function cancelRestrictionRestoration(guildId, userId, roleId, actionType) {
    const key = `${guildId}_${userId}_${roleId}_${actionType}`
    
    if (restorationTimeouts.has(key)) {
        lt.clearTimeout(restorationTimeouts.get(key))
        restorationTimeouts.delete(key)
        log.debug(`Cancelled restoration timeout: ${key}`)
        return true
    }
    
    return false
}

/**
 * Initialize bot quarantine auto-cleanup system
 * Finds expired bot quarantines and schedules cleanup
 * @param {Client} client 
 */
async function initBotQuarantineCleanup(client) {
    try {
        log.info('Initializing bot quarantine auto-cleanup...')

        const safeModerationSchema = require('../schemas/safeModerationSchema')

        // Get all guilds the bot is in
        const guilds = client.guilds.cache.filter(e => e.available).map(e => e.id)

        // Find all configs with quarantined bots
        const configs = await safeModerationSchema.find({
            guildID: { $in: guilds },
            'quarantinedBots.0': { $exists: true }
        })

        let totalScheduled = 0
        let totalCleaned = 0

        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guildID)
            if (!guild) continue

            for (const quarantineEntry of config.quarantinedBots) {
                // Skip already approved bots
                if (quarantineEntry.approved) {
                    continue
                }

                // Calculate time until cleanup (3 days from added date)
                const threeDaysMs = 3 * 24 * 60 * 60 * 1000
                const cleanupTime = new Date(quarantineEntry.addedAt.getTime() + threeDaysMs)
                const timeUntilCleanup = cleanupTime.getTime() - Date.now()

                if (timeUntilCleanup <= 0) {
                    // Already past 3 days, cleanup immediately
                    log.info(`Bot ${quarantineEntry.botId} quarantine expired, cleaning up now`)

                    if (client.safeModerationManager) {
                        await client.safeModerationManager.autoCleanupBotQuarantine(guild.id, quarantineEntry.botId)
                    } else {
                        log.warn('safeModerationManager not available on client')
                    }

                    totalCleaned++
                } else {
                    // Schedule future cleanup
                    log.debug(`Scheduling quarantine cleanup for bot ${quarantineEntry.botId} in ${Math.round(timeUntilCleanup / 1000)}s`)

                    lt.setTimeout(async () => {
                        if (client.safeModerationManager) {
                            await client.safeModerationManager.autoCleanupBotQuarantine(guild.id, quarantineEntry.botId)
                        }
                    }, timeUntilCleanup)

                    totalScheduled++
                }
            }
        }

        log.info(`Bot quarantine cleanup init: ${totalScheduled} scheduled, ${totalCleaned} cleaned`)

        // Schedule periodic cleanup check (every 6 hours)
        const periodicCleanupInterval = 6 * 60 * 60 * 1000 // 6 hours
        setInterval(async () => {
            log.debug('Running periodic bot quarantine cleanup check')

            try {
                const configs = await safeModerationSchema.find({
                    guildID: { $in: client.guilds.cache.filter(e => e.available).map(e => e.id) },
                    'quarantinedBots.0': { $exists: true }
                })

                for (const config of configs) {
                    const guild = client.guilds.cache.get(config.guildID)
                    if (!guild) continue

                    for (const quarantineEntry of config.quarantinedBots) {
                        if (quarantineEntry.approved) continue

                        const threeDaysMs = 3 * 24 * 60 * 60 * 1000
                        const cleanupTime = new Date(quarantineEntry.addedAt.getTime() + threeDaysMs)

                        if (Date.now() >= cleanupTime.getTime()) {
                            log.info(`Periodic cleanup: Bot ${quarantineEntry.botId} quarantine expired`)

                            if (client.safeModerationManager) {
                                await client.safeModerationManager.autoCleanupBotQuarantine(guild.id, quarantineEntry.botId)
                            }
                        }
                    }
                }
            } catch (error) {
                log.error('Periodic quarantine cleanup error', error)
            }
        }, periodicCleanupInterval)

        log.info('Periodic bot quarantine cleanup scheduled (every 6h)')

    } catch (error) {
        log.error('Bot quarantine cleanup init error', error)
    }
}


/**
 * Cleanup empty restriction roles that have no members
 * Finds all restriction roles with no members, removes them from Discord, and cleans up database entries
 * @param {Client} client 
 * @returns {Promise<Object>} Statistics about the cleanup operation
 */
async function cleanupEmptyRestrictionRoles(client) {
    try {
        log.debug('Starting cleanup of empty restriction roles...')
        
        const safeModerationSchema = require('../schemas/safeModerationSchema')
        
        // Get all guilds the bot is in
        const guilds = client.guilds.cache.filter(e => e.available).map(e => e.id)
        
        // Find all configs with dynamic restriction roles
        const configs = await safeModerationSchema.find({
            guildID: { $in: guilds },
            'dynamicRestrictionRoles.0': { $exists: true }
        })
        
        let totalRolesChecked = 0
        let totalRolesDeleted = 0
        let totalDbEntriesRemoved = 0
        let totalErrors = 0
        
        const statistics = {
            guildsProcessed: 0,
            rolesChecked: 0,
            rolesDeleted: 0,
            dbEntriesRemoved: 0,
            errors: []
        }
        
        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guildID)
            if (!guild) continue
            
            statistics.guildsProcessed++
            log.debug(`Checking restriction roles in guild: ${guild.name}`)
            
            // Force fetch all members to ensure accurate role member counts
            try {
                await guild.members.fetch({ force: true })
            } catch (error) {
                log.warn(`Could not fetch all members for guild ${guild.id}`, error)
            }
            
            const rolesToRemove = []
            
            for (const roleEntry of config.dynamicRestrictionRoles) {
                totalRolesChecked++
                statistics.rolesChecked++
                
                try {
                    // Check if the role still exists
                    const restrictionRole = guild.roles.cache.get(roleEntry.roleId)
                    
                    if (!restrictionRole) {
                        rolesToRemove.push(roleEntry.roleId)
                        totalDbEntriesRemoved++
                        statistics.dbEntriesRemoved++
                        continue
                    }
                    
                    // Check if role has any members
                    const roleMembers = guild.members.cache.filter(member => 
                        member.roles.cache.has(roleEntry.roleId)
                    )
                    
                    if (roleMembers.size === 0) {
                        try {
                            await restrictionRole.delete('Safe-Moderation: Cleanup empty restriction role')
                            totalRolesDeleted++
                            statistics.rolesDeleted++
                        } catch (deleteError) {
                            log.error(`Failed to delete role ${restrictionRole.name}`, deleteError)
                            statistics.errors.push({
                                type: 'role_deletion',
                                roleId: roleEntry.roleId,
                                roleName: restrictionRole.name,
                                guildId: guild.id,
                                error: deleteError.message
                            })
                            totalErrors++
                        }
                        
                        // Mark for database cleanup regardless of deletion success
                        rolesToRemove.push(roleEntry.roleId)
                        totalDbEntriesRemoved++
                        statistics.dbEntriesRemoved++
                    }
                    
                } catch (error) {
                    log.error(`Error processing role entry ${roleEntry.roleId}`, error)
                    statistics.errors.push({
                        type: 'role_processing',
                        roleId: roleEntry.roleId,
                        guildId: guild.id,
                        error: error.message
                    })
                    totalErrors++
                }
            }
            
            // Clean up database entries for removed roles
            if (rolesToRemove.length > 0) {
                try {
                    await retryOperation(async () => {
                        // Reload config to avoid version conflicts
                        const freshConfig = await safeModerationSchema.findOne({ guildID: config.guildID })
                        if (freshConfig) {
                            freshConfig.dynamicRestrictionRoles = freshConfig.dynamicRestrictionRoles.filter(
                                entry => !rolesToRemove.includes(entry.roleId)
                            )
                            await freshConfig.save()
                        }
                    }, {
                        maxRetries: 5,
                        initialDelay: 100,
                        context: `SafeModeration Cleanup - Guild ${guild.id}`
                    })
                    
                } catch (dbError) {
                    log.error(`Failed to cleanup DB entries for guild ${guild.id}`, dbError)
                    statistics.errors.push({
                        type: 'database_cleanup',
                        guildId: guild.id,
                        roleIds: rolesToRemove,
                        error: dbError.message
                    })
                    totalErrors++
                }
            }
        }
        
        const summary = {
            guildsProcessed: statistics.guildsProcessed,
            rolesChecked: totalRolesChecked,
            rolesDeleted: totalRolesDeleted,
            dbEntriesRemoved: totalDbEntriesRemoved,
            errors: totalErrors,
            errorDetails: statistics.errors
        }
        
        log.info(`Cleanup: ${summary.guildsProcessed} guilds, ${summary.rolesChecked} checked, ${summary.rolesDeleted} deleted, ${summary.dbEntriesRemoved} DB removed, ${summary.errors} errors`)
        
        return summary
        
    } catch (error) {
        log.error('Cleanup error', error)
        return {
            guildsProcessed: 0,
            rolesChecked: 0,
            rolesDeleted: 0,
            dbEntriesRemoved: 0,
            errors: 1,
            errorDetails: [{
                type: 'initialization',
                error: error.message
            }]
        }
    }
}

module.exports = {
    initSafeModerationRestrictions,
    scheduleRestrictionRestoration,
    restoreRestriction,
    cancelRestrictionRestoration,
    handleFullRestoration,
    handlePartialRestoration,
    initBotQuarantineCleanup,
    cleanupEmptyRestrictionRoles,
    sendFullRestorationNotification,
    sendPartialRestorationNotification,
    sendRoleUpdateFailureNotification
}

/**
 * Send notification when user is fully restored (all restrictions expired)
 */
async function sendFullRestorationNotification(guild, member, config, actionType) {
    const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Safe-Moderation: Fully Restored')
        .setDescription(`**${member.user.tag}** has been fully restored after all cooldowns expired.`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Last Restriction', value: getActionName(actionType), inline: true }
        )
        .setTimestamp()
    
    // Send to channel
    if (config.logChannelId) {
        const channel = guild.channels.cache.get(config.logChannelId)
        if (channel) {
            await channel.send({ embeds: [embed] }).catch(e => log.error('Channel send error', e))
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
            log.error('Webhook notification error', error)
        }
    }
}

/**
 * Send notification when user is partially restored (some restrictions remain)
 */
async function sendPartialRestorationNotification(guild, member, config, actionType, remainingRestrictions) {
    const remainingNames = remainingRestrictions.map(r => getActionName(r)).join(', ')
    
    const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('⚠️ Safe-Moderation: Partial Restoration')
        .setDescription(`**${member.user.tag}** has been partially restored.`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Restored', value: getActionName(actionType), inline: true },
            { name: 'Still Restricted', value: remainingNames, inline: false }
        )
        .setTimestamp()
    
    // Send to channel
    if (config.logChannelId) {
        const channel = guild.channels.cache.get(config.logChannelId)
        if (channel) {
            await channel.send({ embeds: [embed] }).catch(e => log.error('Channel send error', e))
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
            log.error('Webhook notification error', error)
        }
    }
}

/**
 * Send notification when role update fails during partial restoration
 */
async function sendRoleUpdateFailureNotification(guild, member, actionType, config, errorMessage) {
    const actionName = getActionName(actionType)
    
    const embed = new EmbedBuilder()
        .setColor(0xE74C3C) // Red
        .setTitle('❌ Safe-Moderation: Role Update Failed')
        .setDescription(`Failed to update restriction role for **${member.user.tag}** during partial restoration.`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Action Type', value: actionName, inline: true },
            { name: 'Error', value: errorMessage.substring(0, 1024), inline: false },
            { name: 'Action Required', value: 'Please manually review this restriction using `/safe-moderation manage` or `/clear-restrictions`', inline: false }
        )
        .setTimestamp()
    
    // Build manager role mentions
    let content = ''
    if (config.managerRoles && config.managerRoles.length > 0) {
        const roleMentions = config.managerRoles
            .map(roleId => `<@&${roleId}>`)
            .join(' ')
        content = `${roleMentions} - Role update failed!`
    }
    
    // Try to send via webhook
    if (config.logWebhook) {
        try {
            const webhook = new WebhookClient({ url: config.logWebhook })
            await webhook.send({
                content: content || undefined,
                embeds: [embed],
                username: 'Safe-Moderation',
                avatarURL: guild.iconURL()
            })
            webhook.destroy()
        } catch (error) {
            log.error('Webhook notification error', error)
        }
    }
    
    // Also try log channel
    if (config.logChannelId) {
        const channel = guild.channels.cache.get(config.logChannelId)
        if (channel) {
            await channel.send({ 
                content: content || undefined,
                embeds: [embed] 
            }).catch(e => log.error('Channel send error', e))
        }
    }
}