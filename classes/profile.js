const { EmbedBuilder, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const profileSchema = require("../schemas/profileSchema.js")
const { RewardType, AchievementType } = require("../enums/index")
const Decimal = require("decimal.js")
const lt = require('long-timeout')
const uniqid = require('uniqid')
class Profile {
	constructor(client, profile) {
        this.client = client
        this.userID = profile.userID
        this.guildID = profile.guildID
        this.totalxp = profile.totalxp
        this.seasonTotalXp = profile.seasonTotalXp
        this.xp = profile.xp
        this.seasonXp = profile.seasonXp
        this.xpSession = profile.xpSession
        this.rpSession = profile.rpSession
        this.level = profile.level
        this.seasonLevel = profile.seasonLevel
        this.messages = profile.messages
        this.hours = profile.hours
        this.rp = profile.rp
        this.hoursSession = profile.hoursSession
        this.likes = profile.likes
        this.currency = profile.currency
        this.currencySession = profile.currencySession
        this.currencySpent = profile.currencySpent
        this.itemsSession = profile.itemsSession
        this.invites = profile.invites
        this.startTime = profile.startTime
        this.inviterInfo = profile.inviterInfo
        this.bio = profile.bio
        this.birthday_day = profile.birthday_day
        this.birthday_month = profile.birthday_month
        this.birthday_year = profile.birthday_year
        this.image = profile.image
        this.bumps = profile.bumps
        this.giveawaysCreated = profile.giveawaysCreated
        this.multiplyXP = profile.multiplyXP
        this.multiplyXPTime = profile.multiplyXPTime
        this.multiplyCUR = profile.multiplyCUR
        this.multiplyCURTime = profile.multiplyCURTime
        this.multiplyLuck = profile.multiplyLuck
        this.multiplyLuckTime = profile.multiplyLuckTime
        this.multiplyRP = profile.multiplyRP
        this.multiplyRPTime = profile.multiplyRPTime
        this.daysStreak = profile.daysStreak
        this.lastDaily = profile.lastDaily
        this.lastLike = profile.lastLike
        this.fishing = profile.fishing
        this.mining = profile.mining
        this.maxDaily = profile.maxDaily
        this.wormholeTouched = profile.wormholeTouched
        this.doneQuests = profile.doneQuests
        this.itemsSoldOnMarketPlace = profile.itemsSoldOnMarketPlace
        this.inventory = profile.inventory
        this.achievements = profile.achievements
        this.roles = profile.roles
        this.quests = profile.quests
        this.blockActivities = profile.blockActivities
        this.vk = profile.vk
        this.tiktok = profile.tiktok
        this.steam = profile.steam
        this.instagram = profile.instagram
        this.isHiden = profile.isHiden
        this.joinDateIsHiden = profile.joinDateIsHiden
        this.achievementsHiden = profile.achievementsHiden
        this.sex = profile.sex
        this.hideSex = profile.hideSex
        this.marry = profile.marry
        this.marryDate = profile.marryDate
        this.trophies = profile.trophies
        this.trophyHide = profile.trophyHide
        this.deleteFromDB = profile.deleteFromDB
        this.rank_card = profile.rank_card
        this.itemsOpened = profile.itemsOpened
        this.wormholesSpawned = profile.wormholesSpawned
        this.itemsReceived = profile.itemsReceived
        this.itemsCrafted = profile.itemsCrafted
        this.itemsUsed = profile.itemsUsed
        this.itemsBoughtInShop = profile.itemsBoughtInShop
        this.itemsBoughtOnMarket = profile.itemsBoughtOnMarket
        this.itemsSold = profile.itemsSold
        this.roleIncomeCooldowns = profile.roleIncomeCooldowns ? new Map(Object.entries(profile.roleIncomeCooldowns)) : undefined
        this.dailyLimits = profile.dailyLimits
        this.weeklyLimits = profile.weeklyLimits
        this.monthlyLimits = profile.monthlyLimits
        this.dropdownCooldowns = profile.dropdownCooldowns ? new Map(Object.entries(profile.dropdownCooldowns)) : undefined
        this.levelMention = profile.levelMention
        this.achievementMention = profile.achievementMention
        this.itemMention = profile.itemMention
        this.roleIncomeMention = profile.roleIncomeMention
        this.inviteJoinMention = profile.inviteJoinMention
        this.inviteLeaveMention = profile.inviteLeaveMention
        this.jobsCooldowns = profile.jobsCooldowns ? new Map(Object.entries(profile.jobsCooldowns)) : undefined
        this.allJobsCooldown = profile.allJobsCooldown
        this.itemsCooldowns = profile.itemsCooldowns ? new Map(Object.entries(profile.itemsCooldowns)) : undefined
        this.stats = profile.stats
        this.boosts = profile.boosts
        this.works = profile.works
        this.inventoryRoles = profile.inventoryRoles
        this.giveawayWins = profile.giveawayWins
        this.socialLinksHidden = profile.socialLinksHidden
        this.rolesHidden = profile.rolesHidden
        this.bioHidden = profile.bioHidden
        this.bannerHidden = profile.bannerHidden
        this.birthdateHidden = profile.birthdateHidden
        this.birthYearHidden = profile.birthYearHidden
        this.thumbnailHidden = profile.thumbnailHidden
        this.thumbnail = profile.thumbnail
        this.profileLikes = profile.profileLikes
        this.usersWhoLiked = profile.usersWhoLiked
        this.promocodesUsed = profile.promocodesUsed
        this.autoIncomeExpire = profile.autoIncomeExpire
        this.settings_open_ephemeral = profile.settings_open_ephemeral
        this.settings_open_always_maximum = profile.settings_open_always_maximum
        this.settings_open_disallow_luck = profile.settings_open_disallow_luck
        this.settings_open_always_active = profile.settings_open_always_active
        this.hiddenFromUsers = profile.hiddenFromUsers
        this.hiddenFromAll = profile.hiddenFromAll
        if (this.autoIncomeExpire && this.autoIncomeExpire > new Date()) {
            this.setAutoIncomeTimeout()
        } else if (this.autoIncomeExpire <= new Date()) {
            this.autoIncomeExpire = undefined
            this.save()
        }
	}
    async setAutoIncomeTimeout() {
        this.autoIncomeTimeoutId = lt.setTimeout(() => {
            if (this.nextIncomeTimeoutId) {
                lt.clearTimeout(this.nextIncomeTimeoutId)
                this.nextIncomeTimeoutId = undefined
            }
            this.autoIncomeExpire = undefined
            this.autoIncomeTimeoutId = undefined
        }, this.autoIncomeExpire.getTime() - Date.now())
        if (!this.nextIncomeTimeoutId) {
            let timeout = this.roleIncomeCooldowns && this.roleIncomeCooldowns.size ? Math.min.apply(null, Array.from(this.roleIncomeCooldowns.values()).map(value => value - Date.now()).filter(value => value > 0)) : 0
            // Only set timeout if there's a valid positive timeout value to prevent infinite loop
            if (timeout && timeout !== Infinity && timeout > 0) {
                this.nextIncomeTimeoutId = lt.setTimeout(async () => {
                    await this.getIncome()
                }, timeout)    
            }
        }
    }
    clearAutoIncomeTimeout() {
        lt.clearTimeout(this.autoIncomeTimeoutId)
        if (this.nextIncomeTimeoutId) {
            lt.clearTimeout(this.nextIncomeTimeoutId)
            this.nextIncomeTimeoutId = undefined
        }
    }
    async getIncome(interaction) {
        const guild = this.client.guilds.cache.get(this.guildID)
        const settings = this.client.cache.settings.find(settings => settings.guildID === guild.id)
        const income = {}
        const userRP = this.rp
        const member = await guild.members.fetch(this.userID).catch(e => null)
        if (member) {
            const asyncFilter = async (arr, predicate) => {
                const results = await Promise.all(arr.map(predicate))
                return results.filter((_v, index) => results[index])
            }
            let roles = this.client.cache.roles.filter(e => e.guildID === guild.id && e.isEnabled).map(e => e).sort(a => {
                if (a.type === "static") return 1
                else return -1
            })
            roles = await asyncFilter(roles, async (role) => {
                if (role.permission) {
                    const permission = this.client.cache.permissions.find(i => i.id === role.permission)
                    if (permission) {
                        const isPassing = permission.for(this, member)
                        if (isPassing.value === true) return role
                    } else return role
                } else return role
            })
            const modifier = {
                xp: 0,
                cur: 0,
                rp: 0
            }
            let pass = false
            let notification = true
            let totalIncome = {
                xp: 0,
                cur: 0,
                rp: 0,
                items: {}
            }
            for (const role_income of roles) {
                if (role_income.cooldown < 0.16) {
                    role_income.cooldown = 0.16
                    await role_income.save()
                }
                const guildRole = await member.guild.roles.fetch(role_income.id).catch(e => null)
                if (guildRole) {
                    if (member.roles.cache.has(role_income.id)) {
                        if (this.roleIncomeCooldowns && this.roleIncomeCooldowns.get(guildRole.id) > Date.now()) {
                            income[guildRole.id] = { cooldown: this.roleIncomeCooldowns.get(guildRole.id) }
                        } else {
                            pass = true
                            if (role_income.type === "static") {
                                if (role_income.xp) {
                                    const incomeAmount = role_income.xp + role_income.xp * (modifier.xp/100)
                                    totalIncome.xp += incomeAmount
                                    if (incomeAmount > 0) {
                                        await this.addXp(incomeAmount)
                                        if (!income[guildRole.id]) income[guildRole.id] = {}
                                        if (interaction) income[guildRole.id]["xp"] = `• ${this.client.config.emojis.XP}**${this.client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${incomeAmount.toLocaleString()}${modifier.xp > 0 ? ` +${modifier.xp}%` : modifier.xp < 0 ? ` ${modifier.xp}%` : ""})`
                                    }
                                    if (incomeAmount < 0) {
                                        await this.subtractXp(incomeAmount*-1)
                                        if (!income[guildRole.id]) income[guildRole.id] = {}
                                        if (interaction) income[guildRole.id]["xp"] = `• ${this.client.config.emojis.XP}**${this.client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${incomeAmount.toLocaleString()}${modifier.xp > 0 ? ` +${modifier.xp}%` : modifier.xp < 0 ? ` ${modifier.xp}%` : ""})`
                                    }
                                }
                                if (role_income.cur) {
                                    const incomeAmount = role_income.cur + role_income.cur * (modifier.cur/100)
                                    totalIncome.cur += incomeAmount
                                    if (incomeAmount > 0) {
                                        await this.addCurrency(incomeAmount)
                                        if (!income[guildRole.id]) income[guildRole.id] = {}
                                        if (interaction) income[guildRole.id]["cur"] = `• ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${incomeAmount.toLocaleString()}${modifier.cur > 0 ? ` +${modifier.cur}%` : modifier.cur < 0 ? ` ${modifier.cur}%` : ""})`
                                    }
                                    if (incomeAmount < 0) {
                                        await this.subtractCurrency(incomeAmount*-1)
                                        if (!income[guildRole.id]) income[guildRole.id] = {}
                                        if (interaction) income[guildRole.id]["cur"] = `• ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${incomeAmount.toLocaleString()}${modifier.cur > 0 ? ` +${modifier.cur}%` : modifier.cur < 0 ? ` ${modifier.cur}%` : ""})`
                                    }
                                }
                                if (role_income.rp) {
                                    const incomeAmount = role_income.rp + role_income.rp * (modifier.rp/100)
                                    totalIncome.rp += incomeAmount
                                    if (incomeAmount > 0 && userRP < 1000 && userRP >= -1000) {
                                        await this.addRp(incomeAmount)
                                        if (!income[guildRole.id]) income[guildRole.id] = {}
                                        if (interaction) income[guildRole.id]["rp"] = `• ${this.client.config.emojis.RP}**${this.client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${incomeAmount.toLocaleString()}${modifier.rp > 0 ? ` +${modifier.rp}%` : modifier.rp < 0 ? ` ${modifier.rp}%` : ""})`
                                    }
                                    if (incomeAmount < 0 && userRP <= 1000 && userRP > -1000) {
                                        await this.subtractRp(incomeAmount*-1)
                                        if (!income[guildRole.id]) income[guildRole.id] = {}
                                        if (interaction) income[guildRole.id]["rp"] = `• ${this.client.config.emojis.RP}**${this.client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${incomeAmount.toLocaleString()}${modifier.rp > 0 ? ` +${modifier.rp}%` : modifier.rp < 0 ? ` ${modifier.rp}%` : ""})`
                                    }
                                }
                                if (role_income.items.length) {
                                    for (let role_income_item of role_income.items) {
                                        const incomeAmount = role_income_item.amount + role_income_item.amount * ((modifier[role_income_item.itemID] || 0)/100)
                                        if (incomeAmount > 0) {
                                            const item = this.client.cache.items.find(e => e.itemID === role_income_item.itemID && e.enabled && !e.temp)
                                            if (item) {
                                                if (!totalIncome.items[item.itemID]) {
                                                    totalIncome.items[item.itemID] = incomeAmount
                                                } else {
                                                    totalIncome.items[item.itemID] += incomeAmount
                                                }
                                                await this.addItem(item.itemID, incomeAmount)
                                                if (!income[guildRole.id]) income[guildRole.id] = {}
                                                if (!income[guildRole.id].items) income[guildRole.id].items = []
                                                if (interaction) income[guildRole.id].items.push(`• ${item.displayEmoji}**${item.name}** (${incomeAmount.toLocaleString()}${(modifier[role_income_item.itemID] || 0) > 0 ? ` +${modifier[role_income_item.itemID]}%` : (modifier[role_income_item.itemID] || 0) < 0 ? ` ${modifier[role_income_item.itemID]}%` : ""})`)
                                            }
                                        }
                                        if (incomeAmount < 0) {
                                            const item = this.client.cache.items.find(e => e.itemID === role_income_item.itemID && e.enabled && !e.temp)
                                            if (item) {
                                                if (!totalIncome.items[item.itemID]) {
                                                    totalIncome.items[item.itemID] = incomeAmount
                                                } else {
                                                    totalIncome.items[item.itemID] += incomeAmount
                                                }
                                                await this.subtractItem(item.itemID, Math.abs(incomeAmount))
                                                if (!income[guildRole.id]) income[guildRole.id] = {}
                                                if (!income[guildRole.id].items) income[guildRole.id].items = []
                                                if (interaction) income[guildRole.id].items.push(`• ${item.displayEmoji}**${item.name}** (${incomeAmount.toLocaleString()}${(modifier[role_income_item.itemID] || 0) > 0 ? ` +${modifier[role_income_item.itemID]}%` : (modifier[role_income_item.itemID] || 0) < 0 ? ` ${modifier[role_income_item.itemID]}%` : ""})`)
                                            }
                                        }
                                    }
                                    if (income[guildRole.id] && income[guildRole.id].items?.length) {
                                        income[guildRole.id].items = income[guildRole.id].items.join("\n")
                                    }
                                }   
                            }
                            if (role_income.type === "dynamic") {
                                if (role_income.xp) {
                                    modifier.xp += role_income.xp
                                }
                                if (role_income.cur) {
                                    modifier.cur += role_income.cur
                                }
                                if (role_income.rp) {
                                    modifier.rp += role_income.rp
                                }
                                if (role_income.items.length) {
                                    for (let role_income_item of role_income.items) {
                                        const item = this.client.cache.items.find(e => e.itemID === role_income_item.itemID && e.enabled && !e.temp)
                                        if (item) {
                                            if (!modifier[item.itemID]) modifier[item.itemID] = role_income_item.amount
                                            else modifier[item.itemID] += role_income_item.amount
                                        }
                                    }
                                }
                            }
                            if (role_income.type === "static" && role_income.notification) notification = true
                            if (role_income.type === "static" && income[guildRole.id]) {
                                if (!this.roleIncomeCooldowns) this.roleIncomeCooldowns = new Map()
                                this.roleIncomeCooldowns.set(guildRole.id, new Date(Date.now() + ((role_income.cooldown || 1) * 60 * 60 * 1000)))
                            }
                            await this.save()
                        }
                    } else if (this.roleIncomeCooldowns && this.roleIncomeCooldowns.get(guildRole.id)) {
                        this.roleIncomeCooldowns.delete(guildRole.id)
                        await this.save()
                    }
                } else if (this.roleIncomeCooldowns && this.roleIncomeCooldowns.get(role_income.id)) {
                    this.roleIncomeCooldowns.delete(role_income.id)
                    await this.save()
                } 
            }
            if (this.autoIncomeExpire && this.roleIncomeCooldowns && this.roleIncomeCooldowns.size) {
                let timeout = Math.min.apply(null, Array.from(this.roleIncomeCooldowns.values()).map(value => value - Date.now()).filter(value => value > 0))
                // Only set timeout if there's a valid positive timeout value to prevent infinite loop
                if (timeout && timeout !== Infinity && timeout > 0) {
                    this.nextIncomeTimeoutId = lt.setTimeout(async () => {
                        await this.getIncome()
                    }, timeout)
                }
            }
            const totalIncome2 = []
            if (interaction) {
                if (totalIncome.xp) totalIncome2.push(`• ${this.client.config.emojis.XP}**${this.client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${totalIncome.xp.toLocaleString()})`)
                if (totalIncome.rp) totalIncome2.push(`• ${this.client.config.emojis.RP}**${this.client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${totalIncome.rp.toLocaleString()})`)
                if (totalIncome.cur) totalIncome2.push(`• ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${totalIncome.cur.toLocaleString()})`)
                if (Object.keys(totalIncome.items).length) {
                    Object.keys(totalIncome.items).forEach(itemID => {
                        const item = this.client.cache.items.find(e => e.itemID === itemID && e.enabled && !e.temp)
                        totalIncome2.push(`• ${item.displayEmoji}**${item.name}** (${totalIncome.items[itemID].toLocaleString()})`)
                    })
                }    
            }
            return { income, pass, notification, totalIncome: totalIncome2 }    
        } else {
            if (this.autoIncomeExpire) {
                this.autoIncomeExpire = undefined
                this.clearAutoIncomeTimeout()
                await this.save()
            }
        }
    }
	async save() {
        const clone = Object.assign({}, { ...this, client: undefined })
        delete clone.autoIncomeTimeoutId
        delete clone.nextIncomeTimeoutId
        // Convert underscore-prefixed properties to their proper names
        Object.keys(clone).filter(key => key.startsWith("_")).forEach(originalKey => {
            const newKey = originalKey.substring(1)
            clone[newKey] = clone[originalKey]
            delete clone[originalKey]
        })
        Object.keys(clone).forEach(key => {
            if (key === "stats" && clone[key]) {
                Object.keys(clone[key]).forEach(key2 => {
                    if (clone[key][key2] === 0) clone[key][key2] = undefined
                })
            }
            else if (clone[key] === 0) clone[key] = undefined
        })
		await profileSchema.replaceOne({ userID: clone.userID, guildID: clone.guildID }, clone, { upsert: true })
	}
	async delete() {
        if (this.autoIncomeTimeoutId) lt.clearTimeout(this.autoIncomeTimeoutId)
        if (this.nextIncomeTimeoutId) lt.clearTimeout(this.nextIncomeTimeoutId)
		await profileSchema.deleteOne({ userID: this.userID, guildID: this.guildID })
		this.client.cache.profiles.delete(this.guildID + this.userID)
	}
    get messages() { return this._messages || 0 }
    set messages(value) {
        if (!this._messages) this._messages = this.messages
        if (value === undefined) this._messages = value
        else this._messages += value
        if (!this.stats) {
            this.stats = {
                daily: { messages: 0 },
                weekly: { messages: 0 },
                monthly: { messages: 0 },
                yearly: { messages: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { messages: 0 }
            if (!this.stats.weekly) this.stats.weekly = { messages: 0 }
            if (!this.stats.monthly) this.stats.monthly = { messages: 0 }
            if (!this.stats.yearly) this.stats.yearly = { messages: 0 }
        }
        if (this.stats.daily.messages === undefined) this.stats.daily.messages = 0
        if (this.stats.weekly.messages === undefined) this.stats.weekly.messages = 0
        if (this.stats.monthly.messages === undefined) this.stats.monthly.messages = 0
        if (this.stats.yearly.messages === undefined) this.stats.yearly.messages = 0
        this.stats.daily.messages += value
        this.stats.weekly.messages += value
        this.stats.monthly.messages += value
        this.stats.yearly.messages += value
    }
    get totalxp() { return this._totalxp || 0 }
    set totalxp(value) {
        if (!this._totalxp) this._totalxp = this.totalxp
        if (value === undefined) this._totalxp = value
        else this._totalxp += value
        if (!this.stats) {
            this.stats = {
                daily: { totalxp: 0 },
                weekly: { totalxp: 0 },
                monthly: { totalxp: 0 },
                yearly: { totalxp: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { totalxp: 0 }
            if (!this.stats.weekly) this.stats.weekly = { totalxp: 0 }
            if (!this.stats.monthly) this.stats.monthly = { totalxp: 0 }
            if (!this.stats.yearly) this.stats.yearly = { totalxp: 0 }
        }
        if (this.stats.daily.totalxp === undefined) this.stats.daily.totalxp = 0
        if (this.stats.weekly.totalxp === undefined) this.stats.weekly.totalxp = 0
        if (this.stats.monthly.totalxp === undefined) this.stats.monthly.totalxp = 0
        if (this.stats.yearly.totalxp === undefined) this.stats.yearly.totalxp = 0
        this.stats.daily.totalxp += value
        this.stats.weekly.totalxp += value
        this.stats.monthly.totalxp += value
        this.stats.yearly.totalxp += value
    }
    get seasonTotalXp() { return this._seasonTotalXp || 0 }
    set seasonTotalXp(value) { this._seasonTotalXp = value }
    get xp() { return this._xp || 0 }
    set xp(value) { this._xp = value }
    get seasonXp() { return this._seasonXp || 0 }
    set seasonXp(value) { this._seasonXp = value }
    get xpSession() { return this._xpSession || 0 }
    set xpSession(value) { this._xpSession = value }
    get rpSession() { return this._rpSession || 0 }
    set rpSession(value) { this._rpSession = value }
    get hours() { return this._hours || 0 }
    set hours(value) {
        if (!this._hours) this._hours = this.hours
        if (value === undefined) this._hours = value
        else this._hours += value
        if (!this.stats) {
            this.stats = {
                daily: { hours: 0 },
                weekly: { hours: 0 },
                monthly: { hours: 0 },
                yearly: { hours: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { hours: 0 }
            if (!this.stats.weekly) this.stats.weekly = { hours: 0 }
            if (!this.stats.monthly) this.stats.monthly = { hours: 0 }
            if (!this.stats.yearly) this.stats.yearly = { hours: 0 }
        }
        if (this.stats.daily.hours === undefined) this.stats.daily.hours = 0
        if (this.stats.weekly.hours === undefined) this.stats.weekly.hours = 0
        if (this.stats.monthly.hours === undefined) this.stats.monthly.hours = 0
        if (this.stats.yearly.hours === undefined) this.stats.yearly.hours = 0
        this.stats.daily.hours += value
        this.stats.weekly.hours += value
        this.stats.monthly.hours += value
        this.stats.yearly.hours += value
    }
    get rp() { return this._rp || 0 }
    set rp(value) { 
        if (!this._rp) this._rp = this.rp
        if (value === undefined) this._rp = value
        else this._rp += value
        if (!this.stats) {
            this.stats = {
                daily: { rp: 0 },
                weekly: { rp: 0 },
                monthly: { rp: 0 },
                yearly: { rp: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { rp: 0 }
            if (!this.stats.weekly) this.stats.weekly = { rp: 0 }
            if (!this.stats.monthly) this.stats.monthly = { rp: 0 }
            if (!this.stats.yearly) this.stats.yearly = { rp: 0 }
        }
        if (this.stats.daily.rp === undefined) this.stats.daily.rp = 0
        if (this.stats.weekly.rp === undefined) this.stats.weekly.rp = 0
        if (this.stats.monthly.rp === undefined) this.stats.monthly.rp = 0
        if (this.stats.yearly.rp === undefined) this.stats.yearly.rp = 0
        this.stats.daily.rp += value
        this.stats.weekly.rp += value
        this.stats.monthly.rp += value
        this.stats.yearly.rp += value
    }
    get hoursSession() { return this._hoursSession || 0 }
    set hoursSession(value) { this._hoursSession = value }
    get likes() { return this._likes || 0 }
    set likes(value) { 
        if (!this._likes) this._likes = this.likes
        if (value === undefined) this._likes = value
        else this._likes += value
        if (!this.stats) {
            this.stats = {
                daily: { likes: 0 },
                weekly: { likes: 0 },
                monthly: { likes: 0 },
                yearly: { likes: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { likes: 0 }
            if (!this.stats.weekly) this.stats.weekly = { likes: 0 }
            if (!this.stats.monthly) this.stats.monthly = { likes: 0 }
            if (!this.stats.yearly) this.stats.yearly = { likes: 0 }
        }
        if (this.stats.daily.likes === undefined) this.stats.daily.likes = 0
        if (this.stats.weekly.likes === undefined) this.stats.weekly.likes = 0
        if (this.stats.monthly.likes === undefined) this.stats.monthly.likes = 0
        if (this.stats.yearly.likes === undefined) this.stats.yearly.likes = 0
        this.stats.daily.likes += value
        this.stats.weekly.likes += value
        this.stats.monthly.likes += value
        this.stats.yearly.likes += value
    }
    get currency() { return this._currency || 0 }
    set currency(value) { 
        if (!this._currency) this._currency = this.currency
        if (value === undefined) this._currency = value
        else this._currency += value
        if (!this.stats) {
            this.stats = {
                daily: { currency: 0 },
                weekly: { currency: 0 },
                monthly: { currency: 0 },
                yearly: { currency: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { currency: 0 }
            if (!this.stats.weekly) this.stats.weekly = { currency: 0 }
            if (!this.stats.monthly) this.stats.monthly = { currency: 0 }
            if (!this.stats.yearly) this.stats.yearly = { currency: 0 }
        }
        if (this.stats.daily.currency === undefined) this.stats.daily.currency = 0
        if (this.stats.weekly.currency === undefined) this.stats.weekly.currency = 0
        if (this.stats.monthly.currency === undefined) this.stats.monthly.currency = 0
        if (this.stats.yearly.currency === undefined) this.stats.yearly.currency = 0
        this.stats.daily.currency += value
        this.stats.weekly.currency += value
        this.stats.monthly.currency += value
        this.stats.yearly.currency += value
    }
    get currencySession() { return this._currencySession || 0 }
    set currencySession(value) { this._currencySession = value }
    get currencySpent() { return this._currencySpent || 0 }
    set currencySpent(value) { this._currencySpent = value }
    get invites() { return this._invites || 0 }
    set invites(value) { 
        if (!this._invites) this._invites = this.invites
        if (value === undefined) this._invites = value
        else this._invites += value
        if (!this.stats) {
            this.stats = {
                daily: { invites: 0 },
                weekly: { invites: 0 },
                monthly: { invites: 0 },
                yearly: { invites: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { invites: 0 }
            if (!this.stats.weekly) this.stats.weekly = { invites: 0 }
            if (!this.stats.monthly) this.stats.monthly = { invites: 0 }
            if (!this.stats.yearly) this.stats.yearly = { invites: 0 }
        }
        if (this.stats.daily.invites === undefined) this.stats.daily.invites = 0
        if (this.stats.weekly.invites === undefined) this.stats.weekly.invites = 0
        if (this.stats.monthly.invites === undefined) this.stats.monthly.invites = 0
        if (this.stats.yearly.invites === undefined) this.stats.yearly.invites = 0
        this.stats.daily.invites += value
        this.stats.weekly.invites += value
        this.stats.monthly.invites += value
        this.stats.yearly.invites += value
    }
    get bumps() { return this._bumps || 0 }
    set bumps(value) { 
        if (!this._bumps) this._bumps = this.bumps
        if (value === undefined) this._bumps = value
        else this._bumps += value
        if (!this.stats) {
            this.stats = {
                daily: { bumps: 0 },
                weekly: { bumps: 0 },
                monthly: { bumps: 0 },
                yearly: { bumps: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { bumps: 0 }
            if (!this.stats.weekly) this.stats.weekly = { bumps: 0 }
            if (!this.stats.monthly) this.stats.monthly = { bumps: 0 }
            if (!this.stats.yearly) this.stats.yearly = { bumps: 0 }
        }
        if (this.stats.daily.bumps === undefined) this.stats.daily.bumps = 0
        if (this.stats.weekly.bumps === undefined) this.stats.weekly.bumps = 0
        if (this.stats.monthly.bumps === undefined) this.stats.monthly.bumps = 0
        if (this.stats.yearly.bumps === undefined) this.stats.yearly.bumps = 0
        this.stats.daily.bumps += value
        this.stats.weekly.bumps += value
        this.stats.monthly.bumps += value
        this.stats.yearly.bumps += value
    }
    get giveawaysCreated() { return this._giveawaysCreated || 0 }
    set giveawaysCreated(value) { 
        if (!this._giveawaysCreated) this._giveawaysCreated = this.giveawaysCreated
        if (value === undefined) this._giveawaysCreated = value
        else this._giveawaysCreated += value
        if (!this.stats) {
            this.stats = {
                daily: { giveawaysCreated: 0 },
                weekly: { giveawaysCreated: 0 },
                monthly: { giveawaysCreated: 0 },
                yearly: { giveawaysCreated: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { giveawaysCreated: 0 }
            if (!this.stats.weekly) this.stats.weekly = { giveawaysCreated: 0 }
            if (!this.stats.monthly) this.stats.monthly = { giveawaysCreated: 0 }
            if (!this.stats.yearly) this.stats.yearly = { giveawaysCreated: 0 }
        }
        if (this.stats.daily.giveawaysCreated === undefined) this.stats.daily.giveawaysCreated = 0
        if (this.stats.weekly.giveawaysCreated === undefined) this.stats.weekly.giveawaysCreated = 0
        if (this.stats.monthly.giveawaysCreated === undefined) this.stats.monthly.giveawaysCreated = 0
        if (this.stats.yearly.giveawaysCreated === undefined) this.stats.yearly.giveawaysCreated = 0
        this.stats.daily.giveawaysCreated += value
        this.stats.weekly.giveawaysCreated += value
        this.stats.monthly.giveawaysCreated += value
        this.stats.yearly.giveawaysCreated += value
    }
    get multiplyXP() { return this._multiplyXP || 0 }
    set multiplyXP(value) { this._multiplyXP = value }
    get multiplyCUR() { return this._multiplyCUR || 0 }
    set multiplyCUR(value) { this._multiplyCUR = value }
    get multiplyLuck() { return this._multiplyLuck || 0 }
    set multiplyLuck(value) { this._multiplyLuck = value }
    get multiplyRP() { return this._multiplyRP || 0 }
    set multiplyRP(value) { this._multiplyRP = value }
    get fishing() { return this._fishing || 0 }
    set fishing(value) { this._fishing = value }
    get mining() { return this._mining || 0 }
    set mining(value) { this._mining = value }
    get maxDaily() { return this._maxDaily || 0 }
    set maxDaily(value) { this._maxDaily = value }
    get wormholeTouched() { return this._wormholeTouched || 0 }
    set wormholeTouched(value) { 
        if (!this._wormholeTouched) this._wormholeTouched = this.wormholeTouched
        if (value === undefined) this._wormholeTouched = value
        else this._wormholeTouched += value
        if (!this.stats) {
            this.stats = {
                daily: { wormholeTouched: 0 },
                weekly: { wormholeTouched: 0 },
                monthly: { wormholeTouched: 0 },
                yearly: { wormholeTouched: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { wormholeTouched: 0 }
            if (!this.stats.weekly) this.stats.weekly = { wormholeTouched: 0 }
            if (!this.stats.monthly) this.stats.monthly = { wormholeTouched: 0 }
            if (!this.stats.yearly) this.stats.yearly = { wormholeTouched: 0 }
        }
        if (this.stats.daily.wormholeTouched === undefined) this.stats.daily.wormholeTouched = 0
        if (this.stats.weekly.wormholeTouched === undefined) this.stats.weekly.wormholeTouched = 0
        if (this.stats.monthly.wormholeTouched === undefined) this.stats.monthly.wormholeTouched = 0
        if (this.stats.yearly.wormholeTouched === undefined) this.stats.yearly.wormholeTouched = 0
        this.stats.daily.wormholeTouched += value
        this.stats.weekly.wormholeTouched += value
        this.stats.monthly.wormholeTouched += value
        this.stats.yearly.wormholeTouched += value
    }
    get doneQuests() { return this._doneQuests || 0 }
    set doneQuests(value) { 
        if (!this._doneQuests) this._doneQuests = this.doneQuests
        if (value === undefined) this._doneQuests = value
        else this._doneQuests += value
        if (!this.stats) {
            this.stats = {
                daily: { doneQuests: 0 },
                weekly: { doneQuests: 0 },
                monthly: { doneQuests: 0 },
                yearly: { doneQuests: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { doneQuests: 0 }
            if (!this.stats.weekly) this.stats.weekly = { doneQuests: 0 }
            if (!this.stats.monthly) this.stats.monthly = { doneQuests: 0 }
            if (!this.stats.yearly) this.stats.yearly = { doneQuests: 0 }
        }
        if (this.stats.daily.doneQuests === undefined) this.stats.daily.doneQuests = 0
        if (this.stats.weekly.doneQuests === undefined) this.stats.weekly.doneQuests = 0
        if (this.stats.monthly.doneQuests === undefined) this.stats.monthly.doneQuests = 0
        if (this.stats.yearly.doneQuests === undefined) this.stats.yearly.doneQuests = 0
        this.stats.daily.doneQuests += value
        this.stats.weekly.doneQuests += value
        this.stats.monthly.doneQuests += value
        this.stats.yearly.doneQuests += value
    }
    get itemsSoldOnMarketPlace() { return this._itemsSoldOnMarketPlace || 0 }
    set itemsSoldOnMarketPlace(value) { 
        if (!this._itemsSoldOnMarketPlace) this._itemsSoldOnMarketPlace = this.itemsSoldOnMarketPlace
        if (value === undefined) this._itemsSoldOnMarketPlace = value
        else this._itemsSoldOnMarketPlace += value
        if (!this.stats) {
            this.stats = {
                daily: { itemsSoldOnMarketPlace: 0 },
                weekly: { itemsSoldOnMarketPlace: 0 },
                monthly: { itemsSoldOnMarketPlace: 0 },
                yearly: { itemsSoldOnMarketPlace: 0 }
            }
        } else {
            if (!this.stats.daily) this.stats.daily = { itemsSoldOnMarketPlace: 0 }
            if (!this.stats.weekly) this.stats.weekly = { itemsSoldOnMarketPlace: 0 }
            if (!this.stats.monthly) this.stats.monthly = { itemsSoldOnMarketPlace: 0 }
            if (!this.stats.yearly) this.stats.yearly = { itemsSoldOnMarketPlace: 0 }
        }
        if (this.stats.daily.itemsSoldOnMarketPlace === undefined) this.stats.daily.itemsSoldOnMarketPlace = 0
        if (this.stats.weekly.itemsSoldOnMarketPlace === undefined) this.stats.weekly.itemsSoldOnMarketPlace = 0
        if (this.stats.monthly.itemsSoldOnMarketPlace === undefined) this.stats.monthly.itemsSoldOnMarketPlace = 0
        if (this.stats.yearly.itemsSoldOnMarketPlace === undefined) this.stats.yearly.itemsSoldOnMarketPlace = 0
        this.stats.daily.itemsSoldOnMarketPlace += value
        this.stats.weekly.itemsSoldOnMarketPlace += value
        this.stats.monthly.itemsSoldOnMarketPlace += value
        this.stats.yearly.itemsSoldOnMarketPlace += value
    }
    get itemsOpened() { return this._itemsOpened || 0 }
    set itemsOpened(value) { this._itemsOpened = value }
    get wormholesSpawned() { return this._wormholesSpawned || 0 }
    set wormholesSpawned(value) { this._wormholesSpawned = value }
    get itemsReceived() { return this._itemsReceived || 0 }
    set itemsReceived(value) { this._itemsReceived = value }
    get itemsCrafted() { return this._itemsCrafted || 0 }
    set itemsCrafted(value) { this._itemsCrafted = value }
    get itemsUsed() { return this._itemsUsed || 0 }
    set itemsUsed(value) { this._itemsUsed = value }
    get itemsBoughtInShop() { return this._itemsBoughtInShop || 0 }
    set itemsBoughtInShop(value) { this._itemsBoughtInShop = value }
    get itemsBoughtOnMarket() { return this._itemsBoughtOnMarket || 0 }
    set itemsBoughtOnMarket(value) { this._itemsBoughtOnMarket = value }
    get itemsSold() { return this._itemsSold || 0 }
    set itemsSold(value) { this._itemsSold = value }
    get lastDaily() { return this._lastDaily || new Date(Date.now() - 86400000) }
    set lastDaily(value) { this._lastDaily = value }
    get lastLike() { return this._lastLike || new Date(Date.now() - 86400000) }
    set lastLike(value) { this._lastLike = value }
    get boosts() { return this._boosts || 0 }
    set boosts(value) { this._boosts = value }
    get works() { return this._works || 0 }
    set works(value) { this._works = value }
    get giveawayWins() { return this._giveawayWins || 0 }
    set giveawayWins(value) { this._giveawayWins = value }
    get profileLikes() { return this._profileLikes || 0 }
    set profileLikes(value) { this._profileLikes = value }
    get promocodesUsed() { return this._promocodesUsed || 0 }
    set promocodesUsed(value) { this._promocodesUsed = value }
    async addCurrency(amount, save, withoutAchievement, withoutLogs, withoutNotification) {
        if (amount < 0) return await this.subtractCurrency(amount*-1, save)
        this.currency = amount
        if (!withoutLogs) this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Currency change", guildId: this.guildID })} (${amount}) ${this.client.language({ textId: "for", guildId: this.guildID })} <@${this.userID}>`)
        const guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "currency"))
        if (guildQuests.size && amount !== 0) await this.addQuestProgression("currency", amount, undefined, false, withoutNotification)
        if (!withoutAchievement) {
            const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.Currency && e.enabled)
            await Promise.all(achievements.map(async achievement => {
                if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && this.currency >= achievement.amount && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) {
                    if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                    this.client.tempAchievements[this.userID].push(achievement.id)
                    await this.addAchievement(achievement, false, withoutLogs, withoutNotification)
                }    
            }))
        }
        if (save) await this.save()
        return
    }
    async subtractCurrency(amount, save, withoutCurrencySpent) {
        this.currency = amount*-1
        if (!withoutCurrencySpent) this.currencySpent += amount
        this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Currency change", guildId: this.guildID })} (-${amount}) ${this.client.language({ textId: "for", guildId: this.guildID })} <@${this.userID}>`)
        const guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "currencySpent"))
        if (guildQuests.size && amount !== 0) await this.addQuestProgression("currencySpent", amount)
        const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.CurrencySpent && e.enabled)
        await Promise.all(achievements.map(async achievement => {
            if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && this.currencySpent >= achievement.amount && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) {
                if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                this.client.tempAchievements[this.userID].push(achievement.id)
                await this.addAchievement(achievement)
            }        
        }))
        if (save) await this.save()
        return
    }
    async addQuestProgression(type, amount, object, save, withoutNotification) {
        let guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && !quest.community)
        const guild = this.client.guilds.cache.get(this.guildID)
        if (guildQuests.size && guild) {
            const member = await guild.members.fetch(this.userID).catch(e => null)
            if (member) {
                const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
                if (!settings.roles?.mutedRoles?.length || !member.roles.cache.hasAny(...settings.roles.mutedRoles)) {
                    const activeQuests = this.quests?.filter((element) => element.finished === false && guildQuests.some(e => e.questID == element.questID && e.targets.some(t => t.type === type && element.targets?.find(et => et.targetID === t.targetID && !et.finished)))) || []
                    if (activeQuests.length) {
                        for (let quest of activeQuests) {
                            const guildQuest = guildQuests.find(e => e.questID == quest.questID)
                            for (const target of quest.targets) {
                                if (!target.finished) {
                                    const guildQuestTarget = guildQuest.targets.find((element) => { return element.targetID == target.targetID })
                                    if ((guildQuestTarget?.type === type && !object && !guildQuestTarget.object) || (guildQuestTarget?.type === type && object && ((guildQuestTarget.object && guildQuestTarget.object === object) || !guildQuestTarget.object))) {
                                        target.reached += amount
                                        if (target.reached >= guildQuestTarget.amount) {
                                            target.reached = guildQuestTarget.amount
                                            target.finished = true
                                            if (!withoutNotification) {
                                                const description = guildQuest.getDescription(guildQuestTarget)
                                                const imageURL = await this.client.functions.getEmojiURL(this.client, guildQuest.emoji)
                                                const container = new ContainerBuilder()
                                                    .addTextDisplayComponents([
                                                        new TextDisplayBuilder()
                                                            .setContent([
                                                                `-# ${this.client.language({ textId: "Server", guildId: guild.id })} ${guild.name}`
                                                            ].join("\n"))
                                                    ])
                                                if (imageURL) {
                                                    container.addSectionComponents([
                                                        new SectionBuilder()
                                                            .addTextDisplayComponents([
                                                                new TextDisplayBuilder()
                                                                    .setContent([
                                                                        `# ${guildQuest.name}`,
                                                                        `## ${this.client.language({ textId: "Subtask completed", guildId: guild.id })}`
                                                                    ].join("\n"))
                                                            ])
                                                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(imageURL))
                                                    ])
                                                } else {
                                                    container.addTextDisplayComponents([
                                                        new TextDisplayBuilder()
                                                            .setContent([
                                                                `# ${guildQuest.name}`,
                                                                `## ${this.client.language({ textId: "Subtask completed", guildId: guild.id })}`
                                                            ].join("\n"))
                                                    ])
                                                }
                                                container.addSeparatorComponents(new SeparatorBuilder())
                                                    .addTextDisplayComponents([
                                                        new TextDisplayBuilder()
                                                            .setContent([
                                                                description
                                                            ].join("\n"))
                                                    ])
                                                    .addSeparatorComponents(new SeparatorBuilder())
                                                    .addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(guild.name).setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${guild.id}`)))
                                                member?.send({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e))
                                            }
                                        }
                                    }
                                }
                            }    
                        }   
                    } 
                }
            }
        }
        guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.community && quest.active)
        if (guildQuests.size && guild) {
            const member = await guild.members.fetch(this.userID).catch(e => null)
            if (member) {
                guildQuests.forEach(quest => {
                    for (const target of quest.targets) {
                        if (!target.finished) {
                            if ((target?.type === type && !object && !target.object) || (target?.type === type && object && ((target.object && target.object === object) || !target.object))) {
                                target.reached += amount
                                if (target.reached >= target.amount) {
                                    target.reached = target.amount
                                    target.finished = true
                                }
                            }     
                        }
                    }
                    quest.save()
                })
            }
        }
        if (save) await this.save()
    }
    async addAchievement(achievement, save, withoutLogs, withoutNotification) {
        if (typeof achievement !== "object") {
            achievement = this.client.cache.achievements.find(ach => ach.id === achievement && ach.enabled)
        }
        if (this.achievements?.some(e => e.achievmentID === achievement.id)) return
        const guild = this.client.guilds.cache.get(this.guildID)
        if (guild) {
            const member = await guild.members.fetch(this.userID).catch(e => null)
            if (member) {
                const settings = this.client.cache.settings.find(settings => settings.guildID === guild.id)
                if (!settings.roles?.mutedRoles?.length || !member.roles.cache.hasAny(...settings.roles.mutedRoles)) {
                    if (!withoutLogs) this.client.emit("economyLogCreate", this.guildID, `<@${this.userID}> (${member.user.username}) ${this.client.language({ textId: "received achievement", guildId: guild.id })} ${achievement.displayEmoji}${achievement.name} (${achievement.id})`)
                    const rewardArray = []
                    for (const reward of achievement.rewards) {
                        if (reward.type === RewardType.Currency) {
                            await this.addCurrency(reward.amount, false, true, withoutLogs, withoutNotification)
                            rewardArray.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${reward.amount})`)
                        } else if (reward.type === RewardType.Experience) {
                            await this.addXp(reward.amount, false, false, true, withoutLogs, withoutNotification)
                            rewardArray.push(`${this.client.config.emojis.XP}**${this.client.language({ textId: "XP", guildId: guild.id })}** (${reward.amount})`)
                        } else if (reward.type === RewardType.Reputation) {
                            await this.addRp(reward.amount, false, true, withoutLogs, withoutNotification)
                            rewardArray.push(`${this.client.config.emojis.RP}**${this.client.language({ textId: "Reputation", guildId: guild.id })}** (${reward.amount})`)
                        } else if (reward.type === RewardType.Item) {
                            const rewardItem = this.client.cache.items.find(item => item.itemID === reward.id && item.guildID === guild.id && !item.temp && item.enabled)
                            if (rewardItem) {
                                await this.addItem(reward.id, reward.amount, true, false, withoutLogs, withoutNotification)
                                rewardArray.push(`> ${rewardItem.displayEmoji}**${rewardItem.name}** (${reward.amount})`)
                            }
                        } else if (reward.type === RewardType.Role) {
                            const guild_role = await guild.roles.fetch(reward.id).catch(e => null)
                            if (guild_role && guild.members.me.roles.highest.position > guild_role.position) {
                                try {
                                    await member.roles.add(reward.id)
                                    rewardArray.push(`<@&${reward.id}>`)
                                    if (!withoutLogs) this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Roles change", guildId: guild.id })} (+<@&${reward.id}>) ${this.client.language({ textId: "for", guildId: guild.id })} <@${this.userID}> (${member.user.username}) ${this.client.language({ textId: "for achievement reward", guildId: guild.id })} ${achievement.displayEmoji}${achievement.name} (${achievement.id})`)
                                } catch (err) {
                                    console.error(err)
                                    if (!withoutLogs) this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Failed to add role", guildId: guild.id })} (<@&${reward.id}>) ${this.client.language({ textId: "for", guildId: guild.id })} <@${this.userID}> (${member.user.username}) ${this.client.language({ textId: "for achievement reward", guildId: guild.id })} ${achievement.displayEmoji}${achievement.name} (${achievement.id}): ${err.message}`)
                                }
                            }
                        }
                    }
                    if (!this.achievements) this.achievements = []
                    this.achievements.push({
                        achievmentID: achievement.id
                    })
                    const achievement_GetAllAchievements = this.client.cache.achievements.find(e => e.guildID === this.guildID && e.type === AchievementType.GetAllAchievements && e.enabled)
                    if (achievement_GetAllAchievements && achievement.id !== achievement_GetAllAchievements.id) {
                        const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.id !== achievement_GetAllAchievements.id)
                        let getAllAchievements = achievements.size ? true : false
                        achievements.some(e => {
                            if (!this.achievements?.find(ach => ach.achievmentID == e.id)) {
                                getAllAchievements = false
                                return true
                            }
                        })
                        if (!this.achievements?.some(ach => ach.achievmentID === achievement_GetAllAchievements.id) && getAllAchievements === true && !this.client.tempAchievements[this.userID]?.includes(achievement_GetAllAchievements.id)) {
                            if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                            this.client.tempAchievements[this.userID].push(achievement_GetAllAchievements.id)
                            await this.addAchievement(achievement_GetAllAchievements.id, false, withoutLogs, withoutNotification)
                        }
                    }
                    if (!withoutNotification && settings.channels?.achievmentsNotificationChannelId) {
                        const description = this.client.functions.getAchievementDescription(achievement, undefined, settings, { guildId: guild.id }, member)
                        const newAchNotifEmbed = new EmbedBuilder()
                            .setColor(member.displayHexColor)
                            .setAuthor({ name: `${member.displayName} ${this.sex === "male" ? `${this.client.language({ textId: "received", guildId: guild.id })}` : this.sex === "female" ? `${this.client.language({ textId: "received", guildId: guild.id })}` : `${this.client.language({ textId: "received", guildId: guild.id })}`} ${this.client.language({ textId: "new achievement", guildId: guild.id })}!`, iconURL: member.displayAvatarURL() })
                            .addFields([{ name: `${this.client.language({ textId: "Achievement", guildId: guild.id })}:`, value: `${achievement.displayEmoji}${achievement.name} › ${description}${rewardArray.length ? `\n${this.client.language({ textId: "Reward", guildId: guild.id })}:\n${rewardArray.join('\n')}` : ``}` }])
                        const channel = await guild.channels.fetch(settings.channels.achievmentsNotificationChannelId)
                        channel.send({ content: this.achievementMention ? `<@${member.user.id}>` : ` `, embeds: [newAchNotifEmbed] }) 
                    }
                    if (save) await this.save()
                } 
            }
        }
    }
    async delAchievement(achievement, save) {
        if (typeof achievement !== "object") {
            achievement = this.client.cache.achievements.get(achievement)
        }
        this.achievements = this.achievements?.filter(e => e.achievmentID !== achievement.id)
        if (!this.achievements.length) this.achievements = undefined
        if (save) await this.save()
        return
    }
    async addXp(amount, save, withoutSeasonXP, withoutLogs, withoutNotification) {
        if (amount < 0) return this.subtractXp(amount*-1, save)
        if (amount > 1000000000000) amount = 1000000000000
        const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
        this.xp += amount
        this.totalxp = amount
        if (!withoutLogs) this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Experience change", guildId: this.guildID })} (${amount}) ${this.client.language({ textId: "for", guildId: this.guildID })} <@${this.userID}>`)
        const oldLevel = this.level
        const oldXp = this.xp
        let i = 0
        while (this.xp >= this.level * settings.levelfactor + 100) {
            this.xp -= this.level * settings.levelfactor + 100
            this.level++
            i++
            if (i > 100000) throw new Error(`Infinite loop: addXp:733, amount: ${amount}, levelfactor: ${settings.levelfactor}, oldLevel: ${oldLevel}, oldXp: ${oldXp}`)
        }
        let guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "exp"))
        if (guildQuests.size) await this.addQuestProgression("exp", amount, undefined, false, withoutNotification)
        if (this.level > oldLevel) {
            guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "level"))
            if (guildQuests.size) await this.addQuestProgression("level", this.level - oldLevel, undefined, false, withoutNotification)
            if (!withoutNotification) await this.newLevelNotify()
        }
        i = 0
        if (settings.seasonLevelsEnabled && !withoutSeasonXP) {
            this.seasonXp += amount
            this.seasonTotalXp += amount
            const seasonOldLevel = this.seasonLevel
            while (this.seasonXp >= this.seasonLevel * settings.seasonLevelfactor + 100) {
                this.seasonXp -= this.seasonLevel * settings.seasonLevelfactor + 100
                this.seasonLevel++
                i++
                if (i > 100000) throw new Error(`Infinite loop: addXp:751, amount: ${amount}, seasonLevelfactor: ${settings.seasonLevelfactor}, seasonOldLevel: ${seasonOldLevel}, oldXp: ${oldXp}`) 
            }
            let guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "seasonXp"))
            if (guildQuests.size) await this.addQuestProgression("seasonXp", amount, undefined, false, withoutNotification)
            if (this.seasonLevel > seasonOldLevel) {
                guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "seasonLevel"))
                if (guildQuests.size) await this.addQuestProgression("seasonLevel", this.seasonLevel - seasonOldLevel, undefined, false, withoutNotification)
                if (!withoutNotification) await this.newSeasonLevelNotify()
            }    
        }
        if (save) await this.save()
        return
    }
    async subtractXp(amount, save) {
        const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
        this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Experience change", guildId: this.guildID })} (-${amount}) ${this.client.language({ textId: "for", guildId: this.guildID })} <@${this.userID}>`)
        const oldLevel = this.level
        const oldXp = this.xp
        let i = 0
        if (this.totalxp <= amount) {
            this.xp = 0
            this.level = 1
            this.totalxp = 0 - this.totalxp
        } else {
            this.totalxp = amount*-1
            while (amount > 0) {
                if (this.level === 1 && amount > this.level * settings.levelfactor + 100) {
                    this.xp = 0
                    this.totalxp = 0 - this.totalxp
                    amount = 0
                } else {
                    if (amount > this.level * settings.levelfactor + 100) {
                        amount -= this.xp
                        this.level--
                        this.xp = this.level * settings.levelfactor + 100
                    } else {
                        this.xp -= amount
                        amount = 0
                    }    
                }
                i++
                if (i > 100000) throw new Error(`Infinite loop: subtractXp:792, amount: ${amount}, levelfactor: ${settings.levelfactor}, oldLevel: ${oldLevel}, oldXp: ${oldXp}`)
            }
        }
        i = 0
        if (settings.seasonLevelsEnabled) {
            const seasonOldLevel = this.seasonLevel
            if (this.seasonTotalxp <= amount) {
                this.seasonXp = 0
                this.seasonLevel = 1
                this.seasonTotalxp = 0
            } else {
                this.seasonTotalxp -= amount
                while (amount > 0) {
                    if (this.seasonLevel === 1 && amount > this.seasonLevel * settings.seasonLevelfactor + 100) {
                        this.seasonXp = 0
                        this.seasonTotalxp = 0
                        amount = 0
                    } else {
                        if (amount > this.seasonLevel * settings.seasonLevelfactor + 100) {
                            amount -= this.seasonXp
                            this.seasonLevel--
                            this.seasonXp = this.seasonLevel * settings.seasonLevelfactor + 100
                        } else {
                            this.seasonXp -= amount
                            amount = 0
                        }    
                    }
                    i++
                    if (i > 100000) throw new Error(`Infinite loop: subtractXp:820, amount: ${amount}, seasonLevelfactor: ${settings.seasonLevelfactor}, seasonOldLevel: ${seasonOldLevel}, oldXp: ${oldXp}`) 
                }
            }
            if (this.seasonLevel < seasonOldLevel) await this.newSeasonLevelNotify()
        }
        if (this.level < oldLevel) await this.newLevelNotify()
        if (save) await this.save()
        return
    }
    async addRp(amount, save, withoutAchievement, withoutLogs, withoutNotification) {
        if (amount < 0) return this.subtractRp(amount*-1, save, withoutAchievement)
        if (this.rp < 1000) { 
            this.rp = amount
        }
        if (!withoutAchievement) {
            const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.Rp && e.enabled)
            await Promise.all(achievements.map(async achievement => {
                if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && (achievement.amount > 0 ? this.rp >= achievement.amount : this.rp <= achievement.amount) && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) {
                    if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                    this.client.tempAchievements[this.userID].push(achievement.id)
                    await this.addAchievement(achievement, false, withoutLogs, withoutNotification)
                }    
            }))   
        }
        if (this.rp > 1000) this.rp = 1000 - this.rp
        try {
            if (!withoutLogs) this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Reputation change", guildId: this.guildID })} (${amount}) ${this.client.language({ textId: "for", guildId: this.guildID })} <@${this.userID}>`)
        } catch (err) {
            console.error(err)
        }
        if (save) await this.save()
        return
    }
    async subtractRp(amount, save, withoutAchievement) {
        if (this.rp > -1000) this.rp = amount*-1
        try {
            this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Reputation change", guildId: this.guildID })} (-${amount}) ${this.client.language({ textId: "for", guildId: this.guildID })} <@${this.userID}>`)
        } catch (err) {
            console.error(err)
        }
        if (!withoutAchievement) {
            const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.Rp && e.enabled)
            await Promise.all(achievements.map(async achievement => {
                if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && (achievement.amount > 0 ? this.rp >= achievement.amount : this.rp <= achievement.amount) && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) {
                    if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                    this.client.tempAchievements[this.userID].push(achievement.id)
                    await this.addAchievement(achievement)
                }    
            }))   
        }
        if (save) await this.save()
        return
    }
    async addItem(itemID, amount, withoutAchievement, save, withoutLogs, withoutNotification) {
        const item = this.client.cache.items.find(item => item.itemID === itemID && item.guildID === this.guildID && !item.temp && item.enabled)
        if (!item) throw new Error(`Item not found (Parameters itemID: ${itemID} guildID: ${this.guildID})`)
        if (!this.inventory) this.inventory = []
        const userItem = this.inventory.find((element) => { return element.itemID === itemID })
        if (!userItem) {
            const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
            this.inventory.push({
                itemID: itemID,
                amount: amount,
            })
            if (((settings.xpForFirstFoundItem && !this.blockActivities?.item?.XP) || (settings.curForFirstFoundItem && !this.blockActivities?.item?.CUR))) {
                const rewards = []
                if (settings.xpForFirstFoundItem && !this.blockActivities?.item?.XP) {
                    await this.addXp(settings.xpForFirstFoundItem, false, false, withoutLogs, withoutNotification)
                    rewards.push(`> ${this.client.config.emojis.XP}**${this.client.language({ textId: "XP", guildId: this.guildID })}** ${settings.xpForFirstFoundItem}`)
                }
                if (settings.curForFirstFoundItem && !this.blockActivities?.item?.CUR) {
                    await this.addCurrency(settings.curForFirstFoundItem, false, false, withoutLogs)
                    rewards.push(`> ${settings.displayCurrencyEmoji}**${settings.currencyName}** ${settings.curForFirstFoundItem}`)
                }
                if (rewards.length && !withoutNotification) {
                    const guild = this.client.guilds.cache.get(this.guildID)
                    if (guild) {
                        const member = await guild.members.fetch(this.userID).catch(e => null)
                        if (member && settings.channels.itemsNotificationChannelId) {
                            const channel = await guild.channels.fetch(settings.channels.itemsNotificationChannelId).catch(e => null)
                            if (channel && channel.permissionsFor(guild.members.me).has("SendMessages")) {
                                const embed = new EmbedBuilder()
                                    .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
                                    .setColor(item.hex || "#2F3236")
                                    .setDescription(`${this.client.language({ textId: "For first find", guildId: this.guildID })} ${item.displayEmoji}**${item.name}** ${this.client.language({ textId: "you", guildId: this.guildID })} ${this.sex === "male" ? `${this.client.language({ textId: "received", guildId: this.guildID })}` : this.sex === "female" ? `${this.client.language({ textId: "received", guildId: this.guildID })}` : `${this.client.language({ textId: "received", guildId: this.guildID })}`}:\n${rewards.join("\n")}`)
                                channel.send({ content: this.itemMention ? `<@${member.user.id}>` : ` `, embeds: [embed] }).catch(e => null)
                            }
                        }
                    }    
                }
            }
        } else {
            userItem.amount = +`${new Decimal(userItem.amount).plus(amount)}`
        }
        if (!withoutLogs) this.client.emit("economyLogCreate", this.guildID, `${this.client.language({ textId: "Inventory change", guildId: this.guildID })} (${item.displayEmoji}${item.name} (${item.itemID}) (${amount})) ${this.client.language({ textId: "for", guildId: this.guildID })} <@${this.userID}>`)
        if (!item.found) {
            item.found = true
            await item.save()
        }
        if (!withoutAchievement) {
            const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.Item && e.enabled)
            await Promise.all(achievements.map(async achievement => {
                if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && achievement.items.includes(itemID) && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) { 
                    if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                    this.client.tempAchievements[this.userID].push(achievement.id)
                    await this.addAchievement(achievement, false, withoutLogs, withoutNotification)
                }
            }))
        }
        const achievement = this.client.cache.achievements.find(e => e.guildID === this.guildID && e.type === AchievementType.Items && e.enabled)
        if (achievement) {
            const items = this.client.cache.items.filter(item => item.guildID === this.guildID && item.enabled && !item.temp)
            let foundAllItems = items.size ? true : false
            items.some(e => {
                if (!this.inventory.find(ui => ui.itemID == e.itemID)) {
                    foundAllItems = false
                    return true
                }
            })
            if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && foundAllItems === true && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) {
                if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                this.client.tempAchievements[this.userID].push(achievement.id)
                await this.addAchievement(achievement, false, withoutLogs, withoutNotification)
            }
        }
        const guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "itemsReceived"))
        if (guildQuests.size) await this.addQuestProgression("itemsReceived", amount, itemID, false, withoutNotification)
        this.itemsReceived += amount
        const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.ItemsReceived && e.enabled)
        await Promise.all(achievements.map(async achievement => {
            if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && this.itemsReceived >= achievement.amount && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) { 
                if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                this.client.tempAchievements[this.userID].push(achievement.id)
                await this.addAchievement(achievement, false, withoutLogs, withoutNotification)
            }        
        }))
        if (save) await this.save()
        return
    }
    async newLevelNotify() {
        const guild = this.client.guilds.cache.get(this.guildID)
        if (guild) {
            const member = await guild.members.fetch(this.userID).catch(e => null)
            if (member) {
                this.client.emit("economyLogCreate", this.guildID, `<@${member.user.id}> (${member.user.username}) ${this.client.language({ textId: "reached level", guildId: this.guildID })} 🎖${this.level}`)
                const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
                
                // Send rank card notification if enabled
                if (settings.levelUpNotifications?.enabled && settings.levelUpNotifications?.channelId) {
                    try {
                        const notifChannel = await guild.channels.fetch(settings.levelUpNotifications.channelId).catch(() => null)
                        if (notifChannel) {
                            const { generateRankCard } = require('../modules/generateRankCard')
                            const profiles = this.client.cache.profiles.filter(e => e.guildID === this.guildID).map(e => e).sort((a, b) => b.totalxp - a.totalxp)
                            const rank = profiles.findIndex(e => e.userID === this.userID) + 1
                            const rankCardBuffer = await generateRankCard({ member, profile: this, settings, rank })
                            await notifChannel.send({
                                content: `Hey! you <@${member.user.id}> !!! You just reached level ${this.level}. GG!`,
                                files: [{ attachment: rankCardBuffer, name: `rank_${member.user.id}.png` }]
                            }).catch(e => null)
                        }
                    } catch (e) {
                        console.error('Error sending level up notification:', e)
                    }
                }
                
                if (settings.levelsRoles.length > 0) {
                    let rolesadd = ""
                    let rolesremove = ""
                    const rolesAdd = settings.levelsRoles.filter(e => this.level >= e.levelFrom && (!e.levelTo || e.levelTo > this.level) && !member.roles.cache.has(e.roleId))
                    for (const role of rolesAdd) {
                        const guild_role = await guild.roles.fetch(role.roleId).catch(e => null)
                        if (guild_role && guild.members.me.roles.highest.position > guild_role.position) {
                            await member.roles.add(guild_role.id).catch(e => null)
                            rolesadd += `\n> <@&${guild_role.id}>`
                        }
                    }
                    const rolesRemove = settings.levelsRoles.filter(e => (e.levelTo <= this.level || e.levelFrom > this.level) && member.roles.cache.has(e.roleId))
                    for (const role of rolesRemove) {
                        const guild_role = await guild.roles.fetch(role.roleId).catch(e => null)
                        if (guild_role && guild.members.me.roles.highest.position > guild_role.position) {
                            await member.roles.remove(guild_role.id).catch(e => null)
                            rolesremove += `\n> <@&${guild_role.id}>`
                        }
                    }
                    const newLevelNotifEmbed = new EmbedBuilder()
                        .setColor(member.displayHexColor)
                        .setFooter({ text: `${member.displayName} ${this.sex === "male" ? `${this.client.language({ textId: "received", guildId: guild.id })}` : this.sex === "female" ? `${this.client.language({ textId: "received", guildId: guild.id })}` : `${this.client.language({ textId: "received", guildId: guild.id })}`} ${this.client.language({ textId: "level", guildId: guild.id })} 🎖${this.level}!\n${this.client.language({ textId: "Until next level", guildId: guild.id })} ⭐${this.xp.toFixed()}/${this.level * settings.levelfactor + 100 } XP (${Math.floor((this.xp / (this.level * settings.levelfactor + 100)) * 100)}%)`, iconURL: member.displayAvatarURL() })
                    if (rolesadd == "" && rolesremove == "" && settings.channels.levelNotificationChannelId) return guild.channels.fetch(settings.channels.levelNotificationChannelId).then(channel => channel.send({ embeds: [newLevelNotifEmbed] })).catch(e => null)
                    newLevelNotifEmbed.setAuthor({ name: `${member.displayName} ${this.sex === "male" ? `${this.client.language({ textId: "received", guildId: guild.id })}` : this.sex === "female" ? `${this.client.language({ textId: "received", guildId: guild.id })}` : `${this.client.language({ textId: "received", guildId: guild.id })}`} ${this.client.language({ textId: "level", guildId: guild.id })} 🎖${this.level}!`, iconURL: member.displayAvatarURL() })
                    if (rolesadd !== "") newLevelNotifEmbed.addFields([{ name: `${this.client.language({ textId: "Roles added", guildId: guild.id })}:`, value: rolesadd }])
                    if (rolesremove !== "") newLevelNotifEmbed.addFields([{ name: `${this.client.language({ textId: "Roles removed", guildId: guild.id })}:`, value: rolesremove }])
                    newLevelNotifEmbed.setFooter({ text: `${this.client.language({ textId: "Until next level", guildId: guild.id })} ⭐${this.xp.toFixed()}/${this.level * settings.levelfactor + 100 } XP (${Math.floor((this.xp / (this.level * settings.levelfactor + 100)) * 100)}%)` })
                    if (settings.channels?.levelNotificationChannelId) guild.channels.fetch(settings.channels.levelNotificationChannelId).then(channel => channel.send({ content: this.levelMention ? `<@${member.user.id}>` : ` `, embeds: [newLevelNotifEmbed] })).catch(e => null)
                } else {
                    if (settings.channels?.levelNotificationChannelId) guild.channels.fetch(settings.channels.levelNotificationChannelId).then(channel => channel.send({ content: this.levelMention ? `<@${member.user.id}>` : ` `, embeds: [newLevelNotifEmbed] })).catch(e => null)
                }    
            }
            const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.Level && e.enabled)
            await Promise.all(achievements.map(async achievement => {
                if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && this.level >= achievement.amount && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) { 
                    if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                    this.client.tempAchievements[this.userID].push(achievement.id)
                    await this.addAchievement(achievement)
                }    
            })) 
        }
    }
    async newSeasonLevelNotify() {
        const guild = this.client.guilds.cache.get(this.guildID)
        if (guild) {
            const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.SeasonLevel && e.enabled)
            await Promise.all(achievements.map(async achievement => {
                if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && this.seasonLevel >= achievement.amount && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) { 
                    if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                    this.client.tempAchievements[this.userID].push(achievement.id)
                    await this.addAchievement(achievement)
                }    
            }))
        }
    }
    async subtractItem(itemID, amount, save) {
        const userItem = this.inventory.find(e => e.itemID === itemID)
        if (userItem) {
            userItem.amount = +`${new Decimal(userItem.amount).minus(amount)}`
        } else {
            this.inventory.push({
                itemID: itemID,
                amount: amount * -1,    
            })
        }
        if (save) await this.save()
        return
    }
    async addLevel(amount, save, withoutNotification) {
        const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
        const oldLevel = this.level
        const LEVEL_FACTOR = settings.levelfactor
        const oldTotalXp = this.totalxp
        let i = 0
        while (this.level < (oldLevel + amount)) {
            this.totalxp = this.level * LEVEL_FACTOR + 100
            this.level++
            i++
            if (i > 1000000) throw new Error(`Infinite loop: addLevel:1045, amount: ${amount}, LEVEL_FACTOR: ${LEVEL_FACTOR}, oldLevel: ${oldLevel}, oldTotalXp: ${oldTotalXp}`) 
        }
        const guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "level"))
        if (guildQuests.size) await this.addQuestProgression("level", amount, undefined, false, withoutNotification)
        if (!withoutNotification)await this.newLevelNotify()
        await this.addSeasonLevel(amount, false, withoutNotification)
        if (save) await this.save()
        return
    }
    async setXp(amount, save) {
        if (this.totalxp > amount) await this.subtractXp(this.totalxp - amount, save)
        if (this.totalxp < amount) await this.addXp(amount - this.totalxp, save)
        return
    }
    async setLevel(amount, save) {
        if (this.level > amount) await this.subtractLevel(this.level - amount, save)
        if (this.level < amount) await this.addLevel(amount - this.level, save)
        return
    }
    async addSeasonLevel(amount, save, withoutNotification) {
        const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
        const oldSeasonLevel = this.seasonLevel
        const LEVEL_FACTOR = settings.seasonLevelfactor
        let i = 0
        while (this.seasonLevel < (oldSeasonLevel + amount)) {
            this.seasonLevel++
            this.seasonTotalXp += this.seasonLevel * LEVEL_FACTOR + 100
            i++
            if (i > 100000) throw new Error(`Infinite loop: addSeasonLevel:1073, amount: ${amount}, LEVEL_FACTOR: ${LEVEL_FACTOR}, oldSeasonLevel: ${oldSeasonLevel}`)
        }
        const guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "seasonLevel"))
        if (guildQuests.size) await this.addQuestProgression("seasonLevel", amount, undefined, false, withoutNotification)
        if (!withoutNotification) await this.newSeasonLevelNotify()
        if (save) await this.save()
        return
    }
    async setSeasonLevel(amount, save) {
        if (this.seasonLevel > amount) return await this.subtractSeasonLevel(this.seasonLevel - amount, save)
        if (this.seasonLevel < amount) return await this.addSeasonLevel(amount - this.seasonLevel, save)
        return
    }
    async subtractLevel(amount, save) {
        const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
        const LEVEL_FACTOR = settings.levelfactor
        const oldLevel = this.level
        const oldTotalXp = this.totalxp
        let i = 0
        while (this.level > (oldLevel - amount)) {
            this.level--
            this.totalxp = this.totalxp - (this.level * LEVEL_FACTOR + 100) - this.totalxp
            if (this.xp > 0) this.xp = this.level * LEVEL_FACTOR + 100 - Math.abs(this.xp - (this.level * LEVEL_FACTOR + 100))
            i++
            if (i > 100000) throw new Error(`Infinite loop: subtractLevel:1097, amount: ${amount}, LEVEL_FACTOR: ${LEVEL_FACTOR}, oldLevel: ${oldLevel}, oldTotalXp: ${oldTotalXp}`) 
        }
        await this.newLevelNotify()
        if (save) await this.save()
        return
    }
    async addBump(save) {
        const achievements = this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.type === AchievementType.Bump && e.enabled)
        this.bumps = 1
        const guildQuests = this.client.cache.quests.filter(quest => quest.guildID === this.guildID && quest.isEnabled && quest.targets.some(target => target.type === "bump"))
        if (guildQuests.size) await this.addQuestProgression("bump", 1)
        await Promise.all(achievements.map(async achievement => {
            if (!this.achievements?.some(ach => ach.achievmentID === achievement.id) && this.bumps >= achievement.amount && !this.client.tempAchievements[this.userID]?.includes(achievement.id)) { 
                if (!this.client.tempAchievements[this.userID]) this.client.tempAchievements[this.userID] = []
                this.client.tempAchievements[this.userID].push(achievement.id)
                await this.addAchievement(achievement)
            }        
        }))
        if (save) await this.save()
        return
    }
    async subtractSeasonLevel(amount, save) {
        const settings = this.client.cache.settings.find(settings => settings.guildID === this.guildID)
        const LEVEL_FACTOR = settings.seasonLevelfactor
        const oldSeasonLevel = this.seasonLevel
        let i = 0
        while (this.seasonLevel > (oldSeasonLevel - amount)) {
            this.seasonTotalXp -= this.seasonLevel * LEVEL_FACTOR + 100
            this.seasonXp = Math.abs(this.seasonXp - this.seasonLevel * LEVEL_FACTOR + 100)
            this.seasonLevel--
            i++
            if (i > 100000) throw new Error(`Infinite loop: subtractSeasonLevel:1128, amount: ${amount}, LEVEL_FACTOR: ${LEVEL_FACTOR}, oldSeasonLevel: ${oldSeasonLevel}`)
        }
        await this.newSeasonLevelNotify()
        if (save) await this.save()
        return
    }
    getXpBoost(sum) {
        const settings = this.client.cache.settings.get(this.guildID)
        let booster = 0
        const profile_booster = (this.multiplyXPTime < new Date() || !this.multiplyXPTime) ? 0 : this.multiplyXP || 0
        const global_booster = settings.xp_booster ? !settings.xp_booster.until ? settings.xp_booster.multiplier || 0 : settings.xp_booster.until < new Date() ? 0 : settings.xp_booster.multiplier || 0 : 0
        if (!settings.global_boosters_stacking) {
            booster = Math.max(...[profile_booster, global_booster, sum || 0])    
        } else {
            booster = +`${new Decimal(booster).plus(profile_booster).plus(global_booster)}`
            if (sum) booster = +`${new Decimal(booster).plus(sum)}`
        }
        return booster
    }
    getCurBoost(sum) {
        const settings = this.client.cache.settings.get(this.guildID)
        let booster = 0
        const profile_booster = (this.multiplyCURTime < new Date() || !this.multiplyCURTime) ? 0 : this.multiplyCUR || 0
        const global_booster = settings.cur_booster ? !settings.cur_booster.until ? settings.cur_booster.multiplier || 0 : settings.cur_booster.until < new Date() ? 0 : settings.cur_booster.multiplier || 0 : 0
        if (!settings.global_boosters_stacking) {
            booster = Math.max(...[profile_booster, global_booster, sum || 0])    
        } else {
            booster = +`${new Decimal(booster).plus(profile_booster).plus(global_booster)}`
            if (sum) booster = +`${new Decimal(booster).plus(sum)}`
        }
        return booster
    }
    getRpBoost(sum) {
        const settings = this.client.cache.settings.get(this.guildID)
        let booster = 0
        const profile_booster = (this.multiplyRPTime < new Date() || !this.multiplyRPTime) ? 0 : this.multiplyRP || 0
        const global_booster = settings.rp_booster ? !settings.rp_booster.until ? settings.rp_booster.multiplier || 0 : settings.rp_booster.until < new Date() ? 0 : settings.rp_booster.multiplier || 0 : 0
        if (!settings.global_boosters_stacking) {
            booster = Math.max(...[profile_booster, global_booster, sum || 0])    
        } else {
            booster = +`${new Decimal(booster).plus(profile_booster).plus(global_booster)}`
            if (sum) booster = +`${new Decimal(booster).plus(sum)}`
        }
        return booster
    }
    getLuckBoost(sum) {
        const settings = this.client.cache.settings.get(this.guildID)
        let booster = 0
        const profile_booster = (this.multiplyLuckTime < new Date() || !this.multiplyLuckTime) ? 0 : this.multiplyLuck || 0
        const global_booster = settings.luck_booster ? !settings.luck_booster.until ? settings.luck_booster.multiplier || 0 : settings.luck_booster.until < new Date() ? 0 : settings.luck_booster.multiplier || 0 : 0
        if (!settings.global_boosters_stacking) {
            booster = Math.max(...[profile_booster, global_booster, sum || 0])    
        } else {
            booster = +`${new Decimal(booster).plus(profile_booster).plus(global_booster)}`
            if (sum) booster = +`${new Decimal(booster).plus(sum)}`
        }
        return booster
    }
    
    getXpBoostTime() {
        const settings = this.client.cache.settings.get(this.guildID)
        const profile_booster = (this.multiplyXPTime < new Date() || !this.multiplyXPTime) ? 0 : this.multiplyXP || 0
        const global_booster = settings.xp_booster ? !settings.xp_booster.until ? settings.xp_booster.multiplier || 0 : settings.xp_booster.until < new Date() ? 0 : settings.xp_booster.multiplier || 0 : 0
        if (!settings.global_boosters_stacking) {
            if (profile_booster > global_booster && this.multiplyXPTime > new Date()) return this.multiplyXPTime.valueOf()
            else return settings.xp_booster.until?.valueOf() || undefined
        } else {
            let sum = [this.multiplyXPTime > new Date() ? this.multiplyXPTime.valueOf() : 0, settings.xp_booster?.until > new Date() ? settings.xp_booster.until?.valueOf() : 0]
            sum = sum.filter(e => e !== 0)
            if (!sum.length) return undefined
            return Math.min(...sum)
        }
    }
    getCurBoostTime() {
        const settings = this.client.cache.settings.get(this.guildID)
        const profile_booster = (this.multiplyCURTime < new Date() || !this.multiplyCURTime) ? 0 : this.multiplyCUR || 0
        const global_booster = settings.cur_booster ? !settings.cur_booster.until ? settings.cur_booster.multiplier || 0 : settings.cur_booster.until < new Date() ? 0 : settings.cur_booster.multiplier || 0 : 0
        if (!settings.global_boosters_stacking) {
            if (profile_booster > global_booster && this.multiplyCURTime > new Date()) return this.multiplyCURTime.valueOf()
            else return settings.cur_booster?.until?.valueOf() || undefined
        } else {
            let sum = [this.multiplyCURTime > new Date() ? this.multiplyCURTime.valueOf() : 0, settings.cur_booster?.until > new Date() ? settings.cur_booster.until?.valueOf() : 0]
            sum = sum.filter(e => e !== 0)
            if (!sum.length) return undefined
            return Math.min(...sum)
        }
    }
    getRpBoostTime() {
        const settings = this.client.cache.settings.get(this.guildID)
        const profile_booster = (this.multiplyRPTime < new Date() || !this.multiplyRPTime) ? 0 : this.multiplyRP || 0
        const global_booster = settings.rp_booster ? !settings.rp_booster.until ? settings.rp_booster.multiplier || 0 : settings.rp_booster.until < new Date() ? 0 : settings.rp_booster.multiplier || 0 : 0
        if (!settings.global_boosters_stacking) {
            if (profile_booster > global_booster && this.multiplyRPTime > new Date()) return this.multiplyRPTime.valueOf()
            else return settings.rp_booster.until?.valueOf() || undefined
        } else {
            let sum = [this.multiplyRPTime > new Date() ? this.multiplyRPTime.valueOf() : 0, settings.rp_booster?.until > new Date() ? settings.rp_booster.until?.valueOf() : 0]
            sum = sum.filter(e => e !== 0)
            if (!sum.length) return undefined
            return Math.min(...sum)
        }
    }
    getLuckBoostTime() {
        const settings = this.client.cache.settings.get(this.guildID)
        const profile_booster = (this.multiplyLuckTime < new Date() || !this.multiplyLuckTime) ? 0 : this.multiplyLuck || 0
        const global_booster = settings.luck_booster ? !settings.luck_booster.until ? settings.luck_booster.multiplier || 0 : settings.luck_booster.until < new Date() ? 0 : settings.luck_booster.multiplier || 0 : 0
        if (!settings.global_boosters_stacking) {
            if (profile_booster > global_booster && this.multiplyLuckTime > new Date()) return this.multiplyLuckTime.valueOf()
            else return settings.luck_booster.until?.valueOf() || undefined
        } else {
            let sum = [this.multiplyLuckTime > new Date() ? this.multiplyLuckTime.valueOf() : 0, settings.luck_booster?.until > new Date() ? settings.luck_booster.until?.valueOf() : 0]
            sum = sum.filter(e => e !== 0)
            if (!sum.length) return undefined
            return Math.min(...sum)
        }
    }
    async addQuest(quest, save) {
        if (quest.community && (this.quests?.findIndex(e => e.questID === quest.questID) || -1) < 0) {
            if (!this.quests) this.quests = []
            this.quests.push({
                questID: quest.questID,
            })
        } else if (!quest.community) {
            const indexOfMyQuest = this.quests ? this.quests.findIndex(e => e.questID === quest.questID) : -1
            if (indexOfMyQuest >= 0) {
                this.quests[indexOfMyQuest].finished = false
                this.quests[indexOfMyQuest].finishedDate = undefined
                this.quests[indexOfMyQuest].targets.forEach(target => {
                    target.reached = 0
                    target.finished = false
                })
            } else {
                if (!this.quests) this.quests = []
                this.quests.push({
                    questID: quest.questID,
                    targets: quest.targets.map(target => {
                        return {
                            targetID: target.targetID,
                            reached: 0,
                            finished: false,
                        }
                    }),
                    finished: false
                })    
            }
        }
        if (save) await this.save()
        return
    }
    async delQuest(quest, save) {
        if (!this.quests?.length) return
        this.quests = this.quests.filter(e => e.questID !== quest.questID)
        if (this.quests.length === 0) this.quests = undefined
        if (save) await this.save()
        return
    }
    addRole(id, amount, ms) {
        if (!this.inventoryRoles) this.inventoryRoles = []
        const inventoryRole = this.inventoryRoles.find(e => { return e.id === id && e.ms === ms })
        if (inventoryRole) inventoryRole.amount += amount
        else this.inventoryRoles.push({ id, amount, ms, uniqId: uniqid.time() })
    }
    subtractRole(id, amount, ms) {
        if (!this.inventoryRoles?.length) return
        const inventoryRole = this.inventoryRoles.find(e => { return e.id === id && e.ms === ms })
        if (inventoryRole) {
            inventoryRole.amount -= amount
            if (inventoryRole.amount === 0) {
                this.inventoryRoles.splice(this.inventoryRoles.findIndex(e => e.id === id && e.ms === ms), 1)
                if (this.inventoryRoles.length === 0) this.inventoryRoles = undefined
            }
        }
    }
    isHiddenFrom(viewerId, isAdmin = false) {
        // Owner always sees their own profile
        if (viewerId === this.userID) return false
        // Admins always see profiles
        if (isAdmin) return false
        // Check if hidden from all
        if (this.hiddenFromAll) return true
        // Check if viewer is in hidden list
        if (this.hiddenFromUsers?.includes(viewerId)) return true
        return false
    }
    hideFromUsers(userIds) {
        if (!this.hiddenFromUsers) this.hiddenFromUsers = []
        userIds.forEach(id => {
            if (!this.hiddenFromUsers.includes(id)) {
                this.hiddenFromUsers.push(id)
            }
        })
    }
    hideFromAll() {
        this.hiddenFromAll = true
    }
    unhideProfile() {
        this.hiddenFromUsers = undefined
        this.hiddenFromAll = undefined
    }
    removeFromHiddenList(userIds) {
        if (this.hiddenFromUsers) {
            this.hiddenFromUsers = this.hiddenFromUsers.filter(id => !userIds.includes(id))
            if (this.hiddenFromUsers.length === 0) this.hiddenFromUsers = undefined
        }
    }
}
module.exports = Profile