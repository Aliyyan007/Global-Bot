const client = require("../index")
const { EmbedBuilder, ChannelType, MessageType, Events, ApplicationCommandType, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js")
const { AchievementType } = require("../enums")
const Decimal = require('decimal.js')
const { glob } = require("glob")

// Auto Voice Integration
const autoVoice = require('../modules/auto-voice')

// Debounce map to prevent rapid repositioning (stores timestamp of last reposition)
const stickyDebounce = new Map()

// Minimum delay between repositions per channel (in milliseconds)
// Set to 0 for immediate repositioning on every message
const STICKY_REPOSITION_DEBOUNCE_MS = 0

client.on(Events.MessageCreate, async (message) => {
    // Handle Auto Voice sticky notes
    try {
        await autoVoice.handleMessageCreate(message)
    } catch (e) {
        // Silently ignore Auto Voice errors
    }
    
    // Handle moderation system prefix commands
    if (message.inGuild() && !message.author.bot) {
        try {
            const moderationHandler = require('./moderationMessageCreate')
            await moderationHandler.execute(message, client)
        } catch (e) {
            // Silently ignore if moderation system is not enabled
        }
    }
    
    // Handle sticky message repositioning for any message in the channel
    // This keeps sticky buttons at the bottom regardless of who sends messages
    if (message.inGuild()) {
        await handleStickyReposition(client, message)
    }
    
    if (message.author.id === client.config.discord.ownerId && message.content === "!reg") {
        const value = glob.sync(`slash-commands/reg.js`, {
            absolute: true
        })
        let command = require(value[0])
        const guild = client.guilds.cache.get(message.guild.id)
        if (guild) {
            try {
                command = await client.application.commands.create(command, message.guild.id)
            } catch (err) {
                return message.reply({ content: err.message })
            }
            return message.reply({ content: `Command </${command.name}:${command.id}> was successfully registered on server ${guild.name} (${guild.id}).` })    
        } else return message.reply({ content: `Server with ID ${message.guild.id} not found` })
    }
    if (message.inGuild() && client.blacklist(message.guildId, "full_ban", "guilds")) return
    if (message.inGuild() && client.blacklist(message.author.id, "full_ban", "users")) return
    if ([MessageType.GuildBoost, MessageType.GuildBoostTier1, MessageType.GuildBoostTier2, MessageType.GuildBoostTier3].includes(message.type)) {
        const profile = await client.functions.fetchProfile(client, message.author.id, message.guildId)
        profile.boosts += 1
        const achievements = client.cache.achievements.filter(e => e.guildID === message.guildId && e.type === AchievementType.GuildBoost && e.enabled)
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.boosts >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                client.tempAchievements[profile.userID].push(achievement.id)
                await profile.addAchievement(achievement)
            }
        }))
        await profile.save()
    }
    if (message.author.bot || message.channel.type === ChannelType.DM || message.channel.type == ChannelType.GroupDM || (message.type !== MessageType.Default && message.type !== MessageType.Reply)) return
    const settings = await client.functions.fetchSettings(client, message.guildId)
    if (!settings.channels.mutedChannels.includes(message.channelId)) {
        //Выдача опыта за сообщение
        const profile = await client.functions.fetchProfile(client, message.author.id, message.guildId)
        profile.messages = 1
        if (message.member) {
            if (!message.member.roles.cache.hasAny(...settings.roles?.mutedRoles)) {
                if (settings.curForMessage && !profile.blockActivities?.message?.CUR) {
                    let cur_multiplier_for_channel = 0
                    let channel = client.cache.channels.find(channel => channel.id === message.channelId && channel.isEnabled)
                    if (!channel) channel = client.cache.channels.find(channel => channel.id === message.channel?.parentId && channel.isEnabled)
                    if (channel) {
                        cur_multiplier_for_channel = channel.cur_multiplier
                    }
                    const base_cur = 1 * settings.curForMessage
                    const cur = base_cur + (base_cur * profile.getCurBoost(cur_multiplier_for_channel))
                    if (cur) await profile.addCurrency(cur)
                }
                if (settings.xpForMessage && !profile.blockActivities?.message?.XP) {
                    let xp_multiplier_for_channel = 0
                    let channel = client.cache.channels.find(channel => channel.id === message.channelId && channel.isEnabled)
                    if (!channel) channel = client.cache.channels.find(channel => channel.id === message.channel?.parentId && channel.isEnabled)
                    if (channel) {
                        xp_multiplier_for_channel = channel.xp_multiplier
                    }
                    const base_xp = 1 * settings.xpForMessage
                    const xp = base_xp + (base_xp * profile.getXpBoost(xp_multiplier_for_channel))
                    if (xp) await profile.addXp(xp)
                }
                if (settings.rpForMessage && !profile.blockActivities?.message?.RP) {
                    let rp_multiplier_for_channel = 0
                    let channel = client.cache.channels.find(channel => channel.id === message.channelId && channel.isEnabled)
                    if (!channel) channel = client.cache.channels.find(channel => channel.id === message.channel?.parentId && channel.isEnabled)
                    if (channel) {
                        rp_multiplier_for_channel = channel.rp_multiplier
                    }
                    const base_rp = 1 * settings.rpForMessage
                    const rp = base_rp + (base_rp * profile.getRpBoost(rp_multiplier_for_channel))
                    if (rp) await profile.addRp(rp)
                }
                const guildQuests = client.cache.quests.filter(quest => quest.guildID === message.guildId && quest.isEnabled && quest.targets.some(target => target.type === "message"))
                if (guildQuests.size) await profile.addQuestProgression("message", 1, message.channelId)
                const achievements = client.cache.achievements.filter(e => e.guildID === message.guildId && e.type === AchievementType.Message && e.enabled)
                await Promise.all(achievements.map(async achievement => {
                    if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.messages >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                        if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                        client.tempAchievements[profile.userID].push(achievement.id)
                        await profile.addAchievement(achievement)
                    }
                }))
            }    
        }
        if (message.member && !message.member.roles.cache.hasAny(...settings.roles?.mutedRoles) && !profile.blockActivities?.message?.items) {
            let items_for_message = client.cache.items.filter(item => item.guildID === message.guildId && !item.temp && item.enabled && item.activities?.message?.chance).sort((a, b) => a.activities.message.chance - b.activities.message.chance).map(e => { 
                return { itemID: e.itemID, displayEmoji: e.displayEmoji, name: e.name, activities: { message: { chance: e.activities.message.chance, amountFrom: e.activities.message.amountFrom, amountTo: e.activities.message.amountTo } }, hex: e.hex, activities_message_permission: e.activities_message_permission }
            })
            if (items_for_message.length) {
                let luck_multiplier_for_channel = 0
                if (message.channel) {
                    let channel = client.cache.channels.find(channel => channel.id === message.channelId && channel.isEnabled)
                    if (!channel) channel = client.cache.channels.find(channel => channel.id === message.channel?.parentId && channel.isEnabled)
                    if (channel) {
                        luck_multiplier_for_channel = channel.luck_multiplier
                    }    
                }
                const bonus = new Decimal(1).plus(profile.getLuckBoost(luck_multiplier_for_channel))
                items_for_message = client.functions.adjustActivityChanceByLuck(items_for_message, bonus, "message")
                let base_chance = Math.random()
                if (base_chance === 0) base_chance = 1
                const asyncFilter = async (arr, predicate) => {
                    const results = await Promise.all(arr.map(predicate))
                    return results.filter((_v, index) => results[index])
                }
                items_for_message = await asyncFilter(items_for_message, async (e) => {
                    if (e.activities_message_permission) {
                        const permission = client.cache.permissions.find(i => i.id === e.activities_message_permission)
                        if (permission) {
                            const isPassing = permission.for(profile, message.member, message.channel)
                            if (isPassing.value === true) return e	
                        } else return e
                    } else return e
                })
                let item = drop(items_for_message, base_chance)
                if (item) {
                    const amount = client.functions.getRandomNumber(item.activities.message.amountFrom, item.activities.message.amountTo)
                    await profile.addItem(item.itemID, amount)
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: message.member.displayName, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`${client.language({ textId: "Found", guildId: message.guildId })}: ${item.displayEmoji}**${item.name}** (${amount})`)
                        .setColor(item.hex || "#2F3236")
                    if (settings.channels?.itemsNotificationChannelId) await message.member.guild.channels.fetch(settings.channels.itemsNotificationChannelId).then(channel => channel.send({ content: profile.itemMention ? `<@${message.member.user.id}>` : ` `, embeds: [embed] })).catch(e => null)
                }    
            }
        }
        await profile.save()
    }
})
const lerp = (min, max, roll) => ((1 - roll) * min + roll * max)
const drop = (items, roll) => {
    const chance = lerp(0, 100, roll)
    let current = new Decimal(0)
    for (const item of items) {
        if (current.lte(chance) && current.plus(item.activities.message.chance).gte(chance)) {
            return item
        }
        current = current.plus(item.activities.message.chance)
    }
}


