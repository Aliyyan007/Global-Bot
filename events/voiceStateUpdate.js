const { AchievementType } = require("../enums")
const client = require("../index")
const { EmbedBuilder, Events } = require("discord.js")
const Decimal = require('decimal.js')
const { handleError } = require("../handler/errorHandler")

// Auto Voice Integration
const autoVoice = require('../modules/auto-voice')

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
	try {
		if (client.blacklist(newState.guild.id, "full_ban", "guilds")) return
	if (client.blacklist(newState.id, "full_ban", "users")) return
	
	// Handle Auto Voice events
	try {
		await autoVoice.handleVoiceStateUpdate(oldState, newState)
	} catch (e) {
		console.error('[Auto Voice] Error in voiceStateUpdate:', e)
	}
	const newDate = Date.now()
	const settings = client.cache.settings.get(newState.guild.id)
	const newUserChannel = newState.channelId
	const oldUserChannel = oldState.channelId
	//If bot joined
	if (newState.member === null || newState.member.user.bot) return
	//If joined from non-excluded channel to non-excluded channel 
	if (oldState.channel && oldState.mute === false && newState.mute === false && newUserChannel !== null && oldUserChannel !== null && oldUserChannel !== newUserChannel && newState.channel && oldState.channel &&
		settings.channels.mutedChannels.includes(oldUserChannel) === false && 
		settings.channels.mutedChannels.includes(newUserChannel) === false) {
		let members = oldState.channel.members.filter(member => !member.user.bot && !member.voice.mute)
		if (members.size == 1) {
			memberLeaveChannel({ client: client, userID: newState.id || oldState.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			memberLeaveChannel({ client: client, userID: members.first().user.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${members.first().user.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${members.first().displayName} ${oldState.member?.displayName} endTime 1 set for both: one of two left non-excluded channel`)	
		} else if (members.size > 1){
			memberLeaveChannel({ client: client, userID: newState.id || oldState.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member?.displayName} endTime 1 set, left non-excluded channel`)	
		}
		members = newState.channel.members.filter(member => !member.user.bot && !member.voice.mute)
		if (members.size == 2) {
			for (let member of members) {
				const profile = await client.functions.fetchProfile(client, member[0], member[1].guild.id)
				profile.startTime = new Date()
				await profile.save()
				//console.log(`[VOICE-STATE-${member[1].user.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${member[1].displayName} startTime 1 set, joined non-excluded channel`)
			}
		} else if (members.size > 2) {
			const profile = await client.functions.fetchProfile(client, newState.id, newState.guild.id)
			profile.startTime = new Date()
			await profile.save()
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member?.displayName} startTime 1 set, joined non-excluded channel`)
		}
		return
	}
	// If muted in channel
	if (newState.channel && oldState.mute === false && newState.mute === true && oldUserChannel === newUserChannel &&
		settings.channels.mutedChannels.includes(oldUserChannel) === false) {
		const members = newState.channel.members.filter(member => !member.user.bot && !member.voice.mute)
		if (members.size == 1) {
			memberLeaveChannel({ client: client, userID: newState.id || oldState.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member.displayName} endTime 2 set, muted in channel`)
			memberLeaveChannel({ client: client, userID: members.first().user.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${members.first().user.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${members.first().displayName} endTime 2 set, last active member remaining`)
		} else if (members.size > 1) {
			memberLeaveChannel({ client: client, userID: newState.id || oldState.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member?.displayName} endTime 2 set, muted in channel`)
		}
		return
	} 
	// If unmuted in non-excluded channel
	if (newState.channel && oldState.mute === true && newState.mute === false && oldUserChannel === newUserChannel &&
		settings.channels.mutedChannels.includes(newUserChannel) === false) {
		const members = newState.channel.members.filter(member => !member.user.bot && !member.voice.mute)
		if (members.size == 2) {
			for (const member of members) {
				const profile = await client.functions.fetchProfile(client, member[0], member[1].guild.id)
				profile.startTime = newDate
				await profile.save()
				//console.log(`[VOICE-STATE-${member[1].user.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${member[1].displayName} startTime 2 set, unmuted in non-excluded channel`)
			}
		} else if (members.size > 2) {
			const profile = await client.functions.fetchProfile(client, newState.id, newState.guild.id)
			profile.startTime = newDate
			await profile.save()
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member?.displayName} startTime 2 set, unmuted in non-excluded channel`)
		}
		return
	}
	// If joined non-excluded channel
	if (newState.channel && oldUserChannel == null && newUserChannel !== null &&
		settings.channels.mutedChannels.includes(newUserChannel) === false) {
		const members = newState.channel.members.filter(member => !member.user.bot && !member.voice.mute)
		if (members.size == 2) {
			for (const member of members) {
				const profile = await client.functions.fetchProfile(client, member[0], member[1].guild.id)
				profile.startTime = newDate
				await profile.save()
				//console.log(`[VOICE-STATE-${member[1].user.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${member[1].displayName} startTime 3 set, joined non-excluded channel`)
			}
		} else if (members.size > 2) {
			const profile = await client.functions.fetchProfile(client, newState.id, newState.guild.id)
			profile.startTime = newDate
			await profile.save()
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member?.displayName} startTime 3 set, joined non-excluded channel`)
		}
		return
	} 
	// If left non-excluded channel
	if (oldState.channel && oldState.mute === false && newUserChannel === null && oldUserChannel !== null &&
		settings.channels.mutedChannels.includes(oldUserChannel) === false) {
		const members = oldState.channel.members.filter(member => !member.user.bot && !member.voice.mute)
		if (members.size === 1) {
			memberLeaveChannel({ client: client, userID: newState.id || oldState.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			memberLeaveChannel({ client: client, userID: members.first().user.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${members.first().user.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${members.first().displayName} ${oldState.member?.displayName} endTime 3 set for both: one of two left non-excluded channel`)
		} else if (members.size > 1) {
			memberLeaveChannel({ client: client, userID: newState.id || oldState.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member?.displayName} endTime 3 set, left non-excluded channel`)
		} else sessionStatsReset({ client: client, profile: await client.functions.fetchProfile(client, newState.id || oldState.id, newState.guild.id), settings: settings, newState: newState })
		return
	} 
	// If moved from non-excluded channel to excluded channel
	if (oldState.channel && oldState.mute === false && newState.mute === false && oldUserChannel !== null && oldUserChannel !== newUserChannel &&
		settings.channels.mutedChannels.includes(oldUserChannel) === false && 
		settings.channels.mutedChannels.includes(newUserChannel) === true) {
		const members = oldState.channel.members.filter(member => !member.user.bot && !member.voice.mute)
		if (members.size == 1) {
			memberLeaveChannel({ client: client, userID: newState.id || oldState.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			memberLeaveChannel({ client: client, userID: members.first().user.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${members.first().user.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${members.first().displayName} ${oldState.member?.displayName} endTime 4 set for both: one of two moved from non-excluded to excluded channel`)
		} else if (members.size > 1) {
			memberLeaveChannel({ client: client, userID: newState.id || oldState.id, guild: newState.guild, settings: settings, oldState: oldState, newState: newState, newDate: newDate })
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member.displayName} endTime 4 set, moved from non-excluded to excluded channel`)
		} else sessionStatsReset({ client: client, profile: await client.functions.fetchProfile(client, newState.id || oldState.id, newState.guild.id), settings: settings, newState: newState })
		return
	} 
	// If moved from excluded channel to non-excluded channel
	if (newState.channel && oldState.mute === false && newState.mute === false && newUserChannel !== null && oldUserChannel !== newUserChannel &&
		settings.channels.mutedChannels.includes(oldUserChannel) === true && 
		settings.channels.mutedChannels.includes(newUserChannel) === false) {
		const members = newState.channel.members.filter(member => !member.user.bot && !member.voice.mute)
		if (members.size == 2) {
			for (const member of members) {
				const profile = await client.functions.fetchProfile(client, member[0], member[1].guild.id)
				profile.startTime = newDate
				await profile.save()
				//console.log(`[VOICE-STATE-${member[1].user.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${member[1].displayName} startTime 4 set, moved from excluded to non-excluded channel`)
			}
		} else if (members.size > 2){
			const profile = await client.functions.fetchProfile(client, newState.id, newState.guild.id)
			profile.startTime = newDate
			await profile.save()
			//console.log(`[VOICE-STATE-${newState.id}] [<t:${Math.round(newDate.valueOf() / 1000)}>] ${newState.member.displayName} startTime 4 set, moved from excluded to non-excluded channel`)
		}
		return
	}
	// If left non-excluded channel while muted
	if (newState.channelId !== oldState.channelId && ((!newState.channel && oldState.channel) || (newState.channel && settings.channels.mutedChannels.includes(newState.channelId))) && oldState.mute) {
		sessionStatsReset({ client: client, profile: await client.functions.fetchProfile(client, newState.id || oldState.id, newState.guild.id), settings: settings, newState: newState })
	}
	} catch (error) {
		handleError(error, { ownerId: client.config.discord.ownerId, context: 'VoiceStateUpdate Event' })
	}
})
async function memberLeaveChannel({ client, userID, guild, settings, oldState, newState, newDate }) {
	let profile = client.cache.profiles.get(guild.id + userID)
	if (profile) {
		if (profile.startTime !== undefined) {
			const member = await guild.members.fetch(profile.userID).catch(e => null)
			if (member) {
				client.globalCooldown[`${guild.id}_${profile.userID}`] = Date.now() + 10000
				const timeDiff = newDate - profile.startTime
				const { channel } = oldState
				const hours = timeDiff/1000/60/60
				if (hours > 100) {
					delete client.globalCooldown[`${guild.id}_${profile.userID}`]
					profile.itemsSession = undefined
					profile.hoursSession = 0
					profile.xpSession = 0
					profile.currencySession = 0
					profile.startTime = undefined
					await profile.save()
					return
				}
				const rewards = {
					xp: 0,
					currency: 0,
					rp: 0
				}
				if (!member.roles.cache.hasAny(...settings.roles?.mutedRoles)) {
					if (settings.xpForVoice && !profile.blockActivities?.voice?.XP) {
						let xp_multiplier_for_channel = 0
						let xp_multiplier_for_members = 0
						if (channel) {
							let channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === channel.id && channelMultipliers.isEnabled)
							if (!channelMultipliers) channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === channel.parentId && channelMultipliers.isEnabled)
							if (channelMultipliers) {
								let members_size = channel.members.filter(member => !member.voice.mute && !member.user.bot).size
								if (members_size < channelMultipliers.xp_min_members_size) members_size = 0
								if (members_size > channelMultipliers.xp_max_members_size) members_size = channelMultipliers.xp_max_members_size
								xp_multiplier_for_channel = channelMultipliers.xp_multiplier
								xp_multiplier_for_members = channelMultipliers.xp_multiplier_for_members * members_size
							}
						}
						const base_xp = timeDiff/1000/60 * settings.xpForVoice
						const xp = base_xp + (base_xp * profile.getXpBoost(xp_multiplier_for_channel + xp_multiplier_for_members))
						if (xp) rewards.xp += xp
					}
					if (settings.rpForVoice && !profile.blockActivities?.voice?.RP) {
						let rp_multiplier_for_channel = 0
						let rp_multiplier_for_members = 0
						if (channel) {
							let channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === channel.id && channelMultipliers.isEnabled)
							if (!channelMultipliers) channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === channel.parentId && channelMultipliers.isEnabled)
							if (channelMultipliers) {
								let members_size = channel.members.filter(member => !member.voice.mute && !member.user.bot).size
								if (members_size < channelMultipliers.rp_min_members_size) members_size = 0
								if (members_size > channelMultipliers.rp_max_members_size) members_size = channelMultipliers.rp_max_members_size
								rp_multiplier_for_channel = channelMultipliers.rp_multiplier
								rp_multiplier_for_channel = channelMultipliers.rp_multiplier_for_members * members_size
							}
						}
						const base_rp = timeDiff/1000/60 * settings.rpForVoice
						const rp = base_rp + (base_rp * profile.getRpBoost(rp_multiplier_for_channel + rp_multiplier_for_members))
						if (rp) rewards.rp += rp
					}
					if (settings.curForVoice && !profile.blockActivities?.voice?.CUR) {
						let cur_multiplier_for_channel = 0
						let cur_multiplier_for_members = 0
						if (channel) {
							let channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === channel.id && channelMultipliers.isEnabled)
							if (!channelMultipliers) channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === channel.parentId && channelMultipliers.isEnabled)
							if (channelMultipliers) {
								let members_size = channel.members.filter(member => !member.voice.mute && !member.user.bot).size
								if (members_size < channelMultipliers.cur_min_members_size) members_size = 0
								if (members_size > channelMultipliers.cur_max_members_size) members_size = channelMultipliers.cur_max_members_size
								cur_multiplier_for_channel = channelMultipliers.cur_multiplier
								cur_multiplier_for_members = channelMultipliers.cur_multiplier_for_members * members_size
							}
						}
						const base_cur = timeDiff/1000/60 * settings.curForVoice
						const cur = base_cur + (base_cur * profile.getCurBoost(cur_multiplier_for_channel + cur_multiplier_for_members))
						if (cur) {
							rewards.currency += cur
						}
					}
					const guildQuests = client.cache.quests.filter(quest => quest.guildID === guild.id && quest.isEnabled && quest.targets.some(target => target.type === "voice"))
					if (guildQuests.size) await profile.addQuestProgression("voice", hours*60, channel?.id)
					let achievements = client.cache.achievements.filter(e => e.guildID === guild.id && e.type === AchievementType.DailyHours && e.enabled)
					await Promise.all(achievements.map(async achievement => {
						if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.hoursSession >= achievement.amount && !client.tempAchievements[member.user.id]?.includes(achievement.id)) { 
							if (!client.tempAchievements[profile.userID]) client.tempAchievements[member.user.id] = []
							client.tempAchievements[member.user.id].push(achievement.id)
							await profile.addAchievement(achievement)
						}
					}))
					achievements = client.cache.achievements.filter(e => e.guildID === guild.id && e.type === AchievementType.Voice && e.enabled)
					await Promise.all(achievements.map(async achievement => {
						if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.hours >= achievement.amount && !client.tempAchievements[member.user.id]?.includes(achievement.id)) {
							if (!client.tempAchievements[profile.userID]) client.tempAchievements[member.user.id] = []
							client.tempAchievements[member.user.id].push(achievement.id)
							await profile.addAchievement(achievement)
						}
					}))
				}
				if (rewards.xp > 1000000000000) rewards.xp = 1000000000000
				profile.hours = hours
				profile.hoursSession += hours
				profile.xpSession += rewards.xp
				profile.rpSession += rewards.rp
				profile.currencySession += rewards.currency
				profile.currency = rewards.currency
				profile.startTime = undefined
				if (rewards.xp) await profile.addXp(rewards.xp)
				if (rewards.rp) await profile.addRp(rewards.rp)
				if (rewards.currency > 0) await profile.addCurrency(rewards.currency)
				if (!member.roles.cache.hasAny(...settings.roles?.mutedRoles) && !profile.blockActivities?.voice?.items) {
					let luck_multiplier_for_channel = 0
					let luck_multiplier_for_members = 0
					if (channel) {
						let channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === channel.id && channelMultipliers.isEnabled)
						if (!channelMultipliers) channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === channel.parentId && channelMultipliers.isEnabled)
						if (channelMultipliers) {
							let members_size = channel.members.filter(member => !member.voice.mute && !member.user.bot).size
							if (members_size < channelMultipliers.luck_min_members_size) members_size = 0
							if (members_size > channelMultipliers.luck_max_members_size) members_size = channelMultipliers.luck_max_members_size
							luck_multiplier_for_channel = channelMultipliers.luck_multiplier
							luck_multiplier_for_members = channelMultipliers.luck_multiplier_for_members * members_size
						}
					}
					let Items = client.cache.items.filter(item => item.guildID === guild.id && !item.temp && item.enabled && item.activities?.voice?.chance).sort((a, b) => a.activities.voice.chance - b.activities.voice.chance).map(e => { 
						return { itemID: e.itemID, displayEmoji: e.displayEmoji, name: e.name, activities: { voice: { chance: e.activities.voice.chance, amountFrom: e.activities.voice.amountFrom, amountTo: e.activities.voice.amountTo } }, activities_voice_permission: e.activities_voice_permission }
					})
					if (Items.length) {
						const received_items = []
						let count = Math.round((hours*60))
						const bonus = new Decimal(1).plus(profile.getLuckBoost(luck_multiplier_for_channel))
						Items = client.functions.adjustActivityChanceByLuck(Items, bonus, "voice")
						for (let i = 0; i < count; i++) {
							let base_chance = Math.random()
							if (base_chance === 0) base_chance = 1
							const asyncFilter = async (arr, predicate) => {
								const results = await Promise.all(arr.map(predicate))
								return results.filter((_v, index) => results[index])
							}
							let items = await asyncFilter(Items, async (e) => {
								if (e.activities_voice_permission) {
									const permission = client.cache.permissions.find(i => i.id === e.activities_voice_permission)
									if (permission) {
										const isPassing = permission.for(profile, member, channel)
										if (isPassing.value === true) return e	
									} else return e
								} else return e
							})
							const item = drop(items, base_chance)
							if (item) {
								const amount = client.functions.getRandomNumber(item.activities.voice.amountFrom, item.activities.voice.amountTo)
								await profile.addItem(item.itemID, amount)
								const received_item = received_items.find(e => { return e.itemID === item.itemID })
								if (received_item) received_item.amount += amount
								else {
									received_items.push({
										itemID: item.itemID,
										name: item.name,
										displayEmoji: item.displayEmoji,
										amount: amount,
									})
								}
							}
						}
						if (received_items.length) {
							let index = 0
							for (const received_item of received_items) {
								const sessionItem = profile.itemsSession?.find(e => { return e.itemID === received_item.itemID })
								if (sessionItem) {
									sessionItem.amount += received_item.amount
								} else {
									if (!profile.itemsSession) profile.itemsSession = []
									profile.itemsSession.push({
										itemID: received_item.itemID,
										amount: received_item.amount,
									})
								}
								received_items[index] = `**${received_item.displayEmoji}${received_item.name}** (${received_item.amount})`
								index++
							}
							if (settings.channels.itemsNotificationChannelId) {
								const channel = await guild.channels.fetch(settings.channels.itemsNotificationChannelId).catch(e => null)
								if (channel && channel.permissionsFor(guild.members.me).has("SendMessages")) {
									const embed2 = new EmbedBuilder()
										.setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
										.setDescription(`${client.language({ textId: "Found", guildId: guild.id })}:\n${received_items.join("\n")}`)
										.setColor("#2F3236")
									channel.send({ content: profile.itemMention ? `<@${member.user.id}>` : ` `, embeds: [embed2] }).catch(e => null)
								}
							}
						}	
					}
				}
				delete client.globalCooldown[`${guild.id}_${profile.userID}`]
				await profile.save()
			}
		}
		if (
			userID === oldState.id &&
			oldState.channelId !== null && 
			settings.channels.mutedChannels.includes(oldState.channelId) === false && 
			(	
				newState.channelId === null || 
				settings.channels.mutedChannels.includes(newState.channelId) === true
			)
		) sessionStatsReset({ client: client, profile: profile, settings: settings, newState: newState })	
	}
}
async function sessionStatsReset({ client, profile, settings, newState }) {
	if (!profile) return
	const { member } = newState
	if (profile.hoursSession >= 0.1) {
		if (member) {
			if (settings.channels?.botChannelId) {
				const channel = member.guild.channels.cache.get(settings.channels.botChannelId)
				if (!channel) {
					const settings = client.cache.settings.get(member.guild.id)
					settings.channels.botChannelId = undefined
					await settings.save()
				}
				else {
					if (channel && channel.permissionsFor(newState.guild.members.me)?.has("SendMessages")) {
						const itemsSessionArray = []
						if (profile.itemsSession?.length) {
							for (const item of profile.itemsSession) {
								const serverItem = client.cache.items.find(i => i.itemID === item.itemID && !i.temp && i.enabled)
								if (serverItem) {
									itemsSessionArray.push(`> ${serverItem.displayEmoji}****${serverItem.name}**** (${item.amount})`)	
								} else {
									itemsSessionArray.push(`> ${client.config.emojis.NO}${client.language({ textId: "Error: unknown item", guildId: newState.guild.id })} (${item.itemID}) (${item.amount})`)	
								}
							}    
						}
						const settings = client.cache.settings.get(newState.guild.id)
						const session_reward_embed = new EmbedBuilder()
							.setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
							.setColor(member.displayHexColor)
							.setDescription(`${client.language({ textId: "For chatting in voice channel you", guildId: newState.guild.id })} ${profile.sex === "male" ? `${client.language({ textId: "received_male", guildId: newState.guild.id })}` : profile.sex === "female" ? `${client.language({ textId: "received_female", guildId: newState.guild.id })}` : `${client.language({ textId: "received", guildId: newState.guild.id })}`}:\n${client.config.emojis.mic}${profile.hoursSession.toFixed(1)} => ${client.config.emojis.XP}${profile.xpSession.toFixed()} ${settings.displayCurrencyEmoji}${(profile.currencySession).toFixed()} ${client.config.emojis.RP}${profile.rpSession.toFixed(2)}\n${itemsSessionArray.join("\n")}`)
						channel.send({ embeds: [session_reward_embed] }).catch(e => null)
					}	
				}
			} 
		}
	}
	profile.itemsSession = []
	profile.hoursSession = 0
	profile.xpSession = 0
	profile.currencySession = 0
	profile.rpSession = 0
	await profile.save()
}
const lerp = (min, max, roll) => ((1 - roll) * min + roll * max)
const drop = (items, roll) => {
	const chance = lerp(0, 100, roll)
	let current = new Decimal(0)
	for (const item of items) {
		if (current.lte(chance) && current.plus(item.activities.voice.chance).gte(chance)) {
			return item
		}
		current = current.plus(item.activities.voice.chance)
	}
}