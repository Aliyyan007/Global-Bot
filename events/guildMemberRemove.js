const client = require("../index")
const { EmbedBuilder, Events, SnowflakeUtil } = require("discord.js")
const { handleError } = require("../handler/errorHandler")
const { handleMemberLeave } = require("../modules/notification-channels/eventIntegration")

client.on(Events.GuildMemberRemove, async (member) => {
	try {
		if (client.blacklist(member.guild.id, "full_ban", "guilds")) return
	if (client.blacklist(member.user.id, "full_ban", "users")) return
	
	// Send goodbye notification if configured (send for all members, even without profile)
	await handleMemberLeave(member, client).catch(e => console.error('Error sending goodbye notification:', e))
	
	const settings = client.cache.settings.get(member.guild.id)
	const removedProfile = client.cache.profiles.get(member.guild.id + member.user.id)
	if (!removedProfile) return
	if (removedProfile.marry) {
		const marriedProfile = await client.functions.fetchProfile(client, removedProfile.marry, member.guild.id)
		marriedProfile.marry = undefined
		await marriedProfile.save()
		removedProfile.marry = undefined
	}
	removedProfile.deleteFromDB = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
	await removedProfile.save()
	const memberInviter = removedProfile.inviterInfo?.userID ? await member.guild.members.fetch(removedProfile.inviterInfo.userID).catch(e => null) : null 
	if (!memberInviter || memberInviter.user.bot) return
	await client.customRoleSchema.deleteMany({ userID: member.user.id })
	const profile = await client.functions.fetchProfile(client, removedProfile.inviterInfo.userID, removedProfile.guildID)
	const rewards = [`${client.config.emojis.invite}**${client.language({ textId: "Invite", guildId: member.guild.id })}** (1)`]
	for (const item of removedProfile.inviterInfo.items) {
		if (item.itemID == "currency") {
			profile.currency = item.amount*-1
			rewards.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${item.amount})`)
		}
		if (item.itemID == "xp") {
			await profile.subtractXp(item.amount)
			rewards.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: member.guild.id })}** (${item.amount})`)
		}
		if (item.itemID == "rp") {
			if (profile.rp > 0) {
				profile.rp -= item.amount
				rewards.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: member.guild.id })}** (${item.amount})`)
			}
		}
		if (item.itemID !== "currency" && item.itemID !== "xp" && item.itemID !== "rp") {
			const serverItem = client.cache.items.find(i => i.itemID === item.itemID && i.guildID === member.guild.id && !item.temp && item.enabled)
			if (serverItem) {
				const userItem = profile.inventory.find((e) => { return e.itemID == serverItem.itemID && e.amount > 0 })
				if (userItem) {
					await profile.subtractItem(serverItem.itemID, userItem.amount < item.amount ? userItem.amount : item.amount)
					rewards.push(`${serverItem.displayEmoji}**${serverItem.name}** (${item.amount})`)
				}	
			}
		}
	}
	profile.invites = -1
	await profile.save()
	removedProfile.inviterInfo = undefined
	await removedProfile.save()
	if (settings.channels?.botChannelId) {
		const channel = member.guild.channels.cache.get(settings.channels.botChannelId)
		if (!channel) {
			const settings = client.cache.settings.get(member.guild.id)
			settings.channels.botChannelId = undefined
			return await settings.save()
		}
		const nonce = SnowflakeUtil.generate().toString()
		channel.send({ 
			content: profile.inviteLeaveMention ? `<@${member.user.id}>` : ` `, 
			embeds: [
				new EmbedBuilder()
					.setColor(memberInviter.displayHexColor)
					.setAuthor({ name: memberInviter.displayName, iconURL: memberInviter.user.avatarURL() })
					.setDescription(`${client.language({ textId: "Your invitee", guildId: member.guild.id })} **${member.displayName}** (<@${member.user.id}>) ${client.language({ textId: "left the server", guildId: member.guild.id })}\n${client.language({ textId: "Lost", guildId: member.guild.id })}:\n${rewards.join("\n")}`)
					.setThumbnail(member.user.avatarURL())
			],
			enforceNonce: true, nonce: nonce,
		}).catch(e => null)
	}
	} catch (error) {
		handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildMemberRemove Event' })
	}
})