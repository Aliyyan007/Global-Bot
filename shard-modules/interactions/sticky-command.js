const { ButtonBuilder, ActionRowBuilder, ButtonStyle, UserSelectMenuBuilder, Collection } = require("discord.js")

// Regex patterns to extract data from customId (old format)
const commandRegexp = /command{(.*?)}/
const guildRegexp = /guild{(.*?)}/
const channelRegexp = /channel{(.*?)}/
const actionRegexp = /action{(.*?)}/

// Regex patterns for compact format
const compactCommandRegexp = /c{sc}/
const compactActionRegexp = /a{(.*?)}/
const compactNameRegexp = /n{(.*?)}/
const compactChannelRegexp = /ch{(.*?)}/

// Action abbreviation mappings
const ACTION_ABBREVIATIONS = {
    'view': 'v',
    'edit': 'e',
    'search': 's'
}

const ACTION_EXPANSIONS = {
    'v': 'view',
    'e': 'edit',
    's': 'search'
}

// Sticky command cooldown tracking - keyed by `${guildId}_${channelId}_${commandName}_${userId}`
const stickyCooldowns = new Collection()

/**
 * Formats remaining cooldown time to a human-readable string
 * @param {number} ms - Remaining time in milliseconds
 * @returns {string} Formatted string like "2h 30m 15s" or "45s"
 */
function formatRemainingCooldown(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    const parts = []
    
    if (days > 0) {
        parts.push(`${days}d`)
    }
    if (hours % 24 > 0) {
        parts.push(`${hours % 24}h`)
    }
    if (minutes % 60 > 0) {
        parts.push(`${minutes % 60}m`)
    }
    if (seconds % 60 > 0 || parts.length === 0) {
        parts.push(`${seconds % 60}s`)
    }
    
    return parts.join(' ')
}

/**
 * Generates a compact custom ID for sticky command buttons
 * Format: c{sc}a{<action>}n{<name>}ch{<channelId>}
 * @param {string} action - The action (v=view, e=edit, s=search)
 * @param {string} commandName - The command name (profile, rank, etc.)
 * @param {string} channelId - The channel ID
 * @returns {string} Compact custom ID
 */
function generateCompactCustomId(action, commandName, channelId) {
    // Convert full action name to abbreviation if needed
    const actionAbbrev = ACTION_ABBREVIATIONS[action] || action
    return `c{sc}a{${actionAbbrev}}n{${commandName}}ch{${channelId}}`
}

/**
 * Parses a custom ID (supports both old and new compact formats)
 * @param {string} customId - The custom ID to parse
 * @param {string} guildId - The guild ID from interaction context
 * @returns {Object|null} Parsed data { commandName, guildId, channelId, action } or null if invalid
 */
function parseCustomId(customId, guildId) {
    // Detect format by checking for compact prefix
    if (customId.startsWith('c{sc}')) {
        // Compact format parsing
        const actionMatch = compactActionRegexp.exec(customId)
        const nameMatch = compactNameRegexp.exec(customId)
        const channelMatch = compactChannelRegexp.exec(customId)
        
        if (!nameMatch || !channelMatch) {
            return null
        }
        
        const actionAbbrev = actionMatch ? actionMatch[1] : null
        const action = actionAbbrev ? (ACTION_EXPANSIONS[actionAbbrev] || actionAbbrev) : null
        
        return {
            commandName: nameMatch[1],
            guildId: guildId,
            channelId: channelMatch[1],
            action: action
        }
    } else {
        // Old format parsing
        const commandMatch = commandRegexp.exec(customId)
        const guildMatch = guildRegexp.exec(customId)
        const channelMatch = channelRegexp.exec(customId)
        const actionMatch = actionRegexp.exec(customId)
        
        if (!commandMatch || !channelMatch) {
            return null
        }
        
        return {
            commandName: commandMatch[1],
            guildId: guildMatch ? guildMatch[1] : guildId,
            channelId: channelMatch[1],
            action: actionMatch ? actionMatch[1] : null
        }
    }
}

/**
 * Parses the action from a customId string
 * @param {string} customId - The button customId
 * @returns {string|null} The action (view, edit, search) or null if not present
 */
function parseAction(customId) {
    const match = actionRegexp.exec(customId)
    return match ? match[1] : null
}

