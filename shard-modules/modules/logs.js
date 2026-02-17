const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField, AuditLogEvent, MessageType, Events } = require("discord.js")
const { sendWebhook } = require('../handler/httpClient')
const { handleError } = require('../handler/errorHandler')
const { AchievementType } = require("../enums")
const config = require('../config/botconfig')
module.exports = async function (client) {
    client.on(Events.GuildAuditLogEntryCreate, async (auditLogEntry, guild) => {
        if (client.blacklist(guild.id, "full_ban", "guilds")) return
        const settings = await client.functions.fetchSettings(client, guild.id)
        const embed = new EmbedBuilder().setColor(3093046)
        switch (auditLogEntry.action) {
            case AuditLogEvent.ChannelCreate: {
                const channel = auditLogEntry.target
                if (settings.logs?.webhook && settings.logs?.channelCreate) {
                    embed.setAuthor({ name: `${client.language({ textId: "Channel created", guildId: guild.id })}`, iconURL: `https://i.imgur.com/9MAXlTa.png` })
                    const array = [
                        `**${client.language({ textId: "Type", guildId: guild.id })}:** ${client.language({ textId: `channelType_${channel.type}`, guildId: guild.id })}`,
                        `**${client.language({ textId: "Name", guildId: guild.id })}:** ${channel.name}`,
                        `**${client.language({ textId: "Channel", guildId: guild.id })}:** <#${channel.id}>`,
                        `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                        `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                    ]
                    embed.setDescription(array.join(`\n`))
                }
                break
            }
            case AuditLogEvent.ChannelDelete: {
                const channel = auditLogEntry.target
                if (settings.logs?.webhook && settings.logs?.channelDelete === true) {
                    embed.setAuthor({ name: `${client.language({ textId: "Channel deleted", guildId: guild.id })}`, iconURL: `https://i.imgur.com/RRPKiMP.png` })
                    const array = [
                        `**${client.language({ textId: "Type", guildId: guild.id })}:** ${client.language({ textId: `channelType_${channel.type}`, guildId: guild.id })}`,
                        `**${client.language({ textId: "Name", guildId: guild.id })}:** ${channel.name}`,
                        `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                        `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                    ]
                    embed.setDescription(array.join(`\n`))
                }
                break
            }
            case AuditLogEvent.ChannelUpdate: {
                const channel = auditLogEntry.target
                if (settings.logs?.webhook && settings.logs?.channelUpdate === true) {
                    embed.setAuthor({ name: `${client.language({ textId: "Channel updated", guildId: guild.id })}`, iconURL: `https://i.imgur.com/guXlFyJ.png` })
                    const array = [
                        `**${client.language({ textId: "Type", guildId: guild.id })}:** ${client.language({ textId: `channelType_${channel.type}`, guildId: guild.id })}`,
                        `**${client.language({ textId: "Name", guildId: guild.id })}:** ${channel.name}`,
                        `**${client.language({ textId: "Channel", guildId: guild.id })}:** <#${channel.id}>`,
                        `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                        `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                    ]
                    embed.setDescription(array.join(`\n`))
                    if (auditLogEntry.changes?.some(e => e.old)) {
                        embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                            if (change.old) return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`    
                        }).join(`\n`)}`, inline: true }])    
                    }
                    if (auditLogEntry.changes?.some(e => e.new)) {
                        embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                            if (change.new) return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`    
                        }).join(`\n`)}`, inline: true }])
                    }
                }
                break
            }
            case AuditLogEvent.GuildUpdate: {
                if (settings.logs?.webhook && settings.logs?.guildUpdate === true) {
                    embed.setAuthor({ name: `${client.language({ textId: "Server updated", guildId: guild.id })}`, iconURL: `https://i.imgur.com/s9ucPH7.png` })
                    const array = [
                        `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                        `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                    ]
                    embed.setDescription(array.join(`\n`))
                    if (auditLogEntry.changes?.some(e => e.old)) {
                        embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                            if (change.old) return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`     
                        }).join(`\n`)}`, inline: true }])    
                    }
                    if (auditLogEntry.changes?.some(e => e.new)) {
                        embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                            if (change.new) return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`   
                        }).join(`\n`)}`, inline: true }])
                    }
                }
                break
            }
            case AuditLogEvent.BotAdd: {
                if (!settings.logs?.webhook || !settings.logs?.botAdd) return
                embed.setAuthor({ name: `${client.language({ textId: "Bot joined server", guildId: guild.id })}`, iconURL: `https://i.imgur.com/cMmtKDA.png` })
                const array = [
                    `**${client.language({ textId: "Bot", guildId: guild.id })}:** ${auditLogEntry.target?.tag} (<@${auditLogEntry.target?.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.MemberKick: {
                if (!settings.logs?.webhook || !settings.logs?.memberKick) return
                embed.setAuthor({ name: `${client.language({ textId: "User kicked", guildId: guild.id })}`, iconURL: `https://i.imgur.com/6mMBC9q.png `})
                const array = [
                    `**${client.language({ textId: "User", guildId: guild.id })}:** ${auditLogEntry.target?.tag} (<@${auditLogEntry.target?.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.MemberPrune: {
                if (!settings.logs?.webhook || !settings.logs?.memberPrune) return
                embed.setAuthor({ name: `${client.language({ textId: "User pruned", guildId: guild.id })}`, iconURL: `https://i.imgur.com/6mMBC9q.png` })
                const array = [
                    `**${client.language({ textId: "User", guildId: guild.id })}:** ${auditLogEntry.target?.tag} (<@${auditLogEntry.target?.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.MemberUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.guildMemberUpdate) return
                const user = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "User updated", guildId: guild.id })}`, iconURL: `https://i.imgur.com/kfNk3VH.png` })
                const array = [
                    `**${client.language({ textId: "User", guildId: guild.id })}:** ${user.username} (<@${user.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        if (change.key === `communication_disabled_until`) {
                            if (change.old) return `> **${client.language({ textId: change.key, guildId: guild.id })}:** <t:${Math.floor(new Date(change.old).getTime()/1000)}:F>`
                            else return `\u200b`
                        } else {
                            if (change.old) return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`
                            else return `\u200b`
                        }
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        if (change.key === `communication_disabled_until`) {
                            if (change.new) return `> **${client.language({ textId: change.key, guildId: guild.id })}:** <t:${Math.floor(new Date(change.new).getTime()/1000)}:F>`
                            else return `\u200b`
                        } else {
                            if (change.new) return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`
                            else return `\u200b`
                        }
                    }).join(`\n`)}`, inline: true }])
                }
                break
            }
            case AuditLogEvent.MemberRoleUpdate: {
                if (auditLogEntry?.changes?.some(e => e.new && e.key === "$add")) {
                    const roles = auditLogEntry.changes.map(change => change.new.map(role => role.id)).flat(1)
                    if (roles.length) {
                        const achievements = client.cache.achievements.filter(e => e.guildID === guild.id && e.type === AchievementType.Role && e.enabled && roles.some(r => e.roles.includes(r)))
                        if (achievements.size) {
                            const profile = await client.functions.fetchProfile(client, auditLogEntry.targetId, guild.id)
                            await Promise.all(achievements.map(async achievement => {
                                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { 
                                    if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                                    client.tempAchievements[profile.userID].push(achievement.id)
                                    profile.addAchievement(achievement, true)
                                }
                            }))
                        }
                    }
                }
                if (!settings.logs?.webhook || !settings.logs?.guildMemberRoleUpdate) return
                const user = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "User roles updated", guildId: guild.id })}`, iconURL: `https://i.imgur.com/kfNk3VH.png` })
                const array = [
                    `**${client.language({ textId: "User", guildId: guild.id })}:** ${user.username} (<@${user.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    auditLogEntry.changes.forEach(change => {
                        embed.addFields([{ name: client.language({ textId: change.key, guildId: guild.id }), value: `> ${change.old.map(a => {
                            return `<@&${a.id}>`
                        }).join(`, `)}` }])    
                    })
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    auditLogEntry.changes.forEach(change => {
                        embed.addFields([{ name: client.language({ textId: change.key, guildId: guild.id }), value: `> ${change.new.map(a => {
                            return `<@&${a.id}>`
                        }).join(`, `)}` }])    
                    })
                }
                break
            }
            case AuditLogEvent.InviteCreate: {
                if (!settings.logs?.webhook || !settings.logs?.inviteCreate) return
                const invite = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Invite created", guildId: guild.id })}`, iconURL: `https://i.imgur.com/nxQUZ1j.png` })
                const array = [
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Code", guildId: guild.id })}:** ${invite.code}`,
                    `**${client.language({ textId: "Invite", guildId: guild.id })}:** ${invite.url}`,
                    `**${client.language({ textId: "Channel", guildId: guild.id })}:** <#${invite.channelId}>`,
                    `**${client.language({ textId: "Invite valid until", guildId: guild.id })}:** <t:${Math.round((Date.now() / 1000) + invite.maxAge)}:F>`,
                    `**${client.language({ textId: "Maximum uses", guildId: guild.id })}:** ${invite.maxUses}`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.InviteDelete: {
                if (!settings.logs?.webhook || !settings.logs?.inviteDelete) return
                const invite = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Invite deleted", guildId: guild.id })}`, iconURL: `https://i.imgur.com/uNHnKiH.png` })
                const array = [
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Code", guildId: guild.id })}:** ${invite.code}`,
                    `**${client.language({ textId: "Invite", guildId: guild.id })}:** ${invite.url}`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.InviteUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.inviteUpdate) return
                const invite = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Invite updated", guildId: guild.id })}`, iconURL: `https://i.imgur.com/uNHnKiH.png` })
                const array = [
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Code", guildId: guild.id })}:** ${invite.code}`,
                    `**${client.language({ textId: "Invite", guildId: guild.id })}:** ${invite.url}`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                ]
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`     
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`   
                    }).join(`\n`)}`, inline: true }])
                }
                break
            }
            case AuditLogEvent.RoleCreate: {
                if (!settings.logs?.webhook || !settings.logs?.roleCreate) return
                const role = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Role created", guildId: guild.id })}`, iconURL: `https://i.imgur.com/Tze12xm.png` })
                const array = [
                    `**${client.language({ textId: "Role", guildId: guild.id })}:** ${role.name} (<@&${role.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.RoleUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.roleUpdate) return
                const role = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Role updated", guildId: guild.id })}`, iconURL: `https://i.imgur.com/QB7XEmL.png` })
                const array = [
                    `**${client.language({ textId: "Role", guildId: guild.id })}:** ${role.name} (<@&${role.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        if (change.key === `permissions`) {
                            const oldPermissions = new PermissionsBitField(String(change.old)).toArray().filter(x => new PermissionsBitField(String(change.new)).toArray().indexOf(x) == -1)
                            return `${oldPermissions.length ? `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${oldPermissions.join(`, `)}` : `\u200b`}`
                        }
                        return `> ${client.language({ textId: change.key, guildId: guild.id })}: **${change.old}**`   
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        if (change.key === `permissions`) {
                            const newPermissions = new PermissionsBitField(String(change.new)).toArray().filter(x => new PermissionsBitField(String(change.old)).toArray().indexOf(x) == -1)    
                            return `${newPermissions.length ? `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${newPermissions.join(`, `)}` : `\u200b`}`
                        }
                        return `> ${client.language({ textId: change.key, guildId: guild.id })}: **${change.new}**`    
                    }).join(`\n`)}`, inline: true }])  
                }
                break
            }
            case AuditLogEvent.RoleDelete: {
                if (!settings.logs?.webhook || !settings.logs?.roleDelete) return
                const role = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Role deleted", guildId: guild.id })}`, iconURL: `https://i.imgur.com/6x9p1BG.png` })
                const array = [
                    `**${client.language({ textId: "Role", guildId: guild.id })}:** ${role.name} (<@&${role.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.StickerCreate: {
                if (!settings.logs?.webhook || !settings.logs?.stickerCreate) return
                const sticker = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Sticker created", guildId: guild.id })}`, iconURL: `https://i.imgur.com/UNxqw1J.png` })
                const array = [
                    `**${client.language({ textId: "Sticker", guildId: guild.id })}:** ${sticker.name}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setThumbnail(sticker.url)
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.StickerDelete: {
                if (!settings.logs?.webhook || !settings.logs?.stickerDelete) return
                const sticker = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Sticker deleted", guildId: guild.id })}`, iconURL: `https://i.imgur.com/UNxqw1J.png` })
                const array = [
                    `**${client.language({ textId: "Sticker", guildId: guild.id })}:** ${sticker.name}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setThumbnail(sticker.url)
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.StickerUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.StickerUpdate) return
                const sticker = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Sticker updated", guildId: guild.id })}`, iconURL: `https://i.imgur.com/UNxqw1J.png` })
                const array = [
                    `**${client.language({ textId: "Sticker", guildId: guild.id })}:** ${sticker.name}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setThumbnail(sticker.url)
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`     
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`   
                    }).join(`\n`)}`, inline: true }])
                }
                break
            }
            case AuditLogEvent.EmojiCreate: {
                if (!settings.logs?.webhook || !settings.logs?.emojiCreate) return
                const emoji = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Emoji created", guildId: guild.id })}`, iconURL: `https://i.imgur.com/eo1CgkJ.png` })
                const array = [
                    `**${client.language({ textId: "Emoji", guildId: guild.id })}:** <${emoji.animated ? `a:` : `:`}${emoji.name}:${emoji.id}> (${emoji.id})`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setThumbnail(emoji.animated ? emoji.imageURL({ extension: "gif" }) : emoji.imageURL())
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.EmojiDelete: {
                if (!settings.logs?.webhook || !settings.logs?.emojiDelete) return
                const emoji = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Emoji deleted", guildId: guild.id })}`, iconURL: `https://i.imgur.com/wniITXR.png` })
                const array = [
                    `**${client.language({ textId: "Emoji", guildId: guild.id })}:** <${emoji.animated ? `a:` : `:`}${emoji.name}:${emoji.id}> (${emoji.id})`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.EmojiUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.emojiUpdate) return
                const emoji = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Emoji updated", guildId: guild.id })}`, iconURL: `https://i.imgur.com/nphMq55.png` })
                const array = [
                    `**${client.language({ textId: "Emoji", guildId: guild.id })}:** <${emoji.animated ? `a:` : `:`}${emoji.name}:${emoji.id}> (${emoji.id})`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setThumbnail(emoji.animated ? emoji.imageURL({ extension: "gif" }) : emoji.imageURL())
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`     
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`   
                    }).join(`\n`)}`, inline: true }])
                }
                break
            }
            case AuditLogEvent.MessageDelete: {
                if (!settings.logs?.webhook || !settings.logs?.messageDelete) return
                embed.setAuthor({ name: `${client.language({ textId: "Message deleted", guildId: guild.id })}`, iconURL: `https://i.imgur.com/wniITXR.png` })
                const array = [
                    `**${client.language({ textId: "User message", guildId: guild.id })}:** ${auditLogEntry.target?.tag} (<@${auditLogEntry.target?.id}>)`,
                    `**${client.language({ textId: "Channel", guildId: guild.id })}:** <#${auditLogEntry.extra.channel.id}>`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.ApplicationCommandPermissionUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.applicationCommandPermissionUpdate) return
                const command = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Command permissions updated", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085600101659062377/7214-log-command-update-d.png" })
                const array = [
                    `**${client.language({ textId: "Command", guildId: guild.id })}:** ${command.name} (</${command.name}:${command.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`     
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`   
                    }).join(`\n`)}`, inline: true }])
                }
                break
            }
            case AuditLogEvent.GuildScheduledEventCreate: {
                if (!settings.logs?.webhook || !settings.logs?.guildScheduledEventCreate) return
                const event = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Event created", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085600254625325157/3228-log-event-plus-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${event.name}`,
                    `**${client.language({ textId: "Link", guildId: guild.id })}:** ${event.url}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.GuildScheduledEventDelete: {
                if (!settings.logs?.webhook || !settings.logs?.guildScheduledEventDelete) return
                const event = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Event deleted", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085600360158212196/5969-log-event-minus-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${event.name}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.GuildScheduledEventUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.guildScheduledEventUpdate) return
                const event = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Event updated", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085600446023999629/4748-log-event-update-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${event.name}`,
                    `**${client.language({ textId: "Link", guildId: guild.id })}:** ${event.url}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`     
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`   
                    }).join(`\n`)}`, inline: true }])
                }
                break
            }
            case AuditLogEvent.IntegrationCreate: {
                if (!settings.logs?.webhook || !settings.logs?.integrationCreate) return
                const integration = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Integration created", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085600615117369394/4903-log-integration-plus-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${integration.name} (${integration.id})`,
                    `**${client.language({ textId: "Type", guildId: guild.id })}:** ${client.language({ textId: integration.type, guildId: guild.id })}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.IntegrationDelete: {
                if (!settings.logs?.webhook || !settings.logs?.integrationDelete) return
                const integration = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Integration deleted", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085600687750131763/2986-log-integration-minus-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${integration.name} (${integration.id})`,
                    `**${client.language({ textId: "Type", guildId: guild.id })}:** ${client.language({ textId: integration.type, guildId: guild.id })}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.IntegrationUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.integrationUpdate) return
                const integration = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Integration updated", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085600688047935538/5726-log-integration-update-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${integration.name} (${integration.id})`,
                    `**${client.language({ textId: "Type", guildId: guild.id })}:** ${client.language({ textId: integration.type, guildId: guild.id })}`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`     
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`   
                    }).join(`\n`)}`, inline: true }])
                }
                break
            }
            case AuditLogEvent.MemberBanAdd: {
                if (!settings.logs?.webhook || !settings.logs?.memberBanAdd) return
                const user = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Ban issued", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085600933561512016/2841-log-member-minus-d_1.png" })
                const array = [
                    `**${client.language({ textId: "User", guildId: guild.id })}:** ${user.username} (<@${user.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.MemberBanRemove: {
                if (!settings.logs?.webhook || !settings.logs?.memberBanRemove) return
                const user = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Ban removed", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085601254039883867/9167-log-member-plus-d_1.png" })
                const array = [
                    `**${client.language({ textId: "User", guildId: guild.id })}:** ${user?.tag} (<@${user?.id}>)`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.WebhookCreate: {
                if (!settings.logs?.webhook || !settings.logs?.webhookCreate) return
                const webhook = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Webhook created", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085601412840439859/1376-log-automod-plus-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${webhook.name}`,
                    `**${client.language({ textId: "Link", guildId: guild.id })}:** ${webhook.url}`,
                    `**${client.language({ textId: "Channel", guildId: guild.id })}:** <#${webhook.channelId}>`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.WebhookDelete: {
                if (!settings.logs?.webhook || !settings.logs?.webhookDelete) return
                const webhook = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Webhook deleted", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085601413322772642/1343-log-automod-minus-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${webhook.name}`,
                    `**${client.language({ textId: "Channel", guildId: guild.id })}:** <#${webhook.channelId}>`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                break
            }
            case AuditLogEvent.WebhookUpdate: {
                if (!settings.logs?.webhook || !settings.logs?.webhookUpdate) return
                const webhook = auditLogEntry.target
                embed.setAuthor({ name: `${client.language({ textId: "Webhook updated", guildId: guild.id })}`, iconURL: "https://cdn.discordapp.com/attachments/1004753783156379648/1085601413100482620/6943-log-automod-update-d.png" })
                const array = [
                    `**${client.language({ textId: "Name", guildId: guild.id })}:** ${webhook.name}`,
                    `**${client.language({ textId: "Link", guildId: guild.id })}:** ${webhook.url}`,
                    `**${client.language({ textId: "Channel", guildId: guild.id })}:** <#${webhook.channelId}>`,
                    `**${client.language({ textId: "Action author", guildId: guild.id })}:** ${auditLogEntry.executor?.username} (<@${auditLogEntry.executor?.id}>)`,
                    `**${client.language({ textId: "Reason", guildId: guild.id })}:** ${auditLogEntry.reason || `${client.language({ textId: "Missing", guildId: guild.id })}`}`,
                    `**${client.language({ textId: "Date", guildId: guild.id })}:** <t:${Math.round(auditLogEntry.createdTimestamp/1000)}:F>`
                ]
                embed.setDescription(array.join(`\n`))
                if (auditLogEntry.changes?.some(e => e.old)) {
                    embed.addFields([{ name: `${client.language({ textId: "Old", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.old}`     
                    }).join(`\n`)}`, inline: true }])    
                }
                if (auditLogEntry.changes?.some(e => e.new)) {
                    embed.addFields([{ name: `${client.language({ textId: "New", guildId: guild.id })}`, value: `${auditLogEntry.changes.map(change => {
                        return `> **${client.language({ textId: change.key, guildId: guild.id })}:** ${change.new}`   
                    }).join(`\n`)}`, inline: true }])
                }
                break
            }
        }
        if (settings.logs?.webhook) {
            try {
                await sendWebhook(settings.logs.webhook, { embeds: [embed] })
            } catch (err) {
                if (err.message?.includes("Invalid URI")) {
                    settings.logs.webhook = undefined
                    settings.save()
                } else sendError(err)
            }
        }
    })
    client.on(Events.GuildMemberAdd, async (member) => {
        if (client.blacklist(member.guild.id, "full_ban", "guilds")) return
        const settings = await client.functions.fetchSettings(client, member.guild.id)
        if (!settings.logs?.webhook || !settings.logs?.memberAdd) return
        const embed = new EmbedBuilder()
        embed.setColor(3093046)
        const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd }).catch(e => null)
        const log = logs?.entries.find(e => e.target.id === member.user.id)
        if (!log) {
            embed.setAuthor({ name: `${client.language({ textId: "User joined server", guildId: member.guild.id })}`, iconURL: `https://i.imgur.com/cMmtKDA.png` })
            const array = [
                `**${client.language({ textId: "User", guildId: member.guild.id })}:** ${member.user.username} (<@${member.user.id}>)`,
                `**${client.language({ textId: "Date", guildId: member.guild.id })}:** <t:${Math.round(new Date().getTime() / 1000)}:F>`
            ]
            embed.setThumbnail(member.displayAvatarURL())
            embed.setDescription(array.join(`\n`))
            try {
                await sendWebhook(settings.logs.webhook, { embeds: [embed] })
            } catch (err) {
                if (err.message?.includes("Invalid URI")) {
                    settings.logs.webhook = undefined
                    settings.save()
                } else sendError(err)
            }
        }
    })
    client.on(Events.GuildMemberRemove, async (member) => {
        if (client.blacklist(member.guild.id, "full_ban", "guilds")) return
        const settings = await client.functions.fetchSettings(client, member.guild.id)
        if (!settings.logs?.webhook || !settings.logs?.memberRemove) return
        const embed = new EmbedBuilder()
        embed.setColor(3093046)
        const kickLogs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick }).catch(e => null)
        const kickLog = kickLogs?.entries.find(e => e.target.id === member.user.id && new Date().getTime() - e.createdTimestamp < 1000)
        const pruneLogs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberPrune }).catch(e => null)
        const pruneLog = pruneLogs?.entries.find(e => e.target?.id === member.user.id && new Date().getTime() - e.createdTimestamp < 1000)
        if (!kickLog && !pruneLog) {
            embed.setAuthor({ name: `${client.language({ textId: "User left server", guildId: member.guild.id })}`, iconURL: `https://i.imgur.com/6mMBC9q.png` })
            const array = [
                `**${client.language({ textId: "User", guildId: member.guild.id })}:** ${member.user.username} (<@${member.user.id}>)`,
                `**${client.language({ textId: "Date", guildId: member.guild.id })}:** <t:${Math.round(Date.now() / 1000)}:F>`
            ]
            embed.setThumbnail(member.displayAvatarURL())
            embed.setDescription(array.join(`\n`))
            try {
                await sendWebhook(settings.logs.webhook, { embeds: [embed] })
            } catch (err) {
                if (err.message?.includes("Invalid URI")) {
                    settings.logs.webhook = undefined
                    settings.save()
                } else sendError(err)
            }
        }
    })
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (!reaction.message) return
        if (!reaction.message.inGuild()) return
        if (reaction.message.partial) return
        if (client.blacklist(reaction.message.guild.id, "full_ban", "guilds")) return
        const settings = await client.functions.fetchSettings(client, reaction.message.guild.id)
        if (!settings.logs?.webhook || !settings.logs?.messageReactionAdd) return
        const embed = new EmbedBuilder()
        embed.setColor(3093046)
        embed.setAuthor({ name: `${client.language({ textId: "Reaction created", guildId: reaction.message.guild.id })}`, iconURL: `https://i.imgur.com/eo1CgkJ.png` })
        const array = [
            `**${client.language({ textId: "Reaction", guildId: reaction.message.guild.id })}:** ${reaction.emoji.guild ? `<${reaction.emoji.animated ? `a:` : `:`}${reaction.emoji.name}:${reaction.emoji.id}>` : `${reaction.emoji.name}`}`,
            `**${client.language({ textId: "Message", guildId: reaction.message.guild.id })}:** ${reaction.message.url}`,
            `**${client.language({ textId: "Action author", guildId: reaction.message.guild.id })}:** ${user.username} (<@${user.id}>)`,
            `**${client.language({ textId: "Date", guildId: reaction.message.guild.id })}:** <t:${Math.round(Date.now() / 1000)}:F>`,
        ]
        embed.setDescription(array.join(`\n`))
        try {
            await sendWebhook(settings.logs.webhook, { embeds: [embed] })
        } catch (err) {
            if (err.message?.includes("Invalid URI")) {
                settings.logs.webhook = undefined
                settings.save()
            } else sendError(err)
        }
    })
    client.on(Events.MessageCreate, async (message) => {
        if (!message.inGuild()) return
        if (message.inGuild() && client.blacklist(message.guild.id, "full_ban", "guilds")) return
        if (message.author.bot || (message.type !== MessageType.Default && message.type !== MessageType.Reply)) return
        const settings = await client.functions.fetchSettings(client, message.guild.id)
        if (!settings.logs?.webhook || !settings.logs?.messageCreate) return
        const embed = new EmbedBuilder()
        embed.setColor(3093046)
        embed.setAuthor({ name: `${client.language({ textId: "Message created", guildId: message.guild.id })}`, iconURL: `https://i.imgur.com/f8x6Nik.png` })
        const array = [
            `**${client.language({ textId: "Action author", guildId: message.guild.id })}:** ${message.author.tag} (<@${message.author.id}>)`,
            `**${client.language({ textId: "Attachments", guildId: message.guild.id })}:** ${message.attachments.size ? `${message.attachments.map(e => { return `${e.url}` }).join(`\n`)}` : `${client.language({ textId: "None", guildId: message.guild.id })}`}`,
            `**${client.language({ textId: "Channel", guildId: message.guild.id })}:** <#${message.channelId}>`,
            `**${client.language({ textId: "Link", guildId: message.guild.id })}:** ${message.url}`,
            `**${client.language({ textId: "Date", guildId: message.guild.id })}:** <t:${Math.round(message.createdTimestamp/1000)}:F>`,
            `**${client.language({ textId: "Content", guildId: message.guild.id })}:** ${message.content ? message.content : `${client.language({ textId: "Missing", guildId: message.guild.id })}`}`
        ]
        embed.setDescription(array.join(`\n`).slice(0, 4096))
        try {
            await sendWebhook(settings.logs.webhook, { embeds: [embed] })
        } catch (err) {
            if (err.message?.includes("Invalid URI")) {
                settings.logs.webhook = undefined
                settings.save()
            } else sendError(err)
        }
    })
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        if (client.blacklist(newState.guild.id, "full_ban", "guilds")) return
        if (newState.member?.user.bot) return
        if (!newState.channelId && oldState.channelId) {
            const settings = await client.functions.fetchSettings(client, newState.guild.id)
            if (settings.logs?.webhook && settings.logs?.voiceStateUpdate === true) {
                const embed = new EmbedBuilder()
                embed.setColor(3093046)
                embed.setAuthor({ name: `${client.language({ textId: "Left channel", guildId: newState.guild.id })}`, iconURL: `https://i.imgur.com/fm9WdJy.png` })
                const array = [
                    `**${client.language({ textId: "User", guildId: newState.guild.id })}:** ${newState.member?.user.username} (<@${newState.id}>)`,
                    `**${client.language({ textId: "Old channel", guildId: newState.guild.id })}:** <#${oldState.channelId}>`,
                    `**${client.language({ textId: "Date", guildId: newState.guild.id })}:** <t:${Math.round(new Date().getTime() / 1000)}:F>`,
                ]
                embed.setDescription(array.join(`\n`))
                try {
                    await sendWebhook(settings.logs.webhook, { embeds: [embed] })
                } catch (err) {
                    if (err.message?.includes("Invalid URI")) {
                        settings.logs.webhook = undefined
                        settings.save()
                    } else sendError(err)
                }
            }
        }
		if (newState.channelId && !oldState.channelId) {
            const settings = await client.functions.fetchSettings(client, newState.guild.id)
            if (settings.logs?.webhook && settings.logs?.voiceStateUpdate === true) {
                const embed = new EmbedBuilder()
                embed.setColor(3093046)
                embed.setAuthor({ name: `${client.language({ textId: "Joined channel", guildId: newState.guild.id })}`, iconURL: `https://i.imgur.com/VJARveS.png` })
                const array = [
                    `**${client.language({ textId: "User", guildId: newState.guild.id })}:** ${newState.member.user.username} (<@${newState.member.user.id}>)`,
                    `**${client.language({ textId: "New channel", guildId: newState.guild.id })}:** <#${newState.channelId}>`,
                    `**${client.language({ textId: "Date", guildId: newState.guild.id })}:** <t:${Math.round(new Date().getTime() / 1000)}:F>`,
                ]
                embed.setDescription(array.join(`\n`))
                try {
                    await sendWebhook(settings.logs.webhook, { embeds: [embed] })
                } catch (err) {
                    if (err.message?.includes("Invalid URI")) {
                        settings.logs.webhook = undefined
                        settings.save()
                    } else sendError(err)
                }
            }
        }
		if (newState.channelId && oldState.channelId && newState.deaf === oldState.deaf && newState.mute === oldState.mute && newState.streaming === oldState.streaming && newState.suppress === oldState.suppress) {
            const settings = await client.functions.fetchSettings(client, newState.guild.id)
            if (settings.logs?.webhook && settings.logs?.voiceStateUpdate === true) {
                const embed = new EmbedBuilder()
                embed.setColor(3093046)
                embed.setAuthor({ name: `${client.language({ textId: "Changed channel", guildId: newState.guild.id })}`, iconURL: `https://i.imgur.com/PSgvOfi.png` })
                const array = [
                    `**${client.language({ textId: "User", guildId: newState.guild.id })}:** ${newState.member?.user.username || "?"} (<@${newState.member.user.id}>)`,
                    `**${client.language({ textId: "New channel", guildId: newState.guild.id })}:** <#${newState.channelId}>`,
                    `**${client.language({ textId: "Old channel", guildId: newState.guild.id })}:** <#${oldState.channelId}>`,
                    `**${client.language({ textId: "Date", guildId: newState.guild.id })}:** <t:${Math.round(new Date().getTime() / 1000)}:F>`,
                ]
                embed.setDescription(array.join(`\n`))
                try {
                    await sendWebhook(settings.logs.webhook, { embeds: [embed] })
                } catch (err) {
                    if (err.message?.includes("Invalid URI")) {
                        settings.logs.webhook = undefined
                        settings.save()
                    } else sendError(err)
                }
            }
        }
    })
    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.inGuild() && client.blacklist(interaction.guildId, "full_ban", "guilds")) return
        if (!interaction.isChatInputCommand() || !interaction.inGuild()) return
        const settings = await client.functions.fetchSettings(client, interaction.guildId)
        if (!settings.logs?.webhook || !settings.logs?.interactionCreate) return
        const embed = new EmbedBuilder()
        embed.setColor(3093046)
        embed.setAuthor({ name: `${client.language({ textId: "Command used", guildId: interaction.guildId })}`, iconURL: `https://cdn.discordapp.com/attachments/1004753783156379648/1085620190580048012/3415-log-command-plus-d.png` })
        const array = [
            `**${client.language({ textId: "Command", guildId: interaction.guildId })}:** ${interaction.commandName}`,
            `**${client.language({ textId: "Action author", guildId: interaction.guildId })}:** ${`${interaction.user.username} (<@${interaction.user.id}>)`}`,
            `**${client.language({ textId: "Arguments", guildId: interaction.guildId })}:** ${interaction.options.data.length ? `${interaction.options.data.map(e => {
                return `${e.name}${e.type === ApplicationCommandOptionType.User ? `: <@${e.value}>` : e.type === ApplicationCommandOptionType.Channel ? `: <#${e.value}>`: e.type === ApplicationCommandOptionType.SubcommandGroup ? `${e.options.length ? e.options.map(e1 => {
                    return ` ${e1.name} ${e1.type === ApplicationCommandOptionType.User ? `<@${e1.value}>` : e1.type === ApplicationCommandOptionType.Channel ? `<#${e1.value}>`: e1.type === ApplicationCommandOptionType.Subcommand ? `${e1.options.length ? e1.options.map(e2 => {
                        return ` ${e2.name}: ${e2.type === ApplicationCommandOptionType.User ? `<@${e2.value}>` : e2.type === ApplicationCommandOptionType.Channel ? `<#${e2.value}>`: e2.value}`
                    }).join(` `) : ``}` : `: ${e.value}`}`
                }).join(` `) : e.value}` : e.type === ApplicationCommandOptionType.Subcommand ? `${e.options.length ? e.options.map(e1 => {
                    return ` ${e1.name}: ${e1.type === ApplicationCommandOptionType.User ? `<@${e1.value}>` : e1.type === ApplicationCommandOptionType.Channel ? `<#${e1.value}>`: `${e1.value}`}`
                }).join(` `) : ``}`: `: ${e.value}`}`
            }).join(` `)}` : `${client.language({ textId: "None", guildId: interaction.guildId })}`}`,
            `**${client.language({ textId: "Date", guildId: interaction.guildId })}:** <t:${Math.round(new Date().getTime() / 1000)}:F>`
        ]
        embed.setDescription(array.join(`\n`))
        try {
            await sendWebhook(settings.logs.webhook, { embeds: [embed] })
        } catch (err) {
            if (err.message?.includes("Invalid URI")) {
                settings.logs.webhook = undefined
                settings.save()
            } else sendError(err)
        }
    })
    function sendError(error) {
        handleError(error, { ownerId: config.discord.ownerId })
    }
}
