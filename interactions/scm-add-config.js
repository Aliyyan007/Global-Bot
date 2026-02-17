/**
 * Handler for sticky command manager - config options selection
 * CustomId: cmd{scm_add_config}
 * Routes to Add Message or Add Cooldown flows
 * **Validates: Requirements 3.1, 4.1**
 */

const { getSession, updateSession } = require("../handler/stickyManagerSession.js")
const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")

module.exports = {
    name: `scm_add_config`,
    run: async (client, interaction) => {
        // Get session for this user
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.reply({
                content: `${client.config.emojis.NO} Your session has expired. Please run /sticky-cmd-manager again.`,
                flags: ["Ephemeral"]
            })
        }

        const selectedOption = interaction.values[0]

        // Route to appropriate config flow
        // These will be fully implemented in tasks 7, 8, 9
        switch (selectedOption) {
            case 'add_message':
                await handleAddMessage(client, interaction, session)
                break
            case 'clear_message':
                await handleClearMessage(client, interaction, session)
                break
            case 'add_cooldown':
                await handleAddCooldown(client, interaction, session)
                break
            default:
                // Unknown option, just update the panel
                const embed = buildPreviewEmbed(client, interaction, session)
                const components = buildAddPanelComponents(client, interaction, session)
                await interaction.update({
                    embeds: [embed],
                    components: components
                })
        }
    }
}

/**
 * Handles the Add Message config option
 * Opens a modal for the user to enter a message link
 * **Validates: Requirements 3.2, 3.3, 3.4**
 */
async function handleAddMessage(client, interaction, session) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js")
    
    // Create modal for message link input
    const modal = new ModalBuilder()
        .setCustomId('cmd{scm_add_msg_modal}')
        .setTitle('Add Custom Message')

    const linkInput = new TextInputBuilder()
        .setCustomId('message_link')
        .setLabel('Bot Message Link')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://discord.com/channels/guild/channel/message')
        .setRequired(true)
        .setMinLength(50)
        .setMaxLength(150)

    const row = new ActionRowBuilder().addComponents(linkInput)
    modal.addComponents(row)

    await interaction.showModal(modal)
}

/**
 * Handles the Clear Message config option
 * Removes the custom message from the session and updates the panel
 */
async function handleClearMessage(client, interaction, session) {
    // Check if there's a message to clear
    if (!session.messageContent && !session.messageEmbed) {
        // Just update the panel without changes
        const embed = buildPreviewEmbed(client, interaction, session)
        const components = buildAddPanelComponents(client, interaction, session)
        return interaction.update({
            embeds: [embed],
            components: components
        })
    }

    // Clear the message from session
    updateSession(interaction.guildId, interaction.user.id, {
        messageContent: null,
        messageEmbed: null
    })

    // Get updated session and refresh the panel
    const updatedSession = getSession(interaction.guildId, interaction.user.id)
    const embed = buildPreviewEmbed(client, interaction, updatedSession)
    const components = buildAddPanelComponents(client, interaction, updatedSession)
    
    await interaction.update({
        embeds: [embed],
        components: components
    })
}

/**
 * Handles the Add Cooldown config option
 * Shows cooldown configuration as a separate ephemeral message
 * **Validates: Requirements 4.2, 4.3, 4.4**
 */
async function handleAddCooldown(client, interaction, session) {
    // Check if commands are selected
    if (session.selectedCommands.length === 0) {
        return interaction.reply({
            content: `⚠️ Please select commands first before configuring cooldowns.`,
            flags: ["Ephemeral"]
        })
    }

    // Build cooldown configuration UI and send as ephemeral
    const { buildCooldownConfigUI } = require("./scm-cd-cmd.js")
    const { content, components } = buildCooldownConfigUI(client, session)
    
    await interaction.reply({
        content: content,
        embeds: [],
        components: components,
        flags: ["Ephemeral"]
    })
}

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
