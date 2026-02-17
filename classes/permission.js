const { parse } = require('date-format-parse')
class Permission {
	constructor(client, permission) {
		this.client = client
		this.id = permission.id
		this.guildID = permission.guildID
		this.name = permission.name
		this.enable = permission.enable
		this.requirements = permission.requirements
	}
	async save() {
		await this.client.permissionSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined }), { upsert: true })
	}
	async delete() {
		await Promise.all(this.client.cache.items.filter(e => e.buyPermission === this.id).map(async item => {
			item.buyPermission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.sellPermission === this.id).map(async item => {
			item.sellPermission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.openPermission === this.id).map(async item => {
			item.openPermission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.activities_message_permission === this.id).map(async item => {
			item.activities_message_permission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.activities_voice_permission === this.id).map(async item => {
			item.activities_voice_permission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.activities_like_permission === this.id).map(async item => {
			item.activities_like_permission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.activities_invite_permission === this.id).map(async item => {
			item.activities_invite_permission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.activities_bump_permission === this.id).map(async item => {
			item.activities_bump_permission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.activities_fishing_permission === this.id).map(async item => {
			item.activities_fishing_permission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.activities_mining_permission === this.id).map(async item => {
			item.activities_mining_permission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.usePermission === this.id).map(async item => {
			item.usePermission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.transferPermission === this.id).map(async item => {
			item.transferPermission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.dropPermission === this.id).map(async item => {
			item.dropPermission = undefined
			await item.save()
		}))
		await Promise.all(this.client.cache.items.filter(e => e.crafts?.some(c => c.permission === this.id)).map(async item => {
			const craft = item.crafts.find(c => { return c.permission === this.id})
			craft.permission = undefined
			await item.save()
		}))
		await this.client.giftSchema.updateMany({ permission: this.id }, { $unset: { permission: 1 } })
		this.client.cache.giveaways.filter(giveaway => giveaway.permission === this.id).forEach(giveaway => {
			delete giveaway.permission
			giveaway.save()
		})
		await Promise.all(this.client.cache.quests.filter(e => e.takePermission === this.id || e.donePermission === this.id).map(async quest => {
			if (quest.takePermission === this.id) {
				quest.takePermission = undefined
			}
			if (quest.donePermission === this.id) {
				quest.donePermission = undefined
			}
			await quest.save()
		}))
		await Promise.all(this.client.cache.roles.filter(e => e.permission === this.id).map(async role => {
            role.permission = undefined
			role.disable()
            await role.save()
        }))
		this.client.cache.wormholes.filter(wormhole => wormhole.permission === this.id).forEach(wormhole => {
			delete wormhole.permission
			wormhole.save()
		})
		this.client.cache.jobs.filter(job => job.action1.permission === this.id).forEach(job => {
			job.action1.permission = undefined
			job.save()
		})
		this.client.cache.jobs.filter(job => job.action2.permission === this.id).forEach(job => {
			job.action2.permission = undefined
			job.save()
		})
		await Promise.all(this.client.cache.settings.filter(settings => settings.customRolePermission === this.id || settings.takeDailyQuestPermission === this.id || settings.giveawayRerollPermission === this.id || settings.giveawayManagerPermission === this.id || settings.auctions_permission === this.id || settings.currency_transfer_permission === this.id || settings.currency_drop_permission === this.id).map(async settings => {
			if (settings.customRolePermission === this.id) {
				settings.customRolePermission = undefined
			}
			if (settings.takeDailyQuestPermission === this.id) {
				settings.takeDailyQuestPermission = undefined
			}
			if (settings.giveawayRerollPermission === this.id) {
				settings.giveawayRerollPermission = undefined
			}
			if (settings.giveawayManagerPermission === this.id) {
				settings.giveawayManagerPermission = undefined
			}
			if (settings.auctions_permission === this.id) {
				settings.auctions_permission = undefined
			}
			if (settings.currency_drop_permission === this.id) {
				settings.currency_drop_permission = undefined
			}
			if (settings.currency_transfer_permission === this.id) {
				settings.currency_transfer_permission = undefined
			}
			await settings.save()
		}))
		await this.client.permissionSchema.deleteOne({ id: this.id })
		await Promise.all(this.client.cache.promocodeAutogenerators.filter(e => e.permission === this.id).map(async autogenerator => {
			autogenerator.permission = undefined
			await autogenerator.save()
		}))
		await Promise.all(this.client.cache.promocodes.filter(e => e.permission === this.id).map(async promocode => {
			promocode.permission = undefined
			await promocode.save()
		}))
		this.client.cache.permissions.delete(this.id)
	}
	for(profile, member, channel, interaction) {
		const isPassing = { value: true, reasons: [] }
		if (this.enable === true) {
			for (const req of this.requirements) {
				let amount = []
				if (interaction) {
					if (req.minAmount !== undefined && req.maxAmount !== undefined && req.minAmount === req.maxAmount) amount.push(req.id === "MemberSince" ? `\`${this.client.functions.transformSecs(this.client, req.maxAmount * 60 * 1000, interaction.guildId, interaction.locale)}\`` : req.id.includes("multiply") ? `${req.maxAmount * 100}%` : req.maxAmount)
					else if (req.minAmount !== undefined || req.maxAmount !== undefined) {
						if (req.minAmount !== undefined) amount.push(`${this.client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${req.id === "MemberSince" ? `\`${this.client.functions.transformSecs(this.client, req.minAmount * 60 * 1000, interaction.guildId, interaction.locale)}\`` : req.id.includes("multiply") ? `${req.minAmount * 100}%` : req.minAmount }`)
						if (req.maxAmount !== undefined) amount.push(`${this.client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${req.id === "MemberSince" ? `\`${this.client.functions.transformSecs(this.client, req.maxAmount * 60 * 1000, interaction.guildId, interaction.locale)}\`` : req.id.includes("multiply") ? `${req.maxAmount * 100}%` : req.maxAmount }`)
					}	
				}
				switch (req.id) {
					case "item":
						let item
						if (interaction) item = this.client.cache.items.get(req.itemID)
						const userItemAmount = profile.inventory.find(e => e.itemID === req.itemID)?.amount || 0
						if (userItemAmount < req.minAmount || userItemAmount > req.maxAmount) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${item?.displayEmoji || ""} ${item?.name || req.itemID} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${item?.displayEmoji || ""} ${item?.name || req.itemID} (${userItemAmount})`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${item?.displayEmoji || ""} ${item?.name || req.itemID} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${item?.displayEmoji || ""} ${item?.name || req.itemID} (${userItemAmount})`)
						}
						break
					case "achievement": {
						let achievement
						if (interaction) achievement = this.client.cache.achievements.get(req.achievementID)
						if (!profile.achievements?.some(e => e.achievmentID === req.achievementID)) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${achievement?.displayEmoji || ""} ${achievement?.name || req.achievementID}`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${achievement?.displayEmoji || ""} ${achievement?.name || req.achievementID}`)
						}
						break
					}
					case "achievement-":
						let achievement
						if (interaction) achievement = this.client.cache.achievements.get(req.achievementID)
						if (profile.achievements?.some(e => e.achievmentID === req.achievementID)) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${achievement?.displayEmoji || ""} ${achievement?.name || req.achievementID}`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${achievement?.displayEmoji || ""} ${achievement?.name || req.achievementID}`)
						}
						break
					case "quest":
						let quest
						if (interaction) quest = this.client.cache.quests.get(req.questID)
						if (!profile.quests?.some(e => e.questID === req.questID && e.finished)) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${quest?.displayEmoji || ""} ${quest?.name || req.questID}`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${quest?.displayEmoji || ""} ${quest?.name || req.questID}`)
						}
						break
					case "roles":
						switch (req.filter) {
							case "hasAll":
								if (!member.roles.cache.hasAll(...req.roles)) {
									isPassing.value = false
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: "User must have the following roles", guildId: interaction.guildId, locale: interaction.locale })}: ${req.roles.map(e => `<@&${e}>`).join(", ")}`)
								} else {
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: "User must have the following roles", guildId: interaction.guildId, locale: interaction.locale })}: ${req.roles.map(e => `<@&${e}>`).join(", ")}`)
								}
								break
							case "hasAny":
								if (!member.roles.cache.hasAny(...req.roles)) {
									isPassing.value = false
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: "User must have one of the following roles", guildId: interaction.guildId, locale: interaction.locale })}: ${req.roles.map(e => `<@&${e}>`).join(", ")}`)
								} else {
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: "User must have one of the following roles", guildId: interaction.guildId, locale: interaction.locale })}: ${req.roles.map(e => `<@&${e}>`).join(", ")}`)
								}
								break
							case "except":
								if (member.roles.cache.hasAny(...req.roles)) {
									isPassing.value = false
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: "User must not have one of the following roles", guildId: interaction.guildId, locale: interaction.locale })}: ${req.roles.map(e => `<@&${e}>`).join(", ")}`)
								} else {
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: "User must not have one of the following roles", guildId: interaction.guildId, locale: interaction.locale })}: ${req.roles.map(e => `<@&${e}>`).join(", ")}`)
								}
								break
						}
						break
					case "channels":
						switch (req.filter) {
							case "includes":
								if (!channel || !req.channels.includes(channel.id)) {
									isPassing.value = false
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: "Channel must be one of", guildId: interaction.guildId, locale: interaction.locale })}: ${req.channels.map(e => `<#${e}>`).join(", ")}`)
								} else {
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: "Channel must be one of", guildId: interaction.guildId, locale: interaction.locale })}: ${req.channels.map(e => `<#${e}>`).join(", ")}`)
								}
								break
							case "notIncludes":
								if (!channel || req.channels.includes(channel.id)) {
									isPassing.value = false
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: "Channel must not be one of", guildId: interaction.guildId, locale: interaction.locale })}: ${req.channels.map(e => `<#${e}>`).join(", ")}`)
								} else {
									if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: "Channel must not be one of", guildId: interaction.guildId, locale: interaction.locale })}: ${req.channels.map(e => `<#${e}>`).join(", ")}`)
								}
								break
						}
						break
					case "time":
						const startTime = parse(req.startTime + " +00:00", 'HH:mm ZZ')
						let endTime = parse(req.endTime + " +00:00", 'HH:mm ZZ')
						endTime = parse(req.endTime + " +00:00", 'HH:mm ZZ', endTime < startTime ? { backupDate: new Date(new Date().setDate(new Date().getDate()+1)) } : undefined)
						const startHours = startTime.getUTCHours() + startTime.getUTCMinutes()/60
						let endHours = endTime.getUTCHours() + endTime.getUTCMinutes()/60
						const nowHours = new Date().getUTCHours() + new Date().getUTCMinutes()/60
						if (startHours > endHours) {
							if (nowHours >= startHours || nowHours <= endHours) {
								if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${req.startTime}-${req.endTime} (UTC). ${this.client.language({ textId: "Now", guildId: interaction.guildId, locale: interaction.locale })} ${new Date().getUTCHours() < 10 ? `0${new Date().getUTCHours()}` : new Date().getUTCHours()}:${new Date().getUTCMinutes() < 10 ? `0${new Date().getUTCMinutes()}` : new Date().getUTCMinutes()} (UTC)`)
							} else {
								isPassing.value = false
								if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${req.startTime}-${req.endTime} (UTC). ${this.client.language({ textId: "Now", guildId: interaction.guildId, locale: interaction.locale })} ${new Date().getUTCHours() < 10 ? `0${new Date().getUTCHours()}` : new Date().getUTCHours()}:${new Date().getUTCMinutes() < 10 ? `0${new Date().getUTCMinutes()}` : new Date().getUTCMinutes()} (UTC)`)
							}
						} else {
							if (startHours > nowHours || endHours < nowHours) {
								isPassing.value = false
								if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${req.startTime}-${req.endTime} (UTC). ${this.client.language({ textId: "Now", guildId: interaction.guildId, locale: interaction.locale })} ${new Date().getUTCHours() < 10 ? `0${new Date().getUTCHours()}` : new Date().getUTCHours()}:${new Date().getUTCMinutes() < 10 ? `0${new Date().getUTCMinutes()}` : new Date().getUTCMinutes()} (UTC)`)
							} else {
								if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} ${req.startTime}-${req.endTime} (UTC). ${this.client.language({ textId: "Now", guildId: interaction.guildId, locale: interaction.locale })} ${new Date().getUTCHours() < 10 ? `0${new Date().getUTCHours()}` : new Date().getUTCHours()}:${new Date().getUTCMinutes() < 10 ? `0${new Date().getUTCMinutes()}` : new Date().getUTCMinutes()} (UTC)`)
							}	
						}
						break
					case "day":
						if (!req.days.includes(new Date().getDay())) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })}: ${req.days.join(", ").replace("1", this.client.language({ textId: "Monday", guildId: interaction.guildId, locale: interaction.locale })).replace("2", this.client.language({ textId: "Tuesday", guildId: interaction.guildId, locale: interaction.locale })).replace("3", this.client.language({ textId: "Wednesday", guildId: interaction.guildId, locale: interaction.locale })).replace("4", this.client.language({ textId: "Thursday", guildId: interaction.guildId, locale: interaction.locale })).replace("5", this.client.language({ textId: "Friday", guildId: interaction.guildId, locale: interaction.locale })).replace("6", this.client.language({ textId: "Saturday", guildId: interaction.guildId, locale: interaction.locale })).replace("0", this.client.language({ textId: "Sunday", guildId: interaction.guildId, locale: interaction.locale }))}. ${this.client.language({ textId: "Today", guildId: interaction.guildId, locale: interaction.locale })}: ${new Date().getDay() === 0 ? this.client.language({ textId: "Sunday", guildId: interaction.guildId, locale: interaction.locale }) : new Date().getDay() === 1 ? this.client.language({ textId: "Monday", guildId: interaction.guildId, locale: interaction.locale })  : new Date().getDay() === 2 ? this.client.language({ textId: "Tuesday", guildId: interaction.guildId, locale: interaction.locale })  : new Date().getDay() === 3 ? this.client.language({ textId: "Wednesday", guildId: interaction.guildId, locale: interaction.locale })  : new Date().getDay() === 4 ? this.client.language({ textId: "Thursday", guildId: interaction.guildId, locale: interaction.locale })  : new Date().getDay() === 5 ? this.client.language({ textId: "Friday", guildId: interaction.guildId, locale: interaction.locale }) : this.client.language({ textId: "Saturday", guildId: interaction.guildId, locale: interaction.locale }) }`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })}: ${req.days.join(", ").replace("1", this.client.language({ textId: "Monday", guildId: interaction.guildId, locale: interaction.locale })).replace("2", this.client.language({ textId: "Tuesday", guildId: interaction.guildId, locale: interaction.locale })).replace("3", this.client.language({ textId: "Wednesday", guildId: interaction.guildId, locale: interaction.locale })).replace("4", this.client.language({ textId: "Thursday", guildId: interaction.guildId, locale: interaction.locale })).replace("5", this.client.language({ textId: "Friday", guildId: interaction.guildId, locale: interaction.locale })).replace("6", this.client.language({ textId: "Saturday", guildId: interaction.guildId, locale: interaction.locale })).replace("0", this.client.language({ textId: "Sunday", guildId: interaction.guildId, locale: interaction.locale }))}. ${this.client.language({ textId: "Today", guildId: interaction.guildId, locale: interaction.locale })}: ${new Date().getDay() === 0 ? this.client.language({ textId: "Sunday", guildId: interaction.guildId, locale: interaction.locale }) : new Date().getDay() === 1 ? this.client.language({ textId: "Monday", guildId: interaction.guildId, locale: interaction.locale })  : new Date().getDay() === 2 ? this.client.language({ textId: "Tuesday", guildId: interaction.guildId, locale: interaction.locale })  : new Date().getDay() === 3 ? this.client.language({ textId: "Wednesday", guildId: interaction.guildId, locale: interaction.locale })  : new Date().getDay() === 4 ? this.client.language({ textId: "Thursday", guildId: interaction.guildId, locale: interaction.locale })  : new Date().getDay() === 5 ? this.client.language({ textId: "Friday", guildId: interaction.guildId, locale: interaction.locale }) : this.client.language({ textId: "Saturday", guildId: interaction.guildId, locale: interaction.locale }) }`)
						}
						break
					case "MemberSince":
						if (((Date.now() - member.joinedTimestamp) / 1000 / 60) < req.minAmount || ((Date.now() - member.joinedTimestamp) / 1000 / 60) > req.maxAmount) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You're on server", guildId: interaction.guildId, locale: interaction.locale })}: \`${this.client.functions.transformSecs(this.client, Date.now() - member.joinedTimestamp, interaction.guildId, interaction.locale)}\``)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You're on server", guildId: interaction.guildId, locale: interaction.locale })}: \`${this.client.functions.transformSecs(this.client, Date.now() - member.joinedTimestamp, interaction.guildId, interaction.locale)}\``)
						}
						break
					case "multiplyXP": {
						let luck_multiplier_for_channel = 0
						let ch = this.client.cache.channels.find(ch => ch.id === channel.id && ch.isEnabled)
						if (!ch) ch = this.client.cache.channels.find(ch => ch.id === channel.parentId && ch.isEnabled)
						if (ch) {
							luck_multiplier_for_channel = ch.luck_multiplier
						}
						if (profile.getXpBoost(luck_multiplier_for_channel) < req.minAmount || profile.getXpBoost(luck_multiplier_for_channel) > req.maxAmount) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.getXpBoost()}`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.getXpBoost()}`)
						}
						break
					}
					case "multiplyRP": {
						let luck_multiplier_for_channel = 0
						let ch = this.client.cache.channels.find(ch => ch.id === channel.id && ch.isEnabled)
						if (!ch) ch = this.client.cache.channels.find(ch => ch.id === channel.parentId && ch.isEnabled)
						if (ch) {
							luck_multiplier_for_channel = ch.luck_multiplier
						}
						if (profile.getRpBoost(luck_multiplier_for_channel) < req.minAmount || profile.getRpBoost(luck_multiplier_for_channel) > req.maxAmount) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.getRpBoost() * 100}%`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.getRpBoost() * 100}%`)
						}
						break
					}
					case "multiplyCUR": {
						let luck_multiplier_for_channel = 0
						let ch = this.client.cache.channels.find(ch => ch.id === channel.id && ch.isEnabled)
						if (!ch) ch = this.client.cache.channels.find(ch => ch.id === channel.parentId && ch.isEnabled)
						if (ch) {
							luck_multiplier_for_channel = ch.luck_multiplier
						}
						if (profile.getCurBoost(luck_multiplier_for_channel) < req.minAmount || profile.getCurBoost(luck_multiplier_for_channel) > req.maxAmount) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.getCurBoost() * 100}%`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.getCurBoost() * 100}%`)
						}
						break
					}
					case "multiplyLuck": {
						let luck_multiplier_for_channel = 0
						let ch = this.client.cache.channels.find(ch => ch.id === channel.id && ch.isEnabled)
						if (!ch) ch = this.client.cache.channels.find(ch => ch.id === channel.parentId && ch.isEnabled)
						if (ch) {
							luck_multiplier_for_channel = ch.luck_multiplier
						}
						if (profile.getLuckBoost(luck_multiplier_for_channel) < req.minAmount || profile.getLuckBoost(luck_multiplier_for_channel) > req.maxAmount) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.getLuckBoost() * 100}%`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.getLuckBoost() * 100}%`)
						}
						break
					}
					default:
						if ((eval(`profile.${req.id}`) || 0) < req.minAmount || (eval(`profile.${req.id}`) || 0) > req.maxAmount) {
							isPassing.value = false
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${(eval(`profile.${req.id}`)) || 0}`)
						} else {
							if (interaction) isPassing.reasons.push(`${this.client.config.emojis.YES} ${this.client.language({ textId: req.id, guildId: interaction.guildId, locale: interaction.locale })} (${amount.join(" ")}). ${this.client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${(eval(`profile.${req.id}`)) || 0}`)
						}
						break
				}
			}
		} else {
			isPassing.value = false
			if (interaction) isPassing.reasons.push(`${this.client.config.emojis.NO} ${this.client.language({ textId: "This interaction is disabled by permission", guildId: interaction.guildId, locale: interaction.locale })}`)
		}
		return isPassing
	}
}
module.exports = Permission