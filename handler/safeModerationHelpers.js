/**
 * Safe-Moderation Helper Functions
 * Shared constants, permission utilities, embed builders, and validation.
 */

const { PermissionFlagsBits, EmbedBuilder, WebhookClient } = require('discord.js')
const logger = require('./safeModerationLogger')

const log = logger.scope('Helpers')

// ── constants ───────────────────────────────────────────────────────

const ACTION_NAMES = Object.freeze({
    banMembers: 'Ban Members',
    kickMembers: 'Kick Members',
    banKickMembers: 'Ban & Kick Members',
    timeoutMembers: 'Timeout Members',
    deleteRole: 'Delete Role',
    deleteChannel: 'Delete Channel',
    deleteMessages: 'Delete Messages',
    changeNickname: 'Change Nickname',
    addingMassBots: 'Adding Mass Bots',
    disconnectingMembers: 'Disconnecting Members from VC',
    movingMembers: 'Moving Members from VC',
    voiceModeration: 'Disconnecting or Moving Members from VC',
    mutingMembers: 'Muting Members from VC',
    deafeningMembers: 'Deafening Members from VC',
    everyoneHereSpam: '@everyone / @here Spam'
})

const ACTION_PERMISSIONS = Object.freeze({
    banMembers: PermissionFlagsBits.BanMembers,
    kickMembers: PermissionFlagsBits.KickMembers,
    banKickMembers: PermissionFlagsBits.BanMembers,
    timeoutMembers: PermissionFlagsBits.ModerateMembers,
    deleteChannel: PermissionFlagsBits.ManageChannels,
    deleteRole: PermissionFlagsBits.ManageRoles,
    deleteMessages: PermissionFlagsBits.ManageMessages,
    changeNickname: PermissionFlagsBits.ManageNicknames,
    addingMassBots: PermissionFlagsBits.ManageGuild,
    disconnectingMembers: PermissionFlagsBits.MoveMembers,
    movingMembers: PermissionFlagsBits.MoveMembers,
    voiceModeration: PermissionFlagsBits.MoveMembers,
    mutingMembers: PermissionFlagsBits.MuteMembers,
    deafeningMembers: PermissionFlagsBits.DeafenMembers,
    everyoneHereSpam: PermissionFlagsBits.MentionEveryone
})

const PERMISSIONS_TO_REMOVE = Object.freeze({
    banMembers: ['BanMembers'],
    kickMembers: ['KickMembers'],
    banKickMembers: ['BanMembers', 'KickMembers'],
    timeoutMembers: ['ModerateMembers'],
    deleteChannel: ['ManageChannels'],
    deleteRole: ['ManageRoles'],
    deleteMessages: ['ManageMessages'],
    changeNickname: ['ManageNicknames'],
    addingMassBots: ['ManageGuild', 'Administrator'],
    disconnectingMembers: ['MoveMembers'],
    movingMembers: ['MoveMembers'],
    voiceModeration: ['MoveMembers'],
    mutingMembers: ['MuteMembers'],
    deafeningMembers: ['DeafenMembers'],
    everyoneHereSpam: ['MentionEveryone', 'SendMessages']
})

// ── action utilities ────────────────────────────────────────────────

function getActionName(actionType) {
    return ACTION_NAMES[actionType] || actionType
}

function getActionPermission(actionType) {
    return ACTION_PERMISSIONS[actionType] ?? null
}

function getPermissionsToRemove(actionType) {
    return PERMISSIONS_TO_REMOVE[actionType] ?? []
}

// ── role detection ──────────────────────────────────────────────────

/** Check if bot can manage roles above a target member. */
async function checkBotPermissions(guild, targetMember) {
    const botMember = await guild.members.fetchMe().catch(() => null)
    if (!botMember) {
        log.error('Failed to fetch bot member')
        return false
    }

    const hasManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles)
    const isHigher = botMember.roles.highest.position > targetMember.roles.highest.position

    log.debug(`Hierarchy check: bot=${botMember.roles.highest.position} target=${targetMember.roles.highest.position}`)
    return hasManageRoles && isHigher
}

