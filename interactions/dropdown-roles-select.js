const REMOVE_VALUE = "remove"

module.exports = {
    name: `dropdown-roles-select`,
    run: async (client, interaction) => {
        const date = new Date()
        const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
        if (interaction.isStringSelectMenu()) {
            // Permanent "Remove any role" option -> reuse the dedicated remove flow
            if (interaction.values.includes(REMOVE_VALUE)) {
                await updateSelectMenu(client, interaction)
                return require('./dropdown-roles-remove').run(client, interaction)
            }
            const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            if (profile.dropdownCooldowns?.get(interaction.message.id) > date.getTime()) {
                await updateSelectMenu(client, interaction)
                return interaction.reply({ content: `${client.language({ textId: "Selection of following roles is possible", guildId: interaction.guildId, locale: interaction.locale })}: <t:${Math.floor(profile.dropdownCooldowns.get(interaction.message.id) / 1000)}:R>`, flags: ["Ephemeral"] })
            }

            // Respond immediately to avoid delay - show processing message
            await interaction.reply({ content: `${client.config.emojis.loading || "⏳"} ${client.language({ textId: "Processing", guildId: interaction.guildId, locale: interaction.locale }) || "Processing"}...`, flags: ["Ephemeral"] })
            
            // Process role changes in background
            let rolesToAdd = []
            let rolesToRemove = []
            const errorMessages = []
            const dropdownDB = await client.dropdownRoleSchema.findOne({ guildID: interaction.guildId, messageID: interaction.message.id }).lean()
            const totalPrice = {
                currency: 0,
                rp: 0,
            }
            for (const value of interaction.values) {
                const guildRole = await interaction.guild.roles.fetch(value).catch(e => null)
                if (guildRole) {
                    if (dropdownDB) {
                        const role = dropdownDB.roles[value]
                        if (role) {
                            if (dropdownDB.multi) {
                                if (interaction.member.roles.cache.has(value)) {
                                    errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "You already have this role", guildId: interaction.guildId, locale: interaction.locale })} <@&${value}>**`)
                                } else {
                                    if (!interaction.guild.members.me?.permissions.has("ManageRoles") || guildRole.position > interaction.guild.members.me?.roles.highest.position) {
                                        errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to add role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${guildRole.id}>`)
                                    } else {
                                        if (role.price && role.currency) {
                                            if (!totalPrice[role.currency]) totalPrice[role.currency] = 0
                                            totalPrice[role.currency] += role.price
                                        }
                                        rolesToAdd.push(value)
                                    }
                                }
                            } else {
                                if (interaction.member.roles.cache.has(value)) {
                                    errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "You already have this role", guildId: interaction.guildId, locale: interaction.locale })} <@&${value}>**`)
                                } else {
                                    if (!interaction.guild.members.me?.permissions.has("ManageRoles") || guildRole.position > interaction.guild.members.me?.roles.highest.position) {
                                        errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to add role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${guildRole.id}>`)
                                    } else {
                                        if (role.price && role.currency) {
                                            if (!totalPrice[role.currency]) totalPrice[role.currency] = 0
                                            totalPrice[role.currency] += role.price
                                        }
                                        rolesToAdd.push(value)
                                        rolesToRemove.push(...interaction.message.components[0].components[0].options.map(e => e.value).filter(e => e !== value && e !== REMOVE_VALUE))    
                                    }
                                }
                            }
                        } else {
                            if (dropdownDB.multi) {
                                if (interaction.member.roles.cache.has(value)) {
                                    // In multi-select mode, never remove roles - just show message
                                    errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "You already have this role", guildId: interaction.guildId, locale: interaction.locale })} <@&${value}>**`)
                                }
                                else {
                                    if (!interaction.guild.members.me?.permissions.has("ManageRoles") || guildRole.position > interaction.guild.members.me?.roles.highest.position) {
                                        errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to add role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${guildRole.id}>`)
                                    } else {
                                        rolesToAdd.push(value)    
                                    }
                                }
                            } else {
                                if (interaction.member.roles.cache.has(value)) {
                                    errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "You already have this role", guildId: interaction.guildId, locale: interaction.locale })} <@&${value}>**`)
                                } else {
                                    if (!interaction.guild.members.me?.permissions.has("ManageRoles") || guildRole.position > interaction.guild.members.me?.roles.highest.position) {
                                        errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to add role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${guildRole.id}>`)
                                    } else {
                                        rolesToAdd.push(value)
                                        rolesToRemove.push(...interaction.message.components[0].components[0].options.map(e => e.value).filter(e => e !== value && e !== REMOVE_VALUE))    
                                    }
                                }
                            }
                        }
                    } else {
                        // No dropdownDB - treat as multi-select, never remove roles
                        if (interaction.member.roles.cache.has(value)) {
                            errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "You already have this role", guildId: interaction.guildId, locale: interaction.locale })} <@&${value}>**`)
                        }
                        else {
                            if (!interaction.guild.members.me?.permissions.has("ManageRoles") || guildRole.position > interaction.guild.members.me?.roles.highest.position) {
                                errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to add role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${guildRole.id}>`)
                            } else {
                                rolesToAdd.push(value)    
                            }
                        }
                    }
                } else {
                    errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "This role no longer exists", guildId: interaction.guildId, locale: interaction.locale })} (${value})**`)
                }
            }
            if (!dropdownDB?.multi && !rolesToAdd.length) rolesToRemove = []
            let canBuy = true
            const totalPrice2 = {}
            for (const value in totalPrice) {
                if (totalPrice[value]) {
                    if (value === "currency") {
                        if (profile[value] - totalPrice[value] < 0) {
                            canBuy = false
                            totalPrice2[value] = totalPrice[value] - profile[value]
                        }
                    } else if (value === "rp") {
                        if (profile[value] - totalPrice[value] < -1000) {
                            canBuy = false
                            totalPrice2[value] = -1000 - (profile[value] - totalPrice[value])
                        }
                    } else {
                        const userItem = profile.inventory.find(e => e.itemID === value)
                        if (!userItem) {
                            canBuy = false
                            totalPrice2[value] = totalPrice[value]
                        } else if (userItem.amount - totalPrice[value] < 0) {
                            canBuy = false
                            totalPrice2[value] = totalPrice[value] - userItem.amount
                        }
                    }
                }
            }
            if (!canBuy) {
                const settings = client.cache.settings.get(interaction.guildId) || await client.functions.fetchSettings(client, interaction.guildId)
                const description = []
                for (const value in totalPrice2) {
                    if (value === "currency") {
                        description.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${totalPrice2[value].toLocaleString()})`)
                    } else
                    if (value === "rp") {
                        description.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${totalPrice2[value].toLocaleString()})`)
                    } else {
                        const item = client.cache.items.get(value)
                        description.push(`${item?.displayEmoji || ""}**${item?.name || value}** (${totalPrice2[value].toLocaleString()})`)
                    }
                }
                return interaction.editReply({ content: `${client.config.emojis.NO}${client.language({ textId: "For selected roles you need more", guildId: interaction.guildId, locale: interaction.locale })}:\n${description.join("\n")}` })
            }
            for (const role of rolesToAdd) {
                await interaction.member.roles.add(role).catch(e => {
                    if (e.message.includes("Missing Permissions")) {
                        rolesToAdd = rolesToAdd.filter(rl => rl !== role)
                        if (!dropdownDB.multi) rolesToRemove = []
                        errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to add role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${role}>`)
                    }
                })
            }
            for (const role of rolesToRemove) {
                if (interaction.member.roles.cache.has(role)) {
                    await interaction.member.roles.remove(role).catch(e => {
                        if (e.message.includes("Missing Permissions")) {
                            rolesToRemove = rolesToRemove.filter(rl => rl !== role)
                            errorMessages.push(`${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to remove role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${role}>`)
                        }
                    })    
                } else rolesToRemove = rolesToRemove.filter(rl => rl !== role)
            }
            if (rolesToAdd.length || rolesToRemove.length) {
                if (dropdownDB?.cooldown) {
                    if (!profile.dropdownCooldowns) profile.dropdownCooldowns = new Map()
                    profile.dropdownCooldowns.set(interaction.message.id, date.getTime() + dropdownDB.cooldown * 1000)
                }
                for (const value in totalPrice) {
                    if (totalPrice[value]) {
                        if (value === "currency") {
                            await profile.subtractCurrency(totalPrice[value])
                        } else if (value === "rp") {
                            await profile.subtractRp(totalPrice[value])
                        } else {
                            await profile.subtractItem(value, totalPrice[value])
                        }
                    }
                }
                await profile.save()
                
                let responseContent = ``
                if (rolesToAdd.length) {
                    responseContent += `${client.config.emojis.YES}**${client.language({ textId: "Roles added", guildId: interaction.guildId, locale: interaction.locale })}:** ${rolesToAdd.map(e => `<@&${e}>`).join(", ")}`
                }
                if (rolesToRemove.length) {
                    responseContent += `\n${client.config.emojis.YES}**${client.language({ textId: "Roles removed", guildId: interaction.guildId, locale: interaction.locale })}:** ${rolesToRemove.map(e => `<@&${e}>`).join(", ")}`
                }
                
                // Add any error messages
                if (errorMessages.length) {
                    responseContent += `\n${errorMessages.join("\n")}`
                }
                
                // Update the select menu with new member counts
                await updateSelectMenu(client, interaction)
                
                return interaction.editReply({ content: responseContent })
            }
            
            // If no roles were added or removed, show errors or a generic message
            if (errorMessages.length) {
                // Still update the select menu to reset it
                await updateSelectMenu(client, interaction)
                return interaction.editReply({ content: errorMessages.join("\n") })
            }
            
            // Still update the select menu to reset it
            await updateSelectMenu(client, interaction)
            return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No changes made", guildId: interaction.guildId, locale: interaction.locale }) || "No changes made"}**` })
        }
    }
}

