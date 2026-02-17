const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
    try {
        if (oldPresence) {
            if (oldPresence.user.bot) return
            if (newPresence.status === "offline") {
                const profile = await client.profileSchema.findOne({ userID: oldPresence.user.id }).lean()
                if (!profile) return
                if (oldPresence.guild.id !== profile.guildID) return
                await client.globalProfileSchema.updateOne({ userID: oldPresence.user.id }, { $set: { lastOnline: Math.floor(Date.now()/1000), device: Object.keys(oldPresence.clientStatus)[0] } }, { upsert: true })
            }
        }
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'PresenceUpdate Event' })
    }
})