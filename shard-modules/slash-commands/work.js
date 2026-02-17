const { Collection, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Colors, ApplicationCommandOptionType } = require("discord.js")
const { AchievementType } = require("../enums")
const UserRegexp = /usr{(.*?)}/
const JobRegexp = /job{(.*?)}/
module.exports = {
    name: 'work',
    nameLocalizations: {
        'ru': `работать`,
        'uk': `працювати`,
        'es-ES': `trabajar`
    },
    description: 'Go to work',
    descriptionLocalizations: {
        'ru': `Пойти работать`,
        'uk': `Піти працювати`,
        'es-ES': `Ir a trabajar`
    },
    options: [
        {
            name: 'name',
            nameLocalizations: {
                'ru': 'название',
                'uk': 'назва',
                'es-ES': 'nombre'
            },
            description: 'Name of work',
            descriptionLocalizations: {
                'ru': 'Название работы',
                'uk': 'Назва роботи',
                'es-ES': 'Nombre del trabajo'
            },
            minLength: 2,
            maxLength: 30,
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
        },
    ],
    dmPermission: false,
    group: `general-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if (args?.name || interaction.isButton()) {
            const name = args?.name ? args.name : client.cache.jobs.find(e => e.id === JobRegexp.exec(interaction.customId)[1])?.name
            const job = client.cache.jobs.find(e => e.guildID === interaction.guildId && e.name.toLowerCase() === name?.toLowerCase())
            if (!job) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This job no longer exists", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            if (!job.enable) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This job is temporarily unavailable", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            const settings = client.cache.settings.get(interaction.guildId)
            let luck_multiplier_for_channel = 0
            let channel = client.cache.channels.find(channel => channel.id === interaction.channel.id && channel.isEnabled)
            if (!channel) channel = client.cache.channels.find(channel => channel.id === interaction.channel.parentId && channel.isEnabled)
            if (channel) {
                luck_multiplier_for_channel = channel.luck_multiplier
            }
            let action1chance = job.action1.success.chance + (job.action1.success.chance * profile.getLuckBoost(luck_multiplier_for_channel))
            let action2chance = job.action2.success.chance + (job.action2.success.chance * profile.getLuckBoost(luck_multiplier_for_channel))
            if (action1chance > 100) action1chance = 100
            if (action2chance > 100) action2chance = 100
            if (interaction.isButton()) {
                if (interaction.user.id !== UserRegexp.exec(interaction.customId)[1]) return interaction.deferUpdate()
                let pass = true
                if (profile.jobsCooldowns && profile.jobsCooldowns.get(job.id)) {
                    if (profile.jobsCooldowns.get(job.id) > new Date()) pass = false
                }
                if (profile.allJobsCooldown) {
                    if (profile.allJobsCooldown > new Date()) pass = false
                }
                if (pass) {
                    const action = interaction.customId.includes("action1") ? "action1" : "action2"
                    if (job[action].permission) {
                        const permission = client.cache.permissions.find(e => e.id === job[action].permission)
                        if (permission) {
                            const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                            if (isPassing.value === false) {
                                return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                            }    
                        }
                    }
                    await interaction.update({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))] })
                    let chance = Math.random() * 100
                    if (chance === 0) chance = 100
                    let exodus
                    if (action === "action1") {
                        if (chance <= action1chance) exodus = "success"
                        else exodus = "fail"
                    } else {
                        if (chance <= action2chance) exodus = "success"
                        else exodus = "fail"
                    }
                    const rewards = []
                    for (const reward of job[action][exodus].rewards) {
                        const amount = client.functions.getRandomNumber(reward.minAmount, reward.maxAmount)
                        if (reward.itemID === "currency") {
                            await profile.addCurrency(amount)
                            rewards.push(`${settings.displayCurrencyEmoji}${settings.currencyName} (${amount.toLocaleString()})`)
                        } else
                        if (reward.itemID === "xp") {
                            await profile.addXp(amount)
                            rewards.push(`${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })} (${amount.toLocaleString()})`)
                        } else
                        if (reward.itemID === "rp") {
                            await profile.addRp(amount)
                            rewards.push(`${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${amount.toLocaleString()})`)
                        } else {
                            const item = client.cache.items.find(e => e.itemID === reward.itemID && !e.temp && e.enabled)
                            if (item) {
                                await profile.addItem(reward.itemID, amount)
                                rewards.push(`${item.displayEmoji}${item.name} (${amount.toLocaleString()})`)    
                            }
                        }
                    }
                    const embed = new EmbedBuilder()
                        .setAuthor({ iconURL: interaction.member.displayAvatarURL(), name: interaction.member.displayName })
                        .setTitle(`${job.name}\n${job[action].name}\n${exodus === "success" ? client.language({ textId: "SUCCESS", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "FAILURE", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setColor(exodus === "success" ? Colors.Green : Colors.Red)
                    let itemsReplaceExists = false
                    const description = []
                    if (job[action][exodus].messages.length) {
                        let message = job[action][exodus].messages[Math.floor(Math.random() * job[action][exodus].messages.length)]
                        if (message.includes("{items}")) itemsReplaceExists = true
                        description.push(
                            message
                                .replace(/{userId}/i, interaction.user.id)
                                .replace(/{guildName}/i, interaction.guild.name)
                                .replace(/{channelId}/i, interaction.channel?.id)
                                .replace(/{items}/i, rewards.join(", "))
                                .replace(/{cooldown}/i, client.functions.transformSecs(client, job[action][exodus].cooldown * 1000, interaction.guildId, interaction.locale))
                                .replace(/{cooldownJobs}/i, client.functions.transformSecs(client, job[action][exodus].cooldownJobs * 1000, interaction.guildId, interaction.locale))
                        )
                    }
                    if (!itemsReplaceExists && rewards.length) {
                        description.push(rewards.join(", "))
                    }
                    if (description.length) embed.setDescription(description.join("\n"))
                    if (job[action][exodus].images.length) embed.setImage(job[action][exodus].images[Math.floor(Math.random() * job[action][exodus].images.length)])
                    if (job[action][exodus].cooldown) {
                        if (!profile.jobsCooldowns) profile.jobsCooldowns = new Map()
                        profile.jobsCooldowns.set(job.id, new Date(Date.now() + job[action][exodus].cooldown * 1000))
                    }
                    if (job[action][exodus].cooldownJobs) {
                        profile.allJobsCooldown = new Date(Date.now() + job[action][exodus].cooldownJobs * 1000)
                    }
                    profile.works += 1
                    const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.type === AchievementType.Work && e.enabled)
                    await Promise.all(achievements.map(async achievement => {
                        try {
                            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.works >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                                if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                                client.tempAchievements[profile.userID].push(achievement.id)
                                await profile.addAchievement(achievement)
                            }
                        } catch (err) {
                            console.error(`Failed to award achievement ${achievement.id}:`, err)
                        }
                    }))
                    await profile.save().catch(err => {
                        console.error(`Failed to save profile ${profile.userID}:`, err)
                    })
                    interaction.followUp({ embeds: [embed] })
                    client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "used job", guildId: interaction.guildId })} ${job.name} (${interaction.message.url})`)
                }
            }
            const embed = new EmbedBuilder()
                .setTitle(job.name)
                .setColor(3093046)
                .setDescription(job.description)
                .setFields([
                    {
                        name: job.action1.name,
                        value: [
                            client.config.emojis.UP + `**${client.language({ textId: "Success", guildId: interaction.guildId, locale: interaction.locale })} (${job.action1.hideChance ? `||??||` : job.action1.success.chance}%)**`,
                            job.action1.success.hideCooldowns ? undefined : `* ${client.language({ textId: "Cooldown for this job after success", guildId: interaction.guildId, locale: interaction.locale })}: \`${client.functions.transformSecs(client, job.action1.success.cooldown * 1000, interaction.guildId, interaction.locale)}\``,
                            job.action1.success.hideCooldowns ? undefined : `* ${client.language({ textId: "Cooldown for all jobs after success", guildId: interaction.guildId, locale: interaction.locale })}: \`${client.functions.transformSecs(client, job.action1.success.cooldownJobs * 1000, interaction.guildId, interaction.locale)}\``,
                            `* ${client.language({ textId: "Items after success", guildId: interaction.guildId, locale: interaction.locale })}: ${job.action1.success.rewards.length ? `${await Promise.all(job.action1.success.rewards.map(async e => {
                                if (job.action1.success.hideRewards) {
                                    return `||?????????||`
                                } else {
                                    if (e.itemID === "currency") {
                                        return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else
                                    if (e.itemID === "xp") {
                                        return `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else
                                    if (e.itemID === "rp") {
                                        return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else {
                                        const item = client.cache.items.find(i => i.itemID === e.itemID && !i.temp && i.enabled)
                                        if (item) return `${item.displayEmoji}${item.name} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                        else return false
                                    } 
                                }
                            }).filter(e => e)).then(rewards => rewards.join(", "))}` : "🚫"}`,
                            client.config.emojis.DOWN + `**${client.language({ textId: "Failure", guildId: interaction.guildId, locale: interaction.locale })} (${job.action1.hideChance ? `||??||` : 100-job.action1.success.chance}%)**`,
                            job.action1.fail.hideCooldowns ? undefined : `* ${client.language({ textId: "Cooldown for this job after failure", guildId: interaction.guildId, locale: interaction.locale })}: \`${client.functions.transformSecs(client, job.action1.fail.cooldown * 1000, interaction.guildId, interaction.locale)}\``,
                            job.action1.fail.hideCooldowns ? undefined : `* ${client.language({ textId: "Cooldown for all jobs after failure", guildId: interaction.guildId, locale: interaction.locale })}: \`${client.functions.transformSecs(client, job.action1.fail.cooldownJobs * 1000, interaction.guildId, interaction.locale)}\``,
                            `* ${client.language({ textId: "Items after failure", guildId: interaction.guildId, locale: interaction.locale })}: ${job.action1.fail.rewards.length ? `${await Promise.all(job.action1.fail.rewards.map(async e => {
                                if (job.action1.fail.hideRewards) {
                                    return `||?????????||`
                                } else {
                                    if (e.itemID === "currency") {
                                        return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else
                                    if (e.itemID === "xp") {
                                        return `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else
                                    if (e.itemID === "rp") {
                                        return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else {
                                        const item = client.cache.items.find(i => i.itemID === e.itemID && !i.temp && i.enabled)
                                        if (item) return `${item.displayEmoji}${item.name} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                        else return false
                                    }
                                }
                            }).filter(e => e)).then(rewards => rewards.join(", "))}` : "🚫"}`,
                        ].filter(e => e).join("\n"),
                        inline: true
                    },
                    {
                        name: job.action2.name,
                        value: [
                            client.config.emojis.UP + `**${client.language({ textId: "Success", guildId: interaction.guildId, locale: interaction.locale })} (${job.action2.hideChance ? `||??||` : job.action2.success.chance}%)**`,
                            job.action2.success.hideCooldowns ? undefined : `* ${client.language({ textId: "Cooldown for this job after success", guildId: interaction.guildId, locale: interaction.locale })}: \`${client.functions.transformSecs(client, job.action2.success.cooldown * 1000, interaction.guildId, interaction.locale)}\``,
                            job.action2.success.hideCooldowns ? undefined : `* ${client.language({ textId: "Cooldown for all jobs after success", guildId: interaction.guildId, locale: interaction.locale })}: \`${client.functions.transformSecs(client, job.action2.success.cooldownJobs * 1000, interaction.guildId, interaction.locale)}\``,
                            `* ${client.language({ textId: "Items after success", guildId: interaction.guildId, locale: interaction.locale })}: ${job.action2.success.rewards.length ? `${await Promise.all(job.action2.success.rewards.map(async e => {
                                if (job.action2.success.hideRewards) {
                                    return `||?????????||`
                                } else {
                                    if (e.itemID === "currency") {
                                        return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else
                                    if (e.itemID === "xp") {
                                        return `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else
                                    if (e.itemID === "rp") {
                                        return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else {
                                        const item = client.cache.items.find(i => i.itemID === e.itemID && !i.temp && i.enabled)
                                        if (item) return `${item.displayEmoji}${item.name} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                        else return false
                                    }
                                }
                            }).filter(e => e)).then(rewards => rewards.join(", "))}` : "🚫"}`,
                            client.config.emojis.DOWN + `**${client.language({ textId: "Failure", guildId: interaction.guildId, locale: interaction.locale })} (${job.action2.hideChance ? `||??||` : 100-job.action2.success.chance}%)**`,
                            job.action2.fail.hideCooldowns ? undefined : `* ${client.language({ textId: "Cooldown for this job after failure", guildId: interaction.guildId, locale: interaction.locale })}: \`${client.functions.transformSecs(client, job.action2.fail.cooldown * 1000, interaction.guildId, interaction.locale)}\``,
                            job.action2.fail.hideCooldowns ? undefined : `* ${client.language({ textId: "Cooldown for all jobs after failure", guildId: interaction.guildId, locale: interaction.locale })}: \`${client.functions.transformSecs(client, job.action2.fail.cooldownJobs * 1000, interaction.guildId, interaction.locale)}\``,
                            `* ${client.language({ textId: "Items after failure", guildId: interaction.guildId, locale: interaction.locale })}: ${job.action2.fail.rewards.length ? `${await Promise.all(job.action2.fail.rewards.map(async e => {
                                if (job.action2.fail.hideRewards) {
                                    return `||?????????||`
                                } else {
                                    if (e.itemID === "currency") {
                                        return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else
                                    if (e.itemID === "xp") {
                                        return `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else
                                    if (e.itemID === "rp") {
                                        return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                    } else {
                                        const item = client.cache.items.find(i => i.itemID === e.itemID && !i.temp && i.enabled)
                                        if (item) return `${item.displayEmoji}${item.name} (${e.minAmount !== e.maxAmount ? `${e.minAmount.toLocaleString()}~${e.maxAmount.toLocaleString()}` : e.minAmount.toLocaleString()})`
                                        else return false
                                    }
                                }
                            }).filter(e => e)).then(rewards => rewards.join(", "))}` : "🚫"}`,
                        ].filter(e => e).join("\n"),
                        inline: true
                    }
                ])
            const action1Button = new ButtonBuilder()
                .setCustomId(`cmd{work}usr{${interaction.user.id}}job{${job.id}}action1`)
                .setLabel(`${job.action1.name} ${job.action1.hideChance ? `` : `${action1chance}%`}`)
                .setStyle(ButtonStyle.Success)
            const action2Button = new ButtonBuilder()
                .setCustomId(`cmd{work}usr{${interaction.user.id}}job{${job.id}}action2`)
                .setLabel(`${job.action2.name} ${job.action2.hideChance ? `` : `${action2chance}%`}`)
                .setStyle(ButtonStyle.Danger)
            if ((profile.jobsCooldowns && profile.jobsCooldowns.get(job.id) > new Date()) || profile.allJobsCooldown > new Date()) {
                const timer = (profile.jobsCooldowns && profile.jobsCooldowns.get(job.id) > profile.allJobsCooldown) || !profile.allJobsCooldown ? transformSecs2(profile.jobsCooldowns.get(job.id) - new Date()) : transformSecs2(profile.allJobsCooldown.getTime() - Date.now())
                action1Button.setEmoji(client.config.emojis.lock).setDisabled(true).setLabel(timer)
                action2Button.setEmoji(client.config.emojis.lock).setDisabled(true).setLabel(timer)
            }
            const row = new ActionRowBuilder().addComponents(action1Button, action2Button)
            if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: [row], flags: ["Ephemeral"] })
            if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [row] })
            else return interaction.update({ embeds: [embed], components: [row] })
        }
        let index = 0
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setTitle(`${client.language({ textId: "All jobs on this server", guildId: interaction.guildId })}`)
            .setDescription(client.cache.jobs.filter(job => job.enable && job.guildID === interaction.guildId).map((job) => {
                const isTimed = (profile.allJobsCooldown && profile.allJobsCooldown > new Date() || (profile.jobsCooldowns && profile.jobsCooldowns.get(job.id) && profile.jobsCooldowns.get(job.id) > new Date()))
				let timer
				if (isTimed) {
					timer = (profile.jobsCooldowns && profile.jobsCooldowns.get(job.id) > profile.allJobsCooldown) || !profile.allJobsCooldown ? transformSecs2(profile.jobsCooldowns.get(job.id) - new Date()) : transformSecs2(profile.allJobsCooldown.getTime() - Date.now())
				}
                return `${index++}. ${isTimed ? `⌚` : ""}${job.name} ${isTimed ? `[${timer}]` : ""}`
            }).join("\n") + `\n### ${client.language({ textId: "To start working, enter the command", guildId: interaction.guildId })} </work:1150455843138060417> [${client.language({ textId: "job name", guildId: interaction.guildId })}]`)
        return interaction.reply({ embeds: [embed], flags: ["Ephemeral"] })

        function transformSecs2(duration) {
            let ms = parseInt((duration % 1000) / 100),
            secs = Math.floor((duration / 1000) % 60),
            mins = Math.floor((duration / (1000 * 60)) % 60),
            hrs = Math.floor((duration / (1000 * 60 * 60)))
            if (hrs) return `${hrs < 10 ? `0${hrs}` : hrs}:${mins < 10 ? `0${mins}` : mins}:${secs < 10 ? `0${secs}` : secs}`
            if (!hrs) return `00:${mins < 10 ? `0${mins}` : mins}:${secs < 10 ? `0${secs}` : secs}`
            if (!mins) return `00:00:${secs < 10 ? `0${secs}` : secs}`
            if (!secs) return `00:00:00.${ms < 10 ? `00${ms}` : ms < 100 ? `0${ms}` : ms}`
        }
    }
}