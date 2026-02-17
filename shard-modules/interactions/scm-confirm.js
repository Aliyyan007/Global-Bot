/**
 * Handler for sticky command manager - confirm button
 * CustomId: cmd{scm_confirm}
 * Creates sticky commands based on session configuration
 * **Validates: Requirements 9.3, 8.1**
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js")
const { getSession, deleteSession, getOrCreateSession, updateSession } = require("../handler/stickyManagerSession.js")
const { SUPPORTED_COMMANDS } = require("../slash-commands/sticky-cmd-manager.js")
const { generateCompactCustomId } = require("./sticky-command.js")

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

// Command-specific emojis
const COMMAND_EMOJIS = {
    'profile': '<:Profile:1452116336892182569>',
    'daily': '📅',
    'rank': '🏆',
    'shop': '🛒',
    'inventory': '🎒',
    'quests': '📜'
}

/**
 * Builds a single button for a sticky command
 * @param {string} commandName - The command name
 * @param {string} channelId - The channel ID
 * @returns {ButtonBuilder} The button
 */
function buildSingleButton(commandName, channelId) {
    const buttonEmoji = COMMAND_EMOJIS[commandName] || '⭐'
    return new ButtonBuilder()
        .setCustomId(generateCompactCustomId('view', commandName, channelId))
        .setLabel(commandName.charAt(0).toUpperCase() + commandName.slice(1))
        .setStyle(ButtonStyle.Primary)
        .setEmoji(buttonEmoji)
}

/**
 * Builds the button row for a multi-button sticky command (profile, rank)
 * @param {string} commandName - The command name
 * @param {string} channelId - The channel ID
 * @returns {ActionRowBuilder} The action row with buttons
 */
function buildMultiButtonRow(commandName, channelId) {
    const buttonEmoji = COMMAND_EMOJIS[commandName] || '⭐'

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
    
    return new ActionRowBuilder().addComponents(viewButton, editButton, searchButton)
}

/**
 * Builds the button row for a sticky command (legacy - single command)
 * @param {string} commandName - The command name
 * @param {string} channelId - The channel ID
 * @returns {ActionRowBuilder} The action row with buttons
 */
function buildStickyButtonRow(commandName, channelId) {
    if (MULTI_BUTTON_COMMANDS.includes(commandName)) {
        return buildMultiButtonRow(commandName, channelId)
    } else {
        return new ActionRowBuilder().addComponents(buildSingleButton(commandName, channelId))
    }
}

/**
 * Builds all button rows for multiple sticky commands in a channel
 * Combines single-button commands into rows (up to 5 per row)
 * Multi-button commands (profile, rank) get their own row
 * @param {string[]} commandNames - Array of command names (in order of creation)
 * @param {string} channelId - The channel ID
 * @returns {ActionRowBuilder[]} Array of action rows (max 5)
 */
function buildCombinedButtonRows(commandNames, channelId) {
    const rows = []
    const singleButtonCommands = []
    
    // Process commands in order - separate multi-button from single-button
    for (const commandName of commandNames) {
        if (MULTI_BUTTON_COMMANDS.includes(commandName)) {
            // Multi-button commands get their own row
            // But first, flush any accumulated single buttons
            if (singleButtonCommands.length > 0) {
                // Create rows for single buttons (up to 5 per row)
                while (singleButtonCommands.length > 0 && rows.length < 5) {
                    const batch = singleButtonCommands.splice(0, 5)
                    const row = new ActionRowBuilder()
                    for (const cmd of batch) {
                        row.addComponents(buildSingleButton(cmd, channelId))
                    }
                    rows.push(row)
                }
            }
            
            // Add multi-button row if we have space
            if (rows.length < 5) {
                rows.push(buildMultiButtonRow(commandName, channelId))
            }
        } else {
            // Accumulate single-button commands
            singleButtonCommands.push(commandName)
        }
    }
    
    // Flush remaining single buttons
    while (singleButtonCommands.length > 0 && rows.length < 5) {
        const batch = singleButtonCommands.splice(0, 5)
        const row = new ActionRowBuilder()
        for (const cmd of batch) {
            row.addComponents(buildSingleButton(cmd, channelId))
        }
        rows.push(row)
    }
    
    return rows
}

