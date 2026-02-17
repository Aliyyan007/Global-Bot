/**
 * Handler for sticky command manager - main menu selection
 * CustomId: cmd{sticky-cmd-manager-menu}
 * Routes interactions based on customId patterns
 * Handles all select menus, buttons, and modals for the sticky command manager
 * **Validates: Requirements 1.2**
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js")
const { SUPPORTED_COMMANDS, MENU_OPTIONS } = require("../slash-commands/sticky-cmd-manager.js")
const { getOrCreateSession, getSession, updateSession, deleteSession } = require("../handler/stickyManagerSession.js")

// Config options for the Add Panel
const CONFIG_OPTIONS = [
    {
        label: 'Add Message',
        description: 'Add a custom message above the buttons',
        value: 'add_message',
        emoji: '💬'
    },
    {
        label: 'Clear Message',
        description: 'Remove the custom message',
        value: 'clear_message',
        emoji: '🗑️'
    },
    {
        label: 'Add Cooldown',
        description: 'Set cooldown for commands',
        value: 'add_cooldown',
        emoji: '⏱️'
    }
]

// Items per page for list pagination
const ITEMS_PER_PAGE = 10

/**
 * Formats cooldown milliseconds to human-readable string
 * @param {number} ms - Cooldown in milliseconds
 * @returns {string} Formatted cooldown string
 */
function formatCooldown(ms) {
    if (ms >= 86400000) {
        const days = Math.floor(ms / 86400000)
        return `${days}d`
    } else if (ms >= 3600000) {
        const hours = Math.floor(ms / 3600000)
        return `${hours}h`
    } else {
        const minutes = Math.floor(ms / 60000)
        return `${minutes}min`
    }
}

/**
 * Builds the preview embed showing current configuration
 * @param {Object} client - Discord client
 * @param {Object} interaction - Discord interaction
 * @param {Object} session - Session state
 * @returns {EmbedBuilder} The preview embed
 */
function buildPreviewEmbed(client, interaction, session) {
    const embed = new EmbedBuilder()
        .setColor(3093046)

    // Build description with current configuration
    let description = ``

    // Selected commands
    description += `**Selected Commands:**\n`
    if (session.selectedCommands.length > 0) {
        const commandLabels = session.selectedCommands.map(cmdName => {
            const cmd = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
            return cmd ? `${cmd.emoji} ${cmd.label}` : cmdName
        })
        description += commandLabels.join(', ') + '\n'
    } else {
        description += `_Not selected_\n`
    }

    // Selected channels
    description += `\n**Selected Channels:**\n`
    if (session.selectedChannels.length > 0) {
        const channelMentions = session.selectedChannels.map(id => `<#${id}>`).join(', ')
        description += channelMentions + '\n'
    } else {
        description += `_Not selected_\n`
    }

    // Cooldowns (per-command with emojis)
    if (session.cooldowns && session.cooldowns.size > 0) {
        description += `\n**Cooldowns:**\n`
        for (const [cmdName, cooldownMs] of session.cooldowns) {
            const cmd = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
            const emoji = cmd ? cmd.emoji : '⚙️'
            const cooldownStr = formatCooldown(cooldownMs)
            description += `• ${emoji} ${cmdName}: **${cooldownStr}**\n`
        }
    }

    // Requirements (per-command with emojis)
    if (session.requirements && session.requirements.size > 0) {
        description += `\n**Requirements:**\n`
        for (const [cmdName, reqIds] of session.requirements) {
            const cmd = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
            const emoji = cmd ? cmd.emoji : '⚙️'
            const requirementNames = reqIds.map(reqId => {
                const permission = client.cache.permissions.get(reqId)
                return permission ? `**${permission.name}**` : `**${reqId}**`
            })
            description += `• ${emoji} ${cmdName}: ${requirementNames.join(', ')}\n`
        }
    }

    embed.setDescription(description)
    return embed
}

/**
 * Builds the Add Panel components
 * @param {Object} client - Discord client
 * @param {Object} interaction - Discord interaction
 * @param {Object} session - Session state
 * @returns {ActionRowBuilder[]} Array of action rows with components
 */
