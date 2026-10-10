const { RewardType } = require("../enums")
const client = require("../index")
const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js")
const { handleError } = require("../handler/errorHandler")
const { handleMemberJoin } = require("../modules/notification-channels/eventIntegration")
const { returnGiveawayRewards } = require("../handler/giveawayHelpers")

client.on(Events.GuildMemberAdd, async (member) => {
	try {
		const { guild } = member
	const giveaways = client.cache.giveaways.filter(giveaway => giveaway.ends?.type === "members" && giveaway.status === "started" && giveaway.ends.amount >= guild.memberCount && giveaway.guildID === guild.id)
	if (giveaways.size) {
		await Promise.all(giveaways.map(async giveaway => {
			try {
				const channel = await guild.channels.fetch(giveaway.channelId).catch(e => null)
				if (!channel) {
					await returnGiveawayRewards(client, giveaway, guild)
					return giveaway.delete()
				}
				const giveawayMessage = await channel.messages.fetch({ message: giveaway.messageId, cache: false, force: true }).catch(e => null)
				if (!giveawayMessage) {
					await returnGiveawayRewards(client, giveaway, guild)
					return giveaway.delete()
				}
				if (!giveawayMessage.reactions) {
					await returnGiveawayRewards(client, giveaway, guild)
					return giveaway.delete()
				}
				let reaction = giveawayMessage.reactions.resolve("🎉")
				if (!reaction) {
					await returnGiveawayRewards(client, giveaway, guild)
					return giveaway.delete()
				}
				const object = await giveaway.end(guild, reaction)
				if (!object.winners.length) {
					await returnGiveawayRewards(client, giveaway, guild)
				}
				const embed = EmbedBuilder.from(giveawayMessage.embeds[0])
				embed.addFields([
					{
						name: `${client.language({ textId: "Winners", guildId: guild.id })}`,
						value: object.winners.length ? object.winners.length > 42 ? object.winners.slice(0, 42).map(e => `<@${e.id}>`).join(", ") + ` ${client.language({ textId: "and more", guildId: guild.id })} ${object.winners.length - 42}...` : object.winners.map(e => `<@${e.id}>`).join(", ") : `${client.language({ textId: "No suitable", guildId: guild.id })}`
					}
				])
				await giveawayMessage.edit({ 
					content: `${client.config.emojis.tada}${client.config.emojis.tada}${client.language({ textId: "GIVEAWAY ENDED", guildId: guild.id })}${client.config.emojis.tada}${client.config.emojis.tada}`, 
					embeds: [embed], 
					components: giveaway.permission && client.cache.permissions.get(giveaway.permission) ? 
						[ 
							new ActionRowBuilder()
								.addComponents(
									new ButtonBuilder()
										.setStyle(ButtonStyle.Primary)
										.setLabel(`${client.language({ textId: "Requirement", guildId: guild.id })}`)
										.setCustomId(`cmd{check-giveaway-requirements}giveaway{${giveaway.giveawayID}}`),
									new ButtonBuilder()
										.setStyle(ButtonStyle.Primary)
										.setLabel(`${client.language({ textId: "Reroll", guildId: guild.id })}`)
										.setCustomId(`cmd{giveaway-reroll}giveaway{${giveaway.giveawayID}}`)
								) 
						] : [
							new ActionRowBuilder()
								.addComponents(
									new ButtonBuilder()
										.setStyle(ButtonStyle.Primary)
										.setLabel(`${client.language({ textId: "Reroll", guildId: guild.id })}`)
										.setCustomId(`cmd{giveaway-reroll}giveaway{${giveaway.giveawayID}}`)
								)
						]
				})
				if (object.winners.length) {
					await giveawayMessage.reply({ 
						content: `🥳 ${object.winners.map(e => `<@${e.id}>`).join(", ")} [${client.language({ textId: "congratulations", guildId: guild.id })}! ${object.winners.length === 1 ? client.language({ textId: "You became the giveaway winner and won", guildId: guild.id }) : client.language({ textId: "You became the giveaway winners and won", guildId: guild.id })}](<${giveawayMessage.url}>): ${object.rewards.join(", ")}`,
						allowedMentions: { users: object.winners.map(e => e.id) } 
					})
				}
			} catch (err) {
				console.error(`Error processing giveaway ${giveaway.giveawayID}:`, err)
			}
		})).catch(err => console.error('Error processing giveaways:', err))
    }
	if (client.blacklist(guild.id, "full_ban", "guilds")) return
	if (client.blacklist(member.user.id, "full_ban", "users")) return
	
	// ============================================================
	// SENTINEL HUB SYSTEM (Advanced Bot Security Console)
	// Immediately neutralizes newly added bots and provides approval workflow
	// ============================================================
	if (member.user.bot) {
		try {
			console.log(`[Sentinel Hub] 🤖 Bot detected: ${member.user.tag}`)
			
			const safeModerationSchema = require("../schemas/safeModerationSchema")
			let config = await safeModerationSchema.findOne({ guildID: guild.id })
			
			// Check if Sentinel Hub is enabled
			if (config && config.sentinelHub?.enabled && client.sentinelHubHandler) {
				console.log(`[Sentinel Hub] 🛡️ Sentinel Hub is enabled, processing bot addition...`)
				const result = await client.sentinelHubHandler.handleBotDetection(member, config)
				
				if (result && result.success) {
					console.log(`[Sentinel Hub] ✅ Bot processed: ${member.user.tag} - ${result.action}`)
					console.log(`[Sentinel Hub] 📊 Neutralization: ${result.neutralizationSuccess ? 'Success' : 'Failed'}${result.partialSuccess ? ' (Partial)' : ''}`)
				} else {
					console.log('[Sentinel Hub] ⚠️ Bot processing failed:', result?.reason || 'Unknown reason')
				}
			} else {
				console.log('[Sentinel Hub] ⚠️ Sentinel Hub not enabled or handler not available')
			}
		} catch (sentinelHubError) {
			console.error('[Sentinel Hub] Error handling bot detection:', sentinelHubError)
		}
		
		// Return early for bots - don't process them through normal member logic
		return
	}
	
	if (member.user.bot) return
	const settings = client.cache.settings.get(guild.id)
	const profile = client.cache.profiles.get(guild.id+member.user.id)
	if (profile) {
		profile.deleteFromDB = undefined
		await profile.save()	
	}
	if (settings) {
		if (settings.roles?.rolesToNewMember?.length) await member.roles.add(settings.roles.rolesToNewMember).catch(e => null)
		if (profile) {
			if (settings.levelsRoles.length > 0) {
				const rolesAdd = settings.levelsRoles.filter(e => profile.level >= e.levelFrom && (!e.levelTo || e.levelTo > profile.level) && !member.roles.cache.has(e.roleId))
				for (const role of rolesAdd) {
					const guild_role = await member.guild.roles.fetch(role.roleId).catch(e => null)
					if (guild_role && member.guild.members.me?.roles.highest.position > guild_role.position) {
						await member.roles.add(role.roleId).catch(e => null)
					}
				}
				const rolesRemove = settings.levelsRoles.filter(e => (e.levelTo <= profile.level || e.levelFrom > profile.level) && member.roles.cache.has(e.roleId))
				for (const role of rolesRemove) {
					const guild_role = await member.guild.roles.fetch(role.roleId).catch(e => null)
					if (guild_role && member.guild.members.me?.roles.highest.position > guild_role.position) {
						await member.roles.remove(role.roleId).catch(e => null)
					}
				}
			}
		}
	}
	
	// Send welcome notification if configured
	try {
		await handleMemberJoin(member, client);
	} catch (e) {
		console.error('[guildMemberAdd] Error sending welcome notification:', e);
		console.error('[guildMemberAdd] Stack trace:', e.stack);
	}
	} catch (error) {
		handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildMemberAdd Event' })
	}
})
