/**
 * Safe-Server Panel Interactions - New Comprehensive System
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder } = require('discord.js')
const safeServerSchema = require('../schemas/safeServerSchema')
const moderationSystemSchema = require('../schemas/moderationSystemSchema')

module.exports = {
    name: 'safe-server-panel-new',
    
    async execute(client, interaction) {
        const customId = interaction.customId

        try {
            if (customId === 'ss_select_permission') {
                await handlePermissionSelect(client, interaction)
            }
            else if (customId === 'ss_settings_menu') {
                await handleSettingsMenu(client, interaction)
            }
            else if (customId === 'ss_toggle_system') {
                await handleToggleSystem(client, interaction)
            }
            else if (customId === 'ss_toggle_bot_protection') {
                await handleToggleBotProtection(client, interaction)
            }
            else if (customId === 'ss_toggle_permission') {
                await handleTogglePermission(client, interaction)
            }
            else if (customId === 'ss_edit_log_channel') {
                await handleEditLogChannel(client, interaction)
            }
            else if (customId === 'ss_edit_manager_roles') {
                await handleEditManagerRoles(client, interaction)
            }
            else if (customId === 'ss_cooldown_select') {
                await handleCooldownSelect(client, interaction)
            }
            else if (customId === 'ss_cooldown_custom') {
                await showCooldownCustomModal(client, interaction)
            }
            else if (customId === 'ss_edit_action_count') {
                await showActionCountModal(client, interaction)
            }
            else if (customId === 'ss_time_between_select') {
                await handleTimeBetweenSelect(client, interaction)
            }
            else if (customId === 'ss_time_between_custom') {
                await showTimeBetweenCustomModal(client, interaction)
            }
            else if (customId === 'ss_restriction_type_select') {
                await handleRestrictionTypeSelect(client, interaction)
            }
            else if (customId === 'ss_restriction_reset') {
                await handleRestrictionReset(client, interaction)
            }
            else if (customId === 'ss_log_channel_select') {
                await handleLogChannelSelect(client, interaction)
            }
            else if (customId === 'ss_manager_roles_select') {
                await handleManagerRolesSelect(client, interaction)
            }
            else if (customId === 'ss_manager_roles_remove') {
                await handleManagerRolesRemove(client, interaction)
            }
            else if (customId === 'ss_specific_roles_select') {
                await handleSpecificRolesSelect(client, interaction)
            }
            else if (customId === 'ss_specific_users_select') {
                await handleSpecificUsersSelect(client, interaction)
            }
            else if (customId === 'ss_back_to_panel') {
                await showControlPanel(client, interaction)
            }
        } catch (error) {
            console.error('[Safe-Server Panel] Error:', error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request.',
                    ephemeral: true
                }).catch(console.error)
            }
        }
    }
}

// Store selected permission temporarily
const selectedPermissions = new Map()

// ==================== TOGGLE SYSTEM ====================

async function handleToggleSystem(client, interaction) {
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeServerSchema({ guildID: interaction.guild.id })
    }

    // Check if moderation system is enabled
    if (!config.enabled) {
        const modSystem = await moderationSystemSchema.findOne({ guildId: interaction.guild.id })
        
        if (!modSystem || !modSystem.enabled) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setDescription('❌ Please enable the moderation system first using </moderation-system:0>')
                ],
                ephemeral: true
            })
        }

        // Check if log channel is set
        if (!config.logChannelId) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setDescription('❌ Please set a log channel first.')
                ],
                ephemeral: true,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('ss_edit_log_channel')
                            .setLabel('Set Log Channel')
                            .setEmoji('📢')
                            .setStyle(ButtonStyle.Primary)
                    )
                ]
            })
        }

        // Check if manager roles are set
        if (!config.managerRoles || config.managerRoles.length === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setDescription('❌ Please select at least one manager role.')
                ],
                ephemeral: true,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('ss_edit_manager_roles')
                            .setLabel('Set Manager Roles')
                            .setEmoji('👥')
                            .setStyle(ButtonStyle.Primary)
                    )
                ]
            })
        }
    }

    config.enabled = !config.enabled
    await config.save()

    await interaction.deferUpdate()
    await showControlPanel(client, interaction)
}

// ==================== TOGGLE BOT PROTECTION ====================

async function handleToggleBotProtection(client, interaction) {
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Server is not configured.',
            ephemeral: true
        })
    }

    config.botProtection.enabled = !config.botProtection.enabled
    await config.save()

    await interaction.deferUpdate()
    await showControlPanel(client, interaction)
}

// ==================== PERMISSION SELECT ====================

async function handlePermissionSelect(client, interaction) {
    const permissionKey = interaction.values[0]
    selectedPermissions.set(interaction.user.id, permissionKey)

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Server is not configured.',
            ephemeral: true
        })
    }

    const permConfig = config.permissions[permissionKey]
    
    // Build updated control panel with settings menu
    const embed = buildControlPanelEmbed(config, interaction.guild)
    const components = buildControlPanelComponentsWithSettings(config, permissionKey, permConfig)

    await interaction.update({
        embeds: [embed],
        components: components
    })
}

// ==================== SETTINGS MENU ====================

async function handleSettingsMenu(client, interaction) {
    const settingType = interaction.values[0]
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    switch (settingType) {
        case 'edit_cooldown':
            await showCooldownOptions(client, interaction, permissionKey)
            break
        case 'edit_action_count':
            await showActionCountModal(client, interaction, permissionKey)
            break
        case 'edit_restriction_type':
            await showRestrictionTypeOptions(client, interaction, permissionKey)
            break
        case 'edit_time_between':
            await showTimeBetweenOptions(client, interaction, permissionKey)
            break
    }
}

// ==================== TOGGLE PERMISSION ====================

async function handleTogglePermission(client, interaction) {
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Server is not configured.',
            ephemeral: true
        })
    }

    config.permissions[permissionKey].enabled = !config.permissions[permissionKey].enabled
    await config.save()

    await interaction.deferUpdate()
    
    // Rebuild panel with updated status
    const permConfig = config.permissions[permissionKey]
    const embed = buildControlPanelEmbed(config, interaction.guild)
    const components = buildControlPanelComponentsWithSettings(config, permissionKey, permConfig)

    await interaction.editReply({
        embeds: [embed],
        components: components
    })
}

// ==================== EDIT LOG CHANNEL ====================

async function handleEditLogChannel(client, interaction) {
    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId('ss_log_channel_select')
        .setPlaceholder('Select a log channel')
        .setChannelTypes(ChannelType.GuildText)

    await interaction.reply({
        content: 'Select the channel where Safe Server notifications will be sent:',
        components: [new ActionRowBuilder().addComponents(channelSelect)],
        ephemeral: true
    })
}

async function handleLogChannelSelect(client, interaction) {
    const channelId = interaction.values[0]
    
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeServerSchema({ guildID: interaction.guild.id })
    }

    config.logChannelId = channelId
    await config.save()

    await interaction.update({
        content: `✅ Log channel set to <#${channelId}>`,
        components: []
    })

    // Refresh main panel
    setTimeout(() => showControlPanel(client, interaction), 2000)
}

// ==================== EDIT MANAGER ROLES ====================

async function handleEditManagerRoles(client, interaction) {
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeServerSchema({ guildID: interaction.guild.id })
    }

    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId('ss_manager_roles_select')
        .setPlaceholder('Select manager roles (minimum 1)')
        .setMinValues(1)
        .setMaxValues(10)

    const components = [new ActionRowBuilder().addComponents(roleSelect)]

    // Add remove button if roles exist
    if (config.managerRoles && config.managerRoles.length > 0) {
        const removeButton = new ButtonBuilder()
            .setCustomId('ss_manager_roles_remove')
            .setLabel('Remove Roles')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)

        components.push(new ActionRowBuilder().addComponents(removeButton))
    }

    await interaction.reply({
        content: 'Select manager roles (these roles can approve restrictions):',
        components: components,
        ephemeral: true
    })
}

async function handleManagerRolesSelect(client, interaction) {
    const roleIds = interaction.values
    
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeServerSchema({ guildID: interaction.guild.id })
    }

    // Add new roles (avoid duplicates)
    for (const roleId of roleIds) {
        if (!config.managerRoles.includes(roleId)) {
            config.managerRoles.push(roleId)
        }
    }

    await config.save()

    const rolesMention = config.managerRoles.map(id => `<@&${id}>`).join(', ')

    await interaction.update({
        content: `✅ Manager roles updated:\n${rolesMention}`,
        components: []
    })

    // Refresh main panel
    setTimeout(() => showControlPanel(client, interaction), 2000)
}

async function handleManagerRolesRemove(client, interaction) {
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config || !config.managerRoles || config.managerRoles.length === 0) {
        return interaction.update({
            content: '❌ No manager roles to remove.',
            components: []
        })
    }

    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId('ss_manager_roles_remove_confirm')
        .setPlaceholder('Select roles to remove')
        .setMinValues(1)
        .setMaxValues(Math.min(config.managerRoles.length, 10))

    await interaction.update({
        content: 'Select manager roles to remove:',
        components: [new ActionRowBuilder().addComponents(roleSelect)]
    })
}

// ==================== COOLDOWN OPTIONS ====================

async function showCooldownOptions(client, interaction, permissionKey) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ss_cooldown_select')
        .setPlaceholder('Select cooldown duration')
        .addOptions([
            { label: '6 Hours', value: '21600', emoji: '⏱️' },
            { label: '12 Hours', value: '43200', emoji: '⏱️' },
            { label: '1 Day', value: '86400', emoji: '📅' },
            { label: '7 Days', value: '604800', emoji: '📆' },
            { label: '30 Days', value: '2592000', emoji: '📆' },
            { label: 'Owner/Admin Approval', value: 'approval', emoji: '👑' },
            { label: 'Custom Duration', value: 'custom', emoji: '✏️' }
        ])

    await interaction.reply({
        content: 'Select the cooldown duration for this permission:',
        components: [new ActionRowBuilder().addComponents(selectMenu)],
        ephemeral: true
    })
}

async function handleCooldownSelect(client, interaction) {
    const value = interaction.values[0]
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.update({
            content: '❌ Please select a permission first.',
            components: []
        })
    }

    if (value === 'custom') {
        return await showCooldownCustomModal(client, interaction)
    }

    if (value === 'approval') {
        // Set a special value for approval mode
        let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
        config.permissions[permissionKey].cooldown = -1 // -1 indicates approval mode
        await config.save()

        await interaction.update({
            content: '✅ Cooldown set to **Owner/Admin Approval** mode. Restrictions will require manual approval.',
            components: []
        })
    } else {
        const duration = parseInt(value)
        
        let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
        config.permissions[permissionKey].cooldown = duration
        await config.save()

        await interaction.update({
            content: `✅ Cooldown set to **${formatDuration(duration)}**`,
            components: []
        })
    }

    // Refresh main panel
    setTimeout(() => showControlPanel(client, interaction), 2000)
}

async function showCooldownCustomModal(client, interaction) {
    const modal = new ModalBuilder()
        .setCustomId('ss_modal_cooldown_custom')
        .setTitle('Set Custom Cooldown')

    const input = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Duration (e.g., 3days, 5h, 30min)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('3days or 5h or 30min')
        .setRequired(true)

    modal.addComponents(new ActionRowBuilder().addComponents(input))

    await interaction.showModal(modal)
}

// ==================== ACTION COUNT ====================

async function showActionCountModal(client, interaction) {
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    const modal = new ModalBuilder()
        .setCustomId('ss_modal_action_count')
        .setTitle('Set Action Count')

    const input = new TextInputBuilder()
        .setCustomId('count')
        .setLabel('Number of actions (1-99)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('3')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2)

    modal.addComponents(new ActionRowBuilder().addComponents(input))

    await interaction.showModal(modal)
}

// ==================== TIME BETWEEN ACTIONS ====================

async function showTimeBetweenOptions(client, interaction, permissionKey) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ss_time_between_select')
        .setPlaceholder('Select time between actions')
        .addOptions([
            { label: '6 Hours', value: '21600', emoji: '⏱️' },
            { label: '12 Hours', value: '43200', emoji: '⏱️' },
            { label: '1 Day', value: '86400', emoji: '📅' },
            { label: '7 Days', value: '604800', emoji: '📆' },
            { label: '30 Days', value: '2592000', emoji: '📆' },
            { label: 'Custom Duration', value: 'custom', emoji: '✏️' }
        ])

    await interaction.reply({
        content: 'Select the time window for counting actions:',
        components: [new ActionRowBuilder().addComponents(selectMenu)],
        ephemeral: true
    })
}

async function handleTimeBetweenSelect(client, interaction) {
    const value = interaction.values[0]
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.update({
            content: '❌ Please select a permission first.',
            components: []
        })
    }

    if (value === 'custom') {
        return await showTimeBetweenCustomModal(client, interaction)
    }

    const duration = parseInt(value)
    
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].timeBetweenActions = duration
    await config.save()

    await interaction.update({
        content: `✅ Time between actions set to **${formatDuration(duration)}**`,
        components: []
    })

    // Refresh main panel
    setTimeout(() => showControlPanel(client, interaction), 2000)
}

async function showTimeBetweenCustomModal(client, interaction) {
    const modal = new ModalBuilder()
        .setCustomId('ss_modal_time_between_custom')
        .setTitle('Set Custom Time Between Actions')

    const input = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Duration (e.g., 3days, 5h, 30min)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('6h or 1day or 30min')
        .setRequired(true)

    modal.addComponents(new ActionRowBuilder().addComponents(input))

    await interaction.showModal(modal)
}

// ==================== RESTRICTION TYPE ====================

async function showRestrictionTypeOptions(client, interaction, permissionKey) {
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    const permConfig = config.permissions[permissionKey]

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ss_restriction_type_select')
        .setPlaceholder('Select restriction type')
        .addOptions([
            {
                label: 'Global Restriction',
                description: permConfig.restrictionType === 'global' 
                    ? 'Status: Enabled | Click to disable' 
                    : 'Status: Disabled | Click to enable',
                value: 'global',
                emoji: '🌐'
            },
            {
                label: 'Specific Role/Member',
                description: 'Apply to specific roles or members only',
                value: 'specific',
                emoji: '🎯'
            }
        ])

    const resetButton = new ButtonBuilder()
        .setCustomId('ss_restriction_reset')
        .setLabel('Reset to Global')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)

    await interaction.reply({
        content: 'Select restriction type:',
        components: [
            new ActionRowBuilder().addComponents(selectMenu),
            new ActionRowBuilder().addComponents(resetButton)
        ],
        ephemeral: true
    })
}

async function handleRestrictionTypeSelect(client, interaction) {
    const value = interaction.values[0]
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.update({
            content: '❌ Please select a permission first.',
            components: []
        })
    }

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })

    if (value === 'global') {
        config.permissions[permissionKey].restrictionType = 'global'
        config.permissions[permissionKey].specificRoles = []
        config.permissions[permissionKey].specificUsers = []
        await config.save()

        await interaction.update({
            content: '✅ Restriction type set to **Global** (applies to all moderators)',
            components: []
        })
    } else if (value === 'specific') {
        config.permissions[permissionKey].restrictionType = 'specific'
        await config.save()

        // Show role and user selection
        await showSpecificSelection(client, interaction, permissionKey)
        return
    }

    // Refresh main panel
    setTimeout(() => showControlPanel(client, interaction), 2000)
}

async function showSpecificSelection(client, interaction, permissionKey) {
    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId('ss_specific_roles_select')
        .setPlaceholder('Select roles (optional)')
        .setMinValues(0)
        .setMaxValues(10)

    const userSelect = new StringSelectMenuBuilder()
        .setCustomId('ss_specific_users_select')
        .setPlaceholder('Select users (optional)')
        .setMinValues(0)
        .setMaxValues(10)

    await interaction.update({
        content: 'Select specific roles and/or users to apply this restriction to:',
        components: [
            new ActionRowBuilder().addComponents(roleSelect)
        ]
    })
}

async function handleSpecificRolesSelect(client, interaction) {
    const roleIds = interaction.values
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.update({
            content: '❌ Please select a permission first.',
            components: []
        })
    }

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].specificRoles = roleIds
    await config.save()

    const rolesMention = roleIds.map(id => `<@&${id}>`).join(', ')

    await interaction.update({
        content: `✅ Specific roles set:\n${rolesMention || 'None'}`,
        components: []
    })

    // Refresh main panel
    setTimeout(() => showControlPanel(client, interaction), 2000)
}

async function handleRestrictionReset(client, interaction) {
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.update({
            content: '❌ Please select a permission first.',
            components: []
        })
    }

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].restrictionType = 'global'
    config.permissions[permissionKey].specificRoles = []
    config.permissions[permissionKey].specificUsers = []
    await config.save()

    await interaction.update({
        content: '✅ Restriction type reset to **Global** (default)',
        components: []
    })

    // Refresh main panel
    setTimeout(() => showControlPanel(client, interaction), 2000)
}

// ==================== CONTROL PANEL BUILDERS ====================

async function showControlPanel(client, interaction) {
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeServerSchema({ guildID: interaction.guild.id })
        await config.save()
    }

    const embed = buildControlPanelEmbed(config, interaction.guild)
    const components = buildControlPanelComponents(config)

    const method = interaction.replied || interaction.deferred ? 'editReply' : 'update'
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

function buildControlPanelComponentsWithSettings(config, permissionKey, permConfig) {
    const components = []

    const permissionSelect = new StringSelectMenuBuilder()
        .setCustomId('ss_select_permission')
        .setPlaceholder('Select a permission to configure')
        .setDisabled(!config.enabled)
        .addOptions([
            { label: 'Ban Members', value: 'banMembers', emoji: '🚫', default: permissionKey === 'banMembers' },
            { label: 'Kick Members', value: 'kickMembers', emoji: '👢', default: permissionKey === 'kickMembers' },
            { label: 'Timeout Members', value: 'timeoutMembers', emoji: '⏸️', default: permissionKey === 'timeoutMembers' },
            { label: 'Delete Role', value: 'deleteRole', emoji: '🎭', default: permissionKey === 'deleteRole' },
            { label: 'Delete Channel', value: 'deleteChannel', emoji: '🗑️', default: permissionKey === 'deleteChannel' },
            { label: 'Delete Messages', value: 'deleteMessages', emoji: '💬', default: permissionKey === 'deleteMessages' },
            { label: 'Change Nickname', value: 'changeNickname', emoji: '✏️', default: permissionKey === 'changeNickname' },
            { label: 'Adding Mass Bots', value: 'addingMassBots', emoji: '🤖', default: permissionKey === 'addingMassBots' },
            { label: 'Disconnecting Members from VC', value: 'disconnectingMembers', emoji: '🔌', default: permissionKey === 'disconnectingMembers' },
            { label: 'Moving Members from VC', value: 'movingMembers', emoji: '🔀', default: permissionKey === 'movingMembers' },
            { label: 'Muting Members from VC', value: 'mutingMembers', emoji: '🔇', default: permissionKey === 'mutingMembers' },
            { label: '@everyone / @here Spam', value: 'everyoneHereSpam', emoji: '📢', default: permissionKey === 'everyoneHereSpam' }
        ])

    components.push(new ActionRowBuilder().addComponents(permissionSelect))

    // Settings menu
    const settingsMenu = new StringSelectMenuBuilder()
        .setCustomId('ss_settings_menu')
        .setPlaceholder('Configure selected permission')
        .addOptions([
            { label: 'Edit Cooldown', description: 'Set restriction duration', value: 'edit_cooldown', emoji: '⏱️' },
            { label: 'Edit No. of Actions', description: 'Set action limit', value: 'edit_action_count', emoji: '🔢' },
            { label: 'Edit Restriction Type', description: 'Global or Specific', value: 'edit_restriction_type', emoji: '🎯' },
            { label: 'Edit Time between Actions', description: 'Set time window', value: 'edit_time_between', emoji: '⏰' }
        ])

    components.push(new ActionRowBuilder().addComponents(settingsMenu))

    // Toggle button for selected permission
    const toggleButton = new ButtonBuilder()
        .setCustomId('ss_toggle_permission')
        .setLabel(permConfig.enabled ? 'Disable' : 'Enable')
        .setEmoji(permConfig.enabled ? '❌' : '✅')
        .setStyle(permConfig.enabled ? ButtonStyle.Danger : ButtonStyle.Success)

    const buttonsRow1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_toggle_system')
                .setLabel(config.enabled ? 'Disable Safe Server' : 'Enable Safe Server')
                .setEmoji(config.enabled ? '❌' : '✅')
                .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            toggleButton
        )

    components.push(buttonsRow1)

    const buttonsRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_toggle_bot_protection')
                .setLabel(config.botProtection.enabled ? 'Disable Bot Protection' : 'Enable Bot Protection')
                .setEmoji(config.botProtection.enabled ? '❌' : '✅')
                .setStyle(config.botProtection.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                .setDisabled(!config.enabled),
            new ButtonBuilder()
                .setCustomId('ss_edit_log_channel')
                .setLabel('Edit Log Channel')
                .setEmoji('📢')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!config.enabled)
        )

    components.push(buttonsRow2)

    const buttonsRow3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_edit_manager_roles')
                .setLabel('Edit Manager Roles')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!config.enabled)
        )

    components.push(buttonsRow3)

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
