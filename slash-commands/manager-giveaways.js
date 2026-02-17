const { TextInputStyle, ChannelType, ButtonBuilder, ButtonStyle, InteractionType, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, Collection, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, LabelBuilder } = require("discord.js")
const GiveawayRegexp = /giveaway{(.*?)}/
const IndexRegexp = /index{(.*?)}/
const Giveaway = require("../classes/giveaway.js")
const uniqid = require(`uniqid`)
const { format } = require('date-format-parse')
const { parse } = require('date-format-parse')
const { AchievementType } = require("../enums/AchievementType.js")
const { RewardType } = require("../enums/RewardType.js")
const isImageURL = require('image-url-validator').default
module.exports = {
    name: "manager-giveaways",
    nameLocalizations: {
        "ru": `управление-раздачами`,
        "uk": `управління-роздачами`,
        "es-ES": `gestión-de-sorteos`
    },
    description: "Giveaways manager",
    descriptionLocalizations: {
        "ru": `Менеджер раздач`,
        "uk": `Менеджер роздач`,
        "es-ES": `Gestor de sorteos`
    },
    dmPermission: false,
    group: `managers`,
    cooldowns: new Collection(),
    run: async (client, interaction) => {
    	const settings = client.cache.settings.get(interaction.guildId)
    	if (interaction.isChatInputCommand() || interaction.customId.includes("cancel") || interaction.customId === "cmd{manager-giveaways}") {
    		if (interaction.isButton() && interaction.customId.includes("cancel")) {
    			const giveaway = client.cache.giveaways.find(e => e.giveawayID === GiveawayRegexp.exec(interaction.customId)[1])
    			if (!giveaway) {
    				return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "This giveaway no longer exists", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
	    		}
	    		if (giveaway.status !== "temp") {
	    			return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "This giveaway can no longer be edited", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
	    		}
	    		await giveaway.delete()
    		}
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
			const embed = new EmbedBuilder()
	    		.setColor(3093046)
	    		.setTitle(`${client.language({ textId: "Giveaway Manager", guildId: interaction.guildId, locale: interaction.locale })}`)
	    		.setDescription([
	    			`${client.language({ textId: "Current number of giveaways on the server", guildId: interaction.guildId, locale: interaction.locale })}: ${client.cache.giveaways.filter(e => e.guildID === interaction.guildId && e.status === "started").size}`,
	    			`${client.language({ textId: "Total number of your giveaways", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.giveawaysCreated}`,
	    			`* ${client.language({ textId: "per year", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.stats?.yearly?.giveawaysCreated || 0}`,
	    			`* ${client.language({ textId: "per month", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.stats?.monthly?.giveawaysCreated || 0}`,
	    			`* ${client.language({ textId: "per week", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.stats?.weekly?.giveawaysCreated || 0}`,
	    			`* ${client.language({ textId: "per day", guildId: interaction.guildId, locale: interaction.locale })}: ${profile.stats?.daily?.giveawaysCreated || 0}`
				].join("\n"))
			const create_adm_btn = new ButtonBuilder()
				.setCustomId(`cmd{manager-giveaways}createadm`)
				.setStyle(ButtonStyle.Success)
				.setLabel(`${client.language({ textId: "Create giveaway as administrator", guildId: interaction.guildId, locale: interaction.locale })}`)
			const create_user_btn = new ButtonBuilder()
				.setCustomId(`cmd{manager-giveaways}createuser`)
				.setStyle(ButtonStyle.Success)
				.setLabel(`${client.language({ textId: "Create giveaway", guildId: interaction.guildId, locale: interaction.locale })}`)
			const list_btn = new ButtonBuilder()
				.setCustomId(`cmd{manager-giveaways}index{0}list`)
				.setStyle(ButtonStyle.Secondary)
				.setLabel(`${client.language({ textId: "Giveaway list", guildId: interaction.guildId, locale: interaction.locale })}`)
			const settings_btn = new ButtonBuilder()
				.setCustomId(`cmd{manager-giveaways}settings`)
				.setStyle(ButtonStyle.Secondary)
				.setLabel(`${client.language({ textId: "Settings", guildId: interaction.guildId, locale: interaction.locale })}`)
			const row = new ActionRowBuilder().addComponents(create_user_btn)
			if (interaction.member.permissions.has("Administrator")) row.addComponents(create_adm_btn)
			row.addComponents(list_btn)
			if (interaction.member.permissions.has("Administrator") || interaction.member.permissions.has("ManageGuild") || interaction.member.permissions.has("ManageRoles")) row.addComponents(settings_btn)
			if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: [row], flags: ["Ephemeral"] })
			else return interaction.update({ embeds: [embed], components: [row] })
    	}
    	if (!interaction.isChatInputCommand()) {
    		if (interaction.customId.includes("settings")) {
    			if (interaction.customId.includes("edit")) {
    				if (interaction.values[0] === "giveawayManagerPermission") {
    					if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
		                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
		                }
		                const modal = new ModalBuilder()
		                    .setCustomId(`manager-giveaways_giveawayManagerPermission_${interaction.id}`)
		                    .setTitle(`${client.language({ textId: "Permission for accepting/declining giveaways", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
		                                    .setCustomId("name")
		                                    .setRequired(false)
		                                    .setValue(`${client.cache.permissions.find(e => e.id === settings.giveawayManagerPermission)?.name || ""}`)
		                                    .setStyle(TextInputStyle.Short)
									),
							])
		                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
		                const filter = (i) => i.customId === `manager-giveaways_giveawayManagerPermission_${interaction.id}` && i.user.id === interaction.user.id
		                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
		                if (interaction && interaction.type === InteractionType.ModalSubmit) {
		                    const modalArgs = {}
		                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
		                    if (!modalArgs.name) {
		                        settings.giveawayManagerPermission = undefined
		                    } else {
		                        const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
		                        if (!permission) {
		                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
		                        }
		                        settings.giveawayManagerPermission = permission.id
		                        await settings.save()
		                    }
		                } else return
    				} else
    				if (interaction.values[0] === "giveawayRerollPermission") {
    					if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
		                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
		                }
		                const modal = new ModalBuilder()
		                    .setCustomId(`manager-giveaways_giveawayRerollPermission_${interaction.id}`)
		                    .setTitle(`${client.language({ textId: "Permission for rerolling giveaways", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
		                                    .setCustomId("name")
		                                    .setRequired(false)
		                                    .setValue(`${client.cache.permissions.find(e => e.id === settings.giveawayRerollPermission)?.name || ""}`)
		                                    .setStyle(TextInputStyle.Short)
									),
							])
		                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
		                const filter = (i) => i.customId === `manager-giveaways_giveawayRerollPermission_${interaction.id}` && i.user.id === interaction.user.id
		                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
		                if (interaction && interaction.type === InteractionType.ModalSubmit) {
		                    const modalArgs = {}
		                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
		                    if (!modalArgs.name) {
		                        settings.giveawayRerollPermission = undefined
		                    } else {
		                        const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
		                        if (!permission) {
		                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
		                        }
		                        settings.giveawayRerollPermission = permission.id
		                        await settings.save()
		                    }
		                } else return
    				} else
    				if (interaction.values[0] === "giveawaysChannelId") {
    					const components = JSON.parse(JSON.stringify(interaction.message.components))
		    			interaction.message.components.forEach(row => row.components.forEach(component => {
		                    component.data.disabled = true
		                }))
		    			await interaction.update({ components: interaction.message.components })
		                await interaction.followUp({ 
		                    content: `${client.language({ textId: "Select channel where user giveaways will be published", guildId: interaction.guildId, locale: interaction.locale })}`,
		                    components: [
		                        new ActionRowBuilder()
		                            .addComponents(
		                                new ChannelSelectMenuBuilder()
		                                    .setCustomId(`manager-giveaways_settings_giveawaysChannelId_select`)
											.setChannelTypes(ChannelType.AnnouncementThread, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PrivateThread, ChannelType.PublicThread)
		                            ),
		                        new ActionRowBuilder()
		                            .addComponents(
										new ButtonBuilder()
											.setCustomId(`manager-giveaways_settings_giveawaysChannelId_delete`)
											.setLabel(client.language({ textId: "DELETE", guildId: interaction.guildId, locale: interaction.locale }))
											.setStyle(ButtonStyle.Danger)
											.setDisabled(!settings.channels.giveawaysChannelId),
		                                new ButtonBuilder()
		                                    .setCustomId(`manager-giveaways_settings_giveawaysChannelId_cancel`)
		                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
		                                    .setStyle(ButtonStyle.Danger)
		                            )
		                    ],
		                    flags: ["Ephemeral"]
		                })    
		                const filter = (i) => i.customId.includes(`manager-giveaways_settings_giveawaysChannelId`) && i.user.id === interaction.user.id
		                const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
		                if (interaction2) {
		                    if (interaction2.customId === "manager-giveaways_settings_giveawaysChannelId_select") {
		                    	const channel = interaction2.channels.first()
		                    	if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages") || !channel.permissionsFor(interaction.guild.members.me).has("AddReactions")) {
		                    		interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}> ${client.language({ textId: "I need the following permissions:\n1. Send Messages\n2. Add Reactions", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
		                    		return interaction.editReply({ components: components })
		                    	}
		                        settings.channels.giveawaysChannelId = channel.id
		                        await settings.save()
		                        interaction2.update({ content: `${client.config.emojis.YES}`, components: [], flags: ["Ephemeral"] })
		                    }
		                    if (interaction2.customId === "manager-giveaways_settings_giveawaysChannelId_cancel") {
		                        interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
		                        return interaction.editReply({ components: components })
		                    }
							if (interaction2.customId === "manager-giveaways_settings_giveawaysChannelId_delete") {
								settings.channels.giveawaysChannelId = undefined
		                        await settings.save()
		                        interaction2.update({ content: `${client.config.emojis.YES}`, components: [], flags: ["Ephemeral"] })
							}
		                }
    				} else
    				if (interaction.values[0] === "giveawaysMeetingRoom") {
    					const components = JSON.parse(JSON.stringify(interaction.message.components))
		    			interaction.message.components.forEach(row => row.components.forEach(component => {
		                    component.data.disabled = true
		                }))
		    			await interaction.update({ components: interaction.message.components })
		                await interaction.followUp({ 
		                    content: `${client.language({ textId: "Select channel where certain people will accept user giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
		                    components: [
		                        new ActionRowBuilder()
		                            .addComponents(
		                                new ChannelSelectMenuBuilder()
		                                    .setCustomId(`manager-giveaways_settings_giveawaysMeetingRoom_select`)
											.setChannelTypes(ChannelType.AnnouncementThread, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PrivateThread, ChannelType.PublicThread)
		                            ),
		                        new ActionRowBuilder()
		                            .addComponents(
										new ButtonBuilder()
											.setCustomId(`manager-giveaways_settings_giveawaysMeetingRoom_delete`)
											.setLabel(client.language({ textId: "DELETE", guildId: interaction.guildId, locale: interaction.locale }))
											.setStyle(ButtonStyle.Danger)
											.setDisabled(!settings.channels.giveawaysMeetingRoom),
		                                new ButtonBuilder()
		                                    .setCustomId(`manager-giveaways_settings_giveawaysMeetingRoom_cancel`)
		                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
		                                    .setStyle(ButtonStyle.Danger)
		                            )
		                    ],
		                    flags: ["Ephemeral"]
		                })    
		                const filter = (i) => i.customId.includes(`manager-giveaways_settings_giveawaysMeetingRoom`) && i.user.id === interaction.user.id
		                const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
		                if (interaction2) {
		                    if (interaction2.customId === "manager-giveaways_settings_giveawaysMeetingRoom_select") {
		                    	const channel = interaction2.channels.first()
		                    	if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
		                    		interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}> ${client.language({ textId: "I need the following permissions:\n1. Send messages", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
		                    		return interaction.editReply({ components: components })
		                    	}
		                        settings.channels.giveawaysMeetingRoom = channel.id
		                        await settings.save()
		                        interaction2.update({ content: `${client.config.emojis.YES}`, components: [], flags: ["Ephemeral"] })
		                    }
		                    if (interaction2.customId === "manager-giveaways_settings_giveawaysMeetingRoom_cancel") {
		                        interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
		                        return interaction.editReply({ components: components })
		                    }
							if (interaction2.customId === "manager-giveaways_settings_giveawaysMeetingRoom_delete") {
								settings.channels.giveawaysMeetingRoom = undefined
		                        await settings.save()
		                        interaction2.update({ content: `${client.config.emojis.YES}`, components: [], flags: ["Ephemeral"] })
							}
		                }
    				} else
    				if (interaction.values[0] === "giveawaysNotification") {
    					const components = JSON.parse(JSON.stringify(interaction.message.components))
		    			interaction.message.components.forEach(row => row.components.forEach(component => {
		                    component.data.disabled = true
		                }))
		    			await interaction.update({ components: interaction.message.components })
		                await interaction.followUp({ 
		                    content: `${client.language({ textId: "Select role to notify about new giveaway", guildId: interaction.guildId, locale: interaction.locale })}`,
		                    components: [
		                        new ActionRowBuilder()
		                            .addComponents(
		                                new RoleSelectMenuBuilder()
		                                    .setCustomId(`manager-giveaways_settings_giveawaysNotification_select`)
		                            ),
		                        new ActionRowBuilder()
		                            .addComponents(
										new ButtonBuilder()
											.setCustomId(`manager-giveaways_settings_giveawaysNotification_delete`)
											.setLabel(client.language({ textId: "DELETE", guildId: interaction.guildId, locale: interaction.locale }))
											.setStyle(ButtonStyle.Danger)
											.setDisabled(!settings.roles.giveawaysNotification),
		                                new ButtonBuilder()
		                                    .setCustomId(`manager-giveaways_settings_giveawaysNotification_cancel`)
		                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
		                                    .setStyle(ButtonStyle.Danger)
		                            )
		                    ],
		                    flags: ["Ephemeral"]
		                })    
		                const filter = (i) => i.customId.includes(`manager-giveaways_settings_giveawaysNotification`) && i.user.id === interaction.user.id
		                const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
		                if (interaction2) {
		                    if (interaction2.customId === "manager-giveaways_settings_giveawaysNotification_select") {
		                    	const role = interaction2.roles.first()
		                        settings.roles.giveawaysNotification = role.id
		                        await settings.save()
		                        interaction2.update({ content: `${client.config.emojis.YES}`, components: [], flags: ["Ephemeral"] })
		                    }
		                    if (interaction2.customId === "manager-giveaways_settings_giveawaysNotification_cancel") {
		                        interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
		                        return interaction.editReply({ components: components })
		                    }
							if (interaction2.customId === "manager-giveaways_settings_giveawaysNotification_delete") {
								settings.roles.giveawaysNotification = undefined
		                        await settings.save()
		                        interaction2.update({ content: `${client.config.emojis.YES}`, components: [], flags: ["Ephemeral"] })
							}
		                }
    				}
    			}
    			const embed = new EmbedBuilder()
    				.setColor(3093046)
    				.setTitle(`${client.language({ textId: "Settings", guildId: interaction.guildId, locale: interaction.locale })}`)
    				.setFields([
    					{
    						name: `${client.language({ textId: "Permission for accepting/declining giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
    						value: client.cache.permissions.find(e => e.id === settings.giveawayManagerPermission)?.name || settings.giveawayManagerPermission || `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}`
    					},
    					{
    						name: `${client.language({ textId: "Permission for rerolling giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
    						value: client.cache.permissions.find(e => e.id === settings.giveawayRerollPermission)?.name || settings.giveawayRerollPermission || `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}`
    					},
    					{
    						name: `${client.language({ textId: "Standard giveaway channel", guildId: interaction.guildId, locale: interaction.locale })}`,
    						value: settings.channels.giveawaysChannelId ? `<#${settings.channels.giveawaysChannelId}>` : `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}`
    					},
    					{
    						name: `${client.language({ textId: "Channel for accepting user giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
    						value: settings.channels.giveawaysMeetingRoom ? `<#${settings.channels.giveawaysMeetingRoom}>` : `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}`
    					},
    					{
    						name: `${client.language({ textId: "Role for new giveaway notification", guildId: interaction.guildId, locale: interaction.locale })}`,
    						value: settings.roles.giveawaysNotification ? `<@&${settings.roles.giveawaysNotification}>` : `${client.language({ textId: "Not set", guildId: interaction.guildId, locale: interaction.locale })}`
    					}
					])
    			const menu = new StringSelectMenuBuilder()
    				.setCustomId(`cmd{manager-giveaways}settingsedit`)
    				.setOptions([
	    				{
	    					label: `${client.language({ textId: "Permission for accepting/declining giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
	    					value: `giveawayManagerPermission`,
	    					description: client.cache.permissions.find(e => e.id === settings.giveawayManagerPermission)?.name || undefined
	    				},
	    				{
	    					label: `${client.language({ textId: "Permission for rerolling giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
	    					value: `giveawayRerollPermission`,
	    					description: client.cache.permissions.find(e => e.id === settings.giveawayRerollPermission)?.name || undefined
	    				},
	    				{
	    					label: `${client.language({ textId: "Standard giveaway channel", guildId: interaction.guildId, locale: interaction.locale })}`,
	    					value: `giveawaysChannelId`
	    				},
	    				{
	    					label: `${client.language({ textId: "Channel for accepting user giveaways", guildId: interaction.guildId, locale: interaction.locale })}`,
	    					value: `giveawaysMeetingRoom`
	    				},
	    				{
	    					label: `${client.language({ textId: "Role for new giveaway notification", guildId: interaction.guildId, locale: interaction.locale })}`,
	    					value: `giveawaysNotification`
	    				}
					])
					.setPlaceholder(`${client.language({ textId: "Select to edit", guildId: interaction.guildId, locale: interaction.locale })}`)
				if (interaction.isButton()) return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], flags: ["Ephemeral"] })
				else {
					if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] })
					else return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] })
				}
    		}
    		if (interaction.customId.includes("list")) {
    			let giveaways = client.cache.giveaways.filter(e => e.guildID === interaction.guildId && e.status === "started")
    			giveaways = Array.from(giveaways, ([key, value]) => {
    				return value
    			})
    			if (!giveaways.length) {
	                const embed = new EmbedBuilder()
		                .setColor(3093046)
		                .setDescription(`😞 ${client.language({ textId: "No giveaways yet", guildId: interaction.guildId, locale: interaction.locale })}.`)
	                const returnBTN = new ButtonBuilder()
	                	.setStyle(ButtonStyle.Danger)
	                	.setEmoji(client.config.emojis.arrowLeft)
	                	.setCustomId(`cmd{manager-giveaways}`)
	                const firstRow = new ActionRowBuilder().addComponents([returnBTN])
	                return interaction.update({ embeds: [embed], components: [firstRow] })
	            }
	            let index = 0
	            if (interaction.customId.includes(`page`)) {
	                const modal = new ModalBuilder()
	                    .setCustomId(`manager-giveaways_page_${interaction.id}`)
	                    .setTitle(`${client.language({ textId: "Page", guildId: interaction.guildId, locale: interaction.locale })}`)
						.setLabelComponents([
							new LabelBuilder()
								.setLabel(`${client.language({ textId: "Page number", guildId: interaction.guildId, locale: interaction.locale })}`)
								.setTextInputComponent(
									new TextInputBuilder()
	                                    .setCustomId("page")
	                                    .setRequired(true)
	                                    .setStyle(TextInputStyle.Short)
								),
						])
	                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
	                const filter = (i) => i.customId === `manager-giveaways_page_${interaction.id}` && i.user.id === interaction.user.id
	                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
	                if (interaction && interaction.type === InteractionType.ModalSubmit) {
	                    const modalArgs = {}
	                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
	                    if (isNaN(+modalArgs.page) || !Number.isInteger(+modalArgs.page)) {
	                    	return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.page}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
	                    }
						modalArgs.page = +modalArgs.page
	                    if (modalArgs.page < 1 || modalArgs.page > giveaways.length) {
	                    	return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This page does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
	                    }
	                    index = modalArgs.page - 1
	                } else return
	            } else {
	                if (interaction.customId.includes(`giveaway{`)) index = giveaways.findIndex(e => e.giveawayID === GiveawayRegexp.exec(interaction.customId)[1])
	                else index = +IndexRegexp.exec(interaction.customId)[1]
	            }
	        	if (interaction.customId.includes(`delete`)) {
	                interaction.guild.channels.fetch(giveaways[index].channelId).then(channel => channel.messages.fetch({ message: giveaways[index].messageId, cache: false, force: true }).then(message => message.delete())).catch(e => null)
	                const giveaway = client.cache.giveaways.get(GiveawayRegexp.exec(interaction.customId)[1])
	                if (!giveaway) {
	                	return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "This giveaway no longer exists", guildId: interaction.guildId, locale: interaction.locale })}` })
	                }
	                await giveaway.delete()
	                index = 0
	                giveaways = client.cache.giveaways.filter(e => e.guildID === interaction.guildId && e.status === "started")
	    			giveaways = Array.from(giveaways, ([key, value]) => {
	    				return value
	    			})
	            }
	            if (interaction.customId.includes(`end`)) {
	            	const giveaway = client.cache.giveaways.get(GiveawayRegexp.exec(interaction.customId)[1])
	                if (!giveaway) {
	                	return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "This giveaway no longer exists", guildId: interaction.guildId, locale: interaction.locale })}` })
	                }
					giveaway.clearTimeoutEnd()
					giveaway.clearTimeoutDelete()
					client.emit("giveawayEnd", giveaway)
	                index = 0
	                giveaways = client.cache.giveaways.filter(e => e.guildID === interaction.guildId && e.status === "started" && e.giveawayID !== giveaway.giveawayID)
	    			giveaways = Array.from(giveaways, ([key, value]) => {
	    				return value
	    			})
	            }
				if (!giveaways.length) {
	                const embed = new EmbedBuilder()
		                .setColor(3093046)
		                .setDescription(`😞 ${client.language({ textId: "No giveaways yet", guildId: interaction.guildId, locale: interaction.locale })}.`)
	                const returnBTN = new ButtonBuilder()
	                	.setStyle(ButtonStyle.Danger)
	                	.setEmoji(client.config.emojis.arrowLeft)
	                	.setCustomId(`cmd{manager-giveaways}`)
	                const firstRow = new ActionRowBuilder().addComponents([returnBTN])
	                return interaction.update({ embeds: [embed], components: [firstRow] })
	            }
	            const giveaway = giveaways[index]
	            const first_page_btn = new ButtonBuilder()
	            	.setEmoji(`${client.config.emojis.arrowLeft2}`)
	            	.setStyle(ButtonStyle.Primary)
	            	.setCustomId(`cmd{manager-giveaways}index{0}list1`)
	            	.setDisabled((index !== 0 && index !== giveaways.length - 1) || (giveaways.length !== 1 && index == giveaways.length - 1) ? false : true)
	            const previous_page_btn = new ButtonBuilder()
	            	.setEmoji(`${client.config.emojis.arrowLeft}`)
	            	.setStyle(ButtonStyle.Primary)
	            	.setCustomId(`cmd{manager-giveaways}index{${index-1}}list2`)
	            	.setDisabled((index !== 0 && index !== giveaways.length - 1) || (giveaways.length !== 1 && index == giveaways.length - 1) ? false : true)
	            const select_page_btn = new ButtonBuilder()
	            	.setLabel(`${(index+1).toString()}/${giveaways.length}`)
	            	.setStyle(ButtonStyle.Secondary)
	            	.setCustomId(`cmd{manager-giveaways}listpage`)
	            	.setDisabled(giveaways.length <= 1)
	            const next_page_btn = new ButtonBuilder()
	            	.setEmoji(`${client.config.emojis.arrowRight}`)
	            	.setStyle(ButtonStyle.Primary)
	            	.setCustomId(`cmd{manager-giveaways}index{${index+1}}list3`)
	            	.setDisabled((giveaways.length !== 1 && index == 0) || (index !== 0 && index !== giveaways.length - 1) ? false : true)
	            const last_page_btn = new ButtonBuilder()
	            	.setEmoji(`${client.config.emojis.arrowRight2}`)
	            	.setStyle(ButtonStyle.Primary)
	            	.setCustomId(`cmd{manager-giveaways}index{${giveaways.length - 1}}list4`)
	            	.setDisabled((giveaways.length !== 1 && index == 0) || (index !== 0 && index !== giveaways.length - 1) ? false : true)
	            const array_btn = [first_page_btn, previous_page_btn, select_page_btn, next_page_btn, last_page_btn]
	            const deleteGiveaway_btn = new ButtonBuilder()
	                .setStyle(ButtonStyle.Danger)
	                .setLabel(`${client.language({ textId: "Delete", guildId: interaction.guildId, locale: interaction.locale })}`)
	                .setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}listdelete`)
	                .setDisabled(!interaction.member.permissions.has("Administrator"))
	            const endGiveaway_btn = new ButtonBuilder()
	                .setStyle(ButtonStyle.Success)
	                .setLabel(`${client.language({ textId: "Finish", guildId: interaction.guildId, locale: interaction.locale })}`)
	                .setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}listend`)
	                .setDisabled(!interaction.member.permissions.has("Administrator"))
				const back_btn = new ButtonBuilder()
	                .setStyle(ButtonStyle.Secondary)
	                .setLabel(`${client.language({ textId: "Back", guildId: interaction.guildId, locale: interaction.locale })}`)
	                .setCustomId(`cmd{manager-giveaways}`)
	            const embed = new EmbedBuilder()
	    			.setColor(3093046)
	    			.setDescription([
	    				giveaway.description ? giveaway.description : false,
	    				giveaway.permission ? `${client.language({ textId: "Permission", guildId: interaction.guildId, locale: interaction.locale })}: ${client.cache.permissions.find(e => e.id === giveaway.permission)?.name || giveaway.permission}` : false,
	    				`${client.language({ textId: "Giveaway", guildId: interaction.guildId, locale: interaction.locale })}: https://discord.com/channels/${interaction.guildId}/${giveaway.channelId}/${giveaway.messageId}`,
	    				`${client.language({ textId: "Number of winners", guildId: interaction.guildId, locale: interaction.locale })}: ${giveaway.winnerCount }`,
	    				`${client.language({ textId: "Ending", guildId: interaction.guildId, locale: interaction.locale })}: ${[giveaway.endsTime ? `<t:${Math.floor(giveaway.endsTime.getTime() / 1000)}>` : undefined, giveaway.ends?.type === "members" ? `${client.language({ textId: "By achievement", guildId: interaction.guildId, locale: interaction.locale })} ${giveaway.ends.amount} ${client.language({ textId: "participants", guildId: interaction.guildId, locale: interaction.locale })}` : undefined, , giveaway.ends?.type === "reaction" ? `${client.language({ textId: "By achievement", guildId: interaction.guildId, locale: interaction.locale })} ${giveaway.ends.amount} ${client.language({ textId: "reactions", guildId: interaction.guildId, locale: interaction.locale })}` : undefined].filter(e => e).join(` ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} `)}`,
	    				`${client.language({ textId: "Creator", guildId: interaction.guildId, locale: interaction.locale })}: <@${giveaway.creator}>`,
	    				`${client.language({ textId: "Rewards", guildId: interaction.guildId, locale: interaction.locale })}: ${await Promise.all(giveaway.rewards.map(async e => {
								if (e.type === RewardType.Currency) {
	                                return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.amount})`
	                            } else
	                            if (e.type === RewardType.Experience) {
	                                return `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })} (${e.amount})`
	                            } else
	                            if (e.type === RewardType.Reputation) {
	                                return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })} (${e.amount})`
	                            } else if (e.type === RewardType.Item) {
	                                const item = client.cache.items.find(i => i.itemID === e.id && !i.temp && i.enabled)
	                                if (item) return `${item.displayEmoji}${item.name} (${e.amount})`
	                                else return `${e.id} (${e.amount})`
	                            } else if (e.type === RewardType.Text) {
	                                return `📝${e.id} (${e.amount})`
	                            } else if (e.type === RewardType.Role) {
	                                return `<@&${e.id}>${e.ms ? ` [${client.functions.transformSecs(client, e.ms, interaction.guildId, interaction.locale)}]` : ``} (${e.amount})`
	                            }
	    				})).then(array => array.join(", "))}`,
					].filter(e => e).join("\n"))
					.setThumbnail(giveaway.thumbnail || null)
					.setFooter({ text: `ID: ${giveaway.giveawayID}` })
				return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(array_btn), new ActionRowBuilder().addComponents(back_btn, endGiveaway_btn, deleteGiveaway_btn)] })
    		}
    		let giveaway
    		if (interaction.customId.includes("create")) {
				if (interaction.customId.includes("user")) {
					if (!settings.channels.giveawaysChannelId) {
						return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Giveaway channel not configured on this server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
				}
    			giveaway = client.cache.giveaways.find(e => e.creator === interaction.user.id && e.guildID === interaction.guildId && e.status === "temp" && (interaction.customId.includes("adm") ? e.type === "adm" : e.type === "user"))
    			if (!giveaway) {
	                giveaway = new client.giveawaySchema({
	                	giveawayID: uniqid.time(),
	                    creator: interaction.user.id,
	                    type: interaction.customId.includes("adm") ? "adm" : "user",
	                    channelId: interaction.customId.includes("adm") ? undefined : settings.channels.giveawaysChannelId,
	                    guildID: interaction.guildId,
	                    rewards: [],
	                    deleteTemp: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
	                    status: "temp"
	                })
	                await giveaway.save()
	                giveaway = new Giveaway(client, giveaway)
	                client.cache.giveaways.set(giveaway.giveawayID, giveaway)
    			}
    		} else {
    			giveaway = client.cache.giveaways.find(e => e.giveawayID === GiveawayRegexp.exec(interaction.customId)[1])
    		}
    		if (!giveaway) {
    			return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "This giveaway no longer exists", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
    		}
    		if (giveaway.status !== "temp") {
    			return interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "This giveaway can no longer be edited", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [] })
    		}
    		if (interaction.customId.includes("time")) {
                let date = giveaway.endsTime ? format(new Date(giveaway.endsTime.getTime() + new Date().getTimezoneOffset() *1 * 60 * 1000), 'DD-MM-YYYY HH:mm') : undefined
                const modal = new ModalBuilder()
                	.setCustomId(`manager-giveaways_time_${interaction.id}`)
                	.setTitle(`${client.language({ textId: "Giveaway end date (UTC)", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setLabelComponents([
						new LabelBuilder()
							.setLabel(`${client.language({ textId: "Date in UTC", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setTextInputComponent(
								new TextInputBuilder()
		                            .setCustomId("date")
		                            .setRequired(false)
		                            .setStyle(TextInputStyle.Short)
		                            .setValue(giveaway.endsTime ? date : format(new Date(Date.now() + 900000 + new Date().getTimezoneOffset() *1 * 60 * 1000), 'DD-MM-YYYY HH:mm'))
		                            .setPlaceholder(`${format(new Date(Date.now() + 900000 + new Date().getTimezoneOffset() *1 * 60 * 1000), 'DD-MM-YYYY HH:mm')}`)
							),
					])
				await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
				const filter = (i) => i.customId === `manager-giveaways_time_${interaction.id}` && i.user.id === interaction.user.id
				interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
				if (interaction && interaction.isModalSubmit()) {
					const modalArgs = {}
					interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
					if (!modalArgs.date) giveaway.endsTime = undefined
					else {
						date = parse(modalArgs.date, 'DD-MM-YYYY HH:mm')
						date = new Date(date.setMinutes(date.getMinutes() - new Date().getTimezoneOffset()))
						if (isNaN(date.getTime())) {
							return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Invalid date format entered. Correct date format: 28-07-2033 16:57.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
						if (date <= new Date()) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "End date cannot be in the past", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						giveaway.endsTime = date
					}
					await giveaway.save()
				} else return
    		} else
    		if (interaction.customId.includes("winners")) {
                const modal = new ModalBuilder()
                	.setCustomId(`manager-giveaways_winners_${interaction.id}`)
                	.setTitle(`${client.language({ textId: "Number of winners", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setLabelComponents([
						new LabelBuilder()
							.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setTextInputComponent(
								new TextInputBuilder()
		                            .setCustomId("amount")
		                            .setRequired(true)
		                            .setStyle(TextInputStyle.Short)
		                            .setValue(`${giveaway.winnerCount || ""}`)
							),
					])
				await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
				const filter = (i) => i.customId === `manager-giveaways_winners_${interaction.id}` && i.user.id === interaction.user.id
				interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
				if (interaction && interaction.isModalSubmit()) {
					const modalArgs = {}
					interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
					if (isNaN(+modalArgs.amount) || !Number.isInteger(+modalArgs.amount)) {
						return interaction.reply({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not an integer", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
					}
					modalArgs.amount = +modalArgs.amount
					if (modalArgs.amount <= 0 || modalArgs.amount > 100) {
						return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Number should not be", guildId: interaction.guildId, locale: interaction.locale })} <= 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100`, flags: ["Ephemeral"] })
					}
					giveaway.winnerCount = modalArgs.amount
					await giveaway.save()
				} else return
    		} else
    		if (interaction.customId.includes("description")) {
                const modal = new ModalBuilder()
                	.setCustomId(`manager-giveaways_description_${interaction.id}`)
                	.setTitle(`${client.language({ textId: "Description and icon", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setLabelComponents([
						new LabelBuilder()
							.setLabel(`${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setTextInputComponent(
								new TextInputBuilder()
		                            .setCustomId("description")
		                            .setRequired(false)
		                            .setStyle(TextInputStyle.Paragraph)
		                            .setMaxLength(300)
		                            .setValue(`${giveaway.description || ""}`)
							),
						new LabelBuilder()
							.setLabel(`${client.language({ textId: "Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setTextInputComponent(
								new TextInputBuilder()
		                            .setCustomId("link")
		                            .setRequired(false)
		                            .setStyle(TextInputStyle.Short)
		                            .setValue(`${giveaway.thumbnail || ""}`)
							),
					])
				await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
				const filter = (i) => i.customId === `manager-giveaways_description_${interaction.id}` && i.user.id === interaction.user.id
				interaction = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction)
				if (interaction && interaction.isModalSubmit()) {
					const modalArgs = {}
					interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
					if (modalArgs.description.length) {
						giveaway.description = modalArgs.description
					} else giveaway.description = undefined
					if (modalArgs.link.length) {
						const image = await isImageURL(modalArgs.link)
						if (image) giveaway.thumbnail = modalArgs.link
						else {
							await interaction.deferUpdate()
							interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.link}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
						}
					} else giveaway.thumbnail = null
					await giveaway.save()
				} else return
    		} else
    		if (interaction.customId.includes("channel")) {
    			const components = JSON.parse(JSON.stringify(interaction.message.components))
    			interaction.message.components.forEach(row => row.components.forEach(component => {
                    component.data.disabled = true
                }))
    			await interaction.update({ components: interaction.message.components })
                await interaction.followUp({ 
                    content: `${client.language({ textId: "Select channel for giveaway", guildId: interaction.guildId, locale: interaction.locale })}`,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ChannelSelectMenuBuilder()
                                    .setCustomId(`manager-giveaways_channels_select`)
									.setChannelTypes(ChannelType.AnnouncementThread, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PrivateThread, ChannelType.PublicThread)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`manager-giveaways_channels_cancel`)
                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger)
                            )
                    ],
                    flags: ["Ephemeral"]
                })    
                const filter = (i) => i.customId.includes(`manager-giveaways_channels`) && i.user.id === interaction.user.id
                const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
                if (interaction2) {
                    if (interaction2.customId === "manager-giveaways_channels_select") {
                        giveaway.channelId = interaction2.channels.first().id
                        await giveaway.save()
                        interaction2.update({ content: `${client.config.emojis.YES}`, components: [], flags: ["Ephemeral"] })
                    }
                    if (interaction2.customId === "manager-giveaways_channels_cancel") {
                        interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                        return interaction.editReply({ components: components })
                    }
                }
    		} else
    		if (interaction.customId.includes("permission")) {
                if (!client.cache.permissions.some(e => e.guildID === interaction.guildId)) {
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "No permission presets found on the server. To create a preset use command </manager-permissions create:1150455842294988943>.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const modal = new ModalBuilder()
                    .setCustomId(`manager-giveaways_permission_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Set permission", guildId: interaction.guildId, locale: interaction.locale })}`)
					.setLabelComponents([
						new LabelBuilder()
							.setLabel(`${client.language({ textId: "Permission name", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setTextInputComponent(
								new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(false)
                                    .setValue(`${client.cache.permissions.find(e => e.id === giveaway.permission)?.name || ""}`)
                                    .setStyle(TextInputStyle.Short)
							),
					])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `manager-giveaways_permission_${interaction.id}` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!modalArgs.name) {
                        giveaway.permission = undefined
						await giveaway.save()
                    } else {
                        const permission = client.cache.permissions.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && e.guildID === interaction.guildId)
                        if (!permission) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Permission with name", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.name}** ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        giveaway.permission = permission.id
                        await giveaway.save()
                    }
                } else return
            } else
    		if (interaction.customId.includes("rewards")) {
                const components = JSON.parse(JSON.stringify(interaction.message.components))
                interaction.message.components.forEach(row => row.components.forEach(component => {
                    component.data.disabled = true
                }))
                await interaction.update({ components: interaction.message.components })
                await interaction.followUp({ 
                    content: `${client.language({ textId: "Select what you want to give away", guildId: interaction.guildId, locale: interaction.locale })}`,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                            	...[
	                                new ButtonBuilder()
	                                    .setCustomId("manager-giveaways_add_reward_item")
	                                    .setLabel(client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale }))
	                                    .setEmoji(client.config.emojis.box)
	                                    .setStyle(ButtonStyle.Secondary),
	                                new ButtonBuilder()
	                                    .setCustomId("manager-giveaways_add_reward_currency")
	                                    .setLabel(settings.currencyName)
	                                    .setEmoji(client.config.emojis.coin)
	                                    .setStyle(ButtonStyle.Secondary),
	                                giveaway.type === "adm" ? 
	                                	new ButtonBuilder()
		                                    .setCustomId("manager-giveaways_add_reward_xp")
		                                    .setLabel(`${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}`)
		                                    .setEmoji(client.config.emojis.XP)
		                                    .setStyle(ButtonStyle.Secondary) : false,
		                            giveaway.type === "adm" ?
		                                new ButtonBuilder()
		                                    .setCustomId("manager-giveaways_add_reward_rp")
		                                    .setLabel(`${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`)
		                                    .setEmoji(client.config.emojis.RP)
		                                    .setStyle(ButtonStyle.Secondary) : false,
	                                new ButtonBuilder()
	                                    .setCustomId("manager-giveaways_add_reward_other")
	                                    .setLabel(client.language({ textId: "Other", guildId: interaction.guildId, locale: interaction.locale }))
	                                    .setStyle(ButtonStyle.Secondary)
                               	].filter(e => e)
                            ),
							new ActionRowBuilder()
                            .addComponents(
								new ButtonBuilder()
									.setCustomId("manager-giveaways_add_reward_role")
									.setLabel(client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale }))
									.setEmoji(client.config.emojis.box)
									.setStyle(ButtonStyle.Secondary),
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId("manager-giveaways_add_reward_cancel")
                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger),
                            ),
                    ],
                    flags: ["Ephemeral"]
                })
                const filter = (i) => i.customId.includes(`manager-giveaways_add_reward`) && i.user.id === interaction.user.id
                let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
                if (interaction2 && interaction2.customId.includes("manager-giveaways_add_reward")) {
                	let type
                    let itemID
                    let amount
					let ms
                    if (interaction2.customId.includes("item")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-giveaways_rewards_add_item_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Item name", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
                                            .setCustomId("name")
                                            .setMinLength(2)
                                            .setMaxLength(30)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
									),
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
                                            .setCustomId("amount")
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
									),
							])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `manager-giveaways_rewards_add_item_${interaction.id}` && i.user.id === interaction.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                        if (interaction2 && interaction2.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            const item = client.cache.items.find(e => e.name.toLowerCase() === modalArgs.name.toLowerCase() && !e.temp && e.enabled && e.guildID === interaction.guildId)
                            if (!item) {
                                await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Such item does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                                return interaction.editReply({ components: components })
                            }
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
							modalArgs.amount = +modalArgs.amount
                            if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
                                await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            if (giveaway.type === "user") {
                            	if (item.notGiveawayable) {
                            		await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "cannot be given away", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                	return interaction.editReply({ components: components })
                            	}
                            	const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                            	const userItem = profile.inventory.find(e => e.itemID === item.itemID)
                            	if (!userItem || userItem.amount < modalArgs.amount) {
                            		await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Insufficient items in inventory", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${item.displayEmoji}**${item.name}** (${userItem?.amount || 0})`, components: [], flags: ["Ephemeral"] })
                                	return interaction.editReply({ components: components })
                            	}
                            }
                            type = RewardType.Item
                            itemID = item.itemID
                            amount = modalArgs.amount
                            interaction2.update({ content: client.config.emojis.YES, components: [] })
                        } else return
                    } else
                    if (interaction2.customId.includes("currency")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-giveaways_rewards_add_currency_${interaction.id}`)
                            .setTitle(settings.currencyName)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
                                            .setCustomId("amount")
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
									),
							])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `manager-giveaways_rewards_add_currency_${interaction.id}` && i.user.id === interaction.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 30000 }).catch(e => interaction)
                        if (interaction2 && interaction2.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
							modalArgs.amount = +modalArgs.amount
                            if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
                                await interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            if (giveaway.type === "user") {
                            	const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                            	if (profile.currency < modalArgs.amount) {
                            		await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Insufficient currency in inventory", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })}: ${settings.displayCurrencyEmoji}**${settings.currencyName}** (${profile.currency})`, components: [], flags: ["Ephemeral"] })
                                	return interaction.editReply({ components: components })
                            	}
                            }
                            amount = modalArgs.amount
                            type = RewardType.Currency
                            interaction2.update({ content: client.config.emojis.YES, components: [] })
                        } else return
                    } else
                    if (interaction2.customId.includes("xp")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-giveaways_rewards_add_xp_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
                                            .setCustomId("amount")
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
									),
							])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `manager-giveaways_rewards_add_xp_${interaction.id}` && i.user.id === interaction.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 30000 }).catch(e => interaction)
                        if (interaction2 && interaction2.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
							modalArgs.amount = +modalArgs.amount
                            if (modalArgs.amount < 0 || modalArgs.amount > 100000000000) {
                                await interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            amount = modalArgs.amount
                            type = RewardType.Experience
                            interaction2.update({ content: client.config.emojis.YES, components: [] })
                        } else return
                    } else
                    if (interaction2.customId.includes("rp")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-giveaways_rewards_add_rp_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
                                            .setCustomId("amount")
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
									),
							])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `manager-giveaways_rewards_add_rp_${interaction.id}` && i.user.id === interaction.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 30000 }).catch(e => interaction)
                        if (interaction2 && interaction2.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
							modalArgs.amount = +modalArgs.amount
                            if (modalArgs.amount < -1000 || modalArgs.amount > 1000) {
                                await interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 1000 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            amount = modalArgs.amount
                            type = RewardType.Reputation
                            interaction2.update({ content: client.config.emojis.YES, components: [] })
                        } else return
                    } else
                    if (interaction2.customId.includes("other")) {
                        const modal = new ModalBuilder()
                            .setCustomId(`manager-giveaways_rewards_add_other_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Other", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
                                            .setCustomId("name")
                                            .setMinLength(2)
                                            .setMaxLength(50)
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
									),
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
                                            .setCustomId("amount")
                                            .setRequired(true)
                                            .setStyle(TextInputStyle.Short)
									),
							])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `manager-giveaways_rewards_add_other_${interaction.id}` && i.user.id === interaction.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
                        if (interaction2 && interaction2.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
							modalArgs.amount = +modalArgs.amount
                            if (modalArgs.amount < -100000000000 || modalArgs.amount > 100000000000) {
                                await interaction.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < -100000000000 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 100000000000`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
                            amount = modalArgs.amount
                            type = RewardType.Text
                            itemID = modalArgs.name
                            interaction2.update({ content: client.config.emojis.YES, components: [] })
                        } else return
                    } else
					if (interaction2.customId.includes("role")) {
						if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
							interaction.message.components.forEach(row => row.components.forEach(component => {
								component.data.disabled = false
							}))
							await interaction.update({ components: interaction.message.components })
							return interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "I don't have permission to manage roles", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
						}
						await interaction2.update({ 
							components: [
								new ActionRowBuilder()
									.addComponents(
										new RoleSelectMenuBuilder()
											.setCustomId(`addRole`)
											.setPlaceholder(`${client.language({ textId: "Select role", guildId: interaction.guildId, locale: interaction.locale })}...`)
									),
								new ActionRowBuilder().addComponents(
									new ButtonBuilder()
										.setCustomId("addRoleCancel")
										.setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
										.setStyle(ButtonStyle.Danger)
								)
							],
							flags: ["Ephemeral"]
						})    
						const filter = (i) => i.customId.includes(`addRole`) && i.user.id === interaction.user.id
						interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
						if (interaction2 && interaction2.customId.includes("addRole")) {
							if (interaction2.customId === "addRole") {
								const role = interaction2.roles.first()
								if (!interaction.guild.members.me.permissions.has("ManageRoles") || interaction.guild.members.me.roles.highest.position <= role.position) {
									interaction2.update({ content: `${client.config.emojis.NO}${client.language({ textId: "No permission to manage this role", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
									interaction.message.components.forEach(row => row.components.forEach(component => {
										component.data.disabled = false
									}))
									return interaction.editReply({ components: interaction.message.components })
								}
								let roleInventory
								if (giveaway.type === "user" && amount !== 0) {
									const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
									if (roleProperties && roleProperties.cannotGiveaway) {
										await interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be given away", guildId: interaction.guildId, locale: interaction.locale })}**`, components: [], flags: ["Ephemeral"] })
										interaction.message.components.forEach(row => row.components.forEach(component => {
											component.data.disabled = false
										}))
										return interaction.editReply({ components: interaction.message.components })
									}
									const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
									roleInventory = profile.inventoryRoles?.find(e => { return e.id === role.id })
									if (!roleInventory) {
										await interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })} <@&${role.id}> (0)**`, flags: ["Ephemeral"] })
										interaction.message.components.forEach(row => row.components.forEach(component => {
											component.data.disabled = false
										}))
										return interaction.editReply({ components: interaction.message.components })
									}
									if (profile.inventoryRoles?.filter(e => { return e.id === role.id }).length > 1) {
										await interaction2.update({ 
											components: [
												new ActionRowBuilder()
													.addComponents(
														new StringSelectMenuBuilder()
															.setCustomId(`addInventoryRole`)
															.setPlaceholder(`${client.language({ textId: "Select role", guildId: interaction.guildId, locale: interaction.locale })}...`)
															.setOptions(profile.inventoryRoles.filter(e => e.id === role.id).slice(0, 24).map((e, index) => {
																const role = interaction.guild.roles.cache.get(e.id)
																return {
																	label: `${role?.name || e.id}${e.ms ? ` [${client.functions.transformSecs(client, e.ms, interaction.guildId, interaction.locale)}]` : ``} (${e.amount})`,
																	value: `${e.uniqId}`
																}
															}))
													),
											],
											flags: ["Ephemeral"]
										})    
										const filter = (i) => i.customId.includes(`addInventoryRole`) && i.user.id === interaction.user.id
										interaction2 = await interaction2.channel.awaitMessageComponent({ filter, time: 30000 }).catch(e => null)
										if (interaction2 && interaction2.customId.includes("addInventoryRole")) {
											roleInventory = profile.inventoryRoles.find(e => e.uniqId === interaction2.values[0])
										}	
									}
									ms = roleInventory.ms
								}
								const modal = new ModalBuilder()
									.setCustomId(`manager-giveaways_addRoleAmount_${interaction2.id}`)
									.setTitle(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setLabelComponents([
										new LabelBuilder()
											.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
											.setTextInputComponent(
												new TextInputBuilder()
													.setCustomId("amount")
													.setRequired(true)
													.setStyle(TextInputStyle.Short)
											),
									])
								await interaction2.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
								const filter = (i) => i.customId === `manager-giveaways_addRoleAmount_${interaction2.id}` && i.user.id === interaction.user.id
								interaction2 = await interaction2.awaitModalSubmit({ filter, time: 120000 }).catch(e => interaction2)
								if (interaction2 && interaction2.type === InteractionType.ModalSubmit) {
									const modalArgs = {}
									interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
									if (isNaN(+modalArgs.amount)) {
										await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
										interaction.message.components.forEach(row => row.components.forEach(component => {
											component.data.disabled = false
										}))
										return interaction.editReply({ components: interaction.message.components })
									}
									modalArgs.amount = +modalArgs.amount
									if (modalArgs.amount < 0 || modalArgs.amount > 1000000000) {
										await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "Quantity must not be", guildId: interaction.guildId, locale: interaction.locale })} < 0 ${client.language({ textId: "or", guildId: interaction.guildId, locale: interaction.locale })} > 1000000000`, flags: ["Ephemeral"] })
										interaction.message.components.forEach(row => row.components.forEach(component => {
											component.data.disabled = false
										}))
										return interaction.editReply({ components: interaction.message.components })
									}
									if (!roleInventory || roleInventory.amount < amount) {
										await interaction2.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })} <@&${role.id}> (${roleInventory?.amount || 0})**`, flags: ["Ephemeral"] })
										interaction.message.components.forEach(row => row.components.forEach(component => {
											component.data.disabled = false
										}))
										return interaction.editReply({ components: interaction.message.components })
									}
									type = RewardType.Role
									itemID = role.id
									amount = modalArgs.amount
									await interaction2.update({ content: client.config.emojis.YES, embeds: [], components: [] })
								}
							} else {
								interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
								interaction.message.components.forEach(row => row.components.forEach(component => {
									component.data.disabled = false
								}))
								return interaction.editReply({ components: interaction.message.components })
							}
						}
					} else
                    if (interaction2.customId.includes("cancel")) {
                        interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                        return interaction.editReply({ components: components })
                    }
                    const item = giveaway.rewards.find(e => { return e.id === itemID && e.type === type })
                    if (item) {
                        if (amount === 0) {
                            giveaway.rewards = giveaway.rewards.filter(e => e.id !== itemID && e.type !== type && e.ms !== ms)
                        } else {
                            item.amount = amount
                        }
                    } else if (amount !== 0) {
                        if (giveaway.rewards.length >= 10) {
                            await interaction.update({ components: components })
                            return interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Maximum number of giveaway items reached", guildId: interaction.guildId, locale: interaction.locale })}: 10` })
                        }
                        giveaway.rewards.push({
                        	type: type,
                            id: itemID,
                            amount: amount,
							ms: ms
                        })
                    }
                    await giveaway.save()
                }
            } else
            if (interaction.customId.includes("finish")) {
            	if ((!giveaway.endsTime && !giveaway.ends) || !giveaway.channelId || !giveaway.winnerCount || !giveaway.rewards.length) {
            		return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "End time, channel, number of winners, reward: required fields", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            	}
            	if (giveaway.type === "user" && !settings.channels.giveawaysMeetingRoom) {
            		return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Giveaway acceptance channel not configured on this server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            	}
            	if (giveaway.type === "user" && settings.channels.giveawaysMeetingRoom) {
            		const channel = await interaction.guild.channels.fetch(settings.channels.giveawaysMeetingRoom).catch(e => null)
            		if (!channel) {
            			return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Giveaway acceptance channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            		}
            		if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages")) {
            			return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I don't have permission to send messages to giveaway acceptance channel", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            		}
            	}
            	const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(e => null)
            	if (!channel) {
        			return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Giveaway channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        		}
            	if (!channel.permissionsFor(interaction.guild.members.me).has("SendMessages") || !channel.permissionsFor(interaction.guild.members.me).has("AddReactions")) {
            		return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "For channel", guildId: interaction.guildId, locale: interaction.locale })} <#${giveaway.channelId}> ${client.language({ textId: "I need the following permissions:\n1. Send Messages\n2. Add Reactions", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            	}
				if (giveaway.endsTime <= new Date()) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "End date cannot be in the past", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
				if (giveaway.rewards.some(e => e.type === RewardType.Role && giveaway.winnerCount > 1)) {
					return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "When giving away role, number of winners cannot exceed one", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
				}
                await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
            	const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                let canGiveaway = true
                if (giveaway.type === "user") {
					const subtract = {
						currency: 0,
						items: {},
						roles: {}
					}
	                for (const element of giveaway.rewards) {
	                    if (element.type === RewardType.Currency) {
	                    	if (profile.currency < element.amount) {
	                    		canGiveaway = false
	                            if (canGiveaway) await interaction.editReply({ embeds: interaction.message.embeds, components: components })
	                    		interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have enough", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji}${element.amount - profile.currency}`, flags: ["Ephemeral"] })
	                    	}
							subtract.currency += element.amount
	                    }
	                    else if (element.type === RewardType.Item) {
	                        const item = client.cache.items.find(e => e.itemID === element.id && !e.temp && e.enabled)
	                        if (!item) {
								canGiveaway = false
	                        	if (canGiveaway) await interaction.editReply({ embeds: interaction.message.embeds, components: components })
                                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} **${element.id}** ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							if (item.notGiveawayable) {
								canGiveaway = false
								if (canGiveaway) await interaction.editReply({ embeds: interaction.message.embeds, components: components })
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** ${client.language({ textId: "cannot be given away", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
							}
							if (profile.inventory.find(e => e.itemID === element.id)?.amount < element.amount) {
								canGiveaway = false
								if (canGiveaway) await interaction.editReply({ embeds: interaction.message.embeds, components: components })
								interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "You don't have enough", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}${element.amount - profile.inventory.find(e => e.name == element.name).amount}`, flags: ["Ephemeral"] })
							}
							subtract.items[element.id] = element.amount
	                    } else if (element.type === RewardType.Role) {
							const role = interaction.guild.roles.cache.get(element.id)
							if (!role) {
								canGiveaway = false
	                        	if (canGiveaway) await interaction.editReply({ embeds: interaction.message.embeds, components: components })
								interaction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "Role not found", guildId: interaction.guildId, locale: interaction.locale })} (${element.id})**`, flags: ["Ephemeral"] })
							}
							if (!interaction.guild.members.me.permissions.has("ManageRoles") || interaction.guild.members.me.roles.highest.position <= role.position) {
								canGiveaway = false
	                        	if (canGiveaway) await interaction.editReply({ embeds: interaction.message.embeds, components: components })
								interaction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "No permission to manage this role", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, components: [] })
							}
							const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
							if (roleProperties && roleProperties.cannotGiveaway) {
								canGiveaway = false
	                        	if (canGiveaway) await interaction.editReply({ embeds: interaction.message.embeds, components: components })
								interaction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be given away", guildId: interaction.guildId, locale: interaction.locale })} (<@&${role.id}>)**`, flags: ["Ephemeral"] })
							}
							const roleInventory = profile.inventoryRoles?.find(e => { return e.id === role.id && e.ms === element.ms })
							if (!roleInventory || roleInventory.amount < element.amount) {
								canGiveaway = false
	                        	if (canGiveaway) await interaction.editReply({ embeds: interaction.message.embeds, components: components })
								interaction.followUp({ content: `${client.config.emojis.NO}**${client.language({ textId: "You have", guildId: interaction.guildId, locale: interaction.locale })} <@&${role.id}> (${roleInventory?.amount || 0})**`, flags: ["Ephemeral"] })
							}
							subtract.roles[roleInventory.uniqId] = element.amount
						}
	                }
	                if (!canGiveaway) return
					if (subtract.currency) profile.currency = subtract.currency*-1
					await Promise.all(Object.keys(subtract.items).map(async itemID => await profile.subtractItem(itemID, subtract.items[itemID])))
					Object.keys(subtract.roles).map(async key => {
						const roleInventory = profile.inventoryRoles?.find(e => { return e.uniqId === key })
						profile.subtractRole(roleInventory.id, subtract.roles[key], roleInventory.ms)
					})
					await profile.save()
                }
            	if (giveaway.type === "adm") {
            		giveaway.status = "started"
            		giveaway.deleteTemp = undefined
            	}
            	else {
            		giveaway.status = "mod"
            		giveaway.deleteTemp = new Date(new Date().setDate(new Date().getDate()+1))
					giveaway.clearTimeoutDelete()
					giveaway.setTimeoutDelete()
            	}
            	await giveaway.save()
            } else
			if (interaction.customId.includes("endsType")) {
				const components = JSON.parse(JSON.stringify(interaction.message.components))
    			interaction.message.components.forEach(row => row.components.forEach(component => {
                    component.data.disabled = true
                }))
    			await interaction.update({ components: interaction.message.components })
				await interaction.followUp({ 
                    content: `${client.language({ textId: "Select giveaway end type", guildId: interaction.guildId, locale: interaction.locale })}`,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                            	new StringSelectMenuBuilder()
									.setCustomId(`manager-giveaways_add_endsType`)
									.setOptions([
										{
											label: `${client.language({ textId: "Number of reactions", guildId: interaction.guildId, locale: interaction.locale })}`,
											value: `reaction`
										},
										{
											label: `${client.language({ textId: "Number of participants", guildId: interaction.guildId, locale: interaction.locale })}`,
											value: `members`
										}
									])
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId("manager-giveaways_add_endsType_cancel")
                                    .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger),
								new ButtonBuilder()
                                    .setCustomId("manager-giveaways_add_endsType_remove")
                                    .setLabel(client.language({ textId: "Remove type", guildId: interaction.guildId, locale: interaction.locale }))
                                    .setStyle(ButtonStyle.Danger)
									.setDisabled(!giveaway.ends),
                            ),
                    ],
                    flags: ["Ephemeral"]
                })
                const filter = (i) => i.customId.includes(`manager-giveaways_add_endsType`) && i.user.id === interaction.user.id
                let interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 60000 }).catch(e => null)
                if (interaction2 && interaction2.customId.includes("manager-giveaways_add_endsType")) {
					if (interaction2.customId.includes("cancel")) {
						interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
                        return interaction.editReply({ components: components })
					} else if (interaction2.customId.includes("remove")) {
						giveaway.ends = undefined
						await giveaway.save()
						interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Type removed", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
					} else {
						const value = interaction2.values[0]
						const modal = new ModalBuilder()
                            .setCustomId(`manager-giveaways_endsType_modal_${interaction.id}`)
                            .setTitle(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
							.setLabelComponents([
								new LabelBuilder()
									.setLabel(`${client.language({ textId: "Quantity", guildId: interaction.guildId, locale: interaction.locale })}`)
									.setTextInputComponent(
										new TextInputBuilder()
                                            .setCustomId("amount")
                                            .setRequired(true)
											.setMaxLength(7)
                                            .setStyle(TextInputStyle.Short)
									),
							])
                        await interaction2.showModal(modal);delete client.globalCooldown[`${interaction2.guildId}_${interaction2.user.id}`]
                        const filter = (i) => i.customId === `manager-giveaways_endsType_modal_${interaction.id}` && i.user.id === interaction.user.id
                        interaction2 = await interaction2.awaitModalSubmit({ filter, time: 30000 }).catch(e => interaction)
                        if (interaction2 && interaction2.type === InteractionType.ModalSubmit) {
                            const modalArgs = {}
                            interaction2.fields.fields.each(field => modalArgs[field.customId] = field.value)
                            if (isNaN(+modalArgs.amount)) {
                                await interaction2.update({ content: `${client.config.emojis.NO} **${modalArgs.amount}** ${client.language({ textId: "is not a number", guildId: interaction.guildId, locale: interaction.locale })}`, components: [], flags: ["Ephemeral"] })
                                return interaction.editReply({ components: components })
                            }
							modalArgs.amount = +modalArgs.amount
							giveaway.ends = {
								type: value,
								amount: modalArgs.amount
							}
							await giveaway.save()
                            interaction2.update({ content: client.config.emojis.YES, components: [] })
                        } else return
					}
				}
			}
    		const embed = new EmbedBuilder()
    			.setColor(3093046)
				.setAuthor({ name: `${client.language({ textId: "Giveaway from", guildId: interaction.guildId })} ${interaction.member.displayName}`, iconURL: interaction.member.displayAvatarURL() })
    			.setDescription([
    				giveaway.description ? giveaway.description : false,
    				giveaway.permission ? `${client.language({ textId: "Permission", guildId: interaction.guildId })}: ${client.cache.permissions.find(e => e.id === giveaway.permission)?.name || giveaway.permission}` : false,
    				`${client.language({ textId: "Channel", guildId: interaction.guildId })}: ${giveaway.channelId ? `<#${giveaway.channelId}>` : `${client.language({ textId: "specify giveaway channel", guildId: interaction.guildId })}`}`,
    				`${client.language({ textId: "Number of winners", guildId: interaction.guildId })}: ${giveaway.winnerCount || `${client.language({ textId: "specify number of winners", guildId: interaction.guildId })}`}`,
					`${client.language({ textId: "Ending", guildId: interaction.guildId })}: ${!giveaway.endsTime && !giveaway.ends ? `${client.language({ textId: "specify end date (UTC) or end type", guildId: interaction.guildId })}` : [giveaway.endsTime ? `<t:${Math.floor(giveaway.endsTime.getTime() / 1000)}>` : undefined, giveaway.ends?.type === "members" ? `${client.language({ textId: "By achievement", guildId: interaction.guildId })} ${giveaway.ends.amount} ${client.language({ textId: "participants", guildId: interaction.guildId })}` : undefined, giveaway.ends?.type === "reaction" ? `${client.language({ textId: "By achievement", guildId: interaction.guildId })} ${giveaway.ends.amount} ${client.language({ textId: "reactions", guildId: interaction.guildId })}` : undefined].filter(e => e).join(` ${client.language({ textId: "or", guildId: interaction.guildId })} `)}`,
    				`${client.language({ textId: "Creator", guildId: interaction.guildId })}: <@${giveaway.creator}>`,
    				`${client.language({ textId: "Rewards", guildId: interaction.guildId })}: ${giveaway.rewards.length ? await Promise.all(giveaway.rewards.map(async e => {
							if (e.type === RewardType.Currency) {
                                return `${settings.displayCurrencyEmoji}${settings.currencyName} (${e.amount})`
                            } else
                            if (e.type === RewardType.Experience) {
                                return `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId })} (${e.amount})`
                            } else
                            if (e.type === RewardType.Reputation) {
                                return `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId })} (${e.amount})`
                            } else if (e.type === RewardType.Item) {
                                const item = client.cache.items.find(i => i.itemID === e.id && !i.temp && i.enabled)
                                if (item) return `${item.displayEmoji}${item.name} (${e.amount})`
                                else return `${e.id} (${e.amount})`
                            } else if (e.type === RewardType.Text) {
                                return `📝${e.id} (${e.amount})`
                            } else if (e.type === RewardType.Role) {
								return `<@&${e.id}>${e.ms ? ` [${client.functions.transformSecs(client, e.ms, interaction.guildId, interaction.locale)}]` : ``} (${e.amount})`
							}
    				})).then(array => array.join(", ")) : `${client.language({ textId: "Add reward", guildId: interaction.guildId })}`}`,
				].filter(e => e).join("\n"))
				.setThumbnail(giveaway.thumbnail || null)
				.setFooter({ text: `ID: ${giveaway.giveawayID}` })
			if (interaction.customId.includes("finish")) {
				if (giveaway.type === `user`) {
					await interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Giveaway sent for moderation. If not accepted within 24h, it will be automatically rejected", guildId: interaction.guildId, locale: interaction.locale })}.`, components: [], embeds: [] })
					const acceptBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setLabel(`${client.language({ textId: "Accept", guildId: interaction.guildId })}`)
						.setCustomId(`cmd{giveaway-mod}giveaway{${giveaway.giveawayID}}accept`)
					const acceptEditBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Success)
						.setLabel(`${client.language({ textId: "Accept with changes", guildId: interaction.guildId })}`)
						.setCustomId(`cmd{giveaway-mod}giveaway{${giveaway.giveawayID}}acceptedit`)
	            	const declineBTN = new ButtonBuilder()
	            		.setStyle(ButtonStyle.Danger)
	            		.setLabel(`${client.language({ textId: "Decline", guildId: interaction.guildId })}`)
	            		.setCustomId(`cmd{giveaway-mod}giveaway{${giveaway.giveawayID}}decline`)
	            	const permissionBTN = new ButtonBuilder()
						.setStyle(ButtonStyle.Primary)
						.setLabel(`${client.language({ textId: "Requirement", guildId: interaction.guildId })}`)
						.setCustomId(`cmd{check-giveaway-requirements}giveaway{${giveaway.giveawayID}}`)
	                const firstRow = new ActionRowBuilder().addComponents([acceptBTN, acceptEditBTN, declineBTN])
	                if (giveaway.permission) firstRow.addComponents(permissionBTN)
	                const message = await interaction.guild.channels.cache.get(settings.channels.giveawaysMeetingRoom).send({ embeds: [embed], components: [firstRow] })
	            	return message.startThread({
	            		name: client.language({ textId: "Discussion", guildId: interaction.guildId })
	            	})
				} else {
					const giveawayMessage = await interaction.guild.channels.cache.get(giveaway.channelId).send({ 
						content: settings.roles?.giveawaysNotification ? `<@&${settings.roles.giveawaysNotification}>` : ` `, 
						embeds: [embed], 
						components: giveaway.permission && client.cache.permissions.some(e => e.id === giveaway.permission) ? 
						[ new ActionRowBuilder()
							.addComponents(new ButtonBuilder()
							.setStyle(ButtonStyle.Primary)
							.setLabel(`${client.language({ textId: "Requirement", guildId: interaction.guildId })}`)
							.setCustomId(`cmd{check-giveaway-requirements}giveaway{${giveaway.giveawayID}}`)) ] 
						: []
					})
					await giveawayMessage.react(client.config.emojis.tada)
					giveaway.messageId = giveawayMessage.id
                    giveaway.url = giveawayMessage.url
                    await giveaway.save()
					if (giveaway.endsTime) giveaway.setTimeoutEnd(client)
					giveaway.clearTimeoutDelete()
                    const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
                    profile.giveawaysCreated = 1
                    const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.Giveaway)
					await Promise.all(achievements.map(async achievement => {
						if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.giveawaysCreated >= achievement.amount && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                            if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                            client.tempAchievements[profile.userID].push(achievement.id)
							await profile.addAchievement(achievement)
                        } 	
					}))
					await profile.save()
                    return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Giveaway created", guildId: interaction.guildId, locale: interaction.locale })}: \n${giveawayMessage.url}`, embeds: [], components: [] })  
				}
			}
            const setEndTimeBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Primary)
            	.setLabel(`${client.language({ textId: "End date", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}time`)
            const setWinnerCountBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Primary)
            	.setLabel(`${client.language({ textId: "Number of winners", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}winners`)
            const descriptionBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Primary)
            	.setLabel(`${client.language({ textId: "Description, icon", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}description`)
            const rewardsBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Primary)
            	.setLabel(`${client.language({ textId: "Add reward", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}rewards`)
            const setChannelBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Primary)
            	.setLabel(`${client.language({ textId: "Channel", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}channel`)
            const permissionBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Primary)
            	.setLabel(`${client.language({ textId: "Permission for participation", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}permission`)
			const endsTypeBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Primary)
            	.setLabel(`${client.language({ textId: "End type", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}endsType`)
            const createGiveAwayBTN = new ButtonBuilder()
            	.setStyle(ButtonStyle.Success)
            	.setLabel(`${client.language({ textId: "Create", guildId: interaction.guildId, locale: interaction.locale })}`)
            	.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}finish`)
            const returnBTN = new ButtonBuilder()
				.setStyle(ButtonStyle.Danger)
				.setEmoji(client.config.emojis.NO)
				.setCustomId(`cmd{manager-giveaways}giveaway{${giveaway.giveawayID}}cancel`)
				.setLabel(`${client.language({ textId: "Cancel", guildId: interaction.guildId, locale: interaction.locale })}`)	
            if (giveaway.rewards.length >= 10) rewardsBTN.setDisabled(true)
            if (giveaway.type === `user`) setChannelBTN.setDisabled(true)	
            if ((!giveaway.endsTime && !giveaway.ends) || !giveaway.channelId || !giveaway.winnerCount || !giveaway.rewards.length) createGiveAwayBTN.setDisabled(true).setStyle(ButtonStyle.Secondary)
            const firstRow = new ActionRowBuilder().addComponents([setEndTimeBTN, setWinnerCountBTN, descriptionBTN])
            const secondRow = new ActionRowBuilder().addComponents([rewardsBTN, setChannelBTN, permissionBTN, endsTypeBTN])
            const thirdRow = new ActionRowBuilder().addComponents([returnBTN, createGiveAwayBTN])
			if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: [embed], components: [firstRow, secondRow, thirdRow] })
    		else return interaction.update({ embeds: [embed], components: [firstRow, secondRow, thirdRow] })
    	}
    }
}