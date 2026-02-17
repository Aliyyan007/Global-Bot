const { glob } = require("glob")
const { Client } = require("discord.js")
const { loadLanguages } = require(`./language`)
const { loadBlackList } = require(`./blacklist`)
const { loadCooldowns } = require(`./cooldowns`)
const { loadCache } = require(`./cacheLoader`)
const { initTimedRoles } = require(`../modules/timedRoles`)
require('dotenv').config()
const databaseManager = require('./databaseManager')
const redisCache = require('./redisCache')
const CachedDB = require('./cachedDB')
const { ApplicationCommandType, Events } = require("discord.js")
/**
 * @param {Client} client
 */
module.exports = async (client) => {
    client.on(Events.ClientReady, async () => {
        // Connect to primary database
        await databaseManager.connectPrimary()
        
        // Connect to secondary database (logs, analytics)
        await databaseManager.connectSecondary()
        client.db = databaseManager
        
        // Initialize Redis cache
        const redisConnected = await redisCache.connect()
        if (redisConnected) {
            client.cachedDB = new CachedDB(client)
            client.redisCache = redisCache
        } else {
            console.log('[Redis] Running without cache - MongoDB only mode')
        }
        
        await loadCache(client)
        await loadLanguages(client)
        await loadBlackList(client)
        await loadCooldowns(client)
        // Buttons
        console.time("Successfully loaded interactions")
        const interactions = glob.sync(`interactions/*.js`, {
            absolute: true
        })
        const arrayOfButtons = []
        await interactions.map((value) => {
            const file = require(value)
            if (!file?.name) return
            client.interactions.set(file.name, file)
            arrayOfButtons.push(file)
        })
        console.timeEnd("Successfully loaded interactions")

        // Slash Commands
        console.time(`Successfully loaded commands`)
        const slashCommands = glob.sync(`slash-commands/*.js`, {
            absolute: true
        })
        const arrayOfSlashCommands = []
        const guildOnlyCommands = []
        await slashCommands.map(async (value) => {
            const file = require(value)
            if (!file?.name) return
            client.slashCommands.set(file.name, file)
            if ([ApplicationCommandType.Message, ApplicationCommandType.User].includes(file.type)) {
                delete file.description
                delete file.options
            }
            let newMap = Object.assign({}, file)
            delete newMap.group
            delete newMap.permissions
            delete newMap.owner
            delete newMap.cooldowns
            delete newMap.guildOnly
            delete newMap.devGuildId
            // Separate guild-only commands from global commands
            if (file.guildOnly && file.devGuildId) {
                guildOnlyCommands.push({ command: newMap, guildId: file.devGuildId })
            } else {
                arrayOfSlashCommands.push(newMap)
            }
        })
        console.log(`Successfully loaded commands.`)
        try {
            await client.application.commands.set(arrayOfSlashCommands)
            console.log(`Successfully registered ${arrayOfSlashCommands.length} global slash commands with Discord.`)
            // Register guild-only commands
            for (const { command, guildId } of guildOnlyCommands) {
                try {
                    const guild = client.guilds.cache.get(guildId)
                    if (guild) {
                        await guild.commands.create(command)
                        console.log(`Registered guild command /${command.name} in ${guild.name}`)
                    }
                } catch (guildError) {
                    console.error(`Failed to register guild command /${command.name}:`, guildError.message)
                }
            }
        } catch (error) {
            console.error('Failed to register slash commands:', error)
        }
        // Events
        console.time("Successfully loaded events")
        const eventFiles = glob.sync(`events/**/*.js`, {
            absolute: true
        })
        await eventFiles.map((value) => {
            require(value)
        })
        console.timeEnd("Successfully loaded events")
        //modules
        console.time("Successfully loaded modules")
        const modulesFiles = glob.sync(`modules/*.js`, {
            absolute: true
        })
        await modulesFiles.map((value) => {
            require(value)(client)
        })
        console.timeEnd("Successfully loaded modules")
        client.cache.giveaways.filter(e => e.endsTime && e.status === "started").forEach(giveaway => giveaway.setTimeoutEnd())
        client.cache.giveaways.filter(e => e.deleteTemp && e.status !== "started").forEach(giveaway => giveaway.setTimeoutDelete())
        await Promise.all(client.cache.wormholes.filter(e => e.isEnabled).map(async wormhole => {
            wormhole.cronJobStart()
                }))
        await Promise.all(client.cache.promocodeAutogenerators.filter(e => e.isEnabled).map(async autogenerator => {
            autogenerator.cronJobStart()
                }))
        await Promise.all(client.cache.promocodes.filter(e => e.resetCronPattern).map(async promocode => {
            promocode.cronJobStart()
                }))
        client.cache.promocodes.filter(e => e.deleteDate).forEach(promocode => promocode.setTimeoutDelete())
        // Initialize timed roles
        await initTimedRoles(client)
    })
}
