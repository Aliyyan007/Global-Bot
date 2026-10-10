const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildStickerUpdate, async (oldSticker, newSticker) => {
    try {
        // Update cached sticker if backup system is available AND emoji/sticker recovery is enabled
        if (client.emojiStickerCache) {
            const safeModerationSchema = require("../schemas/safeModerationSchema")
            const config = await safeModerationSchema.findOne({ guildID: newSticker.guild.id })
            
            // Only cache if Server Recovery and Emoji/Sticker Recovery are both enabled
            if (config?.serverRecovery?.enabled && config?.serverRecovery?.emojiStickerRecovery) {
                await client.emojiStickerCache.cacheSticker(newSticker, newSticker.guild.id)
            }
        }
        
        // Existing logic can be added here if needed
        
    } catch (error) {
        handleError(error, { 
            ownerId: client.config.discord.ownerId, 
            context: 'GuildStickerUpdate Event' 
        })
    }
})