function buildAddPanelComponents(client, interaction, session) {
    const rows = []

    // Get existing sticky commands for this guild
    const guildStickyCommands = []
    for (const [key, value] of client.cache.stickyCommands) {
        if (value.guildID === interaction.guildId) {
            guildStickyCommands.push({ key, ...value })
        }
    }

    // Row 1: Existing sticky commands select menu (if any exist) - grouped by channel
    if (guildStickyCommands.length > 0) {
        // Group sticky commands by channel
        const channelGroups = new Map()
        for (const config of guildStickyCommands) {
            const channelId = config.channelID
            if (!channelGroups.has(channelId)) {
                channelGroups.set(channelId, [])
            }
            channelGroups.get(channelId).push(config)
        }
        
        // Build options - one per channel showing all commands
        const existingOptions = []
        for (const [channelId, configs] of channelGroups) {
            if (existingOptions.length >= 25) break // Discord limit
            
            const channel = interaction.guild.channels.cache.get(channelId)
            const channelName = channel ? channel.name : channelId
            
            // Sort configs by createdAt to maintain order
            configs.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                return dateA - dateB
            })
            
            // Build command names list with emojis
            const commandLabels = configs.map(config => {
                const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === config.commandName)
                return cmdInfo ? cmdInfo.label : config.commandName
            })
            
            // Get first command's emoji for the option
            const firstCmdInfo = SUPPORTED_COMMANDS.find(c => c.name === configs[0].commandName)
            const emoji = firstCmdInfo ? firstCmdInfo.emoji : '⭐'
            
            // Build label - show command names (truncate if too long)
            let label = commandLabels.join(', ')
            if (label.length > 100) {
                label = label.substring(0, 97) + '...'
            }
            
            // Build description with channel name
            let descriptionText = `#${channelName}`
            if (configs.length > 1) {
                descriptionText += ` | ${configs.length} commands`
            }
            
            existingOptions.push({
                label: label,
                description: descriptionText.substring(0, 100),
                value: `channel_${channelId}`, // Use channel-based value
                emoji: emoji
            })
        }

        const existingSelect = new StringSelectMenuBuilder()
            .setCustomId('cmd{scm_load_existing}')
            .setPlaceholder('📂 Load existing sticky commands')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(existingOptions)
        rows.push(new ActionRowBuilder().addComponents(existingSelect))
    }

    // Row 2: Command select menu
    const commandSelect = new StringSelectMenuBuilder()
        .setCustomId('cmd{scm_add_cmds}')
        .setPlaceholder('Select commands')
        .setMinValues(1)
        .setMaxValues(SUPPORTED_COMMANDS.length)
        .addOptions(SUPPORTED_COMMANDS.map(cmd => ({
            label: cmd.label,
            description: `Buttons: ${cmd.buttons.join(', ')}`,
            value: cmd.name,
            emoji: cmd.emoji,
            default: session.selectedCommands.includes(cmd.name)
        })))
    rows.push(new ActionRowBuilder().addComponents(commandSelect))

    // Row 3: Channel select menu
    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId('cmd{scm_add_channels}')
        .setPlaceholder('Select channels')
        .setMinValues(1)
        .setMaxValues(25)
        .setChannelTypes([
            ChannelType.GuildText,
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
            ChannelType.PublicThread,
            ChannelType.PrivateThread
        ])
    rows.push(new ActionRowBuilder().addComponents(channelSelect))

    // Row 4: Config options select menu
    const configSelect = new StringSelectMenuBuilder()
        .setCustomId('cmd{scm_add_config}')
        .setPlaceholder('Additional settings')
        .setMinValues(0)
        .setMaxValues(1)
        .addOptions(CONFIG_OPTIONS.map(opt => ({
            label: opt.label,
            description: opt.description,
            value: opt.value,
            emoji: opt.emoji
        })))
    rows.push(new ActionRowBuilder().addComponents(configSelect))

    // Row 5: Confirm and Cancel buttons
    const confirmButton = new ButtonBuilder()
        .setCustomId('cmd{scm_confirm}')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
        .setDisabled(session.selectedCommands.length === 0 || session.selectedChannels.length === 0)

    const cancelButton = new ButtonBuilder()
        .setCustomId('cmd{scm_cancel}')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')

    rows.push(new ActionRowBuilder().addComponents(confirmButton, cancelButton))

    return rows
}

/**
 * Builds the List Panel embed for a specific page
 * @param {Object} client - Discord client
 * @param {Object} interaction - Discord interaction
 * @param {Array} stickyCommands - Array of sticky command configurations
 * @param {number} page - Current page (0-indexed)
 * @returns {EmbedBuilder} The list embed
 */