module.exports = {
    name: `sticky-command`,
    // Export helper functions for testing
    generateCompactCustomId,
    parseCustomId,
    ACTION_ABBREVIATIONS,
    ACTION_EXPANSIONS,
    stickyCooldowns,
    formatRemainingCooldown,
    /**
     * Checks if a user is on cooldown for a sticky command
     * @param {string} guildId - Guild ID
     * @param {string} channelId - Channel ID
     * @param {string} commandName - Command name
     * @param {string} userId - User ID
     * @returns {number|null} Remaining cooldown time in ms, or null if not on cooldown
     */
    checkStickyCooldown(guildId, channelId, commandName, userId) {
        const key = `${guildId}_${channelId}_${commandName}_${userId}`
        const lastUsage = stickyCooldowns.get(key)
        if (lastUsage && lastUsage > Date.now()) {
            return lastUsage - Date.now()
        }
        return null
    },
    /**
     * Sets a cooldown for a user on a sticky command
     * @param {string} guildId - Guild ID
     * @param {string} channelId - Channel ID
     * @param {string} commandName - Command name
     * @param {string} userId - User ID
     * @param {number} cooldownMs - Cooldown duration in milliseconds
     */
    setStickyCooldown(guildId, channelId, commandName, userId, cooldownMs) {
        const key = `${guildId}_${channelId}_${commandName}_${userId}`
        stickyCooldowns.set(key, Date.now() + cooldownMs)
    },
    /**
     * Clears a cooldown for a user on a sticky command
     * @param {string} guildId - Guild ID
     * @param {string} channelId - Channel ID
     * @param {string} commandName - Command name
     * @param {string} userId - User ID
     */
    clearStickyCooldown(guildId, channelId, commandName, userId) {
        const key = `${guildId}_${channelId}_${commandName}_${userId}`
        stickyCooldowns.delete(key)
    },
    /**
     * Clears all sticky cooldowns (useful for testing)
     */
    clearAllStickyCooldowns() {
        stickyCooldowns.clear()
    },
    run: async (client, interaction) => {
        // Parse button customId using the parseCustomId function (supports both old and compact formats)
        const parsed = parseCustomId(interaction.customId, interaction.guildId)

        if (!parsed || !parsed.commandName || !parsed.channelId) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} ${client.language({ textId: "Error processing command", guildId: interaction.guildId, locale: interaction.locale })}`, 
                flags: ["Ephemeral"] 
            })
        }

        const { commandName, guildId, channelId, action } = parsed

        // Look up sticky configuration from cache
        const key = `${guildId}_${channelId}_${commandName}`
        const stickyConfig = client.cache.stickyCommands.get(key)

        if (!stickyConfig) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} ${client.language({ textId: "Sticky command not found", guildId: interaction.guildId, locale: interaction.locale })}`, 
                flags: ["Ephemeral"] 
            })
        }

        // Check sticky-specific cooldown based on action type
        // - 'edit' action: No cooldown (ephemeral, doesn't affect others)
        // - 'view' action: 1 use then cooldown
        // - 'search' action: 3 uses then cooldown
        // - Reward commands (daily, work, etc.): Use command's own cooldown system
        // **Validates: Requirements 4.5**
        const COOLDOWN_EXEMPT_COMMANDS = ['daily', 'work', 'crime', 'rob', 'fish', 'mine', 'hunt', 'dig', 'chop', 'weekly', 'monthly']
        const effectiveAction = action || 'view'
        
        // Default minimum cooldown of 5 minutes (300000ms) for view/search actions
        const DEFAULT_MIN_COOLDOWN = 5 * 60 * 1000 // 5 minutes in milliseconds
        
        // Skip cooldown for edit actions (ephemeral) and reward commands
        if (effectiveAction !== 'edit' && !COOLDOWN_EXEMPT_COMMANDS.includes(commandName)) {
            // Use configured cooldown or default, whichever is higher (minimum 5 minutes)
            const configuredCooldown = stickyConfig.cooldown || 0
            const effectiveCooldown = Math.max(configuredCooldown, DEFAULT_MIN_COOLDOWN)
            
            if (effectiveCooldown > 0) {
                // Different cooldown keys and limits per action type
                const stickyCooldownKey = `${guildId}_${channelId}_${commandName}_${effectiveAction}_${interaction.user.id}`
                const usageCountKey = `${stickyCooldownKey}_count`
                
                // Get max uses before cooldown based on action
                const maxUses = effectiveAction === 'search' ? 3 : 1 // view = 1, search = 3
                
                const lastUsage = stickyCooldowns.get(stickyCooldownKey)
                const currentCount = stickyCooldowns.get(usageCountKey) || 0
                
                // Check if on cooldown
                if (lastUsage && lastUsage > Date.now()) {
                    const remainingMs = lastUsage - Date.now()
                    const formattedRemaining = formatRemainingCooldown(remainingMs)
                    
                    return interaction.reply({ 
                        content: `${client.config.emojis.NO} **Cooldown Active**\n\n` +
                                 `⏱️ You can use this command again <t:${Math.floor(lastUsage/1000)}:R>\n` +
                                 `📍 Remaining: **${formattedRemaining}**`, 
                        flags: ["Ephemeral"] 
                    })
                }
                
                // Increment usage count
                const newCount = currentCount + 1
                stickyCooldowns.set(usageCountKey, newCount)
                
                // If reached max uses, set cooldown and reset count
                if (newCount >= maxUses) {
                    stickyCooldowns.set(stickyCooldownKey, Date.now() + effectiveCooldown)
                    stickyCooldowns.set(usageCountKey, 0)
                }
            }
        }

        // Check sticky-specific requirements (configured per sticky command)
        // **Validates: Requirements 5.4**
        if (stickyConfig.requirements && stickyConfig.requirements.length > 0) {
            const requirementCheckResult = await checkStickyRequirements(client, interaction, stickyConfig.requirements)
            
            if (!requirementCheckResult.passed) {
                return interaction.reply({
                    content: `${client.config.emojis.NO} ${client.language({ textId: "You do not meet the requirements to use this command", guildId: interaction.guildId, locale: interaction.locale })}\n\n${requirementCheckResult.reasons.join('\n')}`,
                    flags: ["Ephemeral"]
                })
            }
        }

        // Get the target command from client.slashCommands
        const targetCommand = client.slashCommands.get(commandName)

        if (!targetCommand) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} ${client.language({ textId: "Command", guildId: interaction.guildId, locale: interaction.locale })} \`/${commandName}\` ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, 
                flags: ["Ephemeral"] 
            })
        }

        // Handle cooldown checks
        const cooldown = client.cooldowns({ guildId: interaction.guildId, commandName: commandName })
        if (cooldown && ((cooldown[1].length && !interaction.member.roles.cache.hasAny(...cooldown[1])) || !cooldown[1].length)) {
            const commandCooldown = targetCommand.cooldowns?.get(`${interaction.guildId}_${interaction.user.id}`)
            if (commandCooldown && commandCooldown > Date.now()) {
                return interaction.reply({ 
                    content: `${client.config.emojis.NO} ${client.language({ textId: "Wait for cooldown and execute command", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(commandCooldown/1000)}:R>`, 
                    flags: ["Ephemeral"] 
                })
            }
            // Set cooldown for this user
            if (targetCommand.cooldowns) {
                targetCommand.cooldowns.set(`${interaction.guildId}_${interaction.user.id}`, Date.now() + cooldown[0])
            }
        }

        // Route to appropriate handler based on action
        // effectiveAction is already defined above in cooldown check section

        // Special handling for daily command - check if already claimed and show ephemeral message
        if (commandName === 'daily') {
            const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            const lastDaily = new Date(Date.UTC(
                profile.lastDaily.getUTCFullYear(), 
                profile.lastDaily.getUTCMonth(), 
                profile.lastDaily.getUTCDate(), 
                profile.lastDaily.getUTCHours(), 
                profile.lastDaily.getUTCMinutes(), 
                profile.lastDaily.getUTCSeconds()
            ))
            const nextDaily = new Date(Date.UTC(
                lastDaily.getUTCFullYear(), 
                lastDaily.getUTCMonth(), 
                lastDaily.getUTCDate() + 1, 
                0, 0, 0
            ))
            
            // If user already claimed today, show ephemeral message with next available time
            if (nextDaily > new Date()) {
                let tomorrow = new Date()
                tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
                tomorrow.setUTCHours(0, 0, 0, 0)
                
                return interaction.reply({ 
                    content: `‼ ${client.language({ textId: "You already received daily reward", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Come back at", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(tomorrow.getTime() / 1000)}:F>`, 
                    flags: ["Ephemeral"] 
                })
            }
        }

        switch (effectiveAction) {
            case 'view':
                await handleViewAction(client, interaction, targetCommand, commandName, stickyConfig, guildId, channelId, key)
                break
            case 'edit':
                await handleEditAction(client, interaction, targetCommand, commandName, stickyConfig, guildId, channelId, key)
                break
            case 'search':
                await handleSearchAction(client, interaction, targetCommand, commandName, stickyConfig, guildId, channelId, key)
                break
            default:
                // Unknown action, fall back to view
                await handleViewAction(client, interaction, targetCommand, commandName, stickyConfig, guildId, channelId, key)
                break
        }
    }
}

