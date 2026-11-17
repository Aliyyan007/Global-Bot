/**
 * Sticky Command Repositioner
 *
 * Keeps configured sticky-command messages glued to the bottom of their
 * channel. Triggered from the MessageCreate event:
 *   - human messages            -> reposition
 *   - this bot's own messages   -> reposition (e.g. replies produced by
 *                                  sticky button interactions)
 *   - other bots' messages      -> ignored (never un-sticks the channel and
 *                                  prevents ping-pong repost loops)
 *
 * Only one reposition runs per channel at a time; bursts are coalesced so a
 * spam wave results in one delete+resend cycle, not N.
 */

// channelId -> a reposition pass is currently in flight
const running = new Set()
// channelId -> another trigger arrived while a pass was running
const pending = new Set()

/**
 * Schedule a reposition pass for a channel.
 * @param {Client} client
 * @param {GuildTextBasedChannel} channel
 * @param {string} guildId
 */
function schedule(client, channel, guildId) {
    if (!channel || !guildId) return
    if (running.has(channel.id)) {
        pending.add(channel.id)
        return
    }
    running.add(channel.id)
    ;(async () => {
        try {
            do {
                pending.delete(channel.id)
                await reposition(client, channel, guildId).catch(e => {
                    console.error(`[StickyCommands] Reposition failed in channel ${channel.id}:`, e.message)
                })
            } while (pending.has(channel.id))
        } finally {
            running.delete(channel.id)
            pending.delete(channel.id)
        }
    })()
}

/**
 * Delete the current sticky message(s) and post fresh copies at the bottom.
 * Sticky records are grouped by the physical message they point at — several
 * commands normally share one message, but legacy/extra records may reference
 * different ones; each distinct sticky is re-glued independently.
 */
async function reposition(client, channel, guildId) {
    const configs = client.cache?.stickyCommands?.filter(c =>
        c.guildID === guildId && c.channelID === channel.id
    )
    if (!configs?.size) return

    const { buildCombinedButtonRows } = require("../interactions/scm-confirm.js")

    // Group by physical message id (records with no message yet use their own key)
    const groups = new Map()
    for (const [key, cfg] of configs) {
        const groupId = cfg.messageID || `__none_${key}`
        if (!groups.has(groupId)) groups.set(groupId, [])
        groups.get(groupId).push([key, cfg])
    }

    for (const [messageID, entries] of groups) {
        try {
            if (messageID === channel.lastMessageId) continue // already at bottom

            const first = entries[0][1]
            const commandNames = [...new Set(entries.map(([, c]) => c.commandName).filter(Boolean))]
            if (!commandNames.length) continue

            const messageOptions = { components: buildCombinedButtonRows(commandNames, channel.id) }
            if (first.embedMessage?.content) messageOptions.content = first.embedMessage.content
            if (first.embedMessage?.embed) messageOptions.embeds = [first.embedMessage.embed]

            if (!messageOptions.content && !messageOptions.embeds?.length && !messageOptions.components.length) continue

            // Delete the previous copy of this sticky (may already be gone)
            if (!messageID.startsWith('__none_')) {
                const oldMessage = await channel.messages.fetch(messageID).catch(() => null)
                if (oldMessage) await oldMessage.delete().catch(() => null)
            }

            const sent = await channel.send(messageOptions)

            // Persist the new message id on this group's records + cache
            const names = entries.map(([, c]) => c.commandName)
            await client.stickyCommandSchema.updateMany(
                { guildID: guildId, channelID: channel.id, commandName: { $in: names } },
                { $set: { messageID: sent.id } }
            ).catch(e => console.error(`[StickyCommands] DB update failed in channel ${channel.id}:`, e.message))
            for (const [key, cfg] of entries) {
                client.cache.stickyCommands.set(key, { ...cfg, messageID: sent.id })
            }
        } catch (e) {
            console.error(`[StickyCommands] Failed to reposition sticky ${messageID} in ${channel.id}:`, e.message)
        }
    }
}

module.exports = { schedule }