/**
 * Locate a bot-member's own role (managed or name-matched).
 * Returns the role regardless of its permissions.
 */
function findBotOwnRole(botMember) {
    if (!botMember.user.bot) return null

    const guildId = botMember.guild.id
    const botName = botMember.user.username.toLowerCase()

    // Priority 1: managed role (Discord-created integration role)
    const managed = botMember.roles.cache.find(r => r.managed && r.id !== guildId)
    if (managed) return managed

    // Priority 2: exact name match
    const exact = botMember.roles.cache.find(r =>
        r.id !== guildId && r.name === botMember.user.username
    )
    if (exact) return exact

    // Priority 3: partial name match
    const partial = botMember.roles.cache.find(r =>
        r.id !== guildId && r.name.toLowerCase().includes(botName)
    )
    return partial ?? null
}

/**
 * Find the highest role granting a specific permission.
 * For bots: prioritises the bot's own role if it carries the permission.
 * Falls back to the member's highest non-@everyone role.
 */
function findDangerousRole(member, actionType) {
    const targetPerm = getActionPermission(actionType)
    if (!targetPerm) {
        log.warn(`No permission mapping for action: ${actionType}`)
        return null
    }

    const guildId = member.guild.id
    const hasPerm = (role) =>
        role.permissions.has(targetPerm) || role.permissions.has(PermissionFlagsBits.Administrator)

    // Bot-specific: check bot's own role first
    if (member.user.bot) {
        const ownRole = findBotOwnRole(member)
        if (ownRole && hasPerm(ownRole)) {
            log.debug(`Bot own-role match: ${ownRole.name}`)
            return ownRole
        }
    }

    // Fast path: highest role often has the permission
    const highest = member.roles.highest
    if (highest && highest.id !== guildId && hasPerm(highest)) {
        return highest
    }

    // Single-pass scan for highest-position role with the permission
    let best = null
    for (const role of member.roles.cache.values()) {
        if (role.id === guildId) continue
        if (hasPerm(role) && (best === null || role.position > best.position)) {
            best = role
        }
    }
    if (best) return best

    // Fallback: highest non-@everyone role (channel overrides may grant the permission)
    if (highest && highest.id !== guildId) {
        log.warn(`No role with ${actionType} perm found, using highest role fallback`)
        return highest
    }

    log.error(`No suitable role for ${member.user.tag}`)
    return null
}

// ── notification helpers ────────────────────────────────────────────

function buildManagerMentions(config, prefix = '') {
    if (!config.managerRoles?.length) return ''
    const mentions = config.managerRoles.map(id => `<@&${id}>`).join(' ')
    return prefix ? `${mentions} - ${prefix}` : mentions
}

/** Send an embed to both the log channel and webhook. */
async function sendNotification(guild, config, embed, content = '') {
    const results = { channel: false, webhook: false }
    const payload = { content: content || undefined, embeds: [embed] }

    if (config.logChannelId) {
        const ch = guild.channels.cache.get(config.logChannelId)
        if (ch) {
            try {
                await ch.send(payload)
                results.channel = true
            } catch (err) {
                log.error('Channel notification failed', err)
            }
        }
    }

    if (config.logWebhook) {
        let wh
        try {
            wh = new WebhookClient({ url: config.logWebhook })
            await wh.send({ ...payload, username: 'Safe-Moderation', avatarURL: guild.iconURL() })
            results.webhook = true
        } catch (err) {
            log.error('Webhook notification failed', err)
        } finally {
            wh?.destroy()
        }
    }

    return results
}

// ── embed builders ──────────────────────────────────────────────────

