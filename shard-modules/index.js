require('dotenv').config()

// Validate required environment variables
const requiredEnvVars = ['discordToken', 'mongoDB_SRV'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
}

const { Client, Collection, Partials, GatewayIntentBits, EmbedBuilder, Options, Events } = require("discord.js")
const client = new Client({
    intents: [
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Reaction, Partials.Message],
    sweepers: { 
        ...Options.DefaultSweeperSettings,
        messages: { interval: 3600, lifetime: 86400 }, 
    },
    makeCache: Options.cacheWithLimits({ ...Options.DefaultMakeCacheSettings, MessageManager: 100 })
})
client.functions = require("./handler/functions.js")
client.temp = []
client.dropDownTemp = new Collection()
client.wipe = {}
client.giftsInWork = {}
client.globalCooldown = {}
client.voiceActiveCooldown = {}
client.levelFactorCooldowns = {}
client.tempAchievements = {}
client.config = require('./config/botconfig')
client.slashCommands = new Collection()
client.interactions = new Collection()
client.itemSchema = require("./schemas/itemSchema.js")
client.permissionSchema = require("./schemas/permissionSchema.js")
client.giftSchema = require("./schemas/giftSchema.js")
client.styleSchema = require("./schemas/wormholeStyleSchema.js")
client.roleSchema = require("./schemas/roleSchema.js")
client.profileSchema = require("./schemas/profileSchema.js")
client.globalProfileSchema = require("./schemas/globalProfileSchema.js")
client.questSchema = require("./schemas/questSchema.js")
client.achievementSchema = require("./schemas/achievementSchema.js")
client.settingsSchema = require("./schemas/settingsSchema.js")
client.giveawaySchema = require("./schemas/giveawaySchema.js")
client.marketSchema = require("./schemas/marketSchema.js")
client.wormholeSchema = require("./schemas/wormholeSchema.js")
client.commandsUsesSchema = require("./schemas/commandsUsesSchema.js")
client.shopCategorySchema = require("./schemas/shopCategorySchema.js")
client.dropdownRoleSchema = require("./schemas/dropdownRoleSchema.js")
client.timedRoleSchema = require("./schemas/timedRoleSchema.js")
client.blackListSchema = require("./schemas/blacklistSchema.js")
client.jobSchema = require("./schemas/jobSchema.js")
client.rolePropertiesSchema = require("./schemas/rolePropertiesSchema.js")
client.customRoleSchema = require("./schemas/customRoleSchema.js")
client.channelMultipliersSchema = require("./schemas/channelMultipliersSchema.js")
client.promocodeSchema = require("./schemas/promocodeSchema.js")
client.promocodeAutogeneratorSchema = require("./schemas/promocodeAutogeneratorSchema.js")
client.stickyCommandSchema = require("./schemas/stickyCommandSchema.js")
client.safeServerSchema = require("./schemas/safeServerSchema.js")
client.language = require(`./handler/language`)
client.cooldowns = require(`./handler/cooldowns`)
client.blacklist = require(`./handler/blacklist`)
client.marketFilters = new Collection()
client.fetchedMembers = new Set()
const { cache } = require(`./handler/cacheLoader`)
client.cache = cache

// Initialize Safe-Server components
const SafeServerTracker = require('./handler/safeServerTracker')
const SafeServerManager = require('./handler/safeServerManager')
client.safeServerTracker = new SafeServerTracker(client)
client.safeServerManager = new SafeServerManager(client)

module.exports = client
client.on(Events.Warn, console.log)
require("./handler")(client)

// Setup centralized error handling
const { setupGlobalHandlers } = require('./handler/errorHandler')
setupGlobalHandlers({ ownerId: client.config.discord.ownerId, client })

client.rest.on("rateLimited", error => {
    console.error(`Rate-limit ${new Date()}:`, error)
})

// Auto Voice Integration - Initialize and setup graceful shutdown
const autoVoice = require('./modules/auto-voice')
const redisCache = require('./handler/redisCache')
const stickyManagerSession = require('./handler/stickyManagerSession')
autoVoice.initialize(client)

// Graceful shutdown for Auto Voice, Redis, Databases, Sticky Sessions, and Safe-Server
process.on('SIGINT', async () => {
    console.log('[Shutdown] Shutting down...')
    autoVoice.shutdown()
    stickyManagerSession.stopCleanupInterval()
    if (client.safeServerTracker) client.safeServerTracker.shutdown()
    await redisCache.disconnect()
    const databaseManager = require('./handler/databaseManager')
    await databaseManager.disconnect()
    process.exit(0)
})
process.on('SIGTERM', async () => {
    console.log('[Shutdown] Shutting down...')
    autoVoice.shutdown()
    stickyManagerSession.stopCleanupInterval()
    if (client.safeServerTracker) client.safeServerTracker.shutdown()
    await redisCache.disconnect()
    const databaseManager = require('./handler/databaseManager')
    await databaseManager.disconnect()
    process.exit(0)
})

client.login(process.env.discordToken)