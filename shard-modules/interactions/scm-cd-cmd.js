/**
 * Handler for sticky command manager - cooldown command selection
 * CustomId: cmd{scm_cd_cmd}
 * **Validates: Requirements 4.2**
 */

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { getSession } = require("../handler/stickyManagerSession.js")
const { SUPPORTED_COMMANDS } = require("../slash-commands/sticky-cmd-manager.js")

// Store selected command for cooldown configuration (per user session)
// Exported for use by scm-cd-dur.js
const cooldownCommandSelection = new Map()

/**
 * Formats cooldown milliseconds to human-readable string
 * @param {number} ms - Cooldown in milliseconds
 * @returns {string} Formatted cooldown string
 */
function formatCooldownMs(ms) {
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

// Cooldown presets
const COOLDOWN_PRESETS = [
    { label: '10 Minutes', value: '600000', emoji: '⏱️' },
    { label: '20 Minutes', value: '1200000', emoji: '⏱️' },
    { label: '30 Minutes', value: '1800000', emoji: '⏱️' },
    { label: '1 Hour', value: '3600000', emoji: '🕐' },
    { label: '6 Hours', value: '21600000', emoji: '🕕' },
    { label: '24 Hours', value: '86400000', emoji: '📅' },
    { label: 'Custom', value: 'custom', emoji: '✏️' },
    { label: 'Remove Cooldown', value: 'remove', emoji: '❌' }
]

/**
 * Builds the cooldown configuration UI
 * @param {Object} client - Discord client
 * @param {Object} session - Session state
 * @param {string} selectedCommand - Currently selected command (optional)
 * @returns {Object} { content, components }
 */
function buildCooldownConfigUI(client, session, selectedCommand = null) {
    // Build command select menu for cooldown
    const commandOptions = session.selectedCommands.map(cmdName => {
        const cmd = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
        const currentCooldown = session.cooldowns.get(cmdName)
        const cooldownStr = currentCooldown ? formatCooldownMs(currentCooldown) : null
        
        return {
            label: cmd ? cmd.label : cmdName,
            description: cooldownStr 
                ? `Current: ${cooldownStr}`
                : 'No cooldown set',
            value: cmdName,
            emoji: cmd ? cmd.emoji : '⚙️',
            default: cmdName === selectedCommand
        }
    })

    const commandSelect = new StringSelectMenuBuilder()
        .setCustomId('cmd{scm_cd_cmd}')
        .setPlaceholder('📌 Step 1: Select command')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(commandOptions)

    const cooldownSelect = new StringSelectMenuBuilder()
        .setCustomId('cmd{scm_cd_dur}')
        .setPlaceholder('📌 Step 2: Select duration')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(COOLDOWN_PRESETS.map(preset => ({
            label: preset.label,
            value: preset.value,
            emoji: preset.emoji
        })))

    // Done button to save and update public message
    const doneButton = new ButtonBuilder()
        .setCustomId('cmd{scm_cd_done}')
        .setLabel('Done')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')

    const row1 = new ActionRowBuilder().addComponents(commandSelect)
    const row2 = new ActionRowBuilder().addComponents(cooldownSelect)
    const row3 = new ActionRowBuilder().addComponents(doneButton)

    // Build current cooldowns display
    let cooldownsDisplay = ''
    if (session.cooldowns.size > 0) {
        cooldownsDisplay = `\n\n📊 **Current Cooldowns:**\n`
        for (const [cmdName, cooldownMs] of session.cooldowns) {
            const cmd = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
            const emoji = cmd ? cmd.emoji : '⚙️'
            cooldownsDisplay += `${emoji} ${cmdName}: **${formatCooldownMs(cooldownMs)}**\n`
        }
    }

    // Show selected command info
    let selectedInfo = ''
    if (selectedCommand) {
        const cmd = SUPPORTED_COMMANDS.find(c => c.name === selectedCommand)
        const currentCooldown = session.cooldowns.get(selectedCommand)
        selectedInfo = `\n\n✅ **Selected:** ${cmd ? cmd.emoji : '⚙️'} ${selectedCommand}`
        if (currentCooldown) {
            selectedInfo += ` (Current: ${formatCooldownMs(currentCooldown)})`
        }
        selectedInfo += `\n👉 Now select the duration below.`
    }

    const content = `⏱️ **Cooldown Configuration**\n\n` +
                   `Configure how often users can use each command.` +
                   selectedInfo +
                   cooldownsDisplay +
                   `\n\n💡 Click **Done** when finished to save changes.`

    return {
        content,
        components: [row1, row2, row3]
    }
}

module.exports = {
    name: 'scm_cd_cmd',
    cooldownCommandSelection,
    formatCooldownMs,
    buildCooldownConfigUI,
    COOLDOWN_PRESETS,
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
        cooldownCommandSelection.set(userKey, selectedCommand)

        // Update the UI with the selected command highlighted
        const { content, components } = buildCooldownConfigUI(client, session, selectedCommand)
        
        await interaction.update({
            content: content,
            embeds: [],
            components: components
        })
    }
}
