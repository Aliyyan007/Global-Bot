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
manager.on('shardCreate', shard => {
    shard.on("ready", async () => {
        console.log(`Shard #${shard.id} started`)
        shardsReady.push(shard.id)
        if (shardsReady.length === manager.totalShards) {
            manager.broadcastEval(async (c) => {
                const timerId = setInterval(() => {
                    if (c.cache.ready) {
                        clearInterval(timerId)
                        c.cache.items.forEach(async item => {
                            item.displayEmoji = await c.functions.getEmoji(c, item.emoji)
                        })
                        c.cache.achievements.forEach(async achievement => {
                            achievement.displayEmoji = await c.functions.getEmoji(c, achievement.emoji)
                        })
                        c.cache.settings.forEach(async settings => {
                            settings.displayCurrencyEmoji = await c.functions.getEmoji(c, settings.emojis.currency)
                        })
                        c.cache.quests.forEach(async quest => {
                            quest.displayEmoji = await c.functions.getEmoji(c, quest.emoji)
                        })
                        c.cache.customRoles.forEach(async customRole => {
                            if (customRole.icon) customRole.displayIcon = await c.functions.getEmoji(c, customRole.icon)
                        }) 
                    }
                }, 1000)
            })
        }
    })
})

manager.spawn({ timeout: -1 }).then(shards => {
    require("./shard-modules/cron.js")(manager)
})

// Setup centralized error handling for shard manager
setupGlobalHandlers({ ownerId: config.discord.ownerId })