module.exports = {
    name: `scm_confirm`,
    // Export helper functions for testing
    buildStickyButtonRow,
    buildCombinedButtonRows,
    buildSingleButton,
    buildMultiButtonRow,
    MULTI_BUTTON_COMMANDS,
    COMMAND_EMOJIS,
    run: async (client, interaction) => {
        // Get session for this user
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.reply({
                content: `${client.config.emojis.NO} **Session Expired**\n\n` +
                         `Your configuration session has expired.\n` +
                         `💡 Please run \`/sticky-cmd-manager\` again to start over.`,
                flags: ["Ephemeral"]
            })
        }

        // Validate that at least one command and channel are selected
        if (session.selectedCommands.length === 0) {
            return interaction.reply({
                content: `${client.config.emojis.NO} **No Commands Selected**\n\n` +
                         `Please select at least one command to create sticky buttons.\n` +
                         `💡 Use the command select menu in the add panel.`,
                flags: ["Ephemeral"]
            })
        }

        if (session.selectedChannels.length === 0) {
            return interaction.reply({
                content: `${client.config.emojis.NO} **No Channels Selected**\n\n` +
                         `Please select at least one channel to send sticky buttons to.\n` +
                         `💡 Use the channel select menu in the add panel.`,
                flags: ["Ephemeral"]
            })
        }

        // Check bot permissions in all selected channels
        const channelsWithoutPermission = []
        const validChannels = []

        for (const channelId of session.selectedChannels) {
            const channel = interaction.guild.channels.cache.get(channelId)
            
            if (!channel) {
                channelsWithoutPermission.push(channelId)
                continue
            }

            // Check if bot has permission to send messages and view channel
            const botPermissions = channel.permissionsFor(interaction.guild.members.me)
            
            if (!botPermissions || 
                !botPermissions.has(PermissionFlagsBits.ViewChannel) || 
                !botPermissions.has(PermissionFlagsBits.SendMessages)) {
                channelsWithoutPermission.push(channelId)
            } else {
                validChannels.push(channelId)
            }
        }

        // If no valid channels, return error
        if (validChannels.length === 0) {
            return interaction.reply({
                content: `${client.config.emojis.NO} **Permission Error**\n\n` +
                         `I don't have permission to send messages in the selected channels.\n\n` +
                         `💡 **Required permissions:**\n` +
                         `• View Channel\n` +
                         `• Send Messages`,
                flags: ["Ephemeral"]
            })
        }

        // Build preview of what will be created
        const commandLabels = session.selectedCommands.map(cmdName => {
            const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
            return cmdInfo ? `${cmdInfo.emoji} ${cmdInfo.label}` : cmdName
        }).join('  ')
        
        const channelMentions = validChannels.map(id => `<#${id}>`).join(', ')
        const totalCount = session.selectedCommands.length * validChannels.length
        
        // Send ephemeral success message FIRST (instant feedback)
        await interaction.reply({
            content: `${client.config.emojis.YES} **Created ${totalCount} sticky command${totalCount > 1 ? 's' : ''}**\n\n` +
                     `**Commands:** ${commandLabels}\n` +
                     `**Channels:** ${channelMentions}`,
            flags: ["Ephemeral"]
        })
        
        // Clear session state before returning to panel
        deleteSession(interaction.guildId, interaction.user.id)
        
        // Create a fresh session and return to the add panel
        const newSession = getOrCreateSession(interaction.guildId, interaction.user.id)
        updateSession(interaction.guildId, interaction.user.id, {
            publicMessageId: interaction.message.id,
            channelId: interaction.channelId
        })
        
        // Build fresh add panel
        const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")
        const configEmbed = buildPreviewEmbed(client, interaction, newSession)
        const panelComponents = buildAddPanelComponents(client, interaction, newSession)
        
        await interaction.message.edit({
            content: null,
            embeds: [configEmbed],
            components: panelComponents
        })
        
        // Store session data for background processing
        const sessionData = {
            selectedCommands: [...session.selectedCommands],
            selectedChannels: [...validChannels],
            messageContent: session.messageContent,
            messageEmbed: session.messageEmbed,
            cooldowns: new Map(session.cooldowns),
            requirements: new Map(session.requirements)
        }

        // Process creation in background (after user sees success)
        setImmediate(async () => {
            for (const channelId of sessionData.selectedChannels) {
                try {
                    const channel = interaction.guild.channels.cache.get(channelId)
                    if (!channel) continue

                    // Delete old sticky messages for all commands in this channel
                    for (const commandName of sessionData.selectedCommands) {
                        const existingKey = `${interaction.guildId}_${channelId}_${commandName}`
                        const existingConfig = client.cache.stickyCommands.get(existingKey)
                        
                        if (existingConfig && existingConfig.messageID) {
                            try {
                                const oldMessage = await channel.messages.fetch(existingConfig.messageID).catch(() => null)
                                if (oldMessage) {
                                    await oldMessage.delete().catch(() => null)
                                }
                            } catch (e) {
                                // Ignore errors when deleting old message
                            }
                        }
                    }

                    // Build combined button rows for all commands
                    const buttonRows = buildCombinedButtonRows(sessionData.selectedCommands, channelId)

                    // Build the message content
                    const messageOptions = {
                        components: buttonRows
                    }

                    // Add embed message if configured
                    if (sessionData.messageContent) {
                        messageOptions.content = sessionData.messageContent
                    }
                    if (sessionData.messageEmbed) {
                        messageOptions.embeds = [sessionData.messageEmbed]
                    }

                    // Send the combined sticky message to the channel
                    const stickyMessage = await channel.send(messageOptions)

                    // Save each command to database with the same message ID
                    for (const commandName of sessionData.selectedCommands) {
                        const existingKey = `${interaction.guildId}_${channelId}_${commandName}`
                        const existingConfig = client.cache.stickyCommands.get(existingKey)
                        
                        // Get cooldown for this command (if configured)
                        const cooldown = sessionData.cooldowns.get(commandName) || null
                        
                        // Get requirements for this command (if configured)
                        const requirements = sessionData.requirements.get(commandName) || []

                        // Prepare the database document
                        const stickyData = {
                            guildID: interaction.guildId,
                            channelID: channelId,
                            commandName: commandName,
                            messageID: stickyMessage.id,
                            createdAt: new Date(),
                            createdBy: interaction.user.id,
                            embedMessage: {
                                content: sessionData.messageContent || null,
                                embed: sessionData.messageEmbed || null
                            },
                            cooldown: cooldown,
                            requirements: requirements
                        }

                        if (existingConfig) {
                            // Update existing document
                            await client.stickyCommandSchema.updateOne(
                                { guildID: interaction.guildId, channelID: channelId, commandName: commandName },
                                { 
                                    $set: {
                                        messageID: stickyMessage.id,
                                        createdAt: new Date(),
                                        createdBy: interaction.user.id,
                                        embedMessage: stickyData.embedMessage,
                                        cooldown: stickyData.cooldown,
                                        requirements: stickyData.requirements
                                    }
                                }
                            )
                        } else {
                            // Create new document
                            await client.stickyCommandSchema.create(stickyData)
                        }

                        // Update cache
                        client.cache.stickyCommands.set(existingKey, stickyData)
                    }

                } catch (error) {
                    console.error(`Error creating sticky commands in channel ${channelId}:`, error)
                }
            }
        })
    }
}
