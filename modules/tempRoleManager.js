/**
 * Temporary Role Manager Module
 * Handles scheduling, assignment, removal, and extension of temporary roles
 */

const schedule = require('node-schedule')
const scheduledJobs = new Map() // roleID_userID -> job

/**
 * Parse duration string to milliseconds
 * @param {string} durationStr - Duration string (e.g., "1d", "2h", "30m", "1w", "1y")
 * @returns {number} Duration in milliseconds
 */
function parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)(s|min|m|h|d|w|y)$/)
    if (!match) throw new Error('Invalid duration format. Use: 1d, 2h, 30m, 1w, 1y, 10s')
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    const multipliers = {
        's': 1000,
        'min': 60 * 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000
    }
    
    return value * multipliers[unit]
}

/**
 * Format milliseconds to human-readable duration
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const years = Math.floor(days / 365)
    
    if (years > 0) return `${years}y`
    if (weeks > 0) return `${weeks}w`
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
}

/**
 * Schedule role removal
 * @param {Client} client - Discord client
 * @param {string} guildID - Guild ID
 * @param {string} userID - User ID
 * @param {string} roleID - Role ID
 * @param {Date} expiresAt - Expiration date
 */
async function scheduleRoleRemoval(client, guildID, userID, roleID, expiresAt) {
    const jobKey = `${guildID}_${roleID}_${userID}`
    
    // Cancel existing job if any
    if (scheduledJobs.has(jobKey)) {
        scheduledJobs.get(jobKey).cancel()
    }
    
    // Schedule new job
    const job = schedule.scheduleJob(expiresAt, async () => {
        try {
            const guild = await client.guilds.fetch(guildID).catch(() => null)
            if (!guild) return
            
            const member = await guild.members.fetch(userID).catch(() => null)
            if (!member) return
            
            const role = guild.roles.cache.get(roleID)
            if (!role) return
            
            // Remove role
            await member.roles.remove(role, 'Temporary role expired').catch(console.error)
            
            // Notify user
            await notifyUserRoleRemoved(client, member, role)
            
            // Delete from database
            await client.tempRoleAssignmentSchema.deleteOne({ guildID, userID, roleID })
            
            // Remove from scheduled jobs
            scheduledJobs.delete(jobKey)
            
            console.log(`[TempRole] Removed expired role ${role.name} from ${member.user.tag}`)
        } catch (error) {
            console.error('[TempRole] Error removing expired role:', error)
        }
    })
    
    scheduledJobs.set(jobKey, job)
}

/**
 * Assign temporary role to user
 * @param {Client} client - Discord client
 * @param {GuildMember} member - Guild member
 * @param {Role} role - Role to assign
 * @param {number} duration - Duration in milliseconds
 * @param {string} assignedBy - User ID who assigned the role
 * @returns {Promise<Object>} Assignment result
 */
