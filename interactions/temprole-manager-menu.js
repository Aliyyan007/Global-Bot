const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { getTempRoleConfigs, getActiveTempRoles, formatDuration } = require('../modules/tempRoleManager')

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-manager-menu',
    run: async (client, interaction) => {
        if (!interaction.isStringSelectMenu()) return
        
        // Validate user
        const userMatch = interaction.customId.match(UserRegexp)
        if (!userMatch || userMatch[1] !== interaction.user.id) {
            return interaction.reply({
                content: client.config.emojis.NO + ' This menu is not for you!',
                flags: ['Ephemeral']
            })
        }
        
        const action = interaction.values[0]
        
        switch (action) {
            case 'configure':
                await handleConfigure(client, interaction)
                break
            case 'active':
                await handleActive(client, interaction)
                break
            case 'assign':
                await handleAssign(client, interaction)
                break
            case 'extend':
                await handleExtend(client, interaction)
                break
            case 'remove':
                await handleRemove(client, interaction)
                break
            case 'stats':
                await handleStats(client, interaction)
                break
            default:
                await interaction.reply({
                    content: 'Unknown action',
                    flags: ['Ephemeral']
                })
        }
    }
}

async function handleConfigure(client, interaction) {
    const configs = await getTempRoleConfigs(client, interaction.guildId)
    
    // Build main panel embed with details
    const embed = new EmbedBuilder()
        .setColor(3093046)
        .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
        .setTitle('📋 Configure Temporary Roles')
        .setDescription('```yaml\nSet which roles should be temporary with default durations\n```')
        .setTimestamp()
    
    if (configs.length > 0) {
        // Limit to first 20 configs to avoid hitting Discord's 25 field limit
        const displayConfigs = configs.slice(0, 20)
        const roleFields = displayConfigs.map(config => {
            const role = interaction.guild.roles.cache.get(config.roleID)
            const roleName = role ? role.name : 'Unknown Role'
            const roleDisplay = role ? `<@&${role.id}>` : '`Unknown Role`'
            
            return {
                name: `${config.enabled ? '🟢' : '🔴'} ${roleName}`,
                value: `> **Duration:** \`${formatDuration(config.duration)}\`\n> **Status:** ${config.enabled ? '✅ Active' : '❌ Disabled'}\n> **Role:** ${roleDisplay}`,
                inline: true
            }
        })
        
        embed.addFields(roleFields)
        
        if (configs.length > 20) {
            embed.addFields({
                name: '📋 More Configurations',
                value: `\`\`\`diff\n+ ${configs.length - 20} more configuration(s) not shown\n\`\`\``,
                inline: false
            })
        }
        
        embed.setFooter({ text: `Total: ${configs.length} configured role(s) • Select an action above` })
    } else {
        embed.addFields({
            name: '❌ No Configurations Found',
            value: '```diff\n- No temporary role configurations exist yet\n+ Click "Add Configuration" below to create one\n```',
            inline: false
        })
        embed.setFooter({ text: 'Select an action above' })
    }
    
    // Create main select menu (always visible)
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`cmd{temprole-manager-menu}-usr{${interaction.user.id}}`)
        .setPlaceholder('🎯 Select an action...')
        .addOptions([
            {
                label: 'Configure Temp Roles',
                description: 'Set roles as temporary with durations',
                value: 'configure',
                emoji: '📋',
                default: true
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
    
    const first_row = new ActionRowBuilder().addComponents(selectMenu)
    
    // Add action buttons in second row
    const addButton = new ButtonBuilder()
        .setCustomId(`cmd{temprole-add-config}-usr{${interaction.user.id}}`)
        .setLabel('Add Configuration')
        .setStyle(ButtonStyle.Success)
        .setEmoji('➕')
    
    const second_row = new ActionRowBuilder().addComponents(addButton)
    
    // Update the main panel (not ephemeral)
    await interaction.update({
        embeds: [embed],
        components: [first_row, second_row]
    })
}

async function handleActive(client, interaction) {
    const assignments = await getActiveTempRoles(client, interaction.guildId)
    
    // Build main panel embed with details
    const embed = new EmbedBuilder()
        .setColor(3093046)
        .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
        .setTitle('👥 Active Temporary Role Assignments')
        .setDescription('```yaml\nUsers with temporary roles that will expire automatically\n```')
        .setTimestamp()
    
    if (assignments.length > 0) {
        const grouped = {}
        for (const assignment of assignments) {
            if (!grouped[assignment.roleID]) {
                grouped[assignment.roleID] = []
            }
            grouped[assignment.roleID].push(assignment)
        }
        
        let fieldCount = 0
        let totalDisplayed = 0
        for (const [roleID, roleAssignments] of Object.entries(grouped)) {
            if (fieldCount >= 20) break
            
            const role = interaction.guild.roles.cache.get(roleID)
            if (!role) continue
            
            const userList = roleAssignments.map(a => {
                return `> <@${a.userID}> • Expires <t:${Math.floor(a.expiresAt.getTime() / 1000)}:R>`
            }).join('\n')
            
            embed.addFields({
                name: `${role.name} • ${roleAssignments.length} user${roleAssignments.length > 1 ? 's' : ''}`,
                value: userList,
                inline: false
            })
            fieldCount++
            totalDisplayed += roleAssignments.length
        }
        
        if (assignments.length > totalDisplayed) {
            embed.addFields({
                name: '📋 More Assignments',
                value: `\`\`\`diff\n+ ${assignments.length - totalDisplayed} more assignment(s) not shown\n\`\`\``,
                inline: false
            })
        }
        
        embed.setFooter({ text: `Total: ${assignments.length} active assignment(s) • Select an action above` })
    } else {
        embed.addFields({
            name: '❌ No Active Assignments',
            value: '```diff\n- No users currently have temporary roles assigned\n+ Assign roles from the main menu\n```',
            inline: false
        })
        embed.setFooter({ text: 'Select an action above' })
    }
    
    // Create main select menu (always visible)
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
                emoji: '👥',
                default: true
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
    
    const first_row = new ActionRowBuilder().addComponents(selectMenu)
    
    // Add refresh button in second row
    const refreshButton = new ButtonBuilder()
        .setCustomId(`cmd{temprole-refresh-active}-usr{${interaction.user.id}}`)
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    
    const second_row = new ActionRowBuilder().addComponents(refreshButton)
    
    // Update the main panel (not ephemeral)
    await interaction.update({
        embeds: [embed],
        components: [first_row, second_row]
    })
}

async function handleAssign(client, interaction) {
    const configs = await getTempRoleConfigs(client, interaction.guildId)
    
    if (configs.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
            .setTitle('❌ No Configurations')
            .setDescription('```diff\n- No temporary roles configured yet\n+ Go to "Configure Temp Roles" first\n```')
            .setFooter({ text: 'Select an action above' })
        
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
                    emoji: '➕',
                    default: true
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
        
        const first_row = new ActionRowBuilder().addComponents(selectMenu)
        
        return interaction.update({
            embeds: [embed],
            components: [first_row]
        })
    }
    
    // Build main panel embed with details
    const embed = new EmbedBuilder()
        .setColor(3093046)
        .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
        .setTitle('➕ Assign Temporary Role')
        .setDescription('```yaml\nAssign a temporary role to a user\n```\n**Steps:**\n> 1️⃣ Click "Select User" below\n> 2️⃣ Choose the role to assign')
        .setFooter({ text: `${configs.length} temporary role(s) available • Select an action above` })
        .setTimestamp()
    
    // Create main select menu (always visible)
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
                emoji: '➕',
                default: true
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
    
    const first_row = new ActionRowBuilder().addComponents(selectMenu)
    
    // Add action button in second row
    const userSelectButton = new ButtonBuilder()
        .setCustomId(`cmd{temprole-select-user}-usr{${interaction.user.id}}`)
        .setLabel('Select User')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👤')
    
    const second_row = new ActionRowBuilder().addComponents(userSelectButton)
    
    // Update the main panel (not ephemeral)
    await interaction.update({
        embeds: [embed],
        components: [first_row, second_row]
    })
}

async function handleExtend(client, interaction) {
    const assignments = await getActiveTempRoles(client, interaction.guildId)
    
    if (assignments.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
            .setTitle('❌ No Active Assignments')
            .setDescription('```diff\n- No active temporary role assignments to extend\n+ Assign roles first from the main menu\n```')
            .setFooter({ text: 'Select an action above' })
        
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
                    emoji: '⏰',
                    default: true
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
        
        const first_row = new ActionRowBuilder().addComponents(selectMenu)
        
        return interaction.update({
            embeds: [embed],
            components: [first_row]
        })
    }
    
    // Build user map
    const userMap = new Map()
    for (const assignment of assignments) {
        if (!userMap.has(assignment.userID)) {
            userMap.set(assignment.userID, [])
        }
        userMap.get(assignment.userID).push(assignment)
    }
    
    // Build main panel embed with details
    const embed = new EmbedBuilder()
        .setColor(3093046)
        .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
        .setTitle('⏰ Extend Role Duration')
        .setDescription('```yaml\nExtend temporary role expiration times\n```\n**Active Users:**')
        .setTimestamp()
    
    let fieldCount = 0
    for (const [userID, userAssignments] of userMap.entries()) {
        if (fieldCount >= 20) break
        
        const roleList = userAssignments.map(a => {
            const role = interaction.guild.roles.cache.get(a.roleID)
            return role ? `> ${role.name} • <t:${Math.floor(a.expiresAt.getTime() / 1000)}:R>` : null
        }).filter(Boolean).join('\n')
        
        embed.addFields({
            name: `<@${userID}>`,
            value: roleList,
            inline: false
        })
        fieldCount++
    }
    
    if (userMap.size > 20) {
        embed.addFields({
            name: '📋 More Users',
            value: `\`\`\`diff\n+ ${userMap.size - 20} more user(s) not shown\n\`\`\``,
            inline: false
        })
    }
    
    embed.setFooter({ text: `Total: ${assignments.length} active assignment(s) • Select an action above` })
    
    // Create main select menu (always visible)
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
                emoji: '⏰',
                default: true
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
    
    const first_row = new ActionRowBuilder().addComponents(selectMenu)
    
    // Add action button in second row
    const selectUserButton = new ButtonBuilder()
        .setCustomId(`cmd{temprole-extend-select-user}-usr{${interaction.user.id}}`)
        .setLabel('Select User to Extend')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👤')
    
    const second_row = new ActionRowBuilder().addComponents(selectUserButton)
    
    // Update the main panel (not ephemeral)
    await interaction.update({
        embeds: [embed],
        components: [first_row, second_row]
    })
}

async function handleRemove(client, interaction) {
    const configs = await getTempRoleConfigs(client, interaction.guildId)
    
    if (configs.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
            .setTitle('❌ No Configurations')
            .setDescription('```diff\n- No temporary role configurations to remove\n+ Configure roles first from the main menu\n```')
            .setFooter({ text: 'Select an action above' })
        
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
                    emoji: '🗑️',
                    default: true
                },
                {
                    label: 'View Statistics',
                    description: 'View temporary role statistics',
                    value: 'stats',
                    emoji: '📊'
                }
            ])
        
        const first_row = new ActionRowBuilder().addComponents(selectMenu)
        
        return interaction.update({
            embeds: [embed],
            components: [first_row]
        })
    }
    
    // Build main panel embed with details
    const embed = new EmbedBuilder()
        .setColor(3093046)
        .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
        .setTitle('🗑️ Remove Configuration')
        .setDescription('```yaml\nRemove temporary role configurations\n```\n**⚠️ Warning:**\n> Existing assignments will continue until expiry\n> This only prevents new automatic assignments')
        .setTimestamp()
    
    // Show all configs
    const roleFields = configs.map(config => {
        const role = interaction.guild.roles.cache.get(config.roleID)
        const roleName = role ? role.name : 'Unknown Role'
        const roleDisplay = role ? `<@&${role.id}>` : '`Unknown Role`'
        
        return {
            name: `${roleName}`,
            value: `> **Duration:** \`${formatDuration(config.duration)}\`\n> **Role:** ${roleDisplay}`,
            inline: true
        }
    })
    
    embed.addFields(roleFields)
    embed.setFooter({ text: `${configs.length} configuration(s) available • Select an action above` })
    
    // Create main select menu (always visible)
    const mainSelectMenu = new StringSelectMenuBuilder()
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
                emoji: '🗑️',
                default: true
            },
            {
                label: 'View Statistics',
                description: 'View temporary role statistics',
                value: 'stats',
                emoji: '📊'
            }
        ])
    
    const first_row = new ActionRowBuilder().addComponents(mainSelectMenu)
    
    // Add role selection menu in second row
    const options = configs.slice(0, 25).map(config => {
        const role = interaction.guild.roles.cache.get(config.roleID)
        return {
            label: role ? role.name : 'Unknown Role',
            description: `Duration: ${formatDuration(config.duration)}`,
            value: config.roleID,
            emoji: '🗑️'
        }
    })
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`cmd{temprole-remove-config}-usr{${interaction.user.id}}`)
        .setPlaceholder('🎯 Select role to remove...')
        .addOptions(options)
    
    const second_row = new ActionRowBuilder().addComponents(selectMenu)
    
    // Update the main panel (not ephemeral)
    await interaction.update({
        embeds: [embed],
        components: [first_row, second_row]
    })
}

