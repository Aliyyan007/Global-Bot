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
