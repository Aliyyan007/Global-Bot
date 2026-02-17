const { Collection } = require("discord.js")
const lt = require('long-timeout')
const { RewardType, AchievementType } = require("../enums")
class Giveaway {
	constructor(client, giveaway) {
		this.client = client
		this.guildID = giveaway.guildID
		this.giveawayID = giveaway.giveawayID
		this.creator = giveaway.creator
		this.type = giveaway.type
		this.channelId = giveaway.channelId
		this.messageId = giveaway.messageId
		this.url = giveaway.url
		this.endsTime = giveaway.endsTime
		this.winnerCount = giveaway.winnerCount
		this.rewards = giveaway.rewards
		this.status = giveaway.status
		this.description = giveaway.description
		this.thumbnail = giveaway.thumbnail
		this.permission = giveaway.permission
		this.deleteTemp = giveaway.deleteTemp
		this.winners = giveaway.winners
		this.ends = giveaway.ends
	}
	async save() {
		await this.client.giveawaySchema.updateOne({ giveawayID: this.giveawayID }, {
			guildID: this.guildID,
			giveawayID: this.giveawayID,
			creator: this.creator,
			type: this.type,
			channelId: this.channelId,
			messageId: this.messageId,
			url: this.url,
			endsTime: this.endsTime,
			winnerCount: this.winnerCount,
			rewards: this.rewards,
			status: this.status,
			description: this.description,
			thumbnail: this.thumbnail,
			permission: this.permission,
			deleteTemp: this.deleteTemp,
			winners: this.winners,
			ends: this.ends
		})
	}
	async delete() {
		await this.client.giveawaySchema.deleteOne({ giveawayID: this.giveawayID })
		if (this.timeoutEndId) this.clearTimeoutEnd()
		if (this.timeoutDeleteId) this.clearTimeoutDelete()
		this.client.cache.giveaways.delete(this.giveawayID)
	}
	async end(guild, reaction) {
		let users = await reaction.users.fetch().catch(e => null)
        while (users.size % 100 === 0) {
            const newUsers = await reaction.users.fetch({ after: users.lastKey() })
            if (newUsers.size === 0) break
            users = users.concat(newUsers)
        }
        const asyncFilter = async (arr, predicate) => {
            const results = await Promise.all(arr.map(predicate))
            return results.filter((_v, index) => results[index])
        }
        users = await asyncFilter(users, async (user) => {
            const member = await guild.members.fetch(user.id).catch(e => null)
            if (member && user.bot === false && (this.type === `user` ? user.id !== this.creator : true)) {
				if (this.permission) {
					const permission = this.client.cache.permissions.get(this.permission)
					if (permission) {
						const profile = await this.client.functions.fetchProfile(this.client, user.id, this.guildID)
						const isPassing = permission.for(profile, member, member.voice.channel)
						if (isPassing.value === true) return user
					} else return user
				} else return user
            }
        })
        users = new Collection(users.map(object => {
			return [object.id, object]
		}))
        users = users.random(this.winnerCount)
        if (users.length) this.winners = users.map(e => e.id)
        this.status = "finished"
        this.deleteTemp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
		this.clearTimeoutEnd()
		this.endsTime = undefined
        this.save()
        const rewards = []
        let index = 0
        for (let user of users) {
	        const profile = await this.client.functions.fetchProfile(this.client, user.id, this.guildID)
	        for (const element of this.rewards) {
	            if (element.type === RewardType.Currency) {
					const settings = this.client.cache.settings.get(this.guildID)
					await profile.addCurrency(this.type === `user` ? element.amount/users.length : element.amount)
					if (index === 0) rewards.push(`${settings.displayCurrencyEmoji}${this.type === `user` ? element.amount/users.length : element.amount}`)
	            } else if (element.type === RewardType.Experience) {
					await profile.addXp(element.amount)
	                if (index === 0) rewards.push(`${this.client.config.emojis.XP}${element.amount}`)
	            } else if (element.type === RewardType.Reputation) {
					await profile.addRp(element.amount)
	                if (index === 0) rewards.push(`${this.client.config.emojis.RP}${element.amount}`)
	            } else if (element.type === RewardType.Item) {
	                const rewardItem = this.client.cache.items.get(element.id)
	                if (rewardItem) {
						await profile.addItem(rewardItem.itemID, this.type === `user` ? element.amount/users.length : element.amount)
						if (index === 0) rewards.push(`${rewardItem.displayEmoji}${rewardItem.name} (${this.type === `user` ? element.amount/users.length : element.amount})`)
	            	} else {
						if (index === 0) rewards.push(`${element.id} (${this.type === `user` ? element.amount/users.length : element.amount})`)
	            	}
	            } else if (element.type === RewardType.Text) {
					if (index === 0) rewards.push(`📝${element.id} (${this.type === `user` ? element.amount/users.length : element.amount})`)
	            } else if (element.type === RewardType.Role) {
					profile.addRole(element.id, this.type === `user` ? element.amount/users.length : element.amount, element.ms)
					if (index === 0) rewards.push(`<@&${element.id}>${element.ms ? ` [${this.client.functions.transformSecs(this.client, element.ms, this.guildID)}]` : ``} (${this.type === `user` ? element.amount/users.length : element.amount})`)
				}
	        }
			profile.giveawayWins += 1
			const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.GiveawayWins && e.enabled)
            await Promise.all(achievements.map(async achievement => {
                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.giveawayWins >= achievement.amount && !this.client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                    if (!this.client.tempAchievements[profile.userID]) this.client.tempAchievements[profile.userID] = []
                    this.client.tempAchievements[profile.userID].push(achievement.id)
                    await profile.addAchievement(achievement)
                }    
            }))
			await profile.save()
	        index++
	    }
        return { winners: users, rewards: rewards }
	}
	async reroll(guild, reaction) {
		let users = await reaction.users.fetch().catch(e => null)
        while (users.size % 100 === 0) {
            const newUsers = await reaction.users.fetch({ after: users.lastKey() })
            if (newUsers.size === 0) break
            users = users.concat(newUsers)
        }
        const asyncFilter = async (arr, predicate) => {
            const results = await Promise.all(arr.map(predicate))
            return results.filter((_v, index) => results[index])
        }
        users = await asyncFilter(users, async (user) => {
            const member = await guild.members.fetch(user.id).catch(e => null)
            if (member && user.bot === false && (this.type === `user` ? user.id !== this.creator : true)) {
				if (this.permission) {
					const permission = this.client.cache.permissions.get(this.permission)
					if (permission) {
						const profile = await this.client.functions.fetchProfile(this.client, user.id, this.guildID)
						const isPassing = permission.for(profile, member, member.voice.channel)
						if (isPassing.value === true) return user
					} else return user
				} else return user
            }
        })
        users = new Collection(users.map(object => {
            return [object.id, object]
          }),)
        users = users.filter(e => !this.winners.includes(e.id)).random(this.winnerCount)
        if (users.length) {
	        this.winners.push(...users.map(e => e.id))
	        this.deleteTemp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
			this.clearTimeoutDelete()
			this.setTimeoutDelete()
	        this.save()	
        }
        const rewards = []
        let index = 0
        for (let user of users) {
	        const profile = await this.client.functions.fetchProfile(this.client, user.id, this.guildID)
	        for (const element of this.rewards) {
	            if (element.type === RewardType.Currency) {
					const settings = this.client.cache.settings.get(this.guildID)
					await profile.addCurrency(this.type === `user` ? element.amount/users.length : element.amount)
					if (index === 0) rewards.push(`${settings.displayCurrencyEmoji}${this.type === `user` ? element.amount/users.length : element.amount}`)
	            } else
	            if (element.type === RewardType.Experience) {
					await profile.addXp(element.amount)
	                if (index === 0) rewards.push(`${this.client.config.emojis.XP}${element.amount}`)
	            } else
	            if (element.type === RewardType.Reputation) {
					await profile.addRp(element.amount)
	                if (index === 0) rewards.push(`${this.client.config.emojis.RP}${element.amount}`)
	            } else
	            if (element.type === RewardType.Item) {
	                const rewardItem = this.client.cache.items.get(element.id)
	                if (rewardItem) {
						await profile.addItem(rewardItem.itemID, this.type === `user` ? element.amount/users.length : element.amount)
						if (index === 0) rewards.push(`${rewardItem.displayEmoji}${rewardItem.name} (${this.type === `user` ? element.amount/users.length : element.amount})`)
	            	} else {
						if (index === 0) rewards.push(`${element.id} (${this.type === `user` ? element.amount/users.length : element.amount})`)
	            	}
	            } else if (element.type === RewardType.Text) {
					if (index === 0) rewards.push(`📝${element.id} (${this.type === `user` ? element.amount/users.length : element.amount})`)
	            } else if (element.type === RewardType.Role) {
					profile.addRole(element.id, this.type === `user` ? element.amount/users.length : element.amount, element.ms)
					if (index === 0) rewards.push(`<@&${element.id}>${element.ms ? ` [${this.client.functions.transformSecs(this.client, element.ms, this.guildID)}]` : ``} (${this.type === `user` ? element.amount/users.length : element.amount})`)
				}
	        }
			profile.giveawayWins += 1
			const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.GiveawayWins && e.enabled)
            await Promise.all(achievements.map(async achievement => {
                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.giveawayWins >= achievement.amount && !this.client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                    if (!this.client.tempAchievements[profile.userID]) this.client.tempAchievements[profile.userID] = []
                    this.client.tempAchievements[profile.userID].push(achievement.id)
                    await profile.addAchievement(achievement)
                }    
            }))
			await profile.save()
	        index++
	    }
        return { winners: users, rewards: rewards }
	}
	setTimeoutEnd() {
		this.timeoutEndId = lt.setTimeout(() => {
			this.client.emit("giveawayEnd", this)
		}, this.endsTime.getTime() - Date.now())
	}
	setTimeoutDelete() {
		this.timeoutDeleteId = setTimeout(async () => {
			if (this.status === "mod") {
				const guild = this.client.guilds.cache.get(this.guildID)
				const profile = await this.client.functions.fetchProfile(this.client, this.creator, guild.id)
				for (const element of this.rewards) {
					if (element.type === RewardType.Currency) {
						profile.currency = element.amount
					}
					else if (element.type === RewardType.Item) {
						const item = this.client.cache.items.find(i => i.itemID === element.id && !i.temp)
						if (item) await profile.addItem(element.id, element.amount)
					} else if (element.type === RewardType.Role) {
						const role = interaction.guild.roles.cache.get(element.id)
						if (role) profile.addRole(element.id, element.amount, element.ms)
					}
				}
				await profile.save()
			}
			this.delete()
		}, this.deleteTemp.getTime() - Date.now())
	}
	clearTimeoutEnd() {
		lt.clearTimeout(this.timeoutEndId)
		delete this.timeoutEndId
	}
	clearTimeoutDelete() {
		clearTimeout(this.timeoutDeleteId)
		delete this.timeoutDeleteId
	}
}
module.exports = Giveaway