const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, Collection } = require("discord.js")
const { AchievementType } = require("../enums")
const UserRegexp = /usr{(.*?)}/
module.exports = {
    name: 'daily',
    nameLocalizations: {
        'ru': `ежедневная-награда`,
        'uk': `щоденна-нагорода`,
        'es-ES': `recompensa-diaria`
    },
    description: 'Get a daily reward',
    descriptionLocalizations: {
        'ru': `Получить ежедневную награду`,
        'uk': `Отримати щоденну нагороду`,
        'es-ES': `Obtener recompensa diaria`
    },
    dmPermission: false,
    group: `general-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.isChatInputCommand()) await interaction.deferReply()
        if (args?.fromUCP) {
            let tomorrow = new Date()
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
            tomorrow.setUTCHours(0,0,0,0)
            ms = require('ms')
            const diff = ms(tomorrow - new Date())
            const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            const settings = client.cache.settings.get(interaction.guildId)
            const droppingDaily = new Date(profile.lastDaily)
            droppingDaily.setUTCDate(droppingDaily.getUTCDate() + 3)
            droppingDaily.setUTCHours(0,0,0,0)
            if (droppingDaily <= tomorrow) {
                profile.daysStreak = 1
                profile.maxDaily = 0
                await profile.save()
            }
            const week = settings.weekMaxBonus == 0 ? Math.ceil((profile.maxDaily + 1) / 7) : Math.ceil((profile.maxDaily + 1) / 7) > settings.weekMaxBonus ? settings.weekMaxBonus : Math.ceil((profile.maxDaily + 1) / 7)
            let date = new Date()
            const now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
            date = new Date(now_utc)
            let lastDaily = new Date(Date.UTC(profile.lastDaily.getUTCFullYear(), profile.lastDaily.getUTCMonth(), profile.lastDaily.getUTCDate(), profile.lastDaily.getUTCHours(), profile.lastDaily.getUTCMinutes(), profile.lastDaily.getUTCSeconds()))
            let nextDaily = new Date(Date.UTC(lastDaily.getUTCFullYear(), lastDaily.getUTCMonth(), lastDaily.getUTCDate()+1, 0, 0, 0))
            
            const embed1 = new EmbedBuilder()
                .setColor(interaction.member.displayHexColor)
                .setAuthor({ name: `${client.language({ textId: "Daily Rewards", guildId: interaction.guildId, locale: interaction.locale })} ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                .setDescription(`${client.language({ textId: "Week", guildId: interaction.guildId, locale: interaction.locale })} ${Math.ceil((profile.maxDaily + 1) / 7)}: ${client.language({ textId: "bonus", guildId: interaction.guildId, locale: interaction.locale })} x${week}`)
                .setFooter({ text: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} ${profile.maxDaily} | ${client.language({ textId: "Next reward", guildId: interaction.guildId, locale: interaction.locale })}` })
                .setTimestamp(tomorrow)
                .setThumbnail(`https://emojipedia-us.s3.amazonaws.com/source/skype/289/wrapped-gift_1f381.png`)
            let Day = 1
            for (let day in settings.daily) {
                if (day === "day1" || day === "day2" || day === "day3" || day === "day4" || day === "day5" || day === "day6" || day ==="day7") {
                    const dailyRewards = []
                    const rewards = []
                    const i = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.activities?.daily?.[day]?.amountTo && e.activities?.daily?.[day]?.amountFrom)
                    i.forEach(e => {
                        rewards.push({
                            itemID: e.itemID,
                            valueFrom: e.activities.daily[day].amountFrom * week,
                            valueTo: e.activities.daily[day].amountTo * week
                        })    
                    })
                    if (typeof settings.daily[day] === "object") settings.daily[day].forEach((reward1, index) => {
                        rewards.push({
                            itemID: reward1.itemID,
                            valueFrom: reward1.valueFrom * week,
                            valueTo: reward1.valueTo * week
                        })
                    })
                    for (const r of rewards) {
                        if (r.itemID === "currency") dailyRewards.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** ${r.valueFrom === r.valueTo ? r.valueFrom.toLocaleString() : `${r.valueFrom.toLocaleString()}-${r.valueTo.toLocaleString()}`}`)
                        else if (r.itemID === "xp") dailyRewards.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${r.valueFrom === r.valueTo ? r.valueFrom.toLocaleString() : `${r.valueFrom.toLocaleString()}-${r.valueTo.toLocaleString()}`}`)
                        else if (r.itemID === "rp") dailyRewards.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** ${r.valueFrom === r.valueTo ? r.valueFrom.toLocaleString() : `${r.valueFrom.toLocaleString()}-${r.valueTo.toLocaleString()}`}`)
                        else {
                            let item = client.cache.items.get(r.itemID)
                            if (item) {
                                if (item.found) item = `${item.displayEmoji}**${item.name}**`
                                else item = `||???????????||`
                            } else item = r.itemID
                            dailyRewards.push(`${item} ${r.valueFrom === r.valueTo ? r.valueFrom.toLocaleString() : `${r.valueFrom.toLocaleString()}-${r.valueTo.toLocaleString()}`}`)
                        }    
                    }
                    embed1.addFields([{ name: `${profile.daysStreak === Day ? client.config.emojis.arrowRight : profile.daysStreak > Day ? client.config.emojis.DONE : ""}${client.language({ textId: "DAY", guildId: interaction.guildId, locale: interaction.locale })} ${Day}`, value: dailyRewards.length ? dailyRewards.join("\n") : `${client.language({ textId: "No rewards", guildId: interaction.guildId, locale: interaction.locale })}` }])
                    Day++    
                } 
            }
            const daily_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel(`🕒${client.language({ textId: "Daily reward", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setCustomId(`usr{${interaction.user.id}}cmd{daily}`)
            if (nextDaily > new Date()) {
                daily_btn.setStyle(ButtonStyle.Secondary)
                daily_btn.setLabel(`🕒${client.language({ textId: "Come back in", guildId: interaction.guildId, locale: interaction.locale })} ${diff}`)
                daily_btn.setDisabled(true)
            }
            if (!settings.daily.day1.length && !settings.daily.day2.length && !settings.daily.day3.length && !settings.daily.day4.length && !settings.daily.day5.length && !settings.daily.day6.length && !settings.daily.day7.length && !client.cache.items.some(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.activities?.daily)) {
                daily_btn.setStyle(ButtonStyle.Secondary)
                daily_btn.setLabel(`🕒${client.language({ textId: "Daily reward", guildId: interaction.guildId, locale: interaction.locale })}`)
                daily_btn.setDisabled(true)
            }
            return interaction.editReply({ embeds: [embed1], components: [new ActionRowBuilder().addComponents([daily_btn])]})
        }
        if (interaction.isButton()) {
            if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate()
        }
        let tomorrow = new Date()
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
        tomorrow.setUTCHours(0,0,0,0)
        ms = require('ms')
        const diff = ms(tomorrow - new Date())
        const embed = new EmbedBuilder()
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const settings = client.cache.settings.get(interaction.guildId)
        const droppingDaily = new Date(profile.lastDaily)
        droppingDaily.setUTCDate(droppingDaily.getUTCDate() + 3)
        droppingDaily.setUTCHours(0,0,0,0)
        if (droppingDaily <= tomorrow) {
            profile.daysStreak = 1
            profile.maxDaily = 0
            await profile.save()
        }
        const week = settings.weekMaxBonus == 0 ? Math.ceil((profile.maxDaily + 1) / 7) : Math.ceil((profile.maxDaily + 1) / 7) > settings.weekMaxBonus ? settings.weekMaxBonus : Math.ceil((profile.maxDaily + 1) / 7)
        let date = new Date()
        const now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
        date = new Date(now_utc)
        let lastDaily = new Date(Date.UTC(profile.lastDaily.getUTCFullYear(), profile.lastDaily.getUTCMonth(), profile.lastDaily.getUTCDate(), profile.lastDaily.getUTCHours(), profile.lastDaily.getUTCMinutes(), profile.lastDaily.getUTCSeconds()))
        let nextDaily = new Date(Date.UTC(lastDaily.getUTCFullYear(), lastDaily.getUTCMonth(), lastDaily.getUTCDate()+1, 0, 0, 0))
        if (interaction.isButton()) {
            if (nextDaily > new Date()) {
                if (interaction.deferred) {
                    return interaction.editReply({ content: `‼ ${client.language({ textId: "You already received daily reward", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Come back at", guildId: interaction.guildId, locale: interaction.locale })} <t:${tomorrow.getTime() / 1000}:F>` })
                }
                return interaction.reply({ content: `‼ ${client.language({ textId: "You already received daily reward", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Come back at", guildId: interaction.guildId, locale: interaction.locale })} <t:${tomorrow.getTime() / 1000}:F>`, flags: ["Ephemeral"] })
            }
            if (!settings.daily.day1.length && !settings.daily.day2.length && !settings.daily.day3.length && !settings.daily.day4.length && !settings.daily.day5.length && !settings.daily.day6.length && !settings.daily.day7.length && !client.cache.items.filter(e => e.guildID === interaction.guildId && e.activities?.daily).size) {
                if (interaction.deferred) {
                    return interaction.editReply({ content: `${client.language({ textId: "No daily rewards on this server yet", guildId: interaction.guildId, locale: interaction.locale })}!` })
                }
                return interaction.reply({ content: `${client.language({ textId: "No daily rewards on this server yet", guildId: interaction.guildId, locale: interaction.locale })}!`, flags: ["Ephemeral"] })
            }
            if (!interaction.deferred) {
                const isEphemeralMessage = interaction.message.flags?.has(64)
                if (isEphemeralMessage) {
                    await interaction.deferReply({ flags: ["Ephemeral"] })
                } else {
                    await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
                }
            }
            const rewardss = []
            let reward = []
            switch (profile.daysStreak) {
                case 1: { reward = [...settings.daily.day1]; const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.enabled && item.activities?.daily?.day1); items.forEach(e => { reward.push({ itemID: e.itemID, valueFrom: e.activities.daily.day1.amountFrom * week, valueTo: e.activities.daily.day1.amountTo * week }) }); profile.daysStreak++; break }
                case 2: { reward = [...settings.daily.day2]; const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.enabled && item.activities?.daily?.day2); items.forEach(e => { reward.push({ itemID: e.itemID, valueFrom: e.activities.daily.day2.amountFrom * week, valueTo: e.activities.daily.day2.amountTo * week }) }); profile.daysStreak++; break }
                case 3: { reward = [...settings.daily.day3]; const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.enabled && item.activities?.daily?.day3); items.forEach(e => { reward.push({ itemID: e.itemID, valueFrom: e.activities.daily.day3.amountFrom * week, valueTo: e.activities.daily.day3.amountTo * week }) }); profile.daysStreak++; break }
                case 4: { reward = [...settings.daily.day4]; const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.enabled && item.activities?.daily?.day4); items.forEach(e => { reward.push({ itemID: e.itemID, valueFrom: e.activities.daily.day4.amountFrom * week, valueTo: e.activities.daily.day4.amountTo * week }) }); profile.daysStreak++; break }
                case 5: { reward = [...settings.daily.day5]; const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.enabled && item.activities?.daily?.day5); items.forEach(e => { reward.push({ itemID: e.itemID, valueFrom: e.activities.daily.day5.amountFrom * week, valueTo: e.activities.daily.day5.amountTo * week }) }); profile.daysStreak++; break }
                case 6: { reward = [...settings.daily.day6]; const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.enabled && item.activities?.daily?.day6); items.forEach(e => { reward.push({ itemID: e.itemID, valueFrom: e.activities.daily.day6.amountFrom * week, valueTo: e.activities.daily.day6.amountTo * week }) }); profile.daysStreak++; break }
                case 7: { reward = [...settings.daily.day7]; const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.enabled && item.activities?.daily?.day7); items.forEach(e => { reward.push({ itemID: e.itemID, valueFrom: e.activities.daily.day7.amountFrom * week, valueTo: e.activities.daily.day7.amountTo * week }) }); profile.daysStreak = 1; break }
            }
            for (const rew of reward) {
                if (!rew) rewardss.push(`${client.language({ textId: "For day", guildId: interaction.guildId, locale: interaction.locale })} ${profile.daysStreak == 7 ? 1 : profile.daysStreak + 1} ${client.language({ textId: "no reward", guildId: interaction.guildId, locale: interaction.locale })}.`)
                else {
                    const amount = client.functions.getRandomNumber(rew.valueFrom, rew.valueTo)
                    if (rew.itemID == "currency") { await profile.addCurrency(amount * week); rewardss.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** ${(amount * week).toLocaleString()}`) }
                    if (rew.itemID == "xp") { await profile.addXp(amount * week); rewardss.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${(amount * week).toLocaleString()}`) }
                    if (rew.itemID == "rp") { await profile.addRp(amount * week); rewardss.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** ${(amount * week).toLocaleString()}`) }
                    if (rew.itemID !== "currency" && rew.itemID !== "xp" && rew.itemID !== "rp") { const rewardItem = client.cache.items.get(rew.itemID); await profile.addItem(rew.itemID, amount); rewardss.push(`${rewardItem.displayEmoji}**${rewardItem.name}** ${amount.toLocaleString()}`) }
                }    
            }
            profile.lastDaily = new Date(); lastDaily = date; nextDaily = new Date(Date.UTC(lastDaily.getUTCFullYear(), lastDaily.getUTCMonth(), lastDaily.getUTCDate()+1, 0, 0, 0)); profile.maxDaily++
            client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "received daily reward for day", guildId: interaction.guildId })} ${profile.maxDaily}`)
            await profile.addQuestProgression("daily", 1)
            const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Daily)
            await Promise.all(achievements.map(async achievement => { if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.maxDaily >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) { if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []; client.tempAchievements[profile.userID].push(achievement.id); await profile.addAchievement(achievement) } }))
            await profile.save()
            embed.setColor(interaction.member.displayHexColor).setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
            embed.setDescription(`${client.language({ textId: "Week", guildId: interaction.guildId, locale: interaction.locale })} ${Math.ceil((profile.maxDaily + 1) / 7)}: ${client.language({ textId: "bonus", guildId: interaction.guildId, locale: interaction.locale })} x${week}\n${client.language({ textId: "You received", guildId: interaction.guildId, locale: interaction.locale })}:\n${rewardss.join("\n")}`)
            embed.setFooter({ text: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} ${profile.maxDaily} | ${client.language({ textId: "Next reward", guildId: interaction.guildId, locale: interaction.locale })}` }).setTimestamp(tomorrow)
            if (interaction.deferred) { return interaction.editReply({ embeds: [embed] }) }
            interaction.followUp({ embeds: [embed], flags: ["Ephemeral"] })
        }
        const embed1 = new EmbedBuilder().setColor(interaction.member.displayHexColor)
            .setAuthor({ name: `${client.language({ textId: "Daily Rewards", guildId: interaction.guildId, locale: interaction.locale })} ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
            .setDescription(`${client.language({ textId: "Week", guildId: interaction.guildId, locale: interaction.locale })} ${Math.ceil((profile.maxDaily + 1) / 7)}: ${client.language({ textId: "bonus", guildId: interaction.guildId, locale: interaction.locale })} x${week}`)
            .setFooter({ text: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })} ${profile.maxDaily} | ${client.language({ textId: "Next reward", guildId: interaction.guildId, locale: interaction.locale })}` })
            .setTimestamp(tomorrow).setThumbnail(`https://emojipedia-us.s3.amazonaws.com/source/skype/289/wrapped-gift_1f381.png`)
        let Day = 1
        for (let day in settings.daily) {
            if (day === "day1" || day === "day2" || day === "day3" || day === "day4" || day === "day5" || day === "day6" || day ==="day7") {
                const dailyRewards = [], rewards = []
                const i = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.activities?.daily?.[day]?.amountTo && e.activities?.daily?.[day]?.amountFrom)
                i.forEach(e => { rewards.push({ itemID: e.itemID, valueFrom: e.activities.daily[day].amountFrom * week, valueTo: e.activities.daily[day].amountTo * week }) })
                if (typeof settings.daily[day] === "object") settings.daily[day].forEach((reward1, index) => { rewards.push({ itemID: reward1.itemID, valueFrom: reward1.valueFrom * week, valueTo: reward1.valueTo * week }) })
                for (const r of rewards) {
                    if (r.itemID === "currency") dailyRewards.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** ${r.valueFrom === r.valueTo ? r.valueFrom.toLocaleString() : `${r.valueFrom.toLocaleString()}-${r.valueTo.toLocaleString()}`}`)
                    else if (r.itemID === "xp") dailyRewards.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** ${r.valueFrom === r.valueTo ? r.valueFrom.toLocaleString() : `${r.valueFrom.toLocaleString()}-${r.valueTo.toLocaleString()}`}`)
                    else if (r.itemID === "rp") dailyRewards.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** ${r.valueFrom === r.valueTo ? r.valueFrom.toLocaleString() : `${r.valueFrom.toLocaleString()}-${r.valueTo.toLocaleString()}`}`)
                    else { let item = client.cache.items.get(r.itemID); if (item) { if (item.found) item = `${item.displayEmoji}**${item.name}**`; else item = `||???????????||` } else item = r.itemID; dailyRewards.push(`${item} ${r.valueFrom === r.valueTo ? r.valueFrom.toLocaleString() : `${r.valueFrom.toLocaleString()}-${r.valueTo.toLocaleString()}`}`) }
                }
                embed1.addFields([{ name: `${profile.daysStreak === Day ? client.config.emojis.arrowRight : profile.daysStreak > Day ? client.config.emojis.DONE : ""}${client.language({ textId: "DAY", guildId: interaction.guildId, locale: interaction.locale })} ${Day}`, value: dailyRewards.length ? dailyRewards.join("\n") : `${client.language({ textId: "No rewards", guildId: interaction.guildId, locale: interaction.locale })}` }])
                Day++
            } 
        }
        const daily_btn = new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel(`🕒${client.language({ textId: "Daily reward", guildId: interaction.guildId, locale: interaction.locale })}`).setCustomId(`usr{${interaction.user.id}}cmd{daily}`)
        if (nextDaily > new Date()) { daily_btn.setStyle(ButtonStyle.Secondary).setLabel(`🕒${client.language({ textId: "Come back in", guildId: interaction.guildId, locale: interaction.locale })} ${diff}`).setDisabled(true) }
        if (!settings.daily.day1.length && !settings.daily.day2.length && !settings.daily.day3.length && !settings.daily.day4.length && !settings.daily.day5.length && !settings.daily.day6.length && !settings.daily.day7.length && !client.cache.items.some(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.activities?.daily)) { daily_btn.setStyle(ButtonStyle.Secondary).setLabel(`🕒${client.language({ textId: "Daily reward", guildId: interaction.guildId, locale: interaction.locale })}`).setDisabled(true) }
        return interaction.editReply({ embeds: [embed1], components: [new ActionRowBuilder().addComponents([daily_btn])]})
    }
}
