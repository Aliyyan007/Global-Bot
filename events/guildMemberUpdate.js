const client = require("../index")
const { Events } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
        // Safe Moderation Validator - Monitor bot role changes
        if (client.safeModerationValidator) {
            const monitor = require('./safeModerationMonitor');
            await monitor.handleGuildMemberUpdate(client, oldMember, newMember);
        }

        if (newMember.roles.cache.size > oldMember.roles.cache.size) {
            const roles = newMember.roles.cache.difference(oldMember.roles.cache)
            await Promise.all(roles.map(async role => {
                try {
                    if (client.cache.roles.find(e => e.id === role.id && e.isEnabled && e.type === "static")) {
                        const profile = client.cache.profiles.get(newMember.guild.id+newMember.user.id)
                        if (profile) {
                            profile.getIncome()
                            await profile.save().catch(err => 
                                console.error('Error saving profile after income update:', err))
                        }
                    }
                } catch (err) {
                    console.error('Error processing role:', err)
                }
            })).catch(err => console.error('Error processing roles:', err))
        }
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildMemberUpdate Event' })
    }
})
