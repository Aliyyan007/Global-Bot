/**
 * ULTRA-FAST Restriction Applier
 * Redesigned for maximum performance with minimal overhead.
 * Target: <50 ms for most operations, <10 ms for immediate bot kicks.
 */

const { PermissionFlagsBits } = require('discord.js')
const logger = require('./safeModerationLogger')
const {
    findDangerousRole,
    findBotOwnRole,
    getPermissionsToRemove,
    getActionPermission
} = require('./safeModerationHelpers')

const log = logger.scope('FastRestriction')

const CACHE_TTL = 5 * 60 * 1000         // 5 min
const CLEANUP_INTERVAL = 10 * 60 * 1000  // 10 min
const DEFAULT_COOLDOWN = 21_600           // 6 h (seconds)
const IMMEDIATE_KICK_ACTIONS = new Set(['deleteChannel', 'deleteRole'])

class FastRestrictionApplier {
    constructor(client) {
        this.client = client
        this.safeModerationManager = null
        this.schema = require('../schemas/safeModerationSchema')

        this.inProgress = new Set()
        this.botMemberCache = new Map()

        this._cleanupTimer = setInterval(() => this._cleanupCaches(), CLEANUP_INTERVAL)
    }

    // ── entry point ─────────────────────────────────────────────────

    /** Route to bot or user handler; instant-kick for critical bot actions. */
    async applyRestrictionFast(guild, member, actionType, config) {
        const t = Date.now()

        // Instant fire-and-forget kick for destructive bot actions
        if (member.user.bot && IMMEDIATE_KICK_ACTIONS.has(actionType)) {
            member.kick(`Safe-Moderation: ${actionType}`).then(() =>
                log.info(`Bot kicked in ${Date.now() - t}ms for ${actionType}`)
            ).catch(() => {})
            return { success: true, reason: 'immediate_kick', elapsed: Date.now() - t, isBot: true, botTag: member.user.tag, actionType }
        }

        // Duplicate prevention
        const key = `${guild.id}-${member.id}-${actionType}`
        if (this.inProgress.has(key)) return { success: false, reason: 'already_processing' }
        this.inProgress.add(key)

        try {
            return member.user.bot
                ? await this._restrictBot(guild, member, actionType, config, t)
                : await this._restrictUser(guild, member, actionType, config, t)
        } catch (err) {
            log.error('Restriction failed', err)
            return { success: false, reason: err.message, elapsed: Date.now() - t }
        } finally {
            this.inProgress.delete(key)
        }
    }

    // ── validation ──────────────────────────────────────────────────

    async _validate(guild, member) {
        const bot = await this._getBotMember(guild)
        if (!bot) return { valid: false, reason: 'failed_to_fetch_bot' }
        if (!bot.permissions.has(PermissionFlagsBits.ManageRoles) ||
            bot.roles.highest.position <= member.roles.highest.position) {
            return { valid: false, reason: 'insufficient_permissions' }
        }
        return { valid: true, botMember: bot }
    }

    // ── user restriction ────────────────────────────────────────────

    async _restrictUser(guild, member, actionType, config, t) {
        const v = await this._validate(guild, member)
        if (!v.valid) return { success: false, reason: v.reason }

        const dangerousRole = findDangerousRole(member, actionType)
        if (!dangerousRole) return { success: false, reason: 'no_dangerous_role' }

        // Existing restriction → update (match by roleId OR by userId with any existing entry)
        // This prevents creating duplicate restriction entries when a second actionType
        // triggers on the already-restricted clone role
        const existing = config.dynamicRestrictionRoles?.find(
            e => e.userId === member.id && (e.roleId === dangerousRole.id || member.roles.cache.has(e.roleId))
        )
        if (existing) return this._updateExisting(member, actionType, config, existing, t)

        // Parallel: remove original + create restricted clone
        const [rm, cr] = await Promise.allSettled([
            member.roles.remove(dangerousRole, `Safe-Moderation: ${actionType}`),
            this._createRestrictionRole(guild, member, dangerousRole, actionType, config)
        ])

        if (rm.status !== 'fulfilled') {
            return { success: false, reason: 'failed_to_remove_role', error: rm.reason?.message, elapsed: Date.now() - t }
        }

        const rRole = cr.status === 'fulfilled' ? cr.value : null
        if (!rRole) {
            await member.roles.add(dangerousRole, 'Safe-Moderation: Rollback').catch(() => {})
            return { success: false, reason: 'failed_to_create_restriction_role', elapsed: Date.now() - t }
        }

        const added = await member.roles.add(rRole, `Safe-Moderation: ${actionType}`).then(() => true).catch(() => false)
        const elapsed = Date.now() - t
        log.info(`User restricted in ${elapsed}ms`)

        return {
            success: added, removedRole: dangerousRole.id, addedRole: rRole.id,
            originalRole: dangerousRole.id, restrictionRole: rRole.id, elapsed
        }
    }

