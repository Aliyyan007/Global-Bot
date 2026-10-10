/**
 * Safe-Moderation Modal Handlers
 * Handles all modal submissions for the Safe-Moderation system
 */

const safeModerationSchema = require('../schemas/safeModerationSchema')
const { selectedPermissions } = require('./safe-moderation-shared-state')
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('SafeModModals')
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js')

function hex2rgb(color) {
    const r = color.match(/^#(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}))$/i);
    if (!r) return [0, 0, 0];
    return [parseInt(r[2], 16), parseInt(r[3], 16), parseInt(r[4], 16)];
}

/**
 * Helper function to fetch clear-restrictions command ID
 * Tries guild commands first (for guild-specific commands), then falls back to global
 */
async function fetchClearRestrictionsCommandId(client, guild) {
    try {
        // Try guild commands first (since it's a guild-specific command)
        const guildCommands = await guild.commands.fetch();
        const clearRestrictionsCmd = guildCommands.find(cmd => cmd.name === 'clear-restrictions');
        if (clearRestrictionsCmd) {
            return clearRestrictionsCmd.id;
        }
        
        // Fall back to global commands if not found in guild
        const globalCommands = await client.application.commands.fetch();
        const globalCmd = globalCommands.find(cmd => cmd.name === 'clear-restrictions');
        if (globalCmd) {
            return globalCmd.id;
        }
        
        return null;
    } catch (error) {
        log.error('[SafeModModals] Error fetching clear-restrictions command ID:', error);
        return null;
    }
}

// Routed via ss_ prefix in interactionCreate — no `name` export
// so this helper isn't registered as a cmd{} interaction (no run()).
module.exports = {
    async execute(client, interaction) {
        const customId = interaction.customId

        // Check if user is authorized to interact with this panel
        // Only the user who ran the command or administrators can interact
        const isAuthorized = await checkUserAuthorization(interaction)
        if (!isAuthorized) {
            return interaction.reply({
                content: '❌ Only the user who opened this panel or administrators can interact with it.',
                ephemeral: true
            })
        }

        try {
            if (customId === 'ss_modal_cooldown_custom') {
                await handleCooldownCustomModal(client, interaction)
            }
            else if (customId === 'ss_modal_action_count') {
                await handleActionCountModal(client, interaction)
            }
            else if (customId === 'ss_modal_time_between_custom') {
                await handleTimeBetweenCustomModal(client, interaction)
            }
            // Spam Prevention modals
            else if (customId === 'ss_spam_timeout_modal') {
                await handleSpamTimeoutModal(client, interaction)
            }
            else if (customId === 'ss_spam_actions_modal') {
                await handleSpamActionsModal(client, interaction)
            }
            else if (customId === 'ss_spam_time_between_modal') {
                await handleSpamTimeBetweenModal(client, interaction)
            }
        } catch (error) {
            log.error('[SafeModModals] Error:', error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your input.',
                    ephemeral: true
                }).catch(err => log.error('[SafeModModals] Error:', err))
            }
        }
    }
}

async function handleCooldownCustomModal(client, interaction) {
    const durationInput = interaction.fields.getTextInputValue('duration')
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    // Parse duration
    const duration = parseDuration(durationInput)

    if (!duration || duration < 60 || duration > 31536000) {
        return interaction.reply({
            content: '❌ Invalid duration. Please use format like: 3days, 5h, 30min (max 1 year)',
            ephemeral: true
        })
    }

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].cooldown = duration
    config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    await interaction.reply({
        content: `✅ Cooldown set to **${formatDuration(duration)}**`,
        ephemeral: true
    })
    
    // Refresh main panel
    await refreshMainPanel(interaction.client, interaction)
}

async function handleActionCountModal(client, interaction) {
    const countInput = interaction.fields.getTextInputValue('count')
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    const count = parseInt(countInput)

    if (isNaN(count) || count < 1 || count > 99) {
        return interaction.reply({
            content: '❌ Invalid count. Please enter a number between 1 and 99.',
            ephemeral: true
        })
    }

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].actionCount = count
    config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    await interaction.reply({
        content: `✅ Action count set to **${count}**`,
        ephemeral: true
    })
    
    // Refresh main panel
    await refreshMainPanel(interaction.client, interaction)
}

async function handleTimeBetweenCustomModal(client, interaction) {
    const durationInput = interaction.fields.getTextInputValue('duration')
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    const duration = parseDuration(durationInput)

    if (!duration || duration < 60 || duration > 31536000) {
        return interaction.reply({
            content: '❌ Invalid duration. Please use format like: 3days, 5h, 30min (max 1 year)',
            ephemeral: true
        })
    }

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].timeBetweenActions = duration
    config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    await interaction.reply({
        content: `✅ Time between actions set to **${formatDuration(duration)}**`,
        ephemeral: true
    })
    
    // Refresh main panel
    await refreshMainPanel(interaction.client, interaction)
}

