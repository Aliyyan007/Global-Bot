/**
 * Handler for sticky command manager - remove select menu
 * CustomId: cmd{scm_remove_select}
 * Handles selection of channel groups and individual commands to remove
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { MENU_OPTIONS, SUPPORTED_COMMANDS } = require("../slash-commands/sticky-cmd-manager.js")
const { getOrCreateSession, updateSession, getSession } = require("../handler/stickyManagerSession.js")

// Store selected channel for removal (per user session)
const removeChannelSelection = new Map()

module.exports = {
    name: `scm_remove_select`,
    removeChannelSelection,
    run: async (client, interaction) => {
        const selectedValue = interaction.values[0]
        
        // Check if this is a channel selection (format: channel_{channelId})
        if (selectedValue.startsWith('channel_')) {
            // Channel group selected - show individual commands
            const channelId = selectedValue.replace('channel_', '')
            
            // Store selected channel
            const userKey = `${interaction.guildId}_${interaction.user.id}`
            removeChannelSelection.set(userKey, channelId)
            
            // Get all sticky commands for this channel
            const channelConfigs = []
            for (const [key, config] of client.cache.stickyCommands) {
                if (config.guildID === interaction.guildId && config.channelID === channelId) {
                    channelConfigs.push({ key, ...config })
                }
            }
            
            // Sort by createdAt
            channelConfigs.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                return dateA - dateB
            })
            
            // Build the UI with channel select and command select
            const { embed, components } = buildRemoveCommandSelection(client, interaction, channelId, channelConfigs, [])
            
            await interaction.update({
                embeds: [embed],
                components: components
            })
        } else if (selectedValue === 'delete_all') {
            // Delete all commands in the selected channel
            const userKey = `${interaction.guildId}_${interaction.user.id}`
            const channelId = removeChannelSelection.get(userKey)
            
            if (!channelId) {
                return interaction.reply({
                    content: `${client.config.emojis.NO} No channel selected. Please try again.`,
                    flags: ["Ephemeral"]
                })
            }
            
            // Get all command keys for this channel
            const keysToRemove = []
            for (const [key, config] of client.cache.stickyCommands) {
                if (config.guildID === interaction.guildId && config.channelID === channelId) {
                    keysToRemove.push(key)
                }
            }
            
            // Ensure session exists and store for removal confirmation
            getOrCreateSession(interaction.guildId, interaction.user.id)
            updateSession(interaction.guildId, interaction.user.id, {
                selectedForRemoval: keysToRemove
            })
            
            // Show confirmation
            const { embed, components } = buildRemoveConfirmation(client, interaction, keysToRemove)
            
            await interaction.update({
                embeds: [embed],
                components: components
            })
        } else {
            // Individual command(s) selected
            const selectedKeys = interaction.values
            
            // Ensure session exists and store for removal confirmation
            getOrCreateSession(interaction.guildId, interaction.user.id)
            updateSession(interaction.guildId, interaction.user.id, {
                selectedForRemoval: selectedKeys
            })
            
            // Show confirmation
            const { embed, components } = buildRemoveConfirmation(client, interaction, selectedKeys)
            
            await interaction.update({
                embeds: [embed],
                components: components
            })
        }
    }
}

/**
 * Builds the remove command selection UI after a channel is selected
 */
