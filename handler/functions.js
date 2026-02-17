const { EmbedBuilder } = require("discord.js")
const node_emoji = require("node-emoji")
require('dotenv').config()
const Decimal = require('decimal.js')
const config = require('../config/botconfig')
const { AchievementType } = require("../enums/index")
const emojiUnicode = require('emoji-unicode')
async function addLike(client, userID, guildID, mention, likes, channel) {
    const settings = client.cache.settings.get(guildID)
    const achievements = client.cache.achievements.filter(e => e.guildID === guildID && e.type === AchievementType.Like && e.enabled)
    const itemsForLike = client.cache.items.filter(i => i.guildID === guildID && !i.temp && i.enabled && i.activities?.like?.amountFrom && i.activities?.like?.amountTo)
    const guild = client.guilds.cache.get(guildID)
    if (guild) {
        const likedProfile = await client.functions.fetchProfile(client, mention, guildID)
        const likingProfile = await client.functions.fetchProfile(client, userID, guildID)
        const likedUserRewards = []
        const likingUserRewards = []
        if (settings.xpForLike && !likedProfile.blockActivities?.like?.XP) {
            const base_xp = likes * settings.xpForLike
            const xp = base_xp + (base_xp * likedProfile.getXpBoost())
            if (xp) await likedProfile.addXp(xp)
        }
        if (settings.curForLike && !likedProfile.blockActivities?.like?.CUR) {
            const base_cur = likes * settings.curForLike
            const cur = base_cur + (base_cur * likedProfile.getCurBoost())
            if (cur) await likedProfile.addCurrency(cur)
        }
        if (settings.rpForLike && !likedProfile.blockActivities?.like?.RP) {
            const base_rp = likes * settings.rpForLike
            const rp = base_rp + (base_rp * likedProfile.getRpBoost())
            if (rp) await likedProfile.addRp(rp)
        }
        if (!likedProfile.blockActivities?.like?.items) {
            const member = await guild.members.fetch(likedProfile.userID).catch(e => null)
            await Promise.all(itemsForLike.map(async item => {
                if (item.activities_like_permission && client.cache.permissions.some(e => e.id === item.activities_like_permission)) {
                    const permission = client.cache.permissions.find(e => e.id === item.activities_like_permission)
                    const isPassing = permission.for(likedProfile, member, channel)
                    if (isPassing.value === true) {
                        const amount = client.functions.getRandomNumber(item.activities.like.amountFrom, item.activities.like.amountTo)
                        if (member) await likedProfile.addItem(item.itemID, amount)
                        likedUserRewards.push(`${item.displayEmoji}**${item.name}** (${amount})`)
                    }
                } else {
                    const amount = client.functions.getRandomNumber(item.activities.like.amountFrom, item.activities.like.amountTo)
                    if (member) await likedProfile.addItem(item.itemID, amount)
                    likedUserRewards.push(`${item.displayEmoji}**${item.name}** (${amount})`)
                }
            }))
        } 
        // The likes setter ADDS the value, so just pass the amount to add
        likedProfile.likes = likes
        likedProfile.profileLikes = (likedProfile.profileLikes || 0) + 1
        if (!likedProfile.usersWhoLiked) likedProfile.usersWhoLiked = []
        likedProfile.usersWhoLiked.push(userID)
        await Promise.all(achievements.map(async achievement => {
            if (!likedProfile.achievements?.some(ach => ach.achievmentID === achievement.id) && likedProfile.likes >= achievement.amount && !client.tempAchievements[likedProfile.userID]?.includes(achievement.id)) {
                if (!client.tempAchievements[likedProfile.userID]) client.tempAchievements[likedProfile.userID] = []
                client.tempAchievements[likedProfile.userID].push(achievement.id)
                await likedProfile.addAchievement(achievement)
            }        
        }))
        await likedProfile.save()
        likingProfile.lastLike = new Date()
        if (settings.xpForLike && !likingProfile.blockActivities?.like?.XP) {
            const base_xp = likes * settings.xpForLike
            const xp = base_xp + (base_xp * likingProfile.getXpBoost())
            // Pass withoutNotification=true to prevent level-up message for the liker
            // Only the liked user should receive level-up notifications from likes
            if (xp) await likingProfile.addXp(xp, false, false, false, true)
        }
        if (settings.curForLike && !likingProfile.blockActivities?.like?.CUR) {
            const base_cur = likes * settings.curForLike
            const cur = base_cur + (base_cur * likingProfile.getCurBoost())
            if (cur) await likingProfile.addCurrency(cur)
        }
        if (settings.rpForLike && !likingProfile.blockActivities?.like?.RP) {
            const base_rp = likes * settings.rpForLike
            const rp = base_rp + (base_rp * likingProfile.getRpBoost())
            if (rp) await likingProfile.addRp(rp)
        }
        if (!likingProfile.blockActivities?.like?.items) {
            const member = await guild.members.fetch(likingProfile.userID).catch(e => null)
            await Promise.all(itemsForLike.map(async item => {
                if (item.activities_like_permission && client.cache.permissions.some(e => e.id === item.activities_like_permission)) {
                    const permission = client.cache.permissions.find(e => e.id === item.activities_like_permission)
                    const isPassing = permission.for(likingProfile, member, channel)
                    if (isPassing.value === true) {
                        const amount = client.functions.getRandomNumber(item.activities.like.amountFrom, item.activities.like.amountTo)
                        if (member) await likingProfile.addItem(item.itemID, amount)
                        likingUserRewards.push(`${item.displayEmoji}**${item.name}** (${amount})`)
                    }
                } else {
                    const amount = client.functions.getRandomNumber(item.activities.like.amountFrom, item.activities.like.amountTo)
                    if (member) await likingProfile.addItem(item.itemID, amount)
                    likingUserRewards.push(`${item.displayEmoji}**${item.name}** (${amount})`)
                }
            }))
        }
        const guildQuests = client.cache.quests.filter(quest => quest.guildID === guild.id && quest.isEnabled && quest.targets.some(target => target.type === "like"))
        if (guildQuests.size) await likingProfile.addQuestProgression("like", 1, mention)
        await likingProfile.save()
        
        // Send DM notification to liked user
        try {
            const likedMember = await guild.members.fetch(mention).catch(() => null)
            const likingMember = await guild.members.fetch(userID).catch(() => null)
            if (likedMember && likingMember) {
                const dmEmbed = new EmbedBuilder()
                    .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
                    .setThumbnail(likingMember.displayAvatarURL())
                    .setDescription(`<@${userID}> ${client.language({ textId: "liked your profile", guildId: guildID })}`)
                    .setColor(0x2F3136)
                await likedMember.send({ embeds: [dmEmbed] }).catch(() => null)
            }
        } catch {
            // Silently fail if DM cannot be sent (user has DMs disabled)
        }
        
        return { likingProfile: likingProfile, likedProfile: likedProfile,  likingUserRewards: likingUserRewards, likedUserRewards: likedUserRewards }    
    }
}
async function fetchLeaderboard(client, guildID, selection) {
    if (!client) throw new TypeError("A client was not provided.")
    if (!guildID) throw new TypeError("A guild id was not provided.")
    const itemRegexp = /item<(.*?)>/
    if (selection.includes("item")) {
        const itemID = itemRegexp.exec(selection)[1]
        return client.cache.profiles.filter(profile => profile.guildID === guildID && !profile.deleteFromDB && profile.inventory.some(item => item.itemID === itemID)).map(profile => profile).sort((a, b) => {
            return b.inventory.find(e => e.itemID === itemID).amount - a.inventory.find(e => e.itemID === itemID).amount
        }).map((profile, index) => {
            profile.position = index + 1
            const amount = profile.inventory.find(e => e.itemID === itemID).amount
            return { ...profile, amount: amount }
        })
    }
    const splitted = selection.split('.')
    const time = splitted[0]
    const field = splitted[1]
    const profiles = client.cache.profiles.filter(profile => profile.guildID === guildID && !profile.deleteFromDB && (time !== "alltime" ? profile["stats"]?.[time]?.[field] > 0 : profile[field] > 0)).sort((a, b) => time !== "alltime" ? b["stats"][time][field] - a["stats"][time][field] : b[field] - a[field])
    return profiles
}
async function computeLeaderboard(client, leaderboard, selection, min) {
    if (!client) throw new TypeError("A client was not provided.")
    if (!leaderboard) throw new TypeError("A leaderboard id was not provided.")
    if (leaderboard.length < 1) return []
    const time = selection.split(".")[0]
    const computedArray = []
    for (const key of leaderboard) {
        computedArray.push({
            totalxp: (time === "alltime" ? key.totalxp : key.stats?.[time]?.totalxp) || 0,
            seasonLevel: key.seasonLevel,
            seasonTotalXp: key.seasonTotalXp || 0,
            userID: key.userID,
            level: key.level,
            position: (leaderboard.findIndex(i => i.userID === key.userID) + 1) == 1 
            ? `<a:TOP1:869597729960112169>**${(leaderboard.findIndex(i => i.userID === key.userID) + 1 + min)}**` : 
            (leaderboard.findIndex(i => i.userID === key.userID) + 1) == 2 
            ? `<a:TOP2:869597733021966336>**${(leaderboard.findIndex(i => i.userID === key.userID) + 1 + min)}**` :
            (leaderboard.findIndex(i => i.userID === key.userID) + 1) == 3 
            ? `<a:TOP3:869597729477763113>**${(leaderboard.findIndex(i => i.userID === key.userID) + 1 + min)}**` :
            (leaderboard.findIndex(i => i.userID === key.userID) + 1) == 4 
            ? `<a:TOP4:869597732493459526>**${(leaderboard.findIndex(i => i.userID === key.userID) + 1 + min)}**` :
            (leaderboard.findIndex(i => i.userID === key.userID) + 1) == 5
            ? `<a:TOP5:869597731570720898>**${(leaderboard.findIndex(i => i.userID === key.userID) + 1 + min)}**` :
            `**${(leaderboard.findIndex(i => i.userID === key.userID) + 1 + min)}**`,
            likes: (time === "alltime" ? key.likes : key.stats?.[time]?.likes) || 0,
            messages: (time === "alltime" ? key.messages : key.stats?.[time]?.messages) || 0,
            hours: (time === "alltime" ? key.hours?.toFixed(2) : key.stats?.[time]?.hours?.toFixed(2)) || 0,
            currency: (time === "alltime" ? key.currency : key.stats?.[time]?.currency) || 0,
            invites: (time === "alltime" ? key.invites :key.stats?.[time]?.invites) || 0,
            bumps: (time === "alltime" ? key.bumps :key.stats?.[time]?.bumps) || 0,
            rp: (time === "alltime" ? key.rp : key.stats?.[time]?.rp) || 0,
            giveawaysCreated: (time === "alltime" ? key.giveawaysCreated : key.stats?.[time]?.giveawaysCreated) || 0,
            wormholeTouched: (time === "alltime" ? key.wormholeTouched : key.stats?.[time]?.wormholeTouched) || 0,
            doneQuests: (time === "alltime" ? key.doneQuests : key.stats?.[time]?.doneQuests) || 0,
            itemsSoldOnMarketPlace: (time === "alltime" ? key.itemsSoldOnMarketPlace : key.stats?.[time]?.itemsSoldOnMarketPlace) || 0,
        })
    }
    return computedArray
}
async function fetchSettings(client, guildID) {
    let settings = client.cache.settings.get(guildID)
    if (settings) return settings
    settings = new client.settingsSchema({
        guildID: guildID,
        daily: {
            day1: [{
                itemID: "currency",
                valueFrom: 100,
                valueTo: 100,  
            }],
            day2: [{
                itemID: "currency",
                valueFrom: 200,
                valueTo: 200,  
            }],
            day3: [{
                itemID: "currency",
                valueFrom: 300,
                valueTo: 300,  
            }],
            day4: [{
                itemID: "currency",
                valueFrom: 400,
                valueTo: 400,  
            }],
            day5: [{
                itemID: "currency",
                valueFrom: 500,
                valueTo: 500,  
            }],
            day6: [{
                itemID: "currency",
                valueFrom: 600,
                valueTo: 600,  
            }],
            day7: [{
                itemID: "currency",
                valueFrom: 700,
                valueTo: 700,  
            }]
        }
    })
    try {
        await settings.save()
    } catch(err) {
        if (err.message.includes("duplicate key")) {
            settings = client.cache.settings.get(guildID)
            if (!settings) settings = await client.settingsSchema.findOne({ guildID: guildID }).lean()
            else return settings 
        } else throw err
    }
    settings = new Settings(client, settings)
    client.cache.settings.set(guildID, settings)
    return settings
}
async function getEmoji(client, emoji) {
    const unknownEmoji = "❓"
    if (!emoji) return unknownEmoji
    const isDefaultEmoji = node_emoji.hasEmoji(emoji)
    if (isDefaultEmoji) {
        emoji = node_emoji.emojify(emoji)
    }
    let guild_emoji = !isDefaultEmoji ? client.emojis.cache.get(emoji) : undefined
    if (!guild_emoji && !isDefaultEmoji) {
        guild_emoji = await client.shard.broadcastEval(async (c, { emojiId }) => {
            return c.emojis.cache.get(emojiId)
        }, { context: { emojiId: emoji }}).then(emojis => {
            return emojis.find(e => e)
        })
    }
    if (guild_emoji) return `<${guild_emoji.animated ? `a:` : `:`}${guild_emoji.name}:${guild_emoji.id}>`
    else if (isDefaultEmoji) return emoji
    else return unknownEmoji
}
async function getEmojiURL(client, emoji, extension) {
    if (!emoji) return null
    if (node_emoji.find(emoji)) {
        return `https://api-ninjas-data.s3.us-west-2.amazonaws.com/emojis/U%2B${emojiUnicode(emoji).toUpperCase().split(" ").join("%20U%2B")}.png`
    }
    let guild_emoji = client.emojis.cache.get(emoji)
    let imageURL
    if (!guild_emoji) {
        imageURL = await client.shard.broadcastEval(async (c, { emojiId, extension }) => {
            const guild_emoji = c.emojis.cache.get(emojiId)
            if (guild_emoji) {
                if (guild_emoji.animated) return guild_emoji.imageURL({ extension: extension || "gif" })
                else return guild_emoji.imageURL({ extension: extension || "png" })    
            }
        }, { context: { emojiId: emoji, extension: extension }}).then(urls => {
            return urls.find(e => e)
        })
    }
    if (guild_emoji) {
        if (guild_emoji.animated) return guild_emoji.imageURL({ extension: extension || "gif" })
        else return guild_emoji.imageURL({ extension: extension || "png" })
    } else if (imageURL) return imageURL
    else return null
}
async function sendError(error) {
    // Use centralized error handler
    const { handleError } = require('./errorHandler')
    handleError(error, { ownerId: config.discord.ownerId })
}
const Profile = require("../classes/profile.js")
const Settings = require("../classes/Settings.js")
async function fetchProfile(client, userID, guildID) {
    let profile = client.cache.profiles.get(guildID+userID)
    if (profile) return profile
    profile = await client.profileSchema.findOne({ userID: userID, guildID: guildID })
    if (profile) {
        profile = new Profile(client, profile)
        client.cache.profiles.set(guildID+userID, profile)
        return profile
    }
    const settings = await client.functions.fetchSettings(client, guildID)
    const query = {
        userID: userID,
        guildID: guildID,
        inventory: []
    }
    if (settings.startKitEnabled) {
        for (const element of settings.startKit) {
            if (element.itemID === "currency") {
                query.currency = element.amount
            }
            else if (element.itemID === "xp") {
                query.xp = element.amount
                query.totalxp = element.amount
            }
            else if (element.itemID === "rp") {
                query.rp = element.amount
            }
            else {
                const item = client.cache.items.find(i => i.itemID === element.itemID && !i.temp && i.enabled)
                if (item) {
                    item.found = true
                    await item.save()
                    query.inventory.push({
                        itemID: item.itemID,
                        amount: element.amount
                    })
                }
            }
        }    
    }
    try {
        profile = new client.profileSchema(query)
        await profile.save()    
    } catch (err) {
        if (err.message.includes('duplicate key')) {
            return client.cache.profiles.get(guildID+userID)
        }
        throw err
    }
    profile = new Profile(client, profile)
    client.cache.profiles.set(guildID+userID, profile)
    return profile
}
async function fetchGlobalProfile(client, userID) {
    let user = await client.globalProfileSchema.findOne({ userID: userID })
    if (user) return user
    user = new client.globalProfileSchema({
        userID: userID
    })
    await user.save().catch(e => console.error(e))
    return user
}
function getRandomNumber(min, max) {
    const minDot = min.toString().split('.')[1]?.length
    const maxDot = max.toString().split('.')[1]?.length
    const fixed = minDot > maxDot ? +minDot : maxDot ? +maxDot : minDot ? +minDot : 0
    if (fixed === 0) return Math.floor(Math.random() * (max - min + 1)) + min
    else return +(Math.random() * (max - min) + min).toFixed(fixed)
    
}
function transformSecs(client, duration, guildId, locale) {
    let ms = parseInt((duration % 1000) / 100),
    secs = Math.floor((duration / 1000) % 60),
    mins = Math.floor((duration / (1000 * 60)) % 60),
    hrs = Math.floor((duration / (1000 * 60 * 60)) % 24)
    years = Math.floor(duration / (1000 * 60 * 60 * 24) / 365)
    months = Math.floor(duration / (1000 * 60 * 60 * 24 * 30) % 12)
    days = months ? Math.floor(duration / (1000 * 60 * 60 * 24) % 30) : Math.floor(duration / (1000 * 60 * 60 * 24) % 365)
    const array = []
    if (years) array.push(`${years} ${client.language({ textId: `${client.functions.plural(years)}`, guildId: guildId, locale: locale })}`)
    if (months) array.push(`${months} ${client.language({ textId: "months", guildId: guildId, locale: locale })}.`)
    if (days) array.push(`${days} ${client.language({ textId: "days", guildId: guildId, locale: locale })}.`)
    if (hrs) array.push(`${hrs} ${client.language({ textId: "HOURS_SMALL", guildId: guildId, locale: locale })}.`)
    if (mins) array.push(`${mins} ${client.language({ textId: "minutes", guildId: guildId, locale: locale })}.`)
    if (secs) array.push(`${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`)
    return array.join(" ")
}
function plural(number) { 
    const titles = ['year', 'years', 'years'] 
    cases = [2, 0, 1, 1, 1, 2]
    return titles[ (number%100>4 && number%100<20)? 2 : cases[(number%10<5)?number%10:5] ] 
}

