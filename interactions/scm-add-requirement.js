/**
 * Handler for sticky command manager - Add Requirement selection
 * CustomId: cmd{scm_add_req}
 * Handles per-command requirement configuration (similar to cooldowns)
 * Step 1: Select command -> Step 2: Select requirements for that command
 * **Validates: Requirements 5.2, 5.3**
 */

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { getSession, setCommandRequirements, getCommandRequirements } = require("../handler/stickyManagerSession.js")
const { SUPPORTED_COMMANDS } = require("../slash-commands/sticky-cmd-manager.js")

// Store selected command for requirement configuration (per user session)
const requirementCommandSelection = new Map()

/**
 * Gets requirement names for display (truncated if too long)
 * @param {Object} client - Discord client
 * @param {string[]} reqIds - Array of requirement IDs
 * @param {number} maxLength - Maximum total length for display
 * @returns {string} Formatted requirement names
 */
function getRequirementNamesDisplay(client, reqIds, maxLength = 50) {
    if (!reqIds || reqIds.length === 0) return 'No requirements set'
    
    const names = reqIds.map(reqId => {
        const permission = client.cache.permissions.get(reqId)
        return permission ? permission.name : reqId
    })
    
    let display = names.join(', ')
    if (display.length > maxLength) {
        display = display.substring(0, maxLength - 3) + '...'
    }
    return display
}

/**
 * Builds the requirement configuration UI
 * @param {Object} client - Discord client
 * @param {Object} session - Session state
 * @param {string} selectedCommand - Currently selected command (optional)
 * @returns {Object} { content, components }
 */
function buildRequirementConfigUI(client, session, selectedCommand = null) {
    // Build command select menu for requirements
    const commandOptions = session.selectedCommands.map(cmdName => {
        const cmd = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
        const currentReqs = session.requirements.get(cmdName) || []
        
        return {
            label: cmd ? cmd.label : cmdName,
            description: getRequirementNamesDisplay(client, currentReqs, 100),
            value: cmdName,
            emoji: cmd ? cmd.emoji : '⚙️',
            default: cmdName === selectedCommand
        }
    })

    const commandSelect = new StringSelectMenuBuilder()
        .setCustomId('cmd{scm_req_cmd}')
        .setPlaceholder('📌 Step 1: Select command')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(commandOptions)

    // Done button to save and update public message
    const doneButton = new ButtonBuilder()
        .setCustomId('cmd{scm_req_done}')
        .setLabel('Done')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')

    const rows = [new ActionRowBuilder().addComponents(commandSelect)]

    // Build current requirements display
    let requirementsDisplay = ''
    if (session.requirements.size > 0) {
        requirementsDisplay = `\n\n📊 **Current Requirements:**\n`
        for (const [cmdName, reqIds] of session.requirements) {
            const cmd = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
            const emoji = cmd ? cmd.emoji : '⚙️'
            const reqNames = reqIds.map(reqId => {
                const permission = client.cache.permissions.get(reqId)
                return permission ? permission.name : reqId
            }).join(', ')
            requirementsDisplay += `${emoji} **${cmdName}**: ${reqNames}\n`
        }
    }

    // Show selected command info
    let selectedInfo = ''
    if (selectedCommand) {
        const cmd = SUPPORTED_COMMANDS.find(c => c.name === selectedCommand)
        const currentReqs = session.requirements.get(selectedCommand) || []
        selectedInfo = `\n\n✅ **Selected:** ${cmd ? cmd.emoji : '⚙️'} ${selectedCommand}`
        if (currentReqs.length > 0) {
            selectedInfo += ` (${currentReqs.length} requirement(s))`
        }
        selectedInfo += `\n👉 Now select requirements below.`
    }

    const content = `📋 **Requirements Configuration**\n\n` +
                   `Configure requirements for each command separately.` +
                   selectedInfo +
                   requirementsDisplay +
                   `\n\n💡 Click **Done** when finished to save changes.`

    rows.push(new ActionRowBuilder().addComponents(doneButton))

    return {
        content,
        components: rows
    }
}

