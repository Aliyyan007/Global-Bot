const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, Collection } = require("discord.js")
const { getOrCreateSession, updateSession } = require("../handler/stickyManagerSession.js")

// Supported commands that can be configured as sticky
const SUPPORTED_COMMANDS = [
    {
        name: 'profile',
        label: 'Profile',
        emoji: '<:Profile:1452116336892182569>',
        buttons: ['View Profile', 'Edit Profile', 'View Others']
    },
    {
        name: 'rank',
        label: 'Rank',
        emoji: '🏆',
        buttons: ['View Rank', 'Edit Rank', 'View Others']
    },
    {
        name: 'shop',
        label: 'Shop',
        emoji: '🛒',
        buttons: ['Shop']
    },
    {
        name: 'inventory',
        label: 'Inventory',
        emoji: '🎒',
        buttons: ['Inventory']
    },
    {
        name: 'quests',
        label: 'Quests',
        emoji: '📜',
        buttons: ['Quests']
    }
]

// Main menu options
const MENU_OPTIONS = [
    {
        label: 'Add Sticky Commands',
        description: 'Add new sticky command buttons to channels',
        value: 'add',
        emoji: '➕'
    },
    {
        label: 'Remove Sticky Commands',
        description: 'Remove existing sticky command configurations',
        value: 'remove',
        emoji: '➖'
    },
    {
        label: 'List Sticky Commands',
        description: 'View all configured sticky commands',
        value: 'list',
        emoji: '📋'
    }
]

module.exports = {
    name: 'sticky-cmd-manager',
    nameLocalizations: {
        'ru': `закреп-команды`,
        'uk': `закріп-команди`,
        'es-ES': `gestor-comandos-fijos`
    },
    description: 'Manage sticky command buttons in channels',
    descriptionLocalizations: {
        'ru': `Управление закрепленными командами в каналах`,
        'uk': `Управління закріпленими командами в каналах`,
        'es-ES': `Gestionar botones de comandos fijos en canales`
    },
    // No options - all interaction via select menus
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `managers`,
    cooldowns: new Collection(),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {Object} args
     */
    run: async (client, interaction, args) => {
        // Create main menu embed
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setTitle(`Sticky Command Manager`)
            .setDescription(`Select an action from the menu below to manage sticky commands.`)
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTimestamp()

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

        const reply = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        })
        
        // Store the message ID in session for later updates
        getOrCreateSession(interaction.guildId, interaction.user.id)
        updateSession(interaction.guildId, interaction.user.id, {
            publicMessageId: reply.id,
            channelId: interaction.channelId
        })
    }
}

// Export SUPPORTED_COMMANDS and MENU_OPTIONS for use in other files
module.exports.SUPPORTED_COMMANDS = SUPPORTED_COMMANDS
module.exports.MENU_OPTIONS = MENU_OPTIONS
