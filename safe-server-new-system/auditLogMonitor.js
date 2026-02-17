/**
 * Safe-Server Audit Log Monitor
 * Monitors audit logs for dangerous actions and applies restrictions
 */

const { AuditLogEvent, PermissionFlagsBits } = require('discord.js')
const safeServerSchema = require('../schemas/safeServerSchema')

class AuditLogMonitor {
    constructor(client) {
        this.client = client
        this.lastChecked = new Map() // guildId -> timestamp
        
        // Start monitoring
        this.startMonitoring()
    }

    startMonitoring() {
        // Check audit logs every 10 seconds
        setInterval(() => {
            this.checkAllGuilds().catch(console.error)
        }, 10000)
    }

    async checkAllGuilds() {
        for (const [guildId, guild] of this.client.guilds.cache) {
            const config = await safeServerSchema.findOne({ guildID: guildId })
            
            if (!config || !config.enabled) continue

            await this.checkGuildAuditLogs(guild, config).catch(error => {
                console.error(`[AuditLogMonitor] Error checking ${guild.name}:`, error)
            })
        }
    }

    async checkGuildAuditLogs(guild, config) {
        const lastCheck = this.lastChecked.get(guild.id) || Date.now() - 60000
        const now = Date.now()

        // Check each permission type
        await this.checkBans(guild, config, lastCheck)
        await this.checkKicks(guild, config, lastCheck)
        await this.checkTimeouts(guild, config, lastCheck)
        await this.checkRoleDeletes(guild, config, lastCheck)
        await this.checkChannelDeletes(guild, config, lastCheck)
        await this.checkMessageDeletes(guild, config, lastCheck)
        await this.checkNicknameChanges(guild, config, lastCheck)
        await this.checkBotAdditions(guild, config, lastCheck)

        this.lastChecked.set(guild.id, now)
    }

    async checkBans(guild, config, since) {
        if (!config.permissions.banMembers.enabled) return

        try {
            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 10
            })

