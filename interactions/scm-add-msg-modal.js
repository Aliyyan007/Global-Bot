/**
 * Handler for sticky command manager - add message modal submission
 * CustomId: cmd{scm_add_msg_modal}
 * Validates the message link and updates the session
 */

const { EmbedBuilder } = require("discord.js")
const { getSession, updateSession } = require("../handler/stickyManagerSession.js")
const { buildPreviewEmbed, buildAddPanelComponents } = require("./sticky-cmd-manager-menu.js")
const { validateAndFetchMessage, extractMessageData } = require("./scm-add-message.js")

module.exports = {
    name: 'scm_add_msg_modal',
    isModal: true, // Flag to indicate this handles modal submissions
    run: async (client, interaction) => {
        // Defer update to the original message
        await interaction.deferUpdate()
        
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.followUp({
                content: `Session expired. Please run /sticky-cmd-manager again.`,
                flags: ["Ephemeral"]
            })
        }

        // Get the message link from the modal
        const messageLink = interaction.fields.getTextInputValue('message_link')

        // Validate and fetch the message
        const result = await validateAndFetchMessage(client, interaction, messageLink)

        if (!result.success) {
            return interaction.followUp({
                content: `❌ **Error:** Invalid message link.\n\n` +
                         `• Right-click a message → Copy Message Link\n` +
                         `• Message must be from this bot\n` +
                         `• Message must be in this server`,
                flags: ["Ephemeral"]
            })
        }

        // Extract content and embed from the message
        const messageData = extractMessageData(result.message)

        // Check if message has any content or embed
        if (!messageData.content && !messageData.embed) {
            return interaction.followUp({
                content: `❌ **Error:** Message does not contain text or embed.`,
                flags: ["Ephemeral"]
            })
        }

        // Update session with message data
        updateSession(interaction.guildId, interaction.user.id, {
            messageContent: messageData.content,
            messageEmbed: messageData.embed
        })

        // Get updated session
        const updatedSession = getSession(interaction.guildId, interaction.user.id)

        // Build embeds array - include message preview if there's an embed
        const embeds = []
        
        if (messageData.embed) {
            // Add the actual embed preview
            const previewEmbed = EmbedBuilder.from(messageData.embed)
            embeds.push(previewEmbed)
        }
        
        // Add the main config embed
        const configEmbed = buildPreviewEmbed(client, interaction, updatedSession)
        embeds.push(configEmbed)
        
        const components = buildAddPanelComponents(client, interaction, updatedSession)

        // Edit the original public message
        await interaction.editReply({
            content: messageData.content || null,
            embeds: embeds,
            components: components
        })
    }
}
