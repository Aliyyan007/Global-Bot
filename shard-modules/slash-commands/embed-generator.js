const { ChannelType, ButtonStyle, InteractionType, AttachmentBuilder, TextInputBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ModalBuilder, TextInputStyle, StringSelectMenuInteraction, Client, PermissionFlagsBits, Collection, ChannelSelectMenuBuilder, LabelBuilder } = require("discord.js")
const FieldRegexp = /field{(.*?)}/
const EmbedRegexp = /embed{(.*?)}/
const UserRegexp = /usr{(.*?)}/
module.exports = {
    name: "embed-generator",
    nameLocalizations: {
        "ru": 'эмбед-генератор',
        "uk": 'генератор-ембедів',
        "es-ES": 'generador-de-embed'
    },
    description: `Embed generator`,
    descriptionLocalizations: {
        "ru": `Генератор эмбедов`,
        "uk": `Генератор ембедів`,
        "es-ES": `Generador de embeds`
    },
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    /**
     * @param { Client } client
     * @param { StringSelectMenuInteraction || ChannelSelectMenuBuilder } interaction
     */
    run: async (client, interaction) => {
        let embedIndex = interaction.isChatInputCommand() ? 0 : EmbedRegexp.exec(interaction.customId) ? Number(EmbedRegexp.exec(interaction.customId)[1]) : 0
        let fieldIndex = interaction.isChatInputCommand() ? 0 : FieldRegexp.exec(interaction.customId) ? Number(FieldRegexp.exec(interaction.customId)[1]) : 0
        const embed_options = [
            { label: `${client.language({ textId: "Content", guildId: interaction.guildId, locale: interaction.locale })}`, value: `content`, emoji: client.config.emojis.edit },
            { label: `${client.language({ textId: "Description, title, title URL, color", guildId: interaction.guildId, locale: interaction.locale })}`, value: `body`, emoji: client.config.emojis.edit },
            { label: `${client.language({ textId: "Thumbnail, image", guildId: interaction.guildId, locale: interaction.locale })}`, value: `images`, emoji: client.config.emojis.edit },
            { label: `${client.language({ textId: "Header", guildId: interaction.guildId, locale: interaction.locale })}`, value: `author`, emoji: client.config.emojis.edit },
            { label: `${client.language({ textId: "Footer", guildId: interaction.guildId, locale: interaction.locale })}`, value: `footer`, emoji: client.config.emojis.edit },
        ]
        const embed = new EmbedBuilder().setColor("#2F3236")
        const sendEmbedBTN = new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} send`)
            .setLabel(`${client.language({ textId: "Send message", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setEmoji(client.config.emojis.send)
            .setStyle(ButtonStyle.Secondary)
        const editEmbedBTN = new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} edit`)
            .setEmoji(client.config.emojis.edit)
            .setLabel(`${client.language({ textId: "Edit message", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setStyle(ButtonStyle.Secondary)
        const copyEmbedBTN = new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} copy_json`)
            .setEmoji(client.config.emojis.copy)
            .setLabel(`${client.language({ textId: "Copy JSON", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setStyle(ButtonStyle.Secondary)
        const pasteEmbedBTN = new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} paste`)
            .setEmoji(client.config.emojis.paste)
            .setLabel(`${client.language({ textId: "Paste JSON", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setStyle(ButtonStyle.Secondary)
        const copyMessageBTN = new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} copy_message`)
            .setEmoji(client.config.emojis.copy)
            .setLabel(`${client.language({ textId: "Copy message", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setStyle(ButtonStyle.Secondary)
        const tools_row = new ActionRowBuilder().addComponents([sendEmbedBTN, editEmbedBTN, copyMessageBTN, copyEmbedBTN, pasteEmbedBTN])
        if (interaction.isChatInputCommand()) {
            embed.setDescription(`${client.language({ textId: "Embed", guildId: interaction.guildId, locale: interaction.locale })} 1`)
            embed_options.push({ label: `${client.language({ textId: "Add field", guildId: interaction.guildId, locale: interaction.locale })}`, value: `AddField`, emoji: client.config.emojis.plus })
            embed_options.push({ label: `${client.language({ textId: "Add embed", guildId: interaction.guildId, locale: interaction.locale })}`, value: `AddEmbed`, emoji: client.config.emojis.plus })
            const select_embed = [{ label: `${client.language({ textId: "Embed", guildId: interaction.guildId, locale: interaction.locale })} 1`, value: `1`, default: true }]
            const first_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}} selectEmbed`).addOptions(select_embed)])
            const second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}}`).addOptions(embed_options)])
            return interaction.reply({ embeds: [embed], components: [first_row, second_row, tools_row] })
        }
        if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.reply({ content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        if (interaction.customId.includes("selectEmbed")) {
            embedIndex = +interaction.values[0]
            fieldIndex = 0
        }
        if (interaction.customId.includes("selectField")) {
            fieldIndex = +interaction.values[0]
        }
        if (interaction.customId.includes("send")) {
            const components = JSON.parse(JSON.stringify(interaction.message.components))
            interaction.message.components.forEach(row => row.components.forEach(component => {
                component.data.disabled = true
            }))
            await interaction.update({ components: interaction.message.components })
            await interaction.followUp({ 
                content: `${client.language({ textId: "Select channel for message", guildId: interaction.guildId, locale: interaction.locale })}`,
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ChannelSelectMenuBuilder()
                                .setCustomId(`embed-generator_channel_select`)
                                .setChannelTypes(ChannelType.AnnouncementThread, ChannelType.GuildAnnouncement, ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PrivateThread, ChannelType.PublicThread)
                        ),
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`embed-generator_channel_cancel`)
                                .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                .setStyle(ButtonStyle.Danger)
                        )
                ],
                flags: ["Ephemeral"]
            })    
            const filter = (i) => i.customId.includes(`embed-generator_channel`) && i.user.id === interaction.user.id
            const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
            if (interaction2) {
                if (interaction2.customId === "embed-generator_channel_select") {
                    const channel = interaction2.channels.first()
                    if (channel.permissionsFor(interaction.guild.members.me).has(`ViewChannel`) && channel.permissionsFor(interaction.guild.members.me).has(`SendMessages`)) {
                        const message = await channel.send({ content: interaction.message.content || " ", embeds: interaction.message.embeds })
                        interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Message sent", guildId: interaction.guildId, locale: interaction.locale })}: ${message.url}`, components: [] })
                        return interaction.editReply({ components: components })
                    } else {
                        interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Send messages", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        return interaction.editReply({ components: components })
                    }
                }
                if (interaction2.customId === "embed-generator_channel_cancel") {
                    interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                    return interaction.editReply({ components: components })
                }
            }
        }
        if (interaction.customId.includes("edit")) {
            const modal = new ModalBuilder()
                .setCustomId(`embed-generator_edit_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Edit message", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Message Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("link")
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        ),
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `embed-generator_edit_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                const channelId = modalArgs.link.split("/")[5]
                const messageId = modalArgs.link.split("/")[6]
                if (!channelId || !messageId) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Invalid message link", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                const channel = await interaction.guild.channels.fetch(channelId).catch(e => null)
                if (!channel) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Text channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (!channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory") || !channel.permissionsFor(interaction.guild.members.me).has("ViewChannel") || !channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}\n3. ${client.language({ textId: "Send messages", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const message = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
                if (!message) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (message.author.id !== client.user.id) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This is not my message", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                await message.edit({ content: interaction.message.content, embeds: interaction.message.embeds })
                return interaction.deferUpdate()
            } else return
        }
        if (interaction.customId.includes("copy_json")) {
            const json = []
            for (const embed of interaction.message.embeds) {
                json.push(embed.toJSON())  
            }
            const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(json, null, 2), 'utf-8'), { name: `${interaction.message.id}.json` })
            return interaction.reply({ files: [attachment], flags: ["Ephemeral"] })
        }
        let message = interaction.message
        let content = message.content
        if (interaction.customId.includes("copy_message")) {
            const modal = new ModalBuilder()
                .setCustomId(`embed-generator_copy_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Copy message", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Message Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("link")
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        ),
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `embed-generator_copy_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                const channelId = modalArgs.link.split("/")[5]
                const messageId = modalArgs.link.split("/")[6]
                if (!channelId || !messageId) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Invalid message link", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                const channel = await interaction.guild.channels.fetch(channelId).catch(e => null)
                if (!channel) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Text channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (!channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory") || !channel.permissionsFor(interaction.guild.members.me).has("ViewChannel")) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                message = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
                if (!message) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                await interaction.deferUpdate()
            } else return
        }
        let embeds = message.embeds.map(embed => EmbedBuilder.from(embed))
        if (interaction.customId.includes("paste")) {
            if (!interaction.channel.permissionsFor(interaction.guild.members.me).has("ViewChannel") || !interaction.channel.permissionsFor(interaction.guild.members.me).has("ReadMessageHistory")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${interaction.channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            const components = JSON.parse(JSON.stringify(message.components))
            await interaction.update({ embeds: message.embeds, components: [] })
            const filter = m => m.author.id == interaction.user.id && m.channel.id == interaction.channel.id
            const message1 = await interaction.followUp({ content: `${client.config.emojis.exc} ${client.language({ textId: "Send file in embed JSON format", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel type", guildId: interaction.guildId, locale: interaction.locale })}: cancel` })
            const attachment = await waitingForAttachment(client, interaction, filter)
            message1.delete().catch(e => null)
            if (attachment) {
                const fetch = require("node-fetch")
                await fetch(attachment.url)
                .then(res => res.buffer())
                .then(buffer => {
                    let parsed
                    try {
                        parsed = JSON.parse(buffer.toString())
                    } catch (err) {
                        interaction.editReply({ embeds: message.embeds, components: components })
                        return interaction.followUp({ content: err.message, flags: ["Ephemeral"] })
                    }
                    if (Array.isArray(parsed)) embeds = parsed.map(embed => EmbedBuilder.from(embed))
                    else embeds = [EmbedBuilder.from(parsed)]
                    embedIndex = 0
                    fieldIndex = 0
                })
            } else return interaction.editReply({ embeds: message.embeds, components: components })
        }
        if (!message.embeds[embedIndex]) return interaction.reply({ content: `${client.language({ textId: "Embed with index", guildId: interaction.guildId, locale: interaction.locale })} ${embedIndex} ${client.language({ textId: "missing", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        if (interaction.isStringSelectMenu()) {
            if (interaction.values[0] == "AddEmbed") {
                const embed = new EmbedBuilder().setDescription(`${client.language({ textId: "Embed", guildId: interaction.guildId, locale: interaction.locale })} ${message.embeds.length + 1}`).setColor("#2F3236")
                embeds.push(embed) 
            }
            if (interaction.values[0] == "DelEmbed") {
                embeds.splice(embedIndex, 1)
                embedIndex = embedIndex === 0 ? 0 : embedIndex - 1
            }
            if (interaction.values[0] === "content") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}} content`)
                    .setTitle(`${client.language({ textId: "Message content", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Text", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("content")
                                    .setRequired(false)
                                    .setMaxLength(2000)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(content || "")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}} content` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (modalArgs.content.length) content = modalArgs.content
                    else content = null
                } else return
            } else
            if (interaction.values[0] === "body") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} body`)
                    .setTitle(`${client.language({ textId: "Embed body", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Title", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("title")
                                    .setRequired(false)
                                    .setMaxLength(256)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.title || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: `Title URL`, guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("url")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(embeds[embedIndex].data.url || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("description")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.description?.slice(0, 4000) || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Border color", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("color")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${embeds[embedIndex].data.color?.toString(16)}` || "")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} body` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!modalArgs.description.length && !modalArgs.title.length && !embeds[embedIndex].data.author && !embeds[embedIndex].data.footer && !embeds[embedIndex].data.fields?.[0] && !embeds[embedIndex].data.image && !embeds[embedIndex].data.thumbnail) {
                        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.description.length) embeds[embedIndex].setDescription(modalArgs.description)
                        else embeds[embedIndex].data.description = null
                        if (modalArgs.title.length) embeds[embedIndex].setTitle(modalArgs.title)
                        else embeds[embedIndex].data.title = null
                        if (modalArgs.url.length) {
                            const validUrl = require('valid-url')
                            if (validUrl.isUri(modalArgs.url)) embeds[embedIndex].setURL(modalArgs.url)
                            else {
                                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.url}** ${client.language({ textId: "is not a link", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }  
                        } else embeds[embedIndex].data.url = null
                        if (modalArgs.color) {
                            if (modalArgs.color.length && /^#[0-9A-F]{6}$/i.test(modalArgs.color)) embeds[embedIndex].setColor(modalArgs.color)
                            else embeds[embedIndex].setColor("#2F3236")
                        } else embeds[embedIndex].setColor("#2F3236")
                    }
                } else return
            } else
            if (interaction.values[0] === "images") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} images`)
                    .setTitle(`${client.language({ textId: "Images", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("thumbnail")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.thumbnail?.url || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("image")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.image?.url || "")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} images` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!embeds[embedIndex].data.footer && !embeds[embedIndex].data.title && !embeds[embedIndex].data.author && !embeds[embedIndex].data.description && !embeds[embedIndex].data.fields?.[0] && !modalArgs.image && !modalArgs.thumbnail) {
                        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.thumbnail.length) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.thumbnail)
                            if (image) embeds[embedIndex].setThumbnail(modalArgs.thumbnail)
                            else {
                                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.thumbnail}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                        } else embeds[embedIndex].data.thumbnail = null
                        if (modalArgs.image.length) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.image)
                            if (image) embeds[embedIndex].setImage(modalArgs.image)
                            else {
                                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.image}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                        } else embeds[embedIndex].data.image = null    
                    }
                } else return
            } else
            if (interaction.values[0] === "author") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} author`)
                    .setTitle(`${client.language({ textId: "Header", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Header - Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(256)
                                    .setValue(embeds[embedIndex].data.author?.name || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Header - Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("icon")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.author?.iconURL || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("url")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(embeds[embedIndex].data.author?.url || "")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} author` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!modalArgs.name.length && !embeds[embedIndex].data.title && !embeds[embedIndex].data.footer && !embeds[embedIndex].data.description && !embeds[embedIndex].data.fields?.[0] && !embeds[embedIndex].data.image && !embeds[embedIndex].data.thumbnail) {
                        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.name.length) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.icon)
                            const validUrl = require('valid-url')
                            const object = {}
                            object["name"] = modalArgs.name
                            if (image) object["iconURL"] = modalArgs.icon
                            else if (modalArgs.icon.length && embeds[embedIndex].data.author?.icon_url) object["iconURL"] = embeds[embedIndex].data.author.icon_url
                            if (validUrl.isUri(modalArgs.url)) object["url"] = modalArgs.url
                            else if (modalArgs.url.length && embeds[embedIndex].data.author?.url) object["url"] = embeds[embedIndex].data.author.url
                            embeds[embedIndex].setAuthor(object) 
                        } else embeds[embedIndex].setAuthor(null)
                    }
                } else return
            } else
            if (interaction.values[0] === "footer") {
                const { format } = require('date-format-parse')
                const { parse } = require('date-format-parse')
                const date = format(new Date(embeds[embedIndex].data.timestamp), 'DD-MM-YYYY HH:mm')
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} footer`)
                    .setTitle(`${client.language({ textId: "Footer", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Footer - Text", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("text")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(2048)
                                    .setValue(embeds[embedIndex].data.footer?.text || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Footer - Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("icon")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.footer?.iconURL || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Timestamp", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("timestamp")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(embeds[embedIndex].data.timestamp ? date : "")
                                    .setPlaceholder("28-07-2022 16:57")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} footer` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!modalArgs.text.length && !embeds[embedIndex].data.title && !embeds[embedIndex].data.author && !embeds[embedIndex].data.description && !embeds[embedIndex].data.fields?.[0] && !embeds[embedIndex].data.image && !embeds[embedIndex].data.thumbnail) {
                        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.text.length) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.icon)
                            const validUrl = require('valid-url')
                            const object = {}
                            object["text"] = modalArgs.text
                            if (image) object["iconURL"] = modalArgs.icon
                            else if (modalArgs.icon.length && embeds[embedIndex].data.footer?.icon_url) object["iconURL"] = embeds[embedIndex].data.footer.icon_url
                            const date = parse(modalArgs.timestamp, 'DD-MM-YYYY HH:mm')
                            if(!isNaN(date.getTime())) embeds[embedIndex].setTimestamp(date)
                            else embeds[embedIndex].setTimestamp(null)
                            embeds[embedIndex].setFooter(object) 
                        } else {
                            const date = parse(modalArgs.timestamp, 'DD-MM-YYYY HH:mm')
                            if(!isNaN(date.getTime())) embeds[embedIndex].setTimestamp(date)
                            else embeds[embedIndex].setTimestamp(null)
                            embeds[embedIndex].setFooter(null)
                        }
                    }
                } else return
            } else
            if (interaction.values[0] === "AddField") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} addField`)
                    .setTitle(`${client.language({ textId: "Add field", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(256)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Value", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("value")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(1024)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "In one line", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("inline")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("false")
                                    .setPlaceholder(`true || false`)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} addField` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    embeds[embedIndex].addFields([
                        { name: modalArgs.name, value: modalArgs.value, inline: modalArgs.inline === "true" ? true : false }
                    ])
                } else return
            } else
            if (interaction.values[0] === "DelField") {
                if (!embeds[embedIndex].data.footer && !embeds[embedIndex].data.title && !embeds[embedIndex].data.author && !embeds[embedIndex].data.description && embeds[embedIndex].data.fields?.length === 1 && !embeds[embedIndex].data.image && !embeds[embedIndex].data.thumbnail) {
                    if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                    await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                } else {
                    embeds[embedIndex].spliceFields(fieldIndex, 1)
                    fieldIndex = fieldIndex > 0 ? fieldIndex - 1 : 0
                }
            } else
            if (interaction.values[0] === "editField") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} editField`)
                    .setTitle(`${client.language({ textId: "Change field", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(256)
                                    .setValue(embeds[embedIndex].data.fields?.[fieldIndex].name || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Value", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("value")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(1024)
                                    .setValue(embeds[embedIndex].data.fields?.[fieldIndex].value || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "In one line", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("inline")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setMinLength(4)
                                    .setMaxLength(5)
                                    .setValue(`${embeds[embedIndex].data.fields?.[fieldIndex].inline || "false"}`)
                                    .setPlaceholder(`true || false`)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} editField` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    embeds[embedIndex].data.fields[fieldIndex].name = modalArgs.name
                    embeds[embedIndex].data.fields[fieldIndex].value = modalArgs.value
                    embeds[embedIndex].data.fields[fieldIndex].inline = modalArgs.inline === "true" ? true : false
                } else return
            }    
        }
        if (!embeds[embedIndex].data.fields || embeds[embedIndex].data.fields.length < 25) embed_options.push({ label: `${client.language({ textId: "Add field", guildId: interaction.guildId, locale: interaction.locale })}`, value: `AddField`, emoji: client.config.emojis.plus })
        if (embeds[embedIndex].data.fields?.length >= 1) embed_options.push({ label: `${client.language({ textId: "Change field", guildId: interaction.guildId, locale: interaction.locale })}`, value: `editField`, emoji: client.config.emojis.edit })
        if (embeds[embedIndex].data.fields?.length >= 1) embed_options.push({ label: `${client.language({ textId: "Delete field", guildId: interaction.guildId, locale: interaction.locale })}`, value: `DelField`, emoji: client.config.emojis.minus })
        if (embeds.length < 10) embed_options.push({ label: `${client.language({ textId: "Add embed", guildId: interaction.guildId, locale: interaction.locale })}`, value: `AddEmbed`, emoji: client.config.emojis.plus })
        if (embeds.length > 1) embed_options.push({ label: `${client.language({ textId: "Delete embed", guildId: interaction.guildId, locale: interaction.locale })}`, value: `DelEmbed`, emoji: client.config.emojis.minus })
        const select_embed = []
        let index = 0
        for (const embed of embeds) {
            select_embed.push({ label: `${client.language({ textId: "Embed", guildId: interaction.guildId, locale: interaction.locale })} ${index + 1}`, value: `${index}`, default: embedIndex === index })
            index++  
        }
        const first_row = new ActionRowBuilder()
            .addComponents([new StringSelectMenuBuilder()
            .setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}} selectEmbed`)
            .addOptions(select_embed)])
        const second_row = new ActionRowBuilder()
            .addComponents([new StringSelectMenuBuilder()
            .setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}}`)
            .addOptions(embed_options)])
        const components = []
        components.push(first_row)
        if (embeds[embedIndex].data.fields?.length) {
            const select_field = []
            let index = 0
            for (const field of embeds[embedIndex].data.fields) {
                select_field.push({ label: `${client.language({ textId: "Field", guildId: interaction.guildId, locale: interaction.locale })} ${index + 1}`, value: `${index}`, default: fieldIndex === index })    
                index++
            }
            const third_row = new ActionRowBuilder()
                .addComponents([new StringSelectMenuBuilder()
                .setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}} selectField`)
                .addOptions(select_field)])
            components.push(third_row)
        }
        components.push(second_row)
        const length = embeds.reduce((acc, embed) => {
            embed.data.description ? acc += embed.data.description.length : acc += 0
            embed.data.title ? acc += embed.data.title.length : acc += 0
            embed.data.author ? acc += embed.data.author.name?.length : acc += 0
            embed.data.footer ? acc += embed.data.footer.text?.length : acc += 0
            return embed.data.fields ? acc += embed.data.fields.reduce((acc2, field) => {
            return acc2 += field.name?.length + field.value?.length
            }, 0) : acc += 0
        }, 0)
        if (length >= 6000) {
            if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
            return interaction.followUp({ content: `${client.language({ textId: "Total characters in all Title, Description, Field-name, Field-value, Footer and Header fields in all embeds attached to message must not exceed 6000 characters.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        components.push(tools_row)
        if (interaction.replied || interaction.deferred) return interaction.editReply({ content: content || " ", embeds: embeds, components: components })
        else return interaction.update({ content: content || " ", embeds: embeds, components: components })
    }
}
async function waitingForAttachment(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 })
        if (!collected.size) return false
        if (collected.first().attachments.first()) {
            if (collected.first().attachments.first().contentType.includes("application/json")) {
                if (collected.first().attachments.first().size <= 8388608) {
                    return collected.first().attachments.first()
                } else {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Attachment size must not exceed 8MB", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
            } else {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Attachment format must be .json", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
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