async function handleStats(client, interaction) {
    const configs = await getTempRoleConfigs(client, interaction.guildId)
    const assignments = await getActiveTempRoles(client, interaction.guildId)
    
    // Calculate statistics
    const totalUsers = new Set(assignments.map(a => a.userID)).size
    const totalRoles = new Set(assignments.map(a => a.roleID)).size
    const extendedCount = assignments.filter(a => a.extended).length
    
    // Find most popular role
    const roleCounts = {}
    for (const assignment of assignments) {
        roleCounts[assignment.roleID] = (roleCounts[assignment.roleID] || 0) + 1
    }
    const mostPopular = Object.keys(roleCounts).length > 0 
        ? Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]
        : null
    
    // Build main panel embed with stats
    const embed = new EmbedBuilder()
        .setColor(3093046)
        .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
        .setTitle('📊 Temporary Role Statistics')
        .setDescription('```yaml\nOverview of temporary role usage in this server\n```')
        .addFields(
            { name: '📋 Configured Roles', value: `\`\`\`fix\n${configs.length} role(s)\n\`\`\``, inline: true },
            { name: '👥 Active Assignments', value: `\`\`\`fix\n${assignments.length} assignment(s)\n\`\`\``, inline: true },
            { name: '🔢 Unique Users', value: `\`\`\`fix\n${totalUsers} user(s)\n\`\`\``, inline: true },
            { name: '🎭 Unique Roles', value: `\`\`\`fix\n${totalRoles} role(s)\n\`\`\``, inline: true },
            { name: '⏰ Extended Roles', value: `\`\`\`fix\n${extendedCount} assignment(s)\n\`\`\``, inline: true },
            { name: '📈 Average per User', value: `\`\`\`fix\n${totalUsers > 0 ? (assignments.length / totalUsers).toFixed(1) : '0'} role(s)\n\`\`\``, inline: true }
        )
        .setFooter({ text: 'Statistics updated in real-time • Select an action above' })
        .setTimestamp()
    
    if (mostPopular) {
        const role = interaction.guild.roles.cache.get(mostPopular[0])
        if (role) {
            embed.addFields({
                name: '🏆 Most Popular Role',
                value: `> ${role.name}\n> **Assignments:** \`${mostPopular[1]}\` user(s)`,
                inline: false
            })
        }
    }
    
    // Create main select menu (always visible)
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
                emoji: '📊',
                default: true
            }
        ])
    
    const first_row = new ActionRowBuilder().addComponents(selectMenu)
    
    // Update the main panel (not ephemeral)
    await interaction.update({
        embeds: [embed],
        components: [first_row]
    })
}