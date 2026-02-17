const itemSchema = require("../schemas/itemSchema.js")
const { RewardType } = require("../enums/index")
const { EmbedBuilder } = require("discord.js")
const emojiUnicode = require('emoji-unicode')
class Item {
	constructor(client, item) {
        this.client = client
		this.itemID = item.itemID
        this.name = item.name
        this.guildID = item.guildID
        this.description = item.description
        this.emoji = item.emoji
        this.hex = item.hex
        this.rarity = item.rarity
        this.sort = item.sort
        this.image = item.image
        this.shop = item.shop
        this.crafts = item.crafts
        this.contains = item.contains
        this.openByItem = item.openByItem
        this.found = item.found
        this.visible = item.visible
        this.activities = item.activities
        this.temp = item.temp
        this.tempCreated = item.tempCreated
        this.onUse = item.onUse
        this.notTransable = item.notTransable
        this.notDropable = item.notDropable
        this.notGiveawayable = item.notGiveawayable
        this.notSellable = item.notSellable
        this.buyPermission = item.buyPermission
        this.sellPermission = item.sellPermission
        this.openPermission = item.openPermission
        this.activities_message_permission = item.activities_message_permission
        this.activities_voice_permission = item.activities_voice_permission
        this.activities_like_permission = item.activities_like_permission
        this.activities_invite_permission = item.activities_invite_permission
        this.activities_bump_permission = item.activities_bump_permission
        this.activities_fishing_permission = item.activities_fishing_permission
        this.activities_mining_permission = item.activities_mining_permission
        this.usePermission = item.usePermission
        this.transferPermission = item.transferPermission
        this.dropPermission = item.dropPermission
        this.cooldown_use = item.cooldown_use
        this.min_use = item.min_use
        this.max_use = item.max_use
        this.cooldown_open = item.cooldown_open
        this.min_open = item.min_open
        this.max_open = item.max_open
        this.cooldown_sell = item.cooldown_sell
        this.min_sell = item.min_sell
        this.max_sell = item.max_sell
        this.cooldown_drop = item.cooldown_drop
        this.min_drop = item.min_drop
        this.max_drop = item.max_drop
        this.cooldown_transfer = item.cooldown_transfer
        this.min_transfer = item.min_transfer
        this.max_transfer = item.max_transfer
        this.displayEmoji = "⏳"
        this.open_mode = item.open_mode
        this.notAuctionable = item.notAuctionable
        this.notCrashable = item.notCrashable
        this.blackJackBan = item.blackJackBan
	}
    get enabled() {
        return this.visible
    }
    get canUse() {
        return this.onUse.roleAdd || this.onUse.roleDel || this.onUse.trophyAdd || this.onUse.trophyDel || this.onUse.delCUR || this.onUse.delXP || this.onUse.delLuck || this.onUse.delRP || this.onUse.multiplier?.XP?.x || this.onUse.multiplier?.CUR?.x || this.onUse.multiplier?.Luck?.x || this.onUse.multiplier?.RP?.x || this.onUse.addQuest || this.onUse.delQuest || this.onUse.wipeQuest || this.onUse.levelAdd || this.onUse.rpAdd || this.onUse.xpAdd || this.onUse.currencyAdd || this.onUse.itemAdd?.itemID || this.onUse.addAchievement || this.onUse.spawnWormhole || this.onUse.message || this.onUse.craftResearch || this.onUse.itemResearch || this.onUse.deleteItemFromServer || this.onUse.takeXP || this.onUse.takeCUR || this.onUse.takeRP || this.onUse.takeItem?.itemID || this.onUse.takeLevel || this.onUse.autoIncome
    }
	async save() {
		await itemSchema.replaceOne({ itemID: this.itemID }, Object.assign({}, { ...this, client: undefined, displayEmoji: undefined }), { upsert: true })
	}
	async delete() {
        await Promise.all(this.client.cache.lots.filter(lot => lot.guildID === this.guildID && lot.item.id === this.itemID).map(async lot => {
            await lot.delete()
        }))
        await Promise.all(this.client.cache.profiles.filter(profile => profile.guildID === this.guildID && profile.inventory.some(item => item.itemID === this.itemID)).map(async profile => {
            profile.inventory = profile.inventory.filter(item => item.itemID !== this.itemID)
            await profile.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.shop.priceType === this.itemID).map(async item => {
            item.shop.priceType = undefined
            item.shop.inShop = false
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.shop.sellingPriceType === this.itemID).map(async item => {
            item.shop.sellingPriceType = undefined
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.crafts.some(craft => craft.items.some(ic => ic.itemID === this.itemID))).map(async item => {
            item.crafts = item.crafts.filter(craft => !craft.items.some(ic => ic.itemID === this.itemID))
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.contains.some(it => it.itemID === this.itemID)).map(async item => {
            item.contains = item.contains.filter(e => e.itemID !== this.itemID)
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.openByItem?.itemID === this.itemID).map(async item => {
            item.openByItem = undefined
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.onUse.itemAdd?.itemID === this.itemID).map(async item => {
            item.onUse.itemAdd = undefined
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.onUse.takeItem?.itemID === this.itemID).map(async item => {
            item.onUse.takeItem = undefined
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.onUse.deleteItemFromServer === this.itemID).map(async item => {
            item.onUse.deleteItemFromServer = undefined
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.onUse.itemResearch === this.itemID).map(async item => {
            item.onUse.itemResearch = undefined
            await item.save()
        }))
        await Promise.all(this.client.cache.items.filter(i => i.guildID === this.guildID && i.onUse.craftResearch === this.itemID).map(async item => {
            item.onUse.craftResearch = undefined
            await item.save()
        }))
        await Promise.all(this.client.cache.achievements.filter(e => e.guildID === this.guildID && e.rewards.some(rew => rew.type === RewardType.Item && rew.id === this.itemID)).map(async achievement => {
            achievement.rewards = achievement.rewards.filter(reward => reward.type !== RewardType.Item && reward.id !== this.itemID)
            await achievement.save()
        }))
        await Promise.all(this.client.cache.roles.filter(e => e.items.some(it => it.itemID === this.itemID)).map(async role => {
            role.items = role.items.filter(e => e.itemID !== this.itemID)
            await role.save()
        }))
        await Promise.all(this.client.cache.wormholes.filter(e => e.guildID === this.guildID && e.itemID === this.itemID).map(async wormhole => {
            await wormhole.delete()
        }))
        await Promise.all(this.client.cache.promocodeAutogenerators.filter(e => e.items.some(it => it.itemID === this.itemID)).map(async autogenerator => {
            autogenerator.items = autogenerator.items.filter(e => e.itemID !== this.itemID)
            if (!autogenerator.items.length) autogenerator.disable()
            await autogenerator.save()
        }))
        await Promise.all(this.client.cache.promocodes.filter(e => e.items.some(it => it.itemID === this.itemID)).map(async promocode => {
            promocode.items = promocode.items.filter(e => e.itemID !== this.itemID)
            if (!promocode.items.length) promocode.disable()
            await promocode.save()
        }))
        await Promise.all(this.client.cache.quests.filter(e => e.rewards.some(it => it.id === this.itemID)).map(async quest => {
            quest.rewards = quest.rewards.filter(e => e.id !== this.itemID)
            await quest.save()
        }))
        await this.client.shopCategorySchema.updateMany({ guildID: this.guildID, 'items': this.itemID }, { "$pull": { "items": this.itemID }})
        await Promise.all(this.client.cache.settings.filter(settings => settings.guildID === this.guildID && (settings.startKit && settings.startKit.some(e => e.itemID === this.itemID)) || (settings.customRolePrice && settings.customRolePrice.some(e => e.id === this.itemID))).map(async settings => {
            if (settings.startKit && settings.startKit.some(e => e.itemID === this.itemID)) {
                settings.startKit = settings.startKit.filter(e => e.itemID !== this.itemID)
            }
            if (settings.customRolePrice && settings.customRolePrice.some(e => e.itemID === this.itemID)) {
                settings.customRolePrice = settings.customRolePrice.filter(e => e.id !== this.itemID)
            }
            await settings.save()
        }))
        await this.client.giftSchema.updateMany({ guildID: this.guildID, 'items.itemID': this.itemID }, { "$pull": { "items": { "itemID": this.itemID }}})
        await Promise.all(this.client.cache.lots.filter(lot => lot.guildID === this.guildID && lot.items.some(e => e.id === this.itemID)).map(async lot => {
            const guild = this.client.guilds.cache.get(lot.guildID)
            const member = await guild.members.fetch(lot.userID).catch(e => null)
            const profile = this.client.cache.profiles.get(guild.id+lot.userID)
            if (profile) {
                let sellingItem
                if (lot.item.type === RewardType.Item) {
                    const item = this.client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.visible)
                    sellingItem = `${item?.name || lot.item.id} (${amount.toLocaleString()})`
                }
                if (lot.item.type === RewardType.Role) {
                    const role = guild.roles.cache.get(lot.item.id)
                    sellingItem = `${role.name} (${amount.toLocaleString()})`
                }
                await lot.return()
                if (member) member.send({ embeds: [
                    new EmbedBuilder()
                        .setTitle(guild.name)
                        .setThumbnail(guild.iconURL())
                        .setDescription(`${this.client.language({ textId: "Your lot", guildId: guild.id })} ${sellingItem} (${lot.lotID}) ${this.client.language({ textId: "was automatically deleted - one of the price items was removed. Items returned.", guildId: guild.id })}`)
                        .setColor(3093046)
                ] }).catch(e => null)    
            }
        }))
        await Promise.all(this.client.cache.auctions.filter(e => e.item.id === this.itemID && e.guildID === this.guildID).map(async auction => {
            await auction.delete(true)
        }))
        await Promise.all(this.client.cache.auctions.filter(e => e.bet?.id === this.itemID && e.guildID === this.guildID).map(async auction => {
            await auction.delete(false, true)
        }))
		await itemSchema.deleteOne({ itemID: this.itemID })
		this.client.cache.items.delete(this.itemID)
	}
    get canObtaining() {
        if (this.shop.inShop && (this.shop.price || this.shop.cryptoPrice) && this.shop.priceType && this.shop.amount) return true
        if (this.crafts.length) return true
        if (this.activities && Object.keys(this.activities).length) return true
        if (this.client.cache.items.some(e => e.guildID === this.guildID && e.enabled && e.contains.some(e1 => e1.id === this.itemID))) return true
        if (this.client.cache.items.some(e => e.guildID === this.guildID && e.enabled && e.canUse?.itemAdd?.itemID === this.itemID)) return true
        if (this.client.cache.achievements.some(e => e.guildID === this.guildID && e.enabled && e.rewards.some(e1 => e1.id === this.itemID))) return true
        if (this.client.cache.auctions.some(e => e.guildID === this.guildID && e.item.id === this.itemID && e.status === "started")) return true
        if (this.client.cache.giveaways.some(e => e.guildID === this.guildID && e.rewards.some(e1 => e1.id === this.itemID) && e.status === "started")) return true
        if (this.client.cache.roles.some(e => e.guildID === this.guildID && e.type === "static" && e.items.some(e1 => e1.itemID === this.itemID) && e.isEnabled)) return true
        if (this.client.cache.jobs.some(e => e.guildID === this.guildID && e.enable && (e.action1.success.rewards.some(e1 => e1.itemID === this.itemID && e1.maxAmount > 0) || e.action1.fail.rewards.some(e1 => e1.itemID === this.itemID && e1.maxAmount > 0) || e.action2.success.rewards.some(e1 => e1.itemID === this.itemID && e1.maxAmount > 0) || e.action2.fail.rewards.some(e1 => e1.itemID === this.itemID && e1.maxAmount > 0)))) return true
        if (this.client.cache.lots.some(e => e.guildID === this.guildID && e.item.id === this.itemID && e.enable && e.created)) return true
        if (this.client.cache.quests.some(e => e.guildID === this.guildID && e.rewards.some(e1 => e1.id === this.itemID) && e.isEnabled)) return true
        if (this.client.cache.wormholes.some(e => e.guildID === this.guildID && e.itemID === this.itemID && e.isEnabled && e.runsLeft)) return true
        return false
    }
    async getEmojiURL() {
        return this.emoji === this.displayEmoji ? `https://api-ninjas-data.s3.us-west-2.amazonaws.com/emojis/U%2B${emojiUnicode(this.displayEmoji).toUpperCase().split(" ").join("%20U%2B")}.png` : await this.client.functions.getEmojiURL(this.client, this.emoji)
    }
}
module.exports = Item