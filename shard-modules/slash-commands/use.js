const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, Webhook, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } = require("discord.js")
const { AchievementType } = require("../enums")
const { createCanvas, loadImage } = require('@napi-rs/canvas')
module.exports = {
    name: 'use',
    nameLocalizations: {
        'ru': `использовать`,
        'uk': `використати`,
        'es-ES': `usar`
    },
    description: 'Use an item',
    descriptionLocalizations: {
        'ru': `Использовать предмет`,
        'uk': `Використати предмет`,
        'es-ES': `Usar un objeto`
    },
    options: [
        {
            name: 'item',
            nameLocalizations: {
                'ru': `предмет`,
                'uk': `предмет`,
                'es-ES': `objeto`
            },
            description: 'An item name to use',
            descriptionLocalizations: {
                'ru': `Название предмета для использования`,
                'uk': `Назва предмета для використання`,
                'es-ES': `Nombre del objeto para usar`
            },
            minLength: 2,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
        {
            name: 'amount',
            nameLocalizations: {
                'ru': `количество`,
                'uk': `кількість`,
                'es-ES': `cantidad`
            },
            description: 'An amount to use',
            descriptionLocalizations: {
                'ru': `Количество для использования`,
                'uk': `Кількість для використання`,
                'es-ES': `Cantidad para usar`
            },
            type: ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 1,
            max_value: 1000
        }
    ],
    dmPermission: false,
    group: `inventory-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Discord} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        const embed = new EmbedBuilder()
        let amount = !args?.amount || args?.amount < 1 ? 1 : args.amount
        if (amount > 1000) amount = 1000
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        const settings = client.cache.settings.get(interaction.guildId)
        if (args.item.length < 2) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.name.toLowerCase().includes(args.item.toLowerCase()) && profile.inventory.some(x => x.itemID == e.itemID))
        if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() === args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            return interaction.reply({ content: `${client.config.emojis.block} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}`, flags: ["Ephemeral"] })
        }
        let userItem
        let serverItem
        if (filteredItems.some(e => e.name.toLowerCase() === args.item.toLowerCase())) {
            serverItem = filteredItems.find(e => e.name.toLowerCase() === args.item.toLowerCase())
            if (!serverItem) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
            userItem = profile.inventory.find(e => { return e.itemID == serverItem.itemID && e.amount > 0 })
        } else {
            serverItem = filteredItems.first()
            if (!serverItem) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
            userItem = profile.inventory.find(e => { return e.itemID == serverItem.itemID && e.amount > 0 })
        }
        if (!userItem) {
            return interaction.reply({ content: `‼ ${client.language({ textId: "You don't have this item in inventory", guildId: interaction.guildId, locale: interaction.locale })}: ${serverItem.displayEmoji}**${serverItem.name}**`, flags: ["Ephemeral"] })
        }
        amount = amount >= userItem.amount ? userItem.amount : amount < 1 ? 1 : amount
        if (userItem.amount < 1) {
            embed.setColor(interaction.member.displayHexColor)
            embed.setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
            embed.setDescription(`‼ ${client.language({ textId: "You don't have this item in inventory", guildId: interaction.guildId, locale: interaction.locale })}: ${serverItem.displayEmoji}${serverItem.name}.`)
            return interaction.reply({ embeds: [embed], flags: ["Ephemeral"] })
        }
        if (serverItem.canUse) {
            if (serverItem.usePermission && client.cache.permissions.some(e => e.id === serverItem.usePermission)) {
                const permission = client.cache.permissions.find(e => e.id === serverItem.usePermission)
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
            if (profile.itemsCooldowns && profile.itemsCooldowns.get(serverItem.itemID)?.use > new Date()) {
                return interaction.reply({ content: `⏳${client.language({ textId: "Wait for cooldown on this item", guildId: interaction.guildId, locale: interaction.locale })}: ${transformSecs(client, profile.itemsCooldowns.get(serverItem.itemID).use - new Date(), interaction.guildId, interaction.locale)}`, flags: ["Ephemeral"] })
            }
            if (amount < serverItem.min_use || (serverItem.max_use ? amount > serverItem.max_use : false)) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Use amount range for this item", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.min_use}${serverItem.max_use ? ` ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.max_use}` : ""}`, flags: ["Ephemeral"] })
            }
            const fatalErrors = []
            if (serverItem.onUse.roleDel) {
                if (interaction.member.roles.cache.has(serverItem.onUse.roleDel)) {
                    const guild_role = await interaction.guild.roles.fetch(serverItem.onUse.roleDel).catch(e => null)
                    if (guild_role) {
                        if (!interaction.guild.members.me.permissions.has("ManageRoles") || interaction.guild.members.me.roles.highest.position <= guild_role.position) fatalErrors.push(`${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ${guild_role.name} ${client.language({ textId: "will not be removed: I don't have permission to remove it", guildId: interaction.guildId, locale: interaction.locale })}.`)
                    } else fatalErrors.push(`${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ID:${serverItem.onUse.roleDel} ${client.language({ textId: "will not be removed: role not found on server", guildId: interaction.guildId, locale: interaction.locale })}.`)
                } else fatalErrors.push(`${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${serverItem.onUse.roleDel}> ${client.language({ textId: "will not be removed: you don't have this role", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.roleAdd && serverItem.onUse.role_add_direct) {
                const guild_role = await interaction.guild.roles.fetch(serverItem.onUse.roleDel).catch(e => null)
                if (guild_role) {
                    if (interaction.member.roles.cache.has(serverItem.onUse.roleAdd) && !serverItem.onUse.roleTimely) {
                        fatalErrors.push(`${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ${guild_role.name} ${client.language({ textId: "will not be added: you already have this role", guildId: interaction.guildId, locale: interaction.locale })}.`)
                    } else {
                        if (!interaction.guild.members.me.permissions.has("ManageRoles") || interaction.guild.members.me.roles.highest.position <= guild_role.position) fatalErrors.push(`${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ${guild_role.name} ${client.language({ textId: "will not be added: I don't have permission to add it", guildId: interaction.guildId, locale: interaction.locale })}.`)
                    }
                } else fatalErrors.push(`${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} ID:${serverItem.onUse.roleDel} ${client.language({ textId: "will not be added: role not found on server", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.trophyDel) {
                if (!profile.trophies?.some(e => e.toLowerCase() == serverItem.onUse.trophyDel.toLowerCase())) fatalErrors.push(`${client.language({ textId: "Trophy", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.trophyDel}** ${client.language({ textId: "will not be removed: you don't have this trophy", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.delQuest) {
                const quest = client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === serverItem.onUse.delQuest && quest.isEnabled)
                if (!quest) {
                    fatalErrors.push(`${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.delQuest}** ${client.language({ textId: "will not be removed from profile: unknown quest", guildId: interaction.guildId, locale: interaction.locale })}.`)
                } else {
                    const index = profile.quests?.findIndex(e => e.questID == quest.questID) || -1
                    if (index < 0) fatalErrors.push(`${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "will not be removed from profile: quest not taken", guildId: interaction.guildId, locale: interaction.locale })}.`)
                }
            }
            if (serverItem.onUse.wipeQuest) {
                const quest = client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === serverItem.onUse.wipeQuest && quest.isEnabled)
                if (!quest) {
                    fatalErrors.push(`${client.language({ textId: "Quest progress", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.wipeQuest}** ${client.language({ textId: "will not be cleared: unknown quest", guildId: interaction.guildId, locale: interaction.locale })}.`)
                } else {
                    const index = profile.quests?.findIndex(e => e.questID == quest.questID) || -1
                    if (index < 0) fatalErrors.push(`${client.language({ textId: "Quest progress", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "will not be cleared: quest not taken", guildId: interaction.guildId, locale: interaction.locale })}.`)
                }
            }
            if (serverItem.onUse.deleteItemFromServer) {
                const item = client.cache.items.find(e => e.itemID === serverItem.onUse.deleteItemFromServer && e.enabled && !e.temp)
                if (!item) fatalErrors.push(`${serverItem.displayEmoji}**${serverItem.name}** ${client.language({ textId: "should delete unknown item from server", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.deleteItemFromServer}**, ${client.language({ textId: "but it was not found, contact administrator", guildId: interaction.guildId, locale: interaction.locale })}.`)
                if (!item.found) fatalErrors.push(`${serverItem.displayEmoji}**${serverItem.name}** ${client.language({ textId: "should delete", guildId: interaction.guildId, locale: interaction.locale })} ||?????????||, ${client.language({ textId: "but this item has not been found by anyone yet", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.takeXP) {
                if (profile.totalxp < serverItem.onUse.takeXP * amount) {
                    fatalErrors.push(`${client.language({ textId: "You don't have enough XP to use", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.displayEmoji}**${serverItem.name}**. ${client.language({ textId: "This item takes", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.XP}${serverItem.onUse.takeXP * amount}. ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.XP}${profile.totalxp.toFixed()}`)
                }
            }
            if (serverItem.onUse.takeCUR) {
                if (profile.currency < serverItem.onUse.takeCUR * amount) {
                    fatalErrors.push(`${client.language({ textId: "You don't have enough", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}**${settings.currencyName}** ${client.language({ textId: "to use", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.displayEmoji}**${serverItem.name}**. ${client.language({ textId: "This item takes", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}${serverItem.onUse.takeCUR * amount}. ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.displayCurrencyEmoji}${profile.currency.toFixed()}`)
                }
            }
            if (serverItem.onUse.takeRP) {
                if (profile.rp - serverItem.onUse.takeRP < -1000) {
                    fatalErrors.push(`${client.language({ textId: "You don't have enough reputation to use", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.displayEmoji}**${serverItem.name}**. ${client.language({ textId: "This item takes", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${serverItem.onUse.takeRP * amount}). ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${profile.rp.toFixed(2)})`)
                }
            }
            if (serverItem.onUse.takeLevel) {
                if (profile.level <= serverItem.onUse.takeLevel * amount) {
                    fatalErrors.push(`${client.language({ textId: "You don't have enough level to use", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.displayEmoji}**${serverItem.name}**. ${client.language({ textId: "This item takes", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.medal}**${serverItem.onUse.takeLevel * amount}**. ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${client.config.emojis.medal}**${profile.level}**`)
                }
            }
            if (serverItem.onUse.takeItem?.itemID) {
                const item = client.cache.items.find(e => e.itemID === serverItem.onUse.takeItem.itemID && !e.temp && e.enabled && e.found)
                if (!item) fatalErrors.push(`${serverItem.displayEmoji}**${serverItem.name}** ${client.language({ textId: "requires unknown item", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.takeItem.itemID}**, ${client.language({ textId: "contact administrator", guildId: interaction.guildId, locale: interaction.locale })}.`)
                else {
                    const userItem = profile.inventory.find(e => { return e.itemID === serverItem.onUse.takeItem.itemID })
                    if (!userItem || !userItem.amount || userItem.amount < serverItem.onUse.takeItem.amount * amount) fatalErrors.push(`${serverItem.displayEmoji}**${serverItem.name}** ${client.language({ textId: "requires", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** (${serverItem.onUse.takeItem.amount}) ${client.language({ textId: "to use", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${item.displayEmoji}**${item.name}** (${userItem?.amount || 0}).`)
                }
            }
            if (fatalErrors.length) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(interaction.member.displayHexColor)
                            .setTitle(`${client.config.emojis.NO}${client.language({ textId: "Cannot use item", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
                            .setDescription(fatalErrors.map((e, index) => `${index + 1}. ${e}`).join("\n"))
                    ],
                    flags: ["Ephemeral"]
                })
            }
            const errors = []
            if (serverItem.onUse.trophyAdd) {
                if (profile.trophies?.some(e => e.toLowerCase() == serverItem.onUse.trophyAdd.toLowerCase())) errors.push(`${client.config.emojis.NO}${client.language({ textId: "Trophy", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.onUse.trophyAdd} ${client.language({ textId: "will not be added: you already have this trophy", guildId: interaction.guildId, locale: interaction.locale })}.`)
                else if (profile.trophies?.length >= 10) errors.push(`${client.config.emojis.NO}${client.language({ textId: "Trophy", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.onUse.trophyAdd} ${client.language({ textId: "will not be added: maximum trophies reached - 10", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.addQuest) {
                const quest = client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === serverItem.onUse.addQuest && quest.isEnabled)
                if (!quest) {
                    errors.push(`${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.addQuest}** ${client.language({ textId: "will not be added: not found", guildId: interaction.guildId, locale: interaction.locale })}.`)
                } else if (profile.quests >= settings.max_quests) {
                    errors.push(`${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "will not be added:", guildId: interaction.guildId, locale: interaction.locale })} ${client.language({ textId: "Maximum quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.max_quests}`)
                } else if (profile.quests?.find(e => e.questID === quest.questID)?.finished === false) {
                    errors.push(`${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "will not be added: already taken", guildId: interaction.guildId, locale: interaction.locale })}.`)
                }
            }
            if (serverItem.onUse.rpAdd) {
                if (profile.rp >= 1000) errors.push(`${client.config.emojis.NO}${client.language({ textId: "Reputation will not be added: maximum reputation", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.itemAdd?.itemID) {
                const item = client.cache.items.find(e => !e.temp && e.enabled && e.itemID === serverItem.onUse.itemAdd.itemID)
                if (!item) errors.push(`${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.itemAdd.itemID}** ${client.language({ textId: "will not be added: not found", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.addAchievement) {
                const achievement = client.cache.achievements.find(e => e.guildID === interaction.guildId && e.enabled && e.id === serverItem.onUse.addAchievement)
                if (achievement) {
                    if (profile.achievements?.some(e => e.achievmentID === serverItem.onUse.addAchievement)) errors.push(`\n${client.config.emojis.NO}${client.language({ textId: "Achievement", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.displayEmoji}**${achievement.name}** ${client.language({ textId: "will not be added: already have it", guildId: interaction.guildId, locale: interaction.locale })}.`)
                } else errors.push(`${client.config.emojis.NO}${client.language({ textId: "Achievement", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.addAchievement}** ${client.language({ textId: "will not be added: not found", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.spawnWormhole) {
                const wormhole = client.cache.wormholes.find(e => e.isEnabled && e.wormholeID === serverItem.onUse.spawnWormhole)
                if (wormhole) {
                    let wormholeItem = client.cache.items.find(e => e.itemID === wormhole.itemID && !e.temp && e.enabled)
                    let wormholeItemEmoji = wormholeItem?.displayEmoji
                    if (wormhole.itemID === "currency" || wormhole.itemID === "xp" || wormhole.itemID === "rp") {
                        wormholeItem = {
                            name: wormhole.itemID === "currency" ? settings.currencyName : wormhole.itemID === "xp" ? client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })
                        }
                        wormholeItemEmoji = wormhole.itemID === "currency" ? settings.displayCurrencyEmoji : wormhole.itemID === "xp" ? client.config.emojis.XP : client.config.emojis.RP
                    }
                    if (wormholeItem) {
                        let webhook = client.cache.webhooks.get(wormhole.webhookId)
                        if (!webhook) {
                            webhook = await client.fetchWebhook(wormhole.webhookId).catch(e => null)
                            if (webhook instanceof Webhook) client.cache.webhooks.set(webhook.id, webhook)
                        }
                        if (!webhook) {
                            errors.push(`\n${client.config.emojis.NO}${client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale })} ${wormholeItemEmoji}**${wormholeItem.name}** ${client.language({ textId: "will not be spawned: webhook not found", guildId: interaction.guildId, locale: interaction.locale })} <#${wormhole.channelID}>.`)
                        }
                    } else errors.push(`${client.config.emojis.NO}${client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.spawnWormhole}** ${client.language({ textId: "will not be spawned: item", guildId: interaction.guildId, locale: interaction.locale })} **${wormhole.itemID}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`)
                } else errors.push(`${client.config.emojis.NO}${client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.spawnWormhole}** ${client.language({ textId: "will not be spawned: not found", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.craftResearch) {
                const item = client.cache.items.find(e => e.itemID === serverItem.onUse.craftResearch && !e.temp && e.enabled && e.found)
                if (item) {
                    const craft = item.crafts.find((e) => { return e.isFound === false })
                    if (!craft) errors.push(`${client.config.emojis.NO}${client.language({ textId: "Recipe will not be researched: for item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** - ${client.language({ textId: "all recipes researched", guildId: interaction.guildId, locale: interaction.locale })}.`)
                } else errors.push(`${client.config.emojis.NO}${client.language({ textId: "Recipe will not be researched: item", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.craftResearch}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.itemResearch) {
                const item = client.cache.items.find(e => e.itemID === serverItem.onUse.itemResearch && !e.temp && e.enabled)
                if (item) {
                    if (item.found) {
                        errors.push(`${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "will not be researched: already researched", guildId: interaction.guildId, locale: interaction.locale })}.`)
                    }
                } else errors.push(`${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.craftResearch}** ${client.language({ textId: "will not be researched: not found", guildId: interaction.guildId, locale: interaction.locale })}.`)
            }
            if (serverItem.onUse.multiplier?.XP?.x) {
                if ((profile.getXpBoost() > 0 && profile.getXpBoost() > serverItem.onUse.multiplier.XP.x && !settings.global_boosters_stacking) || (((this.multiplyXPTime < new Date() || !this.multiplyXPTime) ? 0 : this.multiplyXP || 0) > 0 && settings.global_boosters_stacking)) {
                    errors.push(`${client.config.emojis.NO}${client.language({ textId: "Boost will not be added: you already have XP boost with higher multiplier", guildId: interaction.guildId, locale: interaction.locale })}`)
                }
            }
            if (serverItem.onUse.multiplier?.CUR?.x) {
                if ((profile.getCurBoost() > 0 && profile.getCurBoost() > serverItem.onUse.multiplier.CUR.x && !settings.global_boosters_stacking) || (((this.multiplyCURTime < new Date() || !this.multiplyCURTime) ? 0 : this.multiplyCUR || 0) > 0 && settings.global_boosters_stacking)) {
                    errors.push(`${client.config.emojis.NO}${client.language({ textId: "Boost will not be added: you already have currency boost with higher multiplier", guildId: interaction.guildId, locale: interaction.locale })}`)
                }
            }
            if (serverItem.onUse.multiplier?.LUCK?.x) {
                if ((profile.getLuckBoost() && profile.getLuckBoost() > serverItem.onUse.multiplier.Luck.x && !settings.global_boosters_stacking) || (((this.multiplyLuckTime < new Date() || !this.multiplyLuckTime) ? 0 : this.multiplyLuck || 0) && settings.global_boosters_stacking)) {
                    errors.push(`${client.config.emojis.NO}${client.language({ textId: "Boost will not be added: you already have luck boost with higher multiplier", guildId: interaction.guildId, locale: interaction.locale })}`)
                }
            }
            if (serverItem.onUse.multiplier?.RP?.x) {
                if ((profile.getRpBoost() > 0 && profile.getRpBoost() > serverItem.onUse.multiplier.RP.x && !settings.global_boosters_stacking) || (((this.multiplyRPTime < new Date() || !this.multiplyRPTime) ? 0 : this.multiplyRP || 0) > 0 && settings.global_boosters_stacking)) {
                    errors.push(`${client.config.emojis.NO}${client.language({ textId: "Boost will not be added: you already have reputation boost with higher multiplier", guildId: interaction.guildId, locale: interaction.locale })}`)
                }
            }
            if (errors.length) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
                            .setDescription(`${errors.map((e, index) => `${index + 1}. ${e}`).join("\n")}`)
                            .setColor(interaction.member.displayHexColor)],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`await use confirm`)
                                .setLabel(`${client.language({ textId: "USE", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`await use decline`)
                                .setLabel(`${client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale })}`)
                                .setStyle(ButtonStyle.Danger))
                    ]
                })
                const filter = (i) => i.customId.includes(`await use`) && i.user.id === interaction.user.id
                interaction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
                if (!interaction) return
                if (interaction && interaction.customId === "await use decline") return interaction.fetchReply().then(reply => reply.delete()).catch(e => null)
                else await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))] })
            }
            let ableToUse = false
            let used = ""
            if (!interaction.replied && !interaction.deferred) await interaction.deferReply()
            if (serverItem.onUse.message) {
                if (serverItem.onUse.messageOnDM) {
                    interaction.member.send({ content: serverItem.onUse.message }).catch(e => null)
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Message sent to DM", guildId: interaction.guildId, locale: interaction.locale })}`
                } else {
                    used += `\n${serverItem.onUse.message}`
                }
                ableToUse = true
            }
            if (serverItem.onUse.roleAdd) {
                const guild_role = await interaction.guild.roles.fetch(serverItem.onUse.roleAdd).catch(e => null)
                if (guild_role) {
                    if (serverItem.onUse.role_add_direct) {
                        await interaction.member.roles.add(guild_role.id)
                        if (serverItem.onUse.roleTimely) {
                            if (!profile.roles) profile.roles = []
                            profile.roles.push({ id: guild_role.id, until: new Date(Date.now() + serverItem.onUse.roleTimely * 60 * 1000) })
                        }
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${serverItem.onUse.roleAdd}> ${client.language({ textId: "was added", guildId: interaction.guildId, locale: interaction.locale })}`
                    } else {
                        profile.addRole(guild_role.id, amount, serverItem.onUse.roleTimely ? serverItem.onUse.roleTimely * 60 * 1000 : undefined)
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${serverItem.onUse.roleAdd}> ${client.language({ textId: "was added to inventory", guildId: interaction.guildId, locale: interaction.locale })}`
                    }
                    ableToUse = true
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.roleAdd}** ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.roleDel) {
                if (interaction.member.roles.cache.has(serverItem.onUse.roleDel) || profile.inventoryRoles?.find(e => e.id === serverItem.onUse.roleDel && e.ms === undefined)) {
                    const guild_role = interaction.guild.roles.cache.get(serverItem.onUse.roleDel)
                    if (guild_role) {
                        if (interaction.member.roles.cache.has(serverItem.onUse.roleDel)) {
                            try {
                                await interaction.member.roles.remove(guild_role.id)
                                const temporaryRole = profile.roles?.find(e => { return e.id === serverItem.onUse.roleDel })
                                if (temporaryRole) {
                                    profile.roles = profile.roles.filter(r => r.id !== temporaryRole.id)
                                }
                                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${serverItem.onUse.roleDel}> ${client.language({ textId: "was removed", guildId: interaction.guildId, locale: interaction.locale })}.`
                                ableToUse = true
                            } catch (err) {
                                used += `\n${client.config.emojis.NO} ${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${serverItem.onUse.roleDel}> ${client.language({ textId: "was not removed because I don't have permission to remove it", guildId: interaction.guildId, locale: interaction.locale })}.`
                            }
                        } else if (profile.inventoryRoles?.find(e => e.id === serverItem.onUse.roleDel && e.ms === undefined)) {
                            profile.subtractRole(serverItem.onUse.roleDel, amount)
                            used += `\n${client.config.emojis.YES} ${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${serverItem.onUse.roleDel}> ${client.language({ textId: "was removed", guildId: interaction.guildId, locale: interaction.locale })}.`
                            ableToUse = true
                        }
                    } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.roleAdd}** ${client.language({ textId: "not found on server", guildId: interaction.guildId, locale: interaction.locale })}.`
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })} <@&${serverItem.onUse.roleDel}> ${client.language({ textId: "was not removed. You don't have this role", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.trophyAdd) {
                if (!profile.trophies?.some(e => e.toLowerCase() == serverItem.onUse.trophyAdd.toLowerCase())) {
                    if (!profile.trophies || profile.trophies.length < 10) {
                        if (!profile.trophies) profile.trophies = []
                        profile.trophies.push(serverItem.onUse.trophyAdd)
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Trophy", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.onUse.trophyAdd} ${client.language({ textId: "was added", guildId: interaction.guildId, locale: interaction.locale })}.`
                        ableToUse = true
                    } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Trophy", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.onUse.trophyAdd} ${client.language({ textId: "was not added. Maximum trophies: 10", guildId: interaction.guildId, locale: interaction.locale })}.`
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Trophy", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.onUse.trophyAdd} ${client.language({ textId: "was not added. You already have this trophy", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.trophyDel) {
                if (profile.trophies?.some(e => e.toLowerCase() == serverItem.onUse.trophyDel.toLowerCase())) {
                    profile.trophies = profile.trophies.filter(e => e.toLowerCase() !== serverItem.onUse.trophyDel.toLowerCase())
                    if (!profile.trophies[0]) profile.trophies = undefined
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Trophy", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.onUse.trophyDel} ${client.language({ textId: "was removed", guildId: interaction.guildId, locale: interaction.locale })}.`
                    ableToUse = true
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Trophy", guildId: interaction.guildId, locale: interaction.locale })} ${serverItem.onUse.trophyDel} ${client.language({ textId: "was not removed. You don't have this trophy", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.delCUR) {
                profile.multiplyCUR = 0
                profile.multiplyCURTime = undefined
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Currency boost cleared", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.delXP) {
                profile.multiplyXP = 0
                profile.multiplyXPTime = undefined
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "XP boost cleared", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.delLuck) {
                profile.multiplyLuck = 0
                profile.multiplyLuckTime = undefined
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Luck boost cleared", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.delRP) {
                profile.multiplyRP = 0
                profile.multiplyRPTime = undefined
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Reputation boost cleared", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.multiplier?.XP?.x) {
                if ((profile.getXpBoost() > 0 && profile.getXpBoost() > serverItem.onUse.multiplier.XP.x && !settings.global_boosters_stacking) || (((this.multiplyXPTime < new Date() || !this.multiplyXPTime) ? 0 : this.multiplyXP || 0) > 0 && settings.global_boosters_stacking)) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "You already have XP boost with higher multiplier", guildId: interaction.guildId, locale: interaction.locale })}`
                } else {
                    if (profile.getXpBoost() === serverItem.onUse.multiplier.XP.x) {
                        try {
                            if (!profile.multiplyXPTime) profile.multiplyXPTime = new Date()
                            profile.multiplyXPTime = new Date((profile.multiplyXPTime?.getTime() || Date.now()) + serverItem.onUse.multiplier.XP.time * amount * 60 * 1000)
                            used += `\n${client.config.emojis.YES} ${client.language({ textId: "Your XP booster extended by", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.multiplier.XP.time * amount}** ${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}.`
                        } catch (err) {
                            throw new Error(`${err.message} userID: ${profile.userID} | guildID: ${profile.guildID} | itemID: ${serverItem.itemID}`)
                        }
                    } else {
                        profile.multiplyXP = serverItem.onUse.multiplier.XP.x
                        profile.multiplyXPTime = new Date(Date.now() + serverItem.onUse.multiplier.XP.time * amount * 60 * 1000)
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Your XP booster", guildId: interaction.guildId, locale: interaction.locale })} **${booster(client.config, serverItem.onUse.multiplier.XP.x)}** ${client.language({ textId: "for", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, serverItem.onUse.multiplier.XP.time * amount * 60 * 1000, interaction.guildId, interaction.locale)}`
                    }
                }
                ableToUse = true
            }
            if (serverItem.onUse.multiplier?.CUR?.x) {
                if ((profile.getCurBoost() > 0 && profile.getCurBoost() > serverItem.onUse.multiplier.CUR.x && !settings.global_boosters_stacking) || (((this.multiplyCURTime < new Date() || !this.multiplyCURTime) ? 0 : this.multiplyCUR || 0) > 0 && settings.global_boosters_stacking)) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "You already have currency boost with higher multiplier", guildId: interaction.guildId, locale: interaction.locale })}`
                } else {
                    if (profile.getCurBoost() === serverItem.onUse.multiplier.CUR.x) {
                        try {
                            profile.multiplyCURTime = new Date((profile.multiplyCURTime?.getTime() || Date.now()) + serverItem.onUse.multiplier.CUR.time * amount * 60 * 1000)
                            used += `\n${client.config.emojis.YES} ${client.language({ textId: "Your currency booster extended by", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.multiplier.CUR.time * amount}** ${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}.`
                        } catch (err) {
                            throw new Error(`${err.message} userID: ${profile.userID} | guildID: ${profile.guildID} | itemID: ${serverItem.itemID}`)
                        }
                    } else {
                        profile.multiplyCUR = serverItem.onUse.multiplier.CUR.x
                        profile.multiplyCURTime = new Date(Date.now() + serverItem.onUse.multiplier.CUR.time * amount * 60 * 1000)
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Your currency booster", guildId: interaction.guildId, locale: interaction.locale })} **${booster(client.config, serverItem.onUse.multiplier.CUR.x)}** ${client.language({ textId: "for", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, serverItem.onUse.multiplier.CUR.time * amount * 60 * 1000, interaction.guildId, interaction.locale)}`
                    }
                }
                ableToUse = true
            }
            if (serverItem.onUse.multiplier?.Luck?.x) {
                if ((profile.getLuckBoost() && profile.getLuckBoost() > serverItem.onUse.multiplier.Luck.x && !settings.global_boosters_stacking) || (((this.multiplyLuckTime < new Date() || !this.multiplyLuckTime) ? 0 : this.multiplyLuck || 0) && settings.global_boosters_stacking)) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "You already have luck boost with higher multiplier", guildId: interaction.guildId, locale: interaction.locale })}`
                } else {
                    if (profile.getLuckBoost() === serverItem.onUse.multiplier.Luck.x) {
                        try {
                            profile.multiplyLuckTime = new Date((profile.multiplyLuckTime?.getTime() || Date.now()) + serverItem.onUse.multiplier.Luck.time * amount * 60 * 1000)
                            used += `\n${client.config.emojis.YES} ${client.language({ textId: "Your luck booster extended by", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.multiplier.Luck.time * amount}** ${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}.`
                        } catch (err) {
                            throw new Error(`${err.message} userID: ${profile.userID} | guildID: ${profile.guildID} | itemID: ${serverItem.itemID}`)
                        }
                    } else {
                        profile.multiplyLuck = serverItem.onUse.multiplier.Luck.x
                        profile.multiplyLuckTime = new Date(Date.now() + serverItem.onUse.multiplier.Luck.time * amount * 60 * 1000)
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Your luck booster", guildId: interaction.guildId, locale: interaction.locale })} **${booster(client.config, serverItem.onUse.multiplier.Luck.x)}** ${client.language({ textId: "for", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, serverItem.onUse.multiplier.Luck.time * amount * 60 * 1000, interaction.guildId, interaction.locale)}`
                    }
                }
                ableToUse = true
            }
            if (serverItem.onUse.multiplier?.RP?.x) {
                if ((profile.getRpBoost() > 0 && profile.getRpBoost() > serverItem.onUse.multiplier.RP.x && !settings.global_boosters_stacking) || (((this.multiplyRPTime < new Date() || !this.multiplyRPTime) ? 0 : this.multiplyRP || 0) > 0 && settings.global_boosters_stacking)) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "You already have reputation boost with higher multiplier", guildId: interaction.guildId, locale: interaction.locale })}`
                } else {
                    if (profile.getRpBoost() === serverItem.onUse.multiplier.RP.x) {
                        try {
                            profile.multiplyRPTime = new Date((profile.multiplyRPTime?.getTime() || Date.now()) + serverItem.onUse.multiplier.RP.time * amount * 60 * 1000)
                            used += `\n${client.config.emojis.YES} ${client.language({ textId: "Your reputation booster extended by", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.multiplier.RP.time * amount}** ${client.language({ textId: "minutes", guildId: interaction.guildId, locale: interaction.locale })}.`
                        } catch (err) {
                            throw new Error(`${err.message} userID: ${profile.userID} | guildID: ${profile.guildID} | itemID: ${serverItem.itemID}`)
                        }
                    } else {
                        profile.multiplyRP = serverItem.onUse.multiplier.RP.x
                        profile.multiplyRPTime = new Date(Date.now() + serverItem.onUse.multiplier.RP.time * amount * 60 * 1000)
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Your reputation booster", guildId: interaction.guildId, locale: interaction.locale })} **${booster(client.config, serverItem.onUse.multiplier.RP.x)}** ${client.language({ textId: "for", guildId: interaction.guildId, locale: interaction.locale })} ${client.functions.transformSecs(client, serverItem.onUse.multiplier.RP.time * amount * 60 * 1000, interaction.guildId, interaction.locale)}`
                    }
                }
                ableToUse = true
            }
            if (serverItem.onUse.addQuest) {
                const quest = client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === serverItem.onUse.addQuest && quest.isEnabled)
                if (!quest) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.addQuest}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`
                } else if (profile.quests >= settings.max_quests) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "was not added:", guildId: interaction.guildId, locale: interaction.locale })} ${client.language({ textId: "Maximum quests in profile reached", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.max_quests}`
                } else if (profile.quests?.find(e => e.questID === quest.questID)?.finished === false) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "was not added: already taken", guildId: interaction.guildId, locale: interaction.locale })}.`
                } else {
                    profile.addQuest(quest)
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "was added", guildId: interaction.guildId, locale: interaction.locale })}.`
                    ableToUse = true
                }
            }
            if (serverItem.onUse.delQuest) {
                const quest = client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === serverItem.onUse.delQuest && quest.isEnabled)
                if (!quest) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.delQuest}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`
                } else {
                    const index = profile.quests?.findIndex(e => e.questID == quest.questID) || -1
                    if (index >= 0) {
                        profile.delQuest(quest)
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "was removed from profile", guildId: interaction.guildId, locale: interaction.locale })}.`
                        ableToUse = true
                    } else {
                        used += `\n${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "not found in profile", guildId: interaction.guildId, locale: interaction.locale })}.`
                    }
                }
            }
            if (serverItem.onUse.wipeQuest) {
                const quest = client.cache.quests.find(quest => quest.guildID === interaction.guildId && quest.questID === serverItem.onUse.wipeQuest && quest.isEnabled)
                if (!quest) {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.wipeQuest}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`
                } else {
                    const index = profile.quests?.findIndex(e => e.questID == quest.questID) || -1
                    if (index >= 0) {
                        if (quest.community) {
                            quest.targets.forEach(e => {
                                e.reached = 0
                                e.finished = false
                            })
                            profile.quests[index].finished = false
                            profile.quests[index].finishedDate = undefined
                            await quest.save().catch(e => console.error(e))
                        } else {
                            profile.quests[index].targets.forEach(e => {
                                e.reached = 0
                                e.finished = false
                            })
                            profile.quests[index].finished = false
                            profile.quests[index].finishedDate = undefined
                        }
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Quest progress", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "was reset", guildId: interaction.guildId, locale: interaction.locale })}.`
                        ableToUse = true
                    } else {
                        used += `\n${client.config.emojis.NO}${client.language({ textId: "Quest", guildId: interaction.guildId, locale: interaction.locale })} ${quest.displayEmoji}**${quest.name}** ${client.language({ textId: "not found in profile", guildId: interaction.guildId, locale: interaction.locale })}.`
                    }
                }
            }
            if (serverItem.onUse.levelAdd) {
                await profile.addLevel(serverItem.onUse.levelAdd * amount)
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Added", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.medal}**${serverItem.onUse.levelAdd * amount}** ${client.language({ textId: "levels", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.rpAdd) {
                if (profile.rp < 1000) {
                    await profile.addRp(serverItem.onUse.rpAdd * amount)
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Added", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.RP}**${!(serverItem.onUse.rpAdd * amount).toString().split('.')[1] ? serverItem.onUse.rpAdd * amount : (serverItem.onUse.rpAdd * amount).toString().split('.')[1].length === 1 ? (serverItem.onUse.rpAdd * amount).toFixed(1) : (serverItem.onUse.rpAdd * amount).toFixed(2)}** ${client.language({ textId: "reputation", guildId: interaction.guildId, locale: interaction.locale })}.`
                    ableToUse = true
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Reputation not added: maximum reputation", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.xpAdd) {
                await profile.addXp(serverItem.onUse.xpAdd * amount)
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Added", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.XP}**${serverItem.onUse.xpAdd * amount}** ${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.currencyAdd) {
                await profile.addCurrency(serverItem.onUse.currencyAdd * amount)
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Added", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${serverItem.onUse.currencyAdd * amount}).`
                ableToUse = true
            }
            if (serverItem.onUse.itemAdd?.itemID) {
                const item = client.cache.items.find(e => !e.temp && e.enabled && e.itemID === serverItem.onUse.itemAdd.itemID)
                if (item) {
                    await profile.addItem(item.itemID, serverItem.onUse.itemAdd.amount * amount)
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Added", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** (${serverItem.onUse.itemAdd.amount * amount}).`
                    ableToUse = true
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.itemAdd.itemID}** ${client.language({ textId: "not added: not found", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.addAchievement) {
                const achievement = client.cache.achievements.find(e => e.guildID === interaction.guildId && e.enabled && e.id === serverItem.onUse.addAchievement)
                if (achievement) {
                    if (!profile.achievements?.some(e => e.achievmentID === serverItem.onUse.addAchievement)) {
                        if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                        client.tempAchievements[profile.userID].push(serverItem.onUse.addAchievement)
                        await profile.addAchievement(achievement)
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Achievement added", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.displayEmoji}**${achievement.name}**`
                        ableToUse = true
                    } else {
                        used += `\n${client.config.emojis.NO}${client.language({ textId: "Achievement", guildId: interaction.guildId, locale: interaction.locale })} ${achievement.displayEmoji}**${achievement.name}** ${client.language({ textId: "not added: already have it", guildId: interaction.guildId, locale: interaction.locale })}.`
                    }
                } else {
                    used += `\n${client.config.emojis.NO}${client.language({ textId: "Achievement", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.addAchievement}** ${client.language({ textId: "not added: not found", guildId: interaction.guildId, locale: interaction.locale })}.`
                }
            }
            if (serverItem.onUse.spawnWormhole) {
                const wormhole = client.cache.wormholes.find(e => e.isEnabled && e.wormholeID === serverItem.onUse.spawnWormhole)
                if (wormhole) {
                    let wormholeItem = client.cache.items.find(e => e.itemID === wormhole.itemID && !e.temp && e.enabled)
                    let wormholeItemEmoji = wormholeItem?.displayEmoji
                    if (wormhole.itemID === "currency" || wormhole.itemID === "xp" || wormhole.itemID === "rp") {
                        wormholeItem = {
                            name: wormhole.itemID === "currency" ? settings.currencyName : wormhole.itemID === "xp" ? client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale }) : client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })
                        }
                        wormholeItemEmoji = wormhole.itemID === "currency" ? settings.displayCurrencyEmoji : wormhole.itemID === "xp" ? client.config.emojis.XP : client.config.emojis.RP
                    }
                    if (wormholeItem) {
                        let webhook = client.cache.webhooks.get(wormhole.webhookId)
                        if (!webhook) {
                            webhook = await client.fetchWebhook(wormhole.webhookId).catch(e => null)
                            if (webhook instanceof Webhook) client.cache.webhooks.set(webhook.id, webhook)
                        }
                        if (webhook) {
                            await wormhole.spawn(webhook)
                            await profile.addQuestProgression("wormholesSpawned", 1, wormhole.wormholeID)
                            profile.wormholesSpawned++
                            const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.WormholesSpawned)
                            await Promise.all(achievements.map(async achievement => {
                                if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.wormholesSpawned >= achievement.amount && !client.tempAchievements[interaction.user.id]?.includes(achievement.id)) {
                                    if (!client.tempAchievements[interaction.user.id]) client.tempAchievements[interaction.user.id] = []
                                    client.tempAchievements[interaction.user.id].push(achievement.id)
                                    await profile.addAchievement(achievement)
                                }
                            }))
                            used += `\n${client.config.emojis.YES} ${client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale })} ${wormholeItemEmoji}**${wormholeItem.name}** ${client.language({ textId: "spawned", guildId: interaction.guildId, locale: interaction.locale })}.`
                            ableToUse = true
                        } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale })} ${wormholeItemEmoji}**${wormholeItem.name}** ${client.language({ textId: "did not spawn", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "webhook not found", guildId: interaction.guildId, locale: interaction.locale })}.`
                    } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.spawnWormhole}** ${client.language({ textId: "will not be spawned: item", guildId: interaction.guildId, locale: interaction.locale })} **${wormhole.itemID}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Wormhole", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.spawnWormhole}** ${client.language({ textId: "did not spawn", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.craftResearch) {
                const item = client.cache.items.find(e => e.itemID === serverItem.onUse.craftResearch && e.enabled && !e.temp)
                if (item) {
                    const craft = item.crafts.find((e) => { return e.isFound === false })
                    if (!craft) {
                        used += `\n${client.config.emojis.NO}${client.language({ textId: "For item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "all recipes researched", guildId: interaction.guildId, locale: interaction.locale })}.`
                    } else {
                        let recipe = ""
                        for (const e of craft.items) {
                            let amount = ""
                            if (e.amount > 1) amount += e.amount
                            if (e.itemID == "currency") {
                                if (craft.items.findIndex(i2 => i2.itemID === e.itemID) === 0) {
                                    recipe += `${settings.displayCurrencyEmoji}**${settings.currencyName}** (${amount})`
                                } else {
                                    recipe += ` + ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${amount})`
                                }

                            } else {
                                let cItem = client.cache.items.find(a => !a.temp && a.enabled && a.itemID === e.itemID)
                                if (craft.items.findIndex(i2 => i2.itemID === e.itemID) === 0) {
                                    if (cItem.found) recipe += `${cItem.displayEmoji}**${cItem.name}** (${amount})`
                                    else recipe += `||??||`
                                }
                                else {
                                    if (cItem.found) recipe += ` + ${cItem.displayEmoji}**${cItem.name}** (${amount})`
                                    else recipe += ` + ||??||`
                                }
                            }
                        }
                        let craftingItems = ""
                        if (item.crafts.amount1 !== item.crafts.amount2) craftingItems = `${item.crafts.amount1}-${item.crafts.amount2}`
                        else craftingItems = ""
                        recipe += ` = ${item.displayEmoji}**${item.name}** (${craftingItems})\n`
                        craft.isFound = true
                        await item.save().catch(err => console.error(`Failed to save item ${item.itemID}:`, err))
                        ableToUse = true
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "You researched recipe", guildId: interaction.guildId, locale: interaction.locale })}: ${recipe}`
                    }
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Recipe was not researched", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: "item", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.craftResearch}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.itemResearch) {
                const item = client.cache.items.find(e => e.itemID === serverItem.onUse.itemResearch && !e.temp && e.enabled)
                if (item) {
                    if (item.found) {
                        used += `\n${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "already researched", guildId: interaction.guildId, locale: interaction.locale })}.`
                    } else {
                        item.found = true
                        await item.save().catch(err => console.error(`Failed to save item ${item.itemID}:`, err))
                        used += `\n${client.config.emojis.YES} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "researched", guildId: interaction.guildId, locale: interaction.locale })}.`
                        ableToUse = true
                    }
                }
            }
            if (serverItem.onUse.deleteItemFromServer) {
                const item = client.cache.items.find(e => e.itemID === serverItem.onUse.deleteItemFromServer && !e.temp && e.enabled && e.found)
                if (item) {
                    await item.delete()
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "was deleted from server", guildId: interaction.guildId, locale: interaction.locale })}.`
                    ableToUse = true
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.deleteItemFromServer}** ${client.language({ textId: "was not deleted from server: not found", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.takeXP) {
                await profile.subtractXp(serverItem.onUse.takeXP * amount)
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Subtracted", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.XP}**${serverItem.onUse.takeXP * amount}** ${client.language({ textId: "XP (genitive)", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.takeCUR) {
                await profile.subtractCurrency(serverItem.onUse.takeCUR * amount)
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Subtracted", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${serverItem.onUse.takeCUR * amount}).`
                ableToUse = true
            }
            if (serverItem.onUse.takeRP) {
                await profile.subtractRp(serverItem.onUse.takeRP * amount)
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Subtracted", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.RP}**${!(serverItem.onUse.takeRP * amount).toString().split('.')[1] ? serverItem.onUse.takeRP * amount : (serverItem.onUse.takeRP * amount).toString().split('.')[1].length === 1 ? (serverItem.onUse.takeRP * amount).toFixed(1) : (serverItem.onUse.takeRP * amount).toFixed(2)}** ${client.language({ textId: "reputation (genitive)", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.takeLevel) {
                await profile.subtractLevel(serverItem.onUse.takeLevel * amount)
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Subtracted", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.medal}**${serverItem.onUse.takeLevel * amount}** ${client.language({ textId: "levels", guildId: interaction.guildId, locale: interaction.locale })}.`
                ableToUse = true
            }
            if (serverItem.onUse.takeItem?.itemID) {
                const item = client.cache.items.find(e => e.itemID === serverItem.onUse.takeItem.itemID && !e.temp && e.enabled)
                if (item) {
                    await profile.subtractItem(item.itemID, serverItem.onUse.takeItem.amount * amount)
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Subtracted", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** (${serverItem.onUse.takeItem.amount * amount}).`
                    ableToUse = true
                } else used += `\n${client.config.emojis.NO}${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${serverItem.onUse.takeItem.itemID}** ${client.language({ textId: "not subtracted: not found", guildId: interaction.guildId, locale: interaction.locale })}.`
            }
            if (serverItem.onUse.autoIncome) {
                if (profile.autoIncomeExpire && profile.autoIncomeExpire > new Date()) {
                    profile.autoIncomeExpire = new Date(profile.autoIncomeExpire.getTime() + serverItem.onUse.autoIncome * amount * 60 * 1000)
                    if (profile.autoIncomeTimeoutId) profile.clearAutoIncomeTimeout()
                    profile.setAutoIncomeTimeout()
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Auto income extended to", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.autoIncomeExpire / 1000)}:f>`
                    ableToUse = true
                } else {
                    profile.autoIncomeExpire = new Date(Date.now() + serverItem.onUse.autoIncome * amount * 60 * 1000)
                    profile.setAutoIncomeTimeout()
                    used += `\n${client.config.emojis.YES} ${client.language({ textId: "Auto income enabled until", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.autoIncomeExpire / 1000)}:f>`
                }
                ableToUse = true
            }
            if (serverItem.onUse.autoIncomeDel) {
                profile.autoIncomeExpire = undefined
                profile.clearAutoIncomeTimeout()
                used += `\n${client.config.emojis.YES} ${client.language({ textId: "Auto income disabled", guildId: interaction.guildId, locale: interaction.locale })}`
            }
            if (ableToUse === true) {
                embed.setColor(serverItem.onUse.color || interaction.member.displayHexColor)
                embed.setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
                embed.setTitle(`${client.config.emojis.DONE} ${client.language({ textId: "You", guildId: interaction.guildId, locale: interaction.locale })} ${profile.sex === "male" ? `${client.language({ textId: "used", guildId: interaction.guildId, locale: interaction.locale })}` : profile.sex === "female" ? `${client.language({ textId: "used (female)", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "used (neutral)", guildId: interaction.guildId, locale: interaction.locale })}`} ${serverItem.displayEmoji}**${serverItem.name}** (${amount})`)
                embed.setDescription(used || null)
                embed.setThumbnail(serverItem.onUse.thumbnail || serverItem.image || await serverItem.getEmojiURL() || null)
                embed.setImage(serverItem.onUse.image || null)
                await profile.subtractItem(serverItem.itemID, amount)
                await profile.addQuestProgression("itemsUsed", amount, serverItem.itemID)
                profile.itemsUsed += amount
                if (serverItem.cooldown_use) {
                    if (!profile.itemsCooldowns) profile.itemsCooldowns = new Map()
                    if (profile.itemsCooldowns.get(serverItem.itemID)) profile.itemsCooldowns.set(serverItem.itemID, { ...profile.itemsCooldowns.get(serverItem.itemID), use: new Date(Date.now() + serverItem.cooldown_use * 1000) })
                    else profile.itemsCooldowns.set(serverItem.itemID, { use: new Date(Date.now() + serverItem.cooldown_use * 1000) })
                }
                const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.ItemsUsed)
                await Promise.all(achievements.map(async achievement => {
                    if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.itemsUsed >= achievement.amount && !client.tempAchievements[interaction.user.id]?.includes(achievement.id)) {
                        if (!client.tempAchievements[interaction.user.id]) client.tempAchievements[interaction.user.id] = []
                        client.tempAchievements[interaction.user.id].push(achievement.id)
                        await profile.addAchievement(achievement)
                    }
                }))
                await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
                if (interaction.deferred || interaction.replied) interaction.editReply({ content: " ", embeds: [embed], components: [] })
                else interaction.update({ content: " ", embeds: [embed], components: [] })
                client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> (${interaction.user.username}) ${client.language({ textId: "used", guildId: interaction.guildId })} ${serverItem.displayEmoji}**${serverItem.name}** (${amount})`)
            } else {
                embed.setColor(interaction.member.displayHexColor)
                embed.setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
                embed.setDescription(used)
                interaction.editReply({ content: " ", embeds: [embed], components: [] })
            }
        } else {
            embed.setColor(interaction.member.displayHexColor)
            embed.setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
            embed.setDescription(`${client.config.emojis.NO} ${serverItem.displayEmoji}**${serverItem.name}** ${client.language({ textId: "Cannot be used", guildId: interaction.guildId, locale: interaction.locale })}`)
            return interaction.reply({ content: " ", embeds: [embed], components: [], flags: ["Ephemeral"] })
        }
    }
}
function booster(config, number) {
    return `${config.emojis.XP100Booster}${number * 100}%`
}
function transformSecs(client, duration, guildId, locale) {
    let ms = parseInt((duration % 1000) / 100),
        secs = Math.floor((duration / 1000) % 60),
        mins = Math.floor((duration / (1000 * 60)) % 60),
        hrs = Math.floor((duration / (1000 * 60 * 60)) % 24)
    days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 30)
    if (days) return `${days} ${client.language({ textId: "days", guildId: guildId, locale: locale })}. ${hrs} ${client.language({ textId: "HOURS_SMALL", guildId: guildId, locale: locale })}. ${mins} ${client.language({ textId: "minutes", guildId: guildId, locale: locale })}. ${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`
    if (!days) return `${hrs} ${client.language({ textId: "HOURS_SMALL", guildId: guildId, locale: locale })}. ${mins} ${client.language({ textId: "minutes", guildId: guildId, locale: locale })}. ${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`
    if (!hrs) return `${mins} ${client.language({ textId: "minutes", guildId: guildId, locale: locale })}. ${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`
    if (!mins) return `${secs} ${client.language({ textId: "seconds", guildId: guildId, locale: locale })}.`
    if (!secs) return `${ms} ${client.language({ textId: "milliseconds", guildId: guildId, locale: locale })}.`
}