/**
 * Handles the 'view' action - executes the original command behavior
 * For profile: Shows simplified view (as other users see it) - NO settings menu
 * For rank: Shows rank card
 * Also handles backward compatibility with old button format (no action in customId)
 */
async function handleViewAction(client, interaction, targetCommand, commandName, stickyConfig, guildId, channelId, cacheKey) {
    // Store the current sticky message ID before executing command
    const oldMessageId = stickyConfig.messageID

    // Defer the interaction first to acknowledge it
    await interaction.deferReply()

    // Execute the target command with a modified interaction that acts like a slash command
    // We create a wrapper that makes the button interaction behave like a deferred slash command
    const wrappedInteraction = Object.create(interaction)
    wrappedInteraction.isChatInputCommand = () => true
    wrappedInteraction.isButton = () => false
    wrappedInteraction.deferred = true
    wrappedInteraction.replied = false
    // Provide no-op deferReply to prevent double-defer errors when target commands call deferReply()
    wrappedInteraction.deferReply = async () => {}
    // Redirect reply() to editReply() since interaction is already deferred
    wrappedInteraction.reply = async (options) => interaction.editReply(options)

    try {
        // For profile command, pass viewOnly flag to show simplified view (no settings menu)
        // This makes it look like viewing someone else's profile - user sees their own profile
        // exactly as others would see it (no editing options)
        const args = commandName === 'profile' ? { viewOnly: true } : {}
        await targetCommand.run(client, wrappedInteraction, args)
    } catch (error) {
        console.error(`Error executing sticky command ${commandName}:`, error)
        // Only reply if we haven't already replied
        if (!interaction.replied) {
            try {
                await interaction.editReply({ 
                    content: `${client.config.emojis.NO} ${client.language({ textId: "An error occurred while executing the command", guildId: interaction.guildId, locale: interaction.locale })}`
                })
            } catch (e) {
                // Ignore if we can't edit
            }
        }
    }

    // Note: Sticky message repositioning is handled by messageCreate.js event
    // when the bot's reply is sent to the channel. No need to reposition here.
}

