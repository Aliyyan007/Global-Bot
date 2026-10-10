const { ShardingManager } = require('discord.js')
require('dotenv').config()

// Validate required environment variables
const requiredEnvVars = ['discordToken', 'mongoDB_SRV'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
}

const config = require('./config/botconfig')
const { setupGlobalHandlers } = require('./handler/errorHandler')

const manager = new ShardingManager('./index.js', {
    token: process.env.discordToken,
    mode: "worker"
})

const shardsReady = []
// Resolves displayEmoji/displayCurrencyEmoji on a shard once its cache is ready.
// Idempotent — safe to run per-shard (covers shard respawns) and once globally.
const resolveEmojisEval = async (c) => {
    const timerId = setInterval(async () => {
        if (c.cache.ready) {
            clearInterval(timerId)
            
            await Promise.all([
                ...Array.from(c.cache.items.values()).map(async item => {
                    item.displayEmoji = await c.functions.getEmoji(c, item.emoji)
                }),
                ...Array.from(c.cache.achievements.values()).map(async achievement => {
                    achievement.displayEmoji = await c.functions.getEmoji(c, achievement.emoji)
                }),
                ...Array.from(c.cache.settings.values()).map(async settings => {
                    settings.displayCurrencyEmoji = await c.functions.getEmoji(c, settings.emojis.currency)
                }),
                ...Array.from(c.cache.quests.values()).map(async quest => {
                    quest.displayEmoji = await c.functions.getEmoji(c, quest.emoji)
                }),
                ...Array.from(c.cache.customRoles.values()).map(async customRole => {
                    if (customRole.icon) customRole.displayIcon = await c.functions.getEmoji(c, customRole.icon)
                })
            ]).catch(err => console.error('Error loading emojis:', err))
        }
    }, 1000)
}
manager.on('shardCreate', shard => {
    shard.on("ready", async () => {
        console.log(`Shard #${shard.id} started`)
        if (!shardsReady.includes(shard.id)) shardsReady.push(shard.id)
        // Resolve emojis on the shard that just came up (covers respawns)
        manager.broadcastEval(resolveEmojisEval, { shard: shard.id })
        if (shardsReady.length === manager.totalShards) {
            manager.broadcastEval(async (c) => {
                const timerId = setInterval(async () => {
                    if (c.cache.ready) {
                        clearInterval(timerId)
                        
                        // Use Promise.all instead of forEach to properly await async operations
                        await Promise.all([
                            ...Array.from(c.cache.items.values()).map(async item => {
                                item.displayEmoji = await c.functions.getEmoji(c, item.emoji)
                            }),
                            ...Array.from(c.cache.achievements.values()).map(async achievement => {
                                achievement.displayEmoji = await c.functions.getEmoji(c, achievement.emoji)
                            }),
                            ...Array.from(c.cache.settings.values()).map(async settings => {
                                settings.displayCurrencyEmoji = await c.functions.getEmoji(c, settings.emojis.currency)
                            }),
                            ...Array.from(c.cache.quests.values()).map(async quest => {
                                quest.displayEmoji = await c.functions.getEmoji(c, quest.emoji)
                            }),
                            ...Array.from(c.cache.customRoles.values()).map(async customRole => {
                                if (customRole.icon) customRole.displayIcon = await c.functions.getEmoji(c, customRole.icon)
                            })
                        ]).catch(err => console.error('Error loading emojis:', err))
                    }
                }, 1000)
            })
        }
    })
})

manager.spawn({ timeout: -1 }).then(shards => {
    require("./shard-modules/cron.js")(manager)
})

// Keep-alive HTTP server — platforms that run this as a "web service"
// (e.g. Render free tier) require an open port or the deploy is marked
// failed and restarted in a loop. Render injects PORT automatically;
// when unset (local runs, background-worker services) this is skipped.
if (process.env.PORT) {
    require('http').createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
            status: 'ok',
            uptime: Math.floor(process.uptime()),
            shards: manager.shards.size,
            readyShards: shardsReady.length
        }))
    }).listen(process.env.PORT, () => {
        console.log(`[KeepAlive] HTTP health endpoint listening on :${process.env.PORT}`)
    })
}

// Setup centralized error handling for shard manager
setupGlobalHandlers({ ownerId: config.discord.ownerId })