// Commands that use multi-button format (view, edit, view others)
const MULTI_BUTTON_COMMANDS = ['profile', 'rank']

// Button label mappings for multi-button commands
const VIEW_BUTTON_LABELS = {
    'profile': 'View Profile',
    'rank': 'View Rank'
}

const EDIT_BUTTON_LABELS = {
    'profile': 'Edit Profile',
    'rank': 'Edit Rank'
}

/**
 * Handles repositioning sticky messages to keep them at the bottom of the channel
 * Triggers on ANY message (users, bots, system) to ensure sticky buttons always stay at bottom
 * @param {Client} client - Discord client
 * @param {Message} message - The new message that was sent
 */
async function handleStickyReposition(client, message) {
    // Find all sticky commands for this channel
    const stickyCommands = [...client.cache.stickyCommands.values()].filter(
        sc => sc.channelID === message.channelId && sc.guildID === message.guildId
    )
    
    if (!stickyCommands.length) return
    
    // Use a single debounce key for the entire channel to combine all sticky commands
    const channelDebounceKey = `${message.guildId}_${message.channelId}_combined`
    
    // Check if any of the sticky messages is the current message (avoid infinite loop)
    const isOwnStickyMessage = stickyCommands.some(sc => sc.messageID === message.id)
    if (isOwnStickyMessage) return
    
    // Skip only our own sticky button messages (messages with only components, no content/embeds)
    // This prevents infinite loops when we send the new sticky message
    if (message.author.id === client.user.id) {
        const isOnlyComponents = message.components?.length > 0 && 
                                 !message.content && 
                                 (!message.embeds || message.embeds.length === 0)
        if (isOnlyComponents) return
    }
    
    // Minimal debounce to prevent race conditions during very rapid messages
    const lastReposition = stickyDebounce.get(channelDebounceKey)
    const now = Date.now()
    if (lastReposition && now - lastReposition < STICKY_REPOSITION_DEBOUNCE_MS) {
        return
    }
    stickyDebounce.set(channelDebounceKey, now)
    
    await performStickyReposition(client, message.channel, stickyCommands, channelDebounceKey)
}

