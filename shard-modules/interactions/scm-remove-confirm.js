/**
 * Handler for sticky command manager - remove confirm button
 * CustomId: cmd{scm_remove_confirm}
 * Confirms and executes the removal of selected sticky commands
 * **Validates: Requirements 6.3, 6.4**
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { MENU_OPTIONS, SUPPORTED_COMMANDS } = require("../slash-commands/sticky-cmd-manager.js")
const { getSession, deleteSession } = require("../handler/stickyManagerSession.js")
const { showRemovePanel } = require("./sticky-cmd-manager-menu.js")

module.exports = {
    name: `scm_remove_confirm`,
    run: async (client, interaction) => {
        // Get session to retrieve selected commands for removal
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session || !session.selectedForRemoval || session.selectedForRemoval.length === 0) {
            return interaction.reply({
                content: `${client.config.emojis.NO} **No Selection**\n\n` +
                         `No commands selected for removal.\n` +
                         `💡 Please select commands from the list first.`,
                flags: ["Ephemeral"]
            })
        }
        
        const selectedKeys = session.selectedForRemoval
        const count = selectedKeys.length
        
        // Build preview of what will be removed
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
        
        let previewText = ''
        for (const [channelId, configs] of channelGroups) {
            const commandDisplay = configs.map(config => {
                const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === config.commandName)
                return cmdInfo ? `${cmdInfo.emoji} ${cmdInfo.label}` : config.commandName
            }).join('  ')
            previewText += `<#${channelId}>: ${commandDisplay}\n`
        }
        
        // Send ephemeral success message FIRST (instant feedback)
        await interaction.reply({
            content: `${client.config.emojis.YES} **Removed ${count} sticky command${count > 1 ? 's' : ''}**\n\n${previewText}`,
            flags: ["Ephemeral"]
        })
        
        // Clear session before returning to panel
        deleteSession(interaction.guildId, interaction.user.id)
        
        // Get remaining sticky commands for this guild to rebuild the remove panel
        const remainingStickyCommands = []
        for (const [key, value] of client.cache.stickyCommands) {
            // Skip the ones we're about to delete
            if (value.guildID === interaction.guildId && !selectedKeys.includes(key)) {
                remainingStickyCommands.push({ key, ...value })
            }
        }
        
        // Build the updated remove panel
        if (remainingStickyCommands.length === 0) {
            // No more sticky commands - show empty state
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`🗑️ **Remove Sticky Commands**\n\nNo sticky commands configured.`)
            
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
            
            await interaction.message.edit({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(backMenu)]
            })
        } else {
            // Group remaining by channel
            const channelGroups = new Map()
            for (const config of remainingStickyCommands) {
                const channelId = config.channelID
                if (!channelGroups.has(channelId)) {
                    channelGroups.set(channelId, [])
                }
                channelGroups.get(channelId).push(config)
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`🗑️ **Remove Sticky Commands**`)
            
            const options = []
            for (const [channelId, configs] of channelGroups) {
                if (options.length >= 25) break
                
                const channel = interaction.guild.channels.cache.get(channelId)
                const channelName = channel ? channel.name : channelId
                
                configs.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                    return dateA - dateB
                })
                
                const commandLabels = configs.map(config => {
                    const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === config.commandName)
                    return cmdInfo ? cmdInfo.label : config.commandName
                })
                
                const firstCmdInfo = SUPPORTED_COMMANDS.find(c => c.name === configs[0].commandName)
                const emoji = firstCmdInfo ? firstCmdInfo.emoji : '⭐'
                
                let label = commandLabels.join(', ')
                if (label.length > 100) label = label.substring(0, 97) + '...'
                
                let descriptionText = `#${channelName}`
                if (configs.length > 1) descriptionText += ` | ${configs.length} commands`
                
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
            
            const cancelButton = new ButtonBuilder()
                .setCustomId('cmd{scm_cancel}')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
            
            await interaction.message.edit({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(selectMenu),
                    new ActionRowBuilder().addComponents(cancelButton)
                ]
            })
        }
        
        // Process removals in background (after user sees success)
        setImmediate(async () => {
            const BATCH_SIZE = 5
            for (let i = 0; i < selectedKeys.length; i += BATCH_SIZE) {
                const batch = selectedKeys.slice(i, i + BATCH_SIZE)
                
                await Promise.all(batch.map(async (key) => {
                    const config = client.cache.stickyCommands.get(key)
                    
                    if (!config) return
                    
                    try {
                        // Delete the sticky message from the channel
                        if (config.messageID) {
                            try {
                                const channel = interaction.guild.channels.cache.get(config.channelID)
                                if (channel) {
                                    const message = await channel.messages.fetch(config.messageID).catch(() => null)
                                    if (message) {
                                        await message.delete().catch(() => null)
                                    }
                                }
                            } catch (e) {
                                // Ignore errors when deleting message
                            }
                        }
                        
                        // Delete from database
                        await client.stickyCommandSchema.deleteOne({
                            guildID: config.guildID,
                            channelID: config.channelID,
                            commandName: config.commandName
                        })
                        
                        // Delete from cache
                        client.cache.stickyCommands.delete(key)
                        
                    } catch (error) {
                        console.error(`Error removing sticky command ${key}:`, error)
                    }
                }))
            }
        })
    }
}
