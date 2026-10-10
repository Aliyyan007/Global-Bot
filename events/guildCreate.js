const client = require("../index")
const { setLanguage } = require(`../handler/language`)
const { Events } = require("discord.js")
const { loadEntitiesIntoCache, armEntityTimers } = require("../handler/cacheLoader")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildCreate, async (guild) => {
    try {
        if (client.blacklist(guild.id, "full_ban", "guilds")) return
        
        // ============================================================
        // BACKUP CLEANUP CANCELLATION
        // Cancel scheduled cleanup if bot rejoins the guild
        // ============================================================
        if (client.backupCleanupScheduler) {
            client.backupCleanupScheduler.cancelCleanup(guild.id, guild.name)
        }
        
        let settings = await client.functions.fetchSettings(client, guild.id)
    if (settings.deleteFromDB) {
        settings.deleteFromDB = undefined
        await settings.save()
        // Reload all of the guild's entities into cache and re-arm their timers
        await loadEntitiesIntoCache(client, { guildID: guild.id })
        armEntityTimers(client, guild.id)
    }
    setLanguage(guild, settings ? settings.language : 'en-US')
    
    // Register guild-specific commands for new guild
    if (client.guildCommandManager) {
        const guildCommands = []
        client.slashCommands.forEach(cmd => {
            if (cmd.guildOnly && !cmd.owner) {
                const commandData = Object.assign({}, cmd)
                delete commandData.group
                delete commandData.permissions
                delete commandData.cooldowns
                delete commandData.run
                delete commandData.owner
                delete commandData.guildOnly
                delete commandData.devGuildId
                guildCommands.push(commandData)
            }
        })
        
        if (guildCommands.length > 0) {
            // Register commands asynchronously (don't block event)
            client.guildCommandManager.onGuildCreate(guild, guildCommands).catch(error => {
                console.error(`[GuildCreate] Failed to register commands for ${guild.name}:`, error)
            })
        }
    }
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildCreate Event' })
    }
})
