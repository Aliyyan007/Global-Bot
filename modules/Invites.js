const { EmbedBuilder, Events, SnowflakeUtil } = require("discord.js")
const { AchievementType } = require("../enums")
module.exports = async function (client) {
	client.on(Events.InviteCreate, async (invite) => {
		if (client.blacklist(invite.guild.id, "full_ban", "guilds")) return
		if (invite.inviter && client.blacklist(invite.inviter.id, "full_ban", "users")) return
		client.cache.invites.set(invite.code, invite)
	})
	client.on(Events.InviteDelete, async (invite) => {
		client.cache.invites.delete(invite.code)
	})
	
	client.on(Events.GuildMemberAdd, async (member) => {
		if (client.blacklist(member.guild.id, "full_ban", "guilds")) return
		if (client.blacklist(member.user.id, "full_ban", "users")) return
		if (!client.cache.invites.filter(invite => invite.guild.id === member.guild.id).size && member.guild.members.me.permissions.has('ManageGuild')) {
			const invites = await member.guild.invites.fetch({ cache: false })
			client.cache.invites = client.cache.invites.concat(invites)
		}
		const settings = client.cache.settings.get(member.guild.id)
		const freshInvites = await member.guild.invites.fetch({ cache: false }).catch(e => null)
		const cachedInvites = client.cache.invites.filter(invite => invite.guild.id === member.guild.id)
		if (freshInvites) {
			const usedInvite = freshInvites.find(i => {
				const inv = cachedInvites.get(i.code)
				return inv && inv.uses !== i.uses
			})
			client.cache.invites = client.cache.invites.concat(freshInvites)
			if (usedInvite && usedInvite.inviter) {
				const profile = await client.functions.fetchProfile(client, usedInvite.inviter.id, member.guild.id)
				if (profile.userID !== member.user.id) {
					const memberInviter = await member.guild.members.fetch(usedInvite.inviter.id).catch(e => null)
					if (memberInviter && !memberInviter.user.bot) {
						const rewardsArray = []
						const rewards = [`${client.config.emojis.invite}**${client.language({ textId: "Invite", guildId: member.guild.id })}** (1)`]
						if (settings.curForInvite && !profile.blockActivities?.invite?.CUR) {
							await profile.addCurrency(settings.curForInvite)
							rewards.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${settings.curForInvite})`)
							rewardsArray.push({ itemID: 'currency', amount: settings.curForInvite })
						}
						if (settings.xpForInvite && !profile.blockActivities?.invite?.XP) {
							await profile.addXp(settings.xpForInvite)
							rewards.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: member.guild.id })}** (${settings.xpForInvite})`)
							rewardsArray.push({ itemID: 'xp', amount: settings.xpForInvite })
						}
						if (settings.rpForInvite && !profile.blockActivities?.invite?.RP) {
							await profile.addRp(settings.rpForInvite)
							rewards.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: member.guild.id })}** (${settings.rpForInvite})`)
							rewardsArray.push({ itemID: 'rp', amount: settings.rpForInvite })
						}
						if (!profile.blockActivities?.invite?.items) {
							const itemsForInvite = client.cache.items.filter(i => i.guildID === settings.guildID && !i.temp && i.enabled && i.activities?.invite?.amountFrom && i.activities?.invite?.amountTo)
							await Promise.all(itemsForInvite.map(async item => {
								if (item.activities_invite_permission && client.cache.permissions.get(item.activities_invite_permission)) {
				                    const permission = client.cache.permissions.get(item.activities_invite_permission)
				                    const isPassing = permission.for(profile, memberInviter, usedInvite.channel)
				                    if (isPassing.value === true) {
				                        const amount = client.functions.getRandomNumber(item.activities.invite.amountFrom, item.activities.invite.amountTo)
										await profile.addItem(item.itemID, amount)
										rewards.push(`${item.displayEmoji}**${item.name}** (${amount})`)
										rewardsArray.push({ itemID: item.itemID, amount: amount })
				                    }
				                } else {
				                	const amount = client.functions.getRandomNumber(item.activities.invite.amountFrom, item.activities.invite.amountTo)
									await profile.addItem(item.itemID, amount)
									rewards.push(`${item.displayEmoji}**${item.name}** (${amount})`)
									rewardsArray.push({ itemID: item.itemID, amount: amount })
				                }
							}))
						}
						profile.invites = 1
						const guildQuests = client.cache.quests.filter(quest => quest.guildID === member.guild.id && quest.isEnabled && quest.targets.some(target => target.type === "invite"))
						if (guildQuests.size) await profile.addQuestProgression("invite", 1)
						const achievements = client.cache.achievements.filter(e => e.guildID === member.guild.id && e.type === AchievementType.Invite && e.enabled)
						await Promise.all(achievements.map(async achievement => {
							if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.invites >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { 
								if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
								client.tempAchievements[profile.userID].push(achievement.id)
								await profile.addAchievement(achievement)
							}	
						}))
						await profile.save()
						const invitedProfile = await client.functions.fetchProfile(client, member.user.id, member.guild.id)
						invitedProfile.inviterInfo = {
							userID: usedInvite.inviter.id, 
							items: rewardsArray
						}
						await invitedProfile.save()
						if (settings.channels?.botChannelId) {
							const channel = member.guild.channels.cache.get(settings.channels.botChannelId)
							if (!channel) {
								settings.channels.botChannelId = undefined
								return await settings.save()
							}
							const nonce = SnowflakeUtil.generate().toString()
							channel.send({ 
								content: profile.inviteJoinMention ? `<@${member.user.id}>` : ` `, 
								embeds: [
									new EmbedBuilder()
										.setColor(memberInviter.displayHexColor) 
										.setAuthor({ name: memberInviter.displayName, iconURL: memberInviter.user.avatarURL() })
										.setDescription(`${client.language({ textId: "Your invitee", guildId: member.guild.id })} **${member.displayName}** (<@${member.user.id}>) ${client.language({ textId: "joined the server", guildId: member.guild.id })}\n${client.language({ textId: "Received", guildId: member.guild.id })}:\n${rewards.join("\n")}`)
										.setThumbnail(member.user.avatarURL())
								],
								enforceNonce: true, nonce: nonce,
							}).catch(e => null)
						}
					}	
				}
			}
		}
	})
}