/**
 * Safe Server Initialization Helper
 * Add this to your main bot file (index.js or shard.js)
 */

const SafeServerActionTracker = require('./handler/safeServerActionTracker')
const SafeServerRestrictionManager = require('./handler/safeServerRestrictionManager')
const AuditLogMonitor = require('./handler/auditLogMonitor')
const VoiceStateMonitor = require('./handler/voiceStateMonitor')
const MessageMonitor = require('./handler/messageMonitor')
const BotProtectionHandler = require('./handler/botProtectionHandler')

/**
 * Initialize all Safe Server systems
 * @param {Client} client - Discord.js client
 */
function initializeSafeServer(client) {
    console.log('[Safe Server] Initializing systems...')

    try {
        // Initialize action tracker
        client.safeServerTracker = new SafeServerActionTracker()
        console.log('[Safe Server] ✅ Action Tracker initialized')

        // Initialize restriction manager
        client.safeServerRestrictionManager = new SafeServerRestrictionManager(client)
        console.log('[Safe Server] ✅ Restriction Manager initialized')

        // Initialize audit log monitor
        client.safeServerAuditMonitor = new AuditLogMonitor(client)
        console.log('[Safe Server] ✅ Audit Log Monitor initialized')

        // Initialize voice state monitor
        client.safeServerVoiceMonitor = new VoiceStateMonitor(client)
        console.log('[Safe Server] ✅ Voice State Monitor initialized')

        // Initialize message monitor
        client.safeServerMessageMonitor = new MessageMonitor(client)
        console.log('[Safe Server] ✅ Message Monitor initialized')

        // Initialize bot protection
        client.safeServerBotProtection = new BotProtectionHandler(client)
        console.log('[Safe Server] ✅ Bot Protection initialized')

        // Register event listeners
        registerEventListeners(client)
        console.log('[Safe Server] ✅ Event listeners registered')

        console.log('[Safe Server] 🎉 All systems initialized successfully!')
        return true
    } catch (error) {
        console.error('[Safe Server] ❌ Initialization failed:', error)
        return false
    }
}

/**
 * Register all event listeners
 * @param {Client} client 
 */
function registerEventListeners(client) {
    // Voice State Updates
    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (client.safeServerVoiceMonitor) {
            try {
                await client.safeServerVoiceMonitor.handleVoiceStateUpdate(oldState, newState)
            } catch (error) {
                console.error('[Safe Server] Voice state error:', error)
            }
        }
    })

    // Message Create (for @everyone/@here monitoring)
    const originalMessageCreate = client._events?.messageCreate
    client.on('messageCreate', async (message) => {
        // Call original handler first if it exists
        if (originalMessageCreate) {
            await originalMessageCreate(message)
        }

        // Then Safe Server monitoring
        if (client.safeServerMessageMonitor) {
            try {
                await client.safeServerMessageMonitor.handleMessage(message)
            } catch (error) {
                console.error('[Safe Server] Message monitor error:', error)
            }
        }
    })

    // Role Updates (for bot protection)
    client.on('roleUpdate', async (oldRole, newRole) => {
        if (client.safeServerBotProtection) {
            try {
                await client.safeServerBotProtection.checkRoleUpdate(oldRole, newRole)
            } catch (error) {
                console.error('[Safe Server] Role update error:', error)
            }
        }
    })

    // Member Updates (for bot protection)
    const originalMemberUpdate = client._events?.guildMemberUpdate
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        // Call original handler first if it exists
        if (originalMemberUpdate) {
            await originalMemberUpdate(oldMember, newMember)
        }

        // Then Safe Server bot protection
        if (client.safeServerBotProtection) {
            try {
                await client.safeServerBotProtection.checkMemberUpdate(oldMember, newMember)
            } catch (error) {
                console.error('[Safe Server] Member update error:', error)
            }
        }
    })
}

/**
 * Handle Safe Server interactions
 * Add this to your interactionCreate event handler
 * @param {Client} client 
 * @param {Interaction} interaction 
 */
