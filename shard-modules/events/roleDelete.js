const { RewardType } = require("../enums")
const client = require("../index")
const { Events, EmbedBuilder } = require("discord.js")
const { handleError } = require("../handler/errorHandler")

client.on(Events.GuildRoleDelete, async (role) => {
    try {
        if (client.blacklist(role.guild.id, "full_ban", "guilds")) return
        await Promise.all(client.cache.profiles.filter(profile => profile.roles?.some(r => r.id === role.id)).map(async profile => {
            profile.roles = profile.roles.filter(r => r.id !== role.id)
            if (!profile.roles[0]) profile.roles = undefined
            await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
        }))
    await Promise.all(client.cache.items.filter(item => item.onUse.roleAdd === role.id).map(async item => {
        item.onUse.roleAdd = undefined
        item.onUse.roleTimely = undefined
        await item.save()
    }))
    await Promise.all(client.cache.items.filter(item => item.onUse.roleDel === role.id).map(async item => {
        item.onUse.roleDel = undefined
        await item.save()
    }))
    await Promise.all(client.cache.achievements.filter(e => e.rewards.some(rew => rew.id === role.id)).map(async achievement => {
        achievement.rewards = achievement.rewards.filter(e => e.id !== role.id)
        await achievement.save()
    }))
    await Promise.all(client.cache.roles.filter(e => e.id === role.id).map(async role => {
        await role.delete()
    }))
    await client.rolePropertiesSchema.findOneAndDelete({ id: role.id })
    const customRole = client.cache.customRoles.find(e => e.roleId === role.id)
    if (customRole) await customRole.delete()
    await Promise.all(client.cache.lots.filter(lot => lot.guildID === role.guild.id && lot.items.some(e => e.id === role.id)).map(async lot => {
        const { guild } = role
        const member = await guild.members.fetch(lot.userID).catch(e => null)
        const profile = client.cache.profiles.get(guild.id+lot.userID)
        if (profile) {
            let sellingItem
            if (lot.item.type === RewardType.Item) {
                const item = client.cache.items.find(e => !e.temp && e.itemID === lot.item.id && e.visible)
                sellingItem = `${item?.name || lot.item.id} (${amount.toLocaleString()})`
            }
            if (lot.item.type === RewardType.Role) {
                const role = interaction.guild.roles.cache.get(lot.item.id)
                sellingItem = `${role.name} (${amount.toLocaleString()})`
            }
            await lot.return()
            if (member) member.send({ embeds: [
                new EmbedBuilder()
                    .setTitle(guild.name)
                    .setThumbnail(guild.iconURL())
                    .setDescription(`${client.language({ textId: "Your lot", guildId: guild.id })} ${sellingItem} (${lot.lotID}) ${client.language({ textId: "was automatically deleted - one of the price items was removed. Items returned.", guildId: guild.id })}`)
                    .setColor(3093046)
            ] }).catch(e => null)    
        }
    }))
    await Promise.all(client.cache.profiles.filter(profile => profile.guildID === role.guild.id && profile.inventoryRoles?.some(r => r.id === role.id)).map(async profile => {
        profile.inventoryRoles = profile.inventoryRoles.filter(r => r.id !== role.id)
        if (!profile.inventoryRoles.length) profile.inventoryRoles = undefined
        await profile.save()
    }))
    await Promise.all(client.cache.settings.filter(settings => settings.roles.mutedRoles.includes(role.id) || settings.roles.giveawaysNotification === role.id || settings.roles.wormholesNotification === role.id || settings.roles.bumpNotification === role.id || settings.roles.customRolePosition === role.id).map(async settings => {
        if (settings.roles.mutedRoles.includes(role.id)) {
            settings.roles.mutedRoles = settings.roles.mutedRoles.filter(e => e !== role.id)
        }
        if (settings.roles.giveawaysNotification === role.id) {
            settings.roles.giveawaysNotification = undefined
        }
        if (settings.roles.wormholesNotification === role.id) {
            settings.roles.wormholesNotification = undefined
        }
        if (settings.roles.bumpNotification === role.id) {
            settings.roles.bumpNotification = undefined
        }
        if (settings.roles.customRolePosition === role.id) {
            settings.roles.customRolePosition = undefined
        }
        await settings.save()
    }))
    await Promise.all(client.cache.auctions.filter(e => e.guildID === role.guild.id && e.item.id === role.id).map(async auction => {
        await auction.delete(true)
    }))
    } catch (error) {
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'GuildRoleDelete Event' })
    }
})