async function assignTempRole(client, member, role, duration, assignedBy) {
    try {
        const expiresAt = new Date(Date.now() + duration)
        
        // Check if already has this temp role
        const existing = await client.tempRoleAssignmentSchema.findOne({
            guildID: member.guild.id,
            userID: member.id,
            roleID: role.id
        })
        
        if (existing) {
            return {
                success: false,
                error: 'User already has this temporary role assigned'
            }
        }
        
        // Assign role
        await member.roles.add(role, `Temporary role (expires: ${expiresAt.toISOString()})`)
        
        // Save to database
        await client.tempRoleAssignmentSchema.create({
            guildID: member.guild.id,
            userID: member.id,
            roleID: role.id,
            assignedAt: new Date(),
            expiresAt,
            assignedBy,
            originalDuration: duration
        })
        
        // Schedule removal
        await scheduleRoleRemoval(client, member.guild.id, member.id, role.id, expiresAt)
        
        // Notify user
        await notifyUserRoleAssigned(client, member, role, expiresAt, assignedBy)
        
        // Log to audit channel
        await logTempRoleAction(client, member.guild, 'Role Assigned', {
            role: role.id,
            user: member.id,
            moderator: assignedBy,
            duration: formatDuration(duration),
            expiresAt
        })
        
        return {
            success: true,
            expiresAt,
            duration: formatDuration(duration)
        }
    } catch (error) {
        console.error('[TempRole] Error assigning temp role:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Extend temporary role duration
 * @param {Client} client - Discord client
 * @param {string} guildID - Guild ID
 * @param {string} userID - User ID
 * @param {string} roleID - Role ID
 * @param {number} extensionDuration - Duration to add in milliseconds
 * @returns {Promise<Object>} Extension result
 */
async function extendTempRole(client, guildID, userID, roleID, extensionDuration) {
    try {
        const assignment = await client.tempRoleAssignmentSchema.findOne({
            guildID,
            userID,
            roleID
        })
        
        if (!assignment) {
            return {
                success: false,
                error: 'No temporary role assignment found'
            }
        }
        
        // Calculate new expiration
        const newExpiresAt = new Date(assignment.expiresAt.getTime() + extensionDuration)
        
        // Update database
        assignment.expiresAt = newExpiresAt
        assignment.extended = true
        assignment.extensionCount = (assignment.extensionCount || 0) + 1
        await assignment.save()
        
        // Reschedule removal
        await scheduleRoleRemoval(client, guildID, userID, roleID, newExpiresAt)
        
        // Log to audit channel
        const guild = await client.guilds.fetch(guildID).catch(() => null)
        if (guild) {
            await logTempRoleAction(client, guild, 'Role Extended', {
                role: roleID,
                user: userID,
                duration: formatDuration(extensionDuration),
                expiresAt: newExpiresAt
            })
        }
        
        return {
            success: true,
            newExpiresAt,
            extensionDuration: formatDuration(extensionDuration)
        }
    } catch (error) {
        console.error('[TempRole] Error extending temp role:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Remove temporary role immediately
 * @param {Client} client - Discord client
 * @param {string} guildID - Guild ID
 * @param {string} userID - User ID
 * @param {string} roleID - Role ID
 * @returns {Promise<Object>} Removal result
 */
async function removeTempRole(client, guildID, userID, roleID) {
    try {
        const guild = await client.guilds.fetch(guildID).catch(() => null)
        if (!guild) return { success: false, error: 'Guild not found' }
        
        const member = await guild.members.fetch(userID).catch(() => null)
        if (!member) return { success: false, error: 'Member not found' }
        
        const role = guild.roles.cache.get(roleID)
        if (!role) return { success: false, error: 'Role not found' }
        
        // Remove role
        await member.roles.remove(role, 'Temporary role removed manually')
        
        // Delete from database
        await client.tempRoleAssignmentSchema.deleteOne({ guildID, userID, roleID })
        
        // Cancel scheduled job
        const jobKey = `${guildID}_${roleID}_${userID}`
        if (scheduledJobs.has(jobKey)) {
            scheduledJobs.get(jobKey).cancel()
            scheduledJobs.delete(jobKey)
        }
        
        // Log to audit channel
        await logTempRoleAction(client, guild, 'Role Removed Manually', {
            role: roleID,
            user: userID
        })
        
        return { success: true }
    } catch (error) {
        console.error('[TempRole] Error removing temp role:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Initialize temporary role system on bot startup
 * @param {Client} client - Discord client
 */
async function initTempRoleSystem(client) {
    try {
        console.log('[TempRole] Initializing temporary role system...')
        
        // Load active assignments for guilds served by THIS shard only —
        // otherwise every shard would schedule duplicate removals and DMs
        const guilds = client.guilds.cache.filter(e => e.available).map(e => e.id)
        const assignments = await client.tempRoleAssignmentSchema.find({
            guildID: { $in: guilds },
            expiresAt: { $gt: new Date() }
        })
        
        console.log(`[TempRole] Found ${assignments.length} active temporary role assignments`)
        
        // Schedule all active assignments
        for (const assignment of assignments) {
            await scheduleRoleRemoval(
                client,
                assignment.guildID,
                assignment.userID,
                assignment.roleID,
                assignment.expiresAt
            )
        }
        
        // Clean up expired assignments (this shard's guilds only)
        const deleted = await client.tempRoleAssignmentSchema.deleteMany({
            guildID: { $in: guilds },
            expiresAt: { $lte: new Date() }
        })
        
        if (deleted.deletedCount > 0) {
            console.log(`[TempRole] Cleaned up ${deleted.deletedCount} expired assignments`)
        }
        
        console.log('[TempRole] Temporary role system initialized successfully')
    } catch (error) {
        console.error('[TempRole] Error initializing temp role system:', error)
    }
}

/**
 * Cancel all scheduled jobs for a specific role
 * @param {string} roleID - Role ID
 */
function cancelScheduledJobsForRole(roleID) {
    let cancelledCount = 0
    for (const [jobKey, job] of scheduledJobs.entries()) {
        if (jobKey.split('_')[1] === roleID) {
            job.cancel()
            scheduledJobs.delete(jobKey)
            cancelledCount++
        }
    }
    if (cancelledCount > 0) {
        console.log(`[TempRole] Cancelled ${cancelledCount} scheduled job(s) for role ${roleID}`)
    }
}

/**
 * Cancel all scheduled jobs for a specific guild
 * @param {string} guildID - Guild ID
 */
function cancelScheduledJobsForGuild(guildID) {
    let cancelledCount = 0
    for (const [jobKey, job] of scheduledJobs.entries()) {
        if (jobKey.startsWith(guildID + '_')) {
            job.cancel()
            scheduledJobs.delete(jobKey)
            cancelledCount++
        }
    }
    console.log(`[TempRole] Cancelled ${cancelledCount} scheduled job(s) for guild ${guildID}`)
}

/**
 * Send notification to user about temporary role assignment
 * @param {Client} client - Discord client
 * @param {GuildMember} member - Guild member
 * @param {Role} role - Role assigned
 * @param {Date} expiresAt - Expiration date
 * @param {string} assignedBy - User ID who assigned the role
 */
async function notifyUserRoleAssigned(client, member, role, expiresAt, assignedBy) {
    try {
        const { EmbedBuilder } = require('discord.js')
        const assigner = await member.guild.members.fetch(assignedBy).catch(() => null)
        
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setTitle('⏱️ Temporary Role Assigned')
            .setDescription(`You have been assigned a temporary role in **${member.guild.name}**`)
            .addFields(
                { name: '🎭 Role', value: `${role}`, inline: true },
                { name: '📅 Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
                { name: '👤 Assigned By', value: assigner ? `${assigner}` : 'Unknown', inline: true }
            )
            .setFooter({ text: 'This role will be automatically removed when it expires' })
            .setTimestamp()
        
        await member.send({ embeds: [embed] }).catch(() => {
            // User has DMs disabled, silently fail
        })
    } catch (error) {
        // Don't throw errors for notification failures
        console.error('[TempRole] Failed to send assignment notification:', error.message)
    }
}

/**
 * Send notification to user about temporary role expiring soon
 * @param {Client} client - Discord client
 * @param {GuildMember} member - Guild member
 * @param {Role} role - Role that will expire
 * @param {Date} expiresAt - Expiration date
 */
async function notifyUserRoleExpiring(client, member, role, expiresAt) {
    try {
        const { EmbedBuilder } = require('discord.js')
        
        const embed = new EmbedBuilder()
            .setColor(0xFFA500) // Orange for warning
            .setTitle('⚠️ Temporary Role Expiring Soon')
            .setDescription(`Your temporary role in **${member.guild.name}** will expire soon`)
            .addFields(
                { name: '🎭 Role', value: `${role}`, inline: true },
                { name: '📅 Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Contact a server administrator if you need an extension' })
            .setTimestamp()
        
        await member.send({ embeds: [embed] }).catch(() => {
            // User has DMs disabled, silently fail
        })
    } catch (error) {
        console.error('[TempRole] Failed to send expiring notification:', error.message)
    }
}

/**
 * Send notification to user about temporary role removed
 * @param {Client} client - Discord client
 * @param {GuildMember} member - Guild member
 * @param {Role} role - Role that was removed
 */
async function notifyUserRoleRemoved(client, member, role) {
    try {
        const { EmbedBuilder } = require('discord.js')
        
        const embed = new EmbedBuilder()
            .setColor(0xFF0000) // Red for removal
            .setTitle('⏱️ Temporary Role Expired')
            .setDescription(`Your temporary role in **${member.guild.name}** has expired and been removed`)
            .addFields(
                { name: '🎭 Role', value: `${role}`, inline: true },
                { name: '📅 Removed', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Contact a server administrator if you need this role again' })
            .setTimestamp()
        
        await member.send({ embeds: [embed] }).catch(() => {
            // User has DMs disabled, silently fail
        })
    } catch (error) {
        console.error('[TempRole] Failed to send removal notification:', error.message)
    }
}

/**
 * Log temporary role action to audit channel
 * @param {Client} client - Discord client
 * @param {Guild} guild - Guild
 * @param {string} action - Action performed
 * @param {Object} details - Action details
 */
async function logTempRoleAction(client, guild, action, details) {
    try {
        // Check if guild has audit logging enabled for temp roles
        const settings = await client.settingsSchema.findOne({ guildID: guild.id })
        if (!settings || !settings.tempRoleAuditChannel) return
        
        const channel = guild.channels.cache.get(settings.tempRoleAuditChannel)
        if (!channel) return
        
        const { EmbedBuilder } = require('discord.js')
        
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setTitle(`⏱️ Temporary Role: ${action}`)
            .setTimestamp()
        
        // Add fields based on details
        if (details.role) embed.addFields({ name: '🎭 Role', value: `<@&${details.role}>`, inline: true })
        if (details.user) embed.addFields({ name: '👤 User', value: `<@${details.user}>`, inline: true })
        if (details.moderator) embed.addFields({ name: '👮 Moderator', value: `<@${details.moderator}>`, inline: true })
        if (details.duration) embed.addFields({ name: '⏱️ Duration', value: `\`${details.duration}\``, inline: true })
        if (details.expiresAt) embed.addFields({ name: '📅 Expires', value: `<t:${Math.floor(details.expiresAt.getTime() / 1000)}:R>`, inline: true })
        if (details.reason) embed.addFields({ name: '📝 Reason', value: details.reason, inline: false })
        
        await channel.send({ embeds: [embed] }).catch(() => {
            // Channel might be deleted or bot lacks permissions
        })
    } catch (error) {
        // Don't throw errors for audit logging failures
        console.error('[TempRole] Failed to log audit action:', error.message)
    }
}

/**
 * Get all temporary role configurations for a guild
 * @param {Client} client - Discord client
 * @param {string} guildID - Guild ID
 * @returns {Promise<Array>} Array of temp role configs
 */
async function getTempRoleConfigs(client, guildID) {
    return await client.tempRoleConfigSchema.find({ guildID, enabled: true })
}

/**
 * Get all active temporary role assignments for a guild
 * @param {Client} client - Discord client
 * @param {string} guildID - Guild ID
 * @returns {Promise<Array>} Array of active assignments
 */
async function getActiveTempRoles(client, guildID) {
    return await client.tempRoleAssignmentSchema.find({
        guildID,
        expiresAt: { $gt: new Date() }
    })
}

/**
 * Get temporary role assignments for a specific user
 * @param {Client} client - Discord client
 * @param {string} guildID - Guild ID
 * @param {string} userID - User ID
 * @returns {Promise<Array>} Array of user's temp role assignments
 */
async function getUserTempRoles(client, guildID, userID) {
    return await client.tempRoleAssignmentSchema.find({
        guildID,
        userID,
        expiresAt: { $gt: new Date() }
    })
}

// Export as a module initializer function (required by handler/index.js)
// Also attach utility functions for use by other modules
const moduleInit = function(client) {
    // No initialization needed - this is a utility module
}

// Attach all utility functions to the module initializer
moduleInit.parseDuration = parseDuration
moduleInit.formatDuration = formatDuration
moduleInit.scheduleRoleRemoval = scheduleRoleRemoval
moduleInit.assignTempRole = assignTempRole
moduleInit.extendTempRole = extendTempRole
moduleInit.removeTempRole = removeTempRole
moduleInit.initTempRoleSystem = initTempRoleSystem
moduleInit.getTempRoleConfigs = getTempRoleConfigs
moduleInit.getActiveTempRoles = getActiveTempRoles
moduleInit.getUserTempRoles = getUserTempRoles
moduleInit.cancelScheduledJobsForRole = cancelScheduledJobsForRole
moduleInit.cancelScheduledJobsForGuild = cancelScheduledJobsForGuild
moduleInit.notifyUserRoleAssigned = notifyUserRoleAssigned
moduleInit.notifyUserRoleExpiring = notifyUserRoleExpiring
moduleInit.notifyUserRoleRemoved = notifyUserRoleRemoved
moduleInit.logTempRoleAction = logTempRoleAction

module.exports = moduleInit
