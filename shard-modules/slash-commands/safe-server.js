/**
 * Safe-Server Command - Comprehensive Permission Restriction System
 * Protects servers from moderator abuse by monitoring and restricting dangerous permissions
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js')
const safeServerSchema = require('../schemas/safeServerSchema')
const moderationSystemSchema = require('../schemas/moderationSystemSchema')

const commandBuilder = new SlashCommandBuilder()
    .setName("safe-server")
    .setDescription("Configure anti-abuse protection for your server (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

module.exports = {
    ...commandBuilder.toJSON(),
    permissions: [],
    owner: false,
    cooldowns: {},

    run: async (client, interaction) => {
        // Admin check
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setDescription('❌ Only administrators can use this command.')
                ],
                ephemeral: true
            })
        }

        try {
            await showControlPanel(client, interaction)
        } catch (error) {
            console.error('[SafeServer Command] Error:', error)
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xE74C3C)
                            .setDescription(`❌ An error occurred: ${error.message}`)
                    ],
                    ephemeral: true
                }).catch(console.error)
            }
        }
    }
}

// ==================== CONTROL PANEL ====================

async function showControlPanel(client, interaction) {
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeServerSchema({ guildID: interaction.guild.id })
        await config.save()
    }

    const embed = buildControlPanelEmbed(config, interaction.guild)
    const components = buildControlPanelComponents(config)

    const method = interaction.replied || interaction.deferred ? 'editReply' : 'reply'
    await interaction[method]({
        embeds: [embed],
        components: components
    })
}

function buildControlPanelEmbed(config, guild) {
    const embed = new EmbedBuilder()
        .setColor(config.enabled ? 0x2ECC71 : 0x95A5A6)
        .setDescription('**Safe Server Settings**')

    // Build permissions list - split into multiple fields to avoid 1024 char limit
    const permissionsList = [
        { key: 'banMembers', label: 'Ban Members' },
        { key: 'kickMembers', label: 'Kick Members' },
        { key: 'timeoutMembers', label: 'Timeout Members' },
        { key: 'deleteRole', label: 'Delete Role' },
        { key: 'deleteChannel', label: 'Delete Channel (VC, Stage and Text Channels)' },
        { key: 'deleteMessages', label: 'Delete Messages' },
        { key: 'changeNickname', label: 'Change Nickname' },
        { key: 'addingMassBots', label: 'Adding Mass Bots' },
        { key: 'disconnectingMembers', label: 'Disconnecting Members from VC' },
        { key: 'movingMembers', label: 'Moving Members from VC' },
        { key: 'mutingMembers', label: 'Muting Members from VC' },
        { key: 'everyoneHereSpam', label: '@everyone / @here Spam' }
    ]

    // Split permissions into groups of 4 to avoid field length limit
    const groups = []
    for (let i = 0; i < permissionsList.length; i += 4) {
        groups.push(permissionsList.slice(i, i + 4))
    }

    // Add permissions header
    embed.addFields({ name: 'Permissions:', value: '\u200b', inline: false })

    // Add each group as a separate field
    groups.forEach((group, index) => {
        let groupText = ''
        
        for (const perm of group) {
            const permConfig = config.permissions[perm.key]
            const statusEmoji = permConfig.enabled ? '✅' : '❌'
            const cooldownText = permConfig.cooldown === -1 ? 'Approval' : formatDuration(permConfig.cooldown)
            const timeBetweenText = formatDuration(permConfig.timeBetweenActions)
            const restrictionText = permConfig.restrictionType === 'global' ? 'Global' : 'Specific'
            
            groupText += `${statusEmoji} **${perm.label}**\n`
            groupText += `⤷ Cooldown: ${cooldownText} | Actions: ${permConfig.actionCount} | Restriction: ${restrictionText} | Time: ${timeBetweenText}\n\n`
        }
        
        embed.addFields({ name: '\u200b', value: groupText, inline: false })
    })

    // Log Channel
    const logChannelText = config.logChannelId ? `<#${config.logChannelId}>` : 'Not Set'
    embed.addFields({ name: 'Log Channel:', value: logChannelText, inline: false })

    // Manager Roles
    const managerRolesText = config.managerRoles && config.managerRoles.length > 0 
        ? config.managerRoles.map(id => `<@&${id}>`).join(', ')
        : 'Not Set'
    embed.addFields({ name: 'Manager Roles:', value: managerRolesText, inline: false })

    // Bot Protection
    const botProtectionText = config.botProtection.enabled ? 'Enabled' : 'Disabled'
    embed.addFields({ name: 'Bot Protection:', value: botProtectionText, inline: false })

    // Note
    embed.addFields({ 
        name: '\u200b', 
        value: '_Note: Global Restriction means the restriction will be for all server mods (RECOMMENDED)_', 
        inline: false 
    })

    // Footer
    const statusText = config.enabled ? 'Enabled' : 'Disabled'
    embed.setFooter({ text: `Status: ${statusText}` })

    return embed
}

function buildControlPanelComponents(config) {
    const components = []

    // Permission select menu
    const permissionSelect = new StringSelectMenuBuilder()
        .setCustomId('ss_select_permission')
        .setPlaceholder('Select a permission to configure')
        .setDisabled(!config.enabled)
        .addOptions([
            { label: 'Ban Members', value: 'banMembers', emoji: '🚫' },
            { label: 'Kick Members', value: 'kickMembers', emoji: '👢' },
            { label: 'Timeout Members', value: 'timeoutMembers', emoji: '⏸️' },
            { label: 'Delete Role', value: 'deleteRole', emoji: '🎭' },
            { label: 'Delete Channel', value: 'deleteChannel', emoji: '🗑️' },
            { label: 'Delete Messages', value: 'deleteMessages', emoji: '💬' },
            { label: 'Change Nickname', value: 'changeNickname', emoji: '✏️' },
            { label: 'Adding Mass Bots', value: 'addingMassBots', emoji: '🤖' },
            { label: 'Disconnecting Members from VC', value: 'disconnectingMembers', emoji: '🔌' },
            { label: 'Moving Members from VC', value: 'movingMembers', emoji: '🔀' },
            { label: 'Muting Members from VC', value: 'mutingMembers', emoji: '🔇' },
            { label: '@everyone / @here Spam', value: 'everyoneHereSpam', emoji: '📢' }
        ])

    components.push(new ActionRowBuilder().addComponents(permissionSelect))

    // Settings select menu (only shows when a permission is selected - handled in interaction)
    // This will be added dynamically

    // Main buttons row 1
    const buttonsRow1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_toggle_system')
                .setLabel(config.enabled ? 'Disable Safe Server' : 'Enable Safe Server')
                .setEmoji(config.enabled ? '❌' : '✅')
                .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ss_toggle_bot_protection')
                .setLabel(config.botProtection.enabled ? 'Disable Bot Protection' : 'Enable Bot Protection')
                .setEmoji(config.botProtection.enabled ? '❌' : '✅')
                .setStyle(config.botProtection.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setDisabled(!config.enabled)
        )

    components.push(buttonsRow1)

    // Main buttons row 2
    const buttonsRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_edit_log_channel')
                .setLabel('Edit Log Channel')
                .setEmoji('📢')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!config.enabled),
            new ButtonBuilder()
                .setCustomId('ss_edit_manager_roles')
                .setLabel('Edit Manager Roles')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!config.enabled)
        )

    components.push(buttonsRow2)

    return components
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''}`
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} month${Math.floor(seconds / 2592000) > 1 ? 's' : ''}`
    return `${Math.floor(seconds / 31536000)} year${Math.floor(seconds / 31536000) > 1 ? 's' : ''}`
}