    // ── bot restriction ─────────────────────────────────────────────

    async _restrictBot(guild, botMember, actionType, config, t) {
        // Check if bot is whitelisted by ANY of its roles
        const botRoles = botMember.roles.cache.map(r => r.id)
        if (this.client?.safeModerationTracker?.isWhitelisted?.(guild.id, botMember.id, botRoles, config)) {
            log.debug(`Bot ${botMember.user.tag} is whitelisted - skipping restriction`)
            return { success: false, reason: 'whitelisted', isBot: true, elapsed: Date.now() - t }
        }
        
        const v = await this._validate(guild, botMember)
        if (!v.valid) return { success: false, reason: v.reason, isBot: true }

        const allDangerous = this._findAllDangerousRoles(botMember, actionType, v.botMember)

        // No modifiable role → emergency kick
        if (!allDangerous.length) {
            await botMember.kick(`Safe-Moderation: ${actionType} limit exceeded`).catch(() => {})
            return { success: true, reason: 'emergency_kick', elapsed: Date.now() - t, isBot: true, botTag: botMember.user.tag }
        }

        const ownRole = findBotOwnRole(botMember)

        // Only its own role → edit permissions in-place
        if (allDangerous.length === 1 && ownRole?.id === allDangerous[0].id) {
            return this._editBotOwnRole(ownRole, botMember, actionType, t)
        }

        // Strip own role permissions first if needed
        if (ownRole) await this._stripOwnRolePerms(ownRole, actionType)

        const serverRoles = allDangerous.filter(r => !ownRole || r.id !== ownRole.id)
        if (!serverRoles.length) {
            return { success: true, reason: 'bot_own_role_only', elapsed: Date.now() - t, isBot: true, botTag: botMember.user.tag, rolesRemoved: 0 }
        }

        const highest = serverRoles.reduce((h, r) => r.position > h.position ? r : h)

        // Parallel: remove all server roles + create restriction role
        const [rmResult, crResult] = await Promise.allSettled([
            Promise.allSettled(serverRoles.map(r => botMember.roles.remove(r, `Safe-Moderation: ${actionType}`))),
            this._createRestrictionRole(guild, botMember, highest, actionType, config)
        ])

        const rmArr = rmResult.status === 'fulfilled' ? rmResult.value : []
        const ok = rmArr.filter(r => r.status === 'fulfilled').length
        const failed = rmArr.filter(r => r.status === 'rejected')

        log.info(`Removed ${ok}/${serverRoles.length} dangerous roles`)

        // Hierarchy failure → emergency kick
        if (failed.some(r => r.reason?.code === 50013) && ok === 0) {
            await botMember.kick(`Safe-Moderation: ${actionType} (hierarchy)`).catch(() => {})
            return { success: true, reason: 'emergency_kick_hierarchy', elapsed: Date.now() - t, isBot: true, botTag: botMember.user.tag }
        }

        const rRole = crResult.status === 'fulfilled' ? crResult.value : null
        if (!rRole) {
            // Rollback
            for (let i = 0; i < ok; i++) await botMember.roles.add(serverRoles[i], 'Safe-Moderation: Rollback').catch(() => {})
            return { success: false, reason: 'failed_to_create_restriction_role', isBot: true, elapsed: Date.now() - t }
        }

        const added = await botMember.roles.add(rRole, `Safe-Moderation: ${actionType}`).then(() => true).catch(() => false)
        const elapsed = Date.now() - t
        log.info(`Bot restricted in ${elapsed}ms (${ok} roles removed)`)

        return {
            success: ok > 0 && added,
            removedRoles: serverRoles.slice(0, ok).map(r => r.id),
            addedRole: rRole.id, originalRole: highest.id, restrictionRole: rRole.id,
            elapsed, isBot: true, botTag: botMember.user.tag, rolesRemovedCount: ok
        }
    }