function buildRemoveCommandSelection(client, interaction, channelId, channelConfigs, selectedKeys) {
    // Build command names with emojis for display
    const commandDisplay = channelConfigs.map(config => {
        const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === config.commandName)
        return cmdInfo ? `${cmdInfo.emoji} ${cmdInfo.label}` : config.commandName
    }).join('  ')
    
    const embed = new EmbedBuilder()
        .setColor(0xED4245) // Red color for removal
        .setDescription(
            `🗑️ **Remove Sticky Commands**\n\n` +
            `📍 **Channel:** <#${channelId}>\n` +
            `📋 **Commands:** ${commandDisplay}\n\n` +
            `Select commands to remove or use **Delete All**.`
        )
    
    const components = []
    
    // Row 1: Channel select (to go back or select different channel)
    const guildStickyCommands = []
    for (const [key, value] of client.cache.stickyCommands) {
        if (value.guildID === interaction.guildId) {
            guildStickyCommands.push({ key, ...value })
        }
    }
    
    // Group by channel for the channel select
    const channelGroups = new Map()
    for (const config of guildStickyCommands) {
        const chId = config.channelID
        if (!channelGroups.has(chId)) {
            channelGroups.set(chId, [])
        }
        channelGroups.get(chId).push(config)
    }
    
    const channelOptions = []
    for (const [chId, configs] of channelGroups) {
        if (channelOptions.length >= 25) break
        
        const ch = interaction.guild.channels.cache.get(chId)
        const chName = ch ? ch.name : chId
        
        configs.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateA - dateB
        })
        
        const labels = configs.map(c => {
            const cmdInfo = SUPPORTED_COMMANDS.find(cmd => cmd.name === c.commandName)
            return cmdInfo ? cmdInfo.label : c.commandName
        })
        
        let label = labels.join(', ')
        if (label.length > 100) label = label.substring(0, 97) + '...'
        
        const firstCmdInfo = SUPPORTED_COMMANDS.find(c => c.name === configs[0].commandName)
        
        channelOptions.push({
            label: label,
            description: `#${chName}` + (configs.length > 1 ? ` | ${configs.length} commands` : ''),
            value: `channel_${chId}`,
            emoji: firstCmdInfo ? firstCmdInfo.emoji : '⭐',
            default: chId === channelId
        })
    }
    
    const channelSelect = new StringSelectMenuBuilder()
        .setCustomId('cmd{scm_remove_select}')
        .setPlaceholder('🗑️ Select Sticky Command')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(channelOptions)
    
    components.push(new ActionRowBuilder().addComponents(channelSelect))
    
    // Row 2: Individual command select + Delete All option
    const commandOptions = []
    
    // Add "Delete All" option first
    commandOptions.push({
        label: 'Delete All',
        description: `Remove all ${channelConfigs.length} commands`,
        value: 'delete_all',
        emoji: '⚠️'
    })
    
    // Add individual commands
    for (const config of channelConfigs) {
        const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === config.commandName)
        const emoji = cmdInfo ? cmdInfo.emoji : '⭐'
        
        let descText = ''
        if (config.cooldown) {
            descText += `CD: ${formatCooldown(config.cooldown)}`
        }
        if (config.requirements && config.requirements.length > 0) {
            if (descText) descText += ' | '
            descText += `Req: ${config.requirements.length}`
        }
        if (!descText) descText = 'No settings'
        
        commandOptions.push({
            label: cmdInfo ? cmdInfo.label : config.commandName,
            description: descText.substring(0, 100),
            value: config.key,
            emoji: emoji,
            default: selectedKeys.includes(config.key)
        })
    }
    
    const commandSelect = new StringSelectMenuBuilder()
        .setCustomId('cmd{scm_remove_cmd_select}')
        .setPlaceholder('🗑️ Select commands to remove')
        .setMinValues(1)
        .setMaxValues(commandOptions.length)
        .addOptions(commandOptions)
    
    components.push(new ActionRowBuilder().addComponents(commandSelect))
    
    // Row 3: Cancel button
    const cancelButton = new ButtonBuilder()
        .setCustomId('cmd{scm_cancel}')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    
    components.push(new ActionRowBuilder().addComponents(cancelButton))
    
    return { embed, components }
}

/**
 * Builds the removal confirmation UI
 */
function buildRemoveConfirmation(client, interaction, selectedKeys) {
    // Group by channel for cleaner display
    const channelGroups = new Map()
    for (const key of selectedKeys) {
        const config = client.cache.stickyCommands.get(key)
        if (config) {
            if (!channelGroups.has(config.channelID)) {
                channelGroups.set(config.channelID, [])
            }
            channelGroups.get(config.channelID).push(config)
        }
    }
    
    let description = `⚠️ **Confirm Removal**\n\n`
    
    for (const [channelId, configs] of channelGroups) {
        const commandDisplay = configs.map(config => {
            const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === config.commandName)
            return cmdInfo ? `${cmdInfo.emoji} ${cmdInfo.label}` : config.commandName
        }).join('  ')
        
        description += `<#${channelId}>\n${commandDisplay}\n\n`
    }
    
    description += `🚫 **This cannot be undone!**`
    
    const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(description)
    
    const components = []
    
    // Confirm and Cancel buttons
    const confirmButton = new ButtonBuilder()
        .setCustomId('cmd{scm_remove_confirm}')
        .setLabel(`Remove ${selectedKeys.length}`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️')
    
    const cancelButton = new ButtonBuilder()
        .setCustomId('cmd{scm_cancel}')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    
    components.push(new ActionRowBuilder().addComponents(confirmButton, cancelButton))
    
    return { embed, components }
}

/**
 * Formats cooldown milliseconds to human-readable string
 */
function formatCooldown(ms) {
    if (ms >= 86400000) return `${Math.floor(ms / 86400000)}d`
    if (ms >= 3600000) return `${Math.floor(ms / 3600000)}h`
    return `${Math.floor(ms / 60000)}min`
}

// Export for testing
module.exports.buildRemoveCommandSelection = buildRemoveCommandSelection
module.exports.buildRemoveConfirmation = buildRemoveConfirmation
module.exports.formatCooldown = formatCooldown
