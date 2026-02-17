/**
 * Safe-Server Voice State Monitor
 * Monitors voice channel actions (disconnect, move, mute)
 */

const safeServerSchema = require('../schemas/safeServerSchema')

class VoiceStateMonitor {
    constructor(client) {
        this.client = client
        this.recentActions = new Map() // Track recent actions to detect patterns
    }

    /**
     * Handle voice state update
     * @param {VoiceState} oldState 
     * @param {VoiceState} newState 
     */
    async handleVoiceStateUpdate(oldState, newState) {
        const guild = newState.guild
        const config = await safeServerSchema.findOne({ guildID: guild.id })

        if (!config || !config.enabled) return

        // Detect disconnections
        if (oldState.channel && !newState.channel) {
            await this.handleDisconnect(guild, oldState, config)
        }

        // Detect moves
        if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            await this.handleMove(guild, oldState, newState, config)
        }

        // Detect mutes
        if (!oldState.serverMute && newState.serverMute) {
            await this.handleMute(guild, newState, config)
        }
    }

    async handleDisconnect(guild, oldState, config) {
        if (!config.permissions.disconnectingMembers.enabled) return

        try {
            // Fetch audit logs to find who disconnected the member
            const logs = await guild.fetchAuditLogs({
                type: 27, // MEMBER_DISCONNECT
                limit: 5
            })

            const relevantLog = logs.entries.find(entry => 
                entry.target?.id === oldState.member.id &&
                Date.now() - entry.createdTimestamp < 5000 // Within last 5 seconds
            )

            if (!relevantLog) return

            const executor = relevantLog.executor
            if (!executor || executor.bot) return

            // Check if whitelisted
            if (await this.isWhitelisted(guild, executor.id, config)) return

            // Track action
            const exceeded = await this.client.safeServerTracker.trackAction(
                guild.id,
                executor.id,
                'disconnectingMembers',
                oldState.member.id
            )

            if (exceeded) {
                const member = await guild.members.fetch(executor.id).catch(() => null)
                if (member) {
                    await this.client.safeServerRestrictionManager.applyRestriction(
                        guild,
                        member,
                        'disconnectingMembers'
                    )
                }
            }
        } catch (error) {
            console.error('[VoiceStateMonitor] Error handling disconnect:', error)
        }
    }

    async handleMove(guild, oldState, newState, config) {
        if (!config.permissions.movingMembers.enabled) return

        try {
            // Fetch audit logs to find who moved the member
            const logs = await guild.fetchAuditLogs({
                type: 26, // MEMBER_MOVE
                limit: 5
            })

            const relevantLog = logs.entries.find(entry => 
                entry.target?.id === newState.member.id &&
                Date.now() - entry.createdTimestamp < 5000
            )

            if (!relevantLog) return

            const executor = relevantLog.executor
            if (!executor || executor.bot) return

            // Don't track if member moved themselves
            if (executor.id === newState.member.id) return

            if (await this.isWhitelisted(guild, executor.id, config)) return

            const exceeded = await this.client.safeServerTracker.trackAction(
                guild.id,
                executor.id,
                'movingMembers',
                newState.member.id
            )

            if (exceeded) {
                const member = await guild.members.fetch(executor.id).catch(() => null)
                if (member) {
                    await this.client.safeServerRestrictionManager.applyRestriction(
                        guild,
                        member,
                        'movingMembers'
                    )
                }
            }
        } catch (error) {
            console.error('[VoiceStateMonitor] Error handling move:', error)
        }
    }

    async handleMute(guild, newState, config) {
        if (!config.permissions.mutingMembers.enabled) return

        try {
            // Fetch audit logs to find who muted the member
            const logs = await guild.fetchAuditLogs({
                type: 24, // MEMBER_UPDATE
                limit: 5
            })

            const relevantLog = logs.entries.find(entry => 
                entry.target?.id === newState.member.id &&
                entry.changes?.some(c => c.key === 'mute') &&
                Date.now() - entry.createdTimestamp < 5000
            )

            if (!relevantLog) return

            const executor = relevantLog.executor
            if (!executor || executor.bot) return

            if (await this.isWhitelisted(guild, executor.id, config)) return

            const exceeded = await this.client.safeServerTracker.trackAction(
                guild.id,
                executor.id,
                'mutingMembers',
                newState.member.id
            )

            if (exceeded) {
                const member = await guild.members.fetch(executor.id).catch(() => null)
                if (member) {
                    await this.client.safeServerRestrictionManager.applyRestriction(
                        guild,
                        member,
                        'mutingMembers'
                    )
                }
            }
        } catch (error) {
            console.error('[VoiceStateMonitor] Error handling mute:', error)
        }
    }

    async isWhitelisted(guild, userId, config) {
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

module.exports = VoiceStateMonitor