// ==================== HELPER FUNCTIONS ====================

// ==================== HELPER FUNCTIONS ====================

/**
 * Refresh the main Safe-Moderation panel - SMART UPDATE (like /profile)
 * Directly updates the panel message without searching
 */
async function refreshMainPanel(client, interaction) {
    try {
        const config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
        if (!config) return
        
        // Fetch command ID using helper function
        const clearRestrictionsCommandId = await fetchClearRestrictionsCommandId(client, interaction.guild)
        
        // SMART APPROACH: Find the panel message efficiently
        // Only check the last 5 messages
        const messages = await interaction.channel.messages.fetch({ limit: 5 }).catch(() => null)
        if (!messages) return
        
        const panelMessage = messages.find(msg => 
            msg.author.id === client.user.id && 
            msg.components?.length > 0 &&
            msg.components.some(row => 
                row.components?.some(c => c.customId?.includes('ss_select_permission')) ||
                row.customId?.includes('ss_select_permission')
            )
        )
        
        if (panelMessage) {
            const container = await buildControlPanelContainer(client, config, interaction.guild, clearRestrictionsCommandId)
            const components = await buildControlPanelComponents(config, client, clearRestrictionsCommandId)
            await panelMessage.edit({ components: [container, ...components], flags: [MessageFlags.IsComponentsV2] })
        }
    } catch (error) {
        log.error('[SafeModModals] Error refreshing panel:', error)
    }
}

async function buildControlPanelContainer(client, config, guild, clearRestrictionsCommandId = null) {
    // Create Compact V2 style container
    const accentColor = config.enabled ? '#2ECC71' : '#95A5A6';
    const container = new ContainerBuilder()
        .setAccentColor(hex2rgb(accentColor));

    // Title
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Safe Moderation Settings')
    );

    // Build permissions list - UPDATED with combined permissions
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
        } else if (spamConfig.punishmentType === 'WARN') {
            punishmentText = 'Warn ⚠️'
        }
        
        const timeBetweenText2 = formatDuration(spamConfig.timeBetweenActions || 10)
        const restrictionText2 = spamConfig.restrictionType === 'global' ? 'Global' : 
                               spamConfig.restrictionType === 'role-based' ? 'Role-Based' : 'Channel-Based'
        
        permissionsText += `###\n${statusEmoji} Spam Prevention System\n`
        permissionsText += `⤷ **Punishment:** \`${punishmentText}\` **|** **Actions:** \`${spamConfig.actionsLimit || 5}\` **|** **Restriction:** \`${restrictionText2}\` **|** **Time b/w Actions:** \`${timeBetweenText2}\`\n`
    }
    
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(permissionsText)
    );

    // Webhook Link section
    let webhookText = '### Webhook Link:\n'
    if (config.logWebhook) {
        try {
            const webhookUrlParts = config.logWebhook.split('/')
            const webhookId = webhookUrlParts[webhookUrlParts.length - 2]
            
            if (webhookId) {
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
            log.error('[SafeModModals] Error in webhook section:', error)
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
            { label: '@everyone / @here Spam', value: 'everyoneHereSpam', emoji: '📢' }
        ])

    components.push(new ActionRowBuilder().addComponents(permissionSelect))

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

function parseDuration(input) {
    input = input.toLowerCase().trim()
    
    // Remove spaces between number and unit
    input = input.replace(/\s+/g, '')
    
    // Match patterns like: 3days, 5h, 30min, 2months, 1year
    const patterns = [
        { regex: /^(\d+)\s*y(?:ear)?s?$/i, multiplier: 31536000 },
        { regex: /^(\d+)\s*mo(?:nth)?s?$/i, multiplier: 2592000 },
        { regex: /^(\d+)\s*d(?:ay)?s?$/i, multiplier: 86400 },
        { regex: /^(\d+)\s*h(?:our)?s?$/i, multiplier: 3600 },
        { regex: /^(\d+)\s*m(?:in)?(?:ute)?s?$/i, multiplier: 60 }
    ]
    
    for (const pattern of patterns) {
        const match = input.match(pattern.regex)
        if (match) {
            const value = parseInt(match[1])
            return value * pattern.multiplier
        }
    }
    
    return null
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''}`
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} month${Math.floor(seconds / 2592000) > 1 ? 's' : ''}`
    return `${Math.floor(seconds / 31536000)} year${Math.floor(seconds / 31536000) > 1 ? 's' : ''}`
}

