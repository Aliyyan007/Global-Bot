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
client.safeModerationSchema = require("./schemas/safeModerationSchema.js")
client.tempRoleConfigSchema = require("./schemas/tempRoleConfigSchema.js")
client.tempRoleAssignmentSchema = require("./schemas/tempRoleAssignmentSchema.js")
client.auctionSchema = require("./schemas/auctionSchema.js")
client.emojiSelectorSchema = require("./schemas/emojiSelectorSchema.js")
client.language = require(`./handler/language`)
client.cooldowns = require(`./handler/cooldowns`)
client.blacklist = require(`./handler/blacklist`)
client.marketFilters = new Collection()
client.fetchedMembers = new Set()
const { cache } = require(`./handler/cacheLoader`)
client.cache = cache

// Initialize Safe-Moderation components
const SafeModerationTracker = require('./handler/safeModerationTracker')
const SafeModerationManager = require('./handler/safeModerationManager')
const SafeModerationConfigCache = require('./handler/safeModerationConfigCache')
const AuditLogCache = require('./handler/auditLogCache')
const FastRestrictionApplier = require('./handler/fastRestrictionApplier')
const BotProtectionHandler = require('./handler/botProtectionHandler')
const AutoProtectionHandler = require('./handler/autoProtectionHandler')
const UnifiedProtectionSystem = require('./handler/unifiedProtectionSystem')
const SafeModerationValidator = require('./handler/safeModerationValidator')
const ServerRecoveryHandler = require('./handler/serverRecoveryHandler')
const SentinelHubHandler = require('./handler/sentinelHubHandler')
const BotShieldHandler = require('./handler/botShieldHandler')

// Initialize Spam Prevention System
const SpamDetectionEngine = require('./handler/spamDetectionEngine')
const SpamPunishmentHandler = require('./handler/spamPunishmentHandler')

// Initialize Emoji/Sticker Backup System
const EmojiStickerCacheHandler = require('./handler/emojiStickerCacheHandler')
const EmojiStickerProtectionHandler = require('./handler/emojiStickerProtectionHandler')
const BackupCleanupScheduler = require('./handler/backupCleanupScheduler')

client.safeModerationTracker = new SafeModerationTracker(client)
client.safeModerationManager = new SafeModerationManager(client)
client.safeModerationConfigCache = new SafeModerationConfigCache(client)
client.auditLogCache = new AuditLogCache(client)
client.fastRestrictionApplier = new FastRestrictionApplier(client)
client.botProtectionHandler = new BotProtectionHandler(client)
client.autoProtectionHandler = new AutoProtectionHandler(client)
client.unifiedProtection = new UnifiedProtectionSystem(client)
client.safeModerationValidator = new SafeModerationValidator(client)
client.serverRecoveryHandler = new ServerRecoveryHandler(client)
client.sentinelHubHandler = new SentinelHubHandler(client)
client.botShieldHandler = new BotShieldHandler(client)

// Initialize spam prevention handlers
client.spamDetectionEngine = new SpamDetectionEngine(client)
client.spamPunishmentHandler = new SpamPunishmentHandler(client)

// Initialize emoji/sticker backup handlers
client.emojiStickerCache = new EmojiStickerCacheHandler(client)
client.emojiStickerProtection = new EmojiStickerProtectionHandler(client, client.autoProtectionHandler)
client.backupCleanupScheduler = new BackupCleanupScheduler(client)

// Link fast restrictor to manager
client.fastRestrictionApplier.safeModerationManager = client.safeModerationManager

console.log('[Safe-Moderation] ⚡ Optimized components initialized (with unified protection)')
console.log('[Safe-Moderation Validator] ⚡ Validator initialized')
console.log('[Spam Prevention] ⚡ Spam Detection and Punishment handlers initialized')
console.log('[Emoji/Sticker Backup] ⚡ Backup system initialized')
console.log('[Backup Cleanup] ⚡ Cleanup scheduler initialized')

// Initialize server state cache for all guilds with Safe Moderation enabled
client.once(Events.ClientReady, async () => {
    // Initialize Unified Protection System for all enabled guilds
    try {
        const safeModerationSchema = require('./schemas/safeModerationSchema')
        const configs = await safeModerationSchema.find({ enabled: true })
        
        let protected = 0
        for (const config of configs) {
            const guild = client.guilds.cache.get(config.guildID)
            if (guild) {
                const success = await client.unifiedProtection.protect(guild, config)
                if (success) protected++
            }
        }
        
        console.log(`[Unified Protection] ✅ Protected ${protected}/${configs.length} guilds with auto-backup`)
    } catch (error) {
        console.error('[Unified Protection] ❌ Initialization failed:', error)
    }
    
    // Initialize Safe-Moderation Validator monitoring
    try {
        await client.safeModerationValidator.initializeMonitoring()
    } catch (error) {
        console.error('[Safe-Moderation Validator] ❌ Monitoring initialization failed:', error)
    }
    
    // Initialize Server Recovery cleanup interval
    try {
        client.serverRecoveryHandler.startCleanupInterval()
        console.log('[Server Recovery] ✅ Cleanup interval initialized')
    } catch (error) {
        console.error('[Server Recovery] ❌ Cleanup interval initialization failed:', error)
    }
    
    // Initialize emoji/sticker backup cache
    try {
        const cacheInitialized = await client.emojiStickerCache.initializeCache()
        if (cacheInitialized) {
            console.log('[Emoji/Sticker Backup] ✅ Cache initialization completed')
        } else {
            console.log('[Emoji/Sticker Backup] ⚠️ Cache initialization skipped (not configured)')
        }
    } catch (error) {
        console.error('[Emoji/Sticker Backup] ❌ Cache initialization failed:', error)
    }
})

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
const stickyManagerSession = require('./handler/stickyManagerSession')
autoVoice.initialize(client)

// Determine which Redis system to use (cluster or single)
const useRedisCluster = process.env.REDIS_URL_1 || process.env.REDIS_URL_2 || process.env.REDIS_URL_3
const redisCache = useRedisCluster ? require('./handler/redisCluster') : require('./handler/redisCache')

// Graceful shutdown for Auto Voice, Redis, Databases, Sticky Sessions, Safe-Moderation, and Emoji/Sticker Backup
const gracefulShutdown = async (signal) => {
    console.log(`[Shutdown] ${signal} received, shutting down...`)
    await autoVoice.shutdown().catch(() => {})
    stickyManagerSession.stopCleanupInterval()
    if (client.safeModerationTracker) client.safeModerationTracker.shutdown()
    if (client.safeModerationConfigCache) client.safeModerationConfigCache.destroy()
    if (client.auditLogCache) client.auditLogCache.destroy()
    if (client.autoProtectionHandler) client.autoProtectionHandler.destroy()
    if (client.unifiedProtection) client.unifiedProtection.destroy()
    if (client.safeModerationValidator) {
        // Stop all monitoring intervals
        for (const [guildId] of client.safeModerationValidator.monitoringIntervals) {
            client.safeModerationValidator.stopMonitoring(guildId)
        }
    }
    if (client.backupCleanupScheduler) client.backupCleanupScheduler.destroy()
    await redisCache.disconnect()
    const databaseManager = require('./handler/databaseManager')
    await databaseManager.disconnect()
    // Disconnect backup database
    const backupDatabaseManager = require('./handler/backupDatabaseManager')
    await backupDatabaseManager.disconnect()
    process.exit(0)
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

client.login(process.env.discordToken)
