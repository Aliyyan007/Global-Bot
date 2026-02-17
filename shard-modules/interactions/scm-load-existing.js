/**
 * Handler for sticky command manager - load existing sticky command
 * CustomId: cmd{scm_load_existing}
 * Loads existing sticky command configurations for a channel into the session for viewing/editing
 */

const { EmbedBuilder } = require("discord.js")
const { getOrCreateSession, updateSession, getSession } = require("../handler/stickyManagerSession.js")
const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")

module.exports = {
    name: `scm_load_existing`,
    run: async (client, interaction) => {
        // Get the selected value (format: channel_{channelId})
        const selectedValue = interaction.values[0]
        
        // Extract channel ID from the value
        const channelId = selectedValue.replace('channel_', '')
        
        // Get all sticky commands for this channel
        const channelConfigs = []
        for (const [key, config] of client.cache.stickyCommands) {
            if (config.guildID === interaction.guildId && config.channelID === channelId) {
                channelConfigs.push({ key, ...config })
            }
        }
        
        if (channelConfigs.length === 0) {
            return interaction.reply({
                content: `No sticky commands found for this channel.`,
                flags: ["Ephemeral"]
            })
        }

        // Sort by createdAt to maintain order
        channelConfigs.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateA - dateB
        })

        // Get or create session for this user
        getOrCreateSession(interaction.guildId, interaction.user.id)

        // Build cooldowns Map from all configs
        const cooldowns = new Map()
        for (const config of channelConfigs) {
            if (config.cooldown) {
                cooldowns.set(config.commandName, config.cooldown)
            }
        }

        // Build requirements Map from all configs
        const requirements = new Map()
        for (const config of channelConfigs) {
            if (config.requirements && config.requirements.length > 0) {
                requirements.set(config.commandName, config.requirements)
            }
        }

        // Get all command names
        const selectedCommands = channelConfigs.map(c => c.commandName)

        // Use the first config's embed message (they should all be the same for combined messages)
        const firstConfig = channelConfigs[0]

        // Update session with the loaded configuration
        updateSession(interaction.guildId, interaction.user.id, {
            selectedCommands: selectedCommands,
            selectedChannels: [channelId],
            messageContent: firstConfig.embedMessage?.content || null,
            messageEmbed: firstConfig.embedMessage?.embed || null,
            cooldowns: cooldowns,
            requirements: requirements,
            publicMessageId: interaction.message.id,
            channelId: interaction.channelId,
            selectedForRemoval: []
        })

        // Get updated session
        const updatedSession = getSession(interaction.guildId, interaction.user.id)

        // Build embeds array
        const embeds = []
        
        // Add message preview embed if configured
        if (updatedSession.messageEmbed) {
            const previewEmbed = EmbedBuilder.from(updatedSession.messageEmbed)
            embeds.push(previewEmbed)
        }
        
        // Add the main config embed
        const configEmbed = buildPreviewEmbed(client, interaction, updatedSession)
        embeds.push(configEmbed)

        // Build components
        const components = buildAddPanelComponents(client, interaction, updatedSession)

        await interaction.update({
            content: updatedSession.messageContent || null,
            embeds: embeds,
            components: components
        })
    }
}
