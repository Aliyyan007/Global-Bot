/**
 * Handler for sticky command manager - cooldown done button
 * CustomId: cmd{scm_cd_done}
 * Updates the public message with cooldown changes and dismisses ephemeral
 */

const { EmbedBuilder } = require("discord.js")
const { getSession } = require("../handler/stickyManagerSession.js")
const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")

module.exports = {
    name: 'scm_cd_done',
    run: async (client, interaction) => {
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.update({
                content: `${client.config.emojis.NO} Session expired. Please run /sticky-cmd-manager again.`,
                components: []
            })
        }

        // Build the updated embeds and components for the public message
        const embeds = []
        if (session.messageEmbed) {
            const previewEmbed = EmbedBuilder.from(session.messageEmbed)
            embeds.push(previewEmbed)
        }
        const configEmbed = buildPreviewEmbed(client, interaction, session)
        embeds.push(configEmbed)
        const panelComponents = buildAddPanelComponents(client, interaction, session)

        // Update the public message
        try {
            const channel = interaction.channel
            if (channel && session.publicMessageId) {
                const publicMessage = await channel.messages.fetch(session.publicMessageId)
                if (publicMessage) {
                    await publicMessage.edit({
                        content: session.messageContent || null,
                        embeds: embeds,
                        components: panelComponents
                    })
                }
            }

            // Update the ephemeral message to show success and dismiss
            await interaction.update({
                content: `${client.config.emojis.YES} **Cooldowns Saved**\n\nThe configuration panel has been updated.`,
                components: []
            })
        } catch (e) {
            console.error('Error updating public message:', e)
            await interaction.update({
                content: `${client.config.emojis.YES} Cooldowns saved! The panel will update on next interaction.`,
                components: []
            })
        }
    }
}
