const { ChannelType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Collection, InteractionType, PermissionFlagsBits, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, LabelBuilder } = require("discord.js")
const { handleEmojiError } = require("../handler/componentUtils")
const UserRegexp = /usr{(.*?)}/
const TitleRegexp = /title{(.*?)}/
const MarkRegexp = /mark{(.*?)}/
const { v4: uuidv4 } = require("uuid")
const { RewardType } = require("../enums")
module.exports = {
    name: `manager-settings`,
    nameLocalizations: {
        'ru': `управление-настройками`,
        'uk': `управління-налаштуваннями`,
        'es-ES': `gestión-de-configuraciones`
    },
    description: 'Manage guild settings',
    descriptionLocalizations: {
        'ru': `Управление настройками сервера`,
        'uk': `Управління налаштуваннями сервера`,
        'es-ES': `Gestión de la configuración del servidor`
    },
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
    run: async (client, interaction) => {
        const settings = await client.functions.fetchSettings(client, interaction.guildId)
        if (!interaction.isChatInputCommand() && UserRegexp.exec(interaction.customId)?.[1] !== interaction.user.id) return interaction.reply({ content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        const components1 = interaction.message?.components
        if (interaction.isChatInputCommand()) {
            if (!interaction.channel || !interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.EmbedLinks) || !interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ViewChannel)) {
                return interaction.reply({ content: `${client.language({ textId: "To use this command I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n${client.language({ textId: "1. View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "2. Embed Links", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            await interaction.deferReply()
        }
        const filter = m => m.author.id == interaction.user.id && !m.content.includes("\u200B") && m.content.length > 0 && m.channel.id == interaction.channel.id
        const embed = new EmbedBuilder()
        embed.setAuthor({ name: `${client.language({ textId: "SETTINGS", guildId: interaction.guildId, locale: interaction.locale })}` })
        embed.setColor(3093046)
        if (interaction.customId?.includes("language")) {
            settings.language = interaction.values[0]
            await settings.save()
            const { setLanguage } = require(`../handler/language`)
            setLanguage(interaction.guildId, interaction.values[0])
        }
        const menu_options = [
            { emoji: client.config.emojis.gear, label: `${client.language({ textId: "View general information", guildId: interaction.guildId, locale: interaction.locale })}`, value: `general`, default: true },
            { emoji: client.config.emojis.brush, label: `${client.language({ textId: "Customization", guildId: interaction.guildId, locale: interaction.locale })}`, value: `customization` },
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "User Control Panel", guildId: interaction.guildId, locale: interaction.locale })}`, value: `userControlPanel` },
            { emoji: '🔔', label: `${client.language({ textId: "Level Up, Greet, Birthday, Daily Reward… Channel", guildId: interaction.guildId, locale: interaction.locale })}`, value: `notificationChannels` },
            { emoji: client.config.emojis.fishing, label: `${client.language({ textId: "Fishing", guildId: interaction.guildId, locale: interaction.locale })}`, value: `fishing` },
            { emoji: client.config.emojis.mining, label: `${client.language({ textId: "Mining", guildId: interaction.guildId, locale: interaction.locale })}`, value: `mining` },
            { emoji: client.config.emojis.shop, label: `${settings.shopName ? settings.shopName.slice(0, 100) : client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale }) }`, value: `shop` },
            { emoji: client.config.emojis.mic, label: `${client.language({ textId: "Channels", guildId: interaction.guildId, locale: interaction.locale })}`, value: `channels` },
            { emoji: client.config.emojis.roles, label: `${client.language({ textId: "Roles", guildId: interaction.guildId, locale: interaction.locale })}`, value: `roles` },
            { emoji: client.config.emojis.coin, label: `${client.language({ textId: "Server Currency", guildId: interaction.guildId, locale: interaction.locale })}`, value: `currency`},
            { emoji: client.config.emojis.giveaway, label: `${client.language({ textId: "Daily Rewards", guildId: interaction.guildId, locale: interaction.locale })}`, value: `dailyRewards`},
            { emoji: client.config.emojis.top, label: `${client.language({ textId: "Leveling System", guildId: interaction.guildId, locale: interaction.locale }) || `Leveling System`}`, value: `levelRoles`},
            { emoji: client.config.emojis.premium, label: `${client.language({ textId: "Top Leaders Reports", guildId: interaction.guildId, locale: interaction.locale })}`, value: `topLeaders`},
            { emoji: client.config.emojis.XP, label: `${client.language({ textId: "Currency, XP, Reputation earnings", guildId: interaction.guildId, locale: interaction.locale })}`, value: `activities`},
            { emoji: client.config.emojis.premium, label: `${client.language({ textId: "Logs", guildId: interaction.guildId, locale: interaction.locale })}`, value: `logs`},
            { emoji: client.config.emojis.giveaway, label: `${client.language({ textId: "Starter Kit", guildId: interaction.guildId, locale: interaction.locale })}`, value: `startKit` },
            { emoji: client.config.emojis.seasonLevel, label: `${client.language({ textId: "Season Levels", guildId: interaction.guildId, locale: interaction.locale })}`, value: `seasonLevels` },
            { emoji: client.config.emojis.premium, label: `${client.language({ textId: "Custom Roles", guildId: interaction.guildId, locale: interaction.locale })}`, value: `customRoles` },
            { emoji: client.config.emojis.shop, label: `${client.language({ textId: "Market Settings", guildId: interaction.guildId, locale: interaction.locale })}`, value: `marketSettings` },
            { emoji: client.config.emojis.XP100Booster, label: `${client.language({ textId: "Boosters", guildId: interaction.guildId, locale: interaction.locale })}`, value: `boosters` },
            { emoji: client.config.emojis.auction, label: `${client.language({ textId: "Auctions", guildId: interaction.guildId, locale: interaction.locale })}`, value: `auctions` },
        ]
        const language_options = [
            { emoji: "🇷🇺", label: `Язык: Русский`, value: `ru`, default: settings.language === 'ru' },
            { emoji: "🇬🇧", label: `Language: English`, value: `en-US`, default: settings.language === "en-US" },
            { emoji: "🇪🇸", label: `Idioma: Español`, value: `es-ES`, default: settings.language === "es-ES" },
            { emoji: "🇺🇦", label: `Мова: Українська`, value: `uk`, default: settings.language === "uk" },
        ]
        const lang_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} language usr{${interaction.user.id}}`).addOptions(language_options)])
        menu_options.find(e => { return e.default === true}).default = false
        const title = menu_options.find(e => { return e.value == `${interaction.isChatInputCommand() ? "general" : interaction.isStringSelectMenu() && interaction.customId === `cmd{manager-settings}usr{${interaction.user.id}}` ? interaction.values[0] : interaction.customId.includes("language") ? `general` : TitleRegexp.exec(interaction.customId)?.[1]}` })
        if (title) title.default = true
        const first_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}`).addOptions(menu_options)])
        if (interaction.isStringSelectMenu() || interaction.isButton() || interaction.isModalSubmit()) {
            if (interaction.values?.[0].includes("customization") || interaction.customId.includes("customization")) {
                if (interaction.isStringSelectMenu()) {
                    if (interaction.values[0] === "avatar") {
                        if (!interaction.channel.permissionsFor(interaction.guild.members.me).has("ViewChannel") || !interaction.channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory")) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${interaction.channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                        await interaction.update({ embeds: interaction.message.embeds, components: [] })
                        const filter = m => m.author.id == interaction.user.id && m.channel.id == interaction.channel.id
                        const message1 = await interaction.followUp({ content: `${client.config.emojis.exc} ${client.language({ textId: "Send an image", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel type", guildId: interaction.guildId, locale: interaction.locale })}: cancel` })
                        const attachment = await waitingForAttachment(client, interaction, filter)
                        message1.delete().catch(e => null)
                        if (attachment) {
                            const fetch = require("node-fetch")
                            const res = await fetch(attachment.url)
                            const buffer = await res.buffer()
                            await interaction.guild.members.editMe({
                                avatar: buffer
                            }).catch(error => {
                                interaction.followUp({ content: `${client.config.emojis.NO}${error.message}`, flags: ["Ephemeral"] })
                            })
                        } else return interaction.editReply({ embeds: interaction.message.embeds, components: components })
                    } else
                    if (interaction.values[0] === "banner") {
                        if (!interaction.channel.permissionsFor(interaction.guild.members.me).has("ViewChannel") || !interaction.channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory")) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${interaction.channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                        await interaction.update({ embeds: interaction.message.embeds, components: [] })
                        const filter = m => m.author.id == interaction.user.id && m.channel.id == interaction.channel.id
                        const message1 = await interaction.followUp({ content: `${client.config.emojis.exc} ${client.language({ textId: "Send an image", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel type", guildId: interaction.guildId, locale: interaction.locale })}: cancel` })
                        const attachment = await waitingForAttachment(client, interaction, filter)
                        message1.delete().catch(e => null)
                        if (attachment) {
                            const fetch = require("node-fetch")
                            const res = await fetch(attachment.url)
                            const buffer = await res.buffer()
                            await interaction.guild.members.editMe({
                                banner: buffer
                            }).catch(error => {
                                interaction.followUp({ content: `${client.config.emojis.NO}${error.message}`, flags: ["Ephemeral"] })
                            })
                        } else return interaction.editReply({ embeds: interaction.message.embeds, components: components })
                    } else
                    if (interaction.values[0] === "bio") {
                        const modal = new ModalBuilder()
                            .setCustomId(`bio_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Edit information", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .addLabelComponents(
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: `Bio`, guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("bio")
                                            .setRequired(false)
                                            .setMaxLength(400)
                                            .setStyle(TextInputStyle.Paragraph)
                                    )
                            )
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `bio_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            await interaction.guild.members.editMe({
                                bio: modalArgs.bio
                            }).catch(error => {
                                interaction.followUp({ content: `${client.config.emojis.NO}${error.message}`, flags: ["Ephemeral"] })
                            })
                        }
                    } else
                    if (interaction.values[0] === "default:avatar") {
                        await interaction.guild.members.editMe({
                            avatar: null
                        }).catch(error => {
                            interaction.followUp({ content: `${client.config.emojis.NO}${error.message}`, flags: ["Ephemeral"] })
                        })
                    } else
                    if (interaction.values[0] === "default:banner") {
                        await interaction.guild.members.editMe({
                            banner: null
                        }).catch(error => {
                            interaction.followUp({ content: `${client.config.emojis.NO}${error.message}`, flags: ["Ephemeral"] })
                        })
                    } else
                    if (interaction.values[0] === "default:bio") {
                        await interaction.guild.members.editMe({
                            bio: null
                        }).catch(error => {
                            interaction.followUp({ content: `${client.config.emojis.NO}${error.message}`, flags: ["Ephemeral"] })
                        })
                    }
                }
                await interaction.guild.members.me.fetch()
                embed.setTitle(title.label)
                embed.setDescription([
                    `${client.language({ textId: "Avatar", guildId: interaction.guildId, locale: interaction.locale })}: \`\`\`${interaction.guild.members.me.avatar || client.user.avatar || `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}`}\`\`\``,
                    `${client.language({ textId: "Banner", guildId: interaction.guildId, locale: interaction.locale })}: \`\`\`${interaction.guild.members.me.banner || client.user.banner || `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}`}\`\`\``
                ].join("\n"))
                embed.setThumbnail(interaction.guild.members.me.displayAvatarURL())
                embed.setImage(interaction.guild.members.me.displayBannerURL({ size: 4096 }))
                const menu = new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings}title{customization}usr{${interaction.user.id}}`).setPlaceholder(`${client.language({ textId: "Customize bot", guildId: interaction.guildId, locale: interaction.locale })}`).setOptions([
                    {
                        label: `${client.language({ textId: "Avatar", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `avatar`,
                        emoji: client.config.emojis.avatar
                    },
                    {
                        label: `${client.language({ textId: "Banner", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `banner`,
                        emoji: client.config.emojis.banner
                    },
                    {
                        label: `${client.language({ textId: `Bio`, guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `bio`,
                        emoji: client.config.emojis.bio
                    },
                    {
                        label: `${client.language({ textId: "Reset avatar", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `default:avatar`,
                        emoji: client.config.emojis.NO
                    },
                    {
                        label: `${client.language({ textId: "Reset banner", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `default:banner`,
                        emoji: client.config.emojis.NO
                    },
                    {
                        label: `${client.language({ textId: "Reset information", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `default:bio`,
                        emoji: client.config.emojis.NO
                    }
                ])
                const row = new ActionRowBuilder().addComponents(menu)
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [first_row, row] })
                else return interaction.update({ embeds: [embed], components: [first_row, row] })
            }
            if (interaction.values?.[0] === "notificationChannels" || interaction.customId.includes("notificationChannels")) {
                // Handle notification channels menu
                const notificationChannelsMenu = require('../modules/notification-channels/notificationChannelsMenu');
                await notificationChannelsMenu.displayMenu(interaction);
                return;
            }
            if (interaction.values?.[0].includes("customRoles") || interaction.customId.includes("customRoles")) {
                if (interaction.isStringSelectMenu()) {
                    if (interaction.values[0] === "customRoleModeration") {
                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                        interaction.message.components.forEach(row => row.components.forEach(component => {
                            component.data.disabled = true
                        }))
                        await interaction.update({ components: interaction.message.components })
                        await interaction.followUp({ 
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ChannelSelectMenuBuilder()
                                            .setCustomId(`channel`)
                                            .setPlaceholder(`${client.language({ textId: "Select a channel", guildId: interaction.guildId, locale: interaction.locale })}...`)
                                            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.PrivateThread, ChannelType.PublicThread)
                                    ),
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("channelDelete")
                                        .setLabel(client.language({ textId: "DELETE", guildId: interaction.guildId, locale: interaction.locale }))
                                        .setStyle(ButtonStyle.Danger),
                                    new ButtonBuilder()
                                        .setCustomId("channelCancel")
                                        .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                        .setStyle(ButtonStyle.Danger)
                                )
                            ],
                            flags: ["Ephemeral"]
                        })    
                        const filter = (i) => i.customId.includes(`channel`) && i.user.id === interaction.user.id
                        let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => interaction)
                        if (interaction2 && interaction2.customId.includes("channel")) {
                            if (interaction2.customId === "channel") {
                                const channel = interaction2.channels.first()
                                if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
		                    		interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}> ${client.language({ textId: "I need the following permissions:\n1. Send messages", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
		                    		return interaction.editReply({ components: components })
		                    	}
                                settings.channels.customRoleModerationChannel = channel.id
                                await settings.save()
                                interaction2.update({ content: `${client.config.emojis.YES}`, components: [] })
                            } else if (interaction2.customId === "channelDelete") {
                                settings.channels.customRoleModerationChannel = undefined
                                await settings.save()
                                interaction2.update({ content: `${client.config.emojis.YES}`, components: [] })
                            } else if (interaction2.customId === "channelCancel") {
                                interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                        } else return interaction.editReply({ components: components })
                    }
                    if (interaction.values[0] === "customRolePosition") {
                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                        interaction.message.components.forEach(row => row.components.forEach(component => {
                            component.data.disabled = true
                        }))
                        await interaction.update({ components: interaction.message.components })
                        await interaction.followUp({ 
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new RoleSelectMenuBuilder()
                                            .setCustomId(`role`)
                                            .setPlaceholder(`${client.language({ textId: "Select role", guildId: interaction.guildId, locale: interaction.locale })}...`)
                                    ),
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("roleDelete")
                                        .setLabel(client.language({ textId: "DELETE", guildId: interaction.guildId, locale: interaction.locale }))
                                        .setStyle(ButtonStyle.Danger),
                                    new ButtonBuilder()
                                        .setCustomId("roleCancel")
                                        .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                        .setStyle(ButtonStyle.Danger)
                                )
                            ],
                            flags: ["Ephemeral"]
                        })    
                        const filter = (i) => i.customId.includes(`role`) && i.user.id === interaction.user.id
                        let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => interaction)
                        if (interaction2 && interaction2.customId.includes("role")) {
                            if (interaction2.customId === "role") {
                                const role = interaction2.roles.first()
                                if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
                                    await interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "I don't have 'Manage Roles' permission", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                    return interaction.editReply({ components: components })
                                }
                                if (role.position > interaction.guild.members.me.roles.highest.position) {
                                    await interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "My highest role position is lower than position of", guildId: interaction.guildId, locale: interaction.locale })} ${role}`, components: [] })
                                    return interaction.editReply({ components: components })
                                }
                                settings.roles.customRolePosition = role.id
                                await settings.save()
                                interaction2.update({ content: `${client.config.emojis.YES}`, components: [] })
                            } else if (interaction2.customId === "roleDelete") {
                                settings.roles.customRolePosition = undefined
                                await settings.save()
                                interaction2.update({ content: `${client.config.emojis.YES}`, components: [] })
                            } else if (interaction2.customId === "roleCancel") {
                                interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                        } else return interaction.editReply({ components: components })
                    }
                    if (interaction.values[0] === "customRolePermission") {
                        if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						const modal = new ModalBuilder()
							.setCustomId(`permission_${interaction.id}`)
							.setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
											.setCustomId("name")
											.setRequired(false)
											.setValue(`${client.cache.permissions.find(e => e.id === settings.customRolePermission)?.name || ""}`)
											.setStyle(TextInputStyle.Short)
                                    ),
                            ])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `permission_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
						if (interaction && interaction.type === InteractionType.ModalSubmit) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
							if (!modalArgs.name) {
								settings.customRolePermission = undefined
                                await settings.save()
							} else {
								const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
								if (!permission) {
									return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
								} else {
									settings.customRolePermission = permission.id
                                    await settings.save()
								}
							}
						} else return
                    } else
                    if (interaction.values[0] === "price") {
                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                        interaction.message.components.forEach(row => row.components.forEach(component => {
                            component.data.disabled = true
                        }))
                        await interaction.update({ components: interaction.message.components })
                        await interaction.followUp({ 
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        [
                                            new ButtonBuilder()
                                                .setCustomId("add_item")
                                                .setLabel(client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale }))
                                                .setEmoji(client.config.emojis.box)
                                                .setStyle(ButtonStyle.Secondary),
                                            new ButtonBuilder()
                                                .setCustomId("add_currency")
                                                .setLabel(settings.displayCurrencyEmoji)
                                                .setEmoji(client.config.emojis.coin)
                                                .setStyle(ButtonStyle.Secondary),
                                            new ButtonBuilder()
                                                .setCustomId("add_rp")
                                                .setLabel(`${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`)
                                                .setEmoji(client.config.emojis.RP)
                                                .setStyle(ButtonStyle.Secondary),
                                            new ButtonBuilder()
                                                .setCustomId("add_role")
                                                .setLabel(client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale }))
                                                .setEmoji(client.config.emojis.box)
                                                .setStyle(ButtonStyle.Secondary),
                                        ]
                                    ),
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId("add_cancel")
                                            .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                            .setStyle(ButtonStyle.Danger),
                                    ),
                            ],
                            flags: ["Ephemeral"]
                        })
                        const filter = (i) => i.customId.includes(`add`) && i.user.id === interaction.user.id
                        let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
                        if (interaction2 && interaction2.customId.includes("add")) {
                            if (interaction2.customId.includes("cancel")) {
                                interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                            let type
                            let id
                            const modalComponents = [
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("amount")
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            ]
                            if (interaction2.customId.includes("item")) {
                                type = RewardType.Item
                                modalComponents.unshift(
                                    new LabelBuilder()
                                        .setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setTextInputComponent(
                                            new TextInputBuilder()
                                                .setCustomId("item")
                                                .setRequired(true)
                                                .setStyle(TextInputStyle.Short)
                                        )
                                )
                            }
                            if (interaction2.customId.includes("role")) {
                                await interaction2.update({ 
                                    components: [
                                        new ActionRowBuilder()
                                            .addComponents(
                                                new RoleSelectMenuBuilder()
                                                    .setCustomId(`addRole`)
                                                    .setPlaceholder(`${client.language({ textId: "Select role", guildId: interaction.guildId, locale: interaction.locale })}...`)
                                            ),
                                        new ActionRowBuilder().addComponents(
                                            new ButtonBuilder()
                                                .setCustomId("addRoleCancel")
                                                .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                                .setStyle(ButtonStyle.Danger)
                                        )
                                    ],
                                    flags: ["Ephemeral"]
                                })    
                                const filter = (i) => i.customId.includes(`addRole`) && i.user.id === interaction.user.id
                                interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => interaction2)
                                if (interaction2 && interaction2.customId.includes("addRole")) {
                                    if (interaction2.customId === "addRole") {
                                        const role = interaction2.roles.first()
                                        id = role.id
                                        type = RewardType.Role
                                    } else {
                                        interaction2.update({ content: client.config.emojis.YES, components: [] })
                                        return interaction.editReply({ components: components })
                                    }
                                } else return interaction.editReply({ components: components })
                            }
                            if (interaction2.customId.includes("currency")) type = RewardType.Currency
                            if (interaction2.customId.includes("rp")) type = RewardType.Reputation
                            const modal = new ModalBuilder()
                                .setCustomId(`addItem_${interaction2.id}`)
                                .setTitle(`${client.language({ textId: "Add price", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setLabelComponents(modalComponents)
                            await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                            const filter = (i) => i.customId === `addItem_${interaction2.id}` && i.user.id === interaction.user.id
                            interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction2)
                            if (interaction2 && interaction2.isModalSubmit()) {
                                const modalArgs = {}
                                interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                                if (type === RewardType.Item) {
                                    const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()) && e.found && e.enabled)
                                    if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
                                        let result = ""
                                        filteredItems.forEach(item => {
                                            result += `> ${item.displayEmoji}**${item.name}**\n`	
                                        })
                                        interaction2.update({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), components: [], flags: ["Ephemeral"] })  
                                        return interaction.editReply({ components: components })
                                    }
                                    searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
                                    if (!searchedItem) {
                                        interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                        return interaction.editReply({ components: components })
                                    }
                                    id = searchedItem.itemID
                                }
                                if (isNaN(+modalArgs.amount)) {
                                    interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                modalArgs.amount = +modalArgs.amount
                                if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
                                    interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100 000 000 000`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                const reward = settings.customRolePrice?.find(e => { return e.type === type && e.id === id })
                                if (reward) {
                                    if (modalArgs.amount === 0) settings.customRolePrice = settings.customRolePrice.filter(e => e.id !== id && e.type !== type)
                                    else reward.amount = modalArgs.amount
                                } else {
                                    if (modalArgs.amount > 0) {
                                        if (settings.customRolePrice?.length >= 5) {
                                            interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "Maximum number of items for price reached", guildId: interaction.guildId, locale: interaction.locale })}: 5**`, components: [], flags: ["Ephemeral"] })
                                            return interaction.editReply({ components: components })
                                        }
                                        if (!settings.customRolePrice) settings.customRolePrice = []
                                        settings.customRolePrice.push({
                                            type: type,
                                            id: id,
                                            amount: modalArgs.amount
                                        })
                                    }
                                }
                                await settings.save()
                                interaction2.update({ content: client.config.emojis.YES, components: [], flags: ["Ephemeral"] })
                            }
                        }
                    } else
                    if (interaction.values[0] === "clearPrice") {
                        settings.customRolePrice = []
                        await settings.save()
                    } else
                    if (interaction.values[0] === "hoist") {
                        if (settings.customRoleHoist) settings.customRoleHoist = undefined
                        else settings.customRoleHoist = true
                        await settings.save()
                    } else
                    if (interaction.values[0] === "customRoleMinimumMinutes") {
                        const modal = new ModalBuilder()
                            .setCustomId(`customRoleMinimumMinutes_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Minimum temporary role duration", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Minutes", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("minutes")
                                            .setMaxLength(100)
                                            .setStyle(TextInputStyle.Short)
                                    ),
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `customRoleMinimumMinutes_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                        if (interaction && interaction.isModalSubmit()) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.minutes) || !Number.isInteger(+modalArgs.minutes)) {
                                return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.minutes}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                            modalArgs.minutes = +modalArgs.minutes
                            if (modalArgs.minutes <= 0) {
                                return interaction.reply({ content: `${client.config.emojis.NO} **${client.language({ textId: "Number cannot be", guildId: interaction.guildId, locale: interaction.locale })} <= 0**`, flags: ["Ephemeral"] })
                            }
                            settings.customRoleMinimumMinutes = modalArgs.minutes
                            await settings.save()
                        } else return
                    } else
                    if (interaction.values[0] === "temporary") {
                        settings.customRoleTemporaryEnabled = !settings.customRoleTemporaryEnabled
                        await settings.save()
                    } else
                    if (interaction.values[0] === "priceMinute") {
                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                        interaction.message.components.forEach(row => row.components.forEach(component => {
                            component.data.disabled = true
                        }))
                        await interaction.update({ components: interaction.message.components })
                        await interaction.followUp({ 
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        [
                                            new ButtonBuilder()
                                                .setCustomId("add_item")
                                                .setLabel(client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale }))
                                                .setEmoji(client.config.emojis.box)
                                                .setStyle(ButtonStyle.Secondary),
                                            new ButtonBuilder()
                                                .setCustomId("add_currency")
                                                .setLabel(settings.currencyName)
                                                .setEmoji(settings.displayCurrencyEmoji)
                                                .setStyle(ButtonStyle.Secondary),
                                            new ButtonBuilder()
                                                .setCustomId("add_rp")
                                                .setLabel(`${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`)
                                                .setEmoji(client.config.emojis.RP)
                                                .setStyle(ButtonStyle.Secondary),
                                            new ButtonBuilder()
                                                .setCustomId("add_role")
                                                .setLabel(client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale }))
                                                .setEmoji(client.config.emojis.box)
                                                .setStyle(ButtonStyle.Secondary),
                                        ]
                                    ),
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId("add_cancel")
                                            .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                            .setStyle(ButtonStyle.Danger),
                                    ),
                            ],
                            flags: ["Ephemeral"]
                        })
                        const filter = (i) => i.customId.includes(`add`) && i.user.id === interaction.user.id
                        let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
                        if (interaction2 && interaction2.customId.includes("add")) {
                            if (interaction2.customId.includes("cancel")) {
                                interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                            let type
                            let id
                            const modalComponents = [
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("amount")
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            ]
                            if (interaction2.customId.includes("item")) {
                                type = RewardType.Item
                                modalComponents.unshift(
                                    new LabelBuilder()
                                        .setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setTextInputComponent(
                                            new TextInputBuilder()
                                                .setCustomId("item")
                                                .setRequired(true)
                                                .setStyle(TextInputStyle.Short)
                                        )
                                )
                            }
                            if (interaction2.customId.includes("role")) {
                                await interaction2.update({ 
                                    components: [
                                        new ActionRowBuilder()
                                            .addComponents(
                                                new RoleSelectMenuBuilder()
                                                    .setCustomId(`addRole`)
                                                    .setPlaceholder(`${client.language({ textId: "Select role", guildId: interaction.guildId, locale: interaction.locale })}...`)
                                            ),
                                        new ActionRowBuilder().addComponents(
                                            new ButtonBuilder()
                                                .setCustomId("addRoleCancel")
                                                .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                                .setStyle(ButtonStyle.Danger)
                                        )
                                    ],
                                    flags: ["Ephemeral"]
                                })    
                                const filter = (i) => i.customId.includes(`addRole`) && i.user.id === interaction.user.id
                                interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => interaction2)
                                if (interaction2 && interaction2.customId.includes("addRole")) {
                                    if (interaction2.customId === "addRole") {
                                        const role = interaction2.roles.first()
                                        id = role.id
                                        type = RewardType.Role
                                    } else {
                                        interaction2.update({ content: client.config.emojis.YES, components: [] })
                                        return interaction.editReply({ components: components })
                                    }
                                } else return interaction.editReply({ components: components })
                            }
                            if (interaction2.customId.includes("currency")) type = RewardType.Currency
                            if (interaction2.customId.includes("rp")) type = RewardType.Reputation
                            const modal = new ModalBuilder()
                                .setCustomId(`addItem_${interaction2.id}`)
                                .setTitle(`${client.language({ textId: "Add price", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setLabelComponents(modalComponents)
                            await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                            const filter = (i) => i.customId === `addItem_${interaction2.id}` && i.user.id === interaction.user.id
                            interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction2)
                            if (interaction2 && interaction2.isModalSubmit()) {
                                const modalArgs = {}
                                interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                                if (type === RewardType.Item) {
                                    const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()) && e.found && e.enabled)
                                    if (filteredItems.size > 1 && !filteredItems.some(e =>  e.name.toLowerCase() === modalArgs.item.toLowerCase())) {
                                        let result = ""
                                        filteredItems.forEach(item => {
                                            result += `> ${item.displayEmoji}**${item.name}**\n`	
                                        })
                                        interaction2.update({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`.slice(0, 2000), components: [], flags: ["Ephemeral"] })  
                                        return interaction.editReply({ components: components })
                                    }
                                    searchedItem = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) : filteredItems.first()
                                    if (!searchedItem) {
                                        interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                        return interaction.editReply({ components: components })
                                    }
                                    id = searchedItem.itemID
                                }
                                if (isNaN(+modalArgs.amount)) {
                                    interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                modalArgs.amount = +modalArgs.amount
                                if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
                                    interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100 000 000 000`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                const reward = settings.customRolePriceMinute?.find(e => { return e.type === type && e.id === id })
                                if (reward) {
                                    if (modalArgs.amount === 0) settings.customRolePriceMinute = settings.customRolePriceMinute.filter(e => e.id !== id && e.type !== type)
                                    else reward.amount = modalArgs.amount
                                } else {
                                    if (modalArgs.amount > 0) {
                                        if (settings.customRolePriceMinute?.length >= 5) {
                                            interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "Maximum number of items for price reached", guildId: interaction.guildId, locale: interaction.locale })}: 5**`, components: [], flags: ["Ephemeral"] })
                                            return interaction.editReply({ components: components })
                                        }
                                        if (!settings.customRolePriceMinute) settings.customRolePriceMinute = []
                                        settings.customRolePriceMinute.push({
                                            type: type,
                                            id: id,
                                            amount: modalArgs.amount
                                        })
                                    }
                                }
                                await settings.save()
                                interaction2.update({ content: client.config.emojis.YES, components: [], flags: ["Ephemeral"] })
                            }
                        }
                    } else
                    if (interaction.values[0] === "clearPriceMinute") {
                        settings.customRolePriceMinute = []
                        await settings.save()
                    } else
                    if (interaction.values[0] === "customRoleCreationLimit") {
                        const modal = new ModalBuilder()
							.setCustomId(`customRoleCreationLimit_${interaction.id}`)
							.setTitle(`${client.language({ textId: "Custom role creation limit", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Limit", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
											.setCustomId("limit")
											.setRequired(false)
											.setValue(`${settings.customRoleCreationLimit || " "}`)
											.setStyle(TextInputStyle.Short)
                                    ),
                            ])
						await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
						const filter = (i) => i.customId === `customRoleCreationLimit_${interaction.id}` && i.user.id === interaction.user.id
						interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => null)
						if (interaction && interaction.type === InteractionType.ModalSubmit) {
							const modalArgs = {}
							interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.limit) {
                                settings.customRoleCreationLimit = undefined
                                await settings.save()
                            } else {
                                if (isNaN(+modalArgs.limit)) {
                                    return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.limit}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                }
                                modalArgs.limit = +modalArgs.limit
                                if (modalArgs.limit <= 0 || modalArgs.limit > 100000000000) {
                                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100 000 000 000`, components: [], flags: ["Ephemeral"] })
                                }
                                settings.customRoleCreationLimit = modalArgs.limit
                                await settings.save()
                            }
						} else return
                    }
                    if (interaction.customId.includes("properties")) {
                        interaction.values.forEach(e => {
                            if (!settings.customRoleProperties) settings.customRoleProperties = []
                            if (settings.customRoleProperties.includes(e)) settings.customRoleProperties = settings.customRoleProperties.filter(p => p !== e)
                            else settings.customRoleProperties.push(e)
                        })
                        await settings.save()
                    }
                }
                embed.setTitle(title.label)
                embed.setDescription(`${client.language({ textId: `Use /custom-role command to create your own role. To use the command, configure the parameters below.`, guildId: interaction.guildId, locale: interaction.locale })}`)
                embed.addFields([
                    {
                        name: `${client.language({ textId: "Custom role creation under role (Required)", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: settings.roles.customRolePosition ? `<@&${settings.roles.customRolePosition}>` : `<${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}>`
                    },
                    {
                        name: `${client.language({ textId: "Channel for custom role moderation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: settings.channels.customRoleModerationChannel ? `<#${settings.channels.customRoleModerationChannel}>` : `<${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}>`
                    },
                    {
                        name: `${client.language({ textId: "Permission for creating custom role", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: settings.customRolePermission ? client.cache.permissions.get(settings.customRolePermission)?.name || `${client.language({ textId: "No permission", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "No permission", guildId: interaction.guildId, locale: interaction.locale })}`
                    },
                    {
                        name: `${client.language({ textId: "Show members with role separately from other online members", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: settings.customRoleHoist ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`
                    },
                    settings.customRoleProperties?.length ? {
                        name: `${client.language({ textId: "After role creation, sets properties", guildId: interaction.guildId, locale: interaction.locale })}:`,
                        value: `[${settings.customRoleProperties.map(e => `${client.language({ textId: e, guildId: interaction.guildId, locale: interaction.locale })}`).join(", ")}]`
                    } : undefined,
                    {
                        name: `${client.language({ textId: "Minimum temporary role duration", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: settings.customRoleMinimumMinutes ? `${client.functions.transformSecs(client, settings.customRoleMinimumMinutes * 60 * 1000, interaction.guildId, interaction.locale)}` : `${client.language({ textId: "No limit", guildId: interaction.guildId, locale: interaction.locale })}`
                    },
                    {
                        name: `${client.language({ textId: "Custom role creation price forever", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: !settings.customRolePrice?.length ? `${client.language({ textId: "Free", guildId: interaction.guildId, locale: interaction.locale })}` : await Promise.all(settings.customRolePrice.map(async e => {
                            if (e.type === RewardType.Currency) {
                                return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.amount})`
                            }
                            if (e.type === RewardType.Reputation) {
                                return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${e.amount})`
                            }
                            if (e.type === RewardType.Item) {
                                const item = client.cache.items.find(i => i.itemID === e.id && i.enabled && !i.temp)
                                if (item) {
                                    return `${item.displayEmoji}${item.name} (${e.amount})`
                                }
                                else return `${e.id} (${e.amount})`
                            }
                            if (e.type === RewardType.Role) {
                                return `<@&${e.id}> (${e.amount})`
                            }
                        })).then(array => array.join(", "))
                    },
                    {
                        name: `${client.language({ textId: "Custom role creation limit", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: settings.customRoleCreationLimit ? `${settings.customRoleCreationLimit}` : `${client.language({ textId: "No limit", guildId: interaction.guildId, locale: interaction.locale })}`
                    },
                    settings.customRoleTemporaryEnabled ? {
                        name: `${client.language({ textId: "Custom role creation price [1 min.]", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: !settings.customRolePriceMinute?.length ? `${client.language({ textId: "Free", guildId: interaction.guildId, locale: interaction.locale })}` : await Promise.all(settings.customRolePriceMinute.map(async e => {
                            if (e.type === RewardType.Currency) {
                                return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.amount})`
                            }
                            if (e.type === RewardType.Reputation) {
                                return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${e.amount})`
                            }
                            if (e.type === RewardType.Item) {
                                const item = client.cache.items.find(i => i.itemID === e.id && i.enabled && !i.temp)
                                if (item) {
                                    return `${item.displayEmoji}${item.name} (${e.amount})`
                                }
                                else return `${e.id} (${e.amount})`
                            }
                            if (e.type === RewardType.Role) {
                                return `<@&${e.id}> (${e.amount})`
                            }
                        })).then(array => array.join(", "))
                    } : undefined
                ].filter(e => e))
                const menu = new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings}title{customRoles}usr{${interaction.user.id}}`).setOptions([
                    {
                        label: `${client.language({ textId: "Channel for custom role moderation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `customRoleModeration`
                    },
                    {
                        label: `${client.language({ textId: "Custom role creation under role", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `customRolePosition`
                    },
                    {
                        label: `${client.language({ textId: "Permission for creating custom role", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `customRolePermission`
                    },
                    {
                        label: `${client.language({ textId: "Show members with role separately from other online members", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `hoist`
                    },
                    {
                        label: `${client.language({ textId: "Minimum temporary role duration", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `customRoleMinimumMinutes`
                    },
                    {
                        label: `${client.language({ textId: settings.customRoleTemporaryEnabled ? `Disable temporary role creation` : `Enable temporary role creation`, guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `temporary`
                    },
                    {
                        label: `${client.language({ textId: "Add price [forever]", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `price`
                    },
                    settings.customRoleTemporaryEnabled ? {
                        label: `${client.language({ textId: "Add price [1 min.]", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `priceMinute`
                    } : undefined,
                    {
                        label: `${client.language({ textId: "Custom role creation limit", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `customRoleCreationLimit`
                    },
                ].filter(e => e))
                const menu2 = new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings}title{customRoles}usr{${interaction.user.id}}properties`).setOptions([
                    {
                        label: `${client.language({ textId: `canUnwear`, guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `canUnwear`
                    },
                    {
                        label: `${client.language({ textId: `cannotTransfer`, guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `cannotTransfer`
                    },
                    {
                        label: `${client.language({ textId: `cannotSell`, guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `cannotSell`
                    },
                    {
                        label: `${client.language({ textId: `cannotGiveaway`, guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `cannotGiveaway`
                    },
                ]).setMaxValues(4).setPlaceholder(`${client.language({ textId: "After role creation, sets properties", guildId: interaction.guildId, locale: interaction.locale })}...`)
                if (settings.customRolePrice?.length) menu.addOptions([
                    {
                        label: `${client.language({ textId: "Clear price [forever]", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `clearPrice`
                    }
                ])
                if (settings.customRolePriceMinute?.length) menu.addOptions([
                    {
                        label: `${client.language({ textId: "Clear price [1 min.]", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `clearPriceMinute`
                    }
                ])
                const row = new ActionRowBuilder().addComponents(menu)
                const row2 = new ActionRowBuilder().addComponents(menu2)
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [first_row, row, row2] })
                else return interaction.update({ embeds: [embed], components: [first_row, row, row2] })
            }
            if (interaction.values?.[0].includes("startKit") || interaction.customId.includes("startKit")) {
                embed.setTitle(title.label)
                if (interaction.customId.includes("currency")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`startKit_currency_${interaction.id}`)
                        .setTitle(settings.currencyName)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(9)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.startKit.find(e => e.itemID === "currency")?.amount || 0}`)
                                ),
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `startKit_currency_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (!+modalArgs.amount) {
                            settings.startKit = settings.startKit.filter(e => e.itemID !== "currency")
                            await settings.save()
                        } else {
                            const currency = settings.startKit.find(e => { return e.itemID === "currency" })
                            if (currency) currency.amount = +modalArgs.amount
                            else settings.startKit.push({
                                itemID: "currency",
                                amount: +modalArgs.amount
                            })
                            await settings.save()
                        }
                    } else return
                }
                if (interaction.customId.includes("xp")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`startKit_xp_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(9)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.startKit.find(e => e.itemID === "xp")?.amount || 0}`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `startKit_xp_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (!+modalArgs.amount || +modalArgs.amount < 0) {
                            settings.startKit = settings.startKit.filter(e => e.itemID !== "xp")
                            await settings.save()
                        } else {
                            const xp = settings.startKit.find(e => { return e.itemID === "xp" })
                            if (xp) xp.amount = +modalArgs.amount
                            else settings.startKit.push({
                                itemID: "xp",
                                amount: +modalArgs.amount
                            })
                            await settings.save()
                        }
                    } else return
                }
                if (interaction.customId.includes("rp")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`startKit_rp_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(5)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.startKit.find(e => e.itemID === "rp")?.amount || 0}`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `startKit_rp_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (+modalArgs.amount < -1000) modalArgs.amount = -1000
                        if (+modalArgs.amount > 1000) modalArgs.amount = 1000
                        if (!+modalArgs.amount) {
                            settings.startKit = settings.startKit.filter(e => e.itemID !== "rp")
                            await settings.save()
                        } else {
                            const rp = settings.startKit.find(e => { return e.itemID === "rp" })
                            if (rp) rp.amount = +modalArgs.amount
                            else settings.startKit.push({
                                itemID: "rp",
                                amount: +modalArgs.amount
                            })
                            await settings.save()
                        }
                    } else return
                }
                if (interaction.customId.includes("items")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`startKit_items_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("item")
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Short)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(9)
                                        .setStyle(TextInputStyle.Short)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `startKit_items_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.item.toLowerCase()))
                        const itemID = filteredItems.some(e => e.name.toLowerCase() === modalArgs.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.item.toLowerCase())?.itemID : filteredItems.first()?.itemID
                        if (!itemID) {
                            if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                            return interaction.followUp({ content: `${client.language({ textId: "Item with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.item}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        } else {
                            if (!+modalArgs.amount) {
                                settings.startKit = settings.startKit.filter(e => e.itemID !== itemID)
                                await settings.save()
                            } else {
                                const item = settings.startKit.find(e => { return e.itemID === itemID })
                                if (item) item.amount = +modalArgs.amount
                                else {
                                    if (settings.startKit.filter(e => e.itemID !== "rp" && e.itemID !== "xp" && e.itemID !== "currency").length < 5) {
                                        settings.startKit.push({
                                            itemID: itemID,
                                            amount: +modalArgs.amount
                                        })    
                                    } else {
                                        if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                        return interaction.followUp({ content: `${client.language({ textId: "Maximum items in set - 5", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                                    }
                                }
                                await settings.save()
                            }    
                        }
                    } else return
                }
                if (interaction.customId.includes("turn")) {
                    if (settings.startKitEnabled) settings.startKitEnabled = undefined
                    else settings.startKitEnabled = true
                    await settings.save()
                }
                if (!settings.startKit.length) embed.setDescription(`${client.language({ textId: "No starter kit. Starter kit can include currency, experience, reputation and up to 5 items. Quests and achievements are not counted when giving starter kit.", guildId: interaction.guildId, locale: interaction.locale })}`)
                else {
                    const kit = [settings.startKitEnabled ? `${client.config.emojis.on}${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.config.emojis.off}${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`]
                    for (const element of settings.startKit) {
                        if (element.itemID === "currency") kit.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** ${element.amount}`)
                        else if (element.itemID === "xp") kit.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${element.amount}`)
                        else if (element.itemID === "rp") kit.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** ${element.amount}`)
                        else {
                            const item = client.cache.items.find(e => e.itemID === element.itemID && !e.temp)
                            if (item) {
                                kit.push(`${item.displayEmoji}**${item.name}** ${element.amount}${!item.enabled ? ` (${client.language({ textId: "disabled", guildId: interaction.guildId, locale: interaction.locale })})` : ``}`)
                            } else kit.push(`**${element.itemID}** ${element.amount}`)
                        }
                    }
                    embed.setDescription(kit.join("\n"))
                    embed.setFooter({ text: `${client.language({ textId: "To remove item from starter kit - enter item name and set quantity to 0", guildId: interaction.guildId, locale: interaction.locale })}` })
                }
                const hasCurrency = settings.startKit.some(e => e.itemID === "currency")
                const hasXp = settings.startKit.some(e => e.itemID === "xp")
                const hasRp = settings.startKit.some(e => e.itemID === "rp")
                const itemsAmount = settings.startKit.filter(e => e.itemID !== "rp" && e.itemID !== "xp" && e.itemID !== "currency").length
                const currency_btn = new ButtonBuilder().setStyle(hasCurrency ? ButtonStyle.Secondary : ButtonStyle.Success).setEmoji(settings.displayCurrencyEmoji).setCustomId(`cmd{manager-settings}title{startKit}usr{${interaction.user.id}}currency`).setLabel(hasCurrency ? `${client.language({ textId: "Change quantity", guildId: interaction.guildId, locale: interaction.locale })} ${settings.currencyName}` : `${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} ${settings.currencyName}`)
                const xp_btn = new ButtonBuilder().setStyle(hasXp ? ButtonStyle.Secondary : ButtonStyle.Success).setEmoji(client.config.emojis.XP).setCustomId(`cmd{manager-settings}title{startKit}usr{${interaction.user.id}}xp`).setLabel(hasXp ? `${client.language({ textId: "Change experience amount", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Add experience", guildId: interaction.guildId, locale: interaction.locale })}`)
                const rp_btn = new ButtonBuilder().setStyle(hasRp ? ButtonStyle.Secondary : ButtonStyle.Success).setEmoji(client.config.emojis.RP).setCustomId(`cmd{manager-settings}title{startKit}usr{${interaction.user.id}}rp`).setLabel(hasRp ? `${client.language({ textId: "Change reputation amount", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Add reputation", guildId: interaction.guildId, locale: interaction.locale })}`)
                const items_btn = new ButtonBuilder().setStyle(itemsAmount ? ButtonStyle.Secondary : ButtonStyle.Success).setEmoji(client.config.emojis.box).setCustomId(`cmd{manager-settings}title{startKit}usr{${interaction.user.id}}items`).setLabel(itemsAmount ? `${client.language({ textId: "Add/change/delete item", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Add item", guildId: interaction.guildId, locale: interaction.locale })}`)
                const turn_btn = new ButtonBuilder().setStyle(settings.startKitEnabled ? ButtonStyle.Danger : ButtonStyle.Success).setEmoji(settings.startKitEnabled ? client.config.emojis.off : client.config.emojis.on).setCustomId(`cmd{manager-settings}title{startKit}usr{${interaction.user.id}}turn`).setLabel(settings.startKitEnabled ? `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`)
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [first_row, new ActionRowBuilder().addComponents([currency_btn, xp_btn, rp_btn, items_btn]), new ActionRowBuilder().addComponents([turn_btn])] })
                return interaction.update({ embeds: [embed], components: [first_row, new ActionRowBuilder().addComponents([currency_btn, xp_btn, rp_btn, items_btn]), new ActionRowBuilder().addComponents([turn_btn])] })
            }
            if (interaction.values?.[0].includes("fishing") || interaction.customId.includes("fishing")) {
                embed.setTitle(title.label)
                if (interaction.customId.includes("edit")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`fishing_edit_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "FISHING", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Bait", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("bait")
                                        .setRequired(true)
                                        .setMaxLength(30)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.baitCurrency === "currency" ? settings.currencyName : client.cache.items.find(e => !e.temp && e.itemID === settings.baitCurrency)?.name || settings.baitCurrency}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(9)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.baitPrice}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("name")
                                        .setRequired(false)
                                        .setMaxLength(20)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.fishingName || ""}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: `Icon URL`, guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("url")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.fishingIcon || ""}`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `fishing_edit_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (modalArgs.bait.toLowerCase() === settings.currencyName.toLowerCase()) settings.baitCurrency = "currency"
                        else {
                            const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.bait.toLowerCase()))
                            const itemID = filteredItems.some(e => e.name.toLowerCase() === modalArgs.bait.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.bait.toLowerCase())?.itemID : filteredItems.first()?.itemID
                            if (!itemID) {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                interaction.followUp({ content: `${client.language({ textId: "Item with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.bait}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            } else settings.baitCurrency = itemID
                        }
                        if (+modalArgs.amount < 0) modalArgs.amount = 0
                        if (Number.isNaN(+modalArgs.amount)) {
                            if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                            interaction.followUp({ content: `**${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        } else settings.baitPrice = +modalArgs.amount
                        if (modalArgs.name) settings.fishingName = modalArgs.name
                        else settings.fishingName = undefined
                        if (modalArgs.url) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.url)
                            if (image) settings.fishingIcon = modalArgs.url
                            else {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                interaction.followUp({ content: `${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.url}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                        } else settings.fishingIcon = undefined
                        await settings.save()
                    }
                }
                const description = []
                if (settings.baitCurrency === "currency") {
                    description.push(`${client.language({ textId: "Bait", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.displayCurrencyEmoji}**${settings.currencyName}**\n${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: **${settings.baitPrice}**`)
                } else {
                    const item = client.cache.items.find(e => !e.temp && e.itemID === settings.baitCurrency)
                    if (item) {
                        description.push(`${client.language({ textId: "Bait", guildId: interaction.guildId, locale: interaction.locale })}: ${item.displayEmoji}**${item.name}**${!item.enabled ? ` (${client.language({ textId: "disabled", guildId: interaction.guildId, locale: interaction.locale })})` : ``}\n${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: **${settings.baitPrice}**`)    
                    } else {
                        description.push(`${client.language({ textId: "Bait", guildId: interaction.guildId, locale: interaction.locale })}: **${settings.baitCurrency}**\n${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: **${settings.baitPrice}**`)    
                    }
                }
                if (settings.fishingName) description.push(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.fishingName}`)
                if (settings.fishingIcon) description.push(`${client.language({ textId: "Icon", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.fishingIcon}`)
                embed.setDescription(description.join("\n"))
                const edit_btn = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale })}`).setEmoji(client.config.emojis.edit).setCustomId(`cmd{manager-settings} title{fishing} edit usr{${interaction.user.id}}`)
                const second_row = new ActionRowBuilder().addComponents([edit_btn])
                if (interaction.replied || interaction.deferred) return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row] })
                return interaction.update({ content: " ", embeds: [embed], components: [first_row, second_row] })
            }
            if (interaction.values?.[0].includes("mining") || interaction.customId.includes("mining")) {
                embed.setTitle(title.label)
                if (interaction.customId.includes("edit")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`mining_edit_${interaction.id}`)
                        .setTitle(`${client.language({ textId: "MINING", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Tool", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("tool")
                                        .setRequired(true)
                                        .setMaxLength(30)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.miningTool === "currency" ? settings.currencyName : client.cache.items.find(e => !e.temp && e.itemID === settings.miningTool)?.name || settings.miningTool}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setMaxLength(9)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.miningPrice}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("name")
                                        .setRequired(false)
                                        .setMaxLength(20)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.miningName || ""}`)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: `Icon URL`, guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("url")
                                        .setRequired(false)
                                        .setStyle(TextInputStyle.Short)
                                        .setValue(`${settings.miningIcon || ""}`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `mining_edit_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                    if (interaction && interaction.isModalSubmit()) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (modalArgs.tool.toLowerCase() === settings.currencyName.toLowerCase()) settings.miningTool = "currency"
                        else {
                            const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.name.toLowerCase().includes(modalArgs.tool.toLowerCase()))
                            const itemID = filteredItems.some(e => e.name.toLowerCase() === modalArgs.tool.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() === modalArgs.tool.toLowerCase())?.itemID : filteredItems.first()?.itemID
                            if (!itemID) {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                interaction.followUp({ content: `${client.language({ textId: "Item with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.tool}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            } else settings.miningTool = itemID
                        }
                        if (+modalArgs.amount < 0) modalArgs.amount = 0
                        if (Number.isNaN(+modalArgs.amount)) {
                            if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                            interaction.followUp({ content: `**${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        } else settings.miningPrice = +modalArgs.amount
                        if (modalArgs.name) settings.miningName = modalArgs.name
                        else settings.miningName = undefined
                        if (modalArgs.url) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.url)
                            if (image) settings.miningIcon = modalArgs.url
                            else {
                                if (!interaction.deferred) await interaction.deferUpdate().catch(e => null)
                                interaction.followUp({ content: `${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.url}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                        } else settings.miningIcon = undefined
                        await settings.save()
                    }
                }
                const description = []
                if (settings.miningTool == "currency") {
                    description.push(`${client.language({ textId: "Tool", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.displayCurrencyEmoji}**${settings.currencyName}**\n${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: **${settings.miningPrice}**`)
                } else {
                    const item = client.cache.items.find(e => !e.temp && e.itemID === settings.miningTool)
                    if (item) {
                        description.push(`${client.language({ textId: "Tool", guildId: interaction.guildId, locale: interaction.locale })}: ${item.displayEmoji}**${item.name}**${!item.enabled ? ` (${client.language({ textId: "disabled", guildId: interaction.guildId, locale: interaction.locale })})` : ``}\n${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: **${settings.miningPrice}**`)    
                    } else {
                        description.push(`${client.language({ textId: "Tool", guildId: interaction.guildId, locale: interaction.locale })}: **${settings.miningTool}**\n${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}: **${settings.miningPrice}**`)    
                    }
                }
                if (settings.miningName) description.push(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.miningName}`)
                if (settings.miningIcon) description.push(`${client.language({ textId: "Icon", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.miningIcon}`)
                embed.setDescription(description.join("\n"))
                const edit_btn = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale })}`).setEmoji(client.config.emojis.edit).setCustomId(`cmd{manager-settings} title{mining} edit usr{${interaction.user.id}}`)
                const second_row = new ActionRowBuilder().addComponents([edit_btn])
                if (interaction.replied || interaction.deferred) return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row] })
                return interaction.update({ content: " ", embeds: [embed], components: [first_row, second_row] })
            }
            if (interaction.values?.[0].includes("seasonLevels") || interaction.customId.includes("seasonLevels")) {
                embed.setTitle(`${title.label}`)
                if (interaction.customId.includes("new season")) {
                    await Promise.all(client.cache.profiles.filter(e => e.guildID === interaction.guildId && (e.seasonLevel !== 1 || e.seasonXp !== 0 || e.seasonTotalXp !== 0)).map(async profile => {
                        profile.seasonLevel = 1
                        profile.seasonXp = 0
                        profile.seasonTotalXp = 0
                        await profile.save()
                    }))
                    settings.lastSeasonReset = new Date()
                    await settings.save()
                }
                if (interaction.customId.includes("levelfactor")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-settings_seasonLevels_levelfactor_${interaction.message.id}`)
                        .setTitle(`${client.language({ textId: "Level factor (Seasonal experience)", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Level factor", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setValue(`${settings.seasonLevelfactor}`)
                                        .setStyle(TextInputStyle.Short)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-settings_seasonLevels_levelfactor_${interaction.message.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        await interaction.deferUpdate()
                        let pass = true
                        if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
                            interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            pass = false
                        }
                        modalArgs.amount = +modalArgs.amount
                        if (modalArgs.amount < 10 || modalArgs.amount > 5000) {
                            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Level factor must not be", guildId: interaction.guildId, locale: interaction.locale })} < 10 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 5000`, flags: ["Ephemeral"] })
                            pass = false
                        }
                        if (pass) {
                            settings.seasonLevelfactor = modalArgs.amount
                            await settings.save().catch(e => console.error(e))
                            await Promise.all(client.cache.profiles.filter(e => e.guildID === interaction.guildId).map(async profile => {
                                profile.seasonLevel = 1
                                profile.seasonXp = profile.seasonTotalXp
                                let i = 0
                                while (profile.seasonXp >= profile.seasonLevel * settings.seasonLevelfactor + 100) {
                                    profile.seasonXp -= profile.seasonLevel * settings.seasonLevelfactor + 100
                                    profile.seasonLevel++
                                    i++
                                    if (i > 100000) throw new Error(`Бесконечный цикл: manager-settings:1269, profile.seasonXp: ${profile.seasonXp}, profile.seasonLevel: ${profile.seasonLevel}, settings.seasonLevelfactor: ${settings.seasonLevelfactor}`)
                                }
                                await profile.save()
                            }))
                        }
                    } else return
                }
                if (interaction.customId.includes("days")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-settings_seasonLevels_days_${interaction.message.id}`)
                        .setTitle(`${client.language({ textId: "Season days", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Days", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("amount")
                                        .setRequired(true)
                                        .setValue(`${settings.daysSeason}`)
                                        .setStyle(TextInputStyle.Short)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-settings_seasonLevels_days_${interaction.message.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        await interaction.deferUpdate()
                        let pass = true
                        if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
                            interaction.followUp({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            pass = false
                        }
                        modalArgs.amount = +modalArgs.amount
                        if (modalArgs.amount < 7 || modalArgs.amount > 365) {
                            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Days must not be", guildId: interaction.guildId, locale: interaction.locale })} < 7 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 365`, flags: ["Ephemeral"] })
                            pass = false
                        }
                        if (pass) {
                            settings.daysSeason = modalArgs.amount
                            await settings.save()
                        }
                    } else return
                }
                if (interaction.customId.includes("offon")) {
                    if (settings.seasonLevelsEnabled) settings.seasonLevelsEnabled = undefined
                    else settings.seasonLevelsEnabled = true
                    await settings.save()
                }
                if (interaction.customId.includes("{seasonLevels}settings")) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Not available in BETA version", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const description = [
                    `${client.language({ textId: "Level factor", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.seasonLevelfactor}`,
                    `${client.language({ textId: "Number of days in season", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.daysSeason}`,
                    `${client.language({ textId: "Previous reset", guildId: interaction.guildId, locale: interaction.locale })}: <t:${Math.floor(settings.lastSeasonReset / 1000)}:R>`,
                    `${client.language({ textId: "Next reset", guildId: interaction.guildId, locale: interaction.locale })}: <t:${Math.floor(settings.lastSeasonReset / 1000 + settings.daysSeason * 24 * 60 * 60)}:R>`
                ]
                embed.setDescription(description.join("\n"))
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setStyle(settings.seasonLevelsEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{seasonLevels}offon`)
                        .setLabel(settings.seasonLevelsEnabled ? `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setEmoji(settings.seasonLevelsEnabled ? client.config.emojis.off : client.config.emojis.on),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{seasonLevels}levelfactor`)
                        .setLabel(`${client.language({ textId: "Level factor", guildId: interaction.guildId, locale: interaction.locale })}`),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{seasonLevels}days`)
                        .setLabel(`${client.language({ textId: "Number of days", guildId: interaction.guildId, locale: interaction.locale })}`),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{seasonLevels}new season`)
                        .setLabel(`${client.language({ textId: "New season", guildId: interaction.guildId, locale: interaction.locale })}`),
                    // new ButtonBuilder()
                    //     .setStyle(ButtonStyle.Secondary)
                    //     .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{seasonLevels}settings`)
                    //     .setLabel(`${client.language({ textId: "Reset settings", guildId: interaction.guildId, locale: interaction.locale })}`)
                )
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [first_row, row] })
                else return interaction.update({ embeds: [embed], components: [first_row, row] })
            }
            if (interaction.values?.[0].includes("marketSettings") || interaction.customId.includes("marketSettings")) {
                embed.setTitle(`${title.label}`)
                if (interaction.customId.includes("channel")) {
                    const components = JSON.parse(JSON.stringify(interaction.message.components))
                    interaction.message.components.forEach(row => row.components.forEach(component => {
                        component.data.disabled = true
                    }))
                    await interaction.update({ components: interaction.message.components })
                    await interaction.followUp({ 
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ChannelSelectMenuBuilder()
                                        .setCustomId(`channel`)
                                        .setPlaceholder(`${client.language({ textId: "Select a channel", guildId: interaction.guildId, locale: interaction.locale })}...`)
                                        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.PrivateThread, ChannelType.PublicThread)
                                ),
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId("channelCancel")
                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger),
                                new ButtonBuilder()
                                    .setCustomId("channelDelete")
                                    .setLabel(client.language({ textId: "DELETE", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger),
                            
                            )
                        ],
                        flags: ["Ephemeral"]
                    })    
                    const filter = (i) => i.customId.includes(`channel`) && i.user.id === interaction.user.id
                    let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
                    if (interaction2 && interaction2.customId.includes("channel")) {
                        if (interaction2.customId === "channel") {
                            const channel = interaction2.channels.first()
                            if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages") || !channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory") || !channel.permissionsFor(interaction.guild.members.me).has("ViewChannel")) {
                                interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}> ${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Send messages", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            settings.channels.marketChannel = channel.id
                            await settings.save()
                            interaction2.update({ content: `${client.config.emojis.YES}`, components: [] })
                        } else if (interaction2.customId === "channelDelete") {
                            settings.channels.marketChannel = undefined
                            await settings.save()
                            interaction2.update({ content: `${client.config.emojis.YES}`, components: [] })
                        } else {
                            interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                            return interaction.editReply({ components: components })
                        }
                    } else return interaction.editReply({ components: components })
                }
                if (interaction.customId.includes("marketStorageLifeDays")) {
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-settings_marketSettings_storageLife_${interaction.message.id}`)
                        .setTitle(`${client.language({ textId: "Lot storage period", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Days", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("days")
                                        .setRequired(true)
                                        .setValue(`${settings.marketStorageLifeDays}`)
                                        .setStyle(TextInputStyle.Short)
                                        .setPlaceholder(`${client.language({ textId: `0 - unlimited`, guildId: interaction.guildId, locale: interaction.locale })}`)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-settings_marketSettings_storageLife_${interaction.message.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (isNaN(+modalArgs.days) || !Number.isInteger(+modalArgs.days)) {
                            return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.days}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        modalArgs.days = +modalArgs.days
                        if (modalArgs.days < 0 || modalArgs.days > 365) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number of days must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 365`, flags: ["Ephemeral"] })
                        }
                        settings.marketStorageLifeDays = modalArgs.days
                        await settings.save()
                    } else return
                }
                const description = [
                    `${client.language({ textId: "Channel for publishing lots", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.marketChannel ? `<#${interaction.guild.channels.cache.get(settings.channels.marketChannel)?.id}>` : `<${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}>`}`,
                    `${client.language({ textId: "Market lot storage period", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.marketStorageLifeDays ? `${settings.marketStorageLifeDays} ${client.language({ textId: "days", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Unlimited", guildId: interaction.guildId, locale: interaction.locale })}`}`
                ]
                embed.setDescription(description.join("\n"))
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{marketSettings}channel`)
                        .setLabel(`${client.language({ textId: "Channel for publishing lots", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setEmoji(client.config.emojis.numbersign),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{marketSettings}marketStorageLifeDays`)
                        .setLabel(`${client.language({ textId: "Market lot storage period", guildId: interaction.guildId, locale: interaction.locale })}`)
                )
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [first_row, row] })
                else return interaction.update({ embeds: [embed], components: [first_row, row] })
            }
            if (interaction.values?.[0].includes("boosters") || interaction.customId.includes("boosters")) {
                embed.setTitle(`${title.label}`)
                if (interaction.customId.includes("edit")) {
                    const value = interaction.values[0]
                    const modal = new ModalBuilder()
                        .setCustomId(`manager-settings_boosters_${value}_${interaction.id}`)
                        .setTitle(`${client.language({ textId: `${value}`, guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setLabelComponents([
                            new LabelBuilder()
                                .setLabel(`%`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("multiplier")
                                        .setValue(`${settings[value]?.multiplier ? settings[value].multiplier * 100 : 0}`)
                                        .setStyle(TextInputStyle.Short)
                                        .setMaxLength(4)
                                ),
                            new LabelBuilder()
                                .setLabel(`${client.language({ textId: "Minutes", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setTextInputComponent(
                                    new TextInputBuilder()
                                        .setCustomId("until")
                                        .setValue(`${settings[value]?.until && settings[value]?.until - new Date() > 0 ? Math.floor((settings[value].until - new Date())/1000/60) : " "}`)
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(false)
                                        .setMaxLength(10)
                                )
                        ])
                    await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                    const filter = (i) => i.customId === `manager-settings_boosters_${value}_${interaction.id}` && i.user.id === interaction.user.id
                    interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                    if (interaction && interaction.type === InteractionType.ModalSubmit) {
                        const modalArgs = {}
                        interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                        if (isNaN(+modalArgs.multiplier) || !Number.isInteger(+modalArgs.multiplier)) {
                            return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.multiplier}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        if (isNaN(+modalArgs.until) || !Number.isInteger(+modalArgs.until)) {
                            return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.until}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        modalArgs.multiplier = +modalArgs.multiplier
                        if (modalArgs.multiplier !== 0) modalArgs.multiplier = modalArgs.multiplier / 100
                        if (modalArgs.until) {
                            modalArgs.until = +modalArgs.until
                        }
                        if (!modalArgs.until || modalArgs.until <= 0) modalArgs.until = undefined
                        else modalArgs.until = new Date(Date.now() + modalArgs.until * 60 * 1000)
                        if (value !== "luck_booster" && modalArgs.multiplier < 0) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0`, flags: ["Ephemeral"] })
                        }
                        if (!settings[value]) settings[value] = {
                            multiplier: 0
                        }
                        settings[value].multiplier = modalArgs.multiplier
                        settings[value].until = modalArgs.until
                        await settings.save()
                    } else return
                }
                if (interaction.customId.includes("mode")) {
                    settings.global_boosters_stacking = !settings.global_boosters_stacking
                    await settings.save()
                }
                embed.setDescription([
                    `${client.language({ textId: "Booster stacking mode", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.global_boosters_stacking ? `${client.language({ textId: "Boosters stack", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Boosters do not stack, the highest booster is selected (profile booster, global booster, channel booster)", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `${client.config.emojis.XP}${client.language({ textId: "Global experience booster", guildId: interaction.guildId, locale: interaction.locale })}: ${(!settings.xp_booster) || (settings.xp_booster.until && settings.xp_booster.until < new Date()) || (!settings.xp_booster.multiplier) ? `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}` : `${settings.xp_booster.multiplier * 100}% ${client.language({ textId: "for all users", guildId: interaction.guildId, locale: interaction.locale })} ${settings.xp_booster.until ? `${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(settings.xp_booster.until/1000)}:f>` : ""}`}`,
                    `${client.config.emojis.random}${client.language({ textId: "Global luck booster", guildId: interaction.guildId, locale: interaction.locale })}: ${(!settings.luck_booster) || (settings.luck_booster.until && settings.luck_booster.until < new Date()) || (!settings.luck_booster.multiplier) ? `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}` : `${settings.luck_booster.multiplier * 100}% ${client.language({ textId: "for all users", guildId: interaction.guildId, locale: interaction.locale })} ${settings.luck_booster.until ? `${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(settings.luck_booster.until/1000)}:f>` : ""}`}`,
                    `${settings.displayCurrencyEmoji}${client.language({ textId: "Global currency booster", guildId: interaction.guildId, locale: interaction.locale })}: ${(!settings.cur_booster) || (settings.cur_booster.until && settings.cur_booster.until < new Date()) || (!settings.cur_booster.multiplier) ? `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}` : `${settings.cur_booster.multiplier * 100}% ${client.language({ textId: "for all users", guildId: interaction.guildId, locale: interaction.locale })} ${settings.cur_booster.until ? `${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(settings.cur_booster.until/1000)}:f>` : ""}`}`,
                    `${client.config.emojis.RP}${client.language({ textId: "Global reputation booster", guildId: interaction.guildId, locale: interaction.locale })}: ${(!settings.rp_booster) || (settings.rp_booster.until && settings.rp_booster.until < new Date()) || (!settings.rp_booster.multiplier) ? `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}` : `${settings.rp_booster.multiplier * 100}% ${client.language({ textId: "for all users", guildId: interaction.guildId, locale: interaction.locale })} ${settings.rp_booster.until ? `${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(settings.rp_booster.until/1000)}:f>` : ""}`}`
                ].join("\n"))
                const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{boosters} edit usr{${interaction.user.id}}`).addOptions([
                    {
                        label: `${client.language({ textId: "Experience booster", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Set experience booster for all users", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `xp_booster`,
                        emoji: client.config.emojis.XP
                    },
                    {
                        label: `${client.language({ textId: "Luck booster", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Set luck booster for all users", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `luck_booster`,
                        emoji: client.config.emojis.random
                    },
                    {
                        label: `${client.language({ textId: "Currency booster", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Set currency booster for all users", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `cur_booster`,
                        emoji: settings.displayCurrencyEmoji
                    },
                    {
                        label: `${client.language({ textId: "Reputation booster", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Set reputation booster for all users", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `rp_booster`,
                        emoji: client.config.emojis.RP
                    },
                ])])
                const third_row = new ActionRowBuilder().addComponents([new ButtonBuilder().setCustomId(`cmd{manager-settings} title{boosters} mode usr{${interaction.user.id}}`).setLabel(`${client.language({ textId: "Toggle booster stacking mode", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Primary)])
                return interaction.update({ embeds: [embed], components: [first_row, second_row, third_row]})
            }
            if (interaction.values?.[0].includes("auctions") || interaction.customId.includes("auctions")) {
                embed.setTitle(`${title.label}`)
                if (interaction.isStringSelectMenu()) {
                    if (interaction.values[0] === "channel") {
                        const components = JSON.parse(JSON.stringify(interaction.message.components))
                        interaction.message.components.forEach(row => row.components.forEach(component => {
                            component.data.disabled = true
                        }))
                        await interaction.update({ components: interaction.message.components })
                        await interaction.followUp({ 
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ChannelSelectMenuBuilder()
                                            .setCustomId(`channel`)
                                            .setPlaceholder(`${client.language({ textId: "Select a channel", guildId: interaction.guildId, locale: interaction.locale })}...`)
                                            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.PrivateThread, ChannelType.PublicThread)
                                    ),
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId("channelCancel")
                                        .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                        .setStyle(ButtonStyle.Danger),
                                    new ButtonBuilder()
                                        .setCustomId("channelDelete")
                                        .setLabel(client.language({ textId: "DELETE", guildId: interaction.guildId, locale: interaction.locale }))
                                        .setStyle(ButtonStyle.Danger),
                                )
                            ],
                            flags: ["Ephemeral"]
                        })    
                        const filter = (i) => i.customId.includes(`channel`) && i.user.id === interaction.user.id
                        let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => interaction)
                        if (interaction2 && interaction2.customId.includes("channel")) {
                            if (interaction2.customId === "channel") {
                                const channel = interaction2.channels.first()
                                if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages") || !channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory") || !channel.permissionsFor(interaction.guild.members.me).has("ViewChannel")) {
                                    interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}> ${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Send messages", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                    return interaction.editReply({ components: components })
                                }
                                settings.channels.auctionsChannelId = channel.id
                                await settings.save()
                                interaction2.update({ content: `${client.config.emojis.YES}`, components: [] })
                            } else if (interaction2.customId === "channelDelete") {
                                settings.channels.auctionsChannelId = undefined
                                await settings.save()
                                interaction2.update({ content: `${client.config.emojis.YES}`, components: [] })
                            } else {
                                interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                        } else return interaction.editReply({ components: components })
                    } else if (interaction.values[0] === "permission") {
                        if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        const modal = new ModalBuilder()
                            .setCustomId(`permission_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("name")
                                            .setRequired(false)
                                            .setValue(`${client.cache.permissions.find(e => e.id === settings.auctions_permission)?.name || ""}`)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `permission_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.name) {
                                settings.auctions_permission = undefined
                                await settings.save()
                            } else {
                                const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
                                if (!permission) {
                                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
                                } else {
                                    settings.auctions_permission = permission.id
                                    await settings.save()
                                }
                            }
                        } else return
                    }    
                }
                embed.setDescription([
                    `${client.language({ textId: "Channel for publishing auctions", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.auctionsChannelId ? `<#${interaction.guild.channels.cache.get(settings.channels.auctionsChannelId)?.id}>` : `<${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}>`}`,
                    `${client.language({ textId: "Permission for creating auctions", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.auctions_permission ? `${client.cache.permissions.get(settings.auctions_permission)?.name || `<${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}>`}` : `<${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}>` }`
                ].join("\n"))
                const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{auctions} edit usr{${interaction.user.id}}`).addOptions([
                    {
                        label: `${client.language({ textId: "Channel for auctions", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Set auction channel", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `channel`,
                        emoji: undefined
                    },
                    {
                        label: `${client.language({ textId: "Permission for creating auctions", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Set permission for creating auctions", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `permission`,
                        emoji: undefined
                    }
                ])])
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [first_row, second_row]})
                else return interaction.update({ embeds: [embed], components: [first_row, second_row]})
            }
            if (interaction.values?.[0].includes("userControlPanel") || interaction.customId.includes("userControlPanel")) {
                embed.setTitle(`${client.language({ textId: "User Control Panel", guildId: interaction.guildId, locale: interaction.locale })}`)
                
                // Handle button selection from the select menu
                if (interaction.customId.includes("ucpButtonSelect") && interaction.isStringSelectMenu()) {
                    settings.channels.userControlPanelButtons = interaction.values
                    await settings.save()
                }
                
                if (interaction.customId.includes("selectChannel") && !interaction.customId.includes("ucpMsgType")) {
                    const components = JSON.parse(JSON.stringify(interaction.message.components))
                    interaction.message.components.forEach(row => row.components.forEach(component => {
                        component.data.disabled = true
                    }))
                    await interaction.update({ components: interaction.message.components })
                    
                    // Get selected buttons or use defaults
                    const selectedButtons = settings.channels.userControlPanelButtons?.length > 0 
                        ? settings.channels.userControlPanelButtons 
                        : ['profile', 'achievements', 'rank', 'rank-set', 'inventory', 'daily', 'quests', 'shop']
                    
                    if (selectedButtons.length === 0) {
                        await interaction.followUp({ 
                            content: `${client.config.emojis.NO} ${client.language({ textId: "Select at least one button for the panel", guildId: interaction.guildId, locale: interaction.locale })}`,
                            flags: ["Ephemeral"]
                        })
                        return interaction.editReply({ components: components })
                    }
                    
                    // Step 1: Show message type selection
                    const msgTypeEmbed = new EmbedBuilder()
                        .setTitle(`${client.language({ textId: "Select message type", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setDescription([
                            `${client.config.emojis.gear} **${client.language({ textId: "Default Message", guildId: interaction.guildId, locale: interaction.locale })}**`,
                            `${client.language({ textId: "Panel will be sent with the standard message", guildId: interaction.guildId, locale: interaction.locale })}`,
                            ``,
                            `${client.config.emojis.brush} **${client.language({ textId: "Custom Message", guildId: interaction.guildId, locale: interaction.locale })}**`,
                            `${client.language({ textId: "Provide a message link to copy", guildId: interaction.guildId, locale: interaction.locale })}`,
                            ``,
                            `${client.config.emojis.NO} **${client.language({ textId: "Without Message", guildId: interaction.guildId, locale: interaction.locale })}**`,
                            `${client.language({ textId: "Only buttons without message", guildId: interaction.guildId, locale: interaction.locale })}`
                        ].join("\n"))
                        .setColor(3093046)
                    
                    // Generate unique ID for this session
                    const msgTypeSessionId = `${interaction.user.id}_${Date.now()}`
                    
                    const msgTypeRow = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`ucpMsgType_${msgTypeSessionId}`)
                            .setPlaceholder(`${client.language({ textId: "Select message type", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setOptions([
                                { label: client.language({ textId: "Default Message", guildId: interaction.guildId, locale: interaction.locale }), value: 'default', emoji: client.config.emojis.gear },
                                { label: client.language({ textId: "Custom Message", guildId: interaction.guildId, locale: interaction.locale }), value: 'custom', emoji: client.config.emojis.brush },
                                { label: client.language({ textId: "Without Message", guildId: interaction.guildId, locale: interaction.locale }), value: 'none', emoji: client.config.emojis.NO }
                            ])
                    )
                    
                    const cancelRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ucpMsgCancel_${msgTypeSessionId}`)
                            .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                            .setStyle(ButtonStyle.Danger)
                    )
                    
                    await interaction.followUp({ 
                        embeds: [msgTypeEmbed],
                        components: [msgTypeRow, cancelRow],
                        flags: ["Ephemeral"]
                    })
                    
                    // Wait for message type selection
                    const msgTypeFilter = (i) => i.customId.includes(msgTypeSessionId) && i.user.id === interaction.user.id
                    let msgTypeInteraction = await interaction.channel.awaitMessageComponent({ filter: msgTypeFilter, time: 60000 }).catch(e => null)
                    
                    if (!msgTypeInteraction || msgTypeInteraction.customId.startsWith('ucpMsgCancel_')) {
                        if (msgTypeInteraction) {
                            msgTypeInteraction.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
                        }
                        return interaction.editReply({ components: components })
                    }
                    
                    const messageType = msgTypeInteraction.values[0]
                    let customMessageData = null
                    
                    // Step 2: If custom message, show modal for message link
                    if (messageType === 'custom') {
                        const modal = new ModalBuilder()
                            .setCustomId(`ucpCustomMsg_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Custom Message", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId("messageLink")
                                        .setLabel(`${client.language({ textId: "Message Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                                        .setPlaceholder("https://discord.com/channels/...")
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            )
                        
                        await msgTypeInteraction.showModal(modal)
                        delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        
                        const modalFilter = (i) => i.customId === `ucpCustomMsg_${interaction.id}` && i.user.id === interaction.user.id
                        const modalInteraction = await interaction.awaitModalSubmit({ filter: modalFilter, time: 120000 }).catch(e => null)
                        
                        if (!modalInteraction) {
                            return interaction.editReply({ components: components })
                        }
                        
                        const messageLink = modalInteraction.fields.getTextInputValue("messageLink")
                        
                        // Parse message link: https://discord.com/channels/guildId/channelId/messageId
                        const linkRegex = /https:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/
                        const match = messageLink.match(linkRegex)
                        
                        if (!match) {
                            await modalInteraction.reply({ 
                                content: `${client.config.emojis.NO} ${client.language({ textId: "Invalid message link", guildId: interaction.guildId, locale: interaction.locale })}`,
                                flags: ["Ephemeral"]
                            })
                            return interaction.editReply({ components: components })
                        }
                        
                        const [, linkGuildId, linkChannelId, linkMessageId] = match
                        
                        // Fetch the message
                        try {
                            const sourceChannel = await client.channels.fetch(linkChannelId).catch(() => null)
                            if (!sourceChannel) {
                                await modalInteraction.reply({ 
                                    content: `${client.config.emojis.NO} ${client.language({ textId: "Channel not found", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    flags: ["Ephemeral"]
                                })
                                return interaction.editReply({ components: components })
                            }
                            
                            const sourceMessage = await sourceChannel.messages.fetch(linkMessageId).catch(() => null)
                            if (!sourceMessage) {
                                await modalInteraction.reply({ 
                                    content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    flags: ["Ephemeral"]
                                })
                                return interaction.editReply({ components: components })
                            }
                            
                            // Store message data for later use
                            customMessageData = {
                                content: sourceMessage.content || null,
                                embeds: sourceMessage.embeds.length > 0 ? sourceMessage.embeds.map(e => EmbedBuilder.from(e)) : []
                            }
                            
                            // Update the ephemeral message to show channel selection
                            msgTypeInteraction = modalInteraction
                        } catch (e) {
                            await modalInteraction.reply({ 
                                content: `${client.config.emojis.NO} ${client.language({ textId: "Error fetching message", guildId: interaction.guildId, locale: interaction.locale })}`,
                                flags: ["Ephemeral"]
                            })
                            return interaction.editReply({ components: components })
                        }
                    }
                    
                    // Step 3: Show channel selection
                    const channelSelectEmbed = new EmbedBuilder()
                        .setTitle(`${client.language({ textId: "Select channels", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setDescription([
                            `${client.language({ textId: "Message type", guildId: interaction.guildId, locale: interaction.locale })}: **${messageType === 'default' ? client.language({ textId: "Default Message", guildId: interaction.guildId, locale: interaction.locale }) : messageType === 'custom' ? client.language({ textId: "Custom Message", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "Without Message", guildId: interaction.guildId, locale: interaction.locale })}**`,
                            ``,
                            `${client.language({ textId: "Select channels to send the panel", guildId: interaction.guildId, locale: interaction.locale })}`
                        ].join("\n"))
                        .setColor(3093046)
                    
                    const channelSelectComponents = [
                        new ActionRowBuilder()
                            .addComponents(
                                new ChannelSelectMenuBuilder()
                                    .setCustomId(`ucpChannel`)
                                    .setPlaceholder(`${client.language({ textId: "Select a channel", guildId: interaction.guildId, locale: interaction.locale })}...`)
                                    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.PrivateThread, ChannelType.PublicThread, ChannelType.GuildStageVoice)
                                    .setMaxValues(25)
                                    .setMinValues(1)
                            ),
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("ucpChannelCancel")
                                .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                .setStyle(ButtonStyle.Danger)
                        )
                    ]
                    
                    if (messageType === 'custom' && msgTypeInteraction.type === InteractionType.ModalSubmit) {
                        await msgTypeInteraction.reply({ 
                            embeds: [channelSelectEmbed],
                            components: channelSelectComponents,
                            flags: ["Ephemeral"]
                        })
                    } else {
                        await msgTypeInteraction.update({ 
                            embeds: [channelSelectEmbed],
                            components: channelSelectComponents
                        })
                    }    
                    const filter = (i) => i.customId.includes(`ucpChannel`) && i.user.id === interaction.user.id
                    let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
                    if (interaction2 && interaction2.customId.includes("ucpChannel")) {
                        if (interaction2.customId === "ucpChannel") {
                            const channels = interaction2.channels
                            
                            // Initialize array if not exists
                            if (!settings.channels.userControlPanelMessages) {
                                settings.channels.userControlPanelMessages = []
                            }
                            
                            // Send success message immediately
                            let responseMessage = `${client.config.emojis.YES} ${client.language({ textId: "Control panel sent to channel", guildId: interaction.guildId, locale: interaction.locale })}: ${channels.map(c => `<#${c.id}>`).join(", ")}`
                            await interaction2.update({ content: responseMessage, components: [] })
                            
                            // Update the main embed immediately with expected panel count
                            const expectedPanelCount = (settings.channels.userControlPanelMessages?.length || 0) + channels.size
                            const expectedChannels = [...(settings.channels.userControlPanelMessages || []).map(p => `<#${p.channelId}>`), ...channels.map(c => `<#${c.id}>`)]
                            
                            const updatedEmbed = new EmbedBuilder()
                                .setAuthor({ name: `${client.language({ textId: "SETTINGS", guildId: interaction.guildId, locale: interaction.locale })}` })
                                .setColor(3093046)
                                .setTitle(client.language({ textId: "User Control Panel", guildId: interaction.guildId, locale: interaction.locale }))
                                .setDescription([
                                    `${client.language({ textId: "The control panel allows users to quickly access main commands via buttons", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    ``,
                                    `${client.language({ textId: "Panel Channels", guildId: interaction.guildId, locale: interaction.locale })}: ${expectedChannels.join(", ")}`,
                                    `${client.language({ textId: "Number of panels", guildId: interaction.guildId, locale: interaction.locale })}: ${expectedPanelCount}`,
                                    ``,
                                    `${client.language({ textId: "Selected buttons", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.userControlPanelButtons?.length > 0 ? settings.channels.userControlPanelButtons.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(", ") : client.language({ textId: "All", guildId: interaction.guildId, locale: interaction.locale })}`
                                ].join("\n"))
                            
                            // Re-enable components immediately
                            interaction.editReply({ embeds: [updatedEmbed], components: components }).catch(() => null)
                            
                            // Button definitions
                            const buttonDefs = {
                                'profile': { customId: 'ucp{profile}', label: 'Profile', emoji: client.config.emojis.profile, desc: `${client.config.emojis.profile} **Profile** - ${client.language({ textId: "personal stats, achievements, social links", guildId: interaction.guildId, locale: interaction.locale })}` },
                                'achievements': { customId: 'ucp{achievements}', label: 'Achievements', emoji: client.config.emojis.achievements, desc: `${client.config.emojis.achievements} **Achievements** - ${client.language({ textId: "server achievements, progress tracking", guildId: interaction.guildId, locale: interaction.locale })}` },
                                'rank': { customId: 'ucp{rank}', label: 'Rank', emoji: client.config.emojis.top, desc: `${client.config.emojis.top} **Rank** - ${client.language({ textId: "your profile rank card on this server", guildId: interaction.guildId, locale: interaction.locale })}` },
                                'rank-set': { customId: 'ucp{rank-set}', label: 'Rank Set', emoji: client.config.emojis.gear, desc: `${client.config.emojis.gear} **Rank Set** - ${client.language({ textId: "rank card settings", guildId: interaction.guildId, locale: interaction.locale })}` },
                                'inventory': { customId: 'ucp{inventory}', label: 'Inventory', emoji: client.config.emojis.box, desc: `${client.config.emojis.box} **Inventory** - ${client.language({ textId: "items you have", guildId: interaction.guildId, locale: interaction.locale })}` },
                                'daily': { customId: 'ucp{daily}', label: 'Daily', emoji: client.config.emojis.giveaway, desc: `${client.config.emojis.giveaway} **Daily** - ${client.language({ textId: "daily rewards", guildId: interaction.guildId, locale: interaction.locale })}` },
                                'quests': { customId: 'ucp{quests}', label: 'Quests', emoji: client.config.emojis.scroll, desc: `${client.config.emojis.scroll} **Quests** - ${client.language({ textId: "server quests", guildId: interaction.guildId, locale: interaction.locale })}` },
                                'shop': { customId: 'ucp{shop}', label: 'Shop', emoji: client.config.emojis.shop, desc: `${client.config.emojis.shop} **Shop** - ${client.language({ textId: "server shop", guildId: interaction.guildId, locale: interaction.locale })}` }
                            }
                            
                            // Send panels in background
                            const successChannels = []
                            for (const [channelId, channel] of channels) {
                                if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages") || !channel.permissionsFor(interaction.guild.members.me).has("ViewChannel")) {
                                    continue
                                }
                                
                                // Build buttons based on selected options
                                const buttons = selectedButtons.map(btn => {
                                    const def = buttonDefs[btn]
                                    if (!def) return null
                                    return new ButtonBuilder()
                                        .setCustomId(def.customId)
                                        .setLabel(def.label)
                                        .setStyle(ButtonStyle.Primary)
                                        .setEmoji(def.emoji)
                                }).filter(Boolean)
                                
                                // Split buttons into rows (max 5 per row)
                                const buttonRows = []
                                for (let i = 0; i < buttons.length; i += 5) {
                                    buttonRows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)))
                                }
                                
                                try {
                                    let sentMessage
                                    
                                    if (messageType === 'none') {
                                        // Without Message - send only buttons
                                        sentMessage = await channel.send({ components: buttonRows })
                                    } else if (messageType === 'custom' && customMessageData) {
                                        // Custom Message - use the fetched message content/embeds
                                        const sendOptions = { components: buttonRows }
                                        if (customMessageData.content) {
                                            sendOptions.content = customMessageData.content
                                        }
                                        if (customMessageData.embeds && customMessageData.embeds.length > 0) {
                                            sendOptions.embeds = customMessageData.embeds
                                        }
                                        sentMessage = await channel.send(sendOptions)
                                    } else {
                                        // Default Message - use the standard panel embed
                                        const descLines = selectedButtons.map(btn => buttonDefs[btn]?.desc).filter(Boolean)
                                        const panelEmbed = new EmbedBuilder()
                                            .setTitle(`${client.language({ textId: "Control Panel", guildId: interaction.guildId, locale: interaction.locale })}`)
                                            .setDescription(descLines.join("\n"))
                                            .setColor(3093046)
                                        sentMessage = await channel.send({ embeds: [panelEmbed], components: buttonRows })
                                    }
                                    
                                    settings.channels.userControlPanelMessages.push({
                                        channelId: channel.id,
                                        messageId: sentMessage.id
                                    })
                                    successChannels.push(channel)
                                } catch (e) {
                                    // Silently ignore send errors
                                }
                            }
                            
                            // Update the single channel reference for backwards compatibility
                            if (successChannels.length > 0) {
                                settings.channels.userControlPanelChannel = successChannels[0].id
                            }
                            await settings.save()
                        } else {
                            interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                            return interaction.editReply({ components: components })
                        }
                    } else return interaction.editReply({ components: components })
                }
                if (interaction.customId.includes("deletePanel")) {
                    const components = JSON.parse(JSON.stringify(interaction.message.components))
                    interaction.message.components.forEach(row => row.components.forEach(component => {
                        component.data.disabled = true
                    }))
                    await interaction.update({ components: interaction.message.components })
                    
                    // Check if there are any panels to delete
                    const panelMessages = settings.channels.userControlPanelMessages || []
                    if (panelMessages.length === 0 && !settings.channels.userControlPanelChannel) {
                        await interaction.followUp({ 
                            content: `${client.config.emojis.NO} ${client.language({ textId: "Panel not found", guildId: interaction.guildId, locale: interaction.locale })}`,
                            flags: ["Ephemeral"]
                        })
                        return interaction.editReply({ components: components })
                    }
                    
                    // Helper function to format button names for display
                    const formatButtonDescription = (buttons) => {
                        const buttonLabels = {
                            'profile': 'Profile',
                            'achievements': 'Achievements',
                            'rank': 'Rank',
                            'rank-set': 'Rank Set',
                            'inventory': 'Inventory',
                            'daily': 'Daily',
                            'quests': 'Quests',
                            'shop': 'Shop'
                        }
                        const names = buttons.map(b => buttonLabels[b] || b.charAt(0).toUpperCase() + b.slice(1)).join(', ')
                        if (names.length > 97) {
                            return names.slice(0, 97) + '...'
                        }
                        return names
                    }
                    
                    // Get configured buttons or use defaults
                    const configuredButtons = settings.channels.userControlPanelButtons?.length > 0 
                        ? settings.channels.userControlPanelButtons 
                        : ['profile', 'achievements', 'rank', 'inventory', 'daily', 'quests', 'shop']
                    
                    // Build select menu options for each panel - use index to make values unique
                    const channelOptions = panelMessages.map((p, index) => ({
                        label: `#${interaction.guild.channels.cache.get(p.channelId)?.name || p.channelId}`,
                        value: `${index}_${p.channelId}_${p.messageId}`,
                        description: formatButtonDescription(configuredButtons)
                    }))
                    
                    // Add "Delete All" option
                    channelOptions.unshift({
                        label: client.language({ textId: "Delete all", guildId: interaction.guildId, locale: interaction.locale }),
                        value: 'delete_all',
                        description: client.language({ textId: "Delete all panels", guildId: interaction.guildId, locale: interaction.locale }),
                        emoji: client.config.emojis.NO
                    })
                    
                    // Build the list of channels with panels for description
                    const channelsList = panelMessages.map(p => `<#${p.channelId}>`).join("\n")
                    
                    const deleteMsg = await interaction.followUp({ 
                        content: `${client.config.emojis.exc} ${client.language({ textId: "Select panels to delete", guildId: interaction.guildId, locale: interaction.locale })}\n\n${client.language({ textId: "Panels in channels", guildId: interaction.guildId, locale: interaction.locale })}:\n${channelsList}`,
                        components: [
                            new ActionRowBuilder().addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`ucpDelSel`)
                                    .setPlaceholder(client.language({ textId: "Select channels to delete", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setMinValues(1)
                                    .setMaxValues(channelOptions.length)
                                    .setOptions(channelOptions.slice(0, 25))
                            ),
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`ucpDelDone`)
                                    .setLabel(client.language({ textId: "Done", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId(`ucpDelCancel`)
                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Secondary)
                            )
                        ],
                        flags: ["Ephemeral"]
                    })
                    
                    let selectedChannelsToDelete = []
                    let continueLoop = true
                    
                    while (continueLoop) {
                        const filter = (i) => (i.customId === 'ucpDelSel' || i.customId === 'ucpDelDone' || i.customId === 'ucpDelCancel') && i.user.id === interaction.user.id
                        const interaction2 = await deleteMsg.awaitMessageComponent({ filter, time: 60000 }).catch(() => null)
                        
                        if (!interaction2) {
                            // Timeout
                            continueLoop = false
                            interaction.editReply({ components: components }).catch(() => null)
                            break
                        }
                        
                        if (interaction2.customId === "ucpDelSel") {
                            selectedChannelsToDelete = interaction2.values
                            await interaction2.deferUpdate()
                        } else if (interaction2.customId === "ucpDelDone") {
                            continueLoop = false
                            
                            if (selectedChannelsToDelete.length === 0) {
                                await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Select at least one channel", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                interaction.editReply({ components: components }).catch(() => null)
                                break
                            }
                            
                            const deleteAll = selectedChannelsToDelete.includes('delete_all')
                            
                            // Parse selected values to get messageIds (format: index_channelId_messageId)
                            const selectedMessageIds = selectedChannelsToDelete
                                .filter(v => v !== 'delete_all')
                                .map(v => v.split('_')[2])
                            
                            const channelsToProcess = deleteAll ? panelMessages : panelMessages.filter(p => selectedMessageIds.includes(p.messageId))
                            
                            // Update stored data first - remove deleted panels
                            if (deleteAll) {
                                settings.channels.userControlPanelMessages = []
                                settings.channels.userControlPanelChannel = undefined
                            } else {
                                settings.channels.userControlPanelMessages = panelMessages.filter(p => !selectedMessageIds.includes(p.messageId))
                                if (settings.channels.userControlPanelMessages.length > 0) {
                                    settings.channels.userControlPanelChannel = settings.channels.userControlPanelMessages[0].channelId
                                } else {
                                    settings.channels.userControlPanelChannel = undefined
                                }
                            }
                            await settings.save()
                            
                            // Send success message immediately
                            let responseMessage = `${client.config.emojis.YES} ${client.language({ textId: "Control panel deleted", guildId: interaction.guildId, locale: interaction.locale })}`
                            responseMessage += `\n${client.language({ textId: "Deleted from", guildId: interaction.guildId, locale: interaction.locale })}: ${channelsToProcess.map(c => `<#${c.channelId}>`).join(", ")}`
                            
                            await interaction2.update({ content: responseMessage, components: [] })
                            
                            // Update the main embed with new panel count
                            const updatedEmbed = new EmbedBuilder()
                                .setAuthor({ name: `${client.language({ textId: "SETTINGS", guildId: interaction.guildId, locale: interaction.locale })}` })
                                .setColor(3093046)
                                .setTitle(client.language({ textId: "User Control Panel", guildId: interaction.guildId, locale: interaction.locale }))
                                .setDescription([
                                    `${client.language({ textId: "The control panel allows users to quickly access main commands via buttons", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    ``,
                                    `${client.language({ textId: "Panel Channels", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.userControlPanelMessages?.length > 0 ? settings.channels.userControlPanelMessages.map(p => `<#${p.channelId}>`).join(", ") : `<${client.language({ textId: "Not configured", guildId: interaction.guildId, locale: interaction.locale })}>`}`,
                                    `${client.language({ textId: "Number of panels", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.userControlPanelMessages?.length || 0}`,
                                    ``,
                                    `${client.language({ textId: "Selected buttons", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.userControlPanelButtons?.length > 0 ? settings.channels.userControlPanelButtons.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(", ") : client.language({ textId: "All", guildId: interaction.guildId, locale: interaction.locale })}`
                                ].join("\n"))
                            
                            // Re-enable components and update the main message
                            interaction.editReply({ embeds: [updatedEmbed], components: components }).catch(() => null)
                            
                            // Delete panel messages in background (don't await)
                            for (const panelMsg of channelsToProcess) {
                                try {
                                    let channel = await interaction.guild.channels.fetch(panelMsg.channelId).catch(() => null)
                                    if (!channel) {
                                        const allChannels = await interaction.guild.channels.fetch()
                                        for (const [, ch] of allChannels) {
                                            if (ch.threads) {
                                                const thread = await ch.threads.fetch(panelMsg.channelId).catch(() => null)
                                                if (thread) {
                                                    channel = thread
                                                    break
                                                }
                                            }
                                        }
                                    }
                                    if (channel) {
                                        const message = await channel.messages.fetch(panelMsg.messageId).catch(() => null)
                                        if (message) {
                                            await message.delete().catch(() => null)
                                        }
                                    }
                                } catch (e) {
                                    // Silently ignore deletion errors
                                }
                            }
                        } else if (interaction2.customId === "ucpDelCancel") {
                            continueLoop = false
                            await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                            // Re-enable components on cancel
                            interaction.editReply({ components: components }).catch(() => null)
                        }
                    }
                    
                    return
                }
                embed.setDescription([
                    `${client.language({ textId: "The control panel allows users to quickly access main commands via buttons", guildId: interaction.guildId, locale: interaction.locale })}`,
                    ``,
                    `${client.language({ textId: "Panel Channels", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.userControlPanelMessages?.length > 0 ? settings.channels.userControlPanelMessages.map(p => `<#${p.channelId}>`).join(", ") : `<${client.language({ textId: "Not configured", guildId: interaction.guildId, locale: interaction.locale })}>`}`,
                    `${client.language({ textId: "Number of panels", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.userControlPanelMessages?.length || 0}`,
                    ``,
                    `${client.language({ textId: "Selected buttons", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels.userControlPanelButtons?.length > 0 ? settings.channels.userControlPanelButtons.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(", ") : client.language({ textId: "All", guildId: interaction.guildId, locale: interaction.locale })}`
                ].join("\n"))
                
                // Select menu for choosing panel buttons
                const buttonSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{userControlPanel}ucpButtonSelect`)
                    .setPlaceholder(`${client.language({ textId: "Select panel buttons", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setMinValues(1)
                    .setMaxValues(8)
                    .setOptions([
                        { label: 'Profile', value: 'profile', emoji: client.config.emojis.profile, default: settings.channels.userControlPanelButtons?.includes('profile') || !settings.channels.userControlPanelButtons?.length },
                        { label: 'Achievements', value: 'achievements', emoji: client.config.emojis.achievements, default: settings.channels.userControlPanelButtons?.includes('achievements') || !settings.channels.userControlPanelButtons?.length },
                        { label: 'Rank', value: 'rank', emoji: client.config.emojis.top, default: settings.channels.userControlPanelButtons?.includes('rank') || !settings.channels.userControlPanelButtons?.length },
                        { label: 'Rank Set', value: 'rank-set', emoji: client.config.emojis.gear, default: settings.channels.userControlPanelButtons?.includes('rank-set') || !settings.channels.userControlPanelButtons?.length },
                        { label: 'Inventory', value: 'inventory', emoji: client.config.emojis.box, default: settings.channels.userControlPanelButtons?.includes('inventory') || !settings.channels.userControlPanelButtons?.length },
                        { label: 'Daily', value: 'daily', emoji: client.config.emojis.giveaway, default: settings.channels.userControlPanelButtons?.includes('daily') || !settings.channels.userControlPanelButtons?.length },
                        { label: 'Quests', value: 'quests', emoji: client.config.emojis.scroll, default: settings.channels.userControlPanelButtons?.includes('quests') || !settings.channels.userControlPanelButtons?.length },
                        { label: 'Shop', value: 'shop', emoji: client.config.emojis.shop, default: settings.channels.userControlPanelButtons?.includes('shop') || !settings.channels.userControlPanelButtons?.length }
                    ])
                
                const second_row = new ActionRowBuilder().addComponents(buttonSelectMenu)
                const third_row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{userControlPanel}selectChannel`)
                        .setLabel(`${client.language({ textId: "Send Panel", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setEmoji(client.config.emojis.numbersign),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId(`cmd{manager-settings}usr{${interaction.user.id}}title{userControlPanel}deletePanel`)
                        .setLabel(`${client.language({ textId: "Delete Panel", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setEmoji(client.config.emojis.NO)
                )
                if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [first_row, second_row, third_row]})
                else return interaction.update({ embeds: [embed], components: [first_row, second_row, third_row]})
            }
            if (interaction.values?.[0].includes("currency") || interaction.customId.includes("currency")) {
                embed.setTitle(title.label)
                if (interaction.isStringSelectMenu()) {
                    if (interaction.values[0] === "currency_name_description") {
                        const bannedWords = [
                            "description",
                            "\\n",
                            "itemID",
                            "currency",
                            "xp",
                            "rp",
                            "item",
                            "null",
                            "undefined"
                        ]
                        const modal = new ModalBuilder()
                            .setCustomId(`currency_name_description_${interaction.id}`)
                            .setTitle(`${client.language({ textId: client.language({ textId: "Change currency name, description", guildId: interaction.guildId, locale: interaction.locale }), guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("name")
                                            .setValue(`${settings.currencyName}`)
                                            .setStyle(TextInputStyle.Short)
                                            .setMaxLength(20)
                                            .setRequired(true)
                                    ),
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("description")
                                            .setValue(`${settings.currencyDescription}`)
                                            .setStyle(TextInputStyle.Paragraph)
                                            .setRequired(true)
                                            .setMaxLength(200)
                                    )
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `currency_name_description_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (bannedWords.some(word => modalArgs.name.toLowerCase().includes(word))) {
                                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "contains banned words. Banned words", guildId: interaction.guildId, locale: interaction.locale })}:\n${bannedWords.join(`\n`)}`, flags: ["Ephemeral"] })
                            }
                            settings.currencyName = modalArgs.name
                            settings.currencyDescription = modalArgs.description
                            await settings.save()
                        } else return
                    } else if (interaction.values[0] === "currencyEmoji") {
                        const command = client.interactions.get("emoji-selector")
					    return command.run(client, interaction, {}, "currency", "0")
                    } else if (interaction.values[0] === "currency_no_transfer") {
                        settings.currency_no_transfer = !settings.currency_no_transfer
                        await settings.save()
                    } else if (interaction.values[0] === "currency_no_drop") {
                        settings.currency_no_drop = !settings.currency_no_drop
                        await settings.save()
                    } else if (interaction.values[0] === "currency_transfer_permission") {
                        if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        const modal = new ModalBuilder()
                            .setCustomId(`permission_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("name")
                                            .setRequired(false)
                                            .setValue(`${client.cache.permissions.find(e => e.id === settings.currency_transfer_permission)?.name || ""}`)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `permission_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.name) {
                                settings.currency_transfer_permission = undefined
                                await settings.save()
                            } else {
                                const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
                                if (!permission) {
                                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
                                } else {
                                    settings.currency_transfer_permission = permission.id
                                    await settings.save()
                                }
                            }
                        } else return
                    } else if (interaction.values[0] === "currency_drop_permission") {
                        if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        const modal = new ModalBuilder()
                            .setCustomId(`permission_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setLabelComponents([
                                new LabelBuilder()
                                    .setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
                                    .setTextInputComponent(
                                        new TextInputBuilder()
                                            .setCustomId("name")
                                            .setRequired(false)
                                            .setValue(`${client.cache.permissions.find(e => e.id === settings.currency_drop_permission)?.name || ""}`)
                                            .setStyle(TextInputStyle.Short)
                                    )
                            ])
                        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                        const filter = (i) => i.customId === `permission_${interaction.id}` && i.user.id === interaction.user.id
                        interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
                        if (interaction && interaction.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (!modalArgs.name) {
                                settings.currency_drop_permission = undefined
                                await settings.save()
                            } else {
                                const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
                                if (!permission) {
                                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}` })
                                } else {
                                    settings.currency_drop_permission = permission.id
                                    await settings.save()
                                }
                            }
                        } else return
                    }
                }
                embed.setDescription([
                    `${client.language({ textId: "Currency", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.displayCurrencyEmoji}**${settings.currencyName}**`,
                    `\`\`\`${settings.currencyDescription}\`\`\``,
                    `${client.language({ textId: "Can be transferred", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.currency_no_transfer ? `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `${client.language({ textId: "Can be dropped", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.currency_no_drop ? `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `${client.language({ textId: "Permission for transfer", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.currency_transfer_permission ? `${client.cache.permissions.get(settings.currency_transfer_permission)?.name || `<${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}>`}` : `<${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}>` }`,
                    `${client.language({ textId: "Permission for dropping", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.currency_drop_permission ? `${client.cache.permissions.get(settings.currency_drop_permission)?.name || `<${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}>`}` : `<${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}>` }`
                ].join("\n"))
                return interaction.update({ embeds: [embed], components: [first_row, new ActionRowBuilder().setComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId(`cmd{manager-settings}title{currency}usr{${interaction.user.id}}`)
                        .setOptions([
                            {
                                emoji: client.config.emojis.edit,
                                label: client.language({ textId: "Change currency name, description", guildId: interaction.guildId, locale: interaction.locale }),
                                value: `currency_name_description`
                            },
                            {
                                emoji: client.config.emojis.edit,
                                label: client.language({ textId: "Change currency emoji", guildId: interaction.guildId, locale: interaction.locale }),
                                value: `currencyEmoji`
                            },
                            {
                                emoji: client.config.emojis.edit,
                                label: client.language({ textId: "Can be transferred", guildId: interaction.guildId, locale: interaction.locale }),
                                value: `currency_no_transfer`
                            },
                            {
                                emoji: client.config.emojis.edit,
                                label: client.language({ textId: "Can be dropped", guildId: interaction.guildId, locale: interaction.locale }),
                                value: `currency_no_drop`
                            },
                            {
                                emoji: client.config.emojis.crown,
                                label: client.language({ textId: "Permission for transfer", guildId: interaction.guildId, locale: interaction.locale }),
                                value: `currency_transfer_permission`
                            },
                            {
                                emoji: client.config.emojis.crown,
                                label: client.language({ textId: "Permission for dropping", guildId: interaction.guildId, locale: interaction.locale }),
                                value: `currency_drop_permission`
                            }
                        ])
                ])] })
            }
            if ((interaction.replied || interaction.deferred)) await interaction.editReply({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
            else await interaction.update({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
            if (interaction.values?.[0].includes("shop") || interaction.customId.includes("shop")) {
                const types = ["shopName", "shopMessages", "shopThumbnail"]
                if (types.includes(interaction.values[0])) {
                    if (interaction.values[0] == "shopName") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Write shop name in chat", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForShopName(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            settings.shopName = collected
                            await settings.save()
                        }
                    }
                    if (interaction.values[0] == "shopMessages") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Write shop message in chat", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.\n> ${client.language({ textId: "You can use variables", guildId: interaction.guildId, locale: interaction.locale })}: **{member}** - ${client.language({ textId: "username", guildId: interaction.guildId, locale: interaction.locale })}, **{currency}** - ${client.language({ textId: "user currency amount", guildId: interaction.guildId, locale: interaction.locale })}, **{guild}** - ${client.language({ textId: "server name", guildId: interaction.guildId, locale: interaction.locale })}\n> ${client.language({ textId: "To delete all messages", guildId: interaction.guildId, locale: interaction.locale })}: clear.` })
                        const collected = await waitingForShopMessage(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "clear") {
                                settings.shopMessages = []
                                await settings.save()
                            }
                            else if (settings.shopMessages.some(e => e.toLowerCase() == collected.toLowerCase())) {
                                settings.shopMessages = settings.shopMessages.filter(e => e.toLowerCase() !== collected.toLowerCase())    
                                await settings.save()
                                
                            } else {
                                if (settings.shopMessages.length >= 10) interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message", guildId: interaction.guildId, locale: interaction.locale })} [**${collected}**] ${client.language({ textId: "not added", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Limit exceeded", guildId: interaction.guildId, locale: interaction.locale })}: 10 ${client.language({ textId: "messages", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                                else {
                                    settings.shopMessages.push(collected)
                                    await settings.save()
                                }
                            }
                        }
                    }
                    if (interaction.values[0] == "shopThumbnail") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Write direct image link for shop in chat", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: delete.` })
                        const collected = await waitingForShopThumbnail(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.shopThumbnail = null
                                await settings.save()
                            } else {
                                settings.shopThumbnail = collected
                                await settings.save()
                            }
                        }
                    }
                }
                embed.setTitle(title.label)
                const options = [
                    { emoji: client.config.emojis.name, label: `${client.language({ textId: "Change shop name", guildId: interaction.guildId, locale: interaction.locale })}`, value: `shopName`, description: settings.shopName?.slice(0, 100) || undefined },
                    { emoji: client.config.emojis.balloon, label: `${client.language({ textId: "Add/remove shop messages", guildId: interaction.guildId, locale: interaction.locale })}`, value: `shopMessages` },
                    { emoji: client.config.emojis.picture, label: `${client.language({ textId: "Change shop image", guildId: interaction.guildId, locale: interaction.locale })}`, value: `shopThumbnail` },
                ]
                const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                embed.setDescription(`${client.language({ textId: "Shop name", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.shopName || client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Shop messages", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.shopMessages.length ? settings.shopMessages.map(e => {
                    e = e.replace(/{member}/i, interaction.member.displayName)
                    e = e.replace(/{currency}/i, profile.currency.toFixed())
                    e = e.replace(/{guild}/i, interaction.guild?.name)
                    return `[**${e}**]`
                }).join(", ") : [`**${client.language({ textId: "I knew you would come.", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "I have a special offer for you.", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "I have a very good offer for you.", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "What are we buying?", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "Boosts, roles, food! I have everything you want.", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "Sorry", guildId: interaction.guildId, locale: interaction.locale })} ${interaction.member.displayName}. ${client.language({ textId: "I can't give you credit. Come back when you're... mmm... richer!", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "I have everything you want.", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "Better not come with an empty wallet.", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "I always have an offer.", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "Global Bot is pleased with you, but I'll be more pleased if you buy a couple of things from me!", guildId: interaction.guildId, locale: interaction.locale })}**`, `**${client.language({ textId: "If you need tackle, I have it.", guildId: interaction.guildId, locale: interaction.locale })}**`].join(", ")}\n${client.language({ textId: "Shop messages", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.shopThumbnail || `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}` }`)
                embed.setThumbnail(settings.shopThumbnail?.length ? settings.shopThumbnail : null)
                const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{shop} usr{${interaction.user.id}}`).addOptions(options).setPlaceholder(`${client.language({ textId: "Select to change", guildId: interaction.guildId, locale: interaction.locale })}`)])
                return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row] })
            }
            if (interaction.values?.[0].includes("channels") || interaction.customId.includes("channels")) {
                embed.setTitle(title.label)
                const types = ["wipe", "achievementsNotificationChannelId", "itemsNotificationChannelId", "levelNotificationChannelId", "mutedChannels", "botChannelId", "generalChannelId"]
                if (types.includes(interaction.values[0])) {
                    if (interaction.values[0] == "mutedChannels") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping channels in chat or write their IDs separated by space to add or remove from excluded channels. E.g.", guildId: interaction.guildId, locale: interaction.locale })}: #${client.language({ textId: "channel", guildId: interaction.guildId, locale: interaction.locale })}1 #${client.language({ textId: "channel", guildId: interaction.guildId, locale: interaction.locale })}2 801818825795305539 802882544969318420.**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForMutedChannel(client, interaction, filter, settings)
                        message.delete().catch(e => null)
                        if (collected.length) {
                            for (let channel of collected) {
                                if (settings.channels?.mutedChannels.includes(channel)) {
                                    settings.channels.mutedChannels = settings.channels.mutedChannels.filter(e => e !== channel)
                                } else {
                                    settings.channels.mutedChannels.push(channel)
                                }
                            }
                            await settings.save()
                            
                        }
                    }
                    if (interaction.values[0] == "botChannelId") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping channel in chat for notifications from", guildId: interaction.guildId, locale: interaction.locale })} ${client.user.username}.**\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: delete.\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForChannelId(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.channels.botChannelId = undefined
                                await settings.save()
                            } else {
                                settings.channels.botChannelId = collected.id
                                await settings.save()
                            }
                        }
                    }
                    if (interaction.values[0] == "levelNotificationChannelId") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping channel in chat for new level notifications", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: delete.\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForChannelId(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.channels.levelNotificationChannelId = undefined
                                await settings.save()
                            } else {
                                settings.channels.levelNotificationChannelId = collected.id
                                await settings.save()
                            }
                        }
                    }
                    if (interaction.values[0] == "itemsNotificationChannelId") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping channel in chat for found item notifications", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: delete.\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForChannelId(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.channels.itemsNotificationChannelId = undefined
                                await settings.save()
                            } else {
                                settings.channels.itemsNotificationChannelId = collected.id
                                await settings.save()  
                            }
                        }
                    }
                    if (interaction.values[0] == "achievementsNotificationChannelId") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping channel in chat for achievement notifications", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: delete.\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForChannelId(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.channels.achievmentsNotificationChannelId = undefined
                                await settings.save()
                            } else {
                                settings.channels.achievmentsNotificationChannelId = collected.id
                                await settings.save()
                            }
                        }
                    }
                    if (interaction.values[0] == "generalChannelId") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping general chat channel in chat", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: delete.\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForChannelId(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.channels.generalChannelId = undefined
                                await settings.save()
                            } else {
                                settings.channels.generalChannelId = collected.id
                                await settings.save()
                            }
                        }
                    }
                    if (interaction.values[0] == "wipe") {
                        settings.channels.mutedChannels = []
                        await settings.save()
                    }
                }
                const channels_options = [
                    { emoji: client.config.emojis.plus, label: `${client.language({ textId: "Add/Remove channel to/from excluded list", guildId: interaction.guildId, locale: interaction.locale })}`, value: `mutedChannels` },
                    { emoji: "🤖", label: `${client.language({ textId: "Notification channel from", guildId: interaction.guildId, locale: interaction.locale })} ${client.user.username}`, value: `botChannelId`, description: `${client.language({ textId: "Set channel", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.botChannelId ? `${await interaction.guild.channels.fetch(settings.channels.botChannelId).then(channel => channel.name).catch(e => null)}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` },
                    { emoji: client.config.emojis.top, label: `${client.language({ textId: "Channel for new level notifications", guildId: interaction.guildId, locale: interaction.locale })}`, value: `levelNotificationChannelId`, description: `${client.language({ textId: "Set channel", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.levelNotificationChannelId ? `${await interaction.guild.channels.fetch(settings.channels.levelNotificationChannelId).then(channel => channel.name).catch(e => null)}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` },
                    { emoji: client.config.emojis.box, label: `${client.language({ textId: "Channel for found items notifications", guildId: interaction.guildId, locale: interaction.locale })}`, value: `itemsNotificationChannelId`, description: `${client.language({ textId: "Set channel", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.itemsNotificationChannelId ? `${await interaction.guild.channels.fetch(settings.channels.itemsNotificationChannelId).then(channel => channel.name).catch(e => null)}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` },
                    { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Channel for achievement notifications", guildId: interaction.guildId, locale: interaction.locale })}`, value: `achievementsNotificationChannelId`, description: `${client.language({ textId: "Set channel", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.achievmentsNotificationChannelId ? `${await interaction.guild.channels.fetch(settings.channels.achievmentsNotificationChannelId).then(channel => channel.name).catch(e => null)}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` },
                    { emoji: client.config.emojis.message, label: `${client.language({ textId: "General chat", guildId: interaction.guildId, locale: interaction.locale })}`, value: `generalChannelId`, description: `${client.language({ textId: "Set channel", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.generalChannelId ? `${await interaction.guild.channels.fetch(settings.channels.generalChannelId).then(channel => channel.name).catch(e => null)}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` },
                    { emoji: client.config.emojis.NO, label: `${client.language({ textId: "Clear excluded channels list", guildId: interaction.guildId, locale: interaction.locale })}`, value: `wipe` },
                ]
                let muted_channels = ""
                for (const channel of settings.channels?.mutedChannels) {
                    muted_channels += `\n> <#${channel}> (**${channel}**)`
                }
                embed.setDescription(`${client.config.emojis.block} ${client.language({ textId: "Excluded channels for receiving experience, currency, items, reputation, achievements and completing quests", guildId: interaction.guildId, locale: interaction.locale })}: ${muted_channels}`.slice(0, 4096))
                embed.addFields([{ name: `${client.language({ textId: "Channels", guildId: interaction.guildId, locale: interaction.locale })}:`, value: `> ${client.language({ textId: "Notification channel from", guildId: interaction.guildId, locale: interaction.locale })} ${client.user.username}: ${settings.channels?.botChannelId ? `<#${settings.channels.botChannelId}> (**${settings.channels.botChannelId}**)` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}\n> ${client.language({ textId: "Channel for new level notifications", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.levelNotificationChannelId ? `<#${settings.channels.levelNotificationChannelId}> (**${settings.channels.levelNotificationChannelId}**)` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}\n> ${client.language({ textId: "Channel for found items notifications", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.itemsNotificationChannelId ? `<#${settings.channels.itemsNotificationChannelId}> (**${settings.channels.itemsNotificationChannelId}**)` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}\n> ${client.language({ textId: "Channel for achievement notifications", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.achievmentsNotificationChannelId ? `<#${settings.channels.achievmentsNotificationChannelId}> (**${settings.channels.achievmentsNotificationChannelId}**)` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}\n> ${client.language({ textId: "General chat", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.channels?.generalChannelId ? `<#${settings.channels.generalChannelId}> (**${settings.channels.generalChannelId}**)` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` }])
                const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{channels} usr{${interaction.user.id}}`).addOptions(channels_options).setPlaceholder(`${client.language({ textId: "Select to change", guildId: interaction.guildId, locale: interaction.locale })}`)])
                return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row] })
            }   
            if (interaction.values?.[0].includes("roles") || interaction.customId.includes("roles")) {
                embed.setTitle(title.label)
                const types = ["mutedRoles", "rolesToNewMember", "wormholesNotification", "bumpNotification", "mutedWipe", "rolesTNMWipe"]
                if (types.includes(interaction.values[0])) {
                    if (interaction.values[0] == "mutedRoles") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping roles in chat or write their IDs separated by space to add or remove from excluded roles. E.g.", guildId: interaction.guildId, locale: interaction.locale })}: @${client.language({ textId: "role", guildId: interaction.guildId, locale: interaction.locale })}1 @${client.language({ textId: "role", guildId: interaction.guildId, locale: interaction.locale })}2 801818825795305539 802882544969318420.**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForMutedRoles(client, interaction, filter, settings)
                        message.delete().catch(e => null)
                        if (collected.length) {
                            for (let role of collected) {
                                if (settings.roles?.mutedRoles.includes(role)) {
                                    settings.roles.mutedRoles = settings.roles.mutedRoles.filter(e => e !== role)
                                } else {
                                    settings.roles.mutedRoles.push(role)
                                }
                            }
                            await settings.save()
                            
                        }
                    }
                    if (interaction.values[0] == "rolesToNewMember") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping roles in chat or write their IDs separated by space to add or remove from new user roles list. E.g.", guildId: interaction.guildId, locale: interaction.locale })}: @${client.language({ textId: "role", guildId: interaction.guildId, locale: interaction.locale })}1 @${client.language({ textId: "role", guildId: interaction.guildId, locale: interaction.locale })}2 801818825795305539 802882544969318420.**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForRolesToNewMember(client, interaction, filter, settings)
                        message.delete().catch(e => null)
                        if (collected.length) {
                            for (let role of collected) {
                                if (settings.roles?.rolesToNewMember.includes(role)) {
                                    settings.roles.rolesToNewMember = settings.roles.rolesToNewMember.filter(e => e !== role)
                                } else {
                                    if (settings.roles.rolesToNewMember.length >= 10) {
                                        interaction.followUp({ content: `${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${role}> ${client.language({ textId: "was not added because you reached maximum roles for new members", guildId: interaction.guildId, locale: interaction.locale })}: 10`, flags: ["Ephemeral"] })
                                    } else {
                                        settings.roles.rolesToNewMember.push(role)  
                                    }
                                }
                            }
                            await settings.save()
                            
                        }
                    }
                    if (interaction.values[0] == "wormholesNotification") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `${client.language({ textId: "Ping role in chat for wormhole notification", guildId: interaction.guildId, locale: interaction.locale })}.\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: **delete**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: **cancel**` })
                        const collected = await waitingForRoleId(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.roles.wormholesNotification = undefined
                                await settings.save()
                            } else {
                                settings.roles.wormholesNotification = collected.id
                                await settings.save()
                            }
                        }
                    }
                    if (interaction.values[0] == "bumpNotification") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `${client.language({ textId: "Ping role in chat for bump notification", guildId: interaction.guildId, locale: interaction.locale })}.\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: **delete**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: **cancel**` })
                        const collected = await waitingForRoleId(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.roles.bumpNotification = undefined
                                await settings.save()
                            } else {
                                settings.roles.bumpNotification = collected.id
                                await settings.save()
                            }
                        }
                    }
                    if (interaction.values[0] == "mutedWipe") {
                        settings.roles.mutedRoles = []
                        await settings.save()
                    }
                    if (interaction.values[0] == "rolesTNMWipe") {
                        settings.roles.rolesToNewMember = []
                        await settings.save()
                    }
                }
                const roles_options = [
                    { emoji: client.config.emojis.plus, label: `${client.language({ textId: "Add/Remove role to/from excluded list", guildId: interaction.guildId, locale: interaction.locale })}`, value: `mutedRoles` },
                    { emoji: client.config.emojis.plus, label: `${client.language({ textId: "Add/Remove role to/from new members list", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rolesToNewMember` },
                    { emoji: client.config.emojis.wormhole, label: `${client.language({ textId: "Role for wormhole notifications", guildId: interaction.guildId, locale: interaction.locale })}`, value: `wormholesNotification`, description: `${client.language({ textId: "Set role", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.roles?.wormholesNotification ? `${interaction.guild.roles.cache.get(settings.roles.wormholesNotification)?.name}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` },
                    { emoji: client.config.emojis.upvote, label: `${client.language({ textId: "Role for bump notifications", guildId: interaction.guildId, locale: interaction.locale })}`, value: `bumpNotification`, description: `${client.language({ textId: "Set role", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.roles?.bumpNotification ? `${interaction.guild.roles.cache.get(settings.roles.bumpNotification)?.name}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` },
                    { emoji: client.config.emojis.NO, label: `${client.language({ textId: "Clear excluded roles list", guildId: interaction.guildId, locale: interaction.locale })}`, value: `mutedWipe` },
                    { emoji: client.config.emojis.NO, label: `${client.language({ textId: "Clear new member roles list", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rolesTNMWipe` },
                ]
                let muted_roles = ""
                for (const role of settings.roles?.mutedRoles) {
                    muted_roles += `\n> <@&${role}> (**${role}**)`
                }
                let roles_to_new_member = ""
                for (const role of settings.roles?.rolesToNewMember) {
                    roles_to_new_member += `\n> <@&${role}> (**${role}**)`
                }
                const values = [
                    `> ${client.language({ textId: "Role for wormhole notifications", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.roles?.wormholesNotification ? `<@&${settings.roles.wormholesNotification}> (**${settings.roles.wormholesNotification}**)` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `> ${client.language({ textId: "Role for bump notifications", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.roles?.bumpNotification ? `<@&${settings.roles.bumpNotification}> (**${settings.roles.bumpNotification}**)` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                ]
                embed.setDescription(`${client.config.emojis.block} ${client.language({ textId: "Excluded roles for receiving experience, currency, items, reputation, achievements and completing quests", guildId: interaction.guildId, locale: interaction.locale })}: ${muted_roles}\n${client.config.emojis.roles}${client.language({ textId: "Roles for new server member", guildId: interaction.guildId, locale: interaction.locale })}: ${roles_to_new_member}`.slice(0, 4096))
                embed.addFields([{ name: `${client.language({ textId: "Roles", guildId: interaction.guildId, locale: interaction.locale })}:`, value: values.join("\n") }])
                const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{roles} usr{${interaction.user.id}}`).addOptions(roles_options).setPlaceholder(`${client.language({ textId: "Select to change", guildId: interaction.guildId, locale: interaction.locale })}`)])
                return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row] })
            }
            if (interaction.values?.[0].includes("dailyRewards") || interaction.customId.includes("dailyRewards")) {
                embed.setTitle(title.label)
                embed.setColor(interaction.member.displayHexColor)
                embed.setThumbnail(`https://emojipedia-us.s3.amazonaws.com/source/skype/289/wrapped-gift_1f381.png`)
                let dayMark = 1
                if (interaction.customId.includes("mark")) {
                    dayMark = +MarkRegexp.exec(interaction.values[0])?.[1]
                }
                if (interaction.isStringSelectMenu()) {
                    if (interaction.values[0].includes("xpEdit")) {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        let message = await interaction.followUp({ content: `<@${interaction.user.id}>, ${client.language({ textId: "write minimum quantity in chat", guildId: interaction.guildId, locale: interaction.locale })} XP.\n> **cancel** - ${client.language({ textId: "cancel", guildId: interaction.guildId, locale: interaction.locale })}` })
                        const collected = await waitingForAmount(client, interaction, filter, interaction.values[0])
                        message.delete().catch(e => null)
                        if (collected !== false) {
                            message = await interaction.followUp({ content: `<@${interaction.user.id}>, ${client.language({ textId: "write maximum quantity in chat", guildId: interaction.guildId, locale: interaction.locale })} XP.\n> **cancel** - ${client.language({ textId: "cancel", guildId: interaction.guildId, locale: interaction.locale })}` })
                            const collected1 = await waitingForAmount(client, interaction, filter, interaction.values[0], collected)
                            message.delete().catch(e => null)
                            if (collected1 !== false) {
                                const reward = settings.daily[`day${dayMark}`].find(e => { return e.itemID === "xp" })
                                if (!reward) {
                                    settings.daily[`day${dayMark}`].push({
                                        itemID: "xp",
                                        valueFrom: collected,
                                        valueTo: collected1
                                    })
                                    await settings.save()
                                } else {
                                    const reward = settings.daily[`day${dayMark}`].find(e => { return e.itemID === "xp" })
                                    reward.valueFrom = collected
                                    reward.valueTo = collected1
                                    await settings.save()
                                }
                            }
                        }
                    } 
                    if (interaction.values[0].includes("rpEdit")) {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        let message = await interaction.followUp({ content: `<@${interaction.user.id}>, ${client.language({ textId: "write minimum quantity in chat", guildId: interaction.guildId, locale: interaction.locale })} RP.\n> **cancel** - ${client.language({ textId: "cancel", guildId: interaction.guildId, locale: interaction.locale })}` })
                        const collected = await waitingForAmount(client, interaction, filter, interaction.values[0])
                        message.delete().catch(e => null)
                        if (collected !== false) {
                            message = await interaction.followUp({ content: `<@${interaction.user.id}>, ${client.language({ textId: "write maximum quantity in chat", guildId: interaction.guildId, locale: interaction.locale })} RP.\n> **cancel** - ${client.language({ textId: "cancel", guildId: interaction.guildId, locale: interaction.locale })}` })
                            const collected1 = await waitingForAmount(client, interaction, filter, interaction.values[0], collected)
                            message.delete().catch(e => null)
                            if (collected1 !== false) {
                                const reward = settings.daily[`day${dayMark}`].find(e => { return e.itemID === "rp" })
                                if (!reward) {
                                    settings.daily[`day${dayMark}`].push({
                                        itemID: "rp",
                                        valueFrom: collected,
                                        valueTo: collected1
                                    })
                                    await settings.save()
                                } else {
                                    const reward = settings.daily[`day${dayMark}`].find(e => { return e.itemID === "rp" })
                                    reward.valueFrom = collected
                                    reward.valueTo = collected1
                                    await settings.save()
                                }
                            }
                        }
                    } 
                    if (interaction.values[0].includes("curEdit")) {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        let message = await interaction.followUp({ content: `<@${interaction.user.id}>, ${client.language({ textId: "write minimum quantity in chat", guildId: interaction.guildId, locale: interaction.locale })}.\n> **cancel** - ${client.language({ textId: "cancel", guildId: interaction.guildId, locale: interaction.locale })}` })
                        const collected = await waitingForAmount(client, interaction, filter, interaction.values[0])
                        message.delete().catch(e => null)
                        if (collected !== false) {
                            message = await interaction.followUp({ content: `<@${interaction.user.id}>, ${client.language({ textId: "write maximum currency amount in chat", guildId: interaction.guildId, locale: interaction.locale })}.\n> **cancel** - ${client.language({ textId: "cancel", guildId: interaction.guildId, locale: interaction.locale })}` })
                            const collected1 = await waitingForAmount(client, interaction, filter, interaction.values[0], collected)
                            message.delete().catch(e => null)
                            if (collected1 !== false) {
                                const reward = settings.daily[`day${dayMark}`].find(e => { return e.itemID === "currency" })
                                if (!reward) {
                                    settings.daily[`day${dayMark}`].push({
                                        itemID: "currency",
                                        valueFrom: collected,
                                        valueTo: collected1
                                    })
                                    await settings.save()
                                } else {
                                    const reward = settings.daily[`day${dayMark}`].find(e => { return e.itemID === "currency" })
                                    reward.valueFrom = collected
                                    reward.valueTo = collected1
                                    await settings.save()
                                }
                            }
                        }
                    }
                    if (interaction.values[0].includes("xpDelete")) {
                        settings.daily[`day${dayMark}`] = settings.daily[`day${dayMark}`].filter(e => e.itemID !== "xp")
                        await settings.save()
                    }
                    if (interaction.values[0].includes("rpDelete")) {
                        settings.daily[`day${dayMark}`] = settings.daily[`day${dayMark}`].filter(e => e.itemID !== "rp")
                        await settings.save()
                    }
                    if (interaction.values[0].includes("curDelete")) {
                        settings.daily[`day${dayMark}`] = settings.daily[`day${dayMark}`].filter(e => e.itemID !== "currency")
                        await settings.save()
                    }
                    if (interaction.values[0].includes("weekBonusEdit")) {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `<@${interaction.user.id}>, ${client.language({ textId: "write maximum bonus multiplier in chat", guildId: interaction.guildId, locale: interaction.locale })}.\n> **0** - ${client.language({ textId: "unlimited", guildId: interaction.guildId, locale: interaction.locale })}\n> **cancel** - ${client.language({ textId: "cancel", guildId: interaction.guildId, locale: interaction.locale })}` })
                        const collected = await waitingForMaxBonus(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected !== false) {
                            settings.weekMaxBonus = collected
                            await settings.save()
                        }
                    }
                }
                let Day = 1
                const dailyItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.activities?.daily)
                for (let day in settings.daily) {
                    if (day == "day1" || day == "day2" || day == "day3" || day == "day4" || day == "day5" || day == "day6" || day == "day7") {
                        let dailyRewards = ""
                        const rewards = []
                        const i = dailyItems.filter(e => e.activities?.daily[day]?.amountTo && e.activities?.daily[day]?.amountFrom)
                        i.forEach(e => {
                            rewards.push({
                                itemID: e.itemID,
                                valueFrom: e.activities.daily[day].amountFrom,
                                valueTo: e.activities.daily[day].amountTo
                            })    
                        })
                        if (typeof settings.daily[day] == "object") settings.daily[day].forEach((reward1, index) => {
                            if (index !== 0) dailyRewards += '\n'
                            rewards.push({
                                itemID: reward1.itemID,
                                valueFrom: reward1.valueFrom,
                                valueTo: reward1.valueTo
                            })
                        })
                        for (let r of rewards) {
                            if (r.itemID == "currency") dailyRewards += `\n> ${settings.displayCurrencyEmoji}**${settings.currencyName}** ${r.valueFrom == r.valueTo ? r.valueFrom : `${r.valueFrom}-${r.valueTo}`}`
                            else if (r.itemID == "xp") dailyRewards += `\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${r.valueFrom == r.valueTo ? r.valueFrom : `${r.valueFrom}-${r.valueTo}`}`
                            else if (r.itemID == "rp") dailyRewards += `\n> ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** ${r.valueFrom == r.valueTo ? r.valueFrom : `${r.valueFrom}-${r.valueTo}`}`
                            else {
                                let item = client.cache.items.find(e => e.itemID === r.itemID && !e.temp)
                                if (item) {
                                    if (!item.enabled) item = `${item.displayEmoji}**${item.name}** (${client.language({ textId: "disabled", guildId: interaction.guildId, locale: interaction.locale })})`
                                    else if (item.found) item = `${item.displayEmoji}**${item.name}**`
                                    else item = `${item.displayEmoji}**${item.name}** (${client.language({ textId: "unknown", guildId: interaction.guildId, locale: interaction.locale })})`
                                } else item = r.itemID
                                dailyRewards += `\n> ${item} ${r.valueFrom == r.valueTo ? r.valueFrom : `${r.valueFrom}-${r.valueTo}`}`
                            }    
                        }
                        embed.addFields([{ name: `${dayMark === Day ? client.config.emojis.arrowRight : ""} ${client.language({ textId: "DAY", guildId: interaction.guildId, locale: interaction.locale })} ${Day}`, value: dailyRewards.length ? dailyRewards : `\n> ${client.language({ textId: "No rewards", guildId: interaction.guildId, locale: interaction.locale })}` }])
                        Day++    
                    } 
                }
                const options = [
                    { emoji: { name: "1️⃣" }, label: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 1`, value: `mark{1}`, default: dayMark === 1 ? true : false },
                    { emoji: { name: "2️⃣" }, label: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 2`, value: `mark{2}`, default: dayMark === 2 ? true : false },
                    { emoji: { name: "3️⃣" }, label: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 3`, value: `mark{3}`, default: dayMark === 3 ? true : false },
                    { emoji: { name: "4️⃣" }, label: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 4`, value: `mark{4}`, default: dayMark === 4 ? true : false },
                    { emoji: { name: "5️⃣" }, label: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 5`, value: `mark{5}`, default: dayMark === 5 ? true : false },
                    { emoji: { name: "6️⃣" }, label: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 6`, value: `mark{6}`, default: dayMark === 6 ? true : false },
                    { emoji: { name: "7️⃣" }, label: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} 7`, value: `mark{7}`, default: dayMark === 7 ? true : false },
                ]
                const options2 = [
                    { emoji: client.config.emojis.XP, label: `${settings.daily[`day${dayMark}`].some(e => e.itemID === "xp") ? `${client.language({ textId: "Change quantity", guildId: interaction.guildId, locale: interaction.locale })} XP` : `${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} XP`}`, value: `xpEdit mark{${dayMark}}` },
                    { emoji: client.config.emojis.RP, label: `${settings.daily[`day${dayMark}`].some(e => e.itemID === "rp") ? `${client.language({ textId: "Change quantity", guildId: interaction.guildId, locale: interaction.locale })} RP` : `${client.language({ textId: "Add", guildId: interaction.guildId, locale: interaction.locale })} RP`}`, value: `rpEdit mark{${dayMark}}` },
                    { emoji: settings.displayCurrencyEmoji, label: `${settings.daily[`day${dayMark}`].some(e => e.itemID === "currency") ? `${client.language({ textId: "Change currency amount", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Add currency", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `curEdit mark{${dayMark}}` },
                ]
                if (settings.daily[`day${dayMark}`].some(e => e.itemID === "xp")) options2.push({ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })} XP`, value: `xpDelete mark{${dayMark}}` })
                if (settings.daily[`day${dayMark}`].some(e => e.itemID === "rp")) options2.push({ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })} RP`, value: `rpDelete mark{${dayMark}}` })
                if (settings.daily[`day${dayMark}`].some(e => e.itemID === "currency")) options2.push({ emoji: client.config.emojis.NO, label: `${client.language({ textId: "Delete currency", guildId: interaction.guildId, locale: interaction.locale })}`, value: `curDelete mark{${dayMark}}` })
                options2.push({ emoji: client.config.emojis.activities, label: `${client.language({ textId: "Change max bonus for week number", guildId: interaction.guildId, locale: interaction.locale })}`, value: `weekBonusEdit mark{${dayMark}}`, description: `${client.language({ textId: "Current max. bonus", guildId: interaction.guildId, locale: interaction.locale })}: ${!settings.weekMaxBonus ? `${client.language({ textId: "UNLIMITED", guildId: interaction.guildId, locale: interaction.locale })}` : "x" + settings.weekMaxBonus }` })
                const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{dailyRewards} mark usr{${interaction.user.id}}`).addOptions(options).setPlaceholder(`${client.language({ textId: "Select day to edit", guildId: interaction.guildId, locale: interaction.locale })}`)])
                const third_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{dailyRewards} mark1 usr{${interaction.user.id}}`).addOptions(options2).setPlaceholder(`${client.language({ textId: "Select to edit", guildId: interaction.guildId, locale: interaction.locale })}`)])
                embed.setFooter({ text: `${client.language({ textId: "Current max. bonus", guildId: interaction.guildId, locale: interaction.locale })}: ${!settings.weekMaxBonus ? `${client.language({ textId: "UNLIMITED", guildId: interaction.guildId, locale: interaction.locale })}` : "x"+ settings.weekMaxBonus }` })
                return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row, third_row] })
            }
            if (interaction.values?.[0].includes("levelRoles") || interaction.customId.includes("levelRoles")) {
                embed.setTitle(title.label)
                if (interaction.customId.includes("add")) {
                    if (settings.levelsRoles.length < 80) {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        let message = await interaction.followUp({ content: `\`\`\`${client.language({ textId: "Ping role in chat or write its ID", guildId: interaction.guildId, locale: interaction.locale })}.\`\`\`\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: **cancel**` })
                        const role_guild = await waitingForRoleToAdd(client, interaction, filter, settings)
                        message.delete().catch(e => null)
                        if (role_guild) {
                            message = await interaction.followUp({ content: `\`\`\`${client.language({ textId: "Write from which level to give in chat", guildId: interaction.guildId, locale: interaction.locale })} ${role_guild.name}.\`\`\`\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: **cancel**` })
                            const levelFrom = await waitingForLevelFrom(client, interaction, filter)
                            message.delete().catch(e => null)
                            if (levelFrom) {
                                message = await interaction.followUp({ content: `\`\`\`${client.language({ textId: "Receiving level", guildId: interaction.guildId, locale: interaction.locale })} ${role_guild.name}: ${levelFrom}.\n${client.language({ textId: "Write from which level to take in chat", guildId: interaction.guildId, locale: interaction.locale })} ${role_guild.name}.\`\`\`\n> ${client.language({ textId: "To skip enter", guildId: interaction.guildId, locale: interaction.locale })}: **skip**\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: **cancel**` })
                                const levelTo = await waitingForLevelTo(client, interaction, filter, levelFrom)
                                message.delete().catch(e => null)
                                if (levelTo !== false) {
                                    if (settings.levelsRoles.length < 80) {
                                        if (!settings.levelsRoles.includes(e => e.roleId == role_guild.id)) {
                                            settings.levelsRoles.push({
                                                roleId: role_guild.id,
                                                levelFrom: levelFrom,
                                                levelTo: levelTo
                                            })
                                            await settings.save()
                                            
                                        } else interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${role_guild.name}> ${client.language({ textId: "already exists in level roles list", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })    
                                    } else interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Maximum exceeded", guildId: interaction.guildId, locale: interaction.locale })} (80) ${client.language({ textId: "number of roles for levels", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                                }
                            }
                        }    
                    } else interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Maximum exceeded", guildId: interaction.guildId, locale: interaction.locale })} (80) ${client.language({ textId: "number of roles for levels", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                if (interaction.customId.includes("del")) {
                    await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                    const message = await interaction.followUp({ content: `\`\`\`${client.language({ textId: "Ping roles in chat or write their IDs separated by space to remove from level roles", guildId: interaction.guildId, locale: interaction.locale })}.\n${client.language({ textId: "E.g.", guildId: interaction.guildId, locale: interaction.locale })}: #${client.language({ textId: "role", guildId: interaction.guildId, locale: interaction.locale })}1 #${client.language({ textId: "role", guildId: interaction.guildId, locale: interaction.locale })}1 801818825795305539 802882544969318420.\`\`\`\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: **cancel**` })
                    const collected = await waitingForRolesToDelete(client, interaction, filter, settings)
                    message.delete().catch(e => null)
                    if (collected.length) {
                        for (let role of collected) {
                            settings.levelsRoles = settings.levelsRoles.filter(e => e.roleId !== role)
                        }
                        await settings.save()
                    }
                }
                if (interaction.customId.includes("wipe")) {
                    settings.levelsRoles = []
                    await settings.save()
                }
                let level_roles = ""
                const levelsRoles = settings.levelsRoles.sort((a, b) => {
                    return b.levelFrom - a.levelFrom || b.levelTo - a.levelTo
                })
                levelsRoles.forEach((role, index) => {
                    level_roles += `${role.levelFrom && role.levelTo ? `> ${client.language({ textId: `c`, guildId: interaction.guildId, locale: interaction.locale })} ${role.levelFrom} ${client.language({ textId: `lvl`, guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: `by`, guildId: interaction.guildId, locale: interaction.locale })} ${role.levelTo} ${client.language({ textId: `lvl`, guildId: interaction.guildId, locale: interaction.locale })}.` : role.levelFrom && !role.levelTo ? `> ${client.language({ textId: `c`, guildId: interaction.guildId, locale: interaction.locale })} ${role.levelFrom} ${client.language({ textId: `lvl`, guildId: interaction.guildId, locale: interaction.locale })}.` : ``}` + ` - <@&${role.roleId}> (${role.roleId})\n`
                    if (Number.isInteger((index + 1) / 13)) {
                        embed.addFields([{ name: `${embed.data.fields?.length > 0 ? `\u200B` : `${client.language({ textId: `Roles for levels`, guildId: interaction.guildId, locale: interaction.locale })}:`}`, value: level_roles }])
                        level_roles = ""
                    } else if (index + 1 == levelsRoles.length) embed.addFields([{ name: `${embed.data.fields?.length > 0 ? `\u200B` : `${client.language({ textId: `Roles for levels`, guildId: interaction.guildId, locale: interaction.locale })}:`}`, value: level_roles }])
                })
                
                const add_level_role_btn = new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel(`${client.language({ textId: "Add role for level", guildId: interaction.guildId, locale: interaction.locale })}`).setEmoji(client.config.emojis.plus).setCustomId(`cmd{manager-settings} title{levelRoles} add usr{${interaction.user.id}}`)
                const del_level_role_btn = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel(`${client.language({ textId: "Delete role for level", guildId: interaction.guildId, locale: interaction.locale })}`).setEmoji(client.config.emojis.NO).setCustomId(`cmd{manager-settings} title{levelRoles} del usr{${interaction.user.id}}`)
                const del_all_btn = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel(`${client.language({ textId: "DELETE ALL", guildId: interaction.guildId, locale: interaction.locale })}`).setCustomId(`cmd{manager-settings} title{levelRoles} wipe usr{${interaction.user.id}}`)
                const second_row = new ActionRowBuilder().addComponents([add_level_role_btn, del_level_role_btn, del_all_btn])
                // Always use editReply since hourglass code already called update()
                return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row] })
            }
            if (interaction.values?.[0].includes("topLeaders") || interaction.customId.includes("topLeaders")) {
                embed.setTitle(`${client.config.emojis.premium}${title.label}`)
                const types = ["daily", "weekly", "monthly", "yearly", "channel"]
                if (types.includes(interaction.values[0])) {
                    if (interaction.values[0] == "channel") {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                        const message = await interaction.followUp({ content: `**${client.language({ textId: "Ping channel in chat for reports", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: delete.\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                        const collected = await waitingForChannelId(client, interaction, filter)
                        message.delete().catch(e => null)
                        if (collected) {
                            if (collected == "delete") {
                                settings.top_report.channelId = undefined
                                await settings.save()
                            } else {
                                settings.top_report.channelId = collected.id
                                await settings.save()
                            }
                        }
                    } else {
                        if (settings.top_report[interaction.values[0]]) settings.top_report[interaction.values[0]] = undefined
                        else settings.top_report[interaction.values[0]] = true
                        await settings.save()
                    }
                }
                const topLeaders_options = [
                    { emoji: settings.top_report.daily ? `🟢` : `🔴`, label: `${client.language({ textId: "Daily report", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.daily ? `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `daily` },
                    { emoji: settings.top_report.weekly ? `🟢` : `🔴`, label: `${client.language({ textId: "Weekly report", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.weekly ? `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `weekly` },
                    { emoji: settings.top_report.monthly ? `🟢` : `🔴`, label: `${client.language({ textId: "Monthly report", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.monthly ? `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `monthly` },
                    { emoji: settings.top_report.yearly ? `🟢` : `🔴`, label: `${client.language({ textId: "Annual report", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.yearly ? `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `yearly` },
                    { emoji: `📄`, label: `${client.language({ textId: "Channel for reports", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.channelId ? `${interaction.guild.channels.cache.has(settings.top_report.channelId) ? `${await interaction.guild.channels.fetch(settings.top_report.channelId).then(channel => channel.name).catch(e => null)}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `channel` },
                ]
                const text = [
                    `${client.language({ textId: "Bot can publish leaderboard for reporting period", guildId: interaction.guildId, locale: interaction.locale })}`,
                    `> ${client.language({ textId: "Daily report", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.daily ? `🟢${client.language({ textId: "ENABLED", guildId: interaction.guildId, locale: interaction.locale })}` : `🔴${client.language({ textId: "DISABLED", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `> ${client.language({ textId: "Weekly report", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.weekly ? `🟢${client.language({ textId: "ENABLED", guildId: interaction.guildId, locale: interaction.locale })}` : `🔴${client.language({ textId: "DISABLED", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `> ${client.language({ textId: "Monthly report", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.monthly ? `🟢${client.language({ textId: "ENABLED", guildId: interaction.guildId, locale: interaction.locale })}` : `🔴${client.language({ textId: "DISABLED", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `> ${client.language({ textId: "Annual report", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.yearly ? `🟢${client.language({ textId: "ENABLED", guildId: interaction.guildId, locale: interaction.locale })}` : `🔴${client.language({ textId: "DISABLED", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                    `> ${client.language({ textId: "Channel for reports", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.top_report.channelId ? `${interaction.guild.channels.cache.has(settings.top_report.channelId) ? `<#${await interaction.guild.channels.fetch(settings.top_report.channelId).then(channel => channel.id).catch(e => null)}>` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}` : `${client.language({ textId: "NO", guildId: interaction.guildId, locale: interaction.locale })}`}`
                ]
                embed.setDescription(text.join("\n"))
                const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{topLeaders} usr{${interaction.user.id}}`).addOptions(topLeaders_options).setPlaceholder(`${client.language({ textId: "Select to change", guildId: interaction.guildId, locale: interaction.locale })}`)])
                return interaction.editReply({ content: " ", embeds: [embed], components: [first_row, second_row] })
            }
            if (interaction.values?.[0].includes("activities") || interaction.customId.includes("activities")) {
                embed.setTitle(title.label)
                const messageTypes = [`xpForMessage`, `curForMessage`, `rpForMessage`]
                const types = [ `xpForMessage`, `curForMessage`, "rpForMessage", 
                "xpForVoice", "curForVoice", "rpForVoice", 
                "xpForInvite", "curForInvite", "rpForInvite", 
                "xpForBump", "curForBump", "rpForBump", 
                "xpForLike", "curForLike", "rpForLike", 
                "xpForFirstFoundItem", "curForFirstFoundItem", "rpForFirstFoundItem" ]
                if (types.includes(interaction.values?.[0])) {
                    await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                    const message = await interaction.followUp({ content: `${client.language({ textId: "Write quantity in chat", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                    const collected = await waitingForAmount2(client, interaction, filter, interaction.values[0])
                    message.delete().catch(e => null)
                    if (!Number.isNaN(collected)) {
                        settings[interaction.values[0]] = +collected
                        await settings.save()
                        // Ask for cooldown if it's a message type option
                        if (messageTypes.includes(interaction.values[0])) {
                            const cooldownMessage = await interaction.followUp({ content: `\`\`\`${client.language({ textId: "Write cooldown in seconds in chat", guildId: interaction.guildId, locale: interaction.locale })} (${client.language({ textId: "Default", guildId: interaction.guildId, locale: interaction.locale })}: 60 ${client.language({ textId: "seconds", guildId: interaction.guildId, locale: interaction.locale })}).\`\`\`\n> ${client.language({ textId: "Write", guildId: interaction.guildId, locale: interaction.locale })} **0** ${client.language({ textId: "to remove cooldown or", guildId: interaction.guildId, locale: interaction.locale })} **skip** ${client.language({ textId: "to return to panel", guildId: interaction.guildId, locale: interaction.locale })}.` })
                            const cooldownCollected = await waitingForCooldown(client, interaction, filter)
                            cooldownMessage.delete().catch(e => null)
                            if (cooldownCollected !== false) {
                                settings.messageCooldown = +cooldownCollected
                                await settings.save()
                            }
                        }
                    }
                }
                if (interaction.customId.includes("default")) {
                    settings.xpForMessage = 15
                    settings.curForMessage = 3
                    settings.rpForMessage = 0
                    settings.xpForVoice = 5000
                    settings.curForVoice = 300
                    settings.rpForVoice = 0
                    settings.xpForInvite = 10000
                    settings.curForInvite = 0
                    settings.rpForInvite = 200
                    settings.xpForBump = 200
                    settings.curForBump = 30
                    settings.rpForBump = 1000
                    settings.xpForLike = 1000
                    settings.curForLike = 0
                    settings.rpForLike = 0
                    settings.xpForFirstFoundItem = 1000
                    settings.curForFirstFoundItem = 0
                    settings.levelfactor = 350
                    await settings.save()
                    await Promise.all(client.cache.profiles.filter(e => e.guildID === interaction.guildId).map(async profile => {
                        let oldLevel = profile.level
                        profile.level = 1
                        profile.xp = profile.totalxp
                        let i = 0
                        while (profile.xp >= profile.level * settings.levelfactor + 100) {
                            profile.xp -= profile.level * settings.levelfactor + 100
                            profile.level++
                            i++
                            if (i > 100000) throw new Error(`Бесконечный цикл: manager-settings:2224, oldLevel: ${oldLevel}, profile.totalxp: ${profile.totalxp}, settings.levelfactor: ${settings.levelfactor}`)
                        }
                        if (profile.level !== oldLevel) await profile.newLevelNotify(client)
                        await profile.save()   
                    }))
                }
                if (interaction.values?.[0].includes("levelfactor") || interaction.customId.includes("levelfactor")) {
                    if (client.levelFactorCooldowns[interaction.guildId] > new Date()) {
                        await interaction.editReply({ embeds: interaction.message.embeds, components: components1 })
                        return interaction.followUp({ content: `${client.language({ textId: "Wait for cooldown", guildId: interaction.guildId, locale: interaction.locale })}: ${Math.ceil((client.levelFactorCooldowns[interaction.guildId] - new Date())/1000/60)} ${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                    }
                    const date = new Date()
                    client.levelFactorCooldowns[interaction.guildId] = new Date(date.setMinutes(date.getMinutes() + 30))
                    await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                    const message = await interaction.followUp({ content: `${client.language({ textId: "Write level factor in chat (Increase in experience required for next level)", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                    const collected = await waitingForLevelFactor(client, interaction, filter)
                    message.delete().catch(e => null)
                    if (collected) {
                        await interaction.editReply({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
                        settings.levelfactor = +collected
                        await settings.save()
                        await Promise.all(client.cache.profiles.filter(e => e.guildID === interaction.guildId).map(async profile => {
                            let oldLevel = profile.level
                            profile.level = 1
                            profile.xp = profile.totalxp
                            let i = 0
                            while (profile.xp >= profile.level * settings.levelfactor + 100) {
                                profile.xp -= profile.level * settings.levelfactor + 100
                                profile.level++
                                i++
                                if (i > 100000) throw new Error(`Бесконечный цикл: manager-settings:2254, oldLevel: ${oldLevel}, profile.totalxp: ${profile.totalxp}, settings.levelfactor: ${settings.levelfactor}`)
                            }
                            if (oldLevel !== profile.level) {
                                const member = await interaction.guild.members.fetch(profile.userID).catch(e => null)
                                if (member) {
                                    if (settings.levelsRoles.length > 0) {
                                        const rolesAdd = settings.levelsRoles.filter(e => profile.level >= e.levelFrom && (!e.levelTo || e.levelTo > profile.level) && !member.roles.cache.has(e.roleId))
                                        for (const role of rolesAdd) {
                                            const guild_role = await interaction.guild.roles.fetch(role.roleId).catch(e => null)
                                            if (guild_role && interaction.guild.members.me.roles.highest.position > guild_role.position) {
                                                await member.roles.add(guild_role.id).catch(e => null)
                                            }
                                        }
                                        const rolesRemove = settings.levelsRoles.filter(e => (e.levelTo <= profile.level || e.levelFrom > profile.level) && member.roles.cache.has(e.roleId))
                                        for (const role of rolesRemove) {
                                            const guild_role = await interaction.guild.roles.fetch(role.roleId).catch(e => null)
                                            if (guild_role && interaction.guild.members.me.roles.highest.position > guild_role.position) {
                                                await member.roles.remove(guild_role.id).catch(e => null) 
                                            }
                                        }
                                    }
                                }
                            }
                            await profile.save()
                        }))
                    } else delete client.levelFactorCooldowns[interaction.guildId]
                }
                const activities_options = [
                    { emoji: client.config.emojis.XP, label: `${client.language({ textId: "Level factor", guildId: interaction.guildId, locale: interaction.locale })}`, value: `levelfactor`, description: `${client.language({ textId: "Level factor", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.levelfactor}` },
                    { emoji: client.config.emojis.XP, label: `✉️${client.language({ textId: "Experience for message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xpForMessage`, description: `${settings.xpForMessage} XP | ${client.language({ textId: "Cooldown", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.messageCooldown || 60}${client.language({ textId: "sec", guildId: interaction.guildId, locale: interaction.locale })}` },
                    { emoji: settings.displayCurrencyEmoji, label: `✉️${settings.currencyName} ${client.language({ textId: "for message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `curForMessage`, description: `${settings.curForMessage} ${settings.currencyName} | ${client.language({ textId: "Cooldown", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.messageCooldown || 60}${client.language({ textId: "sec", guildId: interaction.guildId, locale: interaction.locale })}` },
                    { emoji: client.config.emojis.RP, label: `✉️${client.language({ textId: "Reputation for message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rpForMessage`, description: `${settings.rpForMessage} RP | ${client.language({ textId: "Cooldown", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.messageCooldown || 60}${client.language({ textId: "sec", guildId: interaction.guildId, locale: interaction.locale })}` },
                    { emoji: client.config.emojis.XP, label: `🎙️${client.language({ textId: "Experience for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xpForVoice`, description: `${client.language({ textId: "For one minute in VC", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.xpForVoice} XP` },
                    { emoji: settings.displayCurrencyEmoji, label: `🎙️${settings.currencyName} ${client.language({ textId: "for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`, value: `curForVoice`, description: `${client.language({ textId: "For one minute in VC", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.curForVoice} ${settings.currencyName}` },
                    { emoji: client.config.emojis.RP, label: `🎙️${client.language({ textId: "Reputation for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rpForVoice`, description: `${client.language({ textId: "For one minute in VC", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rpForVoice} RP` },
                    { emoji: client.config.emojis.XP, label: `📨${client.language({ textId: "Experience for invite", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xpForInvite`, description: `${client.language({ textId: "For one invite", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.xpForInvite} XP` },
                    { emoji: settings.displayCurrencyEmoji, label: `📨${settings.currencyName} ${client.language({ textId: "for invite", guildId: interaction.guildId, locale: interaction.locale })}`, value: `curForInvite`, description: `${client.language({ textId: "For one invite", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.curForInvite} ${settings.currencyName}` },
                    { emoji: client.config.emojis.RP, label: `📨${client.language({ textId: "Reputation for invite", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rpForInvite`, description: `${client.language({ textId: "For one invite", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rpForInvite} RP` },
                    { emoji: client.config.emojis.XP, label: `🆙${client.language({ textId: "Experience for bump", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xpForBump`, description: `${client.language({ textId: "For one bump", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.xpForBump} XP` },
                    { emoji: settings.displayCurrencyEmoji, label: `🆙${settings.currencyName} ${client.language({ textId: "for bump", guildId: interaction.guildId, locale: interaction.locale })}`, value: `curForBump`, description: `${client.language({ textId: "For one bump", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.curForBump} ${settings.currencyName}` },
                    { emoji: client.config.emojis.RP, label: `🆙${client.language({ textId: "Reputation for bump", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rpForBump`, description: `${client.language({ textId: "For one bump", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rpForBump} RP` },
                    { emoji: client.config.emojis.XP, label: `❤️${client.language({ textId: "Experience for like", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xpForLike`, description: `${client.language({ textId: "For one bump", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.xpForLike} XP` },
                    { emoji: settings.displayCurrencyEmoji, label: `❤️${settings.currencyName} ${client.language({ textId: "for like", guildId: interaction.guildId, locale: interaction.locale })}`, value: `curForLike`, description: `${client.language({ textId: "For one bump", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.curForLike} ${settings.currencyName}` },
                    { emoji: client.config.emojis.RP, label: `❤️${client.language({ textId: "Reputation for like", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rpForLike`, description: `${client.language({ textId: "For one bump", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rpForLike} RP` },
                    { emoji: client.config.emojis.XP, label: `📦${client.language({ textId: "Experience for first-time item", guildId: interaction.guildId, locale: interaction.locale })}`, value: `xpForFirstFoundItem`, description: `${client.language({ textId: "For one item", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.xpForFirstFoundItem} XP` },
                    { emoji: settings.displayCurrencyEmoji, label: `📦${settings.currencyName} ${client.language({ textId: "for first-time item", guildId: interaction.guildId, locale: interaction.locale })}`, value: `curForFirstFoundItem`, description: `${client.language({ textId: "For one item", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.curForFirstFoundItem} ${settings.currencyName}` },
                    //{ emoji: client.config.emojis.RP, label: `📦${client.language({ textId: "Reputation for first-time item", guildId: interaction.guildId, locale: interaction.locale })}`, value: `rpForFirstFoundItem`, description: `${client.language({ textId: "For one item", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.rpForFirstFoundItem} RP` },
                ]
                embed.setDescription(`${client.language({ textId: "Level factor", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.levelfactor} (${client.language({ textId: "Each new level, experience required for next level increases by", guildId: interaction.guildId, locale: interaction.locale })} ${settings.levelfactor})`)
                embed.addFields([
                    { 
                        name: `${client.config.emojis.message}️ ${client.language({ textId: "For message", guildId: interaction.guildId, locale: interaction.locale })}:`, 
                        value: `**${client.language({ textId: "Awarded for message in non-excluded text channels.\nExcluded channels can be configured in \"Channel settings\"", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.xpForMessage}\n> ${settings.displayCurrencyEmoji}**${settings.currencyName}:** ${settings.curForMessage}\n> ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.rpForMessage}\n> ⏱️**${client.language({ textId: "Cooldown", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.messageCooldown || 60} ${client.language({ textId: "seconds", guildId: interaction.guildId, locale: interaction.locale })}`,
                    },
                    { 
                        name: `${client.config.emojis.mic} ${client.language({ textId: "For voice channel activity", guildId: interaction.guildId, locale: interaction.locale })}:`, 
                        value: `**${client.language({ textId: "Awarded for one minute of voice chat in non-excluded voice channels, with microphone on and at least one other person", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.xpForVoice}\n> ${settings.displayCurrencyEmoji}**${settings.currencyName}:** ${settings.curForVoice}\n> ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.rpForVoice}`,
                    },
                    {
                        name: `${client.config.emojis.invite} ${client.language({ textId: "For invite", guildId: interaction.guildId, locale: interaction.locale })}:`, 
                        value: `**${client.language({ textId: "Awarded for one server invite", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.xpForInvite}\n> ${settings.displayCurrencyEmoji}**${settings.currencyName}:** ${settings.curForInvite}\n> ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.rpForInvite}`,
                    },
                    {
                        name: `${client.config.emojis.premium} ${client.config.emojis.bump} ${client.language({ textId: "For bump", guildId: interaction.guildId, locale: interaction.locale })}:`, 
                        value: `**${client.language({ textId: "Awarded for one server bump using other bot commands. E.g.", guildId: interaction.guildId, locale: interaction.locale })} /bump, /up, /like**\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.xpForBump}\n> ${settings.displayCurrencyEmoji}**${settings.currencyName}:** ${settings.curForBump}\n> ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.rpForBump}`,
                    },
                    {
                        name: `${client.config.emojis.heart}️ ${client.language({ textId: "For like", guildId: interaction.guildId, locale: interaction.locale })}:`, 
                        value: `**${client.language({ textId: "Awarded for liking another user (/like). Awarded to both users (sender and receiver)", guildId: interaction.guildId, locale: interaction.locale })}**\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.xpForLike}\n> ${settings.displayCurrencyEmoji}**${settings.currencyName}:** ${settings.curForLike}\n> ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.rpForLike}`,
                    },
                    {
                        name: `${client.config.emojis.box} ${client.language({ textId: "For item found for the first time", guildId: interaction.guildId, locale: interaction.locale })}:`, 
                        value: `**${client.language({ textId: "Awarded for item user found for the first time", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}:** ${settings.xpForFirstFoundItem}\n> ${settings.displayCurrencyEmoji}**${settings.currencyName}:** ${settings.curForFirstFoundItem}`,
                    }
                ])
                const second_row = new ActionRowBuilder()
                    .addComponents([
                        new StringSelectMenuBuilder()
                            .setCustomId(`cmd{manager-settings} title{activities} usr{${interaction.user.id}}`)
                            .addOptions(activities_options)
                            .setPlaceholder(`${client.language({ textId: "Select to change", guildId: interaction.guildId, locale: interaction.locale })}`)
                        ])
                const third_row = new ActionRowBuilder()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId(`cmd{manager-settings} title{activities} default usr{${interaction.user.id}}`)
                            .setLabel(`${client.language({ textId: "DEFAULT", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setStyle(ButtonStyle.Danger)
                        ])
                const components = [first_row, second_row, third_row]
                return interaction.editReply({ content: " ", embeds: [embed], components: components }).catch(e => {
                    if (handleEmojiError(e, components)) {
                        interaction.editReply({ content: " ", embeds: [embed], components: components })
                    } else client.functions.sendError(e)
                })
            }
            if (interaction.values?.[0].includes("logs") || interaction.customId.includes("logs")) {
                embed.setTitle(`${client.config.emojis.premium}${title.label}`)
                if (interaction.customId.includes("editPreferences")) {
                    for (const value of interaction.values) {
                        if (settings.logs[value]) settings.logs[value] = undefined
                        else settings.logs[value] = true
                    }
                    await settings.save()
                }
                if (interaction.customId.includes("editWebhook")) {
                    await interaction.editReply({ embeds: interaction.message.embeds, components: [] })
                    const message = await interaction.followUp({ content: `**${client.language({ textId: "Paste the webhook URL where logs will be published", guildId: interaction.guildId, locale: interaction.locale })}.**\n> ${client.language({ textId: "To delete enter", guildId: interaction.guildId, locale: interaction.locale })}: delete.\n> ${client.language({ textId: "To cancel enter", guildId: interaction.guildId, locale: interaction.locale })}: cancel.` })
                    const collected = await waitingForWebhook(client, interaction, filter)
                    message.delete().catch(e => null)
                    if (collected) {
                        if (collected == "delete") {
                            settings.logs.webhook = undefined
                            await settings.save()
                        } else {
                            settings.logs.webhook = collected
                            await settings.save() 
                        }
                    }
                }
                if (interaction.customId.includes("turnAllOn")) {
                    settings.logs.channelCreate = true
                    settings.logs.channelDelete = true
                    settings.logs.guildUpdate = true
                    settings.logs.memberAdd = true
                    settings.logs.memberRemove = true
                    settings.logs.memberUpdate = true
                    settings.logs.memberKick = true
                    settings.logs.memberPrune = true
                    settings.logs.memberRoleUpdate = true
                    settings.logs.memberBanAdd = true
                    settings.logs.memberBanRemove = true
                    settings.logs.inviteCreate = true
                    settings.logs.inviteDelete = true
                    settings.logs.inviteUpdate = true
                    settings.logs.messageReactionAdd = true
                    settings.logs.roleCreate = true
                    settings.logs.roleDelete = true
                    settings.logs.roleUpdate = true
                    settings.logs.stickerCreate = true
                    settings.logs.stickerDelete = true
                    settings.logs.stickerUpdate = true
                    settings.logs.messageCreate = true
                    settings.logs.messageDelete = true
                    settings.logs.voiceStateUpdate = true
                    settings.logs.emojiCreate = true
                    settings.logs.emojiDelete = true
                    settings.logs.emojiUpdate = true
                    settings.logs.interactionCreate = true
                    settings.logs.botAdd = true
                    settings.logs.applicationCommandPermissionUpdate = true
                    settings.logs.guildScheduledEventCreate = true
                    settings.logs.guildScheduledEventDelete = true
                    settings.logs.guildScheduledEventUpdate = true
                    settings.logs.integrationCreate = true
                    settings.logs.integrationDelete = true
                    settings.logs.integrationUpdate = true
                    settings.logs.webhookCreate = true
                    settings.logs.webhookDelete = true
                    settings.logs.webhookUpdate = true
                    settings.logs.economyLogCreate = true
                    await settings.save()
                }
                if (interaction.customId.includes("turnAllOff")) {
                    settings.logs.channelCreate = undefined
                    settings.logs.channelDelete = undefined
                    settings.logs.guildUpdate = undefined
                    settings.logs.memberAdd = undefined
                    settings.logs.memberRemove = undefined
                    settings.logs.memberUpdate = undefined
                    settings.logs.memberKick = undefined
                    settings.logs.memberPrune = undefined
                    settings.logs.memberRoleUpdate = undefined
                    settings.logs.memberBanAdd = undefined
                    settings.logs.memberBanRemove = undefined
                    settings.logs.inviteCreate = undefined
                    settings.logs.inviteDelete = undefined
                    settings.logs.inviteUpdate = undefined
                    settings.logs.messageReactionAdd = undefined
                    settings.logs.roleCreate = undefined
                    settings.logs.roleDelete = undefined
                    settings.logs.roleUpdate = undefined
                    settings.logs.stickerCreate = undefined
                    settings.logs.stickerDelete = undefined
                    settings.logs.stickerUpdate = undefined
                    settings.logs.messageCreate = undefined
                    settings.logs.messageDelete = undefined
                    settings.logs.voiceStateUpdate = undefined
                    settings.logs.emojiCreate = undefined
                    settings.logs.emojiDelete = undefined
                    settings.logs.emojiUpdate = undefined
                    settings.logs.interactionCreate = undefined
                    settings.logs.botAdd = undefined
                    settings.logs.applicationCommandPermissionUpdate = undefined
                    settings.logs.guildScheduledEventCreate = undefined
                    settings.logs.guildScheduledEventDelete = undefined
                    settings.logs.guildScheduledEventUpdate = undefined
                    settings.logs.integrationCreate = undefined
                    settings.logs.integrationDelete = undefined
                    settings.logs.integrationUpdate = undefined
                    settings.logs.webhookCreate = undefined
                    settings.logs.webhookDelete = undefined
                    settings.logs.webhookUpdate = undefined
                    settings.logs.economyLogCreate = undefined
                    await settings.save()
                }
                const options = [
                    {
                        emoji: settings.logs.channelCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Channel creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when channel is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `channelCreate`
                    },
                    {
                        emoji: settings.logs.channelDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Channel deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when channel is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `channelDelete`
                    },
                    {
                        emoji: settings.logs.channelUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Channel change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when channel is edited", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `channelUpdate`
                    },
                    {
                        emoji: settings.logs.guildUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Server change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when server is edited", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `guildUpdate`
                    },
                    {
                        emoji: settings.logs.memberAdd ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Adding user", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user joins server", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `memberAdd`
                    },
                    {
                        emoji: settings.logs.memberRemove ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "User deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user leaves server", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `memberRemove`
                    },
                    {
                        emoji: settings.logs.memberUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "User change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user edits profile", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `memberUpdate`
                    },
                    {
                        emoji: settings.logs.memberKick ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "User kick", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user is kicked", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `memberKick`
                    },
                    {
                        emoji: settings.logs.memberPrune ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "User timeout", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user is timed out", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `memberPrune`
                    },
                    {
                        emoji: settings.logs.memberRoleUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "User roles change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user roles are changed", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `memberRoleUpdate`
                    },
                    {
                        emoji: settings.logs.memberBanAdd ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "User ban", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user is banned", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `memberBanAdd`
                    },
                    {
                        emoji: settings.logs.memberBanRemove ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "User unban", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user is unbanned", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `memberBanRemove`
                    },
                    {
                        emoji: settings.logs.inviteCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Invite creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when invite is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `inviteCreate`
                    },
                    {
                        emoji: settings.logs.inviteDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Invite deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when invite is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `inviteDelete`
                    },
                    {
                        emoji: settings.logs.inviteUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Invite change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when invite is changed", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `inviteUpdate`
                    },
                    {
                        emoji: settings.logs.messageReactionAdd ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Adding reaction", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when reaction is added", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `messageReactionAdd`
                    },
                    {
                        emoji: settings.logs.roleCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Role creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when role is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `roleCreate`
                    },
                    {
                        emoji: settings.logs.roleDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Role deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when role is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `roleDelete`
                    },
                    {
                        emoji: settings.logs.roleUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Role change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when role is edited", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `roleUpdate`
                    },
                    {
                        emoji: settings.logs.stickerCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Sticker creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when sticker is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `stickerCreate`
                    },
                    {
                        emoji: settings.logs.stickerDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Sticker deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when sticker is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `stickerDelete`
                    },
                    {
                        emoji: settings.logs.stickerUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Sticker change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when sticker is changed", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `stickerUpdate`
                    },
                    {
                        emoji: settings.logs.messageCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Message creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when message is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `messageCreate`
                    },
                    {
                        emoji: settings.logs.messageDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Message deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when someone else's message is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `messageDelete`
                    },
                    {
                        emoji: settings.logs.voiceStateUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Voice state change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when user leaves/joins/changes voice channel", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `voiceStateUpdate`
                    },
                    {
                        emoji: settings.logs.emojiCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Emoji creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when emoji is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `emojiCreate`
                    },
                    {
                        emoji: settings.logs.emojiDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Emoji deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when emoji is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `emojiDelete`
                    },
                    {
                        emoji: settings.logs.emojiUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Emoji change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when emoji is changed", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `emojiUpdate`
                    },
                    {
                        emoji: settings.logs.interactionCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Command creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when command is used", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `interactionCreate`
                    },
                    {
                        emoji: settings.logs.botAdd ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Adding bot", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when bot is added to server", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `botAdd`
                    },
                    {
                        emoji: settings.logs.applicationCommandPermissionUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Command usage permissions change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when command usage permissions are changed", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `applicationCommandPermissionUpdate`
                    },
                    {
                        emoji: settings.logs.guildScheduledEventCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Server event creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when server event is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `guildScheduledEventCreate`
                    },
                    {
                        emoji: settings.logs.guildScheduledEventUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Server event change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when server event is changed", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `guildScheduledEventUpdate`
                    },
                    {
                        emoji: settings.logs.guildScheduledEventDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Server event deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when server event is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `guildScheduledEventDelete`
                    },
                    {
                        emoji: settings.logs.integrationCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Integration creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when integration is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `integrationCreate`
                    },
                    {
                        emoji: settings.logs.integrationUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Integration change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when integration is changed", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `integrationUpdate`
                    },
                    {
                        emoji: settings.logs.integrationDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Integration deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when integration is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `integrationDelete`
                    },
                    {
                        emoji: settings.logs.webhookCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Webhook creation", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when webhook is created", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `webhookCreate`
                    },
                    {
                        emoji: settings.logs.webhookUpdate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Webhook change", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when webhook is changed", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `webhookUpdate`
                    },
                    {
                        emoji: settings.logs.webhookDelete ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Webhook deletion", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Occurs when webhook is deleted", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `webhookDelete`
                    },
                    {
                        emoji: settings.logs.economyLogCreate ? client.config.emojis.YES : client.config.emojis.NO,
                        label: `${client.language({ textId: "Audit economy", guildId: interaction.guildId, locale: interaction.locale })}`,
                        description: `${client.language({ textId: "Audit currency, experience, items earnings etc.", guildId: interaction.guildId, locale: interaction.locale })}`,
                        value: `economyLogCreate`
                    }
                ]
                embed.setDescription(`${client.language({ textId: "Webhook", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.logs.webhook ? `${settings.logs.webhook}` : `${client.language({ textId: "Not configured", guildId: interaction.guildId, locale: interaction.locale })}`}`)
                // embed.addFields([
                //     { name: "\u200B", value: options.slice(0, 5).map(e => { return `${e.emoji} ${e.label} (${e.description})` }).join("\n") },
                //     { name: "\u200B", value: options.slice(6, 11).map(e => { return `${e.emoji} ${e.label} (${e.description})` }).join("\n") },
                //     { name: "\u200B", value: options.slice(12, 14).map(e => { return `${e.emoji} ${e.label} (${e.description})` }).join("\n") }
                // ])
                const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{logs} editPreferences usr{${interaction.user.id}}1`).addOptions(options.slice(0, 25)).setMaxValues(25)])
                const third_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{manager-settings} title{logs} editPreferences usr{${interaction.user.id}}2`).addOptions(options.slice(25, options.length)).setMaxValues(options.slice(25, options.length).length)])
                const editWebhook_btn = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel(`${client.language({ textId: "Change webhook", guildId: interaction.guildId, locale: interaction.locale })}`).setCustomId(`cmd{manager-settings} title{logs} editWebhook usr{${interaction.user.id}}`)
                const turnAllOn_btn = new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel(`${client.language({ textId: "Enable all", guildId: interaction.guildId, locale: interaction.locale })}`).setCustomId(`cmd{manager-settings} title{logs} turnAllOn usr{${interaction.user.id}}`)
                const turnAllOff_btn = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel(`${client.language({ textId: "Disable all", guildId: interaction.guildId, locale: interaction.locale })}`).setCustomId(`cmd{manager-settings} title{logs} turnAllOff usr{${interaction.user.id}}`)
                const four_row = new ActionRowBuilder().addComponents([editWebhook_btn, turnAllOn_btn, turnAllOff_btn])
                return interaction.editReply({ content: `${!interaction.guild.members.me.permissions.has("ViewAuditLog") ? `${client.config.emojis.block} ${client.language({ textId: "WARNING!!! For better logger operation, audit log viewing permissions are required!", guildId: interaction.guildId, locale: interaction.locale })}` : ` `}`, embeds: [embed], components: [first_row, second_row, third_row, four_row]})
            }
        }
        const guildItems = client.cache.items.filter(e => e.guildID === interaction.guildId)
        const guildAchievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId)
        const guildWormholes = client.cache.wormholes.filter(e => e.guildID === interaction.guildId)
        const guildBonusChannels = client.cache.channels.filter(e => e.guildID === interaction.guildId)
        const guildCategories = await client.shopCategorySchema.find({ guildID: interaction.guildId }).lean()
        const guildStyles = await client.styleSchema.find({ guildID: interaction.guildId }).lean()
        const guildQuests = client.cache.quests.filter(e => e.guildID === interaction.guildId)
        const guildRoles = client.cache.roles.filter(e => e.guildID === interaction.guildId)
        const guildGifts = await client.giftSchema.find({ guildID: interaction.guildId }).lean()
        const permissions = client.cache.permissions.filter(e => e.guildID === interaction.guildId)
        const jobs = client.cache.jobs.filter(e => e.guildID === interaction.guildId)
        const description = [
            `${interaction.guild.description ? `\`\`\`${interaction.guild.description}\`\`\`` : ""}`,
            `${client.language({ textId: "Participants", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.profile}${interaction.guild.memberCount}`,
            `${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.box}${guildItems.size} / ${settings.max_items}`,
            `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.achievements}${guildAchievements.size} / ${settings.max_achievements}`,
            `${client.language({ textId: "Wormholes", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.wormhole}${guildWormholes.size} / ${settings.max_wormholes}`,
            `${client.language({ textId: "Styles", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.style}${guildStyles.length} / ${settings.max_styles}`,
            `${client.language({ textId: "Bonus channels", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.mic}${guildBonusChannels.size} / ${settings.max_bonusChannels}`,
            `${client.language({ textId: "Categories", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.shop}${guildCategories.length} / ${settings.max_categories}`,
            `${client.language({ textId: "Roles", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.roles}${guildRoles.size} / ${settings.max_roles}`,
            `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.scroll}${guildQuests.size} / ${settings.max_quests}`,
            `${client.language({ textId: "Gifts", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.giveaway}${guildGifts.length}`,
            `${client.language({ textId: "Permissions", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.crown}${permissions.size}`,
            `${client.language({ textId: "Job", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.job}${jobs.size}`,
            `${client.language({ textId: "Owner", guildId: interaction.guildId, locale: interaction.locale })}: <@${await interaction.guild.fetchOwner().then(member => member.user.id)}>`
        ]
        embed.setDescription(description.join("\n"))
        embed.setThumbnail(interaction.guild.iconURL())
        embed.setImage(interaction.guild.bannerURL({ format: "png", size: 4096 }))
        return interaction.editReply({ embeds: [embed], components: [lang_row, first_row] })
    }
}
async function waitingForAmount(client, interaction, filter, value, min) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (!isNaN(collected.first().content)) {
            if (value?.includes("rp")) {
                if (collected.first().content <= 0 || collected.first().content > 1000) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
                } else if (min !== undefined && +collected.first().content < min) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum value must not be less than minimum", guildId: interaction.guildId, locale: interaction.locale })} (${min})`, flags: ["Ephemeral"] })
                } else {
                    collected.first().delete().catch(e => null) 
                    return +collected.first().content   
                }
            } else {
                if (collected.first().content <= 0 || collected.first().content > 100000000 ) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000`, flags: ["Ephemeral"] })
                } else if (collected.first().content < min) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum value must not be less than minimum", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                } else if (min == 0 && +collected.first().content == 0) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum value must not be zero", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                } else {
                    collected.first().delete().catch(e => null) 
                    return +collected.first().content   
                }
            }
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    }
}
async function waitingForAmount2(client, interaction, filter, value, min) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (!Number.isInteger(collected.first().content)) {
            if (value?.includes("rp")) {
                if (collected.first().content < 0 || collected.first().content > 1000) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, flags: ["Ephemeral"] })
                } else if (min !== undefined && +collected.first().content < min) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum value must not be less than minimum", guildId: interaction.guildId, locale: interaction.locale })} (${min})`, flags: ["Ephemeral"] })
                } else {
                    collected.first().delete().catch(e => null) 
                    return +collected.first().content   
                }
            } else {
                if (collected.first().content < 0 || collected.first().content > 100000000 ) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000`, flags: ["Ephemeral"] })
                } else if (collected.first().content < min) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum value must not be less than minimum", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                } else if (min == 0 && +collected.first().content == 0) {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum value must not be zero", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                } else {
                    collected.first().delete().catch(e => null) 
                    return +collected.first().content   
                }
            }
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    }
}
async function waitingForLevelFactor(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        if (!Number.isInteger(collected.first().content)) {
            if (collected.first().content < 10 || collected.first().content > 5000 ) {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum value must not be zero", guildId: interaction.guildId, locale: interaction.locale })} < 10 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 5000`, flags: ["Ephemeral"] })
            } else {
                collected.first().delete().catch(e => null) 
                return +collected.first().content   
            }
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    }
}
async function waitingForCooldown(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        const content = collected.first().content.toLowerCase()
        if (content === "cancel" || content === "skip") {
            collected.first().delete().catch(e => null)
            return false
        }
        const value = +collected.first().content
        if (Number.isNaN(value) || !Number.isInteger(value)) {
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        } else if (value < 0 || value > 86400) {
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 86400`, flags: ["Ephemeral"] })
        } else {
            collected.first().delete().catch(e => null)
            return value
        }
    }
}
async function waitingForShopName(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        }
        if (collected.first().content.length <= 0 || collected.first().content.length > 20 ) {
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Shop name length must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 20`, flags: ["Ephemeral"] })
        } else {
            collected.first().delete().catch(e => null) 
            return collected.first().content   
        }
    }
}
async function waitingForShopThumbnail(client, interaction, filter) {
    while (true) {
        const isImageURL = require('image-url-validator').default;
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content == "delete") {
            collected.first().delete().catch(e => null)
            return "delete"
        }
        if (collected.first().content) {
            const image = await isImageURL(collected.first().content)
            if (image) {
                collected.first().delete().catch(e => null) 
                return collected.first().content
            } else {
                if (collected.first().content.toLowerCase() == "cancel") {
                    collected.first().delete().catch(e => null)
                    return false
                }
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO}${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${collected.first().content}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }    
        } else interaction.followUp({ content: `${client.language({ textId: "Empty string entered", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
    }
}
async function waitingForShopMessage(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        }
        if (collected.first().content <= 0 || collected.first().content > 50 ) {
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Shop message length must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 50`, flags: ["Ephemeral"] })
        } else {
            collected.first().delete().catch(e => null) 
            return collected.first().content   
        }
    }
}
async function waitingForMaxBonus(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        if (Number.isInteger(+collected.first().content)) {
            if (collected.first().content < 0 || collected.first().content > 5000 ) {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 5000`, flags: ["Ephemeral"] })
            } else {
                collected.first().delete().catch(e => null) 
                return +collected.first().content   
            }
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    }
}
async function waitingForLevelFrom(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        if (!isNaN(collected.first().content)) {
            if (collected.first().content <= 0 || collected.first().content > 9999) {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Level must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 9999**`, flags: ["Ephemeral"] })
            } else {
                collected.first().delete().catch(e => null) 
                return +collected.first().content   
            }
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    }
}
async function waitingForLevelTo(client, interaction, filter, levelFrom) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (!isNaN(collected.first().content)) {
            if (collected.first().content > levelFrom) {
                if (collected.first().content > 0 && collected.first().content <= 9999) {
                    collected.first().delete().catch(e => null) 
                    return +collected.first().content  
                } interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Level must not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 9999**`, flags: ["Ephemeral"] })
            } else interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Role removal level must not be less than or equal to role receiving level", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            if (collected.first().content.toLowerCase() == "skip") {
                collected.first().delete().catch(e => null)
                return undefined
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${collected.first().content}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    }
}
async function waitingForMutedChannel(client, interaction, filter, settings) {
    while (true) {
        let collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        } else {
            let channels_string = collected.first().content.replace(/<|#|>/g, "")
            const channels_array = channels_string.split(" ")
            const filtered_channels = []
            for (let chan of channels_array) {
                const channel = await interaction.guild.channels.fetch(chan).catch(e => null)
                if (channel || settings.channels?.mutedChannels.includes(chan)) {
                    if (channel && channel.permissionsFor(interaction.guild.members.me).has("ViewChannel") || settings.channels?.mutedChannels.includes(chan)) {
                        filtered_channels.push(chan)
                    } else if (channel) {
                        interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    }
                } else {
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Channel", guildId: interaction.guildId, locale: interaction.locale })} "${chan}" ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }    
            }
            collected.first().delete().catch(e => null)
            return filtered_channels
        }
    } 
}
async function waitingForMutedRoles(client, interaction, filter, settings) {
    while (true) {
        let collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        } else {
            let roles_string = collected.first().content.replace(/<|@&|>/g, "")
            const roles_array = roles_string.split(" ")
            const filtered_roles = []
            for (let role of roles_array) {
                const guildRole = await interaction.guild.roles.fetch(role).catch(e => null)
                if (guildRole || settings.roles?.mutedRoles.includes(role)) {
                    filtered_roles.push(role)
                } else {
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role with ID", guildId: interaction.guildId, locale: interaction.locale })} **${role}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }    
            }
            collected.first().delete().catch(e => null)
            return filtered_roles
        }
    } 
}
async function waitingForRolesToNewMember(client, interaction, filter, settings) {
    while (true) {
        let collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        } else {
            let roles_string = collected.first().content.replace(/<|@&|>/g, "")
            const roles_array = roles_string.split(" ")
            const filtered_roles = []
            for (let role of roles_array) {
                const guildRole = await interaction.guild.roles.fetch(role).catch(e => null)
                if (guildRole || settings.roles?.rolesToNewMember.includes(role)) {
                    filtered_roles.push(role)
                } else {
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role with ID", guildId: interaction.guildId, locale: interaction.locale })} **${role}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }    
            }
            collected.first().delete().catch(e => null)
            return filtered_roles
        }
    } 
}
async function waitingForRolesToDelete(client, interaction, filter, settings) {
    while (true) {
        let collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        } else {
            let roles_string = collected.first().content.replace(/<|@|&|>/g, "")
            const roles_array = roles_string.split(" ")
            const filtered_roles = []
            for (let role of roles_array) {
                if (settings.levelsRoles.some(e => e.roleId == role)) {
                    filtered_roles.push(role)
                } else {
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} **${role}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }    
            }
            collected.first().delete().catch(e => null)
            return filtered_roles
        }
    } 
}
async function waitingForRoleToAdd(client, interaction, filter, settings) {
    while (true) {
        let collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        } else {
            let role_id = collected.first().content.replace(/<|@|&|>/g, "")
            const guild_role = await interaction.guild.roles.fetch(role_id).catch(e => null)
            if (guild_role) {
                if (!settings.levelsRoles.some(e => e.roleId == guild_role.id)) {
                    if (interaction.guild.members.me.roles.highest.position > guild_role.position) {
                        collected.first().delete().catch(e => null)
                        return guild_role
                    } else interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "I cannot manage role", guildId: interaction.guildId, locale: interaction.locale })} ${guild_role.name}, ${client.language({ textId: "because my role is lower than the role you're trying to add. Move my role to the top of the list", guildId: interaction.guildId, locale: interaction.locale })}.**`, flags: ["Ephemeral"] })
                } else interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ${guild_role.name} ${client.language({ textId: "already exists in level roles list", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })  
            } else interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} **${role_id}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            collected.first().delete().catch(e => null)
        }
    } 
}
async function waitingForRole(client, interaction, filter) {
    while (true) {
        let collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        } else {
            let role_id = collected.first().content.replace(/<|@|&|>/g, "")
            const guild_role = await interaction.guild.roles.fetch(role_id).catch(e => null)
            if (guild_role) {
                if (interaction.guild.members.me.roles.highest.position > guild_role.position) {
                    collected.first().delete().catch(e => null)
                    return guild_role
                } else interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "I cannot manage role", guildId: interaction.guildId, locale: interaction.locale })} ${guild_role.name}, ${client.language({ textId: "because my role is lower than the role you're trying to add. Move my role to the top of the list", guildId: interaction.guildId, locale: interaction.locale })}.**`, flags: ["Ephemeral"] })
            } else interaction.followUp({ content: `${client.config.emojis.NO} Роль **${role_id}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            collected.first().delete().catch(e => null)
        }
    } 
}
async function waitingForJoinToCreateChannel(client, interaction, filter, settings) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        const channel = await interaction.guild.channels.fetch(collected.first().content.replace(/<|#|>/g, "")).catch(e => null)
        if (channel?.type === ChannelType.GuildVoice) {
            if (channel.permissionsFor(interaction.guild.members.me).has("MoveMembers") && channel.permissionsFor(interaction.guild.members.me).has("ManageChannels")) {
                collected.first().delete().catch(e => null) 
                return channel    
            } else {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n> 1. ${client.language({ textId: "Move members", guildId: interaction.guildId, locale: interaction.locale })}\n> 2. ${client.language({ textId: "Manage channels", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            if (collected.first().content.toLowerCase() == "delete") {
                collected.first().delete().catch(e => null)
                return "delete"
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Voice channel not found", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        }
    } 
}
async function waitingForJoinToCreateCategory(client, interaction, filter, settings) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        const channel = await interaction.guild.channels.fetch(collected.first().content.replace(/<|#|>/g, "")).catch(e => null)
        if (channel?.type === ChannelType.GuildCategory) {
            if (channel.permissionsFor(interaction.guild.members.me).has("MoveMembers") && channel.permissionsFor(interaction.guild.members.me).has("ManageChannels")) {
                collected.first().delete().catch(e => null) 
                return channel
            } else {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "I don't have permission for category", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n> 1. ${client.language({ textId: "Move members", guildId: interaction.guildId, locale: interaction.locale })}\n> 2. ${client.language({ textId: "Manage channels", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            if (collected.first().content.toLowerCase() == "delete") {
                collected.first().delete().catch(e => null)
                return "delete"
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} **${client.language({ textId: "Category not found", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        }
    } 
}
async function waitingForChannelId(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        const channel = await interaction.guild.channels.fetch(collected.first().content.replace(/<|#|>/g, "")).catch(e => null)
        if (channel?.type === ChannelType.GuildText || channel?.type === ChannelType.PublicThread || channel?.type === ChannelType.PrivateThread) {
            if (channel.permissionsFor(interaction.guild.members.me).has("ViewChannel") && channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
                collected.first().delete().catch(e => null) 
                return channel
            } else {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Send messages", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
        } else {
            if (collected.first().content.toLowerCase() === "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            if (collected.first().content.toLowerCase() === "delete") {
                collected.first().delete().catch(e => null)
                return "delete"
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Text channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    } 
}
async function waitingForWebhook(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        if (collected.first().content.toLowerCase() == "cancel") {
            collected.first().delete().catch(e => null)
            return false
        }
        if (collected.first().content.toLowerCase() == "delete") {
            collected.first().delete().catch(e => null)
            return "delete"
        }    
        collected.first().delete().catch(e => null) 
        return collected.first().content
    } 
}
async function waitingForRoleId(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        const role = await interaction.guild.roles.fetch(collected.first().content.replace(/<|@&|>/g, "")).catch(e => null)
        if (role) {
            collected.first().delete().catch(e => null) 
            return role
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            if (collected.first().content.toLowerCase() == "delete") {
                collected.first().delete().catch(e => null)
                return "delete"
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    } 
}
async function waitingForMemesChannelId(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        const channel = await interaction.guild.channels.fetch(collected.first().content.replace(/<|#|>/g, "")).catch(e => null)
        if (channel?.type === ChannelType.GuildText || channel?.type === ChannelType.PublicThread) {
            if (channel.permissionsFor(interaction.guild.members.me).has("ViewChannel") && channel.permissionsFor(interaction.guild.members.me).has("AddReactions") && channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory")) {
                collected.first().delete().catch(e => null) 
                return channel
            } else {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: `AddReactions`, guildId: interaction.guildId, locale: interaction.locale })}\n3. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
        } else {
            if (collected.first().content.toLowerCase() == "cancel") {
                collected.first().delete().catch(e => null)
                return false
            }
            if (collected.first().content.toLowerCase() == "delete") {
                collected.first().delete().catch(e => null)
                return "delete"
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Text channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    } 
}
async function waitingForAttachment(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        if (collected.first().attachments.first()) {
            if (collected.first().attachments.first().contentType.includes("image")) {
                if (collected.first().attachments.first().size <= 8388608) {
                    return collected.first().attachments.first()
                } else {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Attachment size must not exceed 8MB", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
            } else {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Attachment must be an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
        } else {
            if (collected.first().content.toLowerCase() == `cancel`) {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "No attachment", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    } 
}