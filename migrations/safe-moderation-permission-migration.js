/**
 * Safe Moderation Permission Migration Script
 * Migrates existing configurations from old separate permissions to new combined permissions
 */

const safeModerationSchema = require('../schemas/safeModerationSchema')
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('Migration')

/**
 * Migration function to convert old permissions to new combined permissions
 */
async function migrateSafeModerationPermissions() {
    log.info('[Migration] Starting Safe Moderation permission migration...')
    
    try {
        // Find all guilds with safe moderation configured
        const configs = await safeModerationSchema.find({})
        
        let migratedCount = 0
        let errorCount = 0
        
        for (const config of configs) {
            try {
                let needsSave = false
                
                // Migrate banMembers + kickMembers → banKickMembers
                if (config.permissions?.banMembers || config.permissions?.kickMembers) {
                    const banConfig = config.permissions.banMembers
                    const kickConfig = config.permissions.kickMembers
                    
                    // Use the more restrictive settings between ban and kick
                    const combinedConfig = {
                        enabled: (banConfig?.enabled || false) || (kickConfig?.enabled || false),
                        cooldown: Math.min(banConfig?.cooldown || 86400, kickConfig?.cooldown || 86400),
                        actionCount: Math.min(banConfig?.actionCount || 3, kickConfig?.actionCount || 3),
                        timeBetweenActions: Math.min(banConfig?.timeBetweenActions || 21600, kickConfig?.timeBetweenActions || 21600),
                        restrictionType: banConfig?.restrictionType || kickConfig?.restrictionType || 'global',
                        specificRoles: [...(banConfig?.specificRoles || []), ...(kickConfig?.specificRoles || [])],
                        specificUsers: [...(banConfig?.specificUsers || []), ...(kickConfig?.specificUsers || [])]
                    }
                    
                    // Remove duplicates from arrays
                    combinedConfig.specificRoles = [...new Set(combinedConfig.specificRoles)]
                    combinedConfig.specificUsers = [...new Set(combinedConfig.specificUsers)]
                    
                    config.permissions.banKickMembers = combinedConfig
                    needsSave = true
                    
                    log.info(`[Migration] Guild ${config.guildID}: Migrated ban+kick permissions`)
                }
                
                // Migrate disconnectingMembers + movingMembers → voiceModeration
                if (config.permissions?.disconnectingMembers || config.permissions?.movingMembers) {
                    const disconnectConfig = config.permissions.disconnectingMembers
                    const moveConfig = config.permissions.movingMembers
                    
                    // Use the more restrictive settings between disconnect and move
                    const combinedConfig = {
                        enabled: (disconnectConfig?.enabled || false) || (moveConfig?.enabled || false),
                        cooldown: Math.min(disconnectConfig?.cooldown || 86400, moveConfig?.cooldown || 86400),
                        actionCount: Math.min(disconnectConfig?.actionCount || 3, moveConfig?.actionCount || 3),
                        timeBetweenActions: Math.min(disconnectConfig?.timeBetweenActions || 21600, moveConfig?.timeBetweenActions || 21600),
                        restrictionType: disconnectConfig?.restrictionType || moveConfig?.restrictionType || 'global',
                        specificRoles: [...(disconnectConfig?.specificRoles || []), ...(moveConfig?.specificRoles || [])],
                        specificUsers: [...(disconnectConfig?.specificUsers || []), ...(moveConfig?.specificUsers || [])]
                    }
                    
                    // Remove duplicates from arrays
                    combinedConfig.specificRoles = [...new Set(combinedConfig.specificRoles)]
                    combinedConfig.specificUsers = [...new Set(combinedConfig.specificUsers)]
                    
                    config.permissions.voiceModeration = combinedConfig
                    needsSave = true
                    
                    log.info(`[Migration] Guild ${config.guildID}: Migrated disconnect+move permissions`)
                }
                
                // Add deafeningMembers if not present
                if (!config.permissions?.deafeningMembers) {
                    config.permissions.deafeningMembers = {
                        enabled: true,
                        cooldown: 86400,
                        actionCount: 3,
                        timeBetweenActions: 21600,
                        restrictionType: 'global',
                        specificRoles: [],
                        specificUsers: []
                    }
                    needsSave = true
                    
                    log.info(`[Migration] Guild ${config.guildID}: Added deafeningMembers permission`)
                }
                
                // Migrate existing dynamic restriction roles to use new permission names
                if (config.dynamicRestrictionRoles && config.dynamicRestrictionRoles.length > 0) {
                    let rolesUpdated = false
                    
                    for (const roleEntry of config.dynamicRestrictionRoles) {
                        if (roleEntry.restrictedPermissions) {
                            const oldPermissions = [...roleEntry.restrictedPermissions]
                            const newPermissions = []
                            
                            // Convert old permission names to new ones
                            for (const permission of oldPermissions) {
                                if (permission === 'banMembers' || permission === 'kickMembers') {
                                    if (!newPermissions.includes('banKickMembers')) {
                                        newPermissions.push('banKickMembers')
                                    }
                                } else if (permission === 'disconnectingMembers' || permission === 'movingMembers') {
                                    if (!newPermissions.includes('voiceModeration')) {
                                        newPermissions.push('voiceModeration')
                                    }
                                } else {
                                    // Keep other permissions as-is
                                    newPermissions.push(permission)
                                }
                            }
                            
                            if (JSON.stringify(oldPermissions) !== JSON.stringify(newPermissions)) {
                                roleEntry.restrictedPermissions = newPermissions
                                rolesUpdated = true
                            }
                        }
                    }
                    
                    if (rolesUpdated) {
                        needsSave = true
                        log.info(`[Migration] Guild ${config.guildID}: Updated dynamic restriction roles`)
                    }
                }
                
                if (needsSave) {
                    await config.save()
                    migratedCount++
                    log.info(`[Migration] ✅ Successfully migrated guild ${config.guildID}`)
                }
                
            } catch (error) {
                errorCount++
                log.error(`[Migration] ❌ Error migrating guild ${config.guildID}:`, error.message)
            }
        }
        
        log.info(`[Migration] ✅ Migration completed!`)
        log.info(`[Migration] - Total guilds processed: ${configs.length}`)
        log.info(`[Migration] - Successfully migrated: ${migratedCount}`)
        log.info(`[Migration] - Errors: ${errorCount}`)
        
        return {
            success: true,
            totalProcessed: configs.length,
            migrated: migratedCount,
            errors: errorCount
        }
        
    } catch (error) {
        log.error('[Migration] ❌ Migration failed:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Rollback function to revert migration (if needed)
 */
async function rollbackSafeModerationPermissions() {
    log.info('[Migration] Starting Safe Moderation permission rollback...')
    
    try {
        const configs = await safeModerationSchema.find({})
        
        let rolledBackCount = 0
        
        for (const config of configs) {
            let needsSave = false
            
            // Remove combined permissions (they will fall back to individual ones)
            if (config.permissions?.banKickMembers) {
                delete config.permissions.banKickMembers
                needsSave = true
            }
            
            if (config.permissions?.voiceModeration) {
                delete config.permissions.voiceModeration
                needsSave = true
            }
            
            if (config.permissions?.deafeningMembers) {
                delete config.permissions.deafeningMembers
                needsSave = true
            }
            
            if (needsSave) {
                await config.save()
                rolledBackCount++
                log.info(`[Migration] ✅ Rolled back guild ${config.guildID}`)
            }
        }
        
        log.info(`[Migration] ✅ Rollback completed! Rolled back ${rolledBackCount} guilds`)
        
        return {
            success: true,
            rolledBack: rolledBackCount
        }
        
    } catch (error) {
        log.error('[Migration] ❌ Rollback failed:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

module.exports = {
    migrateSafeModerationPermissions,
    rollbackSafeModerationPermissions
}

// If run directly, execute migration
if (require.main === module) {
    migrateSafeModerationPermissions()
        .then(result => {
            if (result.success) {
                log.info('Migration completed successfully!')
                process.exit(0)
            } else {
                log.error('Migration failed:', result.error)
                process.exit(1)
            }
        })
        .catch(error => {
            log.error('Migration error:', error)
            process.exit(1)
        })
}