/**
 * Handles the 'edit' action - shows full profile/rank interface with editing options
 * For profile: Shows the full profile with all editing options in an ephemeral message
 * For rank: Shows the rank-set user card interface in an ephemeral message
 * **Validates: Requirements 2.2, 2.3, 5.2, 5.3**
 */
async function handleEditAction(client, interaction, targetCommand, commandName, stickyConfig, guildId, channelId, cacheKey) {
    if (commandName === 'profile') {
        // Execute the profile command with ephemeral and editMode flags
        // editMode: true shows the settings menu, ephemeral: true makes it visible only to the user
        const wrappedInteraction = Object.create(interaction)
        wrappedInteraction.isChatInputCommand = () => true
        wrappedInteraction.isButton = () => false
        wrappedInteraction.deferred = false
        wrappedInteraction.replied = false
        
        // Execute the profile command with ephemeral and editMode options
        // The profile command will show the full interface with editing options
        try {
            await targetCommand.run(client, wrappedInteraction, { ephemeral: true, editMode: true })
        } catch (error) {
            console.error(`Error executing edit action for ${commandName}:`, error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: `${client.config.emojis.NO} ${client.language({ textId: "An error occurred while executing the command", guildId: interaction.guildId, locale: interaction.locale })}`,
                    flags: ["Ephemeral"]
                })
            }
        }
    } else if (commandName === 'rank') {
        // Execute the rank-set command with user card interface (not server card)
        // This shows only personal rank card customization options
        // **Validates: Requirements 5.2, 5.3**
        const rankSetCommand = client.slashCommands.get('rank-set')
        
        if (!rankSetCommand) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} ${client.language({ textId: "Command", guildId: interaction.guildId, locale: interaction.locale })} \`/rank-set\` ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`,
                flags: ["Ephemeral"]
            })
        }
        
        // Create a wrapped interaction that simulates a slash command with ephemeral flag
        // The customId includes 'eph' to trigger ephemeral response and 'reply' to use deferReply
        // type{userCard} ensures only user card options are shown (not server card)
        const wrappedInteraction = Object.create(interaction)
        wrappedInteraction.isChatInputCommand = () => true
        wrappedInteraction.isButton = () => false
        wrappedInteraction.isStringSelectMenu = () => false
        wrappedInteraction.deferred = false
        wrappedInteraction.replied = false
        // Add 'eph' and 'reply' to customId to trigger ephemeral deferReply in rank-set command
        wrappedInteraction.customId = `usr{${interaction.user.id}}cmd{rank-set}type{userCard}eph_reply`
        
        try {
            await rankSetCommand.run(client, wrappedInteraction, {})
        } catch (error) {
            console.error(`Error executing edit action for ${commandName}:`, error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: `${client.config.emojis.NO} ${client.language({ textId: "An error occurred while executing the command", guildId: interaction.guildId, locale: interaction.locale })}`,
                    flags: ["Ephemeral"]
                })
            }
        }
    } else {
        // For other commands, fall back to view action
        await handleViewAction(client, interaction, targetCommand, commandName, stickyConfig, guildId, channelId, cacheKey)
    }
}

