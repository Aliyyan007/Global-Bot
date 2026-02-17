/**
 * Handler for sticky command manager - channel selection
 * CustomId: cmd{scm_add_channels}
 * **Validates: Requirements 2.4**
 */

const { getSession, updateSession } = require("../handler/stickyManagerSession.js")
const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")

module.exports = {
    name: `scm_add_channels`,
    run: async (client, interaction) => {
        // Get session for this user
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.reply({
                content: `${client.config.emojis.NO} Your session has expired. Please run /sticky-cmd-manager again.`,
                flags: ["Ephemeral"]
            })
        }

        // Update session with selected channels
        // For ChannelSelectMenu, channels are in interaction.channels (Collection), not interaction.values
        const selectedChannels = interaction.channels ? Array.from(interaction.channels.keys()) : interaction.values
        updateSession(interaction.guildId, interaction.user.id, {
            selectedChannels: selectedChannels
        })

        // Rebuild the Add Panel with updated state
        const updatedSession = getSession(interaction.guildId, interaction.user.id)
        const embed = buildPreviewEmbed(client, interaction, updatedSession)
        const components = buildAddPanelComponents(client, interaction, updatedSession)

        await interaction.update({
            embeds: [embed],
            components: components
        })
    }
}
