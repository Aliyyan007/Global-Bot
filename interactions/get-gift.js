const { EmbedBuilder } = require("discord.js")
const giftRegexp = /gift{(.*?)}/
module.exports = {
    name: `get-gift`,
    run: async (client, interaction) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
    	const settings = client.cache.settings.get(interaction.guildId)
    	const giftID = giftRegexp.exec(interaction.customId)?.[1]
    	const gift = await client.giftSchema.findOne({ guildID: interaction.guildId, giftID: giftID })
    	if (!gift) {
    		return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Gift not found", guildId: interaction.guildId, locale: interaction.locale })}.**`, flags: ["Ephemeral"] })
    	}
    	if (!gift.enable) {
    		return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Gift disabled", guildId: interaction.guildId, locale: interaction.locale })}.**`, flags: ["Ephemeral"] })
    	}
    	if (!gift.items.length) {
        	return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "There are no items in this gift", guildId: interaction.guildId, locale: interaction.locale })}.**`, flags: ["Ephemeral"] })
        }
    	if (gift.startDate > new Date()) {
    		return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Gift will be enabled", guildId: interaction.guildId, locale: interaction.locale })}:** <t:${Math.floor(gift.startDate/1000)}:R>`, flags: ["Ephemeral"] })
    	}
    	if (gift.endDate < new Date()) {
    		return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Gift ended", guildId: interaction.guildId, locale: interaction.locale })}:** <t:${Math.floor(gift.endDate/1000)}:R>`, flags: ["Ephemeral"] })
    	}
    	if (gift.maxUniqueMembers && gift.members.length >= gift.maxUniqueMembers) {
    		return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Maximum unique users who claimed gift reached", guildId: interaction.guildId, locale: interaction.locale })}: ${gift.maxUniqueMembers}.**`, flags: ["Ephemeral"] })
    	}
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        let member = gift.members.find(e => { return e.userID === interaction.user.id })
        if (member) {
        	if (gift.maxCount && member.count >= gift.maxCount) {
        		return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Maximum gift claims reached", guildId: interaction.guildId, locale: interaction.locale })}: ${gift.maxCount}.**`, flags: ["Ephemeral"] })
        	}
        	if (gift.cooldown && Date.now() - gift.cooldown < member.lastDate.getTime()) {
        		return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Gift can be claimed again", guildId: interaction.guildId, locale: interaction.locale })}:** <t:${Math.floor((member.lastDate.getTime()+gift.cooldown)/1000)}:R>.`, flags: ["Ephemeral"] })
        	}
        }
        if (client.giftsInWork[gift.giftID] && Date.now() >= client.giftsInWork[gift.giftID]) {
        	return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Try again later", guildId: interaction.guildId, locale: interaction.locale })}.**`, flags: ["Ephemeral"] })
        }
        if (gift.permission) {
            const permission = client.cache.permissions.find(e => e.id === gift.permission)
            if (permission) {
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
        }
        client.giftsInWork[gift.giftID] = Date.now() + 30000
        const received_items = []
        for (let item of gift.items) {
            if (item.itemID === "xp") {
				await profile.addXp(item.amount)
                received_items.push(`${client.config.emojis.XP}**${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}** (${item.amount})`)
            } else if (item.itemID === "currency") {
				await profile.addCurrency(item.amount)
                received_items.push(`${settings.displayCurrencyEmoji}**${settings.currencyName}** (${item.amount})`)
            } else if (item.itemID === "rp") {
				await profile.addRp(item.amount)
                received_items.push(`${client.config.emojis.RP}**${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}** (${item.amount})`)
            } else {
                const serverItem = client.cache.items.find(i => i.itemID === item.itemID && !i.temp && i.enabled)
                if (serverItem) {
					await profile.addItem(serverItem.itemID, item.amount)
                    received_items.push(`${serverItem.displayEmoji}**${serverItem.name}** (${item.amount})`)
                }    
            }
        }
		await profile.save()
        if (!received_items.length) {
        	delete client.giftsInWork[gift.giftID]
        	return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "There are no items in this gift", guildId: interaction.guildId, locale: interaction.locale })}.**`, flags: ["Ephemeral"] })
        }
        if (member) {
        	member.count++
        	member.lastDate = new Date()
        } else {
        	gift.members.push({
        		userID: interaction.user.id,
        		count: 1,
        		lastDate: new Date()
        	})
			member = gift.members.find(e => { return e.userID === interaction.user.id })
        }
        await gift.save()
        delete client.giftsInWork[gift.giftID]
        return interaction.editReply({ 
        	embeds: [
        		new EmbedBuilder()
        			.setColor(gift.color || interaction.member?.displayHexColor || 3093046)
        			.setAuthor({ 
        				name: interaction.member?.displayName || interaction.user.username, 
        				iconURL: interaction.member?.displayAvatarURL() || interaction.user.displayAvatarURL() 
        			})
        			.setTitle(gift.giftName)
        			.setDescription(`${gift.comment || `${client.language({ textId: "You received", guildId: interaction.guildId, locale: interaction.locale })}:`}\n${received_items.join("\n")}${(!gift.maxCount || member.count < gift.maxCount) && gift.cooldown ? `\n${client.language({ textId: "Next gift", guildId: interaction.guildId, locale: interaction.locale })}: <t:${Math.floor((Date.now() + gift.cooldown)/1000)}:R>` : ""}`)
        			.setImage(gift.image || null)
        			.setThumbnail(gift.thumbnail || null)
    		],
    		flags: ["Ephemeral"]
    	})
    }
}