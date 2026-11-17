/**
 * Sticky Commands: Message Create Repositioning
 *
 * Watches guild text channels that have configured sticky commands
 * (/sticky-cmd-manager) and re-glues the sticky message to the bottom:
 *   - human messages            -> reposition
 *   - this bot's own messages   -> reposition (sticky button replies land here)
 *   - other bots' messages      -> ignored by design — the sticky stays where
 *                                  it is, which also prevents repost ping-pong
 *
 * Loop safety: any message that itself carries sticky-command buttons
 * (c{sc}… custom ids) is never a trigger, so our own reposts — and even a
 * second sticky group in the same channel — cannot cause a repost cycle.
 */

const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")
const stickyReposition = require("../handler/stickyReposition")

const STICKY_BUTTON = /^c\{sc\}/

function isStickyMessage(message) {
    if (!message.components?.length) return false
    for (const row of message.components) {
        for (const component of row.components || []) {
            const id = component.customId || component.custom_id
            if (id && STICKY_BUTTON.test(id)) return true
        }
    }
    return false
}

client.on(Events.MessageCreate, async (message) => {
    try {
        if (!message.guild) return
        const configs = client.cache?.stickyCommands?.filter(c =>
            c.guildID === message.guildId && c.channelID === message.channelId
        )
        if (!configs?.size) return

        // Never react to a sticky message itself (ours or a stale one) —
        // this is the primary anti-loop guard and also covers the race where
        // the gateway event arrives before channel.send() resolves.
        if (isStickyMessage(message)) return

        if (message.author.bot && message.author.id !== client.user.id) {
            // Another bot spoke — per design the sticky is NOT moved for
            // other bots' traffic (also prevents inter-bot repost loops).
            return
        }

        stickyReposition.schedule(client, message.channel, message.guildId)
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'StickyCommands MessageCreate Event' })
    }
})