    // ── role helpers ─────────────────────────────────────────────────

    /** All roles the bot can modify that carry the target permission. */
    _findAllDangerousRoles(member, actionType, botSelf) {
        const perm = getActionPermission(actionType)
        if (!perm) return []
        const ceiling = botSelf.roles.highest.position
        const gid = member.guild.id
        const out = []
        for (const r of member.roles.cache.values()) {
            if (r.id === gid || r.position >= ceiling) continue
            if (r.permissions.has(perm) || r.permissions.has(PermissionFlagsBits.Administrator)) out.push(r)
        }
        return out.sort((a, b) => b.position - a.position)
    }

    async _editBotOwnRole(role, botMember, actionType, t) {
        const perm = getActionPermission(actionType)
        if (!role.permissions.has(perm) && !role.permissions.has(PermissionFlagsBits.Administrator)) {
            return { success: true, reason: 'bot_own_role_no_restricted_perm', elapsed: Date.now() - t, isBot: true, botTag: botMember.user.tag, noActionNeeded: true }
        }
        try {
            await role.setPermissions(this._calcPerms(role, actionType), `Safe-Moderation: Remove ${actionType}`)
            return { success: true, reason: 'bot_own_role_edited', elapsed: Date.now() - t, isBot: true, botTag: botMember.user.tag, botOwnRoleEdited: true }
        } catch (err) {
            return { success: false, reason: 'failed_to_edit_bot_own_role', error: err.message, elapsed: Date.now() - t, isBot: true }
        }
    }

    async _stripOwnRolePerms(role, actionType) {
        const perm = getActionPermission(actionType)
        if (!role.permissions.has(perm) && !role.permissions.has(PermissionFlagsBits.Administrator)) return
        try {
            await role.setPermissions(this._calcPerms(role, actionType), `Safe-Moderation: Remove ${actionType}`)
        } catch (err) {
            log.error('Failed to strip bot own-role perms', err)
        }
    }

    /** Compute new permission set after removing restricted perms. */
    _calcPerms(role, actionType) {
        const remove = getPermissionsToRemove(actionType)
        if (role.permissions.has(PermissionFlagsBits.Administrator)) {
            const removeBits = new Set(remove.map(n => PermissionFlagsBits[n]).filter(Boolean))
            return Object.values(PermissionFlagsBits)
                .filter(p => typeof p === 'bigint' && p !== PermissionFlagsBits.Administrator && !removeBits.has(p))
        }
        return role.permissions.toArray().filter(p => !remove.includes(p))
    }

    // ── restriction role management ─────────────────────────────────

