/**
 * Safe-Moderation Command - Comprehensive Permission Restriction System
 * Protects servers from moderator abuse by monitoring and restricting dangerous permissions
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, Collection } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('SafeModCmd')

function hex2rgb(color) {
    const r = color.match(/^#(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}))$/i);
    if (!r) return [0, 0, 0];
    return [parseInt(r[2], 16), parseInt(r[3], 16), parseInt(r[4], 16)];
}

const commandBuilder = new SlashCommandBuilder()
    .setName("safe-moderation")
    .setDescription("Configure anti-abuse protection for your server (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

module.exports = {
    ...commandBuilder.toJSON(),
    group: 'admins-group',
    permissions: [],
    owner: false,
    cooldowns: new Collection(),

    run: async (client, interaction) => {
        // Check if user is server owner OR (has Administrator permission AND role >= bot's role)
        const botMember = await interaction.guild.members.fetchMe()
        const botHighestRole = botMember.roles.highest
        const userHighestRole = interaction.member.roles.highest

        const isOwner = interaction.user.id === interaction.guild.ownerId
        const hasAdminPerm = interaction.member.permissions.has(PermissionFlagsBits.Administrator)
        const hasEqualOrHigherRole = userHighestRole.position >= botHighestRole.position

        // Owner can always use, OR user must have BOTH admin permission AND equal/higher role
        if (!isOwner && !(hasAdminPerm && hasEqualOrHigherRole)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setDescription('❌ You must be the server owner or have Administrator permission with a role at or above the bot\'s role to use this command.')
                ],
                ephemeral: true
            })
        }

        try {
            await showControlPanel(client, interaction)
        } catch (error) {
            log.error('[SafeModCmd] Error:', error)
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xE74C3C)
                            .setDescription(`❌ An error occurred: ${error.message}`)
                    ],
                    ephemeral: true
                }).catch(err => log.error('[SafeModCmd] Error:', err))
            }
        }
    }
}

// ==================== CONTROL PANEL ====================

async function showControlPanel(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeModerationSchema({ guildID: interaction.guild.id })
        await config.save()
    }

    // Fetch the clear-restrictions command ID for the note
    // Try guild commands first (since it's a guild-specific command), then fall back to global
    let clearRestrictionsCommandId = null;
    try {
        // Try guild commands first
        const guildCommands = await interaction.guild.commands.fetch();
        const clearRestrictionsCmd = guildCommands.find(cmd => cmd.name === 'clear-restrictions');
        if (clearRestrictionsCmd) {
            clearRestrictionsCommandId = clearRestrictionsCmd.id;
            log.debug('[SafeModCmd] ✅ Found clear-restrictions command ID (guild):', clearRestrictionsCommandId);
        } else {
            // Fall back to global commands if not found in guild
            const globalCommands = await client.application.commands.fetch();
            const globalCmd = globalCommands.find(cmd => cmd.name === 'clear-restrictions');
            if (globalCmd) {
                clearRestrictionsCommandId = globalCmd.id;
                log.debug('[SafeModCmd] ✅ Found clear-restrictions command ID (global):', clearRestrictionsCommandId);
            } else {
                log.warn('[SafeModCmd] ⚠️ clear-restrictions command not found in guild or global commands');
                log.warn('[SafeModCmd] Available guild commands:', guildCommands.map(c => c.name).join(', '));
                log.warn('[SafeModCmd] Available global commands:', globalCommands.map(c => c.name).join(', '));
            }
        }
    } catch (error) {
        log.error('[SafeModCmd] ❌ Error fetching clear-restrictions command ID:', error);
    }

    const container = await buildControlPanelContainer(config, interaction.guild, clearRestrictionsCommandId)
    const components = await buildControlPanelComponents(config, interaction.guild.client, clearRestrictionsCommandId)

    const method = interaction.replied || interaction.deferred ? 'editReply' : 'reply'
    await interaction[method]({
        components: [container, ...components],
        flags: [MessageFlags.IsComponentsV2]
    })
}

async function buildControlPanelContainer(config, guild, clearRestrictionsCommandId = null) {
    // Create Compact V2 style container
    const accentColor = config.enabled ? '#2ECC71' : '#95A5A6';
    const container = new ContainerBuilder()
        .setAccentColor(hex2rgb(accentColor));

    // Title
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Safe Moderation Settings')
    );

    // Build permissions list
    const permissionsList = [
        { key: 'banKickMembers', label: 'Ban & Kick Members' },
        { key: 'timeoutMembers', label: 'Timeout Members' },
        { key: 'deleteRole', label: 'Delete Role' },
        { key: 'deleteChannel', label: 'Delete Channel (VC, Stage and Text Channels)' },
        { key: 'deleteEmojisStickers', label: 'Deleting Emojis & Stickers' },
        { key: 'deleteMessages', label: 'Delete Messages' },
        { key: 'changeNickname', label: 'Change Nickname' },
        { key: 'addingMassBots', label: 'Adding Mass Bots' },
        { key: 'voiceModeration', label: 'Disconnecting or Moving Members from VC' },
        { key: 'mutingMembers', label: 'Muting Members from VC' },
        { key: 'deafeningMembers', label: 'Deafening Members from VC' },
        { key: 'everyoneHereSpam', label: '@everyone / @here Spam' }
    ]

    // Permissions section
    let permissionsText = '## Permissions:\n'
    for (const perm of permissionsList) {
        const permConfig = config.permissions[perm.key]
        const statusEmoji = permConfig.enabled ? '✅' : '❌'
        const cooldownText = permConfig.cooldown === -1 ? 'Approval' : formatDuration(permConfig.cooldown)
        const timeBetweenText = formatDuration(permConfig.timeBetweenActions)
        const restrictionText = permConfig.restrictionType === 'global' ? 'Global' : 'Specific'
        
        permissionsText += `###\n${statusEmoji} ${perm.label}\n`
        permissionsText += `⤷ **Cooldown:** \`${cooldownText}\` **|** **Actions:** \`${permConfig.actionCount}\` **|** **Restriction:** \`${restrictionText}\` **|** **Time b/w Actions:** \`${timeBetweenText}\`\n`
    }
    
    // Add Spam Prevention System (always show, even for old configs without this field)
    {
        const spamConfig = config.spamPrevention || { enabled: false, punishmentType: 'TIMEOUT', punishmentDuration: '2days', actionsLimit: 5, restrictionType: 'global', timeBetweenActions: 10 }
        const statusEmoji = spamConfig.enabled ? '✅' : '❌'
        
        let punishmentText = spamConfig.punishmentType || 'TIMEOUT'
        if (spamConfig.punishmentType === 'TIMEOUT') {
            const duration = spamConfig.punishmentDuration === '0' ? 'Permanent' : (spamConfig.punishmentDuration || '2days')
            punishmentText = `${duration} ⏱`
        }
        
        const timeBetweenText = formatDuration(spamConfig.timeBetweenActions || 10)
        const restrictionText = spamConfig.restrictionType === 'global' ? 'Global' : 
                               spamConfig.restrictionType === 'role-based' ? 'Role-Based' : 'Channel-Based'
        
        permissionsText += `###\n${statusEmoji} Spam Prevention System\n`
        permissionsText += `⤷ **Punishment:** \`${punishmentText}\` **|** **Actions:** \`${spamConfig.actionsLimit || 5}\` **|** **Restriction:** \`${restrictionText}\` **|** **Time b/w Actions:** \`${timeBetweenText}\`\n`
    }
    
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(permissionsText)
    );

    // Webhook Link section
    let webhookText = '### Webhook Link:\n'
    if (config.logWebhook) {
        try {
            const client = guild.client
            const webhookUrlParts = config.logWebhook.split('/')
            const webhookId = webhookUrlParts[webhookUrlParts.length - 2]
            
            if (webhookId && client) {
                const webhook = await client.fetchWebhook(webhookId).catch(() => null)
                
                if (webhook && webhook.channelId) {
                    const channelUrl = `https://discord.com/channels/${guild.id}/${webhook.channelId}`
                    webhookText += `[Webhook Link](${config.logWebhook})   (${channelUrl})`
                } else {
                    webhookText += `[Webhook Link](${config.logWebhook})`
                }
            } else {
                webhookText += `[Webhook Link](${config.logWebhook})`
            }
        } catch (error) {
            log.error('[SafeModCmd] Error in webhook section:', error)
            webhookText += `[Webhook Link](${config.logWebhook})`
        }
    } else {
        webhookText += 'Not Set'
    }
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(webhookText)
    );

    // Manager Roles section
    const managerRolesText = config.managerRoles && config.managerRoles.length > 0 
        ? config.managerRoles.map(id => `<@&${id}>`).join(', ')
        : 'Not Set'
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Manager Roles:\n${managerRolesText}`)
    );

    // Whitelisted Roles section
    const whitelistRolesText = config.whitelistRoles && config.whitelistRoles.length > 0 
        ? config.whitelistRoles.map(id => `<@&${id}>`).join(', ')
        : 'Not Set'
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Whitelisted Roles:\n${whitelistRolesText}`)
    );

    // Add Server Recovery and Bot Shield buttons inside container
    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ss_server_recovery')
            .setLabel('Server Recovery System')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('ss_sentinel_hub')
            .setLabel('Bot Shield System')
            .setEmoji('🛡️')
            .setStyle(ButtonStyle.Secondary)
    );
    
    container.addActionRowComponents(buttonRow);

    // Note inside container (updated as per requirements)
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('> **Note:** Global Restriction means the restriction will be for all server mods and all bots if bot shield is enabled (RECOMMENDED)')
    );

    // Server Recovery and Bot Shield status (condensed in one line)
    const recoveryStatus = config.serverRecovery?.enabled ? 'Enabled ✅' : 'Disabled ❌'
    const sentinelStatus = config.sentinelHub?.enabled ? 'Enabled ✅' : 'Disabled ❌'

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Server Recovery:** \`${recoveryStatus}\`ㅤ**Bot Shield:** \`${sentinelStatus}\``)
    );

    // Footer with combined system status and server panel status
    const statusText = config.enabled ? 'Enabled ✅' : 'Disabled ❌'
    const panelStatus = config.serverPanel?.enabled ? 'Enabled ✅' : 'Disabled ❌'

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**System Status:** \`${statusText}\`ㅤ**Server Panel:** \`${panelStatus}\``)
    );

    return container
}

async function buildControlPanelComponents(config, client, clearRestrictionsCommandId = null) {
    const components = []

    // Clear restrictions note (outside container, above selects)
    // Only show the command mention if we have a valid command ID
    let noteContent;
    if (clearRestrictionsCommandId) {
        noteContent = `> **Note:** Use the </clear-restrictions:${clearRestrictionsCommandId}> command to remove any active restrictions applied to a user.`;
    } else {
        noteContent = `> **Note:** Use the \`/clear-restrictions\` command to remove any active restrictions applied to a user.`;
    }
    const clearRestrictionsNote = new TextDisplayBuilder().setContent(noteContent);
    components.push(clearRestrictionsNote);

    // Permission select menu
    const permissionSelect = new StringSelectMenuBuilder()
        .setCustomId('ss_select_permission')
        .setPlaceholder('Select a permission to configure')
        .setDisabled(!config.enabled)
        .addOptions([
            { label: 'Ban & Kick Members', value: 'banKickMembers', emoji: '🚫' },
            { label: 'Timeout Members', value: 'timeoutMembers', emoji: '⏸️' },
            { label: 'Delete Role', value: 'deleteRole', emoji: '🎭' },
            { label: 'Delete Channel', value: 'deleteChannel', emoji: '🗑️' },
            { label: 'Deleting Emojis & Stickers', value: 'deleteEmojisStickers', emoji: '😀' },
            { label: 'Delete Messages', value: 'deleteMessages', emoji: '💬' },
            { label: 'Change Nickname', value: 'changeNickname', emoji: '✏️' },
            { label: 'Adding Mass Bots', value: 'addingMassBots', emoji: '🤖' },
            { label: 'Disconnecting or Moving Members from VC', value: 'voiceModeration', emoji: '🎤' },
            { label: 'Muting Members from VC', value: 'mutingMembers', emoji: '🔇' },
            { label: 'Deafening Members from VC', value: 'deafeningMembers', emoji: '🔊' },
            { label: '@everyone / @here Spam', value: 'everyoneHereSpam', emoji: '📢' },
            { label: 'Spam Prevention System', value: 'spamPrevention', emoji: '🛡️' }
        ])

    components.push(new ActionRowBuilder().addComponents(permissionSelect))

    // Settings select menu
    const settingsSelect = new StringSelectMenuBuilder()
        .setCustomId('ss_settings_select')
        .setPlaceholder('Edit settings')
        .setDisabled(!config.enabled)
        .addOptions([
            { label: 'Edit Webhook', value: 'edit_webhook', emoji: '🔗' },
            { label: 'Edit Manager Roles', value: 'edit_manager_roles', emoji: '👥' },
            { label: 'Manage Whitelist Roles', value: 'manage_whitelist_roles', emoji: '🛡️' }
        ])

    components.push(new ActionRowBuilder().addComponents(settingsSelect))

    // Main buttons row
    const buttonsRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_toggle_system')
                .setLabel(config.enabled ? 'Disable Safe Moderation' : 'Enable Safe Moderation')
                .setEmoji(config.enabled ? '❌' : '✅')
                .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ss_toggle_server_panel')
                .setLabel(config.serverPanel?.enabled ? 'Disable Server Panel' : 'Enable Server Panel')
                .setEmoji(config.serverPanel?.enabled ? '❌' : '✅')
                .setStyle(config.serverPanel?.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        )

    components.push(buttonsRow)

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
