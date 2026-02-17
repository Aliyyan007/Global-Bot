const { Schema, model, models } = require('mongoose')
const itemSchema = new Schema({
        itemID: { type: String, require: true, unique: true },
        name: { type: String, require: true },
        guildID: { type: String, require: true },
        description: { type: String, default: "", require: true },
        emoji: { type: String, default: "" },
        hex: { type: String },
        rarity: { type: String, default: "" },
        sort: { type: Number },
        image: { type: String },
        shop: {
                inShop: { type: Boolean, default: false },
                price: { type: Number },
                priceType: { type: String },
                sellingPrice: { type: Number },
                sellingPriceType: { type: String },
                amount: { type: Number, default: 0 },
                canDiscount: { type: Boolean, default: false },
                sellingDiscount: { type: Boolean, default: false },
                dailyShopping: { type: Number, default: 0 },
                weeklyShopping: { type: Number, default: 0 },
                monthlyShopping: { type: Number, default: 0 },
                autodelivery: {
                        daily: {
                                amount: { type: Number, default: 0 },
                                type: { type: String, default: "increase" }
                        },
                        weekly: {
                                amount: { type: Number, default: 0 },
                                type: { type: String, default: "increase" }
                        },
                        monthly: {
                                amount: { type: Number, default: 0 },
                                type: { type: String, default: "increase" }
                        },
                },
                cryptoPrice: { type: String },
                cryptoSellingPrice: { type: String },
                cryptoPriceMultiplier: { type: Number },
                cryptoSellingPriceMultiplier: { type: Number }
        },
        crafts : [{
                amountFrom : { type: Number },
                amountTo : { type: Number },
                isFound: { type: Boolean, default: true },
                items : [{
                        itemID : { type: String },
                        amount : { type: Number }
                }],
                permission: { type: String },
                cooldown_craft: { type: Number },
                min_craft: { type: Number },
                max_craft: { type: Number }
        }],
        contains: [{
                type: { type: Number },
                id: { type: String },
                amountFrom: { type: Number },
                amountTo: { type: Number },
                chance: { type: Number },
                currency: { type: String }
        }],
        openByItem: {
                itemID: { type: String },
                amount: { type: Number }
        },
        found: { type: Boolean, default: true },
        visible: { type: Boolean, default: true },
        activities: { type: Object, default: undefined },
        temp: { type: Boolean },
        tempCreated: { type: Date },
        onUse: {
                roleAdd: { type: String },
                role_add_direct: { type: Boolean },
                roleSwitch: { type: Boolean },
                roleTimely: { type: Number },
                roleDel: { type: String },
                trophyAdd: { type: String },
                trophyDel: { type: String },
                message: { type: String },
                messageOnDM: { type: Boolean, default: false },
                deleteItemFromServer: { type: String },
                multiplier: {
                        CUR: {
                                time: { type: Number },
                                x: { type: Number }
                        },
                        XP: {
                                time: { type: Number },
                                x: { type: Number }
                        },
                        Luck: {
                                time: { type: Number },
                                x: { type: Number }
                        },
                        RP: {
                                time: { type: Number },
                                x: { type: Number }
                        }
                },
                delCUR: { type: Boolean, default: false },
                delXP: { type: Boolean, default: false },
                delLuck: { type: Boolean, default: false },
                delRP: { type: Boolean, default: false },
                addQuest: { type: String },
                delQuest: { type: String },
                wipeQuest: { type: String },
                levelAdd: { type: Number },
                rpAdd: { type: Number },
                xpAdd: { type: Number },
                currencyAdd: { type: Number },
                itemAdd: {
                        itemID: { type: String },
                        amount: { type: Number }
                },
                addAchievement: { type: String },
                spawnWormhole: { type: String },
                itemResearch: { type: String },
                craftResearch: { type: String },
                takeXP: { type: Number },
                takeCUR: { type: Number },
                takeRP: { type: Number },
                takeItem: {
                        itemID: { type: String },
                        amount: { type: Number }
                },
                takeLevel: { type: Number },
                color: { type: String },
                thumbnail: { type: String },
                image: { type: String },
                autoIncome: { type: Number }
        },
        notTransable: { type: Boolean, default: false },
        notDropable: { type: Boolean, default: false },
        notGiveawayable: { type: Boolean, default: false },
        notSellable: { type: Boolean, default: false },
        notAuctionable: { type: Boolean, default: false },
        buyPermission: { type: String },
        sellPermission: { type: String },
        openPermission: { type: String },
        activities_message_permission: { type: String },
        activities_voice_permission: { type: String },
        activities_like_permission: { type: String },
        activities_invite_permission: { type: String },
        activities_bump_permission: { type: String },
        activities_fishing_permission: { type: String },
        activities_mining_permission: { type: String },
        usePermission: { type: String },
        transferPermission: { type: String },
        dropPermission: { type: String },
        cooldown_use: { type: Number },
        min_use: { type: Number, default: 1 },
        max_use: { type: Number, default: 1000 },
        cooldown_open: { type: Number },
        min_open: { type: Number, default: 1 },
        max_open: { type: Number, default: 1000 },
        cooldown_sell: { type: Number },
        min_sell: { type: Number, default: 0.01 },
        max_sell: { type: Number },
        cooldown_drop: { type: Number },
        min_drop: { type: Number, default: 0.01 },
        max_drop: { type: Number },
        cooldown_transfer: { type: Number },
        min_transfer: { type: Number, default: 0.01 },
        max_transfer: { type: Number },
        open_mode: { type: String, default: "single" },
        notCrashable: { type: Boolean, default: false },
        blackJackBan: { type: Boolean, default: false }
});
itemSchema.index({ name: 1, guildID: 1 }, { unique: true });
const name = "items";
module.exports = models[name] || model(name, itemSchema);
