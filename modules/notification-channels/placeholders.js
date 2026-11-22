/**
 * Placeholder resolution for notification channel messages.
 *
 * Supported tokens (documented in the custom-message modal):
 *   {user}        -> member username
 *   {mention}     -> <@id> mention ping
 *   {server}      -> guild name
 *   {level}       -> member level (goodbye/level contexts only, else 1)
 *   {membercount} -> current guild member count
 *
 * @module notification-channels/placeholders
 */

/**
 * Resolve placeholders in a single string.
 * @param {string|undefined} text
 * @param {GuildMember|Object} member - member-like object (member.user.id/username or id/username)
 * @param {Guild} guild
 * @param {Object} [extra] - extra values, e.g. { level: 5 }
 * @returns {string|undefined}
 */
function resolvePlaceholders(text, member, guild, extra = {}) {
    if (text === undefined || text === null) return text
    const user = member?.user || member || {}
    const userId = member?.id || user.id || '0'
    return String(text)
        .replaceAll('{mention}', `<@${userId}>`)
        .replaceAll('{user}', user.username || user.tag || 'user')
        .replaceAll('{server}', guild?.name || '')
        .replaceAll('{level}', String(extra.level ?? 1))
        .replaceAll('{membercount}', String(guild?.memberCount ?? ''))
        .replaceAll('{member_count}', String(guild?.memberCount ?? ''))
}

/**
 * Deep-resolve placeholders inside a serialized message payload
 * ({ content, embeds: [...] }). Mutates nothing — returns a new object.
 * @param {Object} messageData
 * @param {GuildMember|Object} member
 * @param {Guild} guild
 * @param {Object} [extra]
 * @returns {Object}
 */
function resolveMessagePlaceholders(messageData, member, guild, extra = {}) {
    if (!messageData || typeof messageData !== 'object') return messageData
    const out = { ...messageData }
    out.content = resolvePlaceholders(out.content, member, guild, extra)
    if (Array.isArray(out.embeds)) {
        out.embeds = out.embeds.map(embed => {
            if (!embed || typeof embed !== 'object') return embed
            const e = JSON.parse(JSON.stringify(embed))
            e.title = resolvePlaceholders(e.title, member, guild, extra)
            e.description = resolvePlaceholders(e.description, member, guild, extra)
            if (e.author?.name) e.author.name = resolvePlaceholders(e.author.name, member, guild, extra)
            if (e.footer?.text) e.footer.text = resolvePlaceholders(e.footer.text, member, guild, extra)
            if (Array.isArray(e.fields)) {
                e.fields = e.fields.map(f => f ? ({
                    ...f,
                    name: resolvePlaceholders(f.name, member, guild, extra),
                    value: resolvePlaceholders(f.value, member, guild, extra)
                }) : f)
            }
            return e
        })
    }
    return out
}

/**
 * Convert a stored customMessage ({content, embeds, attachments}) into a
 * valid channel.send payload — `attachments` is our persisted metadata
 * (url + name), Discord expects `files`.
 * @param {Object} messageData
 * @returns {Object}
 */
function toSendPayload(messageData) {
    if (!messageData || typeof messageData !== 'object') return messageData
    const { attachments, ...rest } = messageData
    if (Array.isArray(attachments) && attachments.length) {
        rest.files = attachments
            .filter(a => a?.url)
            .map(a => ({ attachment: a.url, name: a.name }))
            .slice(0, 10)
    }
    return rest
}

module.exports = { resolvePlaceholders, resolveMessagePlaceholders, toSendPayload }
