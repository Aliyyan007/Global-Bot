const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder, Collection } = require("discord.js")
const { parseDuration, formatDuration, assignTempRole, extendTempRole, removeTempRole, getTempRoleConfigs, getActiveTempRoles, getUserTempRoles } = require('../modules/tempRoleManager')

module.exports = {
    name: 'temprole-manager',
    description: 'Manage temporary roles - configure, assign, extend, and monitor role expirations',
    defaultMemberPermissions: PermissionFlagsBits.ManageRoles,
    dmPermission: false,
    // guildOnly: false, // Registers as global command (default behavior)
    group: 'moderation-group',
    cooldowns: new Collection(),
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        await interaction.deferReply()
        
        const mainEmbed = new EmbedBuilder()
            .setColor(3093046)
            .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
            .setDescription('```yaml\nManage roles that automatically expire after set durations\n```\n**Features:**\n> • Configure roles as temporary with default durations\n> • Assign temporary roles to users\n> • Extend role durations\n> • Monitor active temporary roles\n> • View role expiration times')
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp()
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`cmd{temprole-manager-menu}-usr{${interaction.user.id}}`)
            .setPlaceholder('🎯 Select an action...')
            .addOptions([
                {
                    label: 'Configure Temp Roles',
                    description: 'Set roles as temporary with durations',
                    value: 'configure',
                    emoji: '📋'
                },
                {
                    label: 'View Active Assignments',
                    description: 'See all active temporary role assignments',
                    value: 'active',
                    emoji: '👥'
                },
                {
                    label: 'Assign Temp Role',
                    description: 'Assign a temporary role to a user',
                    value: 'assign',
                    emoji: '➕'
                },
                {
                    label: 'Extend Role Duration',
                    description: 'Extend temporary role expiration',
                    value: 'extend',
                    emoji: '⏰'
                },
                {
                    label: 'Remove Configuration',
                    description: 'Remove temp role configurations',
                    value: 'remove',
                    emoji: '🗑️'
                },
                {
                    label: 'View Statistics',
                    description: 'View temporary role statistics',
                    value: 'stats',
                    emoji: '📊'
                }
            ])
        
        const row = new ActionRowBuilder().addComponents(selectMenu)
        
        await interaction.editReply({
            embeds: [mainEmbed],
            components: [row]
        })
    }
}
