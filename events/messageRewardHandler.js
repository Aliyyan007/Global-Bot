/**
 * Message Reward Handler
 * Processes text messages and awards XP, Currency, RP, and Items
 * Respects cooldowns, channel multipliers, and activity blocks
 */

const client = require('../index')
const { Events } = require('discord.js')
const Decimal = require('decimal.js')
const { AchievementType } = require('../enums')

client.on(Events.MessageCreate, async (message) => {
    try {
        // Ignore DMs, bots, system messages, and our own bot
        if (!message.guild) return
        if (message.author.bot) return
        if (message.system) return
        if (message.author.id === client.user.id) return
        
        // Check blacklist
        if (client.blacklist(message.guild.id, "full_ban", "guilds")) return
        if (client.blacklist(message.author.id, "full_ban", "users")) return
        
        // Get settings
        const settings = client.cache.settings.get(message.guild.id)
        if (!settings) return
        
        // Check if any message rewards are configured
        if (!settings.xpForMessage && !settings.curForMessage && !settings.rpForMessage) return
        
        // Check if channel is excluded
        if (settings.channels?.mutedChannels?.includes(message.channel.id)) return
        if (settings.channels?.mutedChannels?.includes(message.channel.parentId)) return
        
        // Get member
        const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null)
        if (!member) return
        
        // Check if user has muted role
        if (settings.roles?.mutedRoles?.length > 0) {
            if (member.roles.cache.hasAny(...settings.roles.mutedRoles)) return
        }
        
        // Check cooldown
        const cooldownKey = `${message.guild.id}_${message.author.id}`
        const cooldownTime = settings.messageCooldown ?? 60 // Default 60 seconds
        const now = Date.now()
        
        if (client.globalCooldown[cooldownKey]) {
            if (client.globalCooldown[cooldownKey] > now) {
                return // Still on cooldown
            }
            delete client.globalCooldown[cooldownKey] // Expired — reclaim the entry
        }
        
        // Set cooldown
        client.globalCooldown[cooldownKey] = now + (cooldownTime * 1000)
        
        // Fetch profile
        const profile = await client.functions.fetchProfile(client, message.author.id, message.guild.id)
        
        // Increment message count
        profile.messages = 1
        
        // Get channel multipliers
        let xp_multiplier_for_channel = 0
        let cur_multiplier_for_channel = 0
        let rp_multiplier_for_channel = 0
        let luck_multiplier_for_channel = 0
        
        let channelMultipliers = client.cache.channels.find(cm => cm.id === message.channel.id && cm.isEnabled)
        if (!channelMultipliers) {
            channelMultipliers = client.cache.channels.find(cm => cm.id === message.channel.parentId && cm.isEnabled)
        }
        
        if (channelMultipliers) {
            xp_multiplier_for_channel = channelMultipliers.xp_multiplier || 0
            cur_multiplier_for_channel = channelMultipliers.cur_multiplier || 0
            rp_multiplier_for_channel = channelMultipliers.rp_multiplier || 0
            luck_multiplier_for_channel = channelMultipliers.luck_multiplier || 0
        }
        
        const rewards = {
            xp: 0,
            currency: 0,
            rp: 0
        }
        
        // Award XP
        if (settings.xpForMessage && !profile.blockActivities?.message?.XP) {
            const base_xp = settings.xpForMessage
            const xp = base_xp + (base_xp * profile.getXpBoost(xp_multiplier_for_channel))
            if (xp > 0) {
                await profile.addXp(xp)
                rewards.xp = xp
            }
        }
        
        // Award Currency
        if (settings.curForMessage && !profile.blockActivities?.message?.CUR) {
            const base_cur = settings.curForMessage
            const cur = base_cur + (base_cur * profile.getCurBoost(cur_multiplier_for_channel))
            if (cur > 0) {
                await profile.addCurrency(cur)
                rewards.currency = cur
            }
        }
        
        // Award RP
        if (settings.rpForMessage && !profile.blockActivities?.message?.RP) {
            const base_rp = settings.rpForMessage
            const rp = base_rp + (base_rp * profile.getRpBoost(rp_multiplier_for_channel))
            if (rp > 0) {
                await profile.addRp(rp)
                rewards.rp = rp
            }
        }
        
        // Award Items
        if (!profile.blockActivities?.message?.items) {
            let items = client.cache.items.filter(item => {
                if (item.guildID !== message.guild.id) return false
                if (!item.enabled || item.temp) return false
                if (!item.activities?.message?.chance) return false
                return true
            }).sort((a, b) => a.activities.message.chance - b.activities.message.chance).map(e => {
                return {
                    itemID: e.itemID,
                    displayEmoji: e.displayEmoji,
                    name: e.name,
                    activities: {
                        message: {
                            chance: e.activities.message.chance,
                            amountFrom: e.activities.message.amountFrom,
                            amountTo: e.activities.message.amountTo
                        }
                    },
                    activities_message_permission: e.activities_message_permission
                }
            })
            
            if (items.length > 0) {
                // Apply luck boost
                const bonus = new Decimal(1).plus(profile.getLuckBoost(luck_multiplier_for_channel))
                items = client.functions.adjustActivityChanceByLuck(items, bonus, "message")
                
                // Roll for item drop
                let chance = Math.random() * 100
                if (chance === 0) chance = 100
                
                // Filter items by chance
                const eligibleItems = items.filter(i => i.activities.message.chance >= chance)
                
                for (const item of eligibleItems) {
                    // Check permission if required
                    if (item.activities_message_permission) {
                        const permission = client.cache.permissions.find(p => p.id === item.activities_message_permission)
                        if (permission) {
                            const isPassing = permission.for(profile, member, message.channel)
                            if (isPassing.value !== true) continue
                        }
                    }
                    
                    // Award item
                    const amount = client.functions.getRandomNumber(
                        item.activities.message.amountFrom,
                        item.activities.message.amountTo
                    )
                    
                    if (amount > 0) {
                        await profile.addItem(item.itemID, amount)
                    }
                }
            }
        }
        
        // Check quest progression
        const guildQuests = client.cache.quests.filter(quest => 
            quest.guildID === message.guild.id && 
            quest.isEnabled && 
            quest.targets.some(target => target.type === "message")
        )
        
        if (guildQuests.size > 0) {
            await profile.addQuestProgression("message", 1, message.channel.id)
        }
        
        // Check achievements
        const achievements = client.cache.achievements.filter(e => 
            e.guildID === message.guild.id && 
            e.type === AchievementType.Message && 
            e.enabled
        )
        
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && 
                profile.messages >= achievement.amount && 
                !client.tempAchievements[message.author.id]?.includes(achievement.id)) {
                
                if (!client.tempAchievements[message.author.id]) {
                    client.tempAchievements[message.author.id] = []
                }
                client.tempAchievements[message.author.id].push(achievement.id)
                await profile.addAchievement(achievement)
            }
        }))
        
        // Save profile
        await profile.save()
        
    } catch (error) {
        console.error('[Message Reward Handler] Error:', error)
        const { handleError } = require('../handler/errorHandler')
        handleError(error, { context: 'Message Reward Handler' })
    }
})
