const client = require("../index")
const { glob } = require("glob")
const { ApplicationCommandOptionType, InteractionType, Events, ButtonStyle } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const argsRegexp = /args{(.*?)}/
const CommandRegexp = /cmd{(.*?)}/
// Compact format regex for sticky commands: c{sc} = sticky-command, c{sus} = sticky-user-select
const CompactStickyRegexp = /^c\{sc\}/
const CompactStickyUserSelectRegexp = /^c\{sus\}/
const node_emoji = require("node-emoji")
const { RewardType } = require("../enums")

// Auto Voice Integration
const autoVoice = require('../modules/auto-voice')

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.inGuild() && client.blacklist(interaction.guildId, "full_ban", "guilds") && !interaction.isAutocomplete()) return interaction.reply({ content: `${client.language({ textId: "This server is blacklisted", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
    if (interaction.inGuild() && client.blacklist(interaction.user.id, "full_ban", "users") && !interaction.isAutocomplete()) return interaction.reply({ content: `${client.language({ textId: "You are blacklisted", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
	
	// Handle Auto Voice interactions first
	if (autoVoice.isVoiceInteraction(interaction)) {
		try {
			await autoVoice.handleInteraction(interaction)
			return
		} catch (e) {
			console.error('[Auto Voice] Error in interaction handler:', e)
			// Respond to the user if the interaction hasn't been handled
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(() => {})
			}
			return
		}
	}
	
	// Handle Notification Channels interactions
	const notificationChannelsHandler = require('../interactions/notification-channels-handler')
	if (interaction.customId && interaction.customId.startsWith('notif_')) {
		try {
			const handled = await notificationChannelsHandler.handleNotificationChannelInteraction(client, interaction)
			if (handled) return
		} catch (e) {
			console.error('[Notification Channels] Error in interaction handler:', e)
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(() => {})
			}
			return
		}
	}
	
	// Handle Safe-Server interactions
	if (interaction.customId && interaction.customId.startsWith('ss_')) {
		try {
			// Handle modals
			if (interaction.isModalSubmit()) {
				const modalHandler = require('../interactions/safe-server-modals')
				await modalHandler.execute(client, interaction)
				return
			}
			
			// Handle manage interactions (old system)
			if (interaction.customId.startsWith('ss_manage_') || 
			    interaction.customId.startsWith('ss_restore_') || 
			    interaction.customId.startsWith('ss_approve_bot_') || 
			    interaction.customId.startsWith('ss_kick_bot_')) {
				const manageHandler = require('../interactions/safe-server-manage')
				await manageHandler.execute(client, interaction)
				return
			}
			
			// Handle all other safe-server interactions (new system)
			const panelHandler = require('../interactions/safe-server-panel')
			await panelHandler.execute(client, interaction)
			return
		} catch (e) {
			console.error('[Safe-Server] Error in interaction handler:', e)
			console.error('[Safe-Server] Stack:', e.stack)
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(() => {})
			}
			return
		}
	}
	
	await client.functions.fetchSettings(client, interaction.guildId)
	// Autocomplete Handling
    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
		if (interaction.commandName === "take") {
			const userID = interaction.options.get("user")?.value
			if (!userID) return interaction.respond([]).catch(e => null)
			const focus = interaction.options.getFocused()
			const profile = await client.functions.fetchProfile(client, userID, interaction.guildId)
			const options = []
			profile.inventoryRoles?.forEach((ir, index) => {
				const role = interaction.guild.roles.cache.get(ir.id)
				options.push({
					name: `${role?.name || ir.id}${ir.ms ? ` [${client.functions.transformSecs(client, ir.ms, interaction.guildId, interaction.locale)}]` : ``} (${ir.amount})`,
					value: ir.uniqId
				})
			})
			return interaction.respond(options.filter(e => e.name.toLowerCase().includes(focus.toLowerCase())).slice(0, 24)).catch(e => null)
		}
		if (interaction.commandName === "transfer-role") {
			const focus = interaction.options.getFocused()
			const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
			const options = []
			profile.inventoryRoles?.forEach((ir, index) => {
				const role = interaction.guild.roles.cache.get(ir.id)
				options.push({
					name: `${role?.name || ir.id}${ir.ms ? ` [${client.functions.transformSecs(client, ir.ms, interaction.guildId, interaction.locale)}]` : ``} (${ir.amount})`,
					value: `${index}`
				})
			})
			return interaction.respond(options.filter(e => e.name.toLowerCase().includes(focus.toLowerCase())).slice(0, 24)).catch(e => null)
		}
    	if (interaction.commandName === "achievement-give-to-user") {
    		const focus = interaction.options.getFocused()
    		const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && (focus ? (e.name.toLowerCase() === focus.toLowerCase() || e.id.toLowerCase() === focus.toLowerCase()) : true)).sort((a, b) => a.name < b.name).first(25)
    		const options = []
			const profile = await client.functions.fetchProfile(client, userID, interaction.guildId)
			achievements.forEach(achievement => {
				if (!profile.achievements?.some(e => e.achievmentID === achievement.id)) {
					const isDefaultEmoji = node_emoji.hasEmoji(achievement.emoji || "")
					options.push({
						name: !isDefaultEmoji ? achievement.name : achievement.displayEmoji + achievement.name,
						value: achievement.id
					})	
				}	
			})
			return interaction.respond(options).catch(e => null)	
    	}
    	if (interaction.commandName === "achievement-take-from-user") {
			const userID = interaction.options.get("user")?.value
			if (!userID) return interaction.respond([]).catch(e => null)
    		const focus = interaction.options.getFocused()
    		const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && (focus ? (e.name.toLowerCase() === focus.toLowerCase() || e.id.toLowerCase() === focus.toLowerCase()) : true)).sort((a, b) => a.name < b.name).first(25)
    		const options = []
			const profile = await client.functions.fetchProfile(client, userID, interaction.guildId)
			achievements.forEach(achievement => {
				if (profile.achievements?.some(e => e.achievmentID === achievement.id)) {
					const isDefaultEmoji = node_emoji.hasEmoji(achievement.emoji || "")
					options.push({
						name: !isDefaultEmoji ? achievement.name : achievement.displayEmoji + achievement.name,
						value: achievement.id
					})	
				}	
			})
			return interaction.respond(options).catch(e => null)	
    	}
    	if (interaction.commandName === "buy") {
    		const focus = interaction.options.getFocused().toLowerCase()
    		const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase()) && item.shop.inShop && item.shop.amount > 0).sort((a, b) => b.name > a.name).first(25)
    		const options = []
			const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
    		for (const item of items) {
				let price = item.shop.cryptoPrice ? await fetch(`https://api.coinbase.com/v2/prices/${item.shop.cryptoPrice}/buy`).then(response => response.json().then(response => response.data.amount * item.shop.cryptoPriceMultiplier)).catch(err => NaN) : item.shop.price
				if (price) {
					if (item.shop.canDiscount) price = (price * (1 - profile.rp / 2000))
					const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
					options.push({
						name: (!isDefaultEmoji ? item.name : item.displayEmoji + item.name) + ` (p: ${price})`,
						value: item.name
					})	
				}
    		}
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "craft") {
    		const focus = interaction.options.getFocused()
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase()) && item.crafts.some(c => c.isFound)).sort((a, b) => b.name > a.name).first(25)
    		const options = []
    		items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
    			options.push({
    				name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
    				value: item.name
    			})	
    		})
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "drop") {
    		const focus = interaction.options.getFocused()
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase()) && (interaction.member.permissions.has("Administrator") ? true : !item.notDropable) && profile.inventory.some(x => x.itemID === item.itemID && x.amount > 0)).sort((a, b) => b.name > a.name).first(24)
    		const options = []
    		items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
				options.push({
    				name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
    				value: item.name
    			})	
			})
			if (options.length < 25) {
				const settings = client.cache.settings.get(interaction.guildId)
				if (!settings.currency_no_drop) options.unshift({ value: settings.currencyName, name: settings.currencyName })
			}
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "transfer") {
    		const focus = interaction.options.getFocused()
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase()) && (interaction.member.permissions.has("Administrator") ? true : !item.notTransable) && profile.inventory.some(x => x.itemID === item.itemID && x.amount > 0)).sort((a, b) => b.name > a.name).first(24)
    		const options = []
    		items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
    			options.push({
    				name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
    				value: item.name
    			})
    		})
			const settings = client.cache.settings.get(interaction.guildId)
			if (!settings.currency_no_transfer) {
				options.unshift(
					{ value: settings.currencyName, name: settings.currencyName }
				)
			}
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "fav") {
    		const focus = interaction.options.getFocused()
			const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name).first(25)
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
    		const options = []
    		let inventory = profile.inventory.filter(element => serverItems.some(e => e.itemID === element.itemID) && element.amount > 0)
            inventory.sort((a, b) => {
                const aItem = serverItems.find(e => e.itemID == a.itemID)
                const bItem = serverItems.find(e => e.itemID == b.itemID)
                if (!aItem) return 1
                if (!bItem) return -1
                return aItem.sort - bItem.sort
            })
			inventory = inventory.slice(0, 24)
            for (const item of inventory) {
                const serverItem = serverItems.find(element => element.itemID == item.itemID)
                if (serverItem) {
					const isDefaultEmoji = node_emoji.hasEmoji(serverItem.emoji || "")
                	options.push({
	                	name: `${item.fav ? "⭐" : ""}${!isDefaultEmoji ? serverItem.name : `${serverItem.displayEmoji}${serverItem.name}`}`, 
	                	value: serverItem.name
                	})
                }
            }
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "give-item") {
    		const focus = interaction.options.getFocused()
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name).first(25)
    		const options = []
    		items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
    			options.push({
    				name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
    				value: item.name
    			})	
    		})
    		return interaction.respond(options).catch(e => null)
    	}
        if (interaction.commandName === "config") {
			let subCommandGroup = interaction.options.getSubcommandGroup()
			subCommandGroup = subCommandGroup === "fishing" ? "fishing" : subCommandGroup === "mining" ? "mining" : subCommandGroup === "voice-items" ? "voice" : "message"
            const focus = interaction.options.getFocused()
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name).first(25)
            const options = []
            items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
                options.push({
                    name: (!isDefaultEmoji ? item.name : item.displayEmoji + item.name) + (item.activities?.[subCommandGroup]?.chance ? ` [${item.activities?.[subCommandGroup]?.chance}%]` : ""),
                    value: item.name
                })  
            })
            return interaction.respond(options).catch(e => null)
        }
    	if (interaction.commandName === "items") {
    		const focus = interaction.options.getFocused()
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name).first(25)
    		const options = []
    		items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
    			options.push({
    				name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
    				value: item.name
    			})	
    		})
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "open") {
    		const focus = interaction.options.getFocused()
			const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase()) && item.contains[0]).sort((a, b) => b.name > a.name).first(25)
    		const options = []
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            let inventory = profile.inventory.filter(element => serverItems.some(e => e.itemID === element.itemID) && element.amount > 0)
            inventory.sort((a, b) => {
                const aItem = serverItems.find(e => e.itemID == a.itemID)
                const bItem = serverItems.find(e => e.itemID == b.itemID)
                if (!aItem) return 1
                if (!bItem) return -1
                return aItem.sort - bItem.sort
            })
			inventory = inventory.slice(0, 24)
            for (const item of inventory) {
                const serverItem = serverItems.find(element => element.itemID == item.itemID)
                const isDefaultEmoji = node_emoji.hasEmoji(serverItem.emoji || "")
				if (serverItem) options.push({ name: !isDefaultEmoji ? serverItem.name : serverItem.displayEmoji + serverItem.name, value: serverItem.name })
            }
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "sell") {
    		const focus = interaction.options.getFocused()
			const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && item.name.toLowerCase().includes(focus.toLowerCase()) && (item.shop.sellingPrice || item.shop.cryptoSellingPrice) && item.shop.sellingPriceType).sort((a, b) => b.name > a.name).first(25)
    		const options = []
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            let inventory = profile.inventory.filter(element => serverItems.some(e => e.itemID === element.itemID) && element.amount > 0)
            inventory.sort((a, b) => {
                const aItem = serverItems.find(e => e.itemID == a.itemID)
                const bItem = serverItems.find(e => e.itemID == b.itemID)
                if (!aItem) return 1
                if (!bItem) return -1
                return aItem.sort - bItem.sort
            })
			inventory = inventory.slice(0, 24)
            for (const item of inventory) {
                const serverItem = serverItems.find(element => element.itemID == item.itemID)
                if (serverItem) {
					let price = serverItem.shop.cryptoSellingPrice ? await fetch(`https://api.coinbase.com/v2/prices/${serverItem.shop.cryptoSellingPrice}/sell`).then(response => response.json().then(response => response.data.amount * serverItem.shop.cryptoSellingPriceMultiplier)).catch(err => NaN) : serverItem.shop.sellingPrice
					if (price) {
						if (serverItem.shop.sellingDiscount) price = (price * (1 - profile.rp / 2000))
						const isDefaultEmoji = node_emoji.hasEmoji(serverItem.emoji || "")
						options.push({ name: (!isDefaultEmoji ? serverItem.name : serverItem.displayEmoji + serverItem.name) + ` (p: ${price})`, value: serverItem.name })	
					}
				}
            }
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "shop-add-edit") {
    		const focus = interaction.options.getFocused()
			const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name).first(25)
    		const options = []
            for (const item of serverItems) {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
                options.push({ name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name, value: item.name })
            }
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "shop-decrease-amount") {
    		const focus = interaction.options.getFocused()
			const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.name.toLowerCase().includes(focus.toLowerCase()) && item.shop.inShop).sort((a, b) => b.name > a.name).first(25)
    		const options = []
            for (const item of serverItems) {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
                options.push({ name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name, value: item.name })
            }
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "shop-increase-amount") {
    		const focus = interaction.options.getFocused()
			const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.name.toLowerCase().includes(focus.toLowerCase()) && item.shop.inShop).sort((a, b) => b.name > a.name).first(25)
    		const options = []
            for (const item of serverItems) {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
                options.push({ name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name, value: item.name })
            }
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "shop-del") {
    		const focus = interaction.options.getFocused()
			const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.name.toLowerCase().includes(focus.toLowerCase()) && item.shop.inShop).sort((a, b) => b.name > a.name).first(25)
    		const options = []
            for (const item of serverItems) {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
                options.push({ name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name, value: item.name })
            }
    		return interaction.respond(options).catch(e => null)
    	}
    	if (interaction.commandName === "use") {
    		const focus = interaction.options.getFocused()
			const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.found && item.enabled && item.name.toLowerCase().includes(focus.toLowerCase()) && item.canUse).sort((a, b) => b.name > a.name)
    		const options = []
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            let inventory = profile.inventory.filter(element => serverItems.some(e => e.itemID === element.itemID) && element.amount > 0)
            inventory.sort((a, b) => {
                const aItem = serverItems.find(e => e.itemID == a.itemID)
                const bItem = serverItems.find(e => e.itemID == b.itemID)
                if (!aItem) return 1
                if (!bItem) return -1
                return aItem.sort - bItem.sort
            })
			inventory = inventory.slice(0, 24)
            for (const item of inventory) {
                const serverItem = serverItems.find(element => element.itemID == item.itemID)
                const isDefaultEmoji = node_emoji.hasEmoji(serverItem?.emoji || "")
				if (serverItem) options.push({ name: !isDefaultEmoji ? serverItem.name : serverItem.displayEmoji + serverItem.name, value: serverItem.name })
            }
    		return interaction.respond(options).catch(e => null)
    	}
        if (interaction.commandName === "take-item") {
			const userID = interaction.options.get("user")?.value
			if (!userID) return interaction.respond([]).catch(e => null)
			const focus = interaction.options.getFocused()
			const user = await client.functions.fetchProfile(client, userID, interaction.guildId)
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.found && item.enabled && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name)
			const userItems = items.filter(e => user.inventory.some(x => x.itemID == e.itemID && x.amount > 0)).first(25)
			const displayedUserItems = userItems.map(item => {
				return {
					name: item.name,
					emoji: item.emoji,
					displayEmoji: item.displayEmoji,
					amount: user.inventory.find(e => e.itemID === item.itemID)?.amount || 0,
					itemID: item.itemID
				}
			})
			items.forEach(item => {
				if (!displayedUserItems.find(e => e.itemID === item.itemID)) displayedUserItems.push({
					name: item.name,
					emoji: item.emoji,
					displayEmoji: item.displayEmoji,
					amount: 0,
					itemID: item.itemID
				})
			})
			const options = []
			displayedUserItems.slice(0, 25).forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
				options.push({
					name: !isDefaultEmoji ? `${item.name}${item.amount ? ` (${item.amount})` : ``}` : `${item.displayEmoji + item.name}${item.amount ? ` (${item.amount})` : ``}`,
					value: item.name
				})  
			})
			return interaction.respond(options).catch(e => null)	
        }
		if (interaction.commandName === "trophy") {
			const userID = interaction.options.get("user")?.value
			if (!userID) return interaction.respond([]).catch(e => null)
			const focus = interaction.options.getFocused()
			const profile = await client.functions.fetchProfile(client, userID, interaction.guildId)
			const trophies = profile.trophies?.filter(e => e.includes(focus)) || []
			const options = []
			for (const trophy of trophies) {
				options.push({
					name: trophy,
					value: trophy
				})  
			}
			return interaction.respond(options).catch(e => null)	
        }
		if (interaction.commandName === "reg") {
			const slashCommands = glob.sync(`slash-commands/*.js`, {
				absolute: true
			})
			const focus = interaction.options.getFocused()
			const options = []
			const commands = []
			await slashCommands.map(async (value) => {
				const file = require(value)
				let newMap = Object.assign({}, file)
				commands.push(newMap)
			})
			for (const command of commands.filter(e => e.name.includes(focus)).slice(0,24)) {
				options.push({
					name: command.name,
					value: command.name
				})  
			}	
			return interaction.respond(options).catch(e => null)	
        }
		if (interaction.commandName === "unreg") {
			const slashCommands = glob.sync(`slash-commands/*.js`, {
				absolute: true
			})
			const focus = interaction.options.getFocused()
			const options = []
			const commands = []
			await slashCommands.map(async (value) => {
				const file = require(value)
				let newMap = Object.assign({}, file)
				commands.push(newMap)
			})
			for (const command of commands.filter(e => e.name.includes(focus)).slice(0,24)) {
				options.push({
					name: command.name,
					value: command.name
				})  
			}	
			return interaction.respond(options).catch(e => null)	
        }
        if (interaction.commandName === "wormhole-spawn") {
            const focus = interaction.options.getFocused()
            const wormholes = client.cache.wormholes.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase()) && e.chance && e.itemID && e.amountFrom && e.amountTo && e.deleteTimeOut !== undefined && e.webhookId).first(25)
            const options = []
			wormholes.forEach(wormhole => {
				options.push({
					name: wormhole.name,
					value: wormhole.name
				})
			})
            return interaction.respond(options).catch(e => null)    
        }
        if (interaction.commandName === "quest-give-to-user") {
			const userID = interaction.options.get("user")?.value
			if (!userID) return interaction.respond([]).catch(e => null)
            const focus = interaction.options.getFocused()
            const quests = client.cache.quests.filter(quest => quest.isEnabled && quest.guildID === interaction.guildId && (quest.name.toLowerCase().includes(focus.toLowerCase()) || quest.questID.toLowerCase().includes(focus.toLowerCase()))).sort(function(a, b) { return 2 * (a.name > b.name) - 1 }).first(25)
            const options = []
			const profile = await client.functions.fetchProfile(client, userID, interaction.guildId)
			quests.forEach(quest => {
				if (!profile.quests?.some(e => e.questID === quest.questID)) {
					const isDefaultEmoji = node_emoji.hasEmoji(quest.emoji || "")
					options.push({
						name: !isDefaultEmoji ? quest.name : quest.displayEmoji + quest.name,
						value: quest.questID
					})  
				}	
			})
			return interaction.respond(options).catch(e => null)    
        }
        if (interaction.commandName === "quest-take-from-user") {
			const userID = interaction.options.get("user")?.value
			if (!userID) return interaction.respond([]).catch(e => null)
            const focus = interaction.options.getFocused()
            const quests = client.cache.quests.filter(quest => quest.isEnabled && quest.guildID === interaction.guildId && (quest.name.toLowerCase().includes(focus.toLowerCase()) || quest.questID.toLowerCase().includes(focus.toLowerCase()))).sort(function(a, b) { return 2 * (a.name > b.name) - 1 }).first(25)
            const options = []
			const profile = await client.functions.fetchProfile(client, userID, interaction.guildId)
			quests.forEach(quest => {
				if (profile.quests?.some(e => e.questID === quest.questID)) {
					const isDefaultEmoji = node_emoji.hasEmoji(quest.emoji || "")
					options.push({
						name: !isDefaultEmoji ? quest.name : quest.displayEmoji + quest.name,
						value: quest.questID
					})  
				}	
			})
			return interaction.respond(options).catch(e => null)    
        }
        if (interaction.commandName === "reset-limits") {
			const userID = interaction.options.get("user")?.value
			if (!userID) return interaction.respond([]).catch(e => null)
            const subCommand = interaction.options.getSubcommand()
            if (!subCommand) return interaction.respond([]).catch(e => null)
            const time = subCommand === "daily" ? "dailyLimits" : subCommand === "weekly" ? "weeklyLimits" : "monthlyLimits"
            const profile = await client.functions.fetchProfile(client, userID, interaction.guildId)
            const options = []
            for (const itemID in profile[time]) {
                const item = client.cache.items.get(itemID)
                if (item) {
					const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
                    options.push({
                        name: !isDefaultEmoji ? item.name + ` (${profile[time][itemID]})` : item.displayEmoji + item.name + ` (${profile[time][itemID]})`,
                        value: item.name
                    })    
                }
                
            }
            return interaction.respond(options).catch(e => null)
        }
        if (interaction.commandName === "cooldowns") {
            const slashCommands = glob.sync(`slash-commands/*.js`, {
                absolute: true
            })
            const focus = interaction.options.getFocused()
            const options = []
            const commands = []
            await slashCommands.map(async (value) => {
                const file = require(value)
                let newMap = Object.assign({}, file)
                commands.push(newMap)
            })
            for (const command of commands.filter(e => !e.owner && e.name.includes(focus)).slice(0,24)) {
                options.push({
                    name: command.name,
                    value: command.name
                })  
            }   
            return interaction.respond(options).catch(e => null)
        }
		if (interaction.commandName === "manager-items") {
    		const focus = interaction.options.getFocused()
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name).first(25)
    		const options = []
    		items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
    			options.push({
    				name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
    				value: item.name
    			})	
    		})
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "manager-permissions") {
    		const focus = interaction.options.getFocused()
    		let permissions = client.cache.permissions.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase())).first(25)
    		const options = []
    		for (const permission of permissions) {
    			options.push({
    				name: permission.name,
    				value: permission.name
    			})	
    		}
    		return interaction.respond(options).catch(e => null)
    	}
        if (interaction.commandName === "manager-jobs") {
            const focus = interaction.options.getFocused()
            let jobs = client.cache.jobs.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase())).first(25)
            const options = []
            for (const job of jobs) {
                options.push({
                    name: job.name,
                    value: job.name
                })  
            }
            return interaction.respond(options).catch(e => null)
        }
		if (interaction.commandName === "manager-achievements") {
    		const focus = interaction.options.getFocused()
    		const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase())).first(25)
    		const options = []
			achievements.forEach(achievement => {
				const isDefaultEmoji = achievement.emoji ? node_emoji.hasEmoji(achievement.emoji) : true
				options.push({
    				name: !isDefaultEmoji ? achievement.name : achievement.displayEmoji + achievement.name,
    				value: achievement.name
    			})	
			})
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "manager-quests") {
    		const focus = interaction.options.getFocused()
    		const quests = client.cache.quests.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase())).first(25)
    		const options = []
			quests.forEach(quest => {
				const isDefaultEmoji = quest.emoji ? node_emoji.hasEmoji(quest.emoji) : true
				options.push({
    				name: !isDefaultEmoji ? quest.name : quest.displayEmoji + quest.name,
    				value: quest.name
    			})	
			})
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "manager-promocodes") {
    		const focus = interaction.options.getFocused()
    		const promocodes = client.cache.promocodes.filter(e => e.guildID === interaction.guildId && e.code.includes(focus)).first(25)
    		const options = []
			promocodes.forEach(promocode => {
				options.push({
    				name: promocode.code,
    				value: promocode.code
    			})	
			})
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "manager-channels") {
    		const focus = interaction.options.getFocused()
    		const channels = client.cache.channels.filter(e => e.guildID === interaction.guildId && (interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes(focus.toLowerCase()) && c.id === e.id) || e.id.includes(focus))).first(25)
    		const options = []
			channels.forEach(multipliersChannel => {
				const channel = interaction.guild.channels.cache.get(multipliersChannel.id)
				options.push({
    				name: channel?.name || multipliersChannel.id,
    				value: multipliersChannel.id
    			})	
			})
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "channels") {
    		const focus = interaction.options.getFocused()
    		const channels = client.cache.channels.filter(e => e.guildID === interaction.guildId && (interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes(focus.toLowerCase()) && c.id === e.id) || e.id.includes(focus))).first(25)
    		const options = []
			channels.forEach(multipliersChannel => {
				const channel = interaction.guild.channels.cache.get(multipliersChannel.id)
				options.push({
    				name: channel?.name || multipliersChannel.id,
    				value: multipliersChannel.id
    			})	
			})
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "manager-wormholes") {
    		const focus = interaction.options.getFocused()
    		const wormholes = client.cache.wormholes.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase())).first(25)
    		const options = []
			wormholes.forEach(wormhole => {
				options.push({
    				name: wormhole.name,
    				value: wormhole.name
    			})
			})
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "promocode-autogenerators") {
    		const focus = interaction.options.getFocused()
    		const promocodes = client.cache.promocodeAutogenerators.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase())).first(25)
    		const options = []
			promocodes.forEach(promocode => {
				options.push({
    				name: promocode.name,
    				value: promocode.name
    			})
			})
    		return interaction.respond(options).catch(e => null)
    	}
		if (interaction.commandName === "work") {
			const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
            const focus = interaction.options.getFocused()
            let jobs = client.cache.jobs.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase()) && e.enable)
            const options = []
			function transformSecs(duration) {
				let ms = parseInt((duration % 1000) / 100),
				secs = Math.floor((duration / 1000) % 60),
				mins = Math.floor((duration / (1000 * 60)) % 60),
				hrs = Math.floor((duration / (1000 * 60 * 60)))
				if (hrs) return `${hrs < 10 ? `0${hrs}` : hrs}:${mins < 10 ? `0${mins}` : mins}:${secs < 10 ? `0${secs}` : secs}`
				if (!hrs) return `00:${mins < 10 ? `0${mins}` : mins}:${secs < 10 ? `0${secs}` : secs}`
				if (!mins) return `00:00:${secs < 10 ? `0${secs}` : secs}`
				if (!secs) return `00:00:00.${ms < 10 ? `00${ms}` : ms < 100 ? `0${ms}` : ms}`
			}
			jobs.forEach(job => {
				const isTimed = (profile.allJobsCooldown && profile.allJobsCooldown > new Date() || (profile.jobsCooldowns && profile.jobsCooldowns.get(job.id) && profile.jobsCooldowns.get(job.id) > new Date()))
				let isUnavailable = false
				if (job.action1.permission && job.action2.permission) {
					const permission1 = client.cache.permissions.get(job.action1.permission)
					const permission2 = client.cache.permissions.get(job.action2.permission)
					if (permission1 && permission2) {
						const isPassing1 = permission1.for(profile, interaction.member, interaction.channel)
						const isPassing2 = permission2.for(profile, interaction.member, interaction.channel)
						if (isPassing1.value === false && isPassing2.value === false) isUnavailable = true
					}
				}
				let timer
				if (isTimed) {
					timer = (profile.jobsCooldowns && profile.jobsCooldowns.get(job.id) > profile.allJobsCooldown) || !profile.allJobsCooldown ? transformSecs(profile.jobsCooldowns.get(job.id) - new Date()) : transformSecs(profile.allJobsCooldown.getTime() - Date.now())
				}
				if (!job.hide || (job.hide && !isUnavailable)) {
					options.push({
						name: `${isTimed ? `⌚` : ""}${isUnavailable ? `⛔` : ""}${job.name} ${isTimed ? `[${timer}]` : ""}`,
						value: job.name
					})	
				}
            })
            return interaction.respond(options.slice(0, 25)).catch(e => null)
        }
		if (interaction.commandName === "top") {
			if (interaction.options.getSubcommand() === "statistics") {
				let options = [
					{
						name: client.language({ textId: `!alltime.xp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.totalxp`
					},
					{
						name: client.language({ textId: `!alltime.seasonXp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.seasonTotalXp`
					},
					{
						name: client.language({ textId: `!alltime.hours`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.hours`
					},
					{
						name: client.language({ textId: `!alltime.messages`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.messages`
					},
					{
						name: client.language({ textId: `!alltime.likes`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.likes`
					},
					{
						name: client.language({ textId: `!alltime.currency`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.currency`
					},
					{
						name: client.language({ textId: `!alltime.invites`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.invites`
					},
					{
						name: client.language({ textId: `!alltime.bumps`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.bumps`
					},
					{
						name: client.language({ textId: `!alltime.wormholeTouched`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.wormholeTouched`
					},
					{
						name: client.language({ textId: `!alltime.rp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.rp`
					},
					{
						name: client.language({ textId: `!alltime.giveawaysCreated`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.giveawaysCreated`
					},
					{
						name: client.language({ textId: `!alltime.doneQuests`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `alltime.doneQuests`
					},
					{
						name: client.language({ textId: `!weekly.xp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.totalxp`
					},
					{
						name: client.language({ textId: `!weekly.hours`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.hours`
					},
					{
						name: client.language({ textId: `!weekly.messages`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.messages`
					},
					{
						name: client.language({ textId: `!weekly.likes`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.likes`
					},
					{
						name: client.language({ textId: `!weekly.currency`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.currency`
					},
					{
						name: client.language({ textId: `!weekly.invites`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.invites`
					},
					{
						name: client.language({ textId: `!weekly.invites`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.bumps`
					},
					{
						name: client.language({ textId: `!weekly.wormholeTouched`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.wormholeTouched`
					},
					{
						name: client.language({ textId: `!weekly.rp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.rp`
					},
					{
						name: client.language({ textId: `!weekly.giveawaysCreated`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.giveawaysCreated`
					},
					{
						name: client.language({ textId: `!weekly.doneQuests`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `weekly.doneQuests`
					},
					{
						name: client.language({ textId: `!yearly.xp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.totalxp`
					},
					{
						name: client.language({ textId: `!monthly.xp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.totalxp`
					},				
					{
						name: client.language({ textId: `!daily.xp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.totalxp`
					},
					{
						name: client.language({ textId: `!yearly.hours`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.hours`
					},
					{
						name: client.language({ textId: `!monthly.hours`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.hours`
					},				
					{
						name: client.language({ textId: `!daily.hours`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.hours`
					},
					{
						name: client.language({ textId: `!yearly.messages`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.messages`
					},
					{
						name: client.language({ textId: `!monthly.messages`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.messages`
					},			
					{
						name: client.language({ textId: `!daily.messages`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.messages`
					},
					{
						name: client.language({ textId: `!yearly.likes`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.likes`
					},
					{
						name: client.language({ textId: `!monthly.likes`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.likes`
					},					
					{
						name: client.language({ textId: `!daily.likes`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.likes`
					},				
					{
						name: client.language({ textId: `!yearly.currency`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.currency`
					},
					{
						name: client.language({ textId: `!monthly.currency`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.currency`
					},				
					{
						name: client.language({ textId: `!daily.currency`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.currency`
					},	
					{
						name: client.language({ textId: `!yearly.invites`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.invites`
					},
					{
						name: client.language({ textId: `!monthly.invites`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.invites`
					},					
					{
						name: client.language({ textId: `!daily.invites`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.invites`
					},					
					{
						name: client.language({ textId: `!yearly.bumps`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.bumps`
					},
					{
						name: client.language({ textId: `!monthly.bumps`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.bumps`
					},				
					{
						name: client.language({ textId: `!daily.bumps`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.bumps`
					},					
					{
						name: client.language({ textId: `!yearly.wormholeTouched`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.wormholeTouched`
					},
					{
						name: client.language({ textId: `!monthly.wormholeTouched`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.wormholeTouched`
					},					
					{
						name: client.language({ textId: `!daily.wormholeTouched`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.wormholeTouched`
					},				
					{
						name: client.language({ textId: `!yearly.rp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.rp`
					},
					{
						name: client.language({ textId: `!monthly.rp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.rp`
					},					
					{
						name: client.language({ textId: `!daily.rp`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.rp`
					},
					{
						name: client.language({ textId: `!yearly.giveawaysCreated`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.giveawaysCreated`
					},
					{
						name: client.language({ textId: `!monthly.giveawaysCreated`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.giveawaysCreated`
					},					
					{
						name: client.language({ textId: `!daily.giveawaysCreated`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.giveawaysCreated`
					},
					{
						name: client.language({ textId: `!yearly.doneQuests`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `yearly.doneQuests`
					},
					{
						name: client.language({ textId: `!monthly.doneQuests`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `monthly.doneQuests`
					},					
					{
						name: client.language({ textId: `!daily.doneQuests`, guildId: interaction.guildId, locale: interaction.locale }),
						value: `daily.doneQuests`
					}
				]
				const focus = interaction.options.getFocused()
				options = options.filter(e => e.name.toLowerCase().includes(focus.toLowerCase()) || e.value.toLowerCase().includes(focus.toLowerCase())).slice(0, 25)
				return interaction.respond(options).catch(e => console.error(e))
			}
			if (interaction.options.getSubcommand() === "item") {
				const focus = interaction.options.getFocused()
				const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.found && item.enabled && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name).first(25)
				const options = []
				items.forEach(item => {
					const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
					options.push({
						name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
						value: item.itemID
					})	
				})
				return interaction.respond(options).catch(e => console.error(e))
			}
		}
		if (interaction.commandName === "auctions") {
			if (interaction.options.getSubcommand() === "item") {
				const focus = interaction.options.getFocused()
				const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.found && item.enabled && item.name.toLowerCase().includes(focus.toLowerCase())).sort((a, b) => b.name > a.name).first(25)
				const options = []
				const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
				let inventory = profile.inventory.filter(element => serverItems.some(e => e.itemID === element.itemID) && element.amount > 0)
				inventory.sort((a, b) => {
					const aItem = serverItems.find(e => e.itemID == a.itemID)
					const bItem = serverItems.find(e => e.itemID == b.itemID)
					if (!aItem) return 1
					if (!bItem) return -1
					return aItem.sort - bItem.sort
				})
				inventory = inventory.slice(0, 24)
				for (const item of inventory) {
					const serverItem = serverItems.find(element => element.itemID == item.itemID)
					const isDefaultEmoji = node_emoji.hasEmoji(serverItem?.emoji || "")
					if (serverItem) options.push({ name: (!isDefaultEmoji ? serverItem.name : serverItem.displayEmoji + serverItem.name) + ` (${item.amount})`, value: serverItem.itemID })
				}
				return interaction.respond(options)
			}
			if (interaction.options.getSubcommand() === "role") {
				const focus = interaction.options.getFocused()
				let options = []
				const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
				let inventoryRoles = profile.inventoryRoles?.filter(element => element.amount > 0)
				if (inventoryRoles) {
					for (const role of inventoryRoles) {
						const guildRole = interaction.guild.roles.cache.get(role.id)
						if (guildRole && guildRole.name.toLowerCase().includes(focus.toLowerCase())) options.push({ name: `${guildRole.name} (${role.amount}) ${role.ms ? `[${client.functions.transformSecs(client, role.ms, interaction.guildId, interaction.locale)}]` : ""}`, value: role.uniqId })
					}	
				}
				options = options.slice(0, 24)
				return interaction.respond(options)
			}
		}
		if (interaction.commandName === "components") {
			if (interaction.options.getSubcommandGroup() !== "buttons") return
			if (interaction.options.getSubcommand() !== "add") return
			const message_url = interaction.options.get("message_url")?.value
			if (message_url) {
				const row = interaction.options.get("row")?.value
				const column = interaction.options.get("column")?.value
				const channelId = message_url.split("/")[5]
				const messageId = message_url.split("/")[6]
				if (row !== undefined && column !== undefined && channelId && messageId) {
					const focus = interaction.options.getFocused(true)
					const channel = await interaction.guild.channels.fetch(channelId).catch(e => null)
					if (!channel || !channel.guild) return interaction.respond([])
					const message = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
					if (!message) return interaction.respond([])
					if (!message.components[row]?.components[column]) return interaction.respond([])
					if (focus.name === "id_or_url") {
						if (message.components[row].components[column].data.style !== ButtonStyle.Link && message.components[row].components[column].data.custom_id) return interaction.respond([{
							name: message.components[row].components[column].data.custom_id,
							value: message.components[row].components[column].data.custom_id
						}])
						else if (message.components[row].components[column].data.url) return interaction.respond([{
							name: message.components[row].components[column].data.url,
							value: message.components[row].components[column].data.url
						}])
						else return interaction.respond([])
					} else
					if (focus.name === "label") {
						if (message.components[row].components[column].data.label) return interaction.respond([{
							name: message.components[row].components[column].data.label,
							value: message.components[row].components[column].data.label
						}])
						else interaction.respond([])
					} else
					if (focus.name === "emoji") {
						if (message.components[row].components[column].data.emoji) {
							return interaction.respond([{
								name: message.components[row].components[column].data.emoji?.id || message.components[row].components[column].data.emoji?.name,
								value: message.components[row].components[column].data.emoji?.id || message.components[row].components[column].data.emoji?.name
							}])	
						}
						return interaction.respond([])
					}
				}
			}
		}
		if (interaction.commandName === "market") {
			if (interaction.options.getSubcommand() === "view") {
				const user = interaction.options.get("user")
				const query = { guildID: interaction.guildId, enable: true }
				if (user) query.userID = user.value
				const focus = interaction.options.getFocused()
				const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.found && item.enabled && item.name.toLowerCase().includes(focus.toLowerCase()))
				if (items.size) query.itemID = { $in: items.map(e => e.itemID) }
				const lots = await client.marketSchema.find(query).sort({ created: -1 })
				return interaction.respond(lots.map(lot => {
					const item = client.cache.items.get(lot.item.itemID)
					if (item) {
						const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
						return {
							name: `${!isDefaultEmoji ? item?.name || lot.item.itemID : (item?.displayEmoji || "") + (item?.name || lot.item.itemID)} (${client.users.cache.get(lot.userID)?.username || "?"})`,
							value: lot.lotID
						}	
					}
				}).filter(e => e).slice(0, 25))
			}
			if (interaction.options.getSubcommand() === "buy") {
				const focus = interaction.options.getFocused()
				const items = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.found && item.enabled && item.name.toLowerCase().includes(focus.toLowerCase()))
				const query = { guildID: interaction.guildId, enable: true, userID: { $ne: interaction.user.id }, "item.id": { $in: interaction.guild.roles.cache.map(e => e.id) } }
				if (items.size) query["item.id"]["$in"].push(...items.map(e => e.itemID))
				const lots = await client.marketSchema.find(query).sort({ created: -1 })
				return interaction.respond(lots.map(lot => {
					if (lot.item.type === RewardType.Item) {
						const item = client.cache.items.get(lot.item.id)
						if (item) {
							const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
							return {
								name: `[${lot.lotID}] ${!isDefaultEmoji ? item?.name || lot.item.itemID : (item?.displayEmoji || "") + (item?.name || lot.item.itemID)} (${lot.item.amount}) (${client.users.cache.get(lot.userID)?.username || "?"})`,
								value: lot.lotID
							}	
						}	
					}
					if (lot.item.type === RewardType.Role) {
						const role = interaction.guild.roles.cache.get(lot.item.id)
						return {
							name: `${role?.name || lot.item.id}${lot.item.ms ? ` [${client.functions.transformSecs(client, lot.item.ms, interaction.guildId, interaction.locale)}]` : ``} (${lot.item.amount})`,
							value: lot.lotID
						}
					}
				}).filter(e => e).slice(0, 25))
			}
			if (interaction.options.getSubcommand() === "create") {
				const focus = interaction.options.getFocused(true)
				if (focus.name === "item") {
					const serverItems = client.cache.items.filter(item => item.guildID === interaction.guildId && !item.temp && item.found && item.enabled && item.name.toLowerCase().includes(focus.value.toLowerCase()) && !item.notSellable).sort((a, b) => b.name > a.name).first(25)
					const options = []
					const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
					let inventory = profile.inventory.filter(element => serverItems.some(e => e.itemID === element.itemID) && element.amount > 0)
					inventory.sort((a, b) => {
						const aItem = serverItems.find(e => e.itemID == a.itemID)
						const bItem = serverItems.find(e => e.itemID == b.itemID)
						if (!aItem) return 1
						if (!bItem) return -1
						return aItem.sort - bItem.sort
					})
					inventory = inventory.slice(0, 25)
					for (const item of inventory) {
						const serverItem = serverItems.find(element => element.itemID == item.itemID)
						const isDefaultEmoji = serverItem?.emoji ? node_emoji.hasEmoji(serverItem?.emoji) : false
						if (serverItem) options.push({ name: (!isDefaultEmoji ? serverItem.name : serverItem.displayEmoji + serverItem.name) + ` (${item.amount})`, value: serverItem.name })
					}
					return interaction.respond(options).catch(e => null)	
				}
				if (focus.name === "role") {
					const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
					const options = []
					profile.inventoryRoles?.forEach(ir => {
						const role = interaction.guild.roles.cache.get(ir.id)
						options.push({
							name: `${role?.name || ir.id}${ir.ms ? ` [${client.functions.transformSecs(client, ir.ms, interaction.guildId, interaction.locale)}]` : ``} (${ir.amount})`,
							value: ir.uniqId
						})
					})
					return interaction.respond(options.filter(e => e.name.toLowerCase().includes(focus.value.toLowerCase())).slice(0, 24)).catch(e => null)
				}
			}
		}
		if (interaction.commandName === "wormhole") {
			const focus = interaction.options.getFocused()
    		const wormholes = client.cache.wormholes.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase()) && e.chance && e.itemID && e.amountFrom && e.amountTo && e.deleteTimeOut !== undefined && e.webhookId).first(25)
    		const options = []
			wormholes.forEach(wormhole => {
				options.push({
    				name: wormhole.name,
    				value: wormhole.name
    			})
			})
    		return interaction.respond(options).catch(e => null)
		}
		if (interaction.commandName === "quests") {
			const focus = interaction.options.getFocused()
			const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
    		const quests = client.cache.quests.filter(e => e.guildID === interaction.guildId && e.name.toLowerCase().includes(focus.toLowerCase()) && e.isEnabled && ((e.active || profile.quests?.some(e1 => e1.questID === e.questID)))).first(25)
    		const options = []
			quests.forEach(quest => {
				const isDefaultEmoji = node_emoji.hasEmoji(quest.emoji || "")
				options.push({
					name: `${(isDefaultEmoji ? quest?.displayEmoji || "" : "") + quest?.name}`,
					value: quest.questID
				})
			})
    		return interaction.respond(options).catch(e => null)
		}
		if (interaction.commandName === "crash") {
			const focus = interaction.options.getFocused()
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && !item.notCrashable && item.name.toLowerCase().includes(focus.toLowerCase()) && profile.inventory.some(x => x.itemID === item.itemID && x.amount > 0)).sort((a, b) => b.name > a.name).first(24)
    		const options = []
    		items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
    			options.push({
    				name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
    				value: item.name
    			})
    		})
			const settings = client.cache.settings.get(interaction.guildId)
			options.unshift(
				{ value: "currency", name: settings.currencyName },
			)
    		return interaction.respond(options).catch(e => null)
		}
		if (interaction.commandName === "blackjack") {
			const focus = interaction.options.getFocused()
    		const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
			const items = client.cache.items.filter(item => item.guildID === interaction.guildId && item.enabled && !item.temp && item.found && !item.blackJackBan && item.name.toLowerCase().includes(focus.toLowerCase()) && profile.inventory.some(x => x.itemID === item.itemID && x.amount > 0)).sort((a, b) => b.name > a.name).first(24)
    		const options = []
    		items.forEach(item => {
				const isDefaultEmoji = node_emoji.hasEmoji(item.emoji || "")
    			options.push({
    				name: !isDefaultEmoji ? item.name : item.displayEmoji + item.name,
    				value: item.name
    			})
    		})
			const settings = client.cache.settings.get(interaction.guildId)
			options.unshift(
				{ value: "currency", name: settings.currencyName },
			)
    		return interaction.respond(options).catch(e => null)
		}
		if (interaction.commandName === "sticky-cmd-manager") {
			const SUPPORTED_COMMANDS = ['daily', 'profile', 'rank', 'shop', 'inventory', 'quests']
			const focusedOption = interaction.options.getFocused(true)
			const subcommand = interaction.options.getSubcommand()
			
			if (focusedOption.name === 'command') {
				let choices = []
				const searchValue = focusedOption.value?.toLowerCase() || ''
				
				if (subcommand === 'add') {
					choices = SUPPORTED_COMMANDS
						.filter(cmd => cmd.toLowerCase().includes(searchValue))
						.map(cmd => ({ name: `/${cmd}`, value: cmd }))
				} else if (subcommand === 'remove') {
					const channelId = interaction.options.get('channel')?.value
					if (channelId) {
						const configuredCommands = []
						for (const [, value] of client.cache.stickyCommands) {
							if (value.guildID === interaction.guildId && value.channelID === channelId) {
								configuredCommands.push(value.commandName)
							}
						}
						choices = configuredCommands
							.filter(cmd => cmd.toLowerCase().includes(searchValue))
							.map(cmd => ({ name: `/${cmd}`, value: cmd }))
					} else {
						const configuredCommands = new Set()
						for (const [, value] of client.cache.stickyCommands) {
							if (value.guildID === interaction.guildId) {
								configuredCommands.add(value.commandName)
							}
						}
						choices = [...configuredCommands]
							.filter(cmd => cmd.toLowerCase().includes(searchValue))
							.map(cmd => ({ name: `/${cmd}`, value: cmd }))
					}
				}
				
				return interaction.respond(choices.slice(0, 25)).catch(e => null)
			}
			return interaction.respond([]).catch(e => null)
		}
		// Voice Request - show all voice channels in the temp voice category
		if (interaction.commandName === "voice-request") {
			const focus = interaction.options.getFocused()
			const dataStore = require('../modules/auto-voice/voice/dataStore')
			const { ChannelType } = require('discord.js')
			
			const settings = dataStore.getGuildSettings(interaction.guildId)
			if (!settings) return interaction.respond([]).catch(e => null)
			
			const options = []
			
			// Get all voice channels in the temp voice category
			const voiceChannels = interaction.guild.channels.cache.filter(channel => 
				channel.type === ChannelType.GuildVoice && 
				channel.parentId === settings.temp_voice_category_id &&
				channel.id !== settings.voice_channel_id // Exclude "Join to Create" channel
			)
			
			for (const [channelId, channel] of voiceChannels) {
				const channelName = channel.name || channel.id
				if (channelName.toLowerCase().includes(focus.toLowerCase())) {
					options.push({
						name: channelName,
						value: channel.id
					})
				}
			}
			return interaction.respond(options.slice(0, 25)).catch(e => null)
		}
    }
    // Context Menu Handling
	if (interaction.isContextMenuCommand()) {
		const command = client.slashCommands.get(interaction.commandName)
        if (interaction.inGuild()) {
			const cooldown = client.cooldowns({ guildId: interaction.guildId, commandName: interaction.commandName })
            if (cooldown && ((cooldown[1].length && !interaction.member.roles.cache.hasAny(...cooldown[1])) || !cooldown[1].length)) {
                const commandCooldown = command.cooldowns.get(`${interaction.guildId}_${interaction.user.id}`)
                if (commandCooldown > Date.now()) return interaction.reply({ content: `${client.language({ textId: "Wait for cooldown and execute command", guildId: interaction.guildId })} <t:${Math.floor(commandCooldown/1000)}:R>`, flags: ["Ephemeral"] })
                command.cooldowns.set(`${interaction.guildId}_${interaction.user.id}`, Date.now() + cooldown[0])
            }
        }
		if (command) return runCommand(command, client, interaction)
	}
	// Slash Command Handling
	if (interaction.isChatInputCommand()) {
		const command = client.slashCommands.get(interaction.commandName)
		if (!command) return
        if (interaction.inGuild() && interaction.commandName !== "open") {
            const cooldown = client.cooldowns({ guildId: interaction.guildId, commandName: interaction.commandName })
            if (cooldown && ((cooldown[1].length && !interaction.member.roles.cache.hasAny(...cooldown[1])) || !cooldown[1].length)) {
                const commandCooldown = command.cooldowns.get(`${interaction.guildId}_${interaction.user.id}`)
                if (commandCooldown > Date.now()) return interaction.reply({ content: `${client.language({ textId: "Wait for cooldown and execute command", guildId: interaction.guildId })} <t:${Math.floor(commandCooldown/1000)}:R>`, flags: ["Ephemeral"] })
                command.cooldowns.set(`${interaction.guildId}_${interaction.user.id}`, Date.now() + cooldown[0])
            }
        }
		const args = {}
		for (let option of interaction.options.data) {
			if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
				if (option.name) args["SubcommandGroup"] = option.name
				option.options?.forEach((x) => {
					if (x.type === ApplicationCommandOptionType.Subcommand) {
						if (x.name) args["Subcommand"] = x.name
						x.options?.forEach((z) => {
							if (z.value !== undefined) {
								const { name, value } = z
								args[name] = value
							}
						})
					} else if (x.value !== undefined) {
						const { name, value } = x
						args[name] = value
					}
				})
			} else if (option.type === ApplicationCommandOptionType.Subcommand) {
				if (option.name) args["Subcommand"] = option.name
				option.options?.forEach((x) => {
					if (x.value !== undefined) {
						const { name, value } = x
						args[name] = value
					}
				})
			} else if (option.value !== undefined) {
				const { name, value } = option
				args[name] = value
			}
		}
		await runCommand(command, client, interaction, args)
        return await client.commandsUsesSchema.updateOne({ commandName: command.name }, { $inc: {
            "hourly.uses": 1,
            "daily.uses": 1,
            "weekly.uses": 1,
            "monthly.uses": 1,
            "alltime.uses": 1,
        }}, { upsert: true, setDefaultsOnInsert: true })
	}
	// "CLOSE" Button
	if (interaction.customId?.includes("close")) {
		if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null) 
		else return interaction.message.delete().catch(e => {
			if (e.message === "Unknown Message") {
				return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Close does not work with ephemeral message", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
			}
		})
	}
	// Modal Handling
	if (interaction.type === InteractionType.ModalSubmit) {
		// Handle appeal modals first (they don't use cmd{} format)
		if (interaction.customId.startsWith('ban_appeal_submit_')) {
			const banAppealHandler = require('../interactions/ban-appeal-submit');
			return await banAppealHandler.run(client, interaction, {});
		}
		
		if (interaction.customId.startsWith('timeout_appeal_submit_')) {
			const timeoutAppealHandler = require('../interactions/timeout-appeal-submit');
			return await timeoutAppealHandler.run(client, interaction, {});
		}
		
		// Handle generic modals with cmd{} format
		const interactionName = CommandRegexp.exec(interaction.customId)?.[1]
		const _interaction = client.interactions.get(interactionName)
		if (_interaction && _interaction.isModal) {
			return _interaction.run(client, interaction, {})
		}
	}
	const UCPRegexp = /ucp{(.*?)}/
// Components Handling
	if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu() || interaction.isUserSelectMenu() || interaction.isChannelSelectMenu() || interaction.isMentionableSelectMenu() || interaction.isButton()) {
		// Handle moderation confirmation buttons and select menus
		if ((interaction.isButton() || interaction.isStringSelectMenu()) && 
		    (interaction.customId.startsWith('mod_confirm_') || 
		     interaction.customId.startsWith('mod_cancel_') ||
		     interaction.customId.startsWith('mod_select_') ||
		     interaction.customId.startsWith('mod_appeal_') ||
		     interaction.customId.startsWith('appeal_approve_') ||
		     interaction.customId.startsWith('appeal_deny_') ||
		     interaction.customId.startsWith('copy_user_id_'))) {
			const moderationHandler = require('./moderationMessageCreate');
			return await moderationHandler.handleModerationButton(client, interaction);
		}
		
		// Handle User Control Panel buttons
		if (interaction.isButton() && UCPRegexp.test(interaction.customId)) {
			const ucpCommand = UCPRegexp.exec(interaction.customId)?.[1]
			if (ucpCommand) {
				const args = { ephemeral: true, fromUCP: true }
				// Defer the reply as ephemeral first so commands use editReply instead of update
				await interaction.deferReply({ flags: ["Ephemeral"] })
				let command
				switch (ucpCommand) {
					case 'profile':
						command = client.slashCommands.get('profile')
						// Add editMode to show profile settings menu (like /profile-edit)
						args.editMode = true
						break
					case 'rank':
						command = client.slashCommands.get('rank')
						break
					case 'rank-set':
						command = client.slashCommands.get('rank-set')
						break
					case 'daily':
						command = client.slashCommands.get('daily')
						break
					case 'achievements':
						command = client.slashCommands.get('achievements')
						break
					case 'quests':
						command = client.slashCommands.get('quests')
						break
					case 'inventory':
						command = client.slashCommands.get('inventory')
						break
					case 'shop':
						command = client.slashCommands.get('shop')
						break
				}
				if (command) return runCommand(command, client, interaction, args)
			}
		}
		// Components --> Interactions
		let interactionName
		if (interaction.isStringSelectMenu()) {
			interactionName = CommandRegexp.exec(interaction.customId)?.[1]
			if (!client.interactions.has(interactionName)) interactionName = CommandRegexp.exec(interaction.values[0])?.[1]
		}
		if (interaction.isRoleSelectMenu()) {
			interactionName = CommandRegexp.exec(interaction.customId)?.[1]
		}
		if (interaction.isUserSelectMenu()) {
			// Check for compact sticky-user-select format first
			if (CompactStickyUserSelectRegexp.test(interaction.customId)) {
				interactionName = 'sticky-user-select'
			} else {
				interactionName = CommandRegexp.exec(interaction.customId)?.[1]
			}
		}
		if (interaction.isChannelSelectMenu()) {
			interactionName = CommandRegexp.exec(interaction.customId)?.[1]
		}
		if (interaction.isMentionableSelectMenu()) {
			interactionName = CommandRegexp.exec(interaction.customId)?.[1]
		}
		if (interaction.isButton()) {
			// Check for compact sticky command format first
			if (CompactStickyRegexp.test(interaction.customId)) {
				interactionName = 'sticky-command'
			} else {
				interactionName = CommandRegexp.exec(interaction.customId)?.[1]
			}
		}
		const _interaction = client.interactions.get(interactionName)
		if (_interaction) {
            const args = {}
            if (argsRegexp.exec(interaction.customId)) argsRegexp.exec(interaction.customId)[1].split(' ').forEach(arg => args[arg] = true)
			return runCommand(_interaction, client, interaction, args)
        }
		// Components --> Slash Command
		let commandName
		if (interaction.isStringSelectMenu()) {
			commandName = CommandRegexp.exec(interaction.customId)?.[1]
			if (!client.slashCommands.has(commandName)) commandName = CommandRegexp.exec(interaction.values[0])?.[1]
		}
		if (interaction.isRoleSelectMenu()) {
			commandName = CommandRegexp.exec(interaction.customId)?.[1]
		}
		if (interaction.isUserSelectMenu()) {
			// Skip compact sticky-user-select format - already handled by interactions above
			if (!CompactStickyUserSelectRegexp.test(interaction.customId)) {
				commandName = CommandRegexp.exec(interaction.customId)?.[1]
			}
		}
		if (interaction.isChannelSelectMenu()) {
			commandName = CommandRegexp.exec(interaction.customId)?.[1]
		}
		if (interaction.isMentionableSelectMenu()) {
			commandName = CommandRegexp.exec(interaction.customId)?.[1]
		}
		if (interaction.isButton()) {
			// Skip compact sticky format - already handled by interactions above
			if (!CompactStickyRegexp.test(interaction.customId)) {
				commandName = CommandRegexp.exec(interaction.customId)?.[1]
			}
		}
		const command = client.slashCommands.get(commandName)
		if (command) {
            const args = {}
            if (argsRegexp.exec(interaction.customId)) argsRegexp.exec(interaction.customId)[1].split(' ').forEach(arg => args[arg] = true)
            if (interaction.inGuild() && (command.name === "open" || command.name === "mining" || command.name === "fishing")) {
                const cooldown = client.cooldowns({ guildId: interaction.guildId, commandName: commandName })
				if (cooldown && ((cooldown[1].length && !interaction.member.roles.cache.hasAny(...cooldown[1])) || !cooldown[1].length)) {
					const commandCooldown = command.cooldowns.get(`${interaction.guildId}_${interaction.user.id}`)
					if (commandCooldown > Date.now()) return interaction.reply({ content: `${client.language({ textId: "Wait for cooldown and execute command", guildId: interaction.guildId })} <t:${Math.floor(commandCooldown/1000)}:R>`, flags: ["Ephemeral"] })
					command.cooldowns.set(`${interaction.guildId}_${interaction.user.id}`, Date.now() + cooldown[0])
				}
            }
			return runCommand(command, client, interaction, args)
        }
	}
	async function runCommand(command, client, interaction, args) {
		if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu() || interaction.isUserSelectMenu() || interaction.isChannelSelectMenu() || interaction.isMentionableSelectMenu()) {
			console.log(`[${client.shard.ids[0]}] ${new Date()} guildID: ${interaction.guildId} | customID: ${interaction.customId} | values: ${interaction.values?.join(", ") || interaction.channels?.map(c => c.id).join(", ")}`)
		}
		if (interaction.isButton()) {
			console.log(`[${client.shard.ids[0]}] ${new Date()} guildID: ${interaction.guildId} | customID: ${interaction.customId}`)
		}
		if (interaction.isChatInputCommand()) {
			console.log(`[${client.shard.ids[0]}] ${new Date()} guildID: ${interaction.guildId} | Команда: ${interaction.commandName} | Аргументы: ${interaction.options.data.length ? `${interaction.options.data.map(e => {
				return `${e.name}${e.type === ApplicationCommandOptionType.User ? `: ${e.value}` : e.type === ApplicationCommandOptionType.Channel ? `: ${e.value}`: e.type === ApplicationCommandOptionType.SubcommandGroup ? `${e.options.length ? e.options.map(e1 => {
					return ` ${e1.name} ${e1.type === ApplicationCommandOptionType.User ? `${e1.value}` : e1.type === ApplicationCommandOptionType.Channel ? `${e1.value}`: e1.type === ApplicationCommandOptionType.Subcommand ? `${e1.options.length ? e1.options.map(e2 => {
						return ` ${e2.name}: ${e2.type === ApplicationCommandOptionType.User ? `${e2.value}` : e2.type === ApplicationCommandOptionType.Channel ? `${e2.value}`: e2.value}`
					}).join(` `) : ``}` : `: ${e.value}`}`
				}).join(` `) : e.value}` : e.type === ApplicationCommandOptionType.Subcommand ? `${e.options.length ? e.options.map(e1 => {
					return ` ${e1.name}: ${e1.type === ApplicationCommandOptionType.User ? `${e1.value}` : e1.type === ApplicationCommandOptionType.Channel ? `${e1.value}`: `${e1.value}`}`
				}).join(` `) : ``}`: `: ${e.value}`}`
			}).join(` `)}` : `${client.language({ textId: "None", guildId: interaction.guildId })}`}`)
		}
		await command.run(client, interaction, args)
	}
})