function getAchievementDescription(achievement, profile, settings, interaction, member) {
    switch(achievement.type) {
        case AchievementType.Message:
            return `${achievement.client.language({ textId: "Write", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "messages in chat", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.messages.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.messages / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Voice:
            return `${achievement.client.language({ textId: "Spend", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "hours in voice chat", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.hours.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.hours / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Like:
            return `${achievement.client.language({ textId: "Receive", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "likes", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.likes.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.likes / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Invite:
            return `${achievement.client.language({ textId: "Invite", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "people to server", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.invites.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.invites / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Bump:
            return `${achievement.client.language({ textId: "Bump server", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.bumps.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.bumps / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Currency:
            return `${achievement.client.language({ textId: "Accumulate", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${settings.currencyName} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.currency.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.currency / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.CurrencySpent:
            return `${achievement.client.language({ textId: "Spend", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${settings.currencyName} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.currencySpent.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.currencySpent / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Fishing:
            return `${achievement.client.language({ textId: "Fish", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.fishing.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.fishing / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Mining:
            return `${achievement.client.language({ textId: "Mine", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.mining.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.mining / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Item: {
            const targetItems = []
            if (achievement.items) {
                for (const itemID of achievement.items) {
                    const item = achievement.client.cache.items.get(itemID)
                    const isDefaultEmoji = item ? node_emoji.hasEmoji(item.emoji) : false
                    if (!isDefaultEmoji) targetItems.push(`${item ? `${item.name}` : itemID }`) 
                    else {
                        targetItems.push(`${item ? `${item.displayEmoji}${item.name}` : itemID }`)    
                    }
                }
            }
            return `${achievement.client.language({ textId: "Find item", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.items?.length ? targetItems.join(` ${achievement.client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} `) : ``}`
        }
        case AchievementType.Craft: {
            const targetItems = []
            if (achievement.items) {
                for (const itemID of achievement.items) {
                    const item = achievement.client.cache.items.get(itemID)
                    const isDefaultEmoji = node_emoji.hasEmoji(item?.emoji)
                    if (!isDefaultEmoji) targetItems.push(`${item ? `${item.name}` : itemID }`) 
                    else {
                        targetItems.push(`${item ? `${item.displayEmoji}${item.name}` : itemID }`)    
                    }
                }
            }
            return `${achievement.client.language({ textId: "Craft item", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.items?.length ? targetItems.join(` ${achievement.client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} `) : ``}`
        }
        case AchievementType.Wormhole:
            return `${achievement.client.language({ textId: "Touch wormhole", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.wormholeTouched.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.wormholeTouched / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Daily:
            return `${achievement.client.language({ textId: "Receive daily reward", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "days in a row", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.maxDaily.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.maxDaily / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Rp:
            return `${achievement.client.language({ textId: "Reach reputation", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.rp.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.rp / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Quests:
            return `${achievement.client.language({ textId: "Complete quests", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.doneQuests.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.doneQuests / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Items:
            return `${achievement.client.language({ textId: "Find all items", guildId: interaction.guildId, locale: interaction.locale })}`
        case AchievementType.Giveaway:
            return `${achievement.client.language({ textId: "Create giveaway", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.giveawaysCreated.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.giveawaysCreated / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Marketplace:
            return `${achievement.client.language({ textId: "Sell", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "items on market", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.itemsSoldOnMarketPlace.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.itemsSoldOnMarketPlace / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.DailyHours:
            return `${achievement.client.language({ textId: "Spend", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "hours in a row in voice channel", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.hoursSession.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.hoursSession / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.ItemsOpened:
            return `${achievement.client.language({ textId: "Open", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "items", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.itemsOpened.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.itemsOpened / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.WormholesSpawned:
            return `${achievement.client.language({ textId: "Spawn wormhole", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.wormholesSpawned.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.wormholesSpawned / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.ItemsReceived:
            return `${achievement.client.language({ textId: "Receive", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "items", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.itemsReceived.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.itemsReceived / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.ItemsCrafted:
            return `${achievement.client.language({ textId: "Craft", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "items", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.itemsCrafted.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.itemsCrafted / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.ItemsUsed:
            return `${achievement.client.language({ textId: "Use", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "items", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.itemsUsed.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.itemsUsed / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.ItemsBoughtInShop:
            return `${achievement.client.language({ textId: "Buy", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "items in shop", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.itemsBoughtInShop.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.itemsBoughtInShop / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.ItemsBoughtOnMarket:
            return `${achievement.client.language({ textId: "Buy", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "items on market", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.itemsBoughtOnMarket.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.itemsBoughtOnMarket / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.ItemsSold:
            return `${achievement.client.language({ textId: "Sell", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "items", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.itemsSold.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.itemsSold / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Role: {
            const targetRoles = []
            if (achievement.roles) {
                for (const roleID of achievement.roles) {
                    targetRoles.push(`<@&${roleID}>`)
                }
            }
            return `${achievement.client.language({ textId: "Get role", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.roles?.length ? targetRoles.join(` ${achievement.client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} `) : ``}`
        }
        case AchievementType.Level:
            return `${achievement.client.language({ textId: "Reach", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "level", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.level.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.level / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.SeasonLevel:
            return `${achievement.client.language({ textId: "Reach", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "season level", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.seasonLevel.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.seasonLevel / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.GetAllAchievements:
            return `${achievement.client.language({ textId: "Complete all achievements", guildId: interaction.guildId, locale: interaction.locale })}`
        case AchievementType.GuildBoost:
            return `${achievement.client.language({ textId: "Boost server", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.boosts.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.boosts / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.Work:
            return `${achievement.client.language({ textId: "Work", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.works.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.works / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.GiveawayWins:
            return `${achievement.client.language({ textId: "Win giveaway", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.giveawayWins.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.giveawayWins / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        case AchievementType.FishingItem: {
            const targetItems = []
            if (achievement.items) {
                for (const itemID of achievement.items) {
                    const item = achievement.client.cache.items.get(itemID)
                    const isDefaultEmoji = node_emoji.hasEmoji(item?.emoji)
                    if (!isDefaultEmoji) targetItems.push(`${item ? `${item.name}` : itemID }`) 
                    else {
                        targetItems.push(`${item ? `${item.displayEmoji}${item.name}` : itemID }`)    
                    }
                }
            }
            return `${achievement.client.language({ textId: "Catch item while fishing", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.items?.length ? targetItems.join(` ${achievement.client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} `) : ``}`
        }
        case AchievementType.MiningItem: {
            const targetItems = []
            if (achievement.items) {
                for (const itemID of achievement.items) {
                    const item = achievement.client.cache.items.get(itemID)
                    const isDefaultEmoji = node_emoji.hasEmoji(item?.emoji)
                    if (!isDefaultEmoji) targetItems.push(`${item ? `${item.name}` : itemID }`) 
                    else {
                        targetItems.push(`${item ? `${item.displayEmoji}${item.name}` : itemID }`)    
                    }
                }
            }
            return `${achievement.client.language({ textId: "Dig up item while mining", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.items?.length ? targetItems.join(` ${achievement.client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} `) : ``}`
        }
        case AchievementType.UsedPromocodes: {
            return `${achievement.client.language({ textId: "Use promocode", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "time(s)", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${profile.promocodesUsed.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **${Math.floor(profile.promocodesUsed / achievement.amount * 100)}%**)` : `(**${achievement.amount.toLocaleString()}**/**${achievement.amount.toLocaleString()}** **100%**)`}`
        }
        case AchievementType.MemberSince: {
            const total = achievement.client.functions.transformSecs(achievement.client, achievement.amount*60*1000, interaction.guildId, interaction.locale)
            return `${achievement.client.language({ textId: "Be on server for", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount ? total : `XX ${achievement.client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}`} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**${achievement.client.functions.transformSecs(achievement.client, Date.now() - member.joinedTimestamp, interaction.guildId, interaction.locale)}**/**${total}** **${Math.floor((Date.now() - member.joinedTimestamp) / (achievement.amount * 60 * 1000) * 100)}%**)` : `(**${total}**/**${total}** **100%**)`}`
        }
        case AchievementType.Crash: {
            return `${achievement.client.language({ textId: "Win bet", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.amount?.toLocaleString() || `XX`} ${achievement.client.language({ textId: "or more in Crash mini-game", guildId: interaction.guildId, locale: interaction.locale })} ${!profile ? "" : !profile.achievements?.some(e => e.achievmentID == achievement.id) ? `(**0**/**1** **${Math.floor(0 / 1 * 100)}%**)` : `(**1**/**1** **100%**)`}`
        }
        default:
            return `${achievement.type || achievement.client.language({ textId: "Achievement task missing", guildId: interaction.guildId, locale: interaction.locale })}`
    }
}
function adjustActivityChanceByLuck(items, luck, activity) {
    if (luck.gt(1)) {
        items.forEach(i => {
            i.activities[activity].chance = new Decimal(`${i.activities[activity].chance}`).mul(luck)
        })
        let i = 0
        while (items.reduce((prev, current) => prev.plus(current.activities[activity].chance), new Decimal(0)).gt(100)) {
            i++
            const highest = Math.max(...items.map(e => e.activities[activity].chance))
            const highestElementIndex = items.findIndex(e => e.activities[activity].chance.eq(highest))
            const multiplies = items.filter(e => e.activities[activity].chance.eq(highest)).length
            if (items.filter(e => e.activities[activity].chance.eq(highest)).length === items.filter(e => e.activities[activity].chance.gt(0)).length) {
                items.forEach(e => {
                    if (e.activities[activity].chance.eq(highest)) e.activities[activity].chance = new Decimal(100).div(multiplies)
                })
            } else {
                items[highestElementIndex].activities[activity].chance = (new Decimal(`${highest}`).mul(multiplies).minus(items.reduce((prev, current) => prev.plus(current.activities[activity].chance), new Decimal(0))).plus(100)).div(multiplies)
                if (items[highestElementIndex].activities[activity].chance.lt(0)) items[highestElementIndex].activities[activity].chance = new Decimal(0)
            }
            if (i > 10000) throw new Error(`Infinite loop message items (${interaction.guildId}) luck (${luck.mul(100).minus(100)})`)
        }
    }
    if (luck.lt(1)) {
        items.forEach(i => {
            i.activities[activity].chance = new Decimal(i.activities[activity].chance).mul(luck)
            if (i.activities[activity].chance.lt(0)) i.activities[activity].chance = new Decimal(0)
        })
    }
    return items
}
function adjustChanceByLuck(items, luck, mode) {
    if (luck.gt(1)) {
        items.forEach(i => {
            i.chance = new Decimal(`${i.chance}`).mul(luck)
            if (mode === "multiple") {
                if (i.chance.gt(100)) i.chance = new Decimal(100)
            }
        })
        if (mode === "single") {
            let i = 0
            while (items.reduce((prev, current) => prev.plus(current.chance), new Decimal(0)).gt(100)) {
                i++
                const highest = Math.max(...items.map(e => e.chance))
                const highestElementIndex = items.findIndex(e => e.chance.eq(highest))
                const multiplies = items.filter(e => e.chance.eq(highest)).length
                if (items.filter(e => e.chance.eq(highest)).length === items.filter(e => e.chance.gt(0)).length) {
                    items.forEach(e => {
                        if (e.chance.eq(highest)) e.chance = new Decimal(100).div(multiplies)
                    })
                } else {
                    items[highestElementIndex].chance = (new Decimal(`${highest}`).mul(multiplies).minus(items.reduce((prev, current) => prev.plus(current.chance), new Decimal(0))).plus(100)).div(multiplies)
                    if (items[highestElementIndex].chance.lt(0)) items[highestElementIndex].chance = new Decimal(0)
                }
                if (i > 10000) throw new Error(`Infinite loop message items (${interaction.guildId}) luck (${luck.mul(100).minus(100)})`)
            }
        }
        
    }
    if (luck.lt(1)) {
        items.forEach(i => {
            i.activities[activity].chance = new Decimal(i.activities[activity].chance).mul(luck)
            if (i.activities[activity].chance.lt(0)) i.activities[activity].chance = new Decimal(0)
        })
    }
    return items
}

/**
 * Detects all server role badges for a guild member
 * Returns all applicable badges instead of just the highest priority one
 * @param {GuildMember} member - The guild member to check
 * @returns {string[]} - Array of badge emoji strings
 */
function getServerRoleBadges(member) {
    if (!member || !member.guild) return []
    
    const badges = []
    
    // Check if member is guild owner
    if (member.id === member.guild.ownerId) {
        badges.push(config.emojis.ownerBadge)
    }
    
    // Check if member has Administrator permission
    if (member.permissions.has('Administrator')) {
        badges.push(config.emojis.adminBadge)
    }
    
    // Check if member has BanMembers OR KickMembers permission
    if (member.permissions.has('BanMembers') || member.permissions.has('KickMembers')) {
        badges.push(config.emojis.moderatorBadge)
    }
    
    return badges
}

/**
 * Legacy function - returns only highest priority badge
 * @deprecated Use getServerRoleBadges instead for all badges
 * @param {GuildMember} member - The guild member to check
 * @returns {string|null} - Badge emoji string or null if no badge
 */
function getServerRoleBadge(member) {
    const badges = getServerRoleBadges(member)
    return badges.length > 0 ? badges[0] : null
}

/**
 * Note: Nitro tier badges (Bronze, Silver, Emerald, Ruby, Platinum, Diamond, Opal)
 * are NOT available through Discord's API user flags. These visual badges are
 * only shown in Discord's UI and cannot be detected by bots.
 * The premiumType field only indicates if user has Nitro, not the specific tier badge.
 */

/**
 * Detects Discord badges from user flags
 * @param {User} user - The Discord user (must be force-fetched for flags)
 * @returns {string[]} - Array of badge emoji strings
 */
function getDiscordBadges(user) {
    if (!user || !user.flags) return []
    
    const badges = []
    
    // Check HypeSquad badges (user can only have one house)
    if (user.flags.has('HypeSquadOnlineHouse1')) {
        badges.push(config.emojis.hypesquadBravery)
    } else if (user.flags.has('HypeSquadOnlineHouse2')) {
        badges.push(config.emojis.hypesquadBrilliance)
    } else if (user.flags.has('HypeSquadOnlineHouse3')) {
        badges.push(config.emojis.hypesquadBalance)
    }
    
    // Note: Nitro tier badges are not available through Discord API
    // The premiumType field only indicates Nitro subscription, not specific tier badges
    
    // Check special badges
    if (user.flags.has('ActiveDeveloper')) {
        badges.push(config.emojis.developerBadge)
    }
    
    // Note: Quest Completed / Orb Collector badge is NOT available through Discord API
    // The 'Quarantined' flag is for account quarantine status, not quest completion
    
    return badges
}

/**
 * Builds the complete badge line for profile display
 * Combines all server role badges and Discord badges in the correct order:
 * Server Role Badges (Owner, Admin, Moderator), HypeSquad Badge, Developer Badge
 * @param {GuildMember} member - The guild member
 * @param {User} fetchedUser - Force-fetched user with flags
 * @returns {string|null} - Complete badge line or null if no badges
 */
function buildBadgeLine(member, fetchedUser) {
    const badges = []
    
    // Get all server role badges (Owner, Admin, Moderator)
    const serverRoleBadges = getServerRoleBadges(member)
    badges.push(...serverRoleBadges)
    
    // Get Discord badges (HypeSquad, Developer)
    const discordBadges = getDiscordBadges(fetchedUser)
    badges.push(...discordBadges)
    
    // Return null if no badges, otherwise return space-separated badge string
    if (badges.length === 0) {
        return null
    }
    
    return badges.join(' ')
}

module.exports = { getRandomNumber, fetchGlobalProfile, fetchProfile, addLike, fetchLeaderboard, computeLeaderboard, fetchSettings, getEmoji, sendError, getAchievementDescription, getEmojiURL, transformSecs, plural, adjustActivityChanceByLuck, adjustChanceByLuck, getServerRoleBadge, getServerRoleBadges, getDiscordBadges, buildBadgeLine }