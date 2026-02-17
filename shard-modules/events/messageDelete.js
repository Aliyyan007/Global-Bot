const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.MessageDelete, async (message) => {
    try {
        const auction = client.cache.auctions.find(e => e.messageId === message.id)
        if (auction) await auction.delete(true, true)
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'MessageDelete Event' })
    }
})