function buildListEmbed(client, interaction, stickyCommands, page) {
    const embed = new EmbedBuilder()
        .setColor(3093046)

    if (stickyCommands.length === 0) {
        embed.setDescription(`📋 **Sticky Commands**\n\nNo commands configured.`)
        return embed
    }

    const totalPages = Math.ceil(stickyCommands.length / ITEMS_PER_PAGE)
    const startIndex = page * ITEMS_PER_PAGE
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, stickyCommands.length)
    const pageItems = stickyCommands.slice(startIndex, endIndex)

    let description = `📋 **Sticky Commands** (${stickyCommands.length})\n\n`

    pageItems.forEach((config, index) => {
        const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === config.commandName)
        const emoji = cmdInfo ? cmdInfo.emoji : '⭐'
        const channel = interaction.guild.channels.cache.get(config.channelID)
        const channelMention = channel ? `<#${config.channelID}>` : `#${config.channelID}`
        
        description += `**${startIndex + index + 1}.** ${emoji} \`${config.commandName}\`\n`
        description += `   Channel: ${channelMention}\n`
        
        // Message preview
        if (config.embedMessage && (config.embedMessage.content || config.embedMessage.embed)) {
            if (config.embedMessage.content) {
                const preview = config.embedMessage.content.length > 50 
                    ? config.embedMessage.content.substring(0, 50) + '...' 
                    : config.embedMessage.content
                description += `   Message: "${preview}"\n`
            } else if (config.embedMessage.embed) {
                description += `   Message: _Embed_\n`
            }
        }
        
        // Cooldown
        if (config.cooldown) {
            description += `   Cooldown: ${formatCooldown(config.cooldown)}\n`
        }
        
        // Requirements
        if (config.requirements && config.requirements.length > 0) {
            const requirementNames = config.requirements.map(reqId => {
                const permission = client.cache.permissions.find(p => p.id === reqId)
                return permission ? permission.name : reqId
            })
            description += `   Requirements: ${requirementNames.join(', ')}\n`
        }
        
        // Creation date
        if (config.createdAt) {
            const createdDate = new Date(config.createdAt)
            const formattedDate = `<t:${Math.floor(createdDate.getTime() / 1000)}:d>`
            description += `   Created: ${formattedDate}\n`
        }
        
        description += '\n'
    })

    embed.setDescription(description)
    return embed
}

/**
 * Builds pagination components for the List Panel
 * @param {Object} client - Discord client
 * @param {Object} interaction - Discord interaction
 * @param {number} totalItems - Total number of sticky commands
 * @param {number} currentPage - Current page (0-indexed)
 * @returns {ActionRowBuilder[]} Array of action rows with components
 */
