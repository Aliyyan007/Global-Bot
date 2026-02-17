module.exports = async function (client) {
    const { Events, EmbedBuilder, SnowflakeUtil } = require("discord.js")
    const Decimal = require('decimal.js')
    const ups = new Set()
	client.on(Events.MessageCreate, async message => {
        if (!message.inGuild()) return
        if (client.blacklist(message.guild.id, "full_ban", "guilds")) return
        //DSMonitoring (checks Russian response from DSMonitoring bot)
        if (message.author.id === '575776004233232386' && (message.embeds?.[0]?.description?.indexOf('Вы успешно лайкнули сервер') > -1 || message.embeds?.[0]?.description?.indexOf('You successfully liked the server') > -1)) {
            const settings = client.cache.settings.get(message.guildId)
            if (message.interaction) return bumpReward(message.interaction.user.id, message, 14400000, `/like`, settings.xpForBump, settings.curForBump, settings.rpForBump, settings)
        }
        //DISBOARD (checks both Russian and English responses)
        if (message.author.id === '302050872383242240' && (message.embeds?.[0]?.description?.indexOf('Успешно поднято') > -1 || message.embeds?.[0]?.description?.indexOf('Bump done') > -1)) {
            const settings = client.cache.settings.get(message.guildId)
            if (message.interaction) return bumpReward(message.interaction.user.id, message, 7200000, `/bump`, settings.xpForBump, settings.curForBump, settings.rpForBump, settings)
        }
        //Server Monitoring
        if (message.author.id === '315926021457051650' &&  message.embeds?.[0]?.description?.indexOf('Server bumped') > -1) {
            const settings = client.cache.settings.get(message.guildId)
            const userID = message.embeds[0].description.slice(message.embeds[0].description.indexOf('<')+2, message.embeds[0].description.indexOf('>'))
            return bumpReward(userID, message, 14400000, `/bump`, settings.xpForBump, settings.curForBump, settings.rpForBump, settings)
        }
        //Auto Partnership (checks Russian response from Auto Partnership bot)
        if (message.author.id === '789751844821401630' && (message.embeds?.[0]?.title?.indexOf('Объявление рассылается') > -1 || message.embeds?.[0]?.title?.indexOf('Announcement is being sent') > -1)) {
            const settings = client.cache.settings.get(message.guildId)
            return bumpReward(message.interaction.user.id, message, 14400000, `/bump`, settings.xpForBump, settings.curForBump, settings.rpForBump, settings)
        }
	})
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        if (newMessage.partial) return
        //SD.C Monitoring (checks Russian response from SD.C bot)
        if (newMessage.author.id === '464272403766444044' && (newMessage.embeds[0]?.description?.indexOf('**Успешный Up!**') > -1 || newMessage.embeds[0]?.description?.indexOf('**Successful Up!**') > -1)) {
            const settings = client.cache.settings.get(newMessage.guildId)
            if (newMessage.interaction && !ups.has(`${newMessage.guild.id}_464272403766444044`)) {
                ups.add(`${newMessage.guild.id}_464272403766444044`)
                bumpReward(newMessage.interaction.user.id, newMessage, 14400000, `/up`, settings.xpForBump, settings.curForBump, settings.rpForBump, settings)
                setTimeout(() => {
                    ups.delete(`${newMessage.guild.id}_464272403766444044`)
                }, 5000)
            } 
        }
        //BotiCord (checks Russian response from BotiCord bot)
        if (newMessage.author.id === '808071668584022040' && (newMessage.embeds[0]?.title?.indexOf('Успешный ап!') > -1 || newMessage.embeds[0]?.title?.indexOf('Successful up!') > -1)) {
            const settings = client.cache.settings.get(newMessage.guildId)
            if (newMessage.interaction && !ups.has(`${newMessage.guild.id}_808071668584022040_${newMessage.interaction.user.id}`)) {
                ups.add(`${newMessage.guild.id}_808071668584022040_${newMessage.interaction.user.id}`)
                bumpReward(newMessage.interaction.user.id, newMessage, 6 * 60 * 60 * 1000, `/up`, settings.xpForBump, settings.curForBump, settings.rpForBump, settings)
                setTimeout(() => {
                    ups.delete(`${newMessage.guild.id}_808071668584022040_${newMessage.interaction.user.id}`)
                }, 5000)
            }   
        }
    })
    async function bumpReward(userID, message, timeout, cmd, rewardXP, rewardCUR, rewardRP, settings) {
        if (!client.blacklist(userID, "full_ban", "users")) {
            const member = await message.guild.members.fetch(userID).catch(e => null)
            const profile = await client.functions.fetchProfile(client, userID, message.guild.id)
            await profile.addBump(client)
            let rewards = ""
            if (rewardCUR && !profile.blockActivities?.bump?.CUR) {
                let cur_multiplier_for_channel = 0
                let channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === message.channel.id && channelMultipliers.isEnabled)
                if (!channelMultipliers) channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === message.channel.parentId && channelMultipliers.isEnabled)
                if (channelMultipliers) {
                    cur_multiplier_for_channel = channelMultipliers.cur_multiplier
                }
                rewardCUR = rewardCUR + (rewardCUR * profile.getCurBoost(cur_multiplier_for_channel))
                await profile.addCurrency(rewardCUR)
                rewards += `\n${settings.displayCurrencyEmoji}**${settings.currencyName}** (${rewardCUR.toFixed()})`
            }
            if (rewardXP && !profile.blockActivities?.bump?.XP) {
                let xp_multiplier_for_channel = 0
                let channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === message.channel.id && channelMultipliers.isEnabled)
                if (!channelMultipliers) channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === message.channel.parentId && channelMultipliers.isEnabled)
                if (channelMultipliers) {
                    xp_multiplier_for_channel = channelMultipliers.xp_multiplier
                }
                rewardXP = rewardXP + (rewardXP * profile.getXpBoost(xp_multiplier_for_channel))
                await profile.addXp(rewardXP)
                rewards += `\n${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: message.guild.id })}** (${rewardXP.toFixed()})`
            }
            if (rewardRP && !profile.blockActivities?.bump?.RP) {
                let rp_multiplier_for_channel = 0
                let channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === message.channel.id && channelMultipliers.isEnabled)
                if (!channelMultipliers) channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === message.channel.parentId && channelMultipliers.isEnabled)
                if (channelMultipliers) {
                    rp_multiplier_for_channel = channelMultipliers.rp_multiplier
                }
                rewardRP = rewardRP + (rewardRP * profile.getRpBoost(rp_multiplier_for_channel))
                await profile.addRp(rewardRP)
                rewards += `\n${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: message.guild.id })}** (${rewardRP})`
            }
            if (!profile.blockActivities?.bump?.items) {
                let luck_multiplier_for_channel = 0
                let channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === message.channel.id && channelMultipliers.isEnabled)
                if (!channelMultipliers) channelMultipliers = client.cache.channels.find(channelMultipliers => channelMultipliers.id === message.channel.parentId && channelMultipliers.isEnabled)
                if (channelMultipliers) {
                    luck_multiplier_for_channel = channelMultipliers.luck_multiplier
                }
                let itemsForBump = client.cache.items.filter(i => i.guildID === message.guildId && !i.temp && i.enabled && i.activities?.bump?.chance).map(e => { 
                    return { itemID: e.itemID, displayEmoji: e.displayEmoji, name: e.name, activities: { bump: { chance: e.activities.bump.chance, amountFrom: e.activities.bump.amountFrom, amountTo: e.activities.bump.amountTo } }, activities_bump_permission: e.activities_bump_permission }
                })
                const bonus = new Decimal(1).plus(profile.getLuckBoost(luck_multiplier_for_channel))
                if (bonus > 1) {
                    itemsForBump.forEach(i => {
                        i.activities.bump.chance = i.activities.bump.chance * bonus
                        if (i.activities.bump.chance > 100) i.activities.bump.chance = 100
                    })
                }
                if (bonus < 1) {
                    itemsForBump.forEach(i => {
                        i.activities.bump.chance = i.activities.bump.chance * bonus
                        if (i.activities.bump.chance < 0) i.activities.bump.chance = 0
                    })
                }
                let chance = Math.random() * 100
                if (chance === 0) chance = 100 
                itemsForBump = itemsForBump.filter(i => i.activities.bump.chance >= chance)
                await Promise.all(itemsForBump.map(async item => {
                    if (item.activities_bump_permission && client.cache.permissions.some(e => e.id === item.activities_bump_permission)) {
                        const permission = client.cache.permissions.get(item.activities_bump_permission)
                        const isPassing = permission.for(profile, member, message.channel)
                        if (isPassing.value === true) {
                            const amount = client.functions.getRandomNumber(item.activities.bump.amountFrom, item.activities.bump.amountTo)
                            await profile.addItem(item.itemID, amount)
                            rewards += `\n${item.displayEmoji}**${item.name}** (${amount})` 
                        }
                    } else {
                        const amount = client.functions.getRandomNumber(item.activities.bump.amountFrom, item.activities.bump.amountTo)
                        await profile.addItem(item.itemID, amount)
                        rewards += `\n${item.displayEmoji}**${item.name}** (${amount})` 
                    }
                }))
            }
            const description = [
                `<@${member.user.id}>, ${client.language({ textId: "thanks for the bump", guildId: message.guild.id })}!`
            ]
            if (rewards.length > 0) description.push(`${client.language({ textId: "Your reward", guildId: message.guild.id })}:${rewards}`)
            description.push(`${client.language({ textId: "Command will be available again at", guildId: message.guild.id })} <t:${Math.round((Date.now() + timeout) / 1000)}:F>`)
            const embedAward = new EmbedBuilder()
            embedAward.setDescription(description.join("\n"))
            embedAward.setColor(member.displayHexColor)
            embedAward.setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
            message.reply({ embeds: [embedAward] })    
        }
        if (settings.channels?.botChannelId) {
            setTimeout(() => {
                const embed = new EmbedBuilder()
                	.setAuthor({ name: `${client.language({ textId: "Time to enter command", guildId: message.guild.id })} ${cmd}`, iconURL: message.author.displayAvatarURL() })
                	.setColor(3093046)
                const nonce = SnowflakeUtil.generate().toString()
                message.channel.send({ 
                    content: settings.roles?.bumpNotification ? `<@&${settings.roles.bumpNotification}>` : " ", 
                    embeds: [embed],
					enforceNonce: true, nonce: nonce,
                }).catch(e => null)
            }, timeout)  
        }
    }
}