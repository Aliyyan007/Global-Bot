/**
 * Safe Moderation System Validator
 * Validates bot position and permissions before enabling the system.
 * Monitors continuously and auto-disables if conditions are violated.
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const logger = require('./safeModerationLogger')

const log = logger.scope('Validator')

const ALERT_COOLDOWN = 300_000   // 5 min
const MONITOR_INTERVAL = 30_000  // 30 s

const REQUIRED_PERMS = [
    { flag: PermissionFlagsBits.BanMembers,      name: 'Ban Members' },
    { flag: PermissionFlagsBits.KickMembers,     name: 'Kick Members' },
    { flag: PermissionFlagsBits.ModerateMembers, name: 'Timeout Members' },
    { flag: PermissionFlagsBits.ViewAuditLog,    name: 'View Audit Log' },
    { flag: PermissionFlagsBits.ManageRoles,     name: 'Manage Roles' },
    { flag: PermissionFlagsBits.ManageChannels,  name: 'Manage Channels' },
    { flag: PermissionFlagsBits.ManageGuild,     name: 'Manage Server' },
    { flag: PermissionFlagsBits.SendMessages,    name: 'Send Messages' },
    { flag: PermissionFlagsBits.ManageMessages,  name: 'Manage Messages' },
    { flag: PermissionFlagsBits.EmbedLinks,      name: 'Embed Links' }
]

class SafeModerationValidator {
    constructor(client) {
        this.client = client
        this.monitoringIntervals = new Map()
        this.alertCooldowns = new Map()
    }

    // ── validation checks ───────────────────────────────────────────

    getHighestAdminRole(guild) {
        const admins = guild.roles.cache
            .filter(r => r.permissions.has(PermissionFlagsBits.Administrator) && r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
        return admins.size > 0 ? admins.first() : null
    }

    validateBotPosition(guild, botMember) {
        const botRole = botMember.roles.highest
        const adminRole = this.getHighestAdminRole(guild)

        if (adminRole) {
            const req = adminRole.position - 1
            const ok = botRole.position >= req
            return {
                isValid: ok, highestAdminRole: adminRole, botRole,
                requiredPosition: req, case: 'ADMIN_EXISTS',
                message: ok
                    ? `Bot role correctly positioned (at or just below ${adminRole.name})`
                    : `Bot role must be just below ${adminRole.name}`
            }
        }

        const topOther = guild.roles.cache
            .filter(r => r.id !== guild.id && r.id !== botRole.id)
            .sort((a, b) => b.position - a.position)
            .first()

        const ok = !topOther || botRole.position >= topOther.position
        return {
            isValid: ok, highestAdminRole: null, botRole,
            requiredPosition: topOther ? topOther.position + 1 : botRole.position,
            case: 'NO_ADMIN',
            message: ok ? 'Bot role at top' : 'Bot role must be at the top of the hierarchy'
        }
    }

    validateBotPermissions(botMember) {
        const hasAdmin = botMember.permissions.has(PermissionFlagsBits.Administrator)
        const missing = REQUIRED_PERMS.filter(p => !botMember.permissions.has(p.flag))
        return {
            isValid: hasAdmin || missing.length === 0,
            hasAdministrator: hasAdmin,
            missingPerms: missing,
            message: hasAdmin
                ? 'Bot has Administrator'
                : missing.length === 0
                    ? 'Bot has all required permissions'
                    : `Missing ${missing.length} permission(s)`
        }
    }

    async validateForEnable(guild) {
        const botMember = await guild.members.fetchMe()
        const positionCheck = this.validateBotPosition(guild, botMember)
        const permissionCheck = this.validateBotPermissions(botMember)
        return {
            canEnable: positionCheck.isValid && permissionCheck.isValid,
            positionCheck, permissionCheck, botMember
        }
    }

    // ── error message for enable failure ────────────────────────────

    generateEnableErrorMessage(validation) {
        const { positionCheck: pos, permissionCheck: perm } = validation
        let content = '## ❌ Cannot Enable Safe Moderation\n\n'

        if (!pos.isValid) {
            content += '**Role Position Issue:**\n'
            if (pos.case === 'ADMIN_EXISTS') {
                content += `• Bot role (${pos.botRole}) must be just below ${pos.highestAdminRole}\n`
                content += `• Current position: ${pos.botRole.position}, required: ${pos.requiredPosition}+\n\n`
                content += `**Fix:** Move ${pos.botRole} just below ${pos.highestAdminRole} in Server Settings → Roles\n\n`
            } else {
                content += `• Bot role (${pos.botRole}) must be at the top of the hierarchy\n\n`
                content += `**Fix:** Move ${pos.botRole} to the top in Server Settings → Roles\n\n`
            }
        }

        if (!perm.isValid) {
            content += '**Missing Permissions:**\n'
            for (const p of perm.missingPerms) content += `• ${p.name}\n`
            content += '\n**Recommended Fix:** Grant the bot **Administrator** permission\n'
            content += '**Alternative:** Manually grant each missing permission\n'
        }

        return { content, ephemeral: true }
    }

    // ── alert delivery ──────────────────────────────────────────────

    /** Find a text channel the bot can write to. */
    _findSendableChannel(guild) {
        const me = guild.members.me
        const sys = guild.systemChannel
        if (sys?.permissionsFor(me).has(PermissionFlagsBits.SendMessages)) return sys
        return guild.channels.cache.find(ch =>
            ch.isTextBased() && ch.permissionsFor(me).has(PermissionFlagsBits.SendMessages)
        ) ?? null
    }

    /** DM owner → DM admin → channel fallback. */
    async _deliver(guild, embed, mentionContent = '') {
        const owner = await guild.fetchOwner().catch(() => null)

        // Try DM to owner
        if (owner) {
            try { await owner.send({ embeds: [embed] }); return } catch {}
        }

        // Try DM to an admin
        const adminRole = this.getHighestAdminRole(guild)
        if (adminRole) {
            for (const [, m] of guild.members.cache.filter(m => m.roles.cache.has(adminRole.id) && !m.user.bot)) {
                try { await m.send({ embeds: [embed] }); return } catch { continue }
            }
        }

        // Channel fallback
        const ch = this._findSendableChannel(guild)
        if (ch) {
            let content = ''
            if (owner) content += `<@${owner.id}> `
            if (adminRole) content += `<@&${adminRole.id}>`
            if (mentionContent) content = mentionContent
            await ch.send({ content: content || undefined, embeds: [embed] }).catch(err =>
                log.error('Failed to send alert to channel', err)
            )
        }
    }

    async sendAlert(guild, issue, config) {
        const { type, positionCheck: pos, permissionCheck: perm } = issue

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🚨 Safe Moderation System Disabled')
            .setDescription('Automatically disabled due to security concerns.')
            .setTimestamp()

        if (type === 'POSITION') {
            const value = pos.case === 'ADMIN_EXISTS'
                ? `Bot role moved below required position.\n**Required:** Just below @${pos.highestAdminRole.name}\n**Current:** Position ${pos.botRole.position}\n**Fix:** Move @${pos.botRole.name} just below @${pos.highestAdminRole.name}`
                : `Bot role must be at the top.\n**Fix:** Move @${pos.botRole.name} to the top in Server Settings → Roles`
            embed.addFields({ name: '❌ Role Position Violation', value })
        } else if (type === 'PERMISSION') {
            const list = perm.missingPerms.map(p => `• ${p.name}`).join('\n')
            embed.addFields({
                name: '❌ Missing Permissions',
                value: `Permissions removed from bot.\n**Missing:**\n${list}\n**Fix:** Restore **Administrator** or grant each permission`
            })
        }

        embed.addFields({ name: '🔄 Auto-Recovery', value: 'System re-enables automatically once issues are resolved.' })

        await this._deliver(guild, embed)
    }

    async sendRecoveryConfirmation(guild) {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Safe Moderation System Re-Enabled')
            .setDescription('All security requirements restored. System is active again.')
            .setTimestamp()

        await this._deliver(guild, embed)
    }

    // ── state management ────────────────────────────────────────────

    async checkAndHandleState(guild, config) {
        if (!config?.enabled) return
        try {
            const v = await this.validateForEnable(guild)
            if (v.canEnable) return

            const now = Date.now()
            const last = this.alertCooldowns.get(guild.id)
            if (last && now - last < ALERT_COOLDOWN) return

            log.warn(`Validation failed for ${guild.name}, disabling`)

            config.enabled = false
            config.disabledReason = v.positionCheck.isValid ? 'PERMISSION' : 'POSITION'
            config.disabledAt = new Date()
            await config.save()

            this.alertCooldowns.set(guild.id, now)
            this.client.safeModerationConfigCache?.invalidate(guild.id)

            await this.sendAlert(guild, {
                type: config.disabledReason,
                positionCheck: v.positionCheck,
                permissionCheck: v.permissionCheck
            }, config)
        } catch (err) {
            log.error(`State check failed for ${guild.name}`, err)
        }
    }

    async checkForRecovery(guild, config) {
        if (!config || config.enabled || !config.disabledReason) return
        try {
            const v = await this.validateForEnable(guild)
            if (!v.canEnable) return

            log.info(`Validation passed for ${guild.name}, re-enabling`)

            config.enabled = true
            config.disabledReason = undefined
            config.disabledAt = undefined
            config.recoveredAt = new Date()
            await config.save()

            this.alertCooldowns.delete(guild.id)
            this.client.safeModerationConfigCache?.invalidate(guild.id)

            await this.sendRecoveryConfirmation(guild)
        } catch (err) {
            log.error(`Recovery check failed for ${guild.name}`, err)
        }
    }

    // ── monitoring lifecycle ────────────────────────────────────────

    startMonitoring(guild) {
        if (this.monitoringIntervals.has(guild.id)) return
        log.debug(`Monitoring started: ${guild.name}`)

        const id = setInterval(async () => {
            const cfg = await safeModerationSchema.findOne({ guildID: guild.id })
            if (cfg?.enabled) await this.checkAndHandleState(guild, cfg)
            else if (cfg && !cfg.enabled && cfg.disabledReason) await this.checkForRecovery(guild, cfg)
        }, MONITOR_INTERVAL)

        this.monitoringIntervals.set(guild.id, id)
    }

    stopMonitoring(guildId) {
        const id = this.monitoringIntervals.get(guildId)
        if (id) {
            clearInterval(id)
            this.monitoringIntervals.delete(guildId)
            log.debug(`Monitoring stopped: ${guildId}`)
        }
    }

    async initializeMonitoring() {
        log.info('Initializing monitoring for all guilds')
        const configs = await safeModerationSchema.find({})
        for (const cfg of configs) {
            const guild = this.client.guilds.cache.get(cfg.guildID)
            if (guild) this.startMonitoring(guild)
        }
        log.info(`Monitoring active for ${this.monitoringIntervals.size} guilds`)
    }
}

module.exports = SafeModerationValidator
