const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js")

const UserRegexp = /usr{(.*?)}/

module.exports = {
    name: 'temprole-remove-config',
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
        
        const roleID = interaction.values[0]
        const role = interaction.guild.roles.cache.get(roleID)
        
        try {
            // Delete configuration
            const result = await client.tempRoleConfigSchema.deleteOne({
                guildID: interaction.guildId,
                roleID: roleID
            })
            
            if (result.deletedCount === 0) {
                return interaction.reply({
                    content: client.config.emojis.NO + ' Configuration not found!',
                    flags: ['Ephemeral']
                })
            }
            
            // Send ephemeral success message
            await interaction.reply({
                content: `${client.config.emojis.YES || '✅'} Configuration for **${role ? role.name : 'Unknown Role'}** has been removed.\n\n⚠️ **Note:** Existing role assignments will continue until they expire.`,
                flags: ['Ephemeral']
            })
            
            // Update the main panel to refresh the list
            const { getTempRoleConfigs, formatDuration } = require('../modules/tempRoleManager')
            const configs = await getTempRoleConfigs(client, interaction.guildId)
            
            const embed = new EmbedBuilder()
                .setColor(3093046)
                .setAuthor({ name: '⏱️ Temporary Role Manager', iconURL: interaction.guild.iconURL() })
                .setTitle('🗑️ Remove Configuration')
                .setDescription('```yaml\nRemove temporary role configurations\n```\n**⚠️ Warning:**\n> Existing assignments will continue until expiry\n> This only prevents new automatic assignments')
                .setTimestamp()
            
            if (configs.length > 0) {
                // Show remaining configs
                const roleFields = configs.map(config => {
                    const r = interaction.guild.roles.cache.get(config.roleID)
                    const roleName = r ? r.name : 'Unknown Role'
                    const roleDisplay = r ? `<@&${r.id}>` : '`Unknown Role`'
                    
                    return {
                        name: `${roleName}`,
                        value: `> **Duration:** \`${formatDuration(config.duration)}\`\n> **Role:** ${roleDisplay}`,
                        inline: true
                    }
                })
                
                embed.addFields(roleFields)
                embed.setFooter({ text: `${configs.length} configuration(s) available • Select an action above` })
                
                // Create role selection menu
                const options = configs.slice(0, 25).map(config => {
                    const r = interaction.guild.roles.cache.get(config.roleID)
                    return {
                        label: r ? r.name : 'Unknown Role',
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
                
                // Main select menu
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
                
                await interaction.message.edit({
                    embeds: [embed],
                    components: [first_row, second_row]
                })
            } else {
                // No more configs, show empty state
                embed.addFields({
                    name: '❌ No Configurations',
                    value: '```diff\n- No temporary role configurations to remove\n+ Configure roles first from the main menu\n```',
                    inline: false
                })
                embed.setFooter({ text: 'Select an action above' })
                
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
                
                await interaction.message.edit({
                    embeds: [embed],
                    components: [first_row]
                })
            }
        } catch (error) {
            console.error('[TempRole] Error removing config:', error)
            await interaction.reply({
                content: client.config.emojis.NO + ` Failed to remove configuration: ${error.message}`,
                flags: ['Ephemeral']
            })
        }
    }
}