            for (const entry of logs.entries.values()) {
                if (entry.createdTimestamp < since) continue

                const executor = entry.executor
                if (!executor || executor.bot) continue

                // Check if executor is whitelisted
                if (await this.isWhitelisted(guild, executor.id, config)) continue

                // Track action
                const exceeded = await this.client.safeServerTracker.trackAction(
                    guild.id,
                    executor.id,
                    'banMembers',
                    entry.target?.id
                )

                if (exceeded) {
                    const member = await guild.members.fetch(executor.id).catch(() => null)
                    if (member) {
                        await this.client.safeServerRestrictionManager.applyRestriction(
                            guild,
                            member,
                            'banMembers'
                        )
                    }
                }
            }
        } catch (error) {
            console.error('[AuditLogMonitor] Error checking bans:', error)
        }
    }

    async checkKicks(guild, config, since) {
        if (!config.permissions.kickMembers.enabled) return

        try {
            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 10
            })

            for (const entry of logs.entries.values()) {
                if (entry.createdTimestamp < since) continue

                const executor = entry.executor
                if (!executor || executor.bot) continue

                if (await this.isWhitelisted(guild, executor.id, config)) continue

                const exceeded = await this.client.safeServerTracker.trackAction(
                    guild.id,
                    executor.id,
                    'kickMembers',
                    entry.target?.id
                )

                if (exceeded) {
                    const member = await guild.members.fetch(executor.id).catch(() => null)
                    if (member) {
                        await this.client.safeServerRestrictionManager.applyRestriction(
                            guild,
                            member,
                            'kickMembers'
                        )
                    }
                }
            }
        } catch (error) {
            console.error('[AuditLogMonitor] Error checking kicks:', error)
        }
    }

    async checkTimeouts(guild, config, since) {
        if (!config.permissions.timeoutMembers.enabled) return

        try {
            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberUpdate,
                limit: 20
            })

            for (const entry of logs.entries.values()) {
                if (entry.createdTimestamp < since) continue

                // Check if this was a timeout action
                const changes = entry.changes
                const timeoutChange = changes?.find(c => c.key === 'communication_disabled_until')
                
                if (!timeoutChange) continue

                const executor = entry.executor
                if (!executor || executor.bot) continue

                if (await this.isWhitelisted(guild, executor.id, config)) continue

                const exceeded = await this.client.safeServerTracker.trackAction(
                    guild.id,
                    executor.id,
                    'timeoutMembers',
                    entry.target?.id
                )

                if (exceeded) {
                    const member = await guild.members.fetch(executor.id).catch(() => null)
                    if (member) {
                        await this.client.safeServerRestrictionManager.applyRestriction(
                            guild,
                            member,
                            'timeoutMembers'
                        )
                    }
                }
            }
        } catch (error) {
            console.error('[AuditLogMonitor] Error checking timeouts:', error)
        }
    }

    async checkRoleDeletes(guild, config, since) {
        if (!config.permissions.deleteRole.enabled) return

        try {
            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.RoleDelete,
                limit: 10
            })

            for (const entry of logs.entries.values()) {
                if (entry.createdTimestamp < since) continue

                const executor = entry.executor
                if (!executor || executor.bot) continue

                if (await this.isWhitelisted(guild, executor.id, config)) continue

                const exceeded = await this.client.safeServerTracker.trackAction(
                    guild.id,
                    executor.id,
                    'deleteRole',
                    entry.target?.id
                )

                if (exceeded) {
                    const member = await guild.members.fetch(executor.id).catch(() => null)
                    if (member) {
                        await this.client.safeServerRestrictionManager.applyRestriction(
                            guild,
                            member,
                            'deleteRole'
                        )
                    }
                }
            }
        } catch (error) {
            console.error('[AuditLogMonitor] Error checking role deletes:', error)
        }
    }

    async checkChannelDeletes(guild, config, since) {
        if (!config.permissions.deleteChannel.enabled) return

        try {
            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelDelete,
                limit: 10
            })

            for (const entry of logs.entries.values()) {
                if (entry.createdTimestamp < since) continue

                const executor = entry.executor
                if (!executor || executor.bot) continue

                if (await this.isWhitelisted(guild, executor.id, config)) continue

                const exceeded = await this.client.safeServerTracker.trackAction(
                    guild.id,
                    executor.id,
                    'deleteChannel',
                    entry.target?.id
                )

                if (exceeded) {
                    const member = await guild.members.fetch(executor.id).catch(() => null)
                    if (member) {
                        await this.client.safeServerRestrictionManager.applyRestriction(
                            guild,
                            member,
                            'deleteChannel'
                        )
                    }
                }
            }
        } catch (error) {
            console.error('[AuditLogMonitor] Error checking channel deletes:', error)
        }
    }

    async checkMessageDeletes(guild, config, since) {
        if (!config.permissions.deleteMessages.enabled) return

        try {
            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MessageBulkDelete,
                limit: 10
            })

            for (const entry of logs.entries.values()) {
                if (entry.createdTimestamp < since) continue

                const executor = entry.executor
                if (!executor || executor.bot) continue

                if (await this.isWhitelisted(guild, executor.id, config)) continue

                const exceeded = await this.client.safeServerTracker.trackAction(
                    guild.id,
                    executor.id,
                    'deleteMessages',
                    entry.target?.id
                )

                if (exceeded) {
                    const member = await guild.members.fetch(executor.id).catch(() => null)
                    if (member) {
                        await this.client.safeServerRestrictionManager.applyRestriction(
                            guild,
                            member,
                            'deleteMessages'
                        )
                    }
                }
            }
        } catch (error) {
            console.error('[AuditLogMonitor] Error checking message deletes:', error)
        }
    }

    async checkNicknameChanges(guild, config, since) {
        if (!config.permissions.changeNickname.enabled) return

        try {
            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberUpdate,
                limit: 20
            })

            for (const entry of logs.entries.values()) {
                if (entry.createdTimestamp < since) continue

                // Check if this was a nickname change
                const changes = entry.changes
                const nicknameChange = changes?.find(c => c.key === 'nick')
                
                if (!nicknameChange) continue

                const executor = entry.executor
                if (!executor || executor.bot) continue

                // Don't track if user changed their own nickname
                if (executor.id === entry.target?.id) continue

                if (await this.isWhitelisted(guild, executor.id, config)) continue

                const exceeded = await this.client.safeServerTracker.trackAction(
                    guild.id,
                    executor.id,
                    'changeNickname',
                    entry.target?.id
                )

                if (exceeded) {
                    const member = await guild.members.fetch(executor.id).catch(() => null)
                    if (member) {
                        await this.client.safeServerRestrictionManager.applyRestriction(
                            guild,
                            member,
                            'changeNickname'
                        )
                    }
                }
            }
        } catch (error) {
            console.error('[AuditLogMonitor] Error checking nickname changes:', error)
        }
    }

    async checkBotAdditions(guild, config, since) {
        if (!config.permissions.addingMassBots.enabled) return

        try {
            const logs = await guild.fetchAuditLogs({
                type: AuditLogEvent.BotAdd,
                limit: 10
            })

            for (const entry of logs.entries.values()) {
                if (entry.createdTimestamp < since) continue

                const executor = entry.executor
                if (!executor || executor.bot) continue

                if (await this.isWhitelisted(guild, executor.id, config)) continue

                const exceeded = await this.client.safeServerTracker.trackAction(
                    guild.id,
                    executor.id,
                    'addingMassBots',
                    entry.target?.id
                )

                if (exceeded) {
                    const member = await guild.members.fetch(executor.id).catch(() => null)
                    if (member) {
                        await this.client.safeServerRestrictionManager.applyRestriction(
                            guild,
                            member,
                            'addingMassBots'
                        )
                    }
                }

                // Also check bot protection
                if (config.botProtection.enabled && entry.target) {
                    await this.client.safeServerBotProtection.checkBot(
                        guild,
                        entry.target.id,
                        executor.id
                    ).catch(console.error)
                }
            }
        } catch (error) {
            console.error('[AuditLogMonitor] Error checking bot additions:', error)
        }
    }

    async isWhitelisted(guild, userId, config) {
        // Check if user has manager role
        if (config.managerRoles && config.managerRoles.length > 0) {
            const member = await guild.members.fetch(userId).catch(() => null)
            if (member) {
                const hasManagerRole = member.roles.cache.some(role => 
                    config.managerRoles.includes(role.id)
                )
                if (hasManagerRole) return true
            }
        }

        return false
    }
}

module.exports = AuditLogMonitor
