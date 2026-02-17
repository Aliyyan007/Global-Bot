const { InteractionType, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Collection, BaseChannel, Message, EmbedBuilder, LabelBuilder } = require("discord.js")
const ChannelRegexp = /channelId{(.*?)}/
const MessageRegexp = /messageId{(.*?)}/
const PermissionRegexp = /permission{(.*?)}/
module.exports = {
    name: 'say',
    nameLocalizations: {
        'ru': `сказать`,
        'uk': `сказати`,
        'es-ES': `decir`
    },
    description: 'Send message by Global Bot',
    descriptionLocalizations: {
        'ru': `Отправить сообщение от имени Global Bot`,
        'uk': `Надіслати повідомлення від імені Global Bot`,
        'es-ES': `Enviar mensaje como Global Bot`
    },
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    run: async (client, interaction) => {
        let reply = false
        let send = true
        let update = false
        const flags = []
        if (!interaction.channel) return
        if (interaction.isButton()) {
            if (ChannelRegexp.exec(interaction.customId) && !MessageRegexp.exec(interaction.customId)) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Argument channelId must be together with argument messageId", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (!ChannelRegexp.exec(interaction.customId) && MessageRegexp.exec(interaction.customId)) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Argument messageId must be together with argument channelId", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (interaction.customId.includes("reply") && interaction.customId.includes("update")) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Arguments reply and update cannot be together", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (!interaction.customId.includes("reply") && interaction.customId.includes("eph")) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Argument eph can only be together with argument reply", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (interaction.customId.includes("reply")) {
                reply = true
                send = false
            } else if (interaction.customId.includes("update")) {
                update = true
                send = false
            } else if (!interaction.channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) return interaction.reply({ content: `${client.language({ textId: "I don't have permission to send messages in this channel", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            if (PermissionRegexp.exec(interaction.customId)) {
                const permission = client.cache.permissions.find(e => e.id === PermissionRegexp.exec(interaction.customId)[1] && e.guildID === interaction.guildId)
                if (!permission) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Unknown permission set for this command", guildId: interaction.guildId, locale: interaction.locale })}: ${PermissionRegexp.exec(interaction.customId)[1]}`, flags: ["Ephemeral"] })
                }
                const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
            if (interaction.customId.includes("eph")) flags.push("Ephemeral")
            if (ChannelRegexp.exec(interaction.customId) && MessageRegexp.exec(interaction.customId)) {
                const channelID = ChannelRegexp.exec(interaction.customId)[1]
                const messageID = MessageRegexp.exec(interaction.customId)[1]
                const channel = await interaction.guild.channels.fetch(channelID).catch(e => null)
                if (!channel || !(channel instanceof BaseChannel)) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Channel with ID", guildId: interaction.guildId, locale: interaction.locale })} ${channelID} ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                if (!channel.messages) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channelID}> ${client.language({ textId: "cannot have messages", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const message = await channel.messages.fetch(messageID).catch(e => null)
                if (!message || !(message instanceof Message)) {
                    return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Message with ID", guildId: interaction.guildId, locale: interaction.locale })} ${messageID} ${client.language({ textId: "not found in channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channelID}>`, flags: ["Ephemeral"] })
                }
                if (reply) {
                    return interaction.reply({ content: message.content, embeds: message.embeds, components: message.components, files: message.attachments.map(e => e), flags })
                } else if (update) {
                    return interaction.update({ content: message.content, embeds: message.embeds, components: message.components, files: message.attachments.map(e => e) })
                } else {
                    interaction.deferUpdate()
                    return interaction.channel.send({ content: message.content, embeds: message.embeds, components: message.components, files: message.attachments.map(e => e) })
                }
            }
        }
        if (!interaction.channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) return interaction.reply({ content: `${client.language({ textId: "I don't have permission to send messages in this channel", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        const modal = new ModalBuilder()
            .setCustomId(`say_${interaction.id}`)
            .setTitle(`${client.language({ textId: "Send message to channel", guildId: interaction.guildId, locale: interaction.locale })}`)
            .addLabelComponents([
                new LabelBuilder()
                    .setLabel(`${client.language({ textId: "Message", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId("message")
                            .setRequired(true)
                            .setStyle(TextInputStyle.Paragraph)
                    )
            ])
        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
        const filter = (i) => i.customId === `say_${interaction.id}` && i.user.id === interaction.user.id
        interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
        if (interaction && interaction.type === InteractionType.ModalSubmit) {
            const modalArgs = {}
            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
            let error = false
            const channelId = modalArgs.message.split("/")[5]
            const messageId = modalArgs.message.split("/")[6]
            if (channelId && messageId) {
                const channel = await interaction.guild.channels.fetch(channelId).catch(e => null)
                if (channel && channel instanceof BaseChannel) {
                    if (channel.messages) {
                        const message = await channel.messages.fetch({ message: messageId }).catch(e => null)
                        if (message && message instanceof Message) {
                            if (reply) {
                                return interaction.reply({ content: message.content, embeds: message.embeds, components: message.components, files: message.attachments.map(e => e), flags })
                            } else if (update) {
                                return interaction.update({ content: message.content, embeds: message.embeds, components: message.components, files: message.attachments.map(e => e) })
                            } else await interaction.channel.send({ content: message.content, embeds: message.embeds, components: message.components, files: message.attachments.map(e => e) }).catch(async (e) => {
                                error = true
                                return await interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Message not sent. Error", guildId: interaction.guildId, locale: interaction.locale })}:\n${e}`, flags: ["Ephemeral"] })
                            })
                            if (!error) return interaction.deferUpdate()
                        }    
                    }
                }
            }
            if (reply) {
                return interaction.reply({ content: modalArgs.message, flags })
            } else if (update) {
                return interaction.update({ content: modalArgs.message, embeds: [], components: [], files: [] })
            } else await interaction.channel.send({ content: modalArgs.message }).catch(async (e) => {
                error = true
                return await interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Message not sent. Error", guildId: interaction.guildId, locale: interaction.locale })}:\n${e}`, flags: ["Ephemeral"] })
            })
            if (!error) return interaction.deferUpdate()
        }
    }
}