/**
 * Performs the actual sticky message repositioning
 * @param {Client} client - Discord client
 * @param {TextChannel} channel - The channel to reposition in
 * @param {Array} stickyCommands - Array of sticky command configs for this channel
 * @param {string} channelDebounceKey - Debounce key for this channel
 */
async function performStickyReposition(client, channel, stickyCommands, channelDebounceKey) {
    // Update debounce timestamp
    stickyDebounce.set(channelDebounceKey, Date.now())
    
    try {
        const oldMessageIds = new Set() // Use Set to avoid duplicates
        
        // Get command-specific emoji or use default
        const commandEmojis = {
            'profile': '<:Profile:1452116336892182569>',
            'daily': client.config.emojis.daily || '📅',
            'rank': client.config.emojis.rank || '🏆',
            'shop': client.config.emojis.shop || '🛒',
            'inventory': client.config.emojis.inventory || '🎒',
            'quests': client.config.emojis.quests || '📜'
        }
        
        // Sort sticky commands by createdAt to maintain order (earliest first)
        const sortedStickyCommands = [...stickyCommands].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateA - dateB
        })
        
        // Collect old message IDs for deletion
        for (const stickyConfig of sortedStickyCommands) {
            if (stickyConfig.messageID) {
                oldMessageIds.add(stickyConfig.messageID)
            }
        }
        
        // Build combined button rows - single-button commands go together, multi-button get own row
        const rows = []
        const singleButtonCommands = []
        
        for (const stickyConfig of sortedStickyCommands) {
            const buttonEmoji = commandEmojis[stickyConfig.commandName] || client.config.emojis.star || '⭐'
            
            if (MULTI_BUTTON_COMMANDS.includes(stickyConfig.commandName)) {
                // Multi-button commands get their own row
                // But first, flush any accumulated single buttons
                if (singleButtonCommands.length > 0) {
                    while (singleButtonCommands.length > 0 && rows.length < 5) {
                        const batch = singleButtonCommands.splice(0, 5)
                        const row = new ActionRowBuilder()
                        for (const cmd of batch) {
                            row.addComponents(cmd.button)
                        }
                        rows.push(row)
                    }
                }
                
                // Add multi-button row if we have space
                if (rows.length < 5) {
                    const viewButton = new ButtonBuilder()
                        .setCustomId(`c{sc}a{v}n{${stickyConfig.commandName}}ch{${stickyConfig.channelID}}`)
                        .setLabel(VIEW_BUTTON_LABELS[stickyConfig.commandName])
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(buttonEmoji)
                    
                    const editButton = new ButtonBuilder()
                        .setCustomId(`c{sc}a{e}n{${stickyConfig.commandName}}ch{${stickyConfig.channelID}}`)
                        .setLabel(EDIT_BUTTON_LABELS[stickyConfig.commandName])
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('✏️')
                    
                    const searchButton = new ButtonBuilder()
                        .setCustomId(`c{sc}a{s}n{${stickyConfig.commandName}}ch{${stickyConfig.channelID}}`)
                        .setLabel('View Others')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔍')
                    
                    rows.push(new ActionRowBuilder().addComponents(viewButton, editButton, searchButton))
                }
            } else {
                // Single button - accumulate for combining into rows
                const stickyButton = new ButtonBuilder()
                    .setCustomId(`c{sc}a{v}n{${stickyConfig.commandName}}ch{${stickyConfig.channelID}}`)
                    .setLabel(stickyConfig.commandName.charAt(0).toUpperCase() + stickyConfig.commandName.slice(1))
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(buttonEmoji)
                
                singleButtonCommands.push({ button: stickyButton, config: stickyConfig })
            }
        }
        
        // Flush remaining single buttons (up to 5 per row)
        while (singleButtonCommands.length > 0 && rows.length < 5) {
            const batch = singleButtonCommands.splice(0, 5)
            const row = new ActionRowBuilder()
            for (const cmd of batch) {
                row.addComponents(cmd.button)
            }
            rows.push(row)
        }
        
        // Discord allows max 5 action rows per message
        if (rows.length > 5) {
            console.warn(`Too many sticky commands for channel ${channel.id}, limiting to 5 rows`)
            rows.length = 5
        }
        
        // Delete old messages and send new one in parallel for faster execution
        const deletePromises = [...oldMessageIds].map(async (oldMessageId) => {
            try {
                const oldMessage = await channel.messages.fetch(oldMessageId).catch(() => null)
                if (oldMessage) {
                    await oldMessage.delete().catch(() => null)
                }
            } catch (error) {
                // Message may already be deleted
            }
        })
        
        // Execute delete and send simultaneously
        const [, newMessage] = await Promise.all([
            Promise.all(deletePromises),
            channel.send({ components: rows }).catch(() => null)
        ])
        
        if (newMessage) {
            // Update database and cache for all sticky commands with the new combined message ID
            // Use Promise.all for parallel database updates
            await Promise.all(stickyCommands.map(async (stickyConfig) => {
                const key = `${stickyConfig.guildID}_${stickyConfig.channelID}_${stickyConfig.commandName}`
                
                await client.stickyCommandSchema.updateOne(
                    { guildID: stickyConfig.guildID, channelID: stickyConfig.channelID, commandName: stickyConfig.commandName },
                    { messageID: newMessage.id }
                )
                
                stickyConfig.messageID = newMessage.id
                client.cache.stickyCommands.set(key, stickyConfig)
            }))
        }
    } catch (error) {
        console.error(`Error repositioning sticky messages:`, error)
    }
}
