/**
 * Handler for sticky command manager - command selection
 * CustomId: cmd{scm_add_cmds}
 * **Validates: Requirements 2.3**
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js")
const { SUPPORTED_COMMANDS, MENU_OPTIONS } = require("../slash-commands/sticky-cmd-manager.js")
const { getSession, updateSession } = require("../handler/stickyManagerSession.js")
const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")

module.exports = {
    name: `scm_add_cmds`,
    run: async (client, interaction) => {
        // Get session for this user
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.reply({
                content: `${client.config.emojis.NO} ${client.language({ textId: "Your session has expired. Please run /sticky-cmd-manager again.", guildId: interaction.guildId, locale: interaction.locale })}`,
                flags: ["Ephemeral"]
            })
        }

        // Update session with selected commands
        const selectedCommands = interaction.values
        updateSession(interaction.guildId, interaction.user.id, {
            selectedCommands: selectedCommands
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
