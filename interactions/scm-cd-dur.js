/**
 * Handler for sticky command manager - cooldown duration selection
 * CustomId: cmd{scm_cd_dur}
 * **Validates: Requirements 4.3, 4.4**
 */

const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require("discord.js")
const { getSession, setCommandCooldown, removeCommandCooldown } = require("../handler/stickyManagerSession.js")
const { cooldownCommandSelection, formatCooldownMs, buildCooldownConfigUI } = require("./scm-cd-cmd.js")
const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")

/**
 * Updates the public message with the current session state
 * Uses session.publicMessageId to find the correct message
 */
async function updatePublicMessage(client, interaction, session) {
    // Need publicMessageId from session to update the correct message
    if (!session.publicMessageId) {
        return // No public message to update
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
    
    const components = buildAddPanelComponents(client, interaction, session)

    // Fetch and edit the public message using stored ID
    try {
        const channel = interaction.channel
        if (channel) {
            const publicMessage = await channel.messages.fetch(session.publicMessageId)
            if (publicMessage) {
                await publicMessage.edit({
                    content: session.messageContent || null,
                    embeds: embeds,
                    components: components
                })
            }
        }
    } catch (e) {
        // Ignore if we can't edit the public message
    }
}

module.exports = {
    name: 'scm_cd_dur',
    run: async (client, interaction) => {
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.update({
                content: `Session expired. Please run /sticky-cmd-manager again.`,
                embeds: [],
                components: []
            })
        }

        // Get the selected command from temporary storage
        const userKey = `${interaction.guildId}_${interaction.user.id}`
        const selectedCommand = cooldownCommandSelection.get(userKey)

        if (!selectedCommand) {
            // No command selected, just refresh the UI
            const { content, components } = buildCooldownConfigUI(client, session)
            return interaction.update({
                content: content + `\n\n⚠️ Please select a command first.`,
                embeds: [],
                components: components
            })
        }

        const selectedValue = interaction.values[0]

        // Handle custom cooldown - show modal
        if (selectedValue === 'custom') {
            const modal = new ModalBuilder()
                .setCustomId(`cmd{scm_cd_custom}_${selectedCommand}`)
                .setTitle('Custom Cooldown')

            const cooldownInput = new TextInputBuilder()
                .setCustomId('cooldown_value')
                .setLabel('Enter cooldown (e.g., 30min, 2h, 1d)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('30min, 2h, 1d')
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(10)

            const row = new ActionRowBuilder().addComponents(cooldownInput)
            modal.addComponents(row)

            return interaction.showModal(modal)
        }

        // Handle remove cooldown
        if (selectedValue === 'remove') {
            removeCommandCooldown(interaction.guildId, interaction.user.id, selectedCommand)
            cooldownCommandSelection.delete(userKey)
            
            // Get updated session
            const updatedSession = getSession(interaction.guildId, interaction.user.id)
            
            // Update the ephemeral cooldown config UI (keep it open for more changes)
            const { content, components } = buildCooldownConfigUI(client, updatedSession)
            await interaction.update({
                content: content,
                embeds: [],
                components: components
            })
            return
        }

        // Handle preset cooldown
        const cooldownMs = parseInt(selectedValue, 10)
        
        if (isNaN(cooldownMs) || cooldownMs <= 0) {
            const { content, components } = buildCooldownConfigUI(client, session, selectedCommand)
            return interaction.update({
                content: content + `\n\n⚠️ Invalid cooldown value.`,
                embeds: [],
                components: components
            })
        }

        // Set the cooldown in session
        setCommandCooldown(interaction.guildId, interaction.user.id, selectedCommand, cooldownMs)
        cooldownCommandSelection.delete(userKey)

        // Get updated session
        const updatedSession = getSession(interaction.guildId, interaction.user.id)
        
        // Update the ephemeral cooldown config UI (keep it open for more changes)
        const { content, components } = buildCooldownConfigUI(client, updatedSession)
        await interaction.update({
            content: content,
            embeds: [],
            components: components
        })
    }
}
