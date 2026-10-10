/**
 * Safe-Moderation Panel Interactions - New Comprehensive System
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const { selectedPermissions } = require('./safe-moderation-shared-state')
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('SafeModPanel')

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
        log.error('[SafeModPanel] Error fetching clear-restrictions command ID:', error);
        return null;
    }
}

// Routed via ss_ prefix in interactionCreate — no `name` export
// so this helper isn't registered as a cmd{} interaction (no run()).
module.exports = {
    async execute(client, interaction) {
        const customId = interaction.customId

        // Check if user is authorized (Administrator only for now)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Only administrators can interact with this panel.',
                ephemeral: true
            })
        }

        try {
            if (customId === 'ss_select_permission') {
                await handlePermissionSelect(client, interaction)
            }
            else if (customId === 'ss_settings_menu') {
                await handleSettingsMenu(client, interaction)
            }
            else if (customId === 'ss_settings_select') {
                await handleSettingsSelect(client, interaction)
            }
            else if (customId === 'ss_toggle_system') {
                await handleToggleSystem(client, interaction)
            }
            else if (customId === 'ss_continue_enable_anyway') {
                await handleContinueEnableAnyway(client, interaction)
            }
            else if (customId === 'ss_cancel_enable') {
                await handleCancelEnable(client, interaction)
            }
            else if (customId === 'ss_toggle_bot_protection') {
                await handleToggleBotProtection(client, interaction)
            }
            else if (customId === 'ss_server_recovery') {
                await handleServerRecovery(client, interaction)
            }
            else if (customId === 'ss_toggle_server_recovery_emoji') {
                await handleToggleServerRecoveryEmoji(client, interaction)
            }
            else if (customId === 'ss_toggle_server_recovery_channel') {
                await handleToggleServerRecoveryChannel(client, interaction)
            }
            else if (customId === 'ss_sentinel_hub') {
                await handleSentinelHub(client, interaction)
            }
            else if (customId === 'ss_sentinel_hub_toggle') {
                await handleSentinelHubToggle(client, interaction)
            }
            else if (customId === 'ss_toggle_server_panel') {
                await handleToggleServerPanel(client, interaction)
            }
            else if (customId === 'ss_toggle_permission') {
                await handleTogglePermission(client, interaction)
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
            else if (customId === 'ss_manager_roles_select' || customId === 'ss_manager_roles_select_enable') {
                await handleManagerRolesSelect(client, interaction)
            }
            else if (customId === 'ss_manager_roles_remove') {
                await handleManagerRolesRemove(client, interaction)
            }
            else if (customId === 'ss_whitelist_roles_add') {
                await handleWhitelistRolesAdd(client, interaction)
            }
            else if (customId === 'ss_whitelist_roles_remove') {
                await handleWhitelistRolesRemove(client, interaction)
            }
            else if (customId === 'ss_whitelist_roles_clear') {
                await handleWhitelistRolesClear(client, interaction)
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
            else if (customId === 'ss_webhook_help') {
                await handleWebhookHelp(client, interaction)
            }
            // Spam Prevention handlers
            else if (customId === 'ss_spam_prevention_toggle') {
                await handleSpamPreventionToggle(client, interaction)
            }
            else if (customId === 'ss_spam_punishment_select') {
                await handleSpamPunishmentSelect(client, interaction)
            }
            else if (customId === 'ss_spam_punishment_type_select') {
                await handleSpamPunishmentTypeSelect(client, interaction)
            }
            else if (customId === 'ss_spam_punishment_warn') {
                await handleSpamPunishmentWarn(client, interaction)
            }
            else if (customId === 'ss_spam_punishment_ban') {
                await handleSpamPunishmentBan(client, interaction)
            }
            else if (customId === 'ss_spam_punishment_kick') {
                await handleSpamPunishmentKick(client, interaction)
            }
            else if (customId === 'ss_spam_punishment_timeout') {
                await showSpamTimeoutModal(client, interaction)
            }
            else if (customId === 'ss_spam_actions_edit') {
                await showSpamActionsModal(client, interaction)
            }
            else if (customId === 'ss_spam_time_between_edit') {
                await showSpamTimeBetweenModal(client, interaction)
            }
            else if (customId === 'ss_spam_restriction_select') {
                await handleSpamRestrictionSelect(client, interaction)
            }
            else if (customId === 'ss_skip_manager_roles') {
                await handleSkipManagerRoles(client, interaction)
            }
            else if (customId.startsWith('ss_reject_bot_')) {
                await handleRejectBot(client, interaction)
            }
        } catch (error) {
            log.error('[SafeModPanel] Error:', error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request.',
                    ephemeral: true
                }).catch(err => log.error('[SafeModPanel] Reply error:', err))
            }
        }
    }
}

// ==================== TOGGLE SYSTEM ====================

async function handleToggleSystem(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeModerationSchema({ guildID: interaction.guild.id })
    }

    // Check if enabling the system
    if (!config.enabled) {
        // Use validator to check requirements
        log.debug(`[SafeModPanel] 🔍 Validating requirements for system enable...`)
        
        const validation = await client.safeModerationValidator.validateForEnable(interaction.guild)
        
        if (!validation.canEnable) {
            log.error(`[SafeModPanel] ❌ Validation failed`)
            const errorMessage = client.safeModerationValidator.generateEnableErrorMessage(validation)
            return interaction.reply(errorMessage)
        }
        
        log.debug(`[SafeModPanel] ✅ Validation passed`)
        
        // STEP 2: Check if webhook is set when enabling
        // Check if webhook is set
        if (!config.logWebhook) {
            // Show webhook input message
            const webhookHelpButton = new ButtonBuilder()
                .setCustomId('ss_webhook_help')
                .setEmoji('❔')
                .setStyle(ButtonStyle.Secondary)

            const row = new ActionRowBuilder().addComponents(webhookHelpButton)

            await interaction.reply({
                content: `**Enter the webhook link, where logs will be posted.**\n> To cancel enter: cancel`,
                components: [row]
            })

            // Set up message collector
            const filter = m => m.author.id === interaction.user.id && m.channel.id === interaction.channel.id
            const collector = interaction.channel.createMessageCollector({ filter, time: 180000 }) // 3 minutes

            collector.on('collect', async (message) => {
                const content = message.content.toLowerCase()
                
                // Delete user message
                message.delete().catch(() => {})

                if (content === 'cancel') {
                    collector.stop('cancelled')
                    return
                }

                // Validate webhook URL
                if (!content.startsWith('https://discord.com/api/webhooks/') && !content.startsWith('https://discordapp.com/api/webhooks/')) {
                    await interaction.followUp({
                        content: '❌ Invalid webhook URL. Please provide a valid Discord webhook URL.',
                        ephemeral: true
                    })
                    return
                }

                config.logWebhook = message.content
                await config.save()

                // Invalidate cache
                if (client.safeModerationConfigCache) {
                    await client.safeModerationConfigCache.invalidate(interaction.guild.id)
                }

                collector.stop('success')
            })

            collector.on('end', async (collected, reason) => {
                if (reason === 'cancelled') {
                    await interaction.editReply({
                        content: '❌ Setup cancelled.',
                        components: []
                    })
                    // Delete after 3 seconds
                    setTimeout(() => {
                        interaction.deleteReply().catch(() => {})
                    }, 3000)
                    return
                }

                if (reason === 'time') {
                    await interaction.editReply({
                        content: '⏱️ Time expired. Please try again.',
                        components: []
                    })
                    // Delete after 3 seconds
                    setTimeout(() => {
                        interaction.deleteReply().catch(() => {})
                    }, 3000)
                    return
                }

                // Continue to manager roles selection (webhook was set)
                const roleSelect = new RoleSelectMenuBuilder()
                    .setCustomId('ss_manager_roles_select_enable')
                    .setPlaceholder('Select manager roles (minimum 1)')
                    .setMinValues(1)
                    .setMaxValues(10)

                const components = [
                    new ActionRowBuilder().addComponents(roleSelect)
                ]

                await interaction.editReply({
                    content: `✅ Webhook set successfully.\n\n**Step 2/2:** Select manager roles (these roles can approve restrictions):`,
                    components: components
                })

                // Auto-delete after 3 minutes
                setTimeout(() => {
                    interaction.deleteReply().catch(() => {})
                }, 180000)
            })

            return
        }

        // If webhook is set but manager roles are not, show role selection
        if (!config.managerRoles || config.managerRoles.length === 0) {
            // Show role select
            const roleSelect = new RoleSelectMenuBuilder()
                .setCustomId('ss_manager_roles_select_enable')
                .setPlaceholder('Select manager roles (minimum 1)')
                .setMinValues(1)
                .setMaxValues(10)

            const components = [
                new ActionRowBuilder().addComponents(roleSelect)
            ]

            await interaction.reply({
                content: '**Step 2/2:** Select manager roles (these roles can approve restrictions):',
                components: components
            })

            // Auto-delete after 3 minutes
            setTimeout(() => {
                interaction.deleteReply().catch(() => {})
            }, 180000)

            return
        }
    }

    config.enabled = !config.enabled
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    // Start or stop monitoring based on enabled state
    if (config.enabled) {
        log.debug(`[SafeModPanel] ✅ System enabled, starting validator monitoring`)
        client.safeModerationValidator.startMonitoring(interaction.guild)
    } else {
        log.debug(`[SafeModPanel] ❌ System disabled, stopping validator monitoring`)
        client.safeModerationValidator.stopMonitoring(interaction.guild.id)
    }

    await interaction.deferUpdate()
    await showControlPanel(client, interaction)
}

// ==================== CONTINUE ENABLE ANYWAY ====================

async function handleContinueEnableAnyway(client, interaction) {
    log.debug(`[SafeModPanel] ⚠️ User chose to continue enabling despite role position warning`)
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeModerationSchema({ guildID: interaction.guild.id })
    }
    
    // Check if webhook is set
    if (!config.logWebhook) {
        // Show webhook input message
        const webhookHelpButton = new ButtonBuilder()
            .setCustomId('ss_webhook_help')
            .setEmoji('❔')
            .setStyle(ButtonStyle.Secondary)

        const row = new ActionRowBuilder().addComponents(webhookHelpButton)

        await interaction.update({
            content: `**Enter the webhook link, where logs will be posted.**\n> To cancel enter: cancel`,
            embeds: [],
            components: [row]
        })

        // Set up message collector
        const filter = m => m.author.id === interaction.user.id && m.channel.id === interaction.channel.id
        const collector = interaction.channel.createMessageCollector({ filter, time: 180000 }) // 3 minutes

        collector.on('collect', async (message) => {
            const content = message.content.toLowerCase()
            
            // Delete user message
            message.delete().catch(() => {})

            if (content === 'cancel') {
                collector.stop('cancelled')
                return
            }

            // Validate webhook URL
            if (!content.startsWith('https://discord.com/api/webhooks/') && !content.startsWith('https://discordapp.com/api/webhooks/')) {
                await interaction.followUp({
                    content: '❌ Invalid webhook URL. Please provide a valid Discord webhook URL.',
                    ephemeral: true
                })
                return
            }

            config.logWebhook = message.content
            await config.save()

            // Invalidate cache
            if (client.safeModerationConfigCache) {
                await client.safeModerationConfigCache.invalidate(interaction.guild.id)
            }

            collector.stop('success')
        })

        collector.on('end', async (collected, reason) => {
            if (reason === 'cancelled') {
                await interaction.editReply({
                    content: '❌ Setup cancelled.',
                    components: []
                })
                setTimeout(() => {
                    interaction.deleteReply().catch(() => {})
                }, 3000)
                return
            }

            if (reason === 'time') {
                await interaction.editReply({
                    content: '⏱️ Time expired. Please try again.',
                    components: []
                })
                setTimeout(() => {
                    interaction.deleteReply().catch(() => {})
                }, 3000)
                return
            }

            // Continue to manager roles selection
            const roleSelect = new RoleSelectMenuBuilder()
                .setCustomId('ss_manager_roles_select_enable')
                .setPlaceholder('Select manager roles (minimum 1)')
                .setMinValues(1)
                .setMaxValues(10)

            const components = [
                new ActionRowBuilder().addComponents(roleSelect)
            ]

            await interaction.editReply({
                content: `✅ Webhook set successfully.\n\n**Step 2/2:** Select manager roles (these roles can approve restrictions):`,
                components: components
            })

            setTimeout(() => {
                interaction.deleteReply().catch(() => {})
            }, 180000)
        })
    } else {
        // Webhook already set, go to manager roles
        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId('ss_manager_roles_select_enable')
            .setPlaceholder('Select manager roles (minimum 1)')
            .setMinValues(1)
            .setMaxValues(10)

        const components = [
            new ActionRowBuilder().addComponents(roleSelect)
        ]

        await interaction.update({
            content: `**Select manager roles (these roles can approve restrictions):**`,
            embeds: [],
            components: components
        })

        setTimeout(() => {
            interaction.deleteReply().catch(() => {})
        }, 180000)
    }
}

// ==================== CANCEL ENABLE ====================

async function handleCancelEnable(client, interaction) {
    log.debug(`[SafeModPanel] ❌ User cancelled system enable`)
    
    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(0x95A5A6)
                .setDescription('❌ Safe-Moderation enable cancelled.\n\nYou can try again after adjusting the bot\'s role position.')
        ],
        components: []
    })
    
    // Delete after 5 seconds
    setTimeout(() => {
        interaction.deleteReply().catch(() => {})
    }, 5000)
}

// ==================== EDIT WEBHOOK ====================

async function handleEditWebhook(client, interaction) {
    const webhookHelpButton = new ButtonBuilder()
        .setCustomId('ss_webhook_help')
        .setEmoji('❔')
        .setStyle(ButtonStyle.Secondary)

    const row = new ActionRowBuilder().addComponents(webhookHelpButton)

    // Send public message (not ephemeral)
    await interaction.reply({
        content: `**Enter the webhook link, where logs will be posted.**\n> To cancel enter: cancel`,
        components: [row]
    })

    // Set up message collector
    const filter = m => m.author.id === interaction.user.id && m.channel.id === interaction.channel.id
    const collector = interaction.channel.createMessageCollector({ filter, time: 180000 }) // 3 minutes

    collector.on('collect', async (message) => {
        const content = message.content.toLowerCase()
        
        // Delete user message
        message.delete().catch(() => {})

        if (content === 'cancel') {
            collector.stop('cancelled')
            return
        }

        // Validate webhook URL
        if (!message.content.startsWith('https://discord.com/api/webhooks/') && !message.content.startsWith('https://discordapp.com/api/webhooks/')) {
            await interaction.followUp({
                content: '❌ Invalid webhook URL. Please provide a valid Discord webhook URL.',
                ephemeral: true
            })
            return
        }

        let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
        if (!config) {
            config = new safeModerationSchema({ guildID: interaction.guild.id })
        }

        config.logWebhook = message.content
        await config.save()

        // Invalidate cache
        if (client.safeModerationConfigCache) {
            await client.safeModerationConfigCache.invalidate(interaction.guild.id)
        }

        collector.stop('success')
    })

    collector.on('end', async (collected, reason) => {
        if (reason === 'cancelled') {
            await interaction.editReply({
                content: '❌ Webhook update cancelled.',
                components: []
            })
            // Delete after 3 seconds
            setTimeout(() => {
                interaction.deleteReply().catch(() => {})
            }, 3000)
            return
        }

        // Show loading message immediately
        await interaction.editReply({
            content: '<a:Loading:1463867438209699883> Processing...',
            components: []
        })

        // Update panel immediately
        try {
            // Reload config to get latest data
            const updatedConfig = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
            
            // SMART APPROACH: Only search last 5 messages
            const messages = await interaction.channel.messages.fetch({ limit: 5 })
            const panelMessage = messages.find(m => {
                if (m.author.id !== client.user.id) return false
                if (!m.components || m.components.length === 0) return false
                
                // Check for V2 components (containers)
                return m.components.some(row => {
                    // Handle both regular components and container components
                    if (row.components && Array.isArray(row.components)) {
                        return row.components.some(c => c.customId?.includes('ss_select_permission'))
                    }
                    // Handle container type
                    if (row.type === 'CONTAINER' || row.data?.custom_id?.includes('ss_select_permission')) {
                        return true
                    }
                    return false
                })
            })
            
            if (panelMessage && updatedConfig) {
                // Fetch command ID using helper function
                const clearRestrictionsCommandId = await fetchClearRestrictionsCommandId(client, interaction.guild)
                
                const container = await buildControlPanelContainer(client, updatedConfig, interaction.guild, clearRestrictionsCommandId)
                const components = await buildControlPanelComponents(updatedConfig, client, clearRestrictionsCommandId)
                await panelMessage.edit({ components: [container, ...components], flags: [MessageFlags.IsComponentsV2] })
            }
        } catch (error) {
            log.error('[SafeModPanel] Error refreshing panel:', error)
        }

        // Show success message
        if (reason === 'success') {
            await interaction.editReply({
                content: '✅ Webhook updated successfully.',
                components: []
            })
        } else {
            await interaction.editReply({
                content: '⏱️ Time expired. Please try again.',
                components: []
            })
        }

        // Delete after 3 seconds
        setTimeout(() => {
            interaction.deleteReply().catch(() => {})
        }, 3000)
    })

    // Auto-delete after 3 minutes
    setTimeout(() => {
        interaction.deleteReply().catch(() => {})
    }, 180000)
}

// ==================== SETTINGS SELECT ====================

async function handleSettingsSelect(client, interaction) {
    const settingType = interaction.values[0]

    if (settingType === 'toggle_bot_protection') {
        await handleToggleBotProtection(client, interaction)
    } else if (settingType === 'edit_webhook') {
        await handleEditWebhook(client, interaction)
    } else if (settingType === 'edit_manager_roles') {
        await handleEditManagerRoles(client, interaction)
    } else if (settingType === 'manage_whitelist_roles') {
        await handleManageWhitelistRoles(client, interaction)
    }
}

// ==================== TOGGLE BOT PROTECTION ====================

async function handleToggleBotProtection(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    // Defer the update immediately for faster response
    await interaction.deferUpdate()

    config.botProtection.enabled = !config.botProtection.enabled
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    // Refresh the panel immediately
    await showControlPanel(client, interaction)
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

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    config.permissions[permissionKey].enabled = !config.permissions[permissionKey].enabled
    config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    await interaction.deferUpdate()
    
    // Fetch the clear-restrictions command ID
    let clearRestrictionsCommandId = null;
    try {
        const commands = await client.application.commands.fetch();
        const clearRestrictionsCmd = commands.find(cmd => cmd.name === 'clear-restrictions');
        if (clearRestrictionsCmd) {
            clearRestrictionsCommandId = clearRestrictionsCmd.id;
        }
    } catch (error) {
        log.error('[SafeModPanel] Error fetching command ID:', error);
    }
    
    // Rebuild panel with updated status
    const permConfig = config.permissions[permissionKey]
    const container = await buildControlPanelContainer(client, config, interaction.guild, clearRestrictionsCommandId)
    const components = buildControlPanelComponentsWithSettings(config, permissionKey, permConfig, clearRestrictionsCommandId)

    await interaction.editReply({
        components: [container, ...components],
        flags: [MessageFlags.IsComponentsV2]
    })
}

// ==================== PERMISSION SELECT ====================

async function handlePermissionSelect(client, interaction) {
    const permissionKey = interaction.values[0]
    selectedPermissions.set(interaction.user.id, permissionKey)

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    const clearRestrictionsCommandId = await fetchClearRestrictionsCommandId(client, interaction.guild)

    // Initialize spamPrevention if selecting it and it doesn't exist
    if (permissionKey === 'spamPrevention' && !config.spamPrevention) {
        config.spamPrevention = {
            enabled: false,
            punishmentType: 'TIMEOUT',
            punishmentDuration: '2days',
            actionsLimit: 1,
            timeBetweenActions: 21600,
            restrictionType: 'global',
            specificRoles: [],
            specificChannels: [],
            whitelistDomains: []
        }
        config.markModified('spamPrevention')
        await config.save()
    }

    const permConfig = permissionKey === 'spamPrevention' 
        ? config.spamPrevention 
        : config.permissions[permissionKey]
    
    // Build updated control panel with settings menu
    const container = await buildControlPanelContainer(client, config, interaction.guild, clearRestrictionsCommandId)
    const components = buildControlPanelComponentsWithSettings(config, permissionKey, permConfig, clearRestrictionsCommandId)

    await interaction.update({
        components: [container, ...components],
        flags: [MessageFlags.IsComponentsV2]
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
        case 'edit_punishment_type':
            await handleSpamPunishmentSelect(client, interaction)
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

// ==================== EDIT MANAGER ROLES ====================

async function handleEditManagerRoles(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeModerationSchema({ guildID: interaction.guild.id })
    }

    // Check if webhook is set first
    if (!config.logWebhook) {
        return interaction.reply({
            content: '❌ Please set a webhook first before configuring manager roles. Manager roles need a log channel to be notified.',
            ephemeral: true
        })
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
            .setLabel('Remove All Roles')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)

        components.push(new ActionRowBuilder().addComponents(removeButton))
    }

    await interaction.reply({
        content: 'Select manager roles (these roles can approve restrictions):',
        components: components,
        ephemeral: true
    })

    // Auto-delete after 3 minutes
    setTimeout(() => {
        interaction.deleteReply().catch(() => {})
    }, 180000)
}

async function handleManagerRolesSelect(client, interaction) {
    const roleIds = interaction.values
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeModerationSchema({ guildID: interaction.guild.id })
    }

    // Add new roles (avoid duplicates)
    for (const roleId of roleIds) {
        if (!config.managerRoles.includes(roleId)) {
            config.managerRoles.push(roleId)
        }
    }

    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    const rolesMention = config.managerRoles.map(id => `<@&${id}>`).join(', ')

    // Check if this is part of the enable flow
    if (interaction.customId === 'ss_manager_roles_select_enable') {
        // Enable the system and show loading
        config.enabled = true
        await config.save()

        // Invalidate cache
        if (client.safeModerationConfigCache) {
            await client.safeModerationConfigCache.invalidate(interaction.guild.id)
        }

        // Start validator monitoring
        log.debug(`[SafeModPanel] ✅ System enabled, starting validator monitoring`)
        client.safeModerationValidator.startMonitoring(interaction.guild)

        // Show loading message
        await interaction.update({
            content: '<a:Loading:1463867438209699883> Processing...',
            components: []
        })

        // Update panel using smart approach (10 messages for better reliability during enable)
        try {
            const updatedConfig = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
            
            // Fetch the clear-restrictions command ID
            const clearRestrictionsCommandId = await fetchClearRestrictionsCommandId(client, interaction.guild)
            
            // SMART APPROACH: Search last 10 messages to find the panel (increased for enable flow)
            const messages = await interaction.channel.messages.fetch({ limit: 10 })
            const panelMessage = messages.find(m => {
                if (m.author.id !== client.user.id) return false
                if (!m.components || m.components.length === 0) return false
                
                // Check for V2 components (containers) - look for safe-moderation panel
                return m.components.some(row => {
                    // Handle both regular components and container components
                    if (row.components && Array.isArray(row.components)) {
                        return row.components.some(c => c.customId?.includes('ss_select_permission') || c.customId?.includes('ss_toggle_system'))
                    }
                    // Handle container type
                    if (row.type === 'CONTAINER' || row.data?.custom_id?.includes('ss_select_permission')) {
                        return true
                    }
                    return false
                })
            })
            
            if (panelMessage && updatedConfig) {
                const container = await buildControlPanelContainer(client, updatedConfig, interaction.guild, clearRestrictionsCommandId)
                const components = await buildControlPanelComponents(updatedConfig, client, clearRestrictionsCommandId)
                await panelMessage.edit({ components: [container, ...components], flags: [MessageFlags.IsComponentsV2] })
                log.debug('[SafeModPanel] ✅ Panel updated successfully with Compact V2 style after enable')
            } else {
                log.warn('[SafeModPanel] ⚠️ Could not find panel message to update after enable')
            }
        } catch (error) {
            log.error('[SafeModPanel] Error updating main panel:', error)
        }

        // Show success message
        await interaction.editReply({
            content: `✅ Manager roles set: ${rolesMention}\n\n✅ **Safe Moderation has been enabled!**`,
            components: []
        })

        // Delete after 3 seconds
        setTimeout(() => {
            interaction.deleteReply().catch(() => {})
        }, 3000)
    } else {
        // Regular edit flow - show loading
        await interaction.update({
            content: '<a:Loading:1463867438209699883> Processing...',
            components: []
        })

        // Update panel using smart approach (10 messages for better reliability)
        try {
            const updatedConfig = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
            
            // Fetch the clear-restrictions command ID
            const clearRestrictionsCommandId = await fetchClearRestrictionsCommandId(client, interaction.guild)
            
            // SMART APPROACH: Search last 10 messages
            const messages = await interaction.channel.messages.fetch({ limit: 10 })
            const panelMessage = messages.find(m => {
                if (m.author.id !== client.user.id) return false
                if (!m.components || m.components.length === 0) return false
                
                // Check for V2 components (containers) - look for safe-moderation panel
                return m.components.some(row => {
                    // Handle both regular components and container components
                    if (row.components && Array.isArray(row.components)) {
                        return row.components.some(c => c.customId?.includes('ss_select_permission') || c.customId?.includes('ss_toggle_system'))
                    }
                    // Handle container type
                    if (row.type === 'CONTAINER' || row.data?.custom_id?.includes('ss_select_permission')) {
                        return true
                    }
                    return false
                })
            })
            
            if (panelMessage && updatedConfig) {
                const container = await buildControlPanelContainer(client, updatedConfig, interaction.guild, clearRestrictionsCommandId)
                const components = await buildControlPanelComponents(updatedConfig, client, clearRestrictionsCommandId)
                await panelMessage.edit({ components: [container, ...components], flags: [MessageFlags.IsComponentsV2] })
                log.debug('[SafeModPanel] ✅ Panel updated successfully with Compact V2 style')
            } else {
                log.warn('[SafeModPanel] ⚠️ Could not find panel message to update')
            }
        } catch (error) {
            log.error('[SafeModPanel] Error refreshing panel:', error)
        }

        // Show success message
        await interaction.editReply({
            content: `✅ Manager roles updated: ${rolesMention}`,
            components: []
        })

        // Delete after 3 seconds
        setTimeout(() => {
            interaction.deleteReply().catch(() => {})
        }, 3000)
    }
}

async function handleManagerRolesRemove(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config || !config.managerRoles || config.managerRoles.length === 0) {
        return interaction.update({
            content: '❌ No manager roles to remove.',
            components: []
        })
    }

    config.managerRoles = []
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    // Show loading message
    await interaction.update({
        content: '<a:Loading:1463867438209699883> Processing...',
        components: []
    })

    // Update main panel
    await refreshMainPanel(client, interaction)

    // Show success message
    await interaction.editReply({
        content: '✅ All manager roles removed successfully.',
        components: []
    })

    // Delete after 3 seconds
    setTimeout(() => {
        interaction.deleteReply().catch(() => {})
    }, 3000)
}

// ==================== MANAGE WHITELIST ROLES ====================

async function handleManageWhitelistRoles(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    // Build embed showing current whitelist roles
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🛡️ Manage Whitelist Roles')
        .setDescription('Users with these roles will be exempt from all safe moderation actions.\n\n**Current Whitelisted Roles:**')
    
    if (config.whitelistRoles && config.whitelistRoles.length > 0) {
        const rolesList = config.whitelistRoles.map(id => `<@&${id}>`).join('\n')
        embed.addFields({ name: 'Roles', value: rolesList, inline: false })
    } else {
        embed.addFields({ name: 'Roles', value: 'No roles whitelisted', inline: false })
    }

    const components = []

    // Add role select menu
    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId('ss_whitelist_roles_add')
        .setPlaceholder('Select roles to add to whitelist')
        .setMinValues(1)
        .setMaxValues(10)

    components.push(new ActionRowBuilder().addComponents(roleSelect))

    // Add remove button if roles exist
    if (config.whitelistRoles && config.whitelistRoles.length > 0) {
        const removeSelect = new RoleSelectMenuBuilder()
            .setCustomId('ss_whitelist_roles_remove')
            .setPlaceholder('Select roles to remove from whitelist')
            .setMinValues(1)
            .setMaxValues(Math.min(config.whitelistRoles.length, 25))

        const clearButton = new ButtonBuilder()
            .setCustomId('ss_whitelist_roles_clear')
            .setLabel('Clear All')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)

        components.push(new ActionRowBuilder().addComponents(removeSelect))
        components.push(new ActionRowBuilder().addComponents(clearButton))
    }

    await interaction.reply({
        embeds: [embed],
        components: components,
        ephemeral: true
    })
}

async function handleWhitelistRolesAdd(client, interaction) {
    const roleIds = interaction.values
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({ephemeral:true,content: '❌ Safe Moderation is not configured.',
            components: []
        })
    }

    // Initialize whitelistRoles if it doesn't exist
    if (!config.whitelistRoles) {
        config.whitelistRoles = []
    }

    // Add new roles (avoid duplicates)
    let addedCount = 0
    for (const roleId of roleIds) {
        if (!config.whitelistRoles.includes(roleId)) {
            config.whitelistRoles.push(roleId)
            addedCount++
        }
    }

    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    const rolesMention = roleIds.map(id => `<@&${id}>`).join(', ')

    // Show loading message
    await interaction.reply({content: '<a:Loading:1463867438209699883> Processing...',ephemeral:true})

    // Update main panel
    await refreshMainPanel(client, interaction)

    // Show success message
    await interaction.editReply({
        content: `✅ ${addedCount > 0 ? `Added ${addedCount} role(s) to whitelist: ${rolesMention}` : 'Roles already in whitelist.'}`,
        components: []
    })

    // Delete after 3 seconds
    setTimeout(() => {
        interaction.deleteReply().catch(() => {})
    }, 3000)
}

async function handleWhitelistRolesRemove(client, interaction) {
    const roleIds = interaction.values
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config || !config.whitelistRoles || config.whitelistRoles.length === 0) {
        return interaction.reply({ephemeral:true,content: '❌ No whitelist roles to remove.',
            components: []
        })
    }

    // Remove selected roles
    let removedCount = 0
    for (const roleId of roleIds) {
        const index = config.whitelistRoles.indexOf(roleId)
        if (index > -1) {
            config.whitelistRoles.splice(index, 1)
            removedCount++
        }
    }

    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    const rolesMention = roleIds.map(id => `<@&${id}>`).join(', ')

    // Show loading message
    await interaction.reply({content: '<a:Loading:1463867438209699883> Processing...',ephemeral:true})

    // Update main panel
    await refreshMainPanel(client, interaction)

    // Show success message
    await interaction.editReply({
        content: `✅ Removed ${removedCount} role(s) from whitelist: ${rolesMention}`,
        components: []
    })

    // Delete after 3 seconds
    setTimeout(() => {
        interaction.deleteReply().catch(() => {})
    }, 3000)
}

async function handleWhitelistRolesClear(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config || !config.whitelistRoles || config.whitelistRoles.length === 0) {
        return interaction.reply({ephemeral:true,content: '❌ No whitelist roles to clear.',
            components: []
        })
    }

    config.whitelistRoles = []
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    // Show loading message
    await interaction.reply({content: '<a:Loading:1463867438209699883> Processing...',ephemeral:true})

    // Update main panel
    await refreshMainPanel(client, interaction)

    // Show success message
    await interaction.editReply({
        content: '✅ All whitelist roles cleared successfully.',
        components: []
    })

    // Delete after 3 seconds
    setTimeout(() => {
        interaction.deleteReply().catch(() => {})
    }, 3000)
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
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    if (value === 'custom') {
        return await showCooldownCustomModal(client, interaction)
    }

    if (value === 'approval') {
        // Check if Server Panel is enabled first
        let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
        
        if (!config.serverPanel?.enabled) {
            return interaction.reply({
                content: '❌ You must enable the **Server Panel** first before setting approval mode.\n\n' +
                        '**Why?** Approval messages need to be sent to the Server Panel channel.\n\n' +
                        '**How to enable:**\n' +
                        '1. Go back to the main Safe Moderation panel\n' +
                        '2. Click the "Enable Server Panel" button\n' +
                        '3. Then return here to set approval mode',
                ephemeral: true
            })
        }

        // Set a special value for approval mode
        config.permissions[permissionKey].cooldown = -1 // -1 indicates approval mode
        config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
        await config.save()

        // Create approval channel automatically (will use Server Panel channel if enabled)
        const ApprovalChannelManager = require('../handler/approvalChannelManager')
        const approvalManager = new ApprovalChannelManager(client)
        const approvalChannel = await approvalManager.createOrGetApprovalChannel(interaction.guild, config)

        // Invalidate cache
        if (client.safeModerationConfigCache) {
            await client.safeModerationConfigCache.invalidate(interaction.guild.id)
        }

        await interaction.reply({
            content: `✅ Cooldown set to **Owner/Admin Approval** mode.\n\n` +
                    `📍 **Approval Channel:** ${approvalChannel ? `<#${approvalChannel.id}>` : 'Failed to create'}\n` +
                    `🔔 **Manager Roles:** ${config.managerRoles?.length > 0 ? config.managerRoles.map(id => `<@&${id}>`).join(', ') : 'None set'}\n\n` +
                    `**How it works:**\n` +
                    `• When users exceed limits, approval requests are sent to the channel\n` +
                    `• Manager roles are pinged for each request\n` +
                    `• Detailed information about the restriction is provided\n` +
                    `• Buttons expire after 2 months with automatic role restoration`,
            ephemeral: true
        })
    } else {
        const duration = parseInt(value)
        
        let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
        
        // Check if we're switching from approval mode to time-based cooldown
        const wasApprovalMode = config.permissions[permissionKey].cooldown === -1
        
        config.permissions[permissionKey].cooldown = duration
        config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
        await config.save()

        // Clean up approval channel if switching from approval mode and no other permissions use approval
        if (wasApprovalMode) {
            const ApprovalChannelManager = require('../handler/approvalChannelManager')
            const approvalManager = new ApprovalChannelManager(client)
            const channelDeleted = await approvalManager.cleanupApprovalChannelIfUnused(interaction.guild, config)
            
            if (channelDeleted) {
                log.debug(`[SafeModPanel] ✅ Cleaned up approval channel - no permissions use approval mode`)
            }
        }

        // Invalidate cache
        if (client.safeModerationConfigCache) {
            await client.safeModerationConfigCache.invalidate(interaction.guild.id)
        }

        await interaction.reply({
            content: `✅ Cooldown set to **${formatDuration(duration)}**`,
            ephemeral: true
        })
    }

    // Refresh main panel - find and update it
    await refreshMainPanel(client, interaction)
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
        return interaction.reply({ephemeral:true,content: '❌ Please select a permission first.',
            components: []
        })
    }

    if (value === 'custom') {
        return await showTimeBetweenCustomModal(client, interaction)
    }

    const duration = parseInt(value)
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].timeBetweenActions = duration
    config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    await interaction.reply({content: `✅ Time between actions set to **${formatDuration(duration)}**`,ephemeral:true})

    // Refresh main panel - find and update it
    await refreshMainPanel(client, interaction)
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
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
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
        return interaction.reply({ephemeral:true,content: '❌ Please select a permission first.',
            components: []
        })
    }

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })

    if (value === 'global') {
        config.permissions[permissionKey].restrictionType = 'global'
        config.permissions[permissionKey].specificRoles = []
        config.permissions[permissionKey].specificUsers = []
        config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
        await config.save()

        // Invalidate cache
        if (client.safeModerationConfigCache) {
            await client.safeModerationConfigCache.invalidate(interaction.guild.id)
        }

        await interaction.reply({content: '✅ Restriction type set to **Global** (applies to all moderators)',ephemeral:true})
    } else if (value === 'specific') {
        config.permissions[permissionKey].restrictionType = 'specific'
        config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
        await config.save()

        // Invalidate cache
        if (client.safeModerationConfigCache) {
            await client.safeModerationConfigCache.invalidate(interaction.guild.id)
        }

        // Show role and user selection
        await showSpecificSelection(client, interaction, permissionKey)
        return
    }

    // Refresh main panel
    await refreshMainPanel(client, interaction)
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

    await interaction.reply({
        content: 'Select specific roles and/or users to apply this restriction to:',
        components: [
            new ActionRowBuilder().addComponents(roleSelect)
        ],
        ephemeral: true
    })
}

async function handleSpecificRolesSelect(client, interaction) {
    const roleIds = interaction.values
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({ephemeral:true,content: '❌ Please select a permission first.',
            components: []
        })
    }

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].specificRoles = roleIds
    config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    const rolesMention = roleIds.map(id => `<@&${id}>`).join(', ')

    await interaction.reply({content: `✅ Specific roles set:\n${rolesMention || 'None'}`,ephemeral:true})

    // Refresh main panel
    await refreshMainPanel(client, interaction)
}

async function handleSpecificUsersSelect(client, interaction) {
    const userIds = interaction.values
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({ephemeral:true,content: '❌ Please select a permission first.',
            components: []
        })
    }

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].specificUsers = userIds
    config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    const usersMention = userIds.map(id => `<@${id}>`).join(', ')

    await interaction.reply({content: `✅ Specific users set:\n${usersMention || 'None'}`,ephemeral:true})

    // Refresh main panel
    await refreshMainPanel(client, interaction)
}

async function handleRestrictionReset(client, interaction) {
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({ephemeral:true,content: '❌ Please select a permission first.',
            components: []
        })
    }

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].restrictionType = 'global'
    config.permissions[permissionKey].specificRoles = []
    config.permissions[permissionKey].specificUsers = []
    config.markModified('permissions') // CRITICAL: Tell Mongoose this nested field changed
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    await interaction.reply({content: '✅ Restriction type reset to **Global** (default)',ephemeral:true})

    // Refresh main panel
    await refreshMainPanel(client, interaction)
}

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
        // Check the last 10 messages (increased for better reliability)
        const messages = await interaction.channel.messages.fetch({ limit: 10 }).catch(() => null)
        if (!messages) return
        
        const panelMessage = messages.find(msg => {
            if (msg.author.id !== client.user.id) return false
            if (!msg.components || msg.components.length === 0) return false
            
            // Check for V2 components (containers) - look for safe-moderation panel
            return msg.components.some(row => {
                // Handle both regular components and container components
                if (row.components && Array.isArray(row.components)) {
                    return row.components.some(c => c.customId?.includes('ss_select_permission') || c.customId?.includes('ss_toggle_system'))
                }
                // Handle container type or direct customId
                if (row.customId?.includes('ss_select_permission') || row.customId?.includes('ss_toggle_system')) {
                    return true
                }
                // Handle container type
                if (row.type === 'CONTAINER' || row.data?.custom_id?.includes('ss_select_permission')) {
                    return true
                }
                return false
            })
        })
        
        if (panelMessage) {
            const container = await buildControlPanelContainer(client, config, interaction.guild, clearRestrictionsCommandId)
            const components = await buildControlPanelComponents(config, client, clearRestrictionsCommandId)
            await panelMessage.edit({ components: [container, ...components], flags: [MessageFlags.IsComponentsV2] })
            log.debug('[SafeModPanel] ✅ Panel refreshed successfully with Compact V2 style')
        } else {
            log.warn('[SafeModPanel] ⚠️ Could not find panel message to refresh')
        }
    } catch (error) {
        log.error('[SafeModPanel] Error refreshing panel:', error)
    }
}

// ==================== CONTROL PANEL BUILDERS ====================

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
        } else {
            // Fall back to global commands if not found in guild
            const globalCommands = await client.application.commands.fetch();
            const globalCmd = globalCommands.find(cmd => cmd.name === 'clear-restrictions');
            if (globalCmd) {
                clearRestrictionsCommandId = globalCmd.id;
            }
        }
    } catch (error) {
        log.error('[SafeModPanel] Error fetching clear-restrictions command ID:', error);
    }

    const container = await buildControlPanelContainer(client, config, interaction.guild, clearRestrictionsCommandId)
    const components = await buildControlPanelComponents(config, client, clearRestrictionsCommandId)

    const method = interaction.replied || interaction.deferred ? 'editReply' : 'update'
    await interaction[method]({
        components: [container, ...components],
        flags: [MessageFlags.IsComponentsV2]
    })
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
        } else if (spamConfig.punishmentType === 'WARN') {
            punishmentText = 'Warn ⚠️'
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
            log.error('[SafeModPanel] Error in webhook section:', error)
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
        new TextDisplayBuilder().setContent('> **Note:** Global Restriction means the restriction will be for all server mods and all bots if Bot Shield is enabled (RECOMMENDED)')
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

function buildControlPanelComponentsWithSettings(config, permissionKey, permConfig, clearRestrictionsCommandId = null) {
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
            { label: 'Ban & Kick Members', value: 'banKickMembers', emoji: '🚫', default: permissionKey === 'banKickMembers' },
            { label: 'Timeout Members', value: 'timeoutMembers', emoji: '⏸️', default: permissionKey === 'timeoutMembers' },
            { label: 'Delete Role', value: 'deleteRole', emoji: '🎭', default: permissionKey === 'deleteRole' },
            { label: 'Delete Channel', value: 'deleteChannel', emoji: '🗑️', default: permissionKey === 'deleteChannel' },
            { label: 'Deleting Emojis & Stickers', value: 'deleteEmojisStickers', emoji: '😀', default: permissionKey === 'deleteEmojisStickers' },
            { label: 'Delete Messages', value: 'deleteMessages', emoji: '💬', default: permissionKey === 'deleteMessages' },
            { label: 'Change Nickname', value: 'changeNickname', emoji: '✏️', default: permissionKey === 'changeNickname' },
            { label: 'Adding Mass Bots', value: 'addingMassBots', emoji: '🤖', default: permissionKey === 'addingMassBots' },
            { label: 'Disconnecting or Moving Members from VC', value: 'voiceModeration', emoji: '🎤', default: permissionKey === 'voiceModeration' },
            { label: 'Muting Members from VC', value: 'mutingMembers', emoji: '🔇', default: permissionKey === 'mutingMembers' },
            { label: 'Deafening Members from VC', value: 'deafeningMembers', emoji: '🔊', default: permissionKey === 'deafeningMembers' },
            { label: '@everyone / @here Spam', value: 'everyoneHereSpam', emoji: '📢', default: permissionKey === 'everyoneHereSpam' },
            { label: 'Spam Prevention System', value: 'spamPrevention', emoji: '🛡️', default: permissionKey === 'spamPrevention' }
        ])

    components.push(new ActionRowBuilder().addComponents(permissionSelect))

    // Settings menu for permission configuration
    if (permissionKey === 'spamPrevention') {
        // Spam Prevention specific settings menu
        const spamSettingsMenu = new StringSelectMenuBuilder()
            .setCustomId('ss_settings_menu')
            .setPlaceholder('Configure Spam Prevention')
            .addOptions([
                { label: 'Edit Punishment Type', description: 'Ban, Kick, or Timeout', value: 'edit_punishment_type', emoji: '⚔️' },
                { label: 'Edit No. of Actions', description: 'Set spam violation limit', value: 'edit_action_count', emoji: '🔢' },
                { label: 'Edit Restriction Type', description: 'Global, Role-Based, or Channel-Based', value: 'edit_restriction_type', emoji: '🎯' },
                { label: 'Edit Time between Actions', description: 'Set time window', value: 'edit_time_between', emoji: '⏰' }
            ])
        components.push(new ActionRowBuilder().addComponents(spamSettingsMenu))
    } else {
        // Regular permission settings menu
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
    }

    // Settings select menu (Edit Webhook, Edit Manager Roles, Manage Whitelist Roles)
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

    // Toggle button for selected permission
    const toggleButtonId = permissionKey === 'spamPrevention' ? 'ss_spam_prevention_toggle' : 'ss_toggle_permission'
    const toggleButton = new ButtonBuilder()
        .setCustomId(toggleButtonId)
        .setLabel(permConfig.enabled ? 'Disable' : 'Enable')
        .setEmoji(permConfig.enabled ? '❌' : '✅')
        .setStyle(permConfig.enabled ? ButtonStyle.Danger : ButtonStyle.Success)

    const buttonsRow1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_toggle_system')
                .setLabel(config.enabled ? 'Disable Safe Moderation' : 'Enable Safe Moderation')
                .setEmoji(config.enabled ? '❌' : '✅')
                .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            toggleButton
        )

    components.push(buttonsRow1)

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

// ==================== WEBHOOK HELP ====================

async function handleWebhookHelp(client, interaction) {
    await interaction.reply({
        content: `**What are webhooks?**\n\n` +
            `Webhooks are a way to send automated messages to a Discord channel. ` +
            `They allow the bot to post logs without using its main account.\n\n` +
            `**How to create a webhook:**\n` +
            `1️⃣ Go to the channel where you want logs to be sent\n` +
            `2️⃣ Click on channel settings (gear icon)\n` +
            `3️⃣ Go to Integrations → Webhooks\n` +
            `4️⃣ Click 'New Webhook' or 'Create Webhook'\n` +
            `5️⃣ Copy the webhook URL\n` +
            `6️⃣ Paste it in the chat`,
        ephemeral: true
    })
}

// ==================== SKIP MANAGER ROLES ====================

async function handleSkipManagerRoles(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        config = new safeModerationSchema({ guildID: interaction.guild.id })
    }

    // Enable the system without manager roles
    config.enabled = true
    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    // Start validator monitoring
    log.debug(`[SafeModPanel] ✅ System enabled (no manager roles), starting validator monitoring`)
    client.safeModerationValidator.startMonitoring(interaction.guild)

    await interaction.reply({content: `⚠️ Manager roles skipped.\n\n✅ **Safe Moderation has been enabled!**\n\nUpdating the main panel...`,ephemeral:true})

    // Update the main panel after a short delay
    setTimeout(async () => {
        try {
            // Fetch command ID using helper function
            const clearRestrictionsCommandId = await fetchClearRestrictionsCommandId(client, interaction.guild)
            
            // Find the Safe-Moderation panel message (use 5 messages for consistency)
            const messages = await interaction.channel.messages.fetch({ limit: 5 })
            const panelMessage = messages.find(m => 
                m.author.id === client.user.id && 
                m.components.length > 0 &&
                m.components.some(row => row.components.some(c => c.customId?.includes('ss_select_permission')))
            )
            
            if (panelMessage) {
                const container = await buildControlPanelContainer(client, config, interaction.guild, clearRestrictionsCommandId)
                const components = await buildControlPanelComponents(config, client, clearRestrictionsCommandId)
                await panelMessage.edit({ components: [container, ...components], flags: [MessageFlags.IsComponentsV2] })
            }
        } catch (error) {
            log.error('[SafeModPanel] Error updating main panel:', error)
        }
    }, 1000)
}

// ==================== BOT APPROVAL/REJECTION ====================

// NOTE: Bot approval is now handled by safe-moderation-manage.js to avoid duplicate handlers
// This prevents "InteractionAlreadyReplied" errors

async function handleRejectBot(client, interaction) {
    const botId = interaction.customId.replace('ss_reject_bot_', '')
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    // Check if safeModerationManager exists
    if (!client.safeModerationManager) {
        return interaction.reply({
            content: '❌ Safe-Moderation manager is not available. Please contact an administrator.',
            ephemeral: true
        })
    }

    await interaction.deferUpdate()

    const result = await client.safeModerationManager.rejectBot(interaction.guild, botId, config)

    if (result.success) {
        // Update the message to show rejection
        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(0xE74C3C)
            .setTitle('❌ Safe-Moderation: Bot Rejected')
            .spliceFields(2, 1, { name: '📊 Status', value: `**Current:** ❌ Rejected & Kicked\n**Rejected By:** <@${interaction.user.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:R>`, inline: false })

        await interaction.message.edit({
            embeds: [embed],
            components: [] // Remove buttons
        })

        // Send rejection message ONLY to thread if it exists
        if (interaction.message.hasThread) {
            const thread = interaction.message.thread
            await thread.send({
                content: `❌ **Bot Rejected**\n\nThe bot has been rejected by <@${interaction.user.id}> and has been kicked from the server.`
            }).catch(err => log.error('[SafeModPanel] Thread send error:', err))
            
            // Lock and archive the thread
            await thread.setLocked(true).catch(err => log.error('[SafeModPanel] Thread lock error:', err))
            await thread.setArchived(true).catch(err => log.error('[SafeModPanel] Thread archive error:', err))
        }
    } else {
        // Send error message to thread if available, otherwise ephemeral
        if (interaction.message.hasThread) {
            const thread = interaction.message.thread
            await thread.send({
                content: `❌ **Rejection Failed**\n\n${result.message}\n\nRequested by: <@${interaction.user.id}>`
            }).catch(err => log.error('[SafeModPanel] Thread send error:', err))
        } else {
            await interaction.followUp({
                content: `❌ ${result.message}`,
                ephemeral: true
            })
        }
    }
}

// ==================== SERVER RECOVERY SYSTEM ====================

async function handleServerRecovery(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    // Show Server Recovery panel
    await showServerRecoveryPanel(client, interaction, config)
}

async function handleToggleServerRecoveryEmoji(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    // Check if server panel is enabled
    if (!config.serverPanel?.enabled) {
        return interaction.reply({
            content: '❌ You must enable the **Server Panel** first.',
            ephemeral: true
        })
    }

    // Check if we're enabling (before toggle)
    const wasDisabled = !config.serverRecovery?.emojiStickerRecovery

    // Toggle emoji/sticker recovery
    if (!config.serverRecovery) config.serverRecovery = {}
    config.serverRecovery.emojiStickerRecovery = !config.serverRecovery.emojiStickerRecovery
    
    // Enable serverRecovery if either option is enabled
    config.serverRecovery.enabled = config.serverRecovery.emojiStickerRecovery || config.serverRecovery.channelRoleRecovery

    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    // If we just enabled emoji/sticker recovery, trigger proactive backup
    if (wasDisabled && config.serverRecovery.emojiStickerRecovery) {
        await interaction.deferUpdate()
        
        // Get Server Panel channel
        const serverPanelChannel = await interaction.guild.channels.fetch(config.serverPanel.channelId).catch(() => null)
        
        if (serverPanelChannel) {
            // Build manager role mentions
            const managerMentions = config.managerRoles && config.managerRoles.length > 0
                ? config.managerRoles.map(roleId => `<@&${roleId}>`).join(' ')
                : ''
            
            // Send initial backup message to Server Panel
            const backupMessage = await serverPanelChannel.send({
                content: managerMentions || undefined,
                embeds: [
                    new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('🔄 Emoji/Sticker Backup Started')
                        .setDescription('Starting proactive backup of all emojis and stickers to the database...')
                        .addFields([
                            { name: '📊 Status', value: 'In Progress...', inline: true },
                            { name: '👤 Initiated By', value: `<@${interaction.user.id}>`, inline: true }
                        ])
                        .setTimestamp()
                ]
            })

            // Trigger backup in background
            client.serverRecoveryHandler.backupAllGuildResources(interaction.guild, config, {
                emojiStickerRecovery: true,
                channelRoleRecovery: false
            }).then(async stats => {
                if (stats) {
                    // Update the message with completion status
                    await backupMessage.edit({
                        content: managerMentions || undefined,
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#2ECC71')
                                .setTitle('✅ Emoji/Sticker Backup Complete')
                                .setDescription('All emojis and stickers have been successfully backed up to the database.')
                                .addFields([
                                    { name: '😀 Emojis Backed Up', value: `${stats.emojis}`, inline: true },
                                    { name: '🎨 Stickers Backed Up', value: `${stats.stickers}`, inline: true },
                                    { name: '👤 Initiated By', value: `<@${interaction.user.id}>`, inline: true }
                                ])
                                .setTimestamp()
                        ]
                    }).catch(() => {})
                }
            }).catch(async error => {
                log.error('[SafeModPanel] Backup error:', error)
                // Update message with error status
                await backupMessage.edit({
                    content: managerMentions || undefined,
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#E74C3C')
                            .setTitle('⚠️ Emoji/Sticker Backup Completed with Errors')
                            .setDescription('Backup completed but some errors occurred. Check console for details.')
                            .addFields([
                                { name: '👤 Initiated By', value: `<@${interaction.user.id}>`, inline: true }
                            ])
                            .setTimestamp()
                    ]
                }).catch(() => {})
            })
        }

        await showServerRecoveryPanel(client, interaction, config)
    } else {
        await interaction.deferUpdate()
        await showServerRecoveryPanel(client, interaction, config)
    }
}

async function handleToggleServerRecoveryChannel(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    // Check if server panel is enabled
    if (!config.serverPanel?.enabled) {
        return interaction.reply({
            content: '❌ You must enable the **Server Panel** first.',
            ephemeral: true
        })
    }

    // Check if we're enabling (before toggle)
    const wasDisabled = !config.serverRecovery?.channelRoleRecovery

    // Toggle channel/role recovery
    if (!config.serverRecovery) config.serverRecovery = {}
    config.serverRecovery.channelRoleRecovery = !config.serverRecovery.channelRoleRecovery
    
    // Enable serverRecovery if either option is enabled
    config.serverRecovery.enabled = config.serverRecovery.emojiStickerRecovery || config.serverRecovery.channelRoleRecovery

    await config.save()

    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }

    // If we just enabled channel/role recovery, trigger proactive backup
    if (wasDisabled && config.serverRecovery.channelRoleRecovery) {
        await interaction.deferUpdate()
        
        // Get Server Panel channel
        const serverPanelChannel = await interaction.guild.channels.fetch(config.serverPanel.channelId).catch(() => null)
        
        if (serverPanelChannel) {
            // Build manager role mentions
            const managerMentions = config.managerRoles && config.managerRoles.length > 0
                ? config.managerRoles.map(roleId => `<@&${roleId}>`).join(' ')
                : ''
            
            // Send initial backup message to Server Panel
            const backupMessage = await serverPanelChannel.send({
                content: managerMentions || undefined,
                embeds: [
                    new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('🔄 Channel/Role Backup Started')
                        .setDescription('Starting proactive backup of all channels and roles to the database...')
                        .addFields([
                            { name: '📊 Status', value: 'In Progress...', inline: true },
                            { name: '👤 Initiated By', value: `<@${interaction.user.id}>`, inline: true }
                        ])
                        .setTimestamp()
                ]
            })

            // Trigger backup in background
            client.serverRecoveryHandler.backupAllGuildResources(interaction.guild, config, {
                emojiStickerRecovery: false,
                channelRoleRecovery: true
            }).then(async stats => {
                if (stats) {
                    // Update the message with completion status
                    await backupMessage.edit({
                        content: managerMentions || undefined,
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#2ECC71')
                                .setTitle('✅ Channel/Role Backup Complete')
                                .setDescription('All channels and roles have been successfully backed up to the database.')
                                .addFields([
                                    { name: '📁 Channels Backed Up', value: `${stats.channels}`, inline: true },
                                    { name: '🎭 Roles Backed Up', value: `${stats.roles}`, inline: true },
                                    { name: '👤 Initiated By', value: `<@${interaction.user.id}>`, inline: true }
                                ])
                                .setTimestamp()
                        ]
                    }).catch(() => {})
                }
            }).catch(async error => {
                log.error('[SafeModPanel] Backup error:', error)
                // Update message with error status
                await backupMessage.edit({
                    content: managerMentions || undefined,
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#E74C3C')
                            .setTitle('⚠️ Channel/Role Backup Completed with Errors')
                            .setDescription('Backup completed but some errors occurred. Check console for details.')
                            .addFields([
                                { name: '👤 Initiated By', value: `<@${interaction.user.id}>`, inline: true }
                            ])
                            .setTimestamp()
                    ]
                }).catch(() => {})
            })
        }

        await showServerRecoveryPanel(client, interaction, config)
    } else {
        await interaction.deferUpdate()
        await showServerRecoveryPanel(client, interaction, config)
    }
}

async function showServerRecoveryPanel(client, interaction, config) {
    // Use V2 container instead of embeds
    const container = new ContainerBuilder()
        .setAccentColor(config.serverRecovery?.enabled ? [52, 152, 219] : [149, 165, 166])

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            '# 🔄 Server Recovery System\n\n' +
            '**Status:** ' + (config.serverRecovery?.enabled ? '✅ Enabled' : '❌ Disabled') + '\n\n' +
            '**Purpose:** Automatically detect and recover channels, roles, emojis, and stickers deleted by moderators/admins.\n\n' +
            '**Protected from:** All moderators and admins (except server owner and manager roles)'
        )
    )

    // Add status displays for recovery systems
    const emojiStickerStatus = config.serverRecovery?.emojiStickerRecovery ? 'Enabled ✅' : 'Disabled ❌'
    const channelRoleStatus = config.serverRecovery?.channelRoleRecovery ? 'Enabled ✅' : 'Disabled ❌'

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**Emoji/Sticker Recovery System:** ${emojiStickerStatus}\n` +
            `**Channel/Role Recovery System:** ${channelRoleStatus}`
        )
    )

    const emojiButton = new ButtonBuilder()
        .setCustomId('ss_toggle_server_recovery_emoji')
        .setLabel(config.serverRecovery?.emojiStickerRecovery ? 'Disable Emoji/Sticker Recovery' : 'Enable Emoji/Sticker Recovery')
        .setEmoji(config.serverRecovery?.emojiStickerRecovery ? '❌' : '✅')
        .setStyle(config.serverRecovery?.emojiStickerRecovery ? ButtonStyle.Danger : ButtonStyle.Success)

    const channelButton = new ButtonBuilder()
        .setCustomId('ss_toggle_server_recovery_channel')
        .setLabel(config.serverRecovery?.channelRoleRecovery ? 'Disable Channel/Role Recovery' : 'Enable Channel/Role Recovery')
        .setEmoji(config.serverRecovery?.channelRoleRecovery ? '❌' : '✅')
        .setStyle(config.serverRecovery?.channelRoleRecovery ? ButtonStyle.Danger : ButtonStyle.Success)

    const row1 = new ActionRowBuilder().addComponents(emojiButton, channelButton)

    // Always send as ephemeral reply
    const method = interaction.replied || interaction.deferred ? 'editReply' : 'reply'
    await interaction[method]({
        embeds: [],
        components: [container, row1],
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
    })
}

// ==================== BOT SHIELD SYSTEM ====================

async function handleSentinelHub(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            flags: [MessageFlags.Ephemeral]
        })
    }

    // Check if safe moderation is enabled
    if (!config.enabled) {
        return interaction.reply({
            content: '❌ You must enable **Safe Moderation** first before enabling Bot Shield.',
            flags: [MessageFlags.Ephemeral]
        })
    }

    // Check if Server Panel is enabled (required for Bot Shield)
    if (!config.serverPanel?.enabled) {
        return interaction.reply({
            content: '❌ You must enable the **Server Panel** first before enabling Bot Shield.\n\n' +
                    '**Why?** Bot Shield needs the Server Panel channel to send bot approval messages.\n\n' +
                    '**How to enable:**\n' +
                    '1. Go back to the main Safe Moderation panel\n' +
                    '2. Click the "Enable Server Panel" button\n' +
                    '3. Then return here to enable Bot Shield',
            flags: [MessageFlags.Ephemeral]
        })
    }

    await showSentinelHubPanel(client, interaction, config)
}

async function showSentinelHubPanel(client, interaction, config) {
    const statusEmoji = config.sentinelHub?.enabled ? '✅' : '❌'
    const statusText = config.sentinelHub?.enabled ? 'Enabled' : 'Disabled'
    
    const description = [
        `**Status:** ${statusEmoji} ${statusText}\n`,
        '**What is Bot Shield?**',
        'Bot Shield restricts moderators/admins who add unauthorized bots or bots with dangerous permissions to your server. It prevents server nuking by:',
        '',
        '• 🔒 **Immediate Neutralization** - Removes dangerous permissions from newly added bots',
        '• 📍 **Role Repositioning** - Moves bot role below system bot for safety',
        '• 🎭 **Quarantine Role** - Adds quarantine role to restrict bot access',
        '• 📨 **Approval Workflow** - Sends interactive Approve/Reject buttons to Server Panel',
        '• ⏰ **Auto-Kick** - Automatically kicks bot after 24 hours if no action taken',
        '• 🛡️ **Integration Support** - Alternative neutralization for integration-managed bots',
        '',
        config.sentinelHub?.enabled ? '**Configuration:**' : '',
        config.sentinelHub?.enabled ? `• **Auto-Kick Timeout:** ${(config.sentinelHub.autoKickTimeout || 86400000) / (1000 * 60 * 60)} hours` : '',
        config.sentinelHub?.enabled ? `• **Risk Threshold:** ${config.sentinelHub.riskThreshold || 'MEDIUM'}` : '',
        config.sentinelHub?.enabled ? '• **Control Channel:** Server Panel Channel' : '',
        '',
        '> **⚠️ Important:** Bot Shield requires the following permissions:',
        '> • Manage Roles (to neutralize bot permissions)',
        '> • Kick Members (for auto-kick after timeout)',
        '> • View Audit Log (to identify who added the bot)'
    ].filter(Boolean).join('\n')

    const toggleButton = new ButtonBuilder()
        .setCustomId('ss_sentinel_hub_toggle')
        .setLabel(config.sentinelHub?.enabled ? 'Disable Bot Shield' : 'Enable Bot Shield')
        .setEmoji(config.sentinelHub?.enabled ? '❌' : '✅')
        .setStyle(config.sentinelHub?.enabled ? ButtonStyle.Danger : ButtonStyle.Success)

    const buttonRow = new ActionRowBuilder().addComponents(toggleButton)

    // Send as ephemeral reply
    const method = interaction.replied || interaction.deferred ? 'editReply' : 'reply'
    await interaction[method]({
        content: `# 🛡️ Bot Shield System\n\n${description}`,
        components: [buttonRow],
        flags: [MessageFlags.Ephemeral]
    })
}

async function handleSentinelHubToggle(client, interaction) {
    await interaction.deferUpdate()
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config.sentinelHub) {
        config.sentinelHub = {
            enabled: false,
            controlChannelId: null,
            autoKickTimeout: 86400000, // 24 hours
            riskThreshold: 'MEDIUM'
        }
    }
    
    if (!config.botShield) {
        config.botShield = {
            enabled: false,
            quarantineRoleId: null
        }
    }
    
    const wasEnabled = config.sentinelHub.enabled
    config.sentinelHub.enabled = !config.sentinelHub.enabled
    
    // Set control channel to Server Panel channel when enabling
    if (config.sentinelHub.enabled && !wasEnabled) {
        log.debug(`[SafeModPanel] 🚀 Bot Shield enabled for guild: ${interaction.guild.name}`)
        
        // Auto-enable Bot Shield for quarantine role functionality
        config.botShield.enabled = true
        log.debug(`[SafeModPanel] 🛡️ Auto-enabled Bot Shield for quarantine role management`)
        
        // Initialize Bot Shield (create quarantine role)
        if (client.botShieldHandler) {
            const initResult = await client.botShieldHandler.initializeBotShield(interaction.guild, config)
            if (initResult.success) {
                log.debug(`[SafeModPanel] ✅ Quarantine role initialized: ${initResult.quarantineRole.name}`)
            } else {
                log.error(`[SafeModPanel] ❌ Quarantine role initialization failed:`, initResult.reason || initResult.error)
            }
        }
        
        // Use Server Panel channel as control channel
        if (config.serverPanel?.channelId) {
            config.sentinelHub.controlChannelId = config.serverPanel.channelId
            log.debug(`[SafeModPanel] 📍 Using Server Panel channel as control channel`)
        }
    }
    
    // Disable Bot Shield when disabling Bot Shield
    if (!config.sentinelHub.enabled && wasEnabled) {
        config.botShield.enabled = false
        log.debug(`[SafeModPanel] ⚠️ Bot Shield disabled for guild: ${interaction.guild.name}`)
        log.debug(`[SafeModPanel] 🛡️ Auto-disabled Bot Shield`)
    }
    
    await config.save()
    
    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    await showSentinelHubPanel(client, interaction, config)
}

// ==================== SERVER PANEL TOGGLE ====================

async function handleToggleServerPanel(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe Moderation is not configured.',
            ephemeral: true
        })
    }

    // Check if safe moderation is enabled
    if (!config.enabled) {
        return interaction.reply({
            content: '❌ You must enable **Safe Moderation** first before enabling Server Panel.',
            ephemeral: true
        })
    }

    await interaction.deferUpdate()

    // Toggle server panel
    if (!config.serverPanel) config.serverPanel = {}
    
    if (!config.serverPanel.enabled) {
        // Enabling - create the channel
        try {
            const channel = await interaction.guild.channels.create({
                name: '🛡️-safe-moderation-logs',
                type: 0, // Text channel
                topic: 'Safe Moderation System Logs - Server Recovery, Bot Shield, and Protection Events',
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: interaction.client.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles']
                    }
                ]
            })

            config.serverPanel.enabled = true
            config.serverPanel.channelId = channel.id
            config.serverPanel.channelCreatedAt = new Date()
            
            await config.save()

            // Invalidate cache
            if (client.safeModerationConfigCache) {
                await client.safeModerationConfigCache.invalidate(interaction.guild.id)
            }

            // Send welcome message to the channel
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x2ECC71)
                        .setTitle('🛡️ Safe Moderation Server Panel')
                        .setDescription(
                            '**Welcome to the Safe Moderation Server Panel!**\n\n' +
                            'This channel will log all safe-moderation events including:\n' +
                            '• Server Recovery requests (deleted channels, roles, emojis, stickers)\n' +
                            '• Bot Shield quarantine and approval events\n' +
                            '• Protection system actions\n' +
                            '• Restriction notifications\n\n' +
                            '**Note:** Only administrators and manager roles can interact with recovery prompts.'
                        )
                        .setTimestamp()
                ]
            })

            log.debug(`[SafeModPanel] ✅ Created server panel channel: ${channel.name}`)
        } catch (error) {
            log.error('[SafeModPanel] Error creating channel:', error)
            return interaction.followUp({
                content: '❌ Failed to create server panel channel. Please check bot permissions.',
                ephemeral: true
            })
        }
    } else {
        // Disabling - check for dependencies first
        const sentinelHubEnabled = config.sentinelHub?.enabled
        const serverRecoveryEnabled = config.serverRecovery?.enabled
        
        // Check if any permission is set to approval mode (-1)
        let hasApprovalMode = false
        if (config.permissions) {
            for (const [permKey, permConfig] of Object.entries(config.permissions)) {
                if (permConfig.cooldown === -1) {
                    hasApprovalMode = true
                    break
                }
            }
        }

        // Build error message if any system is using Server Panel
        if (sentinelHubEnabled || serverRecoveryEnabled || hasApprovalMode) {
            const activeSystems = []
            if (sentinelHubEnabled) activeSystems.push('**Bot Shield System**')
            if (serverRecoveryEnabled) activeSystems.push('**Server Recovery System**')
            if (hasApprovalMode) activeSystems.push('**Owner/Admin Approval** (in one or more permissions)')

            return interaction.followUp({
                content: `❌ Cannot disable Server Panel while the following systems are active:\n\n` +
                        activeSystems.map(s => `• ${s}`).join('\n') + '\n\n' +
                        `**Please disable these systems first:**\n` +
                        `1. Disable Bot Shield System (if enabled)\n` +
                        `2. Disable Server Recovery System (if enabled)\n` +
                        `3. Change all permissions from "Owner/Admin Approval" to time-based cooldowns`,
                ephemeral: true
            })
        }

        // If no dependencies, proceed with disabling
        try {
            if (config.serverPanel.channelId) {
                const channel = await interaction.guild.channels.fetch(config.serverPanel.channelId).catch(() => null)
                if (channel) {
                    await channel.delete('Server Panel disabled')
                    log.debug(`[SafeModPanel] 🗑️ Deleted server panel channel`)
                }
            }

            config.serverPanel.enabled = false
            config.serverPanel.channelId = null
            
            await config.save()

            // Invalidate cache
            if (client.safeModerationConfigCache) {
                await client.safeModerationConfigCache.invalidate(interaction.guild.id)
            }
        } catch (error) {
            log.error('[SafeModPanel] Error deleting channel:', error)
        }
    }

    // Refresh the main panel
    await showControlPanel(client, interaction)
}


// ==================== SPAM PREVENTION HANDLERS ====================

async function handleSpamPreventionToggle(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config.spamPrevention) {
        config.spamPrevention = {
            enabled: false,
            punishmentType: 'TIMEOUT',
            punishmentDuration: '2days',
            actionsLimit: 1,
            timeBetweenActions: 21600,
            restrictionType: 'global'
        }
    }
    
    config.spamPrevention.enabled = !config.spamPrevention.enabled
    config.markModified('spamPrevention')
    await config.save()
    
    // Invalidate cache
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    const status = config.spamPrevention.enabled ? 'enabled' : 'disabled'
    
    await interaction.reply({
        content: `✅ Spam Prevention System ${status}!`,
        ephemeral: true
    })
    
    // Refresh main panel
    await refreshMainPanel(client, interaction)
}

async function handleSpamPunishmentSelect(client, interaction) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ss_spam_punishment_type_select')
        .setPlaceholder('Select punishment type')
        .addOptions([
            {
                label: 'Warn',
                description: 'Delete message and send warning DM',
                value: 'WARN',
                emoji: '⚠️'
            },
            {
                label: 'Kick',
                description: 'Remove user from server',
                value: 'KICK',
                emoji: '👢'
            },
            {
                label: 'Timeout',
                description: 'Temporarily restrict user',
                value: 'TIMEOUT',
                emoji: '⏱️'
            },
            {
                label: 'Ban',
                description: 'Permanently ban user',
                value: 'BAN',
                emoji: '🔨'
            }
        ])
    
    await interaction.reply({
        content: '**Select Punishment Type:**',
        components: [new ActionRowBuilder().addComponents(selectMenu)],
        ephemeral: true
    })
}

async function handleSpamPunishmentTypeSelect(client, interaction) {
    const punishmentType = interaction.values[0]
    
    // If TIMEOUT is selected, show modal for duration
    if (punishmentType === 'TIMEOUT') {
        return await showSpamTimeoutModal(client, interaction)
    }
    
    // For other types, save directly
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    config.spamPrevention.punishmentType = punishmentType
    config.spamPrevention.punishmentDuration = null
    config.markModified('spamPrevention')
    await config.save()
    
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    const punishmentLabels = {
        'WARN': 'Warn ⚠️ (Delete message + Send warning)',
        'KICK': 'Kick 👢',
        'BAN': 'Ban 🔨'
    }
    
    await interaction.update({
        content: `✅ Punishment set to: **${punishmentLabels[punishmentType]}**`,
        components: []
    })
    
    // Refresh main panel
    await refreshMainPanel(client, interaction)
}

async function handleSpamPunishmentWarn(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    config.spamPrevention.punishmentType = 'WARN'
    config.spamPrevention.punishmentDuration = null
    config.markModified('spamPrevention')
    await config.save()
    
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    await interaction.update({
        content: '✅ Punishment set to: **Warn ⚠️** (Delete message + Send warning)',
        components: []
    })
    
    // Refresh main panel
    await refreshMainPanel(client, interaction)
}

async function handleSpamPunishmentBan(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    config.spamPrevention.punishmentType = 'BAN'
    config.spamPrevention.punishmentDuration = null
    config.markModified('spamPrevention')
    await config.save()
    
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    await interaction.update({
        content: '✅ Punishment set to: **Ban**',
        components: []
    })
    
    // Refresh main panel
    await refreshMainPanel(client, interaction)
}

async function handleSpamPunishmentKick(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    config.spamPrevention.punishmentType = 'KICK'
    config.spamPrevention.punishmentDuration = null
    config.markModified('spamPrevention')
    await config.save()
    
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    await interaction.update({
        content: '✅ Punishment set to: **Kick**',
        components: []
    })
    
    // Refresh main panel
    await refreshMainPanel(client, interaction)
}

async function showSpamTimeoutModal(client, interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js')
    
    const modal = new ModalBuilder()
        .setCustomId('ss_spam_timeout_modal')
        .setTitle('Timeout Duration (max: 28days)')
    
    const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Duration (6h, 1day, 7day, 28day, 0=permanent)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('2days')
        .setRequired(true)
        .setValue('2days')
    
    const row = new ActionRowBuilder().addComponents(durationInput)
    modal.addComponents(row)
    
    await interaction.showModal(modal)
}

async function showSpamActionsModal(client, interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js')
    const config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    const modal = new ModalBuilder()
        .setCustomId('ss_spam_actions_modal')
        .setTitle('Edit Actions Limit')
    
    const actionsInput = new TextInputBuilder()
        .setCustomId('actions')
        .setLabel('Number of spam violations allowed:')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a number (1-99)')
        .setRequired(true)
        .setValue(config.spamPrevention?.actionsLimit?.toString() || '1')
    
    const row = new ActionRowBuilder().addComponents(actionsInput)
    modal.addComponents(row)
    
    await interaction.showModal(modal)
}

async function showSpamTimeBetweenModal(client, interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js')
    const config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    const modal = new ModalBuilder()
        .setCustomId('ss_spam_time_between_modal')
        .setTitle('Edit Time Between Actions')
    
    const timeInput = new TextInputBuilder()
        .setCustomId('time')
        .setLabel('Time window for violations:')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Examples: 6h, 12h, 1day, 7days')
        .setRequired(true)
        .setValue(formatDuration(config.spamPrevention?.timeBetweenActions || 21600))
    
    const row = new ActionRowBuilder().addComponents(timeInput)
    modal.addComponents(row)
    
    await interaction.showModal(modal)
}

async function handleSpamRestrictionSelect(client, interaction) {
    const value = interaction.values[0]
    
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    config.spamPrevention.restrictionType = value
    config.markModified('spamPrevention')
    await config.save()
    
    if (client.safeModerationConfigCache) {
        await client.safeModerationConfigCache.invalidate(interaction.guild.id)
    }
    
    await interaction.reply({
        content: `✅ Restriction type set to: **${value}**`,
        ephemeral: true
    })
    
    // Refresh main panel
    await refreshMainPanel(client, interaction)
}
