const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection } = require("discord.js")
const GroupRegexp = /group{(.*?)}/
const MinRegexp = /min{(.*?)}/
module.exports = {
    name: 'help',
    nameLocalizations: {
        'ru': `помощь`,
        'uk': `допомога`,
        'es-ES': `ayuda`
    },
    description: 'View all Global Bot commands',
    descriptionLocalizations: {
        'ru': `Просмотр всех команд Global Bot`,
        'uk': `Перегляд усіх команд Global Bot`,
        'es-ES': `Ver todos los comandos de Global Bot`
    },
    dmPermission: true,
    group: `general-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.isChatInputCommand()) await interaction.deferReply()
        const flags = interaction.isButton() && interaction.customId.includes("eph") ? ["Ephemeral"] : []
        if (interaction.isButton() && interaction.customId.includes("reply")) await interaction.deferReply({ flags })
        const embed = new EmbedBuilder()
        embed.setColor(3093046)
        const menu_options = [
            { emoji: client.config.emojis.gear, label: `${client.language({ textId: "Commands", guildId: interaction.guildId, locale: interaction.locale })}`, value: `commands`, default: true }
        ]
        menu_options.find(e => { return e.default === true}).default = false
        const menu_option = menu_options.find(e => { return e.value == `${interaction.isChatInputCommand() ? "commands" : interaction.customId.includes("commands") ? "commands" : interaction.isStringSelectMenu() ? interaction.values[0] : `commands`}` })
        menu_option.default = true
        const first_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{help}`).addOptions(menu_options)])
        if (interaction.values?.[0].includes("commands") || interaction.customId?.includes("commands") || interaction.isChatInputCommand()) {
            embed.setAuthor({ name: `${client.language({ textId: "Commands", guildId: interaction.guildId, locale: interaction.locale })} ${client.user.username}: ${client.slashCommands.size} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.`, iconURL: client.user.displayAvatarURL() })
            embed.setTitle(menu_option.emoji + menu_option.label)
            const command_options = [
                { emoji: client.config.emojis.O, label: `${client.language({ textId: "General commands", guildId: interaction.guildId, locale: interaction.locale })}`, value: `general-group`, description: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.slashCommands.filter(e => e.group == `general-group`).size}`, default: true },
                { emoji: client.config.emojis.shop, label: `${client.language({ textId: "Shop commands", guildId: interaction.guildId, locale: interaction.locale })}`, value: `shop-group`, description: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.slashCommands.filter(e => e.group == `shop-group`).size}`, default: false },
                { emoji: client.config.emojis.inventory, label: `${client.language({ textId: "Inventory commands", guildId: interaction.guildId, locale: interaction.locale })}`, value: `inventory-group`, description: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.slashCommands.filter(e => e.group == `inventory-group`).size}`, default: false },
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile commands", guildId: interaction.guildId, locale: interaction.locale })}`, value: `profile-group`, description: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.slashCommands.filter(e => e.group == `profile-group`).size}`, default: false },
                { emoji: "♾️", label: `${client.language({ textId: "Context commands", guildId: interaction.guildId, locale: interaction.locale })}`, value: `context-group`, description: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.slashCommands.filter(e => e.group == `context-group`).size}`, default: false },
                { emoji: "🔨", label: `${client.language({ textId: "Admin commands", guildId: interaction.guildId, locale: interaction.locale })}`, value: `admins-group`, description: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.slashCommands.filter(e => e.group == `admins-group`).size}`, default: false },
                { emoji: client.config.emojis.description, label: `${client.language({ textId: "Managers", guildId: interaction.guildId, locale: interaction.locale })}`, value: `managers`, description: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.slashCommands.filter(e => e.group == `managers`).size}`, default: false },
                { emoji: client.config.emojis.game, label: `${client.language({ textId: "Mini-games", guildId: interaction.guildId, locale: interaction.locale })}`, value: `games-group`, description: `${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: ${client.slashCommands.filter(e => e.group == `games-group`).size}`, default: false },
            ]
            command_options.find(e => { return e.default === true}).default = false
            const command_option = command_options.find(e => { return e.value == `${interaction.isChatInputCommand() ? "general-group" : interaction.isStringSelectMenu() && interaction.values[0] === "commands" ? "general-group" : interaction.isStringSelectMenu() ? interaction.values[0] : interaction.isButton() ? GroupRegexp.exec(interaction.customId)?.[1] || `general-group` : `general-group`}` })
            command_option.default = true
            embed.setFooter({ text: `< > - ${client.language({ textId: "required argument", guildId: interaction.guildId, locale: interaction.locale })} [ ] - ${client.language({ textId: "optional argument", guildId: interaction.guildId, locale: interaction.locale })} | - ${client.language({ textId: "OR", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "If commands are not visible - update your Discord client to the latest version", guildId: interaction.guildId, locale: interaction.locale })}.` })
            const appCommands = await client.application.commands.fetch()
            let commands = command_option.value === "admins-group" ? client.slashCommands.filter(e => e.defaultMemberPermissions === "Administrator" && e.owner !== true) : client.slashCommands.filter(e => e.group == command_option.value && e.owner !== true)
            commands = commands.filter(e => appCommands.some(a => a.name === e.name)).mapValues(e => {
                e.commandId = appCommands.find(cmd => cmd.name === e.name).permissions.commandId
                return e
            })
            let step = command_option.value === "admins-group" ? 10 : 15
            let min = 0
            let max = step
            if (interaction.isButton() && interaction.customId.includes("min")) {
                min = +MinRegexp.exec(interaction.customId)?.[1]
                max = min + step
            }
            first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{help}group{${command_option.value}}min{0} commands 1`).setDisabled((commands.size <= step && min == 0) || (commands.size > step && min < step) ? true : false)
            previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{help}group{${command_option.value}}min{${min - step}} commands 2`).setDisabled((commands.size <= step && min == 0) || (commands.size > step && min < step) ? true : false)
            next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{help}group{${command_option.value}}min{${min + step}} commands 3`).setDisabled((commands.size <= step && min == 0) || (commands.size > step && min >= commands.size - step) ? true : false)
            last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{help}group{${command_option.value}}min{${Math.ceil((commands.size-step)/step) * step}} commands 4`).setDisabled((commands.size <= step && min == 0) || (commands.size > step && min >= commands.size - step) ? true : false)
            commands = commands.toJSON().slice(min, max)
            const description = []
            for (const command of commands) {
                if (command.group == "context-group") {
                    let permissions = ""
                    if (command.defaultMemberPermissions && command_option.value !== "admins-group") permissions += `\n${client.language({ textId: "Permissions required", guildId: interaction.guildId, locale: interaction.locale })}: ${command.defaultMemberPermissions}`
                    description.push(`${command.type == 2 ? `${client.language({ textId: "User", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Message", guildId: interaction.guildId, locale: interaction.locale })}` } > ${client.language({ textId: "Applications", guildId: interaction.guildId, locale: interaction.locale })} >  </${command.name}:${command.commandId}>\n${command.descriptionLocalizations?.[interaction.locale] || command.descriptionLocalizations?.["en-US"]}${permissions}`)
                } else {
                    let options = ""
                    if (command.options && command.group !== "managers") {
                        for (const option of command.options) {
                            if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
                                if (option.options) {
                                    for (const SUB_COMMAND of option.options) {
                                        if (SUB_COMMAND.options) {
                                            for (const SUB_COMMAND_OPTION of SUB_COMMAND.options) {
                                                if (SUB_COMMAND_OPTION.choices) {
                                                    if (SUB_COMMAND_OPTION.required) options += `<${SUB_COMMAND_OPTION.choices.map(e => e.nameLocalizations?.[interaction.locale] || e.name).join(" | ")}> `
                                                    else options += `[${SUB_COMMAND_OPTION.choices.map(e => e.nameLocalizations?.[interaction.locale] || e.name).join(" | ")}] `
                                                } else {
                                                    if (SUB_COMMAND_OPTION.required) options += `<${SUB_COMMAND_OPTION.nameLocalizations?.[interaction.locale] || SUB_COMMAND_OPTION.name}> `
                                                    else options += `[${SUB_COMMAND_OPTION.nameLocalizations?.[interaction.locale] || SUB_COMMAND_OPTION.name}] `
                                                }
                                                if (SUB_COMMAND.options.findIndex(e => e.name == SUB_COMMAND_OPTION.name)+1 == SUB_COMMAND.options.length) {
                                                    let permissions = ""
                                                    if (command.defaultMemberPermissions && command_option.value !== "admins-group") permissions += `\n${client.language({ textId: "Permissions required", guildId: interaction.guildId, locale: interaction.locale })}: ${command.defaultMemberPermissions}`
                                                    description.push(`</${command.name} ${option.name} ${SUB_COMMAND.name}:${command.commandId}> ${options}\n${SUB_COMMAND.descriptionLocalizations?.[interaction.locale] || SUB_COMMAND.description}${permissions}`)
                                                    options = ''
                                                }
                                                
                                            }      
                                        } else {
                                            let permissions = ""
                                            if (command.defaultMemberPermissions && command_option.value !== "admins-group") permissions += `\n${client.language({ textId: "Permissions required", guildId: interaction.guildId, locale: interaction.locale })}: ${command.defaultMemberPermissions}`
                                            description.push(`</${command.name} ${option.name} ${SUB_COMMAND.name}:${command.commandId}>\n${SUB_COMMAND.descriptionLocalizations?.[interaction.locale] || SUB_COMMAND.description}${permissions}`)
                                            options = ''    
                                        }    
                                    }
                                } else {
                                    let permissions = ""
                                    if (command.defaultMemberPermissions && command_option.value !== "admins-group") permissions += `\n${client.language({ textId: "Permissions required", guildId: interaction.guildId, locale: interaction.locale })}: ${command.defaultMemberPermissions}`
                                    description.push(`</${command.name} ${option.name}:${command.commandId}>\n${option.descriptionLocalizations?.[interaction.locale] || option.description}${permissions}`)
                                }
                            } else if (option.type === ApplicationCommandOptionType.Subcommand) {
                                if (option.options) {
                                    for (const SUB_COMMAND_OPTION of option.options) {
                                        if (SUB_COMMAND_OPTION.choices) {
                                            if (SUB_COMMAND_OPTION.required) options += `<${SUB_COMMAND_OPTION.choices.map(e => e.name).join(" | ")}> `
                                            else options += `[${SUB_COMMAND_OPTION.choices.map(e => e.nameLocalizations?.[interaction.locale] || e.name).join(" | ")}] `
                                        } else {
                                            if (SUB_COMMAND_OPTION.required) options += `<${SUB_COMMAND_OPTION.nameLocalizations?.[interaction.locale] || SUB_COMMAND_OPTION.name}> `
                                            else options += `[${SUB_COMMAND_OPTION.nameLocalizations?.[interaction.locale] || SUB_COMMAND_OPTION.name}] `
                                        }     
                                    }    
                                }
                                let permissions = ""
                                if (command.defaultMemberPermissions && command_option.value !== "admins-group") permissions += `\n${client.language({ textId: "Permissions required", guildId: interaction.guildId, locale: interaction.locale })}: ${command.defaultMemberPermissions}`
                                description.push(`</${command.name} ${option.name}:${command.commandId}> ${options}\n${option.descriptionLocalizations?.[interaction.locale] || option.description}${permissions}`)
                                options = ''
                            } else {
                                if (option.choices) {
                                    if (option.required) options += `<${option.choices.map(e => e.nameLocalizations?.[interaction.locale] || e.name).join(" | ")}> `
                                    else options += `[${option.choices.map(e => e.nameLocalizations?.[interaction.locale] || e.name).join(" | ")}] `
                                } else {
                                    if (option.required) options += `<${option.nameLocalizations?.[interaction.locale] || option.name}> `
                                    else options += `[${option.nameLocalizations?.[interaction.locale] || option.name}] `
                                }
                                if (command.options.findIndex(e => e.name == option.name)+1 == command.options.length) {
                                    let permissions = ""
                                    if (command.defaultMemberPermissions && command_option.value !== "admins-group") permissions += `\n${client.language({ textId: "Permissions required", guildId: interaction.guildId, locale: interaction.locale })}: ${command.defaultMemberPermissions}`
                                    description.push(`</${command.name}:${command.commandId}> ${options}\n${command.descriptionLocalizations?.[interaction.locale] || command.description}${permissions}`) 
                                    options = ''
                                }
                            }
                        }
                    } else {
                        let permissions = ""
                        if (command.defaultMemberPermissions && command_option.value !== "admins-group") permissions += `\n${client.language({ textId: "Permissions required", guildId: interaction.guildId, locale: interaction.locale })}: ${command.defaultMemberPermissions}`
                        description.push(`</${command.name}:${command.commandId}>\n${command.descriptionLocalizations?.[interaction.locale] || command.description}${permissions}`)
                    }
                }  
            }
            embed.setDescription(description.join("\n"))
            const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{help} commands`).addOptions(command_options).setPlaceholder(`${client.language({ textId: "Select command group", guildId: interaction.guildId, locale: interaction.locale })}`)])
            const third_row = new ActionRowBuilder().addComponents([first_page_btn, previous_page_btn, next_page_btn, last_page_btn])
            if (interaction.isChatInputCommand()) return interaction.editReply({ embeds: [embed], components: [first_row, second_row, third_row] })
            else {
                if (interaction.deferred || interaction.replied) return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row, third_row] })
                else return interaction.update({ content: " ", embeds: [embed], components: [first_row, second_row, third_row] })
            }
        }
    }
}