function createRestrictionEmbed(member, actionType, responseTime = null) {
    const name = getActionName(actionType)
    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🚨 Safe-Moderation: Restriction Applied')
        .setDescription(`**${member.user.tag}** exceeded the limit for **${name}**`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Action Type', value: name, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `User ID: ${member.id}` })

    if (responseTime !== null) {
        embed.addFields({ name: 'Response Time', value: `${responseTime}ms`, inline: true })
    }
    return embed
}

function createActionDetectionEmbed(member, actionType, currentCount, maxCount, extra = {}) {
    const name = getActionName(actionType)
    const pct = (currentCount / maxCount) * 100
    const color = pct >= 80 ? 0xE74C3C : pct >= 50 ? 0xF39C12 : 0x3498DB

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('⚠️ Safe-Moderation: Action Detected')
        .setDescription(`**${member.user.tag}** performed: **${name}**`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Action Type', value: name, inline: true },
            { name: 'Count', value: `${currentCount}/${maxCount}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `User ID: ${member.id}` })

    if (extra.targetId)    embed.addFields({ name: 'Target',       value: `<@${extra.targetId}>`,     inline: true })
    if (extra.fromChannel) embed.addFields({ name: 'From Channel', value: `<#${extra.fromChannel}>`,  inline: true })
    if (extra.toChannel)   embed.addFields({ name: 'To Channel',   value: `<#${extra.toChannel}>`,    inline: true })

    return embed
}

function createFullRestorationEmbed(member, actionType) {
    return new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Safe-Moderation: Fully Restored')
        .setDescription(`**${member.user.tag}** has been fully restored after all cooldowns expired.`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Last Restriction', value: getActionName(actionType), inline: true }
        )
        .setTimestamp()
}

function createPartialRestorationEmbed(member, restoredAction, remainingActions) {
    const restoredName = getActionName(restoredAction)
    const remaining = remainingActions.map(a => getActionName(a)).join(', ')

    return new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('🔓 Safe-Moderation: Partial Restoration')
        .setDescription(`**${member.user.tag}** can now use **${restoredName}** again.`)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Restored Action', value: restoredName, inline: true },
            { name: 'Still Restricted', value: remaining || 'None', inline: false }
        )
        .setTimestamp()
}

function createFailureEmbed(member, actionType, reason, isPartialFailure = false, details = {}) {
    const name = getActionName(actionType)
    let desc = `**${member.user.tag}** exceeded the limit for **${name}** but the restriction could not be applied.`
    if (reason) desc += `\n\n**Reason:** ${reason}`
    if (isPartialFailure) {
        desc += `\n\n**Partial Failure:**`
        desc += `\n• Role Removal: ${details.removeSuccess ? '✅ Success' : '❌ Failed'}`
        desc += `\n• Role Addition: ${details.addSuccess ? '✅ Success' : '❌ Failed'}`
    }
    desc += `\n\n⚠️ **Manual intervention required!**`

    return new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('⚠️ Safe-Moderation: Restriction Failed')
        .setDescription(desc)
        .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Action Type', value: name, inline: true },
            { name: 'User ID', value: member.id, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Check bot permissions and role hierarchy' })
}

// ── permission verification ─────────────────────────────────────────

async function verifyRolePermissions(guild, role, restrictedPermissions) {
    const updated = await guild.roles.fetch(role.id, { force: true })

    const failures = restrictedPermissions.filter(name => {
        const bit = PermissionFlagsBits[name]
        return bit && updated.permissions.has(bit)
    })

    if (failures.length > 0) {
        log.error(`Role still has restricted permissions: ${failures.join(', ')}`)
        return false
    }
    return true
}

/** Compute a new permission set by stripping restricted actions from a role. */
function calculateRestrictedPermissions(originalRole, restrictedActions) {
    const uniquePerms = [...new Set(restrictedActions.flatMap(a => getPermissionsToRemove(a)))]
    const hasAdmin = originalRole.permissions.has(PermissionFlagsBits.Administrator)

    if (hasAdmin) {
        const removeBits = new Set(uniquePerms.map(n => PermissionFlagsBits[n]).filter(Boolean))
        return Object.values(PermissionFlagsBits)
            .filter(v => typeof v === 'bigint' && v !== PermissionFlagsBits.Administrator && !removeBits.has(v))
    }

    const current = originalRole.permissions.toArray()
    return current.filter(p => !uniquePerms.includes(p) && p !== 'Administrator')
}

// ── audit-log utilities ─────────────────────────────────────────────

async function fetchAuditLogs(guild, eventType, limit = 5) {
    try {
        return await guild.fetchAuditLogs({ type: eventType, limit })
    } catch (err) {
        log.error('Failed to fetch audit logs', err)
        return null
    }
}

function findAuditEntry(auditLogs, targetId, maxAge = 5000) {
    if (!auditLogs) return null
    const cutoff = Date.now() - maxAge
    return auditLogs.entries.find(e =>
        e.target?.id === targetId && e.createdTimestamp > cutoff
    ) ?? null
}

// ── config validation ───────────────────────────────────────────────

const REQUIRED_PERM_FIELDS = ['enabled', 'cooldown', 'actionCount', 'timeBetweenActions']

function validatePermissionConfig(config, actionType) {
    if (!config?.permissions) return { valid: false, reason: 'No permissions configuration found' }

    const pc = config.permissions[actionType]
    if (!pc) return { valid: false, reason: `No configuration for action type: ${actionType}` }

    for (const f of REQUIRED_PERM_FIELDS) {
        if (pc[f] === undefined || pc[f] === null) return { valid: false, reason: `Missing required field: ${f}` }
    }
    if (typeof pc.enabled !== 'boolean')                         return { valid: false, reason: 'enabled must be boolean' }
    if (typeof pc.cooldown !== 'number' || (pc.cooldown < 0 && pc.cooldown !== -1)) return { valid: false, reason: 'cooldown must be non-negative number or -1 (approval mode)' }
    if (typeof pc.actionCount !== 'number' || pc.actionCount < 1) return { valid: false, reason: 'actionCount must be positive number' }
    if (typeof pc.timeBetweenActions !== 'number' || pc.timeBetweenActions < 0)
        return { valid: false, reason: 'timeBetweenActions must be non-negative number' }
    if (pc.restrictionType && !['global', 'specific'].includes(pc.restrictionType))
        return { valid: false, reason: 'restrictionType must be "global" or "specific"' }

    return { valid: true }
}

function validateSafeModerationConfig(config) {
    if (!config)                    return { valid: false, reason: 'No configuration provided' }
    if (!config.guildID)            return { valid: false, reason: 'Missing guildID' }
    if (typeof config.enabled !== 'boolean') return { valid: false, reason: 'enabled must be boolean' }
    if (config.managerRoles && !Array.isArray(config.managerRoles))   return { valid: false, reason: 'managerRoles must be array' }
    if (config.whitelistRoles && !Array.isArray(config.whitelistRoles)) return { valid: false, reason: 'whitelistRoles must be array' }

    if (config.permissions) {
        for (const [action, pc] of Object.entries(config.permissions)) {
            const v = validatePermissionConfig({ permissions: { [action]: pc } }, action)
            if (!v.valid) return { valid: false, reason: `Invalid ${action} config: ${v.reason}` }
        }
    }
    return { valid: true }
}

// ── exports ─────────────────────────────────────────────────────────

module.exports = {
    ACTION_NAMES,
    ACTION_PERMISSIONS,
    getActionName,
    getActionPermission,
    getPermissionsToRemove,
    checkBotPermissions,
    findDangerousRole,
    findBotOwnRole,
    verifyRolePermissions,
    calculateRestrictedPermissions,
    buildManagerMentions,
    sendNotification,
    createRestrictionEmbed,
    createActionDetectionEmbed,
    createFullRestorationEmbed,
    createPartialRestorationEmbed,
    createFailureEmbed,
    fetchAuditLogs,
    findAuditEntry,
    validatePermissionConfig,
    validateSafeModerationConfig
}
