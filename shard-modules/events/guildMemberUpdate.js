const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
        if (newMember.roles.cache.size > oldMember.roles.cache.size) {
        const roles = newMember.roles.cache.difference(oldMember.roles.cache)
        roles.forEach(async role => {
            if (client.cache.roles.find(e => e.id === role.id && e.isEnabled && e.type === "static")) {
                const profile = client.cache.profiles.get(newMember.guild.id+newMember.user.id)
                if (profile) profile.getIncome()
                return 
            }
        })
    }
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildMemberUpdate Event' })
    }
})