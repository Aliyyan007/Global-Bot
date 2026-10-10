const { glob } = require("glob")
const { Client } = require("discord.js")
const { loadLanguages } = require(`./language`)
const { loadBlackList } = require(`./blacklist`)
const { loadCooldowns } = require(`./cooldowns`)
const { loadCache } = require(`./cacheLoader`)
const { initTimedRoles } = require(`../modules/timedRoles`)
const GuildCommandManager = require('./guildCommandManager')
require('dotenv').config()
const databaseManager = require('./databaseManager')
const { ApplicationCommandType, Events, Collection } = require("discord.js")
/**
 * @param {Client} client
 */
module.exports = async (client) => {
    client.on(Events.ClientReady, async () => {
        try {
            await initializeShard(client)
        } catch (error) {
            // A failed init leaves the shard permanently broken (no DB, no caches).
            // Exit so the process supervisor / sharding manager can restart it cleanly.
            console.error('[Bot] ❌ Shard initialization failed:', error)
            process.exit(1)
        }
    })
}

async function initializeShard(client) {
        // Connect to primary database (returns false instead of throwing on failure)
        const primaryConnected = await databaseManager.connectPrimary()
        if (!primaryConnected) throw new Error('Primary database connection failed')
        
        // Connect to secondary database (logs, analytics) — optional
        await databaseManager.connectSecondary()
        client.db = databaseManager
        
        // Initialize Redis cache (auto-detect cluster or single instance)
        const useRedisCluster = process.env.REDIS_URL_1 || process.env.REDIS_URL_2 || process.env.REDIS_URL_3
        const redisCache = useRedisCluster ? require('./redisCluster') : require('./redisCache')
        const CachedDB = useRedisCluster ? require('./cachedDBCluster') : require('./cachedDB')
        
        const redisConnected = await redisCache.connect()
        if (redisConnected) {
            client.cachedDB = new CachedDB(client)
            client.redisCache = redisCache
            
            if (useRedisCluster) {
                console.log('[Redis] Using cluster mode with 3 instances')
                const status = redisCache.getStatus()
                console.log('[Redis] Cluster status:')
                console.log('  Redis 1:', status.redis1.connected ? '✅ Connected' : '❌ Disconnected', `(${status.redis1.type})`)
                console.log('  Redis 2:', status.redis2.connected ? '✅ Connected' : '❌ Disconnected', `(${status.redis2.type})`)
                console.log('  Redis 3:', status.redis3.connected ? '✅ Connected' : '❌ Disconnected', `(${status.redis3.type})`)
            } else {
                console.log('[Redis] Using single instance mode')
            }
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
        for (const value of interactions) {
            const file = require(value)
            if (!file?.name) continue
            client.interactions.set(file.name, file)
            arrayOfButtons.push(file)
        }
        console.timeEnd("Successfully loaded interactions")

        // Slash Commands
        console.time(`Successfully loaded commands`)
        const slashCommands = glob.sync(`slash-commands/*.js`, {
            absolute: true
        })
        const arrayOfSlashCommands = []
        const guildOnlyCommands = []
        for (const value of slashCommands) {
            const file = require(value)
            if (!file?.name) continue
            // Ensure every command has a cooldowns Collection so the
            // cooldown system can track per-user cooldowns uniformly
            if (!file.cooldowns || typeof file.cooldowns.get !== 'function') {
                file.cooldowns = new Collection()
            }
            client.slashCommands.set(file.name, file)
            if ([ApplicationCommandType.Message, ApplicationCommandType.User].includes(file.type)) {
                delete file.description
                delete file.options
            }
            let newMap = Object.assign({}, file)
            delete newMap.group
            delete newMap.permissions
            delete newMap.cooldowns
            delete newMap.run
            // Separate guild-only commands from global commands
            // Skip owner-only commands
            if (file.owner) {
                // Owner-only commands are not registered
                continue
            } else if (file.guildOnly) {
                // Guild-only commands go to separate array
                delete newMap.owner
                delete newMap.guildOnly
                delete newMap.devGuildId
                guildOnlyCommands.push(newMap)
            } else {
                delete newMap.owner
                delete newMap.guildOnly
                delete newMap.devGuildId
                arrayOfSlashCommands.push(newMap)
            }
        }
        console.log(`Successfully loaded commands.`)
        
        // Events - Load first before command registration
        console.time("Successfully loaded events")
        const eventFiles = glob.sync(`events/**/*.js`, {
            absolute: true
        })
        for (const value of eventFiles) {
            require(value)
        }
        console.timeEnd("Successfully loaded events")
        //modules
        console.time("Successfully loaded modules")
        const modulesFiles = glob.sync(`modules/*.js`, {
            absolute: true
        })
        for (const value of modulesFiles) {
            await require(value)(client)
        }
        console.timeEnd("Successfully loaded modules")
        // Re-arm in-memory timers/cron jobs for entities that need them
        require('./cacheLoader').armEntityTimers(client)
        // Initialize timed roles
        await initTimedRoles(client)
        
        // Initialize temporary role system
        const { initTempRoleSystem } = require('../modules/tempRoleManager')
        await initTempRoleSystem(client)
        
        // Preload Safe-Moderation configs for all guilds (warms the config cache)
        await client.safeModerationConfigCache.preload(client.guilds.cache)
        
        // Initialize Safe-Moderation restrictions (load from database and reschedule restorations)
        const { initSafeModerationRestrictions, cleanupEmptyRestrictionRoles } = require('./safeModerationInitializer')
        await initSafeModerationRestrictions(client)
        console.log('[Safe-Moderation] ✅ Active restrictions loaded and scheduled')
        
        // Schedule periodic cleanup of empty restriction roles (every 6 hours)
        setInterval(async () => {
            console.log('[SafeModeration] 🕐 Running periodic cleanup of empty restriction roles...')
            await cleanupEmptyRestrictionRoles(client)
        }, 6 * 60 * 60 * 1000) // 6 hours
        console.log('[Safe-Moderation] ✅ Periodic cleanup scheduled (every 6 hours)')
        
        // Initialize Guild Command Manager
        const guildCommandManager = new GuildCommandManager(client)
        client.guildCommandManager = guildCommandManager
        
        // Register commands AFTER bot is fully initialized
        console.log('\n[Bot] 🚀 Bot fully initialized. Starting command registration...\n')
        
        try {
            // Register global commands
            await client.application.commands.set(arrayOfSlashCommands)
            console.log(`Successfully registered ${arrayOfSlashCommands.length} global slash commands with Discord.`)
            
            // Register guild-specific commands to all guilds
            if (guildOnlyCommands.length > 0) {
                console.log(`Found ${guildOnlyCommands.length} guild-only commands. Starting intelligent registration...`)
                await guildCommandManager.registerAllGuilds(guildOnlyCommands)
            }
        } catch (error) {
            console.error('Failed to register slash commands:', error)
        }
        
        console.log('\n[Bot] ✅ Command registration complete. Bot is ready!\n')
}
