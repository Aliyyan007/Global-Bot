/**
 * Handler for sticky command manager - custom cooldown modal submission
 * CustomId: cmd{scm_cd_custom}_{commandName}
 * **Validates: Requirements 4.4**
 */

const { getSession, setCommandCooldown } = require("../handler/stickyManagerSession.js")
const { parseCooldown } = require("../handler/cooldownParser.js")
const { cooldownCommandSelection, buildCooldownConfigUI } = require("./scm-cd-cmd.js")

module.exports = {
    name: 'scm_cd_custom',
    isModal: true, // Flag to indicate this handles modal submissions
    run: async (client, interaction) => {
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.reply({
                content: `Session expired. Please run /sticky-cmd-manager again.`,
                flags: ["Ephemeral"]
            })
        }

        // Extract command name from customId
        // Format: cmd{scm_cd_custom}_{commandName}
        const customIdMatch = interaction.customId.match(/cmd\{scm_cd_custom\}_(.+)/)
        const selectedCommand = customIdMatch ? customIdMatch[1] : null
        
        if (!selectedCommand) {
            return interaction.reply({
                content: `Error processing command.`,
                flags: ["Ephemeral"]
            })
        }

        // Get the cooldown value from modal input
        const cooldownInput = interaction.fields.getTextInputValue('cooldown_value')
        
        // Parse the cooldown using cooldownParser
        const cooldownMs = parseCooldown(cooldownInput)

        if (cooldownMs === null) {
            return interaction.reply({
                content: `Invalid cooldown format. Use format: 30min, 2h, or 1d`,
                flags: ["Ephemeral"]
            })
        }

        // Set the cooldown in session
        setCommandCooldown(interaction.guildId, interaction.user.id, selectedCommand, cooldownMs)
        
        // Clean up temporary selection
        const userKey = `${interaction.guildId}_${interaction.user.id}`
        cooldownCommandSelection.delete(userKey)

        // Get updated session
        const updatedSession = getSession(interaction.guildId, interaction.user.id)
        
        // Build the cooldown config UI
        const { content, components } = buildCooldownConfigUI(client, updatedSession)
        
        // Format the cooldown for display
        const formatCooldown = (ms) => {
            if (ms >= 86400000) return `${Math.floor(ms / 86400000)}d`
            if (ms >= 3600000) return `${Math.floor(ms / 3600000)}h`
            return `${Math.floor(ms / 60000)}min`
        }

        // Defer the update first, then edit the message that triggered the modal
        // This allows us to update the existing ephemeral instead of sending a new one
        await interaction.deferUpdate()
        
        // Edit the original ephemeral message
        await interaction.editReply({
            content: `✅ **Cooldown Set:** ${selectedCommand} → ${formatCooldown(cooldownMs)}\n\n` + content,
            components: components
        })
    }
}
