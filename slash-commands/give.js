const { Collection, ActionRowBuilder, StringSelectMenuBuilder, RoleSelectMenuBuilder, UserSelectMenuBuilder, ModalBuilder, TextInputStyle, TextInputBuilder, LabelBuilder } = require("discord.js")
const { AchievementType } = require("../enums")
const loading = new Collection()
module.exports = {
    name: 'give',
    nameLocalizations: {
        'ru': `выдать`,
        'uk': `видати`,
        'es-ES': `dar`
    },
    description: 'Give level, season level, XP, currency, likes, RP, role',
    descriptionLocalizations: {
        'ru': `Выдать уровень, сезонный уровень, опыт, валюту, лайки, репутацию, роль`,
        'uk': `Видати рівень, сезонний рівень, досвід, валюту, лайки, репутацію, роль`,
        'es-ES': `Dar nivel, nivel de temporada, XP, moneda, likes, reputación, rol`
    },
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        const settings = client.cache.settings.get(interaction.guildId)
        await interaction.reply({ 
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`give`)
                            .setPlaceholder(`${client.language({ textId: "Give", guildId: interaction.guildId, locale: interaction.locale })}...`)
                            .setOptions([
                                {
                                    emoji: client.config.emojis.XP,
                                    label: `${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    value: `experience`
                                },
                                {
                                    emoji: `🎖`,
                                    label: `${client.language({ textId: "Level", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    value: `level`
                                },
                                {
                                    emoji: client.config.emojis.seasonLevel,
                                    label: `${client.language({ textId: "Season level", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    value: `season_level`
                                },
                                {
                                    emoji: client.config.emojis.RP,
                                    label: `${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    value: `reputation`
                                },
                                {
                                    emoji: settings.displayCurrencyEmoji,
                                    label: settings.currencyName,
                                    value: `currency`
                                },
                                {
                                    emoji: client.config.emojis.heart,
                                    label: `${client.language({ textId: "Like", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    value: `likes`
                                },
                                {
                                    emoji: client.config.emojis.roles,
                                    label: `${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    description: `${client.language({ textId: "In /inventory-roles", guildId: interaction.guildId, locale: interaction.locale })}`,
                                    value: `role`
                                }
                            ])
                    )
            ],
            flags: ["Ephemeral"]
        })    
        let filter = (i) => i.customId.includes(`give`) && i.user.id === interaction.user.id
        interaction = await interaction.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
        if (interaction) {
            args.Subcommand = interaction.values[0]
        } else return
        if (args.Subcommand === "role") {
            await interaction.update({ 
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new RoleSelectMenuBuilder()
                                .setCustomId(`give-role`)
                                .setPlaceholder(`${client.language({ textId: "Give role", guildId: interaction.guildId, locale: interaction.locale })}...`)
                        )
                ],
                flags: ["Ephemeral"]
            })    
            filter = (i) => i.customId.includes(`give-role`) && i.user.id === interaction.user.id
            interaction = await interaction.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
            if (interaction) {
                args.role = interaction.values[0]
            } else return
        }
        const modal = new ModalBuilder()
            .setCustomId(`give_amount_${interaction.id}`)
            .setTitle(args.Subcommand === "experience" ? client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale }) : args.Subcommand === "level" ? client.language({ textId: `Level`, guildId: interaction.guildId, locale: interaction.locale }) : args.Subcommand === "season_level" ? client.language({ textId: `Season level`, guildId: interaction.guildId, locale: interaction.locale }) : args.Subcommand === "reputation" ? client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale }) : args.Subcommand === "currency" ? settings.currencyName : args.Subcommand === "likes" ? client.language({ textId: `Like`, guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: `Role`, guildId: interaction.guildId, locale: interaction.locale }))
            .setLabelComponents([
                new LabelBuilder()
                    .setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId("amount")
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    ),
                args.Subcommand === "role" ?
                new LabelBuilder()
                    .setLabel(`${client.language({ textId: `Time in minutes if temporary role`, guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId("time")
                            .setRequired(false)
                            .setStyle(TextInputStyle.Short)
                    ) :
                undefined
            ].filter(e => e))
        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
        filter = (i) => i.customId === `give_amount_${interaction.id}` && i.user.id === interaction.user.id
        interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => null)
        if (interaction && interaction.isModalSubmit()) {
            const modalArgs = {}
            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
            if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
                return interaction.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: `Restart the command`, guildId: interaction.guildId, locale: interaction.locale })} </give:1150455841779105909>`, components: [], flags: ["Ephemeral"] })
            }
            if (args.Subcommand === "level" || args.Subcommand === "season_level") {
                if (+modalArgs.amount < 1 || +modalArgs.amount > 100) {
                    return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: `Number should not be`, guildId: interaction.guildId, locale: interaction.locale })} < 1 ${client.language({ textId: `or`, guildId: interaction.guildId, locale: interaction.locale })} > 100\n${client.language({ textId: `Restart the command`, guildId: interaction.guildId, locale: interaction.locale })} </give:1150455841779105909>`, components: [], flags: ["Ephemeral"] })
                }
            }
            if (args.Subcommand === "likes" || args.Subcommand === "reputation") {
                if (+modalArgs.amount < 1 || +modalArgs.amount > 1000) {
                    return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: `Number should not be`, guildId: interaction.guildId, locale: interaction.locale })} < 1 ${client.language({ textId: `or`, guildId: interaction.guildId, locale: interaction.locale })} > 1000\n${client.language({ textId: `Restart the command`, guildId: interaction.guildId, locale: interaction.locale })} </give:1150455841779105909>`, components: [], flags: ["Ephemeral"] })
                }
            }
            if (args.Subcommand === "experience" || args.Subcommand === "role") {
                if (+modalArgs.amount < 1 || +modalArgs.amount > 100000) {
                    return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: `Number should not be`, guildId: interaction.guildId, locale: interaction.locale })} < 1 ${client.language({ textId: `or`, guildId: interaction.guildId, locale: interaction.locale })} > 100000\n${client.language({ textId: `Restart the command`, guildId: interaction.guildId, locale: interaction.locale })} </give:1150455841779105909>`, components: [], flags: ["Ephemeral"] })
                }
            }
            if (args.Subcommand === "currency") {
                if (+modalArgs.amount < 1 || +modalArgs.amount > 1000000000) {
                    return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: `Number should not be`, guildId: interaction.guildId, locale: interaction.locale })} < 1 ${client.language({ textId: `or`, guildId: interaction.guildId, locale: interaction.locale })} > 1000000000\n${client.language({ textId: `Restart the command`, guildId: interaction.guildId, locale: interaction.locale })} </give:1150455841779105909>`, components: [], flags: ["Ephemeral"] })
                }
            }
            if (args.Subcommand === "role" && modalArgs.time) {
                if (isNaN(+modalArgs.time) || !Number.isInteger(+modalArgs.time)) {
                    return interaction.update({ content: `${client.config.emojis.NO} **${modalArgs.time}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: `Restart the command`, guildId: interaction.guildId, locale: interaction.locale })} </give:1150455841779105909>`, components: [], flags: ["Ephemeral"] })
                }
                if (+modalArgs.time < 1) {
                    return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: `Number should not be`, guildId: interaction.guildId, locale: interaction.locale })} < 1\n${client.language({ textId: `Restart the command`, guildId: interaction.guildId, locale: interaction.locale })} </give:1150455841779105909>`, components: [], flags: ["Ephemeral"] })
                }
                args.time = +modalArgs.time
            }
            args.amount = +modalArgs.amount
        } else return
        let values
        await interaction.update({ 
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId(`give-to-user`)
                            .setMaxValues(25)
                            .setPlaceholder(`${client.language({ textId: "Give to users", guildId: interaction.guildId, locale: interaction.locale })}...`)
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new RoleSelectMenuBuilder()
                            .setCustomId(`give-to-role`)
                            .setMaxValues(25)
                            .setPlaceholder(`${client.language({ textId: "Give to users with role", guildId: interaction.guildId, locale: interaction.locale })}...`)
                    )
            ],
            flags: ["Ephemeral"]
        })    
        filter = (i) => i.customId.includes(`give-to`) && i.user.id === interaction.user.id
        interaction = await interaction.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
        if (interaction) {
            values = interaction.values
            if (interaction.customId === "give-to-user") args.SubcommandGroup = "to-user"
            if (interaction.customId === "give-to-role") {
                if (loading.has(interaction.guildId)) {
                    const process = loading.get(interaction.guildId)
                    return interaction.update({ content: `→ ${client.language({ textId: "Already giving process in progress", guildId: interaction.guildId, locale: interaction.locale })} ${process.first().item}:\n${process.map(e => `${e.count === e.membersSize ? client.config.emojis.YES : "⏳"} <@&${e.id}> (\`${e.count}\`/${e.membersSize === undefined ? "⏳" : `\`${e.membersSize}\``} \`${e.membersSize !== undefined ? Math.floor(e.count/e.membersSize*100) : 0}%\`)`).join("\n")}`, components: [] })
                }
                args.SubcommandGroup = "to-role"
            }
        } else return
        let reward
        if (args.Subcommand === "level") {
            reward = `🎖${client.language({ textId: "Level", guildId: interaction.guildId, locale: interaction.locale })}`
        }
        if (args.Subcommand === "season_level") {
            reward = `${client.config.emojis.seasonLevel}${client.language({ textId: "Season level", guildId: interaction.guildId, locale: interaction.locale })}`
        }
        if (args.Subcommand === "experience") {
            reward = `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}`
        }
        if (args.Subcommand === "reputation") {
            reward = `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`
        }
        if (args.Subcommand === "currency") {
            const settings = client.cache.settings.get(interaction.guildId)
            reward = `${settings.displayCurrencyEmoji}${settings.currencyName}`
        }
        if (args.Subcommand === "likes") {
            reward = `${client.config.emojis.heart}`
        }
        if (args.Subcommand === "role") {
            reward = `${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${args.role}>`
        }
        let response
        if (args.SubcommandGroup === "to-user") {
            response = [`${reward} (${args.amount.toLocaleString()}) ${client.language({ textId: "added to users", guildId: interaction.guildId, locale: interaction.locale })}:`]
            await Promise.all(values.map(async id => {
                const member = await interaction.guild.members.fetch(id).catch(e => null)
                if (!member) response.push(`${client.config.emojis.NO} ${client.language({ textId: "User with ID", guildId: interaction.guildId, locale: interaction.locale })} **${id}** ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}`)
                else if (member.user.bot) response.push(`${client.config.emojis.NO} <@${member.user.id}>: ${client.language({ textId: "bot", guildId: interaction.guildId, locale: interaction.locale })}`)
                else {
                    const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
                    await give(profile, args.Subcommand, args.amount, args.role, args.time)
                    response.push(`${client.config.emojis.YES}<@${member.user.id}>`)
                }
            }))
            return interaction.update({ content: response.join("\n"), components: [] })
        }
        if (args.SubcommandGroup === "to-role") {
            loading.set(interaction.guildId, new Collection())
            response = [`→ ${client.language({ textId: "Giving", guildId: interaction.guildId, locale: interaction.locale })} ${reward} (${args.amount.toLocaleString()})`]
            values.forEach(id => {
                loading.get(interaction.guildId).set(id, { id: id, count: 0, membersSize: undefined, item: `${reward} (${args.amount.toLocaleString()})` })
                response.push(`⏳ <@&${id}> (\`0\`/⏳ \`0%\`)`)
            })
            await interaction.update({ content: response.join("\n"), components: [], flags: ["Ephemeral"] })
            if (!client.fetchedMembers.has(interaction.guildId)) {
                await interaction.guild.members.fetch()
                client.fetchedMembers.add(interaction.guildId)
            }
            for (const id of values) {
                const role = interaction.guild.roles.cache.get(id)
                const members = role.members.filter(member => !member.user.bot)
                const rol = loading.get(interaction.guildId).get(role.id)
                rol.membersSize = members.size
                loading.get(interaction.guildId).set(role.id, rol)
                if (rol.membersSize === 0) {
                    await interaction.editReply({ content: `→ ${client.language({ textId: "Giving", guildId: interaction.guildId, locale: interaction.locale })} ${reward} (${args.amount.toLocaleString()})\n${loading.get(interaction.guildId).map(e => `${e.count === e.membersSize ? client.config.emojis.YES : "⏳"} <@&${e.id}> (\`${e.count}\`/${e.membersSize === undefined ? "⏳" : `\`${e.membersSize}\``} \`${e.membersSize ? Math.floor(e.count/e.membersSize*100) : 0}%\`)`).join("\n")}`, components: [] })
                } else {
                    let last = Math.floor(rol.count/rol.membersSize*100)
                    for (const member of members) {
                        const profile = await client.functions.fetchProfile(client, member[1].user.id, interaction.guildId)
                        await give(profile, args.Subcommand, args.amount, args.role, args.time)
                        const rol = loading.get(interaction.guildId).get(role.id)
                        rol.count++
                        loading.get(interaction.guildId).set(role.id, rol)
                        if (Math.floor(rol.count/rol.membersSize*100) !== last && Math.floor(rol.count/rol.membersSize*100) % 10 === 0) {
                            await interaction.editReply({ content: `→ ${client.language({ textId: "Giving", guildId: interaction.guildId, locale: interaction.locale })} ${reward} (${args.amount.toLocaleString()})\n${loading.get(interaction.guildId).map(e => `${e.count === e.membersSize ? client.config.emojis.YES : "⏳"} <@&${e.id}> (\`${e.count}\`/${e.membersSize === undefined ? "⏳" : `\`${e.membersSize}\``} \`${e.membersSize !== undefined ? Math.floor(e.count/e.membersSize*100) : 0}%\`)`).join("\n")}`, components: [] })
                            last = Math.floor(rol.count/rol.membersSize*100)
                        }
                    }    
                }
            }
            return loading.delete(interaction.guildId)
        }
    }  
}
async function give(profile, subcommand, amount, roleId, time) {
    if (subcommand === "level") {
        return await profile.addLevel(amount, true, true)
    }
    if (subcommand === "season_level") {
        return await profile.addSeasonLevel(amount, true, true)
    }
    if (subcommand === "experience") {
        return await profile.addXp(amount, true, false, true, true)
    }
    if (subcommand === "reputation") {
        return await profile.addRp(amount, true, false, true, true)
    }
    if (subcommand === "currency") {
        return await profile.addCurrency(amount, true, false, true, true)
    }
    if (subcommand === "likes") {
        const client = profile.client
        const achievements = client.cache.achievements.filter(e => e.guildID === profile.guildID && e.enabled && e.type === AchievementType.Like)
        profile.likes = amount
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.likes >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                client.tempAchievements[profile.userID].push(achievement.id)
                await profile.addAchievement(achievement, false, true, true)
            }    
        }))
        return await profile.save()
    }
    if (subcommand === "role") {
        profile.addRole(roleId, amount, time ? time * 60 * 1000 : undefined)
        return await profile.save()
    }
}