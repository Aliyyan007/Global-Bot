const { Collection } = require('discord.js')
const lt = require('long-timeout')
class Settings {
	constructor(client, settings) {
		this.client = client
		this.guildID = settings.guildID
        this.language = settings.language
        this.xpForMessage = settings.xpForMessage
        this.curForMessage = settings.curForMessage
        this.rpForMessage = settings.rpForMessage
        this.xpForVoice = settings.xpForVoice
        this.curForVoice = settings.curForVoice
        this.rpForVoice = settings.rpForVoice
        this.xpForInvite = settings.xpForInvite
        this.curForInvite = settings.curForInvite
        this.rpForInvite = settings.rpForInvite
        this.xpForBump = settings.xpForBump
        this.curForBump = settings.curForBump
        this.rpForBump = settings.rpForBump
        this.xpForLike = settings.xpForLike
        this.curForLike = settings.curForLike
        this.rpForLike = settings.rpForLike
        this.xpForFirstFoundItem = settings.xpForFirstFoundItem
        this.curForFirstFoundItem = settings.curForFirstFoundItem
        this.levelfactor = settings.levelfactor
        this.seasonLevelfactor = settings.seasonLevelfactor
        this.baitPrice = settings.baitPrice
        this.baitCurrency = settings.baitCurrency
        this.miningPrice = settings.miningPrice
        this.miningTool = settings.miningTool
        this.currencyName = settings.currencyName
        this.currencyDescription = settings.currencyDescription
        this.shopName = settings.shopName
        this.shopMessages = settings.shopMessages
        this.shopThumbnail = settings.shopThumbnail
        this.emojis = settings.emojis
        this.channels = settings.channels
        this.giveawayManagerPermission = settings.giveawayManagerPermission
        this.giveawayRerollPermission = settings.giveawayRerollPermission
        this.roles = settings.roles
        this.categories = settings.categories
        this.daily = settings.daily
        this.levelsRoles = settings.levelsRoles
        this.seasonLevelsRoles = settings.seasonLevelsRoles
        this.top_report = settings.top_report
        this.weekMaxBonus = settings.weekMaxBonus
        this.logs = settings.logs
        this.action_logs = settings.action_logs
        this.max_items = settings.max_items
        this.max_achievements = settings.max_achievements
        this.max_wormholes = settings.max_wormholes
        this.max_quests = settings.max_quests
        this.max_bonusChannels = settings.max_bonusChannels
        this.max_styles = settings.max_styles
        this.max_categories = settings.max_categories
        this.max_quests = settings.max_quests
        this.max_roles = settings.max_roles
        this.max_promocodes = settings.max_promocodes
        this.deleteFromDB = settings.deleteFromDB
        this.rank_card = settings.rank_card
        this.startKit = settings.startKit
        this.startKitEnabled = settings.startKitEnabled
        this.fishingName = settings.fishingName
        this.fishingIcon = settings.fishingIcon
        this.miningName = settings.miningName
        this.miningIcon = settings.miningIcon
        this.cooldowns = settings.cooldowns && Object.keys(settings.cooldowns).length ? new Collection(Object.entries(settings.cooldowns)) : undefined
        this.cooldown_immune_roles = settings.cooldown_immune_roles
        this.lastSeasonReset = settings.lastSeasonReset
        this.maxDailyQuests = settings.maxDailyQuests
        this.maxWeeklyQuests = settings.maxWeeklyQuests
        this.takeDailyQuestPermission = settings.takeDailyQuestPermission
        this.takeWeeklyQuestPermission = settings.takeWeeklyQuestPermission
        this.daysSeason = settings.daysSeason
        this.seasonLevelsEnabled = settings.seasonLevelsEnabled
        this.apiKey = settings.apiKey
        this.customRolePrice = settings.customRolePrice
        this.customRolePermission = settings.customRolePermission
        this.customRoleHoist = settings.customRoleHoist
        this.displayCurrencyEmoji = settings.emojis?.currency || "🪙"
        this.customRoleTemporaryEnabled = settings.customRoleTemporaryEnabled
        this.customRolePriceMinute = settings.customRolePriceMinute
        this.customRoleProperties = settings.customRoleProperties
        this.marketStorageLifeDays = settings.marketStorageLifeDays
        this.xp_booster = settings.xp_booster
        this.cur_booster = settings.cur_booster
        this.rp_booster = settings.rp_booster
        this.luck_booster = settings.luck_booster
        this.global_boosters_stacking = settings.global_boosters_stacking
        this.auctions_permission = settings.auctions_permission
        this.currency_no_transfer = settings.currency_no_transfer
        this.currency_no_drop = settings.currency_no_drop
        this.currency_transfer_permission = settings.currency_transfer_permission
        this.currency_drop_permission = settings.currency_drop_permission
        this.usedSeasonCardsChannelId = settings.usedSeasonCardsChannelId
        this.usedAllTimeCardsChannelId = settings.usedAllTimeCardsChannelId
        this.usedTeamCardsChannelId = settings.usedTeamCardsChannelId
        this.usedPlayerCardsNoLimitsChannelId = settings.usedPlayerCardsNoLimitsChannelId
        this.customRoleMinimumMinutes = settings.customRoleMinimumMinutes
        this.customRoleCreationLimit = settings.customRoleCreationLimit
        this.levelUpNotifications = settings.levelUpNotifications || { enabled: false, channelId: null }
        if (this.seasonLevelsEnabled) {
            this.setTimeoutResetSeason()
        }
	}
	async save() {
		await this.client.settingsSchema.replaceOne({ guildID: this.guildID }, Object.assign({}, { ...this, client: undefined, resetSeasonTimeoutId: undefined }), { upsert: true })
	}
	async delete() {
        if (this.resetSeasonTimeoutId) this.clearResetSeasonTimeout()
		await this.client.settingsSchema.deleteOne({ guildID: this.guildID })	
		this.client.cache.settings.delete(this.guildID)	
	}
    setTimeoutResetSeason() {
        this.resetSeasonTimeoutId = lt.setTimeout(async () => {
            this.client.cache.profiles.filter(profile => profile.guildID === this.guildID).forEach(profile => {
				profile.seasonLevel = 1
				profile.seasonXp = 0
				profile.seasonTotalXp = 0
				profile.save()
			})
            this.lastSeasonReset = new Date()
			await this.save()
            this.setTimeoutResetSeason()
        }, (this.lastSeasonReset.getTime() + this.daysSeason * 24 * 60 * 60 * 1000) - Date.now())
    }
    clearResetSeasonTimeout() {
        lt.clearTimeout(this.resetSeasonTimeoutId)
    }
}
module.exports = Settings