// Rebuild the select menu to reset the user's selection and strip legacy
// member-count suffixes; also guarantees the permanent "Remove any role" option.
async function updateSelectMenu(client, interaction) {
    try {
        const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js')
        const originalSelectMenu = interaction.message.components[0]?.components[0]
        if (!originalSelectMenu) return
        
        const newOptions = originalSelectMenu.options
            .filter(option => option.value !== REMOVE_VALUE)
            .map(option => {
                // Strip legacy count suffixes: "Label⠀⠀123" and "Label (1,234)"
                const label = option.label
                    .replace(/⠀.*$/s, '')
                    .replace(/\s*\(\d[\d,]*\)\s*$/, '')
                return {
                    label: label.length > 100 ? label.slice(0, 97) + '...' : label,
                    value: option.value,
                    emoji: option.emoji,
                    description: option.description
                }
            })
        
        newOptions.push({
            label: client.language({ textId: "Remove any role", guildId: interaction.guildId, locale: interaction.locale }),
            value: REMOVE_VALUE,
            emoji: "❌"
        })
        
        const newSelectMenu = new StringSelectMenuBuilder()
            .setOptions(newOptions)
            .setMaxValues(originalSelectMenu.maxValues || 1)
            .setCustomId(`cmd{dropdown-roles-select}`)
            .setPlaceholder(originalSelectMenu.placeholder || 'Select needed')
        
        await interaction.message.edit({ components: [new ActionRowBuilder().addComponents([newSelectMenu])] }).catch(() => null)
    } catch (e) {
        console.error('[DROPDOWN-ROLES] Error updating select menu:', e.message)
    }
}