/**
 * Handles the 'search' action - shows user search interface for viewing others' profiles/ranks
 * Sends an ephemeral message with a UserSelectMenu component
 * **Validates: Requirements 3.2, 6.2**
 */
async function handleSearchAction(client, interaction, targetCommand, commandName, stickyConfig, guildId, channelId, cacheKey) {
    // Create a UserSelectMenu for selecting another user to view
    // Use compact format: c{sus}n{<commandName>}ch{<channelId>} (sus = sticky-user-select)
    const userSelectMenu = new UserSelectMenuBuilder()
        .setCustomId(`c{sus}n{${commandName}}ch{${channelId}}`)
        .setPlaceholder(commandName === 'profile' 
            ? client.language({ textId: "Select a user to view their profile", guildId: interaction.guildId, locale: interaction.locale }) || 'Select a user to view their profile'
            : client.language({ textId: "Select a user to view their rank", guildId: interaction.guildId, locale: interaction.locale }) || 'Select a user to view their rank')
        .setMinValues(1)
        .setMaxValues(1)
    
    const row = new ActionRowBuilder().addComponents(userSelectMenu)
    
    // Send ephemeral message with user select menu
    try {
        await interaction.reply({
            content: commandName === 'profile'
                ? `🔍 ${client.language({ textId: "Select a user to view their profile", guildId: interaction.guildId, locale: interaction.locale }) || 'Select a user to view their profile'}:`
                : `🔍 ${client.language({ textId: "Select a user to view their rank", guildId: interaction.guildId, locale: interaction.locale }) || 'Select a user to view their rank'}:`,
            components: [row],
            flags: ["Ephemeral"]
        })
    } catch (error) {
        console.error(`Error executing search action for ${commandName}:`, error)
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: `${client.config.emojis.NO} ${client.language({ textId: "An error occurred while executing the command", guildId: interaction.guildId, locale: interaction.locale })}`,
                flags: ["Ephemeral"]
            })
        }
    }
}

// Commands that use multi-button format (view, edit, view others)
const MULTI_BUTTON_COMMANDS = ['profile', 'rank']

// Button label mappings for multi-button commands
const VIEW_BUTTON_LABELS = {
    'profile': 'View Profile',
    'rank': 'View Rank'
}

const EDIT_BUTTON_LABELS = {
    'profile': 'Edit Profile',
    'rank': 'Edit Rank'
}

/**
 * Repositions the sticky message to the bottom of the channel
 */
async function repositionStickyMessage(client, interaction, stickyConfig, commandName, guildId, channelId, cacheKey, oldMessageId) {
    try {
        const channel = interaction.guild.channels.cache.get(channelId)
        if (!channel) return

        // Get command-specific emoji or use default
        const commandEmojis = {
            'profile': '<:Profile:1452116336892182569>',
            'daily': client.config.emojis.daily || '📅',
            'rank': client.config.emojis.rank || '🏆',
            'shop': client.config.emojis.shop || '🛒',
            'inventory': client.config.emojis.inventory || '🎒',
            'quests': client.config.emojis.quests || '📜'
        }
        const buttonEmoji = commandEmojis[commandName] || client.config.emojis.star || '⭐'

        let row

        // Create multi-button layout for profile and rank commands
        if (MULTI_BUTTON_COMMANDS.includes(commandName)) {
            const viewButton = new ButtonBuilder()
                .setCustomId(generateCompactCustomId('view', commandName, channelId))
                .setLabel(VIEW_BUTTON_LABELS[commandName])
                .setStyle(ButtonStyle.Primary)
                .setEmoji(buttonEmoji)
            
            const editButton = new ButtonBuilder()
                .setCustomId(generateCompactCustomId('edit', commandName, channelId))
                .setLabel(EDIT_BUTTON_LABELS[commandName])
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️')
            
            const searchButton = new ButtonBuilder()
                .setCustomId(generateCompactCustomId('search', commandName, channelId))
                .setLabel('View Others')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔍')
            
            row = new ActionRowBuilder().addComponents(viewButton, editButton, searchButton)
        } else {
            // Single button for other commands (daily, shop, inventory, quests)
            // For non-multi-button commands, use 'view' as the default action
            const stickyButton = new ButtonBuilder()
                .setCustomId(generateCompactCustomId('view', commandName, channelId))
                .setLabel(commandName.charAt(0).toUpperCase() + commandName.slice(1))
                .setStyle(ButtonStyle.Primary)
                .setEmoji(buttonEmoji)
            
            row = new ActionRowBuilder().addComponents(stickyButton)
        }

        // Send new sticky message (no embed, just button)
        const newMessage = await channel.send({ components: [row] }).catch(() => null)

        if (newMessage) {
            // Delete old sticky message AFTER sending new one
            if (oldMessageId) {
                try {
                    const oldMessage = await channel.messages.fetch(oldMessageId).catch(() => null)
                    if (oldMessage) {
                        await oldMessage.delete().catch(() => null)
                    }
                } catch (error) {
                    // Message may already be deleted, continue
                }
            }

            // Update messageID in database
            await client.stickyCommandSchema.updateOne(
                { guildID: guildId, channelID: channelId, commandName: commandName },
                { messageID: newMessage.id }
            )

            // Update cache
            stickyConfig.messageID = newMessage.id
            client.cache.stickyCommands.set(cacheKey, stickyConfig)
        }
    } catch (error) {
        console.error(`Error repositioning sticky message:`, error)
    }
}


/**
 * Checks if a user meets all configured requirements for a sticky command
 * Uses the Permission class's `for()` method to verify requirements
 * **Validates: Requirements 5.4**
 * @param {Object} client - Discord client
 * @param {Object} interaction - Discord interaction
 * @param {string[]} requirementIds - Array of requirement (permission) IDs
 * @returns {Promise<Object>} Result object with { passed: boolean, reasons: string[] }
 */
async function checkStickyRequirements(client, interaction, requirementIds) {
    const result = {
        passed: true,
        reasons: []
    }

    // If no requirements, pass automatically
    if (!requirementIds || requirementIds.length === 0) {
        return result
    }

    // Fetch user profile for requirement checks
    const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)

    for (const reqId of requirementIds) {
        // Find the permission (requirement) in cache
        const permission = client.cache.permissions.get(reqId)
        
        if (!permission) {
            // Requirement no longer exists, skip it (don't fail)
            console.warn(`Sticky command requirement not found: ${reqId}`)
            continue
        }

        // Check if permission is enabled
        if (!permission.enable) {
            // Disabled permission, skip it
            continue
        }

        try {
            // Use the Permission class's `for()` method to check if user meets requirements
            const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
            
            if (!isPassing.value) {
                result.passed = false
                // Add the failing reasons
                result.reasons.push(...isPassing.reasons.filter(r => r.includes(client.config.emojis.NO)))
            }
        } catch (error) {
            console.error(`Error checking requirement ${reqId}:`, error)
            // Don't fail on error, just skip this requirement
            continue
        }
    }

    return result
}

// Export the checkStickyRequirements function for testing
module.exports.checkStickyRequirements = checkStickyRequirements
