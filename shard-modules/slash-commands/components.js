const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, ActionRowBuilder, Collection } = require("discord.js")
const validator = require('validator')
module.exports = {
    name: 'components',
    nameLocalizations: {
        'ru': `компоненты`,
        'uk': 'компоненти',
        'es-ES': 'componentes'
    },
    description: 'Manage components of message',
    descriptionLocalizations: {
        'ru': `Управление компонентами сообщения`,
        'uk': 'Управління компонентами повідомлення',
        'es-ES': 'Gestión de componentes del mensaje'
    },
    options: [
        {
            name: 'buttons',
            nameLocalizations: {
                'ru': `кнопки`,
                'uk': 'кнопки',
                'es-ES': 'botones'
            },
            description: 'Manage buttons',
            descriptionLocalizations: {
                'ru': `Управление кнопками`,
                'uk': 'Управління кнопками',
                'es-ES': 'Gestión de botones'
            },
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'add',
                    nameLocalizations: {
                        'ru': `добавить`,
                        'uk': 'додати',
                        'es-ES': 'añadir'
                    },
                    description: 'Add button to message',
                    descriptionLocalizations: {
                        'ru': `Добавить кнопку к сообщению`,
                        'uk': 'Додати кнопку до повідомлення',
                        'es-ES': 'Añadir botón al mensaje'
                    },
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'message_url',
                            nameLocalizations: {
                                'ru': `ссылка_на_сообщение`,
                                'uk': 'посилання_на_повідомлення',
                                'es-ES': 'enlace_al_mensaje'
                            },
                            description: 'URL to message',
                            descriptionLocalizations: {
                                'ru': `Ссылка на сообщение`,
                                'uk': 'Посилання на повідомлення',
                                'es-ES': 'Enlace al mensaje'
                            },
                            type: ApplicationCommandOptionType.String,
                            required: true
                        },
                        {
                            name: 'style',
                            nameLocalizations: {
                                'ru': `стиль`,
                                'uk': 'стиль',
                                'es-ES': 'estilo'
                            },
                            description: 'Style of button',
                            descriptionLocalizations: {
                                'ru': `Стиль кнопки`,
                                'uk': 'Стиль кнопки',
                                'es-ES': 'Estilo del botón'
                            },
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            choices: [
                                {
                                    name: 'Link',
                                    nameLocalizations: {
                                        'ru': `Ссылка`,
                                        'uk': 'Посилання',
                                        'es-ES': 'Enlace'
                                    },
                                    value: "Link"
                                },
                                {
                                    name: 'Blue',
                                    nameLocalizations: {
                                        'ru': `Голубая`,
                                        'uk': 'Блакитна',
                                        'es-ES': 'Azul'
                                    },
                                    value: "Primary"
                                },
                                {
                                    name: 'Red',
                                    nameLocalizations: {
                                        'ru': `Красная`,
                                        'uk': 'Червона',
                                        'es-ES': 'Rojo'
                                    },
                                    value: "Danger"
                                },
                                {
                                    name: 'Green',
                                    nameLocalizations: {
                                        'ru': `Зелёная`,
                                        'uk': 'Зелена',
                                        'es-ES': 'Verde'
                                    },
                                    value: "Success"
                                },
                                {
                                    name: 'Grey',
                                    nameLocalizations: {
                                        'ru': `Серая`,
                                        'uk': 'Сіра',
                                        'es-ES': 'Gris'
                                    },
                                    value: "Secondary"
                                },
                            ]
                        },
                        {
                            name: 'row',
                            nameLocalizations: {
                                'ru': `строка`,
                                'uk': 'рядок',
                                'es-ES': 'fila'
                            },
                            description: 'Row to add your button in',
                            descriptionLocalizations: {
                                'ru': `Строка для добавления вашей кнопки`,
                                'uk': 'Рядок для додавання вашої кнопки',
                                'es-ES': 'Fila para añadir tu botón'
                            },
                            type: ApplicationCommandOptionType.Integer,
                            required: true,
                            choices: [
                                {
                                    name: 'Row 1',
                                    nameLocalizations: {
                                        'ru': `Строка 1`,
                                        'uk': 'Рядок 1',
                                        'es-ES': 'Fila 1'
                                    },
                                    value: 0
                                },
                                {
                                    name: 'Row 2',
                                    nameLocalizations: {
                                        'ru': `Строка 2`,
                                        'uk': 'Рядок 2',
                                        'es-ES': 'Fila 2'
                                    },
                                    value: 1
                                },
                                {
                                    name: 'Row 3',
                                    nameLocalizations: {
                                        'ru': `Строка 3`,
                                        'uk': 'Рядок 3',
                                        'es-ES': 'Fila 3'
                                    },
                                    value: 2
                                },
                                {
                                    name: 'Row 4',
                                    nameLocalizations: {
                                        'ru': `Строка 4`,
                                        'uk': 'Рядок 4',
                                        'es-ES': 'Fila 4'
                                    },
                                    value: 3
                                },
                                {
                                    name: 'Row 5',
                                    nameLocalizations: {
                                        'ru': `Строка 5`,
                                        'uk': 'Рядок 5',
                                        'es-ES': 'Fila 5'
                                    },
                                    value: 4
                                },
                            ]
                        },
                        {
                            name: 'column',
                            nameLocalizations: {
                                'ru': `колонка`,
                                'uk': 'колонка',
                                'es-ES': 'columna'
                            },
                            description: 'Column to add your button in',
                            descriptionLocalizations: {
                                'ru': `Колонка для добавления вашей кнопки`,
                                'uk': 'Колонка для додавання вашої кнопки',
                                'es-ES': 'Columna para añadir tu botón'
                            },
                            type: ApplicationCommandOptionType.Integer,
                            required: true,
                            choices: [
                                {
                                    name: 'Column 1',
                                    nameLocalizations: {
                                        'ru': `Колонка 1`,
                                        'uk': 'Колонка 1',
                                        'es-ES': 'Сolumna 1'
                                    },
                                    value: 0
                                },
                                {
                                    name: 'Column 2',
                                    nameLocalizations: {
                                        'ru': `Колонка 2`,
                                        'uk': 'Колонка 2',
                                        'es-ES': 'Сolumna 2'
                                    },
                                    value: 1
                                },
                                {
                                    name: 'Column 3',
                                    nameLocalizations: {
                                        'ru': `Колонка 3`,
                                        'uk': 'Колонка 3',
                                        'es-ES': 'Сolumna 3'
                                    },
                                    value: 2
                                },
                                {
                                    name: 'Column 4',
                                    nameLocalizations: {
                                        'ru': `Колонка 4`,
                                        'uk': 'Колонка 4',
                                        'es-ES': 'Сolumna 4'
                                    },
                                    value: 3
                                },
                                {
                                    name: 'Column 5',
                                    nameLocalizations: {
                                        'ru': `Колонка 5`,
                                        'uk': 'Колонка 5',
                                        'es-ES': 'Сolumna 5'
                                    },
                                    value: 4
                                },
                            ]
                        },
                        {
                            name: 'id_or_url',
                            nameLocalizations: {
                                'ru': `id_или_ссылка`,
                                'uk': 'id_або_посилання',
                                'es-ES': 'id_o_enlace'
                            },
                            description: 'ID or URL to your resource',
                            descriptionLocalizations: {
                                'ru': `ID или ссылка на твой ресурс`,
                                'uk': 'ID або посилання на ваш ресурс',
                                'es-ES': 'ID o enlace a tu recurso'
                            },
                            type: ApplicationCommandOptionType.String,
                            required: true,
                            autocomplete: true
                        },
                        {
                            name: 'label',
                            nameLocalizations: {
                                'ru': `название`,
                                'uk': 'назва',
                                'es-ES': 'etiqueta'
                            },
                            description: 'Button label',
                            descriptionLocalizations: {
                                'ru': `Название кнопки`,
                                'uk': 'Назва кнопки',
                                'es-ES': 'Etiqueta del botón'
                            },
                            maxLength: 80,
                            type: ApplicationCommandOptionType.String,
                            autocomplete: true
                        },
                        {
                            name: 'emoji',
                            nameLocalizations: {
                                'ru': `эмодзи`,
                                'uk': 'емодзі',
                                'es-ES': 'emoji'
                            },
                            description: 'Button emoji',
                            descriptionLocalizations: {
                                'ru': `Эмодзи кнопки`,
                                'uk': 'Емодзі кнопки',
                                'es-ES': 'Emoji del botón'
                            },
                            type: ApplicationCommandOptionType.String,
                            autocomplete: true
                        },
                        {
                            name: 'disabled',
                            nameLocalizations: {
                                'ru': `выключена`,
                                'uk': 'вимкнена',
                                'es-ES': 'desactivado'
                            },
                            description: 'Will the button be turned off',
                            descriptionLocalizations: {
                                'ru': `Будет ли выключена кнопка`,
                                'uk': 'Чи буде кнопка вимкнена',
                                'es-ES': '¿El botón estará desactivado?'
                            },
                            type: ApplicationCommandOptionType.Boolean,
                        }
                    ],
                },
                {
                    name: 'remove',
                    nameLocalizations: {
                        'ru': `удалить`,
                        'uk': 'видалити',
                        'es-ES': 'eliminar'
                    },
                    description: 'Remove button from message',
                    descriptionLocalizations: {
                        'ru': `Удалить кнопку из сообщения`,
                        'uk': 'Видалити кнопку з повідомлення',
                        'es-ES': 'Eliminar botón del mensaje'
                    },
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'message_url',
                            nameLocalizations: {
                                'ru': `ссылка_на_сообщение`,
                                'uk': 'посилання_на_повідомлення',
                                'es-ES': 'enlace_al_mensaje'
                            },
                            description: 'URL to message',
                            descriptionLocalizations: {
                                'ru': `Ссылка на сообщение`,
                                'uk': 'Посилання на повідомлення',
                                'es-ES': 'Enlace al mensaje'
                            },
                            type: ApplicationCommandOptionType.String,
                            required: true
                        },
                        {
                            name: 'row',
                            nameLocalizations: {
                                'ru': `строка`,
                                'uk': 'рядок',
                                'es-ES': 'fila'
                            },
                            description: 'Row where is your button',
                            descriptionLocalizations: {
                                'ru': `Строка где находится кнопка`,
                                'uk': 'Рядок де знаходиться кнопка',
                                'es-ES': 'Línea donde está el botón'
                            },
                            type: ApplicationCommandOptionType.Integer,
                            required: true,
                            choices: [
                                {
                                    name: 'Row 1',
                                    nameLocalizations: {
                                        'ru': `Строка 1`,
                                        'uk': 'Рядок 1',
                                        'es-ES': 'Fila 1'
                                    },
                                    value: 0
                                },
                                {
                                    name: 'Row 2',
                                    nameLocalizations: {
                                        'ru': `Строка 2`,
                                        'uk': 'Рядок 2',
                                        'es-ES': 'Fila 2'
                                    },
                                    value: 1
                                },
                                {
                                    name: 'Row 3',
                                    nameLocalizations: {
                                        'ru': `Строка 3`,
                                        'uk': 'Рядок 3',
                                        'es-ES': 'Fila 3'
                                    },
                                    value: 2
                                },
                                {
                                    name: 'Row 4',
                                    nameLocalizations: {
                                        'ru': `Строка 4`,
                                        'uk': 'Рядок 4',
                                        'es-ES': 'Fila 4'
                                    },
                                    value: 3
                                },
                                {
                                    name: 'Row 5',
                                    nameLocalizations: {
                                        'ru': `Строка 5`,
                                        'uk': 'Рядок 5',
                                        'es-ES': 'Fila 5'
                                    },
                                    value: 4
                                },
                            ]
                        },
                        {
                            name: 'column',
                            nameLocalizations: {
                                'ru': `колонка`,
                                'uk': 'колонка',
                                'es-ES': 'columna'
                            },
                            description: 'Column where is your button',
                            descriptionLocalizations: {
                                'ru': `Колонка где находится кнопка`,
                                'uk': 'Колонка де знаходиться кнопка',
                                'es-ES': 'Columna donde se encuentra el botón'
                            },
                            type: ApplicationCommandOptionType.Integer,
                            required: true,
                            choices: [
                                {
                                    name: 'Column 1',
                                    nameLocalizations: {
                                        'ru': `Колонка 1`,
                                        'uk': 'Колонка 1',
                                        'es-ES': 'Сolumna 1'
                                    },
                                    value: 0
                                },
                                {
                                    name: 'Column 2',
                                    nameLocalizations: {
                                        'ru': `Колонка 2`,
                                        'uk': 'Колонка 2',
                                        'es-ES': 'Сolumna 2'
                                    },
                                    value: 1
                                },
                                {
                                    name: 'Column 3',
                                    nameLocalizations: {
                                        'ru': `Колонка 3`,
                                        'uk': 'Колонка 3',
                                        'es-ES': 'Сolumna 3'
                                    },
                                    value: 2
                                },
                                {
                                    name: 'Column 4',
                                    nameLocalizations: {
                                        'ru': `Колонка 4`,
                                        'uk': 'Колонка 4',
                                        'es-ES': 'Сolumna 4'
                                    },
                                    value: 3
                                },
                                {
                                    name: 'Column 5',
                                    nameLocalizations: {
                                        'ru': `Колонка 5`,
                                        'uk': 'Колонка 5',
                                        'es-ES': 'Сolumna 5'
                                    },
                                    value: 4
                                },
                            ]
                        },
                    ],
                }
            ],
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
        if (args.SubcommandGroup === "buttons") {
            let row = args.row
            let column = args.column
            if (args.Subcommand === "add") {
                const message_url = args.message_url
                const urlOrId = args.id_or_url
                const style = args.style === "Link" ? ButtonStyle.Link : args.style === "Primary" ? ButtonStyle.Primary : args.style === "Secondary" ? ButtonStyle.Secondary : args.style === "Success" ? ButtonStyle.Success : ButtonStyle.Danger
                if (style === ButtonStyle.Link && !validator.isURL(urlOrId)) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Invalid resource link", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                else if (style !== ButtonStyle.Link && urlOrId.length > 100) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum ID length", guildId: interaction.guildId, locale: interaction.locale })}: 100`, flags: ["Ephemeral"] })
                const label = args.label
                const emoji = args.emoji
                const disabled = args.disabled ? true : false
                if (!label && !emoji) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "One of these fields must be filled: name, emoji", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                const channelId = message_url.split("/")[5]
                const messageId = message_url.split("/")[6]
                const channel = await interaction.guild.channels.fetch(channelId).catch(e => null)
                if (!channel || !channel.guild) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                const message = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
                if (!message) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (message.author.id !== client.user.id) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This message is not mine", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (!message.editable) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message cannot be edited", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                const button = new ButtonBuilder().setStyle(style).setDisabled(disabled)
                if (style === ButtonStyle.Link) {
                    try {
                        button.setURL(urlOrId)
                    } catch (err) {
                        return interaction.editReply({ content: `${client.config.emojis.NO}${err}`, flags: ["Ephemeral"] })
                    }
                }
                else button.setCustomId(urlOrId)
                if (label) button.setLabel(label)
                if (emoji) button.setEmoji(emoji)
                let components = message.components
                if (!components.length) {
                    row = 0
                    column = 0
                } else {
                    if (message.components.length < row + 1) row = message.components.length
                    if (components[row]?.components[0]?.type === ComponentType.StringSelect && column !== 0) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No more components fit in this line", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (!components[row]) components[row] = new ActionRowBuilder().addComponents([])
                if (column + 1 - components[row]?.components.length >= 2) column = components[row].components.length
                components[row].components.splice(column, 1, button)
                let error
                await message.edit({ content: message.content, embeds: message.embeds, components: components, files: message.attachments }).catch(err => {
                    console.error(err)
                    error = err.message
                })
                if (error) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Error", guildId: interaction.guildId, locale: interaction.locale })}: ${error}`, flags: ["Ephemeral"] })
                else return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Component successfully added/changed", guildId: interaction.guildId, locale: interaction.locale })} (${message_url})`, flags: ["Ephemeral"] })
            }
            if (args.Subcommand === "remove") {
                const message_url = args.message_url
                const channelId = message_url.split("/")[5]
                const messageId = message_url.split("/")[6]
                const channel = await interaction.guild.channels.fetch(channelId).catch(e => null)
                if (!channel) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                const message = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
                if (!message) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (message.author.id !== client.user.id) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This message is not mine", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (!message.editable) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message cannot be edited", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (!message.components.length) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No components in this message", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (!message.components[row]?.components[column]) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "In line", guildId: interaction.guildId, locale: interaction.locale })} **${row+1}** ${client.language({ textId: "in column", guildId: interaction.guildId, locale: interaction.locale })} **${column+1}** ${client.language({ textId: "no component found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                const components = message.components
                components[row].components.splice(column, 1)
                if (!components[row].components[0]) components.splice(row, 1)
                let error
                await message.edit({ content: message.content, embeds: message.embeds, components: components, files: message.attachments }).catch(err => {
                    console.error(err)
                    error = err.message
                })
                if (error) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Error", guildId: interaction.guildId, locale: interaction.locale })}: ${error}`, flags: ["Ephemeral"] })
                else return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Component successfully removed", guildId: interaction.guildId, locale: interaction.locale })} (${message_url})`, flags: ["Ephemeral"] })
            }
        }
    }
}