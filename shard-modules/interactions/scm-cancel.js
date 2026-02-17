/**
 * Handler for sticky command manager - cancel button
 * CustomId: cmd{scm_cancel}
 * Cancels the current configuration and returns to main menu
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js")
const { MENU_OPTIONS } = require("../slash-commands/sticky-cmd-manager.js")
const { deleteSession } = require("../handler/stickyManagerSession.js")

module.exports = {
    name: `scm_cancel`,
    run: async (client, interaction) => {
        // Delete the session
        deleteSession(interaction.guildId, interaction.user.id)

        // Return to main menu
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setDescription(`${client.config.emojis.YES} **Cancelled**\n\nYour changes have been discarded.`)

        // Create main menu select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('cmd{sticky-cmd-manager-menu}')
            .setPlaceholder('Select action')
            .addOptions(MENU_OPTIONS.map(option => ({
                label: option.label,
                description: option.description,
                value: option.value,
                emoji: option.emoji
            })))

        const row = new ActionRowBuilder().addComponents(selectMenu)

        await interaction.update({
            embeds: [embed],
            components: [row]
        })
    }
}