    async _updateExisting(member, actionType, config, entry, t) {
        // Re-read config from DB to avoid stale data when multiple restrictions trigger close together
        const freshConfig = await this.schema.findOne({ guildID: member.guild.id })
        if (!freshConfig) return { success: false, reason: 'config_not_found' }

        const freshEntry = freshConfig.dynamicRestrictionRoles?.find(
            e => e.roleId === entry.roleId && e.userId === member.id
        )
        if (!freshEntry) return { success: false, reason: 'entry_not_found_in_fresh_config' }

        const role = member.guild.roles.cache.get(freshEntry.roleId)
        if (!role) {
            freshConfig.dynamicRestrictionRoles = freshConfig.dynamicRestrictionRoles.filter(e => e.roleId !== freshEntry.roleId)
            freshConfig.save().catch(() => {})
            return { success: false, reason: 'restriction_role_deleted' }
        }

        try {
            await role.setPermissions(this._calcPerms(role, actionType), `Safe-Moderation: Add ${actionType} restriction`)

            if (!freshEntry.restrictedPermissions.includes(actionType)) freshEntry.restrictedPermissions.push(actionType)
            
            const cd = freshConfig.permissions?.[actionType]?.cooldown
            const isApprovalMode = cd === -1

            if (isApprovalMode) {
                // Approval mode: mark pending, do NOT schedule auto-restore
                freshEntry.approvalPending = true
                if (!freshEntry.expiryTimes) freshEntry.expiryTimes = {}
                freshConfig.markModified('dynamicRestrictionRoles')
                await freshConfig.save()
                // Send approval message (fire-and-forget)
                this._sendApprovalMessage(member.guild, member, actionType, freshConfig, freshEntry).catch(() => {})
            } else {
                // Time-based mode: schedule auto-restore for THIS specific actionType
                if (!freshEntry.expiryTimes) freshEntry.expiryTimes = {}
                const cdMs = (cd || DEFAULT_COOLDOWN) * 1000
                freshEntry.expiryTimes[actionType] = new Date(Date.now() + cdMs)
                freshConfig.markModified('dynamicRestrictionRoles')
                freshConfig.save().then(() => {
                    const { scheduleRestrictionRestoration } = require('./safeModerationInitializer')
                    scheduleRestrictionRestoration(this.client, member.guild, member, actionType, freshConfig, freshEntry, cdMs)
                }).catch(() => {})
            }

            return { success: true, isUpdate: true, restrictionRole: role.id, elapsed: Date.now() - t, isBot: member.user.bot, isApprovalMode }
        } catch (err) {
            return { success: false, reason: 'failed_to_update_restriction', error: err.message }
        }
    }

    async _createRestrictionRole(guild, member, original, actionType, config) {
        const perms = this._calcPerms(original, actionType)

        const opts = {
            name: `${original.name} ❗`,
            color: original.color,
            permissions: perms,
            reason: `Safe-Moderation: ${actionType}`
        }
        if (original.hoist)        opts.hoist = true
        if (original.mentionable)  opts.mentionable = true
        if (original.icon)         opts.icon = original.icon
        if (original.unicodeEmoji) opts.unicodeEmoji = original.unicodeEmoji

        const role = await guild.roles.create(opts)
        role.setPosition(Math.max(0, original.position - 1)).catch(() => {})

        if (!config.dynamicRestrictionRoles) config.dynamicRestrictionRoles = []
        
        const cd = config.permissions?.[actionType]?.cooldown
        const isApprovalMode = cd === -1

        const entry = {
            roleId: role.id, originalRoleId: original.id, userId: member.id,
            restrictedPermissions: [actionType], createdAt: new Date(),
            expiryTimes: {},
            memberCount: 1,
            approvalPending: isApprovalMode
        }

        if (isApprovalMode) {
            // Approval mode: do NOT set expiry or schedule restoration
            config.dynamicRestrictionRoles.push(entry)
            await config.save()
            // Send approval message (fire-and-forget)
            this._sendApprovalMessage(guild, member, actionType, config, entry).catch(() => {})
        } else {
            // Time-based mode: set expiry and schedule restoration
            const cdMs = (cd || DEFAULT_COOLDOWN) * 1000
            entry.expiryTimes = { [actionType]: new Date(Date.now() + cdMs) }
            config.dynamicRestrictionRoles.push(entry)
            config.save().then(() => {
                const { scheduleRestrictionRestoration } = require('./safeModerationInitializer')
                scheduleRestrictionRestoration(this.client, guild, member, actionType, config, entry, cdMs)
            }).catch(() => {})
        }

        return role
    }

