const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputStyle, ModalBuilder, TextInputBuilder, GuildPremiumTier, LabelBuilder } = require("discord.js")
const { RewardType } = require("../enums")
const idRegexp = /id{(.*?)}/
module.exports = {
    name: `createCustomRole`,
    run: async (client, interaction) => {
        const id = idRegexp.exec(interaction.customId)[1]
        const customRole = client.cache.customRoles.get(id)
        if (!customRole) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Role creation request not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const settings = client.cache.settings.get(interaction.guildId)
        if (interaction.customId.includes("accept")) {
            const member = await interaction.guild.members.fetch(customRole.userID).catch(e => null)
            if (member) {
                const position = interaction.guild.roles.cache.get(settings.roles.customRolePosition).position
                const role = await interaction.guild.roles.create({
                    name: customRole.name,
                    color: customRole.color || undefined,
                    reason: 'Custom role',
                    hoist: settings.customRoleHoist,
                    position: position,
                    icon: (interaction.guild.premiumTier === GuildPremiumTier.Tier2 || interaction.guild.premiumTier === GuildPremiumTier.Tier3) && customRole.icon !== customRole.displayIcon ? customRole.iconURL : undefined,
                    unicodeEmoji: (interaction.guild.premiumTier === GuildPremiumTier.Tier2 || interaction.guild.premiumTier === GuildPremiumTier.Tier3) && customRole.icon === customRole.displayIcon ? customRole.icon : undefined
                })
                const profile = await client.functions.fetchProfile(client, customRole.userID, interaction.guildId)
                profile.addRole(role.id, 1, customRole.minutes && customRole.minutes !== Infinity ? customRole.minutes * 60 * 1000 : undefined)
                await profile.save()
                member.send({ embeds: [new EmbedBuilder().setThumbnail(interaction.guild.iconURL()).setColor(3093046).setTitle(interaction.guild.name).setDescription(`${client.language({ textId: "You are allowed to create custom role", guildId: interaction.guildId })}. ${client.language({ textId: "Role", guildId: interaction.guildId })} ${role.name} ${client.language({ textId: "added to inventory (/inventory-roles)", guildId: interaction.guildId })}`)] })
                if (settings.customRoleProperties?.length) {
                    const properties = {}
                    settings.customRoleProperties.forEach(e => properties[e] = true )
                    await new client.rolePropertiesSchema({
                        guildID: interaction.guildId,
                        id: role.id,
                        ...properties
                    }).save()
                }
                customRole.deleteDate = undefined
                customRole.channelId = undefined
                customRole.messageId = undefined
                customRole.roleId = role.id
                customRole.clearTimeoutDelete()
                await customRole.save()    
            } else {
                await customRole.delete()
            }
            return interaction.update({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("0").setDisabled(true).setLabel(`${client.language({ textId: "ALLOWED", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Success))] })
        }
        if (interaction.customId.includes("decline")) {
            const member = await interaction.guild.members.fetch(customRole.userID).catch(e => null)
            if (member) {
                const modal = new ModalBuilder()
                    .setCustomId(`decline_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Rejection", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Reason", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("reason")
                                    .setRequired(true)
                                    .setMaxLength(100)
                                    .setStyle(TextInputStyle.Short)
                            )
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `decline_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                if (interaction) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    member.send({ embeds: [new EmbedBuilder().setThumbnail(interaction.guild.iconURL()).setColor(3093046).setTitle(interaction.guild.name).setDescription(`${client.language({ textId: "You were denied custom role creation, reason", guildId: interaction.guildId })}: **${modalArgs.reason}**`)] })
                } else return
                const profile = await client.functions.fetchProfile(client, customRole.userID, interaction.guildId)
                if (customRole.minutes === Infinity && settings.customRolePrice.length) {
                    for (let item of settings.customRolePrice) {
                        if (item.type === RewardType.Item) {
                            await profile.addItem(item.id, item.amount)
                        }
                        if (item.type === RewardType.Currency) {
                            profile.currency = item.amount
                        }
                        if (item.type === RewardType.Role) {
                            await profile.addRole(item.id, item.amount)
                        }
                        if (item.type === RewardType.Reputation) {
                            await profile.addRp(item.amount)
                        }
                    }
                    await profile.save()    
                }
                if (customRole.minutes !== Infinity && settings.customRolePriceMinute.length) {
                    for (let item of settings.customRolePriceMinute) {
                        if (item.type === RewardType.Item) {
                            await profile.addItem(item.id, item.amount * customRole.minutes)
                        }
                        if (item.type === RewardType.Currency) {
                            profile.currency = item.amount * customRole.minutes
                        }
                        if (item.type === RewardType.Role) {
                            await profile.addRole(item.id, item.amount * customRole.minutes)
                        }
                        if (item.type === RewardType.Reputation) {
                            await profile.addRp(item.amount * customRole.minutes)
                        }
                    }
                    await profile.save()    
                }
            }
            await customRole.delete()
            return interaction.update({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("0").setDisabled(true).setLabel(`${client.language({ textId: "NOT ALLOWED", guildId: interaction.guildId, locale: interaction.locale })}`).setStyle(ButtonStyle.Danger))] })
        }
    }
}