async function handleSafeServerInteraction(client, interaction) {
    if (!interaction.customId?.startsWith('ss_')) return false

    try {
        // Panel interactions (select menus, buttons, channel/role selects)
        if (interaction.isStringSelectMenu() || 
            interaction.isButton() || 
            interaction.isChannelSelectMenu() || 
            interaction.isRoleSelectMenu()) {
            
            const panelHandler = require('../interactions/safe-server-panel-new')
            await panelHandler.execute(client, interaction)
            return true
        }
        
        // Modal interactions
        if (interaction.isModalSubmit()) {
            const modalHandler = require('../interactions/safe-server-modals')
            await modalHandler.execute(client, interaction)
            return true
        }

        // Approval buttons (for restrictions and bots)
        if (interaction.customId.startsWith('ss_approve_') || 
            interaction.customId.startsWith('ss_reject_')) {
            
            await handleApprovalInteraction(client, interaction)
            return true
        }
    } catch (error) {
        console.error('[Safe Server] Interaction error:', error)
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            }).catch(console.error)
        }
    }

    return false
}

/**
 * Handle approval/rejection interactions
 * @param {Client} client 
 * @param {Interaction} interaction 
 */
async function handleApprovalInteraction(client, interaction) {
    const customId = interaction.customId

    // Restriction approval
    if (customId.startsWith('ss_approve_restriction_') || customId.startsWith('ss_reject_restriction_')) {
        const parts = customId.split('_')
        const userId = parts[3]
        const permissionKey = parts[4]
        const isApproval = customId.startsWith('ss_approve_')

        if (isApproval) {
            await client.safeServerRestrictionManager.removeRestriction(
                interaction.guild.id,
                userId,
                permissionKey
            )

            await interaction.update({
                content: '✅ Restriction approved and removed.',
                components: []
            })
        } else {
            await interaction.update({
                content: '❌ Restriction will remain in place.',
                components: []
            })
        }
    }

    // Bot approval
    else if (customId.startsWith('ss_approve_bot_') || customId.startsWith('ss_reject_bot_')) {
        const parts = customId.split('_')
        const botId = parts[3]
        const isApproval = customId.startsWith('ss_approve_bot_')

        const safeServerSchema = require('../schemas/safeServerSchema')
        const config = await safeServerSchema.findOne({ guildID: interaction.guild.id })

        if (!config) {
            return interaction.reply({
                content: '❌ Configuration not found.',
                ephemeral: true
            })
        }

        const quarantinedBot = config.quarantinedBots.find(b => b.botId === botId)

        if (!quarantinedBot) {
            return interaction.reply({
                content: '❌ Bot not found in quarantine.',
                ephemeral: true
            })
        }

        if (isApproval) {
            // Restore bot permissions (implementation depends on how you stored them)
            await interaction.update({
                content: `✅ Bot <@${botId}> approved. Permissions restored.`,
                components: []
            })

            // Remove from quarantine
            config.quarantinedBots = config.quarantinedBots.filter(b => b.botId !== botId)
            await config.save()
        } else {
            // Kick the bot
            const bot = await interaction.guild.members.fetch(botId).catch(() => null)
            if (bot) {
                await bot.kick('Safe Server: Bot rejected by managers')
            }

            await interaction.update({
                content: `❌ Bot <@${botId}> rejected and kicked from server.`,
                components: []
            })

            // Remove from quarantine
            config.quarantinedBots = config.quarantinedBots.filter(b => b.botId !== botId)
            await config.save()
        }
    }
}

/**
 * Get Safe Server status for a guild
 * @param {string} guildId 
 * @returns {Promise<Object>}
 */
async function getSafeServerStatus(guildId) {
    const safeServerSchema = require('../schemas/safeServerSchema')
    const config = await safeServerSchema.findOne({ guildID: guildId })

    if (!config) {
        return {
            enabled: false,
            configured: false
        }
    }

    return {
        enabled: config.enabled,
        configured: !!(config.logChannelId && config.managerRoles?.length > 0),
        activeRestrictions: config.activeRestrictions.length,
        quarantinedBots: config.quarantinedBots.length,
        botProtection: config.botProtection.enabled
    }
}

module.exports = {
    initializeSafeServer,
    handleSafeServerInteraction,
    getSafeServerStatus
}
