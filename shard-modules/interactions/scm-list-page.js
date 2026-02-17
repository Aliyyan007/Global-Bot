const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { SUPPORTED_COMMANDS, MENU_OPTIONS } = require("../slash-commands/sticky-cmd-manager.js")
const { ITEMS_PER_PAGE, formatCooldown, buildListEmbed, buildListPaginationComponents } = require("./sticky-cmd-manager-menu.js")

module.exports = {
    name: `scm_list_page`,
    run: async (client, interaction) => {
        // Extract page number from customId (format: scm_list_page_{pageNumber})
        const customId = interaction.customId.replace('cmd{', '').replace('}', '')
        const pageMatch = customId.match(/scm_list_page_(\d+)/)
        
        if (!pageMatch) {
            return await interaction.reply({
                content: `${client.config.emojis.NO} Invalid page format`,
                flags: ["Ephemeral"]
            })
        }
        
        const page = parseInt(pageMatch[1], 10)
        
        // Get all sticky commands for this guild
        const guildStickyCommands = []
        for (const [key, value] of client.cache.stickyCommands) {
            if (value.guildID === interaction.guildId) {
                guildStickyCommands.push({ key, ...value })
            }
        }
        
        // Sort by creation date (newest first)
        guildStickyCommands.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
            return dateB - dateA
        })
        
        // Validate page number
        const totalPages = Math.ceil(guildStickyCommands.length / ITEMS_PER_PAGE)
        if (page < 0 || page >= totalPages) {
            return await interaction.reply({
                content: `${client.config.emojis.NO} Invalid page number`,
                flags: ["Ephemeral"]
            })
        }
        
        // Build embed and components
        const embed = buildListEmbed(client, interaction, guildStickyCommands, page)
        const components = buildListPaginationComponents(client, interaction, guildStickyCommands.length, page)

        await interaction.update({
            embeds: [embed],
            components: components
        })
    }
}
