/**
 * CRITICAL: Instant Bot Protection Handler
 * Removes dangerous permissions from bots IMMEDIATELY upon addition.
 * Target: <500 ms to prevent nuke bots from destroying servers.
 */

const { PermissionFlagsBits } = require('discord.js')
const logger = require('./safeModerationLogger')

const log = logger.scope('BotProtection')

// Pre-compute a BigInt bitmask once for fast stripping
const DANGEROUS_PERMS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageEmojisAndStickers,
    PermissionFlagsBits.MentionEveryone,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageThreads,
    PermissionFlagsBits.ModerateMembers
]

// Build a reverse lookup once: bigint → name
const PERM_NAME_MAP = new Map(
    Object.entries(PermissionFlagsBits)
        .filter(([, v]) => typeof v === 'bigint')
        .map(([k, v]) => [v, k])
)

const DANGEROUS_MASK = DANGEROUS_PERMS.reduce((mask, p) => mask | p, 0n)

class BotProtectionHandler {
    constructor(client) {
        this.client = client
        log.info('Handler ready')
    }

    // ── main entry point ────────────────────────────────────────────

    /**
     * Strip dangerous permissions from every role a newly-added bot holds.
     * Executes all role edits in parallel for maximum speed.
     */
    async instantBotProtection(guild, botMember, config) {
        const t = Date.now()
        try {
            log.info(`Instant protection for ${botMember.user.tag}`)

            const botRoles = botMember.roles.cache.filter(r => r.id !== guild.id)
            if (!botRoles.size) {
                return { success: true, rolesModified: 0, elapsed: Date.now() - t, reason: 'no_roles' }
            }

            // Snapshot original permissions
            const origPerms = new Map()
            for (const r of botRoles.values()) origPerms.set(r.id, r.permissions.bitfield)

            // Strip in parallel
            const results = await Promise.allSettled(
                botRoles.map(r => this._stripRole(r, guild, botMember))
            )

            let modified = 0, failed = 0
            for (const r of results) {
                if (r.status === 'fulfilled' && r.value.success) modified++
                else { failed++; log.error(`Role strip failed: ${r.reason ?? r.value?.reason}`) }
            }

            const elapsed = Date.now() - t

            // Persist originals for potential restore
            if (config.botProtection?.storeOriginalPermissions !== false) {
                await this._storeOriginals(guild.id, botMember.id, origPerms)
            }

            log.info(`Protection complete in ${elapsed}ms — modified: ${modified}, failed: ${failed}`)

            return {
                success: modified > 0 || failed === 0,
                rolesModified: modified, rolesFailed: failed, elapsed,
                originalPermissions: [...origPerms.entries()]
            }
        } catch (err) {
            log.error('Instant protection failed', err)
            return { success: false, rolesModified: 0, elapsed: Date.now() - t, reason: err.message }
        }
    }

    // ── restore ─────────────────────────────────────────────────────

    /** Restore original permission bitfields after bot approval. */
    async restoreBotPermissions(guild, botMember, originalPermissions) {
        const t = Date.now()
        try {
            if (!originalPermissions?.length) {
                return { success: true, rolesRestored: 0, reason: 'no_permissions' }
            }

            const ops = []
            for (const [roleId, bits] of originalPermissions) {
                const role = guild.roles.cache.get(roleId)
                if (!role) { log.warn(`Role ${roleId} gone, skipping`); continue }
                ops.push(
                    role.setPermissions(bits, `Safe-Moderation: Restored for approved bot ${botMember.user.tag}`)
                        .catch(err => { log.error(`Restore ${role.name} failed`, err); return null })
                )
            }

            const results = await Promise.allSettled(ops)
            const restored = results.filter(r => r.status === 'fulfilled' && r.value !== null).length

            log.info(`Restored ${restored} roles in ${Date.now() - t}ms`)
            return { success: true, rolesRestored: restored, elapsed: Date.now() - t }
        } catch (err) {
            log.error('Permission restore failed', err)
            return { success: false, rolesRestored: 0, reason: err.message }
        }
    }

    // ── queries ──────────────────────────────────────────────────────

    /** True if any non-@everyone role carries a dangerous permission. */
    hasDangerousPermissions(botMember) {
        for (const role of botMember.roles.cache.values()) {
            if (role.id === botMember.guild.id) continue
            if ((role.permissions.bitfield & DANGEROUS_MASK) !== 0n) return true
        }
        return false
    }

    /** Return an array of dangerous permission names the bot currently has. */
    getDangerousPermissionsList(botMember) {
        const found = new Set()
        for (const role of botMember.roles.cache.values()) {
            if (role.id === botMember.guild.id) continue
            for (const perm of DANGEROUS_PERMS) {
                if (role.permissions.has(perm)) found.add(PERM_NAME_MAP.get(perm))
            }
        }
        return [...found]
    }

    // ── internal ────────────────────────────────────────────────────

    /** Strip dangerous permissions from a single role. */
    async _stripRole(role, guild, botMember) {
        try {
            if ((role.permissions.bitfield & DANGEROUS_MASK) === 0n) {
                return { success: true, modified: false, reason: 'no_dangerous_perms' }
            }

            const me = await guild.members.fetchMe()
            if (role.position >= me.roles.highest.position) {
                return { success: false, modified: false, reason: 'hierarchy' }
            }
            if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return { success: false, modified: false, reason: 'missing_permission' }
            }

            const cleaned = role.permissions.bitfield & ~DANGEROUS_MASK

            await role.setPermissions(
                cleaned,
                `Safe-Moderation: Instant bot protection for ${botMember.user.tag}`
            )

            return { success: true, modified: true, roleName: role.name, roleId: role.id }
        } catch (err) {
            log.error(`Error modifying role "${role.name}"`, err)
            return { success: false, modified: false, reason: err.message }
        }
    }

    /** Persist original permission snapshots for later restoration. */
    async _storeOriginals(guildId, botId, origPerms) {
        try {
            const schema = require('../schemas/safeModerationSchema')
            const config = await schema.findOne({ guildID: guildId })
            if (!config) return

            const entry = config.quarantinedBots?.find(b => b.botId === botId)
            if (entry) {
                entry.originalRolePermissions = Object.fromEntries(origPerms)
            }
        } catch (err) {
            log.error('Failed to store original permissions', err)
        }
    }
}

module.exports = BotProtectionHandler