module.exports = {
    name: `scm_req_cmd`,
    requirementCommandSelection,
    buildRequirementConfigUI,
    getRequirementNamesDisplay,
    run: async (client, interaction) => {
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.update({
                content: `Session expired. Please run /sticky-cmd-manager again.`,
                embeds: [],
                components: []
            })
        }

        const selectedCommand = interaction.values[0]
        
        // Store the selected command for this user
        const userKey = `${interaction.guildId}_${interaction.user.id}`
        requirementCommandSelection.set(userKey, selectedCommand)

        // Get all permissions (requirements) for this guild
        const guildPermissions = client.cache.permissions.filter(p => p.guildID === interaction.guildId)
        
        // Check if there are any requirements configured
        if (!guildPermissions || guildPermissions.size === 0) {
            const { content, components } = buildRequirementConfigUI(client, session, selectedCommand)
            return interaction.update({
                content: content + `\n\n⚠️ No requirements available. Create requirements using \`/manager-permissions\` first.`,
                embeds: [],
                components: components
            })
        }

        // Get current requirements for this command
        const currentReqs = session.requirements.get(selectedCommand) || []

        // Build requirement options from guild permissions
        const requirementOptions = []
        guildPermissions.forEach(permission => {
            if (permission.enable) {
                requirementOptions.push({
                    label: permission.name.length > 100 ? permission.name.substring(0, 97) + '...' : permission.name,
                    description: `ID: ${permission.id}`.substring(0, 100),
                    value: permission.id,
                    default: currentReqs.includes(permission.id)
                })
            }
        })

        // Check if there are any enabled requirements
        if (requirementOptions.length === 0) {
            const { content, components } = buildRequirementConfigUI(client, session, selectedCommand)
            return interaction.update({
                content: content + `\n\n⚠️ No active requirements. Enable requirements using \`/manager-permissions\`.`,
                embeds: [],
                components: components
            })
        }

        // Limit to 25 options (Discord limit)
        const limitedOptions = requirementOptions.slice(0, 25)

        // Build the UI with command select and requirement select
        const cmd = SUPPORTED_COMMANDS.find(c => c.name === selectedCommand)
        
        // Command select menu
        const commandOptions = session.selectedCommands.map(cmdName => {
            const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
            const cmdReqs = session.requirements.get(cmdName) || []
            
            return {
                label: cmdInfo ? cmdInfo.label : cmdName,
                description: getRequirementNamesDisplay(client, cmdReqs, 100),
                value: cmdName,
                emoji: cmdInfo ? cmdInfo.emoji : '⚙️',
                default: cmdName === selectedCommand
            }
        })

        const commandSelect = new StringSelectMenuBuilder()
            .setCustomId('cmd{scm_req_cmd}')
            .setPlaceholder('📌 Step 1: Select command')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(commandOptions)

        // Requirement select menu
        const requirementSelect = new StringSelectMenuBuilder()
            .setCustomId('cmd{scm_add_req}')
            .setPlaceholder('📌 Step 2: Select requirements')
            .setMinValues(0)
            .setMaxValues(limitedOptions.length)
            .addOptions(limitedOptions)

        // Done button
        const doneButton = new ButtonBuilder()
            .setCustomId('cmd{scm_req_done}')
            .setLabel('Done')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')

        const row1 = new ActionRowBuilder().addComponents(commandSelect)
        const row2 = new ActionRowBuilder().addComponents(requirementSelect)
        const row3 = new ActionRowBuilder().addComponents(doneButton)

        // Build current requirements display
        let requirementsDisplay = ''
        if (session.requirements.size > 0) {
            requirementsDisplay = `\n\n📊 **Current Requirements:**\n`
            for (const [cmdName, reqIds] of session.requirements) {
                const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
                const emoji = cmdInfo ? cmdInfo.emoji : '⚙️'
                const reqNames = reqIds.map(reqId => {
                    const permission = client.cache.permissions.get(reqId)
                    return permission ? permission.name : reqId
                }).join(', ')
                requirementsDisplay += `${emoji} **${cmdName}**: ${reqNames}\n`
            }
        }

        const content = `📋 **Requirements Configuration**\n\n` +
                       `Configure requirements for each command separately.\n\n` +
                       `✅ **Selected:** ${cmd ? cmd.emoji : '⚙️'} ${selectedCommand}` +
                       (currentReqs.length > 0 ? ` (${currentReqs.length} requirement(s))` : '') +
                       `\n👉 Now select requirements below.` +
                       requirementsDisplay +
                       `\n\n💡 Click **Done** when finished to save changes.`

        await interaction.update({
            content: content,
            embeds: [],
            components: [row1, row2, row3]
        })
    }
}


/**
 * Shows the requirement selection UI (two-step: command first, then requirements)
 * Sends ephemeral message with command select menu
 * **Validates: Requirements 5.2, 5.3**
 * @param {Object} client - Discord client
 * @param {Object} interaction - Discord interaction
 * @param {Object} session - Session state
 */
async function showRequirementSelectionUI(client, interaction, session) {
    // Check if there are any commands selected
    if (!session.selectedCommands || session.selectedCommands.length === 0) {
        return interaction.reply({
            content: `${client.config.emojis.NO} **No Commands Selected**\n\n` +
                     `Please select at least one command first before configuring requirements.\n\n` +
                     `💡 Use the command select menu in the add panel.`,
            flags: ["Ephemeral"]
        })
    }

    // Get all permissions (requirements) for this guild
    const guildPermissions = client.cache.permissions.filter(p => p.guildID === interaction.guildId)
    
    // Check if there are any requirements configured
    if (!guildPermissions || guildPermissions.size === 0) {
        return interaction.reply({
            content: `${client.config.emojis.NO} **No Requirements Available**\n\n` +
                     `This server has no requirements configured.\n\n` +
                     `💡 Create requirements using \`/manager-permissions\` first.`,
            flags: ["Ephemeral"]
        })
    }

    // Check if there are any enabled requirements
    const enabledPermissions = guildPermissions.filter(p => p.enable)
    if (enabledPermissions.size === 0) {
        return interaction.reply({
            content: `${client.config.emojis.NO} **No Active Requirements**\n\n` +
                     `All requirements on this server are disabled.\n\n` +
                     `💡 Enable requirements using \`/manager-permissions\`.`,
            flags: ["Ephemeral"]
        })
    }

    // Build the initial UI with just command select
    const { content, components } = buildRequirementConfigUI(client, session)

    await interaction.reply({
        content: content,
        components: components,
        flags: ["Ephemeral"]
    })
}

// Export the UI function for use in scm-add-config.js
module.exports.showRequirementSelectionUI = showRequirementSelectionUI
