/**
 * Handler for sticky command manager - remove individual command selection
 * CustomId: cmd{scm_remove_cmd_select}
 * Handles selection of individual commands to remove after channel is selected
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { SUPPORTED_COMMANDS } = require("../slash-commands/sticky-cmd-manager.js")
const { getOrCreateSession, updateSession } = require("../handler/stickyManagerSession.js")
const { removeChannelSelection, buildRemoveCommandSelection, buildRemoveConfirmation } = require("./scm-remove-select.js")

module.exports = {
    name: `scm_remove_cmd_select`,
    run: async (client, interaction) => {
        const selectedValues = interaction.values
        
        // Check if "Delete All" was selected
        if (selectedValues.includes('delete_all')) {
            // Get the selected channel
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
            // Individual command(s) selected - filter out 'delete_all' if somehow included
            const selectedKeys = selectedValues.filter(v => v !== 'delete_all')
            
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
