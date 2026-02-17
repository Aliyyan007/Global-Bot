const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.WebhooksUpdate, async (channel) => {
    try {
        const webhooks = await channel.fetchWebhooks().catch(e => null)
        if (webhooks) webhooks.forEach(webhook => client.cache.webhooks.set(webhook.id, webhook))
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'WebhooksUpdate Event' })
    }
})