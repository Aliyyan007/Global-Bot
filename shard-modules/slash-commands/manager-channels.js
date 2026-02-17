const { ChannelType, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection, ModalBuilder, TextInputStyle, TextInputBuilder, LabelBuilder } = require("discord.js")
const IdRegexp = /id{(.*?)}/
const limRegexp = /lim{(.*?)}/
const ChannelMultipliers = require("../classes/channelMultipliers.js")
module.exports = {
    name: 'manager-channels',
    nameLocalizations: {
        'ru': `управление-каналами`,
        'uk': `управління-каналами`,
        'es-ES': `gestión-canales`
    },
    description: 'Setting multipliers for channels',
    descriptionLocalizations: {
        'ru': `Настройка множителей для каналов`,
        'uk': `Налаштування множників для каналів`,
        'es-ES': `Configuración de multiplicadores para canales`
    },
    options: [
        {
			name: 'view',
            nameLocalizations: {
                'ru': `просмотр`,
                'uk': `перегляд`,
                'es-ES': `ver`
            },
            description: 'View all channels',
            descriptionLocalizations: {
                'ru': `Просмотр всех каналов`,
                'uk': `Перегляд усіх каналів`,
                'es-ES': `Ver todos los canales`
            },
            type: ApplicationCommandOptionType.Subcommand,
		},
        {
            name: 'create',
            nameLocalizations: {
                'ru': `создать`,
                'uk': `створити`,
                'es-ES': `crear`
            },
            description: 'Create multipliers for channel',
            descriptionLocalizations: {
                'ru': `Создать множители для канала`,
                'uk': `Створити множники для каналу`,
                'es-ES': `Crear multiplicadores para el canal`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    nameLocalizations: {
                        'ru': `канал`,
                        'uk': `канал`,
                        'es-ES': `canal`
                    },
                    description: 'Channel name',
                    descriptionLocalizations: {
                        'ru': `Название канала`,
                        'uk': `Назва каналу`,
                        'es-ES': `Nombre del canal`
                    },
                    type: ApplicationCommandOptionType.Channel,
                    required: true
                }
            ]
        },
        {
            name: 'edit',
            nameLocalizations: {
                'ru': `изменить`,
                'uk': `змінити`,
                'es-ES': `editar`
            },
            description: 'Edit multipliers for channel',
            descriptionLocalizations: {
                'ru': `Изменить множители для канала`,
                'uk': `Змінити множники для каналу`,
                'es-ES': `Editar multiplicadores del canal`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Channel name',
                    descriptionLocalizations: {
                        'ru': `Название канала`,
                        'uk': `Назва каналу`,
                        'es-ES': `Nombre del canal`
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true,
                    required: true
                }
            ]
        },
        {
            name: 'copy',
            nameLocalizations: {
                'ru': `копировать`,
                'uk': `копіювати`,
                'es-ES': `copiar`
            },
            description: 'Copy multipliers of channel',
            descriptionLocalizations: {
                'ru': `Копировать множители канала`,
                'uk': `Копіювати множники каналу`,
                'es-ES': `Copiar multiplicadores del canal`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Channel name',
                    descriptionLocalizations: {
                        'ru': `Название канала`,
                        'uk': `Назва каналу`,
                        'es-ES': `Nombre del canal`
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true,
                    required: true
                },
                {
                    name: 'channel',
                    nameLocalizations: {
                        'ru': `канал`,
                        'uk': `канал`,
                        'es-ES': `canal`
                    },
                    description: 'Name of new channel',
                    descriptionLocalizations: {
                        'ru': `Название нового канала`,
                        'uk': `Назва нового каналу`,
                        'es-ES': `Nombre del nuevo canal`
                    },
                    type: ApplicationCommandOptionType.Channel,
                    required: true
                }
            ]
        },
        {
            name: 'delete',
            nameLocalizations: {
                'ru': `удалить`,
                'uk': `видалити`,
                'es-ES': `eliminar`
            },
            description: 'Delete multipliers of channel',
            descriptionLocalizations: {
                'ru': `Удалить множители канала`,
                'uk': `Видалити множники каналу`,
                'es-ES': `Eliminar multiplicadores del canal`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    nameLocalizations: {
                        'ru': `название`,
                        'uk': `назва`,
                        'es-ES': `nombre`
                    },
                    description: 'Channel name',
                    descriptionLocalizations: {
                        'ru': `Название канала`,
                        'uk': `Назва каналу`,
                        'es-ES': `Nombre del canal`
                    },
                    type: ApplicationCommandOptionType.String,
                    autocomplete: true,
                    required: true
                }
            ]
        },
        {
            name: 'enable-all',
            nameLocalizations: {
                'ru': `включить-все`,
                'uk': `увімкнути-всі`,
                'es-ES': `activar-todos`
            },
            description: 'Enable all multipliers of channels',
            descriptionLocalizations: {
                'ru': `Включить все множители каналов`,
                'uk': `Увімкнути всі множники каналів`,
                'es-ES': `Activar todos los multiplicadores de canales`
            },
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'disable-all',
            nameLocalizations: {
                'ru': `выключить-все`,
                'uk': `вимкнути-всі`,
                'es-ES': `desactivar-todos`
            },
            description: 'Disable all multipliers of channels',
            descriptionLocalizations: {
                'ru': `Выключить все множители каналов`,
                'uk': `Вимкнути всі множники каналів`,
                'es-ES': `Desactivar todos los multiplicadores de canales`
            },
            type: ApplicationCommandOptionType.Subcommand,
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `managers`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        let multipliersChannel
        const settings = client.cache.settings.get(interaction.guildId)
        if (interaction.isChatInputCommand() || interaction.customId?.includes("view")) {
            if (interaction.isChatInputCommand()) await interaction.deferReply({ flags: ["Ephemeral"] })
            if (args?.Subcommand === "create") {
                const channels = client.cache.channels.filter(e => e.guildID === interaction.guildId)
                if (channels.size >= settings.max_bonusChannels) return interaction.editReply({ content: `${client.language({ textId: "Maximum channels reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_bonusChannels}`, flags: ["Ephemeral"] })
                if (channels.some(e => e.id === args.channel)) {
                    return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Channel with name", guildId: interaction.guildId, locale: interaction.locale })} <#${args.channel}> ${client.language({ textId: "already exists, select different channel", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                multipliersChannel = new client.channelMultipliersSchema({
                    id: args.channel,
                    guildID: interaction.guildId
                })
                await multipliersChannel.save()
                multipliersChannel = new ChannelMultipliers(client, multipliersChannel)
                client.cache.channels.set(multipliersChannel.id, multipliersChannel)
            } else
            if (args?.Subcommand === "edit") {
                multipliersChannel = client.cache.channels.find(e => e.id === args.name && e.guildID === interaction.guildId)
                if (!multipliersChannel) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Channel with name", guildId: interaction.guildId, locale: interaction.locale })} <${args.name}> ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                if (!interaction.guild.channels.cache.get(multipliersChannel.id)) {
                    await multipliersChannel.delete()
                    return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Channel not found and was deleted", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
            } else
            if (args?.Subcommand === "copy") {
                const channels = client.cache.channels.filter(e => e.guildID === interaction.guildId)
                if (channels.size >= settings.max_bonusChannels) return interaction.reply({ content: `${client.language({ textId: "Maximum channels reached:", guildId: interaction.guildId, locale: interaction.locale })} ${settings.max_bonusChannels}`, flags: ["Ephemeral"] })
                let originalMultipliersChannel = client.cache.channels.find(e => e.id === args.name.toLowerCase() && e.guildID === interaction.guildId)
                if (!originalMultipliersChannel) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Channel with name", guildId: interaction.guildId, locale: interaction.locale })}: <${args.name}> ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                if (!interaction.guild.channels.cache.get(originalMultipliersChannel.id)) {
                    await originalMultipliersChannel.delete()
                    return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Channel not found and was deleted", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                if (client.cache.channels.some(e => e.id === args.channel && e.guildID === interaction.guildId)) {
                    return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Channel with name", guildId: interaction.guildId, locale: interaction.locale })}: <#${args.channel}> ${client.language({ textId: "already exists, select different channel", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                let copyMultipliersChannel = structuredClone(Object.assign({}, { ...originalMultipliersChannel, client: undefined }))
                delete copyMultipliersChannel._id
                copyMultipliersChannel.id = args.channel
                copyMultipliersChannel = new client.channelMultipliersSchema(copyMultipliersChannel)
                await copyMultipliersChannel.save()
                multipliersChannel = new ChannelMultipliers(client, copyMultipliersChannel)
                client.cache.channels.set(multipliersChannel.id, multipliersChannel)
            } else
            if (args?.Subcommand === "delete") {
                multipliersChannel = client.cache.channels.find(e => e.id === args.name && e.guildID === interaction.guildId)
                if (!multipliersChannel) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Channel with name", guildId: interaction.guildId, locale: interaction.locale })} <${args.name}> ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}**` })
                await multipliersChannel.delete()
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Multipliers", guildId: interaction.guildId, locale: interaction.locale })} <#${multipliersChannel.id}> ${client.language({ textId: "were removed", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "view" || interaction.customId?.includes("view")) {
                const channels = client.cache.channels.filter(e => e.guildID === interaction.guildId)
                let min = 0
                let max = 25
                if (interaction.customId?.includes("lim")) {
                    max = +limRegexp.exec(interaction.customId)[1]
                    min = max - 25
                }
                let index = 0
                const embed = new EmbedBuilder()
                    .setTitle(`${client.language({ textId: "Channel multipliers manager", guildId: interaction.guildId, locale: interaction.locale })} (${channels.size}/${settings.max_bonusChannels})`)
                    .setColor(3093046)
                    .setDescription(channels.size ? channels.map((channel) => { 
                        return `${index++}. ${channel.isEnabled ? "🟢": "🔴"}<#${channel.id}>`
                    }).slice(min, max).join("\n") : `${client.language({ textId: "No channels", guildId: interaction.guildId, locale: interaction.locale })}`)
                const embeds = [
                    embed,
                    new EmbedBuilder()
                        .setColor(3093046)
                        .setDescription(`${client.config.emojis.plus}${client.language({ textId: "Create channel multipliers", guildId: interaction.guildId, locale: interaction.locale })}: </manager-channels create:1000420802790957155>\n${client.config.emojis.edit}${client.language({ textId: "Change channel multipliers", guildId: interaction.guildId, locale: interaction.locale })}: </manager-channels edit:1000420802790957155>\n${client.config.emojis.copy}${client.language({ textId: "Copy channel multipliers", guildId: interaction.guildId, locale: interaction.locale })}: </manager-channels copy:1000420802790957155>\n${client.config.emojis.trash}${client.language({ textId: "Delete channel multipliers", guildId: interaction.guildId, locale: interaction.locale })}: </manager-channels delete:1000420802790957155>`)
                ]
                const components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowLeft2}`)
                                .setCustomId(`cmd{manager-channels}lim{25}view1`)
                                .setDisabled((channels.size <= 25 && min === 0) || (channels.size > 25 && min < 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowLeft}`)
                                .setCustomId(`cmd{manager-channels}lim{${max - 25}}view2`)
                                .setDisabled((channels.size <= 25 && min === 0) || (channels.size > 25 && min < 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowRight}`)
                                .setCustomId(`cmd{manager-channels}lim{${max + 25}}view3`)
                                .setDisabled((channels.size <= 25 && min === 0) || (channels.size > 25 && min >= channels.size - 25) ? true : false),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji(`${client.config.emojis.arrowRight2}`)
                                .setCustomId(`cmd{manager-channels}lim{${channels.size + (channels.size % 25 === 0 ? 0 : 25 - (channels.size % 25))}}view4`)
                                .setDisabled((channels.size <= 25 && min === 0) || (channels.size > 25 && min >= channels.size - 25) ? true : false)
                        )
                ]
                if (interaction.isChatInputCommand()) return interaction.editReply({ embeds: embeds, components: components })
                else return interaction.update({ embeds: embeds, components: components })
            } else
            if (args?.Subcommand === "enable-all") {
                if (!client.cache.channels.some(e => e.guildID === interaction.guildId)) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No channels with multipliers on server", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                let count = 0
                await Promise.all(client.cache.channels.filter(e => e.guildID === interaction.guildId).map(async channel => {
                    channel.enabled = true
                    await channel.save()
                    count++
                }))
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Channel multipliers enabled", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            } else
            if (args?.Subcommand === "disable-all") {
                if (!client.cache.channels.some(e => e.guildID === interaction.guildId)) return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No channels with multipliers on server", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                let count = 0
                await Promise.all(client.cache.channels.filter(e => e.guildID === interaction.guildId).map(async channel => {
                    channel.enabled = false
                    await channel.save()
                    count++
                }))
                return interaction.editReply({ content: `${client.config.emojis.YES}**${client.language({ textId: "Channel multipliers disabled", guildId: interaction.guildId, locale: interaction.locale })} (${count})**`, flags: ["Ephemeral"] })
            }
        }
        if (!interaction.isChatInputCommand()) {
            multipliersChannel = client.cache.channels.get(IdRegexp.exec(interaction.customId)[1])
            if (!multipliersChannel) return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Such channel with multipliers does not exist", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            if (interaction.values[0] === "off/on") {
                multipliersChannel.enabled = !multipliersChannel.enabled
                await multipliersChannel.save()
            } else {
                const value = interaction.values[0]
                if (value.includes("multiplier")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-channels_multiplier_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Multiplier", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`%`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("multiplier")
                                        .setRequired(true)
                                        .setMaxLength(4)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(String(multipliersChannel[value] * 100))
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-channels_multiplier_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (isNaN(+modalArgs.multiplier)) {
                            await interaction.reply({ content: `${client.config.emojis.NO}**${modalArgs.multiplier}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        } else {
                            modalArgs.multiplier = +modalArgs.multiplier
                            if (+modalArgs.multiplier < 0) {
                                await interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Booster percentage cannot be < 0", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                            } else {
                                multipliersChannel[value] = +modalArgs.multiplier/100
                                await multipliersChannel.save()
                            }
                        }
                    } else return
                } else {
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-channels_amount_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(4)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(String(multipliersChannel[value]))
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-channels_amount_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (isNaN(+modalArgs.amount)) {
                            await interaction.reply({ content: `${client.config.emojis.NO}**${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        } else {
                            modalArgs.amount = +modalArgs.amount
                            if (+modalArgs.amount < 0) {
                                await interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0**`, flags: ["Ephemeral"] })
                            } else {
                                multipliersChannel[value] = +modalArgs.amount
                                await multipliersChannel.save()
                            }
                        }
                    } else return
                }
            }
        }
        const channel = await interaction.guild.channels.fetch(multipliersChannel.id).catch(e => null)
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setTitle(`${multipliersChannel.enabled ? "🟢" : "🔴"}${channel?.name || multipliersChannel.id}`)
        const value = [
            `${client.language({ textId: "Type", guildId: interaction.guildId, locale: interaction.locale })}: ${channel?.type !== null && channel?.type !== undefined ? `${channel.type === ChannelType.GuildText ? `${client.language({ textId: "Text channel", guildId: interaction.guildId, locale: interaction.locale })}` : 
            channel.type === ChannelType.GuildVoice ? `${client.language({ textId: "Voice channel", guildId: interaction.guildId, locale: interaction.locale })}` : 
            channel.type === ChannelType.GuildCategory ? `${client.language({ textId: "Category", guildId: interaction.guildId, locale: interaction.locale })}` : 
            channel.type === ChannelType.GuildAnnouncement ? `${client.language({ textId: "Announcements channel", guildId: interaction.guildId, locale: interaction.locale })}` : 
            channel.type === ChannelType.GuildStageVoice ? `${client.language({ textId: "Stage", guildId: interaction.guildId, locale: interaction.locale })}` : 
            channel.type === ChannelType.PublicThread ? `${client.language({ textId: "Public thread", guildId: interaction.guildId, locale: interaction.locale })}` : 
            channel.type === ChannelType.PrivateThread ? `${client.language({ textId: "Private thread", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Unknown", guildId: interaction.guildId, locale: interaction.locale })}` }` : `${client.language({ textId: "Channel not found", guildId: interaction.guildId, locale: interaction.locale })}`}`,
            `${client.language({ textId: "Experience bonus", guildId: interaction.guildId, locale: interaction.locale })} +${multipliersChannel.xp_multiplier * 100}%`,
            `${client.language({ textId: "Currency bonus", guildId: interaction.guildId, locale: interaction.locale })} +${multipliersChannel.cur_multiplier * 100}%`,
            `${client.language({ textId: "Reputation bonus", guildId: interaction.guildId, locale: interaction.locale })} +${multipliersChannel.rp_multiplier * 100}%`,
            `${client.language({ textId: "Luck bonus", guildId: interaction.guildId, locale: interaction.locale })} +${multipliersChannel.luck_multiplier * 100}%`
        ]
        if (channel?.type === ChannelType.GuildVoice || channel?.type === ChannelType.GuildCategory) {
            value.push(
                `${client.language({ textId: "Experience bonus per person", guildId: interaction.guildId, locale: interaction.locale })} +${multipliersChannel.xp_multiplier_for_members * 100}% (${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${multipliersChannel.xp_min_members_size} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${multipliersChannel.xp_max_members_size} ${client.language({ textId: "people", guildId: interaction.guildId, locale: interaction.locale })}.)`,
                `${client.language({ textId: "Currency bonus per person", guildId: interaction.guildId, locale: interaction.locale })} +${multipliersChannel.cur_multiplier_for_members * 100}% (${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${multipliersChannel.cur_min_members_size} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${multipliersChannel.cur_max_members_size} ${client.language({ textId: "people", guildId: interaction.guildId, locale: interaction.locale })}.)`,
                `${client.language({ textId: "Reputation bonus per person", guildId: interaction.guildId, locale: interaction.locale })} +${multipliersChannel.rp_multiplier_for_members * 100}% (${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${multipliersChannel.rp_min_members_size} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${multipliersChannel.rp_max_members_size} ${client.language({ textId: "people", guildId: interaction.guildId, locale: interaction.locale })}.)`,
                `${client.language({ textId: "Luck bonus per person", guildId: interaction.guildId, locale: interaction.locale })} +${multipliersChannel.luck_multiplier_for_members * 100}% (${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${multipliersChannel.luck_min_members_size} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${multipliersChannel.luck_max_members_size} ${client.language({ textId: "people", guildId: interaction.guildId, locale: interaction.locale })}.)`,
            )
        } else if (!channel) value.push(`${client.language({ textId: "Channel not found", guildId: interaction.guildId, locale: interaction.locale })}`)
        embed.setDescription(`${value.join("\n")}`)
        const options = [
            { emoji: multipliersChannel.enabled ? client.config.emojis.on : client.config.emojis.off,  label: multipliersChannel.enabled ? `${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, value: `off/on`},
            { emoji: client.config.emojis.XP, label: `${client.language({ textId: "Change experience bonus", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xp_multiplier` },
            { emoji: settings.displayCurrencyEmoji, label: `${client.language({ textId: "Change currency bonus", guildId: interaction.guildId, locale: interaction.locale })}`, value: `cur_multiplier` },
            { emoji: client.config.emojis.RP, label: `${client.language({ textId: "Change reputation bonus", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rp_multiplier` },
            { emoji: client.config.emojis.random, label: `${client.language({ textId: "Change luck bonus", guildId: interaction.guildId, locale: interaction.locale })}`, value: `luck_multiplier` },
        ]
        if (channel && (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildCategory)) {
            options.push(
                { emoji: client.config.emojis.XP, label: `${client.language({ textId: "Change experience bonus per person", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xp_multiplier_for_members` },
                { emoji: settings.displayCurrencyEmoji, label: `${client.language({ textId: "Change currency bonus per person", guildId: interaction.guildId, locale: interaction.locale })}`, value: `cur_multiplier_for_members` },
                { emoji: client.config.emojis.RP, label: `${client.language({ textId: "Change reputation bonus per person", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rp_multiplier_for_members` },
                { emoji: client.config.emojis.random, label: `${client.language({ textId: "Change luck bonus per person", guildId: interaction.guildId, locale: interaction.locale })}`, value: `luck_multiplier_for_members` },
                { emoji: client.config.emojis.profile2users, label: `${client.language({ textId: "Change min people (experience)", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xp_min_members_size` },
                { emoji: client.config.emojis.profile2users, label: `${client.language({ textId: "Change max people (experience)", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xp_max_members_size` },
                { emoji: client.config.emojis.profile2users, label: `${client.language({ textId: "Change min people (currency)", guildId: interaction.guildId, locale: interaction.locale })}`, value: `cur_min_members_size` },
                { emoji: client.config.emojis.profile2users, label: `${client.language({ textId: "Change max people (currency)", guildId: interaction.guildId, locale: interaction.locale })}`, value: `cur_max_members_size` },
                { emoji: client.config.emojis.profile2users, label: `${client.language({ textId: "Change min people (reputation)", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rp_min_members_size` },
                { emoji: client.config.emojis.profile2users, label: `${client.language({ textId: "Change max people (reputation)", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rp_max_members_size` },
                { emoji: client.config.emojis.profile2users, label: `${client.language({ textId: "Change min people (luck)", guildId: interaction.guildId, locale: interaction.locale })}`, value: `luck_min_members_size` },
                { emoji: client.config.emojis.profile2users, label: `${client.language({ textId: "Change max people (luck)", guildId: interaction.guildId, locale: interaction.locale })}`, value: `luck_max_members_size` },
            )
            embed.setFooter({ text: `${client.language({ textId: "Min. people - minimum people needed to activate per-person bonus.\nMax. people - maximum people bot will count for per-person bonus. If per-person bonus is 5%, each person gets 5%*number of people", guildId: interaction.guildId, locale: interaction.locale })}` })
        }
        const first_row = new ActionRowBuilder()
            .addComponents([new StringSelectMenuBuilder()
            .setCustomId(`cmd{manager-channels}id{${multipliersChannel.id}}`)
            .addOptions(options)
            .setPlaceholder(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale })}`)])
        if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [first_row] })
        else return interaction.update({ embeds: [embed], components: [first_row] })
    }
}