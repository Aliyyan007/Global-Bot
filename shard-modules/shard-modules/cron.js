
require('dotenv').config()
const { ShardClientUtil } = require("discord.js")
const Cron = require("croner")
const commandsUsesSchema = require("../schemas/commandsUsesSchema.js")
const settingsSchema = require("../schemas/settingsSchema.js")
const profileSchema = require("../schemas/profileSchema.js")
const wormholeStyleSchema = require("../schemas/wormholeStyleSchema.js")
const shopCategorySchema = require("../schemas/shopCategorySchema.js")
const dropdownRoleSchema = require("../schemas/dropdownRoleSchema.js")
const timedRoleSchema = require("../schemas/timedRoleSchema.js")
const rolePropertiesSchema = require("../schemas/rolePropertiesSchema.js")
const customRoleSchema = require("../schemas/customRoleSchema.js")
const mongoose = require("mongoose")
module.exports = async function (manager) {
    mongoose.set("strictQuery", true)
    await mongoose.connect(process.env.mongoDB_SRV, {
        useNewUrlParser: true, 
        useUnifiedTopology: true,
    })
    Cron('00 00 * * * *', { timezone: "Atlantic/Azores" }, async () => {
        //HOURLY
         await commandsUsesSchema.updateMany({}, [{ $set: {
            lastHourUses: "$hourly.uses",
             "hourly.uses": 0,
         }}])
    })
    Cron('00 25 00 * * *', { timezone: "Atlantic/Azores" }, async () => {
        //DAILY
        await commandsUsesSchema.updateMany({}, [{ $set: {
            lastDayUses: "$daily.uses",
            "daily.uses": 0,
         }}])
        await manager.broadcastEval(async (c) => {
			await Promise.all(c.cache.profiles.filter(profile => profile.stats && profile.stats.daily).map(async profile => {
                try {
                    profile.stats.daily = undefined
                    if (!profile.stats?.daily && !profile.stats?.weekly && !profile.stats?.monthly && !profile.stats?.yearly) profile.stats = undefined
                    profile.dailyLimits = undefined
                    await profile.save()
                } catch (err) {
                    console.error(`Failed to save profile ${profile.userID}:`, err)
                }
            }))
            await Promise.all(c.cache.items.filter(item => item.temp && item.tempCreated <= new Date()).map(async item => {
                try {
                    await item.save()
                } catch (err) {
                    console.error(`Failed to save item ${item.itemID}:`, err)
                }
            }))
            await Promise.all(c.cache.items.filter(item => item.shop.autodelivery?.daily?.amount > 0).map(async item => {
                try {
                    if (item.shop.autodelivery.daily.type === "set") {
                        item.shop.amount = item.shop.autodelivery.daily.amount
                    } else if (item.shop.autodelivery.daily.type === "increase") {
                        item.shop.amount += item.shop.autodelivery.daily.amount
                    }
                    await item.save()
                } catch (err) {
                    console.error(`Failed to save item ${item.itemID}:`, err)
                }
            }))
		})
        const expiredGuilds = await settingsSchema.find({ deleteFromDB: { $lte: new Date() } })
        await Promise.all(expiredGuilds.map(async guild => {
            const isGuild = await manager.broadcastEval(async (c, { guildID }) => {
                const guild = c.guilds.cache.get(guildID)
                if (guild) {
                    const settings = c.cache.settings.get(guildID)
                    settings.deleteFromDB = undefined
                    await settings.save().catch(err => console.error(`Failed to save settings:`, err))
                    return true
                }
                else return false
            }, { shard: ShardClientUtil.shardIdForGuildId(guild.guildID, manager.totalShards), context: { guildID: guild.guildID }})
            if (!isGuild) {
                await manager.broadcastEval(async (c, { guildID }) => {
                    await Promise.all(c.cache.achievements.filter(e => e.guildID === guildID).map(async achievement => {
                        await achievement.delete()
                    }))
                    await Promise.all(c.cache.profiles.filter(profile => profile.guildID === guildID).map(async profile => {
                        await profile.delete()
                    }))
                    await Promise.all(c.cache.items.filter(item => item.guildID === guildID).map(async item => {
                        await item.delete()
                    }))
                    await Promise.all(c.cache.wormholes.filter(wormhole => wormhole.guildID === guildID).map(async wormhole => {
                        await wormhole.delete()
                    }))
                    await Promise.all(c.cache.permissions.filter(permission => permission.guildID === guildID).map(async permission => {
                        await permission.delete()
                    }))
                    await Promise.all(c.cache.jobs.filter(job => job.guildID === guildID).map(async job => {
                        await job.delete()
                    }))
                    await Promise.all(c.cache.giveaways.filter(giveaway => giveaway.guildID === guildID).map(async giveaway => {
                        await giveaway.delete()
                    }))
                    await Promise.all(c.cache.roles.filter(role => role.guildID === guildID).map(async role => {
                        await role.delete()
                    }))
                    await Promise.all(c.cache.lots.filter(lot => lot.guildID === guildID).map(async lot => {
                        await lot.delete()
                    }))
                    await Promise.all(c.cache.promocodeAutogenerators.filter(generator => generator.guildID === guildID).map(async generator => {
                        await generator.delete()
                    }))
                    await Promise.all(c.cache.promocodes.filter(promocode => promocode.guildID === guildID).map(async promocode => {
                        await promocode.delete()
                    }))
                    await Promise.all(c.cache.quests.filter(quest => quest.guildID === guildID).map(async quest => {
                        await quest.delete()
                    }))
                }, { shard: ShardClientUtil.shardIdForGuildId(guild.guildID, manager.totalShards), context: { guildID: guild.guildID }})
                await wormholeStyleSchema.deleteMany({ guildID: guild.guildID })
                await shopCategorySchema.deleteMany({ guildID: guild.guildID })
                await dropdownRoleSchema.deleteMany({ guildID: guild.guildID })
                await timedRoleSchema.deleteMany({ guildID: guild.guildID })
                await settingsSchema.deleteOne({ guildID: guild.guildID })
                await customRoleSchema.deleteMany({ guildID: guild.guildID })
                await rolePropertiesSchema.deleteMany({ guildID: guild.guildID })
            }	
        }))
        const users = await profileSchema.find({ deleteFromDB: { $lte: new Date() } })
        for (const user of users) {
            await manager.broadcastEval(async (c, { guildID, userID }) => {
                const profile = c.cache.profiles.get(guildID + userID)
                if (!profile) return
                const guild = c.guilds.cache.get(guildID)
                if (!guild) return await profile.delete()
                const member = await guild.members.fetch(userID).catch(e => null)
                if (!member) return await profile.delete()
                profile.deleteFromDB = undefined 
                await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
            }, { shard: ShardClientUtil.shardIdForGuildId(user.guildID, manager.totalShards), context: { guildID: user.guildID, userID: user.userID }})	    
        }
    })
    Cron('00 30 00 * * Mon', { timezone: "Atlantic/Azores" }, async () => {
        //WEEKLY
        await commandsUsesSchema.updateMany({}, [{ $set: {
            lastWeekUses: "$weekly.uses",
            "weekly.uses": 0,
         }}])
        await manager.broadcastEval(async (c) => {
			await Promise.all(c.cache.profiles.filter(profile => profile.stats && profile.stats.weekly).map(async profile => {
                try {
                    profile.stats.weekly = undefined
                    if (!profile.stats?.daily && !profile.stats?.weekly && !profile.stats?.monthly && !profile.stats?.yearly) profile.stats = undefined
                    profile.weeklyLimits = undefined
                    await profile.save()
                } catch (err) {
                    console.error(`Failed to save profile ${profile.userID}:`, err)
                }
            }))
            await Promise.all(c.cache.items.filter(item => item.shop.autodelivery?.weekly?.amount > 0).map(async item => {
                try {
                    if (item.shop.autodelivery.weekly.type === "set") {
                        item.shop.amount = item.shop.autodelivery.weekly.amount
                    } else if (item.shop.autodelivery.weekly.type === "increase") {
                        item.shop.amount += item.shop.autodelivery.weekly.amount
                    }
                    await item.save()
                } catch (err) {
                    console.error(`Failed to save item ${item.itemID}:`, err)
                }
            }))
		})
    })
    Cron('00 35 00 1 * *', { timezone: "Atlantic/Azores" }, async () => {
        //MONTHLY
        await commandsUsesSchema.updateMany({}, [{ $set: {
            lastMonthUses: "$monthly.uses",
            "monthly.uses": 0,
         }}])
        await manager.broadcastEval(async (c) => {
			await Promise.all(c.cache.profiles.filter(profile => profile.stats && profile.stats.monthly).map(async profile => {
                try {
                    profile.stats.monthly = undefined
                    if (!profile.stats?.daily && !profile.stats?.weekly && !profile.stats?.monthly && !profile.stats?.yearly) profile.stats = undefined
                    profile.monthlyLimits = undefined
                    await profile.save()
                } catch (err) {
                    console.error(`Failed to save profile ${profile.userID}:`, err)
                }
            }))
            await Promise.all(c.cache.items.filter(item => item.shop.autodelivery?.monthly?.amount > 0).map(async item => {
                try {
                    if (item.shop.autodelivery.monthly.type === "set") {
                        item.shop.amount = item.shop.autodelivery.monthly.amount
                    } else if (item.shop.autodelivery.monthly.type === "increase") {
                        item.shop.amount += item.shop.autodelivery.monthly.amount
                    }
                    await item.save()
                } catch (err) {
                    console.error(`Failed to save item ${item.itemID}:`, err)
                }
            }))
		})
    })
    Cron('00 40 00 1 1 *', { timezone: "Atlantic/Azores" }, async () => {
        //YEARLY
        await manager.broadcastEval(async (c) => {
			await Promise.all(c.cache.profiles.filter(profile => profile.stats && profile.stats.yearly).map(async profile => {
                try {
                    profile.stats.yearly = undefined
                    if (!profile.stats?.daily && !profile.stats?.weekly && !profile.stats?.monthly && !profile.stats?.yearly) profile.stats = undefined
                    profile.yearlyLimits = {}
                    await profile.save()
                } catch (err) {
                    console.error(`Failed to save profile ${profile.userID}:`, err)
                }
            }))
		})
    })
}