// ==================== USER AUTHORIZATION CHECK ====================

/**
 * Check if user is authorized to interact with the safe-moderation panel
 * Only the user who ran the command or administrators can interact
 * @param {Interaction} interaction 
 * @returns {Promise<boolean>}
 */
async function checkUserAuthorization(interaction) {
    try {
        // Check if user is administrator
        if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return true
        }

        // For modals, we need to check the message that triggered the modal
        // SMART APPROACH: Only search last 5 messages
        const messages = await interaction.channel.messages.fetch({ limit: 5 }).catch(() => null)
        if (!messages) return false
        
        const panelMessage = messages.find(msg => 
            msg.author.id === interaction.client.user.id && 
            msg.components?.length > 0 &&
            msg.components.some(row => 
                row.components?.some(c => c.customId?.includes('ss_select_permission')) ||
                row.customId?.includes('ss_select_permission')
            ) &&
            msg.interaction
        )
        
        if (panelMessage && panelMessage.interaction) {
            const originalUserId = panelMessage.interaction.user.id
            if (interaction.user.id === originalUserId) {
                return true
            }
        }

        return false
    } catch (error) {
        log.error('[SafeModModals] Error checking user authorization:', error)
        // Default to allowing administrators only
        return interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    }
}


// ==================== SPAM PREVENTION MODAL HANDLERS ====================

async function handleSpamTimeoutModal(client, interaction) {
    const durationInput = interaction.fields.getTextInputValue('duration')
    
    // Validate duration format
    if (!isValidSpamDuration(durationInput)) {
        return interaction.reply({
            content: '❌ Invalid duration format. Please use: 6h, 1day, 30day, 1year, or 0 (permanent)',
            ephemeral: true
        })
    }
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    config.spamPrevention.punishmentType = 'TIMEOUT'
    config.spamPrevention.punishmentDuration = durationInput.toLowerCase().trim()
    config.markModified('spamPrevention')
    await config.save()
    
    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    const displayDuration = durationInput === '0' ? 'Permanent' : durationInput
    
    await interaction.reply({
        content: `✅ Punishment set to: **Timeout ${displayDuration} ⏱**`,
        ephemeral: true
    })
}

async function handleSpamActionsModal(client, interaction) {
    const actionsInput = interaction.fields.getTextInputValue('actions')
    
    const actions = parseInt(actionsInput)
    
    if (isNaN(actions) || actions < 1 || actions > 99) {
        return interaction.reply({
            content: '❌ Invalid number. Please enter a number between 1 and 99.',
            ephemeral: true
        })
    }
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    config.spamPrevention.actionsLimit = actions
    config.markModified('spamPrevention')
    await config.save()
    
    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    await interaction.reply({
        content: `✅ Actions limit set to: **${actions}**`,
        ephemeral: true
    })
}

async function handleSpamTimeBetweenModal(client, interaction) {
    const timeInput = interaction.fields.getTextInputValue('time')
    
    // Parse duration to seconds
    const seconds = parseSpamDurationToSeconds(timeInput)
    
    if (!seconds || seconds < 60 || seconds > 31536000) {
        return interaction.reply({
            content: '❌ Invalid duration. Please use format like: 6h, 12h, 1day, 7days (max 1 year)',
            ephemeral: true
        })
    }
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    config.spamPrevention.timeBetweenActions = seconds
    config.markModified('spamPrevention')
    await config.save()
    
    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    await interaction.reply({
        content: `✅ Time between actions set to: **${formatDuration(seconds)}**`,
        ephemeral: true
    })
}

function isValidSpamDuration(duration) {
    if (!duration) return false
    
    const str = duration.toLowerCase().trim()
    
    // Permanent timeout
    if (str === '0') return true
    
    // Match pattern: <number><unit>
    const match = str.match(/^(\d+)(h|hour|hours|d|day|days|y|year|years)$/)
    
    return match !== null
}

function parseSpamDurationToSeconds(duration) {
    if (!duration) return null
    
    const str = duration.toLowerCase().trim()
    
    const match = str.match(/^(\d+)(h|hour|hours|min|minute|minutes|d|day|days|m|month|months|y|year|years)$/)
    
    if (!match) return null
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    switch (unit) {
        case 'min':
        case 'minute':
        case 'minutes':
            return value * 60
            
        case 'h':
        case 'hour':
        case 'hours':
            return value * 3600
            
        case 'd':
        case 'day':
        case 'days':
            return value * 86400
            
        case 'm':
        case 'month':
        case 'months':
            return value * 2592000
            
        case 'y':
        case 'year':
        case 'years':
            return value * 31536000
            
        default:
            return null
    }
}
