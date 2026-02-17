/**
 * Safe-Server: Role Update Detection
 * Detects dangerous permission grants (Administrator) and role hierarchy manipulation
 */

const client = require("../../index")
const { Events, AuditLogEvent, PermissionFlagsBits } = require("discord.js")
const { handleError } = require("../../handler/errorHandler")

client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
    try {
        if (!client.safeServerTracker || !client.safeServerManager) return
        
        const guild = newRole.guild
        
        // Get Safe-Server config
        const safeServerSchema = require('../../schemas/safeServerSchema')
        const config = await safeServerSchema.findOne({ guildID: guild.id })
        
        if (!config || !config.enabled) return
        
        // Check if Administrator permission was added
        const hadAdmin = oldRole.permissions.has(PermissionFlagsBits.Administrator)
        const hasAdmin = newRole.permissions.has(PermissionFlagsBits.Administrator)
        
        if (!hadAdmin && hasAdmin) {
            await handleAdminPermissionGrant(guild, newRole, config)
        }
        
        // Check for dangerous permission additions
        const dangerousPerms = [
            PermissionFlagsBits.ManageGuild,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.BanMembers
        ]
        
        const addedDangerousPerms = dangerousPerms.filter(perm => 
            !oldRole.permissions.has(perm) && newRole.permissions.has(perm)
        )
        
        if (addedDangerousPerms.length > 0) {
            await handleDangerousPermissionGrant(guild, newRole, addedDangerousPerms, config)
        }
        
        // Check for role hierarchy manipulation (SS roles)
        if (config.managedRoles) {
            const ssRoleIds = Object.values(config.managedRoles).filter(Boolean)
            if (ssRoleIds.includes(newRole.id)) {
                await handleSSRoleModification(guild, oldRole, newRole, config)
            }
        }
        
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'SafeServer RoleUpdate Event' })
    }
})

/**
 * Handle Administrator permission grant
 */
async function handleAdminPermissionGrant(guild, role, config) {
    try {
        // Fetch audit log to identify executor
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.RoleUpdate,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === role.id && 
            (now - entry.createdTimestamp) < 5000
        )
        
        if (!auditEntry || !auditEntry.executor) return
        
        const executor = auditEntry.executor
        
        // Ignore bot actions
        if (executor.bot) return
        
        // Fetch executor as guild member
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (!executorMember) return
        
        // Check if executor is guild owner
        if (executor.id === guild.ownerId) return
        
        // Check if executor is whitelisted
        const executorRoles = executorMember.roles.cache.map(r => r.id)
        if (client.safeServerTracker.isWhitelisted(guild.id, executor.id, executorRoles, config)) {
            return
        }
        
        console.log(`[SafeServer] Administrator permission granted to role ${role.name} by ${executor.tag}`)
        
        // Record the action
        await client.safeServerTracker.recordAction(guild.id, executor.id, 'roleUpdate')
        
        // Check if limit exceeded
        const limitCheck = await client.safeServerTracker.checkLimit(guild.id, executor.id, 'roleUpdate', config)
        
        if (limitCheck.exceeded) {
            console.log(`[SafeServer] Role update limit exceeded by ${executor.tag} in ${guild.name}`)
            
            // Apply restriction
            const result = await client.safeServerManager.restrictModerator(
                guild,
                executorMember,
                'roleUpdate',
                limitCheck,
                config
            )
            
            if (result.success) {
                console.log(`[SafeServer] Restricted ${executor.tag} for dangerous role modifications`)
            }
        }
        
        // Send alert regardless of limit
        if (config.logChannelId) {
            const logChannel = guild.channels.cache.get(config.logChannelId)
            if (logChannel) {
                const { EmbedBuilder } = require('discord.js')
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xE74C3C)
                            .setTitle('⚠️ Safe-Server: Administrator Permission Granted')
                            .setDescription(`Administrator permission was granted to a role.`)
                            .addFields(
                                { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                                { name: 'Executor', value: `<@${executor.id}>`, inline: true }
                            )
                            .setTimestamp()
                    ]
                }).catch(console.error)
            }
        }
        
    } catch (error) {
        console.error('[SafeServer] Admin permission grant handler error:', error)
    }
}

/**
 * Handle dangerous permission grants
 */
async function handleDangerousPermissionGrant(guild, role, permissions, config) {
    try {
        // Fetch audit log to identify executor
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.RoleUpdate,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === role.id && 
            (now - entry.createdTimestamp) < 5000
        )
        
        if (!auditEntry || !auditEntry.executor) return
        
        const executor = auditEntry.executor
        
        // Ignore bot actions
        if (executor.bot) return
        
        // Fetch executor as guild member
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (!executorMember) return
        
        // Check if executor is guild owner
        if (executor.id === guild.ownerId) return
        
        // Check if executor is whitelisted
        const executorRoles = executorMember.roles.cache.map(r => r.id)
        if (client.safeServerTracker.isWhitelisted(guild.id, executor.id, executorRoles, config)) {
            return
        }
        
        // Record the action
        await client.safeServerTracker.recordAction(guild.id, executor.id, 'roleUpdate')
        
        // Check if limit exceeded
        const limitCheck = await client.safeServerTracker.checkLimit(guild.id, executor.id, 'roleUpdate', config)
        
        if (limitCheck.exceeded) {
            // Apply restriction
            await client.safeServerManager.restrictModerator(
                guild,
                executorMember,
                'roleUpdate',
                limitCheck,
                config
            )
        }
        
    } catch (error) {
        console.error('[SafeServer] Dangerous permission grant handler error:', error)
    }
}

/**
 * Handle SS role modification (anti-bypass)
 */
async function handleSSRoleModification(guild, oldRole, newRole, config) {
    try {
        // Fetch audit log to identify executor
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.RoleUpdate,
            limit: 5
        }).catch(() => null)
        
        if (!auditLogs) return
        
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === newRole.id && 
            (now - entry.createdTimestamp) < 5000
        )
        
        if (!auditEntry || !auditEntry.executor) return
        
        const executor = auditEntry.executor
        
        // Ignore if it's the bot itself
        if (executor.id === client.user.id) return
        
        // Ignore guild owner
        if (executor.id === guild.ownerId) return
        
        console.log(`[SafeServer] SS role ${newRole.name} was modified by ${executor.tag}`)
        
        // Log the modification
        if (config.logChannelId) {
            const logChannel = guild.channels.cache.get(config.logChannelId)
            if (logChannel) {
                const { EmbedBuilder } = require('discord.js')
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xE67E22)
                            .setTitle('⚠️ Safe-Server: SS Role Modified')
                            .setDescription(`A Safe-Server managed role was modified.`)
                            .addFields(
                                { name: 'Role', value: `${newRole.name} (${newRole.id})` },
                                { name: 'Executor', value: `<@${executor.id}>` }
                            )
                            .setTimestamp()
                    ]
                }).catch(console.error)
            }
        }
        
    } catch (error) {
        console.error('[SafeServer] SS role modification handler error:', error)
    }
}