    /**
     * Send an approval message to the server panel channel with Approve/Deny buttons.
     * Called when cooldown is set to -1 (approval mode).
     */
    async _sendApprovalMessage(guild, member, actionType, config, entry) {
        try {
            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
            const { getActionName, buildManagerMentions } = require('./safeModerationHelpers')

            // Resolution: Server Panel channel -> dedicated approval channel -> log channel
            let channel = null
            if (config.serverPanel?.channelId) {
                channel = await guild.channels.fetch(config.serverPanel.channelId).catch(() => null)
            }
            if (!channel && config.approvalChannelId) {
                channel = await guild.channels.fetch(config.approvalChannelId).catch(() => null)
            }
            // Fallback to log channel
            if (!channel && config.logChannelId) {
                channel = await guild.channels.fetch(config.logChannelId).catch(() => null)
            }
            if (!channel) {
                log.warn('No channel found to send approval message')
                return
            }

            const actionName = getActionName(actionType)
            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('⏳ Safe-Moderation: Approval Required')
                .setDescription(`**${member.user.tag}** exceeded the limit for **${actionName}** and has been restricted.\n\nAn administrator or manager must approve or deny the restoration.`)
                .addFields(
                    { name: 'User', value: `<@${member.id}>`, inline: true },
                    { name: 'Action Type', value: actionName, inline: true },
                    { name: 'Restricted At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Status', value: '⏳ Awaiting Approval', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `User ID: ${member.id}` })

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`sm_approve_${guild.id}_${member.id}_${entry.roleId}_${actionType}`)
                    .setLabel('✅ Approve (Restore)')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`sm_deny_${guild.id}_${member.id}_${entry.roleId}_${actionType}`)
                    .setLabel('❌ Deny (Keep Restricted)')
                    .setStyle(ButtonStyle.Danger)
            )

            const content = buildManagerMentions(config, 'Approval required!')
            const msg = await channel.send({ content: content || undefined, embeds: [embed], components: [row] })

            // Store the approval message ID in the entry
            entry.approvalMessageId = msg.id
            config.markModified('dynamicRestrictionRoles')
            await config.save()

            log.info(`Approval message sent for ${member.user.tag} - ${actionType}`)
        } catch (err) {
            log.error('Failed to send approval message', err)
        }
    }

    /** Mark a restriction role for cleanup when its last member is removed. */
    markRoleForCleanup(guildId, roleId) {
        if (!this.client.autoProtectionHandler) return
        this.schema.findOne({ guildID: guildId }).then(cfg => {
            if (!cfg) return
            const e = cfg.dynamicRestrictionRoles?.find(r => r.roleId === roleId)
            if (e) { e.memberCount = 0; e.markedForCleanup = true; cfg.save().catch(() => {}) }
        }).catch(() => {})
    }

    // ── batch / emergency ───────────────────────────────────────────

    async batchApplyRestrictions(guild, restrictions) {
        const results = await Promise.allSettled(
            restrictions.map(({ member, actionType, config }) =>
                this.applyRestrictionFast(guild, member, actionType, config)
            )
        )
        return results.map((r, i) => ({
            member: restrictions[i].member,
            success: r.status === 'fulfilled' && r.value.success,
            result: r.status === 'fulfilled' ? r.value : { success: false, reason: r.reason }
        }))
    }

    async emergencyLockdown(guild, member) {
        try {
            await member.kick('Safe-Moderation: Emergency lockdown')
            return { success: true, action: 'kicked' }
        } catch {
            try {
                await member.ban({ reason: 'Safe-Moderation: Emergency lockdown (kick failed)' })
                return { success: true, action: 'banned' }
            } catch {
                return { success: false, reason: 'lockdown_failed' }
            }
        }
    }

    // ── cache / stats ───────────────────────────────────────────────

    async _getBotMember(guild) {
        const hit = this.botMemberCache.get(guild.id)
        if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.member
        const m = await guild.members.fetchMe().catch(() => null)
        if (m) this.botMemberCache.set(guild.id, { member: m, ts: Date.now() })
        return m
    }

    _cleanupCaches() {
        const cutoff = Date.now() - CACHE_TTL
        for (const [k, v] of this.botMemberCache) {
            if (v.ts < cutoff) this.botMemberCache.delete(k)
        }
    }

    getStats() {
        return { inProgress: this.inProgress.size, botMemberCacheSize: this.botMemberCache.size }
    }
}

module.exports = FastRestrictionApplier
