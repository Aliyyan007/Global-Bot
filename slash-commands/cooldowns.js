const { Collection, EmbedBuilder, ApplicationCommandOptionType } = require("discord.js")
const { glob } = require("glob")
const { setCooldown, setImmuneRoles } = require(`../handler/cooldowns`)
module.exports = {
    name: 'cooldowns',
    nameLocalizations: {
        'ru': `кулдауны`,
        'uk': `кулдауни`,
        'es-ES': `recargas`
    },
    description: 'Сooldowns for commands',
    descriptionLocalizations: {
        'ru': `Кулдауны для команд`,
        'uk': `Кулдауни для команд`,
        'es-ES': `Tiempos de espera para comandos`
    },
    options: [
        {
            name: 'view',
            nameLocalizations: {
                'ru': 'просмотр',
                'uk': 'перегляд',
                'es-ES': 'ver'
            },
            description: 'View all cooldowns',
            descriptionLocalizations: {
                'ru': `Просмотр всех кулдаунов`,
                'uk': `Перегляд усіх кулдаунів`,
                'es-ES': `Ver todos los tiempos de espera`
            },
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'edit',
            nameLocalizations: {
                'ru': 'изменить',
                'uk': 'змінити',
                'es-ES': 'editar'
            },
            description: 'Edit cooldown',
            descriptionLocalizations: {
                'ru': `Изменить кулдаун`,
                'uk': `Змінити кулдаун`,
                'es-ES': `Editar tiempo de espera`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'command_name',
                    nameLocalizations: {
                        'ru': 'название_команды',
                        'uk': 'назва_команди',
                        'es-ES': 'nombre_comando'
                    },
                    description: 'Command name',
                    descriptionLocalizations: {
                        'ru': `Название команды`,
                        'uk': `Назва команди`,
                        'es-ES': `Nombre del comando`
                    },
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                },
                {
                    name: 'cooldown',
                    nameLocalizations: {
                        'ru': 'кулдаун',
                        'uk': 'кулдаун',
                        'es-ES': 'enfriamiento'
                    },
                    description: 'Cooldown in seconds',
                    descriptionLocalizations: {
                        'ru': `Кулдаун в секундах`,
                        'uk': `Кулдаун у секундах`,
                        'es-ES': `Tiempo de espera en segundos`
                    },
                    min_value: 0,
                    max_value: 9999,
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                }
            ]
        },
        {
            name: 'immune_roles',
            nameLocalizations: {
                'ru': 'имунные_роли',
                'uk': 'імунні_ролі',
                'es-ES': 'roles_inmunes'
            },
            description: 'Roles that are immune to cooldown',
            descriptionLocalizations: {
                'ru': `Роли которые имеют иммунитет к кулдауну`,
                'uk': `Ролі, які мають імунітет до кулдауну`,
                'es-ES': `Roles que son inmunes al tiempo de espera`
            },
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'add',
                    nameLocalizations: {
                        'ru': 'добавить',
                        'uk': 'додати',
                        'es-ES': 'añadir'
                    },
                    description: 'Add immune role',
                    descriptionLocalizations: {
                        'ru': `Добавить иммунную роль`,
                        'uk': `Додати імунну роль`,
                        'es-ES': `Añadir rol inmune`
                    },
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [{
                        name: 'role',
                        nameLocalizations: {
                            'ru': 'роль',
                            'uk': 'роль',
                            'es-ES': 'rol'
                        },
                        description: 'Immune role',
                        descriptionLocalizations: {
                            'ru': `Имунная роль`,
                            'uk': `Імунна роль`,
                            'es-ES': `Rol inmune`
                        },
                        type: ApplicationCommandOptionType.Role,
                        required: true
                    }]
                },
                {
                    name: 'delete',
                    nameLocalizations: {
                        'ru': 'удалить',
                        'uk': 'видалити',
                        'es-ES': 'eliminar'
                    },
                    description: 'Delete immune role',
                    descriptionLocalizations: {
                        'ru': `Удалить иммунную роль`,
                        'uk': `Видалити імунну роль`,
                        'es-ES': `Eliminar rol inmune`
                    },
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [{
                        name: 'role',
                        nameLocalizations: {
                            'ru': 'роль',
                            'uk': 'роль',
                            'es-ES': 'rol'
                        },
                        description: 'Immune role',
                        descriptionLocalizations: {
                            'ru': `Имунная роль`,
                            'uk': `Імунна роль`,
                            'es-ES': `Rol inmune`
                        },
                        type: ApplicationCommandOptionType.Role,
                        required: true
                    }]
                },
                {
                    name: 'delete_all',
                    nameLocalizations: {
                        'ru': 'удалить_все',
                        'uk': 'видалити_все',
                        'es-ES': 'eliminar_todo'
                    },
                    description: 'Delete all immune roles',
                    descriptionLocalizations: {
                        'ru': `Удалить все иммунные роли`,
                        'uk': `Видалити всі імунні ролі`,
                        'es-ES': `Eliminar todos los roles inmunes`
                    },
                    type: ApplicationCommandOptionType.Subcommand,
                }
            ]
        }
    ],
    dmPermission: false,
    defaultMemberPermissions: "Administrator",
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
        if (args.Subcommand === "view") {
            const settings = client.cache.settings.get(interaction.guildId)
            const commands = []
            if (settings.cooldowns) {
                for (const element of settings.cooldowns.entries()) {
                    commands.push(`**/${element[0]}**: ${element[1]/1000} ${client.language({ textId: "seconds", guildId: interaction.guildId })}.`)
                }    
            }
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(3093046)
                        .setTitle(`${client.language({ textId: "Command cooldowns", guildId: interaction.guildId })}`)
                        .setDescription(`${client.language({ textId: "Immune roles", guildId: interaction.guildId })}: ${settings.cooldown_immune_roles.length ? settings.cooldown_immune_roles.map(id => `<@&${id}>`).join(", ") : `${client.language({ textId: "None", guildId: interaction.guildId })}`}\n${client.language({ textId: "Commands", guildId: interaction.guildId })}: ${commands.length ? `\n${commands.join("\n")}` : `${client.language({ textId: "None", guildId: interaction.guildId })}`}`)
                ] 
            })
        }
        if (args.Subcommand === "edit") {
            const slashCommands = glob.sync(`slash-commands/*.js`, {
                absolute: true
            })
            let commands = []
            await slashCommands.map(async (value) => {
                const file = require(value)
                let newMap = Object.assign({}, file)
                commands.push(newMap)
            })
            commands = commands.filter(e => !e.owner)
            if (!commands.find(e => e.name === args.command_name)) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Command", guildId: interaction.guildId })} **${args.command_name}** ${client.language({ textId: "was not found", guildId: interaction.guildId })}` })
            const settings = client.cache.settings.get(interaction.guildId)
            if (args.cooldown === 0) settings.cooldowns?.delete(args.command_name)
            else {
                if (!settings.cooldowns) settings.cooldowns = new Collection()
                settings.cooldowns.set(args.command_name, args.cooldown*1000)
            }
            await settings.save()
            setCooldown(args.command_name, interaction.guildId, args.cooldown*1000)
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "For command", guildId: interaction.guildId })} **/${args.command_name}** ${client.language({ textId: "cooldown set", guildId: interaction.guildId })}: **${args.cooldown} ${client.language({ textId: "seconds", guildId: interaction.guildId })}.**` })
        }
        if (args.SubcommandGroup === "immune_roles") {
            const settings = client.cache.settings.get(interaction.guildId)
            switch (args.Subcommand) {
                case "add": {
                    if (settings.cooldown_immune_roles.includes(args.role)) {
                        interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role", guildId: interaction.guildId })} <@&${args.role}> ${client.language({ textId: "is already in immune roles list", guildId: interaction.guildId })}` })
                        break
                    }
                    settings.cooldown_immune_roles.push(args.role)
                    await settings.save()
                    setImmuneRoles(interaction.guildId, settings.cooldown_immune_roles)
                    interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Role", guildId: interaction.guildId })} <@&${args.role}> ${client.language({ textId: "was added to immune roles list", guildId: interaction.guildId })}` })
                    break
                }
                case "delete": {
                    if (!settings.cooldown_immune_roles.includes(args.role)) {
                        interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role", guildId: interaction.guildId })} <@&${args.role}> ${client.language({ textId: "is not in immune roles list", guildId: interaction.guildId })}` })
                        break
                    }
                    settings.cooldown_immune_roles = settings.cooldown_immune_roles.filter(role => role !== args.role)
                    await settings.save()
                    setImmuneRoles(interaction.guildId, settings.cooldown_immune_roles)
                    interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Role", guildId: interaction.guildId })} <@&${args.role}> ${client.language({ textId: "was removed from immune roles list", guildId: interaction.guildId })}` })
                    break
                }
                case "delete_all": {
                    settings.cooldown_immune_roles = []
                    await settings.save()
                    setImmuneRoles(interaction.guildId, [])
                    interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Immune roles list was cleared", guildId: interaction.guildId })}` })
                    break
                }
            }
            return
        }
    }
}