const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildEmojiDelete, async (emoji) => {
    try {
        const items = client.cache.items.filter(e => e.emoji === emoji.id)
        await Promise.all(items.map(async item => {
            item.emoji = "991344303253241897"
            item.displayEmoji = "⏳"
            await item.save().catch(err => console.error(`Failed to save item ${item.itemID}:`, err))
        }))
        const achievements = client.cache.achievements.filter(e => e.emoji === emoji.id)
        await Promise.all(achievements.map(async achievement => {
            achievement.emoji = "991344303253241897"
            achievement.displayEmoji = "⏳"
            await achievement.save().catch(err => console.error(`Failed to save achievement ${achievement.id}:`, err))
        }))
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildEmojiDelete Event' })
    }
})