function buildListPaginationComponents(client, interaction, totalItems, currentPage) {
    const rows = []
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

    // Add pagination buttons if more than one page
    if (totalPages > 1) {
        const prevButton = new ButtonBuilder()
            .setCustomId(`cmd{scm_list_page_${currentPage - 1}}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('◀️')
            .setDisabled(currentPage === 0)

        const pageIndicator = new ButtonBuilder()
            .setCustomId('cmd{scm_list_page_indicator}')
            .setLabel(`${currentPage + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)

        const nextButton = new ButtonBuilder()
            .setCustomId(`cmd{scm_list_page_${currentPage + 1}}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('▶️')
            .setDisabled(currentPage >= totalPages - 1)

        rows.push(new ActionRowBuilder().addComponents(prevButton, pageIndicator, nextButton))
    }

    // Add back to main menu select
    const backMenu = new StringSelectMenuBuilder()
        .setCustomId('cmd{sticky-cmd-manager-menu}')
        .setPlaceholder('Select action')
        .addOptions(MENU_OPTIONS.map(option => ({
            label: option.label,
            description: option.description,
            value: option.value,
            emoji: option.emoji,
            default: option.value === 'list'
        })))

    rows.push(new ActionRowBuilder().addComponents(backMenu))

    return rows
}

/**
 * Shows the Add Panel for adding sticky commands
 * **Validates: Requirements 2.1, 2.2, 3.1, 4.1, 5.1**
 */
async function showAddPanel(client, interaction) {
    // Get or create session for this user
    const session = getOrCreateSession(interaction.guildId, interaction.user.id)
    
    // Store the public message ID if not already set
    if (!session.publicMessageId) {
        updateSession(interaction.guildId, interaction.user.id, {
            publicMessageId: interaction.message.id,
            channelId: interaction.channelId
        })
    }

    // Build embeds array
    const embeds = []
    
    // Add message preview embed if configured
    if (session.messageEmbed) {
        const previewEmbed = EmbedBuilder.from(session.messageEmbed)
        embeds.push(previewEmbed)
    }
    
    // Add the main config embed
    const configEmbed = buildPreviewEmbed(client, interaction, session)
    embeds.push(configEmbed)

    // Build components
    const components = buildAddPanelComponents(client, interaction, session)

    await interaction.update({
        content: session.messageContent || null,
        embeds: embeds,
        components: components
    })
}

/**
 * Shows the Remove Panel for removing sticky commands
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */
async function showRemovePanel(client, interaction) {
    // Get all sticky commands for this guild
    const guildStickyCommands = []
    for (const [key, value] of client.cache.stickyCommands) {
        if (value.guildID === interaction.guildId) {
            guildStickyCommands.push({ key, ...value })
        }
    }
    
    const components = []
    
    if (guildStickyCommands.length === 0) {
        // No sticky commands configured
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`🗑️ **Remove Sticky Commands**\n\nNo sticky commands configured.`)
        
        // Create back button to return to main menu
        const backMenu = new StringSelectMenuBuilder()
            .setCustomId('cmd{sticky-cmd-manager-menu}')
            .setPlaceholder('Select action')
            .addOptions(MENU_OPTIONS.map(option => ({
                label: option.label,
                description: option.description,
                value: option.value,
                emoji: option.emoji,
                default: option.value === 'remove'
            })))
        
        components.push(new ActionRowBuilder().addComponents(backMenu))
        
        await interaction.update({
            embeds: [embed],
            components: components
        })
        return
    }
    
    // Group sticky commands by channel
    const channelGroups = new Map()
    for (const config of guildStickyCommands) {
        const channelId = config.channelID
        if (!channelGroups.has(channelId)) {
            channelGroups.set(channelId, [])
        }
        channelGroups.get(channelId).push(config)
    }
    
    // Simple embed - no preview list
    const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`🗑️ **Remove Sticky Commands**`)
    
    // Build select menu options - one per channel showing all commands
    const options = []
    for (const [channelId, configs] of channelGroups) {
        if (options.length >= 25) break // Discord limit
        
        const channel = interaction.guild.channels.cache.get(channelId)
        const channelName = channel ? channel.name : channelId
        
        // Sort configs by createdAt
        configs.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateA - dateB
        })
        
        // Build command names list
        const commandLabels = configs.map(config => {
            const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === config.commandName)
            return cmdInfo ? cmdInfo.label : config.commandName
        })
        
        // Get first command's emoji
        const firstCmdInfo = SUPPORTED_COMMANDS.find(c => c.name === configs[0].commandName)
        const emoji = firstCmdInfo ? firstCmdInfo.emoji : '⭐'
        
        // Build label
        let label = commandLabels.join(', ')
        if (label.length > 100) {
            label = label.substring(0, 97) + '...'
        }
        
        // Build description
        let descriptionText = `#${channelName}`
        if (configs.length > 1) {
            descriptionText += ` | ${configs.length} commands`
        }
        
        options.push({
            label: label,
            description: descriptionText.substring(0, 100),
            value: `channel_${channelId}`,
            emoji: emoji
        })
    }
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('cmd{scm_remove_select}')
        .setPlaceholder('🗑️ Select Sticky Command')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options)
    
    components.push(new ActionRowBuilder().addComponents(selectMenu))
    
    // Add Cancel button
    const cancelButton = new ButtonBuilder()
        .setCustomId('cmd{scm_cancel}')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    
    components.push(new ActionRowBuilder().addComponents(cancelButton))

    await interaction.update({
        embeds: [embed],
        components: components
    })
}

/**
 * Shows the List Panel for viewing sticky commands
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */
async function showListPanel(client, interaction, page = 0) {
    // Get all sticky commands for this guild
    const guildStickyCommands = []
    for (const [key, value] of client.cache.stickyCommands) {
        if (value.guildID === interaction.guildId) {
            guildStickyCommands.push({ key, ...value })
        }
    }
    
    // Sort by creation date (newest first)
    guildStickyCommands.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
        return dateB - dateA
    })

    // Build embed and components
    const embed = buildListEmbed(client, interaction, guildStickyCommands, page)
    const components = buildListPaginationComponents(client, interaction, guildStickyCommands.length, page)

    await interaction.update({
        embeds: [embed],
        components: components
    })
}

module.exports = {
    name: `sticky-cmd-manager-menu`,
    // Export constants and functions for testing and use in other modules
    CONFIG_OPTIONS,
    ITEMS_PER_PAGE,
    formatCooldown,
    buildPreviewEmbed,
    buildAddPanelComponents,
    buildListEmbed,
    buildListPaginationComponents,
    showListPanel,
    showAddPanel,
    showRemovePanel,
    /**
     * Main run function - handles main menu selection
     * Routes to appropriate panel based on selection
     * **Validates: Requirements 1.2**
     */
    run: async (client, interaction) => {
        const selectedOption = interaction.values[0]

        // Route to appropriate panel based on selection
        switch (selectedOption) {
            case 'add':
                await showAddPanel(client, interaction)
                break
            case 'remove':
                await showRemovePanel(client, interaction)
                break
            case 'list':
                await showListPanel(client, interaction)
                break
            default:
                await interaction.reply({
                    content: `${client.config.emojis.NO} Unknown option`,
                    flags: ["Ephemeral